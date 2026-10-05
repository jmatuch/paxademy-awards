import type { AnyBlock } from "@slack/types";
import type { SimpleNomination } from "../db/nominations.js";
import { mentionList, truncate } from "./shared/blockHelpers.js";

function formatNominationLine(n: SimpleNomination): string {
  const lines = [`*${n.awardName}* — ${mentionList(n.nomineeIds)}`];
  if (n.why) lines.push(`_"${truncate(n.why, 150)}"_`);
  return lines.join("\n");
}

export function buildThisDateRecapBlocks(
  byYear: Map<number, SimpleNomination[]>,
): { blocks: AnyBlock[]; text: string } {
  const blocks: AnyBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "📜 This date in PAXademy Awards history…",
      },
    },
  ];

  const years = [...byYear.keys()].sort((a, b) => b - a);
  for (const year of years) {
    const nominations = byYear.get(year) ?? [];
    const lines = [`*${year}*`, ...nominations.map(formatNominationLine)];
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: lines.join("\n") },
    });
  }

  return { blocks, text: "This date in PAXademy Awards history" };
}
