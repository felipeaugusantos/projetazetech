import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Prioridade, ProjetoStatus, TarefaStatus } from "@/lib/enzova";

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
    await supabase.from("auditoria").insert(entrada);
  } catch (error) {
    console.warn("auditoria", error);
  }
}
