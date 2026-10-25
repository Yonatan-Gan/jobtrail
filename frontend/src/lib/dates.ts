/**
 * A day from <input type="date"> ("2026-10-17") as noon local time, in ISO format.
 * Noon is the same convention `make applied DATE=...` uses, and it keeps the same
 * calendar day in every time zone near Israel.
 */
export function dateInputToIso(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12).toISOString();
}
