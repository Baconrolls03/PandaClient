-- Lobby parties (already live: recorded here so the repo matches the database).
create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  leader uuid not null references public.players(uuid) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.party_members (
  uuid uuid primary key references public.players(uuid) on delete cascade,
  party_id uuid not null references public.parties(id) on delete cascade,
  joined_at timestamptz not null default now()
);
create table if not exists public.party_invites (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  from_uuid uuid not null references public.players(uuid) on delete cascade,
  to_uuid uuid not null references public.players(uuid) on delete cascade,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.parties enable row level security;
alter table public.party_members enable row level security;
alter table public.party_invites enable row level security;

-- Party chat (lobby and in game). Only the API (service role) reads or writes it.
create table if not exists public.party_messages (
  id bigint generated always as identity primary key,
  party_id uuid not null references public.parties(id) on delete cascade,
  from_uuid uuid not null references public.players(uuid) on delete cascade,
  text text not null check (char_length(text) between 1 and 200),
  created_at timestamptz not null default now()
);
create index if not exists party_messages_party_id_id on public.party_messages (party_id, id);
alter table public.party_messages enable row level security;
