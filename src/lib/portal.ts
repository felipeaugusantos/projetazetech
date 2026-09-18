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
  concluido: boolean;
  pesquisa_respondida: boolean;
};

export type PortalTema = {
  nome_exibicao: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_destaque: string | null;
  mensagem: string | null;
};

export type PortalPesquisa = {
  id: string;
  nota_geral: number;
  nota_prazo: number | null;
  nota_qualidade: number | null;
  nota_comunicacao: number | null;
  recomendaria: number | null;
  comentario: string | null;
  created_at: string;
};

export type EmpresaPortal = {
  nome: string;
  marca_dagua_ativa?: boolean | null;
  marca_dagua_texto?: string | null;
  marca_dagua_cor?: string | null;
  marca_dagua_opacidade?: number | null;
  marca_dagua_aviso?: string | null;
};

export type PortalResumo = {
  acesso: PortalAcesso;
  cliente: { id: string; nome: string; nome_fantasia: string | null } | null;
  empresa: EmpresaPortal | null;
  tema: PortalTema | null;
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
  aprovacao_status?: "pendente" | "aprovado" | "rejeitado" | null;
  aprovado_em?: string | null;
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
  pesquisa: PortalPesquisa | null;
};


/** Vincula o usuário autenticado ao convite de portal com o mesmo e-mail. */
export async function vincularPortal() {
  const { data, error } = await supabase.rpc("portal_vincular");
  if (error) throw error;
  return data === true;
}

export type EventoPortal = "login" | "logout" | "sessao_expirada" | "senha_alterada";

/** Registra um evento de acesso do cliente (histórico visível para a equipe interna). */
export async function registrarEventoPortal(evento: EventoPortal) {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  await supabase.rpc("portal_registrar_evento", { p_evento: evento, p_user_agent: ua }).then(
    () => undefined,
    () => undefined,
  );
}

/** Minutos de inatividade antes de encerrar a sessão do portal. */
export const PORTAL_INATIVIDADE_MIN = 30;
export const PORTAL_SESSAO_EXPIRADA = "portal:sessao-expirada";

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

export type RespostaPesquisa = {
  nota_geral: number;
  nota_prazo?: number | undefined;
  nota_qualidade?: number | undefined;
  nota_comunicacao?: number | undefined;
  recomendaria?: number | undefined;
  comentario?: string | undefined;
};

export function usePortalResponderPesquisa(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (r: RespostaPesquisa) => {
      const { error } = await supabase.rpc("portal_responder_pesquisa", {
        p_projeto_id: projetoId,
        p_nota_geral: r.nota_geral,
        ...(r.nota_prazo ? { p_nota_prazo: r.nota_prazo } : {}),
        ...(r.nota_qualidade ? { p_nota_qualidade: r.nota_qualidade } : {}),
        ...(r.nota_comunicacao ? { p_nota_comunicacao: r.nota_comunicacao } : {}),
        ...(typeof r.recomendaria === "number" ? { p_recomendaria: r.recomendaria } : {}),
        ...(r.comentario?.trim() ? { p_comentario: r.comentario.trim() } : {}),

      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portal"] });
    },
  });
}


/* ------------------------ Conversa das entregas (marcos) ------------------------ */

export type AnexoComentario = { id: string; nome: string; tipo: string | null; tamanho: number | null };

export type ComentarioEntrega = {
  id: string;
  conteudo: string;
  created_at: string;
  autor: string | null;
  do_cliente: boolean;
  anexos: AnexoComentario[];
};

export function usePortalMarcoComentarios(marcoId: string, ativo = true) {
  return useQuery({
    queryKey: ["portal", "marco-comentarios", marcoId],
    enabled: !!marcoId && ativo,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_marco_comentarios", { p_marco_id: marcoId });
      if (error) throw error;
      return (data ?? []) as unknown as ComentarioEntrega[];
    },
  });
}

/** Envia arquivos para o bucket de anexos e devolve os metadados. */
export async function enviarAnexos(projetoId: string, arquivos: File[]) {
  const anexos: { nome: string; arquivo_path: string; tipo: string; tamanho: number }[] = [];
  for (const arquivo of arquivos) {
    const extensao = arquivo.name.includes(".") ? arquivo.name.split(".").pop() : "dat";
    const caminho = `${projetoId}/${crypto.randomUUID()}.${extensao}`;
    const { error } = await supabase.storage.from("anexos").upload(caminho, arquivo, {
      contentType: arquivo.type || "application/octet-stream",
    });
    if (error) throw error;
    anexos.push({
      nome: arquivo.name,
      arquivo_path: caminho,
      tipo: arquivo.type || "application/octet-stream",
      tamanho: arquivo.size,
    });
  }
  return anexos;
}

export function usePortalComentarEntrega(projetoId: string, marcoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conteudo, arquivos }: { conteudo: string; arquivos: File[] }) => {
      const anexos = arquivos.length ? await enviarAnexos(projetoId, arquivos) : [];
      const { error } = await supabase.rpc("portal_marco_comentar", {
        p_marco_id: marcoId,
        p_conteudo: conteudo,
        p_anexos: anexos,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portal", "marco-comentarios", marcoId] });
    },
  });
}

/** Gera um link temporário para baixar um anexo da conversa. */
export async function baixarAnexoPortal(anexoId: string) {
  const { data, error } = await supabase.rpc("portal_anexo_arquivo", { p_anexo_id: anexoId });
  if (error) throw error;
  const anexo = data as unknown as { nome: string; arquivo_path: string } | null;
  if (!anexo?.arquivo_path) throw new Error("Anexo não disponível");
  const assinada = await supabase.storage.from("anexos").createSignedUrl(anexo.arquivo_path, 120);
  if (assinada.error) throw assinada.error;
  return assinada.data.signedUrl;
}
