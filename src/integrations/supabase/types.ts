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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          details: Json
          id: string
          ip: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          details?: Json
          id?: string
          ip?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          details?: Json
          id?: string
          ip?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          quote_id: string | null
          read: boolean
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          quote_id?: string | null
          read?: boolean
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          quote_id?: string | null
          read?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          created_at: string
          daily_call_limit: number
          enabled: boolean
          fallback_model: string | null
          id: number
          max_output_tokens: number
          model: string
          monthly_call_limit: number
          provider: string
          singleton: boolean
          temperature: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_call_limit?: number
          enabled?: boolean
          fallback_model?: string | null
          id?: number
          max_output_tokens?: number
          model?: string
          monthly_call_limit?: number
          provider?: string
          singleton?: boolean
          temperature?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_call_limit?: number
          enabled?: boolean
          fallback_model?: string | null
          id?: number
          max_output_tokens?: number
          model?: string
          monthly_call_limit?: number
          provider?: string
          singleton?: boolean
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          completion_tokens: number | null
          context: Json
          created_at: string
          error_message: string | null
          feature: string
          id: string
          latency_ms: number | null
          model: string
          ok: boolean
          prompt_tokens: number | null
          provider: string
          total_tokens: number | null
        }
        Insert: {
          completion_tokens?: number | null
          context?: Json
          created_at?: string
          error_message?: string | null
          feature: string
          id?: string
          latency_ms?: number | null
          model: string
          ok?: boolean
          prompt_tokens?: number | null
          provider: string
          total_tokens?: number | null
        }
        Update: {
          completion_tokens?: number | null
          context?: Json
          created_at?: string
          error_message?: string | null
          feature?: string
          id?: string
          latency_ms?: number | null
          model?: string
          ok?: boolean
          prompt_tokens?: number | null
          provider?: string
          total_tokens?: number | null
        }
        Relationships: []
      }
      email_order_intake: {
        Row: {
          ai_data: Json
          attachments: Json
          body_text: string | null
          confidence: number
          created_at: string
          error_message: string | null
          from_email: string
          from_name: string | null
          id: string
          message_id: string
          missing_fields: Json
          order_id: string | null
          received_at: string
          status: string
          subject: string | null
          thread_id: string | null
          to_email: string | null
          updated_at: string
        }
        Insert: {
          ai_data?: Json
          attachments?: Json
          body_text?: string | null
          confidence?: number
          created_at?: string
          error_message?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          message_id: string
          missing_fields?: Json
          order_id?: string | null
          received_at?: string
          status?: string
          subject?: string | null
          thread_id?: string | null
          to_email?: string | null
          updated_at?: string
        }
        Update: {
          ai_data?: Json
          attachments?: Json
          body_text?: string | null
          confidence?: number
          created_at?: string
          error_message?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          message_id?: string
          missing_fields?: Json
          order_id?: string | null
          received_at?: string
          status?: string
          subject?: string | null
          thread_id?: string | null
          to_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_order_intake_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_order_intake_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      factory_settings: {
        Row: {
          ai_modules: Json
          allow_overnight_default: boolean
          company_info: Json
          created_at: string
          currency: string
          hide_out_of_stock_materials: boolean
          id: string
          min_hourly_rate_eur: number
          min_margin_pct: number
          min_order_value_eur: number
          min_production_charge_eur: number
          notifications: Json
          singleton: boolean
          timeline_stages: Json
          updated_at: string
          updated_by: string | null
          urgency_high_load_threshold_hours: number
          urgency_surcharge_flexible_eur: number
          urgency_surcharge_standard_eur: number
          urgency_surcharge_urgent_eur: number
          work_end_hour: number
          work_start_hour: number
        }
        Insert: {
          ai_modules?: Json
          allow_overnight_default?: boolean
          company_info?: Json
          created_at?: string
          currency?: string
          hide_out_of_stock_materials?: boolean
          id?: string
          min_hourly_rate_eur?: number
          min_margin_pct?: number
          min_order_value_eur?: number
          min_production_charge_eur?: number
          notifications?: Json
          singleton?: boolean
          timeline_stages?: Json
          updated_at?: string
          updated_by?: string | null
          urgency_high_load_threshold_hours?: number
          urgency_surcharge_flexible_eur?: number
          urgency_surcharge_standard_eur?: number
          urgency_surcharge_urgent_eur?: number
          work_end_hour?: number
          work_start_hour?: number
        }
        Update: {
          ai_modules?: Json
          allow_overnight_default?: boolean
          company_info?: Json
          created_at?: string
          currency?: string
          hide_out_of_stock_materials?: boolean
          id?: string
          min_hourly_rate_eur?: number
          min_margin_pct?: number
          min_order_value_eur?: number
          min_production_charge_eur?: number
          notifications?: Json
          singleton?: boolean
          timeline_stages?: Json
          updated_at?: string
          updated_by?: string | null
          urgency_high_load_threshold_hours?: number
          urgency_surcharge_flexible_eur?: number
          urgency_surcharge_standard_eur?: number
          urgency_surcharge_urgent_eur?: number
          work_end_hour?: number
          work_start_hour?: number
        }
        Relationships: []
      }
      machine_calendar_blocks: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          kind: string
          machine_id: string
          notes: string | null
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          kind?: string
          machine_id: string
          notes?: string | null
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          kind?: string
          machine_id?: string
          notes?: string | null
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_calendar_blocks_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          active: boolean
          build_volume_mm: Json | null
          created_at: string
          hourly_cost: number | null
          hours_since_service: number
          id: string
          kind: string
          last_service_at: string | null
          model: string | null
          name: string
          nozzles: Json | null
          power_watts: number | null
          service_interval_hours: number
          specs: Json | null
          status: string
          total_hours: number
          updated_at: string
          vendor: string | null
        }
        Insert: {
          active?: boolean
          build_volume_mm?: Json | null
          created_at?: string
          hourly_cost?: number | null
          hours_since_service?: number
          id?: string
          kind: string
          last_service_at?: string | null
          model?: string | null
          name: string
          nozzles?: Json | null
          power_watts?: number | null
          service_interval_hours?: number
          specs?: Json | null
          status?: string
          total_hours?: number
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          active?: boolean
          build_volume_mm?: Json | null
          created_at?: string
          hourly_cost?: number | null
          hours_since_service?: number
          id?: string
          kind?: string
          last_service_at?: string | null
          model?: string | null
          name?: string
          nozzles?: Json | null
          power_watts?: number | null
          service_interval_hours?: number
          specs?: Json | null
          status?: string
          total_hours?: number
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      materials: {
        Row: {
          active: boolean
          code: string
          color: string | null
          created_at: string
          density_g_cm3: number | null
          family: string
          id: string
          internal_notes: string | null
          last_restocked_at: string | null
          minimum_stock_kg: number | null
          name: string
          price_per_kg: number | null
          process: string
          properties: Json | null
          status: string
          stock_kg: number | null
          supplier: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          color?: string | null
          created_at?: string
          density_g_cm3?: number | null
          family: string
          id?: string
          internal_notes?: string | null
          last_restocked_at?: string | null
          minimum_stock_kg?: number | null
          name: string
          price_per_kg?: number | null
          process: string
          properties?: Json | null
          status?: string
          stock_kg?: number | null
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          color?: string | null
          created_at?: string
          density_g_cm3?: number | null
          family?: string
          id?: string
          internal_notes?: string | null
          last_restocked_at?: string | null
          minimum_stock_kg?: number | null
          name?: string
          price_per_kg?: number | null
          process?: string
          properties?: Json | null
          status?: string
          stock_kg?: number | null
          supplier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_emails: {
        Row: {
          ai_generated: boolean
          ai_instruction: string | null
          ai_regenerations: number
          attachments_count: number
          body_text: string | null
          cc: string | null
          created_at: string
          direction: string
          email_type: string
          error_message: string | null
          html: string | null
          http_status: number | null
          id: string
          idempotency_key: string | null
          last_attempt_at: string | null
          order_code: string | null
          order_id: string | null
          payload: Json
          provider: string
          provider_message_id: string | null
          recipient: string
          reply_to: string | null
          retry_count: number
          sender: string | null
          sent_at: string | null
          status: string
          subject: string
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          ai_instruction?: string | null
          ai_regenerations?: number
          attachments_count?: number
          body_text?: string | null
          cc?: string | null
          created_at?: string
          direction?: string
          email_type?: string
          error_message?: string | null
          html?: string | null
          http_status?: number | null
          id?: string
          idempotency_key?: string | null
          last_attempt_at?: string | null
          order_code?: string | null
          order_id?: string | null
          payload?: Json
          provider?: string
          provider_message_id?: string | null
          recipient: string
          reply_to?: string | null
          retry_count?: number
          sender?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          ai_instruction?: string | null
          ai_regenerations?: number
          attachments_count?: number
          body_text?: string | null
          cc?: string | null
          created_at?: string
          direction?: string
          email_type?: string
          error_message?: string | null
          html?: string | null
          http_status?: number | null
          id?: string
          idempotency_key?: string | null
          last_attempt_at?: string | null
          order_code?: string | null
          order_id?: string | null
          payload?: Json
          provider?: string
          provider_message_id?: string | null
          recipient?: string
          reply_to?: string | null
          retry_count?: number
          sender?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_emails_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_emails_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor: Database["public"]["Enums"]["actor_role"]
          attachment_path: string | null
          color_tag: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          image_path: string | null
          order_id: string
          payload: Json
          title: string
          visibility: Database["public"]["Enums"]["file_visibility"]
        }
        Insert: {
          actor?: Database["public"]["Enums"]["actor_role"]
          attachment_path?: string | null
          color_tag?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          image_path?: string | null
          order_id: string
          payload?: Json
          title: string
          visibility?: Database["public"]["Enums"]["file_visibility"]
        }
        Update: {
          actor?: Database["public"]["Enums"]["actor_role"]
          attachment_path?: string | null
          color_tag?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          image_path?: string | null
          order_id?: string
          payload?: Json
          title?: string
          visibility?: Database["public"]["Enums"]["file_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_type: string | null
          geometry_hash: string | null
          id: string
          metadata: Json
          order_id: string
          size_bytes: number | null
          uploaded_by: Database["public"]["Enums"]["actor_role"]
          visibility: Database["public"]["Enums"]["file_visibility"]
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_type?: string | null
          geometry_hash?: string | null
          id?: string
          metadata?: Json
          order_id: string
          size_bytes?: number | null
          uploaded_by?: Database["public"]["Enums"]["actor_role"]
          visibility?: Database["public"]["Enums"]["file_visibility"]
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string | null
          geometry_hash?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          size_bytes?: number | null
          uploaded_by?: Database["public"]["Enums"]["actor_role"]
          visibility?: Database["public"]["Enums"]["file_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "order_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_messages: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          from_role: Database["public"]["Enums"]["actor_role"]
          id: string
          order_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          from_role: Database["public"]["Enums"]["actor_role"]
          id?: string
          order_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          from_role?: Database["public"]["Enums"]["actor_role"]
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          company: string | null
          courier: string | null
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          dimensions: string | null
          due_date: string | null
          estimated_delivery: string | null
          id: string
          internal_notes: string | null
          invoice_file_path: string | null
          material: string | null
          message: string | null
          metadata: Json
          order_code: string | null
          priority: Database["public"]["Enums"]["order_priority"]
          quantity: string | null
          quote_price: number | null
          service: string | null
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company?: string | null
          courier?: string | null
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          dimensions?: string | null
          due_date?: string | null
          estimated_delivery?: string | null
          id?: string
          internal_notes?: string | null
          invoice_file_path?: string | null
          material?: string | null
          message?: string | null
          metadata?: Json
          order_code?: string | null
          priority?: Database["public"]["Enums"]["order_priority"]
          quantity?: string | null
          quote_price?: number | null
          service?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company?: string | null
          courier?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          dimensions?: string | null
          due_date?: string | null
          estimated_delivery?: string | null
          id?: string
          internal_notes?: string | null
          invoice_file_path?: string | null
          material?: string | null
          message?: string | null
          metadata?: Json
          order_code?: string | null
          priority?: Database["public"]["Enums"]["order_priority"]
          quantity?: string | null
          quote_price?: number | null
          service?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      production_jobs: {
        Row: {
          actual_finish: string | null
          actual_start: string | null
          analysis_id: string | null
          created_at: string
          estimated_hours: number | null
          id: string
          machine_id: string | null
          material_code: string | null
          notes: string | null
          order_id: string
          overnight_ok: boolean
          planned_finish: string | null
          planned_start: string | null
          priority_score: number
          queue_position: number | null
          risk: Database["public"]["Enums"]["production_risk"]
          state: Database["public"]["Enums"]["production_job_state"]
          updated_at: string
        }
        Insert: {
          actual_finish?: string | null
          actual_start?: string | null
          analysis_id?: string | null
          created_at?: string
          estimated_hours?: number | null
          id?: string
          machine_id?: string | null
          material_code?: string | null
          notes?: string | null
          order_id: string
          overnight_ok?: boolean
          planned_finish?: string | null
          planned_start?: string | null
          priority_score?: number
          queue_position?: number | null
          risk?: Database["public"]["Enums"]["production_risk"]
          state?: Database["public"]["Enums"]["production_job_state"]
          updated_at?: string
        }
        Update: {
          actual_finish?: string | null
          actual_start?: string | null
          analysis_id?: string | null
          created_at?: string
          estimated_hours?: number | null
          id?: string
          machine_id?: string | null
          material_code?: string | null
          notes?: string | null
          order_id?: string
          overnight_ok?: boolean
          planned_finish?: string | null
          planned_start?: string | null
          priority_score?: number
          queue_position?: number | null
          risk?: Database["public"]["Enums"]["production_risk"]
          state?: Database["public"]["Enums"]["production_job_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_jobs_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "customer_order_estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "project_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proforma_lines: {
        Row: {
          auto_managed: boolean
          created_at: string
          description: string
          discount_pct: number
          id: string
          position: number
          proforma_id: string
          qty: number
          unit: string
          unit_price: number
          vat_pct: number
        }
        Insert: {
          auto_managed?: boolean
          created_at?: string
          description?: string
          discount_pct?: number
          id?: string
          position?: number
          proforma_id: string
          qty?: number
          unit?: string
          unit_price?: number
          vat_pct?: number
        }
        Update: {
          auto_managed?: boolean
          created_at?: string
          description?: string
          discount_pct?: number
          id?: string
          position?: number
          proforma_id?: string
          qty?: number
          unit?: string
          unit_price?: number
          vat_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "proforma_lines_proforma_id_fkey"
            columns: ["proforma_id"]
            isOneToOne: false
            referencedRelation: "proformas"
            referencedColumns: ["id"]
          },
        ]
      }
      proformas: {
        Row: {
          admin_user: string | null
          auto_sync: boolean
          body: string | null
          cc: string | null
          created_at: string
          customer_snapshot: Json
          deposit_amount: number
          due_date: string | null
          email_error: string | null
          email_message_id: string | null
          email_status: string | null
          financial_snapshot: Json
          id: string
          notes: string | null
          number: string
          order_id: string
          order_signature: string | null
          paid_amount: number
          parent_proforma_id: string | null
          pdf_generated_at: string | null
          pdf_path: string | null
          recipient: string | null
          revision: number
          sent_at: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          admin_user?: string | null
          auto_sync?: boolean
          body?: string | null
          cc?: string | null
          created_at?: string
          customer_snapshot?: Json
          deposit_amount?: number
          due_date?: string | null
          email_error?: string | null
          email_message_id?: string | null
          email_status?: string | null
          financial_snapshot?: Json
          id?: string
          notes?: string | null
          number: string
          order_id: string
          order_signature?: string | null
          paid_amount?: number
          parent_proforma_id?: string | null
          pdf_generated_at?: string | null
          pdf_path?: string | null
          recipient?: string | null
          revision?: number
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          admin_user?: string | null
          auto_sync?: boolean
          body?: string | null
          cc?: string | null
          created_at?: string
          customer_snapshot?: Json
          deposit_amount?: number
          due_date?: string | null
          email_error?: string | null
          email_message_id?: string | null
          email_status?: string | null
          financial_snapshot?: Json
          id?: string
          notes?: string | null
          number?: string
          order_id?: string
          order_signature?: string | null
          paid_amount?: number
          parent_proforma_id?: string | null
          pdf_generated_at?: string | null
          pdf_path?: string | null
          recipient?: string | null
          revision?: number
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proformas_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proformas_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proformas_parent_proforma_id_fkey"
            columns: ["parent_proforma_id"]
            isOneToOne: false
            referencedRelation: "proformas"
            referencedColumns: ["id"]
          },
        ]
      }
      project_analyses: {
        Row: {
          actual_cost_eur: number | null
          actual_material_g: number | null
          actual_print_hours: number | null
          admin_overrides: Json | null
          ai_recommendations: Json | null
          ai_summary: string | null
          ai_warnings: Json | null
          complexity_band: string | null
          complexity_score: number | null
          confidence: number | null
          confidence_band: string | null
          cost_breakdown: Json | null
          created_at: string
          created_by: string | null
          dfm_score: number | null
          estimated_cost_eur: number | null
          estimated_layers: number | null
          estimated_material_g: number | null
          estimated_print_hours: number | null
          extrusion_length_m: number | null
          file_id: string | null
          file_name: string | null
          geometry_hash: string | null
          id: string
          internal_cost_eur: number | null
          locked_until: string | null
          machine_cost_eur: number | null
          margin_pct: number | null
          material_cost_eur: number | null
          order_id: string | null
          preparation_fee_eur: number | null
          price_explanation: string | null
          pricing_engine_version: string | null
          printability_score: number | null
          production_mode: string | null
          profit_eur: number | null
          project_id: string | null
          quality_predictions: Json | null
          quote_fingerprint: string | null
          quote_price_eur: number | null
          raw: Json | null
          recommended_infill_pct: number | null
          recommended_layer_height_mm: number | null
          recommended_material: string | null
          recommended_nozzle: string | null
          recommended_orientation: string | null
          risk_analysis: Json | null
          service: string
          support_difficulty: string | null
          support_hours: number | null
          support_volume_cm3: number | null
          travel_length_m: number | null
          use_type: string | null
        }
        Insert: {
          actual_cost_eur?: number | null
          actual_material_g?: number | null
          actual_print_hours?: number | null
          admin_overrides?: Json | null
          ai_recommendations?: Json | null
          ai_summary?: string | null
          ai_warnings?: Json | null
          complexity_band?: string | null
          complexity_score?: number | null
          confidence?: number | null
          confidence_band?: string | null
          cost_breakdown?: Json | null
          created_at?: string
          created_by?: string | null
          dfm_score?: number | null
          estimated_cost_eur?: number | null
          estimated_layers?: number | null
          estimated_material_g?: number | null
          estimated_print_hours?: number | null
          extrusion_length_m?: number | null
          file_id?: string | null
          file_name?: string | null
          geometry_hash?: string | null
          id?: string
          internal_cost_eur?: number | null
          locked_until?: string | null
          machine_cost_eur?: number | null
          margin_pct?: number | null
          material_cost_eur?: number | null
          order_id?: string | null
          preparation_fee_eur?: number | null
          price_explanation?: string | null
          pricing_engine_version?: string | null
          printability_score?: number | null
          production_mode?: string | null
          profit_eur?: number | null
          project_id?: string | null
          quality_predictions?: Json | null
          quote_fingerprint?: string | null
          quote_price_eur?: number | null
          raw?: Json | null
          recommended_infill_pct?: number | null
          recommended_layer_height_mm?: number | null
          recommended_material?: string | null
          recommended_nozzle?: string | null
          recommended_orientation?: string | null
          risk_analysis?: Json | null
          service?: string
          support_difficulty?: string | null
          support_hours?: number | null
          support_volume_cm3?: number | null
          travel_length_m?: number | null
          use_type?: string | null
        }
        Update: {
          actual_cost_eur?: number | null
          actual_material_g?: number | null
          actual_print_hours?: number | null
          admin_overrides?: Json | null
          ai_recommendations?: Json | null
          ai_summary?: string | null
          ai_warnings?: Json | null
          complexity_band?: string | null
          complexity_score?: number | null
          confidence?: number | null
          confidence_band?: string | null
          cost_breakdown?: Json | null
          created_at?: string
          created_by?: string | null
          dfm_score?: number | null
          estimated_cost_eur?: number | null
          estimated_layers?: number | null
          estimated_material_g?: number | null
          estimated_print_hours?: number | null
          extrusion_length_m?: number | null
          file_id?: string | null
          file_name?: string | null
          geometry_hash?: string | null
          id?: string
          internal_cost_eur?: number | null
          locked_until?: string | null
          machine_cost_eur?: number | null
          margin_pct?: number | null
          material_cost_eur?: number | null
          order_id?: string | null
          preparation_fee_eur?: number | null
          price_explanation?: string | null
          pricing_engine_version?: string | null
          printability_score?: number | null
          production_mode?: string | null
          profit_eur?: number | null
          project_id?: string | null
          quality_predictions?: Json | null
          quote_fingerprint?: string | null
          quote_price_eur?: number | null
          raw?: Json | null
          recommended_infill_pct?: number | null
          recommended_layer_height_mm?: number | null
          recommended_material?: string | null
          recommended_nozzle?: string | null
          recommended_orientation?: string | null
          risk_analysis?: Json | null
          service?: string
          support_difficulty?: string | null
          support_hours?: number | null
          support_volume_cm3?: number | null
          travel_length_m?: number | null
          use_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_analyses_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "order_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_analyses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_analyses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived: boolean
          created_at: string
          customer_email: string
          customer_name: string | null
          id: string
          name: string | null
          notes: string | null
          order_id: string | null
          priority: string
          production_mode: string | null
          project_code: string | null
          service: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived?: boolean
          created_at?: string
          customer_email: string
          customer_name?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          order_id?: string | null
          priority?: string
          production_mode?: string | null
          project_code?: string | null
          service?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived?: boolean
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          order_id?: string | null
          priority?: string
          production_mode?: string | null
          project_code?: string | null
          service?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_decisions: {
        Row: {
          accepted_price: number | null
          admin_user: string | null
          created_at: string
          currency: string
          customer_message: string | null
          decline_reason_code: string | null
          decline_reason_text: string | null
          delivery_time: string | null
          email_error: string | null
          email_message_id: string | null
          email_sent_at: string | null
          email_status: string
          email_subject: string | null
          id: string
          new_status: string
          order_id: string
          payment_terms: string | null
          previous_status: string | null
          recipient_email: string | null
        }
        Insert: {
          accepted_price?: number | null
          admin_user?: string | null
          created_at?: string
          currency?: string
          customer_message?: string | null
          decline_reason_code?: string | null
          decline_reason_text?: string | null
          delivery_time?: string | null
          email_error?: string | null
          email_message_id?: string | null
          email_sent_at?: string | null
          email_status?: string
          email_subject?: string | null
          id?: string
          new_status: string
          order_id: string
          payment_terms?: string | null
          previous_status?: string | null
          recipient_email?: string | null
        }
        Update: {
          accepted_price?: number | null
          admin_user?: string | null
          created_at?: string
          currency?: string
          customer_message?: string | null
          decline_reason_code?: string | null
          decline_reason_text?: string | null
          delivery_time?: string | null
          email_error?: string | null
          email_message_id?: string | null
          email_sent_at?: string | null
          email_status?: string
          email_subject?: string | null
          id?: string
          new_status?: string
          order_id?: string
          payment_terms?: string | null
          previous_status?: string | null
          recipient_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_decisions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_decisions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_documents: {
        Row: {
          admin_user: string | null
          cc: string | null
          created_at: string
          customer_snapshot: Json
          data_signature: string | null
          email_body: string | null
          email_error: string | null
          email_message_id: string | null
          email_status: string | null
          email_subject: string | null
          financial_snapshot: Json
          id: string
          image_data_url: string | null
          image_path: string | null
          lines: Json
          number: string
          order_id: string
          order_snapshot: Json
          pdf_generated_at: string | null
          pdf_path: string | null
          project: Json
          recipient: string | null
          replaces_quote_id: string | null
          sent_at: string | null
          seq: number
          status: string
          terms: Json
          updated_at: string
        }
        Insert: {
          admin_user?: string | null
          cc?: string | null
          created_at?: string
          customer_snapshot?: Json
          data_signature?: string | null
          email_body?: string | null
          email_error?: string | null
          email_message_id?: string | null
          email_status?: string | null
          email_subject?: string | null
          financial_snapshot?: Json
          id?: string
          image_data_url?: string | null
          image_path?: string | null
          lines?: Json
          number: string
          order_id: string
          order_snapshot?: Json
          pdf_generated_at?: string | null
          pdf_path?: string | null
          project?: Json
          recipient?: string | null
          replaces_quote_id?: string | null
          sent_at?: string | null
          seq: number
          status?: string
          terms?: Json
          updated_at?: string
        }
        Update: {
          admin_user?: string | null
          cc?: string | null
          created_at?: string
          customer_snapshot?: Json
          data_signature?: string | null
          email_body?: string | null
          email_error?: string | null
          email_message_id?: string | null
          email_status?: string | null
          email_subject?: string | null
          financial_snapshot?: Json
          id?: string
          image_data_url?: string | null
          image_path?: string | null
          lines?: Json
          number?: string
          order_id?: string
          order_snapshot?: Json
          pdf_generated_at?: string | null
          pdf_path?: string | null
          project?: Json
          recipient?: string | null
          replaces_quote_id?: string | null
          sent_at?: string | null
          seq?: number
          status?: string
          terms?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_documents_replaces_quote_id_fkey"
            columns: ["replaces_quote_id"]
            isOneToOne: false
            referencedRelation: "quote_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          email: string
          estimated_price: number | null
          file_name: string | null
          file_path: string | null
          file_url: string | null
          id: string
          material: string | null
          message: string | null
          metadata: Json | null
          name: string
          phone: string | null
          service: string | null
          source: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          estimated_price?: number | null
          file_name?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          material?: string | null
          message?: string | null
          metadata?: Json | null
          name: string
          phone?: string | null
          service?: string | null
          source?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          estimated_price?: number | null
          file_name?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          material?: string | null
          message?: string | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          service?: string | null
          source?: string | null
          status?: string
        }
        Relationships: []
      }
      request_intake: {
        Row: {
          ai_confidence: number | null
          ai_extraction: Json | null
          ai_missing: Json
          ai_next_action: string | null
          ai_summary: string | null
          ai_summary_edited: boolean
          ai_urgency: string | null
          attachments_hash: string | null
          body_hash: string | null
          channel: string
          created_at: string
          duplicate_class: string
          duplicate_confidence: number
          duplicate_of_intake_id: string | null
          duplicate_of_order_id: string | null
          duplicate_reasons: Json
          fingerprint: string
          id: string
          message_id_header: string | null
          order_id: string | null
          process_result: string
          provider_message_id: string | null
          raw: Json
          received_at: string
          review_state: string
          reviewed_at: string | null
          reviewed_by: string | null
          sender_email: string
          sender_name: string | null
          subject_normalized: string | null
          subject_raw: string | null
          submission_id: string | null
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_extraction?: Json | null
          ai_missing?: Json
          ai_next_action?: string | null
          ai_summary?: string | null
          ai_summary_edited?: boolean
          ai_urgency?: string | null
          attachments_hash?: string | null
          body_hash?: string | null
          channel?: string
          created_at?: string
          duplicate_class?: string
          duplicate_confidence?: number
          duplicate_of_intake_id?: string | null
          duplicate_of_order_id?: string | null
          duplicate_reasons?: Json
          fingerprint: string
          id?: string
          message_id_header?: string | null
          order_id?: string | null
          process_result?: string
          provider_message_id?: string | null
          raw?: Json
          received_at?: string
          review_state?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_email: string
          sender_name?: string | null
          subject_normalized?: string | null
          subject_raw?: string | null
          submission_id?: string | null
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          ai_extraction?: Json | null
          ai_missing?: Json
          ai_next_action?: string | null
          ai_summary?: string | null
          ai_summary_edited?: boolean
          ai_urgency?: string | null
          attachments_hash?: string | null
          body_hash?: string | null
          channel?: string
          created_at?: string
          duplicate_class?: string
          duplicate_confidence?: number
          duplicate_of_intake_id?: string | null
          duplicate_of_order_id?: string | null
          duplicate_reasons?: Json
          fingerprint?: string
          id?: string
          message_id_header?: string | null
          order_id?: string | null
          process_result?: string
          provider_message_id?: string | null
          raw?: Json
          received_at?: string
          review_state?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_email?: string
          sender_name?: string | null
          subject_normalized?: string | null
          subject_raw?: string | null
          submission_id?: string | null
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_intake_duplicate_of_intake_id_fkey"
            columns: ["duplicate_of_intake_id"]
            isOneToOne: false
            referencedRelation: "request_intake"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_intake_duplicate_of_order_id_fkey"
            columns: ["duplicate_of_order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_intake_duplicate_of_order_id_fkey"
            columns: ["duplicate_of_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_intake_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_intake_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          approved: boolean
          comment: string | null
          created_at: string
          customer_name: string | null
          id: string
          order_id: string
          photo_path: string | null
          rating: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          order_id: string
          photo_path?: string | null
          rating: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          order_id?: string
          photo_path?: string | null
          rating?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          company: string | null
          created_at: string
          dimensions: string | null
          email: string
          email_error: string | null
          email_sent: boolean
          estimated_price: number | null
          file_name: string | null
          file_path: string | null
          file_url: string | null
          id: string
          material: string | null
          message: string | null
          metadata: Json | null
          name: string
          phone: string | null
          print_hours: number | null
          quantity: string | null
          service: string | null
          source: string
          stage: string | null
          surname: string | null
          weight_g: number | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          dimensions?: string | null
          email: string
          email_error?: string | null
          email_sent?: boolean
          estimated_price?: number | null
          file_name?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          material?: string | null
          message?: string | null
          metadata?: Json | null
          name: string
          phone?: string | null
          print_hours?: number | null
          quantity?: string | null
          service?: string | null
          source: string
          stage?: string | null
          surname?: string | null
          weight_g?: number | null
        }
        Update: {
          company?: string | null
          created_at?: string
          dimensions?: string | null
          email?: string
          email_error?: string | null
          email_sent?: boolean
          estimated_price?: number | null
          file_name?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          material?: string | null
          message?: string | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          print_hours?: number | null
          quantity?: string | null
          service?: string | null
          source?: string
          stage?: string | null
          surname?: string | null
          weight_g?: number | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_order_estimates: {
        Row: {
          created_at: string | null
          estimated_print_hours: number | null
          file_name: string | null
          id: string | null
          locked_until: string | null
          order_id: string | null
          quote_price_eur: number | null
          recommended_material: string | null
          service: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_analyses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_analyses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_orders: {
        Row: {
          company: string | null
          courier: string | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          dimensions: string | null
          due_date: string | null
          estimated_delivery: string | null
          id: string | null
          material: string | null
          message: string | null
          metadata: Json | null
          order_code: string | null
          quantity: string | null
          quote_price: number | null
          service: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company?: string | null
          courier?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          dimensions?: string | null
          due_date?: string | null
          estimated_delivery?: string | null
          id?: string | null
          material?: string | null
          message?: string | null
          metadata?: Json | null
          order_code?: string | null
          quantity?: string | null
          quote_price?: number | null
          service?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company?: string | null
          courier?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          dimensions?: string | null
          due_date?: string | null
          estimated_delivery?: string | null
          id?: string | null
          material?: string | null
          message?: string | null
          metadata?: Json | null
          order_code?: string | null
          quantity?: string | null
          quote_price?: number | null
          service?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_proforma_number: { Args: never; Returns: string }
      next_quote_number: {
        Args: never
        Returns: {
          number: string
          seq: number
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      actor_role: "customer" | "admin" | "system"
      app_role: "admin" | "customer"
      file_visibility: "customer" | "admin"
      order_priority: "low" | "normal" | "high" | "urgent"
      order_source: "inquiry" | "3dp_quote" | "start" | "admin"
      order_status:
        | "quote_received"
        | "engineering_review"
        | "quote_sent"
        | "awaiting_approval"
        | "payment_received"
        | "production"
        | "quality_inspection"
        | "ready_for_shipping"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "packaging"
        | "completed"
        | "rejected"
      production_job_state:
        | "queued"
        | "ready"
        | "running"
        | "paused"
        | "blocked"
        | "done"
        | "cancelled"
      production_risk: "low" | "medium" | "high"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      actor_role: ["customer", "admin", "system"],
      app_role: ["admin", "customer"],
      file_visibility: ["customer", "admin"],
      order_priority: ["low", "normal", "high", "urgent"],
      order_source: ["inquiry", "3dp_quote", "start", "admin"],
      order_status: [
        "quote_received",
        "engineering_review",
        "quote_sent",
        "awaiting_approval",
        "payment_received",
        "production",
        "quality_inspection",
        "ready_for_shipping",
        "shipped",
        "delivered",
        "cancelled",
        "packaging",
        "completed",
        "rejected",
      ],
      production_job_state: [
        "queued",
        "ready",
        "running",
        "paused",
        "blocked",
        "done",
        "cancelled",
      ],
      production_risk: ["low", "medium", "high"],
    },
  },
} as const
