import type { App } from "@slack/bolt";
import { waitUntil } from "@vercel/functions";
import { ACTION_IDS, BLOCK_IDS, CALLBACK_IDS } from "../lib/ids.js";
import { isAdmin } from "../lib/slackAuth.js";
import { getSettings } from "../db/settings.js";
import {
  getById,
  insertNomination,
  setMessageRef,
  softDelete,
  updateNomination,
} from "../db/nominations.js";
import { attachNominees, replaceNominees } from "../db/nominees.js";
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
    const submitterId = body.user.id;
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

    // For an edit, the "nominator" for self-nomination purposes is whoever
    // originally created the nomination, not whoever's editing it now
    // (could be an admin editing on someone else's behalf).
    let nominatorUserId = submitterId;
    let existing: Awaited<ReturnType<typeof getById>> = null;

    if (mode.type === "edit") {
      existing = await getById(mode.nominationId);
      if (!existing) {
        await ack({ response_action: "clear" });
        return;
      }
      const authorized =
        existing.nominatorUserId === submitterId ||
        (await isAdmin(client, submitterId));
      if (!authorized) {
        // The Edit button itself already gates this -- this only guards
        // against a forged/replayed submission.
        await ack({ response_action: "clear" });
        return;
      }
      nominatorUserId = existing.nominatorUserId;
    }

    if (nomineeIds.includes(nominatorUserId)) {
      await ack({
        response_action: "errors",
        errors: { [BLOCK_IDS.PAX]: "Nice try. Nominate someone else." },
      });
      return;
    }

    let channelId: string;
    let channelName = "";
    if (mode.type === "create") {
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
      channelId = settings.nominationChannelId;
      channelName = settings.nominationChannelName ?? "";
    } else {
      // An existing nomination always has a channel; it couldn't have been
      // created without one.
      channelId = existing!.channelId!;
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

    const nomineeDisplayNames = new Map(
      nomineeIds.map((id, i) => [
        id,
        nomineeInfos[i]?.user?.profile?.display_name ||
          nomineeInfos[i]?.user?.real_name ||
          nomineeInfos[i]?.user?.name ||
          null,
      ]),
    );

    if (mode.type === "create") {
      await ack({
        response_action: "update",
        view: buildNominateConfirmView({ channelName }),
      });

      waitUntil(
        (async () => {
          const nominationId = await insertNomination({
            teamId,
            awardName,
            why,
            nominatorUserId,
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
            nominatorId: nominatorUserId,
          });

          let posted: Awaited<ReturnType<typeof client.chat.postMessage>>;
          try {
            posted = await client.chat.postMessage({ channel: channelId, blocks, text });
          } catch {
            await client.chat.postMessage({
              channel: nominatorUserId,
              text: "Your PAXademy Awards nomination couldn't be posted. Please try again.",
            });
            await softDelete(nominationId, "system");
            return;
          }

          if (posted.ts) {
            await setMessageRef(nominationId, channelId, posted.ts);
          }
        })(),
      );
    } else {
      const nominationId = mode.nominationId;
      const messageTs = existing!.messageTs;
      await ack({ response_action: "clear" });

      waitUntil(
        (async () => {
          await updateNomination(nominationId, { awardName, why });
          await replaceNominees(
            nominationId,
            nomineeIds.map((id) => ({
              userId: id,
              displayName: nomineeDisplayNames.get(id) ?? null,
            })),
          );

          if (!messageTs) return;
          const { blocks, text } = buildNominationMessageBlocks({
            nominationId,
            awardName,
            nomineeIds,
            why,
            nominatorId: nominatorUserId,
            editedAt: new Date().toISOString(),
          });
          await client.chat.update({ channel: channelId, ts: messageTs, blocks, text });
        })(),
      );
    }
  });
}
