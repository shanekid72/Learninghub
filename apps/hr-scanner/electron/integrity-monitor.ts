import { exec as rawExec } from "node:child_process"
import { promisify } from "node:util"
import psList from "ps-list"
import si from "systeminformation"
import { normalizeHrRiskSummary } from "../../../lib/hr/contracts"

const execAsync = promisify(rawExec)
const INTERVIEW_CODER_PATTERN = /interview\s*coder/i
const MEMORY_THRESHOLD_MB = 50
const MONITORING_INTERVAL_MS = 10_000

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
  summary: ReturnType<typeof normalizeHrRiskSummary>
  suspiciousProcesses: ScannerSuspiciousProcess[]
  timestamp: string
}

async function getDisplayCount() {
  const graphics = await si.graphics()
  return graphics.displays?.length || 0
}

async function getInterviewCoderProcesses() {
  const processes = await psList()
  return processes
    .filter((process) => {
      const name = process.name || ""
      const command = process.cmd || ""
      return INTERVIEW_CODER_PATTERN.test(name) || INTERVIEW_CODER_PATTERN.test(command)
    })
    .map((process) => ({
      pid: process.pid,
      name: process.name || "unknown",
      command: process.cmd || "",
    }))
}

async function getHighMemoryProcesses() {
  const processData = await si.processes()
  return processData.list
    .filter((process) => Math.round(process.memRss / 1024) > MEMORY_THRESHOLD_MB)
    .map((process) => ({
      pid: process.pid,
      name: process.name,
      command: process.command,
      memoryMB: Math.round(process.memRss / 1024),
      cpuPercent: Number(process.cpu || 0),
    }))
}

async function getNetworkConnectionCounts() {
  if (process.platform !== "win32") {
    return new Map<number, number>()
  }

  const { stdout } = await execAsync("netstat -ano | findstr ESTABLISHED")
  const counts = new Map<number, number>()

  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const parts = trimmed.split(/\s+/)
    const pid = Number(parts.at(-1))
    if (!Number.isFinite(pid) || pid <= 0) continue

    counts.set(pid, (counts.get(pid) || 0) + 1)
  }

  return counts
}

export class IntegrityMonitor {
  private monitoringInterval: NodeJS.Timeout | null = null
  private monitoringStartedAt: string | null = null

  constructor(private readonly onUpdate: (snapshot: ScannerSnapshot) => void) {}

  async runSnapshot(): Promise<ScannerSnapshot> {
    const timestamp = new Date().toISOString()
    const [displayCount, interviewCoderProcesses, highMemoryProcesses, networkConnectionCounts] =
      await Promise.all([
        getDisplayCount(),
        getInterviewCoderProcesses(),
        getHighMemoryProcesses(),
        getNetworkConnectionCounts(),
      ])

    const suspiciousProcesses = highMemoryProcesses
      .filter((process) => networkConnectionCounts.has(process.pid))
      .map((process) => ({
        ...process,
        networkConnections: networkConnectionCounts.get(process.pid) || 0,
      }))
      .sort((left, right) => right.memoryMB - left.memoryMB)

    const summary = normalizeHrRiskSummary({
      displayCount,
      highMemoryCount: highMemoryProcesses.length,
      networkProcessCount: networkConnectionCounts.size,
      suspiciousCount: suspiciousProcesses.length,
      interviewCoderDetected: interviewCoderProcesses.length > 0,
      monitoringStartedAt: this.monitoringStartedAt || timestamp,
      lastUpdatedAt: timestamp,
      scannerVersion: "0.1.0",
      platform: process.platform,
    })

    return {
      timestamp,
      summary,
      suspiciousProcesses,
      networkProcessCount: networkConnectionCounts.size,
      interviewCoderDetected: interviewCoderProcesses.length > 0,
      interviewCoderProcesses,
    }
  }

  async runBaselineCheck() {
    return this.runSnapshot()
  }

  async startMonitoring() {
    if (this.monitoringInterval) {
      return {
        monitoringStartedAt: this.monitoringStartedAt || new Date().toISOString(),
      }
    }

    this.monitoringStartedAt = new Date().toISOString()

    const tick = async () => {
      try {
        const snapshot = await this.runSnapshot()
        this.onUpdate(snapshot)
      } catch (error) {
        console.error("Failed to run monitoring snapshot:", error)
      }
    }

    await tick()
    this.monitoringInterval = setInterval(() => {
      void tick()
    }, MONITORING_INTERVAL_MS)

    return {
      monitoringStartedAt: this.monitoringStartedAt,
    }
  }

  async stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    return { stopped: true as const }
  }
}
