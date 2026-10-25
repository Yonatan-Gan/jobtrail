import { Link, NavLink, Outlet } from "react-router";
import { ApiStatus } from "./ApiStatus";

// "Applications" stays highlighted on /applications/new and /applications/42 too.
const NAV_ITEMS = [
  { to: "/applications", label: "Applications" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/import", label: "Import" },
  { to: "/companies", label: "Companies" },
];

function navLinkClass({ isActive }: { isActive: boolean }): string {
  const base =
    "rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";
  return isActive
    ? `${base} bg-slate-900 text-white`
    : `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
}

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to main content
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3">
          <Link to="/applications" className="text-lg font-semibold">
            JobTrail
          </Link>
          <nav aria-label="Main">
            <ul className="flex flex-wrap gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  {/* NavLink sets aria-current="page" on the active link. */}
                  <NavLink to={item.to} className={navLinkClass}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto">
            <ApiStatus />
          </div>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-8 focus:outline-none"
      >
        <Outlet />
      </main>
    </div>
  );
}
