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
import { useClientes, useOrcamentoItens, useProjetos } from "@/lib/dados";
import { PROJETO_STATUS, fmtMoeda, type ProjetoStatus } from "@/lib/enzova";

export const Route = createFileRoute("/_authenticated/custos")({
  head: () => ({
    meta: [
      { title: "Custos por projeto · Projeta" },
      {
        name: "description",
        content: "Painel interno com custo real lançado contra o orçamento de cada projeto, em uma só tela.",
      },
      { property: "og:title", content: "Custos por projeto" },
      { property: "og:description", content: "Compare custo real e orçamento de todos os projetos sem abrir cada um." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustosPorProjeto,
});

type Linha = {
  id: string;
  codigo: string;
  nome: string;
  cliente: string;
  status: ProjetoStatus;
  orcado: number;
  real: number;
  lancamentos: number;
  consumo: number;
};

function celulaCsv(valor: string | number | null) {
  const texto = valor === null ? "" : String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function CustosPorProjeto() {
  const { can } = useAuth();
  const { data: projetos = [], isLoading } = useProjetos();
  const { data: orcamento = [] } = useOrcamentoItens();
  const { data: custos = [] } = useCustosReais();
  const { data: clientes = [] } = useClientes();

  const [cliente, setCliente] = useState("");
  const [status, setStatus] = useState("");
  const [somenteEstouro, setSomenteEstouro] = useState(false);

  const linhas = useMemo<Linha[]>(() => {
    const nomeCliente = new Map(clientes.map((c) => [c.id, c.nome_fantasia ?? c.nome]));
    const orcadoPorProjeto = new Map<string, number>();
    for (const item of orcamento) {
      if (item.tipo !== "custo") continue;
      orcadoPorProjeto.set(
        item.projeto_id,
        (orcadoPorProjeto.get(item.projeto_id) ?? 0) + Number(item.quantidade) * Number(item.valor_unitario),
      );
    }
    const realPorProjeto = new Map<string, { total: number; qtd: number }>();
    for (const c of custos) {
      const atual = realPorProjeto.get(c.projeto_id) ?? { total: 0, qtd: 0 };
      realPorProjeto.set(c.projeto_id, { total: atual.total + Number(c.valor), qtd: atual.qtd + 1 });
    }

    return projetos
      .filter((p) => (!cliente || p.cliente_id === cliente) && (!status || p.status === status))
      .map((p) => {
        const orcado = orcadoPorProjeto.get(p.id) ?? 0;
        const real = realPorProjeto.get(p.id)?.total ?? 0;
        return {
          id: p.id,
          codigo: p.codigo,
          nome: p.nome,
          cliente: (p.cliente_id ? nomeCliente.get(p.cliente_id) : null) ?? "—",
          status: p.status,
          orcado,
          real,
          lancamentos: realPorProjeto.get(p.id)?.qtd ?? 0,
          consumo: orcado ? Math.round((real / orcado) * 100) : real > 0 ? 100 : 0,
        };
      })
      .filter((l) => l.orcado > 0 || l.real > 0)
      .sort((a, b) => b.consumo - a.consumo || b.real - a.real);
  }, [projetos, orcamento, custos, clientes, cliente, status]);

  const visiveis = somenteEstouro ? linhas.filter((l) => l.real > l.orcado) : linhas;

  const totalOrcado = visiveis.reduce((s, l) => s + l.orcado, 0);
  const totalReal = visiveis.reduce((s, l) => s + l.real, 0);
  const saldo = totalOrcado - totalReal;
  const consumoGeral = totalOrcado ? Math.round((totalReal / totalOrcado) * 100) : 0;
  const emEstouro = linhas.filter((l) => l.real > l.orcado).length;

  const dadosGrafico = visiveis.map((l) => ({
    nome: l.codigo,
    projeto: l.nome,
    Orçamento: Math.round(l.orcado),
    "Custo real": Math.round(l.real),
  }));

  const dadosConsumo = visiveis.map((l) => ({
    nome: l.codigo,
    projeto: l.nome,
    consumo: Math.min(200, l.consumo),
    estouro: l.real > l.orcado,
  }));

  function exportar() {
    const cabecalho = [
      "Código",
      "Projeto",
      "Cliente",
      "Situação",
      "Orçamento de custo",
      "Custo real",
      "Diferença",
      "Consumo %",
      "Lançamentos",
    ];
    const linhasCsv = visiveis.map((l) => [
      l.codigo,
      l.nome,
      l.cliente,
      PROJETO_STATUS[l.status]?.label ?? l.status,
      l.orcado.toFixed(2).replace(".", ","),
      l.real.toFixed(2).replace(".", ","),
      (l.orcado - l.real).toFixed(2).replace(".", ","),
      l.consumo,
      l.lancamentos,
    ]);
    const csv = `\ufeff${[cabecalho, ...linhasCsv].map((l) => l.map(celulaCsv).join(";")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `custos-por-projeto-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!can("financeiro.ver")) {
    return (
      <>
        <TituloPagina titulo="Custos por projeto" />
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
        titulo="Custos por projeto"
        descricao="Custo real lançado contra o orçamento de toda a carteira. Uso interno, nada disso aparece no portal do cliente."
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
            <BotaoSecundario onClick={() => setSomenteEstouro((v) => !v)}>
              <AlertTriangle className="h-4 w-4" />
              {somenteEstouro ? "Ver todos" : "Só os que estouraram"}
            </BotaoSecundario>
            <BotaoSecundario onClick={exportar} disabled={visiveis.length === 0}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </BotaoSecundario>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Orçamento de custo" valor={fmtMoeda(totalOrcado)} detalhe={`${visiveis.length} projeto(s)`} />
        <Indicador
          titulo="Custo real lançado"
          valor={fmtMoeda(totalReal)}
          tom={totalOrcado && totalReal > totalOrcado ? "negativo" : "neutro"}
          detalhe="Somatório dos lançamentos"
        />
        <Indicador
          titulo={saldo >= 0 ? "Saldo disponível" : "Estouro"}
          valor={fmtMoeda(Math.abs(saldo))}
          tom={saldo >= 0 ? "positivo" : "negativo"}
          detalhe={`${emEstouro} projeto(s) acima do orçado`}
        />
        <Indicador
          titulo="Orçamento consumido"
          valor={`${consumoGeral}%`}
          progresso={Math.min(100, consumoGeral)}
          tom={consumoGeral > 100 ? "negativo" : consumoGeral > 85 ? "atencao" : "positivo"}
          detalhe="Custo real sobre o orçado"
        />
      </div>

      {isLoading ? (
        <Painel className="p-6">
          <p className="text-sm text-muted-foreground">Carregando custos...</p>
        </Painel>
      ) : visiveis.length === 0 ? (
        <Vazio
          titulo="Nenhum projeto com custo ou orçamento"
          descricao="Lance custos reais nos projetos ou monte o orçamento de custo para acompanhar aqui."
        />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Painel className="p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Custo real x orçamento</h3>
              <p className="text-xs text-muted-foreground">
                Barras de custo real acima do orçamento indicam projeto estourando o previsto.
              </p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmtMoeda(v)} width={90} />
                    <Tooltip
                      formatter={(v: number) => fmtMoeda(v)}
                      labelFormatter={(l) => dadosGrafico.find((d) => d.nome === l)?.projeto ?? String(l)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Orçamento" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Custo real" fill="var(--neon)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>

            <Painel className="p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Orçamento consumido</h3>
              <p className="text-xs text-muted-foreground">Percentual do orçamento de custo já gasto em cada projeto.</p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosConsumo} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nome" width={70} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number) => `${v}%`}
                      labelFormatter={(l) => dadosConsumo.find((d) => d.nome === l)?.projeto ?? String(l)}
                    />
                    <Bar dataKey="consumo" radius={[0, 6, 6, 0]}>
                      {dadosConsumo.map((d) => (
                        <Cell key={d.nome} fill={d.estouro ? "var(--destructive)" : "var(--primary)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>
          </div>

          <Painel className="overflow-hidden">
            <div className="scroll-slim overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Projeto</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Situação</th>
                    <th className="px-4 py-3 text-right">Orçamento</th>
                    <th className="px-4 py-3 text-right">Custo real</th>
                    <th className="px-4 py-3 text-right">Diferença</th>
                    <th className="px-4 py-3">Consumo</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((l) => {
                    const dif = l.orcado - l.real;
                    return (
                      <tr key={l.id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{l.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {l.codigo} · {l.lancamentos} lançamento(s)
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{l.cliente}</td>
                        <td className="px-4 py-3">{PROJETO_STATUS[l.status]?.label ?? l.status}</td>
                        <td className="px-4 py-3 text-right">{fmtMoeda(l.orcado)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{fmtMoeda(l.real)}</td>
                        <td className="px-4 py-3 text-right">
                          <Pill className={dif >= 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}>
                            {dif >= 0 ? "sobra " : "estouro "}
                            {fmtMoeda(Math.abs(dif))}
                          </Pill>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progresso valor={Math.min(100, l.consumo)} className="w-24" />
                            <span className="text-xs text-muted-foreground">{l.consumo}%</span>
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
