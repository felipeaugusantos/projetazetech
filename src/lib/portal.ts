import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FaseStatus, MarcoStatus, ProjetoStatus } from "@/lib/enzova";

export type PortalAcesso = { id: string; nome: string; email: string; cargo: string | null };

export type PortalProjetoResumo = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  status: ProjetoStatus;
  progresso: number;
  data_inicio: string | null;
  prazo: string | null;
  data_prevista_conclusao: string | null;
  data_real_conclusao: string | null;
  fases_total: number;
  fases_concluidas: number;
  marcos_pendentes: number;
  documentos: number;
};

export type PortalResumo = {
  acesso: PortalAcesso;
  cliente: { id: string; nome: string; nome_fantasia: string | null } | null;
  empresa: { nome: string } | null;
  projetos: PortalProjetoResumo[];
};

export type PortalFase = {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  status: FaseStatus;
  progresso: number;
  data_inicio: string | null;
  prazo: string | null;
};

export type PortalMarco = {
  id: string;
  nome: string;
  descricao: string | null;
  data: string | null;
  data_real: string | null;
  status: MarcoStatus;
  entrega_cliente: boolean;
  fase: string | null;
  decisao: "aprovado" | "ajustes" | null;
};

export type PortalDocumento = {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  url: string | null;
  tipo: string | null;
  tamanho: number | null;
  created_at: string;
  fase: string | null;
};

export type PortalComentario = {
  id: string;
  conteudo: string;
  created_at: string;
  autor: string | null;
  do_cliente: boolean;
};

export type PortalProjetoDetalhe = {
  projeto: {
    id: string;
    codigo: string;
    nome: string;
    descricao: string | null;
    status: ProjetoStatus;
    progresso: number;
    data_inicio: string | null;
    prazo: string | null;
    data_prevista_conclusao: string | null;
    data_real_conclusao: string | null;
    gerente: string | null;
  };
  fases: PortalFase[];
  marcos: PortalMarco[];
  documentos: PortalDocumento[];
  comentarios: PortalComentario[];
};

/** Vincula o usuário autenticado ao convite de portal com o mesmo e-mail. */
export async function vincularPortal() {
  const { data, error } = await supabase.rpc("portal_vincular");
  if (error) throw error;
  return data === true;
}

export function usePortalResumo() {
  return useQuery({
    queryKey: ["portal", "resumo"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_resumo");
      if (error) throw error;
      return data as unknown as PortalResumo;
    },
  });
}

export function usePortalProjeto(projetoId: string) {
  return useQuery({
    queryKey: ["portal", "projeto", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_projeto", { p_projeto_id: projetoId });
      if (error) throw error;
      return data as unknown as PortalProjetoDetalhe;
    },
  });
}

export function usePortalComentar(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conteudo: string) => {
      const { error } = await supabase.rpc("portal_comentar", {
        p_projeto_id: projetoId,
        p_conteudo: conteudo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portal", "projeto", projetoId] });
    },
  });
}

export function usePortalDecidirMarco(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      marcoId,
      decisao,
      comentario,
    }: {
      marcoId: string;
      decisao: "aprovado" | "ajustes";
      comentario?: string;
    }) => {
      const { error } = await supabase.rpc("portal_decidir_marco", {
        p_marco_id: marcoId,
        p_decisao: decisao,
        ...(comentario ? { p_comentario: comentario } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portal"] });
    },
  });
}

/** Gera um link temporário de download para um documento liberado ao cliente. */
export async function baixarDocumento(documentoId: string) {
  const { data, error } = await supabase.rpc("portal_documento_arquivo", { p_documento_id: documentoId });
  if (error) throw error;
  const doc = data as unknown as { nome: string; arquivo_path: string | null; url: string | null } | null;
  if (!doc) throw new Error("Documento não disponível");
  if (doc.url) return doc.url;
  if (!doc.arquivo_path) throw new Error("Documento sem arquivo anexado");
  const assinada = await supabase.storage.from("documentos").createSignedUrl(doc.arquivo_path, 120);
  if (assinada.error) throw assinada.error;
  return assinada.data.signedUrl;
}

