-- Standard awards are deferred to a future objective/stats-based phase
-- (spec §15) rather than being PAX-nominated from a curated list. Every
-- nomination is now a free-text award name; the standard awards table and
-- its seed data are no longer used.
alter table nominations drop column award_id;
drop table awards;
