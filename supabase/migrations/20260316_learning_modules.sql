-- Supabase-backed learning modules and team taxonomy

CREATE TABLE IF NOT EXISTS public.learning_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.learning_teams ENABLE ROW LEVEL SECURITY;

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles,
  updated_by UUID REFERENCES public.profiles
);

ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_quizzes_unique_module_id
  ON public.quizzes(module_id);

CREATE INDEX IF NOT EXISTS idx_learning_teams_active_sort
  ON public.learning_teams(is_active, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_learning_modules_status_sort
  ON public.learning_modules(status, sort_order, title);

CREATE INDEX IF NOT EXISTS idx_learning_modules_module_type
  ON public.learning_modules(module_type);

CREATE INDEX IF NOT EXISTS idx_learning_modules_quiz_mode
  ON public.learning_modules(quiz_mode);

CREATE INDEX IF NOT EXISTS idx_learning_modules_teams
  ON public.learning_modules USING GIN (teams);

CREATE INDEX IF NOT EXISTS idx_learning_modules_badges
  ON public.learning_modules USING GIN (badges);

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
