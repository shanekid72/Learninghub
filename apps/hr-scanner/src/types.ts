import type { HrSessionDetail } from "../../../lib/hr/view-models"
import type { HrRiskSummary } from "../../../lib/hr/contracts"

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
  session: HrSessionDetail
  sessionLink: string
  uploadToken: string
  uploadTokenExpiresAt: string
}
