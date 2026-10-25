import { describe, expect, it } from "vitest";
import { makeApplication } from "../test/fixtures";
import {
  buildCreatePayload,
  buildUpdatePayload,
  EMPTY_FORM,
  formValuesFrom,
} from "./applicationForm";

describe("buildUpdatePayload", () => {
  const application = makeApplication({
    title: "Junior Backend Developer",
    city: "Tel Aviv",
    skills: ["python", "sql"],
    notes: "Fit: Good",
    salary_min: null,
  });

  it("is empty when nothing changed", () => {
    expect(
      buildUpdatePayload(formValuesFrom(application), application),
    ).toEqual({});
  });

  it("contains only the changed fields, in API shape", () => {
    const values = {
      ...formValuesFrom(application),
      title: "  Backend Developer  ",
      city: "",
      salary_min: "12000",
      skills: "python,  sql , docker",
    };
    expect(buildUpdatePayload(values, application)).toEqual({
      title: "Backend Developer",
      city: null,
      salary_min: 12000,
      skills: ["python", "sql", "docker"],
    });
  });

  it("ignores differences that disappear after cleaning up", () => {
    const values = {
      ...formValuesFrom(application),
      skills: "python,sql",
      notes: "Fit: Good   ",
    };
    expect(buildUpdatePayload(values, application)).toEqual({});
  });
});

describe("buildCreatePayload", () => {
  it("lists the required fields that are still empty", () => {
    expect(buildCreatePayload(EMPTY_FORM, 1)).toEqual({
      errors: {
        title: "Enter the job title.",
        position_type: "Choose a position type.",
        source: "Choose where you found the job.",
      },
    });
  });

  it("builds the POST body, with empty optional fields as null", () => {
    const result = buildCreatePayload(
      {
        ...EMPTY_FORM,
        title: "Data Engineer",
        position_type: "data",
        source: "referral",
        skills: "sql, python",
      },
      7,
    );
    expect(result.payload).toEqual({
      company_id: 7,
      title: "Data Engineer",
      position_type: "data",
      level: "junior",
      employment_type: "full_time",
      work_mode: null,
      city: null,
      salary_min: null,
      salary_max: null,
      job_url: null,
      source: "referral",
      skills: ["sql", "python"],
      notes: null,
    });
  });
});
