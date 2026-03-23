CREATE INDEX IF NOT EXISTS idx_hr_session_invites_created_by
  ON public.hr_session_invites(created_by);

CREATE INDEX IF NOT EXISTS idx_hr_session_events_actor_profile_id
  ON public.hr_session_events(actor_profile_id);
