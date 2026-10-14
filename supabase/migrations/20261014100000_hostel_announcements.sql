-- Gurukul notice board, part 3: allow "hostel" text entries. Safe to run more than once.
alter table public.display_notices drop constraint if exists display_notices_kind_check;
alter table public.display_notices
  add constraint display_notices_kind_check
  check (kind in ('announcement', 'hostel', 'programme', 'datesheet', 'timetable'));
