import { useQuery } from "@tanstack/react-query";
import { describeError } from "../api/client";
import { api } from "../api/endpoints";

// A small indicator in the header: is the backend reachable?
export function ApiStatus() {
  const { isPending, isError, error } = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    retry: false,
    refetchInterval: 30_000,
  });

  let dotColor = "bg-emerald-500";
  let label = "API connected";
  if (isPending) {
    dotColor = "bg-slate-300";
    label = "Checking API…";
  } else if (isError) {
    dotColor = "bg-red-500";
    label = "API unreachable";
  }

  return (
    <p
      role="status"
      className="flex items-center gap-2 text-sm text-slate-600"
      title={isError ? describeError(error) : undefined}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dotColor}`} />
      {label}
    </p>
  );
}
