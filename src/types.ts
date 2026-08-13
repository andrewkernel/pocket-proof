export type UnknownRecord = Record<string, unknown>;

export type SystemInfo = {
  architecture?: string;
  chip?: string;
  memoryBytes?: number;
  os?: string;
  runtime?: string;
  binaryArchitecture?: string;
};

export type Profile = {
  id: string;
  label: string;
  precision?: string;
  threads?: number;
  backend?: string;
  model?: { id?: string; bytes?: number; sha256?: string; precision?: string };
  interventions?: string[];
};

export type Measurement = {
  profileId: string;
  phase?: string;
  timing?: { inferenceMs?: number; totalMs?: number; coldStartMs?: number; modelLoadMs?: number };
  memory?: { peakRssBytes?: number };
  transcript?: { text?: string };
  quality?: { wer?: number; normalizedWer?: number };
};

export type Aggregate = {
  inferenceMs?: number;
  totalMs?: number;
  peakRssBytes?: number;
  modelBytes?: number;
  wer?: number;
  runs?: number;
};

export type Report = {
  id: string;
  createdAt?: string;
  source?: "live" | "recorded" | string;
  strategy?: string;
  system?: SystemInfo;
  profiles: Profile[];
  measurements: Measurement[];
  aggregates: Record<string, Aggregate>;
  input?: { durationMs?: number; id?: string };
  comparison?: { transcriptExactMatch?: boolean };
  provenance?: { gitCommit?: string; configHash?: string; appVersion?: string };
};

export type RaceEvent =
  | { type: "lane.status"; profileId: string; status: string }
  | { type: "lane.metric"; profileId: string; elapsedMs?: number; rssBytes?: number }
  | { type: "lane.complete"; profileId: string }
  | { type: "race.complete"; report: unknown }
  | { type: "race.error"; message?: string }
  | { type: string; [key: string]: unknown };
