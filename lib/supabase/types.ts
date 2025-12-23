export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_personalization_queue: {
        Row: {
          id: string
          campaign_id: string | null
          target_id: string | null
          message_template: string
          personalization_data: Json | null
          status: string | null
          result: string | null
          error_message: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          campaign_id?: string | null
          target_id?: string | null
          message_template: string | null
          personalization_data?: Json | null
          status?: string | null
          result?: string | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          campaign_id?: string | null
          target_id?: string | null
          message_template?: string | null
          personalization_data?: Json | null
          status?: string | null
          result?: string | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          event_data: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string | null
          user_id?: string | null
          event_type: string | null
          event_data?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          event_type?: string | null
          event_data?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      campaign_ab_test_results: {
        Row: {
          id: string
          campaign_id: string
          variant_id: string
          metric_name: string
          metric_value: number | null
          sample_size: number | null
          confidence_level: number | null
          is_significant: boolean | null
          calculated_at: string | null
        }
        Insert: {
          id?: string | null
          campaign_id: string | null
          variant_id: string | null
          metric_name: string | null
          metric_value?: number | null
          sample_size?: number | null
          confidence_level?: number | null
          is_significant?: boolean | null
          calculated_at?: string | null
        }
        Update: {
          id?: string | null
          campaign_id?: string | null
          variant_id?: string | null
          metric_name?: string | null
          metric_value?: number | null
          sample_size?: number | null
          confidence_level?: number | null
          is_significant?: boolean | null
          calculated_at?: string | null
        }
        Relationships: []
      }
      campaign_backups: {
        Row: {
          id: string
          campaign_id: string
          backup_data: Json
          backup_type: string | null
          created_at: string | null
        }
        Insert: {
          id?: string | null
          campaign_id: string | null
          backup_data: Json | null
          backup_type?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          campaign_id?: string | null
          backup_data?: Json | null
          backup_type?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      campaign_stats: {
        Row: {
          id: string
          campaign_id: string
          date: string
          sent_count: number | null
          delivered_count: number | null
          response_count: number | null
          click_count: number | null
          error_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          campaign_id: string | null
          date: string | null
          sent_count?: number | null
          delivered_count?: number | null
          response_count?: number | null
          click_count?: number | null
          error_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          campaign_id?: string | null
          date?: string | null
          sent_count?: number | null
          delivered_count?: number | null
          response_count?: number | null
          click_count?: number | null
          error_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      campaign_targets: {
        Row: {
          id: string
          campaign_id: string
          connection_id: string
          status: string | null
          approval_status: string | null
          personalized_body: string | null
          sent_at: string | null
          delivered_at: string | null
          responded_at: string | null
          error_message: string | null
          retry_count: number | null
          metadata: Json | null
          reason: string | null
          created_at: string | null
          updated_at: string | null
          final_message: string | null
          approved: boolean | null
          personalized_message: string | null
          audience_type: string | null
          conversation_stage: string | null
          temperature: string | null
          response_type: string | null
          last_follow_up_at: string | null
          follow_up_count: number | null
          next_follow_up_at: string | null
          personalization_hooks: Json | null
          classification_confidence: number | null
        }
        Insert: {
          id?: string | null
          campaign_id: string | null
          connection_id: string | null
          status?: string | null
          approval_status?: string | null
          personalized_body?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          responded_at?: string | null
          error_message?: string | null
          retry_count?: number | null
          metadata?: Json | null
          reason?: string | null
          created_at?: string | null
          updated_at?: string | null
          final_message?: string | null
          approved?: boolean | null
          personalized_message?: string | null
          audience_type?: string | null
          conversation_stage?: string | null
          temperature?: string | null
          response_type?: string | null
          last_follow_up_at?: string | null
          follow_up_count?: number | null
          next_follow_up_at?: string | null
          personalization_hooks?: Json | null
          classification_confidence?: number | null
        }
        Update: {
          id?: string | null
          campaign_id?: string | null
          connection_id?: string | null
          status?: string | null
          approval_status?: string | null
          personalized_body?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          responded_at?: string | null
          error_message?: string | null
          retry_count?: number | null
          metadata?: Json | null
          reason?: string | null
          created_at?: string | null
          updated_at?: string | null
          final_message?: string | null
          approved?: boolean | null
          personalized_message?: string | null
          audience_type?: string | null
          conversation_stage?: string | null
          temperature?: string | null
          response_type?: string | null
          last_follow_up_at?: string | null
          follow_up_count?: number | null
          next_follow_up_at?: string | null
          personalization_hooks?: Json | null
          classification_confidence?: number | null
        }
        Relationships: []
      }
      campaign_variants: {
        Row: {
          id: string
          campaign_id: string
          variant_name: string
          variant_type: string | null
          template_id: string | null
          traffic_split: number | null
          messages_sent: number | null
          messages_delivered: number | null
          responses_received: number | null
          response_rate: number | null
          is_control: boolean | null
          created_at: string | null
          updated_at: string | null
          conversions: number | null
          confidence_level: number | null
          is_winner: boolean | null
        }
        Insert: {
          id?: string | null
          campaign_id: string | null
          variant_name: string | null
          variant_type?: string | null
          template_id?: string | null
          traffic_split?: number | null
          messages_sent?: number | null
          messages_delivered?: number | null
          responses_received?: number | null
          response_rate?: number | null
          is_control?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          conversions?: number | null
          confidence_level?: number | null
          is_winner?: boolean | null
        }
        Update: {
          id?: string | null
          campaign_id?: string | null
          variant_name?: string | null
          variant_type?: string | null
          template_id?: string | null
          traffic_split?: number | null
          messages_sent?: number | null
          messages_delivered?: number | null
          responses_received?: number | null
          response_rate?: number | null
          is_control?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          conversions?: number | null
          confidence_level?: number | null
          is_winner?: boolean | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          template_id: string
          status: string | null
          start_date: string | null
          end_date: string | null
          daily_cap: number | null
          hourly_cap: number | null
          total_cap: number | null
          sent_count: number | null
          response_count: number | null
          click_count: number | null
          settings: Json | null
          created_at: string | null
          updated_at: string | null
          completed_at: string | null
          last_error: string | null
          paused_reason: string | null
          superdebate_enabled: boolean | null
          default_audience_type: string | null
          auto_follow_up: boolean | null
          follow_up_schedule: Json | null
        }
        Insert: {
          id?: string | null
          user_id: string | null
          name: string | null
          description?: string | null
          template_id: string | null
          status?: string | null
          start_date?: string | null
          end_date?: string | null
          daily_cap?: number | null
          hourly_cap?: number | null
          total_cap?: number | null
          sent_count?: number | null
          response_count?: number | null
          click_count?: number | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
          last_error?: string | null
          paused_reason?: string | null
          superdebate_enabled?: boolean | null
          default_audience_type?: string | null
          auto_follow_up?: boolean | null
          follow_up_schedule?: Json | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          name?: string | null
          description?: string | null
          template_id?: string | null
          status?: string | null
          start_date?: string | null
          end_date?: string | null
          daily_cap?: number | null
          hourly_cap?: number | null
          total_cap?: number | null
          sent_count?: number | null
          response_count?: number | null
          click_count?: number | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
          last_error?: string | null
          paused_reason?: string | null
          superdebate_enabled?: boolean | null
          default_audience_type?: string | null
          auto_follow_up?: boolean | null
          follow_up_schedule?: Json | null
        }
        Relationships: []
      }
      connections: {
        Row: {
          id: string
          user_id: string
          linkedin_url: string
          first_name: string | null
          last_name: string | null
          full_name: string | null
          headline: string | null
          company: string | null
          location: string | null
          connection_degree: string | null
          is_connected: boolean | null
          connected_at: string | null
          last_contacted: string | null
          tags: string[] | null
          notes: string | null
          custom_fields: Json | null
          created_at: string | null
          updated_at: string | null
          audience_types: string[] | null
          debate_background: string | null
          investor_status: string | null
          community_experience: string | null
          profile_signals: Json | null
        }
        Insert: {
          id?: string | null
          user_id: string | null
          linkedin_url: string | null
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          headline?: string | null
          company?: string | null
          location?: string | null
          connection_degree?: string | null
          is_connected?: boolean | null
          connected_at?: string | null
          last_contacted?: string | null
          tags?: string[] | null
          notes?: string | null
          custom_fields?: Json | null
          created_at?: string | null
          updated_at?: string | null
          audience_types?: string[] | null
          debate_background?: string | null
          investor_status?: string | null
          community_experience?: string | null
          profile_signals?: Json | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          linkedin_url?: string | null
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          headline?: string | null
          company?: string | null
          location?: string | null
          connection_degree?: string | null
          is_connected?: boolean | null
          connected_at?: string | null
          last_contacted?: string | null
          tags?: string[] | null
          notes?: string | null
          custom_fields?: Json | null
          created_at?: string | null
          updated_at?: string | null
          audience_types?: string[] | null
          debate_background?: string | null
          investor_status?: string | null
          community_experience?: string | null
          profile_signals?: Json | null
        }
        Relationships: []
      }
      conversation_events: {
        Row: {
          id: string
          target_id: string
          event_type: string
          event_data: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string | null
          target_id: string | null
          event_type: string | null
          event_data?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          target_id?: string | null
          event_type?: string | null
          event_data?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      csv_imports: {
        Row: {
          id: string
          user_id: string
          filename: string
          total_rows: number | null
          imported_count: number | null
          duplicate_count: number | null
          error_count: number | null
          status: string | null
          error_details: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string | null
          user_id: string | null
          filename: string | null
          total_rows?: number | null
          imported_count?: number | null
          duplicate_count?: number | null
          error_count?: number | null
          status?: string | null
          error_details?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          filename?: string | null
          total_rows?: number | null
          imported_count?: number | null
          duplicate_count?: number | null
          error_count?: number | null
          status?: string | null
          error_details?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      follow_up_queue: {
        Row: {
          id: string
          campaign_id: string
          target_id: string
          connection_id: string
          follow_up_type: string
          scheduled_for: string
          message_template: string | null
          status: string | null
          sent_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          campaign_id: string | null
          target_id: string | null
          connection_id: string | null
          follow_up_type: string | null
          scheduled_for: string | null
          message_template?: string | null
          status?: string | null
          sent_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          campaign_id?: string | null
          target_id?: string | null
          connection_id?: string | null
          follow_up_type?: string | null
          scheduled_for?: string | null
          message_template?: string | null
          status?: string | null
          sent_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      linkedin_accounts: {
        Row: {
          id: string
          user_id: string
          status: string
          last_check_at: string | null
          session_kind: string | null
          runner_instance: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string | null
          user_id: string | null
          status?: string | null
          last_check_at?: string | null
          session_kind?: string | null
          runner_instance?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          status?: string | null
          last_check_at?: string | null
          session_kind?: string | null
          runner_instance?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      linkedin_sessions: {
        Row: {
          id: string
          user_id: string
          runner_id: string | null
          cookies: string | null
          local_storage: string | null
          user_agent: string | null
          viewport: Json | null
          is_active: boolean | null
          last_used: string | null
          created_at: string | null
          updated_at: string | null
          last_check_at: string | null
          status: string | null
          is_authenticated: boolean | null
          last_activity: string | null
          runner_instance: string | null
        }
        Insert: {
          id?: string | null
          user_id: string | null
          runner_id?: string | null
          cookies?: string | null
          local_storage?: string | null
          user_agent?: string | null
          viewport?: Json | null
          is_active?: boolean | null
          last_used?: string | null
          created_at?: string | null
          updated_at?: string | null
          last_check_at?: string | null
          status?: string | null
          is_authenticated?: boolean | null
          last_activity?: string | null
          runner_instance?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          runner_id?: string | null
          cookies?: string | null
          local_storage?: string | null
          user_agent?: string | null
          viewport?: Json | null
          is_active?: boolean | null
          last_used?: string | null
          created_at?: string | null
          updated_at?: string | null
          last_check_at?: string | null
          status?: string | null
          is_authenticated?: boolean | null
          last_activity?: string | null
          runner_instance?: string | null
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          subject: string | null
          body: string
          variables: string[] | null
          category: string | null
          is_active: boolean | null
          usage_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          user_id: string | null
          name: string | null
          subject?: string | null
          body: string | null
          variables?: string[] | null
          category?: string | null
          is_active?: boolean | null
          usage_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          name?: string | null
          subject?: string | null
          body?: string | null
          variables?: string[] | null
          category?: string | null
          is_active?: boolean | null
          usage_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          metadata: Json | null
          read: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string | null
          user_id: string | null
          type: string | null
          title: string | null
          body?: string | null
          metadata?: Json | null
          read?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          type?: string | null
          title?: string | null
          body?: string | null
          metadata?: Json | null
          read?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          id: string
          user_id: string
          runner_linked: boolean | null
          timezone_confirmed: boolean | null
          connections_imported: boolean | null
          first_template_created: boolean | null
          completed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          user_id: string | null
          runner_linked?: boolean | null
          timezone_confirmed?: boolean | null
          connections_imported?: boolean | null
          first_template_created?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          runner_linked?: boolean | null
          timezone_confirmed?: boolean | null
          connections_imported?: boolean | null
          first_template_created?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profile_ai_summaries: {
        Row: {
          id: string
          connection_id: string
          summary: string | null
          talking_points: string[] | null
          interests: string[] | null
          tone_suggestion: string | null
          confidence_score: number | null
          model_version: string | null
          created_at: string | null
          updated_at: string | null
          first_line: string | null
          midline: string | null
          persona: Json | null
          risk_flags: Json | null
        }
        Insert: {
          id?: string | null
          connection_id: string | null
          summary?: string | null
          talking_points?: string[] | null
          interests?: string[] | null
          tone_suggestion?: string | null
          confidence_score?: number | null
          model_version?: string | null
          created_at?: string | null
          updated_at?: string | null
          first_line?: string | null
          midline?: string | null
          persona?: Json | null
          risk_flags?: Json | null
        }
        Update: {
          id?: string | null
          connection_id?: string | null
          summary?: string | null
          talking_points?: string[] | null
          interests?: string[] | null
          tone_suggestion?: string | null
          confidence_score?: number | null
          model_version?: string | null
          created_at?: string | null
          updated_at?: string | null
          first_line?: string | null
          midline?: string | null
          persona?: Json | null
          risk_flags?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          company: string | null
          role: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string | null
          email: string | null
          full_name?: string | null
          company?: string | null
          role?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          email?: string | null
          full_name?: string | null
          company?: string | null
          role?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          id: string
          user_id: string
          action_type: string
          window_start: string
          window_duration: unknown
          count: number | null
          max_count: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          user_id: string | null
          action_type: string | null
          window_start: string | null
          window_duration: unknown | null
          count?: number | null
          max_count: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          action_type?: string | null
          window_start?: string | null
          window_duration?: unknown | null
          count?: number | null
          max_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      runner_assignments: {
        Row: {
          user_id: string
          runner_id: string
          created_at: string | null
        }
        Insert: {
          user_id: string | null
          runner_id: string | null
          created_at?: string | null
        }
        Update: {
          user_id?: string | null
          runner_id?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      runner_config: {
        Row: {
          runner_id: string
          config: Json
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          runner_id: string | null
          config?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          runner_id?: string | null
          config?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      runner_status: {
        Row: {
          runner_id: string
          status: string | null
          last_heartbeat: string | null
          current_task_id: string | null
          tasks_completed: number | null
          tasks_failed: number | null
          started_at: string | null
          metrics: Json | null
          created_at: string | null
          updated_at: string | null
          active_tasks: Json | null
          cpu_percent: number | null
          memory_percent: number | null
          memory_mb: number | null
          error_count: number | null
          version: string | null
          last_check_at: string | null
          active_tasks_count: number | null
          metadata: Json | null
        }
        Insert: {
          runner_id: string | null
          status?: string | null
          last_heartbeat?: string | null
          current_task_id?: string | null
          tasks_completed?: number | null
          tasks_failed?: number | null
          started_at?: string | null
          metrics?: Json | null
          created_at?: string | null
          updated_at?: string | null
          active_tasks?: Json | null
          cpu_percent?: number | null
          memory_percent?: number | null
          memory_mb?: number | null
          error_count?: number | null
          version?: string | null
          last_check_at?: string | null
          active_tasks_count?: number | null
          metadata?: Json | null
        }
        Update: {
          runner_id?: string | null
          status?: string | null
          last_heartbeat?: string | null
          current_task_id?: string | null
          tasks_completed?: number | null
          tasks_failed?: number | null
          started_at?: string | null
          metrics?: Json | null
          created_at?: string | null
          updated_at?: string | null
          active_tasks?: Json | null
          cpu_percent?: number | null
          memory_percent?: number | null
          memory_mb?: number | null
          error_count?: number | null
          version?: string | null
          last_check_at?: string | null
          active_tasks_count?: number | null
          metadata?: Json | null
        }
        Relationships: []
      }
      send_logs: {
        Row: {
          id: string
          task_id: string | null
          stage: string | null
          status: string | null
          message: string | null
          screenshot_path: string | null
          selector_version: string | null
          meta: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string | null
          task_id?: string | null
          stage?: string | null
          status?: string | null
          message?: string | null
          screenshot_path?: string | null
          selector_version?: string | null
          meta?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          task_id?: string | null
          stage?: string | null
          status?: string | null
          message?: string | null
          screenshot_path?: string | null
          selector_version?: string | null
          meta?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      session_artifacts: {
        Row: {
          id: string
          account_id: string | null
          artifact_type: string
          storage_path: string
          enc_nonce: string | null
          created_at: string | null
        }
        Insert: {
          id?: string | null
          account_id?: string | null
          artifact_type: string | null
          storage_path: string | null
          enc_nonce?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          account_id?: string | null
          artifact_type?: string | null
          storage_path?: string | null
          enc_nonce?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      task_queue: {
        Row: {
          id: string
          campaign_id: string
          target_id: string
          status: string | null
          runner_id: string | null
          claimed_at: string | null
          completed_at: string | null
          priority: string | null
          retry_count: number | null
          max_retries: number | null
          error_message: string | null
          created_at: string | null
          updated_at: string | null
          user_id: string | null
          requires_approval: boolean | null
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          skip_reason: string | null
          started_at: string | null
          scheduled_for: string | null
          personalized_message: string | null
        }
        Insert: {
          id?: string | null
          campaign_id: string | null
          target_id: string | null
          status?: string | null
          runner_id?: string | null
          claimed_at?: string | null
          completed_at?: string | null
          priority?: string | null
          retry_count?: number | null
          max_retries?: number | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          requires_approval?: boolean | null
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          skip_reason?: string | null
          started_at?: string | null
          scheduled_for?: string | null
          personalized_message?: string | null
        }
        Update: {
          id?: string | null
          campaign_id?: string | null
          target_id?: string | null
          status?: string | null
          runner_id?: string | null
          claimed_at?: string | null
          completed_at?: string | null
          priority?: string | null
          retry_count?: number | null
          max_retries?: number | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          requires_approval?: boolean | null
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          skip_reason?: string | null
          started_at?: string | null
          scheduled_for?: string | null
          personalized_message?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          user_id: string
          global_daily_cap: number | null
          global_hourly_cap: number | null
          min_between_messages_ms: number | null
          humanize: boolean | null
          created_at: string | null
        }
        Insert: {
          user_id: string | null
          global_daily_cap?: number | null
          global_hourly_cap?: number | null
          min_between_messages_ms?: number | null
          humanize?: boolean | null
          created_at?: string | null
        }
        Update: {
          user_id?: string | null
          global_daily_cap?: number | null
          global_hourly_cap?: number | null
          min_between_messages_ms?: number | null
          humanize?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_next_task: {
        Args: {
          p_runner_id: string
          p_rate_limits_ok?: boolean
        }
        Returns: {
          task_id: string
          campaign_id: string
          target_id: string
        }[]
      }
      check_rate_limits: {
        Args: {
          p_user_id: string
        }
        Returns: {
          can_send: boolean
          reason: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never
