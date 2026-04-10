-- PROFILES
CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text NOT NULL DEFAULT '',
  timezone        text NOT NULL DEFAULT 'UTC',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- LOG ENTRIES (polymorphic)
CREATE TABLE public.log_entries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              text NOT NULL CHECK (type IN ('meal','workout','bodyweight','mood','reflection')),
  logged_at         timestamptz NOT NULL DEFAULT now(),
  notes             text,
  data              jsonb NOT NULL DEFAULT '{}',
  voice_transcript  text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX log_entries_user_logged_at ON public.log_entries (user_id, logged_at DESC);
ALTER TABLE public.log_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log_entries_select_own" ON public.log_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "log_entries_insert_own" ON public.log_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "log_entries_update_own" ON public.log_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "log_entries_delete_own" ON public.log_entries FOR DELETE USING (auth.uid() = user_id);

-- HABITS
CREATE TABLE public.habits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#6366f1',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habits_select_own" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "habits_insert_own" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habits_update_own" ON public.habits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habits_delete_own" ON public.habits FOR DELETE USING (auth.uid() = user_id);

-- HABIT LOGS
CREATE TABLE public.habit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id      uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_on  date NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, completed_on)
);
CREATE INDEX habit_logs_user_date ON public.habit_logs (user_id, completed_on DESC);
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habit_logs_select_own" ON public.habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "habit_logs_insert_own" ON public.habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habit_logs_delete_own" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id);

-- CALENDAR EVENTS
CREATE TABLE public.calendar_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  location    text,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz,
  ics_uid     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ics_uid)
);
CREATE INDEX calendar_events_user_start ON public.calendar_events (user_id, start_at ASC);
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendar_events_select_own" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "calendar_events_insert_own" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calendar_events_delete_own" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

-- INSIGHTS CACHE
CREATE TABLE public.insights_cache (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_end   date NOT NULL,
  stats_json   jsonb NOT NULL DEFAULT '{}',
  narrative    text NOT NULL,
  audio_url    text,
  insight_mode text NOT NULL DEFAULT 'mock',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_end)
);
ALTER TABLE public.insights_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insights_select_own" ON public.insights_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insights_insert_own" ON public.insights_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "insights_update_own" ON public.insights_cache FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "insights_delete_own" ON public.insights_cache FOR DELETE USING (auth.uid() = user_id);
