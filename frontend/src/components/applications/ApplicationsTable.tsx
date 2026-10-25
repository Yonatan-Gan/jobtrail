import { Link } from "react-router";
import type { Application } from "../../api/types";
import { parseFit } from "../../lib/fit";
import { enumLabel, formatDate } from "../../lib/format";
import { isWebUrl } from "../../lib/urls";
import { FitBadge } from "../FitBadge";
import { StatusBadge } from "../StatusBadge";

interface ApplicationsTableProps {
  applications: Application[];
  companyNames: Map<number, string>;
}

// One table for every screen size. On a phone only Job, Status and Applied are shown;
// the other columns appear from the `sm`/`md`/`lg` breakpoints up (Tailwind classes).
export function ApplicationsTable({
  applications,
  companyNames,
}: ApplicationsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <caption className="sr-only">Applications</caption>
        <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">
              Job
            </th>
            <th scope="col" className="hidden px-4 py-3 sm:table-cell">
              Location
            </th>
            <th scope="col" className="hidden px-4 py-3 lg:table-cell">
              Type
            </th>
            <th scope="col" className="px-4 py-3">
              Status
            </th>
            <th scope="col" className="px-4 py-3">
              Applied
            </th>
            <th scope="col" className="hidden px-4 py-3 md:table-cell">
              Added
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {applications.map((application) => {
            const company =
              companyNames.get(application.company_id) ?? "Unknown company";
            const fit = parseFit(application.notes);
            return (
              <tr key={application.id} className="align-top">
                <td className="px-4 py-3">
                  <Link
                    to={`/applications/${application.id}`}
                    className="font-medium text-slate-900 underline-offset-4 hover:underline"
                  >
                    {application.title}
                  </Link>
                  <div className="text-slate-600">{company}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {fit && <FitBadge fit={fit} />}
                    {isWebUrl(application.job_url) && (
                      // The label names the job (every row has a "Job posting" link) and
                      // warns about the new tab. It starts with the visible words.
                      <a
                        href={application.job_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Job posting for ${application.title} at ${company} (opens in a new tab)`}
                        className="text-xs text-blue-700 underline underline-offset-2"
                      >
                        Job posting <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {application.city || application.work_mode ? (
                    <>
                      {application.city && <div>{application.city}</div>}
                      {application.work_mode && (
                        <div className="text-slate-500">
                          {enumLabel(application.work_mode)}
                        </div>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  {enumLabel(application.position_type)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={application.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDate(application.applied_at)}
                </td>
                <td className="hidden px-4 py-3 whitespace-nowrap text-slate-600 md:table-cell">
                  {formatDate(application.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
