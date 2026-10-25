import { useLocation, useNavigate } from "react-router";

/**
 * A one-time message handed to the next page, such as "Deleted …" after deleting an
 * application. The sender puts it in the router state:
 *   navigate("/applications", { state: { notice: "Deleted …" } })
 * and the next page reads it here. Dismissing clears it from the history entry.
 */
export function useFlashNotice(): [string | null, () => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const state: unknown = location.state;
  const notice =
    typeof state === "object" &&
    state !== null &&
    "notice" in state &&
    typeof state.notice === "string"
      ? state.notice
      : null;

  function dismiss() {
    void navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, state: null },
    );
  }

  return [notice, dismiss];
}
