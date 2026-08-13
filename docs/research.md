# Research record

Research date: 2026-08-13. Claims below are linked to primary/official sources.

## Challenge requirements

- The official rules give a submission deadline of **Aug 14, 2026, 4:00 pm Pacific Time**. The schedule page displays the same closing deadline. [Rules](https://arm-ai-optimization-challenge.devpost.com/rules) · [Schedule](https://arm-ai-optimization-challenge.devpost.com/details/dates)
- Mobile AI covers local AI on Arm-powered client devices, including laptops, and explicitly includes transcription. It calls out size, memory, responsiveness, offline use, and latency as relevant constraints. [Track details](https://arm-ai-optimization-challenge.devpost.com/details/trackdetails)
- Publish a public open-source repository with an MIT or Apache-2.0 license, functional setup instructions, and a detailed write-up. A video is optional; if supplied, it must be public and under three minutes. [Rules](https://arm-ai-optimization-challenge.devpost.com/rules)
- Judging weights: implementation 40, UX/DX 15, impact 20, wow 25. [Rules](https://arm-ai-optimization-challenge.devpost.com/rules)

## Technology findings

- [STT-Runner](https://github.com/Arm-Examples/STT-Runner): official Arm example for STT, macOS-aarch64 tested, `USE_KLEIDIAI` switch, native benchmark executable, and Q4_0 KleidiAI constraint.
- [KleidiAI](https://github.com/ARM-software/kleidiai): Arm micro-kernel library for AI workloads on Arm CPUs. Its supported instruction variants cannot be assumed from an Arm64 host alone.
- [ExecuTorch/XNNPACK](https://docs.pytorch.org/executorch/stable/ios-xnnpack.html): ARM64 macOS is supported for the XNNPACK CPU backend, including 8-bit quantization. This is compatible with a future portable backend, not evidence of the selected runtime.
- [LiteRT](https://ai.google.dev/edge/litert/build/cmake): documents XNNPACK on macOS CMake builds. The [Core ML delegate FAQ](https://ai.google.dev/edge/litert/ios/coreml) says LiteRT/Core ML is tested on iOS, not macOS.
- [KleidiCV](https://developer.arm.com/community/arm-community-blogs/b/ai-blog/posts/what-s-new-in-kleidicv-26-03-for-computer-vision-on-arm-cpus): supports image/CV workloads and has Apple-silicon dispatcher progress; not relevant to ASR inference.
- [Arm Performix](https://developer.arm.com/servers-and-cloud-computing/arm-performix): supports Arm Neoverse/Linux profiling targets via a desktop host, so it should not be presented as M5 client profiling evidence.

## Consequence

The final experiment uses the official ASR path but follows evidence instead of a preferred narrative: the primary result is FP16→Q4_0 quantization on a native Arm64 CPU binary with KleidiAI disabled, while the same-Q4_0 KleidiAI ablation was neutral/slightly slower on the Apple M5 (0.98× ON/OFF mean). This is more credible than stacking unverified framework names or treating Arm64 as proof of every Arm extension.
