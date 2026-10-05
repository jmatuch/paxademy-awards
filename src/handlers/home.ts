import type { App } from "@slack/bolt";
import { waitUntil } from "@vercel/functions";
import { ACTION_IDS } from "../lib/ids.js";
import { isAdmin } from "../lib/slackAuth.js";
import { getHideIntro, setHideIntro } from "../db/userPrefs.js";
import { buildHomeView } from "../views/home.js";
import { buildHowItWorksView } from "../views/howItWorks.js";

const HIDE_INTRO_TIMEOUT_MS = 1500;

// The only pre-open work allowed before views.open (per spec §2) -- the
// trigger_id expires 3s after the slash command, so this races a 1.5s
// timeout and defaults to showing the intro if the read doesn't land in time.
async function getHideIntroSafe(
  teamId: string,
  userId: string,
): Promise<boolean> {
  try {
    return await Promise.race([
      getHideIntro(teamId, userId),
      new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), HIDE_INTRO_TIMEOUT_MS),
      ),
    ]);
  } catch {
    return false;
  }
}

export function registerHomeHandlers(app: App): void {
  app.command("/paxademy-awards", async ({ ack, command, client }) => {
    const { team_id: teamId, user_id: userId } = command;
    const hideIntro = await getHideIntroSafe(teamId, userId);

    await ack();

    const opened = await client.views.open({
      trigger_id: command.trigger_id,
      view: buildHomeView({ hideIntro, isAdmin: false }),
    });

    // Admin status is deliberately checked *after* the modal is already
    // open -- it's the only API call besides the hide_intro read that
    // would otherwise compete for the 3s trigger_id window. Non-admins
    // never see Settings either way; the real gate is the server-side
    // check on the Settings action itself (spec §3).
    waitUntil(
      (async () => {
        const admin = await isAdmin(client, userId);
        if (!admin || !opened.view?.id) return;
        await client.views.update({
          view_id: opened.view.id,
          view: buildHomeView({ hideIntro, isAdmin: true }),
        });
      })(),
    );
  });

  app.action(
    ACTION_IDS.HIDE_INTRO_CHECKBOX,
    async ({ ack, body, client }) => {
      await ack();
      const action = body as typeof body & {
        team: { id: string };
        user: { id: string };
        view: { id: string };
      };
      const teamId = action.team.id;
      const userId = action.user.id;

      await setHideIntro(teamId, userId, true);
      const admin = await isAdmin(client, userId);
      await client.views.update({
        view_id: action.view.id,
        view: buildHomeView({ hideIntro: true, isAdmin: admin }),
      });
    },
  );

  app.action(ACTION_IDS.HOW_IT_WORKS_BTN, async ({ ack, body, client }) => {
    await ack();
    const action = body as typeof body & {
      team: { id: string };
      user: { id: string };
      trigger_id: string;
    };
    const showIntroChecked = !(await getHideIntro(
      action.team.id,
      action.user.id,
    ));
    await client.views.push({
      trigger_id: action.trigger_id,
      view: buildHowItWorksView({ showIntroChecked }),
    });
  });

  app.action(
    ACTION_IDS.SHOW_INTRO_CHECKBOX,
    async ({ ack, body, client }) => {
      await ack();
      const action = body as typeof body & {
        team: { id: string };
        user: { id: string };
        view: { id: string };
      };
      await setHideIntro(action.team.id, action.user.id, false);
      await client.views.update({
        view_id: action.view.id,
        view: buildHowItWorksView({ showIntroChecked: true }),
      });
    },
  );

  // History isn't built yet (Phase 6) -- ack so clicking doesn't error out,
  // no-op otherwise until then. Nominate/Settings are registered by
  // registerNominateHandlers/registerSettingsHandlers.
  app.action(ACTION_IDS.HISTORY_BTN, async ({ ack }) => {
    await ack();
  });
}
