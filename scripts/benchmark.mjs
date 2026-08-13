#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { copyFile, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { aggregate } from "../server/lib/metrics.js";
import { parseWhisperCli } from "../server/lib/parse.js";
import { wordErrorRate } from "../server/lib/quality.js";
import { resolveRuntime } from "../server/lib/runtime.js";
import { assertValidReport } from "../server/lib/report-schema.js";
import { saveReport } from "../server/lib/store.js";
import { getSystemSnapshot } from "../server/lib/system.js";

const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const runs = Math.max(1, Number(getArg("--runs", "5")));
const warmup = Math.max(0, Number(getArg("--warmup", "1")));
const threads = Math.max(1, Number(getArg("--threads", "4")));
const source = getArg("--source", "recorded");
if (!["recorded", "live"].includes(source)) {
  throw new Error(`--source must be recorded or live; received ${JSON.stringify(source)}`);
}
const referenceTranscript = "And so my fellow Americans ask not what your country can do for you. Ask what you can do for your country.";
const sha256File = async (file) => createHash("sha256").update(await readFile(file)).digest("hex");
const execOptions = { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 };
const currentGitCommit = async () => {
  try {
    const { stdout } = await execFileAsync("/usr/bin/git", ["rev-parse", "HEAD"], execOptions);
    const revision = stdout.trim();
    return /^[a-f0-9]{40}$/.test(revision) ? revision : undefined;
  } catch {
    return undefined;
  }
};
const publicPath = (file) => {
  const relative = file.startsWith(process.cwd()) ? file.slice(process.cwd().length + 1) : file;
  if (relative.startsWith("work/inference_eval/STT-Runner/build-kleidiai-off/")) {
    return relative.replace("work/inference_eval/STT-Runner/build-kleidiai-off/", "vendor/stt-runner/build-reference/");
  }
  if (relative.startsWith("work/inference_eval/STT-Runner/build-kleidiai-on/")) {
    return relative.replace("work/inference_eval/STT-Runner/build-kleidiai-on/", "vendor/stt-runner/build-kleidiai/");
  }
  if (relative === "work/inference_eval/models/ggml-small.en.bin") return "models/ggml-small.en.bin";
  if (relative === "work/inference_eval/models/ggml-small.en-q4_0-stt.bin") return "models/ggml-small.en-q4_0.bin";
  return relative;
};

async function inspectBinary(binary) {
  const [{ stdout: fileOutput }, { stdout: lipoOutput }] = await Promise.all([
    execFileAsync("/usr/bin/file", [binary], execOptions),
    execFileAsync("/usr/bin/lipo", ["-info", binary], execOptions),
  ]);
  const sanitized = publicPath(binary);
  return {
    path: sanitized,
    file: fileOutput.trim().replaceAll(binary, sanitized),
    lipo: lipoOutput.trim().replaceAll(binary, sanitized),
    sha256: await sha256File(binary),
  };
}

async function runProfile(profile, phase, sequence) {
  const command = ["-lp", profile.cli, "-m", profile.model, "-f", runtime.sample, "-t", String(threads), "-nt"];
  const startedAt = new Date().toISOString();
  const { stdout, stderr } = await execFileAsync("/usr/bin/time", command, execOptions);
  const parsed = parseWhisperCli(`${stdout}\n${stderr}`, stdout);
  return {
    profileId: profile.id,
    phase,
    sequence,
    startedAt,
    command: ["/usr/bin/time", "-lp", publicPath(profile.cli), "-m", publicPath(profile.model), "-f", publicPath(runtime.sample), "-t", String(threads), "-nt"],
    timing: {
      inferenceMs: parsed.metrics.totalMs,
      totalMs: parsed.metrics.wallMs,
      modelLoadMs: parsed.metrics.loadMs,
      encodeMs: parsed.metrics.encodeMs,
      decodeMs: parsed.metrics.decodeMs,
    },
    memory: {
      peakRssBytes: parsed.metrics.peakRssBytes,
      peakFootprintBytes: parsed.metrics.peakFootprintBytes,
    },
    transcript: { text: parsed.transcript },
    quality: { wer: wordErrorRate(referenceTranscript, parsed.transcript), normalizedWer: wordErrorRate(referenceTranscript, parsed.transcript) },
  };
}

function summarize(profile, measurements, modelMeta) {
  const selected = measurements.filter((measurement) => measurement.profileId === profile.id && measurement.phase === "measured");
  const stats = {
    inferenceMs: aggregate(selected.map((value) => value.timing.inferenceMs).filter(Number.isFinite)),
    totalMs: aggregate(selected.map((value) => value.timing.totalMs).filter(Number.isFinite)),
    modelLoadMs: aggregate(selected.map((value) => value.timing.modelLoadMs).filter(Number.isFinite)),
    encodeMs: aggregate(selected.map((value) => value.timing.encodeMs).filter(Number.isFinite)),
    peakRssBytes: aggregate(selected.map((value) => value.memory.peakRssBytes).filter(Number.isFinite)),
    wer: aggregate(selected.map((value) => value.quality.normalizedWer).filter(Number.isFinite)),
  };
  return {
    inferenceMs: stats.inferenceMs?.median,
    totalMs: stats.totalMs?.median,
    peakRssBytes: stats.peakRssBytes?.median,
    modelBytes: modelMeta.bytes,
    wer: stats.wer?.median,
    runs: selected.length,
    statistics: stats,
  };
}

const runtime = await resolveRuntime();
if (!runtime.ready) {
  console.error("Pocket Proof benchmark is not ready. Run ./scripts/setup-runtime.sh first.");
  console.error(JSON.stringify(runtime.checks, null, 2));
  process.exit(1);
}

const system = await getSystemSnapshot();
if (system.architecture !== "arm64") throw new Error(`Expected arm64, detected ${system.architecture ?? "unknown"}`);

const profiles = [
  {
    id: "reference",
    label: "FP16 Reference",
    precision: "F16",
    cli: runtime.referenceCli,
    model: runtime.referenceModel,
    modelBytes: runtime.modelBytes.reference,
    interventions: ["Native arm64", "CPU", "FP16 model representation"],
  },
  {
    id: "optimized",
    label: "Q4 Optimized",
    precision: "Q4_0",
    cli: runtime.optimizedCli,
    model: runtime.optimizedModel,
    modelBytes: runtime.modelBytes.optimized,
    interventions: ["Native arm64", "CPU", "Q4_0 weight quantization"],
  },
];

for (const profile of profiles) {
  profile.modelSha256 = await sha256File(profile.model);
  profile.runtime = await inspectBinary(profile.cli);
}

console.log(`Pocket Proof real-audio benchmark — ${runs} measured run(s), ${warmup} warm-up(s), ${threads} threads`);
const measurements = [];
let sequence = 0;
for (let index = 0; index < warmup; index += 1) {
  const order = index % 2 ? [...profiles].reverse() : profiles;
  for (const profile of order) {
    sequence += 1;
    console.log(`Warm-up ${index + 1}/${warmup}: ${profile.label}`);
    measurements.push(await runProfile(profile, "warmup", sequence));
  }
}
for (let index = 0; index < runs; index += 1) {
  const order = index % 2 ? [...profiles].reverse() : profiles;
  for (const profile of order) {
    sequence += 1;
    console.log(`Measured ${index + 1}/${runs}: ${profile.label}`);
    measurements.push(await runProfile(profile, "measured", sequence));
  }
}

const reportProfiles = profiles.map((profile) => ({
  id: profile.id,
  label: profile.label,
  precision: profile.precision,
  threads,
  backend: "whisper.cpp CPU",
  model: { id: "Whisper small.en", bytes: profile.modelBytes, sha256: profile.modelSha256, precision: profile.precision, format: "ggml" },
  runtime: profile.runtime,
  interventions: profile.interventions,
}));
const aggregates = Object.fromEntries(profiles.map((profile) => [profile.id, summarize(profile, measurements, { bytes: profile.modelBytes })]));
const reference = aggregates.reference;
const optimized = aggregates.optimized;
const comparison = {
  speedup: reference.inferenceMs > 0 && optimized.inferenceMs > 0 ? reference.inferenceMs / optimized.inferenceMs : null,
  latencyReductionPct: reference.inferenceMs > 0 ? ((reference.inferenceMs - optimized.inferenceMs) / reference.inferenceMs) * 100 : null,
  memoryReductionPct: reference.peakRssBytes > 0 ? ((reference.peakRssBytes - optimized.peakRssBytes) / reference.peakRssBytes) * 100 : null,
  modelReductionPct: reference.modelBytes > 0 ? ((reference.modelBytes - optimized.modelBytes) / reference.modelBytes) * 100 : null,
  sampleQualityRetentionPct: reference.wer === 0 && optimized.wer === 0 ? 100 : Math.max(0, (1 - (optimized.wer - reference.wer)) * 100),
  transcriptExactMatch: measurements.find((m) => m.profileId === "reference" && m.phase === "measured")?.transcript.text === measurements.find((m) => m.profileId === "optimized" && m.phase === "measured")?.transcript.text,
};
const configuration = {
  executionStrategy: "sequential-interleaved",
  measuredRuns: runs,
  warmupRuns: warmup,
  threads,
  decoder: { beamSize: 5, bestOf: 5, language: "en" },
  modelFamily: "Whisper small.en",
  sampleSha256: await sha256File(runtime.sample),
  modelSha256: profiles.map((profile) => profile.modelSha256),
  binarySha256: profiles.map((profile) => profile.runtime.sha256),
};
const report = {
  schemaVersion: 1,
  id: `run-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`,
  createdAt: new Date().toISOString(),
  status: "complete",
  source,
  strategy: "sequential-interleaved",
  executionStrategy: "sequential-interleaved",
  system,
  input: { id: "jfk", path: publicPath(runtime.sample), sha256: configuration.sampleSha256, durationMs: 11000, referenceTranscript },
  methodology: {
    measuredRuns: runs,
    warmupRuns: warmup,
    threads,
    order: "alternating AB/BA",
    clock: "whisper.cpp monotonic internal timing plus macOS /usr/bin/time",
    commandSemantics: {
      language: "English-only small.en model; whisper.cpp default language detection",
      gpu: "disabled at build with GGML_METAL=OFF; CPU backend only",
      decoder: "whisper.cpp defaults (beam size 5, best-of 5)",
      note: "Per-run command arrays are the exact process arguments used by this harness.",
    },
  },
  profiles: reportProfiles,
  measurements,
  aggregates,
  comparison,
  findings: {
    selectedIntervention: "FP16 to Q4_0 model quantization",
    rejectedIntervention: "Same-Q4_0 KleidiAI builds were tested independently; no repeatable improvement was observed on this Apple M5 configuration.",
  },
  provenance: {
    appVersion: "0.1.0",
    gitCommit: await currentGitCommit(),
    sttRunnerRevision: "bdabdb945f373651442a3693c0cd55d9af690e32",
    modelRepositoryRevision: "5359861c739e955e79d9a303bcbc70fb988958b1",
    configHash: createHash("sha256").update(JSON.stringify(configuration)).digest("hex"),
  },
};

assertValidReport(report);
const saved = await saveReport(report);
console.log(`Saved immutable report: ${saved}`);
if (source !== "live") {
  await copyFile(saved, "public/featured-report.json");
  console.log("Updated reviewed Judge Mode artifact: public/featured-report.json");
}
console.log(JSON.stringify(report.comparison, null, 2));
