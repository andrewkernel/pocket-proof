# Demo script (< 3 minutes)

The challenge permits an optional public video shorter than three minutes and says judges need not watch after that point. [Rules](https://arm-ai-optimization-challenge.devpost.com/rules)

## 0:00–0:15 — establish the problem

“This is Pocket Proof: an evidence-first way to see what optimization does to local speech-to-text on an Arm-powered laptop. No audio leaves this device during inference.” Show `arm64`, the actual chip/OS, input duration, and Q4_0 model identifier.

## 0:15–0:40 — establish fairness

Show the control contract: same Whisper small.en task, 11-second audio, four threads, native Arm64 CPU binary, and `USE_KLEIDIAI=OFF`. Point to the only intended difference: FP16 versus Q4_0 model representation. State that the visual race is a replay of sequential measurements, not two competing processes.

## 0:40–1:20 — run or replay evidence

Trigger a real benchmark if it completes reliably; otherwise choose a UI control labelled “Replay recorded benchmark.” Show the report ID, number of measured runs, warm-ups, and lane order. Do not narrate a metric that is not visible in the artifact.

## 1:20–1:55 — reveal results

Reveal the actual median outcomes: 2577.86 ms to 1616.44 ms (1.5948×, 37.30% lower latency), 791,117,824 B to 445,251,584 B median peak RSS (43.72% less), and 487,614,201 B to 145,471,353 B model bytes (70.17% smaller). Show the exact transcript match and normalized WER 0 on the JFK clip. Say “on this configuration” rather than extrapolating.

## 1:55–2:30 — make it reusable

Open the Reproduce panel: command, model hashes, binary metadata, Arm notes, the separate neutral KleidiAI ablation, and exportable JSON. Briefly show `file` output or equivalent native-binary evidence.

## 2:30–2:50 — close

“Pocket Proof makes Arm optimization inspectable: a controlled intervention, real local inference, and a result another developer can reproduce.”

Avoid third-party music, unlicensed assets, or marks that imply sponsorship/endorsement. [Challenge rules](https://arm-ai-optimization-challenge.devpost.com/rules)
