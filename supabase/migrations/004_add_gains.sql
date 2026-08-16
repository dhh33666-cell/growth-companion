alter table public.profiles
  add column if not exists gain_categories jsonb not null default '[]'::jsonb;

create table if not exists public.gains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term text not null,
  definition text not null default '',
  source text not null default '',
  category text not null default '其他',
  logged_date date not null,
  created_at timestamptz not null default now()
);

alter table public.gains enable row level security;

create policy "gains are private" on public.gains
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
