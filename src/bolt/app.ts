import { App } from "@slack/bolt";
import { VercelReceiver } from "@vercel/slack-bolt";
import { env } from "../lib/env.js";

export const receiver = new VercelReceiver({
  signingSecret: env.SLACK_SIGNING_SECRET,
});

export const app = new App({
  token: env.SLACK_BOT_TOKEN,
  signingSecret: env.SLACK_SIGNING_SECRET,
  receiver,
});

// Placeholder: proves signature verification + deployment wiring end-to-end.
// Real Home-view logic replaces this in Phase 2.
app.command("/paxademy-awards", async ({ ack }) => {
  await ack();
});
