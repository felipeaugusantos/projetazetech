import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Columns3, List, MessageSquare, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  useApontamentos,
  useDespesas,
  useEquipe,
  useFases,
  useMarcos,
  useOrcamentoItens,
  useProjeto,
  useTarefas,
  type Tarefa,
} from "@/lib/dados";
import {
  DESPESA_STATUS,
  FASE_STATUS,
  MARCO_STATUS,
  ORCAMENTO_TIPO,
  PRIORIDADES,
  PROJETO_STATUS,
  SAUDE,
  calcularSaude,
  diasRestantes,
  fmtData,
  fmtDataLonga,
  fmtHoras,
  fmtMoeda,
  margem,
  type ProjetoStatus,
} from "@/lib/enzova";
import {
  Avatar,
  BotaoPrimario,
  BotaoSecundario,
  Indicador,
  Painel,
  Pill,
  Progresso,
  TituloPagina,
  Vazio,
  inputClasses,
} from "@/components/kit";
import { TarefaDrawer } from "@/components/tarefa-drawer";
import { ListaTarefas, NovaTarefaModal, QuadroTarefas } from "@/routes/_authenticated/tarefas";
import { DocumentosProjeto } from "@/components/documentos-projeto";
import { RelatorioLinks } from "@/components/relatorio-links";
import { ConversaEntregaInterna } from "@/components/conversa-entrega";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projetos/$projetoId")({
  head: () => ({
    meta: [
      { title: "Detalhe do projeto · Projeta" },
      { name: "description", content: "Fases, tarefas, equipe, riscos e histórico do projeto." },
      { property: "og:title", content: "Detalhe do projeto" },
      { property: "og:description", content: "Fases, tarefas, equipe e riscos do projeto." },
    ],
  }),
  component: DetalheProjeto,
});

type Aba =
  | "visao"
  | "fases"
  | "tarefas"
  | "equipe"
  | "entregas"
  | "documentos"
  | "orcamento"
  | "riscos"
  | "historico";

const ABAS: { id: Aba; label: string }[] = [
  { id: "visao", label: "Visão geral" },
  { id: "fases", label: "Fases" },
  { id: "tarefas", label: "Tarefas" },
  { id: "equipe", label: "Equipe" },
  { id: "entregas", label: "Entregas" },
  { id: "documentos", label: "Documentos" },
  { id: "orcamento", label: "Orçamento" },
  { id: "riscos", label: "Riscos" },
  { id: "historico", label: "Histórico" },
];


function DetalheProjeto() {
  const { projetoId } = Route.useParams();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { data: projeto, isLoading } = useProjeto(projetoId);
  const { data: tarefas = [] } = useTarefas(projetoId);
  const { data: fases = [] } = useFases(projetoId);
  const [aba, setAba] = useState<Aba>("visao");
  const [visao, setVisao] = useState<"kanban" | "lista">("kanban");
  const [selecionada, setSelecionada] = useState<Tarefa | null>(null);
  const [nova, setNova] = useState(false);

  const saude = useMemo(
    () => (projeto ? calcularSaude(projeto, tarefas) : null),
    [projeto, tarefas],
  );
  const nomesProjetos = useMemo(
    () => new Map(projeto ? [[projeto.id, projeto.nome] as [string, string]] : []),
    [projeto],
  );

  async function alterarStatus(status: ProjetoStatus) {
    const { error } = await supabase.from("projetos").update({ status }).eq("id", projetoId);
    if (error) {
      toast.error("Não foi possível alterar o status.");
      return;
    }
    toast.success("Status do projeto atualizado.");
    void queryClient.invalidateQueries({ queryKey: ["projeto", projetoId] });
    void queryClient.invalidateQueries({ queryKey: ["projetos"] });
  }

  if (isLoading) {
    return (
      <Painel>
        <Vazio titulo="Carregando projeto…" />
      </Painel>
    );
  }

  if (!projeto || !saude) {
    return (
      <Painel>
        <Vazio titulo="Projeto não encontrado" descricao="Ele pode ter sido removido ou pertence a outra empresa." />
      </Painel>
    );
  }

  const dias = diasRestantes(projeto.prazo);

  return (
    <>
      <Link to="/projetos" className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-brand">
        <ArrowLeft className="size-3.5" /> Voltar para projetos
      </Link>

      <TituloPagina
        sobretitulo={
          <>
            {projeto.codigo} ·{" "}
            {projeto.cliente_id ? (
              <Link to="/clientes/$clienteId" params={{ clienteId: projeto.cliente_id }} className="hover:text-brand">
                {projeto.clientes?.nome}
              </Link>
            ) : (
              "Sem cliente"
            )}
          </>
        }
        titulo={projeto.nome}
        descricao={projeto.descricao ?? undefined}
        acoes={
          can("projeto.editar") ? (
            <select
              className={`${inputClasses} w-auto`}
              value={projeto.status}
              onChange={(e) => void alterarStatus(e.target.value as ProjetoStatus)}
            >
              {(Object.keys(PROJETO_STATUS) as ProjetoStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PROJETO_STATUS[s].label}
                </option>
              ))}
            </select>
          ) : (
            <Pill className={PROJETO_STATUS[projeto.status].pill}>{PROJETO_STATUS[projeto.status].label}</Pill>
          )
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          titulo="Progresso das tarefas"
          valor={`${saude.tarefasConcluidas}%`}
          detalhe={`${saude.totalTarefas} tarefas · ${saude.tarefasAtrasadas} atrasadas`}
          progresso={saude.tarefasConcluidas}
        />
        <Indicador
          titulo="Prazo"
          valor={fmtData(projeto.prazo)}
          detalhe={dias === null ? "Sem prazo definido" : dias >= 0 ? `${dias} dias restantes` : `${Math.abs(dias)} dias em atraso`}
          tom={dias !== null && dias < 0 ? "negativo" : "neutro"}
          progresso={saude.prazoConsumido}
        />
        <Indicador
          titulo="Horas"
          valor={fmtHoras(saude.horasRealizadas)}
          detalhe={`de ${fmtHoras(projeto.horas_previstas)} previstas`}
          tom={saude.horasConsumidas >= 100 ? "negativo" : saude.horasConsumidas >= 85 ? "atencao" : "neutro"}
          progresso={saude.horasConsumidas}
        />
        <Indicador
          titulo="Saúde do projeto"
          valor={SAUDE[saude.nivel].label}
          detalhe={saude.motivos[0]}
          tom={saude.nivel === "saudavel" ? "positivo" : saude.nivel === "atencao" ? "atencao" : "negativo"}
        />
      </div>

      <div className="frost-soft mb-5 flex flex-wrap gap-1 rounded-xl p-1">
        {ABAS.filter((a) => a.id !== "orcamento" || can("financeiro.ver")).map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              "rounded-lg px-3.5 py-2 text-[12px] font-medium transition",
              aba === a.id ? "bg-card text-brand shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === "visao" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Painel className="lg:col-span-2">
            <h2 className="font-display text-[15px] font-bold">Resumo do projeto</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="Cliente" valor={projeto.clientes?.nome ?? "—"} />
              <Info label="Gerente responsável" valor={projeto.gerente?.nome ?? "—"} />
              <Info label="Prioridade" valor={PRIORIDADES[projeto.prioridade].label} />
              <Info label="Status" valor={PROJETO_STATUS[projeto.status].label} />
              <Info label="Início" valor={fmtDataLonga(projeto.data_inicio)} />
              <Info label="Prazo" valor={fmtDataLonga(projeto.prazo)} />
              {can("financeiro.ver") ? (
                <>
                  <Info label="Orçamento" valor={fmtMoeda(projeto.orcamento)} />
                  <Info label="Custo previsto" valor={fmtMoeda(projeto.custo_previsto)} />
                </>
              ) : null}
            </dl>
            {projeto.descricao ? (
              <p className="mt-5 border-t border-border pt-4 text-[13px] leading-relaxed text-muted-foreground">
                {projeto.descricao}
              </p>
            ) : null}
          </Painel>

          <Painel>
            <h2 className="font-display text-[15px] font-bold">Por que esta saúde?</h2>
            <ul className="mt-3 space-y-2">
              {saude.motivos.map((m) => (
                <li key={m} className="flex gap-2 text-[12px] text-muted-foreground">
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", SAUDE[saude.nivel].dot)} />
                  {m}
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-[12px] font-semibold text-muted-foreground">Fases</h3>
            <div className="mt-2 space-y-2.5">
              {fases.map((f) => (
                <div key={f.id}>
                  <div className="flex justify-between text-[12px]">
                    <span className="font-medium">{f.nome}</span>
                    <span className="text-muted-foreground">{f.progresso}%</span>
                  </div>
                  <Progresso valor={f.progresso} className="mt-1 h-1.5" />
                </div>
              ))}
              {fases.length === 0 ? <div className="text-[12px] text-muted-foreground">Nenhuma fase cadastrada.</div> : null}
            </div>
          </Painel>
        </div>
      ) : null}

      {aba === "fases" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {fases.map((f) => {
            const daFase = tarefas.filter((t) => t.fase_id === f.id);
            const concluidas = daFase.filter((t) => t.status === "concluida").length;
            return (
              <Painel key={f.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Fase {f.ordem}</div>
                    <div className="font-display text-[15px] font-bold">{f.nome}</div>
                  </div>
                  <Pill className={FASE_STATUS[f.status].pill}>{FASE_STATUS[f.status].label}</Pill>
                </div>
                <Progresso valor={f.progresso} className="mt-3" />
                <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    {concluidas}/{daFase.length} tarefas
                  </span>
                  <span>
                    {fmtData(f.data_inicio)} – {fmtData(f.prazo)}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {daFase.slice(0, 4).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelecionada(t)}
                      className="block w-full truncate rounded-lg bg-secondary/70 px-2.5 py-1.5 text-left text-[12px] hover:bg-secondary"
                    >
                      {t.titulo}
                    </button>
                  ))}
                  {daFase.length > 4 ? (
                    <div className="text-[11px] text-muted-foreground">+{daFase.length - 4} outras tarefas</div>
                  ) : null}
                </div>
              </Painel>
            );
          })}
          {fases.length === 0 ? (
            <Painel className="md:col-span-2 xl:col-span-3">
              <Vazio titulo="Nenhuma fase cadastrada" descricao="Crie fases para organizar as entregas do projeto." />
            </Painel>
          ) : null}
        </div>
      ) : null}

      {aba === "tarefas" ? (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
            {can("tarefa.criar") ? (
              <BotaoPrimario onClick={() => setNova(true)}>
                <Plus className="size-4" /> Nova tarefa
              </BotaoPrimario>
            ) : null}
          </div>
          {visao === "kanban" ? (
            <QuadroTarefas tarefas={tarefas} nomesProjetos={nomesProjetos} onSelecionar={setSelecionada} />
          ) : (
            <Painel padded={false} className="py-2">
              <ListaTarefas tarefas={tarefas} nomesProjetos={nomesProjetos} onSelecionar={setSelecionada} />
            </Painel>
          )}
        </>
      ) : null}

      {aba === "equipe" ? <EquipeProjeto projetoId={projetoId} tarefas={tarefas} /> : null}
      {aba === "documentos" ? (
        <div className="space-y-4">
          <DocumentosProjeto projetoId={projetoId} />
          <RelatorioLinks projetoId={projetoId} />
        </div>
      ) : null}
      {aba === "entregas" ? <EntregasProjeto projetoId={projetoId} /> : null}
      {aba === "orcamento" && can("financeiro.ver") ? <OrcamentoProjeto projetoId={projetoId} /> : null}

      {aba === "riscos" ? <RiscosProjeto projetoId={projetoId} /> : null}
      {aba === "historico" ? <HistoricoProjeto projetoId={projetoId} /> : null}

      {selecionada ? (
        <TarefaDrawer tarefa={selecionada} nomeProjeto={projeto.nome} onFechar={() => setSelecionada(null)} />
      ) : null}
      {nova ? (
        <NovaTarefaModal
          onFechar={() => setNova(false)}
          projetos={[{ id: projeto.id, nome: projeto.nome }]}
          projetoPadrao={projeto.id}
        />
      ) : null}
    </>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-semibold">{valor}</dd>
    </div>
  );
}

function EquipeProjeto({ projetoId, tarefas }: { projetoId: string; tarefas: Tarefa[] }) {
  const { perfil, can } = useAuth();
  const { data: equipe = [] } = useEquipe();
  const queryClient = useQueryClient();
  const [adicionar, setAdicionar] = useState("");

  const { data: membros = [] } = useQuery({
    queryKey: ["projeto-membros", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_membros")
        .select("id, profile_id, papel, percentual_alocacao, profiles(id, nome, cargo)")
        .eq("projeto_id", projetoId);
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        profile_id: string;
        papel: string | null;
        percentual_alocacao: number | null;
        profiles: { id: string; nome: string; cargo: string | null } | null;
      }[];
    },
  });

  async function incluir() {
    if (!adicionar || !perfil) return;
    const { error } = await supabase.from("projeto_membros").insert({
      tenant_id: perfil.tenant_id,
      projeto_id: projetoId,
      profile_id: adicionar,
      papel: "Colaborador",
      percentual_alocacao: 50,
    });
    if (error) {
      toast.error("Não foi possível incluir o membro.");
      return;
    }
    toast.success("Membro incluído no projeto.");
    setAdicionar("");
    void queryClient.invalidateQueries({ queryKey: ["projeto-membros", projetoId] });
  }

  async function remover(id: string) {
    const { error } = await supabase.from("projeto_membros").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover o membro.");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["projeto-membros", projetoId] });
  }

  const disponiveis = equipe.filter((m) => !membros.some((x) => x.profile_id === m.id));

  return (
    <Painel>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-[15px] font-bold">Equipe alocada</h2>
        {can("projeto.editar") ? (
          <div className="flex gap-2">
            <select className={`${inputClasses} w-auto`} value={adicionar} onChange={(e) => setAdicionar(e.target.value)}>
              <option value="">Adicionar pessoa…</option>
              {disponiveis.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
            <BotaoSecundario onClick={() => void incluir()} disabled={!adicionar}>
              Incluir
            </BotaoSecundario>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {membros.map((m) => {
          const suas = tarefas.filter((t) => t.responsavel_id === m.profile_id);
          const abertas = suas.filter((t) => t.status !== "concluida" && t.status !== "cancelada").length;
          return (
            <div key={m.id} className="frost-soft rounded-xl p-3.5">
              <div className="flex items-center gap-2.5">
                <Avatar nome={m.profiles?.nome} className="size-9 text-[12px]" />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold">{m.profiles?.nome}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {m.papel ?? m.profiles?.cargo ?? "Colaborador"}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
                <span>{suas.length} tarefas · {abertas} abertas</span>
                <span>{m.percentual_alocacao ?? 0}% alocado</span>
              </div>
              <Progresso valor={Number(m.percentual_alocacao ?? 0)} className="mt-2 h-1.5" />
              {can("projeto.editar") ? (
                <button
                  onClick={() => void remover(m.id)}
                  className="mt-2.5 text-[11px] font-medium text-danger hover:underline"
                >
                  Remover do projeto
                </button>
              ) : null}
            </div>
          );
        })}
        {membros.length === 0 ? (
          <div className="sm:col-span-2 xl:col-span-3">
            <Vazio titulo="Nenhum membro alocado" descricao="Inclua pessoas para distribuir as tarefas do projeto." />
          </div>
        ) : null}
      </div>
    </Painel>
  );
}

function RiscosProjeto({ projetoId }: { projetoId: string }) {
  const { data: riscos = [] } = useQuery({
    queryKey: ["riscos", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("riscos")
        .select("id, descricao, probabilidade, impacto, status, plano_mitigacao, profiles(nome)")
        .eq("projeto_id", projetoId)
        .is("deleted_at", null);
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        descricao: string;
        probabilidade: string;
        impacto: string;
        status: string;
        plano_mitigacao: string | null;
        profiles: { nome: string } | null;
      }[];
    },
  });

  const cor = (nivel: string) =>
    nivel === "critico" || nivel === "alto" ? "bg-danger-soft text-danger" : nivel === "medio" ? "bg-warning-soft text-warning" : "bg-success-soft text-success";

  return (
    <Painel>
      <h2 className="font-display text-[15px] font-bold">Riscos monitorados</h2>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Matriz completa de riscos e mitigação evolui na Fase 2.
      </p>
      <div className="mt-4 space-y-2.5">
        {riscos.map((r) => (
          <div key={r.id} className="frost-soft rounded-xl p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <Pill className={cor(r.probabilidade)}>Probabilidade {r.probabilidade}</Pill>
              <Pill className={cor(r.impacto)}>Impacto {r.impacto}</Pill>
              <span className="text-[11px] text-muted-foreground">{r.status}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">{r.profiles?.nome ?? "—"}</span>
            </div>
            <div className="mt-2 text-[13px] font-medium">{r.descricao}</div>
            {r.plano_mitigacao ? (
              <div className="mt-1 text-[12px] text-muted-foreground">Mitigação: {r.plano_mitigacao}</div>
            ) : null}
          </div>
        ))}
        {riscos.length === 0 ? <Vazio titulo="Nenhum risco registrado" /> : null}
      </div>
    </Painel>
  );
}

function HistoricoProjeto({ projetoId }: { projetoId: string }) {
  const { data: itens = [] } = useQuery({
    queryKey: ["auditoria", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auditoria")
        .select("id, entidade, acao, campo, valor_anterior, valor_novo, created_at, profiles(nome)")
        .eq("projeto_id", projetoId)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        entidade: string;
        acao: string;
        campo: string | null;
        valor_anterior: string | null;
        valor_novo: string | null;
        created_at: string;
        profiles: { nome: string } | null;
      }[];
    },
  });

  return (
    <Painel>
      <h2 className="font-display text-[15px] font-bold">Histórico de alterações</h2>
      <ol className="mt-4 space-y-3 border-l border-border pl-4">
        {itens.map((i) => (
          <li key={i.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-brand" />
            <div className="text-[12px] font-medium">
              {i.profiles?.nome ?? "Sistema"} · {i.entidade} {i.acao}
              {i.campo ? ` (${i.campo})` : ""}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {i.valor_anterior || i.valor_novo ? `${i.valor_anterior ?? "—"} → ${i.valor_novo ?? "—"} · ` : ""}
              {fmtData(i.created_at, "dd MMM yyyy HH:mm")}
            </div>
          </li>
        ))}
        {itens.length === 0 ? <Vazio titulo="Nenhum registro de histórico ainda" /> : null}
      </ol>
    </Painel>
  );
}

/* ======================= Orçamento do projeto ======================= */

function OrcamentoProjeto({ projetoId }: { projetoId: string }) {
  const { data: itens = [] } = useOrcamentoItens(projetoId);
  const { data: despesas = [] } = useDespesas({ projetoId });
  const { data: apontamentos = [] } = useApontamentos();

  const receita = itens
    .filter((i) => i.tipo === "receita")
    .reduce((acc, i) => acc + Number(i.quantidade) * Number(i.valor_unitario), 0);
  const custoOrcado = itens
    .filter((i) => i.tipo === "custo")
    .reduce((acc, i) => acc + Number(i.quantidade) * Number(i.valor_unitario), 0);

  const horas = apontamentos.filter((a) => a.projeto_id === projetoId && a.status === "aprovado");
  const custoHoras = horas.reduce((acc, a) => acc + Number(a.horas) * Number(a.profiles?.custo_hora ?? 0), 0);
  const custoDespesas = despesas
    .filter((d) => d.status === "aprovada")
    .reduce((acc, d) => acc + Number(d.valor), 0);
  const custoRealizado = custoHoras + custoDespesas;
  const m = margem(receita, custoRealizado);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Receita orçada" valor={fmtMoeda(receita)} />
        <Indicador titulo="Custo orçado" valor={fmtMoeda(custoOrcado)} />
        <Indicador
          titulo="Custo realizado"
          valor={fmtMoeda(custoRealizado)}
          detalhe={`${fmtMoeda(custoHoras)} em horas · ${fmtMoeda(custoDespesas)} em despesas`}
          tom={custoOrcado && custoRealizado > custoOrcado ? "negativo" : "neutro"}
          progresso={custoOrcado ? (custoRealizado / custoOrcado) * 100 : 0}
        />
        <Indicador
          titulo="Margem realizada"
          valor={fmtMoeda(m.valor)}
          detalhe={`${m.pct}% da receita`}
          tom={m.valor >= 0 ? "positivo" : "negativo"}
        />
      </div>

      <Painel padded={false} className="py-2">
        <div className="px-4 pt-2 pb-1 font-display text-[15px] font-bold">Linhas do orçamento</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-left">
            <thead>
              <tr className="text-[10px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2 font-medium">Descrição</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Categoria</th>
                <th className="px-3 py-2 font-medium">Fase</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {itens.map((i) => (
                <tr key={i.id} className="text-[12px]">
                  <td className="px-4 py-2.5 font-medium">{i.descricao}</td>
                  <td className="px-3 py-2.5">
                    <Pill className={ORCAMENTO_TIPO[i.tipo].pill}>{ORCAMENTO_TIPO[i.tipo].label}</Pill>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{i.categoria}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{i.projeto_fases?.nome ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">
                    {fmtMoeda(Number(i.quantidade) * Number(i.valor_unitario))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {itens.length === 0 ? (
            <Vazio titulo="Sem orçamento" descricao="Monte as linhas de receita e custo na tela Financeiro." />
          ) : null}
        </div>
      </Painel>

      <Painel padded={false} className="py-2">
        <div className="px-4 pt-2 pb-1 font-display text-[15px] font-bold">Despesas do projeto</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-left">
            <thead>
              <tr className="text-[10px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2 font-medium">Despesa</th>
                <th className="px-3 py-2 font-medium">Quem lançou</th>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 text-right font-medium">Valor</th>
                <th className="px-3 py-2 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {despesas.map((d) => (
                <tr key={d.id} className="text-[12px]">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{d.descricao}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {d.categoria}
                      {d.fornecedor ? ` · ${d.fornecedor}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{d.profiles?.nome ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{fmtData(d.data)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">{fmtMoeda(Number(d.valor))}</td>
                  <td className="px-3 py-2.5">
                    <Pill className={DESPESA_STATUS[d.status].pill}>{DESPESA_STATUS[d.status].label}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {despesas.length === 0 ? <Vazio titulo="Nenhuma despesa lançada" /> : null}
        </div>
      </Painel>
    </div>
  );
}

function EntregasProjeto({ projetoId }: { projetoId: string }) {
  const { data: marcos = [] } = useMarcos(projetoId);
  const [aberta, setAberta] = useState<string | null>(null);

  return (
    <Painel>
      <h2 className="font-display text-[15px] font-bold">Entregas e aprovações</h2>
      <p className="text-[12px] text-muted-foreground">
        Converse com o cliente sobre cada entrega e anexe arquivos antes da aprovação.
      </p>
      <div className="mt-3 divide-y divide-border/70">
        {marcos.map((m) => {
          const st = MARCO_STATUS[m.status];
          return (
            <div key={m.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-semibold">{m.nome}</span>
                    <Pill className={st.pill}>{st.label}</Pill>
                    {m.entrega_cliente ? (
                      <Pill className="bg-brand-soft text-brand-ink">Entrega ao cliente</Pill>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {m.data ? fmtData(m.data, "dd MMM yyyy") : "data a definir"}
                    {m.data_real ? ` · entregue em ${fmtData(m.data_real, "dd MMM yyyy")}` : ""}
                  </div>
                </div>
                <BotaoSecundario className="px-3 py-2" onClick={() => setAberta(aberta === m.id ? null : m.id)}>
                  <MessageSquare className="size-4" />
                  {aberta === m.id ? "Fechar conversa" : "Ver conversa"}
                </BotaoSecundario>
              </div>
              {aberta === m.id ? <ConversaEntregaInterna projetoId={projetoId} marcoId={m.id} /> : null}
            </div>
          );
        })}
        {marcos.length === 0 ? (
          <Vazio titulo="Nenhuma entrega cadastrada" descricao="Cadastre marcos no cronograma do projeto." />
        ) : null}
      </div>
    </Painel>
  );
}
