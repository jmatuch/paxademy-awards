import { describe, expect, it } from "vitest";
import { buildNominateView } from "./nominate.js";
import { ACTION_IDS, BLOCK_IDS } from "../lib/ids.js";

function inputElement(
  view: ReturnType<typeof buildNominateView>,
  blockId: string,
) {
  const block = view.blocks.find(
    (b) => "block_id" in b && b.block_id === blockId,
  );
  return block && "element" in block ? block.element : undefined;
}

describe("buildNominateView", () => {
  it("has required PAX (max 10) and Award fields, optional Why", () => {
    const view = buildNominateView({ mode: { type: "create" } });
    const paxBlock = view.blocks.find(
      (b) => "block_id" in b && b.block_id === BLOCK_IDS.PAX,
    );
    const whyBlock = view.blocks.find(
      (b) => "block_id" in b && b.block_id === BLOCK_IDS.WHY,
    );
    expect(paxBlock && "optional" in paxBlock ? paxBlock.optional : undefined)
      .toBeFalsy();
    expect(whyBlock && "optional" in whyBlock ? whyBlock.optional : undefined)
      .toBe(true);

    const paxElement = inputElement(view, BLOCK_IDS.PAX);
    expect(
      paxElement && "max_selected_items" in paxElement
        ? paxElement.max_selected_items
        : undefined,
    ).toBe(10);

    const awardElement = inputElement(view, BLOCK_IDS.AWARD);
    expect(awardElement).toMatchObject({
      type: "plain_text_input",
      action_id: ACTION_IDS.AWARD_INPUT,
      max_length: 60,
    });
  });

  it("encodes the mode in private_metadata", () => {
    const createView = buildNominateView({ mode: { type: "create" } });
    expect(JSON.parse(createView.private_metadata ?? "{}")).toEqual({
      type: "create",
    });

    const editView = buildNominateView({
      mode: { type: "edit", nominationId: "abc-123" },
    });
    expect(JSON.parse(editView.private_metadata ?? "{}")).toEqual({
      type: "edit",
      nominationId: "abc-123",
    });
  });

  it("pre-fills fields when a prefill is given", () => {
    const view = buildNominateView({
      mode: { type: "edit", nominationId: "abc-123" },
      prefill: { nomineeIds: ["U1", "U2"], awardName: "Best Q", why: "Legendary" },
    });
    const paxElement = inputElement(view, BLOCK_IDS.PAX);
    const awardElement = inputElement(view, BLOCK_IDS.AWARD);
    const whyElement = inputElement(view, BLOCK_IDS.WHY);

    expect(
      paxElement && "initial_users" in paxElement
        ? paxElement.initial_users
        : undefined,
    ).toEqual(["U1", "U2"]);
    expect(
      awardElement && "initial_value" in awardElement
        ? awardElement.initial_value
        : undefined,
    ).toBe("Best Q");
    expect(
      whyElement && "initial_value" in whyElement
        ? whyElement.initial_value
        : undefined,
    ).toBe("Legendary");
  });

  it("has a Submit button (required for an input-block view)", () => {
    const view = buildNominateView({ mode: { type: "create" } });
    expect(view.submit?.text).toBe("Submit");
  });

  it("keeps the view title within Slack's 24-char limit", () => {
    const view = buildNominateView({ mode: { type: "create" } });
    expect(view.title.text.length).toBeLessThanOrEqual(24);
  });
});
