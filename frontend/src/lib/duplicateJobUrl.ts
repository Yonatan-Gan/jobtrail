import { ApiError } from "../api/client";
import { api } from "../api/endpoints";
import { FieldErrors } from "./apiErrors";

/** A save failed because another application already has this job URL. */
export class DuplicateJobUrlError extends FieldErrors {
  /** The application that already has the URL, when it could be found. */
  readonly existingId: number | null;

  constructor(existingId: number | null) {
    super({ job_url: "Another application already has this job URL." });
    this.name = "DuplicateJobUrlError";
    this.existingId = existingId;
  }
}

/**
 * Run a create or update. The API answers 409 when job_url is already taken, but the
 * message doesn't say by which application, so look it up with GET /applications?job_url=
 * to offer a link to it.
 */
export async function withDuplicateCheck<T>(
  jobUrl: string | null | undefined,
  save: () => Promise<T>,
): Promise<T> {
  try {
    return await save();
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && jobUrl) {
      const matches = await api
        .listApplications({ job_url: jobUrl })
        .catch(() => []);
      throw new DuplicateJobUrlError(matches[0]?.id ?? null);
    }
    throw error;
  }
}
