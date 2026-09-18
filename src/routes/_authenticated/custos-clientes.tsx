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

export const Route = createFileRoute("/_authenticated/custos-clientes")({
  head: () => ({
    meta: [
      { title: "Custos por cliente · Projeta" },
      {
        name: "description",
        content: "Relatório interno com custo real e orçamento consolidados por cliente e por projeto.",
      },
      { property: "og:title", content: "Custos por cliente" },
      { property: "og:description", content: "Custo real x orçamento consolidado por cliente e projeto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustosPorCliente,
});

type LinhaProjeto = {
  id: string;
  codigo: string;
  nome: string;
  status: ProjetoStatus;
  orcado: number;
  real: number;
  lancamentos: number;
  consumo: number;
};

type LinhaCliente = {
  id: string;
  nome: string;
  orcado: number;
  real: number;
  consumo: number;
  projetos: LinhaProjeto[];
};

function celulaCsv(valor: string | number | null) {
  const texto = valor === null ? "" : String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function CustosPorCliente() {
  const { can } = useAuth();
  const { data: projetos = [], isLoading } = useProjetos();
  const { data: orcamento = [] } = useOrcamentoItens();
  const { data: custos = [] } = useCustosReais();
  const { data: clientes = [] } = useClientes();

  const [cliente, setCliente] = useState("");
  const [status, setStatus] = useState("");
  const [somenteEstouro, setSomenteEstouro] = useState(false);

  const grupos = useMemo<LinhaCliente[]>(() => {
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

    const mapa = new Map<string, LinhaCliente>();
    for (const p of projetos) {
      if (cliente && p.cliente_id !== cliente) continue;
      if (status && p.status !== status) continue;
      const orcado = orcadoPorProjeto.get(p.id) ?? 0;
      const real = realPorProjeto.get(p.id)?.total ?? 0;
      if (orcado <= 0 && real <= 0) continue;
      if (somenteEstouro && real <= orcado) continue;

      const chave = p.cliente_id ?? "sem-cliente";
      const grupo =
        mapa.get(chave) ??
        ({
          id: chave,
          nome: (p.cliente_id ? nomeCliente.get(p.cliente_id) : null) ?? "Sem cliente",
          orcado: 0,
          real: 0,
          consumo: 0,
          projetos: [],
        } satisfies LinhaCliente);
      grupo.orcado += orcado;
      grupo.real += real;
      grupo.projetos.push({
        id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        status: p.status,
        orcado,
        real,
        lancamentos: realPorProjeto.get(p.id)?.qtd ?? 0,
        consumo: orcado ? Math.round((real / orcado) * 100) : real > 0 ? 100 : 0,
      });
      mapa.set(chave, grupo);
    }

    return Array.from(mapa.values())
      .map((g) => ({
        ...g,
        consumo: g.orcado ? Math.round((g.real / g.orcado) * 100) : g.real > 0 ? 100 : 0,
        projetos: g.projetos.sort((a, b) => b.real - a.real),
      }))
      .sort((a, b) => b.real - a.real);
  }, [projetos, orcamento, custos, clientes, cliente, status, somenteEstouro]);

  const totalOrcado = grupos.reduce((s, g) => s + g.orcado, 0);
  const totalReal = grupos.reduce((s, g) => s + g.real, 0);
  const saldo = totalOrcado - totalReal;
  const consumoGeral = totalOrcado ? Math.round((totalReal / totalOrcado) * 100) : 0;
  const clientesEmEstouro = grupos.filter((g) => g.real > g.orcado).length;
  const totalProjetos = grupos.reduce((s, g) => s + g.projetos.length, 0);

  const dadosClientes = grupos.map((g) => ({
    nome: g.nome,
    Orçamento: Math.round(g.orcado),
    "Custo real": Math.round(g.real),
  }));

  const dadosProjetos = grupos
    .flatMap((g) => g.projetos.map((p) => ({ ...p, cliente: g.nome })))
    .sort((a, b) => b.real - a.real)
    .slice(0, 12)
    .map((p) => ({
      nome: p.codigo,
      projeto: `${p.nome} · ${p.cliente}`,
      consumo: Math.min(200, p.consumo),
      estouro: p.real > p.orcado,
    }));

  function exportar() {
    const cabecalho = [
      "Cliente",
      "Código",
      "Projeto",
      "Situação",
      "Orçamento de custo",
      "Custo real",
      "Diferença",
      "Consumo %",
      "Lançamentos",
    ];
    const linhasCsv = grupos.flatMap((g) =>
      g.projetos.map((p) => [
        g.nome,
        p.codigo,
        p.nome,
        PROJETO_STATUS[p.status]?.label ?? p.status,
        p.orcado.toFixed(2).replace(".", ","),
        p.real.toFixed(2).replace(".", ","),
        (p.orcado - p.real).toFixed(2).replace(".", ","),
        p.consumo,
        p.lancamentos,
      ]),
    );
    const csv = `\ufeff${[cabecalho, ...linhasCsv].map((l) => l.map(celulaCsv).join(";")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `custos-por-cliente-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!can("financeiro.ver")) {
    return (
      <>
        <TituloPagina titulo="Custos por cliente" />
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
        titulo="Custos por cliente"
        descricao="Custo real x orçamento consolidado por cliente e detalhado por projeto. Uso interno, nada aparece no portal."
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
            <BotaoSecundario onClick={exportar} disabled={grupos.length === 0}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </BotaoSecundario>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          titulo="Orçamento de custo"
          valor={fmtMoeda(totalOrcado)}
          detalhe={`${grupos.length} cliente(s) · ${totalProjetos} projeto(s)`}
        />
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
          detalhe={`${clientesEmEstouro} cliente(s) acima do orçado`}
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
      ) : grupos.length === 0 ? (
        <Vazio
          titulo="Nenhum cliente com custo ou orçamento"
          descricao="Lance custos reais nos projetos ou monte o orçamento de custo para acompanhar aqui."
        />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Painel className="p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Custo real x orçamento por cliente</h3>
              <p className="text-xs text-muted-foreground">
                Soma de todos os projetos de cada cliente, com o orçamento de custo ao lado do realizado.
              </p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosClientes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} height={50} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmtMoeda(v)} width={90} />
                    <Tooltip formatter={(v: number) => fmtMoeda(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Orçamento" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Custo real" fill="var(--neon)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>

            <Painel className="p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Consumo por projeto</h3>
              <p className="text-xs text-muted-foreground">
                Os 12 projetos com maior custo real e quanto já consumiram do orçamento.
              </p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosProjetos} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nome" width={70} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number) => `${v}%`}
                      labelFormatter={(l) => dadosProjetos.find((d) => d.nome === l)?.projeto ?? String(l)}
                    />
                    <Bar dataKey="consumo" radius={[0, 6, 6, 0]}>
                      {dadosProjetos.map((d) => (
                        <Cell key={d.nome} fill={d.estouro ? "var(--destructive)" : "var(--primary)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>
          </div>

          <div className="space-y-4">
            {grupos.map((g) => {
              const dif = g.orcado - g.real;
              return (
                <Painel key={g.id} className="overflow-hidden" padded={false}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                    <div>
                      <div className="font-display text-[15px] font-bold">{g.nome}</div>
                      <div className="text-[11px] text-muted-foreground">{g.projetos.length} projeto(s)</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <span className="text-muted-foreground">
                        Orçado <span className="font-semibold text-foreground">{fmtMoeda(g.orcado)}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Real <span className="font-semibold text-foreground">{fmtMoeda(g.real)}</span>
                      </span>
                      <Pill className={dif >= 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}>
                        {dif >= 0 ? "sobra " : "estouro "}
                        {fmtMoeda(Math.abs(dif))}
                      </Pill>
                      <div className="flex items-center gap-2">
                        <Progresso valor={Math.min(100, g.consumo)} className="w-24" />
                        <span className="text-muted-foreground">{g.consumo}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="scroll-slim overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-4 py-3">Projeto</th>
                          <th className="px-4 py-3">Situação</th>
                          <th className="px-4 py-3 text-right">Orçamento</th>
                          <th className="px-4 py-3 text-right">Custo real</th>
                          <th className="px-4 py-3 text-right">Diferença</th>
                          <th className="px-4 py-3">Consumo</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {g.projetos.map((p) => {
                          const d = p.orcado - p.real;
                          return (
                            <tr key={p.id} className="border-b border-border/50 last:border-0">
                              <td className="px-4 py-3">
                                <div className="font-medium text-foreground">{p.nome}</div>
                                <div className="text-xs text-muted-foreground">
                                  {p.codigo} · {p.lancamentos} lançamento(s)
                                </div>
                              </td>
                              <td className="px-4 py-3">{PROJETO_STATUS[p.status]?.label ?? p.status}</td>
                              <td className="px-4 py-3 text-right">{fmtMoeda(p.orcado)}</td>
                              <td className="px-4 py-3 text-right font-semibold">{fmtMoeda(p.real)}</td>
                              <td className="px-4 py-3 text-right">
                                <Pill className={d >= 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}>
                                  {d >= 0 ? "sobra " : "estouro "}
                                  {fmtMoeda(Math.abs(d))}
                                </Pill>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Progresso valor={Math.min(100, p.consumo)} className="w-24" />
                                  <span className="text-xs text-muted-foreground">{p.consumo}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Link
                                  to="/projetos/$projetoId"
                                  params={{ projetoId: p.id }}
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
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
