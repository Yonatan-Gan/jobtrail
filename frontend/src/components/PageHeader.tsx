interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {/* React 19 moves <title> into the document <head>: the browser tab shows the page name. */}
      <title>{`${title} · JobTrail`}</title>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-slate-600">{description}</p>}
    </header>
  );
}
