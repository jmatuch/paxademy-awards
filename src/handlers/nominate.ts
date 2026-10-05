import type { App } from "@slack/bolt";
import { waitUntil } from "@vercel/functions";
import { ACTION_IDS, BLOCK_IDS, CALLBACK_IDS } from "../lib/ids.js";
import { getSettings } from "../db/settings.js";
import { insertNomination, setMessageRef, softDelete } from "../db/nominations.js";
import { attachNominees } from "../db/nominees.js";
import { buildNominateView } from "../views/nominate.js";
import { buildNominateConfirmView } from "../views/nominateConfirm.js";
import { buildNominationMessageBlocks } from "../views/nominationMessage.js";

type NominateMode = { type: "create" } | { type: "edit"; nominationId: string };

export function registerNominateHandlers(app: App): void {
  app.action(ACTION_IDS.NOMINATE_BTN, async ({ ack, body, client }) => {
    await ack();
    const action = body as typeof body & { trigger_id: string };
    await client.views.push({
      trigger_id: action.trigger_id,
      view: buildNominateView({ mode: { type: "create" } }),
    });
  });

  app.view(CALLBACK_IDS.NOMINATE, async ({ ack, body, client }) => {
    const teamId = body.team?.id;
    const nominatorId = body.user.id;
    const mode: NominateMode = body.view.private_metadata
      ? JSON.parse(body.view.private_metadata)
      : { type: "create" };

    const values = body.view.state.values;
    const nomineeIds =
      values[BLOCK_IDS.PAX]?.[ACTION_IDS.PAX_SELECT]?.selected_users ?? [];
    const awardName = (
      values[BLOCK_IDS.AWARD]?.[ACTION_IDS.AWARD_INPUT]?.value ?? ""
    ).trim();
    const why =
      values[BLOCK_IDS.WHY]?.[ACTION_IDS.WHY_INPUT]?.value?.trim() || null;

    if (!teamId) {
      await ack();
      return;
    }

    if (mode.type === "edit") {
      // Full edit-save flow (DB update + chat.update) lands in Phase 5.
      await ack({ response_action: "clear" });
      return;
    }

    if (nomineeIds.includes(nominatorId)) {
      await ack({
        response_action: "errors",
        errors: { [BLOCK_IDS.PAX]: "Nice try. Nominate someone else." },
      });
      return;
    }

    const settings = await getSettings(teamId);
    if (!settings.nominationChannelId) {
      await ack({
        response_action: "errors",
        errors: {
          [BLOCK_IDS.PAX]:
            "An admin needs to set the nomination channel in Settings.",
        },
      });
      return;
    }

    const nomineeInfos = await Promise.all(
      nomineeIds.map((id) => client.users.info({ user: id })),
    );
    const botNominee = nomineeInfos.find((info) => info.user?.is_bot);
    if (botNominee) {
      await ack({
        response_action: "errors",
        errors: { [BLOCK_IDS.PAX]: "Bots can't be nominated." },
      });
      return;
    }

    await ack({
      response_action: "update",
      view: buildNominateConfirmView({
        channelName: settings.nominationChannelName ?? "",
      }),
    });

    const nomineeDisplayNames = new Map(
      nomineeIds.map((id, i) => [
        id,
        nomineeInfos[i]?.user?.profile?.display_name ||
          nomineeInfos[i]?.user?.real_name ||
          nomineeInfos[i]?.user?.name ||
          null,
      ]),
    );

    waitUntil(
      (async () => {
        const nominationId = await insertNomination({
          teamId,
          awardName,
          why,
          nominatorUserId: nominatorId,
        });
        await attachNominees(
          nominationId,
          nomineeIds.map((id) => ({
            userId: id,
            displayName: nomineeDisplayNames.get(id) ?? null,
          })),
        );

        const { blocks, text } = buildNominationMessageBlocks({
          nominationId,
          awardName,
          nomineeIds,
          why,
          nominatorId,
        });

        let posted: Awaited<ReturnType<typeof client.chat.postMessage>>;
        try {
          posted = await client.chat.postMessage({
            channel: settings.nominationChannelId!,
            blocks,
            text,
          });
        } catch {
          await client.chat.postMessage({
            channel: nominatorId,
            text: "Your PAXademy Awards nomination couldn't be posted. Please try again.",
          });
          await softDelete(nominationId, "system");
          return;
        }

        if (posted.ts) {
          await setMessageRef(
            nominationId,
            settings.nominationChannelId!,
            posted.ts,
          );
        }
      })(),
    );
  });
}
