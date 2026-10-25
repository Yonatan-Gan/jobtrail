import { describe, expect, it } from "vitest";
import { makeApplication } from "../test/fixtures";
import { parseFit } from "./fit";
import {
  apiFiltersFor,
  DEFAULT_FILTERS,
  filtersFromParams,
  paramsFromFilters,
  sortApplications,
  visibleApplications,
} from "./listFilters";

describe("filtersFromParams / paramsFromFilters", () => {
  it("uses the defaults for an empty query string", () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual(DEFAULT_FILTERS);
    expect(paramsFromFilters(DEFAULT_FILTERS).toString()).toBe("");
  });

  it("reads valid values and writes them back unchanged", () => {
    const query =
      "status=rejected&type=backend&company=3&fit=strong&q=acme&sort=applied-asc";
    const filters = filtersFromParams(new URLSearchParams(query));
    expect(filters).toEqual({
      status: "rejected",
      type: "backend",
      company: 3,
      fit: "strong",
      q: "acme",
      sort: "applied-asc",
    });
    expect(paramsFromFilters(filters).toString()).toBe(query);
  });

  it("ignores values it does not know", () => {
    const filters = filtersFromParams(
      new URLSearchParams(
        "status=dreaming&type=wizard&company=-1&fit=meh&sort=x",
      ),
    );
    expect(filters).toEqual(DEFAULT_FILTERS);
  });
});

describe("apiFiltersFor", () => {
  it("sends only what GET /applications understands", () => {
    expect(apiFiltersFor(DEFAULT_FILTERS)).toEqual({});
    expect(
      apiFiltersFor({
        ...DEFAULT_FILTERS,
        status: "applied",
        type: "qa",
        company: 7,
        fit: "good",
        q: "x",
      }),
    ).toEqual({ status: "applied", position_type: "qa", company_id: 7 });
  });
});

describe("visibleApplications", () => {
  const acme = makeApplication({
    id: 1,
    company_id: 1,
    title: "Backend Developer",
    status: "applied",
    notes: "Fit: Strong – Python",
  });
  const globex = makeApplication({
    id: 2,
    company_id: 2,
    title: "Fullstack Developer",
    status: "saved",
    notes: null,
  });
  const rejected = makeApplication({
    id: 3,
    company_id: 1,
    title: "QA Engineer",
    status: "rejected",
    notes: "fit: stretch",
  });
  const context = {
    finals: new Set(["rejected" as const]),
    companyNames: new Map([
      [1, "Acme Robotics"],
      [2, "Globex"],
    ]),
  };
  const all = [acme, globex, rejected];
  const titles = (filters: Partial<typeof DEFAULT_FILTERS>) =>
    visibleApplications(all, { ...DEFAULT_FILTERS, ...filters }, context).map(
      (application) => application.title,
    );

  it("hides final statuses only for the 'active' filter", () => {
    expect(titles({})).not.toContain("QA Engineer");
    expect(titles({ status: "all" })).toContain("QA Engineer");
  });

  it("filters by fit, including 'no fit noted'", () => {
    expect(titles({ status: "all", fit: "stretch" })).toEqual(["QA Engineer"]);
    expect(titles({ fit: "none" })).toEqual(["Fullstack Developer"]);
  });

  it("searches the title and the company name, ignoring case", () => {
    expect(titles({ q: "  GLOBEX " })).toEqual(["Fullstack Developer"]);
    expect(titles({ q: "backend" })).toEqual(["Backend Developer"]);
  });
});

describe("sortApplications", () => {
  const early = makeApplication({
    id: 1,
    created_at: "2026-10-01T12:00:00Z",
    applied_at: "2026-10-05T12:00:00Z",
  });
  const late = makeApplication({
    id: 2,
    created_at: "2026-10-03T12:00:00Z",
    applied_at: "2026-10-04T12:00:00Z",
  });
  const notApplied = makeApplication({
    id: 3,
    created_at: "2026-10-02T12:00:00Z",
    applied_at: null,
  });
  const ids = (sort: Parameters<typeof sortApplications>[1]) =>
    sortApplications([early, late, notApplied], sort).map((a) => a.id);

  it("sorts by date added", () => {
    expect(ids("added-desc")).toEqual([2, 3, 1]);
    expect(ids("added-asc")).toEqual([1, 3, 2]);
  });

  it("sorts by date applied, with jobs not applied to yet last", () => {
    expect(ids("applied-desc")).toEqual([1, 2, 3]);
    expect(ids("applied-asc")).toEqual([2, 1, 3]);
  });
});

describe("parseFit", () => {
  it("reads the fit word from the notes", () => {
    expect(parseFit("Fit: Good – React and Node. CV: FullStack.")).toBe("good");
    expect(parseFit("fit:STRONG")).toBe("strong");
    expect(parseFit("Applied with the FullStack CV")).toBeNull();
    expect(parseFit(null)).toBeNull();
  });
});
