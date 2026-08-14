#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { assertValidReport } from "../server/lib/report-schema.js";

const file = process.argv[2] ?? "public/featured-report.json";
const reportText = await readFile(file, "utf8");
const report = JSON.parse(reportText);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const close = (actual, expected, tolerance = 1e-6) => Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= tolerance;
const median = (values) => {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

try {
  assertValidReport(report);
} catch (cause) {
  failures.push(cause instanceof Error ? cause.message : "report does not satisfy schema v1");
}

check(report.schemaVersion === 1, "schemaVersion must be 1");
check(report.status === "complete", "report status must be complete");
check(report.strategy === "sequential-interleaved", "execution strategy must be sequential-interleaved");
check(report.system?.architecture === "arm64", "report must record arm64 architecture");
check(report.system?.translated === false, "report must record non-translated execution");
check(Array.isArray(report.profiles) && report.profiles.length === 2, "exactly two primary profiles are required");
check(Array.isArray(report.measurements), "measurements must be an array");
check(/^[a-f0-9]{64}$/.test(report.input?.sha256 ?? ""), "input SHA-256 is missing or malformed");
check(/^[a-f0-9]{64}$/.test(report.provenance?.configHash ?? ""), "configuration hash is missing or malformed");
check(!reportText.includes("/Users/") && !reportText.includes("andrews-MacBook"), "report exposes a private local path or hostname");

for (const profile of report.profiles ?? []) {
  check(/^[a-f0-9]{64}$/.test(profile.model?.sha256 ?? ""), `${profile.id}: model SHA-256 is missing or malformed`);
  check(/^[a-f0-9]{64}$/.test(profile.runtime?.sha256 ?? ""), `${profile.id}: runtime SHA-256 is missing or malformed`);
  check(profile.runtime?.file?.includes("arm64") && profile.runtime?.lipo?.includes("arm64"), `${profile.id}: native binary evidence is missing`);
  const measured = (report.measurements ?? []).filter((measurement) => measurement.profileId === profile.id && measurement.phase === "measured");
  const warmups = (report.measurements ?? []).filter((measurement) => measurement.profileId === profile.id && measurement.phase === "warmup");
  check(measured.length >= 5, `${profile.id}: expected at least five measured runs`);
  check(warmups.length >= 1, `${profile.id}: expected at least one warm-up`);
  const stored = report.aggregates?.[profile.id];
  if (stored && measured.length) {
    check(close(stored.inferenceMs, median(measured.map((value) => value.timing.inferenceMs))), `${profile.id}: median inference does not match raw runs`);
    check(close(stored.totalMs, median(measured.map((value) => value.timing.totalMs))), `${profile.id}: median wall time does not match raw runs`);
    check(close(stored.peakRssBytes, median(measured.map((value) => value.memory.peakRssBytes))), `${profile.id}: median peak RSS does not match raw runs`);
    check(stored.modelBytes === profile.model.bytes, `${profile.id}: aggregate model bytes do not match profile artifact`);
    check(stored.runs === measured.length, `${profile.id}: aggregate run count does not match raw runs`);
  } else {
    failures.push(`${profile.id}: aggregate is missing`);
  }
}

if ((report.profiles ?? []).length === 2) {
  const [referenceProfile, optimizedProfile] = report.profiles;
  const reference = report.aggregates?.[referenceProfile.id];
  const optimized = report.aggregates?.[optimizedProfile.id];
  if (reference && optimized) {
    const speedup = reference.inferenceMs / optimized.inferenceMs;
    const latencyReduction = ((reference.inferenceMs - optimized.inferenceMs) / reference.inferenceMs) * 100;
    const memoryReduction = ((reference.peakRssBytes - optimized.peakRssBytes) / reference.peakRssBytes) * 100;
    const modelReduction = ((reference.modelBytes - optimized.modelBytes) / reference.modelBytes) * 100;
    check(close(report.comparison?.speedup, speedup), "speedup does not match aggregate medians");
    check(close(report.comparison?.latencyReductionPct, latencyReduction), "latency reduction does not match aggregate medians");
    check(close(report.comparison?.memoryReductionPct, memoryReduction), "memory reduction does not match aggregate medians");
    check(close(report.comparison?.modelReductionPct, modelReduction), "model reduction does not match artifact bytes");
  }
}

if (failures.length) {
  console.error(`Report validation failed (${file}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Report verified: ${report.id}`);
console.log(`Raw runs, aggregate medians, hashes, architecture evidence, and comparison math are internally consistent.`);
