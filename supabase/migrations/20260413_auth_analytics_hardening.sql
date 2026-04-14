DROP POLICY IF EXISTS "Users can create own events" ON public.analytics_events;

UPDATE public.analytics_events AS event
SET user_id = profile.id
FROM public.profiles AS profile
WHERE event.user_id IS NULL
  AND event.event_type = 'module_complete'
  AND lower(trim(COALESCE(event.metadata->>'email', ''))) = lower(trim(profile.email));

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type_user_id_created_at
  ON public.analytics_events(event_type, user_id, created_at DESC);
