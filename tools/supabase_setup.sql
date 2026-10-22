-- animeSnake leaderboard: one-time Supabase setup.
--
-- How to run it: in your Supabase project open "SQL Editor", click "New query", paste this whole file, press Run.
-- It is safe to run once. (To start over, run:  drop table public.scores cascade;  and then this file again.)
--
-- What it does:
--   * creates the table `scores` (name = 1-3 letters or digits, score, wave, revives)
--   * lets anyone (the game running in a browser, using the publishable key) READ the scores and ADD a score,
--     but never change or delete one: there is no update or delete rule, so those are refused
--   * checks every new score against sensible limits, so garbage is rejected by the database itself
--   * after every insert, deletes everything outside the top 10, so the table never holds more than 10 rows
--
-- Limits you may want to change: the maximum score (500000 below) and, in trim_scores(), the 10.
-- Anyone can still post a fake score inside those limits from the browser console. That is normal for a game with
-- no server of its own; the limits just keep it from being absurd.

create table public.scores (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text    not null check (name ~ '^[A-Z0-9]{1,3}$'),
  score      integer not null check (score >= 1 and score <= 500000),
  wave       integer not null default 1 check (wave >= 0 and wave <= 1000),
  revives    integer not null default 0 check (revives >= 0 and revives <= 1000)
);

alter table public.scores enable row level security;

grant select, insert on public.scores to anon, authenticated;

create policy "anyone can read the leaderboard"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "anyone can add a score"
  on public.scores for insert
  to anon, authenticated
  with check (score >= 1 and score <= 500000);

-- Keep only the best 10 (earlier scores win ties). Runs with its own rights, because the browser may not delete.
create or replace function public.trim_scores()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.scores
  where id not in (
    select id from public.scores
    order by score desc, created_at asc, id asc
    limit 10
  );
  return null;
end;
$$;

revoke execute on function public.trim_scores() from public, anon, authenticated;

create trigger trim_scores_after_insert
  after insert on public.scores
  for each statement
  execute function public.trim_scores();
