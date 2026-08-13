# Arm platform notes

## What is established here

The host target is an Arm-powered Apple-silicon laptop running native `arm64` processes. The challenge’s Mobile AI track explicitly permits local AI on Arm-powered laptops and lists transcription among suitable workloads. [Track details](https://arm-ai-optimization-challenge.devpost.com/details/trackdetails)

KleidiAI is an Arm CPU micro-kernel library; Arm describes framework-level integration and support across Arm CPU designs. [Arm Kleidi libraries](https://developer.arm.com/ai/kleidi-libraries) STT-Runner is used because it is Arm’s own STT example and supports macOS-aarch64. [STT-Runner](https://github.com/Arm-Examples/STT-Runner)

The featured result is a native Arm64 CPU **quantization** result: both lanes have the same `USE_KLEIDIAI=OFF` binary. A separately measured, same-Q4_0 KleidiAI ablation was neutral/slightly slower (0.98× ON/OFF mean over seven interleaved pairs) and is intentionally not presented as an Arm-library win.

## What is deliberately not claimed

Apple Silicon is Arm64, but it is not a Cortex-A/X or Neoverse system. A generic Arm library integration does not prove a given M-series feature, instruction, or kernel dispatch. Specifically, Pocket Proof does not claim SME/SME2 on macOS. STT-Runner’s documented SME runtime toggle is under its Linux section, not its macOS instructions.

## Technology disposition

| Technology | Relevance | Pocket Proof disposition |
| --- | --- | --- |
| KleidiAI | Arm CPU optimization research path | Separate same-Q4_0 ablation; neutral on the featured M5 configuration |
| KleidiCV | Computer-vision/image routines | Not used for transcription |
| XNNPACK / ExecuTorch | ARM64 macOS CPU path supported | Documented future portability path; not claimed in primary results |
| LiteRT | XNNPACK is supported in its CMake builds on macOS | Not selected; LiteRT Core ML documentation says it is tested on iOS, not macOS |
| Performix | Arm Neoverse/Linux profiling target system | Not a source of M5 mobile-client profiling evidence |

Sources: [XNNPACK backend](https://docs.pytorch.org/executorch/stable/ios-xnnpack.html), [LiteRT CMake](https://ai.google.dev/edge/litert/build/cmake), [LiteRT Core ML FAQ](https://ai.google.dev/edge/litert/ios/coreml), [Arm Performix](https://developer.arm.com/servers-and-cloud-computing/arm-performix), [Performix install guide](https://learn.arm.com/install-guides/performix/).

ExecuTorch’s MLX delegate announced support for speech-to-text on Apple Silicon, but is labelled experimental. It is not part of the featured CPU quantization result. [PyTorch MLX delegate](https://pytorch.org/blog/running-pytorch-models-on-apple-silicon-gpus-with-the-executorch-mlx-delegate/)
