import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const resultsDir = path.resolve("benchmarks/results");

export async function saveReport(report) {
  const directory = report.source === "live" ? path.join(resultsDir, "live") : resultsDir;
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `${report.id}.json`);
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  return file;
}

export async function listReports() {
  await mkdir(resultsDir, { recursive: true });
  const names = (await readdir(resultsDir)).filter((name) => name.endsWith(".json")).map((name) => path.join(resultsDir, name));
  const liveDir = path.join(resultsDir, "live");
  try {
    names.push(...(await readdir(liveDir)).filter((name) => name.endsWith(".json")).map((name) => path.join(liveDir, name)));
  } catch {
    // No live runs have been executed yet.
  }
  names.sort().reverse();
  const reports = [];
  for (const file of names) {
    try {
      reports.push(JSON.parse(await readFile(file, "utf8")));
    } catch {
      // Invalid reports are intentionally excluded from the featured experience.
    }
  }
  return reports;
}

function newestFirst(left, right) {
  const byCreatedAt = Date.parse(right.createdAt ?? "") - Date.parse(left.createdAt ?? "");
  if (Number.isFinite(byCreatedAt) && byCreatedAt !== 0) return byCreatedAt;
  return String(right.id ?? "").localeCompare(String(left.id ?? ""));
}

export function selectFeaturedReport(reports) {
  const complete = reports.filter((report) => report.status === "complete").sort(newestFirst);
  return complete.find((report) => report.source === "recorded") ?? complete[0] ?? null;
}

export function selectLatestLiveReport(reports) {
  return reports
    .filter((report) => report.status === "complete" && report.source === "live")
    .sort(newestFirst)[0] ?? null;
}

export async function featuredReport() {
  return selectFeaturedReport(await listReports());
}

export async function latestLiveReport() {
  return selectLatestLiveReport(await listReports());
}
