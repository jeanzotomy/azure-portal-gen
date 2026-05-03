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
      application_tracking_otp: {
        Row: {
          attempts: number
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string | null
          file_name: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          parsed_data: Json | null
          project_id: string | null
          sharepoint_url: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          tax_amount: number
          total_amount: number
          type: Database["public"]["Enums"]["invoice_type"]
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          file_name?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          parsed_data?: Json | null
          project_id?: string | null
          sharepoint_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_amount?: number
          total_amount?: number
          type?: Database["public"]["Enums"]["invoice_type"]
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          file_name?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          parsed_data?: Json | null
          project_id?: string | null
          sharepoint_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_amount?: number
          total_amount?: number
          type?: Database["public"]["Enums"]["invoice_type"]
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          cover_letter_path: string | null
          created_at: string
          cv_path: string
          email: string
          full_name: string
          id: string
          interview_message: string | null
          job_id: string
          linkedin_url: string | null
          notes: string | null
          phone: string | null
          portfolio_url: string | null
          salary_expectation: string | null
          status: Database["public"]["Enums"]["application_status"]
          tracking_id: string | null
          updated_at: string
          user_id: string | null
          years_experience: number | null
        }
        Insert: {
          cover_letter_path?: string | null
          created_at?: string
          cv_path: string
          email: string
          full_name: string
          id?: string
          interview_message?: string | null
          job_id: string
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          portfolio_url?: string | null
          salary_expectation?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          tracking_id?: string | null
          updated_at?: string
          user_id?: string | null
          years_experience?: number | null
        }
        Update: {
          cover_letter_path?: string | null
          created_at?: string
          cv_path?: string
          email?: string
          full_name?: string
          id?: string
          interview_message?: string | null
          job_id?: string
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          portfolio_url?: string | null
          salary_expectation?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          tracking_id?: string | null
          updated_at?: string
          user_id?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          closing_date: string | null
          contract_duration: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          created_by: string
          department: string | null
          description: string
          id: string
          location: string
          renewable: boolean
          salary_range: string | null
          sector: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          closing_date?: string | null
          contract_duration?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by: string
          department?: string | null
          description: string
          id?: string
          location: string
          renewable?: boolean
          salary_range?: string | null
          sector?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          closing_date?: string | null
          contract_duration?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by?: string
          department?: string | null
          description?: string
          id?: string
          location?: string
          renewable?: boolean
          salary_range?: string | null
          sector?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_holder: string | null
          active: boolean
          bank: string | null
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["invoice_currency"]
          iban: string | null
          id: string
          instructions: string | null
          label: string
          mobile_number: string | null
          position: number
          swift: string | null
          type: Database["public"]["Enums"]["payment_method_type"]
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          active?: boolean
          bank?: string | null
          created_at?: string
          created_by: string
          currency?: Database["public"]["Enums"]["invoice_currency"]
          iban?: string | null
          id?: string
          instructions?: string | null
          label: string
          mobile_number?: string | null
          position?: number
          swift?: string | null
          type?: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          active?: boolean
          bank?: string | null
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["invoice_currency"]
          iban?: string | null
          id?: string
          instructions?: string | null
          label?: string
          mobile_number?: string | null
          position?: number
          swift?: string | null
          type?: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line: string | null
          blocked: boolean
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          location: string | null
          phone: string | null
          signature_url: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line?: string | null
          blocked?: boolean
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          phone?: string | null
          signature_url?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string | null
          blocked?: boolean
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          phone?: string | null
          signature_url?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: string | null
          created_at: string
          deadline: string | null
          description: string | null
          gestionnaire_id: string | null
          id: string
          name: string
          priority: string
          progress: number
          project_number: string | null
          sharepoint_folder_url: string | null
          status: string
          technologies: string | null
          total_budget: number | null
          total_paid: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          gestionnaire_id?: string | null
          id?: string
          name: string
          priority?: string
          progress?: number
          project_number?: string | null
          sharepoint_folder_url?: string | null
          status?: string
          technologies?: string | null
          total_budget?: number | null
          total_paid?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          gestionnaire_id?: string | null
          id?: string
          name?: string
          priority?: string
          progress?: number
          project_number?: string | null
          sharepoint_folder_url?: string | null
          status?: string
          technologies?: string | null
          total_budget?: number | null
          total_paid?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sectors: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_catalog: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          default_currency: Database["public"]["Enums"]["invoice_currency"]
          default_unit: string
          default_unit_price: number
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          default_currency?: Database["public"]["Enums"]["invoice_currency"]
          default_unit?: string
          default_unit_price?: number
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          default_currency?: Database["public"]["Enums"]["invoice_currency"]
          default_unit?: string
          default_unit_price?: number
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_clients: {
        Row: {
          address_line: string | null
          city: string | null
          client_name: string
          contact_person: string | null
          country: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          nif: string | null
          notes: string | null
          phone: string | null
          rccm: string | null
          sharepoint_folder_id: string | null
          sharepoint_folder_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          client_name: string
          contact_person?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          nif?: string | null
          notes?: string | null
          phone?: string | null
          rccm?: string | null
          sharepoint_folder_id?: string | null
          sharepoint_folder_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_line?: string | null
          city?: string | null
          client_name?: string
          contact_person?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          nif?: string | null
          notes?: string | null
          phone?: string | null
          rccm?: string | null
          sharepoint_folder_id?: string | null
          sharepoint_folder_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      service_invoice_items: {
        Row: {
          catalog_id: string | null
          created_at: string
          description: string
          discount_rate: number
          id: string
          invoice_id: string
          position: number
          quantity: number
          subtitle: string | null
          total: number
          unit: string
          unit_price: number
        }
        Insert: {
          catalog_id?: string | null
          created_at?: string
          description: string
          discount_rate?: number
          id?: string
          invoice_id: string
          position?: number
          quantity?: number
          subtitle?: string | null
          total?: number
          unit?: string
          unit_price?: number
        }
        Update: {
          catalog_id?: string | null
          created_at?: string
          description?: string
          discount_rate?: number
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          subtitle?: string | null
          total?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_invoice_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "service_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      service_invoices: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["invoice_currency"]
          discount_amount: number
          discount_rate: number
          docx_generated_at: string | null
          due_date: string | null
          early_payment_discount_amount: number
          early_payment_discount_rate: number
          id: string
          invoice_date: string
          invoice_number: string | null
          notes: string | null
          paid_at: string | null
          payment_details: Json
          payment_method_ids: string[]
          pdf_generated_at: string | null
          sharepoint_docx_id: string | null
          sharepoint_pdf_id: string | null
          sharepoint_url: string | null
          status: Database["public"]["Enums"]["service_invoice_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          currency?: Database["public"]["Enums"]["invoice_currency"]
          discount_amount?: number
          discount_rate?: number
          docx_generated_at?: string | null
          due_date?: string | null
          early_payment_discount_amount?: number
          early_payment_discount_rate?: number
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_details?: Json
          payment_method_ids?: string[]
          pdf_generated_at?: string | null
          sharepoint_docx_id?: string | null
          sharepoint_pdf_id?: string | null
          sharepoint_url?: string | null
          status?: Database["public"]["Enums"]["service_invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["invoice_currency"]
          discount_amount?: number
          discount_rate?: number
          docx_generated_at?: string | null
          due_date?: string | null
          early_payment_discount_amount?: number
          early_payment_discount_rate?: number
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_details?: Json
          payment_method_ids?: string[]
          pdf_generated_at?: string | null
          sharepoint_docx_id?: string | null
          sharepoint_pdf_id?: string | null
          sharepoint_url?: string | null
          status?: Database["public"]["Enums"]["service_invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "service_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sharepoint_config: {
        Row: {
          created_at: string
          drive_id: string | null
          id: string
          site_id: string
          site_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drive_id?: string | null
          id?: string
          site_id: string
          site_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drive_id?: string | null
          id?: string
          site_id?: string
          site_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          purpose: string
          used: boolean
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          purpose?: string
          used?: boolean
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          purpose?: string
          used?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          message: string
          priority: string
          status: string
          subject: string
          ticket_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          priority?: string
          status?: string
          subject: string
          ticket_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          ticket_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      ticket_replies: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_application_tracking_id: { Args: never; Returns: string }
      generate_project_number: { Args: never; Returns: string }
      generate_service_invoice_number: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      get_job_by_slug: {
        Args: { _slug: string }
        Returns: {
          closing_date: string | null
          contract_duration: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          created_by: string
          department: string | null
          description: string
          id: string
          location: string
          renewable: boolean
          salary_range: string | null
          sector: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "job_postings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      slugify_text: { Args: { input: string }; Returns: string }
      update_own_profile:
        | {
            Args: { _company?: string; _full_name?: string; _phone?: string }
            Returns: undefined
          }
        | {
            Args: {
              _company?: string
              _full_name?: string
              _location?: string
              _phone?: string
              _timezone?: string
            }
            Returns: undefined
          }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "agent"
        | "client"
        | "comptable"
        | "gestionnaire"
      application_status:
        | "nouvelle"
        | "en_revue"
        | "entretien"
        | "acceptee"
        | "refusee"
      contract_type: "CDI" | "CDD" | "Stage" | "Freelance" | "Alternance"
      invoice_currency: "GNF" | "USD" | "EUR"
      invoice_status: "en_attente" | "validee" | "non_conforme"
      invoice_type: "facture" | "recu"
      job_status: "brouillon" | "publiee" | "fermee"
      payment_method_type:
        | "virement"
        | "mobile_money"
        | "especes"
        | "cheque"
        | "autre"
        | "depot"
      service_invoice_status:
        | "brouillon"
        | "emise"
        | "payee"
        | "en_retard"
        | "annulee"
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
      app_role: [
        "admin",
        "user",
        "agent",
        "client",
        "comptable",
        "gestionnaire",
      ],
      application_status: [
        "nouvelle",
        "en_revue",
        "entretien",
        "acceptee",
        "refusee",
      ],
      contract_type: ["CDI", "CDD", "Stage", "Freelance", "Alternance"],
      invoice_currency: ["GNF", "USD", "EUR"],
      invoice_status: ["en_attente", "validee", "non_conforme"],
      invoice_type: ["facture", "recu"],
      job_status: ["brouillon", "publiee", "fermee"],
      payment_method_type: [
        "virement",
        "mobile_money",
        "especes",
        "cheque",
        "autre",
        "depot",
      ],
      service_invoice_status: [
        "brouillon",
        "emise",
        "payee",
        "en_retard",
        "annulee",
      ],
    },
  },
} as const
