import { ApiError, describeError } from "../api/client";
import type { ValidationError } from "../api/types";
import { DuplicateJobUrlError } from "./duplicateJobUrl";

export interface FormErrors {
  /** Messages for single fields, keyed by field name ("title", "job_url"). */
  fields: Record<string, string>;
  /** A message for the whole form, or null. */
  form: string | null;
}

/** FastAPI sends a list of these for a 422: where the problem is (`loc`) and what it is. */
export function isValidationErrorList(
  detail: unknown,
): detail is ValidationError[] {
  return (
    Array.isArray(detail) &&
    detail.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "loc" in item &&
        "msg" in item,
    )
  );
}

/** Pydantic prefixes messages from custom validators with "Value error, ". */
export function cleanMessage(message: string): string {
  return message.replace(/^Value error, /, "");
}

/**
 * Turn an error from a form submit into messages to show: a 422's field errors go next
 * to their fields (loc ["body", "title"] → "title"); everything else is one form message.
 */
export function formErrors(error: unknown): FormErrors {
  if (error instanceof DuplicateJobUrlError) {
    return { fields: { job_url: error.message }, form: null };
  }
  if (error instanceof ApiError && isValidationErrorList(error.detail)) {
    const fields: Record<string, string> = {};
    const other: string[] = [];
    for (const item of error.detail) {
      const [where, field] = item.loc;
      const message = cleanMessage(item.msg);
      if (where === "body" && typeof field === "string" && !(field in fields)) {
        fields[field] = message;
      } else {
        other.push(message);
      }
    }
    return { fields, form: other.length > 0 ? other.join(" ") : null };
  }
  return { fields: {}, form: error ? describeError(error) : null };
}

export const NO_ERRORS: FormErrors = { fields: {}, form: null };
