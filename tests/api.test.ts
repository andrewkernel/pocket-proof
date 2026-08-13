import { describe, expect, it } from "vitest";
import { normalizeReport } from "../src/api";

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
});
