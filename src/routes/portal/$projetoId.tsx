import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Download,
  FileDown,
  FileText,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Star,
} from "lucide-react";
import {
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Indicador,
  Painel,
  Pill,
  Progresso,
  TituloPagina,
  Vazio,
  inputClasses,
} from "@/components/kit";
import { FASE_STATUS, MARCO_STATUS, PROJETO_STATUS, diasRestantes, fmtData, fmtDataLonga } from "@/lib/enzova";
import {
  baixarDocumento,
  usePortalComentar,
  usePortalDecidirMarco,
  usePortalProjeto,
  usePortalResponderPesquisa,
  usePortalResumo,
  type PortalProjetoDetalhe,
} from "@/lib/portal";
import { gerarRelatorioProjeto } from "@/lib/relatorio-projeto";


export const Route = createFileRoute("/portal/$projetoId")({
  head: () => ({
    meta: [
      { title: "Andamento do projeto · Portal do cliente" },
      { name: "description", content: "Fases, entregas, prazos e documentos do seu projeto." },
      { property: "og:title", content: "Andamento do projeto · Portal do cliente" },
      { property: "og:description", content: "Veja fases, entregas, prazos e baixe os documentos liberados." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalProjeto,
});

function PortalProjeto() {
  const { projetoId } = Route.useParams();
  const { data, isLoading } = usePortalProjeto(projetoId);
  const { data: resumo } = usePortalResumo();
  const comentar = usePortalComentar(projetoId);
  const decidir = usePortalDecidirMarco(projetoId);
  const [texto, setTexto] = useState("");
  const [baixando, setBaixando] = useState<string | null>(null);


  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando o projeto…
      </div>
    );
  }

  if (!data?.projeto) {
    return (
      <Painel>
        <Vazio titulo="Projeto não disponível" descricao="Você não tem acesso a este projeto." />
      </Painel>
    );
  }

  const { projeto, fases, marcos, documentos, comentarios } = data;
  const status = PROJETO_STATUS[projeto.status];
  const prazo = projeto.prazo ?? projeto.data_prevista_conclusao;
  const dias = diasRestantes(prazo);
  const fasesConcluidas = fases.filter((f) => f.status === "concluida").length;
  const aguardando = marcos.filter((m) => m.entrega_cliente && m.status !== "atingido" && !m.decisao);

  async function baixar(id: string, nome: string) {
    setBaixando(id);
    try {
      const url = await baixarDocumento(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Não foi possível abrir ${nome}.`);
    } finally {
      setBaixando(null);
    }
  }

  async function enviarComentario() {
    if (!texto.trim()) return;
    try {
      await comentar.mutateAsync(texto.trim());
      setTexto("");
      toast.success("Mensagem enviada para a equipe do projeto.");
    } catch {
      toast.error("Não foi possível enviar sua mensagem.");
    }
  }

  async function decidirMarco(marcoId: string, decisao: "aprovado" | "ajustes") {
    try {
      await decidir.mutateAsync({ marcoId, decisao });
      toast.success(decisao === "aprovado" ? "Entrega aprovada." : "Pedido de ajustes registrado.");
    } catch {
      toast.error("Não foi possível registrar sua decisão.");
    }
  }

  return (
    <>
      <Link
        to="/portal"
        className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition hover:text-brand"
      >
        <ArrowLeft className="size-3.5" /> Meus projetos
      </Link>

      <TituloPagina
        sobretitulo={
          <>
            <span>{projeto.codigo}</span>
            <Pill className={status.pill}>{status.label}</Pill>
          </>
        }
        titulo={projeto.nome}
        descricao={projeto.descricao ?? undefined}
        acoes={
          <BotaoSecundario
            onClick={() =>
              gerarRelatorioProjeto(data as PortalProjetoDetalhe, {
                empresa: resumo?.empresa?.nome,
                cliente: resumo?.cliente?.nome_fantasia ?? resumo?.cliente?.nome,
                tema: resumo?.tema,
              })
            }
          >
            <FileDown className="size-4" /> Baixar relatório PDF
          </BotaoSecundario>
        }
      />


      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador titulo="Progresso" valor={`${projeto.progresso}%`} progresso={projeto.progresso} />
        <Indicador
          titulo="Fases concluídas"
          valor={`${fasesConcluidas}/${fases.length}`}
          detalhe="Etapas do cronograma"
        />
        <Indicador
          titulo="Prazo"
          valor={prazo ? fmtData(prazo, "dd MMM yyyy") : "—"}
          detalhe={
            dias === null ? "A definir" : dias < 0 ? `${Math.abs(dias)} dias de atraso` : `${dias} dias restantes`
          }
          tom={dias !== null && dias < 0 ? "negativo" : "neutro"}
        />
        <Indicador
          titulo="Aguardando você"
          valor={aguardando.length}
          detalhe="Entregas para aprovar"
          tom={aguardando.length ? "atencao" : "positivo"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Painel>
            <h2 className="font-display text-[15px] font-semibold">Fases do projeto</h2>
            <div className="mt-4 space-y-4">
              {fases.map((f) => {
                const st = FASE_STATUS[f.status];
                return (
                  <div key={f.id} className="relative pl-6">
                    <span className="absolute top-1.5 left-0 size-2.5 rounded-full bg-brand" />
                    <span className="absolute top-5 left-[4.5px] h-[calc(100%-6px)] w-px bg-border last:hidden" />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[13.5px] font-semibold">{f.nome}</div>
                      <Pill className={st.pill}>{st.label}</Pill>
                    </div>
                    {f.descricao ? (
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{f.descricao}</p>
                    ) : null}
                    <div className="mt-2 flex items-center gap-3">
                      <Progresso valor={f.progresso} className="max-w-xs flex-1" />
                      <span className="text-[11.5px] text-muted-foreground">{f.progresso}%</span>
                      <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                        <CalendarClock className="size-3.5" />
                        {f.prazo ? fmtData(f.prazo, "dd MMM yyyy") : "sem prazo"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {fases.length === 0 ? <Vazio titulo="Fases em definição" /> : null}
            </div>
          </Painel>

          <Painel>
            <h2 className="font-display text-[15px] font-semibold">Entregas e marcos</h2>
            <div className="mt-3 divide-y divide-border/70">
              {marcos.map((m) => {
                const st = MARCO_STATUS[m.status];
                const podeDecidir = m.entrega_cliente && m.status !== "atingido" && !m.decisao;
                return (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13.5px] font-semibold">{m.nome}</span>
                        <Pill className={st.pill}>{st.label}</Pill>
                        {m.entrega_cliente ? (
                          <Pill className="bg-brand-soft text-brand-ink">Entrega ao cliente</Pill>
                        ) : null}
                        {m.decisao ? (
                          <Pill
                            className={
                              m.decisao === "aprovado" ? "bg-success/12 text-success" : "bg-warning/12 text-warning"
                            }
                          >
                            {m.decisao === "aprovado" ? "Você aprovou" : "Ajustes pedidos"}
                          </Pill>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                        {m.fase ? `${m.fase} · ` : ""}
                        {m.data ? fmtData(m.data, "dd MMM yyyy") : "data a definir"}
                        {m.data_real ? ` · entregue em ${fmtData(m.data_real, "dd MMM yyyy")}` : ""}
                      </div>
                    </div>
                    {podeDecidir ? (
                      <div className="flex items-center gap-2">
                        <BotaoPrimario
                          onClick={() => decidirMarco(m.id, "aprovado")}
                          disabled={decidir.isPending}
                          className="px-3 py-2"
                        >
                          <Check className="size-4" /> Aprovar
                        </BotaoPrimario>
                        <BotaoSecundario
                          onClick={() => decidirMarco(m.id, "ajustes")}
                          disabled={decidir.isPending}
                          className="px-3 py-2"
                        >
                          <RotateCcw className="size-4" /> Pedir ajustes
                        </BotaoSecundario>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {marcos.length === 0 ? <Vazio titulo="Nenhuma entrega registrada" /> : null}
            </div>
          </Painel>

          {projeto.status === "concluido" ? (
            <PesquisaSatisfacao projetoId={projetoId} pesquisa={data.pesquisa} />
          ) : null}
        </div>


        <div className="space-y-4">
          <Painel>
            <h2 className="font-display text-[15px] font-semibold">Documentos</h2>
            <div className="mt-3 space-y-2">
              {documentos.map((d) => (
                <button
                  key={d.id}
                  onClick={() => baixar(d.id, d.nome)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition hover:border-brand/40"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
                    <FileText className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{d.nome}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {d.categoria} · {fmtData(d.created_at, "dd MMM yyyy")}
                    </span>
                  </span>
                  {baixando === d.id ? (
                    <Loader2 className="size-4 animate-spin text-brand" />
                  ) : (
                    <Download className="size-4 text-brand" />
                  )}
                </button>
              ))}
              {documentos.length === 0 ? <Vazio titulo="Nenhum documento liberado" /> : null}
            </div>
          </Painel>

          <Painel>
            <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
              <MessageSquare className="size-4 text-brand" /> Conversa com a equipe
            </h2>
            <div className="scroll-slim mt-3 max-h-80 space-y-3 overflow-y-auto pr-1">
              {comentarios.map((c) => (
                <div
                  key={c.id}
                  className={
                    c.do_cliente
                      ? "rounded-xl bg-brand-soft px-3 py-2.5"
                      : "rounded-xl border border-border bg-card px-3 py-2.5"
                  }
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{c.autor ?? "Equipe"}</span>
                    <span>{fmtDataLonga(c.created_at)}</span>
                  </div>
                  <p className="mt-1 text-[12.5px] whitespace-pre-line">{c.conteudo}</p>
                </div>
              ))}
              {comentarios.length === 0 ? <Vazio titulo="Nenhuma mensagem ainda" /> : null}
            </div>

            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              placeholder="Escreva uma mensagem para a equipe do projeto"
              className="mt-3 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <BotaoPrimario
              onClick={enviarComentario}
              disabled={comentar.isPending || !texto.trim()}
              className="mt-2 w-full justify-center"
            >
              {comentar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Enviar mensagem
            </BotaoPrimario>
          </Painel>
        </div>
      </div>
    </>
  );
}

const ITENS_NOTA = [
  { campo: "nota_geral", rotulo: "Satisfação geral" },
  { campo: "nota_prazo", rotulo: "Cumprimento de prazos" },
  { campo: "nota_qualidade", rotulo: "Qualidade da entrega" },
  { campo: "nota_comunicacao", rotulo: "Comunicação da equipe" },
] as const;

function Estrelas({
  valor,
  onChange,
  somenteLeitura,
}: {
  valor: number;
  onChange?: ((n: number) => void) | undefined;
  somenteLeitura?: boolean | undefined;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={somenteLeitura}
          onClick={() => onChange?.(n)}
          className={somenteLeitura ? "cursor-default" : "transition hover:scale-110"}
          aria-label={`${n} de 5`}
        >
          <Star
            className={
              n <= valor ? "size-5 fill-brand text-brand" : "size-5 text-muted-foreground/40"
            }
          />
        </button>
      ))}
    </div>
  );
}

function PesquisaSatisfacao({
  projetoId,
  pesquisa,
}: {
  projetoId: string;
  pesquisa: PortalProjetoDetalhe["pesquisa"];
}) {
  const responder = usePortalResponderPesquisa(projetoId);
  const [editando, setEditando] = useState(false);
  const [notas, setNotas] = useState({
    nota_geral: pesquisa?.nota_geral ?? 0,
    nota_prazo: pesquisa?.nota_prazo ?? 0,
    nota_qualidade: pesquisa?.nota_qualidade ?? 0,
    nota_comunicacao: pesquisa?.nota_comunicacao ?? 0,
  });
  const [recomendaria, setRecomendaria] = useState(String(pesquisa?.recomendaria ?? 9));
  const [comentario, setComentario] = useState(pesquisa?.comentario ?? "");

  const respondida = Boolean(pesquisa) && !editando;

  async function enviar() {
    if (!notas.nota_geral) {
      toast.error("Dê ao menos a nota de satisfação geral.");
      return;
    }
    try {
      await responder.mutateAsync({
        nota_geral: notas.nota_geral,
        nota_prazo: notas.nota_prazo || undefined,
        nota_qualidade: notas.nota_qualidade || undefined,
        nota_comunicacao: notas.nota_comunicacao || undefined,
        recomendaria: recomendaria === "" ? undefined : Number(recomendaria),
        comentario,
      });
      setEditando(false);
      toast.success("Obrigado pela sua avaliação!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a avaliação.");
    }
  }

  return (
    <Painel>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
            <Star className="size-4 text-brand" /> Pesquisa de satisfação
          </h2>
          <p className="text-[11.5px] text-muted-foreground">
            {respondida
              ? `Avaliação enviada em ${fmtData(pesquisa!.created_at, "dd MMM yyyy")}.`
              : "Este projeto foi concluído. Conte como foi a sua experiência."}
          </p>
        </div>
        {respondida ? (
          <BotaoSecundario className="px-3 py-2" onClick={() => setEditando(true)}>
            Revisar resposta
          </BotaoSecundario>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ITENS_NOTA.map((item) => (
          <div key={item.campo} className="rounded-xl border border-border bg-card px-3.5 py-3">
            <div className="text-[12px] font-medium text-muted-foreground">{item.rotulo}</div>
            <div className="mt-1.5">
              <Estrelas
                valor={notas[item.campo]}
                somenteLeitura={respondida}
                onChange={(n) => setNotas((a) => ({ ...a, [item.campo]: n }))}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Campo label="Recomendaria (0 a 10)">
          <input
            className={inputClasses}
            type="number"
            min={0}
            max={10}
            value={recomendaria}
            disabled={respondida}
            onChange={(e) => setRecomendaria(e.target.value)}
          />
        </Campo>
        <Campo label="Comentário" className="sm:col-span-2">
          <input
            className={inputClasses}
            value={comentario}
            disabled={respondida}
            placeholder="O que funcionou bem e o que podemos melhorar?"
            onChange={(e) => setComentario(e.target.value)}
          />
        </Campo>
      </div>

      {respondida ? null : (
        <div className="mt-4 flex justify-end">
          <BotaoPrimario onClick={enviar} disabled={responder.isPending}>
            {responder.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Enviar avaliação
          </BotaoPrimario>
        </div>
      )}
    </Painel>
  );
}

