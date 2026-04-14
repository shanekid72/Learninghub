import { NextResponse } from "next/server"

const rateLimit = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT_COOKIE_NAME = "lh_rlid"
const RATE_LIMIT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24

interface RateLimitConfig {
  limit: number
  windowMs: number
}

const defaultConfig: RateLimitConfig = {
  limit: 100,
  windowMs: 60 * 1000,
}

const routeConfigs: Record<string, RateLimitConfig> = {
  '/api/quiz/submit': { limit: 10, windowMs: 60 * 1000 },
  '/api/comments': { limit: 20, windowMs: 60 * 1000 },
  '/api/certificates/generate': { limit: 5, windowMs: 60 * 1000 },
  '/api/notifications/send': { limit: 5, windowMs: 60 * 1000 },
  '/api/auth/login': { limit: 5, windowMs: 60 * 1000 },
}

export function resetRateLimitForTests() {
  rateLimit.clear()
}

export function checkRateLimit(
  identifier: string,
  path: string
): { success: boolean; remaining: number; resetIn: number } {
  const config = routeConfigs[path] || defaultConfig
  const key = `${identifier}:${path}`
  const now = Date.now()
  
  const record = rateLimit.get(key)
  
  if (!record || now - record.lastReset >= config.windowMs) {
    rateLimit.set(key, { count: 1, lastReset: now })
    return { success: true, remaining: config.limit - 1, resetIn: config.windowMs }
  }
  
  if (record.count >= config.limit) {
    const resetIn = config.windowMs - (now - record.lastReset)
    return { success: false, remaining: 0, resetIn }
  }
  
  record.count++
  return { 
    success: true, 
    remaining: config.limit - record.count, 
    resetIn: config.windowMs - (now - record.lastReset) 
  }
}

export function getRateLimitResponse(resetIn: number) {
  return NextResponse.json(
    {
      error: "Too many requests",
      retryAfter: Math.ceil(resetIn / 1000),
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(resetIn / 1000)),
      },
    },
  )
}

export function getRateLimitCookieName() {
  return RATE_LIMIT_COOKIE_NAME
}

export function createRateLimitCookieValue() {
  return crypto.randomUUID()
}

export function attachRateLimitCookie(response: NextResponse, value: string) {
  response.cookies.set(RATE_LIMIT_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RATE_LIMIT_COOKIE_MAX_AGE_SECONDS,
  })

  return response
}

const cleanupTimer = setInterval(() => {
  const now = Date.now()
  const maxAge = 5 * 60 * 1000
  
  for (const [key, record] of rateLimit.entries()) {
    if (now - record.lastReset > maxAge) {
      rateLimit.delete(key)
    }
  }
}, 60 * 1000)

cleanupTimer.unref?.()
