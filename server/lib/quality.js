export function normalizeTranscript(text) {
  return text
    .toLocaleLowerCase("en-US")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordErrorStats(reference, candidate) {
  const expected = normalizeTranscript(reference).split(" ").filter(Boolean);
  const actual = normalizeTranscript(candidate).split(" ").filter(Boolean);
  if (!expected.length) return { errors: actual.length, referenceWords: 0, wer: actual.length ? 1 : 0 };
  const previous = Array.from({ length: actual.length + 1 }, (_, index) => index);
  for (let row = 1; row <= expected.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= actual.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (expected[row - 1] === actual[column - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  const errors = previous[actual.length];
  return { errors, referenceWords: expected.length, wer: errors / expected.length };
}

export function wordErrorRate(reference, candidate) {
  return wordErrorStats(reference, candidate).wer;
}
