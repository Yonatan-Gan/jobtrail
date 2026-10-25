import type { Company, CompanyCreate, CompanyUpdate } from "../api/types";

export interface CompanyFormValues {
  name: string;
  website: string;
  notes: string;
}

export const EMPTY_COMPANY: CompanyFormValues = {
  name: "",
  website: "",
  notes: "",
};

export function companyFormValues(company: Company): CompanyFormValues {
  return {
    name: company.name,
    website: company.website ?? "",
    notes: company.notes ?? "",
  };
}

const optionalText = (value: string) => value.trim() || null;

export function companyCreatePayload(values: CompanyFormValues): CompanyCreate {
  return {
    name: values.name.trim(),
    website: optionalText(values.website),
    notes: optionalText(values.notes),
  };
}

/** Only the fields that changed, like the application edit form. */
export function companyUpdatePayload(
  values: CompanyFormValues,
  company: Company,
): CompanyUpdate {
  const next = companyCreatePayload(values);
  const before = companyCreatePayload(companyFormValues(company));
  const changes: CompanyUpdate = {};
  if (next.name !== before.name) {
    changes.name = next.name;
  }
  if (next.website !== before.website) {
    changes.website = next.website;
  }
  if (next.notes !== before.notes) {
    changes.notes = next.notes;
  }
  return changes;
}
