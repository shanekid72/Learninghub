import { emailButton, emailHeading, emailLayout, emailText, escapeHtml } from "./base"

type ImportedVideo = {
  title: string
  moduleId: string
}

type YoutubeSyncSummaryProps = {
  userName: string
  importedCount: number
  importedVideos: ImportedVideo[]
  adminUrl: string
  channelId: string
}

type YoutubeSyncFailureProps = {
  userName: string
  errorMessage: string
  channelId: string
  adminUrl: string
}

export function buildYoutubeSyncSummaryEmail({
  userName,
  importedCount,
  importedVideos,
  adminUrl,
  channelId,
}: YoutubeSyncSummaryProps): string {
  const videoList = importedVideos.length
    ? `<ul style="padding-left:20px;margin:0 0 18px 0;">
        ${importedVideos
          .map(
            (video) =>
              `<li style="color:#3f3f46;font-size:14px;line-height:22px;margin-bottom:6px;">
                <strong>${escapeHtml(video.title)}</strong> <span style="color:#71717a;">(${escapeHtml(video.moduleId)})</span>
              </li>`,
          )
          .join("")}
      </ul>`
    : ""

  const content = `
    ${emailHeading("New YouTube videos imported")}
    ${emailText(`Hi ${escapeHtml(userName)},`)}
    ${emailText(`Learning Hub imported ${importedCount} new unlisted YouTube ${importedCount === 1 ? "video" : "videos"} from channel ${escapeHtml(channelId)} as draft modules.`)}
    ${videoList}
    ${emailText("Review the imported drafts, assign teams and badges, and publish when ready.")}
    ${emailButton(adminUrl, "Review Imported Modules")}
  `

  return emailLayout(content, `${importedCount} new YouTube video${importedCount === 1 ? "" : "s"} imported`)
}

export function buildYoutubeSyncFailureEmail({
  userName,
  errorMessage,
  channelId,
  adminUrl,
}: YoutubeSyncFailureProps): string {
  const content = `
    ${emailHeading("YouTube sync needs attention")}
    ${emailText(`Hi ${escapeHtml(userName)},`)}
    ${emailText(`Learning Hub could not sync unlisted uploads from channel ${escapeHtml(channelId)}.`)}
    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin:0 0 18px 0;">
      <p style="color:#991b1b;font-size:14px;line-height:22px;margin:0;">${escapeHtml(errorMessage)}</p>
    </div>
    ${emailText("Open the admin modules area to review sync status and retry the import after fixing configuration or channel access.")}
    ${emailButton(adminUrl, "Open Admin Modules")}
  `

  return emailLayout(content, "Learning Hub YouTube sync failed")
}
