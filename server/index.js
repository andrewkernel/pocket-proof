import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { featuredReport, latestLiveReport, listReports } from "./lib/store.js";
import { getSystemSnapshot } from "./lib/system.js";
import { resolveRuntime } from "./lib/runtime.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const port = Number(process.env.POCKETPROOF_PORT ?? 4174);
const execFileAsync = promisify(execFile);
let raceInProgress = false;

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
  if (!file.startsWith(dist)) return false;
  try {
    if (!(await stat(file)).isFile()) return false;
  } catch {
    file = path.join(dist, "index.html");
  }
  const ext = path.extname(file);
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
  response.writeHead(200, { "content-type": `${types[ext] ?? "application/octet-stream"}; charset=utf-8` });
  createReadStream(file).pipe(response);
  return true;
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
      if (raceInProgress) return error(response, 409, "A benchmark is already running.");
      const runtime = await resolveRuntime();
      if (!runtime.ready) return error(response, 503, "The native benchmark runtime is not ready. Run ./scripts/setup-runtime.sh first.");
      raceInProgress = true;
      try {
        await execFileAsync(process.execPath, [path.join(root, "scripts/benchmark.mjs"), "--runs", "5", "--warmup", "1", "--threads", "4", "--source", "live"], {
          cwd: root,
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
          timeout: 180000,
        });
        const report = await latestLiveReport();
        if (!report) throw new Error("The benchmark completed without a readable live report.");
        return json(response, 200, { report });
      } finally {
        raceInProgress = false;
      }
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
