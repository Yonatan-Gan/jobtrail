import { Link } from "react-router";
import { useApplications } from "../../api/queries";
import type { ImportResult } from "../../api/types";
import { buttonClasses } from "../buttonStyles";
import { Button } from "../Button";

interface ImportResultPanelProps {
  result: ImportResult;
  onImportAnother: () => void;
}

// What POST /applications/import did. Skipped and updated URLs link to the application
// that has them, found in the (freshly refreshed) list of all applications.
export function ImportResultPanel({
  result,
  onImportAnother,
}: ImportResultPanelProps) {
  const applications = useApplications();
  const byUrl = new Map(
    (applications.data ?? []).map((application) => [
      application.job_url,
      application,
    ]),
  );

  return (
    <section
      aria-labelledby="import-result-heading"
      className="rounded-lg border border-emerald-200 bg-white p-4"
    >
      <h2 id="import-result-heading" className="text-lg font-semibold">
        Import finished
      </h2>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-center sm:max-w-md">
        <Count label="Created" value={result.created} />
        <Count label="Updated" value={result.updated} />
        <Count label="Skipped" value={result.skipped} />
      </dl>

      <UrlList
        title="Marked as applied (were saved before)"
        urls={result.updated_urls}
        byUrl={byUrl}
      />
      <UrlList
        title="Skipped: already in JobTrail, or twice in the file"
        urls={result.skipped_urls}
        byUrl={byUrl}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/applications" className={buttonClasses("primary")}>
          See the applications
        </Link>
        <Button onClick={onImportAnother}>Import another file</Button>
      </div>
    </section>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
}

function UrlList({
  title,
  urls,
  byUrl,
}: {
  title: string;
  urls: string[];
  byUrl: Map<string | null, { id: number; title: string }>;
}) {
  if (urls.length === 0) {
    return null;
  }
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-1 space-y-1 text-sm">
        {urls.map((url, index) => {
          const application = byUrl.get(url);
          return (
            // The same URL can be listed twice (it appeared twice in the file).
            <li key={`${url}-${index}`} className="break-all">
              {application ? (
                <Link
                  to={`/applications/${application.id}`}
                  className="text-blue-700 underline"
                >
                  {application.title}
                </Link>
              ) : null}{" "}
              <span className="text-slate-500">{url}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
