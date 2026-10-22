-- animeSnake leaderboard: keep the best 50 scores instead of 10 (the game still shows only the top 10).
--
-- Why: the database trims itself after every new score. With a limit of 10, one fake score pushes a real 10th place
-- out for good, and deleting the fake later cannot bring it back. With a limit of 50, real scores wait in places 11 to
-- 50, so after you delete a fake one from the Table Editor or SQL Editor they rise back into the top 10.
--
-- How to run it: Supabase, SQL Editor, New query, paste this whole file, Run. It only replaces the trimming function,
-- so your table, rules and existing scores are untouched. It is safe to run more than once.
-- Run tools/supabase_setup.sql first if you have not set the leaderboard up yet (that file already keeps 50).

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
    limit 50
  );
  return null;
end;
$$;

revoke execute on function public.trim_scores() from public, anon, authenticated;
