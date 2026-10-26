import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../api/endpoints";
import { useRefreshApplications } from "../../api/queries";
import type { Application, Status } from "../../api/types";
import { errorMessage, formErrors, NO_ERRORS } from "../../lib/apiErrors";
import { changedAtForDay } from "../../lib/dates";
import { enumLabel, formatDate } from "../../lib/format";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { TextAreaField, TextField } from "../FormFields";
import { Notice } from "../Notice";

interface StatusActionsProps {
  application: Application;
  /** The next statuses GET /meta/status-transitions allows from the current one. */
  allowed: Status[];
  /** When the latest status change happened (the last history row), if known. */
  latestChange: string | null;
  onChanged: (message: string) => void;
}

// The status buttons. Nothing here knows the rules: the buttons are exactly the list the
// backend allows, and the backend checks the move again (409 if it isn't allowed).
export function StatusActions({
  application,
  allowed,
  latestChange,
  onChanged,
}: StatusActionsProps) {
  const [target, setTarget] = useState<Status | null>(null);
  const refresh = useRefreshApplications();

  const markApplied = useMutation({
    mutationFn: () =>
      api.changeStatus(application.id, { to_status: "applied" }),
    onSuccess: async () => {
      await refresh();
      onChanged("Marked as applied.");
    },
  });

  if (allowed.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        {enumLabel(application.status)} is a final status, so no more changes
        are possible.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {allowed.includes("applied") && (
        <Button
          variant="primary"
          className="w-full"
          disabled={markApplied.isPending}
          onClick={() => markApplied.mutate()}
        >
          {markApplied.isPending ? "Saving…" : "Mark applied now"}
        </Button>
      )}
      {markApplied.isError && (
        <Notice tone="error">
          Could not mark as applied: {errorMessage(markApplied.error)}
        </Notice>
      )}
      <ul className="flex flex-wrap gap-2" aria-label="Move to another status">
        {allowed.map((status) => (
          <li key={status}>
            <Button onClick={() => setTarget(status)}>
              {statusButtonLabel(status, application.status)}
            </Button>
          </li>
        ))}
      </ul>
      <Dialog
        open={target !== null}
        onClose={() => setTarget(null)}
        title={target ? `Move to ${enumLabel(target)}` : ""}
        description={`Now: ${enumLabel(application.status)}.`}
      >
        {target && (
          <StatusChangeForm
            applicationId={application.id}
            target={target}
            latestChange={latestChange}
            onCancel={() => setTarget(null)}
            onDone={() => {
              setTarget(null);
              onChanged(`Moved to ${enumLabel(target)}.`);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

// "…" says the button opens a dialog. "Applied" also has the one-click button above,
// so its dialog version says what it adds.
function statusButtonLabel(status: Status, current: Status): string {
  if (status === "applied") {
    return "Applied, with a note or date…";
  }
  if (status === current) {
    return `${enumLabel(status)} again…`;
  }
  return `${enumLabel(status)}…`;
}

interface StatusChangeFormProps {
  applicationId: number;
  target: Status;
  latestChange: string | null;
  onCancel: () => void;
  onDone: () => void;
}

function StatusChangeForm({
  applicationId,
  target,
  latestChange,
  onCancel,
  onDone,
}: StatusChangeFormProps) {
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const refresh = useRefreshApplications();

  const change = useMutation({
    mutationFn: () =>
      api.changeStatus(applicationId, {
        to_status: target,
        note: note.trim() || null,
        changed_at: date ? changedAtForDay(date, latestChange) : null,
      }),
    onSuccess: async () => {
      await refresh();
      onDone();
    },
  });
  // A 422 says which field is wrong, for example a date before the latest change.
  const errors = change.error ? formErrors(change.error) : NO_ERRORS;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        change.mutate();
      }}
    >
      <TextAreaField
        label="Note (optional)"
        rows={3}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        error={errors.fields.note}
        data-autofocus
      />
      <TextField
        label="Date (optional)"
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        error={errors.fields.changed_at}
        hint={
          latestChange
            ? `Leave empty to use the current time, or pick the day it happened. The latest change was on ${formatDate(latestChange)}.`
            : "Leave empty to use the current time, or pick the day it happened."
        }
      />
      {change.isError && (
        <Notice tone="error">
          The change was not saved.{errors.form ? ` ${errors.form}` : ""}
        </Notice>
      )}
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={change.isPending}>
          {change.isPending ? "Saving…" : `Move to ${enumLabel(target)}`}
        </Button>
      </div>
    </form>
  );
}
