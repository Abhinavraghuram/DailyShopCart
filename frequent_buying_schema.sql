-- Daily Cart: Frequent Buying setup
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.frequent_buying_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists frequent_buying_items_name_lower_idx
on public.frequent_buying_items (lower(name));

alter table public.frequent_buying_items enable row level security;

drop policy if exists "anon can read frequent buying items" on public.frequent_buying_items;
create policy "anon can read frequent buying items"
on public.frequent_buying_items
for select
to anon
using (true);

drop policy if exists "anon can insert frequent buying items" on public.frequent_buying_items;
create policy "anon can insert frequent buying items"
on public.frequent_buying_items
for insert
to anon
with check (true);

drop policy if exists "anon can delete frequent buying items" on public.frequent_buying_items;
create policy "anon can delete frequent buying items"
on public.frequent_buying_items
for delete
to anon
using (true);
