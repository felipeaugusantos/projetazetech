import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type ItemPlanoDia = {
  id: string;
  profile_id: string;
  projeto_id: string | null;
  tarefa_id: string | null;
  data: string;
  titulo: string;
  detalhe: string | null;
  horas_previstas: number;
  concluido: boolean;
  ordem: number;
  projetos?: { id: string; codigo: string; nome: string } | null;
  tarefas?: { id: string; titulo: string } | null;
};

const SELECT =
  "id, profile_id, projeto_id, tarefa_id, data, titulo, detalhe, horas_previstas, concluido, ordem, projetos(id, codigo, nome), tarefas(id, titulo)";

/** Itens do plano do dia. Informe uma data (ou intervalo) e opcionalmente a pessoa. */
export function usePlanoDia(opcoes: { data?: string; ate?: string; profileId?: string; apenasMeus?: boolean }) {
  const { perfil } = useAuth();
  const pessoa = opcoes.apenasMeus ? perfil?.id : opcoes.profileId;
  return useQuery({
    queryKey: ["plano-dia", opcoes.data ?? "", opcoes.ate ?? "", pessoa ?? "todos", perfil?.tenant_id],
    enabled: !!perfil && !!opcoes.data,
    queryFn: async () => {
      let query = supabase.from("plano_dia").select(SELECT).is("deleted_at", null);
      if (opcoes.data) query = query.gte("data", opcoes.data);
      query = query.lte("data", opcoes.ate ?? opcoes.data!);
      if (pessoa) query = query.eq("profile_id", pessoa);
      const { data, error } = await query.order("ordem", { ascending: true }).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ItemPlanoDia[];
    },
  });
}

export type NovoItemPlano = {
  profile_id: string;
  data: string;
  titulo: string;
  projeto_id?: string | null;
  tarefa_id?: string | null;
  detalhe?: string | null;
  horas_previstas?: number;
};

export function useSalvarItemPlano() {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: NovoItemPlano }) => {
      if (!perfil) throw new Error("Perfil não carregado");
      const registro = {
        profile_id: dados.profile_id,
        data: dados.data,
        titulo: dados.titulo.trim(),
        projeto_id: dados.projeto_id ?? null,
        tarefa_id: dados.tarefa_id ?? null,
        detalhe: dados.detalhe?.trim() ? dados.detalhe.trim() : null,
        horas_previstas: dados.horas_previstas ?? 0,
      };
      if (id) {
        const { error } = await supabase.from("plano_dia").update(registro).eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("plano_dia")
        .insert({ ...registro, tenant_id: perfil.tenant_id, criado_por: perfil.id });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plano-dia"] });
    },
  });
}

export function useConcluirItemPlano() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, concluido }: { id: string; concluido: boolean }) => {
      const { error } = await supabase.from("plano_dia").update({ concluido }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plano-dia"] });
    },
  });
}

export function useRemoverItemPlano() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plano_dia").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plano-dia"] });
    },
  });
}
