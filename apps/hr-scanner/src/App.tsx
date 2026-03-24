import { useCallback, useEffect, useRef, useState } from "react"
import {
  createHrSignedSummaryEnvelope,
  generateHrScannerIdentity,
  signHrSummaryEnvelope,
} from "../../../lib/hr/upload-signing"
import type { HrPairSessionResult } from "../../../lib/hr/view-models"
import type { PairingState, ScannerSnapshot } from "./types"

const PAIRING_STORAGE_KEY = "learninghub.hr-scanner.pairing"
const LOCALHOST_HOSTNAMES = new Set(["127.0.0.1", "::1", "localhost"])

type SessionConfig = {
  apiBaseUrl: string
  token: string
}

function parseAllowedOrigins(rawValue: string): string[] {
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

function isLocalhost(hostname: string): boolean {
  return LOCALHOST_HOSTNAMES.has(hostname.toLowerCase())
}

function normalizeTrustedApiBaseUrl(input: string, allowedOrigins: string[]): string {
  const url = new URL(input.trim())

  if (isLocalhost(url.hostname)) {
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Local development scanners only support http:// or https:// origins.")
    }

    return url.origin
  }

  if (url.protocol !== "https:") {
    throw new Error("LearningHub interview scanners only pair over HTTPS.")
  }

  if (allowedOrigins.length === 0) {
    throw new Error("This scanner build is missing a trusted LearningHub origin allowlist.")
  }

  if (!allowedOrigins.includes(url.origin)) {
    throw new Error("This session link does not match a trusted LearningHub origin.")
  }

  return url.origin
}

function extractSessionConfig(input: string, fallbackBaseUrl: string, allowedOrigins: string[]): SessionConfig {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error("Paste the interview session link from LearningHub.")
  }

  try {
    const url = new URL(trimmed)
    const pathSegments = url.pathname.split("/").filter(Boolean)

    if (pathSegments.length < 3 || pathSegments[0] !== "hr" || pathSegments[1] !== "interview") {
      throw new Error("Expected a LearningHub HR interview link.")
    }

    const token = decodeURIComponent(pathSegments[2] || "")
    if (!token) {
      throw new Error("Session link is missing a token.")
    }

    return {
      apiBaseUrl: normalizeTrustedApiBaseUrl(url.origin, allowedOrigins),
      token,
    }
  } catch (error) {
    if (error instanceof Error && error.message !== "Invalid URL") {
      throw error
    }

    if (!fallbackBaseUrl.trim()) {
      throw new Error("Paste the full session link, or provide a trusted LearningHub base URL for manual pairing.")
    }

    return {
      apiBaseUrl: normalizeTrustedApiBaseUrl(fallbackBaseUrl, allowedOrigins),
      token: trimmed,
    }
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set"
  return new Date(value).toLocaleString()
}

function isUploadTokenExpired(value: string): boolean {
  return new Date(value).getTime() <= Date.now()
}

function restorePairingState(): PairingState | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const rawState = window.localStorage.getItem(PAIRING_STORAGE_KEY)
    if (!rawState) {
      return null
    }

    const parsed = JSON.parse(rawState) as PairingState
    if (!parsed.uploadToken || !parsed.uploadTokenExpiresAt || isUploadTokenExpired(parsed.uploadTokenExpiresAt)) {
      window.localStorage.removeItem(PAIRING_STORAGE_KEY)
      return null
    }

    return parsed
  } catch {
    window.localStorage.removeItem(PAIRING_STORAGE_KEY)
    return null
  }
}

function persistPairingState(value: PairingState | null) {
  if (typeof window === "undefined") {
    return
  }

  if (!value) {
    window.localStorage.removeItem(PAIRING_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(PAIRING_STORAGE_KEY, JSON.stringify(value))
}

async function postSummary(
  pairing: PairingState,
  snapshot: ScannerSnapshot,
  eventType: "baseline" | "heartbeat" | "completed",
) {
  const envelope = createHrSignedSummaryEnvelope({
    eventType,
    inviteId: pairing.inviteId,
    sequence: pairing.lastUploadedSequence + 1,
    sessionId: pairing.session.sessionId,
    signedAt: new Date().toISOString(),
    summary: snapshot.summary,
  })
  const signature = await signHrSummaryEnvelope(pairing.scannerIdentity.privateKey, envelope)
  const path = eventType === "completed" ? "/api/hr/complete" : "/api/hr/heartbeat"
  const response = await fetch(`${pairing.apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pairing.uploadToken}`,
    },
    body: JSON.stringify({ envelope, signature }),
  })

  const payload = (await response.json()) as { acceptedSequence?: number; error?: string }
  if (!response.ok) {
    throw new Error(payload.error || `Failed to upload ${eventType} summary`)
  }

  if (typeof payload.acceptedSequence !== "number") {
    throw new Error(`LearningHub did not acknowledge the ${eventType} upload.`)
  }

  return payload.acceptedSequence
}

export default function App() {
  const allowedOrigins = parseAllowedOrigins(__HR_ALLOWED_ORIGINS__)
  const initialPairingRef = useRef<PairingState | null | undefined>(undefined)
  if (initialPairingRef.current === undefined) {
    initialPairingRef.current = restorePairingState()
  }

  const initialPairing = initialPairingRef.current || null
  const [appVersion, setAppVersion] = useState("0.1.0")
  const [sessionInput, setSessionInput] = useState("")
  const [fallbackApiBaseUrl, setFallbackApiBaseUrl] = useState("")
  const [pairing, setPairing] = useState<PairingState | null>(initialPairing)
  const [snapshot, setSnapshot] = useState<ScannerSnapshot | null>(null)
  const [statusMessage, setStatusMessage] = useState(
    initialPairing
      ? "Existing scanner pairing restored locally."
      : "Paste a LearningHub interview link to begin.",
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<"baseline" | "complete" | "monitoring" | "pair" | null>(null)
  const [monitoringActive, setMonitoringActive] = useState(false)
  const pairingRef = useRef<PairingState | null>(initialPairing)
  const uploadInFlightRef = useRef(false)

  const updatePairingState = useCallback((nextPairing: PairingState | null | ((current: PairingState | null) => PairingState | null)) => {
    setPairing((current) => {
      const resolvedPairing = typeof nextPairing === "function" ? nextPairing(current) : nextPairing
      persistPairingState(resolvedPairing)
      return resolvedPairing
    })
  }, [])

  useEffect(() => {
    pairingRef.current = pairing
  }, [pairing])

  useEffect(() => {
    let mounted = true

    void window.scannerApi.getAppVersion().then((version) => {
      if (mounted) setAppVersion(version)
    })

    const stopSessionLink = window.scannerApi.onSessionLink((nextSessionLink) => {
      setSessionInput(nextSessionLink)
      setStatusMessage("Pairing link received from LearningHub.")
    })

    const stopMonitoring = window.scannerApi.onMonitoringUpdate((nextSnapshot) => {
      setSnapshot(nextSnapshot)

      if (!pairingRef.current || uploadInFlightRef.current) {
        return
      }

      uploadInFlightRef.current = true
      void postSummary(pairingRef.current, nextSnapshot, "heartbeat")
        .then((acceptedSequence) => {
          updatePairingState((current) =>
            current
              ? {
                  ...current,
                  lastUploadedSequence: acceptedSequence,
                }
              : current,
          )
          setStatusMessage("Monitoring update uploaded.")
        })
        .catch((uploadError) => {
          setError(uploadError instanceof Error ? uploadError.message : "Failed to upload heartbeat.")
        })
        .finally(() => {
          uploadInFlightRef.current = false
        })
    })

    void window.scannerApi.getPendingSessionLink().then((pendingSessionLink) => {
      if (mounted && pendingSessionLink) {
        setSessionInput(pendingSessionLink)
        setStatusMessage("Session link received. Pair the scanner when ready.")
      }
    })

    return () => {
      mounted = false
      stopSessionLink()
      stopMonitoring()
    }
  }, [updatePairingState])

  async function uploadSnapshot(
    currentPairing: PairingState,
    nextSnapshot: ScannerSnapshot,
    eventType: "baseline" | "heartbeat" | "completed",
  ) {
    const acceptedSequence = await postSummary(currentPairing, nextSnapshot, eventType)
    updatePairingState((existingPairing) =>
      existingPairing
        ? {
            ...existingPairing,
            lastUploadedSequence: acceptedSequence,
          }
        : existingPairing,
    )

    return acceptedSequence
  }

  async function handlePair() {
    setBusy("pair")
    setError(null)

    try {
      const config = extractSessionConfig(sessionInput, fallbackApiBaseUrl, allowedOrigins)
      const scannerIdentity = await generateHrScannerIdentity()
      const response = await fetch(`${config.apiBaseUrl}/api/hr/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: config.token,
          scannerFingerprint: scannerIdentity.fingerprint,
          scannerPublicKey: scannerIdentity.publicKey,
          scannerVersion: appVersion,
          platform: window.navigator.platform || "win32",
        }),
      })

      const payload = (await response.json()) as Partial<HrPairSessionResult> & {
        error?: string
      }

      if (
        !response.ok ||
        !payload.inviteId ||
        !payload.session ||
        !payload.uploadToken ||
        !payload.uploadTokenExpiresAt ||
        !payload.scannerFingerprint
      ) {
        throw new Error(payload.error || "Failed to pair session")
      }

      if (payload.scannerFingerprint !== scannerIdentity.fingerprint) {
        throw new Error("LearningHub rejected the scanner identity fingerprint.")
      }

      await window.scannerApi.stopMonitoring()
      setMonitoringActive(false)
      updatePairingState({
        apiBaseUrl: config.apiBaseUrl,
        inviteId: payload.inviteId,
        lastUploadedSequence: 0,
        scannerFingerprint: payload.scannerFingerprint,
        scannerIdentity,
        session: payload.session,
        uploadToken: payload.uploadToken,
        uploadTokenExpiresAt: payload.uploadTokenExpiresAt,
      })
      setSnapshot(null)
      setStatusMessage("Scanner paired. Run the baseline check before the interview starts.")
    } catch (pairingError) {
      setError(pairingError instanceof Error ? pairingError.message : "Failed to pair scanner")
    } finally {
      setBusy(null)
    }
  }

  async function handleBaseline() {
    if (!pairing) return

    setBusy("baseline")
    setError(null)

    try {
      const nextSnapshot = await window.scannerApi.runBaselineCheck()
      setSnapshot(nextSnapshot)
      await uploadSnapshot(pairing, nextSnapshot, "baseline")
      setStatusMessage("Baseline uploaded. Start monitoring when the interview begins.")
    } catch (baselineError) {
      setError(baselineError instanceof Error ? baselineError.message : "Failed to run baseline check")
    } finally {
      setBusy(null)
    }
  }

  async function handleMonitoring() {
    if (!pairing) return

    setBusy("monitoring")
    setError(null)

    try {
      if (!snapshot) {
        const baselineSnapshot = await window.scannerApi.runBaselineCheck()
        setSnapshot(baselineSnapshot)
        await uploadSnapshot(pairing, baselineSnapshot, "baseline")
      }
      await window.scannerApi.startMonitoring()
      setMonitoringActive(true)
      setStatusMessage("Continuous monitoring is active.")
    } catch (monitoringError) {
      setError(monitoringError instanceof Error ? monitoringError.message : "Failed to start monitoring")
    } finally {
      setBusy(null)
    }
  }

  async function handleStopMonitoring() {
    await window.scannerApi.stopMonitoring()
    setMonitoringActive(false)
    setStatusMessage("Monitoring stopped locally.")
  }

  async function handleComplete() {
    if (!pairing) return

    setBusy("complete")
    setError(null)

    try {
      const nextSnapshot = snapshot || (await window.scannerApi.runBaselineCheck())
      setSnapshot(nextSnapshot)
      await uploadSnapshot(pairing, nextSnapshot, "completed")
      await window.scannerApi.stopMonitoring()
      setMonitoringActive(false)
      updatePairingState(null)
      setStatusMessage("Session marked complete. HR can review the uploaded timeline now.")
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "Failed to complete session")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">LearningHub HR Scanner</p>
          <h1>Interview integrity monitor</h1>
          <p className="subtle">
            Pair this scanner with a LearningHub interview session, run the baseline check, then keep monitoring active for the interview.
          </p>
        </div>
        <div className="version-badge">v{appVersion}</div>
      </header>

      <main className="grid-layout">
        <section className="panel">
          <h2>1. Pair Scanner</h2>
          <p className="panel-copy">
            Paste the full session link from LearningHub. Manual pairing is only allowed against a trusted LearningHub base URL.
          </p>
          <textarea
            className="input input-large"
            value={sessionInput}
            onChange={(event) => setSessionInput(event.target.value)}
            placeholder="https://learninghub.example.com/hr/interview/..."
          />
          <input
            className="input"
            value={fallbackApiBaseUrl}
            onChange={(event) => setFallbackApiBaseUrl(event.target.value)}
            placeholder="Optional trusted LearningHub base URL for manual token pairing"
          />
          <div className="actions">
            <button className="primary-button" onClick={() => void handlePair()} disabled={busy === "pair"}>
              {busy === "pair" ? "Pairing..." : "Pair Session"}
            </button>
          </div>

          {pairing ? (
            <div className="detail-block">
              <p><strong>Candidate:</strong> {pairing.session.candidateName}</p>
              <p><strong>Role:</strong> {pairing.session.jobTitle}</p>
              <p><strong>Upload token expires:</strong> {formatDate(pairing.uploadTokenExpiresAt)}</p>
            </div>
          ) : null}
        </section>

        <section className="panel">
          <h2>2. Controls</h2>
          <p className="panel-copy">
            Upload a baseline before the interview starts, then enable continuous monitoring.
          </p>
          <div className="actions vertical">
            <button className="secondary-button" onClick={() => void handleBaseline()} disabled={!pairing || busy === "baseline"}>
              {busy === "baseline" ? "Running baseline..." : "Run Baseline Check"}
            </button>
            <button className="primary-button" onClick={() => void handleMonitoring()} disabled={!pairing || monitoringActive || busy === "monitoring"}>
              {busy === "monitoring" ? "Starting monitoring..." : monitoringActive ? "Monitoring Active" : "Start Monitoring"}
            </button>
            <button className="secondary-button" onClick={() => void handleStopMonitoring()} disabled={!monitoringActive}>
              Stop Monitoring
            </button>
            <button className="danger-button" onClick={() => void handleComplete()} disabled={!pairing || busy === "complete"}>
              {busy === "complete" ? "Completing..." : "Complete Session"}
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>Latest Summary</h2>
          {snapshot ? (
            <div className="summary-grid">
              <div className="summary-card">
                <span>Risk</span>
                <strong>{snapshot.summary.riskLevel}</strong>
              </div>
              <div className="summary-card">
                <span>Displays</span>
                <strong>{snapshot.summary.displayCount}</strong>
              </div>
              <div className="summary-card">
                <span>High-memory</span>
                <strong>{snapshot.summary.highMemoryCount}</strong>
              </div>
              <div className="summary-card">
                <span>Network</span>
                <strong>{snapshot.summary.networkProcessCount}</strong>
              </div>
              <div className="summary-card">
                <span>Suspicious</span>
                <strong>{snapshot.summary.suspiciousCount}</strong>
              </div>
              <div className="summary-card">
                <span>Interview Coder</span>
                <strong>{snapshot.summary.interviewCoderDetected ? "Detected" : "Clear"}</strong>
              </div>
            </div>
          ) : (
            <p className="panel-copy">No baseline or monitoring snapshot yet.</p>
          )}
        </section>

        <section className="panel panel-wide">
          <h2>Local Findings</h2>
          <p className="panel-copy">
            These details stay local to the scanner UI. LearningHub only receives the bounded summary counts and flags.
          </p>
          {snapshot?.suspiciousProcesses.length ? (
            <div className="process-list">
              {snapshot.suspiciousProcesses.map((process) => (
                <article key={process.pid} className="process-card">
                  <div className="process-head">
                    <strong>{process.name}</strong>
                    <span>PID {process.pid}</span>
                  </div>
                  <p>Memory: {process.memoryMB} MB</p>
                  <p>CPU: {process.cpuPercent.toFixed(1)}%</p>
                  <p>Connections: {process.networkConnections}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="panel-copy">No suspicious high-memory network processes in the latest snapshot.</p>
          )}
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>Status:</strong> {statusMessage}
        </div>
        {error ? <div className="error-text">{error}</div> : null}
      </footer>
    </div>
  )
}
