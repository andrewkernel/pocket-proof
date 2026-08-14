import { useEffect, useRef, useState, type CSSProperties } from "react";
import { assetUrl } from "./api";

type LabStatus = "empty" | "ready" | "decoding" | "loading-model" | "transcribing" | "complete" | "error";
type LabResult = {
  text: string;
  elapsedMs: number;
  backend: string;
  model: string;
  modelRevision: string;
};

type WorkerResponse =
  | { type: "phase"; phase: "loading-model" | "transcribing" }
  | { type: "model-progress"; progress?: number; file?: string }
  | { type: "model-ready" }
  | { type: "partial"; text: string; pieces: number; elapsedMs: number }
  | ({ type: "complete" } & LabResult)
  | { type: "error"; message: string };

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_AUDIO_SECONDS = 5 * 60;

const compactBytes = (bytes: number) => bytes >= 1024 ** 2
  ? `${(bytes / 1024 ** 2).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const compactTime = (seconds?: number) => seconds === undefined || !Number.isFinite(seconds)
  ? "duration pending"
  : seconds >= 60
    ? `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
    : `${seconds.toFixed(1)}s`;

async function decodeAudio(file: File) {
  const AudioContextClass = window.AudioContext;
  const context = new AudioContextClass();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    if (decoded.duration > MAX_AUDIO_SECONDS) throw new Error("Keep the live demo under five minutes so it stays responsive in the browser.");
    const frameCount = Math.ceil(decoded.duration * 16_000);
    const offline = new OfflineAudioContext(1, frameCount, 16_000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return { audio: rendered.getChannelData(0).slice(), durationSeconds: decoded.duration };
  } finally {
    await context.close();
  }
}

function downloadText(filename: string, text: string) {
  const href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = href;
  link.download = `${filename.replace(/\.[^.]+$/, "") || "pocket-proof"}-transcript.txt`;
  link.click();
  URL.revokeObjectURL(href);
}

export function AudioLab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | undefined>(undefined);
  const inferenceStartedAtRef = useRef<number | undefined>(undefined);
  const [file, setFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [durationSeconds, setDurationSeconds] = useState<number>();
  const [status, setStatus] = useState<LabStatus>("empty");
  const [progress, setProgress] = useState(0);
  const [progressFile, setProgressFile] = useState<string>();
  const [result, setResult] = useState<LabResult>();
  const [partialText, setPartialText] = useState("");
  const [streamPieces, setStreamPieces] = useState(0);
  const [liveElapsedMs, setLiveElapsedMs] = useState(0);
  const [error, setError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => () => {
    workerRef.current?.terminate();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (status !== "transcribing") return;
    inferenceStartedAtRef.current = performance.now();
    setLiveElapsedMs(0);
    const timer = window.setInterval(() => {
      if (inferenceStartedAtRef.current !== undefined) setLiveElapsedMs(performance.now() - inferenceStartedAtRef.current);
    }, 80);
    return () => window.clearInterval(timer);
  }, [status]);

  const chooseFile = (next: File) => {
    if (next.size > MAX_FILE_BYTES) {
      setError("Choose a file under 25 MB for this browser demo.");
      setStatus("error");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setDurationSeconds(undefined);
    setResult(undefined);
    setPartialText("");
    setStreamPieces(0);
    setLiveElapsedMs(0);
    setError(undefined);
    setProgress(0);
    setProgressFile(undefined);
    setStatus("ready");
  };

  const loadSample = async () => {
    setError(undefined);
    try {
      const response = await fetch(assetUrl("media/jfk.mp4"));
      if (!response.ok) throw new Error("The demo clip could not be loaded.");
      chooseFile(new File([await response.blob()], "jfk-ask-not.mp4", { type: "video/mp4" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The demo clip could not be loaded.");
      setStatus("error");
    }
  };

  const run = async () => {
    if (!file || status === "decoding" || status === "loading-model" || status === "transcribing") return;
    setError(undefined);
    setResult(undefined);
    setPartialText("");
    setStreamPieces(0);
    setLiveElapsedMs(0);
    setStatus("decoding");
    setProgress(0);
    try {
      const decoded = await decodeAudio(file);
      setDurationSeconds(decoded.durationSeconds);
      const worker = workerRef.current ?? new Worker(new URL("./transcription.worker.ts", import.meta.url), { type: "module" });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        if (message.type === "phase") setStatus(message.phase);
        if (message.type === "model-progress") {
          if (message.progress !== undefined) setProgress(message.progress);
          setProgressFile(message.file?.split("/").at(-1));
        }
        if (message.type === "model-ready") setProgress(100);
        if (message.type === "partial") {
          setPartialText(message.text);
          setStreamPieces(message.pieces);
          setLiveElapsedMs(message.elapsedMs);
        }
        if (message.type === "complete") {
          setResult(message);
          setPartialText(message.text);
          setLiveElapsedMs(message.elapsedMs);
          setStatus("complete");
        }
        if (message.type === "error") {
          setError(message.message);
          setStatus("error");
        }
      };
      worker.onerror = () => {
        setError("The browser worker stopped unexpectedly. Reload the page and try the demo clip.");
        setStatus("error");
      };
      worker.postMessage({ type: "transcribe", audio: decoded.audio }, [decoded.audio.buffer]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This browser could not decode the selected media.");
      setStatus("error");
    }
  };

  const busy = status === "decoding" || status === "loading-model" || status === "transcribing";
  const displayedText = result?.text ?? partialText;
  const displayedWords = displayedText.trim() ? displayedText.trim().split(/\s+/) : [];
  const pipelineStep = status === "decoding" ? 0 : status === "loading-model" ? 1 : status === "transcribing" ? 2 : status === "complete" ? 3 : -1;
  const statusCopy = status === "decoding"
    ? "Preparing audio locally…"
    : status === "loading-model"
      ? `Loading the cached browser model${progress ? ` · ${Math.round(progress)}%` : ""}`
      : status === "transcribing"
        ? "Turning speech into text on this device…"
        : status === "complete"
          ? "Local transcript complete"
          : status === "error"
            ? "The local run needs attention"
            : "Ready for local transcription";

  return (
    <section id="try-audio" className="audio-lab" aria-labelledby="audio-lab-title" aria-busy={busy}>
      <div className="audio-lab-heading">
        <div>
          <p className="eyebrow">Try the product · no account required</p>
          <h2 id="audio-lab-title">Drop audio. Get text. Keep the file.</h2>
          <p>Choose an English audio or video file. A quantized Whisper model runs inside your browser; your recording is never sent to Pocket Proof or a transcription API.</p>
        </div>
        <div className="local-contract" aria-label="Local processing contract">
          <span><i /> In-browser inference</span>
          <span>First run downloads the model</span>
          <span>Later runs use browser cache</span>
        </div>
      </div>

      <div className="audio-workspace">
        <div
          className={`audio-dropzone ${dragging ? "is-dragging" : ""} ${file ? "has-file" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const next = event.dataTransfer.files[0];
            if (next) chooseFile(next);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,video/*,.wav,.mp3,.m4a,.aac,.flac,.ogg,.mp4,.webm"
            onChange={(event) => { const next = event.target.files?.[0]; if (next) chooseFile(next); }}
            className="sr-only"
          />
          {file ? (
            <>
              <div className="file-card-heading">
                <span className="file-icon" aria-hidden="true">♪</span>
                <span><strong>{file.name}</strong><small>{compactBytes(file.size)} · {compactTime(durationSeconds)}</small></span>
                <button type="button" className="text-button" onClick={() => inputRef.current?.click()} disabled={busy}>Replace</button>
              </div>
              {previewUrl && <audio className="audio-preview" src={previewUrl} controls preload="metadata" onLoadedMetadata={(event) => setDurationSeconds(event.currentTarget.duration)} />}
              <button type="button" className="button button--wide" onClick={() => void run()} disabled={busy}>
                {busy ? statusCopy : result ? "Transcribe again locally" : "Transcribe locally"}
              </button>
            </>
          ) : (
            <>
              <span className="upload-mark" aria-hidden="true">↗</span>
              <strong>Drop an audio or video file here</strong>
              <span>WAV, MP3, M4A, AAC, FLAC, OGG, MP4, or WebM · up to 25 MB</span>
              <div className="dropzone-actions">
                <button type="button" className="button" onClick={() => inputRef.current?.click()}>Choose a file</button>
                <button type="button" className="text-button" onClick={() => void loadSample()}>Use the 11-second demo</button>
              </div>
            </>
          )}
        </div>

        <div className="transcript-console" aria-live="polite">
          <div className="console-head"><span>Local output</span><span className={`console-state console-state--${status}`}>{statusCopy}</span></div>
          <div className="signal-chain" aria-label="Local inference pipeline">
            {["Decode · PCM 16 kHz", "Load · Q4 weights", "Infer · WASM CPU", "Text · local only"].map((label, index) => (
              <span className={pipelineStep === index ? "is-active" : pipelineStep > index ? "is-complete" : ""} key={label}>
                <i aria-hidden="true" />{label}
              </span>
            ))}
          </div>
          {busy && (
            <div className={`model-progress model-progress--${status}`} role="status">
              <div><i style={{ width: `${status === "loading-model" ? progress : status === "transcribing" ? 38 : 12}%` }} /></div>
              <small>{status === "loading-model" && progressFile ? `Caching ${progressFile}` : "Audio remains in this tab’s memory."}</small>
            </div>
          )}
          {displayedText || status === "transcribing" ? (
            <div className={`live-result ${status === "transcribing" ? "is-streaming" : "is-complete"}`}>
              <div className="decoder-readout" aria-hidden="true">
                <span><i />{status === "transcribing" ? "Decoder active" : "Decode complete"}</span>
                <span>{displayedWords.length} words</span>
                <span>{status === "transcribing" ? `${(liveElapsedMs / 1000).toFixed(2)} s` : `${streamPieces} stream updates`}</span>
              </div>
              <blockquote aria-label="Live transcript">
                {displayedWords.length ? displayedWords.map((word, index) => <span className="stream-word" style={{ "--word-index": index } as CSSProperties} key={`${index}-${word}`}>{word}{index < displayedWords.length - 1 ? " " : ""}</span>) : <span className="listening-copy">Listening for the first words…</span>}
                {status === "transcribing" && <i className="stream-caret" aria-hidden="true" />}
              </blockquote>
              {result && (
                <>
                  <dl>
                    <div><dt>Run time</dt><dd>{(result.elapsedMs / 1000).toFixed(2)} s</dd></div>
                    <div><dt>Audio</dt><dd>{compactTime(durationSeconds)}</dd></div>
                    <div><dt>Real-time factor</dt><dd>{durationSeconds ? (result.elapsedMs / 1000 / durationSeconds).toFixed(2) : "—"}</dd></div>
                    <div><dt>Engine</dt><dd>Whisper Tiny EN · Q4</dd></div>
                  </dl>
                  <div className="result-actions">
                    <button type="button" className="button button--secondary" onClick={async () => { await navigator.clipboard.writeText(result.text); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }}>{copied ? "Copied" : "Copy transcript"}</button>
                    <button type="button" className="text-button" onClick={() => downloadText(file?.name ?? "pocket-proof", result.text)}>Download .txt</button>
                  </div>
                </>
              )}
            </div>
          ) : error ? (
            <div className="lab-error" role="alert"><strong>Couldn’t finish this file.</strong><p>{error}</p><p>Nothing was uploaded. Try the short demo clip in Chrome or Edge.</p></div>
          ) : (
            <div className="console-empty">
              <span aria-hidden="true">“</span>
              <p>Your transcript, run time, real-time factor, and engine will appear here.</p>
            </div>
          )}
          <p className="lab-scope">Live browser result · separate from the native Apple M5 benchmark below. Model code loads from jsDelivr and pinned weights from Hugging Face on first use; audio stays local.</p>
        </div>
      </div>
    </section>
  );
}

export function ProductComparison() {
  const rows = [
    ["Where audio goes", "Sent to a provider", "Stays on your machine", "Stays on your machine"],
    ["Works after setup", "Internet required", "Yes", "Yes"],
    ["Model footprint", "Usually hidden", "465 MiB FP16", "139 MiB Q4_0"],
    ["Measured on this M5", "Provider dependent", "2.58 s featured median", "1.62 s featured median"],
    ["Evidence you can inspect", "Provider documentation", "Output only", "Raw runs, hashes, WER, rejected tests"],
  ];
  return (
    <section className="product-comparison" aria-labelledby="comparison-title">
      <div className="comparison-heading">
        <p className="eyebrow">Why this is better</p>
        <h2 id="comparison-title">Privacy is the product. Proof is the advantage.</h2>
        <p>The browser tool shows the experience. The native experiment below proves the shipping choice on Arm. Pocket Proof combines both.</p>
      </div>
      <p className="comparison-cue">Swipe to compare all columns.</p>
      <div className="comparison-table" role="table" aria-label="Pocket Proof compared with cloud transcription and plain local Whisper">
        <div className="comparison-row comparison-row--head" role="row"><span role="columnheader">Question</span><span role="columnheader">Cloud API</span><span role="columnheader">Plain local Whisper</span><span role="columnheader">Pocket Proof</span></div>
        {rows.map((row) => <div className="comparison-row" role="row" key={row[0]}>{row.map((cell, index) => <span role={index === 0 ? "rowheader" : "cell"} key={cell}>{cell}{index === 3 && <i aria-hidden="true">✓</i>}</span>)}</div>)}
      </div>
      <p className="comparison-scope">Cloud behavior is described generically because a cloud transcription API receives the file for server-side processing. Timings and sizes are the reviewed native small.en experiment on this Apple M5—not the browser Tiny model above.</p>
    </section>
  );
}
