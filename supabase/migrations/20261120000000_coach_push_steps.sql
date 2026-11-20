-- MyFit — AI coach, phone (Web Push) notifications, steps & calories burned.
-- Run in the Supabase SQL editor after 20261118000000_init.sql.

-- Steps / distance / calories burned on activities
alter table public.activity_logs add column if not exists distance_m numeric check (distance_m >= 0);
alter table public.activity_logs add column if not exists kcal_burned numeric check (kcal_burned >= 0 and kcal_burned <= 5000);
alter table public.activity_logs add column if not exists source text default 'timer';

-- Coach preferences
alter table public.user_preferences add column if not exists coach_consent boolean default false;
alter table public.user_preferences add column if not exists coach_consent_at timestamptz;
alter table public.user_preferences add column if not exists coach_push_enabled boolean default false;

-- Conversation with the MyFit coach (private to each user)
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')), content text not null check (char_length(content) between 1 and 8000),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index if not exists ai_messages_user_created on public.ai_messages (user_id, created_at);

-- Browser push subscriptions (one per device)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique, p256dh text not null, auth text not null, user_agent text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

do $$
declare t text;
begin
  foreach t in array array['ai_messages','push_subscriptions'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
