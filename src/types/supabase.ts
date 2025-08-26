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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      abonnements: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          end_date: string | null
          id: string
          last_event_id: string | null
          latest_invoice: string | null
          plan: string | null
          price_id: string | null
          raw_data: Json | null
          start_date: string | null
          status: string | null
          stripe_customer: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          end_date?: string | null
          id?: string
          last_event_id?: string | null
          latest_invoice?: string | null
          plan?: string | null
          price_id?: string | null
          raw_data?: Json | null
          start_date?: string | null
          status?: string | null
          stripe_customer?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          end_date?: string | null
          id?: string
          last_event_id?: string | null
          latest_invoice?: string | null
          plan?: string | null
          price_id?: string | null
          raw_data?: Json | null
          start_date?: string | null
          status?: string | null
          stripe_customer?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          label: string
          user_id: string | null
          value: string
        }
        Insert: {
          id?: string
          label: string
          user_id?: string | null
          value: string
        }
        Update: {
          id?: string
          label?: string
          user_id?: string | null
          value?: string
        }
        Relationships: []
      }
      consentements: {
        Row: {
          action: string | null
          app_version: string | null
          choices: Json
          created_at: string
          id: number
          ip_hash: string | null
          locale: string | null
          mode: string
          origin: string | null
          ts_client: string | null
          ua: string | null
          user_id: string | null
          version: string
        }
        Insert: {
          action?: string | null
          app_version?: string | null
          choices: Json
          created_at?: string
          id?: number
          ip_hash?: string | null
          locale?: string | null
          mode: string
          origin?: string | null
          ts_client?: string | null
          ua?: string | null
          user_id?: string | null
          version: string
        }
        Update: {
          action?: string | null
          app_version?: string | null
          choices?: Json
          created_at?: string
          id?: number
          ip_hash?: string | null
          locale?: string | null
          mode?: string
          origin?: string | null
          ts_client?: string | null
          ua?: string | null
          user_id?: string | null
          version?: string
        }
        Relationships: []
      }
      parametres: {
        Row: {
          confettis: boolean | null
          id: number
        }
        Insert: {
          confettis?: boolean | null
          id?: number
        }
        Update: {
          confettis?: boolean | null
          id?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          date_naissance: string | null
          id: string
          is_admin: boolean | null
          pseudo: string | null
          ville: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          date_naissance?: string | null
          id: string
          is_admin?: boolean | null
          pseudo?: string | null
          ville?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          date_naissance?: string | null
          id?: string
          is_admin?: boolean | null
          pseudo?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      recompenses: {
        Row: {
          id: number
          imagepath: string | null
          label: string | null
          selected: boolean | null
          user_id: string | null
          visible_en_demo: boolean | null
        }
        Insert: {
          id?: number
          imagepath?: string | null
          label?: string | null
          selected?: boolean | null
          user_id?: string | null
          visible_en_demo?: boolean | null
        }
        Update: {
          id?: number
          imagepath?: string | null
          label?: string | null
          selected?: boolean | null
          user_id?: string | null
          visible_en_demo?: boolean | null
        }
        Relationships: []
      }
      stations: {
        Row: {
          id: number
          label: string | null
          ligne: string | null
          ordre: number | null
          type: Database["public"]["Enums"]["transport_type"]
        }
        Insert: {
          id?: number
          label?: string | null
          ligne?: string | null
          ordre?: number | null
          type?: Database["public"]["Enums"]["transport_type"]
        }
        Update: {
          id?: number
          label?: string | null
          ligne?: string | null
          ordre?: number | null
          type?: Database["public"]["Enums"]["transport_type"]
        }
        Relationships: []
      }
      subscription_logs: {
        Row: {
          details: Json | null
          event_type: string
          id: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          details?: Json | null
          event_type: string
          id?: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          details?: Json | null
          event_type?: string
          id?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      taches: {
        Row: {
          aujourdhui: boolean | null
          categorie: string | null
          fait: boolean | null
          id: string
          imagepath: string | null
          label: string
          position: number | null
          user_id: string | null
          visible_en_demo: boolean | null
        }
        Insert: {
          aujourdhui?: boolean | null
          categorie?: string | null
          fait?: boolean | null
          id?: string
          imagepath?: string | null
          label: string
          position?: number | null
          user_id?: string | null
          visible_en_demo?: boolean | null
        }
        Update: {
          aujourdhui?: boolean | null
          categorie?: string | null
          fait?: boolean | null
          id?: string
          imagepath?: string | null
          label?: string
          position?: number | null
          user_id?: string | null
          visible_en_demo?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      consentements_dernier: {
        Row: {
          action: string | null
          app_version: string | null
          choices: Json | null
          created_at: string | null
          id: number | null
          locale: string | null
          mode: string | null
          origin: string | null
          ts_client: string | null
          ua: string | null
          user_id: string | null
          version: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      email_exists: {
        Args: { email_to_check: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      purge_old_consentements: {
        Args: { retention_months?: number }
        Returns: undefined
      }
      user_can_upload_avatar: {
        Args: { uid: string }
        Returns: boolean
      }
    }
    Enums: {
      transport_type: "metro" | "tram" | "rer" | "bus"
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
      transport_type: ["metro", "tram", "rer", "bus"],
    },
  },
} as const
