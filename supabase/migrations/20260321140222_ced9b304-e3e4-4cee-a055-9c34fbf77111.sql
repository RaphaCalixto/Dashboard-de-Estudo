
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Notes table (theory and exercises)
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id TEXT NOT NULL,
  subtopic_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('theory', 'exercise')),
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  question TEXT NOT NULL DEFAULT '',
  resolution TEXT NOT NULL DEFAULT '',
  answer TEXT NOT NULL DEFAULT '',
  images TEXT[] NOT NULL DEFAULT '{}',
  result TEXT CHECK (result IN ('correct', 'incorrect', NULL)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.notes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_notes_user_subject ON public.notes(user_id, subject_id, subtopic_id);

-- Exam results table
CREATE TABLE public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id TEXT NOT NULL,
  subtopic_ids TEXT[] NOT NULL DEFAULT '{}',
  questions JSONB NOT NULL DEFAULT '[]',
  time_limit INTEGER NOT NULL,
  time_used INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exams" ON public.exam_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exams" ON public.exam_results FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_exams_user ON public.exam_results(user_id);
