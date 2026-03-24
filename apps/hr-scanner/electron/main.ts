import { app, BrowserWindow, ipcMain } from "electron"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { IntegrityMonitor } from "./integrity-monitor"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, "..")

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron")
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist")
const protocolName = process.env.HR_SCANNER_PROTOCOL || "learninghub-hr"

let mainWindow: BrowserWindow | null = null
let pendingSessionLink: string | null = null

const monitor = new IntegrityMonitor((snapshot) => {
  mainWindow?.webContents.send("scanner:monitoring-update", snapshot)
})

function extractProtocolSessionLink(rawUrl: string) {
  try {
    const url = new URL(rawUrl)
    return url.searchParams.get("sessionLink")
  } catch {
    return null
  }
}

function queueSessionLink(sessionLink: string | null) {
  if (!sessionLink) return
  pendingSessionLink = sessionLink
  if (mainWindow) {
    mainWindow.webContents.send("scanner:session-link", sessionLink)
  }
}

function registerProtocol() {
  if (process.defaultApp) {
    app.setAsDefaultProtocolClient(protocolName, process.execPath, [path.resolve(process.argv[1])])
    return
  }

  app.setAsDefaultProtocolClient(protocolName)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 820,
    minWidth: 960,
    minHeight: 700,
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(MAIN_DIST, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  mainWindow.webContents.on("will-navigate", (event, nextUrl) => {
    const allowNavigation =
      (VITE_DEV_SERVER_URL && nextUrl.startsWith(VITE_DEV_SERVER_URL)) ||
      nextUrl.startsWith("file://")

    if (!allowNavigation) {
      event.preventDefault()
    }
  })

  if (VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    void mainWindow.loadFile(path.join(RENDERER_DIST, "index.html"))
  }

  mainWindow.on("closed", () => {
    void monitor.stopMonitoring()
    mainWindow = null
  })
}

const lock = app.requestSingleInstanceLock()
if (!lock) {
  app.quit()
}

app.on("second-instance", (_event, argv) => {
  const protocolArg = argv.find((arg) => arg.startsWith(`${protocolName}://`))
  queueSessionLink(extractProtocolSessionLink(protocolArg || ""))

  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
  }
})

app.on("open-url", (event, rawUrl) => {
  event.preventDefault()
  queueSessionLink(extractProtocolSessionLink(rawUrl))
})

app.whenReady().then(() => {
  registerProtocol()
  createWindow()
  const protocolArg = process.argv.find((arg) => arg.startsWith(`${protocolName}://`))
  queueSessionLink(extractProtocolSessionLink(protocolArg || ""))
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.handle("scanner:get-app-version", () => app.getVersion())
ipcMain.handle("scanner:get-pending-session-link", () => pendingSessionLink)
ipcMain.handle("scanner:run-baseline", async () => monitor.runBaselineCheck())
ipcMain.handle("scanner:start-monitoring", async () => monitor.startMonitoring())
ipcMain.handle("scanner:stop-monitoring", async () => monitor.stopMonitoring())
