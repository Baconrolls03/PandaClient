-- Friends between PandaClient players (a asked b) and what server each player is on (from the launcher heartbeat).
create table if not exists public.friends (
  a uuid not null references public.players(uuid) on delete cascade,
  b uuid not null references public.players(uuid) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a <> b)
);
create index if not exists friends_b_idx on public.friends (b);
alter table public.friends enable row level security;
alter table public.players add column if not exists server text;
alter table public.players add column if not exists server_at timestamptz;
