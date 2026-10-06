import { Fragment, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, ChevronRight, Download } from "lucide-react";

import {
  BotaoSecundario,
  Indicador,
  Painel,
  TituloPagina,
  Vazio,
  inputClasses,
} from "@/components/kit";
import { useClientes, useProjetos } from "@/lib/dados";
import { fmtData, fmtHoras } from "@/lib/enzova";
import {
  FILTRO_STATUS_HORAS,
  agruparHoras,
  dadosGrafico,
  gerarCsvHoras,
  limitesDoPeriodo,
  semanasDoPeriodo,
  useHorasPeriodo,
  type FiltroStatusHoras,
} from "@/lib/horas-projetos";

export const Route = createFileRoute("/_authenticated/horas-projetos")({
  head: () => ({
    meta: [
      { title: "Horas por projeto · Projeta" },
      {
        name: "description",
        content: "Relatório interno do tempo investido por cliente e projeto, semana a semana.",
      },
      { property: "og:title", content: "Horas por projeto" },
      { property: "og:description", content: "Tempo investido por cliente e projeto, por semana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HorasPorProjeto,
});

/** Categóricas na ordem fixa (validadas); "Outros" em cinza neutro. */
const CORES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
const COR_OUTROS = "#8b8a84";

const PERIODOS = [4, 8, 12, 26] as const;

function HorasPorProjeto() {
  const [qtdSemanas, setQtdSemanas] = useState<number>(8);
  const [filtro, setFiltro] = useState<FiltroStatusHoras>("aprovado_enviado");
  const [clienteId, setClienteId] = useState("");
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set());

  const semanas = useMemo(() => semanasDoPeriodo(qtdSemanas), [qtdSemanas]);
  const { desde, ate } = useMemo(() => limitesDoPeriodo(semanas), [semanas]);

  const { data: apontamentos = [], isLoading, isError } = useHorasPeriodo(desde, ate);
  const { data: projetos = [] } = useProjetos();
  const { data: clientes = [] } = useClientes();

  const resultado = useMemo(
    () =>
      agruparHoras({
        apontamentos,
        projetos,
        clientes,
        semanas,
        status: FILTRO_STATUS_HORAS[filtro].status,
        ...(clienteId ? { clienteId } : {}),
      }),
    [apontamentos, projetos, clientes, semanas, filtro, clienteId],
  );

  const grafico = useMemo(() => dadosGrafico(resultado, CORES.length), [resultado]);
  const maiorCelula = Math.max(
    0,
    ...resultado.clientes.flatMap((c) => c.projetos.flatMap((p) => p.porSemana)),
  );
  const maiorCliente = resultado.clientes[0];
  const mediaSemanal = semanas.length ? resultado.total / semanas.length : 0;
  const pctFaturavel = resultado.total
    ? Math.round((resultado.faturavel / resultado.total) * 100)
    : 0;
  const totalProjetos = resultado.clientes.reduce((s, c) => s + c.projetos.length, 0);

  function alternar(id: string) {
    setRecolhidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function exportar() {
    const url = URL.createObjectURL(
      new Blob([gerarCsvHoras(resultado)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `horas-por-projeto-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rotuloSemana = (s: string) => fmtData(s, "dd/MM");
  const corDaSerie = (nome: string, i: number) =>
    nome === "Outros" ? COR_OUTROS : (CORES[i] ?? COR_OUTROS);

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Horas por projeto"
        descricao="Tempo investido em cada cliente e projeto, semana a semana (semanas de segunda a domingo). Uso interno."
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Cliente"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className={inputClasses}
              style={{ width: "auto" }}
            >
              <option value="">Todos os clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_fantasia ?? c.nome}
                </option>
              ))}
            </select>
            <select
              aria-label="Período"
              value={qtdSemanas}
              onChange={(e) => setQtdSemanas(Number(e.target.value))}
              className={inputClasses}
              style={{ width: "auto" }}
            >
              {PERIODOS.map((n) => (
                <option key={n} value={n}>
                  Últimas {n} semanas
                </option>
              ))}
            </select>
            <select
              aria-label="Situação das horas"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as FiltroStatusHoras)}
              className={inputClasses}
              style={{ width: "auto" }}
            >
              {(Object.keys(FILTRO_STATUS_HORAS) as FiltroStatusHoras[]).map((k) => (
                <option key={k} value={k}>
                  {FILTRO_STATUS_HORAS[k].rotulo}
                </option>
              ))}
            </select>
            <BotaoSecundario onClick={exportar} disabled={resultado.clientes.length === 0}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </BotaoSecundario>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          titulo="Horas no período"
          valor={fmtHoras(resultado.total)}
          detalhe={`${resultado.clientes.length} cliente(s) · ${totalProjetos} projeto(s)`}
        />
        <Indicador
          titulo="Média por semana"
          valor={fmtHoras(mediaSemanal)}
          detalhe={`${semanas.length} semanas`}
        />
        <Indicador
          titulo="Horas faturáveis"
          valor={fmtHoras(resultado.faturavel)}
          tom={pctFaturavel >= 70 ? "positivo" : "neutro"}
          detalhe={`${pctFaturavel}% do total`}
        />
        <Indicador
          titulo="Cliente com mais horas"
          valor={<span className="text-[20px]">{maiorCliente?.nome ?? "—"}</span>}
          detalhe={
            maiorCliente ? `${fmtHoras(maiorCliente.total)} no período` : "Sem horas no período"
          }
        />
      </div>

      {isError ? (
        <Painel>
          <Vazio
            titulo="Não foi possível carregar as horas"
            descricao="Tente novamente em instantes."
          />
        </Painel>
      ) : isLoading ? (
        <Painel>
          <div className="py-10 text-center text-[13px] text-muted-foreground">
            Carregando horas…
          </div>
        </Painel>
      ) : resultado.clientes.length === 0 ? (
        <Painel>
          <Vazio
            titulo="Nenhuma hora no período"
            descricao="Ajuste o período, o cliente ou a situação das horas. Rascunhos só aparecem em “Todas”."
          />
        </Painel>
      ) : (
        <>
          <Painel>
            <h2 className="font-display text-[15px] font-bold">Horas por semana e cliente</h2>
            <p className="mb-3 text-[12px] text-muted-foreground">
              Os {CORES.length} clientes com mais horas; os demais ficam em “Outros”. Valores exatos
              na tabela abaixo.
            </p>
            <div
              className="h-72"
              role="img"
              aria-label="Gráfico de barras empilhadas de horas por semana e cliente"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grafico.linhas} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="semana" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={36} unit="h" />
                  <Tooltip
                    formatter={(v) => fmtHoras(Number(v))}
                    labelFormatter={(l) => `Semana de ${l}`}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(valor) => (
                      <span style={{ color: "var(--foreground)" }}>{valor}</span>
                    )}
                  />
                  {grafico.series.map((nome, i) => (
                    <Bar
                      key={nome}
                      dataKey={nome}
                      stackId="horas"
                      isAnimationActive={false}
                      fill={corDaSerie(nome, i)}
                      stroke="var(--card)"
                      strokeWidth={2}
                      radius={i === grafico.series.length - 1 ? [4, 4, 0, 0] : 0}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Painel>

          <Painel className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[12px]">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="sticky left-0 z-10 bg-card px-4 py-3 font-medium">
                      Cliente / projeto
                    </th>
                    {resultado.semanas.map((s) => (
                      <th
                        key={s}
                        className="px-2 py-3 text-right font-medium"
                        title={`Semana de ${fmtData(s, "dd/MM/yyyy")}`}
                      >
                        {rotuloSemana(s)}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Faturável</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.clientes.map((c) => {
                    const aberto = !recolhidos.has(c.id);
                    return (
                      <Fragment key={c.id}>
                        <tr className="bg-secondary/60 font-semibold">
                          <td className="sticky left-0 z-10 bg-secondary px-4 py-2.5">
                            <button
                              type="button"
                              onClick={() => alternar(c.id)}
                              aria-expanded={aberto}
                              className="inline-flex items-center gap-1.5 text-left"
                            >
                              {aberto ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              {c.nome}
                              <span className="font-normal text-muted-foreground">
                                · {c.projetos.length} projeto(s)
                              </span>
                            </button>
                          </td>
                          {c.porSemana.map((h, i) => (
                            <td key={i} className="px-2 py-2.5 text-right tabular-nums">
                              {h > 0 ? (
                                fmtHoras(h)
                              ) : (
                                <span className="text-muted-foreground">–</span>
                              )}
                            </td>
                          ))}
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {fmtHoras(c.total)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {fmtHoras(c.faturavel)}
                          </td>
                        </tr>
                        {aberto
                          ? c.projetos.map((p) => (
                              <tr key={p.projeto_id} className="border-t border-border/60">
                                <td className="sticky left-0 z-10 bg-card px-4 py-2 pl-9">
                                  <Link
                                    to="/projetos/$projetoId"
                                    params={{ projetoId: p.projeto_id }}
                                    className="hover:text-brand hover:underline"
                                  >
                                    <span className="text-muted-foreground">{p.codigo}</span>{" "}
                                    {p.nome}
                                  </Link>
                                </td>
                                {p.porSemana.map((h, i) => (
                                  <td
                                    key={i}
                                    className="px-2 py-2 text-right tabular-nums"
                                    style={
                                      h > 0 && maiorCelula > 0
                                        ? {
                                            backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round(8 + (h / maiorCelula) * 30)}%, transparent)`,
                                          }
                                        : undefined
                                    }
                                  >
                                    {h > 0 ? (
                                      fmtHoras(h)
                                    ) : (
                                      <span className="text-muted-foreground">–</span>
                                    )}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {fmtHoras(p.total)}
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums">
                                  {fmtHoras(p.faturavel)}
                                </td>
                              </tr>
                            ))
                          : null}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="sticky left-0 z-10 border-t border-border bg-card px-4 py-3">
                      Total
                    </td>
                    {resultado.porSemana.map((h, i) => (
                      <td
                        key={i}
                        className="border-t border-border px-2 py-3 text-right tabular-nums"
                      >
                        {h > 0 ? fmtHoras(h) : "–"}
                      </td>
                    ))}
                    <td className="border-t border-border px-3 py-3 text-right tabular-nums">
                      {fmtHoras(resultado.total)}
                    </td>
                    <td className="border-t border-border px-4 py-3 text-right tabular-nums">
                      {fmtHoras(resultado.faturavel)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Painel>
        </>
      )}
    </div>
  );
}
