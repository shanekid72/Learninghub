import * as React from 'react'

interface EmailLayoutProps {
  children: React.ReactNode
  previewText?: string
}

export function EmailLayout({ children, previewText }: EmailLayoutProps) {
  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        {previewText && (
          <meta name="x-apple-disable-message-reformatting" />
        )}
      </head>
      <body style={{
        backgroundColor: '#f4f4f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        margin: 0,
        padding: 0,
      }}>
        {previewText && (
          <div style={{ 
            display: 'none', 
            maxHeight: 0, 
            overflow: 'hidden' 
          }}>
            {previewText}
          </div>
        )}
        <table 
          role="presentation" 
          width="100%" 
          cellPadding="0" 
          cellSpacing="0"
          style={{ margin: '0 auto', padding: '40px 20px' }}
        >
          <tr>
            <td align="center">
              <table 
                role="presentation" 
                width="600" 
                cellPadding="0" 
                cellSpacing="0"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  maxWidth: '600px',
                  width: '100%',
                }}
              >
                {/* Header */}
                <tr>
                  <td style={{
                    backgroundColor: '#18181b',
                    borderRadius: '8px 8px 0 0',
                    padding: '24px',
                    textAlign: 'center',
                  }}>
                    <h1 style={{
                      color: '#ffffff',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      margin: 0,
                    }}>
                      Learning Hub
                    </h1>
                  </td>
                </tr>
                
                {/* Content */}
                <tr>
                  <td style={{ padding: '32px 24px' }}>
                    {children}
                  </td>
                </tr>
                
                {/* Footer */}
                <tr>
                  <td style={{
                    borderTop: '1px solid #e4e4e7',
                    padding: '24px',
                    textAlign: 'center',
                  }}>
                    <p style={{
                      color: '#71717a',
                      fontSize: '14px',
                      margin: 0,
                    }}>
                      Learning Hub - Your Corporate Learning Platform
                    </p>
                    <p style={{
                      color: '#a1a1aa',
                      fontSize: '12px',
                      marginTop: '8px',
                    }}>
                      You received this email because you are registered on Learning Hub.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}

export function EmailButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
      <tr>
        <td align="center" style={{ padding: '16px 0' }}>
          <a
            href={href}
            style={{
              backgroundColor: '#10b981',
              borderRadius: '6px',
              color: '#ffffff',
              display: 'inline-block',
              fontSize: '16px',
              fontWeight: '600',
              padding: '12px 24px',
              textDecoration: 'none',
            }}
          >
            {children}
          </a>
        </td>
      </tr>
    </table>
  )
}

export function EmailHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      color: '#18181b',
      fontSize: '20px',
      fontWeight: 'bold',
      margin: '0 0 16px 0',
    }}>
      {children}
    </h2>
  )
}

export function EmailText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: '#3f3f46',
      fontSize: '16px',
      lineHeight: '24px',
      margin: '0 0 16px 0',
    }}>
      {children}
    </p>
  )
}
