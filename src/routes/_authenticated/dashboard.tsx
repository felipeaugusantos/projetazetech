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
import { useAuth } from "@/lib/auth";
import { useClientes, useEquipe, useProjetos, useTarefas } from "@/lib/dados";
import {
  PROJETO_STATUS,
  SAUDE,
  TAREFA_STATUS,
  calcularSaude,
  estaAtrasada,
  fmtHoras,
  fmtMoeda,
  type ProjetoStatus,
} from "@/lib/enzova";
import { Indicador, Painel, Pill, Progresso, TituloPagina, Vazio, inputClasses } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard executivo · Projeta" },
      { name: "description", content: "Projetos, tarefas, horas, custos e faturamento da sua empresa em um painel." },
      { property: "og:title", content: "Dashboard executivo" },
      { property: "og:description", content: "Indicadores consolidados dos projetos da empresa." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { tenant, can } = useAuth();
  const { data: projetos = [], isLoading } = useProjetos();
  const { data: tarefas = [] } = useTarefas();
  const { data: clientes = [] } = useClientes();
  const { data: equipe = [] } = useEquipe();

  const [clienteFiltro, setClienteFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [responsavelFiltro, setResponsavelFiltro] = useState("");

  const projetosFiltrados = useMemo(
    () =>
      projetos.filter(
        (p) =>
          (!clienteFiltro || p.cliente_id === clienteFiltro) && (!statusFiltro || p.status === statusFiltro),
      ),
    [projetos, clienteFiltro, statusFiltro],
  );

  const idsProjetos = useMemo(() => new Set(projetosFiltrados.map((p) => p.id)), [projetosFiltrados]);
  const tarefasFiltradas = useMemo(
    () =>
      tarefas.filter(
        (t) => idsProjetos.has(t.projeto_id) && (!responsavelFiltro || t.responsavel_id === responsavelFiltro),
      ),
    [tarefas, idsProjetos, responsavelFiltro],
  );

  const custoPorPessoa = useMemo(
    () => new Map(equipe.map((m) => [m.id, Number(m.custo_hora ?? 0)])),
    [equipe],
  );

  const kpis = useMemo(() => {
    const ativos = projetosFiltrados.filter((p) => ["em_andamento", "em_validacao", "em_risco"].includes(p.status));
    const atrasados = projetosFiltrados.filter(
      (p) => p.prazo && new Date(p.prazo) < new Date() && p.status !== "concluido" && p.status !== "cancelado",
    );
    const emRisco = projetosFiltrados.filter((p) => {
      const saude = calcularSaude(p, tarefas.filter((t) => t.projeto_id === p.id));
      return saude.nivel === "em_risco" || saude.nivel === "critico";
    });
    const concluidos = projetosFiltrados.filter((p) => p.status === "concluido");

    const horasPrevistas = projetosFiltrados.reduce((a, p) => a + Number(p.horas_previstas ?? 0), 0);
    const horasRealizadas = tarefasFiltradas.reduce((a, t) => a + Number(t.horas_realizadas ?? 0), 0);
    const custoRealizado = tarefasFiltradas.reduce(
      (a, t) => a + Number(t.horas_realizadas ?? 0) * (custoPorPessoa.get(t.responsavel_id ?? "") ?? 0),
      0,
    );

    return {
      ativos: ativos.length,
      atrasados: atrasados.length,
      emRisco: emRisco.length,
      concluidos: concluidos.length,
      tarefasAbertas: tarefasFiltradas.filter((t) => !["concluida", "cancelada"].includes(t.status)).length,
      tarefasAtrasadas: tarefasFiltradas.filter((t) => estaAtrasada(t.prazo, t.status)).length,
      tarefasConcluidas: tarefasFiltradas.filter((t) => t.status === "concluida").length,
      horasPrevistas,
      horasRealizadas,
      custoPrevisto: projetosFiltrados.reduce((a, p) => a + Number(p.custo_previsto ?? 0), 0),
      custoRealizado,
      faturamentoPrevisto: projetosFiltrados.reduce((a, p) => a + Number(p.receita_prevista ?? 0), 0),
      faturamentoRealizado: projetosFiltrados
        .filter((p) => p.status === "concluido")
        .reduce((a, p) => a + Number(p.receita_prevista ?? 0), 0),
    };
  }, [projetosFiltrados, tarefasFiltradas, tarefas, custoPorPessoa]);

  const porStatus = useMemo(() => {
    const mapa = new Map<ProjetoStatus, number>();
    projetosFiltrados.forEach((p) => mapa.set(p.status, (mapa.get(p.status) ?? 0) + 1));
    return Array.from(mapa.entries()).map(([status, total]) => ({
      nome: PROJETO_STATUS[status].label,
      total,
      status,
    }));
  }, [projetosFiltrados]);

  const tarefasPorStatus = useMemo(() => {
    const mapa = new Map<string, number>();
    tarefasFiltradas.forEach((t) => mapa.set(t.status, (mapa.get(t.status) ?? 0) + 1));
    return Array.from(mapa.entries()).map(([status, total]) => ({
      nome: TAREFA_STATUS[status as keyof typeof TAREFA_STATUS].label,
      total,
    }));
  }, [tarefasFiltradas]);

  const tarefasPorResponsavel = useMemo(
    () =>
      equipe
        .map((m) => ({
          nome: m.nome.split(" ")[0],
          abertas: tarefasFiltradas.filter(
            (t) => t.responsavel_id === m.id && !["concluida", "cancelada"].includes(t.status),
          ).length,
          concluidas: tarefasFiltradas.filter((t) => t.responsavel_id === m.id && t.status === "concluida").length,
        }))
        .filter((x) => x.abertas + x.concluidas > 0),
    [equipe, tarefasFiltradas],
  );

  const horasPorProjeto = useMemo(
    () =>
      projetosFiltrados.map((p) => ({
        nome: p.codigo,
        previstas: Number(p.horas_previstas ?? 0),
        realizadas: tarefas
          .filter((t) => t.projeto_id === p.id)
          .reduce((a, t) => a + Number(t.horas_realizadas ?? 0), 0),
      })),
    [projetosFiltrados, tarefas],
  );

  const orcamentoPorProjeto = useMemo(
    () =>
      projetosFiltrados.map((p) => ({
        nome: p.codigo,
        planejado: Number(p.custo_previsto ?? 0),
        realizado: tarefas
          .filter((t) => t.projeto_id === p.id)
          .reduce(
            (a, t) => a + Number(t.horas_realizadas ?? 0) * (custoPorPessoa.get(t.responsavel_id ?? "") ?? 0),
            0,
          ),
      })),
    [projetosFiltrados, tarefas, custoPorPessoa],
  );

  const coresStatus: Record<string, string> = {
    em_andamento: "var(--color-success)",
    planejamento: "var(--color-brand)",
    em_risco: "var(--color-danger)",
    em_validacao: "var(--color-warning)",
    pausado: "var(--color-muted-foreground)",
    concluido: "var(--color-success)",
    aguardando_inicio: "var(--color-muted-foreground)",
    cancelado: "var(--color-muted-foreground)",
  };

  return (
    <>
      <TituloPagina
        sobretitulo={
          <>
            <span className="size-1.5 rounded-full bg-success" /> Multiempresa · {tenant?.nome ?? "—"}
          </>
        }
        titulo="Visão executiva"
        descricao={`${projetosFiltrados.length} projetos no filtro atual · ${tarefasFiltradas.length} tarefas`}
        acoes={
          <>
            <select className={`${inputClasses} w-auto`} value={clienteFiltro} onChange={(e) => setClienteFiltro(e.target.value)}>
              <option value="">Todos os clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <select className={`${inputClasses} w-auto`} value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
              <option value="">Todos os status</option>
              {(Object.keys(PROJETO_STATUS) as ProjetoStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PROJETO_STATUS[s].label}
                </option>
              ))}
            </select>
            <select
              className={`${inputClasses} w-auto`}
              value={responsavelFiltro}
              onChange={(e) => setResponsavelFiltro(e.target.value)}
            >
              <option value="">Toda a equipe</option>
              {equipe.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
            {can("cliente.criar") ? (
              <Link to="/clientes" search={{ novo: true }}>
                <BotaoSecundario>
                  <Plus className="size-4" /> Novo cliente
                </BotaoSecundario>
              </Link>
            ) : null}
            {can("projeto.criar") ? (
              <Link to="/projetos" search={{ novo: true }}>
                <BotaoPrimario>
                  <Plus className="size-4" /> Novo projeto
                </BotaoPrimario>
              </Link>
            ) : null}
          </>
        }
      />

      {isLoading ? (
        <Painel>
          <Vazio titulo="Carregando indicadores…" />
        </Painel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Indicador
              titulo="Projetos ativos"
              valor={kpis.ativos}
              detalhe={`${kpis.concluidos} concluídos`}
              progresso={projetosFiltrados.length ? (kpis.ativos / projetosFiltrados.length) * 100 : 0}
            />
            <Indicador
              titulo="Projetos atrasados"
              valor={kpis.atrasados}
              tom={kpis.atrasados ? "negativo" : "positivo"}
              detalhe="prazo já vencido"
            />
            <Indicador
              titulo="Projetos em risco"
              valor={kpis.emRisco}
              tom={kpis.emRisco ? "atencao" : "positivo"}
              detalhe="pela saúde calculada"
            />
            <Indicador
              titulo="Tarefas abertas"
              valor={kpis.tarefasAbertas}
              detalhe={`${kpis.tarefasAtrasadas} atrasadas · ${kpis.tarefasConcluidas} concluídas`}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Indicador
              titulo="Horas planejadas"
              valor={fmtHoras(kpis.horasPrevistas)}
              detalhe={`${fmtHoras(kpis.horasRealizadas)} realizadas`}
              progresso={kpis.horasPrevistas ? (kpis.horasRealizadas / kpis.horasPrevistas) * 100 : 0}
            />
            {can("financeiro.ver") ? (
              <>
                <Indicador
                  titulo="Custo planejado"
                  valor={fmtMoeda(kpis.custoPrevisto)}
                  detalhe={`${fmtMoeda(kpis.custoRealizado)} realizado`}
                />
                <Indicador titulo="Faturamento previsto" valor={fmtMoeda(kpis.faturamentoPrevisto)} />
                <Indicador
                  titulo="Faturamento realizado"
                  valor={fmtMoeda(kpis.faturamentoRealizado)}
                  tom="positivo"
                  detalhe="projetos com aceite concluído"
                />
              </>
            ) : (
              <Painel className="col-span-3 flex items-center p-4 text-[12px] text-muted-foreground">
                Indicadores financeiros ficam visíveis apenas para perfis com permissão de financeiro.
              </Painel>
            )}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Painel>
              <div className="font-display text-[15px] font-semibold">Projetos por status</div>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porStatus}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="nome" tick={{ fontSize: 10 }} interval={0} angle={-15} height={40} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {porStatus.map((entry) => (
                        <Cell key={entry.status} fill={coresStatus[entry.status] ?? "var(--color-brand)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>

            <Painel>
              <div className="font-display text-[15px] font-semibold">Tarefas por status</div>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tarefasPorStatus}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="nome" tick={{ fontSize: 10 }} interval={0} angle={-15} height={40} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" fill="var(--color-brand)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>

            <Painel>
              <div className="font-display text-[15px] font-semibold">Produtividade por responsável</div>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tarefasPorResponsavel}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="concluidas" name="Concluídas" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="abertas" name="Abertas" fill="var(--color-brand)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Painel>
              <div className="font-display text-[15px] font-semibold">Horas por projeto</div>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={horasPorProjeto}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="previstas" name="Previstas" fill="var(--color-brand-soft)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="realizadas" name="Realizadas" fill="var(--color-brand)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>

            <Painel>
              <div className="font-display text-[15px] font-semibold">Orçamento planejado x realizado</div>
              {can("financeiro.ver") ? (
                <div className="mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={orcamentoPorProjeto}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => fmtMoeda(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="planejado" name="Planejado" fill="var(--color-brand-soft)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="realizado" name="Realizado" fill="var(--color-warning)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Vazio titulo="Sem permissão financeira" descricao="Fale com um administrador do workspace." />
              )}
            </Painel>
          </div>

          <Painel className="mt-4" padded={false}>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="font-display text-[15px] font-semibold">Saúde dos projetos</div>
              <Link to="/projetos" className="text-[12px] font-medium text-brand">
                ver todos
              </Link>
            </div>
            <div className="divide-y divide-border">
              {projetosFiltrados.map((p) => {
                const saude = calcularSaude(p, tarefas.filter((t) => t.projeto_id === p.id));
                return (
                  <Link
                    key={p.id}
                    to="/projetos/$projetoId"
                    params={{ projetoId: p.id }}
                    className="flex flex-wrap items-center gap-3 px-5 py-3 transition hover:bg-secondary/60"
                  >
                    <div className="min-w-52 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">{p.codigo}</span>
                        <span className="text-[13px] font-semibold">{p.nome}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{p.clientes?.nome ?? "Sem cliente"}</div>
                    </div>
                    <div className="w-40">
                      <Progresso valor={saude.tarefasConcluidas} className="h-1.5" />
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {saude.tarefasConcluidas}% concluído · prazo {saude.prazoConsumido}%
                      </div>
                    </div>
                    <Pill className={PROJETO_STATUS[p.status].pill}>{PROJETO_STATUS[p.status].label}</Pill>
                    <Pill className={SAUDE[saude.nivel].pill}>{SAUDE[saude.nivel].label}</Pill>
                  </Link>
                );
              })}
              {projetosFiltrados.length === 0 ? (
                <Vazio titulo="Nenhum projeto no filtro" descricao="Ajuste os filtros acima." />
              ) : null}
            </div>
          </Painel>
        </>
      )}
    </>
  );
}
