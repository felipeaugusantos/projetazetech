import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Download, ExternalLink } from "lucide-react";

import { BotaoSecundario, Indicador, Painel, Pill, Progresso, TituloPagina, Vazio, inputClasses } from "@/components/kit";
import { useCustosReais } from "@/components/custos-reais";
import { useAuth } from "@/lib/auth";
import {
  useApontamentos,
  useClientes,
  useFasesTodas,
  useMarcos,
  useOrcamentoItens,
  useProjetos,
  useTarefas,
} from "@/lib/dados";
import { PROJETO_STATUS, fmtData, fmtHoras, fmtMoeda, isoDate, type ProjetoStatus } from "@/lib/enzova";

export const Route = createFileRoute("/_authenticated/kpis")({
  head: () => ({
    meta: [
      { title: "KPIs internos · Projeta" },
      {
        name: "description",
        content: "Painel único com prazos estourados, pendências atrasadas, custo real e horas de cada projeto.",
      },
      { property: "og:title", content: "KPIs internos" },
      { property: "og:description", content: "Acompanhe prazos, pendências, custos e horas de toda a carteira." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KpisInternos,
});

type Linha = {
  id: string;
  codigo: string;
  nome: string;
  cliente: string;
  status: ProjetoStatus;
  prazo: string | null;
  diasAtraso: number;
  prazoEstourado: boolean;
  fasesAtrasadas: number;
  entregasAtrasadas: number;
  pendenciasAtrasadas: number;
  pendenciasAbertas: number;
  horas: number;
  horasAprovadas: number;
  custoReal: number;
  orcado: number;
  consumo: number;
  progresso: number;
};

function celulaCsv(valor: string | number | null) {
  const texto = valor === null ? "" : String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function KpisInternos() {
  const { can } = useAuth();
  const verFinanceiro = can("financeiro.ver");

  const { data: projetos = [], isLoading } = useProjetos();
  const { data: tarefas = [] } = useTarefas();
  const { data: fases = [] } = useFasesTodas();
  const { data: marcos = [] } = useMarcos();
  const { data: apontamentos = [] } = useApontamentos();
  const { data: custos = [] } = useCustosReais();
  const { data: orcamento = [] } = useOrcamentoItens();
  const { data: clientes = [] } = useClientes();

  const [cliente, setCliente] = useState("");
  const [status, setStatus] = useState("");
  const [somenteAtencao, setSomenteAtencao] = useState(false);

  const hoje = isoDate(new Date());

  const linhas = useMemo<Linha[]>(() => {
    const nomeCliente = new Map(clientes.map((c) => [c.id, c.nome_fantasia ?? c.nome]));
    const encerrado = (s: ProjetoStatus) => s === "concluido" || s === "cancelado";

    const soma = <T,>(lista: T[], projetoId: (x: T) => string, valor: (x: T) => number) => {
      const mapa = new Map<string, number>();
      for (const item of lista) mapa.set(projetoId(item), (mapa.get(projetoId(item)) ?? 0) + valor(item));
      return mapa;
    };

    const horasPorProjeto = soma(apontamentos, (a) => a.projeto_id, (a) => Number(a.horas));
    const horasAprovadas = soma(
      apontamentos.filter((a) => a.status === "aprovado"),
      (a) => a.projeto_id,
      (a) => Number(a.horas),
    );
    const custoPorProjeto = soma(custos, (c) => c.projeto_id, (c) => Number(c.valor));
    const orcadoPorProjeto = soma(
      orcamento.filter((o) => o.tipo === "custo"),
      (o) => o.projeto_id,
      (o) => Number(o.quantidade) * Number(o.valor_unitario),
    );

    return projetos
      .filter((p) => (!cliente || p.cliente_id === cliente) && (!status || p.status === status))
      .map((p) => {
        const doProjeto = tarefas.filter((t) => t.projeto_id === p.id);
        const pendenciasAbertas = doProjeto.filter((t) => t.status !== "concluida" && t.status !== "cancelada");
        const pendenciasAtrasadas = pendenciasAbertas.filter((t) => t.prazo && t.prazo < hoje);
        const fasesAtrasadas = fases.filter(
          (f) => f.projeto_id === p.id && f.status !== "concluida" && f.prazo && f.prazo < hoje,
        ).length;
        const entregasAtrasadas = marcos.filter(
          (m) =>
            m.projeto_id === p.id &&
            m.status !== "atingido" &&
            m.status !== "cancelado" &&
            m.data &&
            m.data < hoje,
        ).length;

        const prazoEstourado = !!p.prazo && p.prazo < hoje && !encerrado(p.status);
        const diasAtraso =
          prazoEstourado && p.prazo
            ? Math.max(0, Math.round((Date.parse(hoje) - Date.parse(p.prazo)) / 86400000))
            : 0;

        const custoReal = custoPorProjeto.get(p.id) ?? 0;
        const orcado = orcadoPorProjeto.get(p.id) ?? 0;

        return {
          id: p.id,
          codigo: p.codigo,
          nome: p.nome,
          cliente: (p.cliente_id ? nomeCliente.get(p.cliente_id) : null) ?? "—",
          status: p.status,
          prazo: p.prazo ?? null,
          diasAtraso,
          prazoEstourado,
          fasesAtrasadas,
          entregasAtrasadas,
          pendenciasAtrasadas: pendenciasAtrasadas.length,
          pendenciasAbertas: pendenciasAbertas.length,
          horas: horasPorProjeto.get(p.id) ?? 0,
          horasAprovadas: horasAprovadas.get(p.id) ?? 0,
          custoReal,
          orcado,
          consumo: orcado ? Math.round((custoReal / orcado) * 100) : custoReal > 0 ? 100 : 0,
          progresso: p.progresso ?? 0,
        };
      })
      .sort(
        (a, b) =>
          Number(b.prazoEstourado) - Number(a.prazoEstourado) ||
          b.pendenciasAtrasadas - a.pendenciasAtrasadas ||
          b.diasAtraso - a.diasAtraso,
      );
  }, [projetos, tarefas, fases, marcos, apontamentos, custos, orcamento, clientes, cliente, status, hoje]);

  const precisaAtencao = (l: Linha) =>
    l.prazoEstourado || l.pendenciasAtrasadas > 0 || l.entregasAtrasadas > 0 || (l.orcado > 0 && l.custoReal > l.orcado);
  const visiveis = somenteAtencao ? linhas.filter(precisaAtencao) : linhas;

  const projetosAtrasados = linhas.filter((l) => l.prazoEstourado).length;
  const totalPendencias = linhas.reduce((s, l) => s + l.pendenciasAtrasadas, 0);
  const totalEntregas = linhas.reduce((s, l) => s + l.entregasAtrasadas, 0);
  const totalHoras = linhas.reduce((s, l) => s + l.horas, 0);
  const totalCusto = linhas.reduce((s, l) => s + l.custoReal, 0);
  const totalOrcado = linhas.reduce((s, l) => s + l.orcado, 0);
  const consumoGeral = totalOrcado ? Math.round((totalCusto / totalOrcado) * 100) : 0;

  const dadosAtrasos = visiveis
    .filter((l) => l.pendenciasAtrasadas > 0 || l.entregasAtrasadas > 0 || l.fasesAtrasadas > 0)
    .slice(0, 12)
    .map((l) => ({
      nome: l.codigo,
      projeto: l.nome,
      "Pendências atrasadas": l.pendenciasAtrasadas,
      "Entregas atrasadas": l.entregasAtrasadas,
      "Fases atrasadas": l.fasesAtrasadas,
    }));

  const dadosHoras = visiveis
    .filter((l) => l.horas > 0)
    .slice(0, 12)
    .map((l) => ({ nome: l.codigo, projeto: l.nome, horas: Math.round(l.horas * 10) / 10 }));

  const dadosCustos = visiveis
    .filter((l) => l.custoReal > 0 || l.orcado > 0)
    .slice(0, 12)
    .map((l) => ({
      nome: l.codigo,
      projeto: l.nome,
      Orçamento: Math.round(l.orcado),
      "Custo real": Math.round(l.custoReal),
      estouro: l.orcado > 0 && l.custoReal > l.orcado,
    }));

  function exportar() {
    const cabecalho = [
      "Código",
      "Projeto",
      "Cliente",
      "Situação",
      "Prazo",
      "Dias de atraso",
      "Fases atrasadas",
      "Entregas atrasadas",
      "Pendências atrasadas",
      "Pendências abertas",
      "Horas apontadas",
      "Horas aprovadas",
      ...(verFinanceiro ? ["Custo real", "Orçamento de custo", "Consumo %"] : []),
    ];
    const corpo = visiveis.map((l) => [
      l.codigo,
      l.nome,
      l.cliente,
      PROJETO_STATUS[l.status]?.label ?? l.status,
      l.prazo ?? "",
      l.diasAtraso,
      l.fasesAtrasadas,
      l.entregasAtrasadas,
      l.pendenciasAtrasadas,
      l.pendenciasAbertas,
      l.horas.toFixed(1).replace(".", ","),
      l.horasAprovadas.toFixed(1).replace(".", ","),
      ...(verFinanceiro
        ? [l.custoReal.toFixed(2).replace(".", ","), l.orcado.toFixed(2).replace(".", ","), l.consumo]
        : []),
    ]);
    const csv = `\ufeff${[cabecalho, ...corpo].map((l) => l.map(celulaCsv).join(";")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `kpis-internos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="KPIs internos"
        descricao="Prazos estourados, pendências atrasadas, custo real e horas de cada projeto em uma só tela. Uso interno."
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <select value={cliente} onChange={(e) => setCliente(e.target.value)} className={`${inputClasses} w-auto`}>
              <option value="">Todos os clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_fantasia ?? c.nome}
                </option>
              ))}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClasses} w-auto`}>
              <option value="">Todas as situações</option>
              {(Object.keys(PROJETO_STATUS) as ProjetoStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PROJETO_STATUS[s].label}
                </option>
              ))}
            </select>
            <BotaoSecundario onClick={() => setSomenteAtencao((v) => !v)}>
              <AlertTriangle className="h-4 w-4" />
              {somenteAtencao ? "Ver todos" : "Só os que precisam de atenção"}
            </BotaoSecundario>
            <BotaoSecundario onClick={exportar} disabled={visiveis.length === 0}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </BotaoSecundario>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          titulo="Prazos estourados"
          valor={String(projetosAtrasados)}
          tom={projetosAtrasados > 0 ? "negativo" : "positivo"}
          detalhe={`${linhas.length} projeto(s) no filtro`}
        />
        <Indicador
          titulo="Pendências atrasadas"
          valor={String(totalPendencias)}
          tom={totalPendencias > 0 ? "atencao" : "positivo"}
          detalhe={`${totalEntregas} entrega(s) atrasada(s)`}
        />
        <Indicador titulo="Horas apontadas" valor={fmtHoras(totalHoras)} detalhe="Somatório do período registrado" />
        {verFinanceiro ? (
          <Indicador
            titulo="Custo real"
            valor={fmtMoeda(totalCusto)}
            tom={totalOrcado > 0 && totalCusto > totalOrcado ? "negativo" : "neutro"}
            progresso={Math.min(100, consumoGeral)}
            detalhe={totalOrcado > 0 ? `${consumoGeral}% do orçamento de custo` : "Sem orçamento de custo lançado"}
          />
        ) : (
          <Indicador titulo="Progresso médio" valor={`${Math.round(linhas.reduce((s, l) => s + l.progresso, 0) / (linhas.length || 1))}%`} detalhe="Média dos projetos no filtro" />
        )}
      </div>

      {isLoading ? (
        <Painel className="p-6">
          <p className="text-sm text-muted-foreground">Carregando indicadores...</p>
        </Painel>
      ) : visiveis.length === 0 ? (
        <Vazio
          titulo="Nada para acompanhar por aqui"
          descricao="Nenhum projeto se encaixa nos filtros selecionados."
        />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Painel className="p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Atrasos por projeto</h3>
              <p className="text-xs text-muted-foreground">Tarefas, entregas e fases com prazo vencido.</p>
              <div className="mt-4 h-72">
                {dadosAtrasos.length === 0 ? (
                  <p className="pt-10 text-center text-sm text-muted-foreground">Nenhum atraso registrado.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosAtrasos}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={40} />
                      <Tooltip labelFormatter={(l) => dadosAtrasos.find((d) => d.nome === l)?.projeto ?? String(l)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Pendências atrasadas" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Entregas atrasadas" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Fases atrasadas" fill="var(--neon)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Painel>

            <Painel className="p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Horas apontadas por projeto</h3>
              <p className="text-xs text-muted-foreground">Total de horas registradas pela equipe em cada projeto.</p>
              <div className="mt-4 h-72">
                {dadosHoras.length === 0 ? (
                  <p className="pt-10 text-center text-sm text-muted-foreground">Nenhuma hora apontada.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosHoras} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="nome" width={70} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number) => fmtHoras(v)}
                        labelFormatter={(l) => dadosHoras.find((d) => d.nome === l)?.projeto ?? String(l)}
                      />
                      <Bar dataKey="horas" fill="var(--primary)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Painel>
          </div>

          {verFinanceiro && dadosCustos.length > 0 && (
            <Painel className="p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Custo real x orçamento</h3>
              <p className="text-xs text-muted-foreground">
                Barras de custo real em vermelho indicam projeto acima do orçamento de custo.
              </p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosCustos}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmtMoeda(v)} width={90} />
                    <Tooltip
                      formatter={(v: number) => fmtMoeda(v)}
                      labelFormatter={(l) => dadosCustos.find((d) => d.nome === l)?.projeto ?? String(l)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Orçamento" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Custo real" radius={[6, 6, 0, 0]}>
                      {dadosCustos.map((d) => (
                        <Cell key={d.nome} fill={d.estouro ? "var(--destructive)" : "var(--neon)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>
          )}

          <Painel className="overflow-hidden">
            <div className="scroll-slim overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Projeto</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Prazo</th>
                    <th className="px-4 py-3 text-right">Pendências</th>
                    <th className="px-4 py-3 text-right">Entregas atrasadas</th>
                    <th className="px-4 py-3 text-right">Horas</th>
                    {verFinanceiro && <th className="px-4 py-3 text-right">Custo real</th>}
                    <th className="px-4 py-3">Progresso</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((l) => (
                    <tr key={l.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{l.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {l.codigo} · {PROJETO_STATUS[l.status]?.label ?? l.status}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{l.cliente}</td>
                      <td className="px-4 py-3">
                        {l.prazo ? (
                          l.prazoEstourado ? (
                            <Pill className="bg-danger-soft text-danger">
                              {fmtData(l.prazo)} · {l.diasAtraso}d de atraso
                            </Pill>
                          ) : (
                            <span className="text-muted-foreground">{fmtData(l.prazo)}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={l.pendenciasAtrasadas > 0 ? "font-semibold text-danger" : ""}>
                          {l.pendenciasAtrasadas}
                        </span>
                        <span className="text-xs text-muted-foreground"> / {l.pendenciasAbertas} abertas</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={l.entregasAtrasadas > 0 ? "font-semibold text-danger" : ""}>
                          {l.entregasAtrasadas}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {fmtHoras(l.horas)}
                        <div className="text-xs text-muted-foreground">{fmtHoras(l.horasAprovadas)} aprovadas</div>
                      </td>
                      {verFinanceiro && (
                        <td className="px-4 py-3 text-right">
                          <div className="font-semibold">{fmtMoeda(l.custoReal)}</div>
                          {l.orcado > 0 && (
                            <div
                              className={`text-xs ${l.custoReal > l.orcado ? "text-danger" : "text-muted-foreground"}`}
                            >
                              {l.consumo}% do orçado
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progresso valor={l.progresso} className="w-24" />
                          <span className="text-xs text-muted-foreground">{l.progresso}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/projetos/$projetoId"
                          params={{ projetoId: l.id }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                        >
                          Abrir <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Painel>
        </>
      )}
    </div>
  );
}
