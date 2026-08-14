# Pocket Proof

**Faster local speech. Proof you can inspect.**

[![CI](https://github.com/andrewkernel/pocket-proof/actions/workflows/ci.yml/badge.svg)](https://github.com/andrewkernel/pocket-proof/actions/workflows/ci.yml)
![Target: native arm64](https://img.shields.io/badge/target-native%20arm64-9ef3c8)
![License: MIT](https://img.shields.io/badge/license-MIT-e8e8e8)

[Try your own audio](https://andrewkernel.github.io/pocket-proof/#try-audio) · [Replay the measured proof](https://andrewkernel.github.io/pocket-proof/#race) · [Recording script](docs/demo-script.md) · [Source evidence](public/featured-report.json)

![Pocket Proof social preview: a dark, cinematic local-AI optimization workspace with an audio waveform, Arm64 context, and two evidence lanes converging on a verified result panel.](assets/pocket-proof-social-preview.png)

Local speech AI keeps private recordings off the cloud, but large models are slow and memory hungry. Pocket Proof now lets anyone drop an English audio or video file into the hosted site and watch a real transcript arrive token by token from a quantized Whisper model running inside the browser—no account and no audio upload. It then demonstrates the native shipping improvement on an Arm64 Apple M5: **1.55× faster transcription across three licensed clips, 44% less peak memory on the featured measurement, a 70% smaller model, and zero audio uploads after setup.**

Then it does something most optimization demos do not: it exposes the quality cost, raw runs, hashes, hardware proof, rejected experiments, and exact reproduction path. Anyone can publish a faster number. Pocket Proof shows whether you should believe it—and whether the tradeoff is worth shipping.

The hosted experience turns the stored durations into a clearly labelled timed replay: Q4_0 finishes while FP16 is still running. The source benchmark processes are always measured sequentially to avoid resource contention.

## Try it in the browser

Open [Pocket Proof](https://andrewkernel.github.io/pocket-proof/#try-audio), choose an English audio or video file up to 25 MB, and press **Transcribe locally**. The first run downloads pinned Whisper Tiny English Q4 weights and the WebAssembly runtime; the browser caches them for later runs. Audio decoding and inference happen inside the tab. The real Whisper token streamer updates the transcript and technical decoder readout while inference is running; the completed result includes run time, audio duration, real-time factor, and the exact browser engine label.

![Pocket Proof live browser transcription: a local Whisper decoder streams words beside the selected audio file while the 16 kHz PCM, Q4 weight, and WebAssembly CPU stages remain visible.](assets/screenshots/product-live.png)

The browser tool is intentionally separate from the native benchmark claim. It demonstrates the private product workflow with Whisper Tiny English Q4 on browser WebAssembly; the measured Apple M5 evidence below uses Whisper small.en FP16 versus Q4_0 through native STT-Runner / whisper.cpp.

The project targets the [Arm Create: AI Optimization Challenge Mobile AI track](https://arm-ai-optimization-challenge.devpost.com/details/trackdetails). That track explicitly includes local AI on Arm-powered laptops and names transcription as a candidate workload.

## The claim

`same Whisper small.en task + same 11 s JFK audio + same native arm64 CPU binary + 4 threads`  
`FP16 weights` → `Q4_0 weight quantization`

Both primary lanes use the same Arm [STT-Runner](https://github.com/Arm-Examples/STT-Runner) native `arm64` CPU binary built with `USE_KLEIDIAI=OFF`. This isolates the measured headline to model representation rather than a runtime-library change. STT-Runner wraps `whisper.cpp` and is tested on macOS-aarch64.

Pocket Proof does not treat a concurrent race animation as a benchmark. Runs are sequential and interleaved; the UI identifies its cinematic race as a replay of recorded measurements.

## Results

Measured on an Apple M5 MacBook Pro (macOS 26.5.2, 16 GB), using one warm-up and five measured runs per lane in alternating AB/BA order. The source of truth is [featured report `run-2026-08-13T22-01-38-888Z-c2b8e5df`](public/featured-report.json).

| Measure | FP16 reference | Q4_0 optimized | Observed change |
| --- | ---: | ---: | ---: |
| Median inference time | 2577.86 ms | 1616.44 ms | **1.5948× faster; 37.30% lower latency** |
| Measured inference range | 2541.80–3353.81 ms | 1486.35–1817.50 ms | Five runs per lane |
| Median peak RSS | 791,117,824 B | 445,251,584 B | **43.72% less** |
| Model artifact | 487,614,201 B | 145,471,353 B | **70.17% smaller** |
| Normalized WER | 0 | 0 | Exact transcript match on this clip |

These results are device-, runtime-, model-, input-, and thread-count-specific; they are not a general Whisper or Arm performance claim. The exact output transcript matched in every primary run: “And so, my fellow Americans, ask not what your country can do for you. Ask what you can do for your country.”

### Three-clip corpus validation

Pocket Proof also ships a real SQLite preset database with three public-domain clips: clean JFK speech, noisy Apollo radio audio, and archival Roosevelt speech. Each record maps an MP4 preview to a checksum-pinned 16 kHz mono WAV, reference transcript, source, and license. Five measured runs per profile per clip produced 30 measured processes.

| Corpus measure | FP16 | Q4_0 | Evidence |
| --- | ---: | ---: | ---: |
| Median real-time factor | 0.1229 | 0.0773 | Lower is better |
| Corpus WER | 6.9% | 8.3% | Q4 changed one additional word on noisy Apollo radio |
| Median paired speedup | — | **1.5519×** | Bootstrap 95% interval: **1.4950–1.6162×** |
| Exact profile-to-profile transcript agreement | — | 2 of 3 clips | Both archival speech clips |

The machine-readable source is [corpus-summary.json](benchmarks/corpus-summary.json); each referenced raw report is immutable and SHA-256 pinned.

![Pocket Proof Judge Mode showing the real FP16 and Q4_0 lanes on Apple M5, with artifact-derived latency, memory, and model-size evidence.](assets/screenshots/judge-mode-hero.png)

### KleidiAI ablation: not the headline

We also ran a separate same-Q4_0, four-thread CPU ablation to isolate KleidiAI: seven interleaved pairs with `USE_KLEIDIAI=OFF` versus `ON`. Mean inference was 1467.81 ms OFF and 1492.94 ms ON—**0.98×** ON/OFF. On this M5 configuration there was no repeatable improvement, so Pocket Proof rejects KleidiAI as the source of the headline result. See [optimization notes](docs/optimization.md).

## Quick start

Prerequisites: native Arm64 macOS, Node.js 22+, CMake 3.27+, Python 3.9+, and sufficient disk space for the selected model. Pocket Proof's automation and measurement adapters currently support macOS arm64 only; upstream STT-Runner supports additional targets that this project has not validated.

```sh
npm ci
npm run media:verify
bash scripts/setup-runtime.sh
npm run benchmark -- --runs 5 --warmup 1 --threads 4
npm run dev
```

The setup script pins Arm STT-Runner, downloads `ggml-small.en.bin`, builds native Arm64 reference and KleidiAI ablation binaries, and derives the Q4_0 artifact. If CMake is installed outside `PATH`, pass its absolute executable path as `CMAKE_BIN=/path/to/cmake bash scripts/setup-runtime.sh`. Open the local address printed by Vite. `npm run benchmark -- --sample armstrong-small-step` selects another preset. Reports are immutable; replacing Judge Mode’s reviewed artifact requires the explicit `--promote` flag. `npm run benchmark:corpus` reruns all presets, while `npm run readiness` executes the weighted 100-point release gate. See [reproducibility.md](docs/reproducibility.md) and [methodology.md](docs/methodology.md).

## What is local

After the model and runtime have been provisioned, the benchmark path runs as local native subprocesses. Audio is passed to local inference; Pocket Proof is not an API wrapper. The hardware panel records architecture and binary evidence so a user can distinguish native Arm64 execution from translated execution.

## Documentation

- [Architecture](docs/architecture.md)
- [Optimization contract](docs/optimization.md)
- [Benchmark methodology](docs/methodology.md)
- [Arm platform notes](docs/arm-notes.md)
- [Reproducibility guide](docs/reproducibility.md)
- [Demo script](docs/demo-script.md)
- [Submission guide](docs/submission-guide.md)
- [Research and sources](docs/research.md)
- [Product design system](docs/design-system.md)
- [Privacy](docs/privacy.md) and [terms](docs/terms.md)
- [Devpost draft](submission/devpost-draft.md) and [submission checklist](submission/checklist.md)

## License and attribution

Pocket Proof is MIT licensed. Runtime, model, and corpus licenses are tracked in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Arm, KleidiAI, macOS, and related marks belong to their respective owners; this project is not endorsed by Arm.
