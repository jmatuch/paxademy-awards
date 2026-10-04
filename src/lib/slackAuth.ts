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
