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
