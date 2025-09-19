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
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          created_at?: string
        }
      }
      linkedin_accounts: {
        Row: {
          id: string
          user_id: string
          status: 'disconnected' | 'connected' | 'invalid'
          last_check_at: string | null
          session_kind: 'userDataDir' | 'cookies'
          runner_instance: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status?: 'disconnected' | 'connected' | 'invalid'
          last_check_at?: string | null
          session_kind?: 'userDataDir' | 'cookies'
          runner_instance?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: 'disconnected' | 'connected' | 'invalid'
          last_check_at?: string | null
          session_kind?: 'userDataDir' | 'cookies'
          runner_instance?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      connections: {
        Row: {
          id: string
          user_id: string
          first_name: string | null
          last_name: string | null
          full_name: string | null
          linkedin_url: string | null
          headline: string | null
          company: string | null
          location: string | null
          tags: string[] | null
          last_messaged_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          linkedin_url?: string | null
          headline?: string | null
          company?: string | null
          location?: string | null
          tags?: string[] | null
          last_messaged_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          linkedin_url?: string | null
          headline?: string | null
          company?: string | null
          location?: string | null
          tags?: string[] | null
          last_messaged_at?: string | null
          created_at?: string
        }
      }
      message_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          body: string
          variables: string[]
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          body: string
          variables?: string[]
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          body?: string
          variables?: string[]
          is_active?: boolean
          created_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          user_id: string
          name: string
          template_id: string
          target_filter: Json
          require_manual_approval: boolean
          daily_cap: number
          hourly_cap: number
          jitter_ms: number
          dwell_ms: number
          quiet_hours: Json
          status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          template_id: string
          target_filter?: Json
          require_manual_approval?: boolean
          daily_cap?: number
          hourly_cap?: number
          jitter_ms?: number
          dwell_ms?: number
          quiet_hours?: Json
          status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          template_id?: string
          target_filter?: Json
          require_manual_approval?: boolean
          daily_cap?: number
          hourly_cap?: number
          jitter_ms?: number
          dwell_ms?: number
          quiet_hours?: Json
          status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          created_at?: string
        }
      }
      campaign_targets: {
        Row: {
          id: string
          campaign_id: string
          connection_id: string
          personalized_body: string | null
          approval_status: 'pending' | 'approved' | 'rejected'
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          connection_id: string
          personalized_body?: string | null
          approval_status?: 'pending' | 'approved' | 'rejected'
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          connection_id?: string
          personalized_body?: string | null
          approval_status?: 'pending' | 'approved' | 'rejected'
          reason?: string | null
          created_at?: string
        }
      }
      task_queue: {
        Row: {
          id: string
          campaign_id: string
          target_id: string
          run_after: string
          status: 'queued' | 'in_progress' | 'succeeded' | 'failed' | 'deferred'
          attempt: number
          last_error: string | null
          locked_by: string | null
          locked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          target_id: string
          run_after?: string
          status?: 'queued' | 'in_progress' | 'succeeded' | 'failed' | 'deferred'
          attempt?: number
          last_error?: string | null
          locked_by?: string | null
          locked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          target_id?: string
          run_after?: string
          status?: 'queued' | 'in_progress' | 'succeeded' | 'failed' | 'deferred'
          attempt?: number
          last_error?: string | null
          locked_by?: string | null
          locked_at?: string | null
          created_at?: string
        }
      }
      send_logs: {
        Row: {
          id: string
          task_id: string
          stage: 'navigation' | 'openComposer' | 'injectText' | 'sendClick' | 'postSend' | null
          status: 'info' | 'success' | 'warning' | 'error' | null
          message: string | null
          screenshot_path: string | null
          selector_version: string | null
          meta: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          stage?: 'navigation' | 'openComposer' | 'injectText' | 'sendClick' | 'postSend' | null
          status?: 'info' | 'success' | 'warning' | 'error' | null
          message?: string | null
          screenshot_path?: string | null
          selector_version?: string | null
          meta?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          stage?: 'navigation' | 'openComposer' | 'injectText' | 'sendClick' | 'postSend' | null
          status?: 'info' | 'success' | 'warning' | 'error' | null
          message?: string | null
          screenshot_path?: string | null
          selector_version?: string | null
          meta?: Json | null
          created_at?: string
        }
      }
      user_settings: {
        Row: {
          user_id: string
          global_daily_cap: number
          global_hourly_cap: number
          min_between_messages_ms: number
          humanize: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          global_daily_cap?: number
          global_hourly_cap?: number
          min_between_messages_ms?: number
          humanize?: boolean
          created_at?: string
        }
        Update: {
          user_id?: string
          global_daily_cap?: number
          global_hourly_cap?: number
          min_between_messages_ms?: number
          humanize?: boolean
          created_at?: string
        }
      }
      runner_assignments: {
        Row: {
          user_id: string
          runner_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          runner_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          runner_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_task: {
        Args: { p_runner_id: string }
        Returns: {
          task_id: string
          campaign_id: string
          target_id: string
        }[]
      }
      check_rate_limits: {
        Args: { p_user_id: string }
        Returns: {
          can_send: boolean
          reason: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}