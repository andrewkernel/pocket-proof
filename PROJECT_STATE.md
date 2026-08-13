# Project State

## Objective

Build Pocket Proof: an interactive, reproducible optimization laboratory for local AI on Arm-powered devices, demonstrated with speech-to-text.

## Current architecture

- React + TypeScript + Vite local UI.
- Node.js orchestration server for hardware inspection, subprocess execution, immutable result storage, and report export.
- Arm STT-Runner / whisper.cpp inference, compiled natively from a pinned revision.
- Controlled comparison: Whisper small.en FP16 versus a Q4_0 quantized representation, with the same input, native arm64 CPU runtime, decoder settings, and thread count.
- Sequential, interleaved measurements; Judge Mode renders the reviewed artifact without pretending the runs were simultaneous.

## Completed

- Confirmed host: Apple M5, arm64, 16 GB, macOS 26.5.2.
- Confirmed challenge permits Arm-powered laptops and speech-to-text in Mobile AI.
- Selected official Arm STT-Runner as the runtime foundation and measured the KleidiAI switch independently.
- Selected MIT license.
- Captured the immutable five-run FP16 versus Q4_0 report and seven-pair same-Q4_0 KleidiAI ablation.
- Implemented Judge Mode, local benchmark orchestration, report export, strict report verification, responsive QA screenshots, and CI.
- Applied and documented the AI Design Skills reference, including bundled typography, evidence-first responsive layouts, semantic live states, and keyboard accessibility.
- Exercised the browser-triggered benchmark end to end and verified that it returns the new live report without replacing the reviewed featured artifact.
- Completed an empty-directory clone rehearsal of commit `dabe806`: `npm ci`, tests, typecheck, build, runtime provisioning, checksum verification, native Arm64 inspection, a full five-run benchmark, report validation, local launch, and the browser-triggered Judge Mode race all passed.

## Blocked

- None.

## Benchmark results

- Featured five-run result at four threads: Q4_0 reduced median inference time from 2577.86 ms to 1616.44 ms (1.5948×), median peak RSS by 43.72%, and model bytes by 70.17%. Normalized WER was 0 for both profiles with exact output agreement on the single 11-second clip.
- In a separate seven-pair same-Q4_0 sample, KleidiAI ON averaged 1492.94 ms versus 1467.81 ms OFF (0.9832×). No speedup was observed in that sample, so it is retained as a rejected intervention rather than marketed as a win.

## Key decisions

- Use a local web product instead of Tauri because the machine has no Rust toolchain and the deadline-critical inference remains a native arm64 subprocess.
- Do not claim SME/SME2 on macOS.
- Use quantization as the primary measured intervention; preserve the same-Q4_0 KleidiAI A/B as negative evidence.

## Submission risks

- Challenge deadline: 2026-08-14 16:00 PDT.
- Complete public repository publication and re-verify the remote clone.
- Record and upload the optional under-three-minute demo video before final Devpost submission.

## Next highest-leverage task

Publish the public repository, verify the remote clone, and record the demo from `docs/demo-script.md`.
