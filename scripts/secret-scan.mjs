#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const patterns = [
  "AKIA[0-9A-Z]{16}",
  "gh[pousr]_[A-Za-z0-9_]{20,}",
  "sk-[A-Za-z0-9]{20,}",
  "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
  "(password|passwd|api[_-]?key|secret)[[:space:]]*[:=][[:space:]]*['\\\"][^'\\\"]{8,}",
];

try {
  const { stdout } = await execFileAsync("rg", ["-n", "-i", "--hidden", "--glob", "!node_modules/**", "--glob", "!work/**", "--glob", "!.git/**", patterns.join("|"), "."], { encoding: "utf8" });
  console.error("Potential secrets found:\n" + stdout);
  process.exitCode = 1;
} catch (cause) {
  if (cause.code === 1) console.log("Secret scan passed: no credential-shaped strings detected.");
  else throw cause;
}

