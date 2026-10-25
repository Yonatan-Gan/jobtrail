import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { makeStats } from "../test/fixtures";
import { mockApi } from "../test/mockApi";
import { renderWithProviders } from "../test/render";
import { DashboardPage } from "./DashboardPage";

const stats = makeStats({
  applied: 5,
  responded: 4,
  response_rate: 0.8,
  avg_days_to_first_response: 7.625,
  funnel: [
    { stage: "applied", count: 5 },
    { stage: "screening", count: 3 },
    { stage: "assignment", count: 2 },
    { stage: "technical", count: 2 },
    { stage: "final", count: 1 },
    { stage: "offer", count: 1 },
  ],
});

function setup(data = stats) {
  const spies = mockApi();
  spies.stats.mockResolvedValue(data);
  return renderWithProviders(<DashboardPage />, { route: "/dashboard" });
}

/** The value shown under a stat tile's label. */
function tileValue(label: string) {
  return screen.getByText(label, { selector: "dt" }).nextElementSibling;
}

describe("DashboardPage", () => {
  it("shows the numbers from GET /stats", async () => {
    setup();
    await screen.findByText("Applied", { selector: "dt" });
    expect(tileValue("Applied")).toHaveTextContent("5");
    expect(tileValue("Responded")).toHaveTextContent("4");
    expect(tileValue("Response rate")).toHaveTextContent("80%");
    expect(tileValue("Days to first reply")).toHaveTextContent("7.6");
  });

  it("draws the funnel with each stage's count and share of applied", async () => {
    setup();
    const funnel = await screen.findByRole("region", {
      name: "How far applications got",
    });
    const rows = within(funnel).getAllByRole("listitem");
    expect(rows).toHaveLength(6);
    // Each row carries visually hidden text with the count and share, for screen readers.
    expect(within(rows[1]).getByText("Screening")).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent(/3 applications, 60% of applied/);
  });

  it("has the same numbers as a table", async () => {
    setup();
    const table = await screen.findByRole("table", {
      name: "Applications per stage",
    });
    const offer = within(table).getByRole("rowheader", { name: "Offer" });
    const cells = within(offer.closest("tr") as HTMLElement).getAllByRole(
      "cell",
    );
    expect(cells.map((cell) => cell.textContent)).toEqual(["1", "20%"]);
  });

  it("explains the empty funnel before anything is applied", async () => {
    setup(makeStats());
    expect(await screen.findByText("Nothing to show yet")).toBeInTheDocument();
    expect(tileValue("Response rate")).toHaveTextContent("—");
    expect(tileValue("Days to first reply")).toHaveTextContent("—");
    expect(screen.getByText("No replies yet")).toBeInTheDocument();
  });

  it("shows an error with a retry button", async () => {
    const spies = mockApi();
    spies.stats.mockRejectedValue(new ApiError(500, "Internal Server Error"));
    renderWithProviders(<DashboardPage />, { route: "/dashboard" });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load the stats",
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});
