import { Resend } from 'resend'
import nodemailer, { type Transporter } from 'nodemailer'
import { buildWelcomeEmail } from './email-templates/welcome'
import { buildCompletionEmail } from './email-templates/completion'
import { buildReminderEmail } from './email-templates/reminder'
import { buildUpdateEmail } from './email-templates/update'

let resendClient: Resend | null = null
let smtpClient: Transporter | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_APP_PASSWORD)
}

function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export function isEmailProviderConfigured(): boolean {
  return isSmtpConfigured() || isResendConfigured()
}

function getFromEmail(): string {
  return process.env.EMAIL_FROM || 'Learning Hub <noreply@learninghub.com>'
}

function getSmtpClient(): Transporter {
  if (!smtpClient) {
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_APP_PASSWORD
    if (!user || !pass) {
      throw new Error('SMTP_USER and SMTP_APP_PASSWORD environment variables are required for SMTP email')
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com'
    const port = Number(process.env.SMTP_PORT || '465')
    const secure = toBoolean(process.env.SMTP_SECURE, port === 465)

    smtpClient = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    })
  }

  return smtpClient
}

type EmailProvider = 'smtp' | 'resend'

function getProviderOrder(): EmailProvider[] {
  const preferred = (process.env.EMAIL_PROVIDER || 'smtp').trim().toLowerCase()
  const providers: EmailProvider[] = []

  if (preferred === 'resend') {
    if (isResendConfigured()) providers.push('resend')
    if (isSmtpConfigured()) providers.push('smtp')
    return providers
  }

  if (isSmtpConfigured()) providers.push('smtp')
  if (isResendConfigured()) providers.push('resend')
  return providers
}

export type EmailType = 'welcome' | 'completion' | 'reminder' | 'certificate' | 'update'

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

      case 'update':
        subject = (data.updateTitle as string) || 'New Learning Update'
        html = buildUpdateEmail({
          userName: data.userName as string,
          moduleTitle: data.moduleTitle as string,
          updateTitle: ((data.updateTitle as string) || 'New Learning Update'),
          dueDate: data.dueDate as string | undefined,
          note: data.note as string | undefined,
          hubUrl: data.hubUrl as string,
        })
        break

      default:
        throw new Error(`Unknown email type: ${type}`)
    }

    const providers = getProviderOrder()
    if (providers.length === 0) {
      throw new Error(
        'No email provider configured. Set SMTP_USER/SMTP_APP_PASSWORD for Gmail SMTP or RESEND_API_KEY for Resend.',
      )
    }

    const from = getFromEmail()
    const providerErrors: Array<{ provider: EmailProvider; error: unknown }> = []

    for (const provider of providers) {
      try {
        if (provider === 'smtp') {
          const result = await getSmtpClient().sendMail({
            from,
            to,
            subject,
            html,
          })

          return {
            success: true,
            provider: 'smtp',
            data: {
              messageId: result.messageId,
              accepted: result.accepted,
              rejected: result.rejected,
            },
          }
        }

        const result = await getResendClient().emails.send({
          from,
          to,
          subject,
          html,
        })

        return { success: true, provider: 'resend', data: result }
      } catch (error) {
        providerErrors.push({ provider, error })
      }
    }

    throw new Error(
      `Email delivery failed for all providers: ${providerErrors
        .map((entry) => entry.provider)
        .join(', ')}`,
    )
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
