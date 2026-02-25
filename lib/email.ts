import { Resend } from 'resend'
import { buildWelcomeEmail } from './email-templates/welcome'
import { buildCompletionEmail } from './email-templates/completion'
import { buildReminderEmail } from './email-templates/reminder'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'Learning Hub <noreply@learninghub.com>'

export type EmailType = 'welcome' | 'completion' | 'reminder' | 'certificate' | 'digest'

interface SendEmailParams {
  to: string
  type: EmailType
  data: Record<string, unknown>
}

export async function sendEmail({ to, type, data }: SendEmailParams) {
  try {
    let subject: string
    let html: string

    switch (type) {
      case 'welcome':
        subject = 'Welcome to Learning Hub!'
        html = buildWelcomeEmail({
          userName: data.userName as string,
          loginUrl: data.loginUrl as string,
        })
        break

      case 'completion':
        subject = `Congratulations! You've completed "${data.moduleTitle}"`
        html = buildCompletionEmail({
          userName: data.userName as string,
          moduleTitle: data.moduleTitle as string,
          completionDate: data.completionDate as string,
          certificateUrl: data.certificateUrl as string | undefined,
          hubUrl: data.hubUrl as string,
        })
        break

      case 'reminder':
        subject = 'Continue Your Learning Journey'
        html = buildReminderEmail({
          userName: data.userName as string,
          modulesInProgress: data.modulesInProgress as Array<{ title: string; progress: number }>,
          hubUrl: data.hubUrl as string,
        })
        break

      case 'certificate':
        subject = 'Your Certificate is Ready!'
        html = buildCompletionEmail({
          userName: data.userName as string,
          moduleTitle: data.moduleTitle as string,
          completionDate: data.completionDate as string,
          certificateUrl: data.certificateUrl as string,
          hubUrl: data.hubUrl as string,
        })
        break

      default:
        throw new Error(`Unknown email type: ${type}`)
    }

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error }
  }
}

export async function sendWelcomeEmail(to: string, userName: string, loginUrl: string) {
  return sendEmail({
    to,
    type: 'welcome',
    data: { userName, loginUrl },
  })
}

export async function sendCompletionEmail(
  to: string,
  userName: string,
  moduleTitle: string,
  completionDate: string,
  hubUrl: string,
  certificateUrl?: string
) {
  return sendEmail({
    to,
    type: 'completion',
    data: { userName, moduleTitle, completionDate, hubUrl, certificateUrl },
  })
}

export async function sendReminderEmail(
  to: string,
  userName: string,
  modulesInProgress: Array<{ title: string; progress: number }>,
  hubUrl: string
) {
  return sendEmail({
    to,
    type: 'reminder',
    data: { userName, modulesInProgress, hubUrl },
  })
}
