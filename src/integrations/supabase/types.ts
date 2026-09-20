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
      alocacoes: {
        Row: {
          created_at: string
          horas_planejadas: number
          id: string
          observacao: string | null
          profile_id: string
          projeto_id: string
          semana: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          horas_planejadas?: number
          id?: string
          observacao?: string | null
          profile_id: string
          projeto_id: string
          semana: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          horas_planejadas?: number
          id?: string
          observacao?: string | null
          profile_id?: string
          projeto_id?: string
          semana?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alocacoes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      apontamentos: {
        Row: {
          aprovado_em: string | null
          aprovador_id: string | null
          created_at: string
          data: string
          deleted_at: string | null
          descricao: string | null
          faturavel: boolean
          horas: number
          id: string
          observacao_aprovacao: string | null
          profile_id: string
          projeto_id: string
          status: Database["public"]["Enums"]["apontamento_status"]
          tarefa_id: string | null
          tenant_id: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovador_id?: string | null
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string | null
          faturavel?: boolean
          horas?: number
          id?: string
          observacao_aprovacao?: string | null
          profile_id: string
          projeto_id: string
          status?: Database["public"]["Enums"]["apontamento_status"]
          tarefa_id?: string | null
          tenant_id: string
        }
        Update: {
          aprovado_em?: string | null
          aprovador_id?: string | null
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string | null
          faturavel?: boolean
          horas?: number
          id?: string
          observacao_aprovacao?: string | null
          profile_id?: string
          projeto_id?: string
          status?: Database["public"]["Enums"]["apontamento_status"]
          tarefa_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apontamentos_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          acao: string
          campo: string | null
          created_at: string
          entidade: string
          entidade_id: string | null
          id: string
          profile_id: string | null
          projeto_id: string | null
          tenant_id: string
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          acao: string
          campo?: string | null
          created_at?: string
          entidade: string
          entidade_id?: string | null
          id?: string
          profile_id?: string | null
          projeto_id?: string | null
          tenant_id: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          acao?: string
          campo?: string | null
          created_at?: string
          entidade?: string
          entidade_id?: string | null
          id?: string
          profile_id?: string | null
          projeto_id?: string | null
          tenant_id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_itens: {
        Row: {
          checklist_id: string
          concluido: boolean
          created_at: string
          descricao: string
          id: string
          ordem: number
          tenant_id: string
        }
        Insert: {
          checklist_id: string
          concluido?: boolean
          created_at?: string
          descricao: string
          id?: string
          ordem?: number
          tenant_id: string
        }
        Update: {
          checklist_id?: string
          concluido?: boolean
          created_at?: string
          descricao?: string
          id?: string
          ordem?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_itens_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_itens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          created_at: string
          id: string
          tarefa_id: string
          tenant_id: string
          titulo: string
        }
        Insert: {
          created_at?: string
          id?: string
          tarefa_id: string
          tenant_id: string
          titulo?: string
        }
        Update: {
          created_at?: string
          id?: string
          tarefa_id?: string
          tenant_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_contatos: {
        Row: {
          cargo: string | null
          cliente_id: string
          created_at: string
          deleted_at: string | null
          departamento: string | null
          email: string | null
          financeiro: boolean
          id: string
          nome: string
          principal: boolean
          responsavel_projeto: boolean
          tecnico: boolean
          telefone: string | null
          tenant_id: string
          whatsapp: string | null
        }
        Insert: {
          cargo?: string | null
          cliente_id: string
          created_at?: string
          deleted_at?: string | null
          departamento?: string | null
          email?: string | null
          financeiro?: boolean
          id?: string
          nome: string
          principal?: boolean
          responsavel_projeto?: boolean
          tecnico?: boolean
          telefone?: string | null
          tenant_id: string
          whatsapp?: string | null
        }
        Update: {
          cargo?: string | null
          cliente_id?: string
          created_at?: string
          deleted_at?: string | null
          departamento?: string | null
          email?: string | null
          financeiro?: boolean
          id?: string
          nome?: string
          principal?: boolean
          responsavel_projeto?: boolean
          tecnico?: boolean
          telefone?: string | null
          tenant_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_contatos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_contatos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          cidade: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string | null
          responsavel: string | null
          telefone: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["cliente_tipo"]
          uf: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string | null
          responsavel?: string | null
          telefone?: string | null
          tenant_id: string
          tipo?: Database["public"]["Enums"]["cliente_tipo"]
          uf?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string | null
          responsavel?: string | null
          telefone?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["cliente_tipo"]
          uf?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      comentario_anexos: {
        Row: {
          arquivo_path: string
          comentario_id: string
          created_at: string
          id: string
          nome: string
          tamanho: number | null
          tenant_id: string
          tipo: string | null
        }
        Insert: {
          arquivo_path: string
          comentario_id: string
          created_at?: string
          id?: string
          nome: string
          tamanho?: number | null
          tenant_id: string
          tipo?: string | null
        }
        Update: {
          arquivo_path?: string
          comentario_id?: string
          created_at?: string
          id?: string
          nome?: string
          tamanho?: number | null
          tenant_id?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comentario_anexos_comentario_id_fkey"
            columns: ["comentario_id"]
            isOneToOne: false
            referencedRelation: "comentarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentario_anexos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios: {
        Row: {
          autor_id: string | null
          conteudo: string
          created_at: string
          deleted_at: string | null
          id: string
          interno: boolean
          marco_id: string | null
          portal_acesso_id: string | null
          projeto_id: string | null
          tarefa_id: string | null
          tenant_id: string
        }
        Insert: {
          autor_id?: string | null
          conteudo: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          interno?: boolean
          marco_id?: string | null
          portal_acesso_id?: string | null
          projeto_id?: string | null
          tarefa_id?: string | null
          tenant_id: string
        }
        Update: {
          autor_id?: string | null
          conteudo?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          interno?: boolean
          marco_id?: string | null
          portal_acesso_id?: string | null
          projeto_id?: string | null
          tarefa_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_marco_id_fkey"
            columns: ["marco_id"]
            isOneToOne: false
            referencedRelation: "marcos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_portal_acesso_id_fkey"
            columns: ["portal_acesso_id"]
            isOneToOne: false
            referencedRelation: "portal_acessos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custos_reais: {
        Row: {
          categoria: string
          created_at: string
          criado_por: string | null
          data: string
          deleted_at: string | null
          descricao: string
          documento: string | null
          fase_id: string | null
          fornecedor: string | null
          id: string
          observacao: string | null
          projeto_id: string
          tenant_id: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          criado_por?: string | null
          data?: string
          deleted_at?: string | null
          descricao: string
          documento?: string | null
          fase_id?: string | null
          fornecedor?: string | null
          id?: string
          observacao?: string | null
          projeto_id: string
          tenant_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          criado_por?: string | null
          data?: string
          deleted_at?: string | null
          descricao?: string
          documento?: string | null
          fase_id?: string | null
          fornecedor?: string | null
          id?: string
          observacao?: string | null
          projeto_id?: string
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_reais_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custos_reais_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "projeto_fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custos_reais_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custos_reais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          aprovado_em: string | null
          aprovador_id: string | null
          categoria: string
          created_at: string
          data: string
          deleted_at: string | null
          descricao: string
          fase_id: string | null
          faturavel: boolean
          fornecedor: string | null
          id: string
          observacao_aprovacao: string | null
          profile_id: string | null
          projeto_id: string
          reembolsavel: boolean
          status: Database["public"]["Enums"]["despesa_status"]
          tenant_id: string
          valor: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovador_id?: string | null
          categoria?: string
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao: string
          fase_id?: string | null
          faturavel?: boolean
          fornecedor?: string | null
          id?: string
          observacao_aprovacao?: string | null
          profile_id?: string | null
          projeto_id: string
          reembolsavel?: boolean
          status?: Database["public"]["Enums"]["despesa_status"]
          tenant_id: string
          valor?: number
        }
        Update: {
          aprovado_em?: string | null
          aprovador_id?: string | null
          categoria?: string
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string
          fase_id?: string | null
          faturavel?: boolean
          fornecedor?: string | null
          id?: string
          observacao_aprovacao?: string | null
          profile_id?: string | null
          projeto_id?: string
          reembolsavel?: boolean
          status?: Database["public"]["Enums"]["despesa_status"]
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "projeto_fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          aprovacao_status: string
          aprovado_em: string | null
          aprovador_id: string | null
          arquivo_path: string | null
          autor_id: string | null
          categoria: string
          created_at: string
          deleted_at: string | null
          descricao: string | null
          fase_id: string | null
          id: string
          nome: string
          observacao_aprovacao: string | null
          projeto_id: string
          solicita_portal: boolean
          tamanho: number | null
          tenant_id: string
          tipo: string | null
          url: string | null
          visivel_cliente: boolean
        }
        Insert: {
          aprovacao_status?: string
          aprovado_em?: string | null
          aprovador_id?: string | null
          arquivo_path?: string | null
          autor_id?: string | null
          categoria?: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          fase_id?: string | null
          id?: string
          nome: string
          observacao_aprovacao?: string | null
          projeto_id: string
          solicita_portal?: boolean
          tamanho?: number | null
          tenant_id: string
          tipo?: string | null
          url?: string | null
          visivel_cliente?: boolean
        }
        Update: {
          aprovacao_status?: string
          aprovado_em?: string | null
          aprovador_id?: string | null
          arquivo_path?: string | null
          autor_id?: string | null
          categoria?: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          fase_id?: string | null
          id?: string
          nome?: string
          observacao_aprovacao?: string | null
          projeto_id?: string
          solicita_portal?: boolean
          tamanho?: number | null
          tenant_id?: string
          tipo?: string | null
          url?: string | null
          visivel_cliente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "documentos_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "projeto_fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      favoritos: {
        Row: {
          created_at: string
          entidade: string
          entidade_id: string
          id: string
          profile_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          entidade: string
          entidade_id: string
          id?: string
          profile_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          entidade?: string
          entidade_id?: string
          id?: string
          profile_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favoritos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favoritos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marcos: {
        Row: {
          created_at: string
          data: string | null
          data_real: string | null
          deleted_at: string | null
          descricao: string | null
          entrega_cliente: boolean
          fase_id: string | null
          id: string
          nome: string
          projeto_id: string
          responsavel_id: string | null
          status: Database["public"]["Enums"]["marco_status"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          data?: string | null
          data_real?: string | null
          deleted_at?: string | null
          descricao?: string | null
          entrega_cliente?: boolean
          fase_id?: string | null
          id?: string
          nome: string
          projeto_id: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["marco_status"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          data?: string | null
          data_real?: string | null
          deleted_at?: string | null
          descricao?: string | null
          entrega_cliente?: boolean
          fase_id?: string | null
          id?: string
          nome?: string
          projeto_id?: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["marco_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcos_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "projeto_fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          destinatario_id: string
          id: string
          lida: boolean
          link: string | null
          mensagem: string | null
          tenant_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string
          destinatario_id: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          tenant_id: string
          tipo?: string
          titulo: string
        }
        Update: {
          created_at?: string
          destinatario_id?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          tenant_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens: {
        Row: {
          categoria: string
          created_at: string
          deleted_at: string | null
          descricao: string
          fase_id: string | null
          id: string
          observacao: string | null
          projeto_id: string
          quantidade: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["orcamento_tipo"]
          valor_unitario: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          deleted_at?: string | null
          descricao: string
          fase_id?: string | null
          id?: string
          observacao?: string | null
          projeto_id: string
          quantidade?: number
          tenant_id: string
          tipo?: Database["public"]["Enums"]["orcamento_tipo"]
          valor_unitario?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string
          fase_id?: string | null
          id?: string
          observacao?: string | null
          projeto_id?: string
          quantidade?: number
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["orcamento_tipo"]
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "projeto_fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes: {
        Row: {
          codigo: string
          descricao: string
          grupo: string
        }
        Insert: {
          codigo: string
          descricao: string
          grupo: string
        }
        Update: {
          codigo?: string
          descricao?: string
          grupo?: string
        }
        Relationships: []
      }
      pesquisas_satisfacao: {
        Row: {
          cliente_id: string | null
          comentario: string | null
          created_at: string
          id: string
          nota_comunicacao: number | null
          nota_geral: number
          nota_prazo: number | null
          nota_qualidade: number | null
          portal_acesso_id: string | null
          projeto_id: string
          recomendaria: number | null
          tenant_id: string
        }
        Insert: {
          cliente_id?: string | null
          comentario?: string | null
          created_at?: string
          id?: string
          nota_comunicacao?: number | null
          nota_geral: number
          nota_prazo?: number | null
          nota_qualidade?: number | null
          portal_acesso_id?: string | null
          projeto_id: string
          recomendaria?: number | null
          tenant_id: string
        }
        Update: {
          cliente_id?: string | null
          comentario?: string | null
          created_at?: string
          id?: string
          nota_comunicacao?: number | null
          nota_geral?: number
          nota_prazo?: number | null
          nota_qualidade?: number | null
          portal_acesso_id?: string | null
          projeto_id?: string
          recomendaria?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesquisas_satisfacao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_satisfacao_portal_acesso_id_fkey"
            columns: ["portal_acesso_id"]
            isOneToOne: false
            referencedRelation: "portal_acessos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_satisfacao_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_satisfacao_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_dia: {
        Row: {
          concluido: boolean
          created_at: string
          criado_por: string | null
          data: string
          deleted_at: string | null
          detalhe: string | null
          horas_previstas: number
          id: string
          ordem: number
          profile_id: string
          projeto_id: string | null
          tarefa_id: string | null
          tenant_id: string
          titulo: string
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          criado_por?: string | null
          data: string
          deleted_at?: string | null
          detalhe?: string | null
          horas_previstas?: number
          id?: string
          ordem?: number
          profile_id: string
          projeto_id?: string | null
          tarefa_id?: string | null
          tenant_id: string
          titulo: string
        }
        Update: {
          concluido?: boolean
          created_at?: string
          criado_por?: string | null
          data?: string
          deleted_at?: string | null
          detalhe?: string | null
          horas_previstas?: number
          id?: string
          ordem?: number
          profile_id?: string
          projeto_id?: string | null
          tarefa_id?: string | null
          tenant_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_dia_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_dia_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_dia_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_dia_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_dia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_acesso_logs: {
        Row: {
          created_at: string
          evento: string
          id: string
          portal_acesso_id: string
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          evento: string
          id?: string
          portal_acesso_id: string
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          evento?: string
          id?: string
          portal_acesso_id?: string
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_acesso_logs_portal_acesso_id_fkey"
            columns: ["portal_acesso_id"]
            isOneToOne: false
            referencedRelation: "portal_acessos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_acesso_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_acessos: {
        Row: {
          ativo: boolean
          cargo: string | null
          cliente_id: string
          contato_id: string | null
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          nome: string
          tenant_id: string
          ultimo_acesso: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          cliente_id: string
          contato_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          id?: string
          nome: string
          tenant_id: string
          ultimo_acesso?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          cliente_id?: string
          contato_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          nome?: string
          tenant_id?: string
          ultimo_acesso?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_acessos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_acessos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "cliente_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_acessos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_aprovacoes: {
        Row: {
          comentario: string | null
          created_at: string
          decisao: string
          id: string
          marco_id: string | null
          portal_acesso_id: string | null
          projeto_id: string
          tenant_id: string
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          decisao: string
          id?: string
          marco_id?: string | null
          portal_acesso_id?: string | null
          projeto_id: string
          tenant_id: string
        }
        Update: {
          comentario?: string | null
          created_at?: string
          decisao?: string
          id?: string
          marco_id?: string | null
          portal_acesso_id?: string | null
          projeto_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_aprovacoes_marco_id_fkey"
            columns: ["marco_id"]
            isOneToOne: false
            referencedRelation: "marcos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_aprovacoes_portal_acesso_id_fkey"
            columns: ["portal_acesso_id"]
            isOneToOne: false
            referencedRelation: "portal_acessos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_aprovacoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_aprovacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_temas: {
        Row: {
          cliente_id: string
          cor_destaque: string | null
          cor_primaria: string | null
          created_at: string
          id: string
          logo_url: string | null
          mensagem: string | null
          nome_exibicao: string | null
          tenant_id: string
        }
        Insert: {
          cliente_id: string
          cor_destaque?: string | null
          cor_primaria?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          mensagem?: string | null
          nome_exibicao?: string | null
          tenant_id: string
        }
        Update: {
          cliente_id?: string
          cor_destaque?: string | null
          cor_primaria?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          mensagem?: string | null
          nome_exibicao?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_temas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_temas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          capacidade_semanal: number | null
          cargo: string | null
          created_at: string
          custo_hora: number | null
          deleted_at: string | null
          email: string
          id: string
          nome: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          capacidade_semanal?: number | null
          cargo?: string | null
          created_at?: string
          custo_hora?: number | null
          deleted_at?: string | null
          email: string
          id?: string
          nome: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          capacidade_semanal?: number | null
          cargo?: string | null
          created_at?: string
          custo_hora?: number | null
          deleted_at?: string | null
          email?: string
          id?: string
          nome?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_fases: {
        Row: {
          created_at: string
          data_inicio: string | null
          deleted_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number
          prazo: string | null
          progresso: number
          projeto_id: string
          responsavel_id: string | null
          status: Database["public"]["Enums"]["fase_status"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          data_inicio?: string | null
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          prazo?: string | null
          progresso?: number
          projeto_id: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["fase_status"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          data_inicio?: string | null
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          prazo?: string | null
          progresso?: number
          projeto_id?: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["fase_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_fases_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_fases_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_fases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_membros: {
        Row: {
          created_at: string
          id: string
          papel: string | null
          percentual_alocacao: number | null
          profile_id: string
          projeto_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          papel?: string | null
          percentual_alocacao?: number | null
          profile_id: string
          projeto_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          papel?: string | null
          percentual_alocacao?: number | null
          profile_id?: string
          projeto_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_membros_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_membros_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_membros_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          cliente_id: string | null
          codigo: string
          created_at: string
          custo_previsto: number | null
          data_inicio: string | null
          data_prevista_conclusao: string | null
          data_real_conclusao: string | null
          deleted_at: string | null
          descricao: string | null
          gerente_id: string | null
          horas_previstas: number | null
          id: string
          nome: string
          orcamento: number | null
          prazo: string | null
          prioridade: Database["public"]["Enums"]["prioridade"]
          progresso: number
          receita_prevista: number | null
          status: Database["public"]["Enums"]["projeto_status"]
          tenant_id: string
        }
        Insert: {
          cliente_id?: string | null
          codigo: string
          created_at?: string
          custo_previsto?: number | null
          data_inicio?: string | null
          data_prevista_conclusao?: string | null
          data_real_conclusao?: string | null
          deleted_at?: string | null
          descricao?: string | null
          gerente_id?: string | null
          horas_previstas?: number | null
          id?: string
          nome: string
          orcamento?: number | null
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade"]
          progresso?: number
          receita_prevista?: number | null
          status?: Database["public"]["Enums"]["projeto_status"]
          tenant_id: string
        }
        Update: {
          cliente_id?: string | null
          codigo?: string
          created_at?: string
          custo_previsto?: number | null
          data_inicio?: string | null
          data_prevista_conclusao?: string | null
          data_real_conclusao?: string | null
          deleted_at?: string | null
          descricao?: string | null
          gerente_id?: string | null
          horas_previstas?: number | null
          id?: string
          nome?: string
          orcamento?: number | null
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade"]
          progresso?: number
          receita_prevista?: number | null
          status?: Database["public"]["Enums"]["projeto_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_gerente_id_fkey"
            columns: ["gerente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorio_link_acessos: {
        Row: {
          created_at: string
          id: string
          link_id: string
          resultado: string
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link_id: string
          resultado: string
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link_id?: string
          resultado?: string
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorio_link_acessos_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "relatorio_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorio_link_acessos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorio_links: {
        Row: {
          acessos: number
          ativo: boolean
          created_at: string
          criado_por: string | null
          descricao: string | null
          expira_em: string
          id: string
          max_acessos: number | null
          projeto_id: string
          revogado_em: string | null
          senha_hash: string | null
          tenant_id: string
          token: string
          ultimo_acesso: string | null
        }
        Insert: {
          acessos?: number
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          expira_em: string
          id?: string
          max_acessos?: number | null
          projeto_id: string
          revogado_em?: string | null
          senha_hash?: string | null
          tenant_id: string
          token: string
          ultimo_acesso?: string | null
        }
        Update: {
          acessos?: number
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          expira_em?: string
          id?: string
          max_acessos?: number | null
          projeto_id?: string
          revogado_em?: string | null
          senha_hash?: string | null
          tenant_id?: string
          token?: string
          ultimo_acesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorio_links_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorio_links_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorio_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      riscos: {
        Row: {
          created_at: string
          deleted_at: string | null
          descricao: string
          id: string
          impacto: Database["public"]["Enums"]["risco_nivel"]
          plano_mitigacao: string | null
          probabilidade: Database["public"]["Enums"]["risco_nivel"]
          projeto_id: string
          responsavel_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          descricao: string
          id?: string
          impacto?: Database["public"]["Enums"]["risco_nivel"]
          plano_mitigacao?: string | null
          probabilidade?: Database["public"]["Enums"]["risco_nivel"]
          projeto_id: string
          responsavel_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          descricao?: string
          id?: string
          impacto?: Database["public"]["Enums"]["risco_nivel"]
          plano_mitigacao?: string | null
          probabilidade?: Database["public"]["Enums"]["risco_nivel"]
          projeto_id?: string
          responsavel_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "riscos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riscos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riscos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissoes: {
        Row: {
          permissao: string
          role_id: string
        }
        Insert: {
          permissao: string
          role_id: string
        }
        Update: {
          permissao?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissoes_permissao_fkey"
            columns: ["permissao"]
            isOneToOne: false
            referencedRelation: "permissoes"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "role_permissoes_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          sistema: boolean
          slug: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          sistema?: boolean
          slug: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          sistema?: boolean
          slug?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subtarefas: {
        Row: {
          created_at: string
          deleted_at: string | null
          horas_estimadas: number | null
          id: string
          ordem: number
          prazo: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["tarefa_status"]
          tarefa_id: string
          tenant_id: string
          titulo: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          horas_estimadas?: number | null
          id?: string
          ordem?: number
          prazo?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["tarefa_status"]
          tarefa_id: string
          tenant_id: string
          titulo: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          horas_estimadas?: number | null
          id?: string
          ordem?: number
          prazo?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["tarefa_status"]
          tarefa_id?: string
          tenant_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtarefas_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtarefas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
          tenant_id: string
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          nome: string
          tenant_id: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_dependencias: {
        Row: {
          created_at: string
          id: string
          tarefa_id: string
          tarefa_relacionada_id: string
          tenant_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          tarefa_id: string
          tarefa_relacionada_id: string
          tenant_id: string
          tipo?: string
        }
        Update: {
          created_at?: string
          id?: string
          tarefa_id?: string
          tarefa_relacionada_id?: string
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_dependencias_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_dependencias_tarefa_relacionada_id_fkey"
            columns: ["tarefa_relacionada_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_dependencias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_tags: {
        Row: {
          tag_id: string
          tarefa_id: string
          tenant_id: string
        }
        Insert: {
          tag_id: string
          tarefa_id: string
          tenant_id: string
        }
        Update: {
          tag_id?: string
          tarefa_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_tags_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          concluida_em: string | null
          created_at: string
          data_inicio: string | null
          deleted_at: string | null
          descricao: string | null
          fase_id: string | null
          horas_estimadas: number | null
          horas_realizadas: number | null
          id: string
          ordem: number
          prazo: string | null
          prioridade: Database["public"]["Enums"]["prioridade"]
          projeto_id: string
          responsavel_id: string | null
          status: Database["public"]["Enums"]["tarefa_status"]
          tenant_id: string
          titulo: string
        }
        Insert: {
          concluida_em?: string | null
          created_at?: string
          data_inicio?: string | null
          deleted_at?: string | null
          descricao?: string | null
          fase_id?: string | null
          horas_estimadas?: number | null
          horas_realizadas?: number | null
          id?: string
          ordem?: number
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade"]
          projeto_id: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["tarefa_status"]
          tenant_id: string
          titulo: string
        }
        Update: {
          concluida_em?: string | null
          created_at?: string
          data_inicio?: string | null
          deleted_at?: string | null
          descricao?: string | null
          fase_id?: string | null
          horas_estimadas?: number | null
          horas_realizadas?: number | null
          id?: string
          ordem?: number
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade"]
          projeto_id?: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["tarefa_status"]
          tenant_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "projeto_fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          assentos: number
          ativo: boolean
          created_at: string
          deleted_at: string | null
          id: string
          marca_dagua_ativa: boolean
          marca_dagua_aviso: string | null
          marca_dagua_cor: string | null
          marca_dagua_opacidade: number
          marca_dagua_texto: string | null
          nome: string
          plano: string
          slug: string
        }
        Insert: {
          assentos?: number
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          marca_dagua_ativa?: boolean
          marca_dagua_aviso?: string | null
          marca_dagua_cor?: string | null
          marca_dagua_opacidade?: number
          marca_dagua_texto?: string | null
          nome: string
          plano?: string
          slug: string
        }
        Update: {
          assentos?: number
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          marca_dagua_ativa?: boolean
          marca_dagua_aviso?: string | null
          marca_dagua_cor?: string | null
          marca_dagua_opacidade?: number
          marca_dagua_texto?: string | null
          nome?: string
          plano?: string
          slug?: string
        }
        Relationships: []
      }
      usuario_roles: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          role_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          role_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          role_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_perfil: { Args: { _nome?: string }; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      has_permission: { Args: { _permissao: string }; Returns: boolean }
      has_role: { Args: { _slug: string }; Returns: boolean }
      is_portal_user: { Args: never; Returns: boolean }
      portal_acesso_atual: {
        Args: never
        Returns: {
          ativo: boolean
          cargo: string | null
          cliente_id: string
          contato_id: string | null
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          nome: string
          tenant_id: string
          ultimo_acesso: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "portal_acessos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      portal_anexo_arquivo: { Args: { p_anexo_id: string }; Returns: Json }
      portal_comentar: {
        Args: { p_conteudo: string; p_projeto_id: string }
        Returns: string
      }
      portal_decidir_marco: {
        Args: { p_comentario?: string; p_decisao: string; p_marco_id: string }
        Returns: string
      }
      portal_documento_arquivo: {
        Args: { p_documento_id: string }
        Returns: Json
      }
      portal_marco_comentar: {
        Args: { p_anexos?: Json; p_conteudo: string; p_marco_id: string }
        Returns: string
      }
      portal_marco_comentarios: { Args: { p_marco_id: string }; Returns: Json }
      portal_painel: { Args: never; Returns: Json }
      portal_projeto: { Args: { p_projeto_id: string }; Returns: Json }
      portal_registrar_evento: {
        Args: { p_evento: string; p_user_agent?: string }
        Returns: string
      }
      portal_responder_pesquisa: {
        Args: {
          p_comentario?: string
          p_nota_comunicacao?: number
          p_nota_geral: number
          p_nota_prazo?: number
          p_nota_qualidade?: number
          p_projeto_id: string
          p_recomendaria?: number
        }
        Returns: string
      }
      portal_resumo: { Args: never; Returns: Json }
      portal_vincular: { Args: never; Returns: boolean }
      relatorio_link_abrir: {
        Args: { p_senha?: string; p_token: string; p_user_agent?: string }
        Returns: Json
      }
      relatorio_link_hash: { Args: { p_senha: string }; Returns: string }
    }
    Enums: {
      apontamento_status: "rascunho" | "enviado" | "aprovado" | "rejeitado"
      cliente_tipo: "pf" | "pj"
      despesa_status: "rascunho" | "enviada" | "aprovada" | "rejeitada"
      fase_status: "nao_iniciada" | "em_andamento" | "concluida" | "bloqueada"
      marco_status: "previsto" | "atingido" | "atrasado" | "cancelado"
      orcamento_tipo: "receita" | "custo"
      prioridade: "baixa" | "normal" | "alta" | "urgente"
      projeto_status:
        | "planejamento"
        | "aguardando_inicio"
        | "em_andamento"
        | "pausado"
        | "em_validacao"
        | "em_risco"
        | "concluido"
        | "cancelado"
      risco_nivel: "baixo" | "medio" | "alto" | "critico"
      saude: "saudavel" | "atencao" | "em_risco" | "critico"
      tarefa_status:
        | "backlog"
        | "a_fazer"
        | "em_andamento"
        | "bloqueada"
        | "em_validacao"
        | "concluida"
        | "cancelada"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      apontamento_status: ["rascunho", "enviado", "aprovado", "rejeitado"],
      cliente_tipo: ["pf", "pj"],
      despesa_status: ["rascunho", "enviada", "aprovada", "rejeitada"],
      fase_status: ["nao_iniciada", "em_andamento", "concluida", "bloqueada"],
      marco_status: ["previsto", "atingido", "atrasado", "cancelado"],
      orcamento_tipo: ["receita", "custo"],
      prioridade: ["baixa", "normal", "alta", "urgente"],
      projeto_status: [
        "planejamento",
        "aguardando_inicio",
        "em_andamento",
        "pausado",
        "em_validacao",
        "em_risco",
        "concluido",
        "cancelado",
      ],
      risco_nivel: ["baixo", "medio", "alto", "critico"],
      saude: ["saudavel", "atencao", "em_risco", "critico"],
      tarefa_status: [
        "backlog",
        "a_fazer",
        "em_andamento",
        "bloqueada",
        "em_validacao",
        "concluida",
        "cancelada",
      ],
    },
  },
} as const
