import type { App } from "@slack/bolt";
import { ACTION_IDS } from "../lib/ids.js";
import { HISTORY_LIMIT } from "../lib/constants.js";
import { getHistoryRange, type HistoryRangeKey } from "../lib/time.js";
import { listHistory } from "../db/nominations.js";
import { buildHistoryView } from "../views/history.js";

export function registerHistoryHandlers(app: App): void {
  app.action(ACTION_IDS.HISTORY_BTN, async ({ ack, body, client }) => {
    await ack();
    const action = body as typeof body & {
      team: { id: string };
      trigger_id: string;
    };

    const rangeKey: HistoryRangeKey = "ytd";
    const range = getHistoryRange(rangeKey);
    const { rows, totalInRange } = await listHistory(
      action.team.id,
      range,
      HISTORY_LIMIT,
    );

    await client.views.push({
      trigger_id: action.trigger_id,
      view: buildHistoryView({ rangeKey, rows, totalInRange }),
    });
  });

  app.action(
    ACTION_IDS.HISTORY_RANGE_SELECT,
    async ({ ack, body, client }) => {
      await ack();
      const action = body as typeof body & {
        team: { id: string };
        view: { id: string; hash: string };
        actions: { selected_option?: { value: string } }[];
      };

      const rangeKey = (action.actions[0]?.selected_option?.value ??
        "ytd") as HistoryRangeKey;
      const range = getHistoryRange(rangeKey);
      const { rows, totalInRange } = await listHistory(
        action.team.id,
        range,
        HISTORY_LIMIT,
      );

      await client.views.update({
        view_id: action.view.id,
        hash: action.view.hash,
        view: buildHistoryView({ rangeKey, rows, totalInRange }),
      });
    },
  );
}
