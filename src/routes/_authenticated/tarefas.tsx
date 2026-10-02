import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Columns3, List, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEquipe, useProjetos, useTarefas, type Tarefa } from "@/lib/dados";
import {
  KANBAN_COLUNAS,
  PRIORIDADES,
  TAREFA_STATUS,
  estaAtrasada,
  fmtData,
  fmtHoras,
  type Prioridade,
  type TarefaStatus,
} from "@/lib/enzova";
import {
  Avatar,
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Painel,
  Pill,
  TituloPagina,
  Vazio,
  inputClasses,
} from "@/components/kit";
import { TarefaDrawer } from "@/components/tarefa-drawer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({
    meta: [
      { title: "Tarefas · Projeta" },
      { name: "description", content: "Kanban e lista de tarefas com prioridade, responsável, prazo e horas." },
      { property: "og:title", content: "Tarefas" },
      { property: "og:description", content: "Kanban e lista de tarefas dos projetos da empresa." },
    ],
  }),
  component: Tarefas,
});

export function QuadroTarefas({
  tarefas,
  nomesProjetos,
  onSelecionar,
}: {
  tarefas: Tarefa[];
  nomesProjetos: Map<string, string>;
  onSelecionar: (t: Tarefa) => void;
}) {
  const { perfil, can } = useAuth();
  const { data: equipe = [] } = useEquipe();
  const queryClient = useQueryClient();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const nomePorId = useMemo(() => new Map(equipe.map((m) => [m.id, m.nome])), [equipe]);

  async function mover(tarefaId: string, status: TarefaStatus) {
    const tarefa = tarefas.find((t) => t.id === tarefaId);
    if (!tarefa || tarefa.status === status) return;
    if (!can("tarefa.editar")) {
      toast.error("Seu perfil não pode alterar o status das tarefas.");
      return;
    }
    const { error } = await supabase
      .from("tarefas")
      .update({ status, ...(status === "concluida" ? { concluida_em: new Date().toISOString() } : {}) })
      .eq("id", tarefaId);
    if (error) {
      toast.error("Não foi possível mover a tarefa.");
      return;
    }
    toast.success(`Tarefa movida para ${TAREFA_STATUS[status].label}.`);
    void queryClient.invalidateQueries({ queryKey: ["tarefas"] });
  }

  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {KANBAN_COLUNAS.map((coluna) => {
        const daColuna = tarefas.filter((t) => t.status === coluna);
        return (
          <div
            key={coluna}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (arrastando) void mover(arrastando, coluna);
              setArrastando(null);
            }}
            className="frost-soft rounded-2xl p-2.5"
          >
            <div className="mb-2.5 flex items-center justify-between px-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">{TAREFA_STATUS[coluna].label}</span>
              <span className="rounded bg-secondary px-1.5 text-[10px] font-medium text-muted-foreground">
                {daColuna.length}
              </span>
            </div>
            <div className="space-y-2">
              {daColuna.map((t) => {
                const atrasada = estaAtrasada(t.prazo, t.status);
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setArrastando(t.id)}
                    onClick={() => onSelecionar(t)}
                    className={cn(
                      "cursor-pointer rounded-xl bg-card p-2.5 shadow-sm transition hover:-translate-y-0.5",
                      atrasada && "ring-1 ring-danger/30",
                    )}
                  >
                    <div className="text-[12px] leading-snug font-medium">{t.titulo}</div>
                    <div className="mt-1 truncate text-[10px] text-muted-foreground">
                      {nomesProjetos.get(t.projeto_id) ?? "Projeto"}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Pill className={PRIORIDADES[t.prioridade].pill}>{PRIORIDADES[t.prioridade].label}</Pill>
                      {t.prazo ? (
                        <span className={cn("text-[10px]", atrasada ? "font-semibold text-danger" : "text-muted-foreground")}>
                          {fmtData(t.prazo)}
                        </span>
                      ) : null}
                      <Avatar nome={nomePorId.get(t.responsavel_id ?? "")} className="ml-auto size-6" tone="muted" />
                    </div>
                  </div>
                );
              })}
              {daColuna.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-2 py-4 text-center text-[10px] text-muted-foreground">
                  arraste aqui
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ListaTarefas({
  tarefas,
  nomesProjetos,
  onSelecionar,
}: {
  tarefas: Tarefa[];
  nomesProjetos: Map<string, string>;
  onSelecionar: (t: Tarefa) => void;
}) {
  const { data: equipe = [] } = useEquipe();
  const nomePorId = useMemo(() => new Map(equipe.map((m) => [m.id, m.nome])), [equipe]);

  if (!tarefas.length) return <Vazio titulo="Nenhuma tarefa encontrada" descricao="Ajuste os filtros." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl border-collapse text-left">
        <thead>
          <tr className="text-[10px] tracking-wide text-muted-foreground uppercase">
            <th className="px-4 py-2 font-medium">Tarefa</th>
            <th className="px-3 py-2 font-medium">Projeto</th>
            <th className="px-3 py-2 font-medium">Responsável</th>
            <th className="px-3 py-2 font-medium">Prioridade</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Início</th>
            <th className="px-3 py-2 font-medium">Prazo</th>
            <th className="px-3 py-2 text-right font-medium">Horas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tarefas.map((t) => {
            const atrasada = estaAtrasada(t.prazo, t.status);
            return (
              <tr key={t.id} onClick={() => onSelecionar(t)} className="cursor-pointer text-[12px] hover:bg-secondary/60">
                <td className="px-4 py-2.5 font-medium">{t.titulo}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{nomesProjetos.get(t.projeto_id) ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1.5">
                    <Avatar nome={nomePorId.get(t.responsavel_id ?? "")} className="size-6" tone="muted" />
                    <span className="text-muted-foreground">{nomePorId.get(t.responsavel_id ?? "") ?? "—"}</span>
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Pill className={PRIORIDADES[t.prioridade].pill}>{PRIORIDADES[t.prioridade].label}</Pill>
                </td>
                <td className="px-3 py-2.5">
                  <Pill className={TAREFA_STATUS[t.status].pill}>{TAREFA_STATUS[t.status].label}</Pill>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmtData(t.data_inicio)}</td>
                <td className={cn("px-3 py-2.5", atrasada ? "font-semibold text-danger" : "text-muted-foreground")}>
                  {fmtData(t.prazo)}
                </td>
                <td className="px-3 py-2.5 text-right text-muted-foreground">
                  {fmtHoras(t.horas_realizadas)}/{fmtHoras(t.horas_estimadas)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Tarefas() {
  const { can } = useAuth();
  const { data: tarefas = [], isLoading } = useTarefas();
  const { data: projetos = [] } = useProjetos();
  const { data: equipe = [] } = useEquipe();
  const [visao, setVisao] = useState<"kanban" | "lista">("kanban");
  const [projetoFiltro, setProjetoFiltro] = useState("");
  const [responsavelFiltro, setResponsavelFiltro] = useState("");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState("");
  const [selecionada, setSelecionada] = useState<Tarefa | null>(null);
  const [nova, setNova] = useState(false);

  const nomesProjetos = useMemo(() => new Map(projetos.map((p) => [p.id, p.nome])), [projetos]);

  const filtradas = useMemo(
    () =>
      tarefas.filter(
        (t) =>
          (!projetoFiltro || t.projeto_id === projetoFiltro) &&
          (!responsavelFiltro || t.responsavel_id === responsavelFiltro) &&
          (!prioridadeFiltro || t.prioridade === prioridadeFiltro),
      ),
    [tarefas, projetoFiltro, responsavelFiltro, prioridadeFiltro],
  );

  return (
    <>
      <TituloPagina
        sobretitulo={<>{filtradas.length} tarefas no filtro atual</>}
        titulo="Tarefas"
        acoes={
          <>
            <div className="frost-soft flex rounded-xl p-1">
              <button
                onClick={() => setVisao("kanban")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium",
                  visao === "kanban" ? "bg-card text-brand shadow-sm" : "text-muted-foreground",
                )}
              >
                <Columns3 className="size-3.5" /> Kanban
              </button>
              <button
                onClick={() => setVisao("lista")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium",
                  visao === "lista" ? "bg-card text-brand shadow-sm" : "text-muted-foreground",
                )}
              >
                <List className="size-3.5" /> Lista
              </button>
            </div>
            <select className={`${inputClasses} w-auto`} value={projetoFiltro} onChange={(e) => setProjetoFiltro(e.target.value)}>
              <option value="">Todos os projetos</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
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
            <select
              className={`${inputClasses} w-auto`}
              value={prioridadeFiltro}
              onChange={(e) => setPrioridadeFiltro(e.target.value)}
            >
              <option value="">Todas as prioridades</option>
              {(Object.keys(PRIORIDADES) as Prioridade[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORIDADES[p].label}
                </option>
              ))}
            </select>
            {can("tarefa.criar") ? (
              <BotaoPrimario onClick={() => setNova(true)}>
                <Plus className="size-4" /> Nova tarefa
              </BotaoPrimario>
            ) : null}
          </>
        }
      />

      {isLoading ? (
        <Painel>
          <Vazio titulo="Carregando tarefas…" />
        </Painel>
      ) : visao === "kanban" ? (
        <QuadroTarefas tarefas={filtradas} nomesProjetos={nomesProjetos} onSelecionar={setSelecionada} />
      ) : (
        <Painel padded={false} className="py-2">
          <ListaTarefas tarefas={filtradas} nomesProjetos={nomesProjetos} onSelecionar={setSelecionada} />
        </Painel>
      )}

      {selecionada ? (
        <TarefaDrawer
          tarefa={selecionada}
          nomeProjeto={nomesProjetos.get(selecionada.projeto_id)}
          onFechar={() => setSelecionada(null)}
        />
      ) : null}

      {nova ? (
        <NovaTarefaModal
          onFechar={() => setNova(false)}
          projetos={projetos.map((p) => ({ id: p.id, nome: p.nome }))}
          projetoPadrao={projetoFiltro || projetos[0]?.id}
        />
      ) : null}
    </>
  );
}

export function NovaTarefaModal({
  onFechar,
  projetos,
  projetoPadrao,
  faseId,
}: {
  onFechar: () => void;
  projetos: { id: string; nome: string }[];
  projetoPadrao?: string | undefined;
  faseId?: string | null | undefined;
}) {
  const { perfil } = useAuth();
  const { data: equipe = [] } = useEquipe();
  const queryClient = useQueryClient();
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    projeto_id: projetoPadrao ?? "",
    responsavel_id: perfil?.id ?? "",
    prioridade: "normal" as Prioridade,
    status: "a_fazer" as TarefaStatus,
    prazo: "",
    horas_estimadas: "",
    descricao: "",
  });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!perfil) return;
    setSalvando(true);
    try {
      const { error } = await supabase.from("tarefas").insert({
        tenant_id: perfil.tenant_id,
        projeto_id: form.projeto_id,
        fase_id: faseId ?? null,
        titulo: form.titulo,
        descricao: form.descricao || null,
        responsavel_id: form.responsavel_id || null,
        prioridade: form.prioridade,
        status: form.status,
        prazo: form.prazo || null,
        horas_estimadas: form.horas_estimadas ? Number(form.horas_estimadas) : 0,
      });
      if (error) throw error;
      toast.success("Tarefa criada com sucesso.");
      void queryClient.invalidateQueries({ queryKey: ["tarefas"] });
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar a tarefa.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4" onClick={onFechar}>
      <form
        onSubmit={salvar}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-card p-6 shadow-2xl"
      >
        <h2 className="font-display text-[20px] font-bold">Nova tarefa</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Campo label="Título" className="sm:col-span-2">
            <input
              className={inputClasses}
              required
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </Campo>
          <Campo label="Projeto">
            <select
              className={inputClasses}
              required
              value={form.projeto_id}
              onChange={(e) => setForm({ ...form, projeto_id: e.target.value })}
            >
              <option value="">Selecione</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Responsável">
            <select
              className={inputClasses}
              value={form.responsavel_id}
              onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}
            >
              <option value="">Sem responsável</option>
              {equipe.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Prioridade">
            <select
              className={inputClasses}
              value={form.prioridade}
              onChange={(e) => setForm({ ...form, prioridade: e.target.value as Prioridade })}
            >
              {(Object.keys(PRIORIDADES) as Prioridade[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORIDADES[p].label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Status">
            <select
              className={inputClasses}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TarefaStatus })}
            >
              {KANBAN_COLUNAS.map((s) => (
                <option key={s} value={s}>
                  {TAREFA_STATUS[s].label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Prazo">
            <input
              type="date"
              className={inputClasses}
              value={form.prazo}
              onChange={(e) => setForm({ ...form, prazo: e.target.value })}
            />
          </Campo>
          <Campo label="Horas estimadas">
            <input
              type="number"
              min={0}
              className={inputClasses}
              value={form.horas_estimadas}
              onChange={(e) => setForm({ ...form, horas_estimadas: e.target.value })}
            />
          </Campo>
          <Campo label="Descrição" className="sm:col-span-2">
            <textarea
              className={`${inputClasses} min-h-20`}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </Campo>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={onFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Criar tarefa"}
          </BotaoPrimario>
        </div>
      </form>
    </div>
  );
}
