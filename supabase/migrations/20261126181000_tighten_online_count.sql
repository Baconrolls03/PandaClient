-- online_count is only called by the "api" edge function (service role); nobody else needs it.
revoke execute on function public.online_count() from anon, authenticated;
-- pg_net was only used to test the edge function from inside the database.
drop extension if exists pg_net;
