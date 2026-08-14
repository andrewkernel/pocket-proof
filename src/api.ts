import type { Aggregate, CorpusSummary, Measurement, MediaClip, Profile, RaceEvent, Report, SystemInfo, UnknownRecord } from "./types";

const isRecord = (value: unknown): value is UnknownRecord => typeof value === "object" && value !== null;
const text = (value: unknown) => typeof value === "string" ? value : undefined;
const num = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const bool = (value: unknown) => typeof value === "boolean" ? value : undefined;

function profile(value: unknown, index: number): Profile {
  const item = isRecord(value) ? value : {};
  const model = isRecord(item.model) ? item.model : {};
  const runtime = isRecord(item.runtime) ? item.runtime : {};
  return {
    id: text(item.id) ?? `profile-${index}`,
    label: text(item.label) ?? text(item.name) ?? `Profile ${index + 1}`,
    precision: text(item.precision) ?? text(model.precision),
    threads: num(item.threads),
    backend: text(item.backend) ?? text(isRecord(item.runtime) ? item.runtime.backend : undefined),
    model: { id: text(model.id), bytes: num(model.bytes) ?? num(item.modelBytes), sha256: text(model.sha256), precision: text(model.precision) },
    runtime: { file: text(runtime.file), lipo: text(runtime.lipo), sha256: text(runtime.sha256) },
    interventions: Array.isArray(item.interventions) ? item.interventions.filter((x): x is string => typeof x === "string") : undefined,
  };
}

function aggregate(value: unknown): Aggregate {
  const item = isRecord(value) ? value : {};
  const timing = isRecord(item.timing) ? item.timing : item;
  const memory = isRecord(item.memory) ? item.memory : item;
  return { inferenceMs: num(item.inferenceMs) ?? num(timing.inferenceMs) ?? num(item.medianInferenceMs), totalMs: num(item.totalMs) ?? num(timing.totalMs), peakRssBytes: num(item.peakRssBytes) ?? num(memory.peakRssBytes), modelBytes: num(item.modelBytes), wer: num(item.wer) ?? num(item.normalizedWer), runs: num(item.runs) ?? num(item.count) };
}

function measurement(value: unknown): Measurement | null {
  if (!isRecord(value)) return null;
  const timing = isRecord(value.timing) ? value.timing : {};
  const memory = isRecord(value.memory) ? value.memory : {};
  const transcript = isRecord(value.transcript) ? value.transcript : {};
  const quality = isRecord(value.quality) ? value.quality : {};
  const profileId = text(value.profileId) ?? text(value.profile_id);
  return profileId ? { profileId, phase: text(value.phase), timing: { inferenceMs: num(timing.inferenceMs) ?? num(value.inferenceMs), totalMs: num(timing.totalMs) ?? num(value.totalMs), coldStartMs: num(timing.coldStartMs), modelLoadMs: num(timing.modelLoadMs) }, memory: { peakRssBytes: num(memory.peakRssBytes) ?? num(value.peakRssBytes) }, transcript: { text: text(transcript.text) ?? text(value.transcript) }, quality: { wer: num(quality.wer) ?? num(value.wer), normalizedWer: num(quality.normalizedWer) } } : null;
}

export function normalizeReport(value: unknown): Report | null {
  if (!isRecord(value)) return null;
  const root = isRecord(value.report) ? value.report : value;
  const rawProfiles = Array.isArray(root.profiles) ? root.profiles : [];
  const profiles = rawProfiles.map(profile);
  if (!profiles.length) return null;
  const rawAggregates = isRecord(root.aggregates) ? root.aggregates : {};
  const aggregates = Object.fromEntries(profiles.map((p) => [p.id, aggregate(rawAggregates[p.id])]));
  const measurements = (Array.isArray(root.measurements) ? root.measurements : []).map(measurement).filter((item): item is Measurement => item !== null);
  const system = isRecord(root.system) ? root.system : {};
  const input = isRecord(root.input) ? root.input : {};
  const comparison = isRecord(root.comparison) ? root.comparison : {};
  const findings = isRecord(root.findings) ? root.findings : {};
  return { id: text(root.id) ?? "featured", createdAt: text(root.createdAt), source: text(root.source), strategy: text(root.strategy), system: { architecture: text(system.architecture), chip: text(system.chip) ?? text(system.hardwareModel), memoryBytes: num(system.memoryBytes) ?? num(system.totalMemoryBytes), os: text(system.os) ?? text(system.osVersion), runtime: text(system.runtime), binaryArchitecture: text(system.binaryArchitecture) }, profiles, aggregates, measurements, input: { durationMs: num(input.durationMs), id: text(input.id), title: text(input.title), videoPath: text(input.videoPath), difficulty: text(input.difficulty), license: text(input.license) }, comparison: { transcriptExactMatch: bool(comparison.transcriptExactMatch) }, findings: { selectedIntervention: text(findings.selectedIntervention), rejectedIntervention: text(findings.rejectedIntervention) }, provenance: isRecord(root.provenance) ? { gitCommit: text(root.provenance.gitCommit), configHash: text(root.provenance.configHash), appVersion: text(root.provenance.appVersion) } : undefined };
}

function mediaClip(value: unknown): MediaClip | null {
  if (!isRecord(value)) return null;
  const source = isRecord(value.source) ? value.source : {};
  const id = text(value.id);
  const title = text(value.title);
  const speaker = text(value.speaker);
  const description = text(value.description);
  const durationMs = num(value.durationMs);
  const videoPath = text(value.videoPath);
  const difficulty = text(value.difficulty);
  if (!id || !title || !speaker || !description || !durationMs || !videoPath || !difficulty) return null;
  return {
    id, title, speaker, description, durationMs, videoPath, difficulty,
    recordedAt: text(value.recordedAt), sampleRateHz: num(value.sampleRateHz), channels: num(value.channels),
    audioPath: text(value.audioPath), posterPath: text(value.posterPath), referenceTranscript: text(value.referenceTranscript),
    featured: bool(value.featured), tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === "string") : undefined,
    source: { label: text(source.label), pageUrl: text(source.pageUrl), license: text(source.license), attribution: text(source.attribution) },
  };
}

export function normalizeMediaCatalog(value: unknown): MediaClip[] {
  if (!isRecord(value) || !Array.isArray(value.clips)) return [];
  return value.clips.map(mediaClip).filter((clip): clip is MediaClip => clip !== null);
}

async function fetchJson(path: string) {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<unknown>;
}

export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export async function loadEvidence(): Promise<{ report: Report | null; system: SystemInfo | undefined; origin: "api" | "fallback" | "none" }> {
  let system: SystemInfo | undefined;
  try {
    const payload = await fetchJson("/api/system");
    const value = isRecord(payload) && isRecord(payload.system) ? payload.system : payload;
    if (isRecord(value)) system = { architecture: text(value.architecture), chip: text(value.chip), memoryBytes: num(value.memoryBytes), os: [text(value.os), text(value.osVersion)].filter(Boolean).join(" ") };
  } catch { /* system proof is optional */ }
  try { const found = normalizeReport(await fetchJson("/api/reports/featured")); if (found) return { report: found, system, origin: "api" }; } catch { /* fall through */ }
  try { const found = normalizeReport(await fetchJson(assetUrl("featured-report.json"))); if (found) return { report: found, system, origin: "fallback" }; } catch { return { report: null, system, origin: "none" }; }
  return { report: null, system, origin: "none" };
}

export async function loadMediaCatalog(): Promise<MediaClip[]> {
  for (const path of ["/api/media", assetUrl("media-catalog.json")]) {
    try {
      const payload = await fetchJson(path);
      const clips = normalizeMediaCatalog(payload);
      if (clips.length) return clips;
    } catch { /* use the static catalog when the local database service is unavailable */ }
  }
  return [];
}

export async function loadHistory(): Promise<Report[]> {
  try {
    const payload = await fetchJson("/api/reports");
    return Array.isArray(payload) ? payload.map(normalizeReport).filter((report): report is Report => report !== null).sort((left, right) => Date.parse(right.createdAt ?? "") - Date.parse(left.createdAt ?? "")) : [];
  } catch {
    return [];
  }
}

export async function loadCorpusSummary(): Promise<CorpusSummary | null> {
  try {
    const payload = await fetchJson(assetUrl("corpus-summary.json"));
    if (!isRecord(payload) || !isRecord(payload.configuration) || !isRecord(payload.aggregate) || !Array.isArray(payload.perClip)) return null;
    return payload as unknown as CorpusSummary;
  } catch {
    return null;
  }
}

export async function startRace(sampleId: string, onEvent: (event: RaceEvent) => void): Promise<void> {
  const response = await fetch("/api/races", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ sampleId }) });
  if (!response.ok) {
    let detail = `Could not start race (${response.status})`;
    try { const payload = await response.json() as UnknownRecord; detail = text(payload.error) ?? detail; } catch { /* retain status fallback */ }
    throw new Error(detail);
  }
  const payload = await response.json() as UnknownRecord;
  if (payload.report) { onEvent({ type: "race.complete", report: payload.report }); return; }
  const url = text(payload.eventsUrl) ?? (text(payload.id) ? `/api/races/${payload.id}/events` : undefined);
  if (!url) throw new Error("The benchmark service did not return a race event stream.");
  const stream = new EventSource(url);
  stream.onmessage = (message) => { try { const event = JSON.parse(message.data) as RaceEvent; onEvent(event); if (event.type === "race.complete" || event.type === "race.error") stream.close(); } catch { /* ignore malformed event */ } };
  stream.onerror = () => { stream.close(); onEvent({ type: "race.error", message: "The live event stream disconnected." }); };
}
