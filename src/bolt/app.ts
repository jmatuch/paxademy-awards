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
  // @vercel/slack-bolt's createHandler() always calls `app.init()` itself at
  // request time. Without this flag, Bolt finishes initializing eagerly in
  // the constructor and discards the token reference that second init()
  // call needs, causing every request to fail with AppInitializationError.
  deferInitialization: true,
});

// Placeholder: proves signature verification + deployment wiring end-to-end.
// Real Home-view logic replaces this in Phase 2.
app.command("/paxademy-awards", async ({ ack }) => {
  await ack();
});
