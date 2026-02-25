import { createClient } from '@/lib/supabase/client'

export type EventType = 
  | 'module_view'
  | 'module_complete'
  | 'quiz_start'
  | 'quiz_complete'
  | 'certificate_generated'
  | 'comment_created'
  | 'search'
  | 'page_view'

interface TrackEventParams {
  type: EventType
  moduleId?: string
  metadata?: Record<string, unknown>
}

export async function trackEvent({ type, moduleId, metadata }: TrackEventParams) {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        user_id: user?.id || null,
        event_type: type,
        module_id: moduleId || null,
        metadata: metadata || null,
      })
    
    if (error) {
      console.error('Failed to track event:', error)
    }
  } catch (err) {
    console.error('Analytics tracking error:', err)
  }
}

export async function trackModuleView(moduleId: string) {
  return trackEvent({ type: 'module_view', moduleId })
}

export async function trackModuleComplete(moduleId: string) {
  return trackEvent({ type: 'module_complete', moduleId })
}

export async function trackQuizStart(moduleId: string, quizId: string) {
  return trackEvent({ 
    type: 'quiz_start', 
    moduleId, 
    metadata: { quizId } 
  })
}

export async function trackQuizComplete(moduleId: string, quizId: string, score: number, passed: boolean) {
  return trackEvent({ 
    type: 'quiz_complete', 
    moduleId, 
    metadata: { quizId, score, passed } 
  })
}

export async function trackCertificateGenerated(moduleId: string, certificateId: string) {
  return trackEvent({ 
    type: 'certificate_generated', 
    moduleId, 
    metadata: { certificateId } 
  })
}

export async function trackSearch(query: string, resultsCount: number) {
  return trackEvent({ 
    type: 'search', 
    metadata: { query, resultsCount } 
  })
}
