import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import {
  getHistoryRange,
  isFirstOfMonth,
  isJan1,
  monthlyRecapJobKey,
  shouldRunSixAmJob,
  thisDateJobKey,
  thisDateMatch,
  TIMEZONE,
  yearlyTop3JobKey,
} from "./time.js";

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

describe("shouldRunSixAmJob", () => {
  it("is true at 6am local", () => {
    const now = DateTime.fromObject(
      { year: 2026, month: 6, day: 15, hour: 6 },
      { zone: TIMEZONE },
    );
    expect(shouldRunSixAmJob(now)).toBe(true);
  });

  it("is false outside 6am local", () => {
    const now = DateTime.fromObject(
      { year: 2026, month: 6, day: 15, hour: 7 },
      { zone: TIMEZONE },
    );
    expect(shouldRunSixAmJob(now)).toBe(false);
  });

  it("exactly one of the two UTC cron firings matches 6am local on a DST spring-forward day", () => {
    // Mar 8 2026 is the US spring-forward date; CDT (UTC-5) begins that day.
    const at11utc = DateTime.fromISO("2026-03-08T11:00:00", { zone: "utc" });
    const at12utc = DateTime.fromISO("2026-03-08T12:00:00", { zone: "utc" });
    const matches = [at11utc, at12utc].filter(shouldRunSixAmJob);
    expect(matches).toHaveLength(1);
  });

  it("exactly one of the two UTC cron firings matches 6am local on a DST fall-back day", () => {
    // Nov 1 2026 is the US fall-back date; CST (UTC-6) begins that day.
    const at11utc = DateTime.fromISO("2026-11-01T11:00:00", { zone: "utc" });
    const at12utc = DateTime.fromISO("2026-11-01T12:00:00", { zone: "utc" });
    const matches = [at11utc, at12utc].filter(shouldRunSixAmJob);
    expect(matches).toHaveLength(1);
  });
});

describe("thisDateMatch", () => {
  it("returns today's month/day with includeFeb29 false on a normal day", () => {
    const now = DateTime.fromObject(
      { year: 2026, month: 6, day: 15 },
      { zone: TIMEZONE },
    );
    expect(thisDateMatch(now)).toEqual({
      month: 6,
      day: 15,
      includeFeb29: false,
    });
  });

  it("includes the Feb 29 fallback on Feb 28 in a non-leap year", () => {
    const now = DateTime.fromObject(
      { year: 2026, month: 2, day: 28 }, // 2026 is not a leap year
      { zone: TIMEZONE },
    );
    expect(thisDateMatch(now)).toEqual({
      month: 2,
      day: 28,
      includeFeb29: true,
    });
  });

  it("does not include the Feb 29 fallback on Feb 28 in a leap year", () => {
    const now = DateTime.fromObject(
      { year: 2028, month: 2, day: 28 }, // 2028 is a leap year
      { zone: TIMEZONE },
    );
    expect(thisDateMatch(now)).toEqual({
      month: 2,
      day: 28,
      includeFeb29: false,
    });
  });

  it("matches Feb 29 directly in a leap year", () => {
    const now = DateTime.fromObject(
      { year: 2028, month: 2, day: 29 },
      { zone: TIMEZONE },
    );
    expect(thisDateMatch(now)).toEqual({
      month: 2,
      day: 29,
      includeFeb29: false,
    });
  });
});

describe("isFirstOfMonth / isJan1", () => {
  it("isFirstOfMonth is true only on the 1st", () => {
    expect(
      isFirstOfMonth(
        DateTime.fromObject({ year: 2026, month: 10, day: 1 }, { zone: TIMEZONE }),
      ),
    ).toBe(true);
    expect(
      isFirstOfMonth(
        DateTime.fromObject({ year: 2026, month: 10, day: 2 }, { zone: TIMEZONE }),
      ),
    ).toBe(false);
  });

  it("isJan1 is true only on January 1st", () => {
    expect(
      isJan1(DateTime.fromObject({ year: 2027, month: 1, day: 1 }, { zone: TIMEZONE })),
    ).toBe(true);
    expect(
      isJan1(DateTime.fromObject({ year: 2027, month: 1, day: 2 }, { zone: TIMEZONE })),
    ).toBe(false);
    expect(
      isJan1(DateTime.fromObject({ year: 2027, month: 12, day: 1 }, { zone: TIMEZONE })),
    ).toBe(false);
  });
});

describe("job key builders", () => {
  it("thisDateJobKey is keyed by the run date", () => {
    const now = DateTime.fromObject(
      { year: 2026, month: 9, day: 10 },
      { zone: TIMEZONE },
    );
    expect(thisDateJobKey(now)).toBe("this_date:2026-09-10");
  });

  it("monthlyRecapJobKey is keyed by the run month, not the covered month", () => {
    const now = DateTime.fromObject(
      { year: 2026, month: 10, day: 1 },
      { zone: TIMEZONE },
    );
    expect(monthlyRecapJobKey(now)).toBe("monthly_recap:2026-10");
  });

  it("yearlyTop3JobKey is keyed by the run year", () => {
    const now = DateTime.fromObject(
      { year: 2027, month: 1, day: 1 },
      { zone: TIMEZONE },
    );
    expect(yearlyTop3JobKey(now)).toBe("yearly_top3:2027");
  });

  it("produces the same key for both UTC cron firings of the same local day", () => {
    const at11utc = DateTime.fromISO("2026-09-10T11:00:00", { zone: "utc" });
    const at12utc = DateTime.fromISO("2026-09-10T12:00:00", { zone: "utc" });
    expect(thisDateJobKey(at11utc)).toBe(thisDateJobKey(at12utc));
  });
});
