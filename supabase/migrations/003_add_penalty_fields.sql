alter table public.tasks
  add column if not exists penalized boolean not null default false,
  add column if not exists penalty_xp integer not null default 0,
  add column if not exists penalty_stats jsonb not null default '{}'::jsonb;
