import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { makeApplication, makeCompany } from "../test/fixtures";
import { mockApi } from "../test/mockApi";
import { renderWithProviders } from "../test/render";
import { ApplicationsPage } from "./ApplicationsPage";

const companies = [
  makeCompany({ id: 1, name: "Acme Robotics" }),
  makeCompany({ id: 2, name: "Globex" }),
];
const backend = makeApplication({
  id: 1,
  company_id: 1,
  title: "Junior Backend Developer",
  status: "applied",
  applied_at: "2026-10-10T12:00:00Z",
  created_at: "2026-10-09T12:00:00Z",
  notes: "Fit: Strong – Python and SQL",
  city: "Tel Aviv",
  work_mode: "hybrid",
  job_url: "https://jobs.example.com/backend",
});
const fullstack = makeApplication({
  id: 2,
  company_id: 2,
  title: "Fullstack Developer",
  position_type: "fullstack",
  status: "saved",
  created_at: "2026-10-12T12:00:00Z",
  notes: "Fit: Good. CV: FullStack.",
});
const qa = makeApplication({
  id: 3,
  company_id: 1,
  title: "QA Engineer",
  position_type: "qa",
  status: "rejected",
  applied_at: "2026-10-01T12:00:00Z",
  created_at: "2026-10-01T12:00:00Z",
  notes: "Fit: Stretch",
});

function setup(route = "/applications") {
  const spies = mockApi();
  spies.listCompanies.mockResolvedValue(companies);
  spies.listApplications.mockResolvedValue([backend, fullstack, qa]);
  return { spies, ...renderWithProviders(<ApplicationsPage />, { route }) };
}

async function rowTitles() {
  const table = await screen.findByRole("table");
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("link")[0].textContent);
}

describe("ApplicationsPage", () => {
  it("shows active applications by default and says how many final ones are hidden", async () => {
    setup();
    expect(await rowTitles()).toEqual([
      "Fullstack Developer",
      "Junior Backend Developer",
    ]);
    expect(
      screen.getByText(/1 with a final status hidden/),
    ).toBeInTheDocument();
  });

  it("shows company, fit, status and dates, with links to the detail page and the posting", async () => {
    setup();
    const link = await screen.findByRole("link", {
      name: "Junior Backend Developer",
    });
    expect(link).toHaveAttribute("href", "/applications/1");
    const row = link.closest("tr");
    if (!row) throw new Error("no row");
    expect(within(row).getByText("Acme Robotics")).toBeInTheDocument();
    expect(within(row).getByText("Fit: Strong")).toBeInTheDocument();
    expect(within(row).getByText("Applied")).toBeInTheDocument();
    expect(within(row).getByText("10 Oct 2026")).toBeInTheDocument();
    expect(within(row).getByText("Tel Aviv")).toBeInTheDocument();
    expect(within(row).getByText("Hybrid")).toBeInTheDocument();

    const posting = within(row).getByRole("link", {
      name: "Job posting for Junior Backend Developer at Acme Robotics (opens in a new tab)",
    });
    expect(posting).toHaveAttribute("href", "https://jobs.example.com/backend");
    expect(posting).toHaveAttribute("target", "_blank");
  });

  it("keeps the status filter in the URL", async () => {
    const { user } = setup();
    await rowTitles();

    await user.selectOptions(screen.getByLabelText("Status"), "all");

    expect(await rowTitles()).toContain("QA Engineer");
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/applications?status=all",
    );
  });

  it("asks the API for one status when one is chosen", async () => {
    const { spies, user } = setup();
    await rowTitles();

    await user.selectOptions(screen.getByLabelText("Status"), "rejected");

    expect(spies.listApplications).toHaveBeenLastCalledWith({
      status: "rejected",
    });
  });

  it("reads the filters from the URL when the page loads", async () => {
    setup("/applications?fit=good");
    expect(await rowTitles()).toEqual(["Fullstack Developer"]);
    expect(screen.getByLabelText("Fit")).toHaveValue("good");
  });

  it("searches by company or title", async () => {
    const { user } = setup();
    await rowTitles();

    await user.type(screen.getByLabelText("Search company or title"), "globex");

    expect(await rowTitles()).toEqual(["Fullstack Developer"]);
    expect(screen.getByTestId("location")).toHaveTextContent("q=globex");
  });

  it("sorts by applied date, with jobs not applied to yet last", async () => {
    const { user } = setup("/applications?status=all");
    await rowTitles();

    await user.selectOptions(screen.getByLabelText("Sort"), "Recently applied");

    expect(await rowTitles()).toEqual([
      "Junior Backend Developer",
      "QA Engineer",
      "Fullstack Developer",
    ]);
  });

  it("offers to clear filters when nothing matches", async () => {
    const { user } = setup("/applications?q=nothing-like-this");

    expect(
      await screen.findByText("No applications match these filters"),
    ).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Clear filters" })[0],
    );

    expect(await rowTitles()).toHaveLength(2);
    expect(screen.getByTestId("location")).toHaveTextContent(
      /^\/applications$/,
    );
  });

  it("shows a friendly empty state before anything is imported", async () => {
    mockApi();
    renderWithProviders(<ApplicationsPage />, { route: "/applications" });
    expect(await screen.findByText("No applications yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Import your daily file" }),
    ).toHaveAttribute("href", "/import");
  });

  it("shows an error with a retry button when loading fails", async () => {
    const spies = mockApi();
    spies.listApplications.mockRejectedValue(
      new ApiError(500, "Internal Server Error"),
    );
    renderWithProviders(<ApplicationsPage />, { route: "/applications" });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not load applications");
    expect(alert).toHaveTextContent("Internal Server Error");
    expect(
      within(alert).getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});
