import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { api } from "../api/endpoints";
import { makeApplication, makeCompany } from "../test/fixtures";
import { mockApi, validationError } from "../test/mockApi";
import { renderWithProviders } from "../test/render";
import { NewApplicationPage } from "./NewApplicationPage";

const acme = makeCompany({ id: 1, name: "Acme Robotics" });

function setup() {
  const spies = mockApi();
  spies.listCompanies.mockResolvedValue([acme]);
  const rendered = renderWithProviders(<NewApplicationPage />, {
    route: "/applications/new",
    path: "/applications/new",
  });
  return { spies, ...rendered };
}

async function fillRequiredFields(user: ReturnType<typeof setup>["user"]) {
  await user.type(
    await screen.findByLabelText(/Job title/),
    "Junior Backend Developer",
  );
  await user.selectOptions(screen.getByLabelText(/Position type/), "backend");
  await user.selectOptions(screen.getByLabelText(/Source/), "linkedin");
  await user.type(
    screen.getByLabelText("Job posting URL"),
    "https://jobs.example.com/new",
  );
}

describe("NewApplicationPage", () => {
  it("adds an application for an existing company and opens it", async () => {
    const { user } = setup();
    const create = vi
      .spyOn(api, "createApplication")
      .mockResolvedValue(makeApplication({ id: 31 }));

    await user.selectOptions(
      await screen.findByLabelText(/Company/),
      "Acme Robotics",
    );
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 1,
        title: "Junior Backend Developer",
        position_type: "backend",
        source: "linkedin",
        job_url: "https://jobs.example.com/new",
        level: "junior",
        employment_type: "full_time",
        skills: [],
      }),
    );
    await vi.waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/applications/31",
      ),
    );
  });

  it("creates a new company first when asked to", async () => {
    const { user } = setup();
    const createCompany = vi
      .spyOn(api, "createCompany")
      .mockResolvedValue(makeCompany({ id: 9, name: "Globex" }));
    const create = vi
      .spyOn(api, "createApplication")
      .mockResolvedValue(makeApplication({ id: 32 }));

    await user.selectOptions(
      await screen.findByLabelText(/Company/),
      "New company…",
    );
    await user.type(screen.getByLabelText(/New company name/), "Globex");
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Add application" }));

    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    expect(createCompany).toHaveBeenCalledWith({ name: "Globex" });
    expect(create.mock.calls[0][0].company_id).toBe(9);
  });

  it("reuses a company that already has the 'new' name", async () => {
    const { user } = setup();
    const createCompany = vi.spyOn(api, "createCompany");
    const create = vi
      .spyOn(api, "createApplication")
      .mockResolvedValue(makeApplication({ id: 33 }));

    await user.selectOptions(
      await screen.findByLabelText(/Company/),
      "New company…",
    );
    await user.type(screen.getByLabelText(/New company name/), "Acme Robotics");
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Add application" }));

    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    expect(createCompany).not.toHaveBeenCalled();
    expect(create.mock.calls[0][0].company_id).toBe(1);
  });

  it("links to the application that already has the job URL", async () => {
    const { spies, user } = setup();
    vi.spyOn(api, "createApplication").mockRejectedValue(
      new ApiError(409, "An application with this job_url already exists"),
    );
    spies.listApplications.mockResolvedValue([makeApplication({ id: 7 })]);

    await user.selectOptions(
      await screen.findByLabelText(/Company/),
      "Acme Robotics",
    );
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(
      await screen.findByText("Another application already has this job URL."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Open the application that already has this URL",
      }),
    ).toHaveAttribute("href", "/applications/7");
  });

  it("shows a 422 that isn't about one field as a message for the form", async () => {
    const { user } = setup();
    vi.spyOn(api, "createApplication").mockRejectedValue(
      validationError({
        loc: ["body"],
        msg: "Value error, salary_min must be less than or equal to salary_max",
      }),
    );

    await user.selectOptions(
      await screen.findByLabelText(/Company/),
      "Acme Robotics",
    );
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "salary_min must be less than or equal to salary_max",
    );
  });

  it("says which required fields are missing before calling the API", async () => {
    const { user } = setup();
    const create = vi.spyOn(api, "createApplication");

    const form = (await screen.findByLabelText(/Company/)).closest("form");
    if (!form) throw new Error("no form");
    // Skip the browser's own `required` check to see the app's messages.
    form.noValidate = true;
    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(
      await screen.findByText("Choose a company, or “New company…”."),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter the job title.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });
});
