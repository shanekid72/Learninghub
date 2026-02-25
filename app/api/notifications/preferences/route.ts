import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const preferencesSchema = z.object({
  email_welcome: z.boolean().optional(),
  email_completion: z.boolean().optional(),
  email_certificate: z.boolean().optional(),
  email_digest: z.boolean().optional(),
  email_reminders: z.boolean().optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!preferences) {
      const defaultPreferences = {
        user_id: user.id,
        email_welcome: true,
        email_completion: true,
        email_certificate: true,
        email_digest: true,
        email_reminders: true,
      }

      const { data: newPrefs, error: insertError } = await supabase
        .from('notification_preferences')
        .insert(defaultPreferences)
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return NextResponse.json(newPrefs)
    }

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    
    const validation = preferencesSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid preferences data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const updates = validation.data
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let result
    if (existing) {
      result = await supabase
        .from('notification_preferences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('notification_preferences')
        .insert({ user_id: user.id, ...updates })
        .select()
        .single()
    }

    if (result.error) {
      throw result.error
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}
