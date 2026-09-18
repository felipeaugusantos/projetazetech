import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useProjetos, useTarefas } from "@/lib/dados";
import { PROJETO_STATUS, fmtHoras, fmtMoeda } from "@/lib/enzova";
import { Indicador, Painel, Pill, Progresso, TituloPagina, Vazio } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro · Projeta" },
      { name: "description", content: "Orçamento, custo previsto e margem estimada por projeto." },
      { property: "og:title", content: "Financeiro" },
      { property: "og:description", content: "Orçamento, custo previsto e margem estimada por projeto." },
    ],
  }),
  component: Financeiro,
});

function Financeiro() {
  const { can } = useAuth();
  const { data: projetos = [] } = useProjetos();
  const { data: tarefas = [] } = useTarefas();

  const linhas = useMemo(
    () =>
      projetos.map((p) => {
        const orcamento = Number(p.orcamento ?? 0);
        const custo = Number(p.custo_previsto ?? 0);
        const horas = tarefas
          .filter((t) => t.projeto_id === p.id)
          .reduce((acc, t) => acc + Number(t.horas_realizadas ?? 0), 0);
        return {
          ...p,
          orcamentoNum: orcamento,
          custoNum: custo,
          margem: orcamento - custo,
          margemPct: orcamento ? Math.round(((orcamento - custo) / orcamento) * 100) : 0,
          horas,
        };
      }),
    [projetos, tarefas],
  );

  const totalOrcamento = linhas.reduce((a, l) => a + l.orcamentoNum, 0);
  const totalCusto = linhas.reduce((a, l) => a + l.custoNum, 0);

  if (!can("financeiro.ver")) {
    return (
      <>
        <TituloPagina titulo="Financeiro" />
        <Painel>
          <Vazio
            titulo="Acesso restrito"
            descricao="Seu perfil de acesso não inclui a permissão para visualizar informações financeiras."
          />
        </Painel>
      </>
    );
  }

  return (
    <>
      <TituloPagina
        sobretitulo={<>{linhas.length} projetos na visão financeira</>}
        titulo="Financeiro"
        descricao="Contratos, faturas, recebimentos e conciliação bancária entram na Fase 3."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Orçamento total" valor={fmtMoeda(totalOrcamento)} detalhe="soma dos projetos" />
        <Indicador titulo="Custo previsto" valor={fmtMoeda(totalCusto)} detalhe="mão de obra e insumos" />
        <Indicador
          titulo="Margem estimada"
          valor={fmtMoeda(totalOrcamento - totalCusto)}
          detalhe={`${totalOrcamento ? Math.round(((totalOrcamento - totalCusto) / totalOrcamento) * 100) : 0}% de margem`}
          tom={totalOrcamento - totalCusto > 0 ? "positivo" : "negativo"}
        />
        <Indicador
          titulo="Ticket médio"
          valor={fmtMoeda(linhas.length ? totalOrcamento / linhas.length : 0)}
          detalhe="por projeto"
        />
      </div>

      <Painel padded={false} className="py-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-left">
            <thead>
              <tr className="text-[10px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2 font-medium">Projeto</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Orçamento</th>
                <th className="px-3 py-2 text-right font-medium">Custo previsto</th>
                <th className="px-3 py-2 text-right font-medium">Margem</th>
                <th className="px-3 py-2 text-right font-medium">Horas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {linhas.map((l) => (
                <tr key={l.id} className="text-[12px]">
                  <td className="px-4 py-2.5 font-medium">
                    <Link to="/projetos/$projetoId" params={{ projetoId: l.id }} className="hover:text-brand">
                      {l.nome}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{l.clientes?.nome ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <Pill className={PROJETO_STATUS[l.status].pill}>{PROJETO_STATUS[l.status].label}</Pill>
                  </td>
                  <td className="px-3 py-2.5 text-right">{fmtMoeda(l.orcamentoNum)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{fmtMoeda(l.custoNum)}</td>
                  <td className={`px-3 py-2.5 text-right font-semibold ${l.margem >= 0 ? "text-success" : "text-danger"}`}>
                    {fmtMoeda(l.margem)} <span className="text-[10px] font-normal text-muted-foreground">({l.margemPct}%)</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{fmtHoras(l.horas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {linhas.length === 0 ? <Vazio titulo="Nenhum projeto cadastrado" /> : null}
        </div>
      </Painel>

      <Painel className="mt-4">
        <h2 className="font-display text-[15px] font-bold">Distribuição do orçamento</h2>
        <div className="mt-4 space-y-3">
          {linhas
            .slice()
            .sort((a, b) => b.orcamentoNum - a.orcamentoNum)
            .map((l) => (
              <div key={l.id}>
                <div className="flex justify-between text-[12px]">
                  <span className="truncate font-medium">{l.nome}</span>
                  <span className="text-muted-foreground">{fmtMoeda(l.orcamentoNum)}</span>
                </div>
                <Progresso valor={totalOrcamento ? (l.orcamentoNum / totalOrcamento) * 100 : 0} className="mt-1.5 h-1.5" />
              </div>
            ))}
        </div>
      </Painel>
    </>
  );
}
