-- =========================================================================
-- NEXUSEDU — Full schema (secure roles, no recursion, RLS-first)
-- =========================================================================

-- ROLES -------------------------------------------------------------------
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security-definer role check (prevents recursive RLS)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin')
$$;

-- Policies: users see their own roles; admins see all; only admins write.
create policy "users_read_own_roles" on public.user_roles
  for select using (user_id = auth.uid());
create policy "admins_read_all_roles" on public.user_roles
  for select using (public.is_admin());
create policy "admins_manage_roles" on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- PROFILES ----------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  phone text,
  is_blocked boolean not null default false,
  last_active_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "auth_read_profiles" on public.profiles
  for select to authenticated using (true);
create policy "users_update_own_profile" on public.profiles
  for update using (id = auth.uid());
create policy "admins_update_profiles" on public.profiles
  for update using (public.is_admin());
create policy "admins_delete_profiles" on public.profiles
  for delete using (public.is_admin());

-- Auto-create profile + default user role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute procedure public.touch_updated_at();

-- CONTENT HIERARCHY -------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_bn text,
  slug text unique not null,
  icon text default '📚',
  color text default '#FF2E55',
  thumbnail_color text,
  description text,
  description_bn text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  name_bn text,
  description text,
  description_bn text,
  telegram_channel_id text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  name text not null,
  name_bn text,
  description text,
  description_bn text,
  requires_enrollment boolean not null default false,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  title_bn text,
  description text,
  description_bn text,
  source_type text not null default 'youtube' check (source_type in ('telegram','youtube','drive')),
  source_url text,
  youtube_video_id text,
  drive_file_id text,
  telegram_channel_id text,
  telegram_message_id bigint,
  duration text default '00:00',
  size_mb int default 0,
  thumbnail_url text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.cycles(subject_id, display_order);
create index on public.chapters(cycle_id, display_order);
create index on public.videos(chapter_id, display_order);
create index on public.videos(is_active);

alter table public.subjects enable row level security;
alter table public.cycles   enable row level security;
alter table public.chapters enable row level security;
alter table public.videos   enable row level security;

create policy "public_read_subjects" on public.subjects for select using (is_active = true);
create policy "admin_all_subjects"   on public.subjects for all using (public.is_admin()) with check (public.is_admin());
create policy "public_read_cycles"   on public.cycles   for select using (is_active = true);
create policy "admin_all_cycles"     on public.cycles   for all using (public.is_admin()) with check (public.is_admin());
create policy "public_read_chapters" on public.chapters for select using (is_active = true);
create policy "admin_all_chapters"   on public.chapters for all using (public.is_admin()) with check (public.is_admin());
create policy "public_read_videos"   on public.videos   for select using (is_active = true);
create policy "admin_all_videos"     on public.videos   for all using (public.is_admin()) with check (public.is_admin());

create trigger trg_subjects_touch before update on public.subjects for each row execute procedure public.touch_updated_at();
create trigger trg_cycles_touch   before update on public.cycles   for each row execute procedure public.touch_updated_at();
create trigger trg_chapters_touch before update on public.chapters for each row execute procedure public.touch_updated_at();
create trigger trg_videos_touch   before update on public.videos   for each row execute procedure public.touch_updated_at();

-- WATCH HISTORY -----------------------------------------------------------
create table public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  progress_seconds int not null default 0,
  completed boolean not null default false,
  watch_count int not null default 1,
  watched_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, video_id)
);
alter table public.watch_history enable row level security;
create index on public.watch_history(user_id, watched_at desc);

create policy "users_manage_own_watch" on public.watch_history
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admins_read_all_watch" on public.watch_history
  for select using (public.is_admin());

create trigger trg_watch_touch before update on public.watch_history
  for each row execute procedure public.touch_updated_at();

-- ANNOUNCEMENTS -----------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_bn text,
  body text,
  body_bn text,
  type text not null default 'info' check (type in ('info','warning','success','urgent')),
  is_active boolean not null default true,
  show_on_dashboard boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy "public_read_announcements" on public.announcements for select using (is_active = true);
create policy "admin_all_announcements"   on public.announcements for all using (public.is_admin()) with check (public.is_admin());

-- NOTIFICATIONS -----------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  title_bn text,
  body text,
  body_bn text,
  type text not null default 'info' check (type in ('info','success','warning','system')),
  is_read boolean not null default false,
  action_url text,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create index on public.notifications(user_id, created_at desc);
create policy "users_read_own_notifications"   on public.notifications for select using (user_id = auth.uid());
create policy "users_update_own_notifications" on public.notifications for update using (user_id = auth.uid());
create policy "admins_manage_notifications"    on public.notifications for all using (public.is_admin()) with check (public.is_admin());

-- LIVE CLASSES ------------------------------------------------------------
create table public.live_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_bn text,
  description text,
  description_bn text,
  subject_id uuid references public.subjects(id) on delete set null,
  cycle_id uuid references public.cycles(id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  meeting_url text,
  stream_url text,
  is_active boolean not null default true,
  is_cancelled boolean not null default false,
  is_completed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.live_classes enable row level security;
create policy "public_read_live" on public.live_classes for select using (is_active = true);
create policy "admin_all_live"   on public.live_classes for all using (public.is_admin()) with check (public.is_admin());

-- ENROLLMENT CODES + CHAPTER ACCESS --------------------------------------
create table public.enrollment_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  label text,
  notes text,
  max_uses int not null default 1,
  uses_count int not null default 0,
  is_active boolean not null default true,
  generated_by uuid references auth.users(id) on delete set null,
  generated_at timestamptz not null default now()
);
alter table public.enrollment_codes enable row level security;
-- Users cannot read codes directly (security); only admins. They redeem via RPC.
create policy "admin_all_codes" on public.enrollment_codes for all using (public.is_admin()) with check (public.is_admin());

create table public.chapter_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  enrollment_code_id uuid references public.enrollment_codes(id) on delete set null,
  device_fingerprint text,
  device_user_agent text,
  first_accessed_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  access_count int not null default 1,
  is_blocked boolean not null default false,
  blocked_reason text,
  unique(user_id, chapter_id)
);
alter table public.chapter_access enable row level security;
create policy "users_read_own_access" on public.chapter_access for select using (user_id = auth.uid());
create policy "admins_all_access"     on public.chapter_access for all using (public.is_admin()) with check (public.is_admin());

-- Secure code redemption RPC (only way users obtain access)
create or replace function public.redeem_enrollment_code(_code text, _device_fingerprint text default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_code public.enrollment_codes;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  select * into v_code from public.enrollment_codes
    where code = _code and is_active = true limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if v_code.uses_count >= v_code.max_uses then
    return jsonb_build_object('ok', false, 'error', 'code_exhausted');
  end if;
  insert into public.chapter_access(user_id, chapter_id, enrollment_code_id, device_fingerprint)
  values (v_user, v_code.chapter_id, v_code.id, _device_fingerprint)
  on conflict (user_id, chapter_id) do update
    set last_accessed_at = now(), access_count = public.chapter_access.access_count + 1;
  update public.enrollment_codes set uses_count = uses_count + 1 where id = v_code.id;
  return jsonb_build_object('ok', true, 'chapter_id', v_code.chapter_id);
end;
$$;

-- ACTIVITY LOGS -----------------------------------------------------------
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb default '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.activity_logs enable row level security;
create index on public.activity_logs(created_at desc);
create policy "auth_insert_logs" on public.activity_logs for insert to authenticated with check (true);
create policy "admin_read_logs"  on public.activity_logs for select using (public.is_admin());

-- SYSTEM SETTINGS ---------------------------------------------------------
create table public.system_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.system_settings enable row level security;
create policy "public_read_settings" on public.system_settings for select using (true);
create policy "admin_write_settings" on public.system_settings for all using (public.is_admin()) with check (public.is_admin());

insert into public.system_settings(key, value) values
  ('maintenance_mode', 'false'::jsonb),
  ('platform_name', '"NexusEdu"'::jsonb)
on conflict (key) do nothing;

-- SEED CATALOG (3 subjects so the UI is alive immediately) ---------------
insert into public.subjects (name, name_bn, slug, icon, color, description, description_bn, display_order) values
  ('Physics',     'পদার্থবিজ্ঞান', 'physics',   '⚛️', '#FF2E55', 'Mechanics, waves, electricity, modern physics — 1st & 2nd paper.', 'বলবিদ্যা, তরঙ্গ, বিদ্যুৎ ও আধুনিক পদার্থবিজ্ঞান।', 1),
  ('Chemistry',   'রসায়ন',         'chemistry', '🧪', '#FFB23A', 'Organic, inorganic and physical chemistry — fully covered.',         'জৈব, অজৈব ও ভৌত রসায়ন — সম্পূর্ণ সিলেবাস।',           2),
  ('Higher Math', 'উচ্চতর গণিত',   'higher-math','∑',  '#7C3AED', 'Calculus, vectors, matrices, statics & dynamics.',                   'ক্যালকুলাস, ভেক্টর, ম্যাট্রিক্স ও স্থিতি-গতিবিদ্যা।',  3);
