// Slack's modal title limit is 24 chars; this string is well under it.
export const VIEW_TITLE = "PAXademy Awards";

export const HISTORY_LIMIT = 40;
export const MONTHLY_RECAP_CAP = 30;

// Single-workspace app (F3 Wheaton) -- no OAuth install flow, so there's no
// Slack payload to pull team_id from in the cron path. Matches the value
// seeded in supabase/migrations/*_seed_awards.sql.
export const TEAM_ID = "THA09292B";

// Slackbot and the "Slack" platform/system user are special accounts, not
// app-installed bots -- both report is_bot: false from users.info (and both
// IDs are fixed Slack platform constants, identical across every workspace,
// not provisioned per-team), so bot-detection needs this explicit exception
// alongside the is_bot flag check.
export const SYSTEM_USER_IDS = ["USLACKBOT", "USLACK"] as const;
