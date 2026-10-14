-- Gurukul notice board: admin-managed date sheet / timetable images + slideshow switch.
--
-- BEFORE RUNNING: replace ADMIN_EMAIL_HERE below with the school administrator's email.
-- That email is the only account allowed to sign in to /admin and change the display.

-- 1. Who is an administrator --------------------------------------------------------------
create table if not exists public.admin_emails (
  email text primary key
);
alter table public.admin_emails enable row level security;
-- No policies on purpose: nobody can read or edit this list through the API.

insert into public.admin_emails (email) values (lower('ADMIN_EMAIL_HERE'))
on conflict do nothing;

create or replace function public.is_display_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 2. Display settings (exactly one row) ---------------------------------------------------
create table if not exists public.display_settings (
  id int primary key default 1 check (id = 1),
  slideshow_enabled boolean not null default false,
  slide_seconds int not null default 10 check (slide_seconds between 3 and 120),
  updated_at timestamptz not null default now()
);
insert into public.display_settings (id) values (1) on conflict do nothing;
alter table public.display_settings enable row level security;

create policy "Anyone can read display settings"
  on public.display_settings for select using (true);
create policy "Admins can update display settings"
  on public.display_settings for update
  using (public.is_display_admin()) with check (public.is_display_admin());

-- 3. Date sheet / timetable images --------------------------------------------------------
create table if not exists public.display_images (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('datesheet', 'timetable')),
  title text not null default '',
  image_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists display_images_kind_sort_idx on public.display_images (kind, sort_order);
alter table public.display_images enable row level security;

create policy "Anyone can view display images"
  on public.display_images for select using (true);
create policy "Admins can add display images"
  on public.display_images for insert with check (public.is_display_admin());
create policy "Admins can edit display images"
  on public.display_images for update
  using (public.is_display_admin()) with check (public.is_display_admin());
create policy "Admins can delete display images"
  on public.display_images for delete using (public.is_display_admin());

-- 4. Image storage (public read, admin write) ---------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('display-images', 'display-images', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "Anyone can view display image files"
  on storage.objects for select using (bucket_id = 'display-images');
create policy "Admins can upload display image files"
  on storage.objects for insert
  with check (bucket_id = 'display-images' and public.is_display_admin());
create policy "Admins can update display image files"
  on storage.objects for update
  using (bucket_id = 'display-images' and public.is_display_admin());
create policy "Admins can delete display image files"
  on storage.objects for delete
  using (bucket_id = 'display-images' and public.is_display_admin());
