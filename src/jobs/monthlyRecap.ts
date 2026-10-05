import type { WebClient } from "@slack/web-api";
import type { DateTime } from "luxon";
import { getHistoryRange, TIMEZONE } from "../lib/time.js";
import { listNominationsInRange } from "../db/nominations.js";
import { replaceReactionsForNomination } from "../db/reactions.js";
import { isBotUser } from "../lib/slackAuth.js";
import { buildMonthlyRecapBlocks } from "../views/monthlyRecap.js";
import { computeTop3 } from "./top3.js";

export interface RunMonthlyRecapParams {
  now: DateTime;
  teamId: string;
  channelId: string;
}

async function reconcileReactions(
  client: WebClient,
  rows: { id: string; channelId?: string | null; messageTs?: string | null }[],
): Promise<void> {
  for (const row of rows) {
    if (!row.channelId || !row.messageTs) continue;

    const result = await client.reactions.get({
      channel: row.channelId,
      timestamp: row.messageTs,
    });
    const reactions = result.message?.reactions ?? [];

    const entries: { userId: string; emoji: string }[] = [];
    for (const reaction of reactions) {
      for (const userId of reaction.users ?? []) {
        if (await isBotUser(client, userId)) continue;
        entries.push({ userId, emoji: reaction.name ?? "" });
      }
    }
    await replaceReactionsForNomination(row.id, entries);
  }
}

export async function runMonthlyRecap(
  client: WebClient,
  { now, teamId, channelId }: RunMonthlyRecapParams,
): Promise<void> {
  const range = getHistoryRange("lastMonth", now);

  const initialRows = await listNominationsInRange(teamId, range);
  if (initialRows.length === 0) return; // skip if zero nominations

  await reconcileReactions(client, initialRows);

  // Re-fetch so vote counts reflect the reconciliation above.
  const rows = await listNominationsInRange(teamId, range);
  const top3 = computeTop3(rows);
  const monthLabel = range.start!.setZone(TIMEZONE).toFormat("MMMM yyyy");

  const { blocks, text } = buildMonthlyRecapBlocks({ monthLabel, rows, top3 });
  await client.chat.postMessage({ channel: channelId, blocks, text });
}
