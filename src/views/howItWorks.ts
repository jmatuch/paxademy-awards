import type { AnyBlock, ModalView } from "@slack/types";
import { ACTION_IDS, CALLBACK_IDS } from "../lib/ids.js";
import { VIEW_TITLE } from "../lib/constants.js";

interface BuildHowItWorksViewParams {
  showIntroChecked: boolean;
}

const INTRO_TEXT =
  "*What is this?* PAXademy Awards is a way to call out a fellow PAX for " +
  "something that deserves recognition — a crushing VQ, iron-man attendance, " +
  "the mumblechatter that made your whole month. Nominate anyone, anytime, " +
  "for anything. Every nomination becomes its own award and posts to the " +
  "channel; there's no single \"winner\" to beat out.";

const VOTES_TEXT =
  "*How votes count*\nReact with any emoji on a nomination to vote for it. " +
  "Each person's vote counts once no matter how many emoji they use, and " +
  "the nominator and nominees don't count toward their own total. Add or " +
  "remove a reaction anytime — the count updates live.";

const RECAPS_TEXT =
  "*When recaps post*\n📜 Daily, a look back at \"this date in PAXademy " +
  "Awards history.\"\n🏅 On the 1st of the month, a recap of last month " +
  "with a Top 3 by votes.\n🎉 On January 1st, last year's Top 3.";

const EDIT_DELETE_TEXT =
  "*Who can edit or delete*\nThe nominator can edit their own nomination " +
  "anytime — PAX, award, or why. Admins can edit or delete any nomination. " +
  "Deleted nominations disappear from history, recaps, and votes.";

export function buildHowItWorksView({
  showIntroChecked,
}: BuildHowItWorksViewParams): ModalView {
  const blocks: AnyBlock[] = [
    { type: "section", text: { type: "mrkdwn", text: INTRO_TEXT } },
    { type: "divider" },
    { type: "section", text: { type: "mrkdwn", text: VOTES_TEXT } },
    { type: "divider" },
    { type: "section", text: { type: "mrkdwn", text: RECAPS_TEXT } },
    { type: "divider" },
    { type: "section", text: { type: "mrkdwn", text: EDIT_DELETE_TEXT } },
    { type: "divider" },
    {
      type: "actions",
      block_id: "show_intro_actions",
      elements: [
        {
          type: "checkboxes",
          action_id: ACTION_IDS.SHOW_INTRO_CHECKBOX,
          options: [
            {
              text: {
                type: "plain_text",
                text: "Show the intro on the home screen",
              },
              value: "show_intro",
            },
          ],
          ...(showIntroChecked
            ? {
                initial_options: [
                  {
                    text: {
                      type: "plain_text",
                      text: "Show the intro on the home screen",
                    },
                    value: "show_intro",
                  },
                ],
              }
            : {}),
        },
      ],
    },
  ];

  return {
    type: "modal",
    callback_id: CALLBACK_IDS.HOW_IT_WORKS,
    title: { type: "plain_text", text: VIEW_TITLE },
    close: { type: "plain_text", text: "Close" },
    blocks,
  };
}
