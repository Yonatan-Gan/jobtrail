import { ApiError } from "../api/client";
import { FieldErrors } from "./apiErrors";

/**
 * Company names are unique, so a create or rename can get a 409. Turn it into a message
 * on the name field that says which name is taken.
 */
export async function withUniqueName<T>(
  name: string | null | undefined,
  save: () => Promise<T>,
): Promise<T> {
  try {
    return await save();
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && name) {
      throw new FieldErrors({
        name: `A company named “${name}” already exists.`,
      });
    }
    throw error;
  }
}

/**
 * The API refuses to delete a company that still has applications (409, from the
 * database's ON DELETE RESTRICT rule). Say that in plain words.
 */
export function deleteCompanyMessage(
  error: unknown,
  companyName: string,
  applicationCount: number | null,
): string | null {
  if (!(error instanceof ApiError && error.status === 409)) {
    return null;
  }
  const what =
    applicationCount === null
      ? "applications"
      : `${applicationCount} ${applicationCount === 1 ? "application" : "applications"}`;
  return `${companyName} can’t be deleted because it still has ${what}. JobTrail keeps a company while it has applications, so their history stays complete. Delete those applications first if you really want to remove the company.`;
}
