-- Add expiry to enrollment codes
ALTER TABLE public.enrollment_codes
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Add pin flag to announcements
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- Admin stats RPC
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_videos', (SELECT count(*) FROM public.videos WHERE is_active = true),
    'total_subjects', (SELECT count(*) FROM public.subjects WHERE is_active = true),
    'total_chapters', (SELECT count(*) FROM public.chapters WHERE is_active = true),
    'active_users_today', (
      SELECT count(DISTINCT user_id) FROM public.watch_history
      WHERE watched_at >= (now() - interval '1 day')
    ),
    'new_signups_this_week', (
      SELECT count(*) FROM public.profiles
      WHERE created_at >= (now() - interval '7 days')
    ),
    'total_watch_seconds', (
      SELECT COALESCE(SUM(progress_seconds), 0) FROM public.watch_history
    ),
    'enrollment_codes_used', (
      SELECT COALESCE(SUM(uses_count), 0) FROM public.enrollment_codes
    ),
    'total_quiz_attempts', 0
  ) INTO result;

  RETURN result;
END;
$$;