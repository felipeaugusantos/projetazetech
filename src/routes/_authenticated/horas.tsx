import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addWeeks, format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, Plus, Send, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { registrarAuditoria, useApontamentos, useEquipe, useProjetos, useTarefas } from "@/lib/dados";
import {
  APONTAMENTO_STATUS,
  diasDaSemana,
  fmtHoras,
  fmtMoeda,
  inicioSemana,
  isoDate,
  rotuloSemana,
} from "@/lib/enzova";
import {
  Avatar,
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Indicador,
  Painel,
  Pill,
  Progresso,
  TituloPagina,
  Vazio,
  inputClasses,
} from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/horas")({
  head: () => ({
    meta: [
      { title: "Horas · Projeta" },
      { name: "description", content: "Timesheet semanal, aprovação de horas e consolidado por projeto e pessoa." },
      { property: "og:title", content: "Horas e timesheet" },
      { property: "og:description", content: "Apontamento diário, aprovação e horas faturáveis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Horas,
});

type Aba = "timesheet" | "aprovacoes" | "consolidado";

function Horas() {
  const { can } = useAuth();
  const [aba, setAba] = useState<Aba>("timesheet");
  const podeAprovar = can("horas.aprovar");

  const abas: { id: Aba; label: string }[] = [
    { id: "timesheet", label: "Meu timesheet" },
    ...(podeAprovar ? [{ id: "aprovacoes" as Aba, label: "Aprovações" }] : []),
    { id: "consolidado", label: "Consolidado" },
  ];

  return (
    <>
      <TituloPagina
        sobretitulo={
          <>
            <Timer className="size-3.5" /> Apontamento de horas
          </>
        }
        titulo="Horas"
        descricao="Registre o tempo por dia, envie a semana para aprovação e acompanhe horas faturáveis e custo."
      />

      <div className="frost-soft mb-5 inline-flex rounded-xl p-1">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              "rounded-lg px-3.5 py-2 text-[12px] font-semibold transition",
              aba === a.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === "timesheet" ? <MeuTimesheet /> : null}
      {aba === "aprovacoes" && podeAprovar ? <Aprovacoes /> : null}
      {aba === "consolidado" ? <Consolidado /> : null}
    </>
  );
}

/* ============================ Meu timesheet ============================ */

function MeuTimesheet() {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();
  const [semana, setSemana] = useState(() => inicioSemana(new Date()));
  const [formAberto, setFormAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<string>(() => isoDate(new Date()));

  const { data: apontamentos = [] } = useApontamentos({ apenasMeus: true });
  const { data: projetos = [] } = useProjetos();
  const { data: tarefas = [] } = useTarefas();

  const dias = diasDaSemana(semana);
  const inicio = isoDate(dias[0]!);
  const fim = isoDate(dias[6]!);

  const daSemana = useMemo(
    () => apontamentos.filter((a) => a.data >= inicio && a.data <= fim),
    [apontamentos, inicio, fim],
  );

  const totalSemana = daSemana.reduce((acc, a) => acc + Number(a.horas), 0);
  const faturaveis = daSemana.filter((a) => a.faturavel).reduce((acc, a) => acc + Number(a.horas), 0);
  const capacidade = Number(perfil?.capacidade_semanal ?? 40);
  const rascunhos = daSemana.filter((a) => a.status === "rascunho");

  const enviarSemana = useMutation({
    mutationFn: async () => {
      if (!rascunhos.length) throw new Error("Nenhum apontamento em rascunho nesta semana.");
      const { error } = await supabase
        .from("apontamentos")
        .update({ status: "enviado" })
        .in(
          "id",
          rascunhos.map((a) => a.id),
        );
      if (error) throw error;
      if (perfil) {
        await registrarAuditoria({
          tenant_id: perfil.tenant_id,
          profile_id: perfil.id,
          entidade: "apontamento",
          acao: "enviou semana para aprovação",
          campo: "status",
          valor_novo: `${rascunhos.length} apontamento(s) — ${rotuloSemana(semana)}`,
        });
      }
    },
    onSuccess: () => {
      toast.success("Semana enviada para aprovação");
      void queryClient.invalidateQueries({ queryKey: ["apontamentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("apontamentos").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Apontamento removido");
      void queryClient.invalidateQueries({ queryKey: ["apontamentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          titulo="Horas na semana"
          valor={fmtHoras(totalSemana)}
          detalhe={`capacidade de ${fmtHoras(capacidade)}`}
          progresso={capacidade ? (totalSemana / capacidade) * 100 : 0}
        />
        <Indicador
          titulo="Faturáveis"
          valor={fmtHoras(faturaveis)}
          detalhe={`${totalSemana ? Math.round((faturaveis / totalSemana) * 100) : 0}% do apontado`}
          tom="positivo"
        />
        <Indicador titulo="Em rascunho" valor={rascunhos.length} detalhe="aguardando envio" tom={rascunhos.length ? "atencao" : "neutro"} />
        <Indicador
          titulo="Utilização"
          valor={`${capacidade ? Math.round((totalSemana / capacidade) * 100) : 0}%`}
          detalhe="horas apontadas sobre capacidade"
          tom={totalSemana > capacidade ? "negativo" : "neutro"}
        />
      </div>

      <Painel className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BotaoSecundario onClick={() => setSemana(addWeeks(semana, -1))} aria-label="Semana anterior">
              <ChevronLeft className="size-4" />
            </BotaoSecundario>
            <div className="min-w-52 text-center">
              <div className="font-display text-[15px] font-bold">{rotuloSemana(semana)}</div>
              <div className="text-[11px] text-muted-foreground">
                Semana {format(dias[0]!, "w", { locale: ptBR })} de {format(dias[0]!, "yyyy")}
              </div>
            </div>
            <BotaoSecundario onClick={() => setSemana(addWeeks(semana, 1))} aria-label="Próxima semana">
              <ChevronRight className="size-4" />
            </BotaoSecundario>
            <BotaoSecundario onClick={() => setSemana(inicioSemana(new Date()))}>Hoje</BotaoSecundario>
          </div>
          <div className="flex items-center gap-2">
            <BotaoSecundario onClick={() => enviarSemana.mutate()} disabled={!rascunhos.length || enviarSemana.isPending}>
              <Send className="size-4" /> Enviar semana
            </BotaoSecundario>
            <BotaoPrimario
              onClick={() => {
                setDiaSelecionado(isoDate(new Date()));
                setFormAberto(true);
              }}
            >
              <Plus className="size-4" /> Apontar horas
            </BotaoPrimario>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-7">
          {dias.map((dia) => {
            const iso = isoDate(dia);
            const doDia = daSemana.filter((a) => a.data === iso);
            const horas = doDia.reduce((acc, a) => acc + Number(a.horas), 0);
            const hoje = isSameDay(dia, new Date());
            return (
              <button
                key={iso}
                onClick={() => {
                  setDiaSelecionado(iso);
                  setFormAberto(true);
                }}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-left transition",
                  hoje ? "bg-brand-soft" : "frost-soft hover:bg-card",
                )}
              >
                <div className="text-[11px] font-medium text-muted-foreground capitalize">
                  {format(dia, "EEE dd", { locale: ptBR })}
                </div>
                <div className={cn("mt-1 font-display text-[18px] font-bold", horas ? "text-foreground" : "text-muted-foreground")}>
                  {horas ? fmtHoras(horas) : "—"}
                </div>
                <Progresso valor={(horas / 8) * 100} className="mt-2 h-1" />
              </button>
            );
          })}
        </div>
      </Painel>

      <Painel padded={false} className="py-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-left">
            <thead>
              <tr className="text-[10px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2 font-medium">Dia</th>
                <th className="px-3 py-2 font-medium">Projeto</th>
                <th className="px-3 py-2 font-medium">Tarefa / descrição</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Horas</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {daSemana
                .slice()
                .sort((a, b) => a.data.localeCompare(b.data))
                .map((a) => (
                  <tr key={a.id} className="text-[12px]">
                    <td className="px-4 py-2.5 whitespace-nowrap capitalize">
                      {format(parseISO(a.data), "EEE dd/MM", { locale: ptBR })}
                    </td>
                    <td className="px-3 py-2.5 font-medium">{a.projetos?.nome ?? "—"}</td>
                    <td className="max-w-md px-3 py-2.5 text-muted-foreground">
                      <span className="block truncate">{a.tarefas?.titulo ?? a.descricao ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill className={a.faturavel ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground"}>
                        {a.faturavel ? "Faturável" : "Interno"}
                      </Pill>
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill className={APONTAMENTO_STATUS[a.status].pill}>{APONTAMENTO_STATUS[a.status].label}</Pill>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold">{fmtHoras(Number(a.horas))}</td>
                    <td className="px-3 py-2.5 text-right">
                      {a.status === "rascunho" || a.status === "rejeitado" ? (
                        <button
                          onClick={() => excluir.mutate(a.id)}
                          className="text-muted-foreground transition hover:text-danger"
                          aria-label="Remover apontamento"
                        >
                          <X className="size-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {daSemana.length === 0 ? (
            <Vazio titulo="Nenhuma hora apontada nesta semana" descricao="Clique em um dia para registrar o tempo trabalhado." />
          ) : null}
        </div>
      </Painel>

      {formAberto ? (
        <NovoApontamento
          dia={diaSelecionado}
          projetos={projetos.map((p) => ({ id: p.id, nome: p.nome }))}
          tarefas={tarefas.map((t) => ({ id: t.id, titulo: t.titulo, projeto_id: t.projeto_id }))}
          onFechar={() => setFormAberto(false)}
        />
      ) : null}
    </>
  );
}

function NovoApontamento({
  dia,
  projetos,
  tarefas,
  onFechar,
}: {
  dia: string;
  projetos: { id: string; nome: string }[];
  tarefas: { id: string; titulo: string; projeto_id: string }[];
  onFechar: () => void;
}) {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();
  const [data, setData] = useState(dia);
  const [projetoId, setProjetoId] = useState(projetos[0]?.id ?? "");
  const [tarefaId, setTarefaId] = useState("");
  const [horas, setHoras] = useState("2");
  const [descricao, setDescricao] = useState("");
  const [faturavel, setFaturavel] = useState(true);

  const tarefasDoProjeto = tarefas.filter((t) => t.projeto_id === projetoId);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!perfil) throw new Error("Perfil não carregado");
      if (!projetoId) throw new Error("Selecione um projeto");
      const valor = Number(horas.replace(",", "."));
      if (!valor || valor <= 0 || valor > 24) throw new Error("Informe entre 0,5 e 24 horas");
      const { error } = await supabase.from("apontamentos").insert({
        tenant_id: perfil.tenant_id,
        profile_id: perfil.id,
        projeto_id: projetoId,
        tarefa_id: tarefaId || null,
        data,
        horas: valor,
        descricao: descricao || null,
        faturavel,
        status: "rascunho",
      });
      if (error) throw error;
      await registrarAuditoria({
        tenant_id: perfil.tenant_id,
        profile_id: perfil.id,
        entidade: "apontamento",
        acao: "apontou horas",
        projeto_id: projetoId,
        valor_novo: `${valor}h em ${data}`,
      });
    },
    onSuccess: () => {
      toast.success("Horas apontadas");
      void queryClient.invalidateQueries({ queryKey: ["apontamentos"] });
      onFechar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <Painel>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-[17px] font-bold">Apontar horas</h2>
              <p className="text-[12px] text-muted-foreground">O apontamento entra como rascunho até você enviar a semana.</p>
            </div>
            <button onClick={onFechar} className="text-muted-foreground transition hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Campo label="Data">
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClasses} />
            </Campo>
            <Campo label="Horas">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
                className={inputClasses}
              />
            </Campo>
            <Campo label="Projeto" className="sm:col-span-2">
              <select
                value={projetoId}
                onChange={(e) => {
                  setProjetoId(e.target.value);
                  setTarefaId("");
                }}
                className={inputClasses}
              >
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Tarefa (opcional)" className="sm:col-span-2">
              <select value={tarefaId} onChange={(e) => setTarefaId(e.target.value)} className={inputClasses}>
                <option value="">Sem tarefa específica</option>
                {tarefasDoProjeto.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titulo}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Descrição" className="sm:col-span-2">
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="O que foi feito neste tempo?"
                className={inputClasses}
              />
            </Campo>
          </div>

          <label className="mt-3 flex items-center gap-2 text-[12px]">
            <input type="checkbox" checked={faturavel} onChange={(e) => setFaturavel(e.target.checked)} className="size-4 accent-brand" />
            Hora faturável ao cliente
          </label>

          <div className="mt-5 flex justify-end gap-2">
            <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
            <BotaoPrimario onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              Salvar apontamento
            </BotaoPrimario>
          </div>
        </Painel>
      </div>
    </div>
  );
}

/* ============================ Aprovações ============================ */

function Aprovacoes() {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();
  const { data: apontamentos = [] } = useApontamentos();

  const pendentes = apontamentos.filter((a) => a.status === "enviado");

  const grupos = useMemo(() => {
    const mapa = new Map<string, { pessoa: string; semana: string; itens: typeof pendentes }>();
    for (const a of pendentes) {
      const semana = isoDate(inicioSemana(a.data));
      const chave = `${a.profile_id}-${semana}`;
      const grupo = mapa.get(chave) ?? { pessoa: a.profiles?.nome ?? "—", semana, itens: [] };
      grupo.itens.push(a);
      mapa.set(chave, grupo);
    }
    return [...mapa.values()].sort((a, b) => b.semana.localeCompare(a.semana));
  }, [pendentes]);

  const decidir = useMutation({
    mutationFn: async ({ ids, aprovar }: { ids: string[]; aprovar: boolean }) => {
      if (!perfil) throw new Error("Perfil não carregado");
      const { error } = await supabase
        .from("apontamentos")
        .update({
          status: aprovar ? "aprovado" : "rejeitado",
          aprovador_id: perfil.id,
          aprovado_em: new Date().toISOString(),
        })
        .in("id", ids);
      if (error) throw error;
      await registrarAuditoria({
        tenant_id: perfil.tenant_id,
        profile_id: perfil.id,
        entidade: "apontamento",
        acao: aprovar ? "aprovou horas" : "rejeitou horas",
        valor_novo: `${ids.length} apontamento(s)`,
      });
    },
    onSuccess: () => {
      toast.success("Timesheet atualizado");
      void queryClient.invalidateQueries({ queryKey: ["apontamentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPendente = pendentes.reduce((acc, a) => acc + Number(a.horas), 0);

  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Horas em aprovação" valor={fmtHoras(totalPendente)} detalhe={`${pendentes.length} lançamentos`} tom="atencao" />
        <Indicador titulo="Timesheets pendentes" valor={grupos.length} detalhe="pessoa × semana" />
        <Indicador
          titulo="Aprovadas no mês"
          valor={fmtHoras(
            apontamentos
              .filter((a) => a.status === "aprovado" && a.data >= isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
              .reduce((acc, a) => acc + Number(a.horas), 0),
          )}
          detalhe="mês corrente"
          tom="positivo"
        />
        <Indicador
          titulo="Rejeitadas"
          valor={apontamentos.filter((a) => a.status === "rejeitado").length}
          detalhe="precisam de correção"
          tom={apontamentos.some((a) => a.status === "rejeitado") ? "negativo" : "neutro"}
        />
      </div>

      <div className="space-y-3">
        {grupos.map((g) => {
          const total = g.itens.reduce((acc, a) => acc + Number(a.horas), 0);
          const ids = g.itens.map((a) => a.id);
          return (
            <Painel key={`${g.pessoa}-${g.semana}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar nome={g.pessoa} className="size-9" />
                  <div>
                    <div className="font-display text-[14px] font-bold">{g.pessoa}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {rotuloSemana(g.semana)} · {fmtHoras(total)} em {g.itens.length} lançamentos
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <BotaoSecundario onClick={() => decidir.mutate({ ids, aprovar: false })} disabled={decidir.isPending}>
                    <X className="size-4" /> Rejeitar
                  </BotaoSecundario>
                  <BotaoPrimario onClick={() => decidir.mutate({ ids, aprovar: true })} disabled={decidir.isPending}>
                    <Check className="size-4" /> Aprovar semana
                  </BotaoPrimario>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                {g.itens.map((a) => (
                  <div key={a.id} className="frost-soft flex items-center gap-3 rounded-xl px-3 py-2 text-[12px]">
                    <span className="w-24 shrink-0 capitalize text-muted-foreground">
                      {format(parseISO(a.data), "EEE dd/MM", { locale: ptBR })}
                    </span>
                    <span className="w-48 shrink-0 truncate font-medium">{a.projetos?.nome ?? "—"}</span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{a.tarefas?.titulo ?? a.descricao ?? "—"}</span>
                    <Pill className={a.faturavel ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground"}>
                      {a.faturavel ? "Faturável" : "Interno"}
                    </Pill>
                    <span className="w-16 shrink-0 text-right font-semibold">{fmtHoras(Number(a.horas))}</span>
                  </div>
                ))}
              </div>
            </Painel>
          );
        })}
        {grupos.length === 0 ? (
          <Painel>
            <Vazio titulo="Nenhum timesheet aguardando aprovação" descricao="Tudo em dia por aqui." />
          </Painel>
        ) : null}
      </div>
    </>
  );
}

/* ============================ Consolidado ============================ */

function Consolidado() {
  const { can } = useAuth();
  const { data: apontamentos = [] } = useApontamentos();
  const { data: projetos = [] } = useProjetos();
  const { data: equipe = [] } = useEquipe();
  const verFinanceiro = can("financeiro.ver");

  const aprovadas = apontamentos.filter((a) => a.status !== "rejeitado");
  const total = aprovadas.reduce((acc, a) => acc + Number(a.horas), 0);
  const faturaveis = aprovadas.filter((a) => a.faturavel).reduce((acc, a) => acc + Number(a.horas), 0);
  const custo = aprovadas.reduce((acc, a) => acc + Number(a.horas) * Number(a.profiles?.custo_hora ?? 0), 0);

  const porProjeto = useMemo(
    () =>
      projetos
        .map((p) => {
          const doProjeto = aprovadas.filter((a) => a.projeto_id === p.id);
          return {
            id: p.id,
            nome: p.nome,
            previstas: Number(p.horas_previstas ?? 0),
            apontadas: doProjeto.reduce((acc, a) => acc + Number(a.horas), 0),
            custo: doProjeto.reduce((acc, a) => acc + Number(a.horas) * Number(a.profiles?.custo_hora ?? 0), 0),
          };
        })
        .sort((a, b) => b.apontadas - a.apontadas),
    [projetos, aprovadas],
  );

  const porPessoa = useMemo(
    () =>
      equipe
        .map((m) => {
          const suas = aprovadas.filter((a) => a.profile_id === m.id);
          return {
            id: m.id,
            nome: m.nome,
            horas: suas.reduce((acc, a) => acc + Number(a.horas), 0),
            faturaveis: suas.filter((a) => a.faturavel).reduce((acc, a) => acc + Number(a.horas), 0),
            custo: Number(m.custo_hora ?? 0),
          };
        })
        .sort((a, b) => b.horas - a.horas),
    [equipe, aprovadas],
  );

  const maxProjeto = Math.max(1, ...porProjeto.map((p) => Math.max(p.previstas, p.apontadas)));

  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Horas apontadas" valor={fmtHoras(total)} detalhe="rascunhos, enviadas e aprovadas" />
        <Indicador
          titulo="Horas faturáveis"
          valor={fmtHoras(faturaveis)}
          detalhe={`${total ? Math.round((faturaveis / total) * 100) : 0}% do total`}
          progresso={total ? (faturaveis / total) * 100 : 0}
          tom="positivo"
        />
        {verFinanceiro ? (
          <Indicador titulo="Custo de mão de obra" valor={fmtMoeda(custo)} detalhe="horas × custo/hora" />
        ) : (
          <Indicador titulo="Projetos com horas" valor={porProjeto.filter((p) => p.apontadas > 0).length} detalhe={`de ${projetos.length}`} />
        )}
        <Indicador
          titulo="Média por pessoa"
          valor={fmtHoras(porPessoa.length ? total / porPessoa.length : 0)}
          detalhe="no período registrado"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel>
          <h2 className="font-display text-[15px] font-bold">Horas apontadas x previstas</h2>
          <div className="mt-4 space-y-3.5">
            {porProjeto.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between text-[12px]">
                  <span className="truncate font-medium">{p.nome}</span>
                  <span className="text-muted-foreground">
                    {fmtHoras(p.apontadas)} / {fmtHoras(p.previstas)}
                    {verFinanceiro ? ` · ${fmtMoeda(p.custo)}` : ""}
                  </span>
                </div>
                <Progresso valor={(p.apontadas / maxProjeto) * 100} className="mt-1.5 h-1.5" />
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
                    {fmtHoras(m.horas)} apontadas · {fmtHoras(m.faturaveis)} faturáveis
                  </div>
                </div>
                {verFinanceiro ? <span className="text-[12px] font-semibold">{fmtMoeda(m.horas * m.custo)}</span> : null}
              </div>
            ))}
            {porPessoa.length === 0 ? <Vazio titulo="Nenhuma pessoa cadastrada" /> : null}
          </div>
        </Painel>
      </div>
    </>
  );
}
