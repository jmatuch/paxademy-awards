import type { AnyBlock, ModalView, PlainTextOption } from "@slack/types";
import { DateTime } from "luxon";
import { ACTION_IDS, CALLBACK_IDS } from "../lib/ids.js";
import { VIEW_TITLE } from "../lib/constants.js";
import { TIMEZONE, type HistoryRangeKey } from "../lib/time.js";
import type { HistoryRow } from "../db/nominations.js";
import { mentionList, pluralize, truncate } from "./shared/blockHelpers.js";

const RANGE_OPTIONS: { key: HistoryRangeKey; label: string }[] = [
  { key: "ytd", label: "YTD" },
  { key: "lastMonth", label: "Last month" },
  { key: "lastYear", label: "Last year" },
  { key: "allTime", label: "All-time" },
];

function rangeOption(key: HistoryRangeKey, label: string): PlainTextOption {
  return { text: { type: "plain_text", text: label }, value: key };
}

function formatHistoryRow(row: HistoryRow): string {
  const lines = [`*${row.awardName}* — ${mentionList(row.nomineeIds)}`];
  if (row.why) {
    lines.push(`_"${truncate(row.why, 150)}"_`);
  }
  const date = DateTime.fromISO(row.createdAt, { zone: "utc" })
    .setZone(TIMEZONE)
    .toFormat("MMM d, yyyy");
  lines.push(
    `by <@${row.nominatorUserId}> · ${date} · ${pluralize(row.votes, "vote")}`,
  );
  return lines.join("\n");
}

interface BuildHistoryViewParams {
  rangeKey: HistoryRangeKey;
  rows: HistoryRow[];
  totalInRange: number;
}

export function buildHistoryView({
  rangeKey,
  rows,
  totalInRange,
}: BuildHistoryViewParams): ModalView {
  const blocks: AnyBlock[] = [
    {
      type: "actions",
      block_id: "history_range_actions",
      elements: [
        {
          type: "static_select",
          action_id: ACTION_IDS.HISTORY_RANGE_SELECT,
          options: RANGE_OPTIONS.map((o) => rangeOption(o.key, o.label)),
          initial_option: rangeOption(
            rangeKey,
            RANGE_OPTIONS.find((o) => o.key === rangeKey)!.label,
          ),
        },
      ],
    },
  ];

  if (rows.length === 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "No PAXademy Awards in this period yet. Be the first.",
      },
    });
  } else {
    for (const row of rows) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: formatHistoryRow(row) },
      });
    }
    if (totalInRange > rows.length) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Showing the ${rows.length} most recent of ${totalInRange}.`,
          },
        ],
      });
    }
  }

  return {
    type: "modal",
    callback_id: CALLBACK_IDS.HISTORY,
    title: { type: "plain_text", text: VIEW_TITLE },
    close: { type: "plain_text", text: "Close" },
    blocks,
  };
}
