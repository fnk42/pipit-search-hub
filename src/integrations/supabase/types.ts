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
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      candidates: {
        Row: {
          client_visible: boolean
          created_at: string
          created_by: string | null
          current_firm: string | null
          current_title: string | null
          date_sourced: string | null
          email: string | null
          feedback_transformari: string | null
          fnk_comments: string | null
          id: string
          ir_functions: Database["public"]["Enums"]["ir_function"][]
          last_contact_date: string | null
          linkedin_url: string | null
          location_bucket: Database["public"]["Enums"]["location_bucket"] | null
          name: string
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          owner: string | null
          phone: string | null
          pipeline_stage: Database["public"]["Enums"]["pipeline_stage"]
          screen_out_reason: string | null
          shortlisted: boolean
          source: string | null
          sourced_by: string
          updated_at: string
        }
        Insert: {
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          current_firm?: string | null
          current_title?: string | null
          date_sourced?: string | null
          email?: string | null
          feedback_transformari?: string | null
          fnk_comments?: string | null
          id?: string
          ir_functions?: Database["public"]["Enums"]["ir_function"][]
          last_contact_date?: string | null
          linkedin_url?: string | null
          location_bucket?:
            | Database["public"]["Enums"]["location_bucket"]
            | null
          name: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          owner?: string | null
          phone?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          screen_out_reason?: string | null
          shortlisted?: boolean
          source?: string | null
          sourced_by?: string
          updated_at?: string
        }
        Update: {
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          current_firm?: string | null
          current_title?: string | null
          date_sourced?: string | null
          email?: string | null
          feedback_transformari?: string | null
          fnk_comments?: string | null
          id?: string
          ir_functions?: Database["public"]["Enums"]["ir_function"][]
          last_contact_date?: string | null
          linkedin_url?: string | null
          location_bucket?:
            | Database["public"]["Enums"]["location_bucket"]
            | null
          name?: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          owner?: string | null
          phone?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          screen_out_reason?: string | null
          shortlisted?: boolean
          source?: string | null
          sourced_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      pe_firms: {
        Row: {
          aum_b: number | null
          aum_source: string | null
          aum_usd: number | null
          created_at: string
          hq: string | null
          hq_city: string | null
          hq_state: string | null
          id: string
          layer: string | null
          location: string | null
          name: string
          next_layer_tag: string | null
          notes: string | null
          status: Database["public"]["Enums"]["pe_status"]
          tier: Database["public"]["Enums"]["pe_tier"] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          aum_b?: number | null
          aum_source?: string | null
          aum_usd?: number | null
          created_at?: string
          hq?: string | null
          hq_city?: string | null
          hq_state?: string | null
          id?: string
          layer?: string | null
          location?: string | null
          name: string
          next_layer_tag?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["pe_status"]
          tier?: Database["public"]["Enums"]["pe_tier"] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          aum_b?: number | null
          aum_source?: string | null
          aum_usd?: number | null
          created_at?: string
          hq?: string | null
          hq_city?: string | null
          hq_state?: string | null
          id?: string
          layer?: string | null
          location?: string | null
          name?: string
          next_layer_tag?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["pe_status"]
          tier?: Database["public"]["Enums"]["pe_tier"] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "recruiter" | "client"
      ir_function: "Fundraising/BD" | "Client Services/LP Reporting" | "Unclear"
      location_bucket:
        | "Florida"
        | "Texas"
        | "Tri-State"
        | "Other US"
        | "International"
      pe_status:
        | "Target"
        | "Contacted"
        | "Sourced From"
        | "Declined"
        | "Not Relevant"
      pe_tier: "Tier 1" | "Tier 2" | "Tier 3"
      pipeline_stage:
        | "Sourced"
        | "For Sean - Please reach out"
        | "Reached Out"
        | "Reached Out-Referral"
        | "Responded/Scheduled for Screening"
        | "Profile Screened by Sam"
        | "Profile Screened by Stephanie"
        | "Initial Screening (Sam/Stephanie)"
        | "Final Screening (Sean)"
        | "Client Interviews"
        | "Offer"
        | "Placed"
        | "Rejected by Candidate"
        | "Rejected by Transformari"
        | "Rejected by Client"
        | "Rejected by GPR (Felix)"
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
      app_role: ["recruiter", "client"],
      ir_function: [
        "Fundraising/BD",
        "Client Services/LP Reporting",
        "Unclear",
      ],
      location_bucket: [
        "Florida",
        "Texas",
        "Tri-State",
        "Other US",
        "International",
      ],
      pe_status: [
        "Target",
        "Contacted",
        "Sourced From",
        "Declined",
        "Not Relevant",
      ],
      pe_tier: ["Tier 1", "Tier 2", "Tier 3"],
      pipeline_stage: [
        "Sourced",
        "For Sean - Please reach out",
        "Reached Out",
        "Reached Out-Referral",
        "Responded/Scheduled for Screening",
        "Profile Screened by Sam",
        "Profile Screened by Stephanie",
        "Initial Screening (Sam/Stephanie)",
        "Final Screening (Sean)",
        "Client Interviews",
        "Offer",
        "Placed",
        "Rejected by Candidate",
        "Rejected by Transformari",
        "Rejected by Client",
        "Rejected by GPR (Felix)",
      ],
    },
  },
} as const
