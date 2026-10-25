import { Link } from "react-router";
import {
  useApplications,
  useCompanies,
  useStatusTransitions,
} from "../../api/queries";
import {
  apiFiltersFor,
  visibleApplications,
  type ListFilters,
} from "../../lib/listFilters";
import { finalStatuses } from "../../lib/status";
import { Button } from "../Button";
import { EmptyState, ErrorState, LoadingState } from "../QueryStates";
import { ApplicationsTable } from "./ApplicationsTable";

interface ApplicationResultsProps {
  filters: ListFilters;
  isFiltered: boolean;
  onClearFilters: () => void;
}

export function ApplicationResults({
  filters,
  isFiltered,
  onClearFilters,
}: ApplicationResultsProps) {
  // Status, type and company go to the API; the rest is filtered in the browser.
  const applications = useApplications(apiFiltersFor(filters));
  const companies = useCompanies();
  const transitions = useStatusTransitions();

  if (applications.isPending || companies.isPending || transitions.isPending) {
    return <LoadingState label="Loading applications…" />;
  }
  if (applications.isError || companies.isError || transitions.isError) {
    return (
      <ErrorState
        title="Could not load applications"
        error={applications.error ?? companies.error ?? transitions.error}
        onRetry={() => {
          void applications.refetch();
          void companies.refetch();
          void transitions.refetch();
        }}
      />
    );
  }

  const all = applications.data;
  if (all.length === 0 && !isFiltered) {
    return (
      <EmptyState title="No applications yet">
        <p>
          <Link to="/import" className="text-blue-700 underline">
            Import your daily file
          </Link>{" "}
          or{" "}
          <Link to="/applications/new" className="text-blue-700 underline">
            add an application by hand
          </Link>
          .
        </p>
      </EmptyState>
    );
  }

  const finals = finalStatuses(transitions.data);
  const companyNames = new Map(
    companies.data.map((company) => [company.id, company.name]),
  );
  const visible = visibleApplications(all, filters, { finals, companyNames });
  const hiddenFinal =
    filters.status === "active"
      ? all.filter((application) => finals.has(application.status)).length
      : 0;

  return (
    <>
      <p className="mb-3 text-sm text-slate-600" aria-live="polite">
        {visible.length} {visible.length === 1 ? "application" : "applications"}
        {hiddenFinal > 0 &&
          ` · ${hiddenFinal} with a final status hidden (choose "All statuses" to see them)`}
      </p>
      {visible.length === 0 ? (
        <EmptyState title="No applications match these filters">
          <Button className="mt-2" onClick={onClearFilters}>
            Clear filters
          </Button>
        </EmptyState>
      ) : (
        <ApplicationsTable applications={visible} companyNames={companyNames} />
      )}
    </>
  );
}
