-- Party invites: a friend asks you to join them on the server they're playing on.
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  from_uuid uuid not null references public.players(uuid) on delete cascade,
  to_uuid uuid not null references public.players(uuid) on delete cascade,
  server text not null,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists invites_to_idx on public.invites (to_uuid, dismissed, created_at);
alter table public.invites enable row level security;
