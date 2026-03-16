-- Harden learning module/team tables with explicit RLS policies and foreign key indexes

CREATE INDEX IF NOT EXISTS idx_learning_modules_created_by
  ON public.learning_modules(created_by);

CREATE INDEX IF NOT EXISTS idx_learning_modules_updated_by
  ON public.learning_modules(updated_by);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'learning_teams'
      AND policyname = 'Authenticated users can view active learning teams'
  ) THEN
    CREATE POLICY "Authenticated users can view active learning teams"
      ON public.learning_teams
      FOR SELECT
      TO authenticated
      USING (is_active = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'learning_teams'
      AND policyname = 'Admins can manage learning teams'
  ) THEN
    CREATE POLICY "Admins can manage learning teams"
      ON public.learning_teams
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'learning_modules'
      AND policyname = 'Authenticated users can view published learning modules'
  ) THEN
    CREATE POLICY "Authenticated users can view published learning modules"
      ON public.learning_modules
      FOR SELECT
      TO authenticated
      USING (status = 'published');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'learning_modules'
      AND policyname = 'Admins can manage learning modules'
  ) THEN
    CREATE POLICY "Admins can manage learning modules"
      ON public.learning_modules
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;
