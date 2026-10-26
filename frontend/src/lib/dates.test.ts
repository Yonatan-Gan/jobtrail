import { describe, expect, it } from "vitest";
import { changedAtForDay, dateInputToIso } from "./dates";

// The tests run in UTC (vite.config.ts), so local times below are UTC times.
const now = new Date("2026-10-26T08:30:00Z");

describe("dateInputToIso", () => {
  it("uses noon local time on the chosen day", () => {
    expect(dateInputToIso("2026-10-17")).toBe("2026-10-17T12:00:00.000Z");
  });
});

describe("changedAtForDay", () => {
  it("uses noon on an earlier day", () => {
    expect(changedAtForDay("2026-10-17", null, now)).toBe(
      "2026-10-17T12:00:00.000Z",
    );
  });

  it("uses the current time for today, because noon could still be ahead", () => {
    expect(changedAtForDay("2026-10-26", null, now)).toBe(
      "2026-10-26T08:30:00.000Z",
    );
  });

  it("goes just after the latest change when that was later the same day", () => {
    expect(changedAtForDay("2026-10-20", "2026-10-20T15:00:00Z", now)).toBe(
      "2026-10-20T15:01:00.000Z",
    );
  });

  it("keeps noon when the latest change was earlier that day", () => {
    expect(changedAtForDay("2026-10-20", "2026-10-20T09:00:00Z", now)).toBe(
      "2026-10-20T12:00:00.000Z",
    );
  });

  it("leaves a day before the latest change alone: the API explains the refusal", () => {
    expect(changedAtForDay("2026-10-19", "2026-10-20T15:00:00Z", now)).toBe(
      "2026-10-19T12:00:00.000Z",
    );
  });
});
