import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProjetos, useTarefas } from "@/lib/dados";
import { PROJETO_STATUS, SAUDE, calcularSaude, fmtData, fmtMoeda } from "@/lib/enzova";
import { Avatar, Indicador, Painel, Pill, Progresso, TituloPagina, Vazio } from "@/components/kit";
import { PortalAcessos } from "@/components/portal-acessos";
import { PortalTema } from "@/components/portal-tema";



export const Route = createFileRoute("/_authenticated/clientes/$clienteId")({
  head: () => ({
    meta: [
      { title: "Ficha do cliente · Projeta" },
      { name: "description", content: "Dados cadastrais, contatos e projetos do cliente." },
      { property: "og:title", content: "Ficha do cliente" },
      { property: "og:description", content: "Dados cadastrais, contatos e projetos do cliente." },
    ],
  }),
  component: DetalheCliente,
});

function DetalheCliente() {
  const { clienteId } = Route.useParams();
  const { can } = useAuth();
  const { data: projetos = [] } = useProjetos();
  const { data: tarefas = [] } = useTarefas();

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").eq("id", clienteId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: contatos = [] } = useQuery({
    queryKey: ["cliente-contatos", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cliente_contatos")
        .select("*")
        .eq("cliente_id", clienteId)
        .is("deleted_at", null)
        .order("principal", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <Painel>
        <Vazio titulo="Carregando cliente…" />
      </Painel>
    );
  }
  if (!cliente) {
    return (
      <Painel>
        <Vazio titulo="Cliente não encontrado" />
      </Painel>
    );
  }

  const doCliente = projetos.filter((p) => p.cliente_id === clienteId);
  const ativos = doCliente.filter((p) => p.status !== "concluido" && p.status !== "cancelado");
  const carteira = doCliente.reduce((acc, p) => acc + Number(p.orcamento ?? 0), 0);
  const tarefasCliente = tarefas.filter((t) => doCliente.some((p) => p.id === t.projeto_id));

  return (
    <>
      <Link to="/clientes" className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-brand">
        <ArrowLeft className="size-3.5" /> Voltar para clientes
      </Link>

      <TituloPagina
        sobretitulo={<>{cliente.tipo === "pj" ? "Pessoa jurídica" : "Pessoa física"} · {cliente.cnpj ?? cliente.cpf ?? "documento não informado"}</>}
        titulo={cliente.nome}
        descricao={cliente.razao_social ?? undefined}
        acoes={
          <Pill className={cliente.ativo ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground"}>
            {cliente.ativo ? "Cliente ativo" : "Cliente inativo"}
          </Pill>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Projetos" valor={doCliente.length} detalhe={`${ativos.length} em andamento`} />
        <Indicador titulo="Tarefas" valor={tarefasCliente.length} detalhe="em todos os projetos" />
        <Indicador titulo="Contatos" valor={contatos.length} detalhe="cadastrados" />
        {can("financeiro.ver") ? (
          <Indicador titulo="Carteira" valor={fmtMoeda(carteira)} detalhe="soma dos orçamentos" />
        ) : (
          <Indicador titulo="Local" valor={cliente.cidade ?? "—"} detalhe={cliente.uf ?? ""} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Painel>
          <h2 className="font-display text-[15px] font-bold">Dados cadastrais</h2>
          <dl className="mt-4 space-y-3 text-[12px]">
            <Linha label="E-mail" valor={cliente.email} />
            <Linha label="Telefone" valor={cliente.telefone} />
            <Linha label="WhatsApp" valor={cliente.whatsapp} />
            <Linha label="Endereço" valor={cliente.endereco} />
            <Linha label="Cidade" valor={cliente.cidade ? `${cliente.cidade}${cliente.uf ? `/${cliente.uf}` : ""}` : null} />
            <Linha label="Responsável" valor={cliente.responsavel} />
          </dl>
          {cliente.observacoes ? (
            <p className="mt-4 border-t border-border pt-3 text-[12px] text-muted-foreground">{cliente.observacoes}</p>
          ) : null}
        </Painel>

        <Painel>
          <h2 className="font-display text-[15px] font-bold">Contatos</h2>
          <div className="mt-3 space-y-2.5">
            {contatos.map((c) => (
              <div key={c.id} className="frost-soft rounded-xl p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar nome={c.nome} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold">{c.nome}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{c.cargo ?? c.departamento ?? "—"}</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.principal ? <Pill className="bg-brand-soft text-brand-ink">Principal</Pill> : null}
                  {c.responsavel_projeto ? <Pill className="bg-secondary text-muted-foreground">Projetos</Pill> : null}
                  {c.tecnico ? <Pill className="bg-secondary text-muted-foreground">Técnico</Pill> : null}
                  {c.financeiro ? <Pill className="bg-secondary text-muted-foreground">Financeiro</Pill> : null}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {c.email ?? "—"} · {c.telefone ?? c.whatsapp ?? "—"}
                </div>
              </div>
            ))}
            {contatos.length === 0 ? <Vazio titulo="Nenhum contato cadastrado" /> : null}
          </div>
        </Painel>

        <PortalAcessos clienteId={clienteId} />

        <PortalTema clienteId={clienteId} clienteNome={cliente?.nome ?? ""} />





        <Painel>
          <h2 className="font-display text-[15px] font-bold">Projetos do cliente</h2>
          <div className="mt-3 space-y-2.5">
            {doCliente.map((p) => {
              const saude = calcularSaude(p, tarefas.filter((t) => t.projeto_id === p.id));
              return (
                <Link key={p.id} to="/projetos/$projetoId" params={{ projetoId: p.id }} className="block frost-soft rounded-xl p-3 hover:bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold">{p.nome}</span>
                    <Pill className={SAUDE[saude.nivel].pill}>{SAUDE[saude.nivel].label}</Pill>
                  </div>
                  <Progresso valor={saude.tarefasConcluidas} className="mt-2 h-1.5" />
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>{PROJETO_STATUS[p.status].label}</span>
                    <span>prazo {fmtData(p.prazo)}</span>
                  </div>
                </Link>
              );
            })}
            {doCliente.length === 0 ? <Vazio titulo="Nenhum projeto para este cliente" /> : null}
          </div>
        </Painel>
      </div>
    </>
  );
}

function Linha({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{valor || "—"}</dd>
    </div>
  );
}
