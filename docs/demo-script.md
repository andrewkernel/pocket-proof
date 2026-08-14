# Demo script (83 seconds)

The challenge permits an optional public video shorter than three minutes and says judges need not watch after that point. [Rules](https://arm-ai-optimization-challenge.devpost.com/rules)

The finished captioned artifact is `assets/demo/pocket-proof-demo.mp4`; its narration source is [demo-narration.md](demo-narration.md), and its checksums are in `assets/demo/demo-manifest.json`.

## 0:00–0:18 — establish the product and presets

Show native `arm64`, Apple M5, and the SQLite-backed public-domain preset library. Explain that every MP4 preview maps to a checksum-pinned WAV, transcript, source, and license.

## 0:18–0:38 — establish fairness

Show the control contract: same Whisper small.en task, 11-second audio, four threads, native Arm64 CPU binary, and `USE_KLEIDIAI=OFF`. Point to the only intended difference: FP16 versus Q4_0 model representation. State that the visual race is a replay of sequential measurements, not two competing processes.

## 0:38–1:00 — reveal single-clip and corpus evidence

Show the featured 1.59× result, then the three-clip result: 30 measured processes, 1.55× median paired speedup, 1.49–1.62× bootstrap interval, and 6.9%→8.3% corpus WER.

## 1:00–1:23 — disclose the cost and close

Say that the noisy Apollo clip adds one Q4 word error. State that the same-model KleidiAI ablation did not improve this M5 configuration and is preserved as negative evidence. Close on immutable history and exportable reports.

Avoid third-party music, unlicensed assets, or marks that imply sponsorship/endorsement. [Challenge rules](https://arm-ai-optimization-challenge.devpost.com/rules)
