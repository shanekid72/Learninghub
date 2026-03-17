-- YouTube unlisted video sync metadata and state

ALTER TABLE public.learning_modules
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'youtube')),
  ADD COLUMN IF NOT EXISTS source_video_id TEXT,
  ADD COLUMN IF NOT EXISTS source_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS source_visibility TEXT NOT NULL DEFAULT 'unknown'
    CHECK (source_visibility IN ('unlisted', 'public', 'private', 'unknown')),
  ADD COLUMN IF NOT EXISTS source_status TEXT NOT NULL DEFAULT 'active'
    CHECK (source_status IN ('active', 'removed', 'error')),
  ADD COLUMN IF NOT EXISTS source_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_payload JSONB;

UPDATE public.learning_modules
SET
  source = COALESCE(source, 'manual'),
  source_visibility = COALESCE(source_visibility, 'unknown'),
  source_status = COALESCE(source_status, 'active')
WHERE source IS NULL
   OR source_visibility IS NULL
   OR source_status IS NULL;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'youtube_sync_state'
      AND policyname = 'Admins can view youtube sync state'
  ) THEN
    CREATE POLICY "Admins can view youtube sync state"
      ON public.youtube_sync_state
      FOR SELECT
      TO authenticated
      USING (
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
      AND tablename = 'youtube_sync_state'
      AND policyname = 'Admins can manage youtube sync state'
  ) THEN
    CREATE POLICY "Admins can manage youtube sync state"
      ON public.youtube_sync_state
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
