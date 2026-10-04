import type { App } from "@slack/bolt";
import { WebAPIPlatformError } from "@slack/web-api";
import { ACTION_IDS, CALLBACK_IDS } from "../lib/ids.js";
import { isAdmin } from "../lib/slackAuth.js";
import { getSettings, upsertNominationChannel } from "../db/settings.js";
import { buildSettingsView, CHANNEL_ACTION_ID } from "../views/settings.js";

const CHANNEL_BLOCK_ID = "nomination_channel_block";

export function registerSettingsHandlers(app: App): void {
  app.action(ACTION_IDS.SETTINGS_BTN, async ({ ack, body, client }) => {
    await ack();
    const action = body as typeof body & {
      user: { id: string };
      team: { id: string };
      trigger_id: string;
    };

    if (!(await isAdmin(client, action.user.id))) return;

    const settings = await getSettings(action.team.id);
    await client.views.push({
      trigger_id: action.trigger_id,
      view: buildSettingsView({ channelId: settings.nominationChannelId }),
    });
  });

  app.view(CALLBACK_IDS.SETTINGS, async ({ ack, body, client }) => {
    const teamId = body.team?.id;
    const userId = body.user.id;

    if (!teamId || !(await isAdmin(client, userId))) {
      await ack();
      return;
    }

    const channelId =
      body.view.state.values[CHANNEL_BLOCK_ID]?.[CHANNEL_ACTION_ID]
        ?.selected_conversation;

    if (!channelId) {
      await ack({
        response_action: "errors",
        errors: { [CHANNEL_BLOCK_ID]: "Pick a channel." },
      });
      return;
    }

    try {
      const info = await client.conversations.info({ channel: channelId });
      const channelName = info.channel?.name ?? channelId;

      if (!info.channel?.is_private) {
        await client.conversations.join({ channel: channelId });
      }

      await upsertNominationChannel(teamId, channelId, channelName, userId);
      await ack();
    } catch (error) {
      if (
        error instanceof WebAPIPlatformError &&
        error.data.error === "channel_not_found"
      ) {
        await ack({
          response_action: "errors",
          errors: {
            [CHANNEL_BLOCK_ID]:
              "Invite the app first: /invite @PAXademy Awards in that channel.",
          },
        });
        return;
      }
      throw error;
    }
  });
}
