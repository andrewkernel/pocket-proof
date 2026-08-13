# Contributing

Thank you for helping make local AI optimization reproducible.

## Before opening a change

- Keep benchmark claims tied to a versioned artifact. Never insert illustrative performance numbers.
- Preserve the primary control: same input/options/threads and the same native Arm64 `USE_KLEIDIAI=OFF` CPU binary; FP16 versus Q4_0 model representation is the intended changed variable.
- Do not claim M-series SME/SME2, a specific microkernel, or an accelerator path without captured evidence.
- Record licenses, source revision, model hash, and redistribution rights for any added dependency, model, audio, or visual asset in `THIRD_PARTY_NOTICES.md` or the corpus manifest.
- Do not commit credentials, API keys, user audio, personal data, or generated artifacts containing them.

## Local checks

```sh
npm install
npm run typecheck
npm test
npm run verify
npm run secret-scan
```

If a benchmark change is relevant, run it on the currently supported native macOS arm64 target and include the new immutable report rather than replacing a prior result. Keep documentation and the Devpost draft aligned with measured output.

## Style

Write plain, precise prose. Cite official sources for platform claims. Prefer “measured on this configuration” to general performance promises. All user-facing submission materials must be in English under the challenge rules.
