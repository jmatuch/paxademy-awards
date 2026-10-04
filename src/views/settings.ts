import type { ModalView } from "@slack/types";
import { CALLBACK_IDS } from "../lib/ids.js";
import { VIEW_TITLE } from "../lib/constants.js";

interface BuildSettingsViewParams {
  channelId: string | null;
}

const CHANNEL_BLOCK_ID = "nomination_channel_block";
export const CHANNEL_ACTION_ID = "nomination_channel_select";

export function buildSettingsView({
  channelId,
}: BuildSettingsViewParams): ModalView {
  return {
    type: "modal",
    callback_id: CALLBACK_IDS.SETTINGS,
    title: { type: "plain_text", text: VIEW_TITLE },
    submit: { type: "plain_text", text: "Save" },
    close: { type: "plain_text", text: "Close" },
    blocks: [
      {
        type: "input",
        block_id: CHANNEL_BLOCK_ID,
        label: { type: "plain_text", text: "Nomination channel" },
        hint: {
          type: "plain_text",
          text: "Where nominations get posted. Private channels need the app invited first.",
        },
        element: {
          type: "conversations_select",
          action_id: CHANNEL_ACTION_ID,
          ...(channelId ? { initial_conversation: channelId } : {}),
          filter: {
            include: ["public", "private"],
            exclude_external_shared_channels: true,
          },
        },
      },
    ],
  };
}
