import { NextResponse } from "next/server"
import { isHrIntegrityEnabled } from "@/lib/hr/feature"
import { validateHrInviteSchema } from "@/lib/hr/schemas"
import { getHrInviteValidation } from "@/lib/hr/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  if (!isHrIntegrityEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const body = await request.json()
    const parsed = validateHrInviteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid invite validation payload", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const supabase = await createAdminClient()
    const result = await getHrInviteValidation(supabase, parsed.data.token)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error validating HR invite:", error)
    return NextResponse.json({ error: "Failed to validate invite" }, { status: 500 })
  }
}
