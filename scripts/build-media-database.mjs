#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import initSqlJs from "sql.js";

const root = path.resolve();
const manifestPath = path.join(root, "benchmark/media-catalog.json");
const databasePath = path.join(root, "benchmark/preset-media.sqlite");
const publicCatalogPath = path.join(root, "public/media-catalog.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const wasmPath = new URL("../node_modules/sql.js/dist/sql-wasm.wasm", import.meta.url).pathname;
const SQL = await initSqlJs({ locateFile: () => wasmPath });
const database = new SQL.Database();

database.run(`
  PRAGMA user_version = 1;
  CREATE TABLE clips (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    speaker TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    description TEXT NOT NULL,
    duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
    sample_rate_hz INTEGER NOT NULL CHECK (sample_rate_hz > 0),
    channels INTEGER NOT NULL CHECK (channels > 0),
    audio_path TEXT NOT NULL UNIQUE,
    video_path TEXT NOT NULL UNIQUE,
    poster_path TEXT NOT NULL,
    reference_transcript TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    featured INTEGER NOT NULL CHECK (featured IN (0, 1)),
    tags_json TEXT NOT NULL,
    audio_sha256 TEXT NOT NULL,
    video_sha256 TEXT NOT NULL,
    source_sha256 TEXT NOT NULL,
    source_label TEXT NOT NULL,
    source_page_url TEXT NOT NULL,
    source_download_url TEXT NOT NULL,
    local_source_path TEXT NOT NULL,
    license TEXT NOT NULL,
    attribution TEXT NOT NULL
  );
  CREATE INDEX clips_featured_idx ON clips(featured DESC, recorded_at DESC);
`);

const insert = database.prepare(`
  INSERT INTO clips (
    id, title, speaker, recorded_at, description, duration_ms, sample_rate_hz, channels,
    audio_path, video_path, poster_path, reference_transcript, difficulty, featured, tags_json,
    audio_sha256, video_sha256, source_sha256, source_label, source_page_url,
    source_download_url, local_source_path, license, attribution
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const clip of manifest.clips) {
  insert.run([
    clip.id, clip.title, clip.speaker, clip.recordedAt, clip.description, clip.durationMs,
    clip.sampleRateHz, clip.channels, clip.audioPath, clip.videoPath, clip.posterPath,
    clip.referenceTranscript, clip.difficulty, clip.featured ? 1 : 0, JSON.stringify(clip.tags),
    clip.hashes.audioSha256, clip.hashes.videoSha256, clip.hashes.sourceSha256,
    clip.source.label, clip.source.pageUrl, clip.source.downloadUrl, clip.source.localSourcePath,
    clip.source.license, clip.source.attribution,
  ]);
}
insert.free();

database.run("CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
const manifestHash = createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
database.run("INSERT INTO metadata (key, value) VALUES (?, ?), (?, ?)", [
  "schema_version", String(manifest.schemaVersion), "manifest_sha256", manifestHash,
]);

await mkdir(path.dirname(databasePath), { recursive: true });
await writeFile(databasePath, Buffer.from(database.export()));
await writeFile(publicCatalogPath, `${JSON.stringify({ schemaVersion: manifest.schemaVersion, clips: manifest.clips }, null, 2)}\n`);
database.close();
console.log(`Built ${path.relative(root, databasePath)} with ${manifest.clips.length} verified preset clips.`);
