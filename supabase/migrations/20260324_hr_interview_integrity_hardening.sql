ALTER TABLE public.hr_sessions
  ADD COLUMN IF NOT EXISTS scanner_public_key TEXT,
  ADD COLUMN IF NOT EXISTS scanner_key_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS scanner_last_sequence INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.hr_sessions
  DROP CONSTRAINT IF EXISTS hr_sessions_scanner_last_sequence_check;

ALTER TABLE public.hr_sessions
  ADD CONSTRAINT hr_sessions_scanner_last_sequence_check
  CHECK (scanner_last_sequence >= 0);
