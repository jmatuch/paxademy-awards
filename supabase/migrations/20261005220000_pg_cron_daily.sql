-- Scheduled daily cron job (spec §7): two UTC firings (11:00 and 12:00)
-- together cover 6am Central in both CDT and CST; the handler itself gates
-- on local hour == 6, so the "wrong" one of the two is a safe no-op.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- IMPORTANT: this creates the vault secret with a placeholder value. After
-- applying this migration, update it to the real CRON_SECRET (the same
-- value set as the Vercel env var) by running the following directly in
-- the Supabase SQL Editor -- never commit the real secret to a file:
--
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'cron_secret'),
--     '<paste the real CRON_SECRET value here>'
--   );
select vault.create_secret('CRON_SECRET_PLACEHOLDER', 'cron_secret');

select cron.schedule(
  'paxademy-awards-daily',
  '0 11,12 * * *',
  $$
  select net.http_post(
    url := 'https://paxademy-awards.vercel.app/api/cron/daily',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'cron_secret'
      )
    )
  );
  $$
);
