import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { renderWithProviders } from "./test/render";

function apiIsUp() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ status: "ok" })),
  );
}

describe("App", () => {
  it.each([
    ["/", "Dashboard"],
    ["/applications", "Applications"],
    ["/companies", "Companies"],
    ["/import", "Import"],
    ["/no-such-page", "Page not found"],
  ])("shows the right page at %s", async (route, heading) => {
    apiIsUp();
    renderWithProviders(<App />, { route });
    expect(
      await screen.findByRole("heading", { level: 1, name: heading }),
    ).toBeInTheDocument();
  });

  it("marks only the current page in the navigation", () => {
    apiIsUp();
    renderWithProviders(<App />, { route: "/applications" });

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(
      within(nav).getByRole("link", { name: "Applications" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(nav).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("shows when the API is connected", async () => {
    apiIsUp();
    renderWithProviders(<App />);
    expect(await screen.findByText("API connected")).toBeInTheDocument();
  });

  it("shows when the API can't be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    renderWithProviders(<App />);
    expect(await screen.findByText("API unreachable")).toBeInTheDocument();
  });
});
