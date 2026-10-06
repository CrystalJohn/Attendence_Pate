-- Keep historical emoji choices. NULL means this member has not chosen a mascot.
alter table public.members add column if not exists default_mascot_id text
  check (default_mascot_id in ('pip', 'dew', 'spark', 'peb', 'breeze', 'bloom'));
alter table public.attendance add column if not exists mascot_id text
  check (mascot_id in ('pip', 'dew', 'spark', 'peb', 'breeze', 'bloom'));
-- Existing Management/Edge gateway policies continue to govern these columns.
