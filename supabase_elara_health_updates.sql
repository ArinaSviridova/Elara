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

drop policy if exists "group_members_select_visible" on group_members;
drop policy if exists "group_members_insert_self_or_owner" on group_members;
drop policy if exists "group_members_update_owner_or_self" on group_members;
drop policy if exists "group_members_delete_owner_or_self" on group_members;
create policy "group_members_select_visible" on group_members for select using (
  user_id = auth.uid() or exists (select 1 from groups where groups.id = group_members.group_id and groups.owner_id = auth.uid())
  or exists (select 1 from group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid())
);
create policy "group_members_insert_self_or_owner" on group_members for insert with check (
  user_id = auth.uid() or exists (select 1 from groups where groups.id = group_members.group_id and groups.owner_id = auth.uid())
);
create policy "group_members_update_owner_or_self" on group_members for update using (
  user_id = auth.uid() or exists (select 1 from groups where groups.id = group_members.group_id and groups.owner_id = auth.uid())
);
create policy "group_members_delete_owner_or_self" on group_members for delete using (
  user_id = auth.uid() or exists (select 1 from groups where groups.id = group_members.group_id and groups.owner_id = auth.uid())
);


-- =====================================================
-- WEB PUSH SUBSCRIPTIONS
-- =====================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.push_subscriptions enable row level security;

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

notify pgrst, 'reload schema';
