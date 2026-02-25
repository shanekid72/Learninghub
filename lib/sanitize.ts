const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

export function sanitizeInput(input: string): string {
  let sanitized = input
  
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  sanitized = sanitized.replace(/<[^>]*>/g, '')
  
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/data:/gi, '')
  sanitized = sanitized.replace(/vbscript:/gi, '')
  
  sanitized = sanitized.replace(/on\w+\s*=/gi, '')
  
  return sanitized.trim()
}

export function sanitizeForDisplay(text: string): string {
  return escapeHtml(text)
}

export function sanitizeCommentContent(content: string): string {
  let sanitized = sanitizeInput(content)
  
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  
  if (sanitized.length > 2000) {
    sanitized = sanitized.slice(0, 2000)
  }
  
  return sanitized
}

export function sanitizeQuizAnswer(answer: string): string {
  return sanitizeInput(answer).slice(0, 1000)
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  return emailRegex.test(email) && email.length <= 254
}

export function sanitizeModuleId(moduleId: string): string {
  return moduleId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100)
}
