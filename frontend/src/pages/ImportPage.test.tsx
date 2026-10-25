import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { api } from "../api/endpoints";
import { makeApplication } from "../test/fixtures";
import { mockApi, validationError } from "../test/mockApi";
import { renderWithProviders } from "../test/render";
import { ImportPage } from "./ImportPage";

const jobs = [
  {
    company: "Acme Robotics",
    title: "Junior Backend Developer",
    position_type: "backend",
    city: "Tel Aviv",
    job_url: "https://jobs.example.com/1",
    source: "linkedin",
    notes: "Fit: Strong – Python",
  },
  {
    company: "Globex",
    title: "Fullstack Developer",
    position_type: "fullstack",
    city: null,
    job_url: "https://jobs.example.com/2",
    source: "job_board",
    notes: "Fit: Good",
    status: "applied",
  },
];

const jsonFile = (content: string, name = "jobtrail_import_2026-10-25.json") =>
  new File([content], name, { type: "application/json" });

function setup() {
  const spies = mockApi();
  const rendered = renderWithProviders(<ImportPage />, { route: "/import" });
  const input = screen.getByLabelText("Choose a JSON file");
  return { spies, input, ...rendered };
}

describe("ImportPage", () => {
  it("shows a preview of the jobs in the chosen file", async () => {
    const { user, input } = setup();

    await user.upload(input, jsonFile(JSON.stringify(jobs)));

    const preview = await screen.findByRole("region", { name: "Preview" });
    expect(
      within(preview).getByText("jobtrail_import_2026-10-25.json · 2 jobs"),
    ).toBeInTheDocument();
    const rows = within(preview).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      "1Acme RoboticsJunior Backend DeveloperTel AvivFit: StrongSaved",
      "2GlobexFullstack Developer—Fit: GoodApplied",
    ]);
    expect(
      screen.getByRole("button", { name: "Import 2 jobs" }),
    ).toBeInTheDocument();
  });

  it("explains a file that isn't JSON or isn't a list", async () => {
    const { user, input } = setup();

    await user.upload(input, jsonFile("{ not json", "broken.json"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "broken.json: This file isn't valid JSON, so it can't be read.",
    );

    await user.upload(input, jsonFile('{"company": "Acme"}', "object.json"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "should contain a list of jobs",
    );
    expect(
      screen.queryByRole("button", { name: /^Import/ }),
    ).not.toBeInTheDocument();
  });

  it("sends the jobs and shows created, updated and skipped", async () => {
    const { spies, user, input } = setup();
    const importApplications = vi
      .spyOn(api, "importApplications")
      .mockResolvedValue({
        created: 1,
        updated: 0,
        skipped: 1,
        updated_urls: [],
        skipped_urls: ["https://jobs.example.com/2"],
      });
    spies.listApplications.mockResolvedValue([
      makeApplication({
        id: 42,
        title: "Fullstack Developer",
        job_url: "https://jobs.example.com/2",
      }),
    ]);

    await user.upload(input, jsonFile(JSON.stringify(jobs)));
    await user.click(
      await screen.findByRole("button", { name: "Import 2 jobs" }),
    );

    expect(importApplications).toHaveBeenCalledWith(jobs);
    const result = await screen.findByRole("region", {
      name: "Import finished",
    });
    expect(within(result).getByText("Created").nextSibling).toHaveTextContent(
      "1",
    );
    expect(within(result).getByText("Skipped").nextSibling).toHaveTextContent(
      "1",
    );
    expect(
      await within(result).findByRole("link", { name: "Fullstack Developer" }),
    ).toHaveAttribute("href", "/applications/42");
  });

  it("lists a 422's problems by job, and says nothing was imported", async () => {
    const { user, input } = setup();
    vi.spyOn(api, "importApplications").mockRejectedValue(
      validationError({
        loc: ["body", 1, "position_type"],
        msg: "Input should be 'backend', 'frontend' or 'fullstack'",
      }),
    );

    await user.upload(input, jsonFile(JSON.stringify(jobs)));
    await user.click(
      await screen.findByRole("button", { name: "Import 2 jobs" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Nothing was imported");
    expect(alert).toHaveTextContent(
      "Job 2 (Globex – Fullstack Developer): position_type: Input should be 'backend', 'frontend' or 'fullstack'",
    );
  });

  it("shows other errors as they are", async () => {
    const { user, input } = setup();
    vi.spyOn(api, "importApplications").mockRejectedValue(
      new ApiError(
        409,
        "Import conflicts with existing data; nothing was imported",
      ),
    );

    await user.upload(input, jsonFile(JSON.stringify(jobs)));
    await user.click(
      await screen.findByRole("button", { name: "Import 2 jobs" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Import conflicts with existing data",
    );
  });

  it("accepts a file dropped on the page", async () => {
    setup();

    fireEvent.drop(screen.getByTestId("drop-zone"), {
      dataTransfer: { files: [jsonFile(JSON.stringify(jobs))] },
    });

    expect(
      await screen.findByRole("button", { name: "Import 2 jobs" }),
    ).toBeInTheDocument();
  });
});
