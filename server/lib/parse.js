function numberAfter(pattern, text) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
}

export function parseSttBench(text) {
  const row = (name) =>
    numberAfter(new RegExp(`\\|\\s*whisper\\.cpp\\s*\\|[^\\n]*\\|\\s*${name}\\s*\\|\\s*([0-9.]+)`, "i"), text);

  const params = {
    sampleRateHz: numberAfter(/sample_rate_hz\s*:\s*([0-9.]+)/i, text),
    samples: numberAfter(/num_samples\s*:\s*([0-9.]+)/i, text),
    audioDurationMs: numberAfter(/audio_duration_ms\s*:\s*([0-9.]+)/i, text),
    threads: numberAfter(/num_threads\s*:\s*([0-9.]+)/i, text),
    iterations: numberAfter(/num_iterations\s*:\s*([0-9.]+)/i, text),
    warmup: numberAfter(/num_warmup\s*:\s*([0-9.]+)/i, text),
  };

  const metrics = {
    loadMs: row("Load"),
    totalMs: row("Total"),
    encodeMs: row("Encode"),
    decodeMs: row("Decode"),
    rtf: row("RTF"),
    samplesPerSecond: row("Samp/s"),
  };

  if (!metrics.totalMs || !params.iterations) {
    throw new Error("Could not parse STT-Runner benchmark output");
  }
  return { params, metrics };
}

export function parseTimeOutput(text) {
  return {
    wallSeconds: numberAfter(/(?:^|\n)real\s+([0-9.]+)/, text),
    peakRssBytes: numberAfter(/\n\s*([0-9]+)\s+maximum resident set size/, text),
    peakFootprintBytes: numberAfter(/\n\s*([0-9]+)\s+peak memory footprint/, text),
  };
}

export function parseWhisperCli(text, transcriptOutput = text) {
  const timing = (name) => numberAfter(new RegExp(`whisper_print_timings:\\s+${name} time\\s*=\\s*([0-9.]+)`, "i"), text);
  const transcriptBlock =
    transcriptOutput.match(/main: processing[^\n]*\n([\s\S]*?)whisper_print_timings:/i)?.[1] ?? transcriptOutput;
  const transcript = transcriptBlock
    .split("\n")
    .map((line) => line.replace(/^\s*\[[^\]]+\]\s*/, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const external = parseTimeOutput(text);
  const metrics = {
    loadMs: timing("load"),
    melMs: timing("mel"),
    encodeMs: timing("encode"),
    decodeMs: timing("decode"),
    totalMs: timing("total"),
    wallMs: external.wallSeconds == null ? null : external.wallSeconds * 1000,
    peakRssBytes: external.peakRssBytes,
    peakFootprintBytes: external.peakFootprintBytes,
  };
  if (!metrics.totalMs || !transcript) throw new Error("Could not parse whisper.cpp CLI output");
  return { transcript, metrics };
}

export function extractTranscript(text) {
  const filtered = text
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("read_audio_data:") &&
        !line.startsWith("whisper_") &&
        !line.startsWith("system_info:") &&
        !line.startsWith("main:") &&
        !line.startsWith("ggml_") &&
        !line.startsWith("repack:") &&
        !line.startsWith("real ") &&
        !line.startsWith("user ") &&
        !line.startsWith("sys ") &&
        !/maximum resident set size|peak memory footprint|page reclaims|instructions retired|cycles elapsed/.test(line),
    );
  return filtered.at(-1) ?? "";
}
