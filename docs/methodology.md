# Benchmark methodology

## Question

On this host, what does Q4_0 weight quantization change for Whisper small.en transcription when the same native Arm64 CPU runtime, input, and thread count are held constant?

## Protocol

1. Record OS, hardware, architecture, memory, tool/runtime revisions, model hash/size, input hash/duration, binary metadata, configuration, and timestamp.
2. Build one release-mode native Arm64 CPU binary from the pinned source revision with `USE_KLEIDIAI=OFF`.
3. Use the same audio, decoding options, language, and thread count in both lanes; the intended variable is FP16 versus Q4_0 model representation.
4. Perform warm-ups that are excluded from reported statistics.
5. Make at least five measured runs per configuration, alternating lane order where practical to reduce systematic thermal/order bias. Never run both lanes concurrently.
6. Preserve raw per-run records and calculate median, minimum, maximum, and standard deviation. Do not present p95 for a tiny sample.
7. Compare transcripts against the same reference using documented normalization and WER when a reference transcript is available.

The featured artifact uses one warm-up then five measured runs per lane at four threads. Measured rounds alternate execution order: FP16 then Q4_0, followed by Q4_0 then FP16, and so on. Timing combines whisper.cpp’s monotonic internal measurement with macOS `/usr/bin/time -lp` memory data. [Featured report](../public/featured-report.json)

The report's per-run `command` arrays are the exact historical process arguments, and the current harness preserves that command shape. English is implied by the English-only `small.en` model and whisper.cpp's default language behavior. GPU execution is unavailable because the runtime is built with `GGML_METAL=OFF`; both lanes therefore use the CPU backend without needing a per-run `-ng` flag. Decoder beam size and best-of are the recorded whisper.cpp defaults (5 and 5).

## Reported measures

- Warm inference latency and, when supported, cold-start/model-load timing measured separately.
- Real-time factor: inference seconds divided by audio seconds.
- Model file size from the actual artifact.
- Peak resident memory only when collected with a documented, comparable method.
- Normalized WER or a clearly labelled transcript comparison.

## Valid interpretation

The measured primary speedup is `2577.86 / 1616.44 = 1.5948×`. It applies only to the Apple M5, the pinned model/runtime revisions, 11-second JFK clip, CPU-only four-thread command, and run protocol. The observed 0 normalized WER and matching output on this one clip are evidence for this workload, not a general accuracy guarantee.

## Threats to validity

Background load, thermal state, power mode, caching, and the one-clip corpus can affect outcomes. The raw report retains every measured run. The FP16 inference range was 2541.80–3353.81 ms; Q4_0 was 1486.35–1817.50 ms. A failed run must be retained and explained rather than silently dropped.

## Preset corpus extension

The featured artifact stays frozen as the original one-clip experiment. A separate [three-clip corpus summary](../benchmarks/corpus-summary.json) broadens the evidence without rewriting that historical report. The SQLite catalog contains three public-domain English clips spanning clean archival speech, noisy radio transmission, and archival room audio. Each clip receives one warm-up and five measured runs per profile at four threads, for 30 measured processes.

Corpus timing uses real-time factor so clips of different duration remain comparable. The summary reports the median of 15 paired FP16/Q4 run ratios and a deterministic 10,000-resample bootstrap 95% interval. Corpus WER pools word errors over one deterministic output per profile and clip rather than multiplying the same transcript by the five performance repetitions. The noisy Apollo clip is intentionally retained even though it exposes a one-word Q4 quality regression.
