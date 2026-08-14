import { useEffect, useMemo, useRef, useState } from "react";
import { assetUrl, loadCorpusSummary, loadEvidence, loadHistory, loadMediaCatalog, normalizeReport, startRace } from "./api";
import type { Aggregate, CorpusSummary, MediaClip, Profile, Report, SystemInfo } from "./types";

type LaneState = Record<string, { status: string; detail?: string; elapsedMs?: number; rssBytes?: number }>;

const formatMs = (value?: number) => value === undefined
  ? "—"
  : value >= 1000
    ? `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} s`
    : `${Math.round(value)} ms`;

const formatBytes = (value?: number) => value === undefined
  ? "—"
  : value >= 1024 ** 3
    ? `${(value / 1024 ** 3).toFixed(2)} GiB`
    : `${(value / 1024 ** 2).toFixed(0)} MiB`;

const percent = (value?: number, digits = 1) => value === undefined ? "—" : `${(value * 100).toFixed(digits)}%`;
const profileLabel = (profile: Profile) => [
  profile.precision ?? profile.model?.precision,
  profile.backend,
  profile.threads ? `${profile.threads} threads` : undefined,
].filter(Boolean).join(" · ");

function metric(report: Report, profile: Profile): Aggregate {
  const aggregate = report.aggregates[profile.id] ?? {};
  const candidate = report.measurements.filter((item) => item.profileId === profile.id && item.phase !== "warmup").at(-1);
  return {
    inferenceMs: aggregate.inferenceMs ?? candidate?.timing?.inferenceMs,
    totalMs: aggregate.totalMs ?? candidate?.timing?.totalMs,
    peakRssBytes: aggregate.peakRssBytes ?? candidate?.memory?.peakRssBytes,
    modelBytes: aggregate.modelBytes ?? profile.model?.bytes,
    wer: aggregate.wer ?? candidate?.quality?.normalizedWer ?? candidate?.quality?.wer,
    runs: aggregate.runs,
  };
}

function useComparison(report: Report | null) {
  return useMemo(() => {
    if (!report || report.profiles.length < 2) return null;
    const [reference, optimized] = report.profiles;
    const base = metric(report, reference);
    const better = metric(report, optimized);
    const ratio = base.inferenceMs && better.inferenceMs ? base.inferenceMs / better.inferenceMs : undefined;
    const memory = base.peakRssBytes && better.peakRssBytes ? 1 - better.peakRssBytes / base.peakRssBytes : undefined;
    const size = base.modelBytes && better.modelBytes ? 1 - better.modelBytes / base.modelBytes : undefined;
    const qualityDelta = base.wer !== undefined && better.wer !== undefined ? better.wer - base.wer : undefined;
    return { reference, optimized, base, better, ratio, memory, size, qualityDelta };
  }, [report]);
}

function ProofStrip({ system, report }: { system?: SystemInfo; report: Report | null }) {
  const architecture = system?.architecture ?? report?.system?.architecture;
  const recordedBinaryVerified = report?.profiles.length
    ? report.profiles.every((profile) => profile.runtime?.file?.includes("arm64") && profile.runtime?.lipo?.includes("arm64"))
    : false;
  const binary = system?.binaryArchitecture ?? report?.system?.binaryArchitecture ?? (recordedBinaryVerified ? "arm64" : undefined);
  return (
    <div className="proof-strip" aria-label="Local inference proof">
      <span><i className="proof-dot" aria-hidden="true" /> Local inference</span>
      <span>{architecture ? architecture.toUpperCase() : "Architecture pending"}</span>
      <span>{binary ? `Native binary: ${binary}` : "Network not required after setup"}</span>
    </div>
  );
}

function MediaLibrary({ clips, selectedId, onSelect, disabled, featuredId, staticJudgeMode }: {
  clips: MediaClip[];
  selectedId?: string;
  onSelect: (id: string) => void;
  disabled: boolean;
  featuredId?: string;
  staticJudgeMode: boolean;
}) {
  const selected = clips.find((clip) => clip.id === selectedId) ?? clips[0];
  if (!selected) {
    return <section className="media-library media-library--empty" aria-label="Preset media library"><p>Preset media database unavailable. Run <code>npm run media:verify</code>.</p></section>;
  }
  return (
    <section className="media-library" aria-labelledby="media-library-title">
      <div className="media-copy">
        <p className="eyebrow">Three public-domain voices</p>
        <h2 id="media-library-title">Test the claim beyond one clean clip.</h2>
        <p>Each preview maps to a checksum-pinned 16 kHz mono WAV, reference transcript, license record, and benchmark ID. {staticJudgeMode ? "Hosted Judge Mode replays the featured JFK report; clone the project to benchmark any preset natively." : "Choose a preset for the next native benchmark."}</p>
        <div className="clip-picker" aria-label="Preset benchmark clips">
          {clips.map((clip) => (
            <button
              type="button"
              key={clip.id}
              className={clip.id === selected.id ? "clip-option is-selected" : "clip-option"}
              aria-pressed={clip.id === selected.id}
              onClick={() => onSelect(clip.id)}
              disabled={disabled}
            >
              <span><strong>{clip.title}</strong><small>{clip.speaker}{clip.id === featuredId ? " · featured proof" : ""}</small></span>
              <span>{formatMs(clip.durationMs)}</span>
            </button>
          ))}
        </div>
      </div>
      <figure className="clip-preview">
        <video key={selected.id} controls preload="metadata" poster={selected.posterPath ? assetUrl(selected.posterPath) : undefined} aria-label={`${selected.title} preview`}>
          <source src={assetUrl(selected.videoPath)} type="video/mp4" />
          Your browser does not support the video preview.
        </video>
        <figcaption>
          <span><strong>{selected.title}</strong> · {selected.difficulty}</span>
          <span>{selected.source?.license ?? "License recorded in catalog"}</span>
        </figcaption>
      </figure>
    </section>
  );
}

function Waveform({ active = false }: { active?: boolean }) {
  const heights = [12, 21, 37, 28, 56, 30, 18, 44, 65, 39, 20, 32, 53, 70, 42, 28, 48, 34, 18, 30, 50, 63, 37, 25, 40, 21, 14, 35, 59, 45, 24, 36, 64, 40, 22, 16, 33, 52, 29, 17, 41, 66, 38, 20, 46, 31, 15, 25];
  return (
    <svg className={`waveform ${active ? "is-active" : ""}`} viewBox="0 0 480 82" role="img" aria-label="Audio waveform">
      <title>Audio waveform</title>
      {heights.map((height, index) => (
        <line key={index} x1={5 + index * 10} y1={(82 - height) / 2} x2={5 + index * 10} y2={(82 + height) / 2} />
      ))}
    </svg>
  );
}

function Lane({ profile, info, result, mode, progress, winner }: {
  profile: Profile;
  info?: LaneState[string];
  result?: Aggregate;
  mode: "reference" | "optimized";
  progress?: number;
  winner?: boolean;
}) {
  const status = info?.status ?? (result ? "measured" : "ready");
  return (
    <article className={`lane lane--${mode}`} aria-label={`${profile.label} benchmark lane`}>
      <header>
        <span className="lane-kicker">{mode === "reference" ? "Reference path" : "Recommended path"}</span>
        <span className={`status status--${status.replace(/\s+/g, "-")}`}>{info?.detail ?? status}</span>
      </header>
      <h3>{profile.label}</h3>
      <p className="lane-config">{profileLabel(profile) || "Configuration awaiting evidence"}</p>
      <Waveform active={status === "running"} />
      {progress !== undefined && (
        <div className="lane-progress" aria-label={`${Math.round(progress * 100)} percent of measured duration replayed`}>
          <i style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
        </div>
      )}
      <dl className="lane-metrics">
        <div><dt>Inference</dt><dd>{formatMs(info?.elapsedMs ?? result?.inferenceMs)}</dd></div>
        <div><dt>Peak RSS</dt><dd>{formatBytes(info?.rssBytes ?? result?.peakRssBytes)}</dd></div>
        <div><dt>Artifact</dt><dd>{formatBytes(result?.modelBytes ?? profile.model?.bytes)}</dd></div>
      </dl>
      {winner && <p className="winner-badge"><span aria-hidden="true">✓</span> Finished first</p>}
    </article>
  );
}

function HeroScorecard({ report, corpus }: { report: Report | null; corpus: CorpusSummary | null }) {
  const comparison = useComparison(report);
  const speed = corpus?.aggregate.medianPairedSpeedup ?? comparison?.ratio;
  const processCount = corpus?.configuration.measuredProcessCount;
  return (
    <aside className="hero-scorecard" aria-label="Verified optimization outcome">
      <div className="scorecard-label"><span>Measured outcome</span><span>{report?.system?.chip ?? "Arm64 device"}</span></div>
      <div className="scorecard-primary">
        <strong>{speed === undefined ? "—" : `${speed.toFixed(2)}×`}</strong>
        <span>faster local transcription</span>
      </div>
      <div className="scorecard-grid">
        <div><strong>{comparison?.memory === undefined ? "—" : percent(comparison.memory, 0)}</strong><span>less peak memory</span></div>
        <div><strong>{comparison?.size === undefined ? "—" : percent(comparison.size, 0)}</strong><span>smaller model</span></div>
        <div><strong>0</strong><span>audio uploads</span></div>
      </div>
      <p>{processCount ? `Speed: ${processCount} processes across three clips. Memory: featured JFK median.` : "Loading recorded evidence…"} Raw runs included.</p>
    </aside>
  );
}

function OptimizationStory({ report, corpus }: { report: Report; corpus: CorpusSummary | null }) {
  const comparison = useComparison(report);
  if (!comparison) return null;
  return (
    <section className="optimization-story" aria-labelledby="optimization-story-title">
      <div className="story-heading">
        <p className="eyebrow">The shipping decision</p>
        <h2 id="optimization-story-title">Smaller weights. Faster speech. Visible cost.</h2>
        <p>Pocket Proof changes one variable—FP16 weights to Q4_0—then makes the performance and quality tradeoff impossible to hide.</p>
      </div>
      <ol className="story-steps">
        <li><span>01</span><div><strong>Keep speech private</strong><p>Inference runs locally through a verified native Arm64 binary. No transcription API and no audio upload.</p></div></li>
        <li><span>02</span><div><strong>Reduce the model</strong><p>{formatBytes(comparison.base.modelBytes)} becomes {formatBytes(comparison.better.modelBytes)} while the runtime, clip, decoder and thread count stay fixed.</p></div></li>
        <li><span>03</span><div><strong>Expose the tradeoff</strong><p>The featured clip retains an exact normalized transcript. Across the three-clip corpus, WER moves from {corpus ? percent(corpus.aggregate.referenceCorpusWer) : "—"} to {corpus ? percent(corpus.aggregate.optimizedCorpusWer) : "—"}.</p></div></li>
      </ol>
    </section>
  );
}

function RunHistory({ reports }: { reports: Report[] }) {
  if (!reports.length) return null;
  return (
    <section className="evidence-section history-section" aria-labelledby="history-title">
      <div className="section-title"><div><p className="eyebrow">Immutable local results</p><h2 id="history-title">Benchmark history</h2></div></div>
      <div className="history-list">
        {reports.slice(0, 6).map((item) => {
          const profiles = item.profiles;
          const reference = profiles[0] ? metric(item, profiles[0]).inferenceMs : undefined;
          const optimized = profiles[1] ? metric(item, profiles[1]).inferenceMs : undefined;
          const ratio = reference && optimized ? reference / optimized : undefined;
          return (
            <article key={item.id}>
              <span><strong>{item.input?.title ?? item.input?.id ?? "Recorded clip"}</strong><small>{item.source ?? "recorded"} · {item.createdAt ? new Date(item.createdAt).toLocaleString() : "time unavailable"}</small></span>
              <span>{ratio ? `${ratio.toFixed(2)}×` : "—"}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CorpusEvidence({ summary }: { summary: CorpusSummary }) {
  const interval = summary.aggregate.pairedSpeedupBootstrap95;
  return (
    <section className="evidence-section corpus-section" aria-labelledby="corpus-title">
      <div className="section-title">
        <div><p className="eyebrow">Multi-clip validation</p><h2 id="corpus-title">The gain holds across three licensed clips.</h2></div>
        <span className="quality-chip">{summary.configuration.measuredProcessCount} measured processes</span>
      </div>
      <div className="corpus-overview">
        <article><strong>{summary.aggregate.medianPairedSpeedup.toFixed(2)}×</strong><span>median paired speedup</span></article>
        <article><strong>{interval.lower95.toFixed(2)}–{interval.upper95.toFixed(2)}×</strong><span>bootstrap 95% interval</span></article>
        <article><strong>{percent(summary.aggregate.referenceCorpusWer)}</strong><span>FP16 corpus WER</span></article>
        <article><strong>{percent(summary.aggregate.optimizedCorpusWer)}</strong><span>Q4 corpus WER</span></article>
      </div>
      <div className="table-scroll corpus-table" tabIndex={0} aria-label="Multi-clip corpus results, horizontally scrollable on small screens">
        <table>
          <thead><tr><th>Preset clip</th><th>Difficulty</th><th>FP16</th><th>Q4_0</th><th>Speedup</th><th>Q4 WER</th></tr></thead>
          <tbody>{summary.perClip.map((clip) => (
            <tr key={clip.clipId}><th scope="row">{clip.title}</th><td>{clip.difficulty}</td><td>{formatMs(clip.referenceMedianInferenceMs)}</td><td>{formatMs(clip.optimizedMedianInferenceMs)}</td><td>{clip.speedup.toFixed(2)}×</td><td>{percent(clip.optimizedWer)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <p className="corpus-scope">{summary.scope} Q4 changed one additional word on the noisy Apollo radio clip; both archival speech clips retained exact profile-to-profile transcript agreement.</p>
    </section>
  );
}

function LoadingEvidence() {
  return (
    <div className="loading-evidence" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading measured benchmark evidence</span>
      <div className="skeleton-lane" aria-hidden="true"><i /><i /><i /></div>
      <div className="skeleton-lane" aria-hidden="true"><i /><i /><i /></div>
    </div>
  );
}

function TaglineReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const lines = [
    "Don’t trust the speedup.",
    "Make it prove itself.",
  ];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.35 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  let wordIndex = 0;
  return (
    <section ref={sectionRef} className={`tagline-reveal ${visible ? "is-visible" : ""}`} aria-label="Pocket Proof evidence standard">
      <p>
        {lines.map((line) => (
          <span className="tagline-line" key={line}>
            {line.split(" ").map((word) => {
              const delay = wordIndex * 42;
              wordIndex += 1;
              return <span className="tagline-word" style={{ transitionDelay: `${delay}ms` }} key={`${word}-${wordIndex}`}>{word} </span>;
            })}
          </span>
        ))}
      </p>
    </section>
  );
}

function ResultReveal({ report }: { report: Report }) {
  const comparison = useComparison(report);
  if (!comparison) return null;
  const items = [
    { value: comparison.ratio !== undefined ? `${comparison.ratio.toFixed(2)}×` : "—", label: "median inference ratio", tone: "primary" },
    { value: comparison.memory !== undefined ? percent(comparison.memory) : "—", label: "less peak RSS" },
    { value: comparison.size !== undefined ? percent(comparison.size) : "—", label: "smaller model" },
    { value: comparison.qualityDelta !== undefined ? `${comparison.qualityDelta >= 0 ? "+" : ""}${percent(comparison.qualityDelta)}` : "—", label: "single clip WER Δ" },
  ];
  return (
    <section className="reveal" aria-labelledby="reveal-title">
      <div>
        <p className="eyebrow">Measured comparison</p>
        <h2 id="reveal-title">The evidence, not a promise.</h2>
        <p className="reveal-caption">Every value derives from this report’s measured profile aggregates. WER and transcript agreement describe this one {report.input?.durationMs ? formatMs(report.input.durationMs) : "selected"} sample only.</p>
      </div>
      <div className="reveal-grid">
        {items.map((item) => (
          <article className={item.tone ? "reveal-metric reveal-metric--primary" : "reveal-metric"} key={item.label}>
            <strong>{item.value}</strong><span>{item.label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function diffWords(reference: string, candidate: string) {
  const referenceWords = reference.split(/\s+/).filter(Boolean);
  const candidateWords = candidate.split(/\s+/).filter(Boolean);
  const rows: Array<{ word: string; kind: "same" | "removed" | "added" }> = [];
  let referenceIndex = 0;
  let candidateIndex = 0;
  while (referenceIndex < referenceWords.length || candidateIndex < candidateWords.length) {
    if (referenceWords[referenceIndex] === candidateWords[candidateIndex]) {
      rows.push({ word: referenceWords[referenceIndex], kind: "same" });
      referenceIndex += 1;
      candidateIndex += 1;
    } else if (referenceWords[referenceIndex] && !candidateWords.includes(referenceWords[referenceIndex], candidateIndex + 1)) {
      rows.push({ word: referenceWords[referenceIndex], kind: "removed" });
      referenceIndex += 1;
    } else if (candidateWords[candidateIndex]) {
      rows.push({ word: candidateWords[candidateIndex], kind: "added" });
      candidateIndex += 1;
    } else {
      referenceIndex += 1;
    }
  }
  return rows;
}

function TranscriptEvidence({ report }: { report: Report }) {
  const comparison = useComparison(report);
  if (!comparison) return null;
  const reference = report.measurements.filter((item) => item.profileId === comparison.reference.id).at(-1)?.transcript?.text;
  const optimized = report.measurements.filter((item) => item.profileId === comparison.optimized.id).at(-1)?.transcript?.text;
  const differences = reference && optimized ? diffWords(reference, optimized) : [];
  const changed = differences.some((part) => part.kind !== "same");
  return (
    <section className="evidence-section" aria-labelledby="transcript-title">
      <div className="section-title">
        <div><p className="eyebrow">Single clip quality evidence</p><h2 id="transcript-title">Transcript comparison</h2></div>
        <span className="quality-chip">Clip WER: {comparison.better.wer === undefined ? "not measured" : percent(comparison.better.wer)}</span>
      </div>
      {reference && optimized ? (
        <div className="transcripts">
          <article><h3>{comparison.reference.label}</h3><p>{reference}</p></article>
          <article>
            <h3>{comparison.optimized.label}</h3>
            <p>{differences.map((part, index) => (
              <span key={`${part.word}-${index}`} className={`diff diff--${part.kind}`} aria-label={part.kind === "same" ? undefined : `${part.kind} word: ${part.word}`}>{part.word} </span>
            ))}</p>
            {changed ? (
              <p className="diff-legend"><span className="diff diff--added">added</span><span className="diff diff--removed">removed</span></p>
            ) : <p className="exact-match">Exact normalized transcript match on this clip</p>}
          </article>
        </div>
      ) : <p className="empty-inline">A transcript diff appears when both measured transcript artifacts are present. Quality values are never inferred from performance data.</p>}
    </section>
  );
}

function ProfileSummary({ report }: { report: Report }) {
  const profiles = report.profiles.map((profile) => ({ profile, data: metric(report, profile) }));
  const sameTranscript = report.comparison?.transcriptExactMatch === true;
  const [reference, optimized] = profiles;
  const lowerLatency = reference?.data.inferenceMs !== undefined
    && optimized?.data.inferenceMs !== undefined
    && optimized.data.inferenceMs < reference.data.inferenceMs;
  const title = sameTranscript && lowerLatency
    ? "Same transcript. Lower latency."
    : "Measured quality and latency.";
  const note = sameTranscript
    ? "Both measured profiles produced the same normalized transcript on this single clip. Their latency remains directly comparable."
    : "Latency and single clip WER come directly from this report. Inspect the transcript comparison above for any output differences.";
  return (
    <section className="evidence-section profile-section" aria-labelledby="profile-summary-title">
      <div className="section-title"><div><p className="eyebrow">Measured profile summary</p><h2 id="profile-summary-title">{title}</h2></div></div>
      <div className="profile-summary">
        <p className="profile-summary-note">{note}</p>
        <p className="table-scroll-cue">Scroll horizontally to inspect all columns.</p>
        <div className="table-scroll" tabIndex={0} aria-label="Measured profile summary table, horizontally scrollable on small screens">
          <table>
            <thead><tr><th>Profile</th><th>Median inference</th><th>Single clip WER</th><th>Measured runs</th></tr></thead>
            <tbody>{profiles.map(({ profile, data }) => (
              <tr key={profile.id}><th scope="row">{profile.label}</th><td>{formatMs(data.inferenceMs)}</td><td>{data.wer === undefined ? "Not measured" : percent(data.wer)}</td><td>{data.runs ?? "—"}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function EvidenceDrawer({ report }: { report: Report }) {
  const [open, setOpen] = useState<string | null>(null);
  const comparison = useComparison(report);
  if (!comparison) return null;
  const rows = [
    ["What changed", <ul className="interventions">{report.profiles.map((profile) => <li key={profile.id}><strong>{profile.label}:</strong> {(profile.interventions?.length ? profile.interventions : [profileLabel(profile) || "No configuration metadata recorded"]).join(" · ")}</li>)}</ul>],
    ["What did not win", <p>{report.findings?.rejectedIntervention ?? "No rejected intervention is recorded in this report."}</p>],
    ["Method", <p>Strategy: {report.strategy ?? "not recorded"}. Reported comparison values use stored aggregate measurements; repetitions: {comparison.base.runs ?? "not recorded"} / {comparison.better.runs ?? "not recorded"}.</p>],
    ["Raw provenance", <dl className="provenance"><div><dt>Report</dt><dd>{report.id}</dd></div><div><dt>Measured</dt><dd>{report.createdAt ? new Date(report.createdAt).toLocaleString() : "not recorded"}</dd></div><div><dt>Commit</dt><dd>{report.provenance?.gitCommit ?? "not recorded"}</dd></div><div><dt>Config hash</dt><dd>{report.provenance?.configHash ?? "not recorded"}</dd></div></dl>],
  ] as const;
  return (
    <section className="evidence-section evidence-drawer" aria-label="Benchmark evidence">
      {rows.map(([title, body]) => (
        <div className="drawer-row" key={title}>
          <button type="button" aria-expanded={open === title} onClick={() => setOpen(open === title ? null : title)}>
            <span>{title}</span><span aria-hidden="true">{open === title ? "−" : "+"}</span>
          </button>
          {open === title && <div className="drawer-content">{body}</div>}
        </div>
      ))}
    </section>
  );
}

function NoEvidence({ error, onRetry }: { error?: string; onRetry: () => void }) {
  return (
    <section className="no-evidence" aria-labelledby="empty-title">
      <div className="empty-mark" aria-hidden="true">∕∕</div>
      <p className="eyebrow">Evidence required</p>
      <h2 id="empty-title">No benchmark result is loaded.</h2>
      <p>Pocket Proof leaves comparison metrics blank until the benchmark service supplies a measured report. Run the local benchmark, or add a reviewed <code>featured-report.json</code> artifact.</p>
      {error && <p className="error-note" role="alert">{error}</p>}
      <button type="button" className="button button--secondary" onClick={onRetry}>Reload evidence</button>
    </section>
  );
}

export default function App() {
  const staticJudgeMode = import.meta.env.VITE_STATIC_JUDGE_MODE === "true";
  const [report, setReport] = useState<Report | null>(null);
  const [system, setSystem] = useState<SystemInfo>();
  const [origin, setOrigin] = useState<"api" | "fallback" | "none">("none");
  const [clips, setClips] = useState<MediaClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string>();
  const [history, setHistory] = useState<Report[]>([]);
  const [corpus, setCorpus] = useState<CorpusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [replayState, setReplayState] = useState<"idle" | "running" | "complete">("idle");
  const [replayElapsedMs, setReplayElapsedMs] = useState(0);
  const [error, setError] = useState<string>();
  const [lanes, setLanes] = useState<LaneState>({});
  const resultRef = useRef<HTMLElement>(null);
  const raceRef = useRef<HTMLElement>(null);
  const comparison = useComparison(report);

  const refresh = async () => {
    setLoading(true);
    setError(undefined);
    const [loaded, loadedClips, loadedHistory, loadedCorpus] = await Promise.all([loadEvidence(), loadMediaCatalog(), loadHistory(), loadCorpusSummary()]);
    setReport(loaded.report);
    setSystem(loaded.system);
    setOrigin(loaded.origin);
    setClips(loadedClips);
    setHistory(loadedHistory);
    setCorpus(loadedCorpus);
    setSelectedClipId((current) => current ?? loaded.report?.input?.id ?? loadedClips.find((clip) => clip.featured)?.id ?? loadedClips[0]?.id);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    const duration = comparison?.base.inferenceMs;
    if (replayState !== "running" || !duration) return;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = Math.min(duration, now - startedAt);
      setReplayElapsedMs(elapsed);
      if (elapsed >= duration) {
        setReplayState("complete");
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [comparison?.base.inferenceMs, replayState]);

  const run = async () => {
    setReplayState("idle");
    setRunning(true);
    setError(undefined);
    setLanes({ reference: { status: "validating" }, optimized: { status: "validating" } });
    try {
      const sampleId = selectedClipId ?? report?.input?.id ?? "jfk";
      await startRace(sampleId, (event) => {
        if (event.type === "lane.status") {
          const update = event as { profileId: string; status: string; phase?: string; run?: number; total?: number };
          const detail = update.run && update.total ? `${update.status} ${update.run}/${update.total}` : update.status;
          setLanes((old) => ({ ...old, [update.profileId]: { ...old[update.profileId], status: update.status, detail } }));
        }
        if (event.type === "lane.metric") {
          const update = event as { profileId: string; elapsedMs?: number; rssBytes?: number };
          setLanes((old) => ({
            ...old,
            [update.profileId]: {
              ...old[update.profileId],
              status: old[update.profileId]?.status ?? "running",
              elapsedMs: update.elapsedMs ?? old[update.profileId]?.elapsedMs,
              rssBytes: update.rssBytes ?? old[update.profileId]?.rssBytes,
            },
          }));
        }
        if (event.type === "race.complete") {
          const value = normalizeReport(event.report);
          if (value) {
            setReport(value);
            setOrigin("api");
            setSelectedClipId(value.input?.id ?? sampleId);
            setHistory((items) => [value, ...items.filter((item) => item.id !== value.id)]);
            requestAnimationFrame(() => resultRef.current?.focus());
          } else {
            setError("The completed run did not contain a valid benchmark report.");
          }
          setLanes({});
          setRunning(false);
        }
        if (event.type === "race.error") {
          setError(typeof event.message === "string" ? event.message : "The benchmark stopped before producing evidence.");
          setLanes({});
          setRunning(false);
        }
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start the local benchmark.");
      setLanes({});
      setRunning(false);
    }
  };

  const selectedClip = clips.find((clip) => clip.id === selectedClipId);
  const featuredClip = clips.find((clip) => clip.id === report?.input?.id) ?? selectedClip;
  const raceClip = staticJudgeMode ? featuredClip : selectedClip;
  const replayActive = replayState !== "idle";
  const referenceReplayProgress = comparison?.base.inferenceMs && replayActive
    ? Math.min(1, replayElapsedMs / comparison.base.inferenceMs)
    : undefined;
  const optimizedReplayProgress = comparison?.better.inferenceMs && replayActive
    ? Math.min(1, replayElapsedMs / comparison.better.inferenceMs)
    : undefined;
  const replayLane = (result: Aggregate, progress?: number): LaneState[string] | undefined => {
    if (!replayActive || progress === undefined) return undefined;
    const finished = progress >= 1;
    return {
      status: finished ? "finished" : "running",
      detail: finished ? "finished" : "timed replay",
      elapsedMs: Math.min(replayElapsedMs, result.inferenceMs ?? replayElapsedMs),
      rssBytes: result.peakRssBytes,
    };
  };

  const startReplay = () => {
    if (!comparison || replayState === "running") return;
    setReplayElapsedMs(0);
    setReplayState("running");
    requestAnimationFrame(() => raceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const download = () => {
    if (!report) return;
    const href = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `pocketproof-report-${report.id}.json`;
    link.click();
    URL.revokeObjectURL(href);
  };

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Pocket Proof home"><span>P</span> Pocket Proof</a>
        <nav className="topbar-actions" aria-label="Judge Mode actions">
          <span className="mode">Judge Mode</span>
          <button type="button" className="text-button" disabled={!report} onClick={download}>Export evidence</button>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        <div id="top" className="shell">
          <ProofStrip system={system} report={report} />
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">Private speech AI · proven on Arm64</p>
              <h1>
                <span>Faster local speech.</span>
                <span>Proof you can inspect.</span>
              </h1>
              <p className="lede">Pocket Proof makes private, offline transcription smaller and faster—then exposes every performance and quality tradeoff instead of asking you to trust a headline.</p>
              <div className="hero-actions">
                {staticJudgeMode
                  ? <button type="button" className="button button--hero" onClick={startReplay} disabled={!comparison || replayState === "running"}>{replayState === "running" ? "Race replaying…" : "Watch the 2.6-second proof"}</button>
                  : <button type="button" className="button button--hero" onClick={() => void run()} disabled={running}>{running ? "Benchmark running…" : "Run the native proof"}</button>}
                <a className="hero-link" href="#evidence">Inspect every tradeoff <span aria-hidden="true">↓</span></a>
              </div>
              <p className="hero-trust">Same audio · same decoder · same four CPU threads · one changed variable</p>
            </div>
            <HeroScorecard report={report} corpus={corpus} />
          </section>
          <section ref={raceRef} id="race" className={`race ${replayState === "running" ? "is-replaying" : ""}`} aria-labelledby="race-title" aria-busy={running || replayState === "running"}>
            <div className="race-head">
              <div>
                <p className="eyebrow">The optimization drag race</p>
                <h2 id="race-title" aria-live="polite">{running
                  ? "Native benchmark in progress"
                  : replayState === "running"
                    ? "Replaying measured inference time"
                    : replayState === "complete" && comparison?.ratio
                      ? `${comparison.ratio.toFixed(2)}× faster. Same transcript on this clip.`
                      : comparison?.base.inferenceMs && comparison?.better.inferenceMs
                        ? `Watch ${formatMs(comparison.base.inferenceMs)} become ${formatMs(comparison.better.inferenceMs)}.`
                        : "Ready when evidence is available"}</h2>
              </div>
              <div className="race-actions">
                {report?.source === "recorded" && <span className="recorded">Measured sequentially</span>}
                {staticJudgeMode
                  ? <>
                    <button type="button" className="button" onClick={startReplay} disabled={!comparison || replayState === "running"}>{replayState === "running" ? "Replaying…" : replayState === "complete" ? "Replay again" : "Replay measured race"}</button>
                    <a className="text-button text-link" href="https://github.com/andrewkernel/pocket-proof#quick-start" target="_blank" rel="noreferrer">Run natively</a>
                  </>
                  : <button type="button" className="button" onClick={() => void run()} disabled={running}>{running ? "Benchmark running…" : "Run full benchmark"}</button>}
              </div>
            </div>
            {loading ? <LoadingEvidence /> : comparison ? (
              <>
                <div className="lane-grid">
                  <Lane profile={comparison.reference} info={replayLane(comparison.base, referenceReplayProgress) ?? lanes[comparison.reference.id]} result={comparison.base} mode="reference" progress={referenceReplayProgress} />
                  <div className="versus" aria-hidden="true">VS</div>
                  <Lane profile={comparison.optimized} info={replayLane(comparison.better, optimizedReplayProgress) ?? lanes[comparison.optimized.id]} result={comparison.better} mode="optimized" progress={optimizedReplayProgress} winner={replayActive && optimizedReplayProgress === 1} />
                </div>
                <p className="race-note" aria-live="polite">{running
                  ? `Twelve local CPU processes run sequentially for ${raceClip?.title ?? "the selected clip"}. Expect roughly 30–90 seconds on the featured M5; duration varies by clip and device. The reviewed result remains visible until the new report is complete.`
                  : replayState === "running"
                    ? "Timed visualization of stored median inference durations—not live telemetry. The source processes were measured sequentially to avoid resource contention."
                  : origin === "fallback" || report?.source === "recorded"
                    ? staticJudgeMode
                      ? `Hosted Judge Mode replays the checksum-pinned ${raceClip?.title ?? "featured"} report. The replay preserves measured relative duration; clone the repository to launch all 12 native Arm64 processes.`
                      : "Recorded run. Replayed evidence, not live process telemetry. Full validation launches 12 sequential local CPU processes."
                    : "Measured independently. This comparison comes from the stored benchmark report. Full validation launches 12 sequential local CPU processes."}</p>
              </>
            ) : <NoEvidence error={error} onRetry={() => void refresh()} />}
          </section>
          {report && (
            <section ref={resultRef} id="evidence" tabIndex={-1} className="results" aria-label="Benchmark results">
              <ResultReveal report={report} />
              <OptimizationStory report={report} corpus={corpus} />
              <MediaLibrary clips={clips} selectedId={selectedClipId} onSelect={setSelectedClipId} disabled={running || replayState === "running"} featuredId={report.input?.id} staticJudgeMode={staticJudgeMode} />
              {corpus && <CorpusEvidence summary={corpus} />}
              <TranscriptEvidence report={report} />
              <ProfileSummary report={report} />
              <RunHistory reports={history} />
              <EvidenceDrawer report={report} />
              <TaglineReveal />
            </section>
          )}
          {error && report && <p className="error-banner" role="alert">{error}</p>}
        </div>
      </main>
      <footer>
        <span className="footer-mark">Pocket Proof · make every speedup prove itself.</span>
        <nav aria-label="Project links">
          <a href="https://github.com/andrewkernel/pocket-proof" target="_blank" rel="noreferrer">Source</a>
          <a href="https://github.com/andrewkernel/pocket-proof/blob/main/docs/reproducibility.md" target="_blank" rel="noreferrer">Reproduce</a>
          <a href="https://github.com/andrewkernel/pocket-proof/blob/main/docs/privacy.md" target="_blank" rel="noreferrer">Privacy</a>
          <a href="https://github.com/andrewkernel/pocket-proof/blob/main/docs/terms.md" target="_blank" rel="noreferrer">Terms</a>
        </nav>
      </footer>
    </>
  );
}
