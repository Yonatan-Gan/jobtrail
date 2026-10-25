import { Link } from "react-router";
import { useStats } from "../api/queries";
import type { Stats } from "../api/types";
import { FunnelChart } from "../components/dashboard/FunnelChart";
import { StatTile } from "../components/dashboard/StatTile";
import { PageHeader } from "../components/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/QueryStates";

const percent = new Intl.NumberFormat("en-GB", {
  style: "percent",
  maximumFractionDigits: 0,
});

/** 3.25 → "3.3". A reply on the same day would round to a confusing "0.0", so say "< 1". */
function formatDays(days: number | null): string {
  if (days === null) {
    return "—";
  }
  return days < 1 ? "< 1" : days.toFixed(1);
}

// Everything here comes from GET /stats, which computes it from the status history.
export function DashboardPage() {
  const stats = useStats();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="How your applications are doing, worked out from every status change."
      />
      {stats.isPending && <LoadingState label="Loading stats…" />}
      {stats.isError && (
        <ErrorState
          title="Could not load the stats"
          error={stats.error}
          onRetry={() => void stats.refetch()}
        />
      )}
      {stats.isSuccess && <StatsView stats={stats.data} />}
    </>
  );
}

function StatsView({ stats }: { stats: Stats }) {
  const average = stats.avg_days_to_first_response;
  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Applied"
          value={stats.applied.toLocaleString("en-GB")}
          hint="Applications you have applied to"
        />
        <StatTile
          label="Responded"
          value={stats.responded.toLocaleString("en-GB")}
          hint="Got any reply after applying, including a rejection"
        />
        <StatTile
          label="Response rate"
          value={stats.applied > 0 ? percent.format(stats.response_rate) : "—"}
          hint="Responded ÷ applied"
        />
        <StatTile
          label="Days to first reply"
          value={formatDays(average)}
          hint={
            average === null
              ? "No replies yet"
              : "Average, from applying to the first reply"
          }
        />
      </dl>

      <section
        aria-labelledby="funnel-heading"
        className="rounded-lg border border-slate-200 bg-white p-4"
      >
        <h2 id="funnel-heading" className="text-lg font-semibold">
          How far applications got
        </h2>
        <p className="mb-5 text-sm text-slate-600">
          Each bar counts the applications that reached that stage or a later
          one.
        </p>
        {stats.applied === 0 ? (
          <EmptyState title="Nothing to show yet">
            The funnel starts when you mark an application as applied.{" "}
            <Link to="/applications" className="text-blue-700 underline">
              Go to the applications
            </Link>
          </EmptyState>
        ) : (
          <FunnelChart stages={stats.funnel} />
        )}
      </section>
    </div>
  );
}
