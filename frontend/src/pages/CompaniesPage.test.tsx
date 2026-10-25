import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { api } from "../api/endpoints";
import { makeApplication, makeCompany } from "../test/fixtures";
import { mockApi } from "../test/mockApi";
import { renderWithProviders } from "../test/render";
import { CompaniesPage } from "./CompaniesPage";

const globex = makeCompany({ id: 2, name: "Globex", notes: "Met at a meetup" });
const acme = makeCompany({
  id: 1,
  name: "Acme Robotics",
  website: "https://acme.example.com",
});

function setup() {
  const spies = mockApi();
  spies.listCompanies.mockResolvedValue([globex, acme]);
  spies.listApplications.mockResolvedValue([
    makeApplication({ company_id: 1 }),
    makeApplication({ company_id: 1 }),
  ]);
  const rendered = renderWithProviders(<CompaniesPage />, {
    route: "/companies",
  });
  return { spies, ...rendered };
}

const addForm = () =>
  within(screen.getByRole("region", { name: "Add a company" }));

describe("CompaniesPage", () => {
  it("lists companies by name with their application counts", async () => {
    setup();
    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(
      rows.map((row) => within(row).getAllByRole("cell")[0].textContent),
    ).toEqual(["Acme Roboticsacme.example.com", "Globex"]);
    expect(
      await within(rows[0]).findByRole("link", { name: "2 applications" }),
    ).toHaveAttribute("href", "/applications?company=1&status=all");
    expect(within(rows[1]).getByText("None")).toBeInTheDocument();
  });

  it("adds a company and clears the form", async () => {
    const { user } = setup();
    const create = vi
      .spyOn(api, "createCompany")
      .mockResolvedValue(makeCompany({ id: 3, name: "Initech" }));

    await user.type(addForm().getByLabelText(/Name/), "  Initech ");
    await user.click(addForm().getByRole("button", { name: "Add company" }));

    expect(create).toHaveBeenCalledWith({
      name: "Initech",
      website: null,
      notes: null,
    });
    expect(await screen.findByText("Added Initech.")).toBeInTheDocument();
    expect(addForm().getByLabelText(/Name/)).toHaveValue("");
  });

  it("says when the name is already taken", async () => {
    const { user } = setup();
    vi.spyOn(api, "createCompany").mockRejectedValue(
      new ApiError(409, "Company already exists"),
    );

    await user.type(addForm().getByLabelText(/Name/), "Globex");
    await user.click(addForm().getByRole("button", { name: "Add company" }));

    expect(
      await addForm().findByText("A company named “Globex” already exists."),
    ).toBeInTheDocument();
  });

  it("edits a company in a dialog, sending only what changed", async () => {
    const { user } = setup();
    const update = vi
      .spyOn(api, "updateCompany")
      .mockResolvedValue({ ...globex, notes: "Second interview soon" });

    await user.click(
      await screen.findByRole("button", { name: "Edit Globex" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Edit Globex" });
    const notes = within(dialog).getByLabelText("Notes");
    await user.clear(notes);
    await user.type(notes, "Second interview soon");
    await user.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );

    expect(update).toHaveBeenCalledWith(2, { notes: "Second interview soon" });
    expect(await screen.findByText("Saved Globex.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explains in plain words why a company with applications can't be deleted", async () => {
    const { user } = setup();
    vi.spyOn(api, "deleteCompany").mockRejectedValue(
      new ApiError(409, "Company has applications. Delete them first."),
    );

    await screen.findByRole("link", { name: "2 applications" });
    await user.click(
      screen.getByRole("button", { name: "Delete Acme Robotics" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Delete Acme Robotics?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Delete company" }),
    );

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Acme Robotics can’t be deleted because it still has 2 applications.",
    );
    expect(
      within(dialog).getByRole("link", {
        name: "See Acme Robotics’s applications",
      }),
    ).toHaveAttribute("href", "/applications?company=1&status=all");
  });

  it("deletes a company that has no applications", async () => {
    const { user } = setup();
    const remove = vi.spyOn(api, "deleteCompany").mockResolvedValue();

    await user.click(
      await screen.findByRole("button", { name: "Delete Globex" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete company",
      }),
    );

    expect(remove).toHaveBeenCalledWith(2);
    expect(await screen.findByText("Deleted Globex.")).toBeInTheDocument();
  });

  it("shows an empty state when there are no companies", async () => {
    mockApi();
    renderWithProviders(<CompaniesPage />, { route: "/companies" });
    expect(await screen.findByText("No companies yet")).toBeInTheDocument();
  });
});
