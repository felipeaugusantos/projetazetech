import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EmpresaPortal, PortalProjetoDetalhe, PortalTema } from "@/lib/portal";

export type RelatorioLink = {
  id: string;
  projeto_id: string;
  token: string;
  descricao: string | null;
  expira_em: string;
  senha_hash: string | null;
  max_acessos: number | null;
  acessos: number;
  ativo: boolean;
  ultimo_acesso: string | null;
  created_at: string;
  revogado_em: string | null;
};

export type StatusLink =
  | "ok"
  | "senha"
  | "senha_invalida"
  | "expirado"
  | "revogado"
  | "limite"
  | "nao_encontrado";

export type RelatorioCompartilhado = PortalProjetoDetalhe & {
  empresa: EmpresaPortal | null;
  cliente: { id: string; nome: string; nome_fantasia: string | null } | null;
  tema: PortalTema | null;
  link: { descricao: string | null; expira_em: string };
};

export type AberturaLink = {
  status: StatusLink;
  protegido?: boolean;
  dados?: RelatorioCompartilhado;
};

/** Monta a URL pública do link compartilhável. */
export function urlRelatorioLink(token: string) {
  const origem = typeof window === "undefined" ? "" : window.location.origin;
  return `${origem}/relatorio/${token}`;
}

function gerarToken() {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useRelatorioLinks(projetoId: string) {
  return useQuery({
    queryKey: ["relatorio-links", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relatorio_links")
        .select("*")
        .eq("projeto_id", projetoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RelatorioLink[];
    },
  });
}

export type NovoLink = {
  tenantId: string;
  projetoId: string;
  profileId: string;
  descricao: string;
  diasValidade: number;
  senha?: string | undefined;
  maxAcessos?: number | undefined;
};

export function useCriarRelatorioLink(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (n: NovoLink) => {
      let senhaHash: string | null = null;
      if (n.senha?.trim()) {
        const { data, error } = await supabase.rpc("relatorio_link_hash", { p_senha: n.senha.trim() });
        if (error) throw error;
        senhaHash = (data as string | null) ?? null;
      }
      const expira = new Date(Date.now() + Math.max(1, n.diasValidade) * 86_400_000).toISOString();
      const token = gerarToken();
      const { error } = await supabase.from("relatorio_links").insert({
        tenant_id: n.tenantId,
        projeto_id: n.projetoId,
        criado_por: n.profileId,
        token,
        descricao: n.descricao.trim() || null,
        expira_em: expira,
        senha_hash: senhaHash,
        max_acessos: n.maxAcessos && n.maxAcessos > 0 ? n.maxAcessos : null,
      });
      if (error) throw error;
      return token;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["relatorio-links", projetoId] });
    },
  });
}

export function useRevogarRelatorioLink(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("relatorio_links")
        .update({ ativo, revogado_em: ativo ? null : new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["relatorio-links", projetoId] });
    },
  });
}

/** Histórico de aberturas de um link. */
export function useRelatorioLinkAcessos(linkId: string | null) {
  return useQuery({
    queryKey: ["relatorio-link-acessos", linkId],
    enabled: !!linkId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relatorio_link_acessos")
        .select("id, resultado, user_agent, created_at")
        .eq("link_id", linkId!)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Abre o link público (valida validade, revogação, limite e senha). */
export async function abrirRelatorioLink(token: string, senha?: string) {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const { data, error } = await supabase.rpc("relatorio_link_abrir", {
    p_token: token,
    p_user_agent: ua,
    ...(senha ? { p_senha: senha } : {}),
  });
  if (error) throw error;
  return data as unknown as AberturaLink;
}
