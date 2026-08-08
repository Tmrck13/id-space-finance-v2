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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          activity: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json
        }
        Insert: {
          activity: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json
        }
        Update: {
          activity?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          auth_tag: string
          ciphertext: string
          created_at: string
          hint: string | null
          id: string
          iv: string
          key: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          auth_tag: string
          ciphertext: string
          created_at?: string
          hint?: string | null
          id?: string
          iv: string
          key: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          auth_tag?: string
          ciphertext?: string
          created_at?: string
          hint?: string | null
          id?: string
          iv?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          image: string | null
          is_active: boolean
          link: string | null
          order_number: number
          starts_at: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          link?: string | null
          order_number?: number
          starts_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          link?: string | null
          order_number?: number
          starts_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_checkin: {
        Row: {
          checkin_date: string
          created_at: string
          id: string
          ledger_id: string | null
          reward_amount: number
          reward_currency: string
          streak: number
          user_id: string
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          id?: string
          ledger_id?: string | null
          reward_amount?: number
          reward_currency?: string
          streak?: number
          user_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          id?: string
          ledger_id?: string | null
          reward_amount?: number
          reward_currency?: string
          streak?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkin_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      idpoints: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          event_type: string
          id: string
          ledger_id: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          ledger_id?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          ledger_id?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idpoints_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          reference: string | null
          status: string
          transaction_type: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          reference?: string | null
          status?: string
          transaction_type: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          reference?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      membership: {
        Row: {
          badge: string | null
          benefits: Json
          created_at: string
          id: string
          level: string
          order_number: number
          profile_background: string | null
          profile_frame: string | null
        }
        Insert: {
          badge?: string | null
          benefits?: Json
          created_at?: string
          id?: string
          level: string
          order_number?: number
          profile_background?: string | null
          profile_frame?: string | null
        }
        Update: {
          badge?: string | null
          benefits?: Json
          created_at?: string
          id?: string
          level?: string
          order_number?: number
          profile_background?: string | null
          profile_frame?: string | null
        }
        Relationships: []
      }
      missions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          mission_type: string
          order_number: number
          reward_amount: number
          reward_currency: string
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          mission_type?: string
          order_number?: number
          reward_amount?: number
          reward_currency?: string
          target_value?: number
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          mission_type?: string
          order_number?: number
          reward_amount?: number
          reward_currency?: string
          target_value?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          lang: string
          message: string
          priority: number
          published_at: string
          target_role: Database["public"]["Enums"]["app_role"] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          lang?: string
          message: string
          priority?: number
          published_at?: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          lang?: string
          message?: string
          priority?: number
          published_at?: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pi_auth_sessions: {
        Row: {
          created_at: string
          id: string
          network: string
          pi_uid: string
          pi_username: string | null
          scopes: string[]
          updated_at: string
          user_id: string | null
          validated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          network?: string
          pi_uid: string
          pi_username?: string | null
          scopes?: string[]
          updated_at?: string
          user_id?: string | null
          validated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          network?: string
          pi_uid?: string
          pi_username?: string | null
          scopes?: string[]
          updated_at?: string
          user_id?: string | null
          validated_at?: string
        }
        Relationships: []
      }
      pi_payment_events: {
        Row: {
          created_at: string
          detail: Json
          event: string
          id: string
          payment_id: string
          source: string
          status: string | null
          transaction_id: string | null
          txid: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json
          event: string
          id?: string
          payment_id: string
          source?: string
          status?: string | null
          transaction_id?: string | null
          txid?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json
          event?: string
          id?: string
          payment_id?: string
          source?: string
          status?: string | null
          transaction_id?: string | null
          txid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pi_payment_events_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio: {
        Row: {
          asset: string
          avg_cost: number
          created_at: string
          id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          asset: string
          avg_cost?: number
          created_at?: string
          id?: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          asset?: string
          avg_cost?: number
          created_at?: string
          id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          email: string | null
          id: string
          membership_level: string
          pi_uid: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          email?: string | null
          id: string
          membership_level?: string
          pi_uid?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string
          email?: string | null
          id?: string
          membership_level?: string
          pi_uid?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_membership_level_fkey"
            columns: ["membership_level"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["level"]
          },
        ]
      }
      reconciliation_runs: {
        Row: {
          detail: Json
          failed: number
          finished_at: string | null
          id: string
          scanned: number
          settled: number
          started_at: string
          trigger_source: string
          updated: number
        }
        Insert: {
          detail?: Json
          failed?: number
          finished_at?: string | null
          id?: string
          scanned?: number
          settled?: number
          started_at?: string
          trigger_source?: string
          updated?: number
        }
        Update: {
          detail?: Json
          failed?: number
          finished_at?: string | null
          id?: string
          scanned?: number
          settled?: number
          started_at?: string
          trigger_source?: string
          updated?: number
        }
        Relationships: []
      }
      rewards: {
        Row: {
          amount: number
          created_at: string
          id: string
          ledger_id: string | null
          reward_type: string
          source: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          ledger_id?: string | null
          reward_type: string
          source?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          ledger_id?: string | null
          reward_type?: string
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      running_text: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          lang: string
          message: string
          order_number: number
          priority: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          lang?: string
          message: string
          order_number?: number
          priority?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          lang?: string
          message?: string
          order_number?: number
          priority?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_pi: number
          attempts: number
          created_at: string
          direction: string
          id: string
          last_error: string | null
          ledger_id: string | null
          memo: string | null
          metadata: Json
          network: string
          payment_id: string | null
          product_id: string | null
          reconciled_at: string | null
          settled_at: string | null
          status: string
          txid: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_pi?: number
          attempts?: number
          created_at?: string
          direction?: string
          id?: string
          last_error?: string | null
          ledger_id?: string | null
          memo?: string | null
          metadata?: Json
          network?: string
          payment_id?: string | null
          product_id?: string | null
          reconciled_at?: string | null
          settled_at?: string | null
          status?: string
          txid?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_pi?: number
          attempts?: number
          created_at?: string
          direction?: string
          id?: string
          last_error?: string | null
          ledger_id?: string | null
          memo?: string | null
          metadata?: Json
          network?: string
          payment_id?: string | null
          product_id?: string | null
          reconciled_at?: string | null
          settled_at?: string | null
          status?: string
          txid?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      user_entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          kind: string
          product_id: string
          quantity: number
          source_payment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          product_id: string
          quantity?: number
          source_payment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          product_id?: string
          quantity?: number
          source_payment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_missions: {
        Row: {
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          ledger_id: string | null
          mission_id: string
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          ledger_id?: string | null
          mission_id: string
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          ledger_id?: string | null
          mission_id?: string
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
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
      wallets: {
        Row: {
          cashback_balance: number
          created_at: string
          id: string
          idpoints_balance: number
          pi_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cashback_balance?: number
          created_at?: string
          id?: string
          idpoints_balance?: number
          pi_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cashback_balance?: number
          created_at?: string
          id?: string
          idpoints_balance?: number
          pi_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_moderator: { Args: never; Returns: boolean }
      post_ledger_entry: {
        Args: {
          _amount: number
          _currency: string
          _description?: string
          _reference?: string
          _status?: string
          _transaction_type: string
          _user_id: string
        }
        Returns: string
      }
      settle_ledger_entry: {
        Args: { _ledger_id: string; _status: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "merchant" | "admin" | "moderator"
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
      app_role: ["user", "merchant", "admin", "moderator"],
    },
  },
} as const
