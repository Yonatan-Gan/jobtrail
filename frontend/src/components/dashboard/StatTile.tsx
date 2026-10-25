import type { ReactNode } from "react";

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint: ReactNode;
}

// One headline number. A row of these says more than a chart would for four numbers.
// Rendered as a <dt>/<dd> pair, so it must sit inside a <dl>.
export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight">{value}</dd>
      <dd className="mt-1 text-xs text-slate-500">{hint}</dd>
    </div>
  );
}
