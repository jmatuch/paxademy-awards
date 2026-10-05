import type { WebClient } from "@slack/web-api";
import { DateTime } from "luxon";
import { thisDateMatch, TIMEZONE } from "../lib/time.js";
import {
  listNominationsBeforeYear,
  type SimpleNomination,
} from "../db/nominations.js";
import { buildThisDateRecapBlocks } from "../views/thisDateRecap.js";

export interface RunThisDateParams {
  now: DateTime;
  teamId: string;
  channelId: string;
}

export async function runThisDate(
  client: WebClient,
  { now, teamId, channelId }: RunThisDateParams,
): Promise<void> {
  const match = thisDateMatch(now);
  const currentYear = now.setZone(TIMEZONE).year;
  const candidates = await listNominationsBeforeYear(teamId, currentYear);

  const byYear = new Map<number, SimpleNomination[]>();
  for (const nomination of candidates) {
    const local = DateTime.fromISO(nomination.createdAt, {
      zone: "utc",
    }).setZone(TIMEZONE);
    const isMatch =
      (local.month === match.month && local.day === match.day) ||
      (match.includeFeb29 && local.month === 2 && local.day === 29);
    if (!isMatch) continue;

    const list = byYear.get(local.year) ?? [];
    list.push(nomination);
    byYear.set(local.year, list);
  }

  if (byYear.size === 0) return; // skip, per spec

  const { blocks, text } = buildThisDateRecapBlocks(byYear);
  await client.chat.postMessage({ channel: channelId, blocks, text });
}
