// The applications list's filters live in the URL (?status=all&fit=strong&q=wix), so a
// refresh, a bookmark or the back button keeps them. These pure functions read and write
// that query string, and split the work between the API and the browser.

import {
  positionTypeValues,
  statusValues,
  type Application,
  type ApplicationFilters,
  type PositionType,
  type Status,
} from "../api/types";
import { FIT_LEVELS, parseFit, type Fit } from "./fit";
import { isOneOf } from "./status";

/** "active" = every status that isn't final; "all" = everything; or one status. */
export type StatusFilter = "active" | "all" | Status;

/** A fit level, "none" for jobs without a fit note, or "" for any. */
export type FitFilter = Fit | "none" | "";

export const SORT_OPTIONS = [
  { value: "added-desc", label: "Newest added" },
  { value: "added-asc", label: "Oldest added" },
  { value: "applied-desc", label: "Recently applied" },
  { value: "applied-asc", label: "Applied longest ago" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

const SORT_KEYS: readonly SortKey[] = SORT_OPTIONS.map(
  (option) => option.value,
);

const SORTS: Record<
  SortKey,
  { field: "created_at" | "applied_at"; direction: 1 | -1 }
> = {
  "added-desc": { field: "created_at", direction: -1 },
  "added-asc": { field: "created_at", direction: 1 },
  "applied-desc": { field: "applied_at", direction: -1 },
  "applied-asc": { field: "applied_at", direction: 1 },
};

export interface ListFilters {
  status: StatusFilter;
  type: PositionType | "";
  company: number | null;
  fit: FitFilter;
  q: string;
  sort: SortKey;
}

export const DEFAULT_FILTERS: ListFilters = {
  status: "active",
  type: "",
  company: null,
  fit: "",
  q: "",
  sort: "added-desc",
};

/** Read the filters from the query string. Unknown values fall back to the defaults. */
export function filtersFromParams(params: URLSearchParams): ListFilters {
  const status = params.get("status") ?? "";
  const type = params.get("type") ?? "";
  const fit = params.get("fit") ?? "";
  const sort = params.get("sort") ?? "";
  const company = Number(params.get("company"));
  return {
    status:
      status === "all" || isOneOf(statusValues, status) ? status : "active",
    type: isOneOf(positionTypeValues, type) ? type : "",
    company: Number.isInteger(company) && company > 0 ? company : null,
    fit: fit === "none" || isOneOf(FIT_LEVELS, fit) ? fit : "",
    q: params.get("q") ?? "",
    sort: isOneOf(SORT_KEYS, sort) ? sort : DEFAULT_FILTERS.sort,
  };
}

/** Write the filters back. Defaults are left out, so the plain list has a clean URL. */
export function paramsFromFilters(filters: ListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status !== DEFAULT_FILTERS.status) {
    params.set("status", filters.status);
  }
  if (filters.type) {
    params.set("type", filters.type);
  }
  if (filters.company !== null) {
    params.set("company", String(filters.company));
  }
  if (filters.fit) {
    params.set("fit", filters.fit);
  }
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.sort !== DEFAULT_FILTERS.sort) {
    params.set("sort", filters.sort);
  }
  return params;
}

/** The filters GET /applications understands. The rest is done in the browser. */
export function apiFiltersFor(filters: ListFilters): ApplicationFilters {
  const apiFilters: ApplicationFilters = {};
  if (filters.status !== "active" && filters.status !== "all") {
    apiFilters.status = filters.status;
  }
  if (filters.type) {
    apiFilters.position_type = filters.type;
  }
  if (filters.company !== null) {
    apiFilters.company_id = filters.company;
  }
  return apiFilters;
}

interface ClientContext {
  /** Statuses with no way out, from GET /meta/status-transitions. */
  finals: Set<Status>;
  companyNames: Map<number, string>;
}

/** The browser's share of the filtering ("not final", fit, search), then the sort. */
export function visibleApplications(
  applications: Application[],
  filters: ListFilters,
  { finals, companyNames }: ClientContext,
): Application[] {
  const query = filters.q.trim().toLowerCase();
  const visible = applications.filter((application) => {
    if (filters.status === "active" && finals.has(application.status)) {
      return false;
    }
    if (filters.fit) {
      const fit = parseFit(application.notes);
      const wanted = filters.fit === "none" ? null : filters.fit;
      if (fit !== wanted) {
        return false;
      }
    }
    if (query) {
      const company = companyNames.get(application.company_id) ?? "";
      const matches =
        application.title.toLowerCase().includes(query) ||
        company.toLowerCase().includes(query);
      if (!matches) {
        return false;
      }
    }
    return true;
  });
  return sortApplications(visible, filters.sort);
}

/** Sort by a date. Applications without that date (not applied yet) always come last. */
export function sortApplications(
  applications: Application[],
  sort: SortKey,
): Application[] {
  const { field, direction } = SORTS[sort];
  const time = (application: Application) => {
    const value = application[field];
    return value ? Date.parse(value) : null;
  };
  return [...applications].sort((a, b) => {
    const first = time(a);
    const second = time(b);
    if (first === second) {
      return b.id - a.id;
    }
    if (first === null) {
      return 1;
    }
    if (second === null) {
      return -1;
    }
    return (first - second) * direction;
  });
}
