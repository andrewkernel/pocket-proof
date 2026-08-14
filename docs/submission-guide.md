# Simple submission guide

## How Pocket Proof works

1. Judge Mode loads the reviewed benchmark report, three-clip corpus summary, and preset catalog.
2. A user chooses one of three public-domain video previews. Every preview maps to a checksum-pinned WAV, reference transcript, license, and SQLite record.
3. A local run launches the FP16 and Q4_0 profiles sequentially, alternating order after warm-up. Server-sent events expose the real active lane and repetition.
4. The app derives latency, peak memory, model size, WER, transcript differences, corpus evidence, and history from immutable JSON reports.
5. Export evidence downloads the exact report behind the visible numbers. The hosted site is an explicitly labelled replay; cloning the repository enables native inference.

## Final Devpost steps

1. Open the Arm Create submission form and select **Track 3: Mobile AI**.
2. Use `Pocket Proof` as the project name and paste the text from `submission/devpost-draft.md`.
3. Add the public repository: <https://github.com/andrewkernel/pocket-proof>.
4. Add Hosted Judge Mode: <https://andrewkernel.github.io/pocket-proof/>.
5. Upload `assets/demo/pocket-proof-demo.mp4` to YouTube or Vimeo as a public or unlisted video, then add that URL. It is 83 seconds, 720p, English narrated, captioned, and contains no music.
6. Add `assets/pocket-proof-social-preview.png`, `assets/screenshots/judge-mode-hero.png`, and `assets/demo/03-corpus.png` as project images.
7. In testing instructions, write: “Hosted Judge Mode is a replay of checksum-pinned evidence. For native execution on Apple Silicon, follow README Quick start; setup downloads the model, and inference stays local afterward.”
8. Preview every link while signed out, confirm the repository shows the MIT license, and submit before **August 14, 2026 at 4:00 PM Pacific Time**.

Do not replace the measured wording with an Arm-wide claim. Keep “on this Apple M5 configuration,” preserve the negative KleidiAI result, and describe the corpus quality change as one additional word error on the noisy Apollo clip.
