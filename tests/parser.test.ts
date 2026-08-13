import { describe, expect, it } from "vitest";
import { extractTranscript, parseSttBench, parseTimeOutput, parseWhisperCli } from "../server/lib/parse.js";

const fixture = `
Parameters:
  sample_rate_hz     : 16000
  num_samples        : 176000
  audio_duration_ms  : 11000.000
  num_threads        : 6
  num_iterations     : 5
  num_warmup         : 1
| whisper.cpp        | 6       | Load     | 32.262 (ms)                  |
| whisper.cpp        | 6       | Total    |   315.330 ±   6.869 (ms)    |
| whisper.cpp        | 6       | Encode   |   295.459 ±   0.186 (ms)    |
| whisper.cpp        | 6       | Decode   |     0.966 ±   0.032 (ms)    |
| whisper.cpp        | 6       | RTF      |     0.029 ±   0.001 (x)     |
`;

describe("STT output parsers", () => {
  it("parses the official benchmark table", () => {
    expect(parseSttBench(fixture)).toMatchObject({
      params: { threads: 6, iterations: 5, warmup: 1, audioDurationMs: 11000 },
      metrics: { loadMs: 32.262, totalMs: 315.33, encodeMs: 295.459, decodeMs: 0.966, rtf: 0.029 },
    });
  });

  it("parses macOS time memory", () => {
    expect(parseTimeOutput("\nreal 0.49\n  198836224 maximum resident set size\n  193577632 peak memory footprint\n")).toEqual({
      wallSeconds: 0.49,
      peakRssBytes: 198836224,
      peakFootprintBytes: 193577632,
    });
  });

  it("extracts the final transcript line", () => {
    expect(extractTranscript("read_audio_data: ok\n\n And so my fellow Americans ask not.\nreal 0.4\n")).toBe("And so my fellow Americans ask not.");
  });

  it("parses real-audio CLI timing and transcript output", () => {
    const value = parseWhisperCli(`main: processing 'jfk.wav' (176000 samples, 11.0 sec)\n\n And so my fellow Americans ask not.\nwhisper_print_timings:     load time = 213.68 ms\nwhisper_print_timings:   encode time = 2818.43 ms\nwhisper_print_timings:   decode time = 0.00 ms\nwhisper_print_timings:    total time = 3571.80 ms\nreal 3.60\n  600000000 maximum resident set size\n`);
    expect(value).toMatchObject({ transcript: "And so my fellow Americans ask not.", metrics: { loadMs: 213.68, encodeMs: 2818.43, totalMs: 3571.8, wallMs: 3600, peakRssBytes: 600000000 } });
  });
});

