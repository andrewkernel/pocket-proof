#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { aggregate, median } from "../server/lib/metrics.js";
import { wordErrorStats } from "../server/lib/quality.js";
import { listMediaClips } from "../server/lib/media.js";
import { assertValidReport } from "../server/lib/report-schema.js";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const runs = Math.max(2, Number(getArg("--runs", "5")));
const warmup = Math.max(0, Number(getArg("--warmup", "1")));
const threads = Math.max(1, Number(getArg("--threads", "4")));
const root = path.resolve();
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function runClip(clip) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      path.join(root, "scripts/benchmark.mjs"), "--sample", clip.id,
      "--runs", String(runs), "--warmup", String(warmup), "--threads", String(threads), "--source", "recorded",
    ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let errors = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
      for (const line of chunk.split("\n")) {
        if (line && !line.startsWith("POCKETPROOF_EVENT ")) process.stdout.write(`${line}\n`);
      }
    });
    child.stderr.on("data", (chunk) => { errors += chunk; process.stderr.write(chunk); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(errors.trim() || `Benchmark for ${clip.id} exited with code ${code}.`));
      const eventLines = output.split("\n").filter((line) => line.startsWith("POCKETPROOF_EVENT "));
      const saved = eventLines.map((line) => JSON.parse(line.slice("POCKETPROOF_EVENT ".length))).findLast((event) => event.type === "report.saved");
      if (!saved?.reportId) return reject(new Error(`Benchmark for ${clip.id} did not emit a saved report ID.`));
      resolve(saved.reportId);
    });
  });
}

function percentile(values, value) {
  const ordered = [...values].sort((left, right) => left - right);
  const index = (ordered.length - 1) * value;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return ordered[lower + 1] === undefined ? ordered[lower] : ordered[lower] + fraction * (ordered[lower + 1] - ordered[lower]);
}

function bootstrapMedian(values, iterations = 10000) {
  let seed = 0x504f434b;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const medians = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    medians.push(median(Array.from({ length: values.length }, () => values[Math.floor(random() * values.length)])));
  }
  return { iterations, lower95: percentile(medians, 0.025), upper95: percentile(medians, 0.975) };
}

const clips = await listMediaClips();
const reportIds = [];
for (const clip of clips) {
  console.log(`\nCorpus clip ${reportIds.length + 1}/${clips.length}: ${clip.title}`);
  reportIds.push(await runClip(clip));
}

const reports = [];
for (const reportId of reportIds) {
  const file = path.join(root, "benchmarks/results", `${reportId}.json`);
  const bytes = await readFile(file);
  const report = JSON.parse(bytes);
  assertValidReport(report);
  reports.push({ report, file: path.relative(root, file), sha256: sha256(bytes) });
}

const ratios = [];
const referenceRtf = [];
const optimizedRtf = [];
let referenceErrors = 0;
let optimizedErrors = 0;
let referenceWords = 0;
let exactClipMatches = 0;
const perClip = reports.map(({ report, file, sha256: reportSha256 }) => {
  const referenceRuns = report.measurements.filter((measurement) => measurement.profileId === "reference" && measurement.phase === "measured");
  const optimizedRuns = report.measurements.filter((measurement) => measurement.profileId === "optimized" && measurement.phase === "measured");
  for (let index = 0; index < Math.min(referenceRuns.length, optimizedRuns.length); index += 1) {
    ratios.push(referenceRuns[index].timing.inferenceMs / optimizedRuns[index].timing.inferenceMs);
  }
  referenceRtf.push(...referenceRuns.map((measurement) => measurement.timing.inferenceMs / report.input.durationMs));
  optimizedRtf.push(...optimizedRuns.map((measurement) => measurement.timing.inferenceMs / report.input.durationMs));
  const referenceQuality = wordErrorStats(report.input.referenceTranscript, referenceRuns[0].transcript.text);
  const optimizedQuality = wordErrorStats(report.input.referenceTranscript, optimizedRuns[0].transcript.text);
  referenceErrors += referenceQuality.errors;
  optimizedErrors += optimizedQuality.errors;
  referenceWords += referenceQuality.referenceWords;
  if (report.comparison.transcriptExactMatch) exactClipMatches += 1;
  return {
    clipId: report.input.id,
    title: report.input.title,
    durationMs: report.input.durationMs,
    difficulty: report.input.difficulty,
    reportId: report.id,
    reportPath: file,
    reportSha256,
    referenceMedianInferenceMs: report.aggregates.reference.inferenceMs,
    optimizedMedianInferenceMs: report.aggregates.optimized.inferenceMs,
    speedup: report.comparison.speedup,
    referenceWer: referenceQuality.wer,
    optimizedWer: optimizedQuality.wer,
    transcriptExactMatch: report.comparison.transcriptExactMatch,
  };
});

const summary = {
  schemaVersion: 1,
  id: `corpus-${new Date().toISOString().replace(/[:.]/g, "-")}`,
  createdAt: new Date().toISOString(),
  device: reports[0].report.system,
  configuration: { runsPerProfilePerClip: runs, warmupRunsPerProfilePerClip: warmup, threads, clipCount: clips.length, measuredProcessCount: clips.length * runs * 2 },
  perClip,
  aggregate: {
    referenceRealTimeFactor: aggregate(referenceRtf),
    optimizedRealTimeFactor: aggregate(optimizedRtf),
    medianPairedSpeedup: median(ratios),
    pairedSpeedupBootstrap95: bootstrapMedian(ratios),
    referenceCorpusWer: referenceWords ? referenceErrors / referenceWords : 0,
    optimizedCorpusWer: referenceWords ? optimizedErrors / referenceWords : 0,
    referenceWordErrors: referenceErrors,
    optimizedWordErrors: optimizedErrors,
    referenceWords,
    exactTranscriptClipMatches: exactClipMatches,
  },
  scope: "Three public-domain English archival clips. Results remain device, model, runtime, input, and configuration specific.",
};

const serialized = `${JSON.stringify(summary, null, 2)}\n`;
await writeFile(path.join(root, "benchmarks/corpus-summary.json"), serialized);
await writeFile(path.join(root, "public/corpus-summary.json"), serialized);
console.log(`\nSaved benchmarks/corpus-summary.json: median paired speedup ${summary.aggregate.medianPairedSpeedup.toFixed(3)}×; Q4 corpus WER ${(summary.aggregate.optimizedCorpusWer * 100).toFixed(1)}%.`);
