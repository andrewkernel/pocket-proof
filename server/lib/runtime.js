import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve();

const defaults = {
  referenceBinary: "vendor/stt-runner/build-reference/bin/stt-bench",
  optimizedBinary: "vendor/stt-runner/build-reference/bin/stt-bench",
  referenceCli: "vendor/stt-runner/build-reference/bin/whisper-cli",
  optimizedCli: "vendor/stt-runner/build-reference/bin/whisper-cli",
  experimentalKleidiaiCli: "vendor/stt-runner/build-kleidiai/bin/whisper-cli",
  referenceModel: "models/ggml-small.en.bin",
  optimizedModel: "models/ggml-small.en-q4_0.bin",
  sample: "samples/jfk.wav",
};

const developmentFallbacks = {
  referenceBinary: "work/inference_eval/STT-Runner/build-kleidiai-off/bin/stt-bench",
  optimizedBinary: "work/inference_eval/STT-Runner/build-kleidiai-off/bin/stt-bench",
  referenceCli: "work/inference_eval/STT-Runner/build-kleidiai-off/bin/whisper-cli",
  optimizedCli: "work/inference_eval/STT-Runner/build-kleidiai-off/bin/whisper-cli",
  experimentalKleidiaiCli: "work/inference_eval/STT-Runner/build-kleidiai-on/bin/whisper-cli",
  referenceModel: "work/inference_eval/models/ggml-small.en.bin",
  optimizedModel: "work/inference_eval/models/ggml-small.en-q4_0-stt.bin",
  sample: "samples/jfk.wav",
};

async function exists(file, executable = false) {
  try {
    await access(file, executable ? constants.X_OK : constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveEntry(key, envName, executable = false) {
  const fromEnvironment = process.env[envName];
  const candidates = [fromEnvironment, defaults[key], developmentFallbacks[key]].filter(Boolean).map((entry) => path.resolve(root, entry));
  for (const candidate of candidates) {
    if (await exists(candidate, executable)) return candidate;
  }
  return candidates[0];
}

export async function resolveRuntime(options = {}) {
  const runtime = {
    referenceBinary: await resolveEntry("referenceBinary", "POCKETPROOF_REFERENCE_BENCH", true),
    optimizedBinary: await resolveEntry("optimizedBinary", "POCKETPROOF_OPTIMIZED_BENCH", true),
    referenceCli: await resolveEntry("referenceCli", "POCKETPROOF_REFERENCE_CLI", true),
    optimizedCli: await resolveEntry("optimizedCli", "POCKETPROOF_OPTIMIZED_CLI", true),
    experimentalKleidiaiCli: await resolveEntry("experimentalKleidiaiCli", "POCKETPROOF_KLEIDIAI_CLI", true),
    referenceModel: await resolveEntry("referenceModel", "POCKETPROOF_REFERENCE_MODEL"),
    optimizedModel: await resolveEntry("optimizedModel", "POCKETPROOF_OPTIMIZED_MODEL"),
    sample: options.samplePath ? path.resolve(root, options.samplePath) : await resolveEntry("sample", "POCKETPROOF_SAMPLE"),
  };

  const checks = {};
  for (const [key, value] of Object.entries(runtime)) {
    checks[key] = await exists(value, key.includes("Binary") || key.includes("Cli"));
  }
  const [referenceModelStats, optimizedModelStats] = await Promise.all([
    checks.referenceModel ? stat(runtime.referenceModel) : null,
    checks.optimizedModel ? stat(runtime.optimizedModel) : null,
  ]);
  const requiredChecks = ["referenceBinary", "optimizedBinary", "referenceCli", "optimizedCli", "referenceModel", "optimizedModel", "sample"];
  return {
    ...runtime,
    checks,
    modelBytes: {
      reference: referenceModelStats?.size ?? null,
      optimized: optimizedModelStats?.size ?? null,
    },
    ready: requiredChecks.every((key) => checks[key]),
  };
}
