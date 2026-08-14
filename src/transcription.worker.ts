const TRANSFORMERS_MODULE = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";
const MODEL_ID = "onnx-community/whisper-tiny.en";
const MODEL_REVISION = "2575352d61be1bf7225cf8f8b268a4678025fc58";

type ModelProgressEvent = {
  status?: string;
  progress?: number;
  loaded?: number;
  total?: number;
  file?: string;
};

type TranscriptOutput = { text?: string } | Array<{ text?: string }>;
type Transcriber = {
  (audio: Float32Array, options: Record<string, unknown>): Promise<TranscriptOutput>;
  tokenizer: unknown;
};
type WhisperTextStreamerOptions = {
  skip_prompt?: boolean;
  skip_special_tokens?: boolean;
  callback_function?: (text: string) => void;
  on_chunk_start?: (time: number) => void;
  on_chunk_end?: (time: number) => void;
};
type TransformersModule = {
  env: {
    allowLocalModels: boolean;
    allowRemoteModels: boolean;
    useBrowserCache: boolean;
    useWasmCache: boolean;
  };
  pipeline: (
    task: string,
    model: string,
    options: Record<string, unknown>,
  ) => Promise<Transcriber>;
  WhisperTextStreamer: new (tokenizer: unknown, options: WhisperTextStreamerOptions) => unknown;
};

type WorkerRequest = {
  type: "transcribe";
  audio: Float32Array;
};

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: unknown) => void;
};

let transcriberPromise: Promise<Transcriber> | undefined;
let transformersModule: TransformersModule | undefined;

function reportProgress(event: ModelProgressEvent) {
  const rawProgress = event.progress ?? (event.loaded && event.total ? (event.loaded / event.total) * 100 : undefined);
  const progress = rawProgress === undefined ? undefined : Math.max(0, Math.min(100, rawProgress <= 1 ? rawProgress * 100 : rawProgress));
  workerScope.postMessage({
    type: "model-progress",
    status: event.status,
    file: event.file,
    progress,
  });
}

async function createTranscriber() {
  workerScope.postMessage({ type: "phase", phase: "loading-model" });
  const transformers = await import(/* @vite-ignore */ TRANSFORMERS_MODULE) as unknown as TransformersModule;
  transformersModule = transformers;
  transformers.env.allowLocalModels = false;
  transformers.env.allowRemoteModels = true;
  transformers.env.useBrowserCache = true;
  transformers.env.useWasmCache = true;

  const instance = await transformers.pipeline("automatic-speech-recognition", MODEL_ID, {
    revision: MODEL_REVISION,
    device: "wasm",
    dtype: "q4",
    progress_callback: reportProgress,
  });
  workerScope.postMessage({ type: "model-ready" });
  return instance;
}

workerScope.onmessage = async (event) => {
  if (event.data.type !== "transcribe") return;
  try {
    transcriberPromise ??= createTranscriber();
    const transcriber = await transcriberPromise;
    workerScope.postMessage({ type: "phase", phase: "transcribing" });
    const startedAt = performance.now();
    let streamedText = "";
    let streamedPieces = 0;
    const streamer = transformersModule
      ? new transformersModule.WhisperTextStreamer(transcriber.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (piece) => {
          streamedText += piece;
          streamedPieces += 1;
          workerScope.postMessage({
            type: "partial",
            text: streamedText.trimStart(),
            pieces: streamedPieces,
            elapsedMs: performance.now() - startedAt,
          });
        },
      })
      : undefined;
    const output = await transcriber(event.data.audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
      streamer,
    });
    const text = (Array.isArray(output) ? output.map((item) => item.text ?? "").join(" ") : output.text ?? "").trim();
    workerScope.postMessage({
      type: "complete",
      text,
      elapsedMs: performance.now() - startedAt,
      model: MODEL_ID,
      modelRevision: MODEL_REVISION,
      backend: "Browser CPU · WebAssembly · Q4",
    });
  } catch (error) {
    transcriberPromise = undefined;
    workerScope.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Browser transcription failed.",
    });
  }
};
