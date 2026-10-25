import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type ChangeEvent, type DragEvent } from "react";
import { api } from "../api/endpoints";
import { queryKeys, useRefreshApplications } from "../api/queries";
import { Button } from "../components/Button";
import { ImportPreview } from "../components/importing/ImportPreview";
import { ImportResultPanel } from "../components/importing/ImportResultPanel";
import { Notice } from "../components/Notice";
import { PageHeader } from "../components/PageHeader";
import {
  importProblems,
  readImportFile,
  type ImportItem,
} from "../lib/importFile";

interface ChosenFile {
  name: string;
  items: ImportItem[];
}

// The browser version of `make import`: choose or drop the daily JSON file, check the
// preview, then send it to POST /applications/import in one request (all or nothing).
export function ImportPage() {
  const inputId = useId();
  const [chosen, setChosen] = useState<ChosenFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const queryClient = useQueryClient();
  const refresh = useRefreshApplications();

  const importJobs = useMutation({
    mutationFn: (items: ImportItem[]) => api.importApplications(items),
    onSuccess: () =>
      // New applications, maybe new companies, and new stats.
      Promise.all([
        refresh(),
        queryClient.invalidateQueries({ queryKey: queryKeys.companies }),
      ]),
  });

  async function readFile(file: File) {
    importJobs.reset();
    setChosen(null);
    const result = readImportFile(await file.text());
    if (result.error !== undefined) {
      setFileError(`${file.name}: ${result.error}`);
    } else {
      setFileError(null);
      setChosen({ name: file.name, items: result.items });
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear the input, so choosing the same file again still triggers a change.
    event.target.value = "";
    if (file) {
      void readFile(file);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    // Without preventDefault the browser would open the dropped file as a page.
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      void readFile(file);
    }
  }

  function reset() {
    importJobs.reset();
    setChosen(null);
    setFileError(null);
  }

  return (
    <>
      <PageHeader
        title="Import"
        description="Load a jobtrail_import_*.json or jobtrail_applied_*.json file. Jobs whose URL is already in JobTrail are skipped, so importing a file twice is safe."
      />

      {importJobs.isSuccess ? (
        <ImportResultPanel result={importJobs.data} onImportAnother={reset} />
      ) : (
        <div className="space-y-6">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            data-testid="drop-zone"
            className={`rounded-lg border-2 border-dashed p-6 text-center ${
              dragging
                ? "border-blue-600 bg-blue-50"
                : "border-slate-300 bg-white"
            }`}
          >
            <label htmlFor={inputId} className="block font-medium">
              Choose a JSON file
            </label>
            <p className="mt-1 text-sm text-slate-600">
              or drag and drop it here
            </p>
            <input
              id={inputId}
              type="file"
              accept=".json,application/json"
              onChange={handleInputChange}
              className="mx-auto mt-3 block text-sm file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-100"
            />
          </div>

          {fileError && <Notice tone="error">{fileError}</Notice>}

          {chosen && (
            <section aria-labelledby="preview-heading" className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="preview-heading" className="text-lg font-semibold">
                    Preview
                  </h2>
                  <p className="text-sm text-slate-600">
                    {chosen.name} · {chosen.items.length}{" "}
                    {chosen.items.length === 1 ? "job" : "jobs"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={reset} disabled={importJobs.isPending}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={importJobs.isPending}
                    onClick={() => importJobs.mutate(chosen.items)}
                  >
                    {importJobs.isPending
                      ? "Importing…"
                      : `Import ${chosen.items.length} ${chosen.items.length === 1 ? "job" : "jobs"}`}
                  </Button>
                </div>
              </div>

              {importJobs.isError && (
                <Notice tone="error">
                  <p className="font-medium">
                    Nothing was imported. Fix the file and try again:
                  </p>
                  <ul className="mt-1 list-disc ps-5">
                    {importProblems(importJobs.error, chosen.items).map(
                      (problem, index) => (
                        <li key={index}>{problem}</li>
                      ),
                    )}
                  </ul>
                </Notice>
              )}

              <ImportPreview items={chosen.items} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
