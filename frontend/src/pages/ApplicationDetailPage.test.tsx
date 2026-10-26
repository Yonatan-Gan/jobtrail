import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { api } from "../api/endpoints";
import type { Application } from "../api/types";
import {
  makeApplication,
  makeCompany,
  makeStatusChange,
} from "../test/fixtures";
import { mockApi, validationError } from "../test/mockApi";
import { renderWithProviders } from "../test/render";
import { ApplicationDetailPage } from "./ApplicationDetailPage";

const company = makeCompany({ id: 1, name: "Acme Robotics" });

const saved = makeApplication({
  id: 5,
  company_id: 1,
  title: "Junior Backend Developer",
  status: "saved",
  skills: ["python", "fastapi"],
  notes: "Fit: Strong – the stack matches.\nCV: Backend.",
  salary_min: 15000,
  salary_max: 18000,
});

function setup(application: Application) {
  const spies = mockApi();
  spies.listCompanies.mockResolvedValue([company]);
  spies.getApplication.mockResolvedValue(application);
  spies.history.mockResolvedValue([
    makeStatusChange({
      to_status: "saved",
      changed_at: "2026-10-10T12:00:00Z",
    }),
  ]);
  const rendered = renderWithProviders(<ApplicationDetailPage />, {
    route: `/applications/${application.id}`,
    path: "/applications/:id",
  });
  return { spies, ...rendered };
}

const statusButtons = () =>
  within(screen.getByRole("list", { name: "Move to another status" }))
    .getAllByRole("button")
    .map((button) => button.textContent);

describe("ApplicationDetailPage", () => {
  it("shows every field, the skills as chips, the full notes and the history", async () => {
    setup(saved);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Junior Backend Developer",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("15,000–18,000 NIS / month")).toBeInTheDocument();
    const skills = screen.getByRole("region", { name: "Skills" });
    expect(
      within(skills)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["python", "fastapi"]);
    expect(screen.getByText(/CV: Backend\./)).toBeInTheDocument();
    const history = await screen.findByRole("region", { name: "History" });
    expect(within(history).getByText("added to JobTrail")).toBeInTheDocument();
  });

  it("offers only the moves GET /meta/status-transitions allows", async () => {
    setup(saved);
    await screen.findByRole("button", { name: "Mark applied now" });
    expect(statusButtons()).toEqual([
      "Applied, with a note or date…",
      "Withdrawn…",
    ]);
  });

  it("offers different moves for another status, without 'Mark applied'", async () => {
    setup({ ...saved, status: "applied" });
    await screen.findByRole("list", { name: "Move to another status" });
    expect(statusButtons()).toEqual([
      "Screening…",
      "Assignment…",
      "Technical…",
      "Rejected…",
      "Withdrawn…",
      "Ghosted…",
    ]);
    expect(
      screen.queryByRole("button", { name: "Mark applied now" }),
    ).not.toBeInTheDocument();
  });

  it("marks a saved application as applied with one click and refreshes", async () => {
    const { spies, user } = setup(saved);
    const changeStatus = vi
      .spyOn(api, "changeStatus")
      .mockResolvedValue(makeStatusChange({ to_status: "applied" }));

    await user.click(
      await screen.findByRole("button", { name: "Mark applied now" }),
    );

    expect(changeStatus).toHaveBeenCalledWith(5, { to_status: "applied" });
    expect(await screen.findByText("Marked as applied.")).toBeInTheDocument();
    expect(spies.getApplication).toHaveBeenCalledTimes(2);
    expect(spies.history).toHaveBeenCalledTimes(2);
  });

  it("moves to another status with a note and a backdated day", async () => {
    const { user } = setup({ ...saved, status: "applied" });
    const changeStatus = vi
      .spyOn(api, "changeStatus")
      .mockResolvedValue(makeStatusChange({ to_status: "screening" }));

    await user.click(await screen.findByRole("button", { name: "Screening…" }));
    const dialog = screen.getByRole("dialog", { name: "Move to Screening" });
    await user.type(
      within(dialog).getByLabelText("Note (optional)"),
      "Phone screen with HR",
    );
    fireEvent.change(within(dialog).getByLabelText("Date (optional)"), {
      target: { value: "2026-10-17" },
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Move to Screening" }),
    );

    expect(changeStatus).toHaveBeenCalledWith(5, {
      to_status: "screening",
      note: "Phone screen with HR",
      changed_at: "2026-10-17T12:00:00.000Z",
    });
    expect(await screen.findByText("Moved to Screening.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the status dialog with Esc without saving", async () => {
    const { user } = setup({ ...saved, status: "applied" });
    const changeStatus = vi.spyOn(api, "changeStatus");
    const button = await screen.findByRole("button", { name: "Screening…" });

    await user.click(button);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    expect(changeStatus).not.toHaveBeenCalled();
  });

  it("shows the API's 409 message when a move is refused", async () => {
    const { user } = setup({ ...saved, status: "applied" });
    vi.spyOn(api, "changeStatus").mockRejectedValue(
      new ApiError(409, "Cannot move from 'applied' to 'screening'"),
    );

    await user.click(await screen.findByRole("button", { name: "Screening…" }));
    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Move to Screening" }),
    );

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "The change was not saved. Cannot move from 'applied' to 'screening'",
    );
  });

  it.each([
    [
      "before the latest change",
      "2026-10-19",
      "This change can't be dated before the latest status change (applied on 2026-10-20 at 09:00 UTC).",
    ],
    [
      "in the future",
      "2099-12-01",
      "A status change can't be dated in the future (2099-12-01 12:00 UTC is later than now).",
    ],
  ])(
    "shows the API's 422 for a date %s next to the date field",
    async (_, day, message) => {
      const { user } = setup({ ...saved, status: "applied" });
      vi.spyOn(api, "changeStatus").mockRejectedValue(
        validationError({ loc: ["body", "changed_at"], msg: message }),
      );

      await user.click(
        await screen.findByRole("button", { name: "Screening…" }),
      );
      const dialog = screen.getByRole("dialog", { name: "Move to Screening" });
      const date = within(dialog).getByLabelText("Date (optional)");
      fireEvent.change(date, { target: { value: day } });
      await user.click(
        within(dialog).getByRole("button", { name: "Move to Screening" }),
      );

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "The change was not saved.",
      );
      expect(date).toHaveAttribute("aria-invalid", "true");
      expect(date).toHaveAccessibleDescription(
        expect.stringContaining(message),
      );
    },
  );

  it("explains why 'Mark applied now' was refused", async () => {
    const { user } = setup(saved);
    vi.spyOn(api, "changeStatus").mockRejectedValue(
      validationError({
        loc: ["body", "changed_at"],
        msg: "This change can't be dated before the latest status change (saved on 2026-10-27 at 09:00 UTC).",
      }),
    );

    await user.click(
      await screen.findByRole("button", { name: "Mark applied now" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not mark as applied: This change can't be dated before the latest status change",
    );
  });

  it("explains that a final status allows no more changes", async () => {
    setup({ ...saved, status: "rejected" });
    expect(
      await screen.findByText(/Rejected is a final status/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Move to another status" }),
    ).not.toBeInTheDocument();
  });

  it("saves only the fields that changed", async () => {
    const { user } = setup(saved);
    const update = vi.spyOn(api, "updateApplication").mockResolvedValue({
      ...saved,
      title: "Backend Developer",
      city: "Haifa",
    });

    await user.click(
      await screen.findByRole("button", { name: "Edit details" }),
    );
    expect(screen.getByRole("heading", { name: "Edit details" })).toHaveFocus();
    const title = screen.getByLabelText(/Job title/);
    await user.clear(title);
    await user.type(title, "Backend Developer");
    await user.clear(screen.getByLabelText("City"));
    await user.type(screen.getByLabelText("City"), "Haifa");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(update).toHaveBeenCalledWith(5, {
      title: "Backend Developer",
      city: "Haifa",
    });
    expect(await screen.findByText("Saved your changes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit details" })).toHaveFocus();
  });

  it("shows a 422 field error next to its field", async () => {
    const { user } = setup(saved);
    vi.spyOn(api, "updateApplication").mockRejectedValue(
      validationError({
        loc: ["body", "title"],
        msg: "String should have at most 200 characters",
      }),
    );

    await user.click(
      await screen.findByRole("button", { name: "Edit details" }),
    );
    await user.type(screen.getByLabelText(/Job title/), " (updated)");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const title = await screen.findByLabelText(/Job title/);
    await vi.waitFor(() =>
      expect(title).toHaveAttribute("aria-invalid", "true"),
    );
    expect(title).toHaveAccessibleDescription(
      // The ⚠ icon is aria-hidden, so it is not part of what a screen reader says.
      "String should have at most 200 characters",
    );
  });

  it("shows the salary range error next to the salary field", async () => {
    const { user } = setup(saved);
    vi.spyOn(api, "updateApplication").mockRejectedValue(
      validationError({
        loc: ["body", "salary_min"],
        msg: "salary_min must be less than or equal to salary_max",
      }),
    );

    await user.click(
      await screen.findByRole("button", { name: "Edit details" }),
    );
    const salaryFrom = screen.getByLabelText("Salary from (NIS / month)");
    await user.clear(salaryFrom);
    await user.type(salaryFrom, "25000");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await vi.waitFor(() =>
      expect(salaryFrom).toHaveAttribute("aria-invalid", "true"),
    );
    expect(salaryFrom).toHaveAccessibleDescription(
      "salary_min must be less than or equal to salary_max",
    );
  });

  it("links to the application that already has the job URL", async () => {
    const { spies, user } = setup(saved);
    vi.spyOn(api, "updateApplication").mockRejectedValue(
      new ApiError(409, "An application with this job_url already exists"),
    );
    spies.listApplications.mockResolvedValue([makeApplication({ id: 77 })]);

    await user.click(
      await screen.findByRole("button", { name: "Edit details" }),
    );
    const url = screen.getByLabelText("Job posting URL");
    await user.clear(url);
    await user.type(url, "https://jobs.example.com/taken");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByRole("link", {
        name: "Open the application that already has this URL",
      }),
    ).toHaveAttribute("href", "/applications/77");
    expect(spies.listApplications).toHaveBeenCalledWith({
      job_url: "https://jobs.example.com/taken",
    });
  });

  it("deletes after confirming and goes back to the list", async () => {
    const { user } = setup(saved);
    const remove = vi.spyOn(api, "deleteApplication").mockResolvedValue();

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", {
      name: "Delete this application?",
    });
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus();
    await user.click(
      within(dialog).getByRole("button", { name: "Delete application" }),
    );

    expect(remove).toHaveBeenCalledWith(5);
    await vi.waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        /^\/applications$/,
      ),
    );
  });

  it("says so when the application doesn't exist", async () => {
    const spies = mockApi();
    spies.getApplication.mockRejectedValue(
      new ApiError(404, "Application not found"),
    );
    renderWithProviders(<ApplicationDetailPage />, {
      route: "/applications/999",
      path: "/applications/:id",
    });
    expect(
      await screen.findByRole("heading", { name: "Application not found" }),
    ).toBeInTheDocument();
  });
});
