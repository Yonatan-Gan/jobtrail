// Display helpers: dates in the browser's time zone, enum values as words.

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "19 Oct 2026", or "—" when there is no date. */
export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFormat.format(new Date(iso)) : "—";
}

/** "19 Oct 2026, 14:30" */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

// Values that "replace underscores and capitalize" would get wrong.
const LABELS: Record<string, string> = {
  devops: "DevOps",
  fullstack: "Full stack",
  qa: "QA",
  linkedin: "LinkedIn",
  onsite: "On-site",
};

/** An enum value as words: "company_site" → "Company site". */
export function enumLabel(value: string): string {
  const words = value.replaceAll("_", " ");
  return LABELS[value] ?? words.charAt(0).toUpperCase() + words.slice(1);
}

/** "15,000–18,000 NIS / month", or "—" when no salary is known. */
export function formatSalary(min: number | null, max: number | null): string {
  const amount = (value: number) => value.toLocaleString("en-US");
  if (min !== null && max !== null) {
    return `${amount(min)}–${amount(max)} NIS / month`;
  }
  if (min !== null) {
    return `From ${amount(min)} NIS / month`;
  }
  if (max !== null) {
    return `Up to ${amount(max)} NIS / month`;
  }
  return "—";
}
