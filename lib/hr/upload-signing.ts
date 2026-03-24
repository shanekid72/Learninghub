import type { HrRiskSummaryInput, HrUploadEventType } from "@/lib/hr/contracts"

const encoder = new TextEncoder()

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

export function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function encodeJson(value: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(value))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function normalizeKeyMaterial(value: string): string {
  return value.trim().replace(/\s+/g, "")
}

async function importScannerPublicKey(publicKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    toArrayBuffer(base64UrlToBytes(normalizeKeyMaterial(publicKey))),
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["verify"],
  )
}

async function importScannerPrivateKey(privateKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    toArrayBuffer(base64UrlToBytes(normalizeKeyMaterial(privateKey))),
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign"],
  )
}

export interface HrSignedSummaryEnvelope {
  eventType: HrUploadEventType
  inviteId: string
  sequence: number
  sessionId: string
  signedAt: string
  summary: HrRiskSummaryInput
}

export interface HrScannerIdentity {
  fingerprint: string
  privateKey: string
  publicKey: string
}

export function createHrSignedSummaryEnvelope(input: HrSignedSummaryEnvelope): HrSignedSummaryEnvelope {
  return {
    eventType: input.eventType,
    inviteId: input.inviteId,
    sequence: input.sequence,
    sessionId: input.sessionId,
    signedAt: input.signedAt,
    summary: input.summary,
  }
}

export function serializeHrSignedSummaryEnvelope(envelope: HrSignedSummaryEnvelope): string {
  return JSON.stringify({
    eventType: envelope.eventType,
    inviteId: envelope.inviteId,
    sequence: envelope.sequence,
    sessionId: envelope.sessionId,
    signedAt: envelope.signedAt,
    summary: envelope.summary,
  })
}

export async function fingerprintHrScannerPublicKey(publicKey: string): Promise<string> {
  const normalizedKey = normalizeKeyMaterial(publicKey)
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(base64UrlToBytes(normalizedKey)))
  return bytesToBase64Url(new Uint8Array(digest))
}

export async function generateHrScannerIdentity(): Promise<HrScannerIdentity> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"],
  )

  const [publicKeyBuffer, privateKeyBuffer] = await Promise.all([
    crypto.subtle.exportKey("spki", keyPair.publicKey),
    crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
  ])

  const publicKey = bytesToBase64Url(new Uint8Array(publicKeyBuffer))
  const privateKey = bytesToBase64Url(new Uint8Array(privateKeyBuffer))

  return {
    publicKey,
    privateKey,
    fingerprint: await fingerprintHrScannerPublicKey(publicKey),
  }
}

export async function signHrSummaryEnvelope(
  privateKey: string,
  envelope: HrSignedSummaryEnvelope,
): Promise<string> {
  const signingKey = await importScannerPrivateKey(privateKey)
  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-256",
    },
    signingKey,
    toArrayBuffer(encodeJson(createHrSignedSummaryEnvelope(envelope))),
  )

  return bytesToBase64Url(new Uint8Array(signature))
}

export async function verifyHrSummaryEnvelopeSignature(
  publicKey: string,
  envelope: HrSignedSummaryEnvelope,
  signature: string,
): Promise<boolean> {
  try {
    const verificationKey = await importScannerPublicKey(publicKey)

    return crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: "SHA-256",
      },
      verificationKey,
      toArrayBuffer(base64UrlToBytes(normalizeKeyMaterial(signature))),
      toArrayBuffer(encodeJson(createHrSignedSummaryEnvelope(envelope))),
    )
  } catch {
    return false
  }
}
