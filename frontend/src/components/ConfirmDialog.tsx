import type { ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Notice } from "./Notice";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
  error?: ReactNode;
}

// "Are you sure?" for destructive actions. Focus starts on Cancel, so pressing Enter
// by accident does nothing harmful.
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  isPending = false,
  error,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} description={children}>
      {error && (
        <Notice tone="error" className="mb-4">
          {error}
        </Notice>
      )}
      <div className="flex justify-end gap-2">
        <Button data-autofocus onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isPending}>
          {isPending ? "Working…" : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
