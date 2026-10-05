import { describe, expect, it } from "vitest";
import { buildHistoryView } from "./history.js";
import type { HistoryRow } from "../db/nominations.js";
import { ACTION_IDS } from "../lib/ids.js";

function row(overrides: Partial<HistoryRow> = {}): HistoryRow {
  return {
    id: "n1",
    awardName: "Best Q",
    why: null,
    nominatorUserId: "U9",
    nomineeIds: ["U1", "U2"],
    createdAt: "2026-03-03T12:00:00.000Z",
    votes: 7,
    ...overrides,
  };
}

describe("buildHistoryView", () => {
  it("includes the range select with the current range pre-selected", () => {
    const view = buildHistoryView({ rangeKey: "lastMonth", rows: [], totalInRange: 0 });
    const actionsBlock = view.blocks[0];
    const element =
      actionsBlock && "elements" in actionsBlock
        ? actionsBlock.elements[0]
        : undefined;
    expect(element).toMatchObject({
      type: "static_select",
      action_id: ACTION_IDS.HISTORY_RANGE_SELECT,
      initial_option: { value: "lastMonth" },
    });
  });

  it("shows the empty state when there are no rows", () => {
    const view = buildHistoryView({ rangeKey: "ytd", rows: [], totalInRange: 0 });
    const text = JSON.stringify(view.blocks);
    expect(text).toContain("No PAXademy Awards in this period yet");
  });

  it("formats each row as award, nominees, why, and vote count", () => {
    const view = buildHistoryView({
      rangeKey: "ytd",
      rows: [row({ why: "Crushed it" })],
      totalInRange: 1,
    });
    const rowBlock = view.blocks[1];
    const text =
      rowBlock && "text" in rowBlock && rowBlock.text && typeof rowBlock.text !== "string"
        ? rowBlock.text.text
        : "";
    expect(text).toContain("*Best Q* — <@U1> and <@U2>");
    expect(text).toContain('_"Crushed it"_');
    expect(text).toContain("by <@U9>");
    expect(text).toContain("Mar 3, 2026");
    expect(text).toContain("7 votes");
  });

  it("singularizes a 1-vote count", () => {
    const view = buildHistoryView({
      rangeKey: "ytd",
      rows: [row({ votes: 1 })],
      totalInRange: 1,
    });
    const text = JSON.stringify(view.blocks);
    expect(text).toContain("1 vote");
    expect(text).not.toContain("1 votes");
  });

  it("omits the why line when none was given", () => {
    const view = buildHistoryView({
      rangeKey: "ytd",
      rows: [row({ why: null })],
      totalInRange: 1,
    });
    const text = JSON.stringify(view.blocks);
    expect(text).not.toContain('_"');
  });

  it("adds a 'Showing X of Y' footer only when more rows exist than shown", () => {
    const withMore = buildHistoryView({
      rangeKey: "ytd",
      rows: [row()],
      totalInRange: 50,
    });
    expect(JSON.stringify(withMore.blocks)).toContain(
      "Showing the 1 most recent of 50.",
    );

    const exact = buildHistoryView({
      rangeKey: "ytd",
      rows: [row()],
      totalInRange: 1,
    });
    expect(JSON.stringify(exact.blocks)).not.toContain("Showing the");
  });

  it("stays well under Slack's 100-block modal limit even at the 40-row cap", () => {
    const rows = Array.from({ length: 40 }, (_, i) => row({ id: `n${i}` }));
    const view = buildHistoryView({ rangeKey: "ytd", rows, totalInRange: 127 });
    expect(view.blocks.length).toBeLessThan(100);
  });

  it("keeps the view title within Slack's 24-char limit", () => {
    const view = buildHistoryView({ rangeKey: "ytd", rows: [], totalInRange: 0 });
    expect(view.title.text.length).toBeLessThanOrEqual(24);
  });
});
