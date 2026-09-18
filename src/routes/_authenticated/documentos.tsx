import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Clock, Download, FileText, History, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProjetos, registrarAuditoria } from "@/lib/dados";
import { fmtData } from "@/lib/enzova";
import {
  BotaoPrimario,
  BotaoSecundario,
  Indicador,
  Painel,
  Pill,
  TituloPagina,
  Vazio,
  inputClasses,
} from "@/components/kit";

export const Route = createFileRoute("/_authenticated/documentos")({
  head: () => ({
    meta: [
      { title: "Aprovação de documentos · Projeta" },
      {
        name: "description",
        content: "Revise, aprove ou recuse documentos antes de liberá-los no portal do cliente, com status e histórico.",
      },
      { property: "og:title", content: "Aprovação de documentos" },
      { property: "og:description", content: "Fila de aprovação de documentos antes do portal do cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AprovacaoDocumentos,
});

type StatusAprovacao = "pendente" | "aprovado" | "rejeitado";

type DocumentoFila = {
  id: string;
  projeto_id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  arquivo_path: string | null;
  url: string | null;
  visivel_cliente: boolean;
  solicita_portal: boolean;
  aprovacao_status: StatusAprovacao;
  aprovado_em: string | null;
  observacao_aprovacao: string | null;
  aprovador_id: string | null;
  created_at: string;
};

const ROTULO: Record<StatusAprovacao, string> = {
  pendente: "Aguardando aprovação",
  aprovado: "Aprovado",
  rejeitado: "Recusado",
};

function PillStatus({ status }: { status: StatusAprovacao }) {
  const cor =
    status === "aprovado"
      ? "bg-success-soft text-success"
      : status === "rejeitado"
        ? "bg-danger/12 text-danger"
        : "bg-warning/15 text-warning";
  return <Pill className={cor}>{ROTULO[status]}</Pill>;
}

function useFilaDocumentos() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["documentos", "fila", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select(
          "id, projeto_id, nome, descricao, categoria, arquivo_path, url, visivel_cliente, solicita_portal, aprovacao_status, aprovado_em, observacao_aprovacao, aprovador_id, created_at",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DocumentoFila[];
    },
  });
}

function useHistoricoDocumentos() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["auditoria", "documentos", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auditoria")
        .select("id, entidade_id, acao, campo, valor_anterior, valor_novo, created_at, profiles(nome)")
        .eq("entidade", "documento")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        entidade_id: string | null;
        acao: string;
        campo: string | null;
        valor_anterior: string | null;
        valor_novo: string | null;
        created_at: string;
        profiles: { nome: string } | null;
      }[];
    },
  });
}

function AprovacaoDocumentos() {
  const { can, perfil } = useAuth();
  const queryClient = useQueryClient();
  const { data: documentos = [], isLoading } = useFilaDocumentos();
  const { data: projetos = [] } = useProjetos();
  const { data: historico = [] } = useHistoricoDocumentos();
  const [filtro, setFiltro] = useState<"pendente" | "aprovado" | "rejeitado" | "todos">("pendente");
  const [projetoId, setProjetoId] = useState("");
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});
  const [aberto, setAberto] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  const podeAprovar = can("documento.aprovar");

  const nomeProjeto = useMemo(() => {
    const mapa = new Map(projetos.map((p) => [p.id, `${p.codigo} · ${p.nome}`]));
    return (id: string) => mapa.get(id) ?? "Projeto";
  }, [projetos]);

  const historicoPorDoc = useMemo(() => {
    const mapa = new Map<string, typeof historico>();
    for (const h of historico) {
      if (!h.entidade_id) continue;
      mapa.set(h.entidade_id, [...(mapa.get(h.entidade_id) ?? []), h]);
    }
    return mapa;
  }, [historico]);

  const lista = documentos.filter(
    (d) => (filtro === "todos" || d.aprovacao_status === filtro) && (!projetoId || d.projeto_id === projetoId),
  );

  const porProjeto = useMemo(() => {
    const mapa = new Map<string, { nome: string; projeto: string; Aprovados: number; Pendentes: number; Recusados: number }>();
    for (const d of documentos) {
      const rotulo = nomeProjeto(d.projeto_id);
      const atual =
        mapa.get(d.projeto_id) ??
        { nome: rotulo.split(" · ")[0] ?? rotulo, projeto: rotulo, Aprovados: 0, Pendentes: 0, Recusados: 0 };
      if (d.aprovacao_status === "aprovado") atual.Aprovados += 1;
      else if (d.aprovacao_status === "rejeitado") atual.Recusados += 1;
      else atual.Pendentes += 1;
      mapa.set(d.projeto_id, atual);
    }
    return Array.from(mapa.values()).sort((a, b) => b.Pendentes - a.Pendentes);
  }, [documentos, nomeProjeto]);

  const pendentes = documentos.filter((d) => d.aprovacao_status === "pendente").length;
  const aprovados = documentos.filter((d) => d.aprovacao_status === "aprovado").length;
  const recusados = documentos.filter((d) => d.aprovacao_status === "rejeitado").length;
  const noPortal = documentos.filter((d) => d.visivel_cliente).length;

  async function decidir(doc: DocumentoFila, decisao: "aprovado" | "rejeitado") {
    if (!perfil) return;
    setSalvando(doc.id);
    try {
      const observacao = observacoes[doc.id]?.trim() || null;
      const { error } = await supabase
        .from("documentos")
        .update({
          aprovacao_status: decisao,
          aprovador_id: perfil.id,
          aprovado_em: new Date().toISOString(),
          observacao_aprovacao: observacao,
        })
        .eq("id", doc.id);
      if (error) throw error;

      await registrarAuditoria({
        tenant_id: perfil.tenant_id,
        profile_id: perfil.id,
        entidade: "documento",
        entidade_id: doc.id,
        acao: decisao === "aprovado" ? "aprovou" : "recusou",
        campo: "aprovacao_status",
        valor_anterior: doc.aprovacao_status,
        valor_novo: observacao ? `${decisao} — ${observacao}` : decisao,
        projeto_id: doc.projeto_id,
      });

      void queryClient.invalidateQueries({ queryKey: ["documentos"] });
      void queryClient.invalidateQueries({ queryKey: ["auditoria", "documentos"] });
      setObservacoes((o) => ({ ...o, [doc.id]: "" }));
      toast.success(decisao === "aprovado" ? "Documento aprovado e liberado conforme solicitado." : "Documento recusado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar a decisão.");
    } finally {
      setSalvando(null);
    }
  }

  async function abrir(doc: DocumentoFila) {
    try {
      if (doc.url) {
        window.open(doc.url, "_blank", "noopener,noreferrer");
        return;
      }
      if (!doc.arquivo_path) throw new Error("Documento sem arquivo");
      const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.arquivo_path, 120);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o documento.");
    }
  }

  return (
    <>
      <TituloPagina
        sobretitulo={<>{pendentes} aguardando decisão</>}
        titulo="Aprovação de documentos"
        descricao="Nenhum documento chega ao portal do cliente antes de ser aprovado aqui."
        acoes={
          <>
            <select className={`${inputClasses} w-auto`} value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
              <option value="pendente">Aguardando aprovação</option>
              <option value="aprovado">Aprovados</option>
              <option value="rejeitado">Recusados</option>
              <option value="todos">Todos</option>
            </select>
            <select className={`${inputClasses} w-auto`} value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
              <option value="">Todos os projetos</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nome}
                </option>
              ))}
            </select>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Aguardando aprovação" valor={pendentes} detalhe="não aparecem no portal" tom={pendentes ? "atencao" : "positivo"} />
        <Indicador titulo="Aprovados" valor={aprovados} detalhe="liberados para uso" tom="positivo" />
        <Indicador titulo="Recusados" valor={recusados} detalhe="precisam de correção" tom={recusados ? "negativo" : "neutro"} />
        <Indicador titulo="Visíveis no portal" valor={noPortal} detalhe="aprovados e liberados ao cliente" />
      </div>

      {isLoading ? (
        <Painel>
          <Vazio titulo="Carregando documentos…" />
        </Painel>
      ) : lista.length === 0 ? (
        <Painel>
          <Vazio titulo="Nada por aqui" descricao="Não há documentos nesse filtro." />
        </Painel>
      ) : (
        <div className="space-y-3">
          {lista.map((d) => {
            const hist = historicoPorDoc.get(d.id) ?? [];
            return (
              <Painel key={d.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[14px] font-semibold">{d.nome}</span>
                        <PillStatus status={d.aprovacao_status} />
                        {d.solicita_portal ? (
                          <Pill className="bg-secondary text-muted-foreground">Pedido de liberação ao cliente</Pill>
                        ) : (
                          <Pill className="bg-secondary text-muted-foreground">Uso interno</Pill>
                        )}
                        {d.visivel_cliente ? <Pill className="bg-success-soft text-success">No portal</Pill> : null}
                      </div>
                      <div className="mt-1 text-[11.5px] text-muted-foreground">
                        <Link to="/projetos/$projetoId" params={{ projetoId: d.projeto_id }} className="hover:text-brand">
                          {nomeProjeto(d.projeto_id)}
                        </Link>{" "}
                        · {d.categoria} · enviado em {fmtData(d.created_at, "dd MMM yyyy")}
                      </div>
                      {d.descricao ? <div className="mt-1 text-[12.5px] text-muted-foreground">{d.descricao}</div> : null}
                      {d.observacao_aprovacao ? (
                        <div className="mt-1 text-[12px] text-muted-foreground">
                          Observação da decisão: {d.observacao_aprovacao}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => abrir(d)}
                      title="Abrir arquivo"
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-brand"
                    >
                      <Download className="size-4" />
                    </button>
                    <button
                      onClick={() => setAberto(aberto === d.id ? null : d.id)}
                      title="Histórico"
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-brand"
                    >
                      <History className="size-4" />
                    </button>
                  </div>
                </div>

                {podeAprovar ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      className={`${inputClasses} sm:w-80`}
                      placeholder="Observação da decisão (opcional)"
                      value={observacoes[d.id] ?? ""}
                      onChange={(e) => setObservacoes({ ...observacoes, [d.id]: e.target.value })}
                    />
                    <BotaoPrimario disabled={salvando === d.id || d.aprovacao_status === "aprovado"} onClick={() => decidir(d, "aprovado")}>
                      <Check className="size-4" /> Aprovar
                    </BotaoPrimario>
                    <BotaoSecundario disabled={salvando === d.id || d.aprovacao_status === "rejeitado"} onClick={() => decidir(d, "rejeitado")}>
                      <X className="size-4" /> Recusar
                    </BotaoSecundario>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Clock className="size-3.5" /> Somente perfis com permissão de aprovação decidem sobre documentos.
                  </div>
                )}

                {aberto === d.id ? (
                  <div className="mt-3 rounded-xl bg-secondary/60 p-3">
                    <div className="text-[12px] font-semibold">Histórico do documento</div>
                    {hist.length === 0 ? (
                      <div className="mt-1 text-[12px] text-muted-foreground">Sem registros ainda.</div>
                    ) : (
                      <ul className="mt-2 space-y-1.5 text-[12px] text-muted-foreground">
                        {hist.map((h) => (
                          <li key={h.id}>
                            {fmtData(h.created_at, "dd MMM yyyy HH:mm")} · {h.profiles?.nome ?? "Sistema"} {h.acao}
                            {h.valor_novo ? ` — ${h.valor_novo}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </Painel>
            );
          })}
        </div>
      )}
    </>
  );
}
