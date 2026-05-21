-- Профили пользователей
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  invite_code text unique not null default upper(substring(gen_random_uuid()::text, 1, 6)),
  avatar_color text not null default '#C084FC',
  created_at timestamptz default now()
);

-- Записи цикла
create table cycle_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  type text not null check (type in ('period','pms','ovulation','fertile')),
  created_at timestamptz default now(),
  unique(user_id, date, type)
);

-- Связи между подругами
create table friendships (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references profiles(id) on delete cascade not null,
  friend_id uuid references profiles(id) on delete cascade not null,
  friend_color text not null default '#F472B6',
  is_visible boolean default true,
  created_at timestamptz default now(),
  unique(owner_id, friend_id)
);

-- RLS политики
alter table profiles enable row level security;
alter table cycle_entries enable row level security;
alter table friendships enable row level security;

-- Профили: каждый видит все профили (нужно для поиска по коду), редактирует только свой
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Цикл: видишь свои записи + записи подруг которые тебя добавили
create policy "entries_select" on cycle_entries for select using (
  user_id = auth.uid() or
  exists (
    select 1 from friendships
    where owner_id = auth.uid()
      and friend_id = cycle_entries.user_id
      and is_visible = true
  )
);
create policy "entries_insert" on cycle_entries for insert with check (user_id = auth.uid());
create policy "entries_update" on cycle_entries for update using (user_id = auth.uid());
create policy "entries_delete" on cycle_entries for delete using (user_id = auth.uid());

-- Дружбы: видишь и управляешь своими
create policy "friendships_select" on friendships for select using (owner_id = auth.uid());
create policy "friendships_insert" on friendships for insert with check (owner_id = auth.uid());
create policy "friendships_update" on friendships for update using (owner_id = auth.uid());
create policy "friendships_delete" on friendships for delete using (owner_id = auth.uid());

-- Автосоздание профиля при регистрации
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
