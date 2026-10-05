import type { App } from "@slack/bolt";
import { isBotUser } from "../lib/slackAuth.js";
import { findByMessageRef } from "../db/nominations.js";
import { deleteReaction, upsertReaction } from "../db/reactions.js";

export function registerReactionHandlers(app: App): void {
  app.event("reaction_added", async ({ event, client }) => {
    if (event.item.type !== "message") return;

    const nomination = await findByMessageRef(event.item.channel, event.item.ts);
    if (!nomination) return;

    if (await isBotUser(client, event.user)) return;

    await upsertReaction(nomination.id, event.user, event.reaction);
  });

  app.event("reaction_removed", async ({ event, client }) => {
    if (event.item.type !== "message") return;

    const nomination = await findByMessageRef(event.item.channel, event.item.ts);
    if (!nomination) return;

    if (await isBotUser(client, event.user)) return;

    await deleteReaction(nomination.id, event.user, event.reaction);
  });
}
