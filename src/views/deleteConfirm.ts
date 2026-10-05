import type { ModalView } from "@slack/types";
import { CALLBACK_IDS } from "../lib/ids.js";
import { VIEW_TITLE } from "../lib/constants.js";

export interface DeleteConfirmMetadata {
  nominationId: string;
  channelId: string;
  messageTs: string;
}

export function buildDeleteConfirmView(
  metadata: DeleteConfirmMetadata,
): ModalView {
  return {
    type: "modal",
    callback_id: CALLBACK_IDS.DELETE_CONFIRM,
    private_metadata: JSON.stringify(metadata),
    title: { type: "plain_text", text: VIEW_TITLE },
    submit: { type: "plain_text", text: "Delete" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Delete this nomination? This can't be undone.",
        },
      },
    ],
  };
}
