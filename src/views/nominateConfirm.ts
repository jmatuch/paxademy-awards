import type { ModalView } from "@slack/types";
import { CALLBACK_IDS } from "../lib/ids.js";
import { VIEW_TITLE } from "../lib/constants.js";

export function buildNominateConfirmView({
  channelName,
}: {
  channelName: string;
}): ModalView {
  return {
    type: "modal",
    callback_id: CALLBACK_IDS.NOMINATE_CONFIRM,
    title: { type: "plain_text", text: VIEW_TITLE },
    close: { type: "plain_text", text: "Close" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✅ Nomination submitted. It'll appear in #${channelName}.`,
        },
      },
    ],
  };
}
