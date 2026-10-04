import { describe, expect, it } from "vitest";
import { buildSettingsView, CHANNEL_ACTION_ID } from "./settings.js";

describe("buildSettingsView", () => {
  it("includes the channel picker with public+private, no shared channels", () => {
    const view = buildSettingsView({ channelId: null });
    const inputBlock = view.blocks.find((b) => b.type === "input");
    expect(inputBlock && "element" in inputBlock ? inputBlock.element : undefined)
      .toMatchObject({
        type: "conversations_select",
        action_id: CHANNEL_ACTION_ID,
        filter: {
          include: ["public", "private"],
          exclude_external_shared_channels: true,
        },
      });
  });

  it("pre-fills the current channel when one is set", () => {
    const view = buildSettingsView({ channelId: "C12345" });
    const inputBlock = view.blocks.find((b) => b.type === "input");
    const element =
      inputBlock && "element" in inputBlock ? inputBlock.element : undefined;
    expect(
      element && "initial_conversation" in element
        ? element.initial_conversation
        : undefined,
    ).toBe("C12345");
  });

  it("has a Save submit button and a Close footer", () => {
    const view = buildSettingsView({ channelId: null });
    expect(view.submit?.text).toBe("Save");
    expect(view.close?.text).toBe("Close");
  });

  it("keeps the view title within Slack's 24-char limit", () => {
    const view = buildSettingsView({ channelId: null });
    expect(view.title.text.length).toBeLessThanOrEqual(24);
  });
});
