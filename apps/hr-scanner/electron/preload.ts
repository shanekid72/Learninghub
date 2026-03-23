import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("scannerApi", {
  getAppVersion: () => ipcRenderer.invoke("scanner:get-app-version"),
  getPendingSessionLink: () => ipcRenderer.invoke("scanner:get-pending-session-link"),
  runBaselineCheck: () => ipcRenderer.invoke("scanner:run-baseline"),
  startMonitoring: () => ipcRenderer.invoke("scanner:start-monitoring"),
  stopMonitoring: () => ipcRenderer.invoke("scanner:stop-monitoring"),
  onSessionLink: (listener: (sessionLink: string) => void) => {
    const handler = (_event: unknown, sessionLink: string) => listener(sessionLink)
    ipcRenderer.on("scanner:session-link", handler)
    return () => ipcRenderer.removeListener("scanner:session-link", handler)
  },
  onMonitoringUpdate: (listener: (snapshot: unknown) => void) => {
    const handler = (_event: unknown, snapshot: unknown) => listener(snapshot)
    ipcRenderer.on("scanner:monitoring-update", handler)
    return () => ipcRenderer.removeListener("scanner:monitoring-update", handler)
  },
})
