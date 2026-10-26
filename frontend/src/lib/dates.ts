/**
 * A day from <input type="date"> ("2026-10-17") as noon local time, in ISO format.
 * Noon is the same convention `make applied DATE=...` uses, and it keeps the same
 * calendar day in every time zone near Israel.
 */
export function dateInputToIso(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12).toISOString();
}

/** A date as "2026-10-17" in local time, the format <input type="date"> uses. */
function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * When a status change happened, from the day picked in the status dialog.
 *
 * The API refuses a change dated before the application's latest change (so the history
 * stays in order), and a day has no time of day. So:
 * - today means now (noon today could still be in the future);
 * - another day means noon that day;
 * - but on the same day as the latest change, never earlier than it: one minute after.
 * A day before the latest change is sent as it is, and the API explains why it's refused.
 */
export function changedAtForDay(
  day: string,
  latestChange: string | null,
  now: Date = new Date(),
): string {
  let when = day === localDay(now) ? now : new Date(dateInputToIso(day));
  if (latestChange) {
    const latest = new Date(latestChange);
    if (day === localDay(latest) && when < latest) {
      when = new Date(latest.getTime() + 60_000);
    }
  }
  return when.toISOString();
}
