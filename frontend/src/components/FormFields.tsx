import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

// Labelled form controls. Each field ties its <label>, hint and error message to the
// control with ids, so a screen reader reads "Title, required, invalid: String should
// have at least 1 character" when the field gets focus.

const CONTROL =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm aria-invalid:border-red-600";

interface FieldParts {
  label: string;
  error?: string;
  hint?: ReactNode;
}

function useFieldIds(hint: ReactNode, error: string | undefined) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;
  return { id, hintId, errorId, describedBy };
}

function FieldLabel({
  htmlFor,
  label,
  required,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium">
      {label}
      {required && (
        <span className="font-normal text-slate-500"> (required)</span>
      )}
    </label>
  );
}

function FieldFooter({
  hint,
  hintId,
  error,
  errorId,
}: {
  hint: ReactNode;
  hintId: string;
  error?: string;
  errorId: string;
}) {
  return (
    <>
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-700">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </>
  );
}

type TextFieldProps = FieldParts &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

export function TextField({
  label,
  error,
  hint,
  required,
  className = "",
  ...inputProps
}: TextFieldProps) {
  const { id, hintId, errorId, describedBy } = useFieldIds(hint, error);
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={CONTROL}
        {...inputProps}
      />
      <FieldFooter
        hint={hint}
        hintId={hintId}
        error={error}
        errorId={errorId}
      />
    </div>
  );
}

type TextAreaFieldProps = FieldParts &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">;

export function TextAreaField({
  label,
  error,
  hint,
  required,
  className = "",
  ...textareaProps
}: TextAreaFieldProps) {
  const { id, hintId, errorId, describedBy } = useFieldIds(hint, error);
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <textarea
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={CONTROL}
        {...textareaProps}
      />
      <FieldFooter
        hint={hint}
        hintId={hintId}
        error={error}
        errorId={errorId}
      />
    </div>
  );
}

export interface Option {
  value: string;
  label: string;
}

type SelectFieldProps = FieldParts &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
    options: Option[];
  };

export function SelectField({
  label,
  error,
  hint,
  required,
  options,
  className = "",
  ...selectProps
}: SelectFieldProps) {
  const { id, hintId, errorId, describedBy } = useFieldIds(hint, error);
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={CONTROL}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldFooter
        hint={hint}
        hintId={hintId}
        error={error}
        errorId={errorId}
      />
    </div>
  );
}
