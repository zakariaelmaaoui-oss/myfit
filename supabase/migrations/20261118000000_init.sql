-- MyFit — initial schema. Run in the Supabase SQL editor or with `supabase db push`.
-- Every personal table carries user_id and is protected by Row Level Security: a user can only
-- read and write their own rows. Reference tables (foods, recipes) are read-only for everyone.


-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- users / profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  age int check (age between 13 and 120),
  sex text check (sex in ('female','male','other')),
  height_cm numeric check (height_cm between 100 and 250),
  weight_kg numeric check (weight_kg between 25 and 350),
  start_weight_kg numeric check (start_weight_kg between 25 and 350),
  target_weight_kg numeric check (target_weight_kg between 25 and 350),
  activity text check (activity in ('sedentary','light','moderate','active','very_active')),
  goal text check (goal in ('lose','maintain','healthy','muscle')),
  diet_prefs text[] default '{}', allergies text[] default '{}', restrictions text,
  country text, language text default 'en' check (language in ('en','fr','ar','dar')),
  budget_mad numeric check (budget_mad >= 0), budget_period text default 'week' check (budget_period in ('week','month')),
  pregnant boolean default false, breastfeeding boolean default false, medical_supervision boolean default false,
  eating_disorder_history boolean default false, health_notes text,
  sugar_guidance_pct int default 10 check (sugar_guidance_pct in (5,10)), custom_added_sugar_g numeric check (custom_added_sugar_g between 5 and 150),
  water_goal_ml int check (water_goal_ml between 500 and 5000), walk_goal_min int default 30 check (walk_goal_min between 5 and 300),
  track_weight boolean default true, enable_sleep boolean default false, enable_period boolean default false,
  consent_sensitive boolean default false, consent_at timestamptz, onboarded boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  -- sensitive health fields may only be stored with explicit consent
  constraint health_requires_consent check (consent_sensitive or not (coalesce(pregnant,false) or coalesce(breastfeeding,false) or coalesce(medical_supervision,false) or coalesce(eating_disorder_history,false) or coalesce(enable_period,false) or coalesce(enable_sleep,false) or coalesce(health_notes,'') <> ''))
);

create table public.user_preferences (
  id uuid primary key references auth.users(id) on delete cascade,
  notifications_enabled boolean default false, calorie_excess_alert boolean default true, sugar_alert boolean default true,
  quiet_start text default '22:00', quiet_end text default '07:00', reminders jsonb default '[]'::jsonb,
  weekly_report_day int default 0 check (weekly_report_day between 0 and 6), theme text default 'system',
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table public.nutrition_goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  computed_on date not null default current_date, goal text, bmr numeric, tdee numeric, kcal numeric, protein_g numeric, carbs_g numeric,
  fat_g numeric, fiber_g numeric, water_ml numeric, added_sugar_max_g numeric, inputs jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

-- ---------- reference data (seeded from supabase/seed.sql) ----------
create table public.foods (
  id text primary key, fdc_id int, category text not null, name_en text not null, name_fr text not null, name_ar text not null,
  usda_description text, source text not null, added_sugar_basis text, portions jsonb default '[]'::jsonb
);
create table public.food_nutrients ( -- nutritional composition per 100 g edible portion; null = unknown
  food_id text primary key references public.foods(id) on delete cascade,
  kcal numeric, protein numeric, carbs numeric, fat numeric, fiber numeric, sugar numeric, added_sugar numeric, sodium_mg numeric
);
create table public.recipes (
  id text primary key, name jsonb not null, moroccan boolean default false, kind text, meals text[], servings int not null check (servings > 0),
  serving jsonb, prep_min int, cook_min int, budget boolean default false, variant_of text references public.recipes(id), variant jsonb, note jsonb, steps jsonb not null
);
create table public.recipe_ingredients (
  recipe_id text references public.recipes(id) on delete cascade, position int, food_id text references public.foods(id),
  grams numeric not null check (grams > 0), consumed boolean default true, primary key (recipe_id, position)
);

-- ---------- personal records ----------
create table public.custom_foods (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160), brand text, barcode text check (barcode ~ '^[0-9]{6,14}$'), category text default 'custom',
  kcal numeric not null check (kcal between 0 and 900), protein numeric check (protein between 0 and 100), carbs numeric check (carbs between 0 and 100),
  fat numeric check (fat between 0 and 100), fiber numeric check (fiber between 0 and 100), sugar numeric check (sugar between 0 and 100),
  added_sugar numeric check (added_sugar between 0 and 100), sodium numeric check (sodium >= 0), serving_g numeric check (serving_g > 0), serving_label text,
  source text default 'manual' check (source in ('manual','openfoodfacts')),
  created_at timestamptz default now(), updated_at timestamptz default now(),
  constraint added_le_total check (added_sugar is null or sugar is null or added_sugar <= sugar)
);
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, meal text not null check (meal in ('breakfast','lunch','dinner','snack','drink')),
  food_id text, recipe_id text, name text not null, grams numeric not null check (grams > 0 and grams <= 5000), servings numeric, portion_label text,
  kcal numeric check (kcal >= 0), protein numeric, carbs numeric, fat numeric, fiber numeric, sugar numeric, added_sugar numeric, verified boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.favorites (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null, created_at timestamptz default now(), updated_at timestamptz default now(), unique (user_id, recipe_id)
);
create table public.meal_plan_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, meal text not null check (meal in ('breakfast','lunch','dinner','snack')), recipe_id text not null,
  portions numeric not null default 1 check (portions between 0.25 and 10), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.fridge_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  food_id text not null, grams numeric check (grams >= 0), expires_on date, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.water_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, ml int not null check (ml between 1 and 5000), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, minutes numeric not null check (minutes between 0 and 1440), steps int check (steps between 0 and 200000),
  kind text default 'walk', started_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.weight_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, weight_kg numeric check (weight_kg between 25 and 350), waist_cm numeric check (waist_cm between 30 and 250),
  hips_cm numeric, chest_cm numeric, arm_cm numeric, thigh_cm numeric, note text, photo_path text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.mood_journal (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, time text, kind text default 'journal' check (kind in ('journal','checkin')),
  category text check (category in ('physical','emotional','craving')), answers jsonb, mood text, note text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.craving_journal (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, time text, hunger int check (hunger between 0 and 10), craving text, mood text, stress int check (stress between 0 and 10),
  reason text, feeling_after text, loss_of_control boolean default false, distress boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.habit_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, habit_id text not null, created_at timestamptz default now(), updated_at timestamptz default now(), unique (user_id, date, habit_id)
);
create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, hours numeric not null check (hours between 0 and 24), quality int check (quality between 1 and 5), note text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.period_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null, end_date date, symptoms text[] default '{}', appetite text, mood text, note text,
  created_at timestamptz default now(), updated_at timestamptz default now(), constraint end_after_start check (end_date is null or end_date >= start_date)
);
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, food_id text, grams numeric check (grams >= 0), quantity_text text, category text, purchased boolean default false,
  source text default 'manual' check (source in ('manual','plan')), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.food_prices ( -- prices entered by the user; the app never invents prices
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  food_id text not null, price_mad_per_kg numeric not null check (price_mad_per_kg >= 0), store text, observed_on date default current_date,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  type text, title text, body text not null, read boolean default false, created_at timestamptz default now(), updated_at timestamptz default now()
);

-- Sugar tracking view: total / added sugar per day from the diary (unknown values are counted separately).
create view public.daily_sugar with (security_invoker = true) as
  select user_id, date, sum(sugar) as total_sugar_g, sum(added_sugar) as added_sugar_g,
         count(*) filter (where sugar is null) as entries_unknown_sugar, count(*) filter (where added_sugar is null) as entries_unknown_added
  from public.diary_entries group by user_id, date;

-- ---------- indexes ----------
create index on public.diary_entries (user_id, date);
create index on public.meal_plan_items (user_id, date);
create index on public.water_logs (user_id, date);
create index on public.activity_logs (user_id, date);
create index on public.weight_logs (user_id, date);
create index on public.mood_journal (user_id, date);
create index on public.craving_journal (user_id, date);
create index on public.custom_foods (user_id, barcode);

-- ---------- updated_at triggers + Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','user_preferences','nutrition_goals','custom_foods','diary_entries','favorites','meal_plan_items','fridge_items',
    'water_logs','activity_logs','weight_logs','mood_journal','craving_journal','habit_logs','sleep_logs','period_logs','shopping_items','food_prices','notifications'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    if t in ('profiles','user_preferences') then
      execute format('create policy "own row" on public.%I for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()))', t);
    else
      execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    end if;
  end loop;
  foreach t in array array['foods','food_nutrients','recipes','recipe_ingredients'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- ---------- private photo storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "own photos read" on storage.objects for select to authenticated using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photos insert" on storage.objects for insert to authenticated with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photos update" on storage.objects for update to authenticated using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photos delete" on storage.objects for delete to authenticated using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- account deletion (all rows cascade from auth.users) ----------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
