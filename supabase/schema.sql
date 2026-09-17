-- NEST attendance schema
-- Run in Supabase SQL editor or with `supabase db push`.

create extension if not exists pgcrypto;

create type public.app_role as enum ('ADMIN', 'LEADER', 'MEMBER');
create type public.session_status as enum ('draft', 'open', 'closed');
create type public.checkin_method as enum ('qr', 'manual');
create type public.message_display_mode as enum ('public', 'anonymous');
create type public.moderation_status as enum ('visible', 'hidden', 'reported');
create type public.follow_up_status as enum ('pending', 'contacted', 'responded', 'skipped');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  animal text not null default 'panda',
  role public.app_role not null default 'MEMBER',
  is_active boolean not null default true,
  reminder_opt_in boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text not null default 'Kết nối thật, lớn lên cùng nhau.',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  default_checkin_time time not null default '19:15',
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null default 'MEMBER',
  companion_group text,
  joined_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (group_id, profile_id)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  session_date date not null,
  checkin_start_at timestamptz not null,
  checkin_end_at timestamptz,
  status public.session_status not null default 'draft',
  qr_token_hash text not null unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  animal text not null,
  mood text not null,
  checked_in_at timestamptz not null default now(),
  checkin_method public.checkin_method not null default 'qr',
  checked_in_by uuid references public.profiles(id),
  unique (session_id, profile_id)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null,
  visibility text not null default 'public' check (visibility in ('public', 'leader_only', 'anonymous')),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 280),
  display_mode public.message_display_mode not null default 'public',
  moderation_status public.moderation_status not null default 'visible',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id),
  status public.follow_up_status not null default 'pending',
  message text not null,
  contacted_at timestamptz,
  private_note text,
  created_at timestamptz not null default now()
);

create index attendance_session_idx on public.attendance(session_id, checked_in_at desc);
create index messages_session_idx on public.messages(session_id, created_at desc);
create index follow_ups_assigned_idx on public.follow_ups(assigned_to, status);

create or replace function public.is_group_member(_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id and profile_id = auth.uid() and is_active = true
  );
$$;

create or replace function public.is_group_leader_or_admin(_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id and profile_id = auth.uid() and is_active = true and role in ('ADMIN', 'LEADER')
  );
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.activities enable row level security;
alter table public.messages enable row level security;
alter table public.follow_ups enable row level security;

create policy "members can read their group" on public.groups for select using (public.is_group_member(id));
create policy "members can read group roster" on public.group_members for select using (public.is_group_member(group_id));
create policy "members can read safe profiles" on public.profiles for select using (
  id = auth.uid() or exists (select 1 from public.group_members gm where gm.profile_id = profiles.id and public.is_group_member(gm.group_id))
);
create policy "members can read sessions" on public.sessions for select using (public.is_group_member(group_id));
create policy "leaders can manage sessions" on public.sessions for all using (public.is_group_leader_or_admin(group_id)) with check (public.is_group_leader_or_admin(group_id));
create policy "members can read attendance" on public.attendance for select using (
  profile_id = auth.uid() or exists (select 1 from public.sessions s where s.id = attendance.session_id and public.is_group_leader_or_admin(s.group_id))
);
create policy "members can create own attendance" on public.attendance for insert with check (
  profile_id = auth.uid() and exists (select 1 from public.sessions s where s.id = session_id and s.status = 'open' and public.is_group_member(s.group_id))
);
create policy "leaders can manually manage attendance" on public.attendance for all using (
  exists (select 1 from public.sessions s where s.id = attendance.session_id and public.is_group_leader_or_admin(s.group_id))
) with check (
  exists (select 1 from public.sessions s where s.id = attendance.session_id and public.is_group_leader_or_admin(s.group_id))
);
create policy "members can read activities" on public.activities for select using (exists (select 1 from public.sessions s where s.id = activities.session_id and public.is_group_member(s.group_id)));
create policy "members can create own activities" on public.activities for insert with check (profile_id = auth.uid() and exists (select 1 from public.sessions s where s.id = session_id and public.is_group_member(s.group_id)));
create policy "members can read visible messages" on public.messages for select using (exists (select 1 from public.sessions s where s.id = messages.session_id and public.is_group_member(s.group_id)) and (moderation_status = 'visible' or public.is_group_leader_or_admin((select group_id from public.sessions where id = session_id))));
create policy "members can create messages" on public.messages for insert with check (sender_id = auth.uid() and exists (select 1 from public.sessions s where s.id = session_id and s.status = 'open' and public.is_group_member(s.group_id)));
create policy "leaders can moderate messages" on public.messages for update using (public.is_group_leader_or_admin((select group_id from public.sessions where id = session_id)));
create policy "leaders can read follow ups" on public.follow_ups for select using (public.is_group_leader_or_admin((select group_id from public.sessions where id = session_id)));
create policy "leaders can manage follow ups" on public.follow_ups for all using (public.is_group_leader_or_admin((select group_id from public.sessions where id = session_id))) with check (public.is_group_leader_or_admin((select group_id from public.sessions where id = session_id)));

-- Use a server-side edge function or API route to hash/validate QR tokens:
-- encode(digest(raw_token, 'sha256'), 'hex') = sessions.qr_token_hash.
