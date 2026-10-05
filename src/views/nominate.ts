import type { ModalView } from "@slack/types";
import { ACTION_IDS, BLOCK_IDS, CALLBACK_IDS } from "../lib/ids.js";
import { VIEW_TITLE } from "../lib/constants.js";

export interface NominatePrefill {
  nomineeIds: string[];
  awardName: string;
  why?: string;
}

interface BuildNominateViewParams {
  mode: { type: "create" } | { type: "edit"; nominationId: string };
  prefill?: NominatePrefill;
}

export function buildNominateView({
  mode,
  prefill,
}: BuildNominateViewParams): ModalView {
  return {
    type: "modal",
    callback_id: CALLBACK_IDS.NOMINATE,
    private_metadata: JSON.stringify(mode),
    title: { type: "plain_text", text: VIEW_TITLE },
    submit: { type: "plain_text", text: "Submit" },
    close: { type: "plain_text", text: "Close" },
    blocks: [
      {
        type: "input",
        block_id: BLOCK_IDS.PAX,
        label: { type: "plain_text", text: "PAX" },
        element: {
          type: "multi_users_select",
          action_id: ACTION_IDS.PAX_SELECT,
          max_selected_items: 10,
          ...(prefill ? { initial_users: prefill.nomineeIds } : {}),
        },
      },
      {
        type: "input",
        block_id: BLOCK_IDS.AWARD,
        label: { type: "plain_text", text: "Award" },
        element: {
          type: "plain_text_input",
          action_id: ACTION_IDS.AWARD_INPUT,
          max_length: 60,
          ...(prefill ? { initial_value: prefill.awardName } : {}),
        },
      },
      {
        type: "input",
        block_id: BLOCK_IDS.WHY,
        optional: true,
        label: { type: "plain_text", text: "Why" },
        element: {
          type: "plain_text_input",
          action_id: ACTION_IDS.WHY_INPUT,
          multiline: true,
          max_length: 500,
          ...(prefill?.why ? { initial_value: prefill.why } : {}),
        },
      },
    ],
  };
}
