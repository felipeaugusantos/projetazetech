import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { CheckSquare, Link2, Plus, Square, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEquipe, registrarAuditoria, type Tarefa } from "@/lib/dados";
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
import { Avatar, BotaoSecundario, Pill, Progresso, inputClasses } from "@/components/kit";
import { cn } from "@/lib/utils";

export function TarefaDrawer({
  tarefa,
  onFechar,
  nomeProjeto,
}: {
  tarefa: Tarefa;
  onFechar: () => void;
  nomeProjeto?: string;
}) {
  const { perfil, can } = useAuth();
  const queryClient = useQueryClient();
  const { data: equipe } = useEquipe();
  const [comentario, setComentario] = useState("");
  const [novaSubtarefa, setNovaSubtarefa] = useState("");
  const podeEditar = can("tarefa.editar");

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: ["tarefas"] });
    void queryClient.invalidateQueries({ queryKey: ["subtarefas", tarefa.id] });
    void queryClient.invalidateQueries({ queryKey: ["checklists", tarefa.id] });
    void queryClient.invalidateQueries({ queryKey: ["comentarios", tarefa.id] });
  };

  const { data: subtarefas } = useQuery({
    queryKey: ["subtarefas", tarefa.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subtarefas")
        .select("id, titulo, status, prazo, horas_estimadas, responsavel_id")
        .eq("tarefa_id", tarefa.id)
        .is("deleted_at", null)
        .order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: checklists } = useQuery({
    queryKey: ["checklists", tarefa.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklists")
        .select("id, titulo, checklist_itens(id, descricao, concluido, ordem)")
        .eq("tarefa_id", tarefa.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: comentarios } = useQuery({
    queryKey: ["comentarios", tarefa.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comentarios")
        .select("id, conteudo, created_at, profiles:autor_id(nome)")
        .eq("tarefa_id", tarefa.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: dependencias } = useQuery({
    queryKey: ["dependencias", tarefa.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefa_dependencias")
        .select("id, tipo, tarefas:tarefa_relacionada_id(id, titulo, status, prazo)")
        .eq("tarefa_id", tarefa.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const atualizar = useMutation({
    mutationFn: async (patch: Partial<Tarefa>) => {
      const { error } = await supabase
        .from("tarefas")
        .update({
          ...patch,
          ...(patch.status === "concluida" ? { concluida_em: new Date().toISOString() } : {}),
        })
        .eq("id", tarefa.id);
      if (error) throw error;
      if (perfil) {
        const campo = Object.keys(patch)[0];
        await registrarAuditoria({
          tenant_id: perfil.tenant_id,
          profile_id: perfil.id,
          entidade: "tarefa",
          entidade_id: tarefa.id,
          acao: "alterado",
          campo,
          valor_anterior: String((tarefa as Record<string, unknown>)[campo] ?? ""),
          valor_novo: String((patch as Record<string, unknown>)[campo] ?? ""),
          projeto_id: tarefa.projeto_id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Tarefa atualizada.");
      invalidar();
    },
    onError: () => toast.error("Não foi possível salvar a alteração."),
  });

  const totalSub = subtarefas?.length ?? 0;
  const subConcluidas = (subtarefas ?? []).filter((s) => s.status === "concluida").length;
  const itensChecklist = (checklists ?? []).flatMap((c) => c.checklist_itens ?? []);
  const checklistConcluidos = itensChecklist.filter((i) => i.concluido).length;

  async function adicionarSubtarefa() {
    if (!novaSubtarefa.trim() || !perfil) return;
    const { error } = await supabase.from("subtarefas").insert({
      tenant_id: perfil.tenant_id,
      tarefa_id: tarefa.id,
      titulo: novaSubtarefa.trim(),
      ordem: totalSub + 1,
    });
    if (error) toast.error("Não foi possível criar a subtarefa.");
    else {
      setNovaSubtarefa("");
      toast.success("Subtarefa criada.");
      invalidar();
    }
  }

  async function alternarItem(id: string, concluido: boolean) {
    const { error } = await supabase.from("checklist_itens").update({ concluido: !concluido }).eq("id", id);
    if (error) toast.error("Não foi possível atualizar o checklist.");
    else invalidar();
  }

  async function enviarComentario() {
    if (!comentario.trim() || !perfil) return;
    const { error } = await supabase.from("comentarios").insert({
      tenant_id: perfil.tenant_id,
      autor_id: perfil.id,
      tarefa_id: tarefa.id,
      projeto_id: tarefa.projeto_id,
      conteudo: comentario.trim(),
    });
    if (error) {
      toast.error("Não foi possível comentar.");
      return;
    }
    setComentario("");
    invalidar();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/25" onClick={onFechar}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto scroll-slim bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              {nomeProjeto ? (
                <Link
                  to="/projetos/$projetoId"
                  params={{ projetoId: tarefa.projeto_id }}
                  className="font-medium text-brand"
                >
                  {nomeProjeto}
                </Link>
              ) : null}
              {estaAtrasada(tarefa.prazo, tarefa.status) ? (
                <Pill className="bg-danger-soft text-danger">Atrasada</Pill>
              ) : null}
            </div>
            <h2 className="mt-1 font-display text-[20px] leading-tight font-bold">{tarefa.titulo}</h2>
          </div>
          <button onClick={onFechar} aria-label="Fechar">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        {tarefa.descricao ? <p className="mt-3 text-[13px] text-muted-foreground">{tarefa.descricao}</p> : null}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Status</span>
            <select
              className={inputClasses}
              value={tarefa.status}
              disabled={!podeEditar || atualizar.isPending}
              onChange={(e) => atualizar.mutate({ status: e.target.value as TarefaStatus })}
            >
              {KANBAN_COLUNAS.concat(["cancelada"]).map((s) => (
                <option key={s} value={s}>
                  {TAREFA_STATUS[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Prioridade</span>
            <select
              className={inputClasses}
              value={tarefa.prioridade}
              disabled={!podeEditar}
              onChange={(e) => atualizar.mutate({ prioridade: e.target.value as Prioridade })}
            >
              {(Object.keys(PRIORIDADES) as Prioridade[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORIDADES[p].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Responsável</span>
            <select
              className={inputClasses}
              value={tarefa.responsavel_id ?? ""}
              disabled={!can("tarefa.responsavel")}
              onChange={(e) => atualizar.mutate({ responsavel_id: e.target.value || null })}
            >
              <option value="">Sem responsável</option>
              {(equipe ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Prazo</span>
            <input
              type="date"
              className={inputClasses}
              value={tarefa.prazo ?? ""}
              disabled={!can("tarefa.prazo")}
              onChange={(e) => atualizar.mutate({ prazo: e.target.value || null })}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <Pill className="bg-secondary text-muted-foreground">
            Estimado {fmtHoras(tarefa.horas_estimadas)} · Realizado {fmtHoras(tarefa.horas_realizadas)}
          </Pill>
          <Pill className="bg-secondary text-muted-foreground">Início {fmtData(tarefa.data_inicio)}</Pill>
        </div>

        {(dependencias ?? []).length > 0 ? (
          <section className="mt-5">
            <h3 className="font-display text-[14px] font-semibold">Dependências</h3>
            <div className="mt-2 space-y-2">
              {(dependencias ?? []).map((d) => {
                const rel = d.tarefas as { titulo: string; status: TarefaStatus; prazo: string | null } | null;
                if (!rel) return null;
                const atrasada = estaAtrasada(rel.prazo, rel.status);
                return (
                  <div
                    key={d.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-[12px]",
                      atrasada ? "bg-danger-soft text-danger" : "bg-secondary",
                    )}
                  >
                    <Link2 className="size-3.5" />
                    <span className="font-medium">{rel.titulo}</span>
                    <span className="ml-auto">{atrasada ? "dependência atrasada" : TAREFA_STATUS[rel.status].label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[14px] font-semibold">Subtarefas</h3>
            <span className="text-[11px] text-muted-foreground">
              {subConcluidas}/{totalSub} concluídas
            </span>
          </div>
          {totalSub > 0 ? <Progresso valor={(subConcluidas / totalSub) * 100} className="mt-2 h-1.5" /> : null}
          <div className="mt-3 space-y-2">
            {(subtarefas ?? []).map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 rounded-xl bg-secondary/70 px-3 py-2">
                <button
                  disabled={!podeEditar}
                  onClick={async () => {
                    const novo = s.status === "concluida" ? "a_fazer" : "concluida";
                    const { error } = await supabase.from("subtarefas").update({ status: novo }).eq("id", s.id);
                    if (error) toast.error("Não foi possível atualizar.");
                    else invalidar();
                  }}
                >
                  {s.status === "concluida" ? (
                    <CheckSquare className="size-4 text-brand" />
                  ) : (
                    <Square className="size-4 text-muted-foreground" />
                  )}
                </button>
                <span
                  className={cn(
                    "flex-1 text-[12px]",
                    s.status === "concluida" ? "text-muted-foreground line-through" : "font-medium",
                  )}
                >
                  {s.titulo}
                </span>
                <span className="text-[11px] text-muted-foreground">{fmtData(s.prazo)}</span>
                <Avatar
                  nome={(equipe ?? []).find((m) => m.id === s.responsavel_id)?.nome}
                  tone="muted"
                  className="size-6"
                />
              </div>
            ))}
          </div>
          {podeEditar ? (
            <div className="mt-2 flex gap-2">
              <input
                className={inputClasses}
                placeholder="Nova subtarefa"
                value={novaSubtarefa}
                onChange={(e) => setNovaSubtarefa(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionarSubtarefa()}
              />
              <BotaoSecundario onClick={adicionarSubtarefa}>
                <Plus className="size-4" />
              </BotaoSecundario>
            </div>
          ) : null}
        </section>

        {(checklists ?? []).map((c) => (
          <section className="mt-5" key={c.id}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[14px] font-semibold">Checklist — {c.titulo}</h3>
              <span className="text-[11px] text-muted-foreground">
                {checklistConcluidos}/{itensChecklist.length}
              </span>
            </div>
            <div className="mt-2 space-y-2">
              {(c.checklist_itens ?? [])
                .slice()
                .sort((a, b) => a.ordem - b.ordem)
                .map((item) => (
                  <button
                    key={item.id}
                    disabled={!podeEditar}
                    onClick={() => alternarItem(item.id, item.concluido)}
                    className="flex w-full items-center gap-2.5 text-left"
                  >
                    {item.concluido ? (
                      <CheckSquare className="size-4 shrink-0 text-brand" />
                    ) : (
                      <Square className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        "text-[12px]",
                        item.concluido ? "text-muted-foreground line-through" : "font-medium",
                      )}
                    >
                      {item.descricao}
                    </span>
                  </button>
                ))}
            </div>
            {itensChecklist.length ? (
              <Progresso valor={(checklistConcluidos / itensChecklist.length) * 100} className="mt-3 h-1.5" />
            ) : null}
          </section>
        ))}

        <section className="mt-6">
          <h3 className="font-display text-[14px] font-semibold">Comentários</h3>
          <div className="mt-3 space-y-3">
            {(comentarios ?? []).length === 0 ? (
              <p className="text-[12px] text-muted-foreground">Nenhum comentário ainda.</p>
            ) : (
              (comentarios ?? []).map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar nome={(c.profiles as { nome?: string } | null)?.nome} className="size-8 rounded-lg" />
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold">
                      {(c.profiles as { nome?: string } | null)?.nome ?? "Usuário"}
                      <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                        {fmtData(c.created_at, "dd MMM · HH:mm")}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{c.conteudo}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className={inputClasses}
              placeholder="Escreva um comentário e use @ para mencionar"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviarComentario()}
            />
            <BotaoSecundario onClick={enviarComentario}>Enviar</BotaoSecundario>
          </div>
        </section>
      </div>
    </div>
  );
}
