import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { getMediaClip, listMediaClips } from "../server/lib/media.js";

const catalog = JSON.parse(await readFile(new URL("../benchmark/media-catalog.json", import.meta.url), "utf8"));
const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

describe("preset media database", () => {
  it("serves every catalog record from SQLite with license and benchmark mappings", async () => {
    const clips = await listMediaClips();
    expect(clips).toHaveLength(catalog.clips.length);
    expect(clips[0].featured).toBe(true);
    for (const expected of catalog.clips) {
      const clip = await getMediaClip(expected.id);
      expect(clip).toMatchObject({
        id: expected.id,
        audioPath: expected.audioPath,
        videoPath: expected.videoPath,
        referenceTranscript: expected.referenceTranscript,
        source: { license: expected.source.license, pageUrl: expected.source.pageUrl },
      });
    }
  });

  it("pins each local audio, video, and archival source by SHA-256", async () => {
    for (const clip of catalog.clips) {
      const audio = await readFile(new URL(`../${clip.audioPath}`, import.meta.url));
      const video = await readFile(new URL(`../public${clip.videoPath}`, import.meta.url));
      const source = await readFile(new URL(`../${clip.source.localSourcePath}`, import.meta.url));
      expect(sha256(audio)).toBe(clip.hashes.audioSha256);
      expect(sha256(video)).toBe(clip.hashes.videoSha256);
      expect(sha256(source)).toBe(clip.hashes.sourceSha256);
    }
  });
});
