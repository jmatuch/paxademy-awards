import type { App } from "@slack/bolt";
import { ACTION_IDS } from "../lib/ids.js";

export function registerNominationMessageHandlers(app: App): void {
  // Edit/Delete land in Phase 5 -- ack so clicking the overflow doesn't
  // error out, no-op otherwise until then.
  app.action(ACTION_IDS.NOMINATION_OVERFLOW, async ({ ack }) => {
    await ack();
  });
}
