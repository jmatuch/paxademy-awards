import type { AnyBlock } from "@slack/types";
import type { HistoryRow } from "../db/nominations.js";
import { MONTHLY_RECAP_CAP } from "../lib/constants.js";
import { mentionList, pluralize } from "./shared/blockHelpers.js";

function formatNominationLine(row: HistoryRow): string {
  return `*${row.awardName}* — ${mentionList(row.nomineeIds)}`;
}

function formatTop3Line(row: HistoryRow): string {
  return `*${row.awardName}* — ${mentionList(row.nomineeIds)} · ${pluralize(row.votes, "vote")}`;
}

export function buildMonthlyRecapBlocks(params: {
  monthLabel: string;
  rows: HistoryRow[];
  top3: HistoryRow[];
}): { blocks: AnyBlock[]; text: string } {
  const { monthLabel, rows, top3 } = params;

  const blocks: AnyBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🏅 *${monthLabel} Recap*\n${pluralize(rows.length, "nomination")} this month.`,
      },
    },
  ];

  const shown = rows.slice(0, MONTHLY_RECAP_CAP);
  blocks.push({
    type: "section",
    text: { type: "mrkdwn", text: shown.map(formatNominationLine).join("\n") },
  });

  if (rows.length > MONTHLY_RECAP_CAP) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `…and ${rows.length - MONTHLY_RECAP_CAP} more — see History in \`/paxademy-awards\`.`,
        },
      ],
    });
  }

  if (top3.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: ["🏆 *Top 3*", ...top3.map(formatTop3Line)].join("\n"),
      },
    });
  }

  return { blocks, text: `${monthLabel} Recap` };
}
