import { Link } from "react-router";
import { PageHeader } from "../components/PageHeader";

export function NotFoundPage() {
  return (
    <>
      <PageHeader
        title="Page not found"
        description="There is no page at this address."
      />
      <Link
        to="/applications"
        className="font-medium text-slate-900 underline underline-offset-4"
      >
        Back to the applications
      </Link>
    </>
  );
}
