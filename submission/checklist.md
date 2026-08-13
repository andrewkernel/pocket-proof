# Submission checklist

## Required project readiness

- [ ] Select **Mobile AI** on Devpost.
- [ ] Public repository is reachable, functional, and includes visible MIT license.
- [x] Repository includes source, assets required to run, setup instructions, and validation instructions.
- [x] Record what was newly created or significantly updated during the submission period.
- [x] Verify all third-party models, audio, code, and visuals are authorized; update notices.
- [ ] Provide free judge access to the working project/test build through the judging period.
- [x] Ensure all submission materials and testing instructions are English.

These requirements come from the [official rules](https://arm-ai-optimization-challenge.devpost.com/rules).

## Evidence package

- [x] Pin STT-Runner and model revisions; capture hashes.
- [x] Build both native release binaries and capture `file`/architecture evidence.
- [x] Run warm-up plus at least five sequential, interleaved measurements per lane.
- [x] Commit immutable raw/result JSON and expose one-click report export.
- [x] Featured primary report: one warm-up + five AB/BA measured runs per lane, FP16→Q4_0, same native Arm64 `USE_KLEIDIAI=OFF` CPU binary, four threads, JFK 11 s input.
- [x] Featured report records 1.5948× speedup, 37.30% latency reduction, 43.72% lower median peak RSS, 70.17% smaller model, normalized WER 0, and exact transcript match.
- [x] Separate seven-pair same-Q4_0 KleidiAI ablation documented as neutral/slightly slower (0.98× ON/OFF mean); do not attribute headline to KleidiAI.
- [x] Include transcript/reference and WER methodology where a reference is available.
- [x] Verify app UI derives metrics from the same artifact.

## Optional video

- [ ] Under three minutes; functioning target device shown.
- [ ] Public YouTube, Vimeo, or Youku link added to Devpost.
- [ ] No unlicensed music/material or third-party marks without permission.
- [ ] Clearly label any Judge Mode replay as recorded benchmark data.

## Final submission

- [x] Project overview, functionality/output, setup, Arm story, results, and impact completed.
- [ ] Repository URL and optional video URL added.
- [x] Test clean-clone setup on native Arm64 hardware.
- [ ] Submit by **Aug 14, 2026, 4:00 pm Pacific Time**.
