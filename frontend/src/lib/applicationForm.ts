// Converts between what the application form's inputs hold (always strings) and what the
// API wants (numbers, lists, enums, null for "empty").

import {
  employmentTypeValues,
  levelValues,
  positionTypeValues,
  sourceValues,
  workModeValues,
  type Application,
  type ApplicationCreate,
  type ApplicationUpdate,
  type EmploymentType,
  type Level,
  type PositionType,
  type Source,
  type WorkMode,
} from "../api/types";
import { isOneOf } from "./status";

export interface ApplicationFormValues {
  company_id: string;
  title: string;
  position_type: string;
  level: string;
  employment_type: string;
  work_mode: string;
  city: string;
  salary_min: string;
  salary_max: string;
  job_url: string;
  source: string;
  /** Comma-separated, e.g. "react, node.js". */
  skills: string;
  notes: string;
}

export const EMPTY_FORM: ApplicationFormValues = {
  company_id: "",
  title: "",
  position_type: "",
  level: "junior",
  employment_type: "full_time",
  work_mode: "",
  city: "",
  salary_min: "",
  salary_max: "",
  job_url: "",
  source: "",
  skills: "",
  notes: "",
};

export function formValuesFrom(
  application: Application,
): ApplicationFormValues {
  return {
    company_id: String(application.company_id),
    title: application.title,
    position_type: application.position_type,
    level: application.level,
    employment_type: application.employment_type,
    work_mode: application.work_mode ?? "",
    city: application.city ?? "",
    salary_min: application.salary_min?.toString() ?? "",
    salary_max: application.salary_max?.toString() ?? "",
    job_url: application.job_url ?? "",
    source: application.source,
    skills: application.skills.join(", "),
    notes: application.notes ?? "",
  };
}

/** The form's values in API shape. An enum that isn't chosen is null. */
interface ParsedForm {
  company_id: number | null;
  title: string;
  position_type: PositionType | null;
  level: Level | null;
  employment_type: EmploymentType | null;
  work_mode: WorkMode | null;
  city: string | null;
  salary_min: number | null;
  salary_max: number | null;
  job_url: string | null;
  source: Source | null;
  skills: string[];
  notes: string | null;
}

const optionalText = (value: string) => value.trim() || null;
const optionalNumber = (value: string) =>
  value.trim() === "" ? null : Number(value);
const enumOrNull = <T extends string>(values: readonly T[], value: string) =>
  isOneOf(values, value) ? value : null;

function parse(values: ApplicationFormValues): ParsedForm {
  return {
    company_id: optionalNumber(values.company_id),
    title: values.title.trim(),
    position_type: enumOrNull(positionTypeValues, values.position_type),
    level: enumOrNull(levelValues, values.level),
    employment_type: enumOrNull(employmentTypeValues, values.employment_type),
    work_mode: enumOrNull(workModeValues, values.work_mode),
    city: optionalText(values.city),
    salary_min: optionalNumber(values.salary_min),
    salary_max: optionalNumber(values.salary_max),
    job_url: optionalText(values.job_url),
    source: enumOrNull(sourceValues, values.source),
    skills: values.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean),
    notes: optionalText(values.notes),
  };
}

export type CreateResult =
  | { payload: ApplicationCreate; errors?: undefined }
  | { payload?: undefined; errors: Record<string, string> };

/**
 * The body for POST /applications, or messages for the required fields that are still
 * empty. (The inputs are `required` too; this keeps TypeScript and the API honest.)
 */
export function buildCreatePayload(
  values: ApplicationFormValues,
  companyId: number,
): CreateResult {
  const form = parse(values);
  const errors: Record<string, string> = {};
  if (!form.title) {
    errors.title = "Enter the job title.";
  }
  if (!form.position_type) {
    errors.position_type = "Choose a position type.";
  }
  if (!form.source) {
    errors.source = "Choose where you found the job.";
  }
  if (!form.level) {
    errors.level = "Choose a level.";
  }
  if (!form.employment_type) {
    errors.employment_type = "Choose an employment type.";
  }
  if (
    !form.title ||
    !form.position_type ||
    !form.source ||
    !form.level ||
    !form.employment_type
  ) {
    return { errors };
  }
  return {
    payload: {
      company_id: companyId,
      title: form.title,
      position_type: form.position_type,
      level: form.level,
      employment_type: form.employment_type,
      work_mode: form.work_mode,
      city: form.city,
      salary_min: form.salary_min,
      salary_max: form.salary_max,
      job_url: form.job_url,
      source: form.source,
      skills: form.skills,
      notes: form.notes,
    },
  };
}

/**
 * The body for PATCH /applications/{id}: only the fields that differ from what the
 * application has now. Both sides go through the same parse(), so a field that only
 * looks different (trailing spaces, "react,node" vs "react, node") doesn't count.
 */
export function buildUpdatePayload(
  values: ApplicationFormValues,
  application: Application,
): ApplicationUpdate {
  const next = parse(values);
  const before = parse(formValuesFrom(application));
  const changed = (key: keyof ParsedForm) =>
    JSON.stringify(next[key]) !== JSON.stringify(before[key]);

  const changes: ApplicationUpdate = {};
  // Required fields are only sent when they hold a real value: sending null would ask
  // the database to empty a NOT NULL column.
  if (changed("company_id") && next.company_id !== null) {
    changes.company_id = next.company_id;
  }
  if (changed("title")) {
    changes.title = next.title;
  }
  if (changed("position_type") && next.position_type) {
    changes.position_type = next.position_type;
  }
  if (changed("level") && next.level) {
    changes.level = next.level;
  }
  if (changed("employment_type") && next.employment_type) {
    changes.employment_type = next.employment_type;
  }
  if (changed("source") && next.source) {
    changes.source = next.source;
  }
  if (changed("work_mode")) {
    changes.work_mode = next.work_mode;
  }
  if (changed("city")) {
    changes.city = next.city;
  }
  if (changed("salary_min")) {
    changes.salary_min = next.salary_min;
  }
  if (changed("salary_max")) {
    changes.salary_max = next.salary_max;
  }
  if (changed("job_url")) {
    changes.job_url = next.job_url;
  }
  if (changed("skills")) {
    changes.skills = next.skills;
  }
  if (changed("notes")) {
    changes.notes = next.notes;
  }
  return changes;
}
