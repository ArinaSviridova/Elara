-- Elara social notifications, daily reminders and group sync fixes.
-- Run in Supabase SQL Editor once after deploying this build.

-- App notifications: tolerant schema for in-app + push notifications.
create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null default 'general',
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.app_notifications add column if not exists actor_id uuid references public.profiles(id) on delete set null;
alter table public.app_notifications add column if not exists type text not null default 'general';
alter table public.app_notifications add column if not exists title text;
alter table public.app_notifications add column if not exists body text;
alter table public.app_notifications add column if not exists emoji text default '🔔';
alter table public.app_notifications add column if not exists source_type text;
alter table public.app_notifications add column if not exists source_id text;
alter table public.app_notifications add column if not exists action_url text default '/';
alter table public.app_notifications add column if not exists priority text default 'normal';
alter table public.app_notifications add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.app_notifications add column if not exists is_read boolean not null default false;
alter table public.app_notifications add column if not exists is_dismissed boolean not null default false;
alter table public.app_notifications add column if not exists read_at timestamptz;
alter table public.app_notifications add column if not exists created_at timestamptz default now();
update public.app_notifications set title = coalesce(title, 'Уведомление') where title is null;
alter table public.app_notifications alter column title set not null;

alter table public.app_notifications enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_notifications' loop
    execute format('drop policy if exists %I on public.app_notifications', p.policyname);
  end loop;
end $$;
create policy "app_notifications_select_own" on public.app_notifications for select to authenticated using (auth.uid() = user_id);
create policy "app_notifications_insert_authenticated" on public.app_notifications for insert to authenticated with check (auth.uid() is not null);
create policy "app_notifications_update_own" on public.app_notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "app_notifications_delete_own" on public.app_notifications for delete to authenticated using (auth.uid() = user_id);
create index if not exists app_notifications_user_created_idx on public.app_notifications(user_id, created_at desc);
create index if not exists app_notifications_unread_idx on public.app_notifications(user_id, is_read, is_dismissed);

-- Scheduled notifications for daily reminders and medication reminders.
create table if not exists public.scheduled_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
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
  notification_id uuid references public.app_notifications(id) on delete set null,
  last_error text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

alter table public.scheduled_notifications add column if not exists due_at timestamptz;
alter table public.scheduled_notifications add column if not exists type text not null default 'reminder';
alter table public.scheduled_notifications add column if not exists title text;
alter table public.scheduled_notifications add column if not exists body text;
alter table public.scheduled_notifications add column if not exists emoji text default '🔔';
alter table public.scheduled_notifications add column if not exists source_type text default 'reminders';
alter table public.scheduled_notifications add column if not exists source_id text;
alter table public.scheduled_notifications add column if not exists action_url text default '/';
alter table public.scheduled_notifications add column if not exists priority text default 'normal';
alter table public.scheduled_notifications add column if not exists data jsonb default '{}'::jsonb;
alter table public.scheduled_notifications add column if not exists status text not null default 'pending';
alter table public.scheduled_notifications add column if not exists notification_id uuid references public.app_notifications(id) on delete set null;
alter table public.scheduled_notifications add column if not exists last_error text;
alter table public.scheduled_notifications add column if not exists created_at timestamptz default now();
alter table public.scheduled_notifications add column if not exists processed_at timestamptz;
update public.scheduled_notifications set title = coalesce(title, 'Elara') where title is null;
alter table public.scheduled_notifications alter column title set not null;
alter table public.scheduled_notifications alter column due_at set not null;

alter table public.scheduled_notifications enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'scheduled_notifications' loop
    execute format('drop policy if exists %I on public.scheduled_notifications', p.policyname);
  end loop;
end $$;
create policy "scheduled_notifications_select_own" on public.scheduled_notifications for select to authenticated using (auth.uid() = user_id);
create policy "scheduled_notifications_insert_own" on public.scheduled_notifications for insert to authenticated with check (auth.uid() = user_id);
create policy "scheduled_notifications_update_own" on public.scheduled_notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scheduled_notifications_delete_own" on public.scheduled_notifications for delete to authenticated using (auth.uid() = user_id);
create index if not exists scheduled_notifications_due_idx on public.scheduled_notifications(status, due_at);
create index if not exists scheduled_notifications_user_pending_idx on public.scheduled_notifications(user_id, source_type, status);

-- Sharing permissions used by group calendar.
create table if not exists public.sharing_permissions (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  viewer_id uuid references public.profiles(id) on delete cascade not null,
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
alter table public.sharing_permissions enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'sharing_permissions' loop
    execute format('drop policy if exists %I on public.sharing_permissions', p.policyname);
  end loop;
end $$;
create policy "sharing_permissions_select_related" on public.sharing_permissions for select to authenticated using (owner_id = auth.uid() or viewer_id = auth.uid());
create policy "sharing_permissions_insert_owner" on public.sharing_permissions for insert to authenticated with check (owner_id = auth.uid());
create policy "sharing_permissions_update_owner" on public.sharing_permissions for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "sharing_permissions_delete_owner" on public.sharing_permissions for delete to authenticated using (owner_id = auth.uid());

-- Let group calendar read shared data when friendship or sharing permission exists.
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='cycle_entries') then
    alter table public.cycle_entries enable row level security;
    drop policy if exists "entries_select" on public.cycle_entries;
    create policy "entries_select" on public.cycle_entries for select to authenticated using (
      user_id = auth.uid() or exists (select 1 from public.friendships f where f.owner_id = auth.uid() and f.friend_id = cycle_entries.user_id and coalesce(f.is_visible, true) = true) or
      exists (select 1 from public.sharing_permissions sp where sp.owner_id = cycle_entries.user_id and sp.viewer_id = auth.uid() and (sp.can_view_calendar or sp.can_view_cycle_summary or sp.can_view_period_days))
    );
  end if;
end $$;

do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='mood_entries') then
    alter table public.mood_entries enable row level security;
    drop policy if exists "mood_entries_select" on public.mood_entries;
    create policy "mood_entries_select" on public.mood_entries for select to authenticated using (
      user_id = auth.uid() or exists (select 1 from public.friendships f where f.owner_id = auth.uid() and f.friend_id = mood_entries.user_id and coalesce(f.is_visible, true) = true) or
      exists (select 1 from public.sharing_permissions sp where sp.owner_id = mood_entries.user_id and sp.viewer_id = auth.uid() and (sp.can_view_mood or sp.can_view_calendar))
    );
  end if;
end $$;

do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='sport_logs') then
    alter table public.sport_logs enable row level security;
    drop policy if exists "sport_logs_select" on public.sport_logs;
    create policy "sport_logs_select" on public.sport_logs for select to authenticated using (
      user_id = auth.uid() or exists (select 1 from public.friendships f where f.owner_id = auth.uid() and f.friend_id = sport_logs.user_id and coalesce(f.is_visible, true) = true) or
      exists (select 1 from public.sharing_permissions sp where sp.owner_id = sport_logs.user_id and sp.viewer_id = auth.uid() and (sp.can_view_sport or sp.can_view_calendar))
    );
  end if;
end $$;

notify pgrst, 'reload schema';
