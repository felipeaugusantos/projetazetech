import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { addDays, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useProjetos, useTarefas, type Tarefa } from "@/lib/dados";
import { PRIORIDADES, estaAtrasada, fmtData } from "@/lib/enzova";
import { Painel, Pill, TituloPagina, Vazio, BotaoSecundario } from "@/components/kit";
import { TarefaDrawer } from "@/components/tarefa-drawer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário · Enzova Projects" },
      { name: "description", content: "Prazos de tarefas e projetos distribuídos no mês." },
      { property: "og:title", content: "Calendário" },
      { property: "og:description", content: "Prazos de tarefas e projetos distribuídos no mês." },
    ],
  }),
  component: Calendario,
});

function Calendario() {
  const { data: tarefas = [] } = useTarefas();
  const { data: projetos = [] } = useProjetos();
  const [mes, setMes] = useState(startOfMonth(new Date()));
  const [selecionada, setSelecionada] = useState<Tarefa | null>(null);

  const nomesProjetos = useMemo(() => new Map(projetos.map((p) => [p.id, p.nome])), [projetos]);

  const dias = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mes), { weekStartsOn: 0 });
    const fim = endOfMonth(mes);
    const total = Math.ceil((fim.getTime() - inicio.getTime()) / 86400000) + 1;
    return Array.from({ length: Math.ceil(total / 7) * 7 }, (_, i) => addDays(inicio, i));
  }, [mes]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, Tarefa[]>();
    for (const t of tarefas) {
      if (!t.prazo) continue;
      const chave = t.prazo.slice(0, 10);
      mapa.set(chave, [...(mapa.get(chave) ?? []), t]);
    }
    return mapa;
  }, [tarefas]);

  return (
    <>
      <TituloPagina
        sobretitulo={<>{tarefas.filter((t) => t.prazo).length} tarefas com prazo definido</>}
        titulo="Calendário"
        descricao="Visão mensal dos prazos. Agenda de reuniões e sincronização externa chegam nas próximas fases."
        acoes={
          <div className="flex items-center gap-2">
            <BotaoSecundario onClick={() => setMes(addMonths(mes, -1))}>
              <ChevronLeft className="size-4" />
            </BotaoSecundario>
            <span className="min-w-40 text-center text-[13px] font-semibold capitalize">
              {format(mes, "MMMM yyyy", { locale: ptBR })}
            </span>
            <BotaoSecundario onClick={() => setMes(addMonths(mes, 1))}>
              <ChevronRight className="size-4" />
            </BotaoSecundario>
          </div>
        }
      />

      <Painel>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {dias.map((dia) => {
            const doDia = porDia.get(format(dia, "yyyy-MM-dd")) ?? [];
            const hoje = isSameDay(dia, new Date());
            return (
              <div
                key={dia.toISOString()}
                className={cn(
                  "min-h-24 rounded-xl p-2 text-left",
                  isSameMonth(dia, mes) ? "bg-secondary/50" : "bg-secondary/20 opacity-60",
                  hoje && "ring-2 ring-brand/40",
                )}
              >
                <div className={cn("text-[11px] font-semibold", hoje ? "text-brand" : "text-muted-foreground")}>
                  {format(dia, "d")}
                </div>
                <div className="mt-1 space-y-1">
                  {doDia.slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelecionada(t)}
                      className={cn(
                        "block w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-medium",
                        estaAtrasada(t.prazo, t.status) ? "bg-danger-soft text-danger" : "bg-card text-foreground",
                      )}
                      title={t.titulo}
                    >
                      {t.titulo}
                    </button>
                  ))}
                  {doDia.length > 3 ? (
                    <div className="text-[10px] text-muted-foreground">+{doDia.length - 3} tarefas</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Painel>

      <Painel className="mt-4">
        <h2 className="font-display text-[15px] font-bold">Marcos dos projetos</h2>
        <div className="mt-3 space-y-2">
          {projetos
            .filter((p) => p.prazo)
            .sort((a, b) => (a.prazo ?? "").localeCompare(b.prazo ?? ""))
            .map((p) => (
              <div key={p.id} className="frost-soft flex flex-wrap items-center justify-between gap-2 rounded-xl px-3.5 py-2.5">
                <span className="text-[13px] font-medium">{p.nome}</span>
                <div className="flex items-center gap-2">
                  <Pill className={PRIORIDADES[p.prioridade].pill}>{PRIORIDADES[p.prioridade].label}</Pill>
                  <span className="text-[12px] text-muted-foreground">{fmtData(p.prazo, "dd MMM yyyy")}</span>
                </div>
              </div>
            ))}
          {projetos.filter((p) => p.prazo).length === 0 ? <Vazio titulo="Nenhum prazo de projeto cadastrado" /> : null}
        </div>
      </Painel>

      {selecionada ? (
        <TarefaDrawer
          tarefa={selecionada}
          nomeProjeto={nomesProjetos.get(selecionada.projeto_id)}
          onFechar={() => setSelecionada(null)}
        />
      ) : null}
    </>
  );
}
