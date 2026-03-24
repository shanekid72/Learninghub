import type { HrScannerIdentity } from "../../../lib/hr/upload-signing"
import type { HrRiskSummary } from "../../../lib/hr/contracts"
import type { HrScannerSessionSnapshot } from "../../../lib/hr/view-models"

export type ScannerSuspiciousProcess = {
  command?: string
  cpuPercent: number
  memoryMB: number
  name: string
  networkConnections: number
  pid: number
}

export type ScannerSnapshot = {
  interviewCoderDetected: boolean
  interviewCoderProcesses: Array<{ command?: string; name: string; pid: number }>
  networkProcessCount: number
  summary: HrRiskSummary
  suspiciousProcesses: ScannerSuspiciousProcess[]
  timestamp: string
}

export type PairingState = {
  apiBaseUrl: string
  inviteId: string
  lastUploadedSequence: number
  scannerFingerprint: string
  scannerIdentity: HrScannerIdentity
  session: HrScannerSessionSnapshot
  uploadToken: string
  uploadTokenExpiresAt: string
}
