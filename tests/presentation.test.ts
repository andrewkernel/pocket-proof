import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

const text = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const bytes = (path: string) => readFile(new URL(`../${path}`, import.meta.url));
const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex");

function pngDimensions(value: Buffer) {
  expect(value.subarray(1, 4).toString()).toBe("PNG");
  return { width: value.readUInt32BE(16), height: value.readUInt32BE(20) };
}

describe("judge-facing presentation", () => {
  test("opens with the outcome and puts the race before implementation detail", async () => {
    const app = await text("src/App.tsx");
    const render = app.slice(app.indexOf("export default function App"));
    expect(render).toContain("Faster local speech.");
    expect(render).toContain("Proof you can inspect.");
    expect(render).toContain("Watch the 2.6-second proof");
    expect(render).toContain("Timed visualization of stored median inference durations—not live telemetry.");
    expect(render.indexOf("className=\"hero\"")).toBeLessThan(render.indexOf("id=\"race\""));
    expect(render.indexOf("id=\"race\"")).toBeLessThan(render.indexOf("<MediaLibrary"));
  });

  test("keeps hosted replay honest and the selected preview separate from featured evidence", async () => {
    const app = await text("src/App.tsx");
    expect(app).toContain("const raceClip = staticJudgeMode ? featuredClip : selectedClip");
    expect(app).toContain("The source processes were measured sequentially to avoid resource contention.");
    expect(app).toContain("Hosted Judge Mode replays the featured JFK report");
    expect(app).toContain("What did not win");
  });

  test("submission story maps a human problem to measured proof and negative evidence", async () => {
    const devpost = await text("submission/devpost-draft.md");
    for (const heading of [
      "## The eight-second version",
      "## Inspiration",
      "## What it does",
      "## The controlled optimization",
      "## Why Arm",
      "## The experiment that did not win",
      "## Why Pocket Proof should win",
    ]) expect(devpost).toContain(heading);
    expect(devpost).toContain("1.55× faster");
    expect(devpost).toContain("zero audio uploads");
    expect(devpost).toContain("0.9832×");
    expect(devpost).toContain("| Corpus WER | 6.9% | 8.3% |");
  });

  test("social and demo assets are presentation-ready and integrity pinned", async () => {
    const social = await bytes("assets/pocket-proof-social-preview.png");
    const hero = await bytes("assets/screenshots/judge-mode-hero.png");
    expect(pngDimensions(social)).toEqual({ width: 1200, height: 630 });
    expect(pngDimensions(hero)).toEqual({ width: 1512, height: 861 });

    const manifest = JSON.parse(await text("assets/demo/demo-manifest.json"));
    const video = await bytes(manifest.videoPath);
    const captions = await bytes(manifest.captionsPath);
    expect(manifest.durationMs).toBeGreaterThan(60_000);
    expect(manifest.durationMs).toBeLessThan(90_000);
    expect(video.length).toBe(manifest.bytes);
    expect(sha256(video)).toBe(manifest.sha256);
    expect(sha256(captions)).toBe(manifest.captionsSha256);
  });
});
