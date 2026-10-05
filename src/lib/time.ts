import { DateTime } from "luxon";

export const TIMEZONE = "America/Chicago";

export type HistoryRangeKey = "ytd" | "lastMonth" | "lastYear" | "allTime";

export interface DateRange {
  start: DateTime | null;
  end: DateTime | null;
}

export function getHistoryRange(
  key: HistoryRangeKey,
  now: DateTime = DateTime.now().setZone(TIMEZONE),
): DateRange {
  const local = now.setZone(TIMEZONE);
  switch (key) {
    case "ytd":
      return { start: local.startOf("year"), end: local };
    case "lastMonth": {
      const startOfThisMonth = local.startOf("month");
      return { start: startOfThisMonth.minus({ months: 1 }), end: startOfThisMonth };
    }
    case "lastYear": {
      const startOfThisYear = local.startOf("year");
      return { start: startOfThisYear.minus({ years: 1 }), end: startOfThisYear };
    }
    case "allTime":
      return { start: null, end: null };
  }
}

// The only place "6am" logic lives -- the two UTC cron firings (11:00 and
// 12:00, covering CDT and CST) are just a DST safety net around this check.
export function shouldRunSixAmJob(now: DateTime): boolean {
  return now.setZone(TIMEZONE).hour === 6;
}

export interface ThisDateMatch {
  month: number;
  day: number;
  // Feb 29 nominations have no literal match in a non-leap year, so they
  // fold into Feb 28's "this date in history" post that year.
  includeFeb29: boolean;
}

export function thisDateMatch(now: DateTime): ThisDateMatch {
  const local = now.setZone(TIMEZONE);
  const isFeb28NonLeap =
    local.month === 2 && local.day === 28 && !local.isInLeapYear;
  return { month: local.month, day: local.day, includeFeb29: isFeb28NonLeap };
}

// Idempotency keys are keyed off the run date/month/year, not the content
// being posted (e.g. monthly_recap:2026-10 for an Oct-1 run covering
// September) -- this is what makes both UTC firings of the same local day
// produce the identical key, so the second one is a safe no-op.
export function thisDateJobKey(now: DateTime): string {
  return `this_date:${now.setZone(TIMEZONE).toFormat("yyyy-MM-dd")}`;
}

export function monthlyRecapJobKey(now: DateTime): string {
  return `monthly_recap:${now.setZone(TIMEZONE).toFormat("yyyy-MM")}`;
}

export function yearlyTop3JobKey(now: DateTime): string {
  return `yearly_top3:${now.setZone(TIMEZONE).toFormat("yyyy")}`;
}

export function isFirstOfMonth(now: DateTime): boolean {
  return now.setZone(TIMEZONE).day === 1;
}

export function isJan1(now: DateTime): boolean {
  const local = now.setZone(TIMEZONE);
  return local.month === 1 && local.day === 1;
}
