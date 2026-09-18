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
import { AlertTriangle, CalendarClock, Download, ExternalLink } from "lucide-react";

import { BotaoSecundario, Indicador, Painel, Pill, Progresso, TituloPagina, Vazio, inputClasses } from "@/components/kit";
import { useClientes, useFasesTodas, useMarcos, useProjetos, useTarefas } from "@/lib/dados";
import {
  MARCO_STATUS,
  PROJETO_STATUS,
  SAUDE,
  calcularSaude,
  diasRestantes,
  estaAtrasada,
  fmtData,
  type ProjetoStatus,
} from "@/lib/enzova";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios por projeto · Projeta" },
      {
        name: "description",
        content: "Painel interno com progresso, prazos, entregas e pendências de todos os projetos em uma só tela.",
      },
      { property: "og:title", content: "Relatórios por projeto" },
      { property: "og:description", content: "Acompanhe progresso, prazos e pendências sem abrir cada projeto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Relatorios,
});

const ABERTAS = new Set(["backlog", "a_fazer", "em_andamento", "bloqueada", "em_validacao"]);

type Linha = {
  id: string;
  codigo: string;
  nome: string;
  cliente: string;
  status: ProjetoStatus;
  progresso: number;
  prazoConsumido: number;
  dias: number | null;
  prazo: string | null;
  fasesConcluidas: number;
  fasesTotal: number;
  abertas: number;
  atrasadas: number;
  bloqueadas: number;
  entregasPendentes: number;
  proximaEntrega: { nome: string; data: string | null } | null;
  saude: keyof typeof SAUDE;
  motivos: string[];
};

function celulaCsv(valor: string | number | null) {
  const texto = valor === null ? "" : String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function Relatorios() {
  const { data: projetos = [], isLoading } = useProjetos();
  const { data: tarefas = [] } = useTarefas();
  const { data: marcos = [] } = useMarcos();
  const { data: fases = [] } = useFasesTodas();
  const { data: clientes = [] } = useClientes();

  const [cliente, setCliente] = useState("");
  const [status, setStatus] = useState("");
  const [somenteAtencao, setSomenteAtencao] = useState(false);

  const linhas = useMemo<Linha[]>(() => {
    const nomeCliente = new Map(clientes.map((c) => [c.id, c.nome_fantasia ?? c.nome]));
    return projetos
      .filter((p) => (!cliente || p.cliente_id === cliente) && (!status || p.status === status))
      .map((p) => {
        const doProjeto = tarefas.filter((t) => t.projeto_id === p.id);
        const fasesProjeto = fases.filter((f) => f.projeto_id === p.id);
        const marcosProjeto = marcos.filter((m) => m.projeto_id === p.id);
        const saude = calcularSaude(p, doProjeto);
        const pendentes = marcosProjeto.filter((m) => m.status === "previsto" || m.status === "atrasado");
        const proxima = pendentes
          .slice()
          .sort((a, b) => (a.data ?? "9999").localeCompare(b.data ?? "9999"))
          .at(0);
        return {
          id: p.id,
          codigo: p.codigo,
          nome: p.nome,
          cliente: (p.cliente_id ? nomeCliente.get(p.cliente_id) : null) ?? "—",
          status: p.status,
          progresso: p.progresso,
          prazoConsumido: saude.prazoConsumido,
          dias: diasRestantes(p.prazo),
          prazo: p.prazo,
          fasesConcluidas: fasesProjeto.filter((f) => f.status === "concluida").length,
          fasesTotal: fasesProjeto.length,
          abertas: doProjeto.filter((t) => ABERTAS.has(t.status)).length,
          atrasadas: doProjeto.filter((t) => estaAtrasada(t.prazo, t.status)).length,
          bloqueadas: doProjeto.filter((t) => t.status === "bloqueada").length,
          entregasPendentes: pendentes.length,
          proximaEntrega: proxima ? { nome: proxima.nome, data: proxima.data } : null,
          saude: saude.nivel,
          motivos: saude.motivos,
        };
      })
      .sort((a, b) => b.atrasadas - a.atrasadas || a.nome.localeCompare(b.nome));
  }, [projetos, tarefas, fases, marcos, clientes, cliente, status]);

  const visiveis = somenteAtencao
    ? linhas.filter((l) => l.saude !== "saudavel" || l.atrasadas > 0 || (l.dias !== null && l.dias < 0))
    : linhas;

  const ativos = linhas.filter((l) => l.status !== "concluido" && l.status !== "cancelado");
  const progressoMedio = ativos.length
    ? Math.round(ativos.reduce((acc, l) => acc + l.progresso, 0) / ativos.length)
    : 0;
  const atrasados = ativos.filter((l) => l.dias !== null && l.dias < 0).length;
  const totalAtrasadas = linhas.reduce((acc, l) => acc + l.atrasadas, 0);
  const entregas14 = linhas.reduce(
    (acc, l) =>
      acc +
      (l.proximaEntrega?.data && (diasRestantes(l.proximaEntrega.data) ?? 999) <= 14 ? 1 : 0),
    0,
  );

  const dadosProgresso = visiveis.map((l) => ({
    nome: l.codigo,
    projeto: l.nome,
    Progresso: l.progresso,
    "Prazo consumido": Math.min(150, l.prazoConsumido),
  }));

  const dadosPendencias = visiveis.map((l) => ({
    nome: l.codigo,
    Abertas: l.abertas - l.atrasadas - l.bloqueadas > 0 ? l.abertas - l.atrasadas - l.bloqueadas : 0,
    Bloqueadas: l.bloqueadas,
    Atrasadas: l.atrasadas,
  }));

  const dadosEntregas = (Object.keys(MARCO_STATUS) as (keyof typeof MARCO_STATUS)[]).map((s) => ({
    nome: MARCO_STATUS[s].label,
    total: marcos.filter(
      (m) => m.status === s && visiveis.some((l) => l.id === m.projeto_id),
    ).length,
  }));

  function exportar() {
    const cabecalho = [
      "Código",
      "Projeto",
      "Cliente",
      "Situação",
      "Progresso %",
      "Prazo consumido %",
      "Prazo",
      "Dias restantes",
      "Fases concluídas",
      "Fases",
      "Tarefas abertas",
      "Tarefas atrasadas",
      "Entregas pendentes",
      "Próxima entrega",
      "Saúde",
    ];
    const linhasCsv = visiveis.map((l) => [
      l.codigo,
      l.nome,
      l.cliente,
      PROJETO_STATUS[l.status]?.label ?? l.status,
      l.progresso,
      l.prazoConsumido,
      l.prazo ? fmtData(l.prazo, "dd/MM/yyyy") : "",
      l.dias,
      l.fasesConcluidas,
      l.fasesTotal,
      l.abertas,
      l.atrasadas,
      l.entregasPendentes,
      l.proximaEntrega ? `${l.proximaEntrega.nome} (${fmtData(l.proximaEntrega.data, "dd/MM/yyyy")})` : "",
      SAUDE[l.saude].label,
    ]);
    const csv = `\ufeff${[cabecalho, ...linhasCsv].map((l) => l.map(celulaCsv).join(";")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-projetos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Relatórios por projeto"
        descricao="Progresso, prazos, entregas e pendências de toda a carteira em uma só tela."
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
              {somenteAtencao ? "Ver todos" : "Só os que pedem atenção"}
            </BotaoSecundario>
            <BotaoSecundario onClick={exportar} disabled={visiveis.length === 0}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </BotaoSecundario>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Projetos em andamento" valor={String(ativos.length)} detalhe={`${linhas.length} na carteira`} />
        <Indicador titulo="Progresso médio" valor={`${progressoMedio}%`} detalhe="Projetos ativos" />
        <Indicador
          titulo="Prazos estourados"
          valor={String(atrasados)}
          detalhe={atrasados ? "Requerem replanejamento" : "Nenhum projeto fora do prazo"}
        />
        <Indicador
          titulo="Pendências atrasadas"
          valor={String(totalAtrasadas)}
          detalhe={`${entregas14} entrega(s) nos próximos 14 dias`}
        />
      </div>

      {isLoading ? (
        <Painel className="p-6">
          <p className="text-sm text-muted-foreground">Carregando relatórios...</p>
        </Painel>
      ) : visiveis.length === 0 ? (
        <Vazio titulo="Nenhum projeto no filtro" descricao="Ajuste cliente, situação ou remova o filtro de atenção." />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Painel className="p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Progresso x prazo consumido</h3>
              <p className="text-xs text-muted-foreground">
                Barras de prazo acima do progresso indicam projeto correndo atrás do cronograma.
              </p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosProgresso}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      formatter={(v: number) => `${v}%`}
                      labelFormatter={(l) => dadosProgresso.find((d) => d.nome === l)?.projeto ?? String(l)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Progresso" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Prazo consumido" fill="var(--neon)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>

            <Painel className="p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Pendências por projeto</h3>
              <p className="text-xs text-muted-foreground">Tarefas abertas, bloqueadas e com prazo vencido.</p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosPendencias}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Abertas" stackId="p" fill="var(--primary)" />
                    <Bar dataKey="Bloqueadas" stackId="p" fill="var(--neon)" />
                    <Bar dataKey="Atrasadas" stackId="p" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>
          </div>

          <Painel className="p-5">
            <h3 className="font-display text-base font-semibold text-foreground">Entregas e marcos</h3>
            <p className="text-xs text-muted-foreground">Situação das entregas dos projetos filtrados.</p>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosEntregas} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {dadosEntregas.map((d) => (
                      <Cell
                        key={d.nome}
                        fill={d.nome === "Atrasado" ? "var(--destructive)" : "var(--primary)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Painel>

          <Painel className="overflow-hidden">
            <div className="scroll-slim overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Projeto</th>
                    <th className="px-4 py-3">Situação</th>
                    <th className="px-4 py-3">Progresso</th>
                    <th className="px-4 py-3">Prazo</th>
                    <th className="px-4 py-3">Fases</th>
                    <th className="px-4 py-3">Pendências</th>
                    <th className="px-4 py-3">Próxima entrega</th>
                    <th className="px-4 py-3">Saúde</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((l) => (
                    <tr key={l.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{l.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.codigo} · {l.cliente}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Pill className={PROJETO_STATUS[l.status]?.pill}>{PROJETO_STATUS[l.status]?.label}</Pill>
                      </td>
                      <td className="px-4 py-3 w-40">
                        <Progresso valor={l.progresso} />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {l.progresso}% · prazo {l.prazoConsumido}%
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="text-foreground">{l.prazo ? fmtData(l.prazo, "dd MMM yyyy") : "Sem prazo"}</p>
                        <p className={l.dias !== null && l.dias < 0 ? "text-destructive" : "text-muted-foreground"}>
                          {l.dias === null
                            ? "—"
                            : l.dias < 0
                              ? `${Math.abs(l.dias)} dias de atraso`
                              : `${l.dias} dias restantes`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {l.fasesConcluidas} de {l.fasesTotal}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="text-foreground">{l.abertas} abertas</p>
                        <p className={l.atrasadas ? "text-destructive" : "text-muted-foreground"}>
                          {l.atrasadas} atrasadas · {l.bloqueadas} bloqueadas
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {l.proximaEntrega ? (
                          <>
                            <p className="text-foreground">{l.proximaEntrega.nome}</p>
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <CalendarClock className="h-3 w-3" />
                              {fmtData(l.proximaEntrega.data, "dd MMM yyyy")}
                            </p>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Nenhuma pendente</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Pill className={SAUDE[l.saude].pill}>{SAUDE[l.saude].label}</Pill>
                        {l.motivos.length ? (
                          <p className="mt-1 max-w-[220px] text-[11px] leading-snug text-muted-foreground">
                            {l.motivos[0]}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/projetos/$projetoId"
                          params={{ projetoId: l.id }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-ink underline"
                        >
                          Abrir <ExternalLink className="h-3 w-3" />
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
