import { emailLayout, emailButton, emailHeading, emailText, escapeHtml } from './base'

interface ReminderEmailProps {
  userName: string
  modulesInProgress: Array<{
    title: string
    progress: number
  }>
  hubUrl: string
}

export function buildReminderEmail({ 
  userName, 
  modulesInProgress,
  hubUrl 
}: ReminderEmailProps): string {
  const modulesList = modulesInProgress.map((mod) => `
    <div style="background-color:#f4f4f5;border-radius:6px;margin-bottom:8px;padding:12px 16px;">
      <p style="color:#18181b;font-size:14px;font-weight:500;margin:0 0 8px 0;">${escapeHtml(mod.title)}</p>
      <div style="background-color:#e4e4e7;border-radius:4px;height:8px;overflow:hidden;width:100%;">
        <div style="background-color:#10b981;border-radius:4px;height:100%;width:${Math.min(Math.max(mod.progress, 0), 100)}%;"></div>
      </div>
      <p style="color:#71717a;font-size:12px;margin:4px 0 0 0;text-align:right;">${mod.progress}% complete</p>
    </div>
  `).join('')

  const content = `
    ${emailHeading('Continue Your Learning Journey')}
    ${emailText(`Hi ${escapeHtml(userName)},`)}
    ${emailText("We noticed you have some modules in progress. Don't let your momentum slip away!")}
    <div style="margin-bottom:24px;">
      <p style="color:#18181b;font-size:16px;font-weight:600;margin-bottom:12px;">Your modules in progress:</p>
      ${modulesList}
    </div>
    ${emailButton(hubUrl, 'Continue Learning')}
    ${emailText('Every step counts towards your professional development. We believe in you!')}
  `

  return emailLayout(content, `You have ${modulesInProgress.length} modules in progress`)
}
