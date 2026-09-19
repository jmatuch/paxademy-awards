-- PAXademy Awards: initial schema (spec §8)

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

-- Security: RLS enabled with no policies on every table. Only the server,
-- using the service role key (which bypasses RLS), touches data. This purely
-- blocks anon/authenticated PostgREST access.
alter table settings enable row level security;
alter table awards enable row level security;
alter table nominations enable row level security;
alter table nomination_nominees enable row level security;
alter table nomination_reactions enable row level security;
alter table user_prefs enable row level security;
alter table job_runs enable row level security;
