-- Fix: pin search_path on the two functions flagged by the linter
create or replace function public.touch_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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

-- Fix: tighten activity_logs insert (must log as yourself)
drop policy if exists "auth_insert_logs" on public.activity_logs;
create policy "users_insert_own_logs" on public.activity_logs
  for insert to authenticated
  with check (user_id = auth.uid());
