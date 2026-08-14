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
  runtime?: { file?: string; lipo?: string; sha256?: string };
  interventions?: string[];
};

export type MediaClip = {
  id: string;
  title: string;
  speaker: string;
  recordedAt?: string;
  description: string;
  durationMs: number;
  sampleRateHz?: number;
  channels?: number;
  audioPath?: string;
  videoPath: string;
  posterPath?: string;
  referenceTranscript?: string;
  difficulty: string;
  featured?: boolean;
  tags?: string[];
  source?: { label?: string; pageUrl?: string; license?: string; attribution?: string };
};

export type CorpusSummary = {
  id: string;
  createdAt: string;
  configuration: { runsPerProfilePerClip: number; warmupRunsPerProfilePerClip: number; threads: number; clipCount: number; measuredProcessCount: number };
  perClip: Array<{
    clipId: string; title: string; durationMs: number; difficulty: string; reportId: string; reportPath: string; reportSha256: string;
    referenceMedianInferenceMs: number; optimizedMedianInferenceMs: number; speedup: number; referenceWer: number; optimizedWer: number; transcriptExactMatch: boolean;
  }>;
  aggregate: {
    medianPairedSpeedup: number;
    pairedSpeedupBootstrap95: { iterations: number; lower95: number; upper95: number };
    referenceCorpusWer: number;
    optimizedCorpusWer: number;
    referenceWordErrors: number;
    optimizedWordErrors: number;
    referenceWords: number;
    exactTranscriptClipMatches: number;
  };
  scope: string;
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
  input?: { durationMs?: number; id?: string; title?: string; videoPath?: string; difficulty?: string; license?: string };
  comparison?: { transcriptExactMatch?: boolean };
  findings?: { selectedIntervention?: string; rejectedIntervention?: string };
  provenance?: { gitCommit?: string; configHash?: string; appVersion?: string };
};

export type RaceEvent =
  | { type: "lane.status"; profileId: string; status: string; phase?: string; run?: number; total?: number }
  | { type: "lane.metric"; profileId: string; elapsedMs?: number; rssBytes?: number; phase?: string; sequence?: number }
  | { type: "lane.complete"; profileId: string }
  | { type: "race.complete"; report: unknown }
  | { type: "race.error"; message?: string }
  | { type: string; [key: string]: unknown };
