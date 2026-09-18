import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEquipe } from "@/lib/dados";
import {
  Avatar,
  BotaoPrimario,
  Campo,
  Painel,
  Pill,
  TituloPagina,
  Vazio,
  inputClasses,
} from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · Enzova Projects" },
      { name: "description", content: "Empresa, perfis de acesso, permissões e dados do seu usuário." },
      { property: "og:title", content: "Configurações" },
      { property: "og:description", content: "Empresa, perfis de acesso e permissões." },
    ],
  }),
  component: Configuracoes,
});

type Aba = "empresa" | "perfis" | "usuarios" | "conta";

function Configuracoes() {
  const { tenant, perfil, papeis, permissoes, can, recarregar } = useAuth();
  const [aba, setAba] = useState<Aba>("empresa");

  const abas: { id: Aba; label: string }[] = [
    { id: "empresa", label: "Empresa" },
    { id: "perfis", label: "Perfis e permissões" },
    { id: "usuarios", label: "Usuários" },
    { id: "conta", label: "Minha conta" },
  ];

  return (
    <>
      <TituloPagina
        sobretitulo={<>{tenant?.nome} · plano {tenant?.plano}</>}
        titulo="Configurações"
        descricao="Cada empresa é isolada: dados, usuários e permissões nunca cruzam entre contas."
      />

      <div className="frost-soft mb-5 flex flex-wrap gap-1 rounded-xl p-1">
        {abas.map((a) => (
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

      {aba === "empresa" ? <Empresa podeEditar={can("empresa.editar")} /> : null}
      {aba === "perfis" ? <Perfis /> : null}
      {aba === "usuarios" ? <Usuarios /> : null}
      {aba === "conta" ? (
        <MinhaConta
          nome={perfil?.nome ?? ""}
          cargo={perfil?.cargo ?? ""}
          email={perfil?.email ?? ""}
          papeis={papeis.map((p) => p.nome)}
          permissoes={permissoes}
          onSalvo={recarregar}
        />
      ) : null}
    </>
  );
}

function Empresa({ podeEditar }: { podeEditar: boolean }) {
  const { tenant, recarregar } = useAuth();
  const [nome, setNome] = useState(tenant?.nome ?? "");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    setSalvando(true);
    const { error } = await supabase.from("tenants").update({ nome }).eq("id", tenant.id);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar os dados da empresa.");
      return;
    }
    toast.success("Dados da empresa atualizados.");
    await recarregar();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Painel className="lg:col-span-2">
        <h2 className="font-display text-[15px] font-bold">Dados da empresa</h2>
        <form onSubmit={salvar} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Campo label="Nome da empresa" className="sm:col-span-2">
            <input className={inputClasses} value={nome} onChange={(e) => setNome(e.target.value)} disabled={!podeEditar} />
          </Campo>
          <Campo label="Identificador">
            <input className={inputClasses} value={tenant?.slug ?? ""} disabled />
          </Campo>
          <Campo label="Plano">
            <input className={inputClasses} value={tenant?.plano ?? ""} disabled />
          </Campo>
          {podeEditar ? (
            <div className="sm:col-span-2">
              <BotaoPrimario type="submit" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar alterações"}
              </BotaoPrimario>
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground sm:col-span-2">
              Seu perfil pode visualizar, mas não alterar os dados da empresa.
            </p>
          )}
        </form>
      </Painel>

      <Painel>
        <h2 className="font-display text-[15px] font-bold">Assentos e uso</h2>
        <div className="mt-3 space-y-3 text-[12px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Assentos contratados</span>
            <span className="font-semibold">{tenant?.assentos ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Situação</span>
            <span className="font-semibold">{tenant?.ativo ? "Ativa" : "Suspensa"}</span>
          </div>
        </div>
        <p className="mt-4 border-t border-border pt-3 text-[12px] text-muted-foreground">
          Faturamento do próprio SaaS, personalização de marca e domínio próprio entram nas fases seguintes.
        </p>
      </Painel>
    </div>
  );
}

function Perfis() {
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, nome, slug, descricao, sistema").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: permissoes = [] } = useQuery({
    queryKey: ["permissoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("permissoes").select("codigo, descricao, grupo").order("codigo");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: vinculos = [] } = useQuery({
    queryKey: ["role-permissoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("role_permissoes").select("role_id, permissao");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [selecionado, setSelecionado] = useState<string | null>(null);
  const roleAtual = selecionado ?? roles[0]?.id ?? null;
  const doRole = useMemo(
    () => new Set(vinculos.filter((v) => v.role_id === roleAtual).map((v) => v.permissao)),
    [vinculos, roleAtual],
  );
  const grupos = useMemo(() => {
    const mapa = new Map<string, typeof permissoes>();
    for (const p of permissoes) mapa.set(p.grupo, [...(mapa.get(p.grupo) ?? []), p]);
    return [...mapa.entries()];
  }, [permissoes]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Painel>
        <h2 className="font-display text-[15px] font-bold">Perfis de acesso</h2>
        <div className="mt-3 space-y-1.5">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelecionado(r.id)}
              className={cn(
                "w-full rounded-xl px-3 py-2.5 text-left transition",
                roleAtual === r.id ? "bg-brand-soft" : "hover:bg-secondary",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold">{r.nome}</span>
                <span className="text-[11px] text-muted-foreground">
                  {vinculos.filter((v) => v.role_id === r.id).length}
                </span>
              </div>
              {r.descricao ? <div className="text-[11px] text-muted-foreground">{r.descricao}</div> : null}
            </button>
          ))}
          {roles.length === 0 ? <Vazio titulo="Nenhum perfil cadastrado" /> : null}
        </div>
      </Painel>

      <Painel className="lg:col-span-2">
        <h2 className="font-display text-[15px] font-bold">Permissões do perfil</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Visualização somente leitura na Fase 1: a edição de matriz de permissões entra junto com a gestão avançada de acessos.
        </p>
        <div className="mt-4 space-y-4">
          {grupos.map(([grupo, itens]) => (
            <div key={grupo}>
              <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{grupo}</div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {itens.map((p) => (
                  <div
                    key={p.codigo}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[12px]",
                      doRole.has(p.codigo) ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    <span>{p.descricao}</span>
                    <span className="font-semibold">{doRole.has(p.codigo) ? "Sim" : "Não"}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Painel>
    </div>
  );
}

function Usuarios() {
  const { data: equipe = [] } = useEquipe();
  const queryClient = useQueryClient();
  const { can } = useAuth();

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, nome").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: vinculos = [] } = useQuery({
    queryKey: ["usuario-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("usuario_roles").select("id, profile_id, role_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function trocarPapel(profileId: string, roleId: string, tenantId: string) {
    const atual = vinculos.filter((v) => v.profile_id === profileId);
    for (const v of atual) await supabase.from("usuario_roles").delete().eq("id", v.id);
    if (roleId) {
      const { error } = await supabase
        .from("usuario_roles")
        .insert({ tenant_id: tenantId, profile_id: profileId, role_id: roleId });
      if (error) {
        toast.error("Não foi possível alterar o perfil de acesso.");
        return;
      }
    }
    toast.success("Perfil de acesso atualizado.");
    void queryClient.invalidateQueries({ queryKey: ["usuario-roles"] });
  }

  return (
    <Painel padded={false} className="py-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-2xl border-collapse text-left">
          <thead>
            <tr className="text-[10px] tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-2 font-medium">Pessoa</th>
              <th className="px-3 py-2 font-medium">E-mail</th>
              <th className="px-3 py-2 font-medium">Cargo</th>
              <th className="px-3 py-2 font-medium">Situação</th>
              <th className="px-3 py-2 font-medium">Perfil de acesso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {equipe.map((m) => {
              const atual = vinculos.find((v) => v.profile_id === m.id);
              return (
                <tr key={m.id} className="text-[12px]">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <Avatar nome={m.nome} />
                      <span className="font-medium">{m.nome}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{m.email}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{m.cargo ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <Pill className={m.ativo ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground"}>
                      {m.ativo ? "Ativo" : "Inativo"}
                    </Pill>
                  </td>
                  <td className="px-3 py-2.5">
                    {can("usuario.editar") ? (
                      <select
                        className={`${inputClasses} w-auto py-1.5`}
                        value={atual?.role_id ?? ""}
                        onChange={(e) => void trocarPapel(m.id, e.target.value, m.tenant_id ?? "")}
                      >
                        <option value="">Sem perfil</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nome}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-muted-foreground">
                        {roles.find((r) => r.id === atual?.role_id)?.nome ?? "Sem perfil"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Painel>
  );
}

function MinhaConta({
  nome: nomeInicial,
  cargo: cargoInicial,
  email,
  papeis,
  permissoes,
  onSalvo,
}: {
  nome: string;
  cargo: string;
  email: string;
  papeis: string[];
  permissoes: string[];
  onSalvo: () => Promise<void> | void;
}) {
  const { perfil } = useAuth();
  const [nome, setNome] = useState(nomeInicial);
  const [cargo, setCargo] = useState(cargoInicial);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!perfil) return;
    setSalvando(true);
    const { error } = await supabase.from("profiles").update({ nome, cargo: cargo || null }).eq("id", perfil.id);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar seu perfil.");
      return;
    }
    toast.success("Perfil atualizado.");
    await onSalvo();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Painel className="lg:col-span-2">
        <h2 className="font-display text-[15px] font-bold">Meus dados</h2>
        <form onSubmit={salvar} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Campo label="Nome">
            <input className={inputClasses} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo label="Cargo">
            <input className={inputClasses} value={cargo} onChange={(e) => setCargo(e.target.value)} />
          </Campo>
          <Campo label="E-mail de acesso" className="sm:col-span-2">
            <input className={inputClasses} value={email} disabled />
          </Campo>
          <div className="sm:col-span-2">
            <BotaoPrimario type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar meus dados"}
            </BotaoPrimario>
          </div>
        </form>
      </Painel>

      <Painel>
        <h2 className="font-display text-[15px] font-bold">Meu acesso</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {papeis.length ? (
            papeis.map((p) => (
              <Pill key={p} className="bg-brand-soft text-brand-ink">
                {p}
              </Pill>
            ))
          ) : (
            <span className="text-[12px] text-muted-foreground">Nenhum perfil atribuído.</span>
          )}
        </div>
        <div className="mt-4 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Permissões efetivas ({permissoes.length})
        </div>
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto scroll-slim">
          {permissoes.map((p) => (
            <div key={p} className="rounded-lg bg-secondary px-2.5 py-1.5 text-[11px] text-muted-foreground">
              {p}
            </div>
          ))}
        </div>
      </Painel>
    </div>
  );
}
