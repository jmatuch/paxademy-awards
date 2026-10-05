import { describe, expect, it } from "vitest";
import { computeTop3 } from "./top3.js";
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

describe("computeTop3", () => {
  it("excludes nominations with 0 votes", () => {
    const rows = [row({ id: "a", votes: 0 }), row({ id: "b", votes: 1 })];
    expect(computeTop3(rows).map((r) => r.id)).toEqual(["b"]);
  });

  it("orders by votes descending", () => {
    const rows = [
      row({ id: "a", votes: 1 }),
      row({ id: "b", votes: 5 }),
      row({ id: "c", votes: 3 }),
    ];
    expect(computeTop3(rows).map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks ties by earliest created_at", () => {
    const rows = [
      row({ id: "later", votes: 2, createdAt: "2026-02-01T00:00:00.000Z" }),
      row({ id: "earlier", votes: 2, createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    expect(computeTop3(rows).map((r) => r.id)).toEqual(["earlier", "later"]);
  });

  it("caps at 3 when there's no tie at the boundary", () => {
    const rows = [
      row({ id: "a", votes: 4 }),
      row({ id: "b", votes: 3 }),
      row({ id: "c", votes: 2 }),
      row({ id: "d", votes: 1 }),
    ];
    expect(computeTop3(rows).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("includes all ties at 3rd place", () => {
    const rows = [
      row({ id: "a", votes: 5 }),
      row({ id: "b", votes: 3 }),
      row({ id: "c", votes: 2 }),
      row({ id: "d", votes: 2 }),
      row({ id: "e", votes: 1 }),
    ];
    expect(computeTop3(rows).map((r) => r.id).sort()).toEqual(
      ["a", "b", "c", "d"].sort(),
    );
  });
});
