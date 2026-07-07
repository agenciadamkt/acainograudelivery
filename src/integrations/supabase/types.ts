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
    PostgrestVersion: "14.1"
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
      accounts_receivable: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string | null
          description: string
          distribution_center_id: string | null
          due_date: string
          franchisee_user_id: string
          id: string
          notes: string | null
          paid: boolean | null
          paid_date: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string | null
          description: string
          distribution_center_id?: string | null
          due_date: string
          franchisee_user_id: string
          id?: string
          notes?: string | null
          paid?: boolean | null
          paid_date?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string | null
          description?: string
          distribution_center_id?: string | null
          due_date?: string
          franchisee_user_id?: string
          id?: string
          notes?: string | null
          paid?: boolean | null
          paid_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "financial_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_distribution_center_id_fkey"
            columns: ["distribution_center_id"]
            isOneToOne: false
            referencedRelation: "distribution_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Relationships: []
      }
      agenda_eventos: {
        Row: {
          concluido_em: string | null
          created_at: string
          created_by: string | null
          data_hora: string
          descricao: string | null
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          last_sync_at: string | null
          origem_id: string | null
          origem_modulo: string
          origem_tabela: string | null
          responsavel_id: string | null
          status: string
          sync_status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          data_hora: string
          descricao?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          last_sync_at?: string | null
          origem_id?: string | null
          origem_modulo?: string
          origem_tabela?: string | null
          responsavel_id?: string | null
          status?: string
          sync_status?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          data_hora?: string
          descricao?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          last_sync_at?: string | null
          origem_id?: string | null
          origem_modulo?: string
          origem_tabela?: string | null
          responsavel_id?: string | null
          status?: string
          sync_status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      allowed_cnaes: {
        Row: {
          active: boolean | null
          categoria: string | null
          codigo: string
          created_at: string | null
          descricao: string
          id: string
          is_primary: boolean | null
          requires_warning: boolean | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          categoria?: string | null
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
          is_primary?: boolean | null
          requires_warning?: boolean | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          categoria?: string | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
          is_primary?: boolean | null
          requires_warning?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      authors: {
        Row: {
          birth_year: number | null
          color: string | null
          created_at: string | null
          death_year: number | null
          id: number
          main_work: string | null
          name: string
          nationality: string | null
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          birth_year?: number | null
          color?: string | null
          created_at?: string | null
          death_year?: number | null
          id?: number
          main_work?: string | null
          name: string
          nationality?: string | null
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          birth_year?: number | null
          color?: string | null
          created_at?: string | null
          death_year?: number | null
          id?: number
          main_work?: string | null
          name?: string
          nationality?: string | null
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      b2b_terms_versions: {
        Row: {
          active: boolean | null
          content: string
          created_at: string | null
          effective_date: string
          id: string
          mandatory: boolean | null
          title: string
          updated_at: string | null
          version: string
        }
        Insert: {
          active?: boolean | null
          content: string
          created_at?: string | null
          effective_date: string
          id?: string
          mandatory?: boolean | null
          title: string
          updated_at?: string | null
          version: string
        }
        Update: {
          active?: boolean | null
          content?: string
          created_at?: string | null
          effective_date?: string
          id?: string
          mandatory?: boolean | null
          title?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      caf_artigos: {
        Row: {
          atendimento_origem_id: string | null
          categoria: string | null
          conteudo: string
          created_at: string
          criado_por: string | null
          criado_por_nome: string | null
          id: string
          publicado: boolean | null
          subcategoria: string | null
          tags: string[] | null
          titulo: string
          updated_at: string
          visualizacoes: number | null
        }
        Insert: {
          atendimento_origem_id?: string | null
          categoria?: string | null
          conteudo: string
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string | null
          id?: string
          publicado?: boolean | null
          subcategoria?: string | null
          tags?: string[] | null
          titulo: string
          updated_at?: string
          visualizacoes?: number | null
        }
        Update: {
          atendimento_origem_id?: string | null
          categoria?: string | null
          conteudo?: string
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string | null
          id?: string
          publicado?: boolean | null
          subcategoria?: string | null
          tags?: string[] | null
          titulo?: string
          updated_at?: string
          visualizacoes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "caf_artigos_atendimento_origem_id_fkey"
            columns: ["atendimento_origem_id"]
            isOneToOne: false
            referencedRelation: "caf_atendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      caf_atendimentos: {
        Row: {
          atendente_id: string | null
          atendente_nome: string | null
          canal: string
          categoria: string
          cidade: string | null
          codigo_loja: string | null
          created_at: string
          descricao: string | null
          encerrado_em: string | null
          estado: string | null
          id: string
          loja_franqueada: string | null
          prioridade: string
          protocolo: string
          resolvido_em: string | null
          respondido_em: string | null
          satisfacao_token: string | null
          solicitante_cargo: string | null
          solicitante_nome: string | null
          solucao: string | null
          status: string
          store_id: string | null
          subcategoria: string | null
          tempo_resolucao_min: number | null
          tempo_resposta_min: number | null
          updated_at: string
        }
        Insert: {
          atendente_id?: string | null
          atendente_nome?: string | null
          canal?: string
          categoria: string
          cidade?: string | null
          codigo_loja?: string | null
          created_at?: string
          descricao?: string | null
          encerrado_em?: string | null
          estado?: string | null
          id?: string
          loja_franqueada?: string | null
          prioridade?: string
          protocolo?: string
          resolvido_em?: string | null
          respondido_em?: string | null
          satisfacao_token?: string | null
          solicitante_cargo?: string | null
          solicitante_nome?: string | null
          solucao?: string | null
          status?: string
          store_id?: string | null
          subcategoria?: string | null
          tempo_resolucao_min?: number | null
          tempo_resposta_min?: number | null
          updated_at?: string
        }
        Update: {
          atendente_id?: string | null
          atendente_nome?: string | null
          canal?: string
          categoria?: string
          cidade?: string | null
          codigo_loja?: string | null
          created_at?: string
          descricao?: string | null
          encerrado_em?: string | null
          estado?: string | null
          id?: string
          loja_franqueada?: string | null
          prioridade?: string
          protocolo?: string
          resolvido_em?: string | null
          respondido_em?: string | null
          satisfacao_token?: string | null
          solicitante_cargo?: string | null
          solicitante_nome?: string | null
          solucao?: string | null
          status?: string
          store_id?: string | null
          subcategoria?: string | null
          tempo_resolucao_min?: number | null
          tempo_resposta_min?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      caf_configuracoes: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      caf_connect_eventos: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          session_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          session_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          session_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "caf_connect_eventos_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "caf_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      caf_historico: {
        Row: {
          atendimento_id: string
          campo: string | null
          criado_em: string | null
          id: string
          motivo: string | null
          tipo: string
          usuario_id: string | null
          usuario_nome: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          atendimento_id: string
          campo?: string | null
          criado_em?: string | null
          id?: string
          motivo?: string | null
          tipo: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          atendimento_id?: string
          campo?: string | null
          criado_em?: string | null
          id?: string
          motivo?: string | null
          tipo?: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caf_historico_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "caf_atendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      caf_satisfacao: {
        Row: {
          atendimento_id: string
          comentario: string | null
          created_at: string
          id: string
          nota: number | null
          nps: number | null
          problema_resolvido: string | null
        }
        Insert: {
          atendimento_id: string
          comentario?: string | null
          created_at?: string
          id?: string
          nota?: number | null
          nps?: number | null
          problema_resolvido?: string | null
        }
        Update: {
          atendimento_id?: string
          comentario?: string | null
          created_at?: string
          id?: string
          nota?: number | null
          nps?: number | null
          problema_resolvido?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caf_satisfacao_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "caf_atendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      caf_sessions: {
        Row: {
          ai_summary: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_min: number | null
          ended_at: string | null
          excalidraw_last_access: string | null
          excalidraw_room_id: string | null
          excalidraw_room_url: string | null
          excalidraw_snapshot_url: string | null
          google_event_id: string | null
          google_meet_url: string | null
          id: string
          next_steps: string | null
          nps_comentario: string | null
          nps_nota: number | null
          nps_problema_resolvido: boolean | null
          nps_respondido_em: string | null
          participantes: Json
          recording_duration_seg: number | null
          recording_provider: string | null
          recording_size_bytes: number | null
          recording_url: string | null
          scheduled_at: string | null
          session_type: string
          started_at: string | null
          status: string
          summary: string | null
          ticket_id: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_min?: number | null
          ended_at?: string | null
          excalidraw_last_access?: string | null
          excalidraw_room_id?: string | null
          excalidraw_room_url?: string | null
          excalidraw_snapshot_url?: string | null
          google_event_id?: string | null
          google_meet_url?: string | null
          id?: string
          next_steps?: string | null
          nps_comentario?: string | null
          nps_nota?: number | null
          nps_problema_resolvido?: boolean | null
          nps_respondido_em?: string | null
          participantes?: Json
          recording_duration_seg?: number | null
          recording_provider?: string | null
          recording_size_bytes?: number | null
          recording_url?: string | null
          scheduled_at?: string | null
          session_type?: string
          started_at?: string | null
          status?: string
          summary?: string | null
          ticket_id: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_min?: number | null
          ended_at?: string | null
          excalidraw_last_access?: string | null
          excalidraw_room_id?: string | null
          excalidraw_room_url?: string | null
          excalidraw_snapshot_url?: string | null
          google_event_id?: string | null
          google_meet_url?: string | null
          id?: string
          next_steps?: string | null
          nps_comentario?: string | null
          nps_nota?: number | null
          nps_problema_resolvido?: boolean | null
          nps_respondido_em?: string | null
          participantes?: Json
          recording_duration_seg?: number | null
          recording_provider?: string | null
          recording_size_bytes?: number | null
          recording_url?: string | null
          scheduled_at?: string | null
          session_type?: string
          started_at?: string | null
          status?: string
          summary?: string | null
          ticket_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caf_sessions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "caf_atendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      capacity_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          active_orders: number
          alert_type: string
          available_drivers: number
          created_at: string | null
          estimated_wait_time: number | null
          id: string
          message: string | null
          occupancy_rate: number
          resolved_at: string | null
          store_id: string
          total_drivers: number
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          active_orders: number
          alert_type: string
          available_drivers: number
          created_at?: string | null
          estimated_wait_time?: number | null
          id?: string
          message?: string | null
          occupancy_rate: number
          resolved_at?: string | null
          store_id: string
          total_drivers: number
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          active_orders?: number
          alert_type?: string
          available_drivers?: number
          created_at?: string | null
          estimated_wait_time?: number | null
          id?: string
          message?: string | null
          occupancy_rate?: number
          resolved_at?: string | null
          store_id?: string
          total_drivers?: number
        }
        Relationships: [
          {
            foreignKeyName: "capacity_alerts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_closing_documents: {
        Row: {
          closing_id: string
          created_at: string | null
          file_name: string
          file_type: string
          file_url: string
          id: string
        }
        Insert: {
          closing_id: string
          created_at?: string | null
          file_name: string
          file_type?: string
          file_url: string
          id?: string
        }
        Update: {
          closing_id?: string
          created_at?: string | null
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_closing_documents_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "cash_closings"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_closings: {
        Row: {
          account_id: string | null
          balance: number | null
          cash_settlement: number
          checked_by_id: string | null
          closing_date: string
          created_at: string | null
          created_by: string | null
          credit_card_value: number | null
          credit_cielo: number | null
          credit_moderninha: number | null
          debit_card_value: number | null
          debit_cielo: number | null
          debit_moderninha: number | null
          distribution_center_id: string
          id: string
          notes: string | null
          online_payment: number | null
          operator_id: string | null
          pix_cielo: number | null
          pix_moderninha: number | null
          pix_value: number | null
          title_settlement: number
          total_cash: number
          total_expenses: number
          total_sales: number
        }
        Insert: {
          account_id?: string | null
          balance?: number | null
          cash_settlement?: number
          checked_by_id?: string | null
          closing_date?: string
          created_at?: string | null
          created_by?: string | null
          credit_card_value?: number | null
          credit_cielo?: number | null
          credit_moderninha?: number | null
          debit_card_value?: number | null
          debit_cielo?: number | null
          debit_moderninha?: number | null
          distribution_center_id: string
          id?: string
          notes?: string | null
          online_payment?: number | null
          operator_id?: string | null
          pix_cielo?: number | null
          pix_moderninha?: number | null
          pix_value?: number | null
          title_settlement?: number
          total_cash?: number
          total_expenses?: number
          total_sales?: number
        }
        Update: {
          account_id?: string | null
          balance?: number | null
          cash_settlement?: number
          checked_by_id?: string | null
          closing_date?: string
          created_at?: string | null
          created_by?: string | null
          credit_card_value?: number | null
          credit_cielo?: number | null
          credit_moderninha?: number | null
          debit_card_value?: number | null
          debit_cielo?: number | null
          debit_moderninha?: number | null
          distribution_center_id?: string
          id?: string
          notes?: string | null
          online_payment?: number | null
          operator_id?: string | null
          pix_cielo?: number | null
          pix_moderninha?: number | null
          pix_value?: number | null
          title_settlement?: number
          total_cash?: number
          total_expenses?: number
          total_sales?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_closings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_closings_checked_by_id_fkey"
            columns: ["checked_by_id"]
            isOneToOne: false
            referencedRelation: "cash_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_closings_distribution_center_id_fkey"
            columns: ["distribution_center_id"]
            isOneToOne: false
            referencedRelation: "distribution_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_closings_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "cash_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_operators: {
        Row: {
          active: boolean | null
          created_at: string | null
          franchisee_user_id: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          franchisee_user_id?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          franchisee_user_id?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          icon: string | null
          id: string
          image_url: string | null
          name: string
          pdv_only: boolean | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          pdv_only?: boolean | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          pdv_only?: boolean | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          active: boolean | null
          cost_center_id: string
          created_at: string | null
          franchisee_user_id: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          cost_center_id: string
          created_at?: string | null
          franchisee_user_id?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          cost_center_id?: string
          created_at?: string | null
          franchisee_user_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      cnae_divergence_warnings: {
        Row: {
          allow_registration: boolean | null
          codigo: string
          created_at: string | null
          descricao: string | null
          id: string
          reason: string
        }
        Insert: {
          allow_registration?: boolean | null
          codigo: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          reason: string
        }
        Update: {
          allow_registration?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          reason?: string
        }
        Relationships: []
      }
      cnpj_validation_log: {
        Row: {
          api_response: Json | null
          api_source: string | null
          capital_social: number | null
          cnae_compatible: boolean | null
          cnae_principal: string | null
          cnae_secundarios: Json | null
          cnpj: string
          created_at: string | null
          data_abertura: string | null
          driver_id: string | null
          id: string
          is_active: boolean | null
          is_mei: boolean | null
          is_valid: boolean | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          porte: string | null
          razao_social: string | null
          situacao_cadastral: string | null
          validation_error: string | null
        }
        Insert: {
          api_response?: Json | null
          api_source?: string | null
          capital_social?: number | null
          cnae_compatible?: boolean | null
          cnae_principal?: string | null
          cnae_secundarios?: Json | null
          cnpj: string
          created_at?: string | null
          data_abertura?: string | null
          driver_id?: string | null
          id?: string
          is_active?: boolean | null
          is_mei?: boolean | null
          is_valid?: boolean | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          porte?: string | null
          razao_social?: string | null
          situacao_cadastral?: string | null
          validation_error?: string | null
        }
        Update: {
          api_response?: Json | null
          api_source?: string | null
          capital_social?: number | null
          cnae_compatible?: boolean | null
          cnae_principal?: string | null
          cnae_secundarios?: Json | null
          cnpj?: string
          created_at?: string | null
          data_abertura?: string | null
          driver_id?: string | null
          id?: string
          is_active?: boolean | null
          is_mei?: boolean | null
          is_valid?: boolean | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          porte?: string | null
          razao_social?: string | null
          situacao_cadastral?: string | null
          validation_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cnpj_validation_log_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_types: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          label: string
          value: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          label: string
          value: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          label?: string
          value?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          type: string
          user_id?: string | null
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      copilot_conversations: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      copilot_insights: {
        Row: {
          action_suggestion: string | null
          category: string
          created_at: string | null
          data: Json | null
          description: string
          franchisee_user_id: string
          id: string
          module: string
          resolved: boolean | null
          resolved_at: string | null
          severity: string | null
          title: string
          type: string
        }
        Insert: {
          action_suggestion?: string | null
          category: string
          created_at?: string | null
          data?: Json | null
          description: string
          franchisee_user_id: string
          id?: string
          module: string
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string | null
          title: string
          type: string
        }
        Update: {
          action_suggestion?: string | null
          category?: string
          created_at?: string | null
          data?: Json | null
          description?: string
          franchisee_user_id?: string
          id?: string
          module?: string
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      copilot_knowledge: {
        Row: {
          active: boolean | null
          category: string
          content: string
          created_at: string | null
          id: string
          module: string | null
          route_pattern: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category: string
          content: string
          created_at?: string | null
          id?: string
          module?: string | null
          route_pattern?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          module?: string | null
          route_pattern?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          active: boolean | null
          created_at: string | null
          distribution_center_id: string
          franchisee_user_id: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          distribution_center_id: string
          franchisee_user_id?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          distribution_center_id?: string
          franchisee_user_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_distribution_center_id_fkey"
            columns: ["distribution_center_id"]
            isOneToOne: false
            referencedRelation: "distribution_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          customer_id: string
          id: string
          order_id: string | null
          used_at: string
        }
        Insert: {
          coupon_id: string
          customer_id: string
          id?: string
          order_id?: string | null
          used_at?: string
        }
        Update: {
          coupon_id?: string
          customer_id?: string
          id?: string
          order_id?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_this_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          max_discount: number | null
          min_order_value: number | null
          store_id: string | null
          usage_count: number
          usage_limit: number | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          max_discount?: number | null
          min_order_value?: number | null
          store_id?: string | null
          usage_count?: number
          usage_limit?: number | null
          valid_from: string
          valid_until: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          max_discount?: number | null
          min_order_value?: number | null
          store_id?: string | null
          usage_count?: number
          usage_limit?: number | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          created_at: string | null
          data_horario: string | null
          descricao: string | null
          duracao_minutos: number | null
          id: string
          lead_id: string
          prox_seguimento: string | null
          resultado: string | null
          score_delta: number | null
          tipo: string
          titulo: string | null
          usuario_nome: string | null
        }
        Insert: {
          created_at?: string | null
          data_horario?: string | null
          descricao?: string | null
          duracao_minutos?: number | null
          id?: string
          lead_id: string
          prox_seguimento?: string | null
          resultado?: string | null
          score_delta?: number | null
          tipo?: string
          titulo?: string | null
          usuario_nome?: string | null
        }
        Update: {
          created_at?: string | null
          data_horario?: string | null
          descricao?: string | null
          duracao_minutos?: number | null
          id?: string
          lead_id?: string
          prox_seguimento?: string | null
          resultado?: string | null
          score_delta?: number | null
          tipo?: string
          titulo?: string | null
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_atendimentos: {
        Row: {
          created_at: string | null
          etapa: string | null
          id: string
          lead_id: string
          mensagem_enviada: string | null
          resposta_cliente: string | null
          script_id: string | null
          tipo_mensagem: string | null
        }
        Insert: {
          created_at?: string | null
          etapa?: string | null
          id?: string
          lead_id: string
          mensagem_enviada?: string | null
          resposta_cliente?: string | null
          script_id?: string | null
          tipo_mensagem?: string | null
        }
        Update: {
          created_at?: string | null
          etapa?: string | null
          id?: string
          lead_id?: string
          mensagem_enviada?: string | null
          resposta_cliente?: string | null
          script_id?: string | null
          tipo_mensagem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_atendimentos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_followups: {
        Row: {
          created_at: string | null
          data_agendada: string
          data_enviado: string | null
          id: string
          lead_id: string
          mensagem: string | null
          status: string | null
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          data_agendada: string
          data_enviado?: string | null
          id?: string
          lead_id: string
          mensagem?: string | null
          status?: string | null
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          data_agendada?: string
          data_enviado?: string | null
          id?: string
          lead_id?: string
          mensagem?: string | null
          status?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          atendente_id: string | null
          cidade: string | null
          created_at: string | null
          estado: string | null
          id: string
          interesse: string | null
          last_activity_at: string | null
          motivo_perda: string | null
          nome: string | null
          observacoes: string | null
          origem: string | null
          probabilidade: number | null
          score: number | null
          status: string | null
          store_id: string | null
          tags: string[] | null
          telefone: string
          tipo_cliente: string | null
          updated_at: string | null
          valor_estimado: number | null
        }
        Insert: {
          atendente_id?: string | null
          cidade?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          interesse?: string | null
          last_activity_at?: string | null
          motivo_perda?: string | null
          nome?: string | null
          observacoes?: string | null
          origem?: string | null
          probabilidade?: number | null
          score?: number | null
          status?: string | null
          store_id?: string | null
          tags?: string[] | null
          telefone: string
          tipo_cliente?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Update: {
          atendente_id?: string | null
          cidade?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          interesse?: string | null
          last_activity_at?: string | null
          motivo_perda?: string | null
          nome?: string | null
          observacoes?: string | null
          origem?: string | null
          probabilidade?: number | null
          score?: number | null
          status?: string | null
          store_id?: string | null
          tags?: string[] | null
          telefone?: string
          tipo_cliente?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_scripts: {
        Row: {
          atalho: string | null
          ativo: boolean | null
          categoria: string | null
          conteudo: string
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
          store_id: string | null
        }
        Insert: {
          atalho?: string | null
          ativo?: boolean | null
          categoria?: string | null
          conteudo: string
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
          store_id?: string | null
        }
        Update: {
          atalho?: string | null
          ativo?: boolean | null
          categoria?: string | null
          conteudo?: string
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_scripts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          customer_id: string
          id: string
          is_default: boolean
          latitude: number | null
          longitude: number | null
          neighborhood: string
          number: string
          state: string
          street: string
          zipcode: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood: string
          number: string
          state: string
          street: string
          zipcode: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string
          number?: string
          state?: string
          street?: string
          zipcode?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_this_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_favorites: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_this_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          note: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          note: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_this_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_push_tokens: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          platform: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          platform: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_push_tokens_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_this_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_push_tokens_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_push_tokens_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_push_tokens_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          criteria: Json | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          criteria?: Json | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          criteria?: Json | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      customer_tags: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          tag: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          tag: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_this_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birth_date: string | null
          created_at: string
          email: string | null
          first_order_at: string | null
          gender: string | null
          id: string
          last_order_at: string | null
          loyalty_points: number
          loyalty_tier: string | null
          name: string
          notes: string | null
          opt_in_marketing: boolean
          phone: string
          store_id: string | null
          total_orders: number
          total_spent: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          first_order_at?: string | null
          gender?: string | null
          id?: string
          last_order_at?: string | null
          loyalty_points?: number
          loyalty_tier?: string | null
          name: string
          notes?: string | null
          opt_in_marketing?: boolean
          phone: string
          store_id?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          first_order_at?: string | null
          gender?: string | null
          id?: string
          last_order_at?: string | null
          loyalty_points?: number
          loyalty_tier?: string | null
          name?: string
          notes?: string | null
          opt_in_marketing?: boolean
          phone?: string
          store_id?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_areas: {
        Row: {
          active: boolean | null
          center_lat: number
          center_lng: number
          created_at: string
          fee: number
          id: string
          name: string
          radius_meters: number
          store_id: string
        }
        Insert: {
          active?: boolean | null
          center_lat: number
          center_lng: number
          created_at?: string
          fee?: number
          id?: string
          name: string
          radius_meters?: number
          store_id: string
        }
        Update: {
          active?: boolean | null
          center_lat?: number
          center_lng?: number
          created_at?: string
          fee?: number
          id?: string
          name?: string
          radius_meters?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_areas_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_driver_stores: {
        Row: {
          created_at: string | null
          driver_id: string
          store_id: string
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          store_id: string
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_driver_stores_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_driver_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_drivers: {
        Row: {
          active: boolean
          b2b_terms_accepted: boolean | null
          b2b_terms_accepted_at: string | null
          b2b_terms_pdf_url: string | null
          b2b_terms_version: string | null
          cnae_compatible: boolean | null
          cnae_principal: string | null
          cnae_warning: string | null
          cnpj: string | null
          cnpj_situacao: string | null
          cnpj_validated_at: string | null
          cnpj_validation_data: Json | null
          created_at: string
          current_location: Json | null
          id: string
          is_global: boolean | null
          mei_status: string | null
          name: string
          nome_fantasia: string | null
          phone: string
          pj_bank_account: Json | null
          rating: number | null
          razao_social: string | null
          status: string
          store_id: string | null
          total_deliveries: number | null
          updated_at: string
          user_id: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          active?: boolean
          b2b_terms_accepted?: boolean | null
          b2b_terms_accepted_at?: string | null
          b2b_terms_pdf_url?: string | null
          b2b_terms_version?: string | null
          cnae_compatible?: boolean | null
          cnae_principal?: string | null
          cnae_warning?: string | null
          cnpj?: string | null
          cnpj_situacao?: string | null
          cnpj_validated_at?: string | null
          cnpj_validation_data?: Json | null
          created_at?: string
          current_location?: Json | null
          id?: string
          is_global?: boolean | null
          mei_status?: string | null
          name: string
          nome_fantasia?: string | null
          phone: string
          pj_bank_account?: Json | null
          rating?: number | null
          razao_social?: string | null
          status?: string
          store_id?: string | null
          total_deliveries?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          active?: boolean
          b2b_terms_accepted?: boolean | null
          b2b_terms_accepted_at?: string | null
          b2b_terms_pdf_url?: string | null
          b2b_terms_version?: string | null
          cnae_compatible?: boolean | null
          cnae_principal?: string | null
          cnae_warning?: string | null
          cnpj?: string | null
          cnpj_situacao?: string | null
          cnpj_validated_at?: string | null
          cnpj_validation_data?: Json | null
          created_at?: string
          current_location?: Json | null
          id?: string
          is_global?: boolean | null
          mei_status?: string | null
          name?: string
          nome_fantasia?: string | null
          phone?: string
          pj_bank_account?: Json | null
          rating?: number | null
          razao_social?: string | null
          status?: string
          store_id?: string | null
          total_deliveries?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_drivers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_platforms: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_platforms_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_routes: {
        Row: {
          completed_at: string | null
          created_at: string
          driver_id: string | null
          estimated_duration: number | null
          franchisee_order_ids: Json | null
          id: string
          manual_order_ids: Json | null
          name: string
          order_ids: Json
          started_at: string | null
          status: string
          stop_order: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          driver_id?: string | null
          estimated_duration?: number | null
          franchisee_order_ids?: Json | null
          id?: string
          manual_order_ids?: Json | null
          name: string
          order_ids: Json
          started_at?: string | null
          status?: string
          stop_order?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          driver_id?: string | null
          estimated_duration?: number | null
          franchisee_order_ids?: Json | null
          id?: string
          manual_order_ids?: Json | null
          name?: string
          order_ids?: Json
          started_at?: string | null
          status?: string
          stop_order?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_driver_id_fleet_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tracking: {
        Row: {
          created_at: string
          driver_id: string | null
          id: string
          location: Json | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          id?: string
          location?: Json | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          id?: string
          location?: Json | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      displacement_missions: {
        Row: {
          arrived_at: string | null
          created_at: string | null
          distance_km: number | null
          driver_id: string | null
          estimated_time_minutes: number | null
          expires_at: string | null
          id: string
          notified_at: string | null
          origin_lat: number | null
          origin_lng: number | null
          origin_zone_id: string | null
          priority_expires_at: string | null
          priority_granted: boolean | null
          responded_at: string | null
          started_at: string | null
          status: string | null
          target_zone_id: string | null
        }
        Insert: {
          arrived_at?: string | null
          created_at?: string | null
          distance_km?: number | null
          driver_id?: string | null
          estimated_time_minutes?: number | null
          expires_at?: string | null
          id?: string
          notified_at?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_zone_id?: string | null
          priority_expires_at?: string | null
          priority_granted?: boolean | null
          responded_at?: string | null
          started_at?: string | null
          status?: string | null
          target_zone_id?: string | null
        }
        Update: {
          arrived_at?: string | null
          created_at?: string | null
          distance_km?: number | null
          driver_id?: string | null
          estimated_time_minutes?: number | null
          expires_at?: string | null
          id?: string
          notified_at?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_zone_id?: string | null
          priority_expires_at?: string | null
          priority_granted?: boolean | null
          responded_at?: string | null
          started_at?: string | null
          status?: string | null
          target_zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "displacement_missions_origin_zone_id_fkey"
            columns: ["origin_zone_id"]
            isOneToOne: false
            referencedRelation: "geo_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "displacement_missions_target_zone_id_fkey"
            columns: ["target_zone_id"]
            isOneToOne: false
            referencedRelation: "geo_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_displacement_missions_driver"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_centers: {
        Row: {
          active: boolean | null
          address: string | null
          created_at: string | null
          franchisee_user_id: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          franchisee_user_id?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          franchisee_user_id?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      driver_bank_accounts: {
        Row: {
          account_digit: string | null
          account_number: string
          account_type: string
          agency: string
          agency_digit: string | null
          bank_code: string
          bank_name: string | null
          created_at: string | null
          driver_id: string
          holder_document: string
          holder_document_type: string
          holder_name: string
          id: string
          is_mei_holder: boolean | null
          is_pj_account: boolean | null
          is_primary: boolean | null
          status: string
          updated_at: string | null
          validated: boolean | null
          validated_at: string | null
          validation_method: string | null
        }
        Insert: {
          account_digit?: string | null
          account_number: string
          account_type: string
          agency: string
          agency_digit?: string | null
          bank_code: string
          bank_name?: string | null
          created_at?: string | null
          driver_id: string
          holder_document: string
          holder_document_type: string
          holder_name: string
          id?: string
          is_mei_holder?: boolean | null
          is_pj_account?: boolean | null
          is_primary?: boolean | null
          status?: string
          updated_at?: string | null
          validated?: boolean | null
          validated_at?: string | null
          validation_method?: string | null
        }
        Update: {
          account_digit?: string | null
          account_number?: string
          account_type?: string
          agency?: string
          agency_digit?: string | null
          bank_code?: string
          bank_name?: string | null
          created_at?: string | null
          driver_id?: string
          holder_document?: string
          holder_document_type?: string
          holder_name?: string
          id?: string
          is_mei_holder?: boolean | null
          is_pj_account?: boolean | null
          is_primary?: boolean | null
          status?: string
          updated_at?: string | null
          validated?: boolean | null
          validated_at?: string | null
          validation_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_bank_accounts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_terms_acceptances: {
        Row: {
          accepted_at: string
          cnpj_at_acceptance: string | null
          created_at: string | null
          declaration_text: string
          device_fingerprint: string | null
          driver_id: string
          full_scroll_completed: boolean | null
          id: string
          ip_address: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          razao_social_at_acceptance: string | null
          terms_version_id: string
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          cnpj_at_acceptance?: string | null
          created_at?: string | null
          declaration_text: string
          device_fingerprint?: string | null
          driver_id: string
          full_scroll_completed?: boolean | null
          id?: string
          ip_address?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          razao_social_at_acceptance?: string | null
          terms_version_id: string
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          cnpj_at_acceptance?: string | null
          created_at?: string | null
          declaration_text?: string
          device_fingerprint?: string | null
          driver_id?: string
          full_scroll_completed?: boolean | null
          id?: string
          ip_address?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          razao_social_at_acceptance?: string | null
          terms_version_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_terms_acceptances_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_terms_acceptances_terms_version_id_fkey"
            columns: ["terms_version_id"]
            isOneToOne: false
            referencedRelation: "b2b_terms_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          chart_of_accounts_id: string
          cost_center_id: string
          created_at: string | null
          created_by: string | null
          distribution_center_id: string
          due_date: string | null
          expense_date: string
          expense_type: string
          id: string
          notes: string | null
          paid: boolean | null
          paid_with_cash_balance: boolean | null
          payment_date: string | null
          purpose: string
          receipt_url: string | null
          supplier_id: string | null
        }
        Insert: {
          amount?: number
          chart_of_accounts_id: string
          cost_center_id: string
          created_at?: string | null
          created_by?: string | null
          distribution_center_id: string
          due_date?: string | null
          expense_date?: string
          expense_type: string
          id?: string
          notes?: string | null
          paid?: boolean | null
          paid_with_cash_balance?: boolean | null
          payment_date?: string | null
          purpose: string
          receipt_url?: string | null
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          chart_of_accounts_id?: string
          cost_center_id?: string
          created_at?: string | null
          created_by?: string | null
          distribution_center_id?: string
          due_date?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          notes?: string | null
          paid?: boolean | null
          paid_with_cash_balance?: boolean | null
          payment_date?: string | null
          purpose?: string
          receipt_url?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_chart_of_accounts_id_fkey"
            columns: ["chart_of_accounts_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_distribution_center_id_fkey"
            columns: ["distribution_center_id"]
            isOneToOne: false
            referencedRelation: "distribution_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "financial_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          active: boolean | null
          balance: number
          created_at: string | null
          franchisee_user_id: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          active?: boolean | null
          balance?: number
          created_at?: string | null
          franchisee_user_id?: string | null
          id?: string
          name: string
          type?: string
        }
        Update: {
          active?: boolean | null
          balance?: number
          created_at?: string | null
          franchisee_user_id?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      financial_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          justification: string | null
          new_status: string | null
          previous_status: string | null
          record_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          justification?: string | null
          new_status?: string | null
          previous_status?: string | null
          record_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          justification?: string | null
          new_status?: string | null
          previous_status?: string | null
          record_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_audit_logs_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      financial_clients: {
        Row: {
          created_at: string | null
          created_by: string | null
          document: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      financial_goals: {
        Row: {
          created_at: string | null
          created_by: string | null
          current_value: number
          description: string | null
          distribution_center_id: string | null
          end_date: string
          franchisee_user_id: string | null
          goal_type: string
          id: string
          start_date: string
          status: string
          target_value: number
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          current_value?: number
          description?: string | null
          distribution_center_id?: string | null
          end_date: string
          franchisee_user_id?: string | null
          goal_type: string
          id?: string
          start_date: string
          status?: string
          target_value?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          current_value?: number
          description?: string | null
          distribution_center_id?: string | null
          end_date?: string
          franchisee_user_id?: string | null
          goal_type?: string
          id?: string
          start_date?: string
          status?: string
          target_value?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_distribution_center_id_fkey"
            columns: ["distribution_center_id"]
            isOneToOne: false
            referencedRelation: "distribution_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_payment_methods: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          is_credit: boolean | null
          name: string
          slug: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          is_credit?: boolean | null
          name: string
          slug: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          is_credit?: boolean | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      financial_records: {
        Row: {
          account_id: string | null
          amount: number
          client_id: string | null
          created_at: string | null
          created_by_email: string | null
          description: string | null
          distribution_center_id: string | null
          evidence_url: string | null
          id: string
          installments: number | null
          order_number: string | null
          payment_method_id: string | null
          status: string
          transaction_date: string
          transaction_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          client_id?: string | null
          created_at?: string | null
          created_by_email?: string | null
          description?: string | null
          distribution_center_id?: string | null
          evidence_url?: string | null
          id?: string
          installments?: number | null
          order_number?: string | null
          payment_method_id?: string | null
          status?: string
          transaction_date?: string
          transaction_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          client_id?: string | null
          created_at?: string | null
          created_by_email?: string | null
          description?: string | null
          distribution_center_id?: string | null
          evidence_url?: string | null
          id?: string
          installments?: number | null
          order_number?: string | null
          payment_method_id?: string | null
          status?: string
          transaction_date?: string
          transaction_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "financial_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_distribution_center_id_fkey"
            columns: ["distribution_center_id"]
            isOneToOne: false
            referencedRelation: "distribution_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "financial_payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_suppliers: {
        Row: {
          created_at: string | null
          created_by: string | null
          franchisee_user_id: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          franchisee_user_id?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          franchisee_user_id?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          reference_id: string | null
          reference_type: string | null
          status: string
          store_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          store_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          store_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transfers: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          from_account_id: string
          id: string
          to_account_id: string
          transfer_date: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          from_account_id: string
          id?: string
          to_account_id: string
          transfer_date?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          from_account_id?: string
          id?: string
          to_account_id?: string
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_user_cd_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          distribution_center_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          distribution_center_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          distribution_center_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_user_cd_links_distribution_center_id_fkey"
            columns: ["distribution_center_id"]
            isOneToOne: false
            referencedRelation: "distribution_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_users: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          email: string
          id: string
          name: string
          role: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          email: string
          id?: string
          name: string
          role?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      fleet_drivers: {
        Row: {
          active: boolean | null
          created_at: string | null
          current_location: Json | null
          id: string
          last_heartbeat: string | null
          license_number: string | null
          name: string
          phone: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          current_location?: Json | null
          id?: string
          last_heartbeat?: string | null
          license_number?: string | null
          name: string
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          current_location?: Json | null
          id?: string
          last_heartbeat?: string | null
          license_number?: string | null
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fleet_route_events: {
        Row: {
          attachment_url: string | null
          created_at: string
          driver_id: string
          id: string
          latitude: number | null
          longitude: number | null
          observacao: string | null
          order_id: string | null
          order_type: string | null
          resolved_at: string | null
          route_id: string
          severity: string
          tipo: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          driver_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          observacao?: string | null
          order_id?: string | null
          order_type?: string | null
          resolved_at?: string | null
          route_id: string
          severity?: string
          tipo: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          observacao?: string | null
          order_id?: string | null
          order_type?: string | null
          resolved_at?: string | null
          route_id?: string
          severity?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_route_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_route_events_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_route_stop_etas: {
        Row: {
          calculated_at: string
          estimated_distance_meters: number | null
          estimated_travel_seconds: number | null
          id: string
          order_id: string
          order_type: string
          route_id: string
          sequencia: number
        }
        Insert: {
          calculated_at?: string
          estimated_distance_meters?: number | null
          estimated_travel_seconds?: number | null
          id?: string
          order_id: string
          order_type: string
          route_id: string
          sequencia: number
        }
        Update: {
          calculated_at?: string
          estimated_distance_meters?: number | null
          estimated_travel_seconds?: number | null
          id?: string
          order_id?: string
          order_type?: string
          route_id?: string
          sequencia?: number
        }
        Relationships: [
          {
            foreignKeyName: "fleet_route_stop_etas_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_settings: {
        Row: {
          default_service_time_sec: number
          extra: Json
          id: number
          late_critical_min: number
          late_warning_min: number
          min_order_value: number
          updated_at: string
        }
        Insert: {
          default_service_time_sec?: number
          extra?: Json
          id?: number
          late_critical_min?: number
          late_warning_min?: number
          min_order_value?: number
          updated_at?: string
        }
        Update: {
          default_service_time_sec?: number
          extra?: Json
          id?: number
          late_critical_min?: number
          late_warning_min?: number
          min_order_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      fleet_stop_checkpoints: {
        Row: {
          created_at: string
          id: string
          order_id: string
          order_type: string
          route_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          order_type: string
          route_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          order_type?: string
          route_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_stop_checkpoints_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_trips: {
        Row: {
          arrival_time: string | null
          checked_by: string | null
          created_at: string | null
          date: string | null
          departure_time: string
          driver_id: string | null
          id: string
          km_end: number | null
          km_start: number
          km_total: number | null
          notes: string | null
          order_number: string | null
          vehicle_id: string | null
        }
        Insert: {
          arrival_time?: string | null
          checked_by?: string | null
          created_at?: string | null
          date?: string | null
          departure_time: string
          driver_id?: string | null
          id?: string
          km_end?: number | null
          km_start: number
          km_total?: number | null
          notes?: string | null
          order_number?: string | null
          vehicle_id?: string | null
        }
        Update: {
          arrival_time?: string | null
          checked_by?: string | null
          created_at?: string | null
          date?: string | null
          departure_time?: string
          driver_id?: string | null
          id?: string
          km_end?: number | null
          km_start?: number
          km_total?: number | null
          notes?: string | null
          order_number?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "fleet_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_vehicles: {
        Row: {
          active: boolean | null
          created_at: string | null
          current_km: number | null
          id: string
          model: string | null
          name: string
          plate: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          current_km?: number | null
          id?: string
          model?: string | null
          name: string
          plate: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          current_km?: number | null
          id?: string
          model?: string | null
          name?: string
          plate?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      franchisee_order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          subtotal: number | null
          taxa_boleto_unit_applied: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          subtotal?: number | null
          taxa_boleto_unit_applied?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          subtotal?: number | null
          taxa_boleto_unit_applied?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "franchisee_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "franchisee_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franchisee_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "franchisee_products"
            referencedColumns: ["id"]
          },
        ]
      }
      franchisee_orders: {
        Row: {
          advertising_fee: number
          created_at: string | null
          distribution_center_id: string | null
          edit_reason: string | null
          edited_at: string | null
          edited_by_admin: boolean
          fees_total: number
          franchisee_user_id: string
          id: string
          notes: string | null
          payment_method: string | null
          status: string
          subtotal: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          advertising_fee?: number
          created_at?: string | null
          distribution_center_id?: string | null
          edit_reason?: string | null
          edited_at?: string | null
          edited_by_admin?: boolean
          fees_total?: number
          franchisee_user_id: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          advertising_fee?: number
          created_at?: string | null
          distribution_center_id?: string | null
          edit_reason?: string | null
          edited_at?: string | null
          edited_by_admin?: boolean
          fees_total?: number
          franchisee_user_id?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "franchisee_orders_distribution_center_id_fkey"
            columns: ["distribution_center_id"]
            isOneToOne: false
            referencedRelation: "distribution_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franchisee_orders_franchisee_user_id_fkey"
            columns: ["franchisee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      franchisee_product_categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          display_order: number | null
          icon_url: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      franchisee_product_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          product_id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          product_id: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          product_id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "franchisee_product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "franchisee_products"
            referencedColumns: ["id"]
          },
        ]
      }
      franchisee_products: {
        Row: {
          active: boolean | null
          advertising_fee_percentage: number | null
          brand: string | null
          category_id: string
          code: string | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          display_order: number | null
          distribution_center_id: string | null
          gallery_images: Json | null
          has_advertising_fee: boolean | null
          has_nutrition_facts: boolean | null
          id: string
          image_url: string | null
          ingredients: string | null
          name: string
          nutritional_info: Json | null
          price: number
          related_product_ids: Json | null
          stock_quantity: number | null
          taxa: number | null
          unit: string
        }
        Insert: {
          active?: boolean | null
          advertising_fee_percentage?: number | null
          brand?: string | null
          category_id: string
          code?: string | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          display_order?: number | null
          distribution_center_id?: string | null
          gallery_images?: Json | null
          has_advertising_fee?: boolean | null
          has_nutrition_facts?: boolean | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          name: string
          nutritional_info?: Json | null
          price?: number
          related_product_ids?: Json | null
          stock_quantity?: number | null
          taxa?: number | null
          unit?: string
        }
        Update: {
          active?: boolean | null
          advertising_fee_percentage?: number | null
          brand?: string | null
          category_id?: string
          code?: string | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          display_order?: number | null
          distribution_center_id?: string | null
          gallery_images?: Json | null
          has_advertising_fee?: boolean | null
          has_nutrition_facts?: boolean | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          name?: string
          nutritional_info?: Json | null
          price?: number
          related_product_ids?: Json | null
          stock_quantity?: number | null
          taxa?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "franchisee_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "franchisee_product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franchisee_products_distribution_center_id_fkey"
            columns: ["distribution_center_id"]
            isOneToOne: false
            referencedRelation: "distribution_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      franchisee_requests: {
        Row: {
          city: string
          created_at: string | null
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string
          preferred_slug: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string
          status: string | null
          store_name: string
          updated_at: string | null
        }
        Insert: {
          city: string
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone: string
          preferred_slug: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state: string
          status?: string | null
          store_name: string
          updated_at?: string | null
        }
        Update: {
          city?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          preferred_slug?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          status?: string | null
          store_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      game_inventory: {
        Row: {
          id: string
          is_equipped: boolean | null
          item_id: string
          item_type: string
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_equipped?: boolean | null
          item_id: string
          item_type: string
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_equipped?: boolean | null
          item_id?: string
          item_type?: string
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_missions: {
        Row: {
          id: string
          mission_id: string
          progress: number | null
          status: string | null
          target: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          mission_id: string
          progress?: number | null
          status?: string | null
          target: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          mission_id?: string
          progress?: number | null
          status?: string | null
          target?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_missions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_profiles: {
        Row: {
          acai_coins: number
          created_at: string | null
          current_streak: number
          last_played_at: string | null
          level: number
          user_id: string
          xp: number
        }
        Insert: {
          acai_coins?: number
          created_at?: string | null
          current_streak?: number
          last_played_at?: string | null
          level?: number
          user_id: string
          xp?: number
        }
        Update: {
          acai_coins?: number
          created_at?: string | null
          current_streak?: number
          last_played_at?: string | null
          level?: number
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_scores: {
        Row: {
          score: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          score?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          score?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_challenges: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string
          end_date: string
          icon: string | null
          id: string
          metric_table: string | null
          reward_points: number
          target_value: number | null
          title: string
          type: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description: string
          end_date: string
          icon?: string | null
          id?: string
          metric_table?: string | null
          reward_points?: number
          target_value?: number | null
          title: string
          type?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string
          end_date?: string
          icon?: string | null
          id?: string
          metric_table?: string | null
          reward_points?: number
          target_value?: number | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      geo_zones: {
        Row: {
          active: boolean | null
          center_lat: number
          center_lng: number
          city: string | null
          created_at: string | null
          id: string
          min_drivers_required: number
          name: string
          priority_level: number
          radius_km: number
          state: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          center_lat: number
          center_lng: number
          city?: string | null
          created_at?: string | null
          id?: string
          min_drivers_required?: number
          name: string
          priority_level?: number
          radius_km?: number
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          center_lat?: number
          center_lng?: number
          city?: string | null
          created_at?: string | null
          id?: string
          min_drivers_required?: number
          name?: string
          priority_level?: number
          radius_km?: number
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          category: string | null
          cost_per_unit: number
          created_at: string | null
          current_stock: number | null
          description: string | null
          id: string
          is_active: boolean | null
          minimum_stock: number | null
          name: string
          supplier: string | null
          unit: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          cost_per_unit?: number
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          minimum_stock?: number | null
          name: string
          supplier?: string | null
          unit?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          cost_per_unit?: number
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          minimum_stock?: number | null
          name?: string
          supplier?: string | null
          unit?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      integrations: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          franchisee_id: string | null
          id: string
          name: string
          provider: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          config: Json
          created_at?: string
          franchisee_id?: string | null
          id?: string
          name: string
          provider?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          franchisee_id?: string | null
          id?: string
          name?: string
          provider?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_audits: {
        Row: {
          adjustments_applied: boolean | null
          audit_data: Json | null
          created_at: string | null
          id: string
          items_counted: number | null
          items_shortage: number | null
          items_surplus: number | null
          items_with_diff: number | null
          pdf_url: string | null
          store_id: string | null
          user_id: string | null
        }
        Insert: {
          adjustments_applied?: boolean | null
          audit_data?: Json | null
          created_at?: string | null
          id?: string
          items_counted?: number | null
          items_shortage?: number | null
          items_surplus?: number | null
          items_with_diff?: number | null
          pdf_url?: string | null
          store_id?: string | null
          user_id?: string | null
        }
        Update: {
          adjustments_applied?: boolean | null
          audit_data?: Json | null
          created_at?: string | null
          id?: string
          items_counted?: number | null
          items_shortage?: number | null
          items_surplus?: number | null
          items_with_diff?: number | null
          pdf_url?: string | null
          store_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_checklist_items: {
        Row: {
          checklist_id: string
          created_at: string | null
          id: string
          is_required: boolean | null
          name: string
          sort_order: number | null
          type: string
        }
        Insert: {
          checklist_id: string
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          name: string
          sort_order?: number | null
          type?: string
        }
        Update: {
          checklist_id?: string
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          name?: string
          sort_order?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "inventory_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_checklist_responses: {
        Row: {
          checklist_id: string
          completed_at: string | null
          date_reference: string
          employee_name: string | null
          id: string
          status: string | null
          store_id: string
          user_id: string
        }
        Insert: {
          checklist_id: string
          completed_at?: string | null
          date_reference?: string
          employee_name?: string | null
          id?: string
          status?: string | null
          store_id: string
          user_id: string
        }
        Update: {
          checklist_id?: string
          completed_at?: string | null
          date_reference?: string
          employee_name?: string | null
          id?: string
          status?: string | null
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_checklist_responses_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "inventory_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_checklist_responses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_checklist_values: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          photo_url: string | null
          response_id: string
          value_boolean: boolean | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          photo_url?: string | null
          response_id: string
          value_boolean?: boolean | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          photo_url?: string | null
          response_id?: string
          value_boolean?: boolean | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_checklist_values_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_checklist_values_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "inventory_checklist_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_checklists: {
        Row: {
          created_at: string | null
          description: string | null
          frequency: string
          id: string
          is_active: boolean | null
          name: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          name: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          name?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_checklists_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_count_group_items: {
        Row: {
          group_id: string
          item_id: string
        }
        Insert: {
          group_id: string
          item_id: string
        }
        Update: {
          group_id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_group_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "inventory_count_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_group_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_count_groups: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          frequency_days: number
          id: string
          is_active: boolean | null
          name: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          frequency_days?: number
          id?: string
          is_active?: boolean | null
          name: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          frequency_days?: number
          id?: string
          is_active?: boolean | null
          name?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_groups_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_count_schedule: {
        Row: {
          completed_at: string | null
          created_at: string | null
          group_id: string
          id: string
          scheduled_date: string
          status: string
          store_id: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          group_id: string
          id?: string
          scheduled_date: string
          status?: string
          store_id: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          group_id?: string
          id?: string
          scheduled_date?: string
          status?: string
          store_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_schedule_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "inventory_count_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_schedule_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          avg_price: number | null
          category_id: string | null
          code: string | null
          composes_cmv: boolean | null
          created_at: string | null
          current_qty: number
          id: string
          is_active: boolean | null
          last_price: number | null
          manipulation_days: number | null
          minimum_qty: number
          name: string
          price_mode: string | null
          store_id: string
          supplier_id: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          avg_price?: number | null
          category_id?: string | null
          code?: string | null
          composes_cmv?: boolean | null
          created_at?: string | null
          current_qty?: number
          id?: string
          is_active?: boolean | null
          last_price?: number | null
          manipulation_days?: number | null
          minimum_qty?: number
          name: string
          price_mode?: string | null
          store_id: string
          supplier_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Update: {
          avg_price?: number | null
          category_id?: string | null
          code?: string | null
          composes_cmv?: boolean | null
          created_at?: string | null
          current_qty?: number
          id?: string
          is_active?: boolean | null
          last_price?: number | null
          manipulation_days?: number | null
          minimum_qty?: number
          name?: string
          price_mode?: string | null
          store_id?: string
          supplier_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          action: string
          cancelled_at: string | null
          classification: string | null
          created_at: string | null
          id: string
          item_id: string
          moved_at: string | null
          notes: string | null
          qty: number
          store_id: string
          total_value: number
          unit_price: number
          user_id: string | null
        }
        Insert: {
          action: string
          cancelled_at?: string | null
          classification?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          moved_at?: string | null
          notes?: string | null
          qty: number
          store_id: string
          total_value?: number
          unit_price?: number
          user_id?: string | null
        }
        Update: {
          action?: string
          cancelled_at?: string | null
          classification?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          moved_at?: string | null
          notes?: string | null
          qty?: number
          store_id?: string
          total_value?: number
          unit_price?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_recipes: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          product_id: string
          quantity: number
          store_id: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          product_id: string
          quantity?: number
          store_id: string
          unit?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          product_id?: string
          quantity?: number
          store_id?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_recipes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_recurring_count_executions: {
        Row: {
          created_at: string | null
          executed_at: string | null
          executed_by: string | null
          id: string
          items: Json | null
          notes: string | null
          recurring_count_id: string
          status: string
          store_id: string
        }
        Insert: {
          created_at?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          recurring_count_id: string
          status?: string
          store_id: string
        }
        Update: {
          created_at?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          recurring_count_id?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_recurring_count_executions_recurring_count_id_fkey"
            columns: ["recurring_count_id"]
            isOneToOne: false
            referencedRelation: "inventory_recurring_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_recurring_count_executions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_recurring_count_groups: {
        Row: {
          group_id: string
          id: string
          recurring_count_id: string
        }
        Insert: {
          group_id: string
          id?: string
          recurring_count_id: string
        }
        Update: {
          group_id?: string
          id?: string
          recurring_count_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_recurring_count_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "inventory_count_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_recurring_count_groups_recurring_count_id_fkey"
            columns: ["recurring_count_id"]
            isOneToOne: false
            referencedRelation: "inventory_recurring_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_recurring_counts: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notification_time: string | null
          recurrence_type: string
          responsible_id: string | null
          responsible_name: string | null
          store_id: string
          updated_at: string | null
          weekdays: number[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notification_time?: string | null
          recurrence_type?: string
          responsible_id?: string | null
          responsible_name?: string | null
          store_id: string
          updated_at?: string | null
          weekdays?: number[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notification_time?: string | null
          recurrence_type?: string
          responsible_id?: string | null
          responsible_name?: string | null
          store_id?: string
          updated_at?: string | null
          weekdays?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_recurring_counts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_suppliers: {
        Row: {
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      logistics_health_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          active_orders: number
          alert_type: string
          created_at: string | null
          current_capacity: number
          estimated_bottleneck_time: string | null
          id: string
          message: string
          occupancy_rate: number
          online_assemblers: number
          remaining_shift_minutes: number
          required_capacity: number
          resolved_at: string | null
          store_id: string
          suggested_action: string | null
          webhook_response: string | null
          webhook_sent: boolean | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          active_orders: number
          alert_type: string
          created_at?: string | null
          current_capacity: number
          estimated_bottleneck_time?: string | null
          id?: string
          message: string
          occupancy_rate: number
          online_assemblers: number
          remaining_shift_minutes: number
          required_capacity: number
          resolved_at?: string | null
          store_id: string
          suggested_action?: string | null
          webhook_response?: string | null
          webhook_sent?: boolean | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          active_orders?: number
          alert_type?: string
          created_at?: string | null
          current_capacity?: number
          estimated_bottleneck_time?: string | null
          id?: string
          message?: string
          occupancy_rate?: number
          online_assemblers?: number
          remaining_shift_minutes?: number
          required_capacity?: number
          resolved_at?: string | null
          store_id?: string
          suggested_action?: string | null
          webhook_response?: string | null
          webhook_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_health_alerts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_delivery_orders: {
        Row: {
          address_city: string | null
          address_latitude: number | null
          address_longitude: number | null
          address_neighborhood: string | null
          address_number: string | null
          address_street: string | null
          created_at: string | null
          delivered_at: string | null
          franchisee_name: string
          franchisee_user_id: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          proof_photo_url: string | null
          status: string | null
          total_amount: number
        }
        Insert: {
          address_city?: string | null
          address_latitude?: number | null
          address_longitude?: number | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_street?: string | null
          created_at?: string | null
          delivered_at?: string | null
          franchisee_name: string
          franchisee_user_id?: string | null
          id?: string
          notes?: string | null
          order_date: string
          order_number: string
          proof_photo_url?: string | null
          status?: string | null
          total_amount?: number
        }
        Update: {
          address_city?: string | null
          address_latitude?: number | null
          address_longitude?: number | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_street?: string | null
          created_at?: string | null
          delivered_at?: string | null
          franchisee_name?: string
          franchisee_user_id?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          proof_photo_url?: string | null
          status?: string | null
          total_amount?: number
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          category: string | null
          choices: Json | null
          created_at: string | null
          created_by: string | null
          footer_text: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          message: string
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          choices?: Json | null
          created_at?: string | null
          created_by?: string | null
          footer_text?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          message: string
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          choices?: Json | null
          created_at?: string | null
          created_by?: string | null
          footer_text?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          message?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_logs: {
        Row: {
          campaign_id: string | null
          campaign_type: string | null
          customer_id: string | null
          details: Json | null
          id: string
          segment: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id?: string | null
          campaign_type?: string | null
          customer_id?: string | null
          details?: Json | null
          id?: string
          segment?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string | null
          campaign_type?: string | null
          customer_id?: string | null
          details?: Json | null
          id?: string
          segment?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_this_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_feedback: {
        Row: {
          category: string
          comment: string | null
          created_at: string
          customer_id: string | null
          id: string
          nps_score: number | null
          order_id: string
        }
        Insert: {
          category: string
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          nps_score?: number | null
          order_id: string
        }
        Update: {
          category?: string
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          nps_score?: number | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_this_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_feedback_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_toppings: {
        Row: {
          created_at: string
          id: string
          order_item_id: string
          quantity: number
          topping_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_item_id: string
          quantity?: number
          topping_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_item_id?: string
          quantity?: number
          topping_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_toppings_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_toppings_topping_id_fkey"
            columns: ["topping_id"]
            isOneToOne: false
            referencedRelation: "toppings"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          product_id: string
          product_size_id: string | null
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          product_id: string
          product_size_id?: string | null
          quantity?: number
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string
          product_size_id?: string | null
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_size_id_fkey"
            columns: ["product_size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          customer_id: string
          customer_notes: string | null
          delivered_at: string | null
          delivery_address_id: string | null
          delivery_fee: number
          delivery_observation: string | null
          discount_amount: number
          driver_id: string | null
          estimated_delivery_time: number | null
          id: string
          mercadopago_payment_id: string | null
          mercadopago_status: string | null
          order_number: string
          order_type: string
          out_for_delivery_at: string | null
          payment_id: string | null
          payment_method: string
          payment_status: string
          prepared_at: string | null
          proof_photo_url: string | null
          ready_at: string | null
          scheduled_for: string | null
          status: string
          store_id: string
          subtotal: number
          table_number: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          delivered_at?: string | null
          delivery_address_id?: string | null
          delivery_fee?: number
          delivery_observation?: string | null
          discount_amount?: number
          driver_id?: string | null
          estimated_delivery_time?: number | null
          id?: string
          mercadopago_payment_id?: string | null
          mercadopago_status?: string | null
          order_number: string
          order_type: string
          out_for_delivery_at?: string | null
          payment_id?: string | null
          payment_method: string
          payment_status?: string
          prepared_at?: string | null
          proof_photo_url?: string | null
          ready_at?: string | null
          scheduled_for?: string | null
          status?: string
          store_id: string
          subtotal: number
          table_number?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          delivered_at?: string | null
          delivery_address_id?: string | null
          delivery_fee?: number
          delivery_observation?: string | null
          discount_amount?: number
          driver_id?: string | null
          estimated_delivery_time?: number | null
          id?: string
          mercadopago_payment_id?: string | null
          mercadopago_status?: string | null
          order_number?: string
          order_type?: string
          out_for_delivery_at?: string | null
          payment_id?: string | null
          payment_method?: string
          payment_status?: string
          prepared_at?: string | null
          proof_photo_url?: string | null
          ready_at?: string | null
          scheduled_for?: string | null
          status?: string
          store_id?: string
          subtotal?: number
          table_number?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_this_month"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "birthday_customers_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_cash_movements: {
        Row: {
          amount: number
          cash_register_id: string | null
          created_at: string | null
          id: string
          reason: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          cash_register_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          cash_register_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdv_cash_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "pdv_cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_cash_registers: {
        Row: {
          closed_at: string | null
          closing_amount: number | null
          created_at: string | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string | null
          opening_amount: number
          status: string
          store_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          closed_at?: string | null
          closing_amount?: number | null
          created_at?: string | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          opening_amount?: number
          status?: string
          store_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          closed_at?: string | null
          closing_amount?: number | null
          created_at?: string | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          opening_amount?: number
          status?: string
          store_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdv_cash_registers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pdv_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pdv_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_orders: {
        Row: {
          amount_paid: number | null
          cancel_note: string | null
          cancel_reason: string | null
          cash_register_id: string | null
          change_amount: number | null
          created_at: string | null
          customer_cpf: string | null
          customer_name: string | null
          delivery_platform: string | null
          discount: number | null
          id: string
          paid_at: string | null
          payment_method: string | null
          sales_channel: string | null
          status: string
          store_id: string | null
          subtotal: number | null
          table_id: string | null
          total: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          cancel_note?: string | null
          cancel_reason?: string | null
          cash_register_id?: string | null
          change_amount?: number | null
          created_at?: string | null
          customer_cpf?: string | null
          customer_name?: string | null
          delivery_platform?: string | null
          discount?: number | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          sales_channel?: string | null
          status?: string
          store_id?: string | null
          subtotal?: number | null
          table_id?: string | null
          total?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          cancel_note?: string | null
          cancel_reason?: string | null
          cash_register_id?: string | null
          change_amount?: number | null
          created_at?: string | null
          customer_cpf?: string | null
          customer_name?: string | null
          delivery_platform?: string | null
          discount?: number | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          sales_channel?: string | null
          status?: string
          store_id?: string | null
          subtotal?: number | null
          table_id?: string | null
          total?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdv_orders_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "pdv_cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "pdv_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_settings: {
        Row: {
          allow_negative_stock: boolean | null
          auto_print: boolean | null
          auto_receive_cash: boolean | null
          created_at: string | null
          id: string
          integrate_with_receivables: boolean | null
          min_discount_value: number | null
          printer_ip: string | null
          printer_model: string | null
          printer_port: number | null
          qz_printer_name: string | null
          require_cpf: boolean | null
          updated_at: string | null
          use_qz_tray: boolean | null
          user_id: string | null
        }
        Insert: {
          allow_negative_stock?: boolean | null
          auto_print?: boolean | null
          auto_receive_cash?: boolean | null
          created_at?: string | null
          id?: string
          integrate_with_receivables?: boolean | null
          min_discount_value?: number | null
          printer_ip?: string | null
          printer_model?: string | null
          printer_port?: number | null
          qz_printer_name?: string | null
          require_cpf?: boolean | null
          updated_at?: string | null
          use_qz_tray?: boolean | null
          user_id?: string | null
        }
        Update: {
          allow_negative_stock?: boolean | null
          auto_print?: boolean | null
          auto_receive_cash?: boolean | null
          created_at?: string | null
          id?: string
          integrate_with_receivables?: boolean | null
          min_discount_value?: number | null
          printer_ip?: string | null
          printer_model?: string | null
          printer_port?: number | null
          qz_printer_name?: string | null
          require_cpf?: boolean | null
          updated_at?: string | null
          use_qz_tray?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      pdv_tables: {
        Row: {
          capacity: number | null
          created_at: string | null
          current_order_id: string | null
          id: string
          number: number
          status: string
          store_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          current_order_id?: string | null
          id?: string
          number: number
          status?: string
          store_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          current_order_id?: string | null
          id?: string
          number?: number
          status?: string
          store_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_current_order"
            columns: ["current_order_id"]
            isOneToOne: false
            referencedRelation: "pdv_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_tables_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_delivery_prices: {
        Row: {
          created_at: string | null
          id: string
          platform_id: string | null
          price: number
          product_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform_id?: string | null
          price?: number
          product_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          platform_id?: string | null
          price?: number
          product_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_ingredients: {
        Row: {
          created_at: string
          id: string
          item_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_platform_prices: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          platform_id: string
          price: number
          product_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform_id: string
          price?: number
          product_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform_id?: string
          price?: number
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_platform_prices_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "delivery_platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_platform_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recipes: {
        Row: {
          created_at: string | null
          id: string
          ingredient_id: string
          product_id: string
          quantity: number
          unit: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_id: string
          product_id: string
          quantity: number
          unit: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_id?: string
          product_id?: string
          quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          ml_size: number | null
          name: string
          price: number
          product_id: string
          promotional_price: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          ml_size?: number | null
          name: string
          price: number
          product_id: string
          promotional_price?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          ml_size?: number | null
          name?: string
          price?: number
          product_id?: string
          promotional_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_topping_categories: {
        Row: {
          active: boolean | null
          created_at: string
          display_order: number | null
          id: string
          max_quantity: number | null
          min_quantity: number | null
          product_id: string
          required: boolean | null
          topping_category_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          display_order?: number | null
          id?: string
          max_quantity?: number | null
          min_quantity?: number | null
          product_id: string
          required?: boolean | null
          topping_category_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          display_order?: number | null
          id?: string
          max_quantity?: number | null
          min_quantity?: number | null
          product_id?: string
          required?: boolean | null
          topping_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_topping_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_topping_categories_topping_category_id_fkey"
            columns: ["topping_category_id"]
            isOneToOne: false
            referencedRelation: "topping_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_videos: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          product_id: string
          thumbnail_url: string | null
          title: string | null
          type: string | null
          updated_at: string | null
          video_url: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          product_id: string
          thumbnail_url?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          video_url: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          product_id?: string
          thumbnail_url?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_videos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          base_image_url: string | null
          category_id: string
          code: string | null
          cost_price: number | null
          created_at: string
          current_stock: number | null
          description: string | null
          display_order: number
          distribution_center_id: string | null
          id: string
          minimum_stock: number | null
          name: string
          new_category: string | null
          profit_margin: number | null
          sale_price: number | null
          sale_type: string | null
          unit: string | null
          updated_at: string
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          active?: boolean
          base_image_url?: string | null
          category_id: string
          code?: string | null
          cost_price?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          display_order?: number
          distribution_center_id?: string | null
          id?: string
          minimum_stock?: number | null
          name: string
          new_category?: string | null
          profit_margin?: number | null
          sale_price?: number | null
          sale_type?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          active?: boolean
          base_image_url?: string | null
          category_id?: string
          code?: string | null
          cost_price?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          display_order?: number
          distribution_center_id?: string | null
          id?: string
          minimum_stock?: number | null
          name?: string
          new_category?: string | null
          profit_margin?: number | null
          sale_price?: number | null
          sale_type?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_distribution_center_id_fkey"
            columns: ["distribution_center_id"]
            isOneToOne: false
            referencedRelation: "distribution_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          applies_to: string
          coupon_code: string | null
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          max_discount: number | null
          min_order_value: number | null
          name: string
          start_date: string
          store_id: string
          target_ids: string[] | null
          updated_at: string | null
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          active?: boolean
          applies_to?: string
          coupon_code?: string | null
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          end_date?: string | null
          id?: string
          max_discount?: number | null
          min_order_value?: number | null
          name: string
          start_date?: string
          store_id: string
          target_ids?: string[] | null
          updated_at?: string | null
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          active?: boolean
          applies_to?: string
          coupon_code?: string | null
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          max_discount?: number | null
          min_order_value?: number | null
          name?: string
          start_date?: string
          store_id?: string
          target_ids?: string[] | null
          updated_at?: string | null
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      quote_favorites: {
        Row: {
          franchisee_id: string
          id: number
          quote_id: string
          saved_at: string | null
        }
        Insert: {
          franchisee_id: string
          id?: number
          quote_id: string
          saved_at?: string | null
        }
        Update: {
          franchisee_id?: string
          id?: number
          quote_id?: string
          saved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_favorites_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_usage: {
        Row: {
          campaign_id: string | null
          context: string | null
          franchisee_id: string | null
          id: number
          ip_address: string | null
          quote_id: string
          used_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          context?: string | null
          franchisee_id?: string | null
          id?: number
          ip_address?: string | null
          quote_id: string
          used_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          context?: string | null
          franchisee_id?: string | null
          id?: number
          ip_address?: string | null
          quote_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_usage_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          author_id: number
          category_id: number
          created_at: string | null
          favorite_count: number | null
          id: string
          is_active: boolean | null
          source: string | null
          tags: Json | null
          text: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id: number
          category_id: number
          created_at?: string | null
          favorite_count?: number | null
          id: string
          is_active?: boolean | null
          source?: string | null
          tags?: Json | null
          text: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: number
          category_id?: number
          created_at?: string | null
          favorite_count?: number | null
          id?: string
          is_active?: boolean | null
          source?: string | null
          tags?: Json | null
          text?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "quote_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_auditoria: {
        Row: {
          acao: string
          alterado_por: string | null
          criado_em: string
          dados_antes: Json | null
          dados_depois: Json | null
          id: string
          ip: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          alterado_por?: string | null
          criado_em?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          ip?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          alterado_por?: string | null
          criado_em?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          ip?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rbac_auditoria_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_auditoria_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_modulos: {
        Row: {
          categoria: string
          codigo: string
          descricao: string | null
          nome: string
          ordem: number
          rota: string | null
        }
        Insert: {
          categoria: string
          codigo: string
          descricao?: string | null
          nome: string
          ordem?: number
          rota?: string | null
        }
        Update: {
          categoria?: string
          codigo?: string
          descricao?: string | null
          nome?: string
          ordem?: number
          rota?: string | null
        }
        Relationships: []
      }
      rbac_perfil_permissoes: {
        Row: {
          modulo_codigo: string
          nivel: number
          perfil: string
        }
        Insert: {
          modulo_codigo: string
          nivel?: number
          perfil: string
        }
        Update: {
          modulo_codigo?: string
          nivel?: number
          perfil?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_perfil_permissoes_modulo_codigo_fkey"
            columns: ["modulo_codigo"]
            isOneToOne: false
            referencedRelation: "rbac_modulos"
            referencedColumns: ["codigo"]
          },
        ]
      }
      rbac_usuario_permissoes: {
        Row: {
          id: string
          modulo_codigo: string
          nivel: number
          usuario_id: string
        }
        Insert: {
          id?: string
          modulo_codigo: string
          nivel?: number
          usuario_id: string
        }
        Update: {
          id?: string
          modulo_codigo?: string
          nivel?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_usuario_permissoes_modulo_codigo_fkey"
            columns: ["modulo_codigo"]
            isOneToOne: false
            referencedRelation: "rbac_modulos"
            referencedColumns: ["codigo"]
          },
        ]
      }
      scheduled_campaigns: {
        Row: {
          campaign_id: string | null
          choices: Json | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          executed_at: string | null
          failed_count: number | null
          footer_text: string | null
          id: string
          image_url: string | null
          message: string
          name: string
          scheduled_for: string
          segment: string
          sent_count: number | null
          status: string | null
          total_recipients: number | null
        }
        Insert: {
          campaign_id?: string | null
          choices?: Json | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          executed_at?: string | null
          failed_count?: number | null
          footer_text?: string | null
          id?: string
          image_url?: string | null
          message: string
          name: string
          scheduled_for: string
          segment: string
          sent_count?: number | null
          status?: string | null
          total_recipients?: number | null
        }
        Update: {
          campaign_id?: string | null
          choices?: Json | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          executed_at?: string | null
          failed_count?: number | null
          footer_text?: string | null
          id?: string
          image_url?: string | null
          message?: string
          name?: string
          scheduled_for?: string
          segment?: string
          sent_count?: number | null
          status?: string | null
          total_recipients?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_campaigns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_bonificacao_items: {
        Row: {
          bonificacao_id: string
          created_at: string
          descricao: string
          id: string
          item_id: string | null
          quantidade: number
          unidade: string | null
          unit_price: number | null
        }
        Insert: {
          bonificacao_id: string
          created_at?: string
          descricao: string
          id?: string
          item_id?: string | null
          quantidade?: number
          unidade?: string | null
          unit_price?: number | null
        }
        Update: {
          bonificacao_id?: string
          created_at?: string
          descricao?: string
          id?: string
          item_id?: string | null
          quantidade?: number
          unidade?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_bonificacao_items_bonificacao_id_fkey"
            columns: ["bonificacao_id"]
            isOneToOne: false
            referencedRelation: "stock_bonificacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_bonificacao_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_bonificacoes: {
        Row: {
          autorizado_por: string
          created_at: string
          data: string
          favorecido: string | null
          feedback_status: string | null
          id: string
          is_internal_consumption: boolean | null
          motivo: string | null
          observacoes: string | null
          registrado_por: string | null
          responsavel_entrega: string | null
          store_id: string | null
          whatsapp: string | null
        }
        Insert: {
          autorizado_por: string
          created_at?: string
          data?: string
          favorecido?: string | null
          feedback_status?: string | null
          id?: string
          is_internal_consumption?: boolean | null
          motivo?: string | null
          observacoes?: string | null
          registrado_por?: string | null
          responsavel_entrega?: string | null
          store_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          autorizado_por?: string
          created_at?: string
          data?: string
          favorecido?: string | null
          feedback_status?: string | null
          id?: string
          is_internal_consumption?: boolean | null
          motivo?: string | null
          observacoes?: string | null
          registrado_por?: string | null
          responsavel_entrega?: string | null
          store_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_bonificacoes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          id: string
          ingredient_id: string | null
          movement_type: string
          quantity: number
          reason: string | null
          reference_id: string | null
          total_cost: number | null
          unit_cost: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          movement_type: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          movement_type?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      store_assemblers: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          shift_end: string | null
          shift_start: string | null
          status: string
          store_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          shift_end?: string | null
          shift_start?: string | null
          status?: string
          store_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          shift_end?: string | null
          shift_start?: string | null
          status?: string
          store_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_assemblers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_capacity_settings: {
        Row: {
          alert_radius_km: number | null
          avg_delivery_time_minutes: number | null
          created_at: string | null
          critical_threshold: number | null
          daily_operating_minutes: number | null
          id: string
          max_orders_per_driver: number | null
          store_id: string
          updated_at: string | null
          warning_threshold: number | null
        }
        Insert: {
          alert_radius_km?: number | null
          avg_delivery_time_minutes?: number | null
          created_at?: string | null
          critical_threshold?: number | null
          daily_operating_minutes?: number | null
          id?: string
          max_orders_per_driver?: number | null
          store_id: string
          updated_at?: string | null
          warning_threshold?: number | null
        }
        Update: {
          alert_radius_km?: number | null
          avg_delivery_time_minutes?: number | null
          created_at?: string | null
          critical_threshold?: number | null
          daily_operating_minutes?: number | null
          id?: string
          max_orders_per_driver?: number | null
          store_id?: string
          updated_at?: string | null
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_capacity_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_logistics_config: {
        Row: {
          assembly_time_minutes: number
          created_at: string | null
          critical_threshold_percent: number
          id: string
          safety_margin: number
          shift_duration_minutes: number
          store_id: string
          target_assembly_time: number
          updated_at: string | null
          warning_threshold_percent: number
          webhook_enabled: boolean | null
          webhook_url: string | null
        }
        Insert: {
          assembly_time_minutes?: number
          created_at?: string | null
          critical_threshold_percent?: number
          id?: string
          safety_margin?: number
          shift_duration_minutes?: number
          store_id: string
          target_assembly_time?: number
          updated_at?: string | null
          warning_threshold_percent?: number
          webhook_enabled?: boolean | null
          webhook_url?: string | null
        }
        Update: {
          assembly_time_minutes?: number
          created_at?: string | null
          critical_threshold_percent?: number
          id?: string
          safety_margin?: number
          shift_duration_minutes?: number
          store_id?: string
          target_assembly_time?: number
          updated_at?: string | null
          warning_threshold_percent?: number
          webhook_enabled?: boolean | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_logistics_config_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_support_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          distance_km: number | null
          expires_at: string | null
          id: string
          needed_drivers: number | null
          reason: string | null
          requesting_store_id: string
          responded_at: string | null
          status: string
          supporting_store_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          distance_km?: number | null
          expires_at?: string | null
          id?: string
          needed_drivers?: number | null
          reason?: string | null
          requesting_store_id: string
          responded_at?: string | null
          status?: string
          supporting_store_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          distance_km?: number | null
          expires_at?: string | null
          id?: string
          needed_drivers?: number | null
          reason?: string | null
          requesting_store_id?: string
          responded_at?: string | null
          status?: string
          supporting_store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_support_requests_requesting_store_id_fkey"
            columns: ["requesting_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_support_requests_supporting_store_id_fkey"
            columns: ["supporting_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          accepts_card: boolean | null
          accepts_cash: boolean | null
          accepts_pix: boolean | null
          active: boolean
          address: string | null
          address_complement: string | null
          address_number: string | null
          approved_at: string | null
          approved_by: string | null
          banner_url: string | null
          business_hours: Json | null
          city: string | null
          created_at: string
          created_by: string | null
          delivery_fee: number | null
          delivery_radius_km: number | null
          delivery_time: number | null
          distribution_center_id: string | null
          franchisee_user_id: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          mercadopago_access_token: string | null
          mercadopago_public_key: string | null
          min_order_value: number | null
          name: string
          neighborhood: string | null
          phone: string | null
          preparation_time: number | null
          requires_change: boolean | null
          slug: string | null
          state: string | null
          status: string | null
          updated_at: string
          zip_code: string | null
          zipcode: string | null
        }
        Insert: {
          accepts_card?: boolean | null
          accepts_cash?: boolean | null
          accepts_pix?: boolean | null
          active?: boolean
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          approved_at?: string | null
          approved_by?: string | null
          banner_url?: string | null
          business_hours?: Json | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          delivery_fee?: number | null
          delivery_radius_km?: number | null
          delivery_time?: number | null
          distribution_center_id?: string | null
          franchisee_user_id?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mercadopago_access_token?: string | null
          mercadopago_public_key?: string | null
          min_order_value?: number | null
          name: string
          neighborhood?: string | null
          phone?: string | null
          preparation_time?: number | null
          requires_change?: boolean | null
          slug?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          zip_code?: string | null
          zipcode?: string | null
        }
        Update: {
          accepts_card?: boolean | null
          accepts_cash?: boolean | null
          accepts_pix?: boolean | null
          active?: boolean
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          approved_at?: string | null
          approved_by?: string | null
          banner_url?: string | null
          business_hours?: Json | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          delivery_fee?: number | null
          delivery_radius_km?: number | null
          delivery_time?: number | null
          distribution_center_id?: string | null
          franchisee_user_id?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mercadopago_access_token?: string | null
          mercadopago_public_key?: string | null
          min_order_value?: number | null
          name?: string
          neighborhood?: string | null
          phone?: string | null
          preparation_time?: number | null
          requires_change?: boolean | null
          slug?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          zip_code?: string | null
          zipcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_distribution_center_id_fkey"
            columns: ["distribution_center_id"]
            isOneToOne: false
            referencedRelation: "distribution_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      topping_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          max_selections: number | null
          name: string
          store_id: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          max_selections?: number | null
          name: string
          store_id?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          max_selections?: number | null
          name?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topping_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      toppings: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          name: string
          price: number | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          name: string
          price?: number | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          name?: string
          price?: number | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "toppings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "topping_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toppings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_lessons: {
        Row: {
          created_at: string
          description: string | null
          duration: string | null
          id: string
          order: number
          subtitle: string | null
          title: string
          trail_id: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          order?: number
          subtitle?: string | null
          title: string
          trail_id?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          order?: number
          subtitle?: string | null
          title?: string
          trail_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uni_lessons_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "uni_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_links: {
        Row: {
          created_at: string
          description: string | null
          id: string
          lesson_id: string | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string | null
          title: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "uni_links_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "uni_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_materials: {
        Row: {
          created_at: string
          id: string
          lesson_id: string | null
          name: string
          size: string | null
          type: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          name: string
          size?: string | null
          type?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          name?: string
          size?: string | null
          type?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uni_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "uni_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          lesson_id: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uni_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "uni_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_questions: {
        Row: {
          answered: boolean | null
          author_avatar: string | null
          author_name: string | null
          created_at: string
          id: string
          lesson_id: string | null
          reply: string | null
          reply_at: string | null
          text: string
          user_id: string | null
        }
        Insert: {
          answered?: boolean | null
          author_avatar?: string | null
          author_name?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          reply?: string | null
          reply_at?: string | null
          text: string
          user_id?: string | null
        }
        Update: {
          answered?: boolean | null
          author_avatar?: string | null
          author_name?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          reply?: string | null
          reply_at?: string | null
          text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uni_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "uni_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_trails: {
        Row: {
          active: boolean | null
          category: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          level: string
          required: boolean | null
          thumbnail: string | null
          title: string
        }
        Insert: {
          active?: boolean | null
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          level?: string
          required?: boolean | null
          thumbnail?: string | null
          title: string
        }
        Update: {
          active?: boolean | null
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          level?: string
          required?: boolean | null
          thumbnail?: string | null
          title?: string
        }
        Relationships: []
      }
      user_challenges: {
        Row: {
          challenge_id: string | null
          completed_at: string | null
          id: string
          joined_at: string | null
          progress: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          completed_at?: string | null
          id?: string
          joined_at?: string | null
          progress?: number | null
          status?: string
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          completed_at?: string | null
          id?: string
          joined_at?: string | null
          progress?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "gamification_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          ativo: boolean
          caf_ativo: boolean
          caf_categorias: string[]
          cpf: string | null
          criado_em: string
          criado_por: string | null
          email: string
          foto: string | null
          id: string
          is_protected: boolean
          nome: string
          perfil: string
          telefone: string | null
          ultimo_acesso: string | null
          unidade_id: string | null
        }
        Insert: {
          ativo?: boolean
          caf_ativo?: boolean
          caf_categorias?: string[]
          cpf?: string | null
          criado_em?: string
          criado_por?: string | null
          email: string
          foto?: string | null
          id: string
          is_protected?: boolean
          nome?: string
          perfil?: string
          telefone?: string | null
          ultimo_acesso?: string | null
          unidade_id?: string | null
        }
        Update: {
          ativo?: boolean
          caf_ativo?: boolean
          caf_categorias?: string[]
          cpf?: string | null
          criado_em?: string
          criado_por?: string | null
          email?: string
          foto?: string | null
          id?: string
          is_protected?: boolean
          nome?: string
          perfil?: string
          telefone?: string | null
          ultimo_acesso?: string | null
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
      user_unidades: {
        Row: {
          id: string
          store_id: string
          usuario_id: string
        }
        Insert: {
          id?: string
          store_id: string
          usuario_id: string
        }
        Update: {
          id?: string
          store_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unidades_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_verifications: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          name: string | null
          phone: string
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string
          id?: string
          name?: string | null
          phone: string
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          name?: string | null
          phone?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      zone_coverage_status: {
        Row: {
          checked_at: string | null
          coverage_status: string | null
          driver_deficit: number | null
          drivers_available: number | null
          drivers_busy: number | null
          id: string
          pending_orders: number | null
          stores_online: number | null
          zone_id: string | null
        }
        Insert: {
          checked_at?: string | null
          coverage_status?: string | null
          driver_deficit?: number | null
          drivers_available?: number | null
          drivers_busy?: number | null
          id?: string
          pending_orders?: number | null
          stores_online?: number | null
          zone_id?: string | null
        }
        Update: {
          checked_at?: string | null
          coverage_status?: string | null
          driver_deficit?: number | null
          drivers_available?: number | null
          drivers_busy?: number | null
          id?: string
          pending_orders?: number | null
          stores_online?: number | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zone_coverage_status_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "geo_zones"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      birthday_customers_this_month: {
        Row: {
          age: number | null
          birth_date: string | null
          birthday_date: string | null
          created_at: string | null
          email: string | null
          first_order_at: string | null
          gender: string | null
          id: string | null
          last_order_at: string | null
          loyalty_points: number | null
          loyalty_tier: string | null
          name: string | null
          notes: string | null
          opt_in_marketing: boolean | null
          phone: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          age?: never
          birth_date?: string | null
          birthday_date?: string | null
          created_at?: string | null
          email?: string | null
          first_order_at?: string | null
          gender?: string | null
          id?: string | null
          last_order_at?: string | null
          loyalty_points?: number | null
          loyalty_tier?: string | null
          name?: string | null
          notes?: string | null
          opt_in_marketing?: boolean | null
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          age?: never
          birth_date?: string | null
          birthday_date?: string | null
          created_at?: string | null
          email?: string | null
          first_order_at?: string | null
          gender?: string | null
          id?: string | null
          last_order_at?: string | null
          loyalty_points?: number | null
          loyalty_tier?: string | null
          name?: string | null
          notes?: string | null
          opt_in_marketing?: boolean | null
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      birthday_customers_today: {
        Row: {
          age: number | null
          birth_date: string | null
          created_at: string | null
          email: string | null
          first_order_at: string | null
          gender: string | null
          id: string | null
          last_order_at: string | null
          loyalty_points: number | null
          loyalty_tier: string | null
          name: string | null
          notes: string | null
          opt_in_marketing: boolean | null
          phone: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          age?: never
          birth_date?: string | null
          created_at?: string | null
          email?: string | null
          first_order_at?: string | null
          gender?: string | null
          id?: string | null
          last_order_at?: string | null
          loyalty_points?: number | null
          loyalty_tier?: string | null
          name?: string | null
          notes?: string | null
          opt_in_marketing?: boolean | null
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          age?: never
          birth_date?: string | null
          created_at?: string | null
          email?: string | null
          first_order_at?: string | null
          gender?: string | null
          id?: string | null
          last_order_at?: string | null
          loyalty_points?: number | null
          loyalty_tier?: string | null
          name?: string | null
          notes?: string | null
          opt_in_marketing?: boolean | null
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      customer_analytics: {
        Row: {
          favorite_product: string | null
          first_order_date: string | null
          id: string | null
          last_order_date: string | null
          ltv: number | null
          name: string | null
          phone: string | null
          status: string | null
          total_orders: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_b2b_terms: {
        Args: {
          p_declaration_text: string
          p_device_fingerprint?: string
          p_driver_id: string
          p_full_scroll_completed: boolean
          p_ip_address?: string
          p_terms_version_id: string
          p_user_agent?: string
        }
        Returns: Json
      }
      accept_displacement_mission: {
        Args: { p_driver_id: string; p_mission_id: string }
        Returns: Json
      }
      add_franchisee_master_role: {
        Args: { user_email: string }
        Returns: string
      }
      admin_update_campaign_status: {
        Args: {
          p_campaign_id: string
          p_failed_count?: number
          p_sent_count?: number
          p_status: string
        }
        Returns: undefined
      }
      bulk_update_products_from_spreadsheet: {
        Args: { p_items: Json }
        Returns: number
      }
      calculate_distance_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      calculate_logistics_health: {
        Args: { p_store_id: string }
        Returns: {
          active_orders: number
          assembly_time: number
          available_capacity: number
          current_capacity: number
          estimated_bottleneck_time: string
          health_status: string
          minutes_until_bottleneck: number
          occupancy_rate: number
          online_assemblers: number
          pending_assembly: number
          remaining_shift_minutes: number
          required_capacity: number
          safety_margin: number
          target_assembly_time: number
          total_assemblers: number
        }[]
      }
      calculate_store_occupancy: {
        Args: { p_store_id: string }
        Returns: {
          active_orders: number
          available_drivers: number
          estimated_wait_time: number
          occupancy_rate: number
          status: string
          total_drivers: number
        }[]
      }
      cancel_order: {
        Args: { order_id_input: string; reason_input: string }
        Returns: Json
      }
      check_cnae_compatibility: {
        Args: { p_cnae: string }
        Returns: {
          cnae_descricao: string
          is_allowed: boolean
          is_primary: boolean
          requires_warning: boolean
          warning_message: string
        }[]
      }
      check_driver_compliance: { Args: { p_driver_id: string }; Returns: Json }
      check_zone_coverage: {
        Args: never
        Returns: {
          coverage_status: string
          driver_deficit: number
          drivers_available: number
          stores_online: number
          zone_id: string
          zone_name: string
        }[]
      }
      confirm_user_email: { Args: { user_email: string }; Returns: undefined }
      create_auth_user_for_franchisee: {
        Args: { p_email: string; p_name: string; p_password: string }
        Returns: string
      }
      driver_zone_checkin: {
        Args: { p_driver_id: string; p_lat: number; p_lng: number }
        Returns: Json
      }
      franchisee_peer_user_ids: {
        Args: { p_user_id: string }
        Returns: {
          user_id: string
        }[]
      }
      generate_caf_protocolo: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      get_auth_logs: {
        Args: { limit_count?: number }
        Returns: {
          action: string
          created_at: string
          id: string
          ip_address: string
          payload: Json
          user_email: string
        }[]
      }
      get_available_drivers: {
        Args: { p_store_id: string }
        Returns: {
          active: boolean
          b2b_terms_accepted: boolean | null
          b2b_terms_accepted_at: string | null
          b2b_terms_pdf_url: string | null
          b2b_terms_version: string | null
          cnae_compatible: boolean | null
          cnae_principal: string | null
          cnae_warning: string | null
          cnpj: string | null
          cnpj_situacao: string | null
          cnpj_validated_at: string | null
          cnpj_validation_data: Json | null
          created_at: string
          current_location: Json | null
          id: string
          is_global: boolean | null
          mei_status: string | null
          name: string
          nome_fantasia: string | null
          phone: string
          pj_bank_account: Json | null
          rating: number | null
          razao_social: string | null
          status: string
          store_id: string | null
          total_deliveries: number | null
          updated_at: string
          user_id: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "delivery_drivers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_campaign_stats: {
        Args: { time_range_days?: number }
        Returns: {
          avg_per_day: number
          by_segment: Json
          total_campaigns: number
          total_sent: number
        }[]
      }
      get_coo_logistics_dashboard: {
        Args: never
        Returns: {
          active_orders: number
          current_capacity: number
          health_status: string
          last_alert_time: string
          minutes_until_bottleneck: number
          occupancy_rate: number
          online_assemblers: number
          store_id: string
          store_name: string
          unresolved_alerts: number
        }[]
      }
      get_displacement_analytics_report: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          acceptance_rate: number
          avg_time_to_fill_minutes: number
          effectiveness_rate: number
          total_drivers_accepted: number
          total_drivers_notified: number
          total_voids: number
          voids_filled: number
          voids_unfilled: number
          zone_id: string
          zone_name: string
        }[]
      }
      get_driver_missions: {
        Args: { p_driver_id: string }
        Returns: {
          created_at: string
          distance_km: number
          estimated_time_minutes: number
          expires_at: string
          mission_id: string
          priority_granted: boolean
          status: string
          zone_center_lat: number
          zone_center_lng: number
          zone_id: string
          zone_name: string
        }[]
      }
      get_heatmap_data: {
        Args: never
        Returns: {
          center_lat: number
          center_lng: number
          coverage_status: string
          drivers_available: number
          drivers_needed: number
          heat_level: number
          pending_orders: number
          radius_km: number
          zone_id: string
          zone_name: string
        }[]
      }
      get_my_franchisee_id: { Args: never; Returns: string }
      get_nearby_stores: {
        Args: { p_radius_km?: number; p_store_id: string }
        Returns: {
          available_drivers: number
          distance_km: number
          store_id: string
          store_name: string
        }[]
      }
      get_network_ranking: {
        Args: never
        Returns: {
          is_current_user: boolean
          lessons_completed: number
          rank_pos: number
          revenue: number
          score: number
          store_city: string
          store_id: string
          store_name: string
        }[]
      }
      get_next_monday: { Args: { from_date?: string }; Returns: string }
      get_random_quote: {
        Args: { p_category_id?: number }
        Returns: {
          author_color: string
          author_name: string
          category_name: string
          id: string
          source: string
          text: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_master: { Args: never; Returns: boolean }
      perfil_to_app_role: {
        Args: { p: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      register_cnpj_validation: {
        Args: {
          p_api_response: Json
          p_api_source: string
          p_cnpj: string
          p_driver_id: string
        }
        Returns: Json
      }
      reject_displacement_mission: {
        Args: { p_driver_id: string; p_mission_id: string }
        Returns: Json
      }
      user_manages_store: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      validate_bank_account: {
        Args: {
          p_account_number: string
          p_account_type: string
          p_agency: string
          p_bank_code: string
          p_bank_name: string
          p_driver_id: string
          p_holder_document: string
          p_holder_document_type: string
          p_holder_name: string
        }
        Returns: Json
      }
      verify_challenge_progress: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff" | "franchisee_master"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "manager", "staff", "franchisee_master"],
    },
  },
} as const
