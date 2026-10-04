import { describe, expect, it } from "vitest";
import { buildHowItWorksView } from "./howItWorks.js";
import { ACTION_IDS } from "../lib/ids.js";

describe("buildHowItWorksView", () => {
  it("includes the show-intro checkbox action", () => {
    const view = buildHowItWorksView({ showIntroChecked: false });
    const actionsBlock = view.blocks.find(
      (b) => "block_id" in b && b.block_id === "show_intro_actions",
    );
    expect(actionsBlock).toBeDefined();
    if (actionsBlock && "elements" in actionsBlock) {
      const checkbox = actionsBlock.elements[0];
      expect(checkbox && "action_id" in checkbox && checkbox.action_id).toBe(
        ACTION_IDS.SHOW_INTRO_CHECKBOX,
      );
    }
  });

  it("checks the box when the intro is currently shown", () => {
    const view = buildHowItWorksView({ showIntroChecked: true });
    const actionsBlock = view.blocks.find(
      (b) => "block_id" in b && b.block_id === "show_intro_actions",
    );
    const checkbox =
      actionsBlock && "elements" in actionsBlock
        ? actionsBlock.elements[0]
        : undefined;
    expect(
      checkbox &&
        "initial_options" in checkbox &&
        checkbox.initial_options?.length,
    ).toBe(1);
  });

  it("leaves the box unchecked when the intro is currently hidden", () => {
    const view = buildHowItWorksView({ showIntroChecked: false });
    const actionsBlock = view.blocks.find(
      (b) => "block_id" in b && b.block_id === "show_intro_actions",
    );
    const checkbox =
      actionsBlock && "elements" in actionsBlock
        ? actionsBlock.elements[0]
        : undefined;
    expect(
      checkbox && "initial_options" in checkbox
        ? checkbox.initial_options
        : undefined,
    ).toBeUndefined();
  });

  it("keeps the view title within Slack's 24-char limit", () => {
    const view = buildHowItWorksView({ showIntroChecked: false });
    expect(view.title.text.length).toBeLessThanOrEqual(24);
  });
});
