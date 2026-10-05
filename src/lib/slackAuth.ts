import type { WebClient } from "@slack/web-api";

// Re-checked on every admin-gated action (per spec §3) -- hiding a button is
// not authorization, so no caching here.
export async function isAdmin(
  client: WebClient,
  userId: string,
): Promise<boolean> {
  const result = await client.users.info({ user: userId });
  const user = result.user;
  return Boolean(user?.is_admin || user?.is_owner || user?.is_primary_owner);
}

// Scoped to the warm lambda instance -- resets on cold start, which is fine,
// it's just to cut down on repeat users.info calls within a burst of
// reactions (or a reconciliation pass) from the same person.
const botStatusCache = new Map<string, boolean>();

export async function isBotUser(
  client: WebClient,
  userId: string,
): Promise<boolean> {
  const cached = botStatusCache.get(userId);
  if (cached !== undefined) return cached;

  const result = await client.users.info({ user: userId });
  const isBot = Boolean(result.user?.is_bot);
  botStatusCache.set(userId, isBot);
  return isBot;
}
