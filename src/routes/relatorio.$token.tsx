import { useEffect, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarClock, FileDown, FileText, Loader2, Lock, ShieldAlert } from "lucide-react";
import {
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Indicador,
  Painel,
  Pill,
  Progresso,
  Vazio,
  inputClasses,
} from "@/components/kit";
import { FASE_STATUS, MARCO_STATUS, PROJETO_STATUS, fmtData } from "@/lib/enzova";
import { abrirRelatorioLink, type AberturaLink, type RelatorioCompartilhado } from "@/lib/relatorio-links";
import { gerarRelatorioProjeto } from "@/lib/relatorio-projeto";

export const Route = createFileRoute("/relatorio/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Relatório do projeto · Projeta" },
      { name: "description", content: "Relatório compartilhado com progresso, fases, prazos e documentos do projeto." },
      { property: "og:title", content: "Relatório do projeto" },
      { property: "og:description", content: "Progresso, fases, prazos e documentos compartilhados do projeto." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelatorioCompartilhadoPagina,
});

const MENSAGENS: Record<string, { titulo: string; descricao: string }> = {
  expirado: {
    titulo: "Link expirado",
    descricao: "A validade deste link terminou. Peça um novo link a quem o enviou.",
  },
  revogado: {
    titulo: "Link revogado",
    descricao: "Este link foi desativado pela equipe do projeto.",
  },
  limite: {
    titulo: "Limite de aberturas atingido",
    descricao: "Este link já foi aberto o número de vezes permitido.",
  },
  nao_encontrado: {
    titulo: "Link inválido",
    descricao: "Confira se o endereço foi copiado por completo.",
  },
};

function RelatorioCompartilhadoPagina() {
  const { token } = Route.useParams();
  const [estado, setEstado] = useState<AberturaLink | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [senha, setSenha] = useState("");
  const [validando, setValidando] = useState(false);

  async function abrir(comSenha?: string) {
    try {
      const r = await abrirRelatorioLink(token, comSenha);
      setEstado(r);
      if (r.status === "senha_invalida") toast.error("Senha incorreta.");
    } catch {
      setEstado({ status: "nao_encontrado" });
    }
  }

  useEffect(() => {
    void abrir().finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (carregando) {
    return (
      <Centro>
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Abrindo o relatório…
        </div>
      </Centro>
    );
  }

  if (estado?.status === "ok" && estado.dados) return <Conteudo dados={estado.dados} />;

  if (estado?.status === "senha" || estado?.status === "senha_invalida") {
    return (
      <Centro>
        <Painel className="w-full max-w-sm">
          <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-ink">
            <Lock className="size-5" />
          </div>
          <h1 className="mt-3 font-display text-[18px] font-semibold">Relatório protegido</h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Digite a senha que você recebeu junto com o link para ver o relatório do projeto.
          </p>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!senha.trim()) return;
              setValidando(true);
              await abrir(senha.trim());
              setValidando(false);
            }}
          >
            <Campo label="Senha do link">
              <input
                className={inputClasses}
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoFocus
              />
            </Campo>
            <BotaoPrimario type="submit" disabled={validando || !senha.trim()} className="w-full justify-center">
              {validando ? <Loader2 className="size-4 animate-spin" /> : null} Ver relatório
            </BotaoPrimario>
          </form>
        </Painel>
      </Centro>
    );
  }

  const msg = MENSAGENS[estado?.status ?? "nao_encontrado"] ?? MENSAGENS["nao_encontrado"]!;
  return (
    <Centro>
      <Painel className="w-full max-w-sm text-center">
        <div className="mx-auto grid size-10 place-items-center rounded-xl bg-warning/12 text-warning">
          <ShieldAlert className="size-5" />
        </div>
        <h1 className="mt-3 font-display text-[18px] font-semibold">{msg.titulo}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{msg.descricao}</p>
      </Painel>
    </Centro>
  );
}

function Centro({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-canvas px-4 py-10">{children}</div>;
}

function Conteudo({ dados }: { dados: RelatorioCompartilhado }) {
  const { projeto, fases, marcos, documentos, tema, empresa, cliente, link } = dados;
  const status = PROJETO_STATUS[projeto.status];
  const prazo = projeto.prazo ?? projeto.data_prevista_conclusao;
  const fasesConcluidas = fases.filter((f) => f.status === "concluida").length;
  const marca = tema?.nome_exibicao || empresa?.nome || "Projeta";

  const estilo = {
    ...(tema?.cor_primaria ? { "--primary": tema.cor_primaria, "--brand-ink": tema.cor_primaria } : {}),
    ...(tema?.cor_destaque ? { "--neon": tema.cor_destaque } : {}),
  } as CSSProperties;

  return (
    <div style={estilo} className="min-h-screen bg-canvas">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            {tema?.logo_url ? (
              <img src={tema.logo_url} alt={marca} className="h-9 w-auto object-contain" />
            ) : (
              <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand-ink">
                <FileText className="size-4" />
              </span>
            )}
            <div>
              <div className="font-display text-[15px] font-semibold">{marca}</div>
              <div className="text-[11.5px] text-muted-foreground">Relatório de acompanhamento do projeto</div>
            </div>
          </div>
          <BotaoSecundario
            onClick={() =>
              gerarRelatorioProjeto(dados, {
                empresa: empresa?.nome,
                cliente: cliente?.nome_fantasia ?? cliente?.nome,
                tema,
              })
            }
          >
            <FileDown className="size-4" /> Baixar relatório PDF
          </BotaoSecundario>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <Painel>
          <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
            <span>{projeto.codigo}</span>
            <Pill className={status.pill}>{status.label}</Pill>
            <span>Link válido até {fmtData(link.expira_em, "dd MMM yyyy")}</span>
          </div>
          <h1 className="mt-2 font-display text-[22px] font-semibold">{projeto.nome}</h1>
          {projeto.descricao ? (
            <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">{projeto.descricao}</p>
          ) : null}
        </Painel>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Indicador titulo="Progresso" valor={`${projeto.progresso}%`} progresso={projeto.progresso} />
          <Indicador titulo="Fases concluídas" valor={`${fasesConcluidas}/${fases.length}`} detalhe="Etapas" />
          <Indicador
            titulo={projeto.status === "concluido" ? "Concluído em" : "Prazo previsto"}
            valor={
              projeto.status === "concluido" && projeto.data_real_conclusao
                ? fmtData(projeto.data_real_conclusao, "dd MMM yyyy")
                : prazo
                  ? fmtData(prazo, "dd MMM yyyy")
                  : "—"
            }
          />
          <Indicador titulo="Documentos" valor={documentos.length} detalhe="Compartilhados" />
        </div>

        <Painel>
          <h2 className="font-display text-[15px] font-semibold">Fases e prazos</h2>
          <div className="mt-4 space-y-4">
            {fases.map((f) => {
              const st = FASE_STATUS[f.status];
              return (
                <div key={f.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13.5px] font-semibold">{f.nome}</span>
                    <Pill className={st.pill}>{st.label}</Pill>
                  </div>
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
              return (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-semibold">{m.nome}</span>
                      <Pill className={st.pill}>{st.label}</Pill>
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {m.fase ? `${m.fase} · ` : ""}
                      {m.data ? fmtData(m.data, "dd MMM yyyy") : "data a definir"}
                      {m.data_real ? ` · entregue em ${fmtData(m.data_real, "dd MMM yyyy")}` : ""}
                    </div>
                  </div>
                  {m.decisao ? (
                    <Pill
                      className={m.decisao === "aprovado" ? "bg-success/12 text-success" : "bg-warning/12 text-warning"}
                    >
                      {m.decisao === "aprovado" ? "Aprovado pelo cliente" : "Ajustes pedidos"}
                    </Pill>
                  ) : null}
                </div>
              );
            })}
            {marcos.length === 0 ? <Vazio titulo="Nenhuma entrega registrada" /> : null}
          </div>
        </Painel>

        <Painel>
          <h2 className="font-display text-[15px] font-semibold">Documentos compartilhados</h2>
          <div className="mt-3 space-y-2">
            {documentos.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
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
              </div>
            ))}
            {documentos.length === 0 ? <Vazio titulo="Nenhum documento liberado" /> : null}
          </div>
        </Painel>

        <p className="pb-6 text-center text-[11.5px] text-muted-foreground">
          {marca} · relatório de acompanhamento · este link expira em {fmtData(link.expira_em, "dd MMM yyyy")}
        </p>
      </main>
    </div>
  );
}
