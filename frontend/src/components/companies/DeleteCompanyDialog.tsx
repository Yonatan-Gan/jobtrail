import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { describeError } from "../../api/client";
import { api } from "../../api/endpoints";
import { queryKeys } from "../../api/queries";
import type { Company } from "../../api/types";
import { deleteCompanyMessage } from "../../lib/companyErrors";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { Notice } from "../Notice";

interface DeleteCompanyDialogProps {
  /** The company to delete, or null when the dialog is closed. */
  company: Company | null;
  applicationCount: number | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
}

export function DeleteCompanyDialog({
  company,
  applicationCount,
  onClose,
  onDeleted,
}: DeleteCompanyDialogProps) {
  return (
    <Dialog
      open={company !== null}
      onClose={onClose}
      title={company ? `Delete ${company.name}?` : ""}
    >
      {company && (
        <DeleteCompanyBody
          company={company}
          applicationCount={applicationCount}
          onClose={onClose}
          onDeleted={onDeleted}
        />
      )}
    </Dialog>
  );
}

function DeleteCompanyBody({
  company,
  applicationCount,
  onClose,
  onDeleted,
}: {
  company: Company;
  applicationCount: number | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => api.deleteCompany(company.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies });
      onDeleted(`Deleted ${company.name}.`);
    },
  });

  // The API decides whether a delete is allowed; this only explains its answer.
  const blocked = remove.isError
    ? deleteCompanyMessage(remove.error, company.name, applicationCount)
    : null;

  return (
    <div className="space-y-4">
      {!blocked && (
        <p className="text-sm text-slate-600">
          The company and its notes will be deleted. This can’t be undone.
        </p>
      )}
      {blocked && (
        <Notice tone="error">
          <p>{blocked}</p>
          <p className="mt-2">
            <Link
              to={`/applications?company=${company.id}&status=all`}
              className="underline"
            >
              See {company.name}’s applications
            </Link>
          </p>
        </Notice>
      )}
      {remove.isError && !blocked && (
        <Notice tone="error">
          Could not delete the company. {describeError(remove.error)}
        </Notice>
      )}
      <div className="flex justify-end gap-2">
        <Button data-autofocus onClick={onClose}>
          {blocked ? "Close" : "Cancel"}
        </Button>
        {!blocked && (
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            {remove.isPending ? "Deleting…" : "Delete company"}
          </Button>
        )}
      </div>
    </div>
  );
}
