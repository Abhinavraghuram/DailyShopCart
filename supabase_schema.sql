-- Daily Cart: Supabase database setup
-- Run this entire script in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity numeric not null default 1 check (quantity > 0),
  unit text not null default 'pcs',
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  priority_order integer generated always as (
    case priority
      when 'high' then 1
      when 'medium' then 2
      else 3
    end
  ) stored,
  category text not null default 'Groceries',
  location text,
  link text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.shopping_items enable row level security;

-- This app intentionally has no login.
-- These policies make the list usable from a public static site.
-- Anyone who has the app URL and its public anon key can read/write the table.
drop policy if exists "anon can read shopping items" on public.shopping_items;
create policy "anon can read shopping items"
on public.shopping_items
for select
to anon
using (true);

drop policy if exists "anon can insert shopping items" on public.shopping_items;
create policy "anon can insert shopping items"
on public.shopping_items
for insert
to anon
with check (true);

drop policy if exists "anon can update shopping items" on public.shopping_items;
create policy "anon can update shopping items"
on public.shopping_items
for update
to anon
using (true)
with check (true);

drop policy if exists "anon can delete shopping items" on public.shopping_items;
create policy "anon can delete shopping items"
on public.shopping_items
for delete
to anon
using (true);

-- Optional: helpful indexes.
create index if not exists shopping_items_priority_idx
on public.shopping_items (priority_order, created_at desc);

create index if not exists shopping_items_category_idx
on public.shopping_items (category);
