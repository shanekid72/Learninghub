import * as React from 'react'
import { EmailLayout, EmailButton, EmailHeading, EmailText } from './base'

interface ReminderEmailProps {
  userName: string
  modulesInProgress: Array<{
    title: string
    progress: number
  }>
  hubUrl: string
}

export function ReminderEmail({ 
  userName, 
  modulesInProgress,
  hubUrl 
}: ReminderEmailProps) {
  return (
    <EmailLayout previewText={`You have ${modulesInProgress.length} modules in progress`}>
      <EmailHeading>Continue Your Learning Journey</EmailHeading>
      
      <EmailText>
        Hi {userName},
      </EmailText>
      
      <EmailText>
        We noticed you have some modules in progress. Don't let your momentum slip away!
      </EmailText>
      
      <div style={{ marginBottom: '24px' }}>
        <p style={{
          color: '#18181b',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '12px',
        }}>
          Your modules in progress:
        </p>
        
        {modulesInProgress.map((module, index) => (
          <div 
            key={index}
            style={{
              backgroundColor: '#f4f4f5',
              borderRadius: '6px',
              marginBottom: '8px',
              padding: '12px 16px',
            }}
          >
            <p style={{
              color: '#18181b',
              fontSize: '14px',
              fontWeight: '500',
              margin: '0 0 8px 0',
            }}>
              {module.title}
            </p>
            <div style={{
              backgroundColor: '#e4e4e7',
              borderRadius: '4px',
              height: '8px',
              overflow: 'hidden',
              width: '100%',
            }}>
              <div style={{
                backgroundColor: '#10b981',
                borderRadius: '4px',
                height: '100%',
                width: `${module.progress}%`,
              }} />
            </div>
            <p style={{
              color: '#71717a',
              fontSize: '12px',
              margin: '4px 0 0 0',
              textAlign: 'right',
            }}>
              {module.progress}% complete
            </p>
          </div>
        ))}
      </div>
      
      <EmailButton href={hubUrl}>
        Continue Learning
      </EmailButton>
      
      <EmailText>
        Every step counts towards your professional development. 
        We believe in you!
      </EmailText>
    </EmailLayout>
  )
}
