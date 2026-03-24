import { getHrUploadTokenTtlMinutes } from "@/lib/hr/feature"

type HrUploadTokenPayload = {
  exp: number
  iat: number
  inviteId: string
  kind: "hr_upload"
  scannerFingerprint: string
  sessionId: string
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
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function getRandomTokenPart(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  return bytesToBase64Url(bytes)
}

function parseUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function hashValue(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value))
  return bytesToBase64Url(new Uint8Array(digest))
}

function getHrUploadTokenSecret(): string {
  const secret = process.env.HR_UPLOAD_TOKEN_SECRET || process.env.AUTH_COOKIE_SECRET
  if (!secret) {
    throw new Error("HR_UPLOAD_TOKEN_SECRET or AUTH_COOKIE_SECRET must be configured")
  }
  return secret
}

async function getSigningKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getHrUploadTokenSecret()),
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

async function signPayload(encodedPayload: string): Promise<string> {
  const key = await getSigningKey()
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload))
  return bytesToBase64Url(new Uint8Array(signature))
}

export async function createHrInviteToken() {
  const inviteId = crypto.randomUUID()
  const secret = getRandomTokenPart(32)
  return {
    inviteId,
    token: `${inviteId}.${secret}`,
    tokenHash: await hashValue(secret),
  }
}

export async function verifyHrInviteToken(
  token: string,
): Promise<{ inviteId: string; tokenHash: string } | null> {
  const trimmed = token.trim()
  const [inviteId, secret] = trimmed.split(".")
  if (!inviteId || !secret || !parseUuidLike(inviteId)) {
    return null
  }

  return {
    inviteId,
    tokenHash: await hashValue(secret),
  }
}

export async function createHrUploadToken(
  sessionId: string,
  inviteId: string,
  scannerFingerprint: string,
): Promise<{ expiresAt: string; token: string }> {
  const now = Math.floor(Date.now() / 1000)
  const payload: HrUploadTokenPayload = {
    kind: "hr_upload",
    sessionId,
    inviteId,
    scannerFingerprint,
    iat: now,
    exp: now + Math.floor(getHrUploadTokenTtlMinutes() * 60),
  }

  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await signPayload(encodedPayload)

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  }
}

export async function verifyHrUploadToken(token: string): Promise<HrUploadTokenPayload | null> {
  const [encodedPayload, signature] = token.split(".")
  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = await signPayload(encodedPayload)
  if (!safeSignatureMatch(signature, expectedSignature)) {
    return null
  }

  try {
    const payload = JSON.parse(
      decoder.decode(base64UrlToBytes(encodedPayload)),
    ) as HrUploadTokenPayload

    const now = Math.floor(Date.now() / 1000)
    if (
      payload.kind !== "hr_upload" ||
      !parseUuidLike(payload.sessionId) ||
      !parseUuidLike(payload.inviteId) ||
      typeof payload.scannerFingerprint !== "string" ||
      payload.scannerFingerprint.length < 20 ||
      payload.exp <= now
    ) {
      return null
    }

    return payload
  } catch {
    return null
  }
}
