// Readable names for the generated types. schema.ts is generated from the backend's
// OpenAPI schema (npm run gen:api), so these always match the Pydantic models.
import type { components, paths } from "./schema";

// The allowed values of each enum, as arrays you can loop over (for <select> options).
// Also generated, so a new status in the backend appears here after `npm run gen:api`.
export {
  employmentTypeValues,
  levelValues,
  positionTypeValues,
  sourceValues,
  statusValues,
  workModeValues,
} from "./schema";

type Schemas = components["schemas"];

export type Status = Schemas["Status"];
export type PositionType = Schemas["PositionType"];
export type Level = Schemas["Level"];
export type EmploymentType = Schemas["EmploymentType"];
export type WorkMode = Schemas["WorkMode"];
export type Source = Schemas["Source"];

export type Company = Schemas["CompanyRead"];
export type CompanyCreate = Schemas["CompanyCreate"];
export type CompanyUpdate = Schemas["CompanyUpdate"];
export type Application = Schemas["ApplicationRead"];
export type ApplicationCreate = Schemas["ApplicationCreate"];
export type ApplicationUpdate = Schemas["ApplicationUpdate"];
export type StatusChange = Schemas["StatusChangeRead"];
export type StatusChangeCreate = Schemas["StatusChangeCreate"];
export type ImportItem = Schemas["ApplicationImportItem"];
export type ImportResult = Schemas["ImportResult"];
export type Stats = Schemas["StatsRead"];
export type ValidationError = Schemas["ValidationError"];

// The query parameters GET /applications accepts (status, company_id, position_type, job_url).
export type ApplicationFilters = NonNullable<
  paths["/applications"]["get"]["parameters"]["query"]
>;

// OpenAPI can only say "string keys". The backend returns every status as a key.
export type StatusTransitions = Record<Status, Status[]>;
