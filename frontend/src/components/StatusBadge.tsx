import type { Status } from "../api/types";
import { enumLabel } from "../lib/format";

// Colour helps scanning a long list, but the badge always shows the status as text,
// so colour is never the only signal. Record<Status, …> must name every status: if the
// backend adds one, `npm run gen:api` makes this a type error until it gets a colour.
const STYLES: Record<Status, string> = {
  saved: "bg-slate-100 text-slate-700 ring-slate-300",
  applied: "bg-blue-50 text-blue-800 ring-blue-200",
  screening: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  assignment: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  technical: "bg-violet-50 text-violet-800 ring-violet-200",
  final: "bg-violet-50 text-violet-800 ring-violet-200",
  offer: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  accepted: "bg-emerald-700 text-white ring-emerald-700",
  declined: "bg-slate-100 text-slate-700 ring-slate-300",
  rejected: "bg-red-50 text-red-800 ring-red-200",
  withdrawn: "bg-slate-100 text-slate-700 ring-slate-300",
  ghosted: "bg-amber-50 text-amber-900 ring-amber-200",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${STYLES[status]}`}
    >
      {enumLabel(status)}
    </span>
  );
}
