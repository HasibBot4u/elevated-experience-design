-- Create video_notes table for per-user notes attached to a video
CREATE TABLE IF NOT EXISTS public.video_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);

ALTER TABLE public.video_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_notes"
  ON public.video_notes
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins_read_notes"
  ON public.video_notes
  FOR SELECT
  USING (public.is_admin());

CREATE TRIGGER video_notes_touch_updated_at
  BEFORE UPDATE ON public.video_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_video_notes_user ON public.video_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_notes_video ON public.video_notes(video_id);