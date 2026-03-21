-- Run this in the Supabase SQL Editor to create the beats table and RLS
-- Get your project URL and anon key from Settings > API in the Supabase dashboard

create table beats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  grid jsonb not null,
  tempo int not null default 120,
  created_at timestamptz default now(),
  unique(user_id, name)
);

alter table beats enable row level security;

create policy "Users can manage own beats"
  on beats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
