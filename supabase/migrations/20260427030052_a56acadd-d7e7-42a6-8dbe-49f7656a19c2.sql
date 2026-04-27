
-- video_bookmarks
CREATE TABLE IF NOT EXISTS public.video_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  timestamp_seconds INT NOT NULL DEFAULT 0,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id, timestamp_seconds)
);
ALTER TABLE public.video_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their bookmarks" ON public.video_bookmarks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- cycle_completions
CREATE TABLE IF NOT EXISTS public.cycle_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cycle_id UUID REFERENCES public.cycles(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cycle_id)
);
ALTER TABLE public.cycle_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their completions" ON public.cycle_completions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  time_limit_seconds INT DEFAULT 600,
  is_active BOOL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View active quizzes" ON public.quizzes FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage quizzes" ON public.quizzes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_idx INT NOT NULL,
  explanation TEXT,
  order_index INT DEFAULT 0
);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View quiz questions" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Admins manage quiz questions" ON public.quiz_questions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  score INT NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their quiz attempts" ON public.quiz_attempts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read quiz attempts" ON public.quiz_attempts FOR SELECT USING (public.is_admin());

-- Q&A
CREATE TABLE IF NOT EXISTS public.qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_answered BOOL DEFAULT false,
  votes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.qa_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view questions" ON public.qa_questions FOR SELECT USING (true);
CREATE POLICY "Auth users can post questions" ON public.qa_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own questions" ON public.qa_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own questions" ON public.qa_questions FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.qa_questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  is_accepted BOOL DEFAULT false,
  votes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view answers" ON public.qa_answers FOR SELECT USING (true);
CREATE POLICY "Auth users can post answers" ON public.qa_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own answers" ON public.qa_answers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own answers" ON public.qa_answers FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- Unique constraint on chapter_access (needed for ON CONFLICT clause)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chapter_access_user_chapter_unique'
  ) THEN
    ALTER TABLE public.chapter_access ADD CONSTRAINT chapter_access_user_chapter_unique UNIQUE (user_id, chapter_id);
  END IF;
END $$;
