import type { ReactNode } from "react";
import type { Application } from "../../api/types";
import { enumLabel, formatDate, formatSalary } from "../../lib/format";
import { isWebUrl } from "../../lib/urls";

interface ApplicationDetailsProps {
  application: Application;
  companyName: string;
}

// Every field, read-only. A description list (<dl>) pairs each label with its value.
export function ApplicationDetails({
  application,
  companyName,
}: ApplicationDetailsProps) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <Detail label="Company">{companyName}</Detail>
      <Detail label="Position type">
        {enumLabel(application.position_type)}
      </Detail>
      <Detail label="Level">{enumLabel(application.level)}</Detail>
      <Detail label="Employment type">
        {enumLabel(application.employment_type)}
      </Detail>
      <Detail label="Work mode">
        {application.work_mode ? enumLabel(application.work_mode) : "—"}
      </Detail>
      <Detail label="City">{application.city ?? "—"}</Detail>
      <Detail label="Salary">
        {formatSalary(application.salary_min, application.salary_max)}
      </Detail>
      <Detail label="Source">{enumLabel(application.source)}</Detail>
      <Detail label="Job posting" wide>
        {isWebUrl(application.job_url) ? (
          <a
            href={application.job_url}
            target="_blank"
            rel="noreferrer"
            className="break-all text-blue-700 underline"
          >
            {application.job_url}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          (application.job_url ?? "—")
        )}
      </Detail>
      <Detail label="Applied">{formatDate(application.applied_at)}</Detail>
      <Detail label="Added">{formatDate(application.created_at)}</Detail>
      <Detail label="Last updated">{formatDate(application.updated_at)}</Detail>
    </dl>
  );
}

function Detail({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
