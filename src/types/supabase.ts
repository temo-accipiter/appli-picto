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
      features: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
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
      permission_changes: {
        Row: {
          change_reason: string | null
          change_type: string
          changed_by: string
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          change_reason?: string | null
          change_type: string
          changed_by: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          change_reason?: string | null
          change_type?: string
          changed_by?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
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
      role_permissions: {
        Row: {
          can_access: boolean
          can_create: boolean | null
          can_delete: boolean | null
          can_read: boolean | null
          can_update: boolean | null
          created_at: string | null
          feature_id: string
          id: string
          role_id: string
          updated_at: string | null
        }
        Insert: {
          can_access?: boolean
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          created_at?: string | null
          feature_id: string
          id?: string
          role_id: string
          updated_at?: string | null
        }
        Update: {
          can_access?: boolean
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          created_at?: string | null
          feature_id?: string
          id?: string
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          name: string
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          name: string
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          name?: string
          priority?: number | null
          updated_at?: string | null
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
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
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
      role_permissions_admin_view: {
        Row: {
          can_access: boolean | null
          can_create: boolean | null
          can_delete: boolean | null
          can_read: boolean | null
          can_update: boolean | null
          category: string | null
          created_at: string | null
          feature_display_name: string | null
          feature_id: string | null
          feature_name: string | null
          id: string | null
          role_display_name: string | null
          role_id: string | null
          role_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      email_exists: {
        Args: { email_to_check: string }
        Returns: boolean
      }
      get_user_permissions: {
        Args: { user_uuid: string }
        Returns: {
          can_access: boolean
          can_create: boolean
          can_delete: boolean
          can_read: boolean
          can_update: boolean
          feature_name: string
        }[]
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
      user_has_permission: {
        Args: {
          feature_name: string
          permission_type?: string
          user_uuid: string
        }
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
