#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import initSqlJs from "sql.js";

const root = path.resolve();
const manifest = JSON.parse(await readFile(path.join(root, "benchmark/media-catalog.json"), "utf8"));
const databaseBytes = await readFile(path.join(root, manifest.database));
const wasmPath = new URL("../node_modules/sql.js/dist/sql-wasm.wasm", import.meta.url).pathname;
const SQL = await initSqlJs({ locateFile: () => wasmPath });
const database = new SQL.Database(databaseBytes);
const rows = database.exec("SELECT * FROM clips ORDER BY id")[0];
if (!rows || rows.values.length !== manifest.clips.length) throw new Error("Preset database row count does not match the manifest.");

const columns = rows.columns;
const records = rows.values.map((values) => Object.fromEntries(columns.map((column, index) => [column, values[index]])));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const clip of manifest.clips) {
  const record = records.find((candidate) => candidate.id === clip.id);
  if (!record) throw new Error(`Database is missing clip ${clip.id}.`);
  if (record.reference_transcript !== clip.referenceTranscript || record.video_path !== clip.videoPath) {
    throw new Error(`Database fields do not match the manifest for ${clip.id}.`);
  }
  const files = [
    [clip.audioPath, clip.hashes.audioSha256],
    [clip.videoPath.replace(/^\//, "public/"), clip.hashes.videoSha256],
    [clip.source.localSourcePath, clip.hashes.sourceSha256],
  ];
  for (const [file, expected] of files) {
    const actual = sha256(await readFile(path.join(root, file)));
    if (actual !== expected) throw new Error(`${file} checksum mismatch: expected ${expected}, received ${actual}`);
  }
}
const publicCatalog = JSON.parse(await readFile(path.join(root, "public/media-catalog.json"), "utf8"));
if (JSON.stringify(publicCatalog.clips) !== JSON.stringify(manifest.clips)) throw new Error("Public media catalog is stale.");
database.close();
console.log(`Verified preset database, public catalog, licenses, and checksums for ${manifest.clips.length} clips.`);
