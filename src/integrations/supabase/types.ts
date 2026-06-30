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
          id: string
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
          id?: string
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
          id?: string
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
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
    },
  },
} as const
