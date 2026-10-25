import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import { mockApi } from "./test/mockApi";
import { renderWithProviders } from "./test/render";

describe("App", () => {
  it.each([
    ["/applications", "Applications"],
    ["/dashboard", "Dashboard"],
    ["/import", "Import"],
    ["/companies", "Companies"],
    ["/no-such-page", "Page not found"],
  ])("shows the right page at %s", async (route, heading) => {
    mockApi();
    renderWithProviders(<App />, { route });
    expect(
      await screen.findByRole("heading", { level: 1, name: heading }),
    ).toBeInTheDocument();
  });

  it("opens the applications list as the home page", async () => {
    mockApi();
    renderWithProviders(<App />, { route: "/" });
    expect(
      await screen.findByRole("heading", { level: 1, name: "Applications" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/applications");
  });

  it("marks only the current section in the navigation", () => {
    mockApi();
    renderWithProviders(<App />, { route: "/applications?status=all" });

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(
      within(nav).getByRole("link", { name: "Applications" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(nav).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("shows when the API is connected", async () => {
    mockApi();
    renderWithProviders(<App />, { route: "/dashboard" });
    expect(await screen.findByText("API connected")).toBeInTheDocument();
  });

  it("shows when the API can't be reached", async () => {
    const spies = mockApi();
    spies.health.mockRejectedValue(new TypeError("Failed to fetch"));
    renderWithProviders(<App />, { route: "/dashboard" });
    expect(await screen.findByText("API unreachable")).toBeInTheDocument();
  });
});
