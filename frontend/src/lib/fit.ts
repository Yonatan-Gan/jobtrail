// My daily job-search file writes "Fit: Strong", "Fit: Good" or "Fit: Stretch" in the notes.
// This reads that word back out, so the list can show it as a badge and filter by it.

export const FIT_LEVELS = ["strong", "good", "stretch"] as const;
export type Fit = (typeof FIT_LEVELS)[number];

const FIT_PATTERN = /\bfit:\s*(strong|good|stretch)\b/i;

export function parseFit(notes: string | null | undefined): Fit | null {
  const word = notes?.match(FIT_PATTERN)?.[1].toLowerCase();
  return FIT_LEVELS.find((level) => level === word) ?? null;
}
