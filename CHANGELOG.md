# Changelog

## Unreleased

## 1.1.0 — 2026-08-14

- Added a real bring-your-own-audio experience to hosted Judge Mode: local browser decoding, quantized Whisper Tiny English Q4 inference through WebAssembly, live token-by-token transcript streaming, transcript copy/download, run time, duration, and real-time factor.
- Pinned the browser runtime to Transformers.js 4.2.0 and the browser model to immutable ONNX revision `2575352d61be1bf7225cf8f8b268a4678025fc58`; model/runtime files are cached after first use while audio stays in the tab.
- Added a product comparison that explains the difference between cloud transcription, plain local Whisper, and Pocket Proof without conflating the browser preview with the native Apple M5 benchmark.
- Reworked the hero and demo flow around a SaaS progression: try a file, watch the live decoder and local signal chain, understand the advantage, watch the native proof, and inspect the evidence.
- Added tests covering the local-processing contract, pinned browser artifacts, comparison story, and product-before-proof page order.

## 1.0.0 — 2026-08-13

- Reframed the product around the judge's first ten seconds: a human privacy problem, the measured outcome above the fold, and a one-click 2.6-second proof.
- Added a clearly labelled timed replay in hosted Judge Mode so Q4_0 visibly finishes while FP16 is still running without misrepresenting the sequential source measurements.
- Separated hosted preview selection from the fixed featured report to prevent accidental clip/evidence mismatch.
- Added a shipping-decision narrative that connects local privacy, the controlled model change, and the measured WER cost.
- Rewrote the Devpost entry around the official judging dimensions and the differentiating idea: every optimization claim carries reproducible evidence.
- Rebuilt the 83-second captioned demo, social preview, desktop/mobile screenshots, and evidence frames around the new result-first story.
- Added presentation-contract tests covering the first-screen hook, race ordering, replay honesty, Devpost narrative, image dimensions, and demo integrity.

- Added final recorded benchmark documentation from `run-2026-08-13T22-01-38-888Z-c2b8e5df`.
- Selected the FP16→Q4_0 model-quantization result as the headline: 1.5948× median speedup, 37.30% lower median latency, 43.72% lower median peak RSS, and 70.17% smaller model artifact on the featured Apple M5 workload.
- Recorded normalized WER 0 and exact transcript agreement for both primary lanes on the 11-second JFK clip.
- Rejected KleidiAI as the headline source after a same-Q4_0, seven-pair ablation was neutral/slightly slower (0.98× ON/OFF mean) on this M5 configuration.
- Rebuilt Judge Mode around the AI Design Skills reference with bundled Geist typography, responsive evidence layouts, explicit live/recorded states, keyboard support, and report-derived quality language.
- Enforced the closed benchmark JSON Schema before saving or publishing reports and added regression tests for reviewed/live report selection.
- Added a real SQLite preset database with three public-domain video previews, benchmark WAV mappings, transcript/source/license metadata, and SHA-256 verification.
- Added a 30-process, three-clip corpus artifact: 1.5519× median paired speedup (bootstrap 95% interval 1.4950–1.6162×), with corpus WER moving from 6.9% to 8.3% because of one additional Q4 error on noisy Apollo radio.
- Added server-sent benchmark progress, immutable history, an explicit featured-artifact promotion gate, and correct MiB/GiB display units.
- Added GitHub Pages Judge Mode deployment, an 83-second 720p narrated/captioned demo, and a deterministic 100-point submission-readiness gate.
