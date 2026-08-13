import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function command(file, args = []) {
  try {
    const { stdout } = await execFileAsync(file, args, { encoding: "utf8" });
    return stdout.trim();
  } catch {
    return null;
  }
}

function profilerField(text, name) {
  const match = text?.match(new RegExp(`${name}:\\s*(.+)`));
  return match?.[1]?.trim() ?? null;
}

export async function getSystemSnapshot() {
  const [architecture, osVersion, profiler, memoryBytes, kernelRelease, translatedValue] = await Promise.all([
    command("/usr/bin/uname", ["-m"]),
    command("/usr/bin/sw_vers", ["-productVersion"]),
    command("/usr/sbin/system_profiler", ["SPHardwareDataType"]),
    command("/usr/sbin/sysctl", ["-n", "hw.memsize"]),
    command("/usr/bin/uname", ["-r"]),
    command("/usr/sbin/sysctl", ["-n", "sysctl.proc_translated"]),
  ]);

  return {
    architecture,
    os: "macOS",
    osVersion,
    kernelRelease,
    model: profilerField(profiler, "Model Name"),
    modelIdentifier: profilerField(profiler, "Model Identifier"),
    chip: profilerField(profiler, "Chip"),
    cores: profilerField(profiler, "Total Number of Cores"),
    memoryBytes: memoryBytes ? Number(memoryBytes) : null,
    translated: translatedValue === "1",
    collectedAt: new Date().toISOString(),
  };
}
