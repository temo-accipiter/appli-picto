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
          cancel_at_period_end: boolean
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
          status: string
          stripe_customer: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean
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
          status: string
          stripe_customer?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean
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
          status?: string
          stripe_customer?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      account_audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          new_role: string | null
          new_status: string | null
          old_role: string | null
          old_status: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_role?: string | null
          new_status?: string | null
          old_role?: string | null
          old_status?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_role?: string | null
          new_status?: string | null
          old_role?: string | null
          old_status?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          label: string
          updated_at: string
          user_id: string | null
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          updated_at?: string
          user_id?: string | null
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          updated_at?: string
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
          donnees: string | null
          id: string
          ip_hash: string | null
          locale: string | null
          mode: string
          origin: string | null
          ts: string
          ts_client: string | null
          type_consentement: string
          ua: string | null
          user_id: string | null
          version: string
        }
        Insert: {
          action?: string | null
          app_version?: string | null
          choices?: Json
          created_at?: string
          donnees?: string | null
          id?: string
          ip_hash?: string | null
          locale?: string | null
          mode?: string
          origin?: string | null
          ts?: string
          ts_client?: string | null
          type_consentement: string
          ua?: string | null
          user_id?: string | null
          version?: string
        }
        Update: {
          action?: string | null
          app_version?: string | null
          choices?: Json
          created_at?: string
          donnees?: string | null
          id?: string
          ip_hash?: string | null
          locale?: string | null
          mode?: string
          origin?: string | null
          ts?: string
          ts_client?: string | null
          type_consentement?: string
          ua?: string | null
          user_id?: string | null
          version?: string
        }
        Relationships: []
      }
      demo_cards: {
        Row: {
          card_type: string
          created_at: string | null
          id: string
          imagepath: string | null
          is_active: boolean | null
          label: string
          position: number | null
          updated_at: string | null
        }
        Insert: {
          card_type: string
          created_at?: string | null
          id?: string
          imagepath?: string | null
          is_active?: boolean | null
          label: string
          position?: number | null
          updated_at?: string | null
        }
        Update: {
          card_type?: string
          created_at?: string | null
          id?: string
          imagepath?: string | null
          is_active?: boolean | null
          label?: string
          position?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      features: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      parametres: {
        Row: {
          confettis: boolean
          created_at: string
          id: number
          updated_at: string
        }
        Insert: {
          confettis?: boolean
          created_at?: string
          id?: number
          updated_at?: string
        }
        Update: {
          confettis?: boolean
          created_at?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      permission_changes: {
        Row: {
          change_reason: string | null
          change_type: string
          changed_at: string
          changed_by: string | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          change_reason?: string | null
          change_type: string
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          change_reason?: string | null
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          created_at?: string
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
          account_status: string
          avatar_url: string | null
          created_at: string
          date_naissance: string | null
          deletion_scheduled_at: string | null
          id: string
          is_admin: boolean
          pseudo: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          date_naissance?: string | null
          deletion_scheduled_at?: string | null
          id: string
          is_admin?: boolean
          pseudo?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          date_naissance?: string | null
          deletion_scheduled_at?: string | null
          id?: string
          is_admin?: boolean
          pseudo?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      recompenses: {
        Row: {
          couleur: string | null
          created_at: string
          description: string | null
          icone: string | null
          id: string
          imagepath: string | null
          label: string
          points_requis: number
          selected: boolean
          updated_at: string
          user_id: string | null
          visible_en_demo: boolean
        }
        Insert: {
          couleur?: string | null
          created_at?: string
          description?: string | null
          icone?: string | null
          id?: string
          imagepath?: string | null
          label: string
          points_requis?: number
          selected?: boolean
          updated_at?: string
          user_id?: string | null
          visible_en_demo?: boolean
        }
        Update: {
          couleur?: string | null
          created_at?: string
          description?: string | null
          icone?: string | null
          id?: string
          imagepath?: string | null
          label?: string
          points_requis?: number
          selected?: boolean
          updated_at?: string
          user_id?: string | null
          visible_en_demo?: boolean
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          feature_id: string
          id: string
          role_id: string
          updated_at: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          feature_id: string
          id?: string
          role_id: string
          updated_at?: string
        }
        Update: {
          can_access?: boolean
          created_at?: string
          feature_id?: string
          id?: string
          role_id?: string
          updated_at?: string
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
      role_quotas: {
        Row: {
          created_at: string | null
          id: string
          quota_limit: number
          quota_period: string | null
          quota_type: string
          role_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          quota_limit: number
          quota_period?: string | null
          quota_type: string
          role_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          quota_limit?: number
          quota_period?: string | null
          quota_type?: string
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_quotas_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_quotas_backup_legacy: {
        Row: {
          created_at: string | null
          id: string | null
          quota_limit: number | null
          quota_period: string | null
          quota_type: string | null
          role_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          quota_limit?: number | null
          quota_period?: string | null
          quota_type?: string | null
          role_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          quota_limit?: number | null
          quota_period?: string | null
          quota_type?: string | null
          role_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          name: string
          priority: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          priority?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      stations: {
        Row: {
          created_at: string
          id: string
          label: string
          ligne: string
          ordre: number
          type: Database["public"]["Enums"]["transport_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          ligne: string
          ordre: number
          type?: Database["public"]["Enums"]["transport_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          ligne?: string
          ordre?: number
          type?: Database["public"]["Enums"]["transport_type"]
          updated_at?: string
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
          aujourdhui: boolean
          categorie: string | null
          categorie_id: string | null
          couleur: string | null
          created_at: string
          description: string | null
          fait: boolean
          icone: string | null
          id: string
          imagepath: string | null
          label: string
          points: number
          position: number
          updated_at: string
          user_id: string | null
          visible_en_demo: boolean
        }
        Insert: {
          aujourdhui?: boolean
          categorie?: string | null
          categorie_id?: string | null
          couleur?: string | null
          created_at?: string
          description?: string | null
          fait?: boolean
          icone?: string | null
          id?: string
          imagepath?: string | null
          label: string
          points?: number
          position?: number
          updated_at?: string
          user_id?: string | null
          visible_en_demo?: boolean
        }
        Update: {
          aujourdhui?: boolean
          categorie?: string | null
          categorie_id?: string | null
          couleur?: string | null
          created_at?: string
          description?: string | null
          fait?: boolean
          icone?: string | null
          id?: string
          imagepath?: string | null
          label?: string
          points?: number
          position?: number
          updated_at?: string
          user_id?: string | null
          visible_en_demo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "taches_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_assets: {
        Row: {
          asset_type: string
          created_at: string
          dimensions: string | null
          file_path: string
          file_size: number
          id: string
          mime_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          dimensions?: string | null
          file_path: string
          file_size: number
          id?: string
          mime_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          dimensions?: string | null
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_prefs: {
        Row: {
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          role_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          role_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          role_id?: string
          updated_at?: string
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
      user_usage_counters: {
        Row: {
          categories: number
          rewards: number
          tasks: number
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: number
          rewards?: number
          tasks?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: number
          rewards?: number
          tasks?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      consentements_latest: {
        Row: {
          action: string | null
          app_version: string | null
          choices: Json | null
          created_at: string | null
          effective_ts: string | null
          id: string | null
          ip_hash: string | null
          locale: string | null
          mode: string | null
          origin: string | null
          ts: string | null
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
      v_role_quota_matrix: {
        Row: {
          quota_limit: number | null
          quota_period: string | null
          quota_type: string | null
          role_name: string | null
        }
        Relationships: []
      }
      v_user_storage_usage: {
        Row: {
          bytes_total: number | null
          files_count: number | null
          last_upload_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assert_self_or_admin: {
        Args: { p_target: string }
        Returns: undefined
      }
      bump_usage_counter: {
        Args: { p_col: string; p_delta: number; p_user: string }
        Returns: undefined
      }
      change_account_status: {
        Args: {
          changed_by_user_id?: string
          metadata?: Json
          new_status: string
          reason?: string
          target_user_id: string
        }
        Returns: boolean
      }
      check_image_quota: {
        Args: { p_asset_type: string; p_file_size?: number; p_user_id: string }
        Returns: Json
      }
      check_user_quota: {
        Args: { quota_period?: string; quota_type: string; user_uuid: string }
        Returns: boolean
      }
      check_user_quota_free_only: {
        Args: { p_period: string; p_quota_type: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_old_audit_logs: {
        Args: { retention_days?: number }
        Returns: number
      }
      email_exists: {
        Args: { email_to_check: string }
        Returns: boolean
      }
      generate_unique_pseudo: {
        Args: { base: string }
        Returns: string
      }
      get_account_history: {
        Args: { limit_count?: number; user_uuid: string }
        Returns: {
          action: string
          changed_by_pseudo: string
          created_at: string
          id: string
          new_role: string
          new_status: string
          old_role: string
          old_status: string
          reason: string
        }[]
      }
      get_account_status: {
        Args: { user_uuid: string }
        Returns: {
          account_status: string
          deletion_date: string
          is_pending_verification: boolean
          is_scheduled_for_deletion: boolean
          is_suspended: boolean
          role_name: string
          user_id: string
        }[]
      }
      get_confettis: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_demo_cards: {
        Args: { card_type_filter?: string }
        Returns: {
          card_type: string
          id: string
          imagepath: string
          label: string
          position: number
        }[]
      }
      get_demo_rewards: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          imagepath: string
          label: string
          position: number
        }[]
      }
      get_demo_tasks: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          imagepath: string
          label: string
          position: number
        }[]
      }
      get_migration_report: {
        Args: Record<PropertyKey, never>
        Returns: {
          abonne_users: number
          active_users: number
          admin_users: number
          deletion_scheduled_users: number
          free_users: number
          pending_users: number
          staff_users: number
          suspended_users: number
          total_users: number
          visitor_users: number
        }[]
      }
      get_usage: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_usage_fast: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_assets_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_emails: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_user_last_logins: {
        Args: Record<PropertyKey, never>
        Returns: {
          is_online: boolean
          last_login: string
          user_id: string
        }[]
      }
      get_user_month_bounds_utc: {
        Args: { p_user_id: string }
        Returns: {
          end_utc: string
          start_utc: string
        }[]
      }
      get_user_permissions: {
        Args: { user_uuid: string }
        Returns: {
          can_access: boolean
          feature_name: string
        }[]
      }
      get_user_primary_role: {
        Args: { p_user_id: string }
        Returns: {
          priority: number
          role_id: string
          role_name: string
        }[]
      }
      get_user_quota_info: {
        Args: { quota_period?: string; quota_type: string; user_uuid: string }
        Returns: {
          current_usage: number
          is_limited: boolean
          quota_limit: number
          remaining: number
        }[]
      }
      get_user_roles: {
        Args: { p_user_id: string }
        Returns: {
          is_active: boolean
          priority: number
          role_id: string
          role_name: string
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_subscriber: {
        Args: { p_user?: string }
        Returns: boolean
      }
      is_system_role: {
        Args: { role_name: string }
        Returns: boolean
      }
      log_card_creation: {
        Args: { _entity: string; _id: string; _user: string }
        Returns: undefined
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
      transport_type: "metro" | "bus" | "tram" | "rer"
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
      transport_type: ["metro", "bus", "tram", "rer"],
    },
  },
} as const
