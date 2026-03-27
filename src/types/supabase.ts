export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_preferences: {
        Row: {
          account_id: string
          confetti_enabled: boolean
          created_at: string
          reduced_motion: boolean
          toasts_enabled: boolean
          train_line: string | null
          train_progress_enabled: boolean
          train_type: Database['public']['Enums']['transport_type']
          updated_at: string
        }
        Insert: {
          account_id: string
          confetti_enabled?: boolean
          created_at?: string
          reduced_motion?: boolean
          toasts_enabled?: boolean
          train_line?: string | null
          train_progress_enabled?: boolean
          train_type?: Database['public']['Enums']['transport_type']
          updated_at?: string
        }
        Update: {
          account_id?: string
          confetti_enabled?: boolean
          created_at?: string
          reduced_motion?: boolean
          toasts_enabled?: boolean
          train_line?: string | null
          train_progress_enabled?: boolean
          train_type?: Database['public']['Enums']['transport_type']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'account_preferences_account_id_fkey'
            columns: ['account_id']
            isOneToOne: true
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      account_quota_months: {
        Row: {
          account_id: string
          created_at: string
          month_end_utc: string
          month_start_utc: string
          period_ym: number
          personal_cards_created: number
          tz_ref: string
        }
        Insert: {
          account_id: string
          created_at?: string
          month_end_utc: string
          month_start_utc: string
          period_ym: number
          personal_cards_created?: number
          tz_ref: string
        }
        Update: {
          account_id?: string
          created_at?: string
          month_end_utc?: string
          month_start_utc?: string
          period_ym?: number
          personal_cards_created?: number
          tz_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: 'account_quota_months_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          status: Database['public']['Enums']['account_status']
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          status: Database['public']['Enums']['account_status']
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database['public']['Enums']['account_status']
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: Database['public']['Enums']['admin_action']
          actor_account_id: string
          created_at: string
          id: string
          metadata: Json
          reason: string
          target_account_id: string | null
        }
        Insert: {
          action: Database['public']['Enums']['admin_action']
          actor_account_id: string
          created_at?: string
          id?: string
          metadata?: Json
          reason: string
          target_account_id?: string | null
        }
        Update: {
          action?: Database['public']['Enums']['admin_action']
          actor_account_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string
          target_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'admin_audit_log_actor_account_id_fkey'
            columns: ['actor_account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'admin_audit_log_target_account_id_fkey'
            columns: ['target_account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      cards: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          image_url: string
          name: string
          published: boolean | null
          type: Database['public']['Enums']['card_type']
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          image_url: string
          name: string
          published?: boolean | null
          type: Database['public']['Enums']['card_type']
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          published?: boolean | null
          type?: Database['public']['Enums']['card_type']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cards_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      categories: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categories_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      child_profiles: {
        Row: {
          account_id: string
          created_at: string
          id: string
          name: string
          status: Database['public']['Enums']['child_profile_status']
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          name: string
          status?: Database['public']['Enums']['child_profile_status']
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          name?: string
          status?: Database['public']['Enums']['child_profile_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'child_profiles_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      consent_events: {
        Row: {
          account_id: string | null
          action: string | null
          app_version: string | null
          choices: Json
          consent_type: string
          created_at: string
          id: string
          ip_hash: string | null
          locale: string | null
          mode: string
          origin: string | null
          ts_client: string | null
          ua: string | null
          version: string
        }
        Insert: {
          account_id?: string | null
          action?: string | null
          app_version?: string | null
          choices?: Json
          consent_type: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          locale?: string | null
          mode?: string
          origin?: string | null
          ts_client?: string | null
          ua?: string | null
          version?: string
        }
        Update: {
          account_id?: string | null
          action?: string | null
          app_version?: string | null
          choices?: Json
          consent_type?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          locale?: string | null
          mode?: string
          origin?: string | null
          ts_client?: string | null
          ua?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: 'consent_events_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      devices: {
        Row: {
          account_id: string
          created_at: string
          device_id: string
          id: string
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          device_id: string
          id?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          device_id?: string
          id?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'devices_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      sequence_steps: {
        Row: {
          created_at: string
          id: string
          position: number
          sequence_id: string
          step_card_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          position: number
          sequence_id: string
          step_card_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          sequence_id?: string
          step_card_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sequence_steps_sequence_id_fkey'
            columns: ['sequence_id']
            isOneToOne: false
            referencedRelation: 'sequences'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sequence_steps_step_card_id_fkey'
            columns: ['step_card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
        ]
      }
      sequences: {
        Row: {
          account_id: string
          created_at: string
          id: string
          mother_card_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          mother_card_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          mother_card_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sequences_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sequences_mother_card_id_fkey'
            columns: ['mother_card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
        ]
      }
      session_validations: {
        Row: {
          created_at: string
          id: string
          session_id: string
          slot_id: string
          validated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          slot_id: string
          validated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          slot_id?: string
          validated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'session_validations_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_validations_slot_id_fkey'
            columns: ['slot_id']
            isOneToOne: false
            referencedRelation: 'slots'
            referencedColumns: ['id']
          },
        ]
      }
      sessions: {
        Row: {
          child_profile_id: string
          completed_at: string | null
          created_at: string
          epoch: number
          id: string
          started_at: string | null
          state: Database['public']['Enums']['session_state']
          steps_total_snapshot: number | null
          timeline_id: string
          updated_at: string
        }
        Insert: {
          child_profile_id: string
          completed_at?: string | null
          created_at?: string
          epoch?: number
          id?: string
          started_at?: string | null
          state: Database['public']['Enums']['session_state']
          steps_total_snapshot?: number | null
          timeline_id: string
          updated_at?: string
        }
        Update: {
          child_profile_id?: string
          completed_at?: string | null
          created_at?: string
          epoch?: number
          id?: string
          started_at?: string | null
          state?: Database['public']['Enums']['session_state']
          steps_total_snapshot?: number | null
          timeline_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sessions_child_profile_id_fkey'
            columns: ['child_profile_id']
            isOneToOne: false
            referencedRelation: 'child_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sessions_timeline_id_fkey'
            columns: ['timeline_id']
            isOneToOne: false
            referencedRelation: 'timelines'
            referencedColumns: ['id']
          },
        ]
      }
      slots: {
        Row: {
          card_id: string | null
          created_at: string
          id: string
          kind: Database['public']['Enums']['slot_kind']
          position: number
          timeline_id: string
          tokens: number | null
          updated_at: string
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          id?: string
          kind: Database['public']['Enums']['slot_kind']
          position: number
          timeline_id: string
          tokens?: number | null
          updated_at?: string
        }
        Update: {
          card_id?: string | null
          created_at?: string
          id?: string
          kind?: Database['public']['Enums']['slot_kind']
          position?: number
          timeline_id?: string
          tokens?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'slots_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'slots_timeline_id_fkey'
            columns: ['timeline_id']
            isOneToOne: false
            referencedRelation: 'timelines'
            referencedColumns: ['id']
          },
        ]
      }
      stations: {
        Row: {
          created_at: string
          id: string
          label: string
          ligne: string
          ordre: number
          type: Database['public']['Enums']['transport_type']
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          ligne: string
          ordre: number
          type: Database['public']['Enums']['transport_type']
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          ligne?: string
          ordre?: number
          type?: Database['public']['Enums']['transport_type']
          updated_at?: string
        }
        Relationships: []
      }
      subscription_logs: {
        Row: {
          account_id: string | null
          created_at: string
          details: Json | null
          event_type: string
          id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscription_logs_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      subscriptions: {
        Row: {
          account_id: string
          cancel_at: string | null
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_event_id: string | null
          price_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          cancel_at?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_event_id?: string | null
          price_id?: string | null
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          cancel_at?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_event_id?: string | null
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      timelines: {
        Row: {
          child_profile_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          child_profile_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          child_profile_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'timelines_child_profile_id_fkey'
            columns: ['child_profile_id']
            isOneToOne: true
            referencedRelation: 'child_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_card_categories: {
        Row: {
          card_id: string
          category_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          category_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          category_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_card_categories_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_card_categories_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_card_categories_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_account_support_info: {
        Args: { target_account_id: string }
        Returns: Json
      }
      apply_subscription_to_account_status: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      can_write_sequences: { Args: never; Returns: boolean }
      cards_personal_feature_enabled: {
        Args: { p_status: Database['public']['Enums']['account_status'] }
        Returns: boolean
      }
      check_can_create_child_profile: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      check_can_create_personal_card: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      check_can_register_device: {
        Args: { p_account_id: string; p_revoked_at: string }
        Returns: undefined
      }
      create_sequence_with_steps: {
        Args: { p_mother_card_id: string; p_step_card_ids: string[] }
        Returns: string
      }
      enforce_child_profile_limit_after_session_completion: {
        Args: { p_child_profile_id: string }
        Returns: undefined
      }
      ensure_quota_month_context: {
        Args: { p_account_id: string }
        Returns: {
          month_end_utc: string
          month_start_utc: string
          period_ym: number
          tz_ref: string
        }[]
      }
      get_account_status: {
        Args: { p_account_id: string }
        Returns: Database['public']['Enums']['account_status']
      }
      hard_reset_timeline_session: {
        Args: { p_timeline_id: string }
        Returns: undefined
      }
      import_visitor_sequences_batch: {
        Args: { p_sequences_json: Json }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_execution_only: { Args: never; Returns: boolean }
      is_valid_timezone: { Args: { tz: string }; Returns: boolean }
      quota_cards_monthly_limit: {
        Args: { p_status: Database['public']['Enums']['account_status'] }
        Returns: number
      }
      quota_cards_stock_limit: {
        Args: { p_status: Database['public']['Enums']['account_status'] }
        Returns: number
      }
      quota_devices_limit: {
        Args: { p_status: Database['public']['Enums']['account_status'] }
        Returns: number
      }
      quota_profiles_limit: {
        Args: { p_status: Database['public']['Enums']['account_status'] }
        Returns: number
      }
      replace_sequence_steps: {
        Args: { p_sequence_id: string; p_step_card_ids: string[] }
        Returns: undefined
      }
      reset_active_started_session_for_timeline: {
        Args: { p_reason?: string; p_timeline_id: string }
        Returns: undefined
      }
      sequences_enforce_min_two_steps: {
        Args: { p_sequence_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_status: 'free' | 'subscriber' | 'admin'
      admin_action:
        | 'revoke_sessions'
        | 'disable_device'
        | 'resync_subscription_from_stripe'
        | 'append_subscription_log'
        | 'request_account_deletion'
        | 'export_proof_evidence'
      card_type: 'bank' | 'personal'
      child_profile_status: 'active' | 'locked'
      session_state: 'active_preview' | 'active_started' | 'completed'
      slot_kind: 'step' | 'reward'
      transport_type: 'metro' | 'tram' | 'bus'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ['free', 'subscriber', 'admin'],
      admin_action: [
        'revoke_sessions',
        'disable_device',
        'resync_subscription_from_stripe',
        'append_subscription_log',
        'request_account_deletion',
        'export_proof_evidence',
      ],
      card_type: ['bank', 'personal'],
      child_profile_status: ['active', 'locked'],
      session_state: ['active_preview', 'active_started', 'completed'],
      slot_kind: ['step', 'reward'],
      transport_type: ['metro', 'tram', 'bus'],
    },
  },
} as const
