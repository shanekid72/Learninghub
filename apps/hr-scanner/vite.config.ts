import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import electron from "vite-plugin-electron/simple"

function toOrigin(value: string): string | null {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function getAllowedOrigins(): string {
  const rawOrigins = process.env.HR_SCANNER_ALLOWED_ORIGINS || process.env.APP_BASE_URL || ""

  return rawOrigins
    .split(",")
    .map((value) => toOrigin(value.trim()))
    .filter((value): value is string => Boolean(value))
    .join(",")
}

export default defineConfig({
  define: {
    __HR_ALLOWED_ORIGINS__: JSON.stringify(getAllowedOrigins()),
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main.ts",
      },
      preload: {
        input: "electron/preload.ts",
      },
      renderer: {},
    }),
  ],
  clearScreen: false,
})
