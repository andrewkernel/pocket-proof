# Demo narration

This is Pocket Proof, a local AI optimization lab running on a native Arm64 Apple M5. Choose one of three public-domain video presets. Each preview maps to a checksum-pinned, benchmark-ready audio file, a reference transcript, and a recorded license in the SQLite catalog.

The benchmark never races two processes at once. It runs one warm-up and five alternating measurements per profile, then streams the real lane and run number into Judge Mode. The controlled change is Whisper Small English F P sixteen weights to Q four zero weights, using the same native CPU binary, clip, thread count, and decoder.

On the featured clip, Q4_0 is 1.59 times faster, uses 43.7 percent less peak resident memory, and makes the model 70.2 percent smaller. Across three licensed clips and thirty measured processes, the median paired speedup is 1.55 times, with a bootstrap interval from 1.49 to 1.62.

Pocket Proof also reports the cost. Corpus word error rate changes from 6.9 percent to 8.3 percent because the noisy Apollo radio clip changes one additional word. The separate same-model Kleidi A I experiment did not improve this M5 configuration, so it is preserved as negative evidence—not marketed as the win. Every run stays immutable and exportable for reproduction.
