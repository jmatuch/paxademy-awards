import type { App } from "@slack/bolt";
import type { WebClient } from "@slack/web-api";
import { findByMessageRef } from "../db/nominations.js";
import { deleteReaction, upsertReaction } from "../db/reactions.js";

// Scoped to the warm lambda instance -- resets on cold start, which is fine,
// it's just to cut down on repeat users.info calls within a burst of
// reactions from the same person.
const botStatusCache = new Map<string, boolean>();

async function isBotUser(client: WebClient, userId: string): Promise<boolean> {
  const cached = botStatusCache.get(userId);
  if (cached !== undefined) return cached;

  const result = await client.users.info({ user: userId });
  const isBot = Boolean(result.user?.is_bot);
  botStatusCache.set(userId, isBot);
  return isBot;
}

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
