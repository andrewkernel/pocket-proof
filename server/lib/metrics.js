export function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function standardDeviation(values) {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
}

export function aggregate(values) {
  if (!values.length) return null;
  return {
    count: values.length,
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
    mean: mean(values),
    stddev: standardDeviation(values),
  };
}

export function deriveComparison(reference, optimized) {
  const ref = reference?.aggregates;
  const opt = optimized?.aggregates;
  const refLatency = ref?.totalMs?.median;
  const optLatency = opt?.totalMs?.median;
  const refMemory = ref?.peakRssBytes?.median;
  const optMemory = opt?.peakRssBytes?.median;
  return {
    speedup: refLatency > 0 && optLatency > 0 ? refLatency / optLatency : null,
    latencyChangePct: refLatency > 0 && optLatency > 0 ? ((optLatency - refLatency) / refLatency) * 100 : null,
    memoryReductionPct: refMemory > 0 && optMemory > 0 ? ((refMemory - optMemory) / refMemory) * 100 : null,
    modelReductionPct:
      reference?.model?.bytes > 0 && optimized?.model?.bytes > 0
        ? ((reference.model.bytes - optimized.model.bytes) / reference.model.bytes) * 100
        : 0,
    transcriptExactMatch:
      typeof reference?.transcript === "string" && typeof optimized?.transcript === "string"
        ? reference.transcript.trim() === optimized.transcript.trim()
        : null,
  };
}

