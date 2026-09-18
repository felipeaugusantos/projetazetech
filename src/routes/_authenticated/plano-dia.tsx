import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarCheck, CheckSquare, ChevronLeft, ChevronRight, Plus, Square, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";


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
import { useAuth } from "@/lib/auth";
import { useEquipe, useProjetos, useTarefas } from "@/lib/dados";
import {
  useConcluirItemPlano,
  usePlanoDia,
  useRemoverItemPlano,
  useSalvarItemPlano,
  type ItemPlanoDia,
} from "@/lib/plano-dia";
import { fmtDataLonga, fmtHoras } from "@/lib/enzova";

export const Route = createFileRoute("/_authenticated/plano-dia")({
  head: () => ({
    meta: [
      { title: "Plano do dia · Projeta" },
      {
        name: "description",
        content: "Defina as tarefas do dia de cada pessoa da equipe, com horas previstas e acompanhamento da execução.",
      },
      { property: "og:title", content: "Plano do dia" },
      { property: "og:description", content: "Tarefas diárias por pessoa, horas previstas e o que já foi concluído." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanoDoDia,
});

function isoDia(base: Date) {
  return base.toISOString().slice(0, 10);
}

function somarDias(dia: string, dias: number) {
  const d = new Date(`${dia}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return isoDia(d);
}

function PlanoDoDia() {
  const { perfil, can } = useAuth();
  const [dia, setDia] = useState(() => isoDia(new Date()));
  const [modal, setModal] = useState<{ profileId: string; item?: ItemPlanoDia } | null>(null);
  const [situacao, setSituacao] = useState<"todas" | "pendentes" | "concluidas">("todas");

  const { data: equipe = [] } = useEquipe();
  const { data: itens = [], isLoading } = usePlanoDia({ data: dia });
  const concluir = useConcluirItemPlano();
  const remover = useRemoverItemPlano();

  const podeEditar = can("tarefa.editar");

  const pessoas = useMemo(() => {
    return equipe
      .filter((p) => p.ativo)
      .map((p) => {
        const meus = itens.filter((i) => i.profile_id === p.id);
        const horas = meus.reduce((s, i) => s + Number(i.horas_previstas ?? 0), 0);
        const feitos = meus.filter((i) => i.concluido).length;
        const horasFeitas = meus
          .filter((i) => i.concluido)
          .reduce((s, i) => s + Number(i.horas_previstas ?? 0), 0);
        const visiveis =
          situacao === "todas" ? meus : meus.filter((i) => (situacao === "concluidas" ? i.concluido : !i.concluido));
        return {
          id: p.id,
          nome: p.nome,
          cargo: p.cargo,
          itens: meus,
          visiveis,
          horas,
          horasFeitas,
          feitos,
          pct: meus.length ? Math.round((feitos / meus.length) * 100) : 0,
        };
      });
  }, [equipe, itens, situacao]);

  const dadosGrafico = useMemo(
    () =>
      pessoas
        .filter((p) => p.itens.length > 0)
        .map((p) => ({
          nome: p.nome.split(" ")[0] ?? p.nome,
          pessoa: p.nome,
          "Horas previstas": Math.round(p.horas * 10) / 10,
          "Horas concluídas": Math.round(p.horasFeitas * 10) / 10,
        })),
    [pessoas],
  );

  const totalItens = itens.length;
  const totalHoras = itens.reduce((s, i) => s + Number(i.horas_previstas ?? 0), 0);
  const concluidos = itens.filter((i) => i.concluido).length;
  const semPlano = pessoas.filter((p) => p.itens.length === 0).length;

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Plano do dia"
        descricao="Defina o que cada pessoa da equipe faz no dia, com horas previstas, e acompanhe o que já foi concluído."
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <BotaoSecundario onClick={() => setDia(somarDias(dia, -1))} aria-label="Dia anterior">
              <ChevronLeft className="h-4 w-4" />
            </BotaoSecundario>
            <input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className={`${inputClasses} w-auto`} />
            <BotaoSecundario onClick={() => setDia(somarDias(dia, 1))} aria-label="Dia seguinte">
              <ChevronRight className="h-4 w-4" />
            </BotaoSecundario>
            <BotaoSecundario onClick={() => setDia(isoDia(new Date()))}>Hoje</BotaoSecundario>
            {podeEditar && perfil ? (
              <BotaoPrimario onClick={() => setModal({ profileId: pessoas[0]?.id ?? perfil.id })}>
                <Plus className="h-4 w-4" />
                Nova tarefa do dia
              </BotaoPrimario>
            ) : null}
          </div>
        }
      />

      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <CalendarCheck className="size-4 text-brand" />
        {fmtDataLonga(dia)}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Tarefas planejadas" valor={totalItens} detalhe={`${pessoas.length} pessoa(s) ativa(s)`} />
        <Indicador titulo="Horas previstas" valor={fmtHoras(totalHoras)} detalhe="Soma do plano do dia" />
        <Indicador
          titulo="Concluídas"
          valor={`${concluidos}/${totalItens}`}
          progresso={totalItens ? Math.round((concluidos / totalItens) * 100) : 0}
          tom={totalItens && concluidos === totalItens ? "positivo" : "atencao"}
          detalhe="Marcadas como feitas"
        />
        <Indicador
          titulo="Sem plano"
          valor={semPlano}
          tom={semPlano ? "atencao" : "positivo"}
          detalhe="Pessoas sem tarefa definida no dia"
        />
      </div>

      {isLoading ? (
        <Painel className="p-6">
          <p className="text-sm text-muted-foreground">Carregando o plano do dia...</p>
        </Painel>
      ) : pessoas.length === 0 ? (
        <Vazio titulo="Nenhuma pessoa ativa" descricao="Cadastre a equipe para montar o plano do dia." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {pessoas.map((p) => (
            <Painel key={p.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar nome={p.nome} />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{p.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.cargo ?? "—"} · {fmtHoras(p.horas)} previstas
                    </div>
                  </div>
                </div>
                {podeEditar ? (
                  <BotaoSecundario onClick={() => setModal({ profileId: p.id })}>
                    <Plus className="h-4 w-4" />
                    Tarefa
                  </BotaoSecundario>
                ) : null}
              </div>

              {p.itens.length > 0 ? (
                <div className="mt-3 flex items-center gap-2">
                  <Progresso valor={p.pct} className="flex-1" />
                  <span className="text-xs text-muted-foreground">
                    {p.feitos}/{p.itens.length}
                  </span>
                </div>
              ) : null}

              <div className="mt-4 space-y-2">
                {p.itens.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">Nenhuma tarefa definida para este dia.</p>
                ) : (
                  p.itens.map((i) => {
                    const podeMarcar = podeEditar || i.profile_id === perfil?.id;
                    return (
                      <div
                        key={i.id}
                        className="flex items-start gap-2.5 rounded-xl border border-border/70 px-3 py-2.5"
                      >
                        <button
                          type="button"
                          disabled={!podeMarcar}
                          onClick={() => concluir.mutate({ id: i.id, concluido: !i.concluido })}
                          className="mt-0.5 text-brand disabled:opacity-40"
                          aria-label={i.concluido ? "Marcar como pendente" : "Marcar como concluída"}
                        >
                          {i.concluido ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-[13px] font-medium ${i.concluido ? "text-muted-foreground line-through" : "text-foreground"}`}
                          >
                            {i.titulo}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            {i.projetos ? <Pill className="bg-brand-soft text-brand-ink">{i.projetos.codigo}</Pill> : null}
                            {Number(i.horas_previstas) > 0 ? <span>{fmtHoras(Number(i.horas_previstas))}</span> : null}
                            {i.tarefas ? <span className="truncate">Tarefa: {i.tarefas.titulo}</span> : null}
                          </div>
                          {i.detalhe ? <p className="mt-1 text-[12px] text-muted-foreground">{i.detalhe}</p> : null}
                        </div>
                        {podeEditar ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setModal({ profileId: p.id, item: i })}
                              className="rounded-lg px-2 py-1 text-[12px] font-medium text-muted-foreground hover:bg-secondary"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                remover.mutate(i.id, {
                                  onSuccess: () => toast.success("Tarefa removida do plano."),
                                  onError: () => toast.error("Não foi possível remover."),
                                });
                              }}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                              aria-label="Remover do plano"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </Painel>
          ))}
        </div>
      )}

      {modal ? (
        <ItemModal
          dia={dia}
          profileId={modal.profileId}
          {...(modal.item ? { item: modal.item } : {})}
          onFechar={() => setModal(null)}
        />
      ) : null}
    </div>
  );
}

function ItemModal({
  dia,
  profileId,
  item,
  onFechar,
}: {
  dia: string;
  profileId: string;
  item?: ItemPlanoDia;
  onFechar: () => void;
}) {
  const { data: equipe = [] } = useEquipe();
  const { data: projetos = [] } = useProjetos();
  const { data: tarefas = [] } = useTarefas();
  const salvar = useSalvarItemPlano();

  const [form, setForm] = useState({
    profile_id: item?.profile_id ?? profileId,
    data: item?.data ?? dia,
    titulo: item?.titulo ?? "",
    projeto_id: item?.projeto_id ?? "",
    tarefa_id: item?.tarefa_id ?? "",
    horas_previstas: item?.horas_previstas != null ? String(item.horas_previstas) : "",
    detalhe: item?.detalhe ?? "",
  });

  const tarefasDoProjeto = useMemo(
    () =>
      tarefas.filter(
        (t) =>
          (!form.projeto_id || t.projeto_id === form.projeto_id) && !["concluida", "cancelada"].includes(t.status),
      ),
    [tarefas, form.projeto_id],
  );

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const titulo = form.titulo.trim() || tarefas.find((t) => t.id === form.tarefa_id)?.titulo || "";
    if (!titulo) {
      toast.error("Informe o que a pessoa vai fazer.");
      return;
    }
    salvar.mutate(
      {
        ...(item ? { id: item.id } : {}),
        dados: {
          profile_id: form.profile_id,
          data: form.data,
          titulo,
          projeto_id: form.projeto_id || null,
          tarefa_id: form.tarefa_id || null,
          detalhe: form.detalhe,
          horas_previstas: form.horas_previstas ? Number(form.horas_previstas) : 0,
        },
      },
      {
        onSuccess: () => {
          toast.success(item ? "Plano atualizado." : "Tarefa adicionada ao plano do dia.");
          onFechar();
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Não foi possível salvar."),
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4" onClick={onFechar}>
      <form
        onSubmit={enviar}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto scroll-slim rounded-2xl bg-card p-6 shadow-2xl"
      >
        <h2 className="font-display text-[20px] font-bold">{item ? "Editar tarefa do dia" : "Nova tarefa do dia"}</h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          A pessoa vê essas tarefas na tela Meu Trabalho, no dia escolhido.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Campo label="Pessoa">
            <select
              className={inputClasses}
              value={form.profile_id}
              onChange={(e) => setForm({ ...form, profile_id: e.target.value })}
            >
              {equipe.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Dia">
            <input
              type="date"
              className={inputClasses}
              required
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
          </Campo>
          <Campo label="Projeto (opcional)">
            <select
              className={inputClasses}
              value={form.projeto_id}
              onChange={(e) => setForm({ ...form, projeto_id: e.target.value, tarefa_id: "" })}
            >
              <option value="">Sem projeto</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Tarefa existente (opcional)">
            <select
              className={inputClasses}
              value={form.tarefa_id}
              onChange={(e) => {
                const escolhida = tarefas.find((t) => t.id === e.target.value);
                setForm({
                  ...form,
                  tarefa_id: e.target.value,
                  projeto_id: escolhida?.projeto_id ?? form.projeto_id,
                  titulo: form.titulo || escolhida?.titulo || "",
                });
              }}
            >
              <option value="">Nenhuma</option>
              {tarefasDoProjeto.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="O que fazer" className="sm:col-span-2">
            <input
              className={inputClasses}
              value={form.titulo}
              placeholder="Ex.: Finalizar importação de cadastros"
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </Campo>
          <Campo label="Horas previstas">
            <input
              type="number"
              min="0"
              step="0.25"
              className={inputClasses}
              value={form.horas_previstas}
              onChange={(e) => setForm({ ...form, horas_previstas: e.target.value })}
            />
          </Campo>
          <Campo label="Observação" className="sm:col-span-2">
            <textarea
              rows={3}
              className={inputClasses}
              value={form.detalhe}
              onChange={(e) => setForm({ ...form, detalhe: e.target.value })}
            />
          </Campo>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={onFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </BotaoPrimario>
        </div>
      </form>
    </div>
  );
}
