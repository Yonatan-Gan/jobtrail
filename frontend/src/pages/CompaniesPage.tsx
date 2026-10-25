import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "../api/endpoints";
import { queryKeys, useApplications, useCompanies } from "../api/queries";
import type { Company } from "../api/types";
import { Button } from "../components/Button";
import { CompanyForm } from "../components/companies/CompanyForm";
import { DeleteCompanyDialog } from "../components/companies/DeleteCompanyDialog";
import { EditCompanyDialog } from "../components/companies/EditCompanyDialog";
import { Notice } from "../components/Notice";
import { PageHeader } from "../components/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/QueryStates";
import { formErrors, NO_ERRORS } from "../lib/apiErrors";
import { withUniqueName } from "../lib/companyErrors";
import {
  companyCreatePayload,
  EMPTY_COMPANY,
  type CompanyFormValues,
} from "../lib/companyForm";
import { isWebUrl } from "../lib/urls";

export function CompaniesPage() {
  const companies = useCompanies();
  // All applications, to count them per company (the API has no count endpoint).
  const applications = useApplications();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);
  // Changing the key gives the add form a fresh, empty state after a successful save.
  const [formKey, setFormKey] = useState(0);

  const create = useMutation({
    mutationFn: (values: CompanyFormValues) => {
      const payload = companyCreatePayload(values);
      return withUniqueName(payload.name, () => api.createCompany(payload));
    },
    onSuccess: async (company) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies });
      setMessage(`Added ${company.name}.`);
      setFormKey((key) => key + 1);
    },
  });

  const counts = new Map<number, number>();
  for (const application of applications.data ?? []) {
    counts.set(
      application.company_id,
      (counts.get(application.company_id) ?? 0) + 1,
    );
  }
  const countFor = (company: Company) =>
    applications.isSuccess ? (counts.get(company.id) ?? 0) : null;

  return (
    <>
      <PageHeader
        title="Companies"
        description="Companies are also created automatically when you import a file or add an application."
      />

      {message && (
        <Notice
          tone="success"
          className="mb-6"
          onDismiss={() => setMessage(null)}
        >
          {message}
        </Notice>
      )}

      <section
        aria-labelledby="add-company-heading"
        className="mb-6 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h2 id="add-company-heading" className="mb-3 text-lg font-semibold">
          Add a company
        </h2>
        <CompanyForm
          key={formKey}
          initialValues={EMPTY_COMPANY}
          submitLabel="Add company"
          isSubmitting={create.isPending}
          errors={create.error ? formErrors(create.error) : NO_ERRORS}
          onSubmit={(values) => {
            setMessage(null);
            create.mutate(values);
          }}
        />
      </section>

      <section aria-labelledby="company-list-heading">
        <h2 id="company-list-heading" className="mb-3 text-lg font-semibold">
          All companies
        </h2>
        {companies.isPending && <LoadingState label="Loading companies…" />}
        {companies.isError && (
          <ErrorState
            title="Could not load the companies"
            error={companies.error}
            onRetry={() => void companies.refetch()}
          />
        )}
        {companies.isSuccess && companies.data.length === 0 && (
          <EmptyState title="No companies yet">
            Import your daily file or add one above.
          </EmptyState>
        )}
        {companies.isSuccess && companies.data.length > 0 && (
          <CompaniesTable
            companies={[...companies.data].sort((a, b) =>
              a.name.localeCompare(b.name),
            )}
            countFor={countFor}
            onEdit={(company) => {
              setMessage(null);
              setEditing(company);
            }}
            onDelete={(company) => {
              setMessage(null);
              setDeleting(company);
            }}
          />
        )}
      </section>

      <EditCompanyDialog
        company={editing}
        onClose={() => setEditing(null)}
        onSaved={(text) => {
          setEditing(null);
          setMessage(text);
        }}
      />
      <DeleteCompanyDialog
        company={deleting}
        applicationCount={deleting ? countFor(deleting) : null}
        onClose={() => setDeleting(null)}
        onDeleted={(text) => {
          setDeleting(null);
          setMessage(text);
        }}
      />
    </>
  );
}

interface CompaniesTableProps {
  companies: Company[];
  countFor: (company: Company) => number | null;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
}

function CompaniesTable({
  companies,
  countFor,
  onEdit,
  onDelete,
}: CompaniesTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <caption className="sr-only">Companies</caption>
        <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">
              Company
            </th>
            <th scope="col" className="px-4 py-3">
              Applications
            </th>
            <th scope="col" className="hidden px-4 py-3 md:table-cell">
              Notes
            </th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {companies.map((company) => {
            const count = countFor(company);
            return (
              <tr key={company.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">{company.name}</div>
                  {isWebUrl(company.website) && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${company.name} website (opens in a new tab)`}
                      className="text-xs break-all text-blue-700 underline"
                    >
                      {company.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {count === null ? (
                    "…"
                  ) : count === 0 ? (
                    <span className="text-slate-500">None</span>
                  ) : (
                    <Link
                      to={`/applications?company=${company.id}&status=all`}
                      className="text-blue-700 underline"
                    >
                      {count} {count === 1 ? "application" : "applications"}
                    </Link>
                  )}
                </td>
                <td className="hidden max-w-sm px-4 py-3 text-slate-600 md:table-cell">
                  {company.notes ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      aria-label={`Edit ${company.name}`}
                      onClick={() => onEdit(company)}
                    >
                      Edit
                    </Button>
                    <Button
                      aria-label={`Delete ${company.name}`}
                      onClick={() => onDelete(company)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
