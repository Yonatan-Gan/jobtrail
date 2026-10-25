import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { validationError } from "../test/mockApi";
import { formErrors } from "./apiErrors";
import { dateInputToIso } from "./dates";
import { DuplicateJobUrlError } from "./duplicateJobUrl";

describe("formErrors", () => {
  it("puts a 422's field errors next to their fields", () => {
    const error = validationError(
      {
        loc: ["body", "title"],
        msg: "String should have at least 1 character",
      },
      {
        loc: ["body"],
        msg: "Value error, salary_min must be less than or equal to salary_max",
      },
    );
    expect(formErrors(error)).toEqual({
      fields: { title: "String should have at least 1 character" },
      form: "salary_min must be less than or equal to salary_max",
    });
  });

  it("shows other API errors as one message for the form", () => {
    expect(formErrors(new ApiError(409, "Company already exists"))).toEqual({
      fields: {},
      form: "Company already exists",
    });
  });

  it("puts a duplicate job URL on the job URL field", () => {
    expect(formErrors(new DuplicateJobUrlError(3)).fields.job_url).toBe(
      "Another application already has this job URL.",
    );
  });
});

describe("dateInputToIso", () => {
  it("uses noon local time on the chosen day (UTC in the tests)", () => {
    expect(dateInputToIso("2026-10-17")).toBe("2026-10-17T12:00:00.000Z");
  });
});
