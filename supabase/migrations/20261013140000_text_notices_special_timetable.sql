-- Gurukul notice board, part 2:
--   * text entries (announcements, programmes, date sheet / timetable notes)
--   * a default timetable plus a "special occasion" timetable that can be switched on
-- Safe to run more than once. Run it AFTER 20261013120000_display_admin.sql.

-- 1. Special-occasion timetable switch (stored with the other display settings) -------------
alter table public.display_settings
  add column if not exists timetable_mode text not null default 'default',
  add column if not exists special_label text not null default '',
  add column if not exists special_until date;

alter table public.display_settings
  drop constraint if exists display_settings_timetable_mode_check;
alter table public.display_settings
  add constraint display_settings_timetable_mode_check
  check (timetable_mode in ('default', 'special'));

-- 2. Timetable images are either "default" or "special" ------------------------------------
alter table public.display_images
  add column if not exists variant text not null default 'default';

alter table public.display_images
  drop constraint if exists display_images_variant_check;
alter table public.display_images
  add constraint display_images_variant_check
  check (variant in ('default', 'special'));

-- 3. Text entries --------------------------------------------------------------------------
create table if not exists public.display_notices (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('announcement', 'programme', 'datesheet', 'timetable')),
  variant text not null default 'default' check (variant in ('default', 'special')),
  title text not null default '' check (char_length(title) <= 120),
  body text not null check (char_length(body) between 1 and 1500),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists display_notices_kind_sort_idx
  on public.display_notices (kind, variant, sort_order);
alter table public.display_notices enable row level security;

drop policy if exists "Anyone can view display notices" on public.display_notices;
drop policy if exists "Admins can add display notices" on public.display_notices;
drop policy if exists "Admins can edit display notices" on public.display_notices;
drop policy if exists "Admins can delete display notices" on public.display_notices;

create policy "Anyone can view display notices"
  on public.display_notices for select using (true);
create policy "Admins can add display notices"
  on public.display_notices for insert with check (public.is_display_admin());
create policy "Admins can edit display notices"
  on public.display_notices for update
  using (public.is_display_admin()) with check (public.is_display_admin());
create policy "Admins can delete display notices"
  on public.display_notices for delete using (public.is_display_admin());
