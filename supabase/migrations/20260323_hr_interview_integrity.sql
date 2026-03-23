CREATE TABLE IF NOT EXISTS public.hr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  job_title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'invited', 'paired', 'monitoring', 'completed', 'reviewed', 'cancelled', 'expired')),
  latest_summary JSONB,
  review_outcome TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_outcome IN ('pending', 'clear', 'flagged', 'follow_up')),
  review_notes TEXT,
  created_by UUID REFERENCES public.profiles NOT NULL,
  reviewed_by UUID REFERENCES public.profiles,
  paired_at TIMESTAMPTZ,
  monitoring_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hr_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view HR sessions" ON public.hr_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage HR sessions" ON public.hr_sessions
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
    WHERE tgname = 'hr_sessions_updated_at'
  ) THEN
    CREATE TRIGGER hr_sessions_updated_at
      BEFORE UPDATE ON public.hr_sessions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.hr_session_invites (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.hr_sessions ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  paired_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hr_session_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view HR session invites" ON public.hr_session_invites
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage HR session invites" ON public.hr_session_invites
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS public.hr_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.hr_sessions ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('invite_sent', 'paired', 'baseline', 'heartbeat', 'completed', 'reviewed')),
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  actor_profile_id UUID REFERENCES public.profiles,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hr_session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view HR session events" ON public.hr_session_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage HR session events" ON public.hr_session_events
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_hr_sessions_status_created_at
  ON public.hr_sessions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hr_sessions_candidate_email
  ON public.hr_sessions(candidate_email);

CREATE INDEX IF NOT EXISTS idx_hr_sessions_created_by
  ON public.hr_sessions(created_by);

CREATE INDEX IF NOT EXISTS idx_hr_sessions_reviewed_by
  ON public.hr_sessions(reviewed_by);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_session_invites_token_hash
  ON public.hr_session_invites(token_hash);

CREATE INDEX IF NOT EXISTS idx_hr_session_invites_session_created_at
  ON public.hr_session_invites(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hr_session_events_session_created_at
  ON public.hr_session_events(session_id, created_at DESC);
