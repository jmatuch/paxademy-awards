import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { getHistoryRange, TIMEZONE } from "./time.js";

const fixedNow = DateTime.fromISO("2026-03-15T12:00:00", { zone: TIMEZONE });

describe("getHistoryRange", () => {
  it("ytd starts Jan 1 this year and ends now", () => {
    const { start, end } = getHistoryRange("ytd", fixedNow);
    expect(start?.toISODate()).toBe("2026-01-01");
    expect(start?.hour).toBe(0);
    expect(end?.toMillis()).toBe(fixedNow.toMillis());
  });

  it("lastMonth is the full previous calendar month (half-open)", () => {
    const { start, end } = getHistoryRange("lastMonth", fixedNow);
    expect(start?.toISODate()).toBe("2026-02-01");
    expect(end?.toISODate()).toBe("2026-03-01");
  });

  it("lastMonth crosses a year boundary correctly from January", () => {
    const jan = DateTime.fromISO("2026-01-15T12:00:00", { zone: TIMEZONE });
    const { start, end } = getHistoryRange("lastMonth", jan);
    expect(start?.toISODate()).toBe("2025-12-01");
    expect(end?.toISODate()).toBe("2026-01-01");
  });

  it("lastYear is the full previous calendar year (half-open)", () => {
    const { start, end } = getHistoryRange("lastYear", fixedNow);
    expect(start?.toISODate()).toBe("2025-01-01");
    expect(end?.toISODate()).toBe("2026-01-01");
  });

  it("allTime has no bounds", () => {
    const { start, end } = getHistoryRange("allTime", fixedNow);
    expect(start).toBeNull();
    expect(end).toBeNull();
  });

  it("all ranges are computed in America/Chicago", () => {
    const { start } = getHistoryRange("ytd", fixedNow);
    expect(start?.zoneName).toBe(TIMEZONE);
  });
});
