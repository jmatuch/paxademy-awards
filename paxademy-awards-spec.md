# PAXademy Awards — Slack App Spec

**Audience:** Claude Code (implementer)
**Owner:** Joe, F3 Wheaton
**Status:** Ready to build. Review §13 (assumed decisions) first.

---

## 1. Summary

A Slack app for F3 Wheaton that lets PAX nominate each other for "PAXademy Awards." It opens via `/paxademy-awards`. Nominations post to a channel set by an admin. Emoji reactions on those posts count as votes. The app also posts three kinds of scheduled messages: a daily "This date in PAXademy Awards history," a monthly recap with a Top 3, and a yearly Top 3.

**Every nomination is an award.** There is no separate winner selection. Votes only drive the Top 3 recaps.

**Look and feel:** match the F3 Nation Slack app. A slash command opens a modal with a stacked button menu, with Submit/Close in the footer and minimal emoji. All copy should use F3 tone: brotherhood and encouragement, never mockery. F3 terms (PAX, Q, VQ, AO) are fine in copy.

---

## 2. Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Hosting | Vercel serverless functions |
| Slack framework | `@slack/bolt`, served from Vercel. Use Vercel's Bolt adapter (`@vercel/slack-bolt`) if current; otherwise write a custom receiver. |
| Endpoints | `/api/slack` handles commands, interactivity, options, and events. `/api/cron/daily` handles scheduled posts. |
| Database | Supabase Postgres, accessed server-side only with the service role key |
| Scheduler | Supabase `pg_cron` + `pg_net` calling `/api/cron/daily` |
| Timezone | `America/Chicago` for all date logic, stored in `settings.timezone` |

The app is **single-workspace** (Wheaton only). The bot token lives in an env var and there is no OAuth install flow. Every table still carries `team_id`, so going multi-workspace later is a migration, not a rewrite.

**Env vars:** `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`

**Security:** enable RLS on every table with no policies. Only the server, using the service role key, touches data.

### Slack timing constraints (hard requirements)

- **Ack every Slack request within 3 seconds.**
- **`trigger_id` expires 3 seconds after the slash command.** Open the modal before doing anything slow.
  - The only allowed pre-open work is the `user_prefs.hide_intro` read, with a 1.5s timeout.
  - If the read times out, open with the intro shown.
  - Keep the `/api/slack` import graph small, because cold starts are the main risk.
- **Do slow work after the ack.** Posting, `chat.update`, and DB writes that aren't needed for the response go in `waitUntil` from `@vercel/functions`.

---

## 3. Roles

| Role | How determined | Permissions |
|---|---|---|
| PAX | Any non-bot workspace member | Nominate, view history, edit own nominations |
| Admin | `users.info` → `is_admin` \|\| `is_owner` \|\| `is_primary_owner` | All PAX permissions, plus Settings and edit/delete of any nomination |

Check admin status at action time. Hiding a button is not authorization, so re-check on every admin action.

---

## 4. Modals

Slack's modal stack holds 3 views max:

- Home is view 1.
- Top-level pages are pushed as view 2.
- Settings sub-pages are pushed as view 3.
- Anything deeper uses `views.update`.

Title for every view: `PAXademy Awards` (Slack's limit is 24 chars).

### 4.1 Home

- **Intro section.** Shown unless the user has hidden it. 2–4 sentences covering:
  - what the awards are,
  - how to nominate,
  - that reactions on a nomination are votes for the monthly and yearly Top 3.
- **"Don't show me this again" checkbox.** Put it in an `actions` block so it fires immediately and upserts `user_prefs.hide_intro = true`. Only render it while the intro is showing.
- **Intro hidden:** show one context line instead: "Intro hidden — tap How it works to see it again."
- **Stacked buttons:**
  - 🏆 Nominate a PAX
  - 📜 History
  - ❓ How it works
  - ⚙️ Settings (admins only)
- **Footer:** Close only.

### 4.2 How it works

- The full intro text, plus rules: how votes count (§6), when recaps post (§7), and who can edit or delete (§5).
- A checkbox **"Show the intro on the home screen,"** reflecting the current pref. This is how users un-hide the intro.

### 4.3 Nominate

| Field | Element | Rules |
|---|---|---|
| PAX | `multi_users_select` | Required, max 10 |
| Award | `external_select`, `min_query_length: 0` | Required (see picker below) |
| Why | `plain_text_input`, multiline | Optional, max 500 chars |

**Award picker (options handler).** Slack has no native combo box; this is the workaround.

- **Empty query:** return all active standard awards, ordered by `sort_order`.
- **Typed query:**
  - Return standard awards matching the query (case-insensitive substring).
  - If no award matches exactly, append a final option `✏️ Use "<query>"` with value `custom:<query>`.
  - Trim the query and cap it at 60 chars, since Slack option text is capped at 75.
- **Custom names are not added to the standard list.**

**Submit validation.** Return failures as `response_action: "errors"` so they show inline.

- A nominee is a bot (`users.info.is_bot`): "Bots can't be nominated."
- The nominator is a nominee: "Nice try. Nominate someone else." (see §13)
- No nomination channel is configured: "An admin needs to set the nomination channel in Settings."

**On success:**

1. Respond immediately with `response_action: "update"` to a confirmation view: "✅ Nomination submitted. It'll appear in #channel-name." Use the channel name cached in settings, so no API call is needed before the ack.
2. In `waitUntil`:
   1. Insert the nomination rows.
   2. Post to the channel (§5.1).
   3. Store `channel_id` and `message_ts`.
3. If posting fails, DM the nominator with the error and soft-delete the row.

### 4.4 History

**Range picker:** a `static_select` in an `actions` block. Changing it calls `views.update`.

| Option | Range (Chicago time) |
|---|---|
| YTD (default) | Jan 1 this year → now |
| Last month | Previous calendar month |
| Last year | Previous calendar year |
| All-time | Everything |

**List:**

- Show the most recent `HISTORY_LIMIT = 40` non-deleted nominations in the range, newest first. There is no paging.
- Each nomination is one section block:
  ```
  *Best Q* — <@U1>, <@U2>
  _"why text, truncated to 150 chars…"_
  by <@U3> · Mar 3, 2026 · 7 votes
  ```
- If more exist, add a context line: "Showing the 40 most recent of 127."
- **Empty state:** "No PAXademy Awards in this period yet. Be the first."
- Block budget: about 4 header/control blocks + 40 + 1 footer, which stays under Slack's 100-block modal limit.

### 4.5 Settings (admins only)

**Nomination channel**

- Use a `conversations_select` input with a filter that includes public and private channels and excludes shared channels. Save it with Submit.
- **On save:**
  - Public channel: call `conversations.join`. The bot must be in the channel to receive reaction events.
  - Private channel: call `conversations.info`. If it returns `channel_not_found`, the bot isn't a member. Show an inline error: "Invite the app first: `/invite @PAXademy Awards` in that channel."
- Store both `nomination_channel_id` and `nomination_channel_name`.

**Manage awards**

- A **Manage awards** button pushes view 3 (§4.6).

### 4.6 Manage Awards (admins only)

- **Award list:** one row per award with an overflow menu offering **Rename** and **Deactivate/Reactivate**.
- **Add award:** a button that swaps in a text input via `views.update`.
- **Deactivating** removes the award from the picker. Past nominations keep it.
- **Renaming** does **not** change past nominations, because `award_name` is snapshotted at submit time.
- **Seed list** (placeholders; Joe edits before launch):
  - Best Q
  - Best VQ
  - Most Improved
  - Iron PAX
  - Mumblechatter Champion
  - Brotherhood Award

---

## 5. Channel messages

### 5.1 Nomination post

- **Line 1:** `🏆 <@U1> and <@U2> nominated for *Best VQ*`
- **Why:** a blockquote, only if a why was provided.
- **Context line:** `Nominated by <@U3> · React to vote for the monthly Top 3`
- **Overflow menu** on the first section, with **Edit** and **Delete**.
  - Check permission on click.
  - If unauthorized, send an ephemeral: "Only the nominator or an admin can edit this." / "Only admins can delete nominations."
- **Always set a plain-text `text` fallback** so notifications read correctly.
- **After an edit:** the context line gets ` · edited`.

### 5.2 Edit

- Opens the Nominate modal prefilled via `initial_users`, `initial_option`, and `initial_value`.
- The nominator can edit their own nominations; admins can edit any.
- All fields are editable, with no time limit.
- **On save:**
  1. Update the DB.
  2. Set `edited_at`.
  3. Call `chat.update`.
- Reactions and votes carry over.

### 5.3 Delete (admins only)

- Show a Block Kit `confirm` dialog.
- Soft delete by setting `deleted_at` and `deleted_by`, then call `chat.delete`.
- Deleted nominations are excluded from history, recaps, and votes.

---

## 6. Votes (reactions)

**Events:** subscribe to `reaction_added` and `reaction_removed`.

**Processing:**

- Match the event's `item.channel` + `item.ts` against `nominations.channel_id` + `message_ts`. Ignore anything else, including reactions on recap posts.
- `reaction_added`: upsert a row per (nomination, user, emoji).
- `reaction_removed`: delete the matching row.
- Don't store reactions from bot users.

**Vote count** = distinct users who reacted with any emoji. The nominator and the nominees don't count.

**Reconciliation:** during the monthly recap, call `reactions.get` for that month's nominations and rewrite their rows. This catches missed events. The yearly Top 3 trusts the DB.

---

## 7. Scheduled posts

**Trigger:** one `pg_cron` job, `0 11,12 * * *` UTC. Together the two runs cover 6am Central in both CDT and CST. It calls `POST /api/cron/daily` with `Authorization: Bearer <CRON_SECRET>`. Store the secret in Supabase Vault, not inline SQL.

**Handler:**

1. Verify the bearer token. If it's wrong, return 401.
2. Compute `now` in `settings.timezone`. If the local hour ≠ 6, exit. This is what makes the two UTC runs safe.
3. Run each sub-job below independently. Each one has an idempotency key in `job_runs`, e.g. `this_date:2026-09-10`. Skip a job if its key already has status `ok`.
4. Record `ok` or `error` with detail. Support `?force=<job>&date=YYYY-MM-DD` (secret-protected) for manual reruns and testing.
5. Make `now` injectable so date logic is testable.

**Sub-jobs.** All post to the nomination channel.

| Job | Runs | Content | If empty |
|---|---|---|---|
| `this_date` | Daily | Nominations whose local month/day equals today, from **prior years only**, grouped by year (newest first). Header: "📜 This date in PAXademy Awards history…" | Skip |
| `monthly_recap` | 1st of month | Previous month: total count, list of nominations (cap 30, then "…and N more — see History in `/paxademy-awards`"), Top 3 by votes | Skip if zero nominations |
| `yearly_top3` | Jan 1 | Previous year: total count and Top 3 by votes | Skip if zero nominations |

**Rules:**

- **Feb 29:** in non-leap years, `this_date` on Feb 28 also includes Feb 29 nominations.
- **Top 3:**
  - A nomination needs at least 1 vote to qualify.
  - Order by votes descending, then earliest `created_at`.
  - All ties at 3rd place are included.
- **Jan 1:** post the December recap first, then the yearly Top 3.
- Keep each message under Slack's 50-block limit. Multi-line sections help.
- `<@U>` mentions notify the PAX. That's intended, since it reads as "a year ago today, you got recognized."

---

## 8. Data model (Postgres)

```sql
create table settings (
  team_id text primary key,
  nomination_channel_id text,
  nomination_channel_name text,
  timezone text not null default 'America/Chicago',
  updated_by text,
  updated_at timestamptz not null default now()
);

create table awards (
  id uuid primary key default gen_random_uuid(),
  team_id text not null,
  name text not null check (char_length(name) <= 60),
  active boolean not null default true,
  sort_order int not null default 0,
  created_by text,
  created_at timestamptz not null default now()
);
create unique index awards_team_name on awards (team_id, lower(name));

create table nominations (
  id uuid primary key default gen_random_uuid(),
  team_id text not null,
  award_id uuid references awards(id),          -- null for custom awards
  award_name text not null,                     -- snapshot at submit/edit
  why text check (char_length(why) <= 500),
  nominator_user_id text not null,
  channel_id text,
  message_ts text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by text
);
create unique index nominations_message on nominations (channel_id, message_ts);
create index nominations_team_created on nominations (team_id, created_at desc)
  where deleted_at is null;

create table nomination_nominees (
  nomination_id uuid references nominations(id) on delete cascade,
  user_id text not null,
  display_name text,                            -- fallback if user leaves Slack
  primary key (nomination_id, user_id)
);

create table nomination_reactions (
  nomination_id uuid references nominations(id) on delete cascade,
  user_id text not null,
  emoji text not null,
  primary key (nomination_id, user_id, emoji)
);

create table user_prefs (
  team_id text not null,
  user_id text not null,
  hide_intro boolean not null default false,
  primary key (team_id, user_id)
);

create table job_runs (
  job_key text primary key,                     -- e.g. 'monthly_recap:2026-09'
  status text not null,                         -- 'ok' | 'error'
  detail text,
  ran_at timestamptz not null default now()
);

create view nomination_votes as
select n.id as nomination_id,
       count(distinct r.user_id) as votes
from nominations n
left join nomination_reactions r
  on r.nomination_id = n.id
 and r.user_id <> n.nominator_user_id
 and not exists (
       select 1 from nomination_nominees nn
       where nn.nomination_id = n.id and nn.user_id = r.user_id)
where n.deleted_at is null
group by n.id;
```

---

## 9. Slack app manifest

Replace `YOUR-APP` with the Vercel domain.

```yaml
display_information:
  name: PAXademy Awards
  description: Nominate fellow PAX for PAXademy Awards
  background_color: "#1a1a1a"
features:
  bot_user:
    display_name: PAXademy Awards
    always_online: true
  slash_commands:
    - command: /paxademy-awards
      url: https://YOUR-APP.vercel.app/api/slack
      description: Nominate a PAX, browse history, or change settings
      should_escape: false
oauth_config:
  scopes:
    bot:
      - commands
      - chat:write
      - chat:write.public
      - channels:read
      - channels:join
      - groups:read
      - users:read
      - reactions:read
settings:
  event_subscriptions:
    request_url: https://YOUR-APP.vercel.app/api/slack
    bot_events:
      - reaction_added
      - reaction_removed
  interactivity:
    is_enabled: true
    request_url: https://YOUR-APP.vercel.app/api/slack
    message_menu_options_url: https://YOUR-APP.vercel.app/api/slack
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
```

---

## 10. Code organization

- Block Kit builders are **pure functions** (`src/views/*`) with unit tests.
- Date logic lives in one module (`src/lib/time.ts`) with unit tests for:
  - range boundaries,
  - Feb 29,
  - DST transition days,
  - the 1st of the month and Jan 1.
- DB access goes through `src/db/*`. Handlers never build SQL inline.
- Migrations go in `supabase/migrations/`, with the award seed in its own migration.

---

## 11. Build order

Stop after each phase so Joe can test in Slack.

1. Supabase schema + seed. Create the Slack app from the manifest. Deploy a Vercel skeleton with signature verification.
2. `/paxademy-awards` → Home, How it works, intro pref.
3. Settings: channel picker, Manage Awards.
4. Nominate → channel post.
5. Edit / Delete.
6. History.
7. Reaction events → votes.
8. Daily cron + `force` endpoint.
9. Run the acceptance checks (§12).

---

## 12. Acceptance checks

**Modal and Settings**

- [ ] The slash command opens the modal on a cold start without `expired_trigger_id`.
- [ ] Hiding the intro persists across sessions. It can be re-enabled from How it works.
- [ ] A non-admin never sees Settings, and forged admin actions are rejected server-side.
- [ ] A private channel without the bot gives a clear error in Settings.

**Nominating, editing, deleting**

- [ ] A typed custom award posts with that name and does not appear in the standard list.
- [ ] Self-nominations and bot nominees are rejected inline.
- [ ] The nominator can edit, and the channel message updates with "edited." Another PAX gets an ephemeral denial.
- [ ] An admin delete removes the message, and the nomination disappears from history, recaps, and votes.

**History and votes**

- [ ] History ranges are correct at month and year boundaries in Chicago time. The "Showing 40 of N" line is accurate.
- [ ] Reactions from the nominator or nominees don't count. Removing a reaction decrements the count.

**Scheduled posts**

- [ ] Forced daily runs with mocked dates are correct for:
  - a normal day,
  - the 1st of the month,
  - Jan 1 (both posts, in order),
  - Feb 28 in a non-leap year,
  - both DST changeover days.
- [ ] Two triggers on the same day post once.

---

## 13. Assumed decisions (confirm or change before building)

1. **History:** shows the 40 most recent nominations in the selected range, with no paging.
2. **Self-nomination** is blocked.
3. **A vote** is any emoji, one per person, excluding the nominator and the nominees.
4. **Monthly recap** posts at 6am on the 1st and covers the prior month. This way the month is complete and reactions have settled a bit.
5. **Nominator edits:** all fields, anytime, and an "edited" marker is shown.
6. **Empty periods** get no recap post.
7. **Custom award names** never join the standard list automatically.
8. **Seed award list** in §4.6.

## 14. Out of scope (v1)

- Multi-workspace OAuth
- F3 Nation database integration
- Backfill or import of historical awards
- App Home tab
- Analytics
