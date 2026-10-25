// Reading a jobtrail_import_*.json / jobtrail_applied_*.json file in the browser.
// Only problems that stop us from showing a preview are checked here. Whether each job's
// fields are valid is the backend's job: it answers 422 with the job number and field.

import { ApiError, describeError } from "../api/client";
import { cleanMessage, isValidationErrorList } from "./apiErrors";
import { parseFit, type Fit } from "./fit";

export type ImportItem = Record<string, unknown>;

export type ReadResult =
  | { items: ImportItem[]; error?: undefined }
  | { items?: undefined; error: string };

function isObject(value: unknown): value is ImportItem {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readImportFile(text: string): ReadResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "This file isn't valid JSON, so it can't be read." };
  }
  if (!Array.isArray(data)) {
    return {
      error:
        "The file should contain a list of jobs ([ … ]), but it contains something else.",
    };
  }
  if (data.length === 0) {
    return {
      error: "The file contains an empty list: there is nothing to import.",
    };
  }
  const notObject = data.findIndex((item) => !isObject(item));
  if (notObject !== -1) {
    return {
      error: `Job ${notObject + 1} in the file isn't an object with fields like "company" and "title".`,
    };
  }
  return { items: data.filter(isObject) };
}

export interface PreviewRow {
  company: string;
  title: string;
  city: string;
  fit: Fit | null;
  status: string;
}

const textField = (item: ImportItem, key: string) => {
  const value = item[key];
  return typeof value === "string" && value.trim() ? value : "—";
};

export function previewRow(item: ImportItem): PreviewRow {
  const notes = typeof item.notes === "string" ? item.notes : null;
  return {
    company: textField(item, "company"),
    title: textField(item, "title"),
    city: textField(item, "city"),
    fit: parseFit(notes),
    status: item.status === "applied" ? "applied" : "saved",
  };
}

/**
 * Messages for a failed import. A 422 lists every problem with its place in the request
 * body: loc ["body", 3, "position_type"] means job 4's position_type.
 */
export function importProblems(error: unknown, items: ImportItem[]): string[] {
  if (!(error instanceof ApiError && isValidationErrorList(error.detail))) {
    return [describeError(error)];
  }
  return error.detail.map((problem) => {
    const [, index, ...fieldPath] = problem.loc;
    const message = cleanMessage(problem.msg);
    if (typeof index !== "number") {
      return message;
    }
    const item = items[index];
    const name = item
      ? ` (${textField(item, "company")} – ${textField(item, "title")})`
      : "";
    const field = fieldPath.length > 0 ? `${fieldPath.join(".")}: ` : "";
    return `Job ${index + 1}${name}: ${field}${message}`;
  });
}
