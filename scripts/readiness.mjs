#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve();
const results = [];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readText = (file) => readFile(path.join(root, file), "utf8");
const readJson = async (file) => JSON.parse(await readText(file));
const run = (command, args) => execFileSync(command, args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

async function check(category, name, points, proof, action) {
  try {
    await action();
    results.push({ category, name, points, earned: points, status: "pass", proof });
    console.log(`PASS ${String(points).padStart(2)}  ${name}`);
  } catch (cause) {
    results.push({ category, name, points, earned: 0, status: "fail", proof, error: cause instanceof Error ? cause.message.split("\n").slice(-4).join(" ") : String(cause) });
    console.error(`FAIL ${String(points).padStart(2)}  ${name}`);
  }
}

await check("Technological Implementation", "Automated test suite", 8, "npm test", async () => { run("npm", ["test"]); });
await check("Technological Implementation", "Strict featured-report integrity", 8, "npm run verify:report", async () => { run("npm", ["run", "verify:report"]); });
await check("Technological Implementation", "SQLite media database and file checksums", 8, "npm run media:verify", async () => { run("npm", ["run", "media:verify"]); });
await check("Technological Implementation", "Three-clip raw-run-backed corpus", 8, "benchmarks/corpus-summary.json and immutable reports", async () => {
  const summary = await readJson("benchmarks/corpus-summary.json");
  if (summary.perClip?.length < 3 || summary.configuration?.runsPerProfilePerClip < 5 || summary.configuration?.measuredProcessCount < 30) throw new Error("Corpus breadth or repetition gate failed.");
  for (const clip of summary.perClip) {
    const bytes = await readFile(path.join(root, clip.reportPath));
    if (sha256(bytes) !== clip.reportSha256) throw new Error(`Corpus report checksum failed for ${clip.clipId}.`);
  }
});
await check("Technological Implementation", "Native Arm64 provenance and honest ablation", 8, "featured report plus KleidiAI ablation", async () => {
  const report = await readJson("public/featured-report.json");
  if (report.system?.architecture !== "arm64" || report.system?.translated !== false) throw new Error("Native Arm64 system proof missing.");
  if (!report.profiles.every((profile) => profile.runtime?.file?.includes("arm64") && profile.runtime?.lipo?.includes("arm64"))) throw new Error("Native binary proof missing.");
  const ablation = await readText("benchmarks/results/ablation/kleidiai-same-q4-m5.json");
  if (!ablation.includes("No observed speedup in this sample")) throw new Error("Negative KleidiAI finding is not preserved.");
});

await check("User / Developer Experience", "Type-safe production and hosted builds", 5, "npm run typecheck and npm run build:pages", async () => { run("npm", ["run", "typecheck"]); run("npm", ["run", "build:pages"]); });
await check("User / Developer Experience", "Preset selection, streaming progress, and history UI", 5, "App, API, and SSE implementation", async () => {
  const app = await readText("src/App.tsx");
  const server = await readText("server/index.js");
  const benchmark = await readText("scripts/benchmark.mjs");
  if (!["MediaLibrary", "CorpusEvidence", "RunHistory"].every((value) => app.includes(value))) throw new Error("A required evidence UI is missing.");
  if (!server.includes("text/event-stream") || !benchmark.includes("lane.metric")) throw new Error("Live progress stream is missing.");
});
await check("User / Developer Experience", "One-command setup and reproducibility docs", 5, "README, Makefile, and docs/reproducibility.md", async () => {
  for (const file of ["README.md", "Makefile", "docs/reproducibility.md", "docs/methodology.md"]) if (!(await stat(path.join(root, file))).isFile()) throw new Error(`${file} is missing.`);
});

await check("Potential Impact", "Open-source and third-party licensing", 5, "MIT, dependency licenses, and media provenance", async () => {
  const license = await readText("LICENSE");
  const notices = await readText("THIRD_PARTY_NOTICES.md");
  if (!license.includes("MIT License") || !notices.includes("Arm STT-Runner")) throw new Error("License evidence is incomplete.");
  const catalog = await readJson("benchmark/media-catalog.json");
  if (!catalog.clips.every((clip) => clip.source?.license && clip.source?.pageUrl)) throw new Error("Media license evidence is incomplete.");
});
await check("Potential Impact", "Reusable preset corpus artifacts", 5, "SQLite, public catalog, preview media, and raw reports", async () => {
  const catalog = await readJson("benchmark/media-catalog.json");
  if (catalog.clips.length < 3) throw new Error("At least three preset clips are required.");
  for (const file of ["benchmark/preset-media.sqlite", "public/media-catalog.json", "public/corpus-summary.json"]) if ((await stat(path.join(root, file))).size < 100) throw new Error(`${file} is empty.`);
});
await check("Potential Impact", "Immutable history and explicit promotion", 5, "exclusive report writes and --promote gate", async () => {
  const benchmark = await readText("scripts/benchmark.mjs");
  const store = await readText("server/lib/store.js");
  if (!benchmark.includes("flag: \"wx\"") && !store.includes("flag: \"wx\"")) throw new Error("Exclusive immutable report writes are missing.");
  if (!benchmark.includes("--promote") || !benchmark.includes("if (promote)")) throw new Error("Explicit featured-report promotion is missing.");
});
await check("Potential Impact", "Public repository and hosted Judge Mode automation", 5, "Git remote and GitHub Pages workflow", async () => {
  const packageManifest = await readJson("package.json");
  const workflow = await readText(".github/workflows/pages.yml");
  if (!packageManifest.repository?.url?.includes("andrewkernel/pocket-proof") || packageManifest.homepage !== "https://andrewkernel.github.io/pocket-proof/" || !workflow.includes("actions/deploy-pages@v4")) throw new Error("Public delivery configuration is incomplete.");
});

await check("WOW factor", "Under-three-minute captioned demo", 10, "assets/demo/demo-manifest.json", async () => {
  const manifest = await readJson("assets/demo/demo-manifest.json");
  const bytes = await readFile(path.join(root, manifest.videoPath));
  const captions = await readFile(path.join(root, manifest.captionsPath));
  if (manifest.durationMs >= 180000 || manifest.width < 1280 || manifest.height < 720) throw new Error("Demo duration or resolution gate failed.");
  if (bytes.length !== manifest.bytes || sha256(bytes) !== manifest.sha256 || sha256(captions) !== manifest.captionsSha256) throw new Error("Demo integrity gate failed.");
});
await check("WOW factor", "Submission-grade screenshots and social preview", 5, "assets/screenshots, assets/demo, and social preview", async () => {
  for (const file of ["assets/pocket-proof-social-preview.png", "assets/screenshots/judge-mode-hero.png", "assets/screenshots/judge-mode-mobile.png", "assets/demo/01-hero.png", "assets/demo/02-race.png", "assets/demo/05-corpus.png", "assets/demo/06-ablation.png"]) if ((await stat(path.join(root, file))).size < 10_000) throw new Error(`${file} is missing or empty.`);
});
await check("WOW factor", "Evidence-first corpus visualization", 5, "multi-clip UI and measured report", async () => {
  const app = await readText("src/App.tsx");
  const summary = await readJson("public/corpus-summary.json");
  if (!app.includes("bootstrap 95% interval") || summary.aggregate?.medianPairedSpeedup <= 1) throw new Error("Corpus evidence visualization is incomplete.");
});
await check("WOW factor", "Complete submission copy without placeholders", 5, "Devpost draft, checklist, demo script, and secret scan", async () => {
  run("npm", ["run", "secret-scan"]);
  const content = await Promise.all(["submission/devpost-draft.md", "submission/checklist.md", "docs/demo-script.md"].map(readText));
  if (/\b(TODO|TBD|PENDING|INSERT URL)\b/i.test(content.join("\n"))) throw new Error("Submission materials still contain placeholders.");
});

const score = results.reduce((sum, item) => sum + item.earned, 0);
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  score,
  maximumScore: 100,
  status: score === 100 ? "ready" : "not-ready",
  note: "This is a deterministic submission-readiness gate aligned to the published judging weights, not a guarantee of a judge's subjective score.",
  categories: Object.fromEntries([...new Set(results.map((item) => item.category))].map((category) => [category, {
    earned: results.filter((item) => item.category === category).reduce((sum, item) => sum + item.earned, 0),
    possible: results.filter((item) => item.category === category).reduce((sum, item) => sum + item.points, 0),
  }])),
  checks: results,
};
await writeFile(path.join(root, "submission/readiness-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nSubmission readiness: ${score}/100 (${report.status})`);
if (score !== 100) process.exit(1);
