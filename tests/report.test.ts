import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import schema from "../benchmark/report-schema.json";
import { assertValidReport } from "../server/lib/report-schema.js";

type Measurement = {
  profileId: "reference" | "optimized";
  phase: "warmup" | "measured";
  sequence: number;
  command: string[];
  timing: { inferenceMs: number; totalMs: number; modelLoadMs: number; encodeMs: number };
  memory: { peakRssBytes: number };
  quality: { normalizedWer: number };
  transcript: { text: string };
};

type Summary = { count: number; median: number; min: number; max: number; mean: number; stddev: number };
type Aggregate = {
  inferenceMs: number;
  totalMs: number;
  peakRssBytes: number;
  modelBytes: number;
  wer: number;
  runs: number;
  statistics: Record<"inferenceMs" | "totalMs" | "modelLoadMs" | "encodeMs" | "peakRssBytes" | "wer", Summary>;
};
type Report = {
  schemaVersion: number;
  status: string;
  source: string;
  strategy: string;
  executionStrategy: string;
  system: { architecture: string; translated: boolean };
  input: { sha256: string };
  methodology: { measuredRuns: number; warmupRuns: number; threads: number; commandSemantics: { language: string; gpu: string; decoder: string; note: string } };
  profiles: Array<{ id: "reference" | "optimized"; threads: number; model: { bytes: number; sha256: string }; runtime: { sha256: string; file: string; lipo: string } }>;
  measurements: Measurement[];
  aggregates: Record<"reference" | "optimized", Aggregate>;
  comparison: { speedup: number; latencyReductionPct: number; memoryReductionPct: number; modelReductionPct: number; sampleQualityRetentionPct: number; transcriptExactMatch: boolean };
  provenance: { configHash: string; sttRunnerRevision: string; modelRepositoryRevision: string };
};

const reportFile = new URL("../public/featured-report.json", import.meta.url);
const report = JSON.parse(await readFile(reportFile, "utf8")) as Report;
const sha256 = /^[a-f0-9]{64}$/;
const revision = /^[a-f0-9]{40}$/;
const closeTo = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 8);
const median = (values: number[]) => {
  const ordered = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[midpoint] : (ordered[midpoint - 1] + ordered[midpoint]) / 2;
};
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const sampleStddev = (values: number[]) => values.length < 2 ? 0 : Math.sqrt(values.reduce((sum, value) => sum + (value - mean(values)) ** 2, 0) / (values.length - 1));

describe("published benchmark report", () => {
  it("enforces the closed JSON schema before publication", () => {
    expect(() => assertValidReport(report)).not.toThrow();
    expect(() => assertValidReport({ ...report, source: "draft" })).toThrow(/source/);
  });

  it("locks the schema to a complete, raw-run-backed Arm64 report", () => {
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(expect.arrayContaining(["methodology", "measurements", "aggregates", "comparison", "provenance"]));
    expect(schema.$defs.runtimeArtifact.required).toEqual(expect.arrayContaining(["sha256", "file", "lipo"]));
    expect(schema.$defs.measurement.required).toEqual(expect.arrayContaining(["sequence", "command", "timing", "memory", "transcript", "quality"]));
    expect(schema.$defs.system.properties.architecture.const).toBe("arm64");
    expect(schema.$defs.system.properties.translated.const).toBe(false);
  });

  it("contains a complete native Arm64, checksum-pinned primary experiment", () => {
    expect(report.schemaVersion).toBe(1);
    expect(report.status).toBe("complete");
    expect(["recorded", "live"]).toContain(report.source);
    expect(report.strategy).toBe("sequential-interleaved");
    expect(report.executionStrategy).toBe("sequential-interleaved");
    expect(report.system).toMatchObject({ architecture: "arm64", translated: false });
    expect(report.input.sha256).toMatch(sha256);
    expect(report.provenance.configHash).toMatch(sha256);
    expect(report.provenance.sttRunnerRevision).toMatch(revision);
    expect(report.provenance.modelRepositoryRevision).toMatch(revision);
    expect(report.profiles.map((profile) => profile.id)).toEqual(["reference", "optimized"]);
    expect(report.methodology.commandSemantics.language).toContain("small.en");
    expect(report.methodology.commandSemantics.gpu).toContain("GGML_METAL=OFF");
    expect(report.methodology.commandSemantics.note).toContain("exact historical process arguments");

    for (const profile of report.profiles) {
      expect(profile.threads).toBe(report.methodology.threads);
      expect(profile.model.sha256).toMatch(sha256);
      expect(profile.runtime.sha256).toMatch(sha256);
      expect(profile.runtime.file).toContain("arm64");
      expect(profile.runtime.lipo).toContain("arm64");
    }
  });

  it("recomputes all published aggregates from immutable measured runs", () => {
    const sequences = report.measurements.map((measurement) => measurement.sequence);
    expect(new Set(sequences).size).toBe(report.measurements.length);
    expect([...sequences].sort((left, right) => left - right)).toEqual(Array.from({ length: sequences.length }, (_, index) => index + 1));

    for (const profile of report.profiles) {
      const all = report.measurements.filter((measurement) => measurement.profileId === profile.id);
      const measured = all.filter((measurement) => measurement.phase === "measured");
      const warmups = all.filter((measurement) => measurement.phase === "warmup");
      const aggregate = report.aggregates[profile.id];
      expect(measured).toHaveLength(report.methodology.measuredRuns);
      expect(warmups).toHaveLength(report.methodology.warmupRuns);
      expect(aggregate.runs).toBe(measured.length);
      expect(aggregate.modelBytes).toBe(profile.model.bytes);

      for (const measurement of all) {
        expect(measurement.command.length).toBeGreaterThan(0);
        expect(measurement.command).toContain("-t");
        expect(measurement.command[measurement.command.indexOf("-t") + 1]).toBe(String(profile.threads));
      }

      const raw = {
        inferenceMs: measured.map((measurement) => measurement.timing.inferenceMs),
        totalMs: measured.map((measurement) => measurement.timing.totalMs),
        modelLoadMs: measured.map((measurement) => measurement.timing.modelLoadMs),
        encodeMs: measured.map((measurement) => measurement.timing.encodeMs),
        peakRssBytes: measured.map((measurement) => measurement.memory.peakRssBytes),
        wer: measured.map((measurement) => measurement.quality.normalizedWer),
      };
      const statistics = aggregate.statistics;
      for (const [metric, values] of Object.entries(raw) as Array<[keyof typeof raw, number[]]>) {
        const stored = statistics[metric];
        expect(stored.count).toBe(values.length);
        closeTo(stored.median, median(values));
        closeTo(stored.min, Math.min(...values));
        closeTo(stored.max, Math.max(...values));
        closeTo(stored.mean, mean(values));
        closeTo(stored.stddev, sampleStddev(values));
      }
      closeTo(aggregate.inferenceMs, median(raw.inferenceMs));
      closeTo(aggregate.totalMs, median(raw.totalMs));
      closeTo(aggregate.peakRssBytes, median(raw.peakRssBytes));
      closeTo(aggregate.wer, median(raw.wer));
    }
  });

  it("recomputes the published comparison from the raw-run medians", () => {
    const reference = report.aggregates.reference;
    const optimized = report.aggregates.optimized;
    closeTo(report.comparison.speedup, reference.inferenceMs / optimized.inferenceMs);
    closeTo(report.comparison.latencyReductionPct, ((reference.inferenceMs - optimized.inferenceMs) / reference.inferenceMs) * 100);
    closeTo(report.comparison.memoryReductionPct, ((reference.peakRssBytes - optimized.peakRssBytes) / reference.peakRssBytes) * 100);
    closeTo(report.comparison.modelReductionPct, ((reference.modelBytes - optimized.modelBytes) / reference.modelBytes) * 100);
    expect(report.comparison.sampleQualityRetentionPct).toBe(100);

    const referenceText = report.measurements.find((measurement) => measurement.profileId === "reference" && measurement.phase === "measured")?.transcript.text;
    const optimizedText = report.measurements.find((measurement) => measurement.profileId === "optimized" && measurement.phase === "measured")?.transcript.text;
    expect(report.comparison.transcriptExactMatch).toBe(referenceText === optimizedText);
  });
});
