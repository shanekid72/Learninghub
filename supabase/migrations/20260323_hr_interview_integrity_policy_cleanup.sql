DROP POLICY IF EXISTS "Admins can view HR sessions" ON public.hr_sessions;
DROP POLICY IF EXISTS "Admins can manage HR sessions" ON public.hr_sessions;

CREATE POLICY "Admins can manage HR sessions" ON public.hr_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view HR session invites" ON public.hr_session_invites;
DROP POLICY IF EXISTS "Admins can manage HR session invites" ON public.hr_session_invites;

CREATE POLICY "Admins can manage HR session invites" ON public.hr_session_invites
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view HR session events" ON public.hr_session_events;
DROP POLICY IF EXISTS "Admins can manage HR session events" ON public.hr_session_events;

CREATE POLICY "Admins can manage HR session events" ON public.hr_session_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );
