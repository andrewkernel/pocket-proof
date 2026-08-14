# Simple submission guide

## How Pocket Proof works

1. A user can choose an English audio or video file and receive a real transcript from a quantized Whisper model running inside the browser. The file is decoded locally and never uploaded.
2. Judge Mode separately loads the reviewed native benchmark report, three-clip corpus summary, and preset catalog.
3. A local native run launches the FP16 and Q4_0 profiles sequentially, alternating order after warm-up. Server-sent events expose the real active lane and repetition.
4. The app derives latency, peak memory, model size, WER, transcript differences, corpus evidence, and history from immutable JSON reports.
5. Export evidence downloads the exact report behind the visible numbers. The hosted benchmark race is an explicitly labelled replay; cloning the repository enables the native Apple M5 experiment.

## Final Devpost steps

1. Open the Arm Create submission form and select **Track 3: Mobile AI**.
2. Use `Pocket Proof` as the project name and paste the text from `submission/devpost-draft.md`.
3. Add the public repository: <https://github.com/andrewkernel/pocket-proof>.
4. Add Hosted Judge Mode: <https://andrewkernel.github.io/pocket-proof/>.
5. Record the updated 80–90 second walkthrough using `docs/demo-script.md`. Run the sample once before recording so the browser model is cached. Upload the finished video to YouTube or Vimeo as public or unlisted, then add that URL.
6. Use the live transcript result, measured race, and corpus panel as the first three project images. Follow with the social preview for sharing.
7. In testing instructions, write: “Choose **Use the 11-second demo**, then **Transcribe locally**. First use downloads pinned browser model/runtime files; the audio stays in the tab. The native benchmark race below is a replay of checksum-pinned Apple M5 evidence. Follow README Quick start to reproduce the native run.”
8. Preview every link while signed out, confirm the repository shows the MIT license, and submit before **August 14, 2026 at 4:00 PM Pacific Time**.

Do not replace the measured wording with an Arm-wide claim. Keep “on this Apple M5 configuration,” preserve the negative KleidiAI result, and describe the corpus quality change as one additional word error on the noisy Apollo clip.
