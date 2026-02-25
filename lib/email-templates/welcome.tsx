import * as React from 'react'
import { EmailLayout, EmailButton, EmailHeading, EmailText } from './base'

interface WelcomeEmailProps {
  userName: string
  loginUrl: string
}

export function WelcomeEmail({ userName, loginUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout previewText={`Welcome to Learning Hub, ${userName}!`}>
      <EmailHeading>Welcome to Learning Hub!</EmailHeading>
      
      <EmailText>
        Hi {userName},
      </EmailText>
      
      <EmailText>
        We're excited to have you on board! Learning Hub is your one-stop destination 
        for professional development and continuous learning.
      </EmailText>
      
      <EmailText>
        Here's what you can do:
      </EmailText>
      
      <ul style={{
        color: '#3f3f46',
        fontSize: '16px',
        lineHeight: '28px',
        paddingLeft: '20px',
      }}>
        <li>Browse and complete learning modules</li>
        <li>Take quizzes to test your knowledge</li>
        <li>Earn certificates for completed modules</li>
        <li>Track your learning progress</li>
      </ul>
      
      <EmailButton href={loginUrl}>
        Start Learning
      </EmailButton>
      
      <EmailText>
        If you have any questions, feel free to reach out to your team lead or 
        the Learning Hub administrators.
      </EmailText>
      
      <EmailText>
        Happy Learning!<br />
        The Learning Hub Team
      </EmailText>
    </EmailLayout>
  )
}
