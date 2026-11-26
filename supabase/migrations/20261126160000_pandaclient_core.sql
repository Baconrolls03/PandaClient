-- Players are identified by their Minecraft UUID, verified through Mojang's session server.
create table public.players (
  uuid uuid primary key,
  username text not null,
  created_at timestamptz not null default now(),
  last_seen timestamptz
);

-- PandaClient session tokens (only a SHA-256 hash is stored).
create table public.sessions (
  token_hash text primary key,
  uuid uuid not null references public.players(uuid) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_uuid_idx on public.sessions(uuid);

-- One-time server ids for the Mojang join/hasJoined check.
create table public.challenges (
  server_id text primary key,
  created_at timestamptz not null default now()
);

-- Cosmetic catalogue. `model` describes how to draw it (shared by launcher preview and the in-game mod).
create table public.cosmetics (
  id text primary key,
  name text not null,
  category text not null check (category in ('cape', 'hat', 'mask', 'bandana', 'glasses', 'wings', 'backpack')),
  rarity text not null default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary')),
  model jsonb not null default '{}'::jsonb,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- What each player has equipped: { "cape": "panda-classic", "hat": "beanie", ... }
create table public.loadouts (
  uuid uuid primary key references public.players(uuid) on delete cascade,
  equipped jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;
alter table public.sessions enable row level security;
alter table public.challenges enable row level security;
alter table public.cosmetics enable row level security;
alter table public.loadouts enable row level security;

create policy "cosmetics are public" on public.cosmetics for select to anon, authenticated using (true);
create policy "loadouts are public" on public.loadouts for select to anon, authenticated using (true);

create or replace function public.online_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.players where last_seen > now() - interval '2 minutes';
$$;
revoke all on function public.online_count() from public;
grant execute on function public.online_count() to anon, authenticated;
