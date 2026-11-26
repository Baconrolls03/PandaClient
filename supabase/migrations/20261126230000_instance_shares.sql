-- Sharing mod instances between PandaClient players. Only the edge function (service role) touches these;
-- files live in a private storage bucket and are handed out through short-lived signed URLs.
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  from_uuid uuid not null references public.players(uuid) on delete cascade,
  to_uuid uuid not null references public.players(uuid) on delete cascade,
  name text not null,
  size bigint not null default 0,
  path text not null,
  ready boolean not null default false,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists shares_to_idx on public.shares (to_uuid, ready, dismissed);
alter table public.shares enable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('shares', 'shares', false, 104857600)
on conflict (id) do nothing;
