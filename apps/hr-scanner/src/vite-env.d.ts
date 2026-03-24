/// <reference types="vite/client" />

import type { ScannerSnapshot } from "./types"

declare global {
  const __HR_ALLOWED_ORIGINS__: string
}

type Cleanup = () => void

interface ScannerApi {
  getAppVersion: () => Promise<string>
  getPendingSessionLink: () => Promise<string | null>
  onMonitoringUpdate: (listener: (snapshot: ScannerSnapshot) => void) => Cleanup
  onSessionLink: (listener: (sessionLink: string) => void) => Cleanup
  runBaselineCheck: () => Promise<ScannerSnapshot>
  startMonitoring: () => Promise<{ monitoringStartedAt: string }>
  stopMonitoring: () => Promise<{ stopped: true }>
}

declare global {
  interface Window {
    scannerApi: ScannerApi
  }
}

export {}
