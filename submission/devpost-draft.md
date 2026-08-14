# Pocket Proof — Private speech AI, with receipts

**Tagline:** Make local transcription faster on Arm—and inspect every tradeoff before you ship it.

- Live Judge Mode: <https://andrewkernel.github.io/pocket-proof/>
- Source and reproduction: <https://github.com/andrewkernel/pocket-proof>
- Track: Mobile AI

## The eight-second version

Local speech AI is private, but large models are slow and memory hungry. Pocket Proof demonstrates a measured alternative on a native Arm64 Apple M5:

- **1.55× faster** median paired transcription across three licensed clips
- **44% less** peak memory on the featured measurement
- **70% smaller** model artifact
- **zero audio uploads** after setup

Then it does something most optimization demos do not: it exposes the quality cost, raw runs, hashes, hardware proof, rejected experiments, and exact reproduction path.

Anyone can publish a faster number. **Pocket Proof shows whether you should believe it—and whether the tradeoff is worth shipping.**

## Inspiration

On-device AI promises privacy, low latency, and offline operation. But optimization claims are often reduced to a single benchmark number with no visible control, quality comparison, or way to reproduce the result.

We wanted to answer a more useful question: *what actually changes when a developer optimizes AI for an Arm-powered laptop?*

Speech-to-text makes that question tangible. A recording either stays on the device or it does not. A transcript is either fast enough or it is not. And a smaller model is only valuable if its words remain useful.

## What it does

Pocket Proof is an on-device transcription experience, optimization drag race, and reproducibility instrument in one product.

Open Judge Mode and the result is visible immediately. Press **Watch the 2.6-second proof** and a timed replay shows the Q4_0 profile finish while the FP16 reference is still running. The replay is explicitly labelled: the source processes were measured sequentially to avoid resource contention.

From there a judge can:

- inspect latency, peak RSS, model size, transcript, and WER;
- preview three public-domain speech clips backed by a real SQLite catalog;
- see the multi-clip confidence interval and the noisy-audio quality cost;
- inspect exactly what changed and what stayed fixed;
- export the complete machine-readable report; and
- clone the project to run the native benchmark locally.

## The controlled optimization

We compared Whisper `small.en` FP16 with its Q4_0 weight-quantized representation using Arm's STT-Runner / whisper.cpp path.

Both headline lanes use:

- the same 11-second JFK input;
- the same native Arm64 CPU binary;
- the same English decoder;
- the same four-thread configuration; and
- `USE_KLEIDIAI=OFF`.

The intended intervention is only **FP16 → Q4_0 model representation**.

On the featured clip, median inference falls from **2577.86 ms to 1616.44 ms**: **1.5948× faster**, with **43.72% lower peak RSS** and a model artifact reduced from **487,614,201 to 145,471,353 bytes**. Both profiles produce the same normalized transcript on this clip.

## We tested the claim beyond the hero clip

The preset database contains clean JFK speech, noisy Apollo radio, and archival Roosevelt speech. Every entry maps an MP4 preview to a checksum-pinned 16 kHz mono WAV, reference transcript, source, license, and benchmark identifier.

Five measured runs per profile per clip produced **30 measured processes**:

| Corpus result | FP16 | Q4_0 |
| --- | ---: | ---: |
| Median real-time factor | 0.1229 | 0.0773 |
| Corpus WER | 6.9% | 8.3% |
| Median paired speedup | — | **1.5519×** |
| Bootstrap 95% interval | — | **1.4950–1.6162×** |

The WER change is one additional Q4 word error on the deliberately difficult Apollo radio clip. The two archival speech clips retained exact profile-to-profile transcript agreement. Pocket Proof surfaces that cost instead of turning a one-clip result into a universal quality claim.

## How we built it

- **React + TypeScript + Vite** provide the judge-facing application.
- A small **Node.js service** inspects the host, reads the SQLite preset catalog, launches native inference, streams progress with server-sent events, and persists immutable reports.
- **Arm STT-Runner and whisper.cpp** provide the native Arm64 speech runtime.
- A closed **JSON Schema** describes complete reports, including raw measurements, statistics, runtime identity, architecture evidence, artifact hashes, configuration hashes, and provenance.
- Tests independently recompute stored statistics from raw runs rather than merely trusting the displayed totals.
- GitHub Actions runs tests, type checking, builds, evidence verification, media verification, setup smoke checks, and secret scanning.

Hosted Judge Mode provides a zero-install replay of the pinned evidence. Local mode runs one warm-up plus five measured trials per profile, alternated in AB/BA order and executed sequentially.

## Why Arm

Pocket Proof runs the workload locally on an Arm-powered client device and verifies both host and binary architecture as `arm64`. This directly serves the Mobile AI track's focus on private, responsive, offline-capable inference on phones, tablets, and laptops.

It is not an API wrapper: after runtime/model setup, the audio stays local and transcription is performed by native processes on the client CPU.

## The experiment that did not win

We separately isolated KleidiAI with the same Q4_0 model over seven interleaved pairs. On this exact Apple M5/four-thread configuration, `USE_KLEIDIAI=ON` measured **0.9832×** relative to OFF—no observed speedup.

We kept that result. It is visible in the evidence instead of being quietly discarded, and the headline gain is never attributed to KleidiAI. That negative result is part of Pocket Proof's purpose: an optimization laboratory should help developers reject changes as confidently as it helps them ship wins.

## Challenges

The hardest problem was not drawing two lanes. It was maintaining a defensible experimental contract while producing an experience a judge can understand in seconds.

We had to prevent concurrent CPU contention, preserve raw processes and hashes, separate single-clip quality from corpus quality, verify native execution rather than infer it from the host, and resist attributing a result to an acceleration path that did not improve this configuration.

## Accomplishments

- A dramatic, honest race backed only by recorded measurements
- A complete native Arm64 reproduction path
- A real licensed-media SQLite database rather than hard-coded demo data
- Thirty corpus measurements plus the ten-run featured experiment
- Quality, memory, latency, model-size, and provenance evidence in one report
- A hosted, accessible judge experience and a reproducible local benchmark
- Explicit negative evidence for an optimization that did not help

## What we learned

The fastest configuration is not automatically the best configuration. Q4_0 makes this workload materially faster and smaller, but the noisy clip shows a measurable quality cost. That is a product decision, not a footnote.

We also learned that platform support is not the same as a measured platform win. Arm developers benefit from reports that distinguish “supported,” “executed,” and “proved faster.”

## Why Pocket Proof should win

Most optimization submissions end with a benchmark table. Pocket Proof turns the table into an experience, lets a judge inspect the transcript behind the number, and packages the complete experiment so another developer can reproduce or reject it.

It combines the four judging dimensions in one coherent product: serious native implementation, unusually clear developer experience, reusable evidence artifacts, and a memorable proof moment that never trades credibility for spectacle.

## What's next

The report contract and lane model are designed to extend beyond Whisper. Next steps are adapters for image and language models, energy-per-inference measurements, and the same controlled experiment on additional Arm clients such as Android and Windows on Arm.

## Built with

React, TypeScript, Vite, Node.js, SQLite/sql.js, Arm STT-Runner, whisper.cpp, and Arm KleidiAI.
