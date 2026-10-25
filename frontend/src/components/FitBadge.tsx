import type { Fit } from "../lib/fit";
import { enumLabel } from "../lib/format";

const STYLES: Record<Fit, string> = {
  strong: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  good: "bg-sky-50 text-sky-800 ring-sky-200",
  stretch: "bg-amber-50 text-amber-900 ring-amber-200",
};

export function FitBadge({ fit }: { fit: Fit }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${STYLES[fit]}`}
    >
      Fit: {enumLabel(fit)}
    </span>
  );
}
