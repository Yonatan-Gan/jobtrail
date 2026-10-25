import { vi } from "vitest";
import { ApiError } from "../api/client";
import { api } from "../api/endpoints";
import { makeStats, TRANSITIONS } from "./fixtures";

// Replace the API client's functions with spies (vi.spyOn), so pages can be tested
// without a backend. Reads resolve to empty data by default; a test overrides what it
// needs, e.g. spies.listApplications.mockResolvedValue([...]). setup.ts restores the
// real functions after every test.
export function mockApi() {
  return {
    health: vi.spyOn(api, "health").mockResolvedValue({ status: "ok" }),
    statusTransitions: vi
      .spyOn(api, "statusTransitions")
      .mockResolvedValue(TRANSITIONS),
    stats: vi.spyOn(api, "stats").mockResolvedValue(makeStats()),
    listApplications: vi.spyOn(api, "listApplications").mockResolvedValue([]),
    getApplication: vi
      .spyOn(api, "getApplication")
      .mockRejectedValue(new ApiError(404, "Application not found")),
    history: vi.spyOn(api, "history").mockResolvedValue([]),
    listCompanies: vi.spyOn(api, "listCompanies").mockResolvedValue([]),
  };
}

/** A 422 like FastAPI sends: one entry per invalid field. */
export function validationError(
  ...problems: { loc: (string | number)[]; msg: string }[]
) {
  return new ApiError(
    422,
    problems.map((problem) => ({ ...problem, type: "value_error" })),
  );
}
