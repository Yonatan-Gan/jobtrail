import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/endpoints";
import { queryKeys } from "../../api/queries";
import type { Company } from "../../api/types";
import { formErrors, NO_ERRORS } from "../../lib/apiErrors";
import { withUniqueName } from "../../lib/companyErrors";
import {
  companyFormValues,
  companyUpdatePayload,
  type CompanyFormValues,
} from "../../lib/companyForm";
import { Dialog } from "../Dialog";
import { CompanyForm } from "./CompanyForm";

interface EditCompanyDialogProps {
  /** The company being edited, or null when the dialog is closed. */
  company: Company | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function EditCompanyDialog({
  company,
  onClose,
  onSaved,
}: EditCompanyDialogProps) {
  return (
    <Dialog
      open={company !== null}
      onClose={onClose}
      title={company ? `Edit ${company.name}` : ""}
    >
      {company && (
        <EditCompanyForm
          company={company}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Dialog>
  );
}

function EditCompanyForm({
  company,
  onClose,
  onSaved,
}: {
  company: Company;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: (values: CompanyFormValues) => {
      const changes = companyUpdatePayload(values, company);
      return withUniqueName(changes.name, () =>
        api.updateCompany(company.id, changes),
      );
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies });
      onSaved(`Saved ${saved.name}.`);
    },
  });

  return (
    <CompanyForm
      initialValues={companyFormValues(company)}
      submitLabel="Save changes"
      isSubmitting={update.isPending}
      errors={update.error ? formErrors(update.error) : NO_ERRORS}
      onSubmit={(values) => update.mutate(values)}
      onCancel={onClose}
      autofocusName
    />
  );
}
