import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { featuredReport, latestLiveReport, listReports } from "./lib/store.js";
import { getSystemSnapshot } from "./lib/system.js";
import { resolveRuntime } from "./lib/runtime.js";
import { getMediaClip, listMediaClips } from "./lib/media.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const port = Number(process.env.POCKETPROOF_PORT ?? 4174);
const jobs = new Map();
let activeRaceId = null;

function json(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(`${JSON.stringify(payload)}\n`);
}

function error(response, status, message) {
  json(response, status, { error: message });
}

async function serveStatic(request, response) {
  if (!process.argv.includes("--serve-dist")) return false;
  const urlPath = new URL(request.url, `http://${request.headers.host}`).pathname;
  const requested = urlPath === "/" ? "index.html" : urlPath.slice(1);
  let file = path.join(dist, requested);
  if (path.relative(dist, file).startsWith("..")) return false;
  try {
    if (!(await stat(file)).isFile()) return false;
  } catch {
    file = path.join(dist, "index.html");
  }
  const ext = path.extname(file);
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml; charset=utf-8", ".png": "image/png", ".mp4": "video/mp4", ".wasm": "application/wasm" };
  response.writeHead(200, { "content-type": types[ext] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
  return true;
}

async function readJsonBody(request) {
  let text = "";
  for await (const chunk of request) {
    text += chunk;
    if (text.length > 16_384) throw new Error("Request body is too large.");
  }
  if (!text.trim()) return {};
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a JSON object.");
  return value;
}

function publish(job, event) {
  job.events.push(event);
  job.updatedAt = Date.now();
  for (const subscriber of job.subscribers) subscriber.write(`data: ${JSON.stringify(event)}\n\n`);
  if (event.type === "race.complete" || event.type === "race.error") {
    job.terminal = true;
    for (const subscriber of job.subscribers) subscriber.end();
    job.subscribers.clear();
    if (activeRaceId === job.id) activeRaceId = null;
    setTimeout(() => jobs.delete(job.id), 10 * 60 * 1000).unref();
  }
}

function forwardProgress(job, text) {
  job.stdoutBuffer += text;
  const lines = job.stdoutBuffer.split("\n");
  job.stdoutBuffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.startsWith("POCKETPROOF_EVENT ")) continue;
    try {
      publish(job, JSON.parse(line.slice("POCKETPROOF_EVENT ".length)));
    } catch {
      job.logs.push(`Malformed progress event: ${line}`);
    }
  }
}

function runRace(job, sampleId) {
  const child = spawn(process.execPath, [
    path.join(root, "scripts/benchmark.mjs"),
    "--runs", "5", "--warmup", "1", "--threads", "4", "--source", "live", "--sample", sampleId,
  ], { cwd: root, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  job.child = child;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => forwardProgress(job, chunk));
  child.stderr.on("data", (chunk) => {
    job.logs.push(chunk);
    if (job.logs.length > 40) job.logs.shift();
  });
  child.on("error", (cause) => publish(job, { type: "race.error", message: cause.message }));
  child.on("close", async (code) => {
    if (job.terminal) return;
    if (code !== 0) {
      const details = job.logs.join("").trim().split("\n").slice(-3).join(" ");
      publish(job, { type: "race.error", message: details || `Benchmark exited with code ${code}.` });
      return;
    }
    try {
      const report = await latestLiveReport();
      if (!report) throw new Error("The benchmark completed without a readable live report.");
      publish(job, { type: "race.complete", report });
    } catch (cause) {
      publish(job, { type: "race.error", message: cause instanceof Error ? cause.message : "Could not read the completed report." });
    }
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json(response, 200, { status: "ok", app: "pocket-proof", version: "0.1.0" });
    }
    if (request.method === "GET" && url.pathname === "/api/system") {
      const [system, runtime] = await Promise.all([getSystemSnapshot(), resolveRuntime()]);
      return json(response, 200, { system, runtime: { ready: runtime.ready, checks: runtime.checks, modelBytes: runtime.modelBytes } });
    }
    if (request.method === "GET" && url.pathname === "/api/media") {
      return json(response, 200, { schemaVersion: 1, clips: await listMediaClips() });
    }
    if (request.method === "GET" && url.pathname === "/api/reports") {
      return json(response, 200, await listReports());
    }
    if (request.method === "GET" && url.pathname === "/api/reports/featured") {
      const report = await featuredReport();
      return report ? json(response, 200, report) : error(response, 404, "No verified benchmark report is available yet.");
    }
    if (request.method === "GET" && url.pathname === "/api/reports/featured/export") {
      const report = await featuredReport();
      if (!report) return error(response, 404, "No verified benchmark report is available yet.");
      response.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename=\"pocketproof-${report.id}.json\"`,
      });
      return response.end(`${JSON.stringify(report, null, 2)}\n`);
    }
    if (request.method === "POST" && url.pathname === "/api/races") {
      if (activeRaceId) return error(response, 409, "A benchmark is already running.");
      const body = await readJsonBody(request);
      const sampleId = typeof body.sampleId === "string" ? body.sampleId : "jfk";
      const clip = await getMediaClip(sampleId);
      if (!clip) return error(response, 400, `Unknown preset clip ${JSON.stringify(sampleId)}.`);
      const runtime = await resolveRuntime({ samplePath: clip.audioPath });
      if (!runtime.ready) return error(response, 503, "The native benchmark runtime is not ready. Run ./scripts/setup-runtime.sh first.");
      const id = randomUUID();
      const job = { id, sampleId, events: [], subscribers: new Set(), logs: [], stdoutBuffer: "", terminal: false, createdAt: Date.now(), updatedAt: Date.now() };
      jobs.set(id, job);
      activeRaceId = id;
      json(response, 202, { id, eventsUrl: `/api/races/${id}/events`, sampleId });
      runRace(job, sampleId);
      return;
    }
    const eventMatch = request.method === "GET" && url.pathname.match(/^\/api\/races\/([a-f0-9-]+)\/events$/);
    if (eventMatch) {
      const job = jobs.get(eventMatch[1]);
      if (!job) return error(response, 404, "Benchmark job not found or expired.");
      response.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      });
      response.write(": Pocket Proof benchmark event stream\n\n");
      for (const event of job.events) response.write(`data: ${JSON.stringify(event)}\n\n`);
      if (job.terminal) return response.end();
      job.subscribers.add(response);
      request.on("close", () => job.subscribers.delete(response));
      return;
    }
    if (await serveStatic(request, response)) return;
    error(response, 404, "Not found");
  } catch (cause) {
    error(response, 500, cause instanceof Error ? cause.message : "Unexpected error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Pocket Proof API listening on http://127.0.0.1:${port}`);
});
