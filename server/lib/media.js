import { readFile } from "node:fs/promises";
import path from "node:path";
import initSqlJs from "sql.js";

const root = path.resolve();
let databasePromise;

async function openDatabase() {
  const wasmPath = new URL("../../node_modules/sql.js/dist/sql-wasm.wasm", import.meta.url).pathname;
  const SQL = await initSqlJs({ locateFile: () => wasmPath });
  return new SQL.Database(await readFile(path.join(root, "benchmark/preset-media.sqlite")));
}

function database() {
  databasePromise ??= openDatabase();
  return databasePromise;
}

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    speaker: row.speaker,
    recordedAt: row.recorded_at,
    description: row.description,
    durationMs: row.duration_ms,
    sampleRateHz: row.sample_rate_hz,
    channels: row.channels,
    audioPath: row.audio_path,
    videoPath: row.video_path,
    posterPath: row.poster_path,
    referenceTranscript: row.reference_transcript,
    difficulty: row.difficulty,
    featured: row.featured === 1,
    tags: JSON.parse(row.tags_json),
    hashes: {
      audioSha256: row.audio_sha256,
      videoSha256: row.video_sha256,
      sourceSha256: row.source_sha256,
    },
    source: {
      label: row.source_label,
      pageUrl: row.source_page_url,
      downloadUrl: row.source_download_url,
      localSourcePath: row.local_source_path,
      license: row.license,
      attribution: row.attribution,
    },
  };
}

export async function listMediaClips() {
  const db = await database();
  const statement = db.prepare("SELECT * FROM clips ORDER BY featured DESC, recorded_at DESC");
  const clips = [];
  while (statement.step()) clips.push(mapRow(statement.getAsObject()));
  statement.free();
  return clips;
}

export async function getMediaClip(id) {
  const db = await database();
  const statement = db.prepare("SELECT * FROM clips WHERE id = ?");
  statement.bind([id]);
  const clip = statement.step() ? mapRow(statement.getAsObject()) : null;
  statement.free();
  return clip;
}
