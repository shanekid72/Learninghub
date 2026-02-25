export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: string
          team: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          team?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          team?: string | null
          created_at?: string
        }
      }
      quizzes: {
        Row: {
          id: string
          module_id: string
          title: string
          questions: Json
          passing_score: number
          created_at: string
        }
        Insert: {
          id?: string
          module_id: string
          title: string
          questions: Json
          passing_score?: number
          created_at?: string
        }
        Update: {
          id?: string
          module_id?: string
          title?: string
          questions?: Json
          passing_score?: number
          created_at?: string
        }
      }
      quiz_attempts: {
        Row: {
          id: string
          user_id: string
          quiz_id: string
          answers: Json
          score: number
          passed: boolean
          completed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          quiz_id: string
          answers: Json
          score: number
          passed: boolean
          completed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          quiz_id?: string
          answers?: Json
          score?: number
          passed?: boolean
          completed_at?: string
        }
      }
      certificates: {
        Row: {
          id: string
          user_id: string
          module_id: string
          certificate_url: string | null
          issued_at: string
        }
        Insert: {
          id?: string
          user_id: string
          module_id: string
          certificate_url?: string | null
          issued_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          module_id?: string
          certificate_url?: string | null
          issued_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          module_id: string
          content: string
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          module_id: string
          content: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          module_id?: string
          content?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          module_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          module_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: string
          module_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          email_welcome: boolean
          email_completion: boolean
          email_certificate: boolean
          email_digest: boolean
          email_reminders: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_welcome?: boolean
          email_completion?: boolean
          email_certificate?: boolean
          email_digest?: boolean
          email_reminders?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_welcome?: boolean
          email_completion?: boolean
          email_certificate?: boolean
          email_digest?: boolean
          email_reminders?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
