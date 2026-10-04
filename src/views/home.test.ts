import { describe, expect, it } from "vitest";
import { buildHomeView } from "./home.js";
import { ACTION_IDS } from "../lib/ids.js";

function actionIdsOf(view: ReturnType<typeof buildHomeView>): string[] {
  return view.blocks.flatMap((block) =>
    "elements" in block
      ? (block.elements ?? [])
          .map((el) => ("action_id" in el ? el.action_id : undefined))
          .filter((id): id is string => Boolean(id))
      : [],
  );
}

describe("buildHomeView", () => {
  it("shows the intro and hide-intro checkbox when not hidden", () => {
    const view = buildHomeView({ hideIntro: false, isAdmin: false });
    expect(actionIdsOf(view)).toContain(ACTION_IDS.HIDE_INTRO_CHECKBOX);
  });

  it("hides the intro and checkbox when hidden, showing a context line instead", () => {
    const view = buildHomeView({ hideIntro: true, isAdmin: false });
    expect(actionIdsOf(view)).not.toContain(ACTION_IDS.HIDE_INTRO_CHECKBOX);
    expect(view.blocks.some((b) => b.type === "context")).toBe(true);
  });

  it("always includes Nominate, History, and How it works buttons", () => {
    const ids = actionIdsOf(buildHomeView({ hideIntro: false, isAdmin: false }));
    expect(ids).toContain(ACTION_IDS.NOMINATE_BTN);
    expect(ids).toContain(ACTION_IDS.HISTORY_BTN);
    expect(ids).toContain(ACTION_IDS.HOW_IT_WORKS_BTN);
  });

  it("only includes the Settings button for admins", () => {
    const nonAdminIds = actionIdsOf(
      buildHomeView({ hideIntro: false, isAdmin: false }),
    );
    const adminIds = actionIdsOf(
      buildHomeView({ hideIntro: false, isAdmin: true }),
    );
    expect(nonAdminIds).not.toContain(ACTION_IDS.SETTINGS_BTN);
    expect(adminIds).toContain(ACTION_IDS.SETTINGS_BTN);
  });

  it("has a Close-only footer (no submit)", () => {
    const view = buildHomeView({ hideIntro: false, isAdmin: false });
    expect(view.close?.text).toBe("Close");
    expect(view.submit).toBeUndefined();
  });

  it("keeps the view title within Slack's 24-char limit", () => {
    const view = buildHomeView({ hideIntro: false, isAdmin: false });
    expect(view.title.text.length).toBeLessThanOrEqual(24);
  });
});
