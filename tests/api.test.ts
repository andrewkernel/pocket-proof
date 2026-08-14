import { describe, expect, it } from "vitest";
import { normalizeMediaCatalog, normalizeReport } from "../src/api";

describe("report normalization", () => {
  it("preserves transcript equivalence evidence used by result copy", () => {
    const report = normalizeReport({
      id: "run-test",
      profiles: [{ id: "reference", label: "Reference" }, { id: "optimized", label: "Optimized" }],
      aggregates: { reference: {}, optimized: {} },
      measurements: [],
      comparison: { transcriptExactMatch: true },
    });

    expect(report?.comparison?.transcriptExactMatch).toBe(true);
  });

  it("normalizes licensed preset media records without inventing required fields", () => {
    const clips = normalizeMediaCatalog({
      clips: [{
        id: "clip-1", title: "Clip", speaker: "Speaker", description: "Description",
        durationMs: 12000, videoPath: "/media/clip.mp4", difficulty: "clean",
        source: { license: "Public domain" },
      }, { id: "invalid" }],
    });

    expect(clips).toHaveLength(1);
    expect(clips[0]).toMatchObject({ id: "clip-1", durationMs: 12000, source: { license: "Public domain" } });
  });
});
