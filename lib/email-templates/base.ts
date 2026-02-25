export function emailLayout(content: string, previewText?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  ${previewText ? '<meta name="x-apple-disable-message-reformatting" />' : ''}
</head>
<body style="background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(previewText)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 auto;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#18181b;border-radius:8px 8px 0 0;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;font-weight:bold;margin:0;">Learning Hub</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e4e4e7;padding:24px;text-align:center;">
              <p style="color:#71717a;font-size:14px;margin:0;">Learning Hub - Your Corporate Learning Platform</p>
              <p style="color:#a1a1aa;font-size:12px;margin-top:8px;">You received this email because you are registered on Learning Hub.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function emailButton(href: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:16px 0;">
      <a href="${escapeHtml(href)}" style="background-color:#10b981;border-radius:6px;color:#ffffff;display:inline-block;font-size:16px;font-weight:600;padding:12px 24px;text-decoration:none;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`
}

export function emailHeading(text: string): string {
  return `<h2 style="color:#18181b;font-size:20px;font-weight:bold;margin:0 0 16px 0;">${escapeHtml(text)}</h2>`
}

export function emailText(text: string): string {
  return `<p style="color:#3f3f46;font-size:16px;line-height:24px;margin:0 0 16px 0;">${text}</p>`
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
