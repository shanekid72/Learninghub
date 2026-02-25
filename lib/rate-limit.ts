const rateLimit = new Map<string, { count: number; lastReset: number }>()

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
  return new Response(
    JSON.stringify({ 
      error: 'Too many requests', 
      retryAfter: Math.ceil(resetIn / 1000) 
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(resetIn / 1000)),
      },
    }
  )
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

setInterval(() => {
  const now = Date.now()
  const maxAge = 5 * 60 * 1000
  
  for (const [key, record] of rateLimit.entries()) {
    if (now - record.lastReset > maxAge) {
      rateLimit.delete(key)
    }
  }
}, 60 * 1000)
