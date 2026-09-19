-- PAXademy Awards: seed award list (spec §4.6 placeholders)
do $$
declare
  wheaton_team_id text := 'THA09292B'; -- F3 Wheaton Slack workspace team ID
begin
  insert into awards (team_id, name, sort_order) values
    (wheaton_team_id, 'Best Q', 0),
    (wheaton_team_id, 'Best VQ', 1),
    (wheaton_team_id, 'Most Improved', 2),
    (wheaton_team_id, 'Iron PAX', 3),
    (wheaton_team_id, 'Mumblechatter Champion', 4),
    (wheaton_team_id, 'Brotherhood Award', 5);
end $$;
