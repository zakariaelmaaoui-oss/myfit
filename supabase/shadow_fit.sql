-- SHADOW FIT — database schema. Paste the whole file into Supabase → SQL Editor → Run (safe to run again).
-- Every table is prefixed sf_ (SHADOW FIT).
-- Every personal table carries user_id and is protected by Row Level Security: a user can only read/write their own rows.

create or replace function public.sf_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- hunter profile & targets ----------
create table if not exists public.sf_profiles (
  id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 60),
  age int not null check (age between 13 and 100),
  sex text not null check (sex in ('male','female','other')),
  height_cm numeric not null check (height_cm between 120 and 230),
  weight_kg numeric not null check (weight_kg between 30 and 300),
  start_weight_kg numeric check (start_weight_kg between 30 and 300),
  target_weight_kg numeric check (target_weight_kg between 30 and 300),
  goal text not null check (goal in ('lose','maintain','healthy','muscle')),
  activity text not null check (activity in ('sedentary','light','moderate','active','very_active')),
  experience text not null default 'beginner' check (experience in ('beginner','intermediate','advanced')),
  location text not null default 'home' check (location in ('home','gym','outdoor')),
  equipment text[] not null default '{}',
  training_days int not null default 3 check (training_days between 2 and 6),
  session_minutes int not null default 30 check (session_minutes between 10 and 120),
  limitations text check (char_length(limitations) <= 300),
  diet text not null default 'none' check (diet in ('none','vegetarian','vegan','pescatarian','halal')),
  allergies text[] not null default '{}',
  budget text not null default 'medium' check (budget in ('low','medium','high')),
  cuisines text[] not null default '{moroccan}',
  language text not null default 'dar' check (language in ('dar','ar','fr','en')),
  title text default 'Shadow Initiate',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.sf_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  effective_from date not null default current_date,
  kcal int check (kcal between 1000 and 6000), protein int, carbs int, fat int, fiber int,
  water_ml int not null check (water_ml between 1000 and 5000),
  bmr int, tdee int, reason text,
  created_at timestamptz not null default now(),
  unique (user_id, effective_from)
);

-- ---------- RPG ----------
create table if not exists public.sf_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  kind text not null, ref text not null,
  xp int not null check (xp between 0 and 500),
  attribute text check (attribute in ('strength','endurance','discipline','consistency','fitness')),
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref) -- the same achievement can never pay twice
);

create table if not exists public.sf_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date date not null, key text not null,
  kind text not null check (kind in ('workout','exercise','walk','meals','protein','water','evaluation','recovery','custom')),
  title text not null, detail text, instructions text,
  target numeric not null default 1, progress numeric not null default 0, unit text,
  xp int not null check (xp between 0 and 100), difficulty text not null default 'E' check (difficulty in ('E','D','C','B','A','S')),
  attribute text, meta jsonb not null default '{}'::jsonb,
  source text not null default 'system' check (source in ('system','ai','user')),
  status text not null default 'active' check (status in ('active','done','skipped')),
  completed_at timestamptz, created_at timestamptz not null default now(),
  unique (user_id, date, key)
);

create table if not exists public.sf_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  week_start date not null, key text not null, title text not null,
  target numeric not null, progress numeric not null default 0, xp int not null check (xp between 0 and 300),
  status text not null default 'active' check (status in ('active','done')),
  created_at timestamptz not null default now(),
  unique (user_id, week_start, key)
);

create table if not exists public.sf_achievements (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  key text not null, unlocked_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- ---------- nutrition ----------
create table if not exists public.sf_food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date date not null, meal text not null check (meal in ('breakfast','lunch','dinner','snack')),
  name text not null check (char_length(name) between 1 and 160),
  food_id text, recipe_id text, grams numeric check (grams between 0 and 5000), servings numeric check (servings between 0 and 20),
  kcal numeric not null check (kcal between 0 and 5000),
  protein numeric check (protein between 0 and 500), carbs numeric check (carbs between 0 and 800),
  fat numeric check (fat between 0 and 400), fiber numeric check (fiber between 0 and 200),
  source text not null check (source in ('database','recipe','custom','ai_estimate','manual','photo_estimate')),
  estimate boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists sf_food_logs_day on public.sf_food_logs (user_id, date);

create table if not exists public.sf_custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 120),
  kcal numeric not null check (kcal between 0 and 900), protein numeric check (protein between 0 and 100),
  carbs numeric check (carbs between 0 and 100), fat numeric check (fat between 0 and 100), fiber numeric check (fiber between 0 and 100),
  serving_g numeric check (serving_g between 1 and 2000), serving_label text,
  created_at timestamptz not null default now()
);

create table if not exists public.sf_water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date date not null, ml int not null check (ml between 50 and 3000),
  created_at timestamptz not null default now()
);
create index if not exists sf_water_day on public.sf_water_logs (user_id, date);

create table if not exists public.sf_favorite_recipes (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  recipe_id text not null, created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

-- ---------- training ----------
create table if not exists public.sf_training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null, active boolean not null default true,
  days jsonb not null, -- [{dow:0-6, focus, name, exercises:[exercise ids]}]
  created_at timestamptz not null default now()
);
create unique index if not exists sf_one_active_plan on public.sf_training_plans (user_id) where active;

create table if not exists public.sf_exercise_progress ( -- adaptive prescription per exercise
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  exercise_id text not null,
  sets int not null check (sets between 1 and 10),
  reps int check (reps between 1 and 100), seconds int check (seconds between 5 and 3600),
  load_kg numeric check (load_kg between 0 and 500),
  good_streak int not null default 0, bad_streak int not null default 0,
  last_change text, last_change_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create table if not exists public.sf_workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date date not null, name text not null, plan_dow int,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  started_at timestamptz not null default now(), finished_at timestamptz,
  minutes int check (minutes between 0 and 600), rpe int check (rpe between 1 and 10),
  completed_ratio numeric check (completed_ratio between 0 and 1), kcal int, notes text,
  created_at timestamptz not null default now()
);
create index if not exists sf_sessions_day on public.sf_workout_sessions (user_id, date);

create table if not exists public.sf_exercise_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  session_id uuid references public.sf_workout_sessions(id) on delete cascade,
  date date not null, exercise_id text not null, set_no int not null default 1,
  reps int check (reps between 0 and 500), seconds int check (seconds between 0 and 36000),
  load_kg numeric check (load_kg between 0 and 500), distance_km numeric check (distance_km between 0 and 300),
  rpe int check (rpe between 1 and 10),
  created_at timestamptz not null default now()
);
create index if not exists sf_sets_day on public.sf_exercise_sets (user_id, date);

create table if not exists public.sf_personal_records (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  exercise_id text not null, metric text not null check (metric in ('reps','load_kg','seconds','distance_km')),
  value numeric not null, achieved_on date not null,
  times_beaten int not null default 0, -- 0 = first value (baseline), >0 = a real record was broken
  primary key (user_id, exercise_id, metric)
);
alter table public.sf_personal_records add column if not exists times_beaten int not null default 0;

create table if not exists public.sf_checkins ( -- evening evaluation / recovery
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date date not null,
  energy int check (energy between 1 and 5), soreness int check (soreness between 1 and 5), mood int check (mood between 1 and 5),
  sleep_hours numeric check (sleep_hours between 0 and 16), note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- ---------- body progress ----------
create table if not exists public.sf_weights (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date date not null, weight_kg numeric not null check (weight_kg between 30 and 300),
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);
create table if not exists public.sf_measurements (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date date not null,
  waist_cm numeric check (waist_cm between 40 and 250), chest_cm numeric check (chest_cm between 40 and 250),
  hips_cm numeric check (hips_cm between 40 and 250), arm_cm numeric check (arm_cm between 10 and 80),
  thigh_cm numeric check (thigh_cm between 20 and 120),
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);
create table if not exists public.sf_progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date date not null, path text not null, note text,
  created_at timestamptz not null default now()
);
create table if not exists public.sf_weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  week_start date not null, stats jsonb not null, text text,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ---------- THE SYSTEM (AI) ----------
create table if not exists public.sf_ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) <= 8000),
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sf_ai_messages_user on public.sf_ai_messages (user_id, created_at desc);
create table if not exists public.sf_ai_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  fact text not null check (char_length(fact) between 2 and 300),
  created_at timestamptz not null default now()
);

-- ---------- notifications ----------
create table if not exists public.sf_notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  enabled boolean not null default false,
  morning boolean not null default true, pre_workout boolean not null default true,
  post_workout boolean not null default true, evening boolean not null default true,
  morning_time text not null default '08:00', workout_time text not null default '18:00', evening_time text not null default '21:30',
  tz_offset_min int not null default 0 check (tz_offset_min between -840 and 840),
  last_sent jsonb not null default '{}'::jsonb, -- {slot: 'YYYY-MM-DD'} so a reminder is never sent twice
  updated_at timestamptz not null default now()
);
alter table public.sf_notification_prefs add column if not exists last_sent jsonb not null default '{}'::jsonb;
create table if not exists public.sf_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  endpoint text not null unique, p256dh text not null, auth text not null,
  created_at timestamptz not null default now()
);

-- ---------- hunter stats (computed, never stored by hand) ----------
create or replace view public.sf_hunter_stats with (security_invoker = true) as
  select user_id,
    coalesce(sum(xp), 0)::int as xp,
    coalesce(sum(xp) filter (where attribute = 'strength'), 0)::int as strength_xp,
    coalesce(sum(xp) filter (where attribute = 'endurance'), 0)::int as endurance_xp,
    coalesce(sum(xp) filter (where attribute = 'discipline'), 0)::int as discipline_xp,
    coalesce(sum(xp) filter (where attribute = 'consistency'), 0)::int as consistency_xp,
    coalesce(sum(xp) filter (where attribute = 'fitness'), 0)::int as fitness_xp
  from public.sf_xp_events group by user_id;

-- ---------- triggers ----------
drop trigger if exists sf_profiles_touch on public.sf_profiles;
create trigger sf_profiles_touch before update on public.sf_profiles for each row execute function public.sf_touch();
drop trigger if exists sf_progress_touch on public.sf_exercise_progress;
create trigger sf_progress_touch before update on public.sf_exercise_progress for each row execute function public.sf_touch();

-- ---------- Row Level Security: own rows only ----------
do $$
declare t text; col text;
begin
  foreach t in array array['sf_profiles','sf_targets','sf_xp_events','sf_quests','sf_challenges','sf_achievements','sf_food_logs',
    'sf_custom_foods','sf_water_logs','sf_favorite_recipes','sf_training_plans','sf_exercise_progress','sf_workout_sessions',
    'sf_exercise_sets','sf_personal_records','sf_checkins','sf_weights','sf_measurements','sf_progress_photos','sf_weekly_reports',
    'sf_ai_messages','sf_ai_memory','sf_notification_prefs','sf_push_subscriptions']
  loop
    col := case when t = 'sf_profiles' then 'id' else 'user_id' end;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format('create policy own_rows on public.%I for all to authenticated using (%I = auth.uid()) with check (%I = auth.uid())', t, col, col);
  end loop;
end $$;

-- XP history cannot be edited (no UPDATE policy); it can be read, granted once per (kind, ref), and deleted with the account data.
drop policy if exists own_rows on public.sf_xp_events;
drop policy if exists xp_read on public.sf_xp_events;
drop policy if exists xp_insert on public.sf_xp_events;
drop policy if exists xp_delete on public.sf_xp_events;
create policy xp_read on public.sf_xp_events for select to authenticated using (user_id = auth.uid());
create policy xp_insert on public.sf_xp_events for insert to authenticated with check (user_id = auth.uid());
create policy xp_delete on public.sf_xp_events for delete to authenticated using (user_id = auth.uid());

-- ---------- private storage for progress photos ----------
insert into storage.buckets (id, name, public) values ('sf-progress', 'sf-progress', false) on conflict (id) do nothing;
drop policy if exists sf_progress_own on storage.objects;
create policy sf_progress_own on storage.objects for all to authenticated
  using (bucket_id = 'sf-progress' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'sf-progress' and (storage.foldername(name))[1] = auth.uid()::text);
