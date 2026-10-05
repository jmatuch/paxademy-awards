import { WebClient } from "@slack/web-api";
import { env } from "./env.js";

// Deliberately NOT imported from src/bolt/app.ts -- that pulls in the whole
// interactive-handler import graph (api/slack.ts's cold-start concern, per
// spec §2). The cron path only needs a plain API client.
export const slackClient = new WebClient(env.SLACK_BOT_TOKEN);
