import { describe, expect, it } from "vitest";
import { buildMonthlyRecapBlocks } from "./monthlyRecap.js";
import type { HistoryRow } from "../db/nominations.js";
import { MONTHLY_RECAP_CAP } from "../lib/constants.js";

function row(overrides: Partial<HistoryRow> & { id: string }): HistoryRow {
  return {
    awardName: "Best Q",
    why: null,
    nominatorUserId: "U0",
    nomineeIds: ["U1"],
    createdAt: "2026-09-01T00:00:00.000Z",
    votes: 0,
    ...overrides,
  };
}

describe("buildMonthlyRecapBlocks", () => {
  it("includes the month label and total count", () => {
    const { blocks } = buildMonthlyRecapBlocks({
      monthLabel: "September 2026",
      rows: [row({ id: "a" })],
      top3: [],
    });
    const text = JSON.stringify(blocks);
    expect(text).toContain("September 2026");
    expect(text).toContain("1 nomination");
  });

  it("caps the listed nominations at MONTHLY_RECAP_CAP with an overflow note", () => {
    const rows = Array.from({ length: MONTHLY_RECAP_CAP + 5 }, (_, i) =>
      row({ id: `n${i}` }),
    );
    const { blocks } = buildMonthlyRecapBlocks({
      monthLabel: "September 2026",
      rows,
      top3: [],
    });
    const text = JSON.stringify(blocks);
    expect(text).toContain("…and 5 more — see History in `/paxademy-awards`.");
  });

  it("omits the overflow note when under the cap", () => {
    const { blocks } = buildMonthlyRecapBlocks({
      monthLabel: "September 2026",
      rows: [row({ id: "a" })],
      top3: [],
    });
    expect(JSON.stringify(blocks)).not.toContain("more — see History");
  });

  it("includes a Top 3 section with vote counts when there are qualifiers", () => {
    const { blocks } = buildMonthlyRecapBlocks({
      monthLabel: "September 2026",
      rows: [row({ id: "a", votes: 3 })],
      top3: [row({ id: "a", votes: 3 })],
    });
    const text = JSON.stringify(blocks);
    expect(text).toContain("🏆 *Top 3*");
    expect(text).toContain("3 votes");
  });

  it("omits the Top 3 section when nothing qualifies", () => {
    const { blocks } = buildMonthlyRecapBlocks({
      monthLabel: "September 2026",
      rows: [row({ id: "a", votes: 0 })],
      top3: [],
    });
    expect(JSON.stringify(blocks)).not.toContain("Top 3");
  });

  it("stays comfortably under Slack's 50-block message limit", () => {
    const rows = Array.from({ length: MONTHLY_RECAP_CAP + 20 }, (_, i) =>
      row({ id: `n${i}`, votes: i < 3 ? 5 - i : 0 }),
    );
    const { blocks } = buildMonthlyRecapBlocks({
      monthLabel: "September 2026",
      rows,
      top3: rows.slice(0, 3),
    });
    expect(blocks.length).toBeLessThan(50);
  });
});
