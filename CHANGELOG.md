# Changelog

## Unreleased

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
