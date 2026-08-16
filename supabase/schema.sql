-- Run in the Supabase SQL editor after creating the project.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_name text not null default '探索者',
  goal text not null default '',
  timezone text not null default 'Asia/Shanghai',
  onboarded boolean not null default false,
  total_xp integer not null default 0,
  intellect integer not null default 0,
  creativity integer not null default 0,
  vitality integer not null default 0,
  endurance integer not null default 0,
  discipline integer not null default 0,
  gain_categories jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  track text not null,
  scheduled_date date not null,
  planned_minutes integer not null default 25,
  actual_minutes integer,
  is_main boolean not null default false,
  completed boolean not null default false,
  notes text,
  penalized boolean not null default false,
  penalty_xp integer not null default 0,
  penalty_stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null,
  movements jsonb not null default '[]'::jsonb,
  state text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null,
  meal_type text not null,
  content text not null,
  health_level text not null,
  is_reward boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null,
  category text not null,
  minutes integer not null default 0,
  completed boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  xp integer not null,
  attribute_delta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (task_id)
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '🎁',
  reward_type text not null,
  cost numeric(10,2) not null default 0,
  cooldown_days integer not null default 0,
  weekly_limit integer not null default 1,
  enabled boolean not null default true,
  awarded_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.memory_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  summary_type text not null,
  content text not null,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

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

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.workout_logs enable row level security;
alter table public.meal_logs enable row level security;
alter table public.habit_logs enable row level security;
alter table public.xp_events enable row level security;
alter table public.rewards enable row level security;
alter table public.memory_summaries enable row level security;
alter table public.gains enable row level security;

create policy "profiles are private" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "tasks are private" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workouts are private" on public.workout_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "meals are private" on public.meal_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habits are private" on public.habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "xp events are private" on public.xp_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "rewards are private" on public.rewards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "memories are private" on public.memory_summaries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gains are private" on public.gains
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
