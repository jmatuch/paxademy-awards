import { describe, expect, it } from "vitest";
import { buildYearlyRecapBlocks } from "./yearlyRecap.js";
import type { HistoryRow } from "../db/nominations.js";

function row(overrides: Partial<HistoryRow> & { id: string }): HistoryRow {
  return {
    awardName: "Best Q",
    why: null,
    nominatorUserId: "U0",
    nomineeIds: ["U1"],
    createdAt: "2026-01-01T00:00:00.000Z",
    votes: 0,
    ...overrides,
  };
}

describe("buildYearlyRecapBlocks", () => {
  it("includes the year and total count", () => {
    const { blocks } = buildYearlyRecapBlocks({
      year: 2026,
      totalCount: 42,
      top3: [],
    });
    const text = JSON.stringify(blocks);
    expect(text).toContain("2026 Year in Review");
    expect(text).toContain("42 nominations");
  });

  it("includes a Top 3 section when there are qualifiers", () => {
    const { blocks } = buildYearlyRecapBlocks({
      year: 2026,
      totalCount: 1,
      top3: [row({ id: "a", votes: 7 })],
    });
    const text = JSON.stringify(blocks);
    expect(text).toContain("🏆 *Top 3*");
    expect(text).toContain("7 votes");
  });

  it("omits the Top 3 section when nothing qualifies", () => {
    const { blocks } = buildYearlyRecapBlocks({
      year: 2026,
      totalCount: 1,
      top3: [],
    });
    expect(JSON.stringify(blocks)).not.toContain("Top 3");
  });
});
