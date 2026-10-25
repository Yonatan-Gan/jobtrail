// Shared button looks, as class strings, so links that look like buttons can use them too.

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-700",
  secondary:
    "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100",
  danger: "bg-red-700 text-white hover:bg-red-800",
  ghost: "text-slate-700 underline-offset-4 hover:bg-slate-100",
};

export function buttonClasses(variant: ButtonVariant = "secondary"): string {
  return `${BASE} ${VARIANTS[variant]}`;
}
