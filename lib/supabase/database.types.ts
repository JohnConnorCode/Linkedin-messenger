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
      user_settings: {
        Row: {
          id: string
          user_id: string
          timezone: string
          daily_send_limit: number
          min_delay_between_messages: number
          max_delay_between_messages: number
          auto_pause_on_rate_limit: boolean
          require_manual_approval: boolean
          browser_headless: boolean
          notification_email: string | null
          webhook_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          timezone?: string
          daily_send_limit?: number
          min_delay_between_messages?: number
          max_delay_between_messages?: number
          auto_pause_on_rate_limit?: boolean
          require_manual_approval?: boolean
          browser_headless?: boolean
          notification_email?: string | null
          webhook_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          timezone?: string
          daily_send_limit?: number
          min_delay_between_messages?: number
          max_delay_between_messages?: number
          auto_pause_on_rate_limit?: boolean
          require_manual_approval?: boolean
          browser_headless?: boolean
          notification_email?: string | null
          webhook_url?: string | null
          created_at?: string
          updated_at?: string
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
          variables: string[] | null
          is_active: boolean
          usage_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          body: string
          variables?: string[] | null
          is_active?: boolean
          usage_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          body?: string
          variables?: string[] | null
          is_active?: boolean
          usage_count?: number
          created_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          user_id: string
          name: string
          template_id: string | null
          status: 'draft' | 'active' | 'paused' | 'completed'
          daily_cap: number
          require_manual_approval: boolean
          total_sent: number
          total_failed: number
          last_sent_at: string | null
          paused_reason: string | null
          jitter_ms: number
          dwell_ms: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          template_id?: string | null
          status?: 'draft' | 'active' | 'paused' | 'completed'
          daily_cap?: number
          require_manual_approval?: boolean
          total_sent?: number
          total_failed?: number
          last_sent_at?: string | null
          paused_reason?: string | null
          jitter_ms?: number
          dwell_ms?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          template_id?: string | null
          status?: 'draft' | 'active' | 'paused' | 'completed'
          daily_cap?: number
          require_manual_approval?: boolean
          total_sent?: number
          total_failed?: number
          last_sent_at?: string | null
          paused_reason?: string | null
          jitter_ms?: number
          dwell_ms?: number
          created_at?: string
          updated_at?: string
        }
      }
      campaign_targets: {
        Row: {
          id: string
          campaign_id: string
          connection_id: string
          status: 'pending' | 'sent' | 'failed' | 'skipped'
          personalized_message: string | null
          skip_reason: string | null
          approved: boolean | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          connection_id: string
          status?: 'pending' | 'sent' | 'failed' | 'skipped'
          personalized_message?: string | null
          skip_reason?: string | null
          approved?: boolean | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          connection_id?: string
          status?: 'pending' | 'sent' | 'failed' | 'skipped'
          personalized_message?: string | null
          skip_reason?: string | null
          approved?: boolean | null
          sent_at?: string | null
          created_at?: string
        }
      }
      task_queue: {
        Row: {
          id: string
          user_id: string
          campaign_id: string | null
          target_id: string | null
          task_type: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          scheduled_for: string
          started_at: string | null
          completed_at: string | null
          runner_id: string | null
          retry_count: number
          max_retries: number
          last_error: string | null
          requires_approval: boolean
          approved_at: string | null
          approved_by: string | null
          screenshot_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id?: string | null
          target_id?: string | null
          task_type: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          scheduled_for?: string
          started_at?: string | null
          completed_at?: string | null
          runner_id?: string | null
          retry_count?: number
          max_retries?: number
          last_error?: string | null
          requires_approval?: boolean
          approved_at?: string | null
          approved_by?: string | null
          screenshot_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string | null
          target_id?: string | null
          task_type?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          scheduled_for?: string
          started_at?: string | null
          completed_at?: string | null
          runner_id?: string | null
          retry_count?: number
          max_retries?: number
          last_error?: string | null
          requires_approval?: boolean
          approved_at?: string | null
          approved_by?: string | null
          screenshot_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      message_log: {
        Row: {
          id: string
          user_id: string
          campaign_id: string | null
          connection_id: string | null
          template_id: string | null
          message_body: string
          sent_at: string
          status: 'sent' | 'failed' | 'skipped'
          error_message: string | null
          screenshot_url: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id?: string | null
          connection_id?: string | null
          template_id?: string | null
          message_body: string
          sent_at?: string
          status?: 'sent' | 'failed' | 'skipped'
          error_message?: string | null
          screenshot_url?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string | null
          connection_id?: string | null
          template_id?: string | null
          message_body?: string
          sent_at?: string
          status?: 'sent' | 'failed' | 'skipped'
          error_message?: string | null
          screenshot_url?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      conversation_threads: {
        Row: {
          id: string
          user_id: string
          connection_id: string
          last_message_at: string | null
          last_message_preview: string | null
          is_active: boolean
          thread_url: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          connection_id: string
          last_message_at?: string | null
          last_message_preview?: string | null
          is_active?: boolean
          thread_url?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          connection_id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          is_active?: boolean
          thread_url?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      browser_sessions: {
        Row: {
          id: string
          runner_id: string
          user_id: string
          linkedin_account_id: string | null
          session_data: Json
          user_data_dir: string | null
          status: 'active' | 'expired' | 'invalidated'
          last_used_at: string
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          runner_id: string
          user_id: string
          linkedin_account_id?: string | null
          session_data: Json
          user_data_dir?: string | null
          status?: 'active' | 'expired' | 'invalidated'
          last_used_at?: string
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          runner_id?: string
          user_id?: string
          linkedin_account_id?: string | null
          session_data?: Json
          user_data_dir?: string | null
          status?: 'active' | 'expired' | 'invalidated'
          last_used_at?: string
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      selector_packs: {
        Row: {
          id: string
          version: string
          selectors: Json
          is_active: boolean
          tested_at: string | null
          success_rate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          version: string
          selectors: Json
          is_active?: boolean
          tested_at?: string | null
          success_rate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          version?: string
          selectors?: Json
          is_active?: boolean
          tested_at?: string | null
          success_rate?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      rate_limits: {
        Row: {
          id: string
          user_id: string
          limit_type: 'daily' | 'hourly' | 'campaign'
          resource_id: string | null
          count: number
          window_start: string
          window_end: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          limit_type: 'daily' | 'hourly' | 'campaign'
          resource_id?: string | null
          count?: number
          window_start: string
          window_end: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          limit_type?: 'daily' | 'hourly' | 'campaign'
          resource_id?: string | null
          count?: number
          window_start?: string
          window_end?: string
          created_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_data: Json
          campaign_id: string | null
          connection_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_data?: Json
          campaign_id?: string | null
          connection_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          event_data?: Json
          campaign_id?: string | null
          connection_id?: string | null
          created_at?: string
        }
      }
    }
    Functions: {
      claim_task: {
        Args: {
          p_runner_id: string
        }
        Returns: {
          task_id: string
        }[]
      }
      check_rate_limit: {
        Args: {
          p_user_id: string
          p_limit_type: string
          p_resource_id?: string
        }
        Returns: boolean
      }
      increment_rate_limit: {
        Args: {
          p_user_id: string
          p_limit_type: string
          p_resource_id?: string
        }
        Returns: void
      }
      get_campaign_stats: {
        Args: {
          p_campaign_id: string
        }
        Returns: {
          total_targets: number
          messages_sent: number
          messages_pending: number
          messages_failed: number
          approval_pending: number
        }[]
      }
    }
  }
}