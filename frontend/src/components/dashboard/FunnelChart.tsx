import type { Stats } from "../../api/types";
import { enumLabel } from "../../lib/format";

type FunnelStage = Stats["funnel"][number];

const percent = new Intl.NumberFormat("en-GB", {
  style: "percent",
  maximumFractionDigits: 0,
});

// A horizontal bar per stage, in the order the API returns them (applied → offer).
// One series, so one colour: the bar length is the data. Each value is written at the
// bar's tip, hovering or focusing a row shows its share of "applied", and the same
// numbers are in a table below for screen readers and copying.
export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const applied = stages[0]?.count ?? 0;
  const largest = Math.max(1, ...stages.map((stage) => stage.count));
  const share = (count: number) =>
    applied > 0 ? percent.format(count / applied) : "—";

  return (
    <figure>
      {/* The gaps between rows are where the tooltip appears, so it never covers a bar. */}
      <ol className="space-y-7 pt-7">
        {stages.map((stage) => (
          // tabIndex: keyboard users get the same tooltip as mouse users.
          <li
            key={stage.stage}
            tabIndex={0}
            className="group relative grid grid-cols-[6.5rem_1fr] items-center gap-3 rounded"
          >
            <span className="text-sm text-slate-700">
              {enumLabel(stage.stage)}
              <span className="sr-only">:</span>
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="block h-4 rounded-r bg-series-1 group-hover:brightness-110 group-focus-visible:brightness-110"
                // Leave 3rem for the number at the tip, so the longest bar never pushes it out.
                style={{
                  width: `calc((100% - 3rem) * ${stage.count / largest})`,
                }}
              />
              <span className="text-sm font-semibold tabular-nums">
                {stage.count}
                <span className="sr-only">
                  {` ${stage.count === 1 ? "application" : "applications"}, ${share(stage.count)} of applied`}
                </span>
              </span>
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-full left-28 z-10 mb-1 rounded bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 shadow group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              <strong>{stage.count}</strong> of {applied} applied (
              {share(stage.count)}) reached {enumLabel(stage.stage)}
            </span>
          </li>
        ))}
      </ol>
      <details className="mt-5">
        <summary className="cursor-pointer text-sm text-blue-700">
          Show the numbers as a table
        </summary>
        <table className="mt-3 text-left text-sm">
          <caption className="sr-only">Applications per stage</caption>
          <thead className="text-xs text-slate-600 uppercase">
            <tr>
              <th scope="col" className="py-1 pe-6">
                Stage
              </th>
              <th scope="col" className="py-1 pe-6 text-right">
                Applications
              </th>
              <th scope="col" className="py-1 text-right">
                Share of applied
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {stages.map((stage) => (
              <tr key={stage.stage} className="border-t border-slate-100">
                <th scope="row" className="py-1 pe-6 font-normal">
                  {enumLabel(stage.stage)}
                </th>
                <td className="py-1 pe-6 text-right">{stage.count}</td>
                <td className="py-1 text-right">{share(stage.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
