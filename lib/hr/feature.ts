import {
  getHrInviteTtlHours,
  getHrScannerProtocol,
  getHrUploadTokenTtlMinutes,
  isHrIntegrityEnabled,
} from "@/lib/env"

export {
  getHrInviteTtlHours,
  getHrScannerProtocol,
  getHrUploadTokenTtlMinutes,
  isHrIntegrityEnabled,
}

export function getHrBaseUrl(requestUrl?: string): string {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim()
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "")
  }

  if (!requestUrl) {
    return ""
  }

  try {
    const url = new URL(requestUrl)
    return url.origin
  } catch {
    return ""
  }
}
