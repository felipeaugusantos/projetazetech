import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useClientes, useEquipe, useProjetos, useTarefas, registrarAuditoria } from "@/lib/dados";
import {
  PRIORIDADES,
  PROJETO_STATUS,
  SAUDE,
  calcularSaude,
  fmtData,
  fmtHoras,
  fmtMoeda,
  type Prioridade,
  type ProjetoStatus,
} from "@/lib/enzova";
import {
  Avatar,
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Painel,
  Pill,
  Progresso,
  TituloPagina,
  Vazio,
  inputClasses,
} from "@/components/kit";

export const Route = createFileRoute("/_authenticated/projetos/")({
  validateSearch: (search: Record<string, unknown>) => ({
    novo: search.novo === true || search.novo === "true" || search.novo === "1" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Projetos · Projeta" },
      { name: "description", content: "Carteira de projetos com saúde, prazo, progresso e orçamento." },
      { property: "og:title", content: "Projetos" },
      { property: "og:description", content: "Carteira de projetos da empresa com indicadores de saúde." },
    ],
  }),
  component: Projetos,
});

const FASES_PADRAO = ["Levantamento", "Planejamento", "Desenvolvimento", "Testes", "Homologação", "Implantação"];

function Projetos() {
  const { can } = useAuth();
  const { data: projetos = [], isLoading } = useProjetos();
  const { data: tarefas = [] } = useTarefas();
  const { data: clientes = [] } = useClientes();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [novo, setNovo] = useState(false);

  const lista = useMemo(
    () =>
      projetos.filter(
        (p) =>
          (!status || p.status === status) &&
          (!busca ||
            p.nome.toLowerCase().includes(busca.toLowerCase()) ||
            p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
            (p.clientes?.nome ?? "").toLowerCase().includes(busca.toLowerCase())),
      ),
    [projetos, busca, status],
  );

  return (
    <>
      <TituloPagina
        sobretitulo={<>Carteira · {projetos.length} projetos</>}
        titulo="Projetos"
        descricao="Saúde calculada a partir de prazo consumido, tarefas atrasadas e horas utilizadas."
        acoes={
          <>
            <input
              className={`${inputClasses} w-auto`}
              placeholder="Buscar por nome, código ou cliente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <select className={`${inputClasses} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {(Object.keys(PROJETO_STATUS) as ProjetoStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PROJETO_STATUS[s].label}
                </option>
              ))}
            </select>
            {can("projeto.criar") ? (
              <BotaoPrimario onClick={() => setNovo(true)}>
                <Plus className="size-4" /> Novo projeto
              </BotaoPrimario>
            ) : null}
          </>
        }
      />

      {isLoading ? (
        <Painel>
          <Vazio titulo="Carregando projetos…" />
        </Painel>
      ) : lista.length === 0 ? (
        <Painel>
          <Vazio titulo="Nenhum projeto encontrado" descricao="Ajuste a busca ou cadastre um novo projeto." />
        </Painel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {lista.map((p) => {
            const doProjeto = tarefas.filter((t) => t.projeto_id === p.id);
            const saude = calcularSaude(p, doProjeto);
            return (
              <Link key={p.id} to="/projetos/$projetoId" params={{ projetoId: p.id }}>
                <Painel className="h-full transition hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground">{p.codigo}</div>
                      <div className="font-display text-[16px] leading-tight font-bold">{p.nome}</div>
                      <div className="mt-0.5 text-[12px] text-muted-foreground">{p.clientes?.nome ?? "Sem cliente"}</div>
                    </div>
                    <Avatar nome={p.gerente?.nome} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill className={PROJETO_STATUS[p.status].pill}>{PROJETO_STATUS[p.status].label}</Pill>
                    <Pill className={SAUDE[saude.nivel].pill}>{SAUDE[saude.nivel].label}</Pill>
                    <Pill className={PRIORIDADES[p.prioridade].pill}>{PRIORIDADES[p.prioridade].label}</Pill>
                  </div>

                  <Progresso valor={saude.tarefasConcluidas} className="mt-4" />
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>{saude.tarefasConcluidas}% concluído</span>
                    <span>prazo {saude.prazoConsumido}% consumido</span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <div className="text-muted-foreground">Prazo</div>
                      <div className="font-semibold">{fmtData(p.prazo)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Horas</div>
                      <div className="font-semibold">
                        {fmtHoras(saude.horasRealizadas)}/{fmtHoras(p.horas_previstas)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{can("financeiro.ver") ? "Orçamento" : "Tarefas"}</div>
                      <div className="font-semibold">
                        {can("financeiro.ver") ? fmtMoeda(p.orcamento) : `${saude.totalTarefas}`}
                      </div>
                    </div>
                  </div>

                  {saude.tarefasAtrasadas > 0 ? (
                    <div className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-[11px] font-medium text-danger">
                      {saude.motivos[0]}
                    </div>
                  ) : null}
                </Painel>
              </Link>
            );
          })}
        </div>
      )}

      {novo ? <NovoProjetoModal onFechar={() => setNovo(false)} clientes={clientes} /> : null}
    </>
  );
}

function NovoProjetoModal({
  onFechar,
  clientes,
}: {
  onFechar: () => void;
  clientes: { id: string; nome: string }[];
}) {
  const { perfil } = useAuth();
  const { data: equipe = [] } = useEquipe();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    codigo: "",
    cliente_id: clientes[0]?.id ?? "",
    gerente_id: perfil?.id ?? "",
    prioridade: "normal" as Prioridade,
    status: "planejamento" as ProjetoStatus,
    data_inicio: new Date().toISOString().slice(0, 10),
    prazo: "",
    orcamento: "",
    horas_previstas: "",
    descricao: "",
    criarFases: true,
  });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!perfil) return;
    setSalvando(true);
    try {
      const { data, error } = await supabase
        .from("projetos")
        .insert({
          tenant_id: perfil.tenant_id,
          codigo: form.codigo || `PRJ-${Math.floor(Math.random() * 9000 + 1000)}`,
          nome: form.nome,
          descricao: form.descricao || null,
          cliente_id: form.cliente_id || null,
          gerente_id: form.gerente_id || null,
          prioridade: form.prioridade,
          status: form.status,
          data_inicio: form.data_inicio || null,
          prazo: form.prazo || null,
          orcamento: form.orcamento ? Number(form.orcamento) : 0,
          custo_previsto: form.orcamento ? Number(form.orcamento) * 0.55 : 0,
          receita_prevista: form.orcamento ? Number(form.orcamento) : 0,
          horas_previstas: form.horas_previstas ? Number(form.horas_previstas) : 0,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (form.criarFases) {
        await supabase.from("projeto_fases").insert(
          FASES_PADRAO.map((nome, i) => ({
            tenant_id: perfil.tenant_id,
            projeto_id: data.id,
            nome,
            ordem: i + 1,
            responsavel_id: form.gerente_id || null,
          })),
        );
      }

      await registrarAuditoria({
        tenant_id: perfil.tenant_id,
        profile_id: perfil.id,
        entidade: "projeto",
        entidade_id: data.id,
        acao: "criado",
        projeto_id: data.id,
      });

      toast.success("Projeto criado com sucesso.");
      void queryClient.invalidateQueries({ queryKey: ["projetos"] });
      onFechar();
      navigate({ to: "/projetos/$projetoId", params: { projetoId: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o projeto.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4" onClick={onFechar}>
      <form
        onSubmit={salvar}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto scroll-slim rounded-2xl bg-card p-6 shadow-2xl"
      >
        <h2 className="font-display text-[20px] font-bold">Novo projeto</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Preencha o essencial. Fases, equipe e tarefas podem ser ajustadas depois.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Campo label="Nome do projeto" className="sm:col-span-2">
            <input
              className={inputClasses}
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Implantação ERP Cliente X"
            />
          </Campo>
          <Campo label="Código">
            <input
              className={inputClasses}
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              placeholder="PRJ-0004"
            />
          </Campo>
          <Campo label="Cliente">
            <select
              className={inputClasses}
              value={form.cliente_id}
              onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
            >
              <option value="">Sem cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Gerente responsável">
            <select
              className={inputClasses}
              value={form.gerente_id}
              onChange={(e) => setForm({ ...form, gerente_id: e.target.value })}
            >
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
          <Campo label="Status inicial">
            <select
              className={inputClasses}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ProjetoStatus })}
            >
              {(Object.keys(PROJETO_STATUS) as ProjetoStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PROJETO_STATUS[s].label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Data de início">
            <input
              type="date"
              className={inputClasses}
              value={form.data_inicio}
              onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
            />
          </Campo>
          <Campo label="Prazo">
            <input
              type="date"
              className={inputClasses}
              value={form.prazo}
              onChange={(e) => setForm({ ...form, prazo: e.target.value })}
            />
          </Campo>
          <Campo label="Orçamento (R$)">
            <input
              type="number"
              min={0}
              className={inputClasses}
              value={form.orcamento}
              onChange={(e) => setForm({ ...form, orcamento: e.target.value })}
            />
          </Campo>
          <Campo label="Horas previstas">
            <input
              type="number"
              min={0}
              className={inputClasses}
              value={form.horas_previstas}
              onChange={(e) => setForm({ ...form, horas_previstas: e.target.value })}
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

        <label className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
          <input
            type="checkbox"
            checked={form.criarFases}
            onChange={(e) => setForm({ ...form, criarFases: e.target.checked })}
          />
          Criar fases padrão (template de implantação)
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={onFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Criar projeto"}
          </BotaoPrimario>
        </div>
      </form>
    </div>
  );
}
