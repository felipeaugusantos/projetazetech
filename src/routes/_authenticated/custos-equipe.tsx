import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { Download } from "lucide-react";

import { Avatar, BotaoSecundario, Indicador, Painel, Pill, Progresso, TituloPagina, Vazio, inputClasses } from "@/components/kit";
import { useAuth } from "@/lib/auth";
import { useApontamentos, useDocumentosStatus, useEquipe, useProjetos } from "@/lib/dados";
import { fmtHoras, fmtMoeda } from "@/lib/enzova";

export const Route = createFileRoute("/_authenticated/custos-equipe")({
  head: () => ({
    meta: [
      { title: "Custos por equipe · Projeta" },
      {
        name: "description",
        content: "Painel interno de horas apontadas e custo de mão de obra por pessoa da equipe.",
      },
      { property: "og:title", content: "Custos por equipe" },
      { property: "og:description", content: "Horas e custo por pessoa para acompanhar o desempenho da equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustosPorEquipe,
});

type LinhaPessoa = {
  id: string;
  nome: string;
  cargo: string | null;
  custoHora: number;
  horas: number;
  horasAprovadas: number;
  horasFaturaveis: number;
  custo: number;
  capacidade: number;
  lancamentos: number;
};

const PERIODOS = [
  { valor: "30", label: "Últimos 30 dias" },
  { valor: "90", label: "Últimos 90 dias" },
  { valor: "365", label: "Últimos 12 meses" },
  { valor: "tudo", label: "Todo o período" },
] as const;

function celulaCsv(valor: string | number | null) {
  const texto = valor === null ? "" : String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function CustosPorEquipe() {
  const { can } = useAuth();
  const [periodo, setPeriodo] = useState<string>("90");
  const [projeto, setProjeto] = useState("");
  const [somenteAprovadas, setSomenteAprovadas] = useState(true);

  const desde = useMemo(() => {
    if (periodo === "tudo") return undefined;
    const d = new Date();
    d.setDate(d.getDate() - Number(periodo));
    return d.toISOString().slice(0, 10);
  }, [periodo]);

  const { data: apontamentos = [], isLoading } = useApontamentos(desde ? { desde } : undefined);
  const { data: equipe = [] } = useEquipe();
  const { data: projetos = [] } = useProjetos();
  const { data: documentos = [] } = useDocumentosStatus();

  const dadosDocumentos = useMemo(() => {
    return projetos
      .filter((p) => !projeto || p.id === projeto)
      .map((p) => {
        const doProjeto = documentos.filter((d) => d.projeto_id === p.id);
        return {
          nome: p.codigo,
          projeto: p.nome,
          Aprovados: doProjeto.filter((d) => d.aprovacao_status === "aprovado").length,
          Pendentes: doProjeto.filter((d) => d.aprovacao_status === "pendente").length,
        };
      })
      .filter((d) => d.Aprovados > 0 || d.Pendentes > 0)
      .slice(0, 14);
  }, [documentos, projetos, projeto]);

  const podeVerCusto = can("financeiro.ver");

  const linhas = useMemo<LinhaPessoa[]>(() => {
    const filtrados = apontamentos.filter(
      (a) => (!projeto || a.projeto_id === projeto) && (!somenteAprovadas || a.status === "aprovado"),
    );

    const mapa = new Map<string, LinhaPessoa>();
    for (const m of equipe) {
      mapa.set(m.id, {
        id: m.id,
        nome: m.nome,
        cargo: m.cargo ?? null,
        custoHora: Number(m.custo_hora ?? 0),
        horas: 0,
        horasAprovadas: 0,
        horasFaturaveis: 0,
        custo: 0,
        capacidade: Number(m.capacidade_semanal ?? 40),
        lancamentos: 0,
      });
    }

    for (const a of filtrados) {
      const pessoa = mapa.get(a.profile_id);
      if (!pessoa) continue;
      const horas = Number(a.horas ?? 0);
      pessoa.horas += horas;
      pessoa.lancamentos += 1;
      if (a.status === "aprovado") pessoa.horasAprovadas += horas;
      if (a.faturavel) pessoa.horasFaturaveis += horas;
      pessoa.custo += horas * (pessoa.custoHora || Number(a.profiles?.custo_hora ?? 0));
    }

    return Array.from(mapa.values())
      .filter((p) => p.horas > 0)
      .sort((a, b) => b.horas - a.horas);
  }, [apontamentos, equipe, projeto, somenteAprovadas]);

  const totalHoras = linhas.reduce((s, l) => s + l.horas, 0);
  const totalCusto = linhas.reduce((s, l) => s + l.custo, 0);
  const totalFaturaveis = linhas.reduce((s, l) => s + l.horasFaturaveis, 0);
  const pctFaturavel = totalHoras ? Math.round((totalFaturaveis / totalHoras) * 100) : 0;
  const custoMedio = totalHoras ? totalCusto / totalHoras : 0;

  const dadosGrafico = linhas.slice(0, 14).map((l) => ({
    nome: l.nome.split(" ")[0] ?? l.nome,
    pessoa: l.nome,
    Horas: Math.round(l.horas * 10) / 10,
    "Horas faturáveis": Math.round(l.horasFaturaveis * 10) / 10,
    Custo: Math.round(l.custo),
  }));

  function exportar() {
    const cabecalho = [
      "Pessoa",
      "Cargo",
      "Horas apontadas",
      "Horas aprovadas",
      "Horas faturáveis",
      "Custo/hora",
      "Custo total",
      "Lançamentos",
    ];
    const linhasCsv = linhas.map((l) => [
      l.nome,
      l.cargo ?? "",
      l.horas.toFixed(2).replace(".", ","),
      l.horasAprovadas.toFixed(2).replace(".", ","),
      l.horasFaturaveis.toFixed(2).replace(".", ","),
      l.custoHora.toFixed(2).replace(".", ","),
      l.custo.toFixed(2).replace(".", ","),
      l.lancamentos,
    ]);
    const csv = `\ufeff${[cabecalho, ...linhasCsv].map((l) => l.map(celulaCsv).join(";")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `custos-por-equipe-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!podeVerCusto) {
    return (
      <>
        <TituloPagina titulo="Custos por equipe" />
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
    <div className="space-y-5">
      <TituloPagina
        titulo="Custos por equipe"
        descricao="Horas apontadas e custo de mão de obra por pessoa. Uso interno, nada disso aparece no portal do cliente."
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={`${inputClasses} w-auto`}>
              {PERIODOS.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.label}
                </option>
              ))}
            </select>
            <select value={projeto} onChange={(e) => setProjeto(e.target.value)} className={`${inputClasses} w-auto`}>
              <option value="">Todos os projetos</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nome}
                </option>
              ))}
            </select>
            <BotaoSecundario onClick={() => setSomenteAprovadas((v) => !v)}>
              {somenteAprovadas ? "Só horas aprovadas" : "Todas as horas"}
            </BotaoSecundario>
            <BotaoSecundario onClick={exportar} disabled={linhas.length === 0}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </BotaoSecundario>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Horas apontadas" valor={fmtHoras(totalHoras)} detalhe={`${linhas.length} pessoa(s)`} />
        <Indicador titulo="Custo de mão de obra" valor={fmtMoeda(totalCusto)} detalhe="Horas x custo/hora" />
        <Indicador titulo="Custo médio por hora" valor={fmtMoeda(custoMedio)} detalhe="Média ponderada da equipe" />
        <Indicador
          titulo="Horas faturáveis"
          valor={`${pctFaturavel}%`}
          progresso={pctFaturavel}
          tom={pctFaturavel >= 70 ? "positivo" : pctFaturavel >= 50 ? "atencao" : "negativo"}
          detalhe={`${fmtHoras(totalFaturaveis)} de ${fmtHoras(totalHoras)}`}
        />
      </div>

      {isLoading ? (
        <Painel className="p-6">
          <p className="text-sm text-muted-foreground">Carregando apontamentos...</p>
        </Painel>
      ) : linhas.length === 0 ? (
        <Vazio
          titulo="Nenhuma hora apontada no período"
          descricao="Ajuste o período ou inclua as horas que ainda não foram aprovadas."
        />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Painel className="p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Horas por pessoa</h3>
              <p className="text-xs text-muted-foreground">Total apontado e a parte faturável de cada pessoa.</p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} height={50} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} width={60} />
                    <Tooltip
                      formatter={(v: number) => fmtHoras(v)}
                      labelFormatter={(l) => dadosGrafico.find((d) => d.nome === l)?.pessoa ?? String(l)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Horas" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Horas faturáveis" fill="var(--neon)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>

            <Painel className="p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Custo por pessoa</h3>
              <p className="text-xs text-muted-foreground">Horas apontadas multiplicadas pelo custo/hora cadastrado.</p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGrafico} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmtMoeda(v)} />
                    <YAxis type="category" dataKey="nome" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number) => fmtMoeda(v)}
                      labelFormatter={(l) => dadosGrafico.find((d) => d.nome === l)?.pessoa ?? String(l)}
                    />
                    <Bar dataKey="Custo" fill="var(--primary)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>
          </div>

          <Painel className="overflow-hidden" padded={false}>
            <div className="scroll-slim overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Pessoa</th>
                    <th className="px-4 py-3 text-right">Horas</th>
                    <th className="px-4 py-3 text-right">Aprovadas</th>
                    <th className="px-4 py-3">Faturáveis</th>
                    <th className="px-4 py-3 text-right">Custo/hora</th>
                    <th className="px-4 py-3 text-right">Custo total</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => {
                    const pctFat = l.horas ? Math.round((l.horasFaturaveis / l.horas) * 100) : 0;
                    return (
                      <tr key={l.id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar nome={l.nome} />
                            <div>
                              <div className="font-medium text-foreground">{l.nome}</div>
                              <div className="text-xs text-muted-foreground">
                                {l.cargo ?? "—"} · {l.lancamentos} lançamento(s)
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{fmtHoras(l.horas)}</td>
                        <td className="px-4 py-3 text-right">{fmtHoras(l.horasAprovadas)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progresso valor={pctFat} className="w-20" />
                            <span className="text-xs text-muted-foreground">{pctFat}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {l.custoHora ? (
                            fmtMoeda(l.custoHora)
                          ) : (
                            <Pill className="bg-secondary text-muted-foreground">sem custo/hora</Pill>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{fmtMoeda(l.custo)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Painel>
        </>
      )}
    </div>
  );
}
