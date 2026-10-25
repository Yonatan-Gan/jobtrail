import { enumLabel } from "../../lib/format";
import { previewRow, type ImportItem } from "../../lib/importFile";
import { FitBadge } from "../FitBadge";

// The jobs in the chosen file, before anything is sent.
export function ImportPreview({ items }: { items: ImportItem[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <caption className="sr-only">Jobs in the file</caption>
        <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">
              #
            </th>
            <th scope="col" className="px-4 py-3">
              Company
            </th>
            <th scope="col" className="px-4 py-3">
              Title
            </th>
            <th scope="col" className="hidden px-4 py-3 sm:table-cell">
              City
            </th>
            <th scope="col" className="px-4 py-3">
              Fit
            </th>
            <th scope="col" className="hidden px-4 py-3 sm:table-cell">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, index) => {
            const row = previewRow(item);
            return (
              // The file has no ids; the position in the file is stable while it's shown.
              <tr key={index} className="align-top">
                <td className="px-4 py-2 text-slate-500">{index + 1}</td>
                <td className="px-4 py-2">{row.company}</td>
                <td className="px-4 py-2 font-medium">{row.title}</td>
                <td className="hidden px-4 py-2 sm:table-cell">{row.city}</td>
                <td className="px-4 py-2">
                  {row.fit ? <FitBadge fit={row.fit} /> : "—"}
                </td>
                <td className="hidden px-4 py-2 sm:table-cell">
                  {enumLabel(row.status)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
