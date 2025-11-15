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
    PostgrestVersion: "13.0.5"
  }
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
      activities: {
        Row: {
          contact_id: number | null
          content: string
          created_at: string | null
          id: number
          is_read: boolean | null
          opportunity_id: number | null
          quote_id: number | null
          team_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          contact_id?: number | null
          content: string
          created_at?: string | null
          id?: never
          is_read?: boolean | null
          opportunity_id?: number | null
          quote_id?: number | null
          team_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          contact_id?: number | null
          content?: string
          created_at?: string | null
          id?: never
          is_read?: boolean | null
          opportunity_id?: number | null
          quote_id?: number | null
          team_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_log: {
        Row: {
          action_type: string
          created_at: string
          id: number
          team_id: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: number
          team_id: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: number
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_jobs: {
        Row: {
          assigned_tasks_summary: Json | null
          created_at: string
          dialogue_flow: Json | null
          error_message: string | null
          id: string
          key_moments: Json | null
          participants: Json | null
          project_id: string | null
          speaker_identification: Json | null
          status: Database["public"]["Enums"]["audio_job_status"]
          storage_path: string
          summary: string | null
          team_id: string
          transcription_text: string | null
          user_id: string
        }
        Insert: {
          assigned_tasks_summary?: Json | null
          created_at?: string
          dialogue_flow?: Json | null
          error_message?: string | null
          id?: string
          key_moments?: Json | null
          participants?: Json | null
          project_id?: string | null
          speaker_identification?: Json | null
          status?: Database["public"]["Enums"]["audio_job_status"]
          storage_path: string
          summary?: string | null
          team_id: string
          transcription_text?: string | null
          user_id: string
        }
        Update: {
          assigned_tasks_summary?: Json | null
          created_at?: string
          dialogue_flow?: Json | null
          error_message?: string | null
          id?: string
          key_moments?: Json | null
          participants?: Json | null
          project_id?: string | null
          speaker_identification?: Json | null
          status?: Database["public"]["Enums"]["audio_job_status"]
          storage_path?: string
          summary?: string | null
          team_id?: string
          transcription_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_jobs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      blacklist_rules: {
        Row: {
          created_at: string
          id: number
          rule_type: string
          team_id: string | null
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: number
          rule_type: string
          team_id?: string | null
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: number
          rule_type?: string
          team_id?: string | null
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "blacklist_rules_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_templates: {
        Row: {
          content: string | null
          created_at: string
          goal: string | null
          id: number
          name: string
          target_audience: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          goal?: string | null
          id?: number
          name: string
          target_audience?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          goal?: string | null
          id?: number
          name?: string
          target_audience?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          campaign_date: string
          content: string | null
          created_at: string | null
          goal: string | null
          id: number
          metrics: Json | null
          name: string
          sent_at: string | null
          status: string | null
          subject: string | null
          target_audience: string | null
          team_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          campaign_date: string
          content?: string | null
          created_at?: string | null
          goal?: string | null
          id?: number
          metrics?: Json | null
          name: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          target_audience?: string | null
          team_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          campaign_date?: string
          content?: string | null
          created_at?: string | null
          goal?: string | null
          id?: number
          metrics?: Json | null
          name?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          target_audience?: string | null
          team_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: number
          name: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: number
          name: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: number
          name?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: Json | null
          birthday: string | null
          children_count: number | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          empresa: string | null
          estat: string | null
          gender: string | null
          hobbies: string[] | null
          id: number
          industry: string | null
          job_title: string | null
          last_interaction_at: string | null
          lead_source: string | null
          marital_status: string | null
          nom: string
          notes: string | null
          partner_name: string | null
          postal_code: string | null
          social_media: Json | null
          street: string | null
          supplier_id: string | null
          tax_id: string | null
          team_id: string | null
          telefon: string | null
          ubicacio: string | null
          ultim_contacte: string | null
          user_id: string | null
          valor: number | null
        }
        Insert: {
          address?: Json | null
          birthday?: string | null
          children_count?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          empresa?: string | null
          estat?: string | null
          gender?: string | null
          hobbies?: string[] | null
          id?: number
          industry?: string | null
          job_title?: string | null
          last_interaction_at?: string | null
          lead_source?: string | null
          marital_status?: string | null
          nom: string
          notes?: string | null
          partner_name?: string | null
          postal_code?: string | null
          social_media?: Json | null
          street?: string | null
          supplier_id?: string | null
          tax_id?: string | null
          team_id?: string | null
          telefon?: string | null
          ubicacio?: string | null
          ultim_contacte?: string | null
          user_id?: string | null
          valor?: number | null
        }
        Update: {
          address?: Json | null
          birthday?: string | null
          children_count?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          empresa?: string | null
          estat?: string | null
          gender?: string | null
          hobbies?: string[] | null
          id?: number
          industry?: string | null
          job_title?: string | null
          last_interaction_at?: string | null
          lead_source?: string | null
          marital_status?: string | null
          nom?: string
          notes?: string | null
          partner_name?: string | null
          postal_code?: string | null
          social_media?: Json | null
          street?: string | null
          supplier_id?: string | null
          tax_id?: string | null
          team_id?: string | null
          telefon?: string | null
          ubicacio?: string | null
          ultim_contacte?: string | null
          user_id?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contact_supplier"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          id: number
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          name: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: never
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string | null
          created_at: string
          id: number
          name: string
          subject: string | null
          team_id: string | null
          user_id: string
          variables: Json | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: number
          name: string
          subject?: string | null
          team_id?: string | null
          user_id: string
          variables?: Json | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: number
          name?: string
          subject?: string | null
          team_id?: string | null
          user_id?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_attachments: {
        Row: {
          expense_id: number
          file_path: string
          filename: string
          id: string
          mime_type: string | null
          team_id: string | null
          uploaded_at: string | null
          user_id: string | null
        }
        Insert: {
          expense_id: number
          file_path: string
          filename: string
          id?: string
          mime_type?: string | null
          team_id?: string | null
          uploaded_at?: string | null
          user_id?: string | null
        }
        Update: {
          expense_id?: number
          file_path?: string
          filename?: string
          id?: string
          mime_type?: string | null
          team_id?: string | null
          uploaded_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_attachments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          description: string | null
          id: string
          name: string
          team_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          team_id: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_item_taxes: {
        Row: {
          amount: number
          expense_item_id: string
          id: string
          name: string
          rate: number
          tax_rate_id: string
          team_id: string
        }
        Insert: {
          amount: number
          expense_item_id: string
          id?: string
          name: string
          rate: number
          tax_rate_id: string
          team_id: string
        }
        Update: {
          amount?: number
          expense_item_id?: string
          id?: string
          name?: string
          rate?: number
          tax_rate_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_item_taxes_expense_item_id_fkey"
            columns: ["expense_item_id"]
            isOneToOne: false
            referencedRelation: "expense_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_item_taxes_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_item_taxes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_items: {
        Row: {
          created_at: string | null
          description: string
          expense_id: number
          id: string
          quantity: number
          team_id: string | null
          total: number | null
          unit_price: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          expense_id: number
          id?: string
          quantity?: number
          team_id?: string | null
          total?: number | null
          unit_price?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          expense_id?: number
          id?: string
          quantity?: number
          team_id?: string | null
          total?: number | null
          unit_price?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_items_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          category_id: string | null
          created_at: string
          currency: string
          description: string
          discount_amount: number | null
          discount_rate: number | null
          due_date: string | null
          expense_date: string
          extra_data: Json | null
          id: number
          invoice_number: string | null
          is_billable: boolean
          is_reimbursable: boolean
          legacy_category_name: string | null
          legacy_tax_amount: number | null
          legacy_tax_rate: number | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          project_id: string | null
          retention_amount: number
          status: Database["public"]["Enums"]["expense_status"]
          subtotal: number | null
          supplier_id: string | null
          tax_amount: number
          team_id: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          currency?: string
          description: string
          discount_amount?: number | null
          discount_rate?: number | null
          due_date?: string | null
          expense_date: string
          extra_data?: Json | null
          id?: number
          invoice_number?: string | null
          is_billable?: boolean
          is_reimbursable?: boolean
          legacy_category_name?: string | null
          legacy_tax_amount?: number | null
          legacy_tax_rate?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          project_id?: string | null
          retention_amount?: number
          status?: Database["public"]["Enums"]["expense_status"]
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number
          team_id?: string | null
          total_amount: number
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          discount_amount?: number | null
          discount_rate?: number | null
          due_date?: string | null
          expense_date?: string
          extra_data?: Json | null
          id?: number
          invoice_number?: string | null
          is_billable?: boolean
          is_reimbursable?: boolean
          legacy_category_name?: string | null
          legacy_tax_amount?: number | null
          legacy_tax_rate?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          project_id?: string | null
          retention_amount?: number
          status?: Database["public"]["Enums"]["expense_status"]
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number
          team_id?: string | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_permissions: {
        Row: {
          created_at: string | null
          grantee_user_id: string
          id: string
          target_user_id: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          grantee_user_id: string
          id?: string
          target_user_id: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          grantee_user_id?: string
          id?: string
          target_user_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_permissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          email: string
          id: string
          inviter_name: string | null
          role: string
          status: string | null
          team_id: string | null
          team_name: string | null
          token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          inviter_name?: string | null
          role: string
          status?: string | null
          team_id?: string | null
          team_name?: string | null
          token?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          inviter_name?: string | null
          role?: string
          status?: string | null
          team_id?: string | null
          team_name?: string | null
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_attachments: {
        Row: {
          file_path: string
          filename: string
          id: string
          invoice_id: number
          mime_type: string | null
          team_id: string | null
          uploaded_at: string | null
        }
        Insert: {
          file_path: string
          filename: string
          id?: string
          invoice_id: number
          mime_type?: string | null
          team_id?: string | null
          uploaded_at?: string | null
        }
        Update: {
          file_path?: string
          filename?: string
          id?: string
          invoice_id?: number
          mime_type?: string | null
          team_id?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_attachments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_attachments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_deliveries: {
        Row: {
          delivered_at: string
          id: string
          invoice_id: number
          method: string
          recipient: string | null
          team_id: string
        }
        Insert: {
          delivered_at?: string
          id?: string
          invoice_id: number
          method: string
          recipient?: string | null
          team_id: string
        }
        Update: {
          delivered_at?: string
          id?: string
          invoice_id?: number
          method?: string
          recipient?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_deliveries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_deliveries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_item_taxes: {
        Row: {
          amount: number
          id: string
          invoice_item_id: string
          name: string
          rate: number
          tax_rate_id: string
          team_id: string
        }
        Insert: {
          amount: number
          id?: string
          invoice_item_id: string
          name: string
          rate: number
          tax_rate_id: string
          team_id: string
        }
        Update: {
          amount?: number
          id?: string
          invoice_item_id?: string
          name?: string
          rate?: number
          tax_rate_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_item_taxes_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_item_taxes_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_item_taxes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          invoice_id: number
          product_id: number | null
          quantity: number
          reference_sku: string | null
          tax_rate: number | null
          team_id: string | null
          total: number | null
          unit_price: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          invoice_id: number
          product_id?: number | null
          quantity?: number
          reference_sku?: string | null
          tax_rate?: number | null
          team_id?: string | null
          total?: number | null
          unit_price?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          invoice_id?: number
          product_id?: number | null
          quantity?: number
          reference_sku?: string | null
          tax_rate?: number | null
          team_id?: string | null
          total?: number | null
          unit_price?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          budget_id: number | null
          client_address: string | null
          client_email: string | null
          client_name: string | null
          client_reference: string | null
          client_tax_id: string | null
          company_address: string | null
          company_email: string | null
          company_logo_url: string | null
          company_name: string | null
          company_tax_id: string | null
          contact_id: number | null
          created_at: string
          currency: string
          discount: number | null
          discount_amount: number | null
          due_date: string | null
          extra_data: Json | null
          id: number
          invoice_number: string | null
          issue_date: string
          language: string
          legacy_tax_amount: number | null
          legacy_tax_rate: number | null
          notes: string | null
          paid_at: string | null
          payment_details: string | null
          project_id: string | null
          quote_id: number | null
          retention_amount: number
          sent_at: string | null
          shipping_cost: number | null
          status: string
          subtotal: number | null
          tax: number | null
          tax_amount: number
          team_id: string | null
          terms: string | null
          total_amount: number
          updated_at: string | null
          user_id: string
          verifactu_previous_signature: string | null
          verifactu_qr_data: string | null
          verifactu_signature: string | null
          verifactu_uuid: string | null
        }
        Insert: {
          budget_id?: number | null
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          client_reference?: string | null
          client_tax_id?: string | null
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_tax_id?: string | null
          contact_id?: number | null
          created_at?: string
          currency?: string
          discount?: number | null
          discount_amount?: number | null
          due_date?: string | null
          extra_data?: Json | null
          id?: number
          invoice_number?: string | null
          issue_date: string
          language?: string
          legacy_tax_amount?: number | null
          legacy_tax_rate?: number | null
          notes?: string | null
          paid_at?: string | null
          payment_details?: string | null
          project_id?: string | null
          quote_id?: number | null
          retention_amount?: number
          sent_at?: string | null
          shipping_cost?: number | null
          status: string
          subtotal?: number | null
          tax?: number | null
          tax_amount?: number
          team_id?: string | null
          terms?: string | null
          total_amount: number
          updated_at?: string | null
          user_id: string
          verifactu_previous_signature?: string | null
          verifactu_qr_data?: string | null
          verifactu_signature?: string | null
          verifactu_uuid?: string | null
        }
        Update: {
          budget_id?: number | null
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          client_reference?: string | null
          client_tax_id?: string | null
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_tax_id?: string | null
          contact_id?: number | null
          created_at?: string
          currency?: string
          discount?: number | null
          discount_amount?: number | null
          due_date?: string | null
          extra_data?: Json | null
          id?: number
          invoice_number?: string | null
          issue_date?: string
          language?: string
          legacy_tax_amount?: number | null
          legacy_tax_rate?: number | null
          notes?: string | null
          paid_at?: string | null
          payment_details?: string | null
          project_id?: string | null
          quote_id?: number | null
          retention_amount?: number
          sent_at?: string | null
          shipping_cost?: number | null
          status?: string
          subtotal?: number | null
          tax?: number | null
          tax_amount?: number
          team_id?: string | null
          terms?: string | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string
          verifactu_previous_signature?: string | null
          verifactu_qr_data?: string | null
          verifactu_signature?: string | null
          verifactu_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_quote_id"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          address_text: string | null
          budget: number | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          postcode: string | null
          region: string | null
          required_skills: string[] | null
          status: Database["public"]["Enums"]["job_status"]
          team_id: string
          title: string
        }
        Insert: {
          address_text?: string | null
          budget?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          postcode?: string | null
          region?: string | null
          required_skills?: string[] | null
          status?: Database["public"]["Enums"]["job_status"]
          team_id: string
          title: string
        }
        Update: {
          address_text?: string | null
          budget?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          postcode?: string | null
          region?: string | null
          required_skills?: string[] | null
          status?: Database["public"]["Enums"]["job_status"]
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: number
          is_read: boolean
          message: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_read?: boolean
          message: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          is_read?: boolean
          message?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          close_date: string | null
          contact_id: number | null
          created_at: string | null
          description: string | null
          id: number
          last_updated_at: string | null
          name: string
          pipeline_stage_id: number | null
          probability: number | null
          source: string | null
          stage_name: string | null
          team_id: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          close_date?: string | null
          contact_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          last_updated_at?: string | null
          name: string
          pipeline_stage_id?: number | null
          probability?: number | null
          source?: string | null
          stage_name?: string | null
          team_id?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          close_date?: string | null
          contact_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          last_updated_at?: string | null
          name?: string
          pipeline_stage_id?: number | null
          probability?: number | null
          source?: string | null
          stage_name?: string | null
          team_id?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string | null
          id: number
          name: string
          pipeline_id: number
          position: number
          stage_type: string | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: number
          name: string
          pipeline_id: number
          position: number
          stage_type?: string | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: number
          name?: string
          pipeline_id?: number
          position?: number
          stage_type?: string | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          id: number
          name: string
          position: number
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          position?: number
          team_id: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          position?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_documents: {
        Row: {
          content: string
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          content: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          content?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      prices: {
        Row: {
          active: boolean | null
          currency: string | null
          description: string | null
          id: string
          interval: string | null
          interval_count: number | null
          metadata: Json | null
          product_id: string | null
          trial_period_days: number | null
          type: string | null
          unit_amount: number | null
        }
        Insert: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id: string
          interval?: string | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: string | null
          unit_amount?: number | null
        }
        Update: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id?: string
          interval?: string | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: string | null
          unit_amount?: number | null
        }
        Relationships: []
      }
      product_taxes: {
        Row: {
          id: string
          product_id: number
          tax_rate_id: string
          team_id: string
        }
        Insert: {
          id?: string
          product_id: number
          tax_rate_id: string
          team_id: string
        }
        Update: {
          id?: string
          product_id?: number
          tax_rate_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_taxes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_taxes_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_taxes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          discount: number | null
          id: number
          is_active: boolean
          legacy_tax_rate: number | null
          name: string
          price: number
          team_id: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          discount?: number | null
          id?: number
          is_active?: boolean
          legacy_tax_rate?: number | null
          name: string
          price: number
          team_id?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          discount?: number | null
          id?: number
          is_active?: boolean
          legacy_tax_rate?: number | null
          name?: string
          price?: number
          team_id?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_team_id: string | null
          avatar_url: string | null
          billing_address: Json | null
          email: string | null
          full_name: string | null
          id: string
          is_public_profile: boolean | null
          job_title: string | null
          logo_url: string | null
          onboarding_completed: boolean
          payment_method: Json | null
          phone: string | null
          services: Json | null
          summary: string | null
          website_url: string | null
        }
        Insert: {
          active_team_id?: string | null
          avatar_url?: string | null
          billing_address?: Json | null
          email?: string | null
          full_name?: string | null
          id: string
          is_public_profile?: boolean | null
          job_title?: string | null
          logo_url?: string | null
          onboarding_completed?: boolean
          payment_method?: Json | null
          phone?: string | null
          services?: Json | null
          summary?: string | null
          website_url?: string | null
        }
        Update: {
          active_team_id?: string | null
          avatar_url?: string | null
          billing_address?: Json | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_public_profile?: boolean | null
          job_title?: string | null
          logo_url?: string | null
          onboarding_completed?: boolean
          payment_method?: Json | null
          phone?: string | null
          services?: Json | null
          summary?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_team_id_fkey"
            columns: ["active_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      project_layouts: {
        Row: {
          created_at: string
          id: number
          node_id: string
          position_x: number
          position_y: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          node_id: string
          position_x: number
          position_y: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          node_id?: string
          position_x?: number
          position_y?: number
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          description: string
          id: number
          product_id: number | null
          quantity: number
          quote_id: number
          team_id: string
          total: number
          unit_price: number
          user_id: string | null
        }
        Insert: {
          description: string
          id?: number
          product_id?: number | null
          quantity: number
          quote_id: number
          team_id: string
          total: number
          unit_price: number
          user_id?: string | null
        }
        Update: {
          description?: string
          id?: number
          product_id?: number | null
          quantity?: number
          quote_id?: number
          team_id?: string
          total?: number
          unit_price?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          contact_id: number | null
          created_at: string | null
          discount_amount: number | null
          expiry_date: string | null
          id: number
          issue_date: string
          notes: string | null
          opportunity_id: number | null
          quote_number: string
          rejection_reason: string | null
          secure_id: string
          send_at: string | null
          sent_at: string | null
          sequence_number: number | null
          show_quantity: boolean
          status: Database["public"]["Enums"]["quote_status"] | null
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          team_id: string | null
          theme_color: string | null
          total_amount: number | null
          user_id: string
        }
        Insert: {
          contact_id?: number | null
          created_at?: string | null
          discount_amount?: number | null
          expiry_date?: string | null
          id?: number
          issue_date: string
          notes?: string | null
          opportunity_id?: number | null
          quote_number: string
          rejection_reason?: string | null
          secure_id?: string
          send_at?: string | null
          sent_at?: string | null
          sequence_number?: number | null
          show_quantity?: boolean
          status?: Database["public"]["Enums"]["quote_status"] | null
          subtotal: number
          tax_amount?: number | null
          tax_rate?: number | null
          team_id?: string | null
          theme_color?: string | null
          total_amount?: number | null
          user_id: string
        }
        Update: {
          contact_id?: number | null
          created_at?: string | null
          discount_amount?: number | null
          expiry_date?: string | null
          id?: number
          issue_date?: string
          notes?: string | null
          opportunity_id?: number | null
          quote_number?: string
          rejection_reason?: string | null
          secure_id?: string
          send_at?: string | null
          sent_at?: string | null
          sequence_number?: number | null
          show_quantity?: boolean
          status?: Database["public"]["Enums"]["quote_status"] | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          team_id?: string | null
          theme_color?: string | null
          total_amount?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members_with_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      services: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: never
          name: string
        }
        Update: {
          id?: never
          name?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          content: string | null
          created_at: string
          error_message: string | null
          id: number
          media_type: string | null
          media_url: string[] | null
          provider: string[]
          published_at: string | null
          scheduled_at: string | null
          status: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          error_message?: string | null
          id?: number
          media_type?: string | null
          media_url?: string[] | null
          provider: string[]
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          error_message?: string | null
          id?: number
          media_type?: string | null
          media_url?: string[] | null
          provider?: string[]
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          team_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          plan_id: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          team_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          nif: string | null
          nom: string
          team_id: string | null
          telefon: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          nif?: string | null
          nom: string
          team_id?: string | null
          telefon?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          nif?: string | null
          nom?: string
          team_id?: string | null
          telefon?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          asigned_date: string | null
          checklist_progress: Json | null
          contact_id: number | null
          created_at: string
          department_id: number | null
          description: string | null
          description_json: Json | null
          due_date: string | null
          duration: number | null
          finish_date: string | null
          google_calendar_id: string | null
          id: number
          is_active: boolean | null
          is_completed: boolean
          priority: Database["public"]["Enums"]["task_priority"] | null
          team_id: string | null
          time_tracking_log: Json | null
          title: string
          user_asign_id: string | null
          user_id: string
        }
        Insert: {
          asigned_date?: string | null
          checklist_progress?: Json | null
          contact_id?: number | null
          created_at?: string
          department_id?: number | null
          description?: string | null
          description_json?: Json | null
          due_date?: string | null
          duration?: number | null
          finish_date?: string | null
          google_calendar_id?: string | null
          id?: number
          is_active?: boolean | null
          is_completed?: boolean
          priority?: Database["public"]["Enums"]["task_priority"] | null
          team_id?: string | null
          time_tracking_log?: Json | null
          title: string
          user_asign_id?: string | null
          user_id: string
        }
        Update: {
          asigned_date?: string | null
          checklist_progress?: Json | null
          contact_id?: number | null
          created_at?: string
          department_id?: number | null
          description?: string | null
          description_json?: Json | null
          due_date?: string | null
          duration?: number | null
          finish_date?: string | null
          google_calendar_id?: string | null
          id?: number
          is_active?: boolean | null
          is_completed?: boolean
          priority?: Database["public"]["Enums"]["task_priority"] | null
          team_id?: string | null
          time_tracking_log?: Json | null
          title?: string
          user_asign_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_asign_id_fkey"
            columns: ["user_asign_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_asign_id_fkey"
            columns: ["user_asign_id"]
            isOneToOne: false
            referencedRelation: "team_members_with_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          rate: number
          team_id: string
          type: Database["public"]["Enums"]["tax_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          rate: number
          team_id: string
          type?: Database["public"]["Enums"]["tax_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          rate?: number
          team_id?: string
          type?: Database["public"]["Enums"]["tax_type"]
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_credentials: {
        Row: {
          access_token: string | null
          connected_by_user_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          provider: string
          provider_page_id: string | null
          provider_page_name: string | null
          provider_user_id: string | null
          refresh_token: string | null
          team_id: string
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          connected_by_user_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          provider: string
          provider_page_id?: string | null
          provider_page_name?: string | null
          provider_user_id?: string | null
          refresh_token?: string | null
          team_id: string
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          connected_by_user_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          provider?: string
          provider_page_id?: string | null
          provider_page_name?: string | null
          provider_user_id?: string | null
          refresh_token?: string | null
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_credentials_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          default_pipeline_id: number | null
          email: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          owner_id: string
          phone: string | null
          postal_code: string | null
          region: string | null
          sector: string | null
          services: Json | null
          street: string | null
          summary: string | null
          tax_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          default_pipeline_id?: number | null
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          owner_id: string
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          sector?: string | null
          services?: Json | null
          street?: string | null
          summary?: string | null
          tax_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          default_pipeline_id?: number | null
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          owner_id?: string
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          sector?: string | null
          services?: Json | null
          street?: string | null
          summary?: string | null
          tax_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_default_pipeline_id_fkey"
            columns: ["default_pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_assignments: {
        Row: {
          created_at: string
          deal_id: number | null
          id: number
          team_id: string
          ticket_id: number
        }
        Insert: {
          created_at?: string
          deal_id?: number | null
          id?: number
          team_id: string
          ticket_id: number
        }
        Update: {
          created_at?: string
          deal_id?: number | null
          id?: number
          team_id?: string
          ticket_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_assignments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "enriched_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          attachments: Json | null
          body: string | null
          contact_id: number | null
          created_at: string | null
          id: number
          preview: string | null
          provider: string | null
          provider_message_id: string | null
          sender_email: string | null
          sender_name: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          body?: string | null
          contact_id?: number | null
          created_at?: string | null
          id?: number
          preview?: string | null
          provider?: string | null
          provider_message_id?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          body?: string | null
          contact_id?: number | null
          created_at?: string | null
          id?: number
          preview?: string | null
          provider?: string | null
          provider_message_id?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credentials: {
        Row: {
          access_token: string | null
          config: Json | null
          created_at: string | null
          encrypted_password: string | null
          expires_at: string | null
          id: number
          provider: string
          provider_page_id: string | null
          provider_user_id: string | null
          refresh_token: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          config?: Json | null
          created_at?: string | null
          encrypted_password?: string | null
          expires_at?: string | null
          id?: number
          provider: string
          provider_page_id?: string | null
          provider_user_id?: string | null
          refresh_token?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          config?: Json | null
          created_at?: string | null
          encrypted_password?: string | null
          expires_at?: string | null
          id?: number
          provider?: string
          provider_page_id?: string | null
          provider_user_id?: string | null
          refresh_token?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_credentials_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      enriched_tickets: {
        Row: {
          attachments: Json | null
          body: string | null
          contact_email: string | null
          contact_id: number | null
          contact_nom: string | null
          created_at: string | null
          id: number | null
          preview: string | null
          profile_avatar_url: string | null
          profile_full_name: string | null
          provider: string | null
          provider_message_id: string | null
          sender_email: string | null
          sender_name: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          type: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      team_members_with_profiles: {
        Row: {
          avatar_url: string | null
          email: string | null
          full_name: string | null
          role: string | null
          team_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      accept_invitation: {
        Args: { invitation_token: string }
        Returns: undefined
      }
      accept_invitation_and_set_active_team: {
        Args: { invite_token: string }
        Returns: Json
      }
      accept_personal_invitation: {
        Args: { invitation_id: string }
        Returns: Json
      }
      accept_quote_and_create_invoice: {
        Args: { p_secure_id: string }
        Returns: undefined
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      can_access_ticket: { Args: { ticket_user_id: string }; Returns: boolean }
      create_new_organization: { Args: { org_name: string }; Returns: string }
      create_team_with_defaults: {
        Args: { team_name: string }
        Returns: string
      }
      delete_user_credential: {
        Args: { provider_name: string }
        Returns: undefined
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      dropgeometrytable:
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_active_team_id: { Args: never; Returns: string }
      get_active_team_role: { Args: never; Returns: string }
      get_column_valid_values: {
        Args: { p_ref_table_name: string }
        Returns: {
          value: string
        }[]
      }
      get_crm_dashboard_data: { Args: never; Returns: Json }
      get_crm_overview: { Args: never; Returns: Json }
      get_current_jwt_claims: { Args: never; Returns: string }
      get_current_team_id: { Args: never; Returns: string }
      get_dashboard_stats: {
        Args: never
        Returns: {
          active_clients: number
          expenses_current_month: number
          expenses_previous_month: number
          invoiced_current_month: number
          invoiced_previous_month: number
          opportunities: number
          pending_total: number
          total_contacts: number
        }[]
      }
      get_dashboard_stats_for_team: {
        Args: { p_team_id: string }
        Returns: {
          active_clients: number
          expenses_current_month: number
          expenses_previous_month: number
          invoiced_current_month: number
          invoiced_previous_month: number
          opportunities: number
          pending_total: number
          total_contacts: number
          total_value: number
        }[]
      }
      get_filtered_expenses: {
        Args: {
          p_category_id?: string
          p_limit?: number
          p_offset?: number
          p_search_term?: string
          p_sort_by?: string
          p_sort_order?: string
          p_status?: string
          p_team_id: string
        }
        Returns: {
          category_id: string
          category_name: string
          created_at: string
          currency: string
          description: string
          discount_amount: number
          due_date: string
          expense_date: string
          extra_data: Json
          full_count: number
          id: number
          invoice_number: string
          is_billable: boolean
          is_reimbursable: boolean
          notes: string
          payment_date: string
          payment_method: string
          project_id: string
          retention_amount: number
          status: Database["public"]["Enums"]["expense_status"]
          subtotal: number
          supplier_id: string
          supplier_nom: string
          tax_amount: number
          team_id: string
          total_amount: number
          user_id: string
        }[]
      }
      get_financial_summary: {
        Args: never
        Returns: {
          despeses: number
          facturat: number
          pendent: number
        }[]
      }
      get_inbox_received_count: {
        Args: { p_visible_user_ids: string[] }
        Returns: number
      }
      get_inbox_sent_count: {
        Args: { p_visible_user_ids: string[] }
        Returns: number
      }
      get_inbox_tickets: {
        Args: {
          p_active_filter: string
          p_limit: number
          p_offset: number
          p_search_term: string
          p_visible_user_ids: string[]
        }
        Returns: {
          attachments: Json
          body: string
          contact_email: string
          contact_id: number
          contact_nom: string
          created_at: string
          id: number
          preview: string
          profile_avatar_url: string
          profile_full_name: string
          provider: string
          provider_message_id: string
          sender_email: string
          sender_name: string
          sent_at: string
          status: string
          subject: string
          type: string
          user_id: string
        }[]
      }
      get_marketing_kpis: {
        Args: never
        Returns: {
          conversion_rate: number
          total_leads: number
        }[]
      }
      get_marketing_page_data: { Args: { p_team_id: string }; Returns: Json }
      get_my_team_id: { Args: never; Returns: string }
      get_my_teams: {
        Args: never
        Returns: {
          team_id: string
        }[]
      }
      get_quote_details: { Args: { p_quote_id: number }; Returns: Json }
      get_table_columns: {
        Args: { table_name_param: string }
        Returns: {
          column_name: string
        }[]
      }
      get_table_columns_excluding_security: {
        Args: { p_table_name: string }
        Returns: {
          column_name: string
        }[]
      }
      get_table_columns_info: {
        Args: { p_table_name: string }
        Returns: {
          column_name: string
          data_type: string
        }[]
      }
      get_table_columns_with_types: {
        Args: { p_table_name: string }
        Returns: {
          column_name: string
          data_type: string
        }[]
      }
      get_team_dashboard_data: { Args: never; Returns: Json }
      get_team_ticket_count: { Args: { p_team_id: string }; Returns: number }
      get_user_id_by_email: {
        Args: { email_to_check: string }
        Returns: string
      }
      get_user_team_context: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: Json
      }
      get_user_team_id: { Args: never; Returns: string }
      gettransactionid: { Args: never; Returns: unknown }
      handle_onboarding: {
        Args: {
          p_city: string
          p_company_name: string
          p_country: string
          p_email: string
          p_full_name: string
          p_latitude?: number
          p_longitude?: number
          p_phone: string
          p_postal_code: string
          p_region: string
          p_sector: string
          p_services: Json
          p_street: string
          p_summary: string
          p_tax_id: string
          p_user_id: string
          p_website: string
        }
        Returns: string
      }
      increment_invoice_sequence: {
        Args: { p_series: string; p_user_id: string }
        Returns: number
      }
      is_contact_on_public_quote: {
        Args: { contact_id_to_check: number }
        Returns: boolean
      }
      is_quote_public: { Args: { quote_id_to_check: number }; Returns: boolean }
      is_team_member: { Args: { team_id_to_check: string }; Returns: boolean }
      is_team_on_public_quote: {
        Args: { team_id_to_check: string }
        Returns: boolean
      }
      log_task_activity: {
        Args: { new_status_input: boolean; task_id_input: number }
        Returns: undefined
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      match_documents: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      match_platform_documents: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      populate_geometry_columns:
        | { Args: { use_typmod?: boolean }; Returns: string }
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      reject_quote_with_reason: {
        Args: { p_reason: string; p_secure_id: string }
        Returns: undefined
      }
      save_expense_with_items: {
        Args: {
          expense_data: Json
          items_data: Json
          p_expense_id_to_update: number
          p_team_id: string
          p_user_id: string
        }
        Returns: {
          category_id: string | null
          created_at: string
          currency: string
          description: string
          discount_amount: number | null
          discount_rate: number | null
          due_date: string | null
          expense_date: string
          extra_data: Json | null
          id: number
          invoice_number: string | null
          is_billable: boolean
          is_reimbursable: boolean
          legacy_category_name: string | null
          legacy_tax_amount: number | null
          legacy_tax_rate: number | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          project_id: string | null
          retention_amount: number
          status: Database["public"]["Enums"]["expense_status"]
          subtotal: number | null
          supplier_id: string | null
          tax_amount: number
          team_id: string | null
          total_amount: number
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "expenses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      save_refresh_token: {
        Args: { provider_name: string; refresh_token_value: string }
        Returns: undefined
      }
      search_expenses: {
        Args: {
          p_category: string
          p_limit: number
          p_offset: number
          p_search_term: string
          p_sort_by: string
          p_sort_order: string
          p_status: string
          p_team_id: string
        }
        Returns: {
          category: string
          created_at: string
          description: string
          discount_amount: number
          expense_date: string
          extra_data: Json
          full_count: number
          id: number
          invoice_number: string
          is_billable: boolean
          is_reimbursable: boolean
          notes: string
          payment_date: string
          payment_method: string
          project_id: string
          status: Database["public"]["Enums"]["expense_status"]
          subtotal: number
          supplier_id: string
          supplier_nom: string
          tax_amount: number
          tax_rate: number
          team_id: string
          total_amount: number
          user_id: string
        }[]
      }
      search_invoices: {
        Args: {
          page_limit?: number
          page_offset?: number
          search_term?: string
          sort_direction?: string
          sort_field?: string
          status_filter?: string
        }
        Returns: {
          client_name: string
          contact_id: number
          created_at: string
          due_date: string
          id: number
          invoice_number: string
          issue_date: string
          notes: string
          secure_id: string
          status: string
          team_id: string
          total_amount: number
          total_count: number
          user_id: string
        }[]
      }
      search_paginated_invoices: {
        Args: {
          contact_id_param?: number
          limit_param?: number
          offset_param?: number
          search_term_param?: string
          sort_by_param?: string
          sort_order_param?: string
          status_param?: string
          team_id_param: string
        }
        Returns: {
          client_name: string
          contact_id: number
          contact_nom: string
          due_date: string
          id: number
          invoice_number: string
          issue_date: string
          status: string
          total_amount: number
          total_count: number
        }[]
      }
      search_paginated_quotes: {
        Args: {
          limit_param?: number
          offset_param?: number
          search_term_param?: string
          sort_by_param?: string
          sort_order_param?: string
          status_param?: Database["public"]["Enums"]["quote_status"]
          team_id_param: string
        }
        Returns: {
          contact_empresa: string
          contact_id: number
          contact_nom: string
          created_at: string
          discount_amount: number
          expiry_date: string
          id: number
          issue_date: string
          notes: string
          opportunity_id: number
          quote_number: string
          rejection_reason: string
          secure_id: string
          send_at: string
          sent_at: string
          sequence_number: number
          show_quantity: boolean
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number
          team_id: string
          theme_color: string
          total_amount: number
          total_count: number
          user_id: string
        }[]
      }
      set_pipeline_stage_type: {
        Args: {
          p_pipeline_id: number
          p_stage_id: number
          p_stage_type: string
          p_team_id: string
        }
        Returns: undefined
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_askml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_contact_last_interaction: {
        Args: { contact_id_to_update: string }
        Returns: undefined
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_expense_with_items: {
        Args: {
          p_expense_details: Json
          p_expense_id: number
          p_expense_items: Json
          p_team_id: string
          p_user_id: string
        }
        Returns: {
          category_id: string | null
          created_at: string
          currency: string
          description: string
          discount_amount: number | null
          discount_rate: number | null
          due_date: string | null
          expense_date: string
          extra_data: Json | null
          id: number
          invoice_number: string | null
          is_billable: boolean
          is_reimbursable: boolean
          legacy_category_name: string | null
          legacy_tax_amount: number | null
          legacy_tax_rate: number | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          project_id: string | null
          retention_amount: number
          status: Database["public"]["Enums"]["expense_status"]
          subtotal: number | null
          supplier_id: string | null
          tax_amount: number
          team_id: string | null
          total_amount: number
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "expenses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      upsert_invoice_with_items: {
        Args: {
          invoice_data: Json
          items_data: Json
          team_id: string
          user_id: string
        }
        Returns: {
          saved_invoice_id: number
        }[]
      }
      upsert_quote_with_items: { Args: { quote_payload: Json }; Returns: Json }
    }
    Enums: {
      audio_job_status: "pending" | "processing" | "completed" | "failed"
      expense_status: "pending" | "paid" | "overdue" | "cancelled"
      invoice_status: "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled"
      job_status: "open" | "closed"
      opportunity_stage:
        | "Nou Lead"
        | "Contactat"
        | "Proposta Enviada"
        | "Negociaci├│"
        | "Guanyat"
        | "Perdut"
      quote_status: "Draft" | "Sent" | "Accepted" | "Declined" | "Invoiced"
      task_priority: "Baixa" | "Mitjana" | "Alta"
      tax_type: "vat" | "retention"
      ticket_filter: "tots" | "rebuts" | "enviats" | "noLlegits"
      ticket_status:
        | "Obert"
        | "En progr├®s"
        | "Esperant resposta"
        | "Tancat"
        | "Llegit"
      ticket_type: "rebut" | "enviat"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      audio_job_status: ["pending", "processing", "completed", "failed"],
      expense_status: ["pending", "paid", "overdue", "cancelled"],
      invoice_status: ["Draft", "Sent", "Paid", "Overdue", "Cancelled"],
      job_status: ["open", "closed"],
      opportunity_stage: [
        "Nou Lead",
        "Contactat",
        "Proposta Enviada",
        "Negociaci├│",
        "Guanyat",
        "Perdut",
      ],
      quote_status: ["Draft", "Sent", "Accepted", "Declined", "Invoiced"],
      task_priority: ["Baixa", "Mitjana", "Alta"],
      tax_type: ["vat", "retention"],
      ticket_filter: ["tots", "rebuts", "enviats", "noLlegits"],
      ticket_status: [
        "Obert",
        "En progr├®s",
        "Esperant resposta",
        "Tancat",
        "Llegit",
      ],
      ticket_type: ["rebut", "enviat"],
    },
  },
} as const
