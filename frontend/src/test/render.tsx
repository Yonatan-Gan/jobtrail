import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

interface RenderOptions {
  /** The URL the test starts at, for example "/applications?fit=good". */
  route?: string;
  /** A route pattern such as "/applications/:id", for pages that read URL parameters. */
  path?: string;
}

// Render with the same providers as main.tsx, but a fresh query cache per test and an
// in-memory router. Returns a user-event `user` for clicking and typing.
export function renderWithProviders(
  ui: ReactElement,
  { route = "/", path }: RenderOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        {path ? (
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={null} />
          </Routes>
        ) : (
          ui
        )}
        <LocationDisplay />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, user, queryClient };
}

/** Where the router is now. Tests read it with screen.getByTestId("location"). */
function LocationDisplay() {
  const location = useLocation();
  return (
    <output data-testid="location" hidden>
      {location.pathname + location.search}
    </output>
  );
}
