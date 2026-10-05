import type { AnyBlock } from "@slack/types";
import { ACTION_IDS } from "../lib/ids.js";
import { mentionList } from "./shared/blockHelpers.js";

interface BuildNominationMessageParams {
  nominationId: string;
  awardName: string;
  nomineeIds: string[];
  why?: string | null;
  nominatorId: string;
  editedAt?: string | null;
}

export function buildNominationMessageBlocks({
  nominationId,
  awardName,
  nomineeIds,
  why,
  nominatorId,
  editedAt,
}: BuildNominationMessageParams): { blocks: AnyBlock[]; text: string } {
  const headline = `🏆 ${mentionList(nomineeIds)} nominated for *${awardName}*`;
  const contextText = `Nominated by <@${nominatorId}> · React to vote for the monthly Top 3${
    editedAt ? " · edited" : ""
  }`;

  const blocks: AnyBlock[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: headline },
      accessory: {
        type: "overflow",
        action_id: ACTION_IDS.NOMINATION_OVERFLOW,
        options: [
          {
            text: { type: "plain_text", text: "Edit" },
            value: `edit:${nominationId}`,
          },
          {
            text: { type: "plain_text", text: "Delete" },
            value: `delete:${nominationId}`,
          },
        ],
      },
    },
  ];

  if (why) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `> ${why}` },
    });
  }

  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: contextText }],
  });

  return {
    blocks,
    text: `${mentionList(nomineeIds)} nominated for ${awardName}`,
  };
}
