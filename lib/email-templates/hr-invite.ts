import { emailButton, emailHeading, emailLayout, emailText, escapeHtml } from "./base"

export function buildHrInviteEmail({
  candidateName,
  expiresAt,
  inviteUrl,
  jobTitle,
}: {
  candidateName: string
  expiresAt: string
  inviteUrl: string
  jobTitle: string
}) {
  const expiryText = new Date(expiresAt).toLocaleString()
  const content = `
    ${emailHeading("Interview Integrity Session")}
    ${emailText(`Hi ${escapeHtml(candidateName || "Candidate")},`)}
    ${emailText(`Your interview integrity session for <strong>${escapeHtml(jobTitle)}</strong> is ready.`)}
    ${emailText("Open the link below before your interview starts. The page will guide you through launching the Windows scanner and pairing it with your session.")}
    ${emailButton(inviteUrl, "Open Interview Session")}
    ${emailText(`This invite expires on <strong>${escapeHtml(expiryText)}</strong>.`)}
    ${emailText("If the scanner does not open automatically, keep this email open and follow the manual pairing instructions shown on the session page.")}
  `

  return emailLayout(content, `Your interview integrity session for ${jobTitle} is ready`)
}
