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
      cards: {
        Row: {
          category_id: string | null
          created_at: string
          disabled_at: string | null
          disabled_by: string | null
          disabled_reason: string | null
          id: string
          image_path: string
          is_disabled: boolean
          name: string
          owner_id: string | null
          owner_type: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          disabled_at?: string | null
          disabled_by?: string | null
          disabled_reason?: string | null
          id?: string
          image_path: string
          is_disabled?: boolean
          name: string
          owner_id?: string | null
          owner_type: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          disabled_at?: string | null
          disabled_by?: string | null
          disabled_reason?: string | null
          id?: string
          image_path?: string
          is_disabled?: boolean
          name?: string
          owner_id?: string | null
          owner_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cards_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
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
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          date_naissance: string | null
          deletion_scheduled_at: string | null
          is_admin: boolean
          plan: string
          plan_expires_at: string | null
          pseudo: string | null
          updated_at: string
          user_id: string
          ville: string | null
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          date_naissance?: string | null
          deletion_scheduled_at?: string | null
          is_admin?: boolean
          plan?: string
          plan_expires_at?: string | null
          pseudo?: string | null
          updated_at?: string
          user_id: string
          ville?: string | null
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          date_naissance?: string | null
          deletion_scheduled_at?: string | null
          is_admin?: boolean
          plan?: string
          plan_expires_at?: string | null
          pseudo?: string | null
          updated_at?: string
          user_id?: string
          ville?: string | null
        }
        Relationships: []
      }
      slots: {
        Row: {
          card_id: string
          created_at: string
          id: string
          jetons: number
          position: number
          slot_type: string
          timeline_id: string
          updated_at: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          jetons?: number
          position: number
          slot_type: string
          timeline_id: string
          updated_at?: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          jetons?: number
          position?: number
          slot_type?: string
          timeline_id?: string
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
          created_at: string
          id: string
          is_active: boolean
          mode: string
          name: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          mode?: string
          name?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          mode?: string
          name?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'timelines_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['user_id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_card_disabled: {
        Args: { p_card_id: string; p_disabled: boolean; p_reason?: string }
        Returns: {
          category_id: string | null
          created_at: string
          disabled_at: string | null
          disabled_by: string | null
          disabled_reason: string | null
          id: string
          image_path: string
          is_disabled: boolean
          name: string
          owner_id: string | null
          owner_type: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'cards'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: never; Returns: boolean }
      is_subscriber_active: { Args: { uid: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
