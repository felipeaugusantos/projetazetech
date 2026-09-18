import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProjetos, useTarefas, type Tarefa } from "@/lib/dados";
import {
  PROJETO_STATUS,
  PRIORIDADES,
  SAUDE,
  calcularSaude,
  estaAtrasada,
  fmtData,
  fmtDataLonga,
  fmtHoras,
} from "@/lib/enzova";
import { Indicador, Painel, Pill, Progresso, TituloPagina, Vazio } from "@/components/kit";
import { TarefaDrawer } from "@/components/tarefa-drawer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/meu-trabalho")({
  head: () => ({
    meta: [
      { title: "Meu Trabalho · Projeta" },
      { name: "description", content: "Suas tarefas de hoje, atrasos, projetos e notificações em uma única tela." },
      { property: "og:title", content: "Meu Trabalho" },
      { property: "og:description", content: "Painel individual de tarefas e prazos." },
    ],
  }),
  component: MeuTrabalho,
});

function MeuTrabalho() {
  const { perfil, tenant } = useAuth();
  const { data: tarefas = [] } = useTarefas();
  const { data: projetos = [] } = useProjetos();
  const [selecionada, setSelecionada] = useState<Tarefa | null>(null);

  const minhas = useMemo(() => tarefas.filter((t) => t.responsavel_id === perfil?.id), [tarefas, perfil]);
  const hoje = new Date().toISOString().slice(0, 10);

  const abertas = minhas.filter((t) => !["concluida", "cancelada"].includes(t.status));
  const deHoje = abertas.filter((t) => t.prazo === hoje);
  const atrasadas = abertas.filter((t) => estaAtrasada(t.prazo, t.status));
  const proximas = abertas
    .slice()
    .sort((a, b) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"))
    .slice(0, 8);
  const horasRealizadas = minhas.reduce((a, t) => a + Number(t.horas_realizadas ?? 0), 0);
  const capacidade = Number(perfil?.capacidade_semanal ?? 40);

  const meusProjetos = useMemo(() => {
    const ids = new Set(minhas.map((t) => t.projeto_id));
    return projetos.filter((p) => ids.has(p.id));
  }, [minhas, projetos]);

  const { data: notificacoes = [] } = useQuery({
    queryKey: ["notificacoes", perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("id, titulo, mensagem, tipo, created_at, lida")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: checklist = [] } = useQuery({
    queryKey: ["meu-checklist", perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklists")
        .select("id, titulo, tarefa_id, checklist_itens(id, descricao, concluido, ordem)")
        .limit(1);
      if (error) throw error;
      return data ?? [];
    },
  });
  const primeiroChecklist = checklist[0];
  const itens = (primeiroChecklist?.checklist_itens ?? []).slice().sort((a, b) => a.ordem - b.ordem);
  const feitos = itens.filter((i) => i.concluido).length;

  const horasPorProjeto = meusProjetos.map((p) => ({
    projeto: p.codigo,
    horas: minhas.filter((t) => t.projeto_id === p.id).reduce((a, t) => a + Number(t.horas_realizadas ?? 0), 0),
  }));
  const maxHoras = Math.max(1, ...horasPorProjeto.map((h) => h.horas));

  return (
    <>
      <TituloPagina
        sobretitulo={
          <>
            <span className="size-1.5 rounded-full bg-success" /> {tenant?.nome ?? "Workspace"}
          </>
        }
        titulo="Meu Trabalho"
        descricao={`${fmtDataLonga(hoje)} · ${meusProjetos.length} projetos ativos`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador titulo="Tarefas de hoje" valor={deHoje.length} detalhe={`${abertas.length} abertas no total`} />
        <Indicador
          titulo="Atrasadas"
          valor={atrasadas.length}
          tom={atrasadas.length ? "negativo" : "positivo"}
          detalhe={atrasadas.length ? "precisam de atenção" : "nada atrasado"}
        />
        <Indicador
          titulo="Horas realizadas"
          valor={fmtHoras(horasRealizadas)}
          detalhe={`capacidade de ${capacidade}h por semana`}
          progresso={(horasRealizadas / (capacidade * 4)) * 100}
        />
        <Indicador
          titulo="Meus projetos"
          valor={meusProjetos.length}
          detalhe={`${meusProjetos.filter((p) => p.status === "em_risco").length} em risco`}
          tom={meusProjetos.some((p) => p.status === "em_risco") ? "atencao" : "neutro"}
        />
      </div>

      <Painel className="mt-4">
        <div className="flex items-center justify-between">
          <div className="font-display text-[15px] font-semibold">Meu plano de hoje</div>
          <span className="text-[12px] font-medium text-muted-foreground">definido pela coordenação</span>
        </div>
        <div className="mt-3 space-y-2">
          {planoHoje.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Nenhuma tarefa definida para o seu dia.</p>
          ) : (
            planoHoje.map((i) => (
              <div key={i.id} className="flex items-start gap-2.5 rounded-xl border border-border/70 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => concluirPlano.mutate({ id: i.id, concluido: !i.concluido })}
                  className="mt-0.5 text-brand"
                  aria-label={i.concluido ? "Marcar como pendente" : "Marcar como concluída"}
                >
                  {i.concluido ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                </button>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-[13px] font-semibold",
                      i.concluido && "text-muted-foreground line-through",
                    )}
                  >
                    {i.titulo}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {i.projetos ? `${i.projetos.codigo} · ` : ""}
                    {Number(i.horas_previstas) > 0 ? fmtHoras(Number(i.horas_previstas)) : "sem horas previstas"}
                  </span>
                </span>
              </div>
            ))
          )}
        </div>
      </Painel>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Painel className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="font-display text-[15px] font-semibold">Próximas tarefas</div>
            <span className="text-[12px] font-medium text-muted-foreground">ordenadas por prazo</span>
          </div>
          <div className="mt-3 divide-y divide-border border-t border-border">
            {proximas.length === 0 ? (
              <Vazio titulo="Nada pendente" descricao="Você está sem tarefas abertas." />
            ) : (
              proximas.map((t) => {
                const projeto = projetos.find((p) => p.id === t.projeto_id);
                const atrasada = estaAtrasada(t.prazo, t.status);
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelecionada(t)}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    <span className="size-5 shrink-0 rounded-md border-2 border-border" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{t.titulo}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {projeto?.nome ?? "Projeto"} · {projeto?.clientes?.nome ?? "—"}
                      </span>
                    </span>
                    <Pill className={PRIORIDADES[t.prioridade].pill}>{PRIORIDADES[t.prioridade].label}</Pill>
                    <span
                      className={cn("w-16 text-right text-[11px]", atrasada ? "font-semibold text-danger" : "text-muted-foreground")}
                    >
                      {t.prazo === hoje ? "hoje" : fmtData(t.prazo)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Painel>

        <Painel>
          <div className="font-display text-[15px] font-semibold">Minhas horas por projeto</div>
          <div className="text-[11px] text-muted-foreground">horas realizadas nas minhas tarefas</div>
          <div className="mt-4 flex h-28 items-end justify-between gap-1.5">
            {horasPorProjeto.length === 0 ? (
              <div className="w-full text-center text-[12px] text-muted-foreground">Sem horas apontadas.</div>
            ) : (
              horasPorProjeto.map((h) => (
                <div key={h.projeto} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-md bg-brand"
                    style={{ height: `${Math.max(6, (h.horas / maxHoras) * 100)}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{h.projeto}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 rounded-xl bg-secondary/70 px-3 py-2 text-[11px] text-muted-foreground">
            Apontamento de horas e timesheet entram na Fase 2.
          </div>
        </Painel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Painel>
          <div className="flex items-center justify-between">
            <div className="font-display text-[15px] font-semibold">Projetos</div>
            <Link to="/projetos" className="text-[11px] font-medium text-brand">
              ver todos
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {meusProjetos.map((p) => {
              const saude = calcularSaude(p, tarefas.filter((t) => t.projeto_id === p.id));
              return (
                <Link key={p.id} to="/projetos/$projetoId" params={{ projetoId: p.id }} className="block">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold">{p.nome}</span>
                    <span className="text-muted-foreground">{saude.tarefasConcluidas}%</span>
                  </div>
                  <Progresso valor={saude.tarefasConcluidas} className="mt-1.5" />
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className={cn("size-1.5 rounded-full", PROJETO_STATUS[p.status].dot)} />
                    {PROJETO_STATUS[p.status].label} · {SAUDE[saude.nivel].label}
                  </div>
                </Link>
              );
            })}
            {meusProjetos.length === 0 ? <Vazio titulo="Nenhum projeto atribuído" /> : null}
          </div>
        </Painel>

        <Painel>
          <div className="font-display text-[15px] font-semibold">Notificações</div>
          <div className="mt-3 space-y-3">
            {notificacoes.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">Nada novo por aqui.</p>
            ) : (
              notificacoes.map((n) => (
                <div key={n.id} className="flex gap-2.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-[11px] font-bold text-brand-ink">
                    {n.tipo === "mencao" ? "@" : n.tipo === "atraso" ? "!" : "•"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] leading-snug font-medium">{n.titulo}</div>
                    <div className="text-[10px] text-muted-foreground">{fmtData(n.created_at, "dd MMM · HH:mm")}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Painel>

        <Painel>
          <div className="font-display text-[15px] font-semibold">
            Checklist {primeiroChecklist ? `— ${primeiroChecklist.titulo}` : ""}
          </div>
          <div className="mt-3 space-y-2.5">
            {itens.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">Nenhum checklist aberto.</p>
            ) : (
              itens.map((i) => (
                <div key={i.id} className="flex items-center gap-2.5">
                  {i.concluido ? (
                    <CheckSquare className="size-4 text-brand" />
                  ) : (
                    <Square className="size-4 text-muted-foreground" />
                  )}
                  <span className={cn("text-[12px]", i.concluido ? "text-muted-foreground line-through" : "font-medium")}>
                    {i.descricao}
                  </span>
                </div>
              ))
            )}
          </div>
          {itens.length ? <Progresso valor={(feitos / itens.length) * 100} className="mt-3 h-1.5" /> : null}
        </Painel>
      </div>

      {selecionada ? (
        <TarefaDrawer
          tarefa={selecionada}
          nomeProjeto={projetos.find((p) => p.id === selecionada.projeto_id)?.nome}
          onFechar={() => setSelecionada(null)}
        />
      ) : null}
    </>
  );
}
