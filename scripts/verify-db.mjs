// Verifies supabase/migrations + seed.sql on a real PostgreSQL engine (PGlite) with minimal
// stand-ins for Supabase's auth/storage schemas, then checks Row Level Security isolation.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';

const db = new PGlite();
const ok = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok  -', m); };
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage to anon, authenticated;
`);
for (const f of readdirSync('supabase/migrations').sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, 'utf8'));
ok(true, 'migration applied');
await db.exec(readFileSync('supabase/seed.sql', 'utf8'));
const c = await db.query('select (select count(*) from public.foods) f, (select count(*) from public.recipes) r, (select count(*) from public.recipe_ingredients) i');
ok(Number(c.rows[0].f) === 211 && Number(c.rows[0].r) === 50, `seed loaded: ${JSON.stringify(c.rows[0])}`);
const pot = await db.query(`select kcal from public.food_nutrients where food_id = 'potato_boiled'`);
ok(Number(pot.rows[0].kcal) === 86, 'boiled potato = 86 kcal / 100 g (USDA FDC 170440)');
await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated; grant select on all tables in schema public to anon; grant select, insert, delete on storage.objects to authenticated; grant execute on function public.delete_my_account() to authenticated;`);
const A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222';
await db.exec(`insert into auth.users values ('${A}','a@x.test'),('${B}','b@x.test');`);
const as = async (uid, sql) => { await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`); try { return await db.query(sql); } finally { await db.exec('reset role;'); } };
await as(A, `insert into public.profiles (id, name, age, sex, height_cm, weight_kg, activity, goal, onboarded) values ('${A}', 'A', 30, 'female', 165, 70, 'light', 'lose', true)`);
await as(A, `insert into public.diary_entries (user_id, date, meal, name, grams, kcal) values ('${A}', current_date, 'lunch', 'Harira', 350, 300)`);
await as(B, `insert into public.profiles (id, name) values ('${B}', 'B')`);
ok((await as(B, 'select * from public.diary_entries')).rows.length === 0, 'user B cannot read user A diary');
ok((await as(B, 'select * from public.profiles')).rows.length === 1, 'user B sees only own profile');
let blocked = false; try { await as(B, `insert into public.diary_entries (user_id, date, meal, name, grams) values ('${A}', current_date, 'lunch', 'x', 10)`); } catch { blocked = true; }
ok(blocked, 'user B cannot insert rows for user A');
const upd = await as(B, `update public.diary_entries set kcal = 0 returning id`); ok(upd.rows.length === 0, 'user B cannot update user A rows');
ok((await as(A, 'select * from public.diary_entries')).rows.length === 1, 'user A reads own diary');
ok((await as(B, 'select count(*) n from public.foods')).rows[0].n > 0, 'reference foods readable');
let roWrite = false; try { await as(B, `insert into public.foods (id, category, name_en, name_fr, name_ar, source) values ('x','x','x','x','x','x')`); } catch { roWrite = true; }
ok(roWrite, 'reference foods are read-only for users');
let anonRead = true; try { const r = await db.query(`set role anon; select * from public.diary_entries`); anonRead = r.rows.length > 0; } catch { anonRead = false; } finally { await db.exec('reset role'); }
ok(!anonRead, 'anonymous users cannot read personal data');
let badVal = false; try { await as(A, `insert into public.water_logs (user_id, date, ml) values ('${A}', current_date, 99999)`); } catch { badVal = true; }
ok(badVal, 'check constraints reject invalid values');
let consent = false; try { await as(A, `update public.profiles set pregnant = true where id = '${A}'`); } catch { consent = true; }
ok(consent, 'sensitive health info requires consent');
await as(A, `insert into storage.objects (bucket_id, name) values ('progress-photos', '${A}/p.jpg')`);
let ph = false; try { await as(B, `insert into storage.objects (bucket_id, name) values ('progress-photos', '${A}/evil.jpg')`); } catch { ph = true; }
ok(ph, 'user B cannot upload into user A photo folder');
ok((await as(B, `select * from storage.objects`)).rows.length === 0, 'user B cannot list user A photos');
const ds = await as(A, `select * from public.daily_sugar`); ok(ds.rows.length === 1, 'daily_sugar view respects RLS (security_invoker)');
ok((await as(B, `select * from public.daily_sugar`)).rows.length === 0, 'daily_sugar view hides other users');
await as(A, `insert into public.ai_messages (user_id, role, content) values ('${A}', 'user', 'What should I eat?')`);
ok((await as(B, 'select * from public.ai_messages')).rows.length === 0, 'coach conversation is private (user B sees nothing)');
await as(A, `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ('${A}', 'https://push.example/a', 'k', 'a')`);
ok((await as(B, 'select * from public.push_subscriptions')).rows.length === 0, 'push subscriptions are private');
await as(A, `insert into public.activity_logs (user_id, date, minutes, steps, distance_m, kcal_burned, source) values ('${A}', current_date, 30, 3500, 2384, 131, 'sensor')`);
ok((await as(A, 'select kcal_burned from public.activity_logs')).rows[0].kcal_burned == 131, 'activity stores steps, distance and calories burned');
await as(A, 'select public.delete_my_account()');
ok((await db.query(`select count(*) n from public.diary_entries where user_id = '${A}'`)).rows[0].n == 0, 'account deletion cascades to all personal rows');
ok((await db.query(`select count(*) n from public.profiles where id = '${B}'`)).rows[0].n == 1, 'other users unaffected by deletion');
