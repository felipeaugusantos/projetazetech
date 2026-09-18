import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, FileText, Flag, Layers } from "lucide-react";
import { Indicador, Painel, Pill, Progresso, TituloPagina, Vazio } from "@/components/kit";
import { PROJETO_STATUS, diasRestantes, fmtData } from "@/lib/enzova";
import { usePortalResumo } from "@/lib/portal";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [
      { title: "Meus projetos · Portal do cliente" },
      { name: "description", content: "Acompanhe o progresso, as fases e os prazos dos seus projetos." },
      { property: "og:title", content: "Meus projetos · Portal do cliente" },
      { property: "og:description", content: "Progresso, fases, prazos e documentos dos seus projetos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalHome,
});

function PortalHome() {
  const { data } = usePortalResumo();
  const projetos = data?.projetos ?? [];

  const emAndamento = projetos.filter((p) => !["concluido", "cancelado"].includes(p.status)).length;
  const progressoMedio = projetos.length
    ? Math.round(projetos.reduce((t, p) => t + p.progresso, 0) / projetos.length)
    : 0;
  const pendentes = projetos.reduce((t, p) => t + p.marcos_pendentes, 0);
  const documentos = projetos.reduce((t, p) => t + p.documentos, 0);

  return (
    <>
      <TituloPagina
        sobretitulo={<span>{data?.cliente?.nome_fantasia ?? data?.cliente?.nome ?? "Seus projetos"}</span>}
        titulo={`Olá, ${(data?.acesso?.nome ?? "").split(" ")[0] || "bem-vindo"}`}
        descricao="Acompanhe o andamento, as fases, os prazos e os documentos liberados para você."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador titulo="Projetos ativos" valor={emAndamento} detalhe={`${projetos.length} no total`} />
        <Indicador titulo="Progresso médio" valor={`${progressoMedio}%`} progresso={progressoMedio} />
        <Indicador titulo="Entregas aguardando você" valor={pendentes} tom={pendentes ? "atencao" : "positivo"} />
        <Indicador titulo="Documentos disponíveis" valor={documentos} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {projetos.length === 0 ? (
          <Painel className="lg:col-span-2">
            <Vazio titulo="Nenhum projeto por aqui" descricao="Assim que um projeto for iniciado, ele aparece aqui." />
          </Painel>
        ) : null}

        {projetos.map((p) => {
          const status = PROJETO_STATUS[p.status];
          const prazo = p.prazo ?? p.data_prevista_conclusao;
          const dias = diasRestantes(prazo);
          return (
            <Link key={p.id} to="/portal/$projetoId" params={{ projetoId: p.id }} className="group block">
              <Painel className="h-full transition group-hover:border-brand/40 group-hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold text-muted-foreground">{p.codigo}</div>
                    <div className="font-display text-[17px] font-bold tracking-tight">{p.nome}</div>
                  </div>
                  <Pill className={status.pill}>{status.label}</Pill>
                </div>

                {p.descricao ? (
                  <p className="mt-2 line-clamp-2 text-[12.5px] text-muted-foreground">{p.descricao}</p>
                ) : null}

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-[11.5px] font-medium text-muted-foreground">
                    <span>Progresso</span>
                    <span className="text-foreground">{p.progresso}%</span>
                  </div>
                  <Progresso valor={p.progresso} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-[11.5px] text-muted-foreground sm:grid-cols-4">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="size-3.5 text-brand" />
                    {p.fases_concluidas}/{p.fases_total} fases
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Flag className="size-3.5 text-brand" />
                    {p.marcos_pendentes} entregas
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="size-3.5 text-brand" />
                    {p.documentos} docs
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="size-3.5 text-brand" />
                    {prazo ? fmtData(prazo, "dd MMM yyyy") : "sem prazo"}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between text-[12px]">
                  <span className={dias !== null && dias < 0 ? "text-danger" : "text-muted-foreground"}>
                    {dias === null
                      ? "Prazo a definir"
                      : dias < 0
                        ? `${Math.abs(dias)} dias de atraso`
                        : `${dias} dias restantes`}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-brand">
                    Ver detalhes <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Painel>
            </Link>
          );
        })}
      </div>
    </>
  );
}
