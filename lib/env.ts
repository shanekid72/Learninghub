interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  EMAIL_PROVIDER?: string
  EMAIL_FROM?: string
  SMTP_HOST?: string
  SMTP_PORT?: string
  SMTP_SECURE?: string
  SMTP_USER?: string
  SMTP_APP_PASSWORD?: string
  RESEND_API_KEY?: string
  APP_BASE_URL?: string
  CRON_SECRET?: string
  LH_BASE_URL?: string
  LH_API_KEY?: string
  AUTH_ALLOWED_EMAIL_DOMAINS?: string
  AUTH_COOKIE_NAME: string
  AUTH_COOKIE_SECRET?: string
  AUTH_SESSION_TTL_HOURS: string
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
    EMAIL_PROVIDER: getEnvVar('EMAIL_PROVIDER'),
    EMAIL_FROM: getEnvVar('EMAIL_FROM'),
    SMTP_HOST: getEnvVar('SMTP_HOST'),
    SMTP_PORT: getEnvVar('SMTP_PORT'),
    SMTP_SECURE: getEnvVar('SMTP_SECURE'),
    SMTP_USER: getEnvVar('SMTP_USER'),
    SMTP_APP_PASSWORD: getEnvVar('SMTP_APP_PASSWORD'),
    RESEND_API_KEY: getEnvVar('RESEND_API_KEY'),
    APP_BASE_URL: getEnvVar('APP_BASE_URL'),
    CRON_SECRET: getEnvVar('CRON_SECRET'),
    LH_BASE_URL: getEnvVar('LH_BASE_URL'),
    LH_API_KEY: getEnvVar('LH_API_KEY'),
    AUTH_ALLOWED_EMAIL_DOMAINS: getEnvVar('AUTH_ALLOWED_EMAIL_DOMAINS'),
    AUTH_COOKIE_NAME: getEnvVar('AUTH_COOKIE_NAME') || 'lh_session',
    AUTH_COOKIE_SECRET: getEnvVar('AUTH_COOKIE_SECRET'),
    AUTH_SESSION_TTL_HOURS: getEnvVar('AUTH_SESSION_TTL_HOURS') || '24',
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

export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_APP_PASSWORD)
}

export function isEmailConfigured(): boolean {
  return isSmtpConfigured() || isResendConfigured()
}

export function isCronConfigured(): boolean {
  return !!process.env.CRON_SECRET
}

export function isGoogleSheetsConfigured(): boolean {
  return !!(process.env.LH_BASE_URL && process.env.LH_API_KEY)
}
