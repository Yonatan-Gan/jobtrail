import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router";
import {
  employmentTypeValues,
  levelValues,
  positionTypeValues,
  sourceValues,
  workModeValues,
  type Company,
} from "../../api/types";
import type { FormErrors } from "../../lib/apiErrors";
import type { ApplicationFormValues } from "../../lib/applicationForm";
import { enumLabel } from "../../lib/format";
import { Button } from "../Button";
import {
  SelectField,
  TextAreaField,
  TextField,
  type Option,
} from "../FormFields";
import { Notice } from "../Notice";

/** The company picker's value for "create a new company with this name". */
export const NEW_COMPANY = "new";

interface ApplicationFormProps {
  initialValues: ApplicationFormValues;
  companies: Company[];
  submitLabel: string;
  isSubmitting: boolean;
  /** Messages from the last failed save: per field, plus one for the whole form. */
  errors: FormErrors;
  /** When the save failed because this application already has the job URL. */
  duplicateOf?: number | null;
  /** Offer "New company…" in the company picker (the add page does). */
  allowNewCompany?: boolean;
  autoFocus?: boolean;
  onSubmit: (
    values: ApplicationFormValues,
    newCompanyName: string | null,
  ) => void;
  onCancel?: () => void;
}

const options = (values: readonly string[]): Option[] =>
  values.map((value) => ({ value, label: enumLabel(value) }));

// A controlled form: React state holds every value, and each input shows that state.
export function ApplicationForm({
  initialValues,
  companies,
  submitLabel,
  isSubmitting,
  errors,
  duplicateOf = null,
  allowNewCompany = false,
  autoFocus = false,
  onSubmit,
  onCancel,
}: ApplicationFormProps) {
  const [values, setValues] = useState(initialValues);
  const [newCompanyName, setNewCompanyName] = useState("");

  // The props one input needs: its value, a change handler and its error message.
  function field(name: keyof ApplicationFormValues) {
    return {
      name,
      value: values[name],
      onChange: (
        event: ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => setValues((current) => ({ ...current, [name]: event.target.value })),
      error: errors.fields[name],
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stop the browser's own form submit (a full page load); we call the API instead.
    event.preventDefault();
    onSubmit(
      values,
      values.company_id === NEW_COMPANY ? newCompanyName.trim() : null,
    );
  }

  const companyOptions: Option[] = [
    { value: "", label: "Choose a company" },
    ...[...companies]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((company) => ({ value: String(company.id), label: company.name })),
    ...(allowNewCompany ? [{ value: NEW_COMPANY, label: "New company…" }] : []),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors.form && <Notice tone="error">{errors.form}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Company"
          required
          options={companyOptions}
          {...field("company_id")}
        />
        {values.company_id === NEW_COMPANY && (
          <TextField
            label="New company name"
            required
            value={newCompanyName}
            onChange={(event) => setNewCompanyName(event.target.value)}
            error={errors.fields.new_company_name}
            hint="Created when you save."
          />
        )}
        <TextField
          label="Job title"
          required
          autoFocus={autoFocus}
          maxLength={200}
          {...field("title")}
          className="sm:col-span-2"
        />
        <SelectField
          label="Position type"
          required
          options={[
            { value: "", label: "Choose a position type" },
            ...options(positionTypeValues),
          ]}
          {...field("position_type")}
        />
        <SelectField
          label="Level"
          options={options(levelValues)}
          {...field("level")}
        />
        <SelectField
          label="Employment type"
          options={options(employmentTypeValues)}
          {...field("employment_type")}
        />
        <SelectField
          label="Work mode"
          options={[
            { value: "", label: "Not set" },
            ...options(workModeValues),
          ]}
          {...field("work_mode")}
        />
        <TextField label="City" maxLength={100} {...field("city")} />
        <SelectField
          label="Source"
          required
          hint="Where you found the job."
          options={[
            { value: "", label: "Choose a source" },
            ...options(sourceValues),
          ]}
          {...field("source")}
        />
        <div className="sm:col-span-2">
          <TextField
            label="Job posting URL"
            type="url"
            inputMode="url"
            maxLength={1000}
            hint="Each job URL can only be in JobTrail once."
            {...field("job_url")}
          />
          {duplicateOf !== null && (
            <p className="mt-1 text-sm">
              <Link
                to={`/applications/${duplicateOf}`}
                className="text-blue-700 underline"
              >
                Open the application that already has this URL
              </Link>
            </p>
          )}
        </div>
        <TextField
          label="Salary from (NIS / month)"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          {...field("salary_min")}
        />
        <TextField
          label="Salary up to (NIS / month)"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          {...field("salary_max")}
        />
        <TextField
          label="Skills"
          hint="Separate skills with commas, for example: react, node.js, sql"
          {...field("skills")}
          className="sm:col-span-2"
        />
        <TextAreaField
          label="Notes"
          rows={6}
          {...field("notes")}
          className="sm:col-span-2"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
