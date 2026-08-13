# Optimization contract

## Selected intervention: Q4_0 weight quantization

The featured report compares Whisper small.en in its FP16 ggml artifact against the Q4_0 artifact, with both lanes run through the **same** pinned STT-Runner native `arm64` CPU binary built `USE_KLEIDIAI=OFF`.

| Held constant | FP16 reference | Q4_0 optimized |
| --- | --- | --- |
| Host and runtime | Apple M5, macOS 26.5.2, same arm64 `whisper-cli`, CPU-only | Same |
| Task | `samples/jfk.wav`, 11,000 ms, English, 4 threads, `-nt` | Same |
| Intervention | FP16 model artifact | Q4_0 model artifact |

Five measured runs per lane (plus one warm-up) were sequential and alternating AB/BA. The report’s median inference time is 2577.86 ms FP16 and 1616.44 ms Q4_0: 1.5948× speedup and 37.30% lower latency. Median peak RSS fell from 791,117,824 to 445,251,584 bytes, and the model artifact fell from 487,614,201 to 145,471,353 bytes. Normalized WER was 0 in both lanes and all primary transcripts were identical. [Featured report](../public/featured-report.json)

## Rejected intervention: same-Q4_0 KleidiAI build

Arm’s STT-Runner exposes `USE_KLEIDIAI` and documents Q4_0 as the format currently accelerated by KleidiAI. [STT-Runner build options](https://github.com/Arm-Examples/STT-Runner) We tested this separately to avoid conflating it with quantization: same Q4_0 small.en, same 11-second input, native Arm64 CPU, four threads, and seven interleaved pairs. The OFF mean was 1467.81 ms; the ON mean was 1492.94 ms (ON/OFF = 0.98×). This is neutral/slightly slower, not a reliable gain on this Apple M5 configuration.

KleidiAI is therefore part of the research and build provenance but **not** the measured source of the headline improvement.

## Non-claims

- No claim of SME, SME2, I8MM, or other feature use on Apple M5 from the primary quantization result.
- No claim that Apple Neural Engine, Metal, Core ML, MLX, LiteRT, ExecuTorch, or XNNPACK executed the featured inference. The artifact identifies `whisper.cpp CPU`.
- No extrapolation beyond the recorded device, model, audio, thread count, and run protocol.

## Adjacent Arm technologies

KleidiAI is Arm’s library of optimized AI micro-kernels and integrates with various frameworks. [Arm Kleidi libraries](https://developer.arm.com/ai/kleidi-libraries) XNNPACK supports ARM64 on macOS and is an ExecuTorch CPU backend, making it a legitimate portability follow-up but not part of this experiment unless actually built and measured. [ExecuTorch XNNPACK](https://docs.pytorch.org/executorch/stable/ios-xnnpack.html)
