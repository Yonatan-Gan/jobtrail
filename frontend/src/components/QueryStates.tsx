import type { ReactNode } from "react";
import { describeError } from "../api/client";
import { Button } from "./Button";

// The three states every page needs besides "here is your data".

export function LoadingState({ label }: { label: string }) {
  return (
    <p role="status" className="py-8 text-slate-600">
      {label}
    </p>
  );
}

interface ErrorStateProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}

export function ErrorState({
  error,
  title = "Something went wrong",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm">{describeError(error)}</p>
      {onRetry && (
        <Button className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
}

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="font-medium">{title}</p>
      {children && (
        <div className="mt-2 text-sm text-slate-600">{children}</div>
      )}
    </div>
  );
}
