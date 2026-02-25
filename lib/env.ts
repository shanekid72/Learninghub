interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  RESEND_API_KEY?: string
  LH_BASE_URL?: string
  LH_API_KEY?: string
  AUTH_ALLOWED_EMAIL_DOMAINS?: string
  AUTH_COOKIE_NAME: string
}

function getEnvVar(key: string, required: boolean = false): string {
  const value = process.env[key]
  
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  
  return value || ''
}

export function validateEnv(): EnvConfig {
  return {
    NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL', true),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', true),
    SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
    RESEND_API_KEY: getEnvVar('RESEND_API_KEY'),
    LH_BASE_URL: getEnvVar('LH_BASE_URL'),
    LH_API_KEY: getEnvVar('LH_API_KEY'),
    AUTH_ALLOWED_EMAIL_DOMAINS: getEnvVar('AUTH_ALLOWED_EMAIL_DOMAINS'),
    AUTH_COOKIE_NAME: getEnvVar('AUTH_COOKIE_NAME') || 'lh_session',
  }
}

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

export function isGoogleSheetsConfigured(): boolean {
  return !!(process.env.LH_BASE_URL && process.env.LH_API_KEY)
}
