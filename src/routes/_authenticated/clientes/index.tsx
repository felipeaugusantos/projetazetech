import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useClientes, useProjetos } from "@/lib/dados";
import { fmtMoeda } from "@/lib/enzova";
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

export const Route = createFileRoute("/_authenticated/clientes/")({
  validateSearch: (search: Record<string, unknown>) => ({
    novo: search.novo === true || search.novo === "true" || search.novo === "1" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Clientes · Projeta" },
      { name: "description", content: "Base de clientes com contatos, projetos ativos e histórico." },
      { property: "og:title", content: "Clientes" },
      { property: "og:description", content: "Base de clientes da empresa e seus projetos." },
    ],
  }),
  component: Clientes,
});

function Clientes() {
  const { can } = useAuth();
  const { data: clientes = [], isLoading } = useClientes();
  const { data: projetos = [] } = useProjetos();
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);

  const lista = useMemo(
    () =>
      clientes.filter(
        (c) =>
          !busca ||
          c.nome.toLowerCase().includes(busca.toLowerCase()) ||
          (c.cidade ?? "").toLowerCase().includes(busca.toLowerCase()),
      ),
    [clientes, busca],
  );

  return (
    <>
      <TituloPagina
        sobretitulo={<>{clientes.length} clientes cadastrados</>}
        titulo="Clientes"
        descricao="Cada cliente concentra contatos, projetos e histórico de entregas."
        acoes={
          <>
            <input
              className={`${inputClasses} w-auto`}
              placeholder="Buscar cliente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {can("cliente.criar") ? (
              <BotaoPrimario onClick={() => setNovo(true)}>
                <Plus className="size-4" /> Novo cliente
              </BotaoPrimario>
            ) : null}
          </>
        }
      />

      {isLoading ? (
        <Painel>
          <Vazio titulo="Carregando clientes…" />
        </Painel>
      ) : lista.length === 0 ? (
        <Painel>
          <Vazio titulo="Nenhum cliente encontrado" descricao="Cadastre o primeiro cliente para iniciar projetos." />
        </Painel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((c) => {
            const doCliente = projetos.filter((p) => p.cliente_id === c.id);
            const ativos = doCliente.filter((p) => p.status !== "concluido" && p.status !== "cancelado");
            const carteira = doCliente.reduce((acc, p) => acc + Number(p.orcamento ?? 0), 0);
            return (
              <Link key={c.id} to="/clientes/$clienteId" params={{ clienteId: c.id }}>
                <Painel className="h-full transition hover:-translate-y-0.5">
                  <div className="flex items-start gap-3">
                    <Avatar nome={c.nome} className="size-10 text-[13px]" />
                    <div className="min-w-0">
                      <div className="font-display text-[15px] leading-tight font-bold">{c.nome}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.cidade ? `${c.cidade}${c.uf ? `/${c.uf}` : ""}` : "Local não informado"}
                      </div>
                    </div>
                    <Pill className={c.ativo ? "ml-auto bg-success-soft text-success" : "ml-auto bg-secondary text-muted-foreground"}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </Pill>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <div className="text-muted-foreground">Projetos</div>
                      <div className="font-semibold">{doCliente.length}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Em andamento</div>
                      <div className="font-semibold">{ativos.length}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{can("financeiro.ver") ? "Carteira" : "Tipo"}</div>
                      <div className="font-semibold">
                        {can("financeiro.ver") ? fmtMoeda(carteira) : c.tipo === "pj" ? "PJ" : "PF"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 truncate text-[11px] text-muted-foreground">
                    {c.responsavel ? `Contato: ${c.responsavel}` : c.email ?? "Sem contato principal"}
                  </div>
                </Painel>
              </Link>
            );
          })}
        </div>
      )}

      {novo ? <NovoClienteModal onFechar={() => setNovo(false)} /> : null}
    </>
  );
}

function NovoClienteModal({ onFechar }: { onFechar: () => void }) {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    tipo: "pj" as "pj" | "pf",
    razao_social: "",
    cnpj: "",
    email: "",
    telefone: "",
    cidade: "",
    uf: "",
    responsavel: "",
    observacoes: "",
  });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!perfil) return;
    setSalvando(true);
    try {
      const { error } = await supabase.from("clientes").insert({
        tenant_id: perfil.tenant_id,
        nome: form.nome,
        tipo: form.tipo,
        razao_social: form.razao_social || null,
        cnpj: form.tipo === "pj" ? form.cnpj || null : null,
        cpf: form.tipo === "pf" ? form.cnpj || null : null,
        email: form.email || null,
        telefone: form.telefone || null,
        cidade: form.cidade || null,
        uf: form.uf || null,
        responsavel: form.responsavel || null,
        observacoes: form.observacoes || null,
      });
      if (error) throw error;
      toast.success("Cliente cadastrado.");
      void queryClient.invalidateQueries({ queryKey: ["clientes"] });
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o cliente.");
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
        <h2 className="font-display text-[20px] font-bold">Novo cliente</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Campo label="Nome" className="sm:col-span-2">
            <input className={inputClasses} required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Campo>
          <Campo label="Tipo">
            <select
              className={inputClasses}
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as "pj" | "pf" })}
            >
              <option value="pj">Pessoa jurídica</option>
              <option value="pf">Pessoa física</option>
            </select>
          </Campo>
          <Campo label={form.tipo === "pj" ? "CNPJ" : "CPF"}>
            <input className={inputClasses} value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          </Campo>
          <Campo label="Razão social" className="sm:col-span-2">
            <input
              className={inputClasses}
              value={form.razao_social}
              onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
            />
          </Campo>
          <Campo label="E-mail">
            <input type="email" className={inputClasses} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Campo>
          <Campo label="Telefone">
            <input className={inputClasses} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </Campo>
          <Campo label="Cidade">
            <input className={inputClasses} value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          </Campo>
          <Campo label="UF">
            <input maxLength={2} className={inputClasses} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
          </Campo>
          <Campo label="Responsável principal" className="sm:col-span-2">
            <input
              className={inputClasses}
              value={form.responsavel}
              onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
            />
          </Campo>
          <Campo label="Observações" className="sm:col-span-2">
            <textarea
              className={`${inputClasses} min-h-20`}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </Campo>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={onFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Cadastrar cliente"}
          </BotaoPrimario>
        </div>
      </form>
    </div>
  );
}
