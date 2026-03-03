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
      is_admin: { Args: never; Returns: boolean }
      is_execution_only: { Args: never; Returns: boolean }
      is_valid_timezone: { Args: { tz: string }; Returns: boolean }
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
      card_type: 'bank' | 'personal'
      child_profile_status: 'active' | 'locked'
      session_state: 'active_preview' | 'active_started' | 'completed'
      slot_kind: 'step' | 'reward'
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
      card_type: ['bank', 'personal'],
      child_profile_status: ['active', 'locked'],
      session_state: ['active_preview', 'active_started', 'completed'],
      slot_kind: ['step', 'reward'],
    },
  },
} as const
