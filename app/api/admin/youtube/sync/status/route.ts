import { NextResponse } from "next/server"
import { requireAdminProfile } from "@/lib/admin-auth"
import { getYoutubeSyncStatus } from "@/lib/youtube-sync"

export async function GET() {
  const admin = await requireAdminProfile()
  if (admin.error) return admin.error

  const status = await getYoutubeSyncStatus()
  return NextResponse.json(status)
}
