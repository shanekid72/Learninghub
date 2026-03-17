import { NextResponse } from "next/server"
import { requireAdminProfile } from "@/lib/admin-auth"
import { runYoutubeSync } from "@/lib/youtube-sync"

export async function POST() {
  const admin = await requireAdminProfile()
  if (admin.error) return admin.error

  const result = await runYoutubeSync("manual")
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
