import { emailLayout, emailButton, emailHeading, emailText, escapeHtml } from './base'

interface WelcomeEmailProps {
  userName: string
  loginUrl: string
}

export function buildWelcomeEmail({ userName, loginUrl }: WelcomeEmailProps): string {
  const content = `
    ${emailHeading('Welcome to Learning Hub!')}
    ${emailText(`Hi ${escapeHtml(userName)},`)}
    ${emailText("We're excited to have you on board! Learning Hub is your one-stop destination for professional development and continuous learning.")}
    ${emailText("Here's what you can do:")}
    <ul style="color:#3f3f46;font-size:16px;line-height:28px;padding-left:20px;">
      <li>Browse and complete learning modules</li>
      <li>Take quizzes to test your knowledge</li>
      <li>Earn certificates for completed modules</li>
      <li>Track your learning progress</li>
    </ul>
    ${emailButton(loginUrl, 'Start Learning')}
    ${emailText('If you have any questions, feel free to reach out to your team lead or the Learning Hub administrators.')}
    ${emailText('Happy Learning!<br />The Learning Hub Team')}
  `

  return emailLayout(content, `Welcome to Learning Hub, ${userName}!`)
}
