type SessionPayload = {
  email: string
  iat: number
  exp: number
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function toBase64Url(value: string): string {
  return bytesToBase64Url(encoder.encode(value))
}

function fromBase64Url(value: string): string {
  return decoder.decode(base64UrlToBytes(value))
}

function getSessionSecret(): string {
  const secret = process.env.AUTH_COOKIE_SECRET
  if (!secret) {
    throw new Error("AUTH_COOKIE_SECRET environment variable is not set")
  }
  return secret
}

async function getSigningKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
}

function safeSignatureMatch(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return mismatch === 0
}

async function signPayload(payload: string): Promise<string> {
  const key = await getSigningKey()
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  return bytesToBase64Url(new Uint8Array(signature))
}

export function getAuthCookieName(): string {
  return process.env.AUTH_COOKIE_NAME || "lh_session"
}

export function getSessionTtlHours(): number {
  const raw = process.env.AUTH_SESSION_TTL_HOURS || "24"
  const ttl = Number(raw)
  if (!Number.isFinite(ttl) || ttl <= 0) {
    return 24
  }
  return ttl
}

export async function createSignedSession(email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    email: email.trim().toLowerCase(),
    iat: now,
    exp: now + Math.floor(getSessionTtlHours() * 3600),
  }
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = await signPayload(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export async function verifySignedSession(token: string): Promise<SessionPayload | null> {
  const [encodedPayload, signature] = token.split(".")
  if (!encodedPayload || !signature) return null

  const expectedSignature = await signPayload(encodedPayload)
  if (!safeSignatureMatch(signature, expectedSignature)) return null

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload
    if (!parsed.email || !parsed.exp) return null

    const now = Math.floor(Date.now() / 1000)
    if (parsed.exp <= now) return null

    return parsed
  } catch {
    return null
  }
}

export async function readEmailFromSession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null
  const payload = await verifySignedSession(token)
  return payload?.email || null
}
