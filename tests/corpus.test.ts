import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { median } from "../server/lib/metrics.js";
import { wordErrorStats } from "../server/lib/quality.js";
import { assertValidReport } from "../server/lib/report-schema.js";

type Run = { timing: { inferenceMs: number }; transcript: { text: string } };
type Report = {
  input: { id: string; durationMs: number; referenceTranscript: string };
  measurements: Array<Run & { profileId: string; phase: string }>;
  aggregates: { reference: { inferenceMs: number }; optimized: { inferenceMs: number } };
  comparison: { speedup: number };
};
type Corpus = {
  configuration: { clipCount: number; measuredProcessCount: number; runsPerProfilePerClip: number };
  perClip: Array<{ clipId: string; reportPath: string; reportSha256: string; speedup: number; referenceWer: number; optimizedWer: number }>;
  aggregate: { medianPairedSpeedup: number; referenceCorpusWer: number; optimizedCorpusWer: number; referenceWordErrors: number; optimizedWordErrors: number; referenceWords: number };
};

const root = new URL("../", import.meta.url);
const summary = JSON.parse(await readFile(new URL("benchmarks/corpus-summary.json", root), "utf8")) as Corpus;
const publicSummary = JSON.parse(await readFile(new URL("public/corpus-summary.json", root), "utf8")) as Corpus;
const catalog = JSON.parse(await readFile(new URL("benchmark/media-catalog.json", root), "utf8"));
const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

describe("published corpus evidence", () => {
  it("keeps the public corpus artifact byte-for-byte aligned with the immutable source", () => {
    expect(publicSummary).toEqual(summary);
    expect(summary.perClip.map((clip) => clip.clipId).sort()).toEqual(catalog.clips.map((clip: { id: string }) => clip.id).sort());
    expect(summary.configuration.clipCount).toBe(catalog.clips.length);
    expect(summary.configuration.measuredProcessCount).toBe(summary.configuration.clipCount * summary.configuration.runsPerProfilePerClip * 2);
  });

  it("recomputes corpus timing, report hashes, and word errors from raw reports", async () => {
    const pairedRatios: number[] = [];
    let referenceErrors = 0;
    let optimizedErrors = 0;
    let referenceWords = 0;
    for (const clip of summary.perClip) {
      const bytes = await readFile(new URL(clip.reportPath, root));
      expect(sha256(bytes)).toBe(clip.reportSha256);
      const report = JSON.parse(bytes.toString("utf8")) as Report;
      expect(() => assertValidReport(report)).not.toThrow();
      const reference = report.measurements.filter((run) => run.profileId === "reference" && run.phase === "measured");
      const optimized = report.measurements.filter((run) => run.profileId === "optimized" && run.phase === "measured");
      expect(reference).toHaveLength(summary.configuration.runsPerProfilePerClip);
      expect(optimized).toHaveLength(summary.configuration.runsPerProfilePerClip);
      expect(report.aggregates.reference.inferenceMs / report.aggregates.optimized.inferenceMs).toBeCloseTo(clip.speedup, 10);
      for (let index = 0; index < reference.length; index += 1) pairedRatios.push(reference[index].timing.inferenceMs / optimized[index].timing.inferenceMs);
      const referenceQuality = wordErrorStats(report.input.referenceTranscript, reference[0].transcript.text);
      const optimizedQuality = wordErrorStats(report.input.referenceTranscript, optimized[0].transcript.text);
      expect(referenceQuality.wer).toBeCloseTo(clip.referenceWer, 10);
      expect(optimizedQuality.wer).toBeCloseTo(clip.optimizedWer, 10);
      referenceErrors += referenceQuality.errors;
      optimizedErrors += optimizedQuality.errors;
      referenceWords += referenceQuality.referenceWords;
    }
    expect(median(pairedRatios)).toBeCloseTo(summary.aggregate.medianPairedSpeedup, 10);
    expect(referenceErrors).toBe(summary.aggregate.referenceWordErrors);
    expect(optimizedErrors).toBe(summary.aggregate.optimizedWordErrors);
    expect(referenceWords).toBe(summary.aggregate.referenceWords);
    expect(referenceErrors / referenceWords).toBeCloseTo(summary.aggregate.referenceCorpusWer, 10);
    expect(optimizedErrors / referenceWords).toBeCloseTo(summary.aggregate.optimizedCorpusWer, 10);
  });
});
