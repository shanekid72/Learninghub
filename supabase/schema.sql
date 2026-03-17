-- Learning Portal Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'learner' CHECK (role IN ('learner', 'admin')),
  team TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL,
  title TEXT NOT NULL,
  questions JSONB NOT NULL,
  passing_score INTEGER DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles
);

-- Enable RLS on quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Quizzes policies
CREATE POLICY "Everyone can view quizzes" ON public.quizzes
  FOR SELECT USING (true);

CREATE POLICY "Admins can create quizzes" ON public.quizzes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update quizzes" ON public.quizzes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete quizzes" ON public.quizzes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Quiz attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles NOT NULL,
  quiz_id UUID REFERENCES public.quizzes NOT NULL,
  answers JSONB NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  passed BOOLEAN NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on quiz_attempts
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Quiz attempts policies
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts" ON public.quiz_attempts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Certificates table
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles NOT NULL,
  module_id TEXT NOT NULL,
  certificate_url TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Enable RLS on certificates
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Certificates policies
CREATE POLICY "Users can view own certificates" ON public.certificates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create certificates" ON public.certificates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all certificates" ON public.certificates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Module assignments table
CREATE TABLE IF NOT EXISTS public.module_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_source TEXT NOT NULL DEFAULT 'lh',
  module_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles,
  team TEXT,
  due_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT module_assignments_target_check CHECK ((user_id IS NOT NULL) <> (team IS NOT NULL))
);

-- Enable RLS on module_assignments
ALTER TABLE public.module_assignments ENABLE ROW LEVEL SECURITY;

-- Module assignments policies
CREATE POLICY "Users can view assignments for themselves or their team" ON public.module_assignments
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      team IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid() AND p.team = module_assignments.team
      )
    )
  );

CREATE POLICY "Admins can view all module assignments" ON public.module_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can create module assignments" ON public.module_assignments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update module assignments" ON public.module_assignments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete module assignments" ON public.module_assignments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles NOT NULL,
  module_id TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  parent_id UUID REFERENCES public.comments,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Everyone can view comments" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment" ON public.comments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Update timestamp trigger for comments
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles,
  event_type TEXT NOT NULL,
  module_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on analytics_events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Analytics events policies
CREATE POLICY "Users can create own events" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all events" ON public.analytics_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles UNIQUE NOT NULL,
  email_welcome BOOLEAN DEFAULT true,
  email_completion BOOLEAN DEFAULT true,
  email_certificate BOOLEAN DEFAULT true,
  email_digest BOOLEAN DEFAULT true,
  email_reminders BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notification preferences policies
CREATE POLICY "Users can view own preferences" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create default notification preferences on profile creation
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Learning teams taxonomy
CREATE TABLE IF NOT EXISTS public.learning_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.learning_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active learning teams" ON public.learning_teams
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage learning teams" ON public.learning_teams
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Learning modules catalog
CREATE TABLE IF NOT EXISTS public.learning_modules (
  module_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  description TEXT,
  module_type TEXT NOT NULL CHECK (module_type IN ('VIDEO', 'DOC', 'SLIDES')),
  duration_mins INTEGER NOT NULL CHECK (duration_mins >= 0),
  content_embed_url TEXT NOT NULL,
  open_url TEXT,
  thumbnail_url TEXT,
  owner TEXT NOT NULL,
  badges TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  teams TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  quiz_mode TEXT NOT NULL DEFAULT 'none' CHECK (quiz_mode IN ('none', 'internal', 'external_embed', 'external_link')),
  quiz_embed_url TEXT,
  quiz_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'youtube')),
  source_video_id TEXT,
  source_channel_id TEXT,
  source_visibility TEXT NOT NULL DEFAULT 'unknown' CHECK (source_visibility IN ('unlisted', 'public', 'private', 'unknown')),
  source_status TEXT NOT NULL DEFAULT 'active' CHECK (source_status IN ('active', 'removed', 'error')),
  source_published_at TIMESTAMPTZ,
  source_imported_at TIMESTAMPTZ,
  source_synced_at TIMESTAMPTZ,
  source_reviewed_at TIMESTAMPTZ,
  source_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles,
  updated_by UUID REFERENCES public.profiles
);

ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view published learning modules" ON public.learning_modules
  FOR SELECT TO authenticated USING (status = 'published');

CREATE POLICY "Admins can manage learning modules" ON public.learning_modules
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'learning_teams_updated_at'
  ) THEN
    CREATE TRIGGER learning_teams_updated_at
      BEFORE UPDATE ON public.learning_teams
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_learning_modules_created_by
  ON public.learning_modules(created_by);

CREATE INDEX IF NOT EXISTS idx_learning_modules_updated_by
  ON public.learning_modules(updated_by);

CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_modules_source_video_id
  ON public.learning_modules(source_video_id)
  WHERE source_video_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_learning_modules_source
  ON public.learning_modules(source);

CREATE INDEX IF NOT EXISTS idx_learning_modules_source_status
  ON public.learning_modules(source_status);

CREATE INDEX IF NOT EXISTS idx_learning_modules_source_visibility
  ON public.learning_modules(source_visibility);

CREATE INDEX IF NOT EXISTS idx_learning_modules_source_channel_id
  ON public.learning_modules(source_channel_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'learning_modules_updated_at'
  ) THEN
    CREATE TRIGGER learning_modules_updated_at
      BEFORE UPDATE ON public.learning_modules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.youtube_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT UNIQUE NOT NULL,
  uploads_playlist_id TEXT NOT NULL,
  last_checked_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_seen_video_published_at TIMESTAMPTZ,
  last_error TEXT,
  last_error_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.youtube_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view youtube sync state" ON public.youtube_sync_state
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage youtube sync state" ON public.youtube_sync_state
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'youtube_sync_state_updated_at'
  ) THEN
    CREATE TRIGGER youtube_sync_state_updated_at
      BEFORE UPDATE ON public.youtube_sync_state
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

INSERT INTO public.learning_teams (name, sort_order, is_active)
VALUES
  ('PDD Core Dev', 1, true),
  ('QA', 2, true),
  ('Infra', 3, true),
  ('BA', 4, true),
  ('Mobile', 5, true),
  ('D9', 6, true),
  ('LMT', 7, true)
ON CONFLICT (name) DO NOTHING;

WITH legacy_modules(seed, ordinality) AS (
  SELECT *
  FROM jsonb_array_elements(
    '[
      {
        "id": "1",
        "title": "Intro to CI/CD Pipelines",
        "objective": "Understand the fundamentals of continuous integration and deployment to ship code faster and safer.",
        "description": "This module covers the basics of setting up CI/CD pipelines using modern tooling. You will learn how to automate builds, run tests, and deploy to staging and production environments.",
        "module_type": "VIDEO",
        "duration_mins": 12,
        "content_embed_url": "https://www.youtube.com/embed/scEDHsr3APg",
        "owner": "DevOps Team",
        "badges": ["MANDATORY"],
        "teams": ["PDD Core Dev", "Infra", "QA"],
        "quiz_embed_url": "https://docs.google.com/forms/d/e/1FAIpQLSdExample1/viewform?embedded=true"
      },
      {
        "id": "2",
        "title": "Security Best Practices",
        "objective": "Learn essential security practices to protect applications and user data from common vulnerabilities.",
        "module_type": "SLIDES",
        "duration_mins": 18,
        "content_embed_url": "https://docs.google.com/presentation/d/e/2PACX-1vQExample/embed?start=false&loop=false&delayms=3000",
        "owner": "Security Guild",
        "badges": ["MANDATORY", "UPDATED"],
        "teams": ["PDD Core Dev", "QA", "Infra", "Mobile", "D9"],
        "quiz_url": "https://forms.gle/exampleQuiz2"
      },
      {
        "id": "3",
        "title": "React Performance Optimization",
        "objective": "Master techniques to identify and resolve performance bottlenecks in React applications.",
        "module_type": "VIDEO",
        "duration_mins": 25,
        "content_embed_url": "https://www.youtube.com/embed/0FWknzmFpKo",
        "owner": "Frontend Guild",
        "badges": ["NEW"],
        "teams": ["PDD Core Dev", "Mobile", "D9"]
      },
      {
        "id": "4",
        "title": "API Design Guidelines",
        "objective": "Follow consistent patterns for designing REST and GraphQL APIs that are easy to consume and maintain.",
        "module_type": "DOC",
        "duration_mins": 10,
        "content_embed_url": "https://docs.google.com/document/d/e/2PACX-1vQExample/pub?embedded=true",
        "owner": "Architecture Team",
        "teams": ["PDD Core Dev", "BA", "Infra"]
      },
      {
        "id": "5",
        "title": "Onboarding: Day 1 Orientation",
        "objective": "Get up to speed on company culture, tools, and your first-day setup checklist.",
        "module_type": "VIDEO",
        "duration_mins": 8,
        "content_embed_url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
        "owner": "People Ops",
        "badges": ["MANDATORY"],
        "teams": ["PDD Core Dev", "QA", "Infra", "BA", "Mobile", "D9", "LMT"],
        "quiz_embed_url": "https://docs.google.com/forms/d/e/1FAIpQLSdExample5/viewform?embedded=true"
      },
      {
        "id": "6",
        "title": "Testing Strategies & Frameworks",
        "objective": "Explore unit, integration, and E2E testing strategies to build confidence in your codebase.",
        "module_type": "SLIDES",
        "duration_mins": 20,
        "content_embed_url": "https://docs.google.com/presentation/d/e/2PACX-1vQExample6/embed?start=false&loop=false",
        "owner": "QA Guild",
        "badges": ["UPDATED"],
        "teams": ["PDD Core Dev", "QA", "Mobile"],
        "quiz_url": "https://forms.gle/exampleQuiz6"
      },
      {
        "id": "7",
        "title": "Cloud Infrastructure 101",
        "objective": "Understand cloud concepts including compute, storage, and networking fundamentals.",
        "module_type": "VIDEO",
        "duration_mins": 30,
        "content_embed_url": "https://www.youtube.com/embed/M988_fsOSWo",
        "owner": "Infra Team",
        "teams": ["Infra", "PDD Core Dev"]
      },
      {
        "id": "8",
        "title": "Accessible UI Development",
        "objective": "Build inclusive interfaces that work for everyone, meeting WCAG 2.1 AA standards.",
        "module_type": "DOC",
        "duration_mins": 15,
        "content_embed_url": "https://docs.google.com/document/d/e/2PACX-1vQExample8/pub?embedded=true",
        "owner": "Design Systems",
        "badges": ["NEW"],
        "teams": ["PDD Core Dev", "Mobile", "D9"]
      },
      {
        "id": "9",
        "title": "Agile & Sprint Planning",
        "objective": "Improve team velocity and collaboration through effective sprint planning and retrospectives.",
        "module_type": "SLIDES",
        "duration_mins": 14,
        "content_embed_url": "https://docs.google.com/presentation/d/e/2PACX-1vQExample9/embed?start=false",
        "owner": "Agile CoE",
        "teams": ["BA", "PDD Core Dev", "QA", "LMT"]
      },
      {
        "id": "10",
        "title": "Onboarding: Week 1 Deep Dive",
        "objective": "Dive into your team''s codebase, workflows, and key contacts during your first week.",
        "module_type": "DOC",
        "duration_mins": 22,
        "content_embed_url": "https://docs.google.com/document/d/e/2PACX-1vQExample10/pub?embedded=true",
        "owner": "People Ops",
        "badges": ["MANDATORY"],
        "teams": ["PDD Core Dev", "QA", "Infra", "BA", "Mobile", "D9", "LMT"]
      },
      {
        "id": "11",
        "title": "Mobile App Architecture Patterns",
        "objective": "Evaluate and apply MVVM, Clean Architecture, and other patterns for scalable mobile apps.",
        "module_type": "VIDEO",
        "duration_mins": 16,
        "content_embed_url": "https://www.youtube.com/embed/lkCjKJ7aEI0",
        "owner": "Mobile Guild",
        "teams": ["Mobile", "D9"]
      },
      {
        "id": "12",
        "title": "Data Privacy & GDPR Compliance",
        "objective": "Ensure your team handles personal data in compliance with GDPR and internal policies.",
        "module_type": "SLIDES",
        "duration_mins": 9,
        "content_embed_url": "https://docs.google.com/presentation/d/e/2PACX-1vQExample12/embed?start=false",
        "owner": "Legal & Compliance",
        "badges": ["MANDATORY"],
        "teams": ["PDD Core Dev", "QA", "Infra", "BA", "Mobile", "D9", "LMT"],
        "quiz_embed_url": "https://docs.google.com/forms/d/e/1FAIpQLSdExample12/viewform?embedded=true"
      },
      {
        "id": "13",
        "title": "Incident Response Playbook",
        "objective": "Know how to respond to production incidents quickly and effectively with minimal user impact.",
        "module_type": "DOC",
        "duration_mins": 11,
        "content_embed_url": "https://docs.google.com/document/d/e/2PACX-1vQExample13/pub?embedded=true",
        "owner": "SRE Team",
        "badges": ["UPDATED"],
        "teams": ["PDD Core Dev", "Infra", "QA"]
      },
      {
        "id": "14",
        "title": "Design System Components",
        "objective": "Learn to use and contribute to the shared design system for consistent UI across products.",
        "module_type": "VIDEO",
        "duration_mins": 13,
        "content_embed_url": "https://www.youtube.com/embed/example14",
        "owner": "Design Systems",
        "badges": ["NEW"],
        "teams": ["PDD Core Dev", "Mobile", "D9"]
      },
      {
        "id": "15",
        "title": "Onboarding: Month 1 Review",
        "objective": "Reflect on your first month, set goals, and meet with your manager for a check-in.",
        "module_type": "DOC",
        "duration_mins": 6,
        "content_embed_url": "https://docs.google.com/document/d/e/2PACX-1vQExample15/pub?embedded=true",
        "owner": "People Ops",
        "teams": ["PDD Core Dev", "QA", "Infra", "BA", "Mobile", "D9", "LMT"]
      }
    ]'::jsonb
  ) WITH ORDINALITY
),
normalized_modules AS (
  SELECT
    seed->>'id' AS module_id,
    seed->>'title' AS title,
    seed->>'objective' AS objective,
    NULLIF(seed->>'description', '') AS description,
    seed->>'module_type' AS module_type,
    COALESCE((seed->>'duration_mins')::INTEGER, 0) AS duration_mins,
    seed->>'content_embed_url' AS content_embed_url,
    NULLIF(seed->>'open_url', '') AS open_url,
    NULLIF(seed->>'thumbnail_url', '') AS thumbnail_url,
    seed->>'owner' AS owner,
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(seed->'badges', '[]'::jsonb))),
      '{}'::TEXT[]
    ) AS badges,
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(seed->'teams', '[]'::jsonb))),
      '{}'::TEXT[]
    ) AS teams,
    CASE
      WHEN NULLIF(seed->>'quiz_embed_url', '') IS NOT NULL THEN 'external_embed'
      WHEN NULLIF(seed->>'quiz_url', '') IS NOT NULL THEN 'external_link'
      ELSE 'none'
    END AS quiz_mode,
    NULLIF(seed->>'quiz_embed_url', '') AS quiz_embed_url,
    NULLIF(seed->>'quiz_url', '') AS quiz_url,
    ordinality::INTEGER AS sort_order
  FROM legacy_modules
)
INSERT INTO public.learning_modules (
  module_id,
  title,
  objective,
  description,
  module_type,
  duration_mins,
  content_embed_url,
  open_url,
  thumbnail_url,
  owner,
  badges,
  teams,
  status,
  quiz_mode,
  quiz_embed_url,
  quiz_url,
  sort_order
)
SELECT
  module_id,
  title,
  objective,
  description,
  module_type,
  duration_mins,
  content_embed_url,
  open_url,
  thumbnail_url,
  owner,
  badges,
  teams,
  'published',
  quiz_mode,
  quiz_embed_url,
  quiz_url,
  sort_order
FROM normalized_modules
ON CONFLICT (module_id) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quizzes_unique_module_id ON public.quizzes(module_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_teams_active_sort ON public.learning_teams(is_active, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_learning_modules_status_sort ON public.learning_modules(status, sort_order, title);
CREATE INDEX IF NOT EXISTS idx_learning_modules_module_type ON public.learning_modules(module_type);
CREATE INDEX IF NOT EXISTS idx_learning_modules_quiz_mode ON public.learning_modules(quiz_mode);
CREATE INDEX IF NOT EXISTS idx_learning_modules_teams ON public.learning_modules USING GIN (teams);
CREATE INDEX IF NOT EXISTS idx_learning_modules_badges ON public.learning_modules USING GIN (badges);
CREATE INDEX IF NOT EXISTS idx_module_assignments_module_id ON public.module_assignments(module_source, module_id);
CREATE INDEX IF NOT EXISTS idx_module_assignments_user_id ON public.module_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_module_assignments_team ON public.module_assignments(team);
CREATE INDEX IF NOT EXISTS idx_module_assignments_active ON public.module_assignments(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_module_assignments_unique_user_active
  ON public.module_assignments(module_source, module_id, user_id)
  WHERE user_id IS NOT NULL AND is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_module_assignments_unique_team_active
  ON public.module_assignments(module_source, module_id, team)
  WHERE team IS NOT NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_comments_module_id ON public.comments(module_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
