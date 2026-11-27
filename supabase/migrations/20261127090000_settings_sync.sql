-- PandaClient in-game settings (HUD layout, mods on/off, profiles) kept per player for cloud sync.
create table if not exists public.player_settings (
  uuid uuid primary key references public.players(uuid) on delete cascade,
  files jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.player_settings enable row level security;
-- Only the edge function (service role) reads or writes it.
