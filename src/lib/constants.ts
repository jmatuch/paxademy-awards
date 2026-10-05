// Slack's modal title limit is 24 chars; this string is well under it.
export const VIEW_TITLE = "PAXademy Awards";

export const HISTORY_LIMIT = 40;
export const MONTHLY_RECAP_CAP = 30;

// Single-workspace app (F3 Wheaton) -- no OAuth install flow, so there's no
// Slack payload to pull team_id from in the cron path. Matches the value
// seeded in supabase/migrations/*_seed_awards.sql.
export const TEAM_ID = "THA09292B";
