import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Buttons or links shown next to the title, such as "Add application". */
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      {/* React 19 moves <title> into the document <head>: the browser tab shows the page name. */}
      <title>{`${title} · JobTrail`}</title>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight break-words">
          {title}
        </h1>
        {description && <p className="mt-1 text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
