import { describe, expect, it } from "vitest";
import { buildNominateConfirmView } from "./nominateConfirm.js";

function textOf(t: string | { text: string } | undefined): string | undefined {
  return typeof t === "string" ? t : t?.text;
}

describe("buildNominateConfirmView", () => {
  it("mentions the channel name and has a Close-only footer", () => {
    const view = buildNominateConfirmView({ channelName: "paxademy-awards" });
    const block = view.blocks[0];
    expect(
      textOf(block && "text" in block ? block.text : undefined),
    ).toContain("#paxademy-awards");
    expect(view.close?.text).toBe("Close");
    expect(view.submit).toBeUndefined();
  });
});
