-- Elara health updates: sport logs, weight logs and mutual friend add RPC.
-- Run this in Supabase SQL editor once.

create table if not exists sport_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  workouts jsonb not null default '[]'::jsonb,
  supplements jsonb not null default '[]'::jsonb,
  intensity text default 'moderate',
  duration integer default 30,
  notes text default '',
  custom_workout text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

create table if not exists weight_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0 and weight_kg < 350),
  note text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

alter table sport_logs enable row level security;
alter table weight_logs enable row level security;

drop policy if exists "sport_logs_select" on sport_logs;
drop policy if exists "sport_logs_insert" on sport_logs;
drop policy if exists "sport_logs_update" on sport_logs;
drop policy if exists "sport_logs_delete" on sport_logs;

create policy "sport_logs_select" on sport_logs for select using (
  user_id = auth.uid() or exists (
    select 1 from friendships
    where owner_id = auth.uid()
      and friend_id = sport_logs.user_id
      and coalesce(is_visible, true) = true
  )
);
create policy "sport_logs_insert" on sport_logs for insert with check (user_id = auth.uid());
create policy "sport_logs_update" on sport_logs for update using (user_id = auth.uid());
create policy "sport_logs_delete" on sport_logs for delete using (user_id = auth.uid());

drop policy if exists "weight_logs_select" on weight_logs;
drop policy if exists "weight_logs_insert" on weight_logs;
drop policy if exists "weight_logs_update" on weight_logs;
drop policy if exists "weight_logs_delete" on weight_logs;

create policy "weight_logs_select" on weight_logs for select using (user_id = auth.uid());
create policy "weight_logs_insert" on weight_logs for insert with check (user_id = auth.uid());
create policy "weight_logs_update" on weight_logs for update using (user_id = auth.uid());
create policy "weight_logs_delete" on weight_logs for delete using (user_id = auth.uid());

-- Allows one person to enter another person's code once and create both friendship rows.
create or replace function add_mutual_friendship(
  p_friend_id uuid,
  p_relation_type text default 'friend',
  p_friend_color text default '#f472b6',
  p_self_color text default '#a78bfa'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_relation text := coalesce(nullif(p_relation_type, ''), 'friend');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_friend_id is null or p_friend_id = v_user_id then
    return;
  end if;

  insert into friendships (owner_id, friend_id, friend_color, relation_type, is_visible)
  values (v_user_id, p_friend_id, coalesce(p_friend_color, '#f472b6'), v_relation, true)
  on conflict (owner_id, friend_id) do update set
    friend_color = excluded.friend_color,
    relation_type = excluded.relation_type,
    is_visible = true;

  insert into friendships (owner_id, friend_id, friend_color, relation_type, is_visible)
  values (p_friend_id, v_user_id, coalesce(p_self_color, '#a78bfa'), v_relation, true)
  on conflict (owner_id, friend_id) do update set
    relation_type = excluded.relation_type,
    is_visible = true;
end;
$$;

grant execute on function add_mutual_friendship(uuid, text, text, text) to authenticated;

-- In-app notifications and invites used by Circle, groups and partner pushes.
create table if not exists app_notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null default 'custom',
  title text not null,
  body text,
  emoji text default '🔔',
  source_type text,
  source_id text,
  action_url text,
  priority text default 'normal',
  is_read boolean default false,
  is_dismissed boolean default false,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists push_invites (
  id uuid default gen_random_uuid() primary key,
  from_user_id uuid references profiles(id) on delete cascade not null,
  to_user_id uuid references profiles(id) on delete cascade not null,
  activity_type text,
  dice_result integer,
  dice_label text,
  response_roll integer,
  response_label text,
  status text default 'pending',
  message text,
  created_at timestamptz default now()
);

create table if not exists sharing_permissions (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references profiles(id) on delete cascade not null,
  viewer_id uuid references profiles(id) on delete cascade not null,
  can_view_status boolean default true,
  can_view_availability boolean default true,
  can_view_calendar boolean default false,
  can_view_mood boolean default false,
  can_view_cycle_summary boolean default false,
  can_view_period_days boolean default false,
  can_view_sport boolean default false,
  can_view_notes boolean default false,
  can_view_medications boolean default false,
  can_view_pregnancy boolean default false,
  can_receive_ai_advice boolean default false,
  can_receive_cycle_notifs boolean default false,
  advice_source text default 'calendar',
  advice_detail text default 'general',
  updated_at timestamptz default now(),
  unique(owner_id, viewer_id)
);

alter table app_notifications enable row level security;
alter table push_invites enable row level security;
alter table sharing_permissions enable row level security;

drop policy if exists "app_notifications_select_own" on app_notifications;
drop policy if exists "app_notifications_insert_authenticated" on app_notifications;
drop policy if exists "app_notifications_update_own" on app_notifications;
drop policy if exists "app_notifications_delete_own" on app_notifications;
create policy "app_notifications_select_own" on app_notifications for select using (user_id = auth.uid());
create policy "app_notifications_insert_authenticated" on app_notifications for insert with check (auth.uid() is not null);
create policy "app_notifications_update_own" on app_notifications for update using (user_id = auth.uid());
create policy "app_notifications_delete_own" on app_notifications for delete using (user_id = auth.uid());

drop policy if exists "push_invites_select_related" on push_invites;
drop policy if exists "push_invites_insert_sender" on push_invites;
drop policy if exists "push_invites_update_related" on push_invites;
drop policy if exists "push_invites_delete_related" on push_invites;
create policy "push_invites_select_related" on push_invites for select using (from_user_id = auth.uid() or to_user_id = auth.uid());
create policy "push_invites_insert_sender" on push_invites for insert with check (from_user_id = auth.uid());
create policy "push_invites_update_related" on push_invites for update using (from_user_id = auth.uid() or to_user_id = auth.uid());
create policy "push_invites_delete_related" on push_invites for delete using (from_user_id = auth.uid() or to_user_id = auth.uid());

drop policy if exists "sharing_permissions_select_related" on sharing_permissions;
drop policy if exists "sharing_permissions_insert_owner" on sharing_permissions;
drop policy if exists "sharing_permissions_update_owner" on sharing_permissions;
drop policy if exists "sharing_permissions_delete_owner" on sharing_permissions;
create policy "sharing_permissions_select_related" on sharing_permissions for select using (owner_id = auth.uid() or viewer_id = auth.uid());
create policy "sharing_permissions_insert_owner" on sharing_permissions for insert with check (owner_id = auth.uid());
create policy "sharing_permissions_update_owner" on sharing_permissions for update using (owner_id = auth.uid());
create policy "sharing_permissions_delete_owner" on sharing_permissions for delete using (owner_id = auth.uid());

-- Realtime for instant in-app notification badge updates. Safe to run repeatedly.
do $$
begin
  begin
    alter publication supabase_realtime add table app_notifications;
  exception when duplicate_object then
    null;
  end;
end $$;

-- Supporting social/wellbeing tables, kept idempotent for existing projects.
create table if not exists day_statuses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  energy numeric default 3,
  mood numeric default 3,
  pain numeric default 0,
  social_battery numeric default 3,
  libido numeric default 2,
  available boolean default true,
  tags jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

create table if not exists groups (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  invite_code text unique not null default upper(substring(gen_random_uuid()::text, 1, 6)),
  created_at timestamptz default now()
);

create table if not exists group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references groups(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  relation_type text default 'friend',
  member_color text default '#f472b6',
  can_see_calendar boolean default false,
  can_see_mood boolean default false,
  can_see_notes boolean default false,
  can_receive_ai_advice boolean default false,
  can_receive_cycle_notifs boolean default false,
  can_see_pregnancy boolean default false,
  advice_source text default 'calendar',
  advice_detail text default 'general',
  created_at timestamptz default now(),
  unique(group_id, user_id)
);

alter table day_statuses enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;

drop policy if exists "day_statuses_select_shared" on day_statuses;
drop policy if exists "day_statuses_insert_own" on day_statuses;
drop policy if exists "day_statuses_update_own" on day_statuses;
drop policy if exists "day_statuses_delete_own" on day_statuses;
create policy "day_statuses_select_shared" on day_statuses for select using (
  user_id = auth.uid() or exists (
    select 1 from friendships where owner_id = auth.uid() and friend_id = day_statuses.user_id and coalesce(is_visible, true) = true
  )
);
create policy "day_statuses_insert_own" on day_statuses for insert with check (user_id = auth.uid());
create policy "day_statuses_update_own" on day_statuses for update using (user_id = auth.uid());
create policy "day_statuses_delete_own" on day_statuses for delete using (user_id = auth.uid());

drop policy if exists "groups_select_visible" on groups;
drop policy if exists "groups_insert_owner" on groups;
drop policy if exists "groups_update_owner" on groups;
drop policy if exists "groups_delete_owner" on groups;
create policy "groups_select_visible" on groups for select using (
  owner_id = auth.uid() or exists (select 1 from group_members where group_id = groups.id and user_id = auth.uid())
);
create policy "groups_insert_owner" on groups for insert with check (owner_id = auth.uid());
create policy "groups_update_owner" on groups for update using (owner_id = auth.uid());
create policy "groups_delete_owner" on groups for delete using (owner_id = auth.uid());

-- group_members policies: intentionally simple to avoid recursive RLS through groups/group_members.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'group_members' loop
    execute format('drop policy if exists %I on public.group_members', p.policyname);
  end loop;
end $$;

create policy "group_members_select_authenticated" on group_members for select to authenticated using (true);
create policy "group_members_insert_self" on group_members for insert to authenticated with check (auth.uid() = user_id);
create policy "group_members_update_self" on group_members for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "group_members_delete_self" on group_members for delete to authenticated using (auth.uid() = user_id);


-- =====================================================
-- WEB PUSH SUBSCRIPTIONS
-- =====================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  auth_key text,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.push_subscriptions enable row level security;

alter table public.push_subscriptions add column if not exists auth text;
alter table public.push_subscriptions add column if not exists auth_key text;
alter table public.push_subscriptions add column if not exists is_active boolean not null default true;
alter table public.push_subscriptions add column if not exists updated_at timestamp with time zone default now();
alter table public.push_subscriptions add column if not exists user_agent text;
update public.push_subscriptions set auth = coalesce(auth, auth_key) where auth is null and auth_key is not null;
update public.push_subscriptions set auth_key = coalesce(auth_key, auth) where auth_key is null and auth is not null;
alter table public.push_subscriptions alter column auth_key drop not null;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;

create policy "push_subscriptions_select_own"
on public.push_subscriptions
for select
using (auth.uid() = user_id);

create policy "push_subscriptions_insert_own"
on public.push_subscriptions
for insert
with check (auth.uid() = user_id);

create policy "push_subscriptions_update_own"
on public.push_subscriptions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "push_subscriptions_delete_own"
on public.push_subscriptions
for delete
using (auth.uid() = user_id);

create index if not exists push_subscriptions_user_id_idx
on public.push_subscriptions(user_id);

create index if not exists push_subscriptions_active_idx
on public.push_subscriptions(user_id, is_active);

create index if not exists push_subscriptions_endpoint_idx
on public.push_subscriptions(endpoint);

-- Scheduled notifications are processed by Netlify scheduled function send-due-notifications.
create table if not exists scheduled_notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  due_at timestamptz not null,
  type text not null default 'reminder',
  title text not null,
  body text,
  emoji text default '🔔',
  source_type text default 'reminders',
  source_id text,
  action_url text default '/',
  priority text default 'normal',
  data jsonb default '{}'::jsonb,
  status text not null default 'pending',
  notification_id uuid references app_notifications(id) on delete set null,
  last_error text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

alter table scheduled_notifications enable row level security;

alter table scheduled_notifications add column if not exists due_at timestamptz;
alter table scheduled_notifications add column if not exists type text not null default 'reminder';
alter table scheduled_notifications add column if not exists title text;
alter table scheduled_notifications add column if not exists body text;
alter table scheduled_notifications add column if not exists emoji text default '🔔';
alter table scheduled_notifications add column if not exists source_type text default 'reminders';
alter table scheduled_notifications add column if not exists source_id text;
alter table scheduled_notifications add column if not exists action_url text default '/';
alter table scheduled_notifications add column if not exists priority text default 'normal';
alter table scheduled_notifications add column if not exists data jsonb default '{}'::jsonb;
alter table scheduled_notifications add column if not exists status text not null default 'pending';
alter table scheduled_notifications add column if not exists notification_id uuid references app_notifications(id) on delete set null;
alter table scheduled_notifications add column if not exists last_error text;
alter table scheduled_notifications add column if not exists created_at timestamptz default now();
alter table scheduled_notifications add column if not exists processed_at timestamptz;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'scheduled_notifications' loop
    execute format('drop policy if exists %I on public.scheduled_notifications', p.policyname);
  end loop;
end $$;

create policy "scheduled_notifications_select_own" on scheduled_notifications for select to authenticated using (auth.uid() = user_id);
create policy "scheduled_notifications_insert_own" on scheduled_notifications for insert to authenticated with check (auth.uid() = user_id);
create policy "scheduled_notifications_update_own" on scheduled_notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scheduled_notifications_delete_own" on scheduled_notifications for delete to authenticated using (auth.uid() = user_id);
create index if not exists scheduled_notifications_due_idx on scheduled_notifications(status, due_at);
create index if not exists scheduled_notifications_user_idx on scheduled_notifications(user_id, due_at);

notify pgrst, 'reload schema';

-- =====================================================
-- NUTRITION MENUS COMPATIBILITY
-- =====================================================

create table if not exists public.nutrition_menus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  days jsonb default '[]'::jsonb,
  settings jsonb default '{}'::jsonb,
  recipes jsonb default '{}'::jsonb,
  tips jsonb default '[]'::jsonb,
  kcal_per_day integer default 0,
  partner_kcal_per_day integer default 0,
  protein_g integer default 0,
  fat_g integer default 0,
  carbs_g integer default 0,
  shared_with uuid references public.profiles(id) on delete set null,
  shared_with_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.nutrition_menus
add column if not exists title text;
alter table public.nutrition_menus
add column if not exists days jsonb default '[]'::jsonb;
alter table public.nutrition_menus
add column if not exists settings jsonb default '{}'::jsonb;
alter table public.nutrition_menus
add column if not exists recipes jsonb default '{}'::jsonb;
alter table public.nutrition_menus
add column if not exists tips jsonb default '[]'::jsonb;
alter table public.nutrition_menus
add column if not exists kcal_per_day integer default 0;
alter table public.nutrition_menus
add column if not exists partner_kcal_per_day integer default 0;
alter table public.nutrition_menus
add column if not exists protein_g integer default 0;
alter table public.nutrition_menus
add column if not exists fat_g integer default 0;
alter table public.nutrition_menus
add column if not exists carbs_g integer default 0;
alter table public.nutrition_menus
add column if not exists shared_with uuid references public.profiles(id) on delete set null;
alter table public.nutrition_menus
add column if not exists shared_with_name text;
alter table public.nutrition_menus
add column if not exists created_at timestamp with time zone default now();
alter table public.nutrition_menus
add column if not exists updated_at timestamp with time zone default now();

alter table public.nutrition_menus enable row level security;

drop policy if exists "nutrition_menus_select_own" on public.nutrition_menus;
drop policy if exists "nutrition_menus_insert_own" on public.nutrition_menus;
drop policy if exists "nutrition_menus_update_own" on public.nutrition_menus;
drop policy if exists "nutrition_menus_delete_own" on public.nutrition_menus;
drop policy if exists "Users manage own menus" on public.nutrition_menus;

create policy "nutrition_menus_select_own"
on public.nutrition_menus
for select
to authenticated
using (auth.uid() = user_id or auth.uid() = shared_with);

create policy "nutrition_menus_insert_own"
on public.nutrition_menus
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "nutrition_menus_update_own"
on public.nutrition_menus
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "nutrition_menus_delete_own"
on public.nutrition_menus
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists nutrition_menus_user_created_idx
on public.nutrition_menus(user_id, created_at desc);

notify pgrst, 'reload schema';
