import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { api } from "../api/endpoints";
import {
  queryKeys,
  useCompanies,
  useRefreshApplications,
} from "../api/queries";
import type { Company } from "../api/types";
import {
  ApplicationForm,
  NEW_COMPANY,
} from "../components/applications/ApplicationForm";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/QueryStates";
import { FieldErrors, formErrors, NO_ERRORS } from "../lib/apiErrors";
import {
  buildCreatePayload,
  EMPTY_FORM,
  type ApplicationFormValues,
} from "../lib/applicationForm";
import {
  DuplicateJobUrlError,
  withDuplicateCheck,
} from "../lib/duplicateJobUrl";

interface NewApplication {
  values: ApplicationFormValues;
  newCompanyName: string | null;
}

export function NewApplicationPage() {
  const companies = useCompanies();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refresh = useRefreshApplications();

  // The company to use: an existing one, or one created now. A "new" company whose
  // name already exists is reused (names are unique, and the import matches the same way),
  // so trying again after a failed save never creates the company twice.
  async function companyFor(
    values: ApplicationFormValues,
    newCompanyName: string | null,
    known: Company[],
  ): Promise<Company> {
    if (values.company_id !== NEW_COMPANY) {
      const company = known.find(({ id }) => String(id) === values.company_id);
      if (!company) {
        throw new FieldErrors({ company_id: "Choose a company." });
      }
      return company;
    }
    const existing = known.find(({ name }) => name === newCompanyName);
    if (existing) {
      return existing;
    }
    const created = await api.createCompany({ name: newCompanyName ?? "" });
    await queryClient.invalidateQueries({ queryKey: queryKeys.companies });
    return created;
  }

  const create = useMutation({
    mutationFn: async ({ values, newCompanyName }: NewApplication) => {
      // Check the form before creating anything, so a missing title can't leave
      // a new company behind.
      const result = buildCreatePayload(values);
      const missing: Record<string, string> = { ...result.errors };
      if (!values.company_id) {
        missing.company_id = "Choose a company, or “New company…”.";
      }
      if (values.company_id === NEW_COMPANY && !newCompanyName) {
        missing.new_company_name = "Enter the new company’s name.";
      }
      if (!result.payload || Object.keys(missing).length > 0) {
        throw new FieldErrors(missing);
      }
      const company = await companyFor(
        values,
        newCompanyName,
        companies.data ?? [],
      );
      const application = await withDuplicateCheck(result.payload.job_url, () =>
        api.createApplication({ ...result.payload, company_id: company.id }),
      );
      return { application, company };
    },
    onSuccess: async ({ application, company }) => {
      await refresh();
      await navigate(`/applications/${application.id}`, {
        state: {
          notice: `Added “${application.title}” at ${company.name}.`,
        },
      });
    },
  });

  return (
    <>
      <PageHeader
        title="Add application"
        description="For a job that isn't in your daily file. Fields marked “required” must be filled in."
      />
      {companies.isPending && <LoadingState label="Loading companies…" />}
      {companies.isError && (
        <ErrorState
          title="Could not load the companies"
          error={companies.error}
          onRetry={() => void companies.refetch()}
        />
      )}
      {companies.isSuccess && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <ApplicationForm
            initialValues={EMPTY_FORM}
            companies={companies.data}
            submitLabel="Add application"
            isSubmitting={create.isPending}
            errors={create.error ? formErrors(create.error) : NO_ERRORS}
            duplicateOf={
              create.error instanceof DuplicateJobUrlError
                ? create.error.existingId
                : null
            }
            allowNewCompany
            onSubmit={(values, newCompanyName) =>
              create.mutate({ values, newCompanyName })
            }
            onCancel={() => void navigate("/applications")}
          />
        </section>
      )}
    </>
  );
}
