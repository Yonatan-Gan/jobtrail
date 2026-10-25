import { useState, type ChangeEvent, type FormEvent } from "react";
import type { FormErrors } from "../../lib/apiErrors";
import type { CompanyFormValues } from "../../lib/companyForm";
import { Button } from "../Button";
import { TextAreaField, TextField } from "../FormFields";
import { Notice } from "../Notice";

interface CompanyFormProps {
  initialValues: CompanyFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  errors: FormErrors;
  onSubmit: (values: CompanyFormValues) => void;
  onCancel?: () => void;
  /** Put the name field's focus marker on, for use inside a dialog. */
  autofocusName?: boolean;
}

export function CompanyForm({
  initialValues,
  submitLabel,
  isSubmitting,
  errors,
  onSubmit,
  onCancel,
  autofocusName = false,
}: CompanyFormProps) {
  const [values, setValues] = useState(initialValues);

  function field(name: keyof CompanyFormValues) {
    return {
      name,
      value: values[name],
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setValues((current) => ({ ...current, [name]: event.target.value })),
      error: errors.fields[name],
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.form && <Notice tone="error">{errors.form}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Name"
          required
          maxLength={200}
          data-autofocus={autofocusName ? true : undefined}
          {...field("name")}
        />
        <TextField
          label="Website"
          type="url"
          inputMode="url"
          maxLength={500}
          {...field("website")}
        />
        <TextAreaField
          label="Notes"
          rows={2}
          {...field("notes")}
          className="sm:col-span-2"
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
