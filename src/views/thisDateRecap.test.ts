import { describe, expect, it } from "vitest";
import { buildThisDateRecapBlocks } from "./thisDateRecap.js";
import type { SimpleNomination } from "../db/nominations.js";

function nomination(overrides: Partial<SimpleNomination> & { id: string }): SimpleNomination {
  return {
    awardName: "Best Q",
    why: null,
    nominatorUserId: "U0",
    nomineeIds: ["U1"],
    createdAt: "2025-03-03T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildThisDateRecapBlocks", () => {
  it("includes the header text", () => {
    const { blocks } = buildThisDateRecapBlocks(new Map());
    expect(JSON.stringify(blocks)).toContain(
      "This date in PAXademy Awards history",
    );
  });

  it("groups nominations under year headers, newest year first", () => {
    const byYear = new Map([
      [2024, [nomination({ id: "a" })]],
      [2026, [nomination({ id: "b" })]],
      [2025, [nomination({ id: "c" })]],
    ]);
    const { blocks } = buildThisDateRecapBlocks(byYear);
    const text = JSON.stringify(blocks);
    const i2026 = text.indexOf("2026");
    const i2025 = text.indexOf("2025");
    const i2024 = text.indexOf("2024");
    expect(i2026).toBeGreaterThan(-1);
    expect(i2026).toBeLessThan(i2025);
    expect(i2025).toBeLessThan(i2024);
  });

  it("always sets a plain-text fallback", () => {
    const { text } = buildThisDateRecapBlocks(new Map());
    expect(text.length).toBeGreaterThan(0);
  });
});
