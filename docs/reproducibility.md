# Reproducibility

## Target environment

Supported automation target: native macOS on Apple Silicon (`arm64`). The featured report was collected on an Apple M5 MacBook Pro with 16 GB memory and macOS 26.5.2. The scripts use macOS-specific inspection and `/usr/bin/time` interfaces; other upstream STT-Runner platforms are not claimed as supported here. Record, rather than assume, the exact chip, core count, memory, OS, Node version, CMake/Python versions, source revision, and binary architecture.

```sh
uname -m
arch
sysctl -n sysctl.proc_translated  # 0 indicates this process is not Rosetta-translated
system_profiler SPHardwareDataType
file path/to/binary
```

## Run the control experiment

```sh
npm ci
bash scripts/setup-runtime.sh
npm run benchmark -- --runs 5 --warmup 1 --threads 4
npm run verify
```

The setup process pins STT-Runner revision `bdabdb945f373651442a3693c0cd55d9af690e32`, downloads the FP16 small.en artifact, derives/verifies the Q4_0 artifact, and produces native Arm64 binaries. If CMake is installed outside `PATH`, invoke setup as `CMAKE_BIN=/absolute/path/to/cmake bash scripts/setup-runtime.sh`. The primary benchmark uses the `USE_KLEIDIAI=OFF` CPU binary for both lanes, with four threads and matching audio/options. Do not edit or overwrite a completed result; create a new report.

## Minimum artifact contents

Each result JSON must include:

- schema/version and immutable result ID;
- timestamp, available Git commit and pinned upstream source revisions, host/OS/architecture, and translated-process state;
- binary path/hash/metadata and `USE_KLEIDIAI` configuration;
- model identifier/hash/byte size and input identifier/hash/duration;
- command options, warm-up policy, thread count, and lane order;
- raw run timings, summaries, measured memory fields/method, transcripts, quality fields, and failures.

## Verification gates

`npm run verify` should fail if architecture evidence, the intended lane configuration, a required report field, or result schema validity is missing. Treat UI cards as derived views of the report; do not maintain a separate hand-entered metrics source. Compare a newly generated result with [the featured report](../public/featured-report.json), but do not expect exact timing equality across thermal or machine state.

## Preset database and corpus

```sh
npm run media:verify
npm run benchmark -- --sample jfk --runs 5 --warmup 1 --threads 4
npm run benchmark -- --sample armstrong-small-step --runs 5 --warmup 1 --threads 4
npm run benchmark -- --sample roosevelt-infamy --runs 5 --warmup 1 --threads 4
npm run benchmark:corpus
```

`benchmark/media-catalog.json` is the reviewable source. `benchmark/preset-media.sqlite` is the runtime database, and `public/media-catalog.json` is the static hosted fallback. Verification requires all three representations and every audio, video, and archival-source checksum to agree. An ordinary benchmark never replaces the reviewed artifact. Only a deliberately reviewed command with `--promote` can update `public/featured-report.json`.

Run `npm run readiness` before release. It executes tests, type checking, the hosted production build, report/database integrity, secret scanning, media/demo checksums, and the submission artifact gate. Its 100-point result is deterministic release readiness, not a promise about subjective judging.

## Offline scope

Provisioning may download open dependencies or models. Once provisioned, the inference benchmark should require no network connection. This is a functional property to test; do not represent it as network isolation unless a verification artifact establishes it.

## Clean-clone validation

On 2026-08-13, commit `dabe8064436cf1e276da8cf037530957ccdfb271` was cloned into an empty directory on the featured Apple M5 host. The documented dependency install, native setup, environment verification, five-run benchmark, schema validation, development launch, and browser-triggered Judge Mode run completed successfully. Both built inference binaries inspected as Mach-O `arm64`, and the regenerated model hashes matched the manifest. Timing from that rehearsal is intentionally not substituted for the immutable featured result.
