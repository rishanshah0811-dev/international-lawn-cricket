-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

create table players (
  id text primary key,
  name text not null,
  created_at bigint not null
);

create table matches (
  id text primary key,
  status text not null default 'setup',
  data jsonb not null,
  created_at bigint not null,
  updated_at bigint not null
);

-- Allow public access (no auth needed for this shared app)
alter table players enable row level security;
create policy "public_access" on players for all using (true) with check (true);

alter table matches enable row level security;
create policy "public_access" on matches for all using (true) with check (true);
