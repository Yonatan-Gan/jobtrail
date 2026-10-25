import { Link, useSearchParams } from "react-router";
import { useCompanies } from "../api/queries";
import { ApplicationFiltersBar } from "../components/applications/ApplicationFiltersBar";
import { ApplicationResults } from "../components/applications/ApplicationResults";
import { buttonClasses } from "../components/buttonStyles";
import { Notice } from "../components/Notice";
import { PageHeader } from "../components/PageHeader";
import {
  filtersFromParams,
  paramsFromFilters,
  type ListFilters,
} from "../lib/listFilters";
import { useFlashNotice } from "../lib/useFlashNotice";

// The home page. This component owns the filters (they live in the URL); the results
// component below does the data loading.
export function ApplicationsPage() {
  const [params, setParams] = useSearchParams();
  const filters = filtersFromParams(params);
  const companies = useCompanies();
  const [flash, dismissFlash] = useFlashNotice();

  function setFilter(name: keyof ListFilters, value: string) {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    // Read it back through filtersFromParams, so unknown or default values drop out.
    // `replace` keeps typing in the search box from filling the browser history.
    setParams(paramsFromFilters(filtersFromParams(next)), { replace: true });
  }

  function clearFilters() {
    setParams(new URLSearchParams(), { replace: true });
  }

  const isFiltered = paramsFromFilters(filters).toString() !== "";

  return (
    <>
      <PageHeader
        title="Applications"
        description="Every job you are tracking. Filters are kept in the address bar."
        actions={
          <>
            <Link to="/import" className={buttonClasses()}>
              Import file
            </Link>
            <Link to="/applications/new" className={buttonClasses("primary")}>
              Add application
            </Link>
          </>
        }
      />
      {flash && (
        <Notice tone="success" className="mb-4" onDismiss={dismissFlash}>
          {flash}
        </Notice>
      )}
      <ApplicationFiltersBar
        filters={filters}
        companies={companies.data ?? []}
        onChange={setFilter}
        onClear={clearFilters}
        canClear={isFiltered}
      />
      <section aria-labelledby="results-heading" className="mt-6">
        <h2 id="results-heading" className="sr-only">
          Results
        </h2>
        <ApplicationResults
          filters={filters}
          isFiltered={isFiltered}
          onClearFilters={clearFilters}
        />
      </section>
    </>
  );
}
