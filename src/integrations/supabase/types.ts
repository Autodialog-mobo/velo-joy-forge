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
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json | null
          route: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          route?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          route?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_email_allowlist: {
        Row: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          http_status: number | null
          id: string
          metadata: Json | null
          order_id: string | null
          recipient: string | null
          resend_id: string | null
          status: string
          template: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          recipient?: string | null
          resend_id?: string | null
          status: string
          template: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          recipient?: string | null
          resend_id?: string | null
          status?: string
          template?: string
        }
        Relationships: []
      }
      margin_poll_responses: {
        Row: {
          choice: string
          created_at: string
          id: string
          reason: string | null
          shop_name: string
          updated_at: string
        }
        Insert: {
          choice: string
          created_at?: string
          id?: string
          reason?: string | null
          shop_name?: string
          updated_at?: string
        }
        Update: {
          choice?: string
          created_at?: string
          id?: string
          reason?: string | null
          shop_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          actor: string | null
          actor_type: string
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string | null
        }
        Insert: {
          actor?: string | null
          actor_type?: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status?: string | null
        }
        Update: {
          actor?: string | null
          actor_type?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_for_fulfillment"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          bundle_key: string
          bundle_sku: string
          created_at: string
          id: string
          order_id: string
          quantity: number
          sticker_count: number
          unit_price_cents: number
        }
        Insert: {
          bundle_key: string
          bundle_sku: string
          created_at?: string
          id?: string
          order_id: string
          quantity: number
          sticker_count: number
          unit_price_cents: number
        }
        Update: {
          bundle_key?: string
          bundle_sku?: string
          created_at?: string
          id?: string
          order_id?: string
          quantity?: number
          sticker_count?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_for_fulfillment"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_shipping: number
          amount_subtotal: number
          amount_tax: number
          amount_total: number
          created_at: string
          currency: string
          customer_email: string
          deleted_at: string | null
          email_confirmation_sent_at: string | null
          environment: string
          id: string
          lang: string | null
          mollie_payment_id: string | null
          payment_consumer_name: string | null
          payment_method: string | null
          price_id: string
          product_name: string
          quantity: number
          recovery_email_sent_at: string | null
          recovery_mollie_payment_id: string | null
          referral_source: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_line1: string | null
          shipping_line2: string | null
          shipping_name: string | null
          shipping_postal_code: string | null
          shipping_state: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_shipping?: number
          amount_subtotal: number
          amount_tax?: number
          amount_total: number
          created_at?: string
          currency?: string
          customer_email: string
          deleted_at?: string | null
          email_confirmation_sent_at?: string | null
          environment?: string
          id?: string
          lang?: string | null
          mollie_payment_id?: string | null
          payment_consumer_name?: string | null
          payment_method?: string | null
          price_id: string
          product_name: string
          quantity?: number
          recovery_email_sent_at?: string | null
          recovery_mollie_payment_id?: string | null
          referral_source?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_line1?: string | null
          shipping_line2?: string | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_shipping?: number
          amount_subtotal?: number
          amount_tax?: number
          amount_total?: number
          created_at?: string
          currency?: string
          customer_email?: string
          deleted_at?: string | null
          email_confirmation_sent_at?: string | null
          environment?: string
          id?: string
          lang?: string | null
          mollie_payment_id?: string | null
          payment_consumer_name?: string | null
          payment_method?: string | null
          price_id?: string
          product_name?: string
          quantity?: number
          recovery_email_sent_at?: string | null
          recovery_mollie_payment_id?: string | null
          referral_source?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_line1?: string | null
          shipping_line2?: string | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shop_signups: {
        Row: {
          address: string | null
          admin_notes: string | null
          confirmation_email_sent_at: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          ip: string | null
          lang: string | null
          last_name: string | null
          phone: string | null
          pos_other: string | null
          pos_system: string | null
          pushed_to_pro_at: string | null
          pushed_to_pro_by: string | null
          pushed_to_pro_by_email: string | null
          pushed_to_pro_management_id: string | null
          shop_name: string | null
          status: string
          status_updated_at: string | null
          status_updated_by: string | null
          updated_at: string
          user_agent: string | null
          vat: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          confirmation_email_sent_at?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          ip?: string | null
          lang?: string | null
          last_name?: string | null
          phone?: string | null
          pos_other?: string | null
          pos_system?: string | null
          pushed_to_pro_at?: string | null
          pushed_to_pro_by?: string | null
          pushed_to_pro_by_email?: string | null
          pushed_to_pro_management_id?: string | null
          shop_name?: string | null
          status?: string
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string
          user_agent?: string | null
          vat?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          confirmation_email_sent_at?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          ip?: string | null
          lang?: string | null
          last_name?: string | null
          phone?: string | null
          pos_other?: string | null
          pos_system?: string | null
          pushed_to_pro_at?: string | null
          pushed_to_pro_by?: string | null
          pushed_to_pro_by_email?: string | null
          pushed_to_pro_management_id?: string | null
          shop_name?: string | null
          status?: string
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string
          user_agent?: string | null
          vat?: string | null
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
      webhook_events: {
        Row: {
          error_message: string | null
          id: string
          origin_host: string | null
          origin_kind: string
          payload_id: string | null
          payment_status: string | null
          received_at: string
          source: string
          status: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          origin_host?: string | null
          origin_kind?: string
          payload_id?: string | null
          payment_status?: string | null
          received_at?: string
          source?: string
          status: string
        }
        Update: {
          error_message?: string | null
          id?: string
          origin_host?: string | null
          origin_kind?: string
          payload_id?: string | null
          payment_status?: string | null
          received_at?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      orders_for_fulfillment: {
        Row: {
          amount_subtotal: number | null
          amount_tax: number | null
          amount_total: number | null
          bundle_sku: string | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          environment: string | null
          id: string | null
          mollie_payment_id: string | null
          price_id: string | null
          product_name: string | null
          quantity: number | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_line1: string | null
          shipping_line2: string | null
          shipping_name: string | null
          shipping_postal_code: string | null
          shipping_state: string | null
          status: string | null
          stickers_per_bundle: number | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_subtotal?: number | null
          amount_tax?: number | null
          amount_total?: number | null
          bundle_sku?: never
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          environment?: string | null
          id?: string | null
          mollie_payment_id?: string | null
          price_id?: string | null
          product_name?: string | null
          quantity?: number | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_line1?: string | null
          shipping_line2?: string | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          status?: string | null
          stickers_per_bundle?: never
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_subtotal?: number | null
          amount_tax?: number | null
          amount_total?: number | null
          bundle_sku?: never
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          environment?: string | null
          id?: string | null
          mollie_payment_id?: string | null
          price_id?: string | null
          product_name?: string | null
          quantity?: number | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_line1?: string | null
          shipping_line2?: string | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          status?: string | null
          stickers_per_bundle?: never
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_order_printed: { Args: { p_order_id: string }; Returns: undefined }
      mark_order_shipped: {
        Args: { p_order_id: string; p_tracking_code?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "staff"
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
      app_role: ["admin", "moderator", "user", "staff"],
    },
  },
} as const
