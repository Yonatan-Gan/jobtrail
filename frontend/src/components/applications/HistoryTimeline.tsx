import type { StatusChange } from "../../api/types";
import { enumLabel, formatDateTime } from "../../lib/format";
import { StatusBadge } from "../StatusBadge";

// The status history, oldest first, the order GET /applications/{id}/history returns.
// An ordered list (<ol>) because the order is the point.
export function HistoryTimeline({ history }: { history: StatusChange[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-slate-600">No status changes yet.</p>;
  }
  return (
    <ol className="space-y-4 border-s-2 border-slate-200 ps-4">
      {history.map((change) => (
        <li key={change.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute top-1.5 -left-[1.4rem] h-2.5 w-2.5 rounded-full bg-slate-400 ring-4 ring-white"
          />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={change.to_status} />
            <span className="text-sm text-slate-600">
              {change.from_status
                ? `from ${enumLabel(change.from_status)}`
                : "added to JobTrail"}
            </span>
          </div>
          <time
            dateTime={change.changed_at}
            className="mt-0.5 block text-sm text-slate-500"
          >
            {formatDateTime(change.changed_at)}
          </time>
          {change.note && (
            <p className="mt-1 text-sm whitespace-pre-wrap">{change.note}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
