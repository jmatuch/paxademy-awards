import { describe, expect, it } from "vitest";
import { buildNominationMessageBlocks } from "./nominationMessage.js";
import { ACTION_IDS } from "../lib/ids.js";

function textOf(t: string | { text: string } | undefined): string | undefined {
  return typeof t === "string" ? t : t?.text;
}

describe("buildNominationMessageBlocks", () => {
  it("includes the headline with nominee mentions and award name", () => {
    const { blocks } = buildNominationMessageBlocks({
      nominationId: "n1",
      awardName: "Best VQ",
      nomineeIds: ["U1", "U2"],
      why: null,
      nominatorId: "U3",
    });
    const headline = blocks[0];
    expect(
      textOf(headline && "text" in headline ? headline.text : undefined),
    ).toContain("<@U1> and <@U2> nominated for *Best VQ*");
  });

  it("omits the blockquote when no why is given", () => {
    const { blocks } = buildNominationMessageBlocks({
      nominationId: "n1",
      awardName: "Best VQ",
      nomineeIds: ["U1"],
      why: null,
      nominatorId: "U3",
    });
    expect(blocks).toHaveLength(2); // headline + context, no blockquote
  });

  it("includes a blockquote when a why is given", () => {
    const { blocks } = buildNominationMessageBlocks({
      nominationId: "n1",
      awardName: "Best VQ",
      nomineeIds: ["U1"],
      why: "Crushed it",
      nominatorId: "U3",
    });
    expect(blocks).toHaveLength(3);
    const quoteBlock = blocks[1];
    expect(
      textOf(quoteBlock && "text" in quoteBlock ? quoteBlock.text : undefined),
    ).toBe("> Crushed it");
  });

  it("appends an edited marker to the context line when editedAt is set", () => {
    const { blocks } = buildNominationMessageBlocks({
      nominationId: "n1",
      awardName: "Best VQ",
      nomineeIds: ["U1"],
      why: null,
      nominatorId: "U3",
      editedAt: "2026-01-01T00:00:00Z",
    });
    const contextBlock = blocks.at(-1);
    const contextText =
      contextBlock && "elements" in contextBlock
        ? contextBlock.elements[0]
        : undefined;
    expect(
      contextText && "text" in contextText ? contextText.text : undefined,
    ).toContain("· edited");
  });

  it("puts an overflow menu with Edit and Delete on the headline section", () => {
    const { blocks } = buildNominationMessageBlocks({
      nominationId: "n1",
      awardName: "Best VQ",
      nomineeIds: ["U1"],
      why: null,
      nominatorId: "U3",
    });
    const headline = blocks[0];
    const accessory =
      headline && "accessory" in headline ? headline.accessory : undefined;
    expect(accessory).toMatchObject({
      type: "overflow",
      action_id: ACTION_IDS.NOMINATION_OVERFLOW,
      options: [
        { value: "edit:n1" },
        { value: "delete:n1" },
      ],
    });
  });

  it("always sets a plain-text fallback", () => {
    const { text } = buildNominationMessageBlocks({
      nominationId: "n1",
      awardName: "Best VQ",
      nomineeIds: ["U1"],
      why: null,
      nominatorId: "U3",
    });
    expect(text.length).toBeGreaterThan(0);
  });
});
