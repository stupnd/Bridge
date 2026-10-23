// Generated from the Supabase schema. Regenerate after changing supabase/migrations:
//   npx supabase gen types typescript --project-id ikknzseleljgjrcyxthn > src/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      recording_sessions: {
        Row: {
          calibrated_at: string
          calibration_closed: number[]
          calibration_open: number[]
          created_at: string
          hand: string
          id: string
          participant_id: string
          user_id: string
        }
        Insert: {
          calibrated_at: string
          calibration_closed: number[]
          calibration_open: number[]
          created_at?: string
          hand: string
          id?: string
          participant_id: string
          user_id?: string
        }
        Update: {
          calibrated_at?: string
          calibration_closed?: number[]
          calibration_open?: number[]
          created_at?: string
          hand?: string
          id?: string
          participant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      recordings: {
        Row: {
          created_at: string
          frame_count: number | null
          frames: Json
          id: string
          label: string
          notes: string
          recorded_at: string
          rep: number
          session_id: string
          sign_type: string
          user_id: string
          window_ms: number
        }
        Insert: {
          created_at?: string
          frame_count?: number | null
          frames: Json
          id?: string
          label: string
          notes?: string
          recorded_at: string
          rep: number
          session_id: string
          sign_type: string
          user_id?: string
          window_ms: number
        }
        Update: {
          created_at?: string
          frame_count?: number | null
          frames?: Json
          id?: string
          label?: string
          notes?: string
          recorded_at?: string
          rep?: number
          session_id?: string
          sign_type?: string
          user_id?: string
          window_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "recording_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          added_at: string
          user_id: string
        }
        Insert: {
          added_at?: string
          user_id: string
        }
        Update: {
          added_at?: string
          user_id?: string
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
