import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type {
  ApontamentoStatus,
  DespesaStatus,
  MarcoStatus,
  OrcamentoTipo,
  Prioridade,
  ProjetoStatus,
  TarefaStatus,
} from "@/lib/enzova";

export type Projeto = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  cliente_id: string | null;
  gerente_id: string | null;
  status: ProjetoStatus;
  prioridade: Prioridade;
  data_inicio: string | null;
  prazo: string | null;
  data_prevista_conclusao: string | null;
  data_real_conclusao: string | null;
  orcamento: number | null;
  custo_previsto: number | null;
  receita_prevista: number | null;
  horas_previstas: number | null;
  progresso: number;
  clientes?: { id: string; nome: string } | null;
  gerente?: { id: string; nome: string } | null;
};

export type Tarefa = {
  id: string;
  projeto_id: string;
  fase_id: string | null;
  titulo: string;
  descricao: string | null;
  responsavel_id: string | null;
  prioridade: Prioridade;
  status: TarefaStatus;
  data_inicio: string | null;
  prazo: string | null;
  horas_estimadas: number | null;
  horas_realizadas: number | null;
  ordem: number;
};

const PROJETO_SELECT =
  "id, codigo, nome, descricao, cliente_id, gerente_id, status, prioridade, data_inicio, prazo, data_prevista_conclusao, data_real_conclusao, orcamento, custo_previsto, receita_prevista, horas_previstas, progresso, clientes(id, nome), gerente:profiles!projetos_gerente_id_fkey(id, nome)";

const TAREFA_SELECT =
  "id, projeto_id, fase_id, titulo, descricao, responsavel_id, prioridade, status, data_inicio, prazo, horas_estimadas, horas_realizadas, ordem";

export function useProjetos() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["projetos", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select(PROJETO_SELECT)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Projeto[];
    },
  });
}

export function useProjeto(projetoId: string) {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["projeto", projetoId, perfil?.tenant_id],
    enabled: !!perfil && !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("projetos").select(PROJETO_SELECT).eq("id", projetoId).maybeSingle();
      if (error) throw error;
      return data as unknown as Projeto | null;
    },
  });
}

export function useTarefas(projetoId?: string) {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["tarefas", projetoId ?? "todas", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      let query = supabase.from("tarefas").select(TAREFA_SELECT).is("deleted_at", null);
      if (projetoId) query = query.eq("projeto_id", projetoId);
      const { data, error } = await query.order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Tarefa[];
    },
  });
}

export function useClientes() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["clientes", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .is("deleted_at", null)
        .order("nome", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEquipe() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["equipe", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, cargo, custo_hora, capacidade_semanal, ativo")
        .is("deleted_at", null)
        .order("nome", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Fases de todos os projetos da empresa, para painéis consolidados. */
export function useFasesTodas() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["fases", "todas", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_fases")
        .select("id, projeto_id, nome, ordem, data_inicio, prazo, status, progresso")
        .is("deleted_at", null)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFases(projetoId: string) {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["fases", projetoId, perfil?.tenant_id],
    enabled: !!perfil && !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_fases")
        .select("id, nome, descricao, ordem, responsavel_id, data_inicio, prazo, status, progresso")
        .eq("projeto_id", projetoId)
        .is("deleted_at", null)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type DocumentoStatus = {
  id: string;
  projeto_id: string;
  nome: string;
  categoria: string;
  aprovacao_status: "pendente" | "aprovado" | "rejeitado";
  solicita_portal: boolean;
  visivel_cliente: boolean;
  created_at: string;
};

/** Documentos de todos os projetos com a situação de aprovação, para painéis consolidados. */
export function useDocumentosStatus() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["documentos", "status", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("id, projeto_id, nome, categoria, aprovacao_status, solicita_portal, visivel_cliente, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DocumentoStatus[];
    },
  });
}

/** Registra uma entrada de auditoria/histórico. Falhas não bloqueiam a ação do usuário. */
export async function registrarAuditoria(entrada: {
  tenant_id: string;
  profile_id: string;
  entidade: string;
  entidade_id?: string | null | undefined;
  acao: string;
  campo?: string | null | undefined;
  valor_anterior?: string | null | undefined;
  valor_novo?: string | null | undefined;
  projeto_id?: string | null | undefined;
}) {
  try {
    await supabase.from("auditoria").insert({
      tenant_id: entrada.tenant_id,
      profile_id: entrada.profile_id,
      entidade: entrada.entidade,
      entidade_id: entrada.entidade_id ?? null,
      acao: entrada.acao,
      campo: entrada.campo ?? null,
      valor_anterior: entrada.valor_anterior ?? null,
      valor_novo: entrada.valor_novo ?? null,
      projeto_id: entrada.projeto_id ?? null,
    });
  } catch (error) {
    console.warn("auditoria", error);
  }
}

/* ================= Fase 2 ================= */

export type Apontamento = {
  id: string;
  tenant_id: string;
  profile_id: string;
  projeto_id: string;
  tarefa_id: string | null;
  data: string;
  horas: number;
  descricao: string | null;
  faturavel: boolean;
  status: ApontamentoStatus;
  aprovador_id: string | null;
  aprovado_em: string | null;
  observacao_aprovacao: string | null;
  profiles?: { id: string; nome: string; custo_hora: number | null } | null;
  projetos?: { id: string; nome: string } | null;
  tarefas?: { id: string; titulo: string } | null;
};

export type Marco = {
  id: string;
  projeto_id: string;
  fase_id: string | null;
  nome: string;
  descricao: string | null;
  data: string | null;
  data_real: string | null;
  status: MarcoStatus;
  entrega_cliente: boolean;
  responsavel_id: string | null;
};

export type Alocacao = {
  id: string;
  profile_id: string;
  projeto_id: string;
  semana: string;
  horas_planejadas: number;
};

const APONTAMENTO_SELECT =
  "id, tenant_id, profile_id, projeto_id, tarefa_id, data, horas, descricao, faturavel, status, aprovador_id, aprovado_em, observacao_aprovacao, profiles!apontamentos_profile_id_fkey(id, nome, custo_hora), projetos(id, nome), tarefas(id, titulo)";

/** Apontamentos do tenant. Passe `apenasMeus` para o timesheet pessoal. */
export function useApontamentos(opcoes?: { apenasMeus?: boolean; desde?: string }) {
  const { perfil } = useAuth();
  const apenasMeus = opcoes?.apenasMeus ?? false;
  const desde = opcoes?.desde;
  return useQuery({
    queryKey: ["apontamentos", perfil?.tenant_id, apenasMeus ? perfil?.id : "todos", desde ?? "tudo"],
    enabled: !!perfil,
    queryFn: async () => {
      let query = supabase.from("apontamentos").select(APONTAMENTO_SELECT).is("deleted_at", null);
      if (apenasMeus && perfil) query = query.eq("profile_id", perfil.id);
      if (desde) query = query.gte("data", desde);
      const { data, error } = await query.order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Apontamento[];
    },
  });
}

export function useMarcos(projetoId?: string) {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["marcos", projetoId ?? "todos", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      let query = supabase
        .from("marcos")
        .select("id, projeto_id, fase_id, nome, descricao, data, data_real, status, entrega_cliente, responsavel_id")
        .is("deleted_at", null);
      if (projetoId) query = query.eq("projeto_id", projetoId);
      const { data, error } = await query.order("data", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Marco[];
    },
  });
}

export function useAlocacoes() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["alocacoes", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alocacoes")
        .select("id, profile_id, projeto_id, semana, horas_planejadas")
        .order("semana", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Alocacao[];
    },
  });
}

export function useRiscos(projetoId?: string) {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["riscos", projetoId ?? "todos", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      let query = supabase
        .from("riscos")
        .select("id, projeto_id, descricao, probabilidade, impacto, responsavel_id, plano_mitigacao, status, created_at")
        .is("deleted_at", null);
      if (projetoId) query = query.eq("projeto_id", projetoId);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ================= Fase 3 ================= */

export type OrcamentoItem = {
  id: string;
  tenant_id: string;
  projeto_id: string;
  fase_id: string | null;
  tipo: OrcamentoTipo;
  categoria: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  observacao: string | null;
  projetos?: { id: string; nome: string } | null;
  projeto_fases?: { id: string; nome: string } | null;
};

export type Despesa = {
  id: string;
  tenant_id: string;
  projeto_id: string;
  fase_id: string | null;
  profile_id: string | null;
  categoria: string;
  descricao: string;
  fornecedor: string | null;
  data: string;
  valor: number;
  faturavel: boolean;
  reembolsavel: boolean;
  status: DespesaStatus;
  aprovador_id: string | null;
  aprovado_em: string | null;
  observacao_aprovacao: string | null;
  profiles?: { id: string; nome: string } | null;
  projetos?: { id: string; nome: string } | null;
};

const ORCAMENTO_SELECT =
  "id, tenant_id, projeto_id, fase_id, tipo, categoria, descricao, quantidade, valor_unitario, observacao, projetos(id, nome), projeto_fases(id, nome)";

const DESPESA_SELECT =
  "id, tenant_id, projeto_id, fase_id, profile_id, categoria, descricao, fornecedor, data, valor, faturavel, reembolsavel, status, aprovador_id, aprovado_em, observacao_aprovacao, profiles!despesas_profile_id_fkey(id, nome), projetos(id, nome)";

export function useOrcamentoItens(projetoId?: string) {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["orcamento_itens", projetoId ?? "todos", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      let query = supabase.from("orcamento_itens").select(ORCAMENTO_SELECT).is("deleted_at", null);
      if (projetoId) query = query.eq("projeto_id", projetoId);
      const { data, error } = await query.order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as OrcamentoItem[];
    },
  });
}

export function useDespesas(opcoes?: { projetoId?: string; apenasMinhas?: boolean }) {
  const { perfil } = useAuth();
  const projetoId = opcoes?.projetoId;
  const apenasMinhas = opcoes?.apenasMinhas ?? false;
  return useQuery({
    queryKey: ["despesas", projetoId ?? "todos", apenasMinhas ? perfil?.id : "todas", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      let query = supabase.from("despesas").select(DESPESA_SELECT).is("deleted_at", null);
      if (projetoId) query = query.eq("projeto_id", projetoId);
      if (apenasMinhas && perfil) query = query.eq("profile_id", perfil.id);
      const { data, error } = await query.order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Despesa[];
    },
  });
}
