import { describe, expect, it } from "vitest";
import { buildDeleteConfirmView } from "./deleteConfirm.js";

describe("buildDeleteConfirmView", () => {
  it("carries the nomination/channel/message refs in private_metadata", () => {
    const view = buildDeleteConfirmView({
      nominationId: "n1",
      channelId: "C1",
      messageTs: "123.456",
    });
    expect(JSON.parse(view.private_metadata ?? "{}")).toEqual({
      nominationId: "n1",
      channelId: "C1",
      messageTs: "123.456",
    });
  });

  it("has a Delete submit button and a Cancel close button", () => {
    const view = buildDeleteConfirmView({
      nominationId: "n1",
      channelId: "C1",
      messageTs: "123.456",
    });
    expect(view.submit?.text).toBe("Delete");
    expect(view.close?.text).toBe("Cancel");
  });
});
