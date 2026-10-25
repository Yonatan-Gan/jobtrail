import {
  positionTypeValues,
  statusValues,
  type Company,
} from "../../api/types";
import { FIT_LEVELS } from "../../lib/fit";
import { enumLabel } from "../../lib/format";
import { SORT_OPTIONS, type ListFilters } from "../../lib/listFilters";
import { Button } from "../Button";
import { SelectField, TextField, type Option } from "../FormFields";

interface ApplicationFiltersBarProps {
  filters: ListFilters;
  companies: Company[];
  /** Called with the URL parameter name and the raw value from the control. */
  onChange: (name: keyof ListFilters, value: string) => void;
  onClear: () => void;
  canClear: boolean;
}

const STATUS_OPTIONS: Option[] = [
  { value: "active", label: "Active (not final)" },
  { value: "all", label: "All statuses" },
  ...statusValues.map((status) => ({
    value: status,
    label: enumLabel(status),
  })),
];

const TYPE_OPTIONS: Option[] = [
  { value: "", label: "All types" },
  ...positionTypeValues.map((type) => ({
    value: type,
    label: enumLabel(type),
  })),
];

const FIT_OPTIONS: Option[] = [
  { value: "", label: "Any fit" },
  ...FIT_LEVELS.map((fit) => ({ value: fit, label: enumLabel(fit) })),
  { value: "none", label: "No fit noted" },
];

export function ApplicationFiltersBar({
  filters,
  companies,
  onChange,
  onClear,
  canClear,
}: ApplicationFiltersBarProps) {
  const companyOptions: Option[] = [
    { value: "", label: "All companies" },
    ...[...companies]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((company) => ({ value: String(company.id), label: company.name })),
  ];

  return (
    // role="search" makes this a landmark screen-reader users can jump to.
    <form
      role="search"
      aria-label="Filter applications"
      onSubmit={(event) => event.preventDefault()}
      className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-4"
    >
      <TextField
        label="Search company or title"
        type="search"
        value={filters.q}
        onChange={(event) => onChange("q", event.target.value)}
        className="col-span-2"
      />
      <SelectField
        label="Status"
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(event) => onChange("status", event.target.value)}
      />
      <SelectField
        label="Position type"
        options={TYPE_OPTIONS}
        value={filters.type}
        onChange={(event) => onChange("type", event.target.value)}
      />
      <SelectField
        label="Fit"
        options={FIT_OPTIONS}
        value={filters.fit}
        onChange={(event) => onChange("fit", event.target.value)}
      />
      <SelectField
        label="Company"
        options={companyOptions}
        value={filters.company === null ? "" : String(filters.company)}
        onChange={(event) => onChange("company", event.target.value)}
      />
      <SelectField
        label="Sort"
        options={[...SORT_OPTIONS]}
        value={filters.sort}
        onChange={(event) => onChange("sort", event.target.value)}
      />
      <div className="flex items-end">
        {canClear && (
          <Button onClick={onClear} className="w-full">
            Clear filters
          </Button>
        )}
      </div>
    </form>
  );
}
