# Pocket Proof — Devpost draft

Source: <https://github.com/andrewkernel/pocket-proof>

Hosted Judge Mode: <https://andrewkernel.github.io/pocket-proof/>

## Project overview

Pocket Proof is an interactive, reproducible optimization laboratory for local speech-to-text on Arm-powered client hardware. It makes one question visible: **what does a verified optimization change for a real local AI workload?**

For the Mobile AI track, Pocket Proof runs transcription locally on a native Arm64 Apple-silicon laptop and turns a controlled benchmark into a clear developer experience: hardware proof, configuration inspection, sequential recorded race replay, transcript/quality comparison, and one-click export of the source data.

The track explicitly covers local AI on Arm-powered laptops and lists transcription as an example workload. [Track details](https://arm-ai-optimization-challenge.devpost.com/details/trackdetails)

## What we optimized

We used Arm’s official [STT-Runner](https://github.com/Arm-Examples/STT-Runner) / whisper.cpp path as a native Arm64 CPU runtime and compared Whisper small.en FP16 against its Q4_0 weight-quantized artifact. Both lanes used the **same** `USE_KLEIDIAI=OFF` native Arm64 binary, 11-second JFK WAV input, English decoding, and four threads. The deliberate intervention is FP16→Q4_0 model representation.

We separately tested the KleidiAI build switch with the same Q4_0 model in seven interleaved pairs. It was neutral/slightly slower on this Apple M5 (0.98× ON/OFF mean), so we do not attribute the primary gain to KleidiAI.

## Results

The recorded report is [`run-2026-08-13T22-01-38-888Z-c2b8e5df`](../public/featured-report.json), collected on an Apple M5 MacBook Pro, macOS 26.5.2, 16 GB memory. After one warm-up, five runs per lane were measured in alternating AB/BA order.

| Outcome | FP16 | Q4_0 | Change |
| --- | ---: | ---: | ---: |
| Median inference | 2577.86 ms | 1616.44 ms | **1.5948× faster / 37.30% lower latency** |
| Median peak RSS | 791,117,824 B | 445,251,584 B | **43.72% less** |
| Model artifact | 487,614,201 B | 145,471,353 B | **70.17% smaller** |
| Normalized WER | 0 | 0 | Exact transcript match |

FP16 measured 2541.80–3353.81 ms; Q4_0 measured 1486.35–1817.50 ms. Every primary run produced the same transcript for the JFK clip. These are measured outcomes on this specific device, model, input, runtime, and four-thread configuration—not a general claim about Whisper, Apple Silicon, or Arm hardware.

We then ran the same protocol over a SQLite-backed preset corpus: three public-domain clips, five measured runs per profile per clip, and 30 measured processes. Median paired speedup was **1.5519×**, with a deterministic bootstrap 95% interval of **1.4950–1.6162×**. Corpus WER was 6.9% FP16 and 8.3% Q4_0; the difference is one additional Q4 word error on the deliberately difficult Apollo radio clip. The two archival speech clips retained exact profile-to-profile transcript agreement.

## How it works

The React/TypeScript UI is local. A small Node service reads a real SQLite preset database, inspects the host, launches the native inference processes sequentially, streams lane/run progress over server-sent events, and writes structured results. Judge Mode can run a benchmark or replay an existing result, visibly labelled as a replay. The app does not pretend two lanes executed concurrently. The static hosted Judge Mode provides zero-install evidence access; local setup enables native benchmarking.

After setup, the benchmark path uses local model artifacts and local inference; it does not require an inference API or audio upload.

## Reproduce

```sh
npm install
bash scripts/setup-runtime.sh
npm run benchmark -- --runs 5 --warmup 1 --threads 4
npm run verify
npm run dev
```

See [the repository README](../README.md), [methodology](../docs/methodology.md), [reproducibility guide](../docs/reproducibility.md), and [Arm platform notes](../docs/arm-notes.md). Every result retains host, model, binary, configuration, raw-run, and quality provenance.

## Arm relevance

The project proves native Arm64 execution and measures a local AI optimization on an Arm-powered laptop. It reports the KleidiAI result honestly: no repeatable same-model gain in the tested M5 CPU configuration. It does not infer unsupported M5 ISA features or claim an internal kernel/accelerator without evidence. This scope makes the result useful and auditable by other Arm developers.

## Built with

React, TypeScript, Vite, Node.js, Arm STT-Runner, whisper.cpp, and Arm KleidiAI. See [third-party notices](../THIRD_PARTY_NOTICES.md).
