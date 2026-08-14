# Demo narration

Pocket Proof turns audio into text without uploading the recording—then proves why its native Arm path is worth shipping.

This is real browser inference, not a canned transcript. These words are arriving from the Whisper decoder, token by token, while the quantized model runs in this tab. The file never goes to Pocket Proof or a transcription API.

Cloud APIs receive the recording. Plain local Whisper keeps it private but gives you little evidence. Pocket Proof combines local processing with a measured, inspectable shipping decision.

On this native Arm64 Apple M5, Q4 turns 2.58 seconds into 1.62—1.55 times faster across the full corpus, with 44 percent less peak memory and a 70 percent smaller model.

The race is a visualization of sequential measurements. Thirty real processes show the gain holds across three clips, while word error rate moves from 6.9 to 8.3 percent.

Even the experiment that failed stays visible. KleidiAI showed no speedup on this configuration, so it is evidence—not the headline.

Pocket Proof is useful before you trust the benchmark, and credible after you inspect it. Private speech AI, with receipts.
