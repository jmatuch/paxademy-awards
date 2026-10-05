import type { AnyBlock } from "@slack/types";
import type { HistoryRow } from "../db/nominations.js";
import { mentionList, pluralize } from "./shared/blockHelpers.js";

function formatTop3Line(row: HistoryRow): string {
  return `*${row.awardName}* — ${mentionList(row.nomineeIds)} · ${pluralize(row.votes, "vote")}`;
}

export function buildYearlyRecapBlocks(params: {
  year: number;
  totalCount: number;
  top3: HistoryRow[];
}): { blocks: AnyBlock[]; text: string } {
  const { year, totalCount, top3 } = params;

  const blocks: AnyBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🎉 *${year} Year in Review*\n${pluralize(totalCount, "nomination")} this year.`,
      },
    },
  ];

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

  return { blocks, text: `${year} Year in Review` };
}
