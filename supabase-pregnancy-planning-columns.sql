-- Optional SQL patch for richer pregnancy-planning recommendations.
-- Run in Supabase SQL Editor if your console shows 400 errors about missing profile columns.

alter table public.profiles
  add column if not exists gender text default 'prefer_not',
  add column if not exists gender_identity text default 'prefer_not',
  add column if not exists orientation text default 'prefer_not',
  add column if not exists pronouns text,
  add column if not exists active_conditions text[] default '{}';

comment on column public.profiles.gender is 'Used only for optional health/reproductive recommendation logic. Not identity gatekeeping.';
comment on column public.profiles.active_conditions is 'Optional markers such as pregnancy_planning_marker, postpartum, pcos, etc.';
