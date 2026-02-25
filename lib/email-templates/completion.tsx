import * as React from 'react'
import { EmailLayout, EmailButton, EmailHeading, EmailText } from './base'

interface CompletionEmailProps {
  userName: string
  moduleTitle: string
  completionDate: string
  certificateUrl?: string
  hubUrl: string
}

export function CompletionEmail({ 
  userName, 
  moduleTitle, 
  completionDate,
  certificateUrl,
  hubUrl 
}: CompletionEmailProps) {
  return (
    <EmailLayout previewText={`Congratulations! You've completed "${moduleTitle}"`}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <span style={{ fontSize: '48px' }}>🎉</span>
      </div>
      
      <EmailHeading>Congratulations, {userName}!</EmailHeading>
      
      <EmailText>
        You've successfully completed the module:
      </EmailText>
      
      <div style={{
        backgroundColor: '#f4f4f5',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
      }}>
        <p style={{
          color: '#18181b',
          fontSize: '18px',
          fontWeight: 'bold',
          margin: 0,
          textAlign: 'center',
        }}>
          {moduleTitle}
        </p>
        <p style={{
          color: '#71717a',
          fontSize: '14px',
          margin: '8px 0 0 0',
          textAlign: 'center',
        }}>
          Completed on {completionDate}
        </p>
      </div>
      
      {certificateUrl && (
        <>
          <EmailText>
            Your certificate is ready! Click below to view and download it.
          </EmailText>
          
          <EmailButton href={certificateUrl}>
            View Certificate
          </EmailButton>
        </>
      )}
      
      <EmailText>
        Keep up the great work! There are more modules waiting for you on Learning Hub.
      </EmailText>
      
      <EmailButton href={hubUrl}>
        Continue Learning
      </EmailButton>
    </EmailLayout>
  )
}
