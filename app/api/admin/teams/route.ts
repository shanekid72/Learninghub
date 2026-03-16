import { NextResponse } from "next/server"
import { requireAdminProfile } from "@/lib/admin-auth"
import { adminTeamSchema } from "@/lib/learning-modules"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const admin = await requireAdminProfile()
  if (admin.error) return admin.error

  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("activeOnly") === "1"

    let query = supabase
      .from("learning_teams")
      .select("id, name, is_active, sort_order, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ teams: data || [] })
  } catch (error) {
    console.error("Error fetching learning teams:", error)
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminProfile()
  if (admin.error) return admin.error

  try {
    const payload = await request.json()
    const parsed = adminTeamSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid team payload", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const supabase = await createAdminClient()
    const { data: existing, error: existingError } = await supabase
      .from("learning_teams")
      .select("id, name, is_active, sort_order, created_at, updated_at")
      .eq("name", parsed.data.name)
      .maybeSingle()

    if (existingError) throw existingError

    if (existing) {
      const { data, error } = await supabase
        .from("learning_teams")
        .update({
          is_active: parsed.data.isActive,
          sort_order: parsed.data.sortOrder ?? existing.sort_order,
        })
        .eq("id", existing.id)
        .select("id, name, is_active, sort_order, created_at, updated_at")
        .single()

      if (error) throw error
      return NextResponse.json({ team: data })
    }

    const { data: currentTeams, error: currentTeamsError } = await supabase
      .from("learning_teams")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)

    if (currentTeamsError) throw currentTeamsError

    const sortOrder =
      parsed.data.sortOrder ??
      (((currentTeams || [])[0]?.sort_order || 0) + 10)

    const { data, error } = await supabase
      .from("learning_teams")
      .insert({
        name: parsed.data.name,
        is_active: parsed.data.isActive,
        sort_order: sortOrder,
      })
      .select("id, name, is_active, sort_order, created_at, updated_at")
      .single()

    if (error) throw error

    return NextResponse.json({ team: data }, { status: 201 })
  } catch (error) {
    console.error("Error creating learning team:", error)
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}
