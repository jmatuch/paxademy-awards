import type { WebClient } from "@slack/web-api";
import type { DateTime } from "luxon";
import { getHistoryRange, TIMEZONE } from "../lib/time.js";
import { listNominationsInRange } from "../db/nominations.js";
import { buildYearlyRecapBlocks } from "../views/yearlyRecap.js";
import { computeTop3 } from "./top3.js";

export interface RunYearlyTop3Params {
  now: DateTime;
  teamId: string;
  channelId: string;
}

// Trusts the DB -- unlike the monthly recap, no reaction reconciliation
// here (spec §6).
export async function runYearlyTop3(
  client: WebClient,
  { now, teamId, channelId }: RunYearlyTop3Params,
): Promise<void> {
  const range = getHistoryRange("lastYear", now);
  const rows = await listNominationsInRange(teamId, range);
  if (rows.length === 0) return; // skip if zero nominations

  const top3 = computeTop3(rows);
  const year = range.start!.setZone(TIMEZONE).year;

  const { blocks, text } = buildYearlyRecapBlocks({
    year,
    totalCount: rows.length,
    top3,
  });
  await client.chat.postMessage({ channel: channelId, blocks, text });
}
