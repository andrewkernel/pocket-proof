# Demo narration

Local speech AI keeps private recordings off the cloud—but large models are slow and memory hungry. This is Pocket Proof, running on a native Arm64 Apple M5.

The exact same transcription task takes 2.58 seconds with FP16 and 1.62 with Q4. The optimized profile finishes while the reference is still running: 1.59 times faster on this clip, 44 percent less peak memory, and a 70 percent smaller model.

This is a timed replay of real sequential measurements, not fake concurrent telemetry. Same audio, same decoder, same four CPU threads, and the same native binary. The only intended change is FP16 weights to Q4 zero.

Speed is not enough. The featured clip keeps an exact normalized transcript. Across three licensed clips and thirty measured processes, the median paired speedup is 1.55 times, with a 1.49 to 1.62 bootstrap interval.

Pocket Proof also shows the price: corpus word error rate moves from 6.9 to 8.3 percent because the noisy Apollo clip changes one additional word.

Even the experiment that failed stays visible. KleidiAI produced no observed gain on this configuration, so it is evidence—not the headline.

Anyone can publish a faster number. Pocket Proof shows whether you should believe it, whether the quality cost is worth shipping, and gives you every raw run needed to reproduce the decision.
