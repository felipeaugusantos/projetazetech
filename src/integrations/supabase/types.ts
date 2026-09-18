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
      comentarios: {
        Row: {
          autor_id: string | null
          conteudo: string
          created_at: string
          deleted_at: string | null
          id: string
          interno: boolean
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
    }
    Enums: {
      cliente_tipo: "pf" | "pj"
      fase_status: "nao_iniciada" | "em_andamento" | "concluida" | "bloqueada"
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
      cliente_tipo: ["pf", "pj"],
      fase_status: ["nao_iniciada", "em_andamento", "concluida", "bloqueada"],
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
