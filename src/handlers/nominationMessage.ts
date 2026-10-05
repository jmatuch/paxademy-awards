import type { App } from "@slack/bolt";
import { waitUntil } from "@vercel/functions";
import { ACTION_IDS, CALLBACK_IDS } from "../lib/ids.js";
import { isAdmin } from "../lib/slackAuth.js";
import { getById, softDelete } from "../db/nominations.js";
import { buildNominateView } from "../views/nominate.js";
import { buildDeleteConfirmView } from "../views/deleteConfirm.js";

export function registerNominationMessageHandlers(app: App): void {
  app.action(ACTION_IDS.NOMINATION_OVERFLOW, async ({ ack, body, client }) => {
    await ack();
    const action = body as typeof body & {
      user: { id: string };
      trigger_id: string;
      channel: { id: string };
      message: { ts: string };
      actions: { selected_option?: { value: string } }[];
    };

    const value = action.actions[0]?.selected_option?.value;
    const [op, nominationId] = value?.split(":") ?? [];
    if (!op || !nominationId) return;

    if (op === "edit") {
      const existing = await getById(nominationId);
      if (!existing) return;

      const authorized =
        existing.nominatorUserId === action.user.id ||
        (await isAdmin(client, action.user.id));
      if (!authorized) {
        await client.chat.postEphemeral({
          channel: action.channel.id,
          user: action.user.id,
          text: "Only the nominator or an admin can edit this.",
        });
        return;
      }

      await client.views.open({
        trigger_id: action.trigger_id,
        view: buildNominateView({
          mode: { type: "edit", nominationId },
          prefill: {
            nomineeIds: existing.nomineeIds,
            awardName: existing.awardName,
            why: existing.why ?? undefined,
          },
        }),
      });
    } else if (op === "delete") {
      if (!(await isAdmin(client, action.user.id))) {
        await client.chat.postEphemeral({
          channel: action.channel.id,
          user: action.user.id,
          text: "Only admins can delete nominations.",
        });
        return;
      }

      await client.views.open({
        trigger_id: action.trigger_id,
        view: buildDeleteConfirmView({
          nominationId,
          channelId: action.channel.id,
          messageTs: action.message.ts,
        }),
      });
    }
  });

  app.view(CALLBACK_IDS.DELETE_CONFIRM, async ({ ack, body, client }) => {
    await ack();
    const metadata = body.view.private_metadata
      ? JSON.parse(body.view.private_metadata)
      : null;
    if (!metadata?.nominationId) return;

    // Re-checked even though only an admin could have reached this modal --
    // every admin action is re-verified at the point it takes effect.
    if (!(await isAdmin(client, body.user.id))) return;

    waitUntil(
      (async () => {
        await softDelete(metadata.nominationId, body.user.id);
        try {
          await client.chat.delete({
            channel: metadata.channelId,
            ts: metadata.messageTs,
          });
        } catch {
          // Message may already be gone; the soft-delete above still applies.
        }
      })(),
    );
  });
}
