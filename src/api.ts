import type { Aggregate, Measurement, Profile, RaceEvent, Report, SystemInfo, UnknownRecord } from "./types";

const isRecord = (value: unknown): value is UnknownRecord => typeof value === "object" && value !== null;
const text = (value: unknown) => typeof value === "string" ? value : undefined;
const num = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const bool = (value: unknown) => typeof value === "boolean" ? value : undefined;

function profile(value: unknown, index: number): Profile {
  const item = isRecord(value) ? value : {};
  const model = isRecord(item.model) ? item.model : {};
  return {
    id: text(item.id) ?? `profile-${index}`,
    label: text(item.label) ?? text(item.name) ?? `Profile ${index + 1}`,
    precision: text(item.precision) ?? text(model.precision),
    threads: num(item.threads),
    backend: text(item.backend) ?? text(isRecord(item.runtime) ? item.runtime.backend : undefined),
    model: { id: text(model.id), bytes: num(model.bytes) ?? num(item.modelBytes), sha256: text(model.sha256), precision: text(model.precision) },
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
  return { id: text(root.id) ?? "featured", createdAt: text(root.createdAt), source: text(root.source), strategy: text(root.strategy), system: { architecture: text(system.architecture), chip: text(system.chip) ?? text(system.hardwareModel), memoryBytes: num(system.memoryBytes) ?? num(system.totalMemoryBytes), os: text(system.os) ?? text(system.osVersion), runtime: text(system.runtime), binaryArchitecture: text(system.binaryArchitecture) }, profiles, aggregates, measurements, input: { durationMs: num(input.durationMs), id: text(input.id) }, comparison: { transcriptExactMatch: bool(comparison.transcriptExactMatch) }, provenance: isRecord(root.provenance) ? { gitCommit: text(root.provenance.gitCommit), configHash: text(root.provenance.configHash), appVersion: text(root.provenance.appVersion) } : undefined };
}

async function fetchJson(path: string) {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<unknown>;
}

export async function loadEvidence(): Promise<{ report: Report | null; system: SystemInfo | undefined; origin: "api" | "fallback" | "none" }> {
  let system: SystemInfo | undefined;
  try {
    const payload = await fetchJson("/api/system");
    const value = isRecord(payload) && isRecord(payload.system) ? payload.system : payload;
    if (isRecord(value)) system = { architecture: text(value.architecture), chip: text(value.chip), memoryBytes: num(value.memoryBytes), os: [text(value.os), text(value.osVersion)].filter(Boolean).join(" ") };
  } catch { /* system proof is optional */ }
  try { const found = normalizeReport(await fetchJson("/api/reports/featured")); if (found) return { report: found, system, origin: "api" }; } catch { /* fall through */ }
  try { const found = normalizeReport(await fetchJson("/featured-report.json")); if (found) return { report: found, system, origin: "fallback" }; } catch { return { report: null, system, origin: "none" }; }
  return { report: null, system, origin: "none" };
}

export async function startRace(onEvent: (event: RaceEvent) => void): Promise<void> {
  const response = await fetch("/api/races", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: "{}" });
  if (!response.ok) throw new Error(`Could not start race (${response.status})`);
  const payload = await response.json() as UnknownRecord;
  if (payload.report) { onEvent({ type: "race.complete", report: payload.report }); return; }
  const url = text(payload.eventsUrl) ?? (text(payload.id) ? `/api/races/${payload.id}/events` : undefined);
  if (!url) throw new Error("The benchmark service did not return a race event stream.");
  const stream = new EventSource(url);
  stream.onmessage = (message) => { try { const event = JSON.parse(message.data) as RaceEvent; onEvent(event); if (event.type === "race.complete" || event.type === "race.error") stream.close(); } catch { /* ignore malformed event */ } };
  stream.onerror = () => { stream.close(); onEvent({ type: "race.error", message: "The live event stream disconnected." }); };
}
