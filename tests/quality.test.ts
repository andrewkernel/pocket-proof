import { describe, expect, it } from "vitest";
import { normalizeTranscript, wordErrorRate } from "../server/lib/quality.js";

describe("transcript quality", () => {
  it("normalizes case and punctuation", () => {
    expect(normalizeTranscript("And so, my fellow Americans—ask not.")).toBe("and so my fellow americans ask not");
  });

  it("calculates word error rate", () => {
    expect(wordErrorRate("one two three four", "one two four")).toBe(0.25);
    expect(wordErrorRate("same words", "Same words!")).toBe(0);
  });
});
