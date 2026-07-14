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
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          ip: string | null
          payload: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      api_tokens: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          token_hash: string
          token_prefix: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash: string
          token_prefix: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
          token_prefix?: string
        }
        Relationships: []
      }
      application_tracking_otp: {
        Row: {
          attempts: number
          code: string | null
          code_hash: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          attempts?: number
          code?: string | null
          code_hash?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Update: {
          attempts?: number
          code?: string | null
          code_hash?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      assistant_usage: {
        Row: {
          created_at: string
          day: string
          id: string
          last_question_at: string
          question_count: number
          visitor_hash: string
        }
        Insert: {
          created_at?: string
          day?: string
          id?: string
          last_question_at?: string
          question_count?: number
          visitor_hash: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          last_question_at?: string
          question_count?: number
          visitor_hash?: string
        }
        Relationships: []
      }
      candidate_badges: {
        Row: {
          badge_code: string
          badge_icon: string | null
          badge_label: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_code: string
          badge_icon?: string | null
          badge_label: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_code?: string
          badge_icon?: string | null
          badge_label?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      candidate_gamification: {
        Row: {
          created_at: string
          last_activity_date: string | null
          level: number
          longest_streak: number
          streak_days: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          streak_days?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          streak_days?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      cinetpay_transactions: {
        Row: {
          amount: number
          cinetpay_response: Json | null
          cpm_payid: string | null
          cpm_phone_prefixe: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          environment: string
          expires_at: string | null
          id: string
          kind: string
          metadata: Json | null
          paid_at: string | null
          payment_method: string | null
          payment_operator: string | null
          payment_url: string | null
          related_id: string | null
          related_ref: string | null
          status: string
          transaction_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          cinetpay_response?: Json | null
          cpm_payid?: string | null
          cpm_phone_prefixe?: string | null
          created_at?: string
          currency: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          environment?: string
          expires_at?: string | null
          id?: string
          kind: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          payment_operator?: string | null
          payment_url?: string | null
          related_id?: string | null
          related_ref?: string | null
          status?: string
          transaction_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          cinetpay_response?: Json | null
          cpm_payid?: string | null
          cpm_phone_prefixe?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          environment?: string
          expires_at?: string | null
          id?: string
          kind?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          payment_operator?: string | null
          payment_url?: string | null
          related_id?: string | null
          related_ref?: string | null
          status?: string
          transaction_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contact_email_otps: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          ip_address: string | null
          token_consumed_at: string | null
          token_expires_at: string | null
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          ip_address?: string | null
          token_consumed_at?: string | null
          token_expires_at?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          token_consumed_at?: string | null
          token_expires_at?: string | null
          verification_token?: string | null
          verified_at?: string | null
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
          ai_analyzed_at: string | null
          ai_error: string | null
          ai_experience_years: number | null
          ai_match_percentage: number | null
          ai_recommendation: string | null
          ai_score: number | null
          ai_skills: Json | null
          ai_status: string | null
          ai_strengths: Json | null
          ai_summary: string | null
          ai_weaknesses: Json | null
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
          status: Database["public"]["Enums"]["application_status"]
          tracking_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_analyzed_at?: string | null
          ai_error?: string | null
          ai_experience_years?: number | null
          ai_match_percentage?: number | null
          ai_recommendation?: string | null
          ai_score?: number | null
          ai_skills?: Json | null
          ai_status?: string | null
          ai_strengths?: Json | null
          ai_summary?: string | null
          ai_weaknesses?: Json | null
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
          status?: Database["public"]["Enums"]["application_status"]
          tracking_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_analyzed_at?: string | null
          ai_error?: string | null
          ai_experience_years?: number | null
          ai_match_percentage?: number | null
          ai_recommendation?: string | null
          ai_score?: number | null
          ai_skills?: Json | null
          ai_status?: string | null
          ai_strengths?: Json | null
          ai_summary?: string | null
          ai_weaknesses?: Json | null
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
          status?: Database["public"]["Enums"]["application_status"]
          tracking_id?: string | null
          updated_at?: string
          user_id?: string | null
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
      kb_articles: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          lang: string
          published: boolean
          search_tsv: unknown
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          lang?: string
          published?: boolean
          search_tsv?: unknown
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          lang?: string
          published?: boolean
          search_tsv?: unknown
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      learner_follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      learner_progress_state: {
        Row: {
          average_score: number | null
          created_at: string
          current_level: string
          id: string
          last_computed_at: string | null
          last_recommendation: Json | null
          total_time_seconds: number | null
          training_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          average_score?: number | null
          created_at?: string
          current_level?: string
          id?: string
          last_computed_at?: string | null
          last_recommendation?: Json | null
          total_time_seconds?: number | null
          training_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          average_score?: number | null
          created_at?: string
          current_level?: string
          id?: string
          last_computed_at?: string | null
          last_recommendation?: Json | null
          total_time_seconds?: number | null
          training_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_progress_state_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_xp_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          training_id: string | null
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          training_id?: string | null
          user_id: string
          xp: number
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          training_id?: string | null
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "learner_xp_events_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_verifications: {
        Row: {
          expires_at: string
          id: string
          method: string
          user_id: string
          verified_at: string
        }
        Insert: {
          expires_at?: string
          id?: string
          method?: string
          user_id: string
          verified_at?: string
        }
        Update: {
          expires_at?: string
          id?: string
          method?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      onboarding_assigned_trainings: {
        Row: {
          assigned_at: string
          assigned_by: string
          completed_at: string | null
          course_page: number
          id: string
          last_activity_at: string | null
          module_times: Json
          notes: string | null
          process_id: string
          quiz_answers: Json | null
          quiz_draft_answers: Json
          quiz_open_answers: Json | null
          quiz_open_grades: Json | null
          quiz_page: number
          quiz_passed: boolean | null
          quiz_score: number | null
          quiz_submitted_at: string | null
          quiz_time_seconds: number | null
          source: string
          total_seconds: number
          training_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          completed_at?: string | null
          course_page?: number
          id?: string
          last_activity_at?: string | null
          module_times?: Json
          notes?: string | null
          process_id: string
          quiz_answers?: Json | null
          quiz_draft_answers?: Json
          quiz_open_answers?: Json | null
          quiz_open_grades?: Json | null
          quiz_page?: number
          quiz_passed?: boolean | null
          quiz_score?: number | null
          quiz_submitted_at?: string | null
          quiz_time_seconds?: number | null
          source?: string
          total_seconds?: number
          training_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          completed_at?: string | null
          course_page?: number
          id?: string
          last_activity_at?: string | null
          module_times?: Json
          notes?: string | null
          process_id?: string
          quiz_answers?: Json | null
          quiz_draft_answers?: Json
          quiz_open_answers?: Json | null
          quiz_open_grades?: Json | null
          quiz_page?: number
          quiz_passed?: boolean | null
          quiz_score?: number | null
          quiz_submitted_at?: string | null
          quiz_time_seconds?: number | null
          source?: string
          total_seconds?: number
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_assigned_trainings_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_assigned_trainings_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_contracts: {
        Row: {
          contract_file_name: string
          contract_file_path: string
          id: string
          notes: string | null
          process_id: string
          signature_url: string | null
          signed_at: string | null
          signed_pdf_path: string | null
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          contract_file_name: string
          contract_file_path: string
          id?: string
          notes?: string | null
          process_id: string
          signature_url?: string | null
          signed_at?: string | null
          signed_pdf_path?: string | null
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          contract_file_name?: string
          contract_file_path?: string
          id?: string
          notes?: string | null
          process_id?: string
          signature_url?: string | null
          signed_at?: string | null
          signed_pdf_path?: string | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_contracts_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_documents: {
        Row: {
          doc_type: Database["public"]["Enums"]["onboarding_doc_type"]
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          process_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["onboarding_step_status"]
          uploaded_at: string
        }
        Insert: {
          doc_type: Database["public"]["Enums"]["onboarding_doc_type"]
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          process_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["onboarding_step_status"]
          uploaded_at?: string
        }
        Update: {
          doc_type?: Database["public"]["Enums"]["onboarding_doc_type"]
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          process_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["onboarding_step_status"]
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_documents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          process_id: string
          sender_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          process_id: string
          sender_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          process_id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_messages_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_processes: {
        Row: {
          application_id: string | null
          candidate_email: string
          candidate_name: string
          completed_at: string | null
          created_at: string
          current_step: number
          id: string
          invited_at: string
          job_id: string | null
          kind: string
          start_date: string | null
          status: Database["public"]["Enums"]["onboarding_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          application_id?: string | null
          candidate_email: string
          candidate_name: string
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          invited_at?: string
          job_id?: string | null
          kind?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          application_id?: string | null
          candidate_email?: string
          candidate_name?: string
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          invited_at?: string
          job_id?: string | null
          kind?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      onboarding_steps: {
        Row: {
          completed_at: string | null
          created_at: string
          data: Json | null
          description: string | null
          id: string
          process_id: string
          status: Database["public"]["Enums"]["onboarding_step_status"]
          step_key: string
          step_order: number
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          process_id: string
          status?: Database["public"]["Enums"]["onboarding_step_status"]
          step_key: string
          step_order: number
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          process_id?: string
          status?: Database["public"]["Enums"]["onboarding_step_status"]
          step_key?: string
          step_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_steps_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
        ]
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
      payment_provider_settings: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          environment: string
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          environment?: string
          provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          environment?: string
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      portal_assistant_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          meta: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          meta?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          meta?: Json | null
          role?: string
          user_id?: string
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
          notification_prefs: Json
          phone: string | null
          plan_tier: string | null
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
          notification_prefs?: Json
          phone?: string | null
          plan_tier?: string | null
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
          notification_prefs?: Json
          phone?: string | null
          plan_tier?: string | null
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
      seo_snapshots: {
        Row: {
          captured_at: string
          clicks: number
          created_at: string
          ctr: number
          errors_count: number
          id: string
          impressions: number
          indexed_count: number
          metrics: Json
          position: number
          site_url: string
          sitemap_warnings: number
        }
        Insert: {
          captured_at?: string
          clicks?: number
          created_at?: string
          ctr?: number
          errors_count?: number
          id?: string
          impressions?: number
          indexed_count?: number
          metrics?: Json
          position?: number
          site_url?: string
          sitemap_warnings?: number
        }
        Update: {
          captured_at?: string
          clicks?: number
          created_at?: string
          ctr?: number
          errors_count?: number
          id?: string
          impressions?: number
          indexed_count?: number
          metrics?: Json
          position?: number
          site_url?: string
          sitemap_warnings?: number
        }
        Relationships: []
      }
      service_catalog: {
        Row: {
          active: boolean
          billing_frequency: string | null
          created_at: string
          created_by: string
          default_currency: Database["public"]["Enums"]["invoice_currency"]
          default_unit: string
          default_unit_price: number
          description: string | null
          display_order: number
          id: string
          is_subscription: boolean
          name: string
          published: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_frequency?: string | null
          created_at?: string
          created_by: string
          default_currency?: Database["public"]["Enums"]["invoice_currency"]
          default_unit?: string
          default_unit_price?: number
          description?: string | null
          display_order?: number
          id?: string
          is_subscription?: boolean
          name: string
          published?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_frequency?: string | null
          created_at?: string
          created_by?: string
          default_currency?: Database["public"]["Enums"]["invoice_currency"]
          default_unit?: string
          default_unit_price?: number
          description?: string | null
          display_order?: number
          id?: string
          is_subscription?: boolean
          name?: string
          published?: boolean
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
          billing_frequency: string | null
          catalog_id: string | null
          created_at: string
          description: string
          discount_rate: number
          id: string
          invoice_id: string
          is_recurring: boolean
          periods: number
          position: number
          quantity: number
          subtitle: string | null
          total: number
          unit: string
          unit_price: number
        }
        Insert: {
          billing_frequency?: string | null
          catalog_id?: string | null
          created_at?: string
          description: string
          discount_rate?: number
          id?: string
          invoice_id: string
          is_recurring?: boolean
          periods?: number
          position?: number
          quantity?: number
          subtitle?: string | null
          total?: number
          unit?: string
          unit_price?: number
        }
        Update: {
          billing_frequency?: string | null
          catalog_id?: string | null
          created_at?: string
          description?: string
          discount_rate?: number
          id?: string
          invoice_id?: string
          is_recurring?: boolean
          periods?: number
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
          assigned_user_id: string | null
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
          assigned_user_id?: string | null
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
          assigned_user_id?: string | null
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
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      sms_otp_codes: {
        Row: {
          code: string | null
          code_hash: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          purpose: string
          used: boolean
          user_id: string | null
        }
        Insert: {
          code?: string | null
          code_hash?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          purpose?: string
          used?: boolean
          user_id?: string | null
        }
        Update: {
          code?: string | null
          code_hash?: string | null
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
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
      training_certificates: {
        Row: {
          assigned_id: string | null
          candidate_name: string
          created_at: string
          expires_at: string | null
          id: string
          issued_at: string
          pdf_path: string | null
          revoked_at: string | null
          score: number | null
          training_id: string
          training_title: string
          user_id: string
          verification_code: string
        }
        Insert: {
          assigned_id?: string | null
          candidate_name: string
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          pdf_path?: string | null
          revoked_at?: string | null
          score?: number | null
          training_id: string
          training_title: string
          user_id: string
          verification_code: string
        }
        Update: {
          assigned_id?: string | null
          candidate_name?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          pdf_path?: string | null
          revoked_at?: string | null
          score?: number | null
          training_id?: string
          training_title?: string
          user_id?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_certificates_assigned_id_fkey"
            columns: ["assigned_id"]
            isOneToOne: false
            referencedRelation: "onboarding_assigned_trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certificates_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "training_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      training_comments: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          is_official_answer: boolean
          is_question: boolean
          mentions: string[]
          module_index: number | null
          parent_comment_id: string | null
          training_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name: string
          body: string
          created_at?: string
          id?: string
          is_official_answer?: boolean
          is_question?: boolean
          mentions?: string[]
          module_index?: number | null
          parent_comment_id?: string | null
          training_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          is_official_answer?: boolean
          is_question?: boolean
          mentions?: string[]
          module_index?: number | null
          parent_comment_id?: string | null
          training_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "training_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_comments_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_group_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          group_id: string
          training_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          group_id: string
          training_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          group_id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_group_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "training_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_group_assignments_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_group_members: {
        Row: {
          added_at: string
          added_by: string
          group_id: string
          process_id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          group_id: string
          process_id: string
        }
        Update: {
          added_at?: string
          added_by?: string
          group_id?: string
          process_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "training_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_group_members_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_groups: {
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
      training_mention_notifications: {
        Row: {
          comment_id: string
          created_at: string
          excerpt: string
          from_name: string
          from_user_id: string
          id: string
          read_at: string | null
          training_id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          excerpt: string
          from_name: string
          from_user_id: string
          id?: string
          read_at?: string | null
          training_id: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          excerpt?: string
          from_name?: string
          from_user_id?: string
          id?: string
          read_at?: string | null
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_mention_notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "training_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_mention_notifications_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          active: boolean
          ai_generated: boolean
          audience: string
          category: string | null
          content: Json | null
          created_at: string
          created_by: string
          currency: string | null
          departments: string[]
          description: string | null
          duration_minutes: number | null
          id: string
          level: string | null
          passing_score: number
          price_cents: number | null
          published: boolean
          quiz: Json | null
          sectors: string[]
          target_job_titles: string[]
          title: string
          topic: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          active?: boolean
          ai_generated?: boolean
          audience?: string
          category?: string | null
          content?: Json | null
          created_at?: string
          created_by: string
          currency?: string | null
          departments?: string[]
          description?: string | null
          duration_minutes?: number | null
          id?: string
          level?: string | null
          passing_score?: number
          price_cents?: number | null
          published?: boolean
          quiz?: Json | null
          sectors?: string[]
          target_job_titles?: string[]
          title: string
          topic?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          ai_generated?: boolean
          audience?: string
          category?: string | null
          content?: Json | null
          created_at?: string
          created_by?: string
          currency?: string | null
          departments?: string[]
          description?: string | null
          duration_minutes?: number | null
          id?: string
          level?: string | null
          passing_score?: number
          price_cents?: number | null
          published?: boolean
          quiz?: Json | null
          sectors?: string[]
          target_job_titles?: string[]
          title?: string
          topic?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          level: string
          link: string | null
          meta: Json | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          level?: string
          link?: string | null
          meta?: Json | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          level?: string
          link?: string | null
          meta?: Json | null
          read_at?: string | null
          title?: string
          user_id?: string
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
      verify_attempts: {
        Row: {
          attempted_at: string
          code: string | null
          id: number
          ip: string
          ok: boolean
        }
        Insert: {
          attempted_at?: string
          code?: string | null
          id?: number
          ip: string
          ok?: boolean
        }
        Update: {
          attempted_at?: string
          code?: string | null
          id?: number
          ip?: string
          ok?: boolean
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          error: string | null
          event_type: string | null
          id: string
          payload: Json | null
          received_at: string
          source: string
          status: string
        }
        Insert: {
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          received_at?: string
          source: string
          status?: string
        }
        Update: {
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          received_at?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_to_training_group: {
        Args: { _group_id: string; _user_id: string }
        Returns: string
      }
      admin_security_audit: { Args: never; Returns: Json }
      assign_employee_training: {
        Args: { _training_id: string; _user_id: string }
        Returns: string
      }
      assign_employee_training_bulk: {
        Args: { _training_id: string; _user_ids: string[] }
        Returns: number
      }
      assign_training_to_all_users: {
        Args: { _training_id: string }
        Returns: number
      }
      award_badge: {
        Args: { _code: string; _icon: string; _label: string; _user_id: string }
        Returns: undefined
      }
      award_learner_xp: {
        Args: {
          _event_type: string
          _metadata?: Json
          _training_id?: string
          _xp: number
        }
        Returns: string
      }
      can_access_training: {
        Args: { _training_id: string; _user_id: string }
        Returns: boolean
      }
      create_onboarding_for_application: {
        Args: { _application_id: string }
        Returns: string
      }
      current_user_email: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_application_tracking_id: { Args: never; Returns: string }
      generate_cinetpay_transaction_id: { Args: never; Returns: string }
      generate_project_number: { Args: never; Returns: string }
      generate_service_invoice_number: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      get_cohort_activity: {
        Args: { _limit?: number }
        Returns: {
          detail: string
          display_name: string
          emoji: string
          happened_at: string
          kind: string
          user_id: string
        }[]
      }
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
      get_learner_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          full_name: string
          rank: number
          total_xp: number
          user_id: string
        }[]
      }
      get_learner_rank: {
        Args: never
        Returns: {
          league: string
          rank_week: number
          total_xp_alltime: number
          total_xp_week: number
        }[]
      }
      get_or_create_employee_process: {
        Args: { _user_id: string }
        Returns: string
      }
      get_portal_context: { Args: never; Returns: Json }
      get_training_quiz: { Args: { _training_id: string }; Returns: Json }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_recent_sms_mfa: { Args: { _user_id?: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_client_for_assigned_invoice: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      list_employee_assignable_users: {
        Args: never
        Returns: {
          email: string
          full_name: string
          process_id: string
          total_assigned: number
          total_completed: number
          user_id: string
        }[]
      }
      list_employee_trainings_for_user: {
        Args: { _user_id: string }
        Returns: {
          assigned_at: string
          assigned_id: string
          category: string
          completed_at: string
          duration_minutes: number
          quiz_passed: boolean
          quiz_score: number
          source: string
          title: string
          training_id: string
        }[]
      }
      list_training_co_learners:
        | {
            Args: { _training_id: string }
            Returns: {
              full_name: string
              role: string
              user_id: string
            }[]
          }
        | {
            Args: { _limit?: number; _query?: string; _training_id: string }
            Returns: {
              full_name: string
              role: string
              user_id: string
            }[]
          }
      list_training_groups_summary: {
        Args: never
        Returns: {
          created_at: string
          description: string
          id: string
          member_count: number
          name: string
          training_count: number
        }[]
      }
      log_admin_action: {
        Args: {
          _action: string
          _payload?: Json
          _target_id?: string
          _target_type?: string
        }
        Returns: string
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_training_comment_official: {
        Args: { _comment_id: string; _is_official: boolean }
        Returns: undefined
      }
      mark_training_followed: {
        Args: { _assigned_id: string }
        Returns: undefined
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
      post_training_comment: {
        Args: {
          _body: string
          _mentions: string[]
          _module_index: number
          _training_id: string
        }
        Returns: string
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      search_kb_articles: {
        Args: { _lang?: string; _limit?: number; _q: string }
        Returns: {
          excerpt: string
          id: string
          rank: number
          slug: string
          tags: string[]
          title: string
        }[]
      }
      slugify_text: { Args: { input: string }; Returns: string }
      submit_job_application: {
        Args: {
          p_cover_letter_path?: string
          p_cv_path: string
          p_email: string
          p_full_name: string
          p_job_id: string
          p_linkedin_url?: string
          p_notes?: string
          p_phone?: string
          p_portfolio_url?: string
          p_user_id?: string
        }
        Returns: {
          already_exists: boolean
          id: string
          tracking_id: string
        }[]
      }
      submit_training_quiz_attempt: {
        Args: {
          _assigned_id: string
          _module_times: Json
          _quiz_answers: Json
          _quiz_open_answers: Json
          _quiz_open_grades: Json
          _quiz_passed: boolean
          _quiz_score: number
          _quiz_time_seconds: number
          _total_seconds: number
        }
        Returns: {
          assigned_at: string
          assigned_by: string
          completed_at: string | null
          course_page: number
          id: string
          last_activity_at: string | null
          module_times: Json
          notes: string | null
          process_id: string
          quiz_answers: Json | null
          quiz_draft_answers: Json
          quiz_open_answers: Json | null
          quiz_open_grades: Json | null
          quiz_page: number
          quiz_passed: boolean | null
          quiz_score: number | null
          quiz_submitted_at: string | null
          quiz_time_seconds: number | null
          source: string
          total_seconds: number
          training_id: string
        }
        SetofOptions: {
          from: "*"
          to: "onboarding_assigned_trainings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_premium_role_for_user: {
        Args: { _user_id: string }
        Returns: undefined
      }
      toggle_learner_follow: { Args: { _followee: string }; Returns: boolean }
      unassign_employee_training: {
        Args: { _training_id: string; _user_id: string }
        Returns: boolean
      }
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
        | "onboarding"
        | "hr"
        | "client_premium"
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
      onboarding_doc_type:
        | "cni"
        | "rib"
        | "diplome"
        | "photo_casier"
        | "contrat_signe"
        | "autre"
      onboarding_status: "en_cours" | "complete" | "abandonne"
      onboarding_step_status:
        | "a_faire"
        | "en_cours"
        | "en_revision"
        | "valide"
        | "refuse"
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
        "onboarding",
        "hr",
        "client_premium",
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
      onboarding_doc_type: [
        "cni",
        "rib",
        "diplome",
        "photo_casier",
        "contrat_signe",
        "autre",
      ],
      onboarding_status: ["en_cours", "complete", "abandonne"],
      onboarding_step_status: [
        "a_faire",
        "en_cours",
        "en_revision",
        "valide",
        "refuse",
      ],
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
