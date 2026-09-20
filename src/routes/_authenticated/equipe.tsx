import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEquipe, useTarefas, registrarAuditoria } from "@/lib/dados";
import { estaAtrasada, fmtHoras, fmtMoeda } from "@/lib/enzova";
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

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe · Projeta" },
      { name: "description", content: "Cadastro de pessoas com cargo, perfil de acesso, custo por hora e carga da semana." },
      { property: "og:title", content: "Equipe" },
      { property: "og:description", content: "Cadastro de pessoas, cargos e perfis de acesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Equipe,
});

type Pessoa = {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  custo_hora: number | null;
  capacidade_semanal: number | null;
  ativo: boolean;
};

function usePapeisDisponiveis() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["roles", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, nome, slug").order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string; slug: string }[];
    },
  });
}

function Equipe() {
  const { can, carregando, perfil } = useAuth();
  const queryClient = useQueryClient();
  const { data: equipe = [], isLoading } = useEquipe();
  const { data: tarefas = [] } = useTarefas();
  const [editando, setEditando] = useState<Pessoa | null>(null);
  const [novo, setNovo] = useState(false);

  const podeGerenciar = can("usuario.gerenciar");

  const { data: papeis = [] } = useQuery({
    queryKey: ["usuario-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("usuario_roles").select("profile_id, role_id, roles(nome, slug)");
      if (error) throw error;
      return (data ?? []) as unknown as {
        profile_id: string;
        role_id: string;
        roles: { nome: string; slug: string } | null;
      }[];
    },
  });

  const papeisPorPessoa = useMemo(() => {
    const mapa = new Map<string, string[]>();
    for (const p of papeis) {
      if (!p.roles) continue;
      mapa.set(p.profile_id, [...(mapa.get(p.profile_id) ?? []), p.roles.nome]);
    }
    return mapa;
  }, [papeis]);

  const roleIdPorPessoa = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of papeis) if (!mapa.has(p.profile_id)) mapa.set(p.profile_id, p.role_id);
    return mapa;
  }, [papeis]);

  const abertas = tarefas.filter((t) => t.status !== "concluida" && t.status !== "cancelada");
  const atrasadas = abertas.filter((t) => estaAtrasada(t.prazo, t.status));
  const capacidadeTotal = equipe.reduce((acc, m) => acc + Number(m.capacidade_semanal ?? 40), 0);
  const alocado = abertas.reduce((acc, t) => acc + Number(t.horas_estimadas ?? 0), 0);
  const semCusto = equipe.filter((m) => !m.custo_hora).length;

  async function atualizarPessoa(pessoa: Pessoa, dados: Record<string, unknown>, acao: string, mensagem: string) {
    if (!perfil) return;
    const { error } = await supabase.from("profiles").update(dados).eq("id", pessoa.id);
    if (error) return toast.error(error.message);
    await registrarAuditoria({
      tenant_id: perfil.tenant_id,
      profile_id: perfil.id,
      entidade: "pessoa",
      entidade_id: pessoa.id,
      acao,
      valor_novo: pessoa.nome,
    });
    void queryClient.invalidateQueries({ queryKey: ["equipe"] });
    toast.success(mensagem);
  }

  function alternarAtivo(pessoa: Pessoa) {
    if (pessoa.id === perfil?.id) return toast.error("Você não pode inativar o seu próprio cadastro.");
    void atualizarPessoa(
      pessoa,
      { ativo: !pessoa.ativo },
      pessoa.ativo ? "inativou" : "reativou",
      pessoa.ativo ? `${pessoa.nome} foi inativado.` : `${pessoa.nome} foi reativado.`,
    );
  }

  function excluir(pessoa: Pessoa) {
    if (pessoa.id === perfil?.id) return toast.error("Você não pode excluir o seu próprio cadastro.");
    if (!window.confirm(`Excluir ${pessoa.nome} da equipe? O histórico de horas e tarefas é preservado.`)) return;
    void atualizarPessoa(
      pessoa,
      { ativo: false, deleted_at: new Date().toISOString() },
      "excluiu",
      `${pessoa.nome} foi removido da equipe.`,
    );
  }


  return (
    <>
      <TituloPagina
        sobretitulo={<>{equipe.length} pessoas na empresa</>}
        titulo="Equipe"
        descricao="Cadastre cargo, perfil de acesso e custo por hora — é o custo por hora que alimenta o gráfico de Custos por equipe."
        acoes={
          <BotaoPrimario
            onClick={() => {
              if (podeGerenciar) return setNovo(true);
              if (carregando) return toast.info("Carregando seu perfil de acesso… tente novamente em instantes.");
              toast.error("Seu perfil de acesso não permite cadastrar funcionários.");
            }}
          >
            <Plus className="size-4" /> Cadastrar funcionário
          </BotaoPrimario>
        }
      />


      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Pessoas ativas" valor={equipe.filter((m) => m.ativo).length} detalhe={`${equipe.length} cadastradas`} />
        <Indicador titulo="Capacidade semanal" valor={fmtHoras(capacidadeTotal)} detalhe="soma das capacidades" />
        <Indicador
          titulo="Horas alocadas"
          valor={fmtHoras(alocado)}
          detalhe={`${capacidadeTotal ? Math.round((alocado / capacidadeTotal) * 100) : 0}% da capacidade`}
          tom={alocado > capacidadeTotal ? "negativo" : "neutro"}
          progresso={capacidadeTotal ? (alocado / capacidadeTotal) * 100 : 0}
        />
        <Indicador
          titulo="Sem custo por hora"
          valor={semCusto}
          detalhe="ficam fora do gráfico de custos"
          tom={semCusto ? "atencao" : "positivo"}
        />
      </div>

      {isLoading ? (
        <Painel>
          <Vazio titulo="Carregando equipe…" />
        </Painel>
      ) : equipe.length === 0 ? (
        <Painel>
          <Vazio titulo="Nenhuma pessoa cadastrada" descricao="Cadastre a equipe com cargo, perfil e custo por hora." />
        </Painel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {equipe.map((m) => {
            const suas = abertas.filter((t) => t.responsavel_id === m.id);
            const horas = suas.reduce((acc, t) => acc + Number(t.horas_estimadas ?? 0), 0);
            const capacidade = Number(m.capacidade_semanal ?? 40);
            const pct = capacidade ? Math.round((horas / capacidade) * 100) : 0;
            const suasAtrasadas = suas.filter((t) => estaAtrasada(t.prazo, t.status)).length;
            return (
              <Painel key={m.id}>
                <div className="flex items-start gap-3">
                  <Avatar nome={m.nome} className="size-10 text-[13px]" />
                  <div className="min-w-0">
                    <div className="truncate font-display text-[15px] font-bold">{m.nome}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{m.cargo ?? "—"}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    {!m.ativo ? <Pill className="bg-secondary text-muted-foreground">Inativo</Pill> : null}
                    {podeGerenciar ? (
                      <>
                        <button
                          title="Editar cadastro"
                          onClick={() => setEditando(m as Pessoa)}
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-brand"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          title={m.ativo ? "Inativar funcionário" : "Reativar funcionário"}
                          onClick={() => alternarAtivo(m as Pessoa)}
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-brand"
                        >
                          <Power className="size-4" />
                        </button>
                        <button
                          title="Excluir funcionário"
                          onClick={() => excluir(m as Pessoa)}
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-danger"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(papeisPorPessoa.get(m.id) ?? ["Sem perfil"]).map((p) => (
                    <Pill key={p} className="bg-brand-soft text-brand-ink">
                      {p}
                    </Pill>
                  ))}
                </div>

                <div className="mt-4 flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    {fmtHoras(horas)} de {fmtHoras(capacidade)} alocadas
                  </span>
                  <span className={pct > 100 ? "font-semibold text-danger" : ""}>{pct}%</span>
                </div>
                <Progresso valor={pct} className="mt-1.5 h-1.5" />

                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <div className="text-muted-foreground">Tarefas</div>
                    <div className="font-semibold">{suas.length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Atrasadas</div>
                    <div className={suasAtrasadas ? "font-semibold text-danger" : "font-semibold"}>{suasAtrasadas}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{can("financeiro.ver") ? "Custo/hora" : "E-mail"}</div>
                    <div className="truncate font-semibold">
                      {can("financeiro.ver") ? fmtMoeda(m.custo_hora) : m.email}
                    </div>
                  </div>
                </div>
              </Painel>
            );
          })}
        </div>
      )}

      {novo ? <PessoaModal onFechar={() => setNovo(false)} /> : null}
      {editando ? (
        <PessoaModal
          pessoa={editando}
          roleAtual={roleIdPorPessoa.get(editando.id) ?? ""}
          onFechar={() => setEditando(null)}
        />
      ) : null}
    </>
  );
}

function PessoaModal({
  pessoa,
  roleAtual = "",
  onFechar,
}: {
  pessoa?: Pessoa;
  roleAtual?: string;
  onFechar: () => void;
}) {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();
  const { data: papeisDisponiveis = [] } = usePapeisDisponiveis();
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: pessoa?.nome ?? "",
    email: pessoa?.email ?? "",
    cargo: pessoa?.cargo ?? "",
    custo_hora: pessoa?.custo_hora != null ? String(pessoa.custo_hora) : "",
    capacidade_semanal: pessoa?.capacidade_semanal != null ? String(pessoa.capacidade_semanal) : "40",
    ativo: pessoa?.ativo ?? true,
    role_id: roleAtual,
  });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!perfil) return;
    setSalvando(true);
    try {
      const dados = {
        nome: form.nome.trim(),
        email: form.email.trim(),
        cargo: form.cargo.trim() || null,
        custo_hora: form.custo_hora ? Number(form.custo_hora) : null,
        capacidade_semanal: form.capacidade_semanal ? Number(form.capacidade_semanal) : null,
        ativo: form.ativo,
      };

      let profileId = pessoa?.id ?? "";
      if (pessoa) {
        const { error } = await supabase.from("profiles").update(dados).eq("id", pessoa.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("profiles")
          .insert({ ...dados, tenant_id: perfil.tenant_id })
          .select("id")
          .single();
        if (error) throw error;
        profileId = data.id;
      }

      if (form.role_id !== roleAtual) {
        await supabase.from("usuario_roles").delete().eq("profile_id", profileId);
        if (form.role_id) {
          const { error } = await supabase
            .from("usuario_roles")
            .insert({ tenant_id: perfil.tenant_id, profile_id: profileId, role_id: form.role_id });
          if (error) throw error;
        }
      }

      await registrarAuditoria({
        tenant_id: perfil.tenant_id,
        profile_id: perfil.id,
        entidade: "pessoa",
        entidade_id: profileId,
        acao: pessoa ? "atualizou" : "criou",
        valor_novo: dados.nome,
      });

      void queryClient.invalidateQueries({ queryKey: ["equipe"] });
      void queryClient.invalidateQueries({ queryKey: ["usuario-roles"] });
      toast.success(pessoa ? "Cadastro atualizado." : "Pessoa cadastrada.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o cadastro.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4" onClick={onFechar}>
      <form
        onSubmit={salvar}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto scroll-slim rounded-2xl bg-card p-6 shadow-2xl"
      >
        <h2 className="font-display text-[20px] font-bold">{pessoa ? "Editar pessoa" : "Nova pessoa"}</h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          O custo por hora informado aqui é usado no gráfico de Custos por equipe.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Campo label="Nome" className="sm:col-span-2">
            <input className={inputClasses} required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Campo>
          <Campo label="E-mail">
            <input
              type="email"
              className={inputClasses}
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Campo>
          <Campo label="Cargo">
            <input
              className={inputClasses}
              placeholder="Gerente de projetos"
              value={form.cargo}
              onChange={(e) => setForm({ ...form, cargo: e.target.value })}
            />
          </Campo>
          <Campo label="Perfil de acesso">
            <select className={inputClasses} value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
              <option value="">Sem perfil</option>
              {papeisDisponiveis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Custo por hora (R$)">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClasses}
              value={form.custo_hora}
              onChange={(e) => setForm({ ...form, custo_hora: e.target.value })}
            />
          </Campo>
          <Campo label="Capacidade semanal (horas)">
            <input
              type="number"
              min="0"
              step="1"
              className={inputClasses}
              value={form.capacidade_semanal}
              onChange={(e) => setForm({ ...form, capacidade_semanal: e.target.value })}
            />
          </Campo>
          <label className="flex items-center gap-2 text-[12.5px] sm:col-span-2">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
            Pessoa ativa
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={onFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : pessoa ? "Salvar alterações" : "Cadastrar pessoa"}
          </BotaoPrimario>
        </div>
      </form>
    </div>
  );
}
