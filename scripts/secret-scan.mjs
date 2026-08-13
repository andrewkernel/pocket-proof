#!/usr/bin/env node
import { execFile } from "node:child_process";
import { lstat, readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const maxTextBytes = 8 * 1024 * 1024;
const patterns = [
  { label: "AWS access key", expression: /AKIA[0-9A-Z]{16}/g },
  { label: "GitHub token", expression: /gh[pousr]_[A-Za-z0-9_]{20,}/g },
  { label: "GitHub fine-grained token", expression: /github_pat_[A-Za-z0-9_]{20,}/g },
  { label: "OpenAI-style secret", expression: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { label: "private key", expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { label: "assigned secret", expression: /(?:password|passwd|api[_-]?key|secret)\s*[:=]\s*['"][^'"]{8,}/gi },
];

const { stdout } = await execFileAsync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "buffer", maxBuffer: 10 * 1024 * 1024 },
);

const findings = [];
const skipped = [];
const paths = [];
for (let start = 0, index = 0; index < stdout.length; index += 1) {
  if (stdout[index] !== 0) continue;
  if (index > start) paths.push(stdout.subarray(start, index).toString("utf8"));
  start = index + 1;
}
const files = [...new Set(paths)];

for (const file of files) {
  let metadata;
  try {
    metadata = await lstat(file);
  } catch (cause) {
    if (cause.code === "ENOENT") {
      skipped.push(`${file} (missing)`);
      continue;
    }
    throw cause;
  }

  if (!metadata.isFile()) {
    skipped.push(`${file} (not a regular file)`);
    continue;
  }
  if (metadata.size > maxTextBytes) {
    findings.push(`${file}:0: regular file exceeds ${maxTextBytes} byte scan limit`);
    continue;
  }

  const bytes = await readFile(file);
  if (bytes.includes(0)) {
    skipped.push(`${file} (binary)`);
    continue;
  }

  const contents = bytes.toString("utf8");
  for (const { label, expression } of patterns) {
    expression.lastIndex = 0;
    for (const match of contents.matchAll(expression)) {
      const line = contents.slice(0, match.index).split("\n").length;
      findings.push(`${file}:${line}: ${label}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Potential secrets found:\n" + findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Secret scan passed: ${files.length} repository file(s) checked; no credential-shaped strings detected.`);
}

if (skipped.length > 0) {
  console.log(`Skipped ${skipped.length} non-text or unavailable file(s): ${skipped.join(", ")}`);
}
