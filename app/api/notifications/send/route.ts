import { NextResponse } from "next/server"
import { getSessionContext, hasAdminRole } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"
import { sendEmail, EmailType } from "@/lib/email"
import { z } from "zod"
import { checkRateLimit, getRateLimitResponse, getClientIP } from "@/lib/rate-limit"

const sendNotificationSchema = z.object({
  type: z.enum(['welcome', 'completion', 'reminder', 'certificate', 'update']),
  userId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  data: z.record(z.unknown()),
})

const notificationPreferenceByType = {
  completion: "email_completion",
  reminder: "email_reminders",
  certificate: "email_certificate",
  update: "email_digest",
} as const

export async function POST(request: Request) {
  try {
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, '/api/notifications/send')
    
    if (!rateLimitResult.success) {
      return getRateLimitResponse(rateLimitResult.resetIn)
    }

    const body = await request.json()
    
    const validation = sendNotificationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const session = await getSessionContext()
    if (!session?.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, userId, email, data } = validation.data
    const supabase = await createAdminClient()

    const isSendingToSelf = userId === session.profile.id || email === session.profile.email
    if (!isSendingToSelf && !hasAdminRole(session.profile)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let recipientEmail = email
    let recipientName = data.userName as string | undefined

    if (userId && !recipientEmail) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      if (!profile) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      recipientEmail = profile.email
      recipientName = recipientName || profile.full_name || profile.email
    }

    if (!recipientEmail) {
      return NextResponse.json({ error: 'No recipient email provided' }, { status: 400 })
    }

    if (type !== 'welcome') {
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId || session.profile.id)
        .single()

      if (preferences) {
        const preferenceKey = notificationPreferenceByType[type]
        if (preferenceKey && preferences[preferenceKey] === false) {
          return NextResponse.json({ 
            success: true, 
            message: 'Email not sent - user has disabled this notification type' 
          })
        }
      }
    }

    const result = await sendEmail({
      to: recipientEmail,
      type: type as EmailType,
      data: {
        ...data,
        userName: recipientName || 'Learner',
      },
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
