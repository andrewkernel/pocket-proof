# Engineering Decisions

## D-001 — Official Arm STT-Runner is the inference foundation

**Decision:** Build STT-Runner from one pinned revision and compare Whisper small.en FP16 with its Q4_0 representation using the same input, native arm64 CPU runtime, decoder settings, and thread count. Build `USE_KLEIDIAI=ON` separately as an experimental verification lane.

**Why:** STT-Runner is an official Arm example, is tested on macOS-aarch64, wraps whisper.cpp, and provides a reproducible benchmark surface. On the target Apple M5, initial controlled tests found the KleidiAI build was neutral-to-slower while Q4_0 quantization delivered a material latency and model-size improvement.

**Constraint:** Quantization is the primary intervention. The project must not attribute the measured FP16→Q4_0 change to KleidiAI. Same-Q4_0 KleidiAI tests are retained as negative evidence.

## D-002 — Local React/Node product instead of Tauri

**Decision:** Use React, TypeScript, Vite, and a small Node server.

**Why:** Node is already native arm64 and installed. Rust/Tauri is absent. A localhost application preserves native subprocess inference while minimizing toolchain risk and retaining a clean seam for a future desktop shell.

## D-003 — Sequential interleaved measurements

**Decision:** Never benchmark both configurations simultaneously. Alternate measured runs after warm-ups, and present the reviewed measurements in a clearly labelled two-lane Judge Mode.

**Why:** Concurrent processes would contaminate latency, memory, CPU contention, and thermal conditions. Judge Mode must label recorded replays and live validation accurately.

## D-004 — No unsupported architecture claims

**Decision:** Claim native arm64 execution, the compiled `USE_KLEIDIAI` setting, and measured outcomes. Do not claim Apple M5 SME/SME2 or specific microkernel dispatch unless runtime evidence proves it.

## D-005 — Evidence first product design

**Decision:** Use the MIT licensed [AI Design Skills](https://github.com/elayadesign/ai-design-skills) system as a design reference, adapted to a judge facing developer tool rather than copied as a generic marketing page.

**Applied:** Locally bundled Geist and Geist Mono typography, a constrained type and spacing scale, flat near black surfaces, one dominant benchmark action, balanced hero copy, layout shaped loading states, keyboard focus, a skip link, semantic landmarks, physical interaction feedback, responsive proof handling, social metadata, and a restrained word by word evidence statement.

**Intentional deviations:** Pocket Proof retains technical labels, dense provenance, and a results first page order. It replaces a decorative two point Pareto chart with a measured comparison table and does not add testimonials, fake social proof, pricing, or conversion sections that would weaken benchmark credibility.
