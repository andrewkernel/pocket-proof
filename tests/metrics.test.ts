import { describe, expect, it } from "vitest";
import { aggregate, deriveComparison, median } from "../server/lib/metrics.js";

describe("benchmark metrics", () => {
  it("calculates a median without mutating input", () => {
    const values = [9, 1, 5, 3];
    expect(median(values)).toBe(4);
    expect(values).toEqual([9, 1, 5, 3]);
  });

  it("reports sample statistics", () => {
    expect(aggregate([100, 110, 90])).toMatchObject({ count: 3, median: 100, min: 90, max: 110, mean: 100 });
  });

  it("derives a comparison only from profile evidence", () => {
    const reference = { model: { bytes: 100 }, transcript: "same", aggregates: { totalMs: { median: 200 }, peakRssBytes: { median: 1000 } } };
    const optimized = { model: { bytes: 50 }, transcript: "same", aggregates: { totalMs: { median: 100 }, peakRssBytes: { median: 750 } } };
    expect(deriveComparison(reference, optimized)).toEqual({
      speedup: 2,
      latencyChangePct: -50,
      memoryReductionPct: 25,
      modelReductionPct: 50,
      transcriptExactMatch: true,
    });
  });
});

