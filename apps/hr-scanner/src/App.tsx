import { useEffect, useRef, useState } from "react"
import type { PairingState, ScannerSnapshot } from "./types"

function extractSessionConfig(input: string, fallbackBaseUrl: string) {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error("Paste the interview session link from LearningHub.")
  }

  try {
    const url = new URL(trimmed)
    const token = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) || "")
    if (!token) {
      throw new Error("Session link is missing a token.")
    }

    return {
      apiBaseUrl: url.origin.replace(/\/+$/, ""),
      sessionLink: url.toString(),
      token,
    }
  } catch {
    if (!fallbackBaseUrl.trim()) {
      throw new Error("Paste the full session link, or provide an API base URL for manual pairing.")
    }

    return {
      apiBaseUrl: fallbackBaseUrl.trim().replace(/\/+$/, ""),
      sessionLink: "",
      token: trimmed,
    }
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set"
  return new Date(value).toLocaleString()
}

async function postSummary(
  pairing: PairingState,
  snapshot: ScannerSnapshot,
  eventType: "baseline" | "heartbeat" | "completed",
) {
  const path = eventType === "completed" ? "/api/hr/complete" : "/api/hr/heartbeat"
  const response = await fetch(`${pairing.apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pairing.uploadToken}`,
    },
    body: JSON.stringify(
      eventType === "completed"
        ? { summary: snapshot.summary }
        : { eventType, summary: snapshot.summary },
    ),
  })

  const payload = (await response.json()) as { error?: string }
  if (!response.ok) {
    throw new Error(payload.error || `Failed to upload ${eventType} summary`)
  }
}

export default function App() {
  const [appVersion, setAppVersion] = useState("0.1.0")
  const [sessionInput, setSessionInput] = useState("")
  const [fallbackApiBaseUrl, setFallbackApiBaseUrl] = useState("")
  const [pairing, setPairing] = useState<PairingState | null>(null)
  const [snapshot, setSnapshot] = useState<ScannerSnapshot | null>(null)
  const [statusMessage, setStatusMessage] = useState("Paste a LearningHub interview link to begin.")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<"baseline" | "complete" | "monitoring" | "pair" | null>(null)
  const [monitoringActive, setMonitoringActive] = useState(false)
  const pairingRef = useRef<PairingState | null>(null)
  const uploadInFlightRef = useRef(false)

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
        .then(() => {
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
  }, [])

  async function handlePair() {
    setBusy("pair")
    setError(null)

    try {
      const config = extractSessionConfig(sessionInput, fallbackApiBaseUrl)
      const response = await fetch(`${config.apiBaseUrl}/api/hr/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: config.token }),
      })

      const payload = (await response.json()) as {
        error?: string
        session?: PairingState["session"]
        uploadToken?: string
        uploadTokenExpiresAt?: string
      }

      if (!response.ok || !payload.session || !payload.uploadToken || !payload.uploadTokenExpiresAt) {
        throw new Error(payload.error || "Failed to pair session")
      }

      await window.scannerApi.stopMonitoring()
      setMonitoringActive(false)
      setPairing({
        apiBaseUrl: config.apiBaseUrl,
        session: payload.session,
        sessionLink: config.sessionLink || sessionInput.trim(),
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
      await postSummary(pairing, nextSnapshot, "baseline")
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
        await postSummary(pairing, baselineSnapshot, "baseline")
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
      await postSummary(pairing, nextSnapshot, "completed")
      await window.scannerApi.stopMonitoring()
      setMonitoringActive(false)
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
            Paste the full session link from LearningHub. If you only have a raw token, provide the web app base URL as well.
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
            placeholder="Optional API base URL for manual token pairing"
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
