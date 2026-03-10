import { emailLayout, emailButton, emailHeading, emailText, escapeHtml } from "./base"

interface UpdateEmailProps {
  userName: string
  moduleTitle: string
  updateTitle: string
  hubUrl: string
  dueDate?: string
  note?: string
}

export function buildUpdateEmail({
  userName,
  moduleTitle,
  updateTitle,
  hubUrl,
  dueDate,
  note,
}: UpdateEmailProps): string {
  const dueDateSection = dueDate
    ? `<p style="color:#b45309;font-size:14px;font-weight:600;margin:0 0 16px 0;">Due by ${escapeHtml(dueDate)}</p>`
    : ""

  const noteSection = note
    ? `<div style="background-color:#f4f4f5;border-radius:8px;padding:12px 14px;margin:0 0 18px 0;">
        <p style="color:#3f3f46;font-size:14px;line-height:20px;margin:0;">${escapeHtml(note)}</p>
      </div>`
    : ""

  const content = `
    ${emailHeading(escapeHtml(updateTitle))}
    ${emailText(`Hi ${escapeHtml(userName)},`)}
    ${emailText("A new learning update has been published for you in Learning Hub.")}
    <div style="background-color:#f4f4f5;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="color:#18181b;font-size:16px;font-weight:700;margin:0 0 8px 0;">${escapeHtml(moduleTitle)}</p>
      ${dueDateSection}
    </div>
    ${noteSection}
    ${emailButton(hubUrl, "Open Learning Hub")}
    ${emailText("Stay current with the latest product and process updates.")}
  `

  return emailLayout(content, `${updateTitle}: ${moduleTitle}`)
}
