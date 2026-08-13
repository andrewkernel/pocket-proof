# Architecture

Pocket Proof separates the product experience from the evidence it presents.

```text
audio + pinned Whisper small.en model artifacts
          │
          ├── native Arm64 CPU, FP16, USE_KLEIDIAI=OFF ──┐
          └── native Arm64 CPU, Q4_0, USE_KLEIDIAI=OFF ──┤
                                                         ▼
                                              immutable benchmark JSON
                                                         ▼
 React/Vite UI ◀── Node orchestration API ◀── hardware + binary inspection
```

## Product layers

- **React + TypeScript + Vite:** local visual workspace, transcript comparison, result exploration, and Judge Mode.
- **Node orchestration service:** starts local work, validates inputs, runs subprocesses, samples process state where available, and stores structured results.
- **STT-Runner / whisper.cpp:** native inference engine. The featured comparison uses one pinned, `USE_KLEIDIAI=OFF` Arm64 CPU binary so only FP16 versus Q4_0 model representation changes. Arm documents STT-Runner as macOS-aarch64-tested. [STT-Runner](https://github.com/Arm-Examples/STT-Runner)
- **Artifact store:** append-only benchmark reports containing environment, binary, model, input, command/configuration, timing, memory measurements, transcript, and error data.

## Evidence boundaries

The UI animates a side-by-side race from the recorded report `run-2026-08-13T22-01-38-888Z-c2b8e5df`; it is labelled a recorded replay and does not imply simultaneous measurement. Native architecture is demonstrated using OS inspection and executable metadata. A visual `arm64` badge is not proof of a particular Arm ISA extension or microkernel dispatch.

## Why this design

The Mobile AI track values on-device execution, optimization for client constraints, and reproducibility. It explicitly lists mobile/client runtimes and local transcription use cases. [Track details](https://arm-ai-optimization-challenge.devpost.com/details/trackdetails) The product therefore makes the validation artifact—not the animation—the source of truth.
