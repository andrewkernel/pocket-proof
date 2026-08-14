# Architecture

Pocket Proof separates the live product experience from the native evidence it presents.

```text
User audio/video ── browser decode ── Whisper Tiny EN Q4 / WASM worker ── live transcript
       │                         (audio remains in the browser tab)
       │
       └──────────────────────────── separate evidence boundary ───────────────┐

SQLite preset catalog + licensed MP4 preview + checksum-pinned WAV
          │
          ├── native Arm64 CPU, FP16, USE_KLEIDIAI=OFF ──┐
          └── native Arm64 CPU, Q4_0, USE_KLEIDIAI=OFF ──┤
                                                         ▼
                                     immutable per-clip benchmark JSON
                                                         │
                                          three-clip corpus summary
                                                         ▼
 React/Vite UI ◀── Node API + live SSE progress ◀── hardware + binary inspection
```

## Product layers

- **React + TypeScript + Vite:** local visual workspace, licensed preset selection, video preview, transcript/corpus comparison, immutable history, and Judge Mode.
- **Browser transcription worker:** decodes a user-selected file to 16 kHz mono audio, loads pinned Transformers.js 4.2.0 and pinned ONNX Whisper Tiny English Q4 weights, runs CPU WebAssembly inference, streams real decoder text through `WhisperTextStreamer`, and returns final transcript/runtime metadata without uploading audio. This useful live path is not used as evidence for the native benchmark claim.
- **Node orchestration service:** queries the SQLite catalog, validates inputs, runs subprocesses sequentially, streams real phase/run events over server-sent events, and stores structured results.
- **STT-Runner / whisper.cpp:** native inference engine. The featured comparison uses one pinned, `USE_KLEIDIAI=OFF` Arm64 CPU binary so only FP16 versus Q4_0 model representation changes. Arm documents STT-Runner as macOS-aarch64-tested. [STT-Runner](https://github.com/Arm-Examples/STT-Runner)
- **Artifact store:** append-only benchmark reports containing environment, binary, model, input, command/configuration, timing, memory measurements, transcript, and error data.
- **Preset database:** `benchmark/preset-media.sqlite` stores the benchmark ID, preview/audio paths, transcript, source, license, difficulty, and three file hashes for every clip. A public JSON projection supports zero-install hosted Judge Mode.

## Evidence boundaries

The UI animates a side-by-side race from the recorded report `run-2026-08-13T22-01-38-888Z-c2b8e5df`; it is labelled a recorded replay and does not imply simultaneous measurement. A local run exposes the real active lane and repetition without executing both profiles concurrently. Native architecture is demonstrated using OS inspection and executable metadata. A visual `arm64` badge is not proof of a particular Arm ISA extension or microkernel dispatch.

## Why this design

The Mobile AI track values on-device execution, optimization for client constraints, and reproducibility. It explicitly lists mobile/client runtimes and local transcription use cases. [Track details](https://arm-ai-optimization-challenge.devpost.com/details/trackdetails) The product therefore makes the validation artifact—not the animation—the source of truth.
