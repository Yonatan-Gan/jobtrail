import type { ReactNode } from "react";

type Tone = "success" | "info" | "error";

const TONES: Record<Tone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  info: "border-slate-200 bg-white text-slate-800",
  error: "border-red-200 bg-red-50 text-red-900",
};

interface NoticeProps {
  tone?: Tone;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

// A message box. Errors use role="alert" (read out at once), everything else
// role="status" (read out when the screen reader is free). The dismiss button sits
// outside that region, so it isn't read out as part of the message.
export function Notice({
  tone = "info",
  children,
  onDismiss,
  className = "",
}: NoticeProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${TONES[tone]} ${className}`}
    >
      <div
        role={tone === "error" ? "alert" : "status"}
        className="min-w-0 flex-1"
      >
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded px-1 leading-none text-current hover:bg-black/5"
          aria-label="Dismiss message"
        >
          ×
        </button>
      )}
    </div>
  );
}
