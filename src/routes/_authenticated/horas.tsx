import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEquipe, useProjetos, useTarefas } from "@/lib/dados";
import { fmtHoras } from "@/lib/enzova";
import { Avatar, Indicador, Painel, Progresso, TituloPagina, Vazio } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/horas")({
  head: () => ({
    meta: [
      { title: "Horas · Projeta" },
      { name: "description", content: "Horas estimadas e realizadas por projeto e por pessoa." },
      { property: "og:title", content: "Horas" },
      { property: "og:description", content: "Horas estimadas e realizadas por projeto e por pessoa." },
    ],
  }),
  component: Horas,
});

function Horas() {
  const { can } = useAuth();
  const { data: tarefas = [] } = useTarefas();
  const { data: projetos = [] } = useProjetos();
  const { data: equipe = [] } = useEquipe();

  const totais = useMemo(() => {
    const estimadas = tarefas.reduce((acc, t) => acc + Number(t.horas_estimadas ?? 0), 0);
    const realizadas = tarefas.reduce((acc, t) => acc + Number(t.horas_realizadas ?? 0), 0);
    return { estimadas, realizadas };
  }, [tarefas]);

  const porProjeto = useMemo(
    () =>
      projetos
        .map((p) => {
          const doProjeto = tarefas.filter((t) => t.projeto_id === p.id);
          return {
            id: p.id,
            nome: p.nome,
            previstas: Number(p.horas_previstas ?? 0),
            realizadas: doProjeto.reduce((acc, t) => acc + Number(t.horas_realizadas ?? 0), 0),
          };
        })
        .sort((a, b) => b.realizadas - a.realizadas),
    [projetos, tarefas],
  );

  const porPessoa = useMemo(
    () =>
      equipe
        .map((m) => {
          const suas = tarefas.filter((t) => t.responsavel_id === m.id);
          return {
            id: m.id,
            nome: m.nome,
            realizadas: suas.reduce((acc, t) => acc + Number(t.horas_realizadas ?? 0), 0),
            estimadas: suas.reduce((acc, t) => acc + Number(t.horas_estimadas ?? 0), 0),
            custo: Number(m.custo_hora ?? 0),
          };
        })
        .sort((a, b) => b.realizadas - a.realizadas),
    [equipe, tarefas],
  );

  const maxProjeto = Math.max(1, ...porProjeto.map((p) => Math.max(p.previstas, p.realizadas)));

  return (
    <>
      <TituloPagina
        sobretitulo={<>Consolidado das horas registradas nas tarefas</>}
        titulo="Horas"
        descricao="O apontamento diário com timer, aprovação de timesheet e horas faturáveis entra na Fase 2."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Horas estimadas" valor={fmtHoras(totais.estimadas)} detalhe="em todas as tarefas" />
        <Indicador
          titulo="Horas realizadas"
          valor={fmtHoras(totais.realizadas)}
          detalhe={`${totais.estimadas ? Math.round((totais.realizadas / totais.estimadas) * 100) : 0}% do estimado`}
          progresso={totais.estimadas ? (totais.realizadas / totais.estimadas) * 100 : 0}
        />
        <Indicador
          titulo="Saldo"
          valor={fmtHoras(Math.max(0, totais.estimadas - totais.realizadas))}
          detalhe="horas estimadas restantes"
          tom={totais.realizadas > totais.estimadas ? "negativo" : "neutro"}
        />
        <Indicador titulo="Projetos com horas" valor={porProjeto.filter((p) => p.realizadas > 0).length} detalhe={`de ${projetos.length}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel>
          <h2 className="font-display text-[15px] font-bold">Horas por projeto</h2>
          <div className="mt-4 space-y-3.5">
            {porProjeto.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between text-[12px]">
                  <span className="truncate font-medium">{p.nome}</span>
                  <span className="text-muted-foreground">
                    {fmtHoras(p.realizadas)} / {fmtHoras(p.previstas)}
                  </span>
                </div>
                <Progresso valor={(p.realizadas / maxProjeto) * 100} className="mt-1.5 h-1.5" />
              </div>
            ))}
            {porProjeto.length === 0 ? <Vazio titulo="Nenhum projeto com horas" /> : null}
          </div>
        </Painel>

        <Painel>
          <h2 className="font-display text-[15px] font-bold">Horas por pessoa</h2>
          <div className="mt-4 space-y-2.5">
            {porPessoa.map((m) => (
              <div key={m.id} className="frost-soft flex items-center gap-3 rounded-xl px-3 py-2.5">
                <Avatar nome={m.nome} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{m.nome}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {fmtHoras(m.realizadas)} realizadas · {fmtHoras(m.estimadas)} estimadas
                  </div>
                </div>
                {can("financeiro.ver") ? (
                  <span className="text-[12px] font-semibold">
                    {(m.realizadas * m.custo).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      maximumFractionDigits: 0,
                    })}
                  </span>
                ) : null}
              </div>
            ))}
            {porPessoa.length === 0 ? <Vazio titulo="Nenhuma pessoa cadastrada" /> : null}
          </div>
        </Painel>
      </div>
    </>
  );
}
