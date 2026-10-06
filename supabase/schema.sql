-- NTC PATE / NEST secure data model
-- Public guest flows go through Edge Functions. Management uses Supabase Auth + RLS.
-- Internal notes live in separate tables because row-level security cannot hide a
-- sensitive column from a row that was otherwise made public.

create extension if not exists pgcrypto;

create type public.member_status as enum ('active', 'inactive', 'pending');
create type public.session_status as enum ('draft', 'published', 'live', 'closed');
create type public.checkin_method as enum ('qr', 'manual', 'guest_link');
create type public.message_display_mode as enum ('public', 'anonymous');
create type public.moderation_status as enum ('visible', 'hidden', 'reported');
create type public.activity_type as enum ('word_cloud', 'poll', 'open_ended', 'quiz', 'reaction_board');
create type public.follow_up_status as enum ('pending', 'contacted', 'responded', 'skipped');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tagline text not null default 'Kết nối thật, lớn lên cùng nhau.',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  default_start_time time not null default '19:00',
  default_end_time time not null default '21:00',
  default_checkin_time time not null default '19:15',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only authenticated Management profiles are stored here. Guests are scoped by
-- short-lived guest_sessions and never receive a profile role in the browser.
create table public.group_management (
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  full_name text not null,
  display_name text,
  default_animal text not null default 'panda',
  companion_group text,
  status public.member_status not null default 'active',
  reminder_opt_in boolean not null default true,
  contact_info jsonb not null default '{}'::jsonb,
  private_note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, full_name)
);

-- Public session fields intentionally exclude internal plans and token hashes.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  public_description text,
  session_date date not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  checkin_start_at timestamptz not null,
  checkin_end_at timestamptz,
  location text,
  status public.session_status not null default 'draft',
  published_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.session_internal_plans (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  internal_plan text not null default '',
  private_note text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.session_access_tokens (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.session_assignments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  title text not null,
  scheduled_at timestamptz,
  public_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, sort_order)
);

create table public.session_assignment_internal (
  assignment_id uuid primary key references public.session_assignments(id) on delete cascade,
  internal_note text,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  guest_display_name text,
  animal text not null,
  mood text not null,
  checked_in_at timestamptz not null default now(),
  checkin_method public.checkin_method not null default 'qr',
  device_fingerprint_hash text,
  unique (session_id, member_id)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  activity_type public.activity_type not null,
  title text not null,
  prompt text,
  visibility text not null default 'public' check (visibility in ('public', 'anonymous', 'group')),
  is_published boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (session_id, activity_type)
);

create table public.activity_options (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0
);

create table public.activity_responses (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  guest_session_id uuid references public.guest_sessions(id) on delete set null,
  option_id uuid references public.activity_options(id) on delete set null,
  response_text text,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  guest_session_id uuid references public.guest_sessions(id) on delete set null,
  reaction_key text not null,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  guest_session_id uuid references public.guest_sessions(id) on delete set null,
  content text not null check (char_length(content) between 1 and 280),
  display_mode public.message_display_mode not null default 'public',
  moderation_status public.moderation_status not null default 'visible',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  status public.follow_up_status not null default 'pending',
  message text not null,
  contacted_at timestamptz,
  private_note text,
  created_at timestamptz not null default now()
);

create table public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  moderator_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('hide', 'restore', 'report', 'delete')),
  reason text,
  created_at timestamptz not null default now()
);

create index members_group_status_idx on public.members(group_id, status, full_name);
create index sessions_group_date_idx on public.sessions(group_id, session_date desc);
create index attendance_session_idx on public.attendance(session_id, checked_in_at desc);
create index assignments_session_idx on public.session_assignments(session_id, sort_order);
create index activities_session_idx on public.activities(session_id, is_published);
create index messages_session_idx on public.messages(session_id, created_at desc);
create index follow_ups_assigned_idx on public.follow_ups(assigned_to, status);

create or replace function public.is_management(_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_management gm
    where gm.group_id = _group_id and gm.profile_id = auth.uid() and gm.is_active = true
  );
$$;

create or replace function public.session_group(_session_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select group_id from public.sessions where id = _session_id;
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_management enable row level security;
alter table public.members enable row level security;
alter table public.sessions enable row level security;
alter table public.session_internal_plans enable row level security;
alter table public.session_access_tokens enable row level security;
alter table public.session_assignments enable row level security;
alter table public.session_assignment_internal enable row level security;
alter table public.guest_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.activities enable row level security;
alter table public.activity_options enable row level security;
alter table public.activity_responses enable row level security;
alter table public.reactions enable row level security;
alter table public.messages enable row level security;
alter table public.follow_ups enable row level security;
alter table public.moderation_logs enable row level security;

create policy "public can read group identity" on public.groups for select to anon, authenticated using (true);
create policy "management can manage groups" on public.groups for all to authenticated using (public.is_management(id)) with check (public.is_management(id));

create policy "profile owner can read self" on public.profiles for select to authenticated using (id = auth.uid());
create policy "management can read group profiles" on public.profiles for select to authenticated using (
  exists (select 1 from public.group_management gm where gm.profile_id = profiles.id and public.is_management(gm.group_id))
);
create policy "profile owner can update self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "management can read management roster" on public.group_management for select to authenticated using (public.is_management(group_id));
create policy "management can manage management roster" on public.group_management for all to authenticated using (public.is_management(group_id)) with check (public.is_management(group_id));

create policy "management can manage members" on public.members for all to authenticated using (public.is_management(group_id)) with check (public.is_management(group_id));

create policy "guests can read published sessions" on public.sessions for select to anon, authenticated using (status in ('published', 'live', 'closed'));
create policy "management can manage sessions" on public.sessions for all to authenticated using (public.is_management(group_id)) with check (public.is_management(group_id));
create policy "management can manage internal session plans" on public.session_internal_plans for all to authenticated using (public.is_management(public.session_group(session_id))) with check (public.is_management(public.session_group(session_id)));
create policy "management can manage access tokens" on public.session_access_tokens for all to authenticated using (public.is_management(public.session_group(session_id))) with check (public.is_management(public.session_group(session_id)));

create policy "guests can read public assignments" on public.session_assignments for select to anon, authenticated using (
  exists (select 1 from public.sessions s where s.id = session_assignments.session_id and s.status in ('published', 'live', 'closed'))
);
create policy "management can manage assignments" on public.session_assignments for all to authenticated using (public.is_management(public.session_group(session_id))) with check (public.is_management(public.session_group(session_id)));
create policy "management can manage internal assignments" on public.session_assignment_internal for all to authenticated using (
  exists (select 1 from public.session_assignments a where a.id = assignment_id and public.is_management(public.session_group(a.session_id)))
) with check (
  exists (select 1 from public.session_assignments a where a.id = assignment_id and public.is_management(public.session_group(a.session_id)))
);

-- guest_sessions and all write-heavy guest tables are intentionally service-role
-- only. Edge Functions validate short-lived tokens before using the service key.
create policy "management can inspect guest sessions" on public.guest_sessions for select to authenticated using (public.is_management(public.session_group(session_id)));
create policy "management can inspect attendance" on public.attendance for select to authenticated using (public.is_management(public.session_group(session_id)));
create policy "management can manage attendance" on public.attendance for all to authenticated using (public.is_management(public.session_group(session_id))) with check (public.is_management(public.session_group(session_id)));

create policy "guests can read published activities" on public.activities for select to anon, authenticated using (
  is_published = true and visibility in ('public', 'anonymous') and exists (select 1 from public.sessions s where s.id = activities.session_id and s.status in ('published', 'live', 'closed'))
);
create policy "management can manage activities" on public.activities for all to authenticated using (public.is_management(public.session_group(session_id))) with check (public.is_management(public.session_group(session_id)));
create policy "guests can read published activity options" on public.activity_options for select to anon, authenticated using (
  exists (select 1 from public.activities a join public.sessions s on s.id = a.session_id where a.id = activity_options.activity_id and a.is_published = true and a.visibility in ('public', 'anonymous') and s.status in ('published', 'live', 'closed'))
);
create policy "management can manage activity options" on public.activity_options for all to authenticated using (
  exists (select 1 from public.activities a where a.id = activity_options.activity_id and public.is_management(public.session_group(a.session_id)))
) with check (
  exists (select 1 from public.activities a where a.id = activity_options.activity_id and public.is_management(public.session_group(a.session_id)))
);
create policy "management can inspect activity responses" on public.activity_responses for all to authenticated using (public.is_management(public.session_group(session_id))) with check (public.is_management(public.session_group(session_id)));
create policy "management can inspect reactions" on public.reactions for all to authenticated using (
  exists (select 1 from public.activities a where a.id = reactions.activity_id and public.is_management(public.session_group(a.session_id)))
) with check (
  exists (select 1 from public.activities a where a.id = reactions.activity_id and public.is_management(public.session_group(a.session_id)))
);

create policy "management can manage messages" on public.messages for all to authenticated using (public.is_management(public.session_group(session_id))) with check (public.is_management(public.session_group(session_id)));
create policy "management can manage follow ups" on public.follow_ups for all to authenticated using (public.is_management(public.session_group(session_id))) with check (public.is_management(public.session_group(session_id)));
create policy "management can inspect moderation logs" on public.moderation_logs for select to authenticated using (public.is_management(public.session_group(session_id)));
create policy "management can create moderation logs" on public.moderation_logs for insert to authenticated with check (public.is_management(public.session_group(session_id)) and moderator_id = auth.uid());

-- Enable Realtime only for safe live surfaces. Guests still consume these through
-- the public gateway so internal identifiers and private rows remain controlled.
-- Add the tables to the `supabase_realtime` publication in the dashboard after
-- applying this schema: sessions, attendance, activities, messages, reactions.
-- Keep historical emoji choices. NULL means this member has not chosen a mascot.
alter table public.members add column if not exists default_mascot_id text
  check (default_mascot_id in ('pip', 'dew', 'spark', 'peb', 'breeze', 'bloom'));
alter table public.attendance add column if not exists mascot_id text
  check (mascot_id in ('pip', 'dew', 'spark', 'peb', 'breeze', 'bloom'));
-- Existing Management/Edge gateway policies continue to govern these columns.
