import { describe, expect, it } from "vitest";
import { selectFeaturedReport, selectLatestLiveReport } from "../server/lib/store.js";

const report = (id: string, source: "recorded" | "live", createdAt: string, status = "complete") => ({
  id,
  source,
  createdAt,
  status,
});

describe("report selection", () => {
  it("keeps the reviewed recorded artifact featured even after a live run", () => {
    const reviewed = report("reviewed", "recorded", "2026-08-13T22:00:00.000Z");
    const live = report("live-new", "live", "2026-08-13T23:00:00.000Z");

    expect(selectFeaturedReport([live, reviewed])).toBe(reviewed);
  });

  it("returns the newest completed live run to the race endpoint", () => {
    const older = report("live-old", "live", "2026-08-13T21:00:00.000Z");
    const newer = report("live-new", "live", "2026-08-13T23:00:00.000Z");
    const incomplete = report("live-incomplete", "live", "2026-08-14T00:00:00.000Z", "running");

    expect(selectLatestLiveReport([newer, incomplete, older])).toBe(newer);
  });
});
