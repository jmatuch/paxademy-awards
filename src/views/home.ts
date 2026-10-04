import type { AnyBlock, ModalView } from "@slack/types";
import { ACTION_IDS, CALLBACK_IDS } from "../lib/ids.js";
import { VIEW_TITLE } from "../lib/constants.js";

interface BuildHomeViewParams {
  hideIntro: boolean;
  isAdmin: boolean;
}

const INTRO_TEXT =
  "*Welcome to PAXademy Awards!* 🏆\n\n" +
  "Nominate a fellow PAX for anything that deserves recognition — a crushing VQ, iron-man attendance, the mumblechatter that made your whole month. Every nomination becomes its own award and posts to the channel; there's no single \"winner\" to beat out.\n\n" +
  "React with any emoji on a nomination to vote for it — those reactions decide the monthly and yearly Top 3.";

function navButton(text: string, actionId: string, blockId: string): AnyBlock {
  return {
    type: "actions",
    block_id: blockId,
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text, emoji: true },
        action_id: actionId,
      },
    ],
  };
}

export function buildHomeView({
  hideIntro,
  isAdmin,
}: BuildHomeViewParams): ModalView {
  const blocks: AnyBlock[] = [];

  if (!hideIntro) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: INTRO_TEXT },
    });
    blocks.push({
      type: "actions",
      block_id: "intro_actions",
      elements: [
        {
          type: "checkboxes",
          action_id: ACTION_IDS.HIDE_INTRO_CHECKBOX,
          options: [
            {
              text: { type: "plain_text", text: "Don't show me this again" },
              value: "hide_intro",
            },
          ],
        },
      ],
    });
  } else {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "Intro hidden — tap *How it works* to see it again.",
        },
      ],
    });
  }

  blocks.push({ type: "divider" });
  blocks.push(
    navButton("🏆 Nominate a PAX", ACTION_IDS.NOMINATE_BTN, "nominate_action"),
  );
  blocks.push(
    navButton("📜 History", ACTION_IDS.HISTORY_BTN, "history_action"),
  );
  blocks.push(
    navButton(
      "❓ How it works",
      ACTION_IDS.HOW_IT_WORKS_BTN,
      "how_it_works_action",
    ),
  );
  if (isAdmin) {
    blocks.push(
      navButton("⚙️ Settings", ACTION_IDS.SETTINGS_BTN, "settings_action"),
    );
  }

  return {
    type: "modal",
    callback_id: CALLBACK_IDS.HOME,
    title: { type: "plain_text", text: VIEW_TITLE },
    close: { type: "plain_text", text: "Close" },
    blocks,
  };
}
