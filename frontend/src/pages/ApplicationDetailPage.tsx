import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError, describeError } from "../api/client";
import { api } from "../api/endpoints";
import {
  queryKeys,
  useApplication,
  useCompanies,
  useRefreshApplications,
  useStatusHistory,
  useStatusTransitions,
} from "../api/queries";
import type { Application, ApplicationUpdate } from "../api/types";
import { ApplicationDetails } from "../components/applications/ApplicationDetails";
import { ApplicationForm } from "../components/applications/ApplicationForm";
import { HistoryTimeline } from "../components/applications/HistoryTimeline";
import { StatusActions } from "../components/applications/StatusActions";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FitBadge } from "../components/FitBadge";
import { Notice } from "../components/Notice";
import { PageHeader } from "../components/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/QueryStates";
import { StatusBadge } from "../components/StatusBadge";
import { formErrors, NO_ERRORS } from "../lib/apiErrors";
import {
  buildUpdatePayload,
  formValuesFrom,
  type ApplicationFormValues,
} from "../lib/applicationForm";
import {
  DuplicateJobUrlError,
  withDuplicateCheck,
} from "../lib/duplicateJobUrl";
import { parseFit } from "../lib/fit";
import { useFlashNotice } from "../lib/useFlashNotice";

export function ApplicationDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return <ApplicationNotFound />;
  }
  // key={id}: moving to another application starts with fresh state (no open dialogs).
  return <ApplicationDetail key={id} id={id} />;
}

function ApplicationDetail({ id }: { id: number }) {
  const application = useApplication(id);

  if (application.isPending) {
    return <LoadingState label="Loading application…" />;
  }
  if (application.isError) {
    if (
      application.error instanceof ApiError &&
      application.error.status === 404
    ) {
      return <ApplicationNotFound />;
    }
    return (
      <ErrorState
        title="Could not load this application"
        error={application.error}
        onRetry={() => void application.refetch()}
      />
    );
  }
  return <LoadedApplication application={application.data} />;
}

function LoadedApplication({ application }: { application: Application }) {
  const companies = useCompanies();
  const transitions = useStatusTransitions();
  const history = useStatusHistory(application.id);
  const refresh = useRefreshApplications();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [flash, dismissFlash] = useFlashNotice();
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  const companyName =
    companies.data?.find((company) => company.id === application.company_id)
      ?.name ?? "…";
  const fit = parseFit(application.notes);

  // Leave edit mode and put the keyboard focus back on the "Edit details" button.
  // flushSync renders right away, so the button exists before we focus it.
  function stopEditing(notice: string | null) {
    flushSync(() => {
      setEditing(false);
      setMessage(notice);
    });
    editButtonRef.current?.focus();
  }

  const update = useMutation({
    mutationFn: (changes: ApplicationUpdate) =>
      withDuplicateCheck(changes.job_url, () =>
        api.updateApplication(application.id, changes),
      ),
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKeys.application(updated.id), updated);
      await refresh();
      stopEditing("Saved your changes.");
    },
  });

  function handleSave(values: ApplicationFormValues) {
    const changes = buildUpdatePayload(values, application);
    if (Object.keys(changes).length === 0) {
      stopEditing("Nothing changed, so there was nothing to save.");
      return;
    }
    update.mutate(changes);
  }

  const remove = useMutation({
    mutationFn: () => api.deleteApplication(application.id),
    onSuccess: async () => {
      // Leave the page first, then refresh the lists that still show this application.
      await navigate("/applications", {
        replace: true,
        state: {
          notice: `Deleted “${application.title}” at ${companyName}.`,
        },
      });
      // Refresh only the lists and the stats. Refetching this application's own detail
      // or history would just get a 404, and it isn't shown any more.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.applicationLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
      ]);
    },
  });

  const shownMessage = message ?? flash;

  return (
    <>
      <p className="mb-3 text-sm">
        <Link
          to="/applications"
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          <span aria-hidden="true">← </span>All applications
        </Link>
      </p>
      <PageHeader
        title={application.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{companyName}</span>
            <StatusBadge status={application.status} />
            {fit && <FitBadge fit={fit} />}
          </span>
        }
        actions={
          editing ? undefined : (
            <>
              <Button ref={editButtonRef} onClick={() => setEditing(true)}>
                Edit details
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  remove.reset();
                  setConfirmingDelete(true);
                }}
              >
                Delete
              </Button>
            </>
          )
        }
      />

      {shownMessage && (
        <Notice
          tone="success"
          className="mb-6"
          onDismiss={() => {
            setMessage(null);
            dismissFlash();
          }}
        >
          {shownMessage}
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {editing ? (
            <Card title="Edit details" headingId="edit-heading">
              <ApplicationForm
                initialValues={formValuesFrom(application)}
                companies={companies.data ?? []}
                submitLabel="Save changes"
                isSubmitting={update.isPending}
                errors={update.error ? formErrors(update.error) : NO_ERRORS}
                duplicateOf={
                  update.error instanceof DuplicateJobUrlError
                    ? update.error.existingId
                    : null
                }
                autoFocus
                onSubmit={handleSave}
                onCancel={() => {
                  update.reset();
                  stopEditing(null);
                }}
              />
            </Card>
          ) : (
            <>
              <Card title="Details" headingId="details-heading">
                <ApplicationDetails
                  application={application}
                  companyName={companyName}
                />
              </Card>
              <Card title="Skills" headingId="skills-heading">
                {application.skills.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {application.skills.map((skill) => (
                      <li
                        key={skill}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-sm text-slate-800"
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">No skills listed.</p>
                )}
              </Card>
              <Card title="Notes" headingId="notes-heading">
                {application.notes ? (
                  <p className="whitespace-pre-wrap">{application.notes}</p>
                ) : (
                  <p className="text-sm text-slate-600">No notes.</p>
                )}
              </Card>
            </>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Status" headingId="status-heading">
            {transitions.isPending && (
              <LoadingState label="Loading status options…" />
            )}
            {transitions.isError && (
              <ErrorState
                title="Could not load the status rules"
                error={transitions.error}
                onRetry={() => void transitions.refetch()}
              />
            )}
            {transitions.isSuccess && (
              <StatusActions
                application={application}
                allowed={transitions.data[application.status]}
                onChanged={setMessage}
              />
            )}
          </Card>
          <Card title="History" headingId="history-heading">
            {history.isPending && <LoadingState label="Loading history…" />}
            {history.isError && (
              <ErrorState
                title="Could not load the history"
                error={history.error}
                onRetry={() => void history.refetch()}
              />
            )}
            {history.isSuccess && <HistoryTimeline history={history.data} />}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this application?"
        confirmLabel="Delete application"
        isPending={remove.isPending}
        error={remove.isError ? describeError(remove.error) : undefined}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => remove.mutate()}
      >
        “{application.title}” at {companyName} and its whole status history will
        be deleted. This can’t be undone.
      </ConfirmDialog>
    </>
  );
}

function Card({
  title,
  headingId,
  children,
}: {
  title: string;
  headingId: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 id={headingId} className="mb-3 text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ApplicationNotFound() {
  return (
    <>
      <PageHeader title="Application not found" />
      <EmptyState title="This application doesn’t exist or was deleted.">
        <Link to="/applications" className="text-blue-700 underline">
          Back to the applications
        </Link>
      </EmptyState>
    </>
  );
}
