import { emailLayout, emailButton, emailHeading, emailText, escapeHtml } from './base'

interface CompletionEmailProps {
  userName: string
  moduleTitle: string
  completionDate: string
  certificateUrl?: string
  hubUrl: string
}

export function buildCompletionEmail({ 
  userName, 
  moduleTitle, 
  completionDate,
  certificateUrl,
  hubUrl 
}: CompletionEmailProps): string {
  const certificateSection = certificateUrl
    ? `${emailText('Your certificate is ready! Click below to view and download it.')}
       ${emailButton(certificateUrl, 'View Certificate')}`
    : ''

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:48px;">&#127881;</span>
    </div>
    ${emailHeading(`Congratulations, ${escapeHtml(userName)}!`)}
    ${emailText("You've successfully completed the module:")}
    <div style="background-color:#f4f4f5;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="color:#18181b;font-size:18px;font-weight:bold;margin:0;text-align:center;">${escapeHtml(moduleTitle)}</p>
      <p style="color:#71717a;font-size:14px;margin:8px 0 0 0;text-align:center;">Completed on ${escapeHtml(completionDate)}</p>
    </div>
    ${certificateSection}
    ${emailText('Keep up the great work! There are more modules waiting for you on Learning Hub.')}
    ${emailButton(hubUrl, 'Continue Learning')}
  `

  return emailLayout(content, `Congratulations! You've completed "${moduleTitle}"`)
}
