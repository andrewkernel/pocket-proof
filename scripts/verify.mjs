#!/usr/bin/env node
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { resolveRuntime } from "../server/lib/runtime.js";
import { getSystemSnapshot } from "../server/lib/system.js";

const execFileAsync = promisify(execFile);
const rows = [];
const add = (ok, label, detail) => rows.push({ ok, label, detail });
const sha256File = async (file) => createHash("sha256").update(await readFile(file)).digest("hex");
const system = await getSystemSnapshot();
add(system.architecture === "arm64", "Architecture", system.architecture ?? "unknown");
add(system.translated === false, "Rosetta translation", system.translated === false ? "not translated" : "translated or unknown");
add(system.os === "macOS", "Operating system", `${system.os} ${system.osVersion}`);
add(Boolean(system.chip), "Hardware detected", `${system.chip ?? "unknown"} · ${system.model ?? "unknown"}`);

const runtime = await resolveRuntime();
const requiredRuntimeKeys = ["referenceBinary", "optimizedBinary", "referenceCli", "optimizedCli", "referenceModel", "optimizedModel", "sample"];
for (const key of requiredRuntimeKeys) {
  const ok = runtime.checks[key];
  add(ok, key, ok ? "available" : "missing — run setup-runtime.sh");
}
add(true, "experimentalKleidiaiCli", runtime.checks.experimentalKleidiaiCli ? "available for rejected-intervention audit" : "optional; not installed");
for (const [name, binary] of [["Reference binary", runtime.referenceBinary], ["Optimized binary", runtime.optimizedBinary]]) {
  if (runtime.checks[name === "Reference binary" ? "referenceBinary" : "optimizedBinary"]) {
    const { stdout } = await execFileAsync("/usr/bin/file", [binary], { encoding: "utf8" });
    add(/arm64/.test(stdout), name, stdout.trim());
  }
}
try {
  const reportText = await readFile("public/featured-report.json", "utf8");
  const report = JSON.parse(reportText);
  const profilesValid = Array.isArray(report.profiles) && report.profiles.length >= 2 && report.profiles.every((profile) => /^[a-f0-9]{64}$/.test(profile?.model?.sha256 ?? ""));
  const aggregatesValid = ["reference", "optimized"].every((id) => Number.isFinite(report?.aggregates?.[id]?.inferenceMs) && Number.isFinite(report?.aggregates?.[id]?.peakRssBytes));
  const provenanceValid = /^[a-f0-9]{64}$/.test(report?.provenance?.configHash ?? "");
  const noPrivatePaths = !reportText.includes("/Users/") && !reportText.includes("andrews-MacBook");
  add(report.schemaVersion === 1 && report.status === "complete" && profilesValid && aggregatesValid && provenanceValid, "Featured report schema", report.id ?? "invalid");
  add(report.system?.architecture === "arm64" && report.system?.translated === false, "Report architecture evidence", "native arm64, not translated");
  add(noPrivatePaths, "Report privacy", noPrivatePaths ? "no local home paths or hostnames" : "private local path detected");
  const [referenceHash, optimizedHash, sampleHash] = await Promise.all([
    sha256File(runtime.referenceModel),
    sha256File(runtime.optimizedModel),
    sha256File(runtime.sample),
  ]);
  add(referenceHash === report.profiles[0].model.sha256, "Reference model checksum", referenceHash);
  add(optimizedHash === report.profiles[1].model.sha256, "Optimized model checksum", optimizedHash);
  add(sampleHash === report.input.sha256, "Sample checksum", sampleHash);
} catch (cause) {
  add(false, "Featured report validation", cause instanceof Error ? cause.message : "invalid report");
}
try {
  await access("benchmarks/results", constants.W_OK);
  add(true, "Benchmark output", "writable");
} catch {
  add(false, "Benchmark output", "not writable");
}

console.log("\nPocket Proof Environment Check\n");
for (const row of rows) console.log(`${row.ok ? "✓" : "✗"} ${row.label}: ${row.detail}`);
const ok = rows.every((row) => row.ok);
console.log(ok ? "\nReady.\n" : "\nSetup required.\n");
process.exitCode = ok ? 0 : 1;
