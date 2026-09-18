import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Enzova Projects · Do lead ao aceite, em uma plataforma" },
      {
        name: "description",
        content:
          "Plataforma multiempresa de gestão de projetos para software houses, consultorias, agências e prestadores de serviço.",
      },
      { property: "og:title", content: "Enzova Projects" },
      {
        property: "og:description",
        content: "Clientes, projetos, fases, tarefas, equipes e indicadores em um só lugar.",
      },
    ],
  }),
  component: Landing,
});

const FLUXO = ["Lead/Cliente", "Projeto", "Planejamento", "Tarefas", "Execução", "Validação", "Entrega", "Aceite"];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="halo" style={{ width: 520, height: 520, top: -160, left: 120, background: "#60A5FA" }} />
        <div className="halo" style={{ width: 460, height: 460, bottom: -180, right: 80, background: "#A5B4FC" }} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
        <header className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-brand font-display text-sm font-bold text-primary-foreground shadow-lg shadow-brand/30">
            E
          </div>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-bold">Enzova</div>
            <div className="-mt-0.5 text-[11px] text-muted-foreground">Projects</div>
          </div>
          <Link
            to="/auth"
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-brand/30 transition hover:brightness-110"
          >
            Entrar <ArrowRight className="size-4" />
          </Link>
        </header>

        <div className="flex flex-1 flex-col justify-center py-14">
          <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" /> Multiempresa · Fase 1 disponível
          </div>
          <h1 className="mt-3 max-w-2xl font-display text-[40px] leading-[1.05] font-bold tracking-tight sm:text-[52px]">
            Do primeiro contato ao aceite do cliente, sem planilhas paralelas.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">
            Enzova Projects reúne clientes, projetos, fases, tarefas, equipes e indicadores de saúde em uma plataforma
            feita para empresas prestadoras de serviço.
          </p>

          <div className="frost mt-10 rounded-2xl p-5">
            <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Fluxo controlado pela plataforma
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {FLUXO.map((etapa, i) => (
                <span key={etapa} className="flex items-center gap-2">
                  <span className="rounded-lg bg-brand-soft px-2.5 py-1 text-[12px] font-semibold text-brand-ink">
                    {etapa}
                  </span>
                  {i < FLUXO.length - 1 ? <span className="text-muted-foreground">→</span> : null}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-5 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-brand" /> Isolamento real entre empresas
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-brand" /> Permissões aplicadas também no servidor
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
