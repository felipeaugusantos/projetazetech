import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Plus, Send, Trash2, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  registrarAuditoria,
  useApontamentos,
  useDespesas,
  useEquipe,
  useFases,
  useOrcamentoItens,
  useProjetos,
  type Despesa,
} from "@/lib/dados";
import {
  CATEGORIAS_DESPESA,
  CATEGORIAS_ORCAMENTO,
  DESPESA_STATUS,
  ORCAMENTO_TIPO,
  PROJETO_STATUS,
  fmtHoras,
  fmtMoeda,
  isoDate,
  margem,
  type DespesaStatus,
  type OrcamentoTipo,
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

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro · Projeta" },
      {
        name: "description",
        content: "Orçamento por projeto, custos lançados, margem realizada e aprovação de despesas.",
      },
      { property: "og:title", content: "Financeiro do portfólio" },
      {
        property: "og:description",
        content: "Receita contratada, custo previsto x realizado, despesas e rentabilidade por projeto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Financeiro,
});

type Aba = "resultado" | "orcamento" | "despesas";

function Financeiro() {
  const { can } = useAuth();
  const [aba, setAba] = useState<Aba>("resultado");

  if (!can("financeiro.ver")) {
    return (
      <>
        <TituloPagina titulo="Financeiro" />
        <Painel>
          <Vazio
            titulo="Acesso restrito"
            descricao="Seu perfil de acesso não inclui a permissão para visualizar informações financeiras."
          />
        </Painel>
      </>
    );
  }

  const abas: { id: Aba; label: string }[] = [
    { id: "resultado", label: "Resultado" },
    { id: "orcamento", label: "Orçamento" },
    { id: "despesas", label: "Despesas" },
  ];

  return (
    <>
      <TituloPagina
        sobretitulo={
          <>
            <Wallet className="size-3.5" /> Orçamento, custos e margem
          </>
        }
        titulo="Financeiro"
        descricao="Receita contratada, custo previsto no orçamento e custo realizado com horas aprovadas e despesas."
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

      {aba === "resultado" ? <Resultado /> : null}
      {aba === "orcamento" ? <Orcamento /> : null}
      {aba === "despesas" ? <Despesas /> : null}
    </>
  );
}

/* ============================ cálculo comum ============================ */

function useResultadoPorProjeto() {
  const { data: projetos = [] } = useProjetos();
  const { data: itens = [] } = useOrcamentoItens();
  const { data: despesas = [] } = useDespesas();
  const { data: apontamentos = [] } = useApontamentos();

  return useMemo(() => {
    const linhas = projetos.map((p) => {
      const doProjeto = itens.filter((i) => i.projeto_id === p.id);
      const receita =
        doProjeto
          .filter((i) => i.tipo === "receita")
          .reduce((acc, i) => acc + Number(i.quantidade) * Number(i.valor_unitario), 0) || Number(p.orcamento ?? 0);
      const custoPrevisto =
        doProjeto
          .filter((i) => i.tipo === "custo")
          .reduce((acc, i) => acc + Number(i.quantidade) * Number(i.valor_unitario), 0) || Number(p.custo_previsto ?? 0);

      const horas = apontamentos.filter((a) => a.projeto_id === p.id && a.status === "aprovado");
      const horasQtd = horas.reduce((acc, a) => acc + Number(a.horas), 0);
      const custoHoras = horas.reduce(
        (acc, a) => acc + Number(a.horas) * Number(a.profiles?.custo_hora ?? 0),
        0,
      );
      const custoDespesas = despesas
        .filter((d) => d.projeto_id === p.id && d.status === "aprovada")
        .reduce((acc, d) => acc + Number(d.valor), 0);
      const custoRealizado = custoHoras + custoDespesas;
      const m = margem(receita, custoRealizado);

      return {
        projeto: p,
        receita,
        custoPrevisto,
        custoHoras,
        custoDespesas,
        custoRealizado,
        horasQtd,
        margemValor: m.valor,
        margemPct: m.pct,
        consumoOrcamento: custoPrevisto ? Math.round((custoRealizado / custoPrevisto) * 100) : 0,
      };
    });

    const soma = (campo: keyof (typeof linhas)[number]) =>
      linhas.reduce((acc, l) => acc + Number(l[campo] as number), 0);

    return {
      linhas,
      totalReceita: soma("receita"),
      totalCustoPrevisto: soma("custoPrevisto"),
      totalCustoRealizado: soma("custoRealizado"),
      totalCustoHoras: soma("custoHoras"),
      totalCustoDespesas: soma("custoDespesas"),
    };
  }, [projetos, itens, despesas, apontamentos]);
}

/* ============================ Resultado ============================ */

function Resultado() {
  const { linhas, totalReceita, totalCustoPrevisto, totalCustoRealizado, totalCustoHoras, totalCustoDespesas } =
    useResultadoPorProjeto();
  const m = margem(totalReceita, totalCustoRealizado);

  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Receita contratada" valor={fmtMoeda(totalReceita)} detalhe="itens de receita do orçamento" />
        <Indicador
          titulo="Custo previsto"
          valor={fmtMoeda(totalCustoPrevisto)}
          detalhe="mão de obra, infraestrutura e terceiros"
        />
        <Indicador
          titulo="Custo realizado"
          valor={fmtMoeda(totalCustoRealizado)}
          detalhe={`${fmtMoeda(totalCustoHoras)} em horas + ${fmtMoeda(totalCustoDespesas)} em despesas`}
          tom={totalCustoPrevisto && totalCustoRealizado > totalCustoPrevisto ? "negativo" : "neutro"}
          progresso={totalCustoPrevisto ? (totalCustoRealizado / totalCustoPrevisto) * 100 : 0}
        />
        <Indicador
          titulo="Margem realizada"
          valor={fmtMoeda(m.valor)}
          detalhe={`${m.pct}% sobre a receita contratada`}
          tom={m.valor >= 0 ? "positivo" : "negativo"}
        />
      </div>

      <Painel padded={false} className="py-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-4xl border-collapse text-left">
            <thead>
              <tr className="text-[10px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2 font-medium">Projeto</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Receita</th>
                <th className="px-3 py-2 text-right font-medium">Custo previsto</th>
                <th className="px-3 py-2 text-right font-medium">Horas aprovadas</th>
                <th className="px-3 py-2 text-right font-medium">Custo realizado</th>
                <th className="px-3 py-2 text-right font-medium">Margem</th>
                <th className="px-3 py-2 font-medium">Consumo do orçamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {linhas.map((l) => (
                <tr key={l.projeto.id} className="text-[12px]">
                  <td className="px-4 py-2.5 font-medium">
                    <Link to="/projetos/$projetoId" params={{ projetoId: l.projeto.id }} className="hover:text-brand">
                      {l.projeto.nome}
                    </Link>
                    <div className="text-[11px] text-muted-foreground">{l.projeto.clientes?.nome ?? "—"}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Pill className={PROJETO_STATUS[l.projeto.status].pill}>
                      {PROJETO_STATUS[l.projeto.status].label}
                    </Pill>
                  </td>
                  <td className="px-3 py-2.5 text-right">{fmtMoeda(l.receita)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{fmtMoeda(l.custoPrevisto)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{fmtHoras(l.horasQtd)}</td>
                  <td className="px-3 py-2.5 text-right">
                    {fmtMoeda(l.custoRealizado)}
                    <div className="text-[10px] text-muted-foreground">
                      {fmtMoeda(l.custoDespesas)} em despesas
                    </div>
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right font-semibold",
                      l.margemValor >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {fmtMoeda(l.margemValor)}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">({l.margemPct}%)</span>
                  </td>
                  <td className="w-40 px-3 py-2.5">
                    <Progresso valor={l.consumoOrcamento} className="h-1.5" />
                    <div className="mt-1 text-[10px] text-muted-foreground">{l.consumoOrcamento}% do previsto</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {linhas.length === 0 ? <Vazio titulo="Nenhum projeto cadastrado" /> : null}
        </div>
      </Painel>
    </>
  );
}

/* ============================ Orçamento ============================ */

function Orcamento() {
  const { can } = useAuth();
  const { data: projetos = [] } = useProjetos();
  const [projetoId, setProjetoId] = useState("");
  const projetoSelecionado = projetoId || projetos[0]?.id || "";
  const [formAberto, setFormAberto] = useState(false);
  const podeEditar = can("orcamento.editar");

  const { data: itens = [] } = useOrcamentoItens(projetoSelecionado || undefined);
  const queryClient = useQueryClient();
  const { perfil } = useAuth();

  const receita = itens
    .filter((i) => i.tipo === "receita")
    .reduce((acc, i) => acc + Number(i.quantidade) * Number(i.valor_unitario), 0);
  const custo = itens
    .filter((i) => i.tipo === "custo")
    .reduce((acc, i) => acc + Number(i.quantidade) * Number(i.valor_unitario), 0);
  const m = margem(receita, custo);

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("orcamento_itens")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (perfil) {
        await registrarAuditoria({
          tenant_id: perfil.tenant_id,
          profile_id: perfil.id,
          entidade: "orcamento_item",
          entidade_id: id,
          acao: "removeu item do orçamento",
          projeto_id: projetoSelecionado,
        });
      }
    },
    onSuccess: () => {
      toast.success("Item removido do orçamento");
      void queryClient.invalidateQueries({ queryKey: ["orcamento_itens"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    itens
      .filter((i) => i.tipo === "custo")
      .forEach((i) => {
        const total = Number(i.quantidade) * Number(i.valor_unitario);
        mapa.set(i.categoria, (mapa.get(i.categoria) ?? 0) + total);
      });
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [itens]);

  return (
    <>
      <Painel className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Campo label="Projeto" className="min-w-64">
            <select
              value={projetoSelecionado}
              onChange={(e) => setProjetoId(e.target.value)}
              className={inputClasses}
            >
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nome}
                </option>
              ))}
            </select>
          </Campo>
          {podeEditar && projetoSelecionado ? (
            <BotaoPrimario onClick={() => setFormAberto(true)}>
              <Plus className="size-4" /> Novo item
            </BotaoPrimario>
          ) : null}
        </div>
      </Painel>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Receita orçada" valor={fmtMoeda(receita)} detalhe="contrato e adicionais" />
        <Indicador titulo="Custo orçado" valor={fmtMoeda(custo)} detalhe={`${itens.filter((i) => i.tipo === "custo").length} linhas de custo`} />
        <Indicador
          titulo="Margem planejada"
          valor={fmtMoeda(m.valor)}
          detalhe={`${m.pct}% sobre a receita`}
          tom={m.valor >= 0 ? "positivo" : "negativo"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Painel padded={false} className="py-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl border-collapse text-left">
              <thead>
                <tr className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-2 font-medium">Descrição</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Categoria</th>
                  <th className="px-3 py-2 font-medium">Fase</th>
                  <th className="px-3 py-2 text-right font-medium">Qtd.</th>
                  <th className="px-3 py-2 text-right font-medium">Valor unit.</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  {podeEditar ? <th className="px-3 py-2" /> : null}
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
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{Number(i.quantidade)}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{fmtMoeda(Number(i.valor_unitario))}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">
                      {fmtMoeda(Number(i.quantidade) * Number(i.valor_unitario))}
                    </td>
                    {podeEditar ? (
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => remover.mutate(i.id)}
                          className="text-muted-foreground transition hover:text-danger"
                          title="Remover item"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            {itens.length === 0 ? (
              <Vazio titulo="Orçamento em branco" descricao="Adicione linhas de receita e de custo para este projeto." />
            ) : null}
          </div>
        </Painel>

        <Painel>
          <h2 className="font-display text-[15px] font-bold">Custo orçado por categoria</h2>
          <div className="mt-4 space-y-3">
            {porCategoria.map(([categoria, valor]) => (
              <div key={categoria}>
                <div className="flex justify-between text-[12px]">
                  <span className="font-medium">{categoria}</span>
                  <span className="text-muted-foreground">{fmtMoeda(valor)}</span>
                </div>
                <Progresso valor={custo ? (valor / custo) * 100 : 0} className="mt-1.5 h-1.5" />
              </div>
            ))}
            {porCategoria.length === 0 ? <Vazio titulo="Sem custos orçados" /> : null}
          </div>
        </Painel>
      </div>

      {formAberto && projetoSelecionado ? (
        <NovoItemModal projetoId={projetoSelecionado} onFechar={() => setFormAberto(false)} />
      ) : null}
    </>
  );
}

function NovoItemModal({ projetoId, onFechar }: { projetoId: string; onFechar: () => void }) {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();
  const { data: fases = [] } = useFases(projetoId);
  const [tipo, setTipo] = useState<OrcamentoTipo>("custo");
  const [categoria, setCategoria] = useState<string>("Mão de obra");
  const [descricao, setDescricao] = useState("");
  const [faseId, setFaseId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valorUnitario, setValorUnitario] = useState("");

  const salvar = useMutation({
    mutationFn: async () => {
      if (!perfil) throw new Error("Perfil não carregado");
      if (!descricao.trim()) throw new Error("Informe a descrição do item");
      const qtd = Number(quantidade.replace(",", "."));
      const valor = Number(valorUnitario.replace(",", "."));
      if (!qtd || qtd <= 0) throw new Error("Quantidade inválida");
      if (!valor || valor <= 0) throw new Error("Informe o valor unitário");
      const { error } = await supabase.from("orcamento_itens").insert({
        tenant_id: perfil.tenant_id,
        projeto_id: projetoId,
        fase_id: faseId || null,
        tipo,
        categoria,
        descricao: descricao.trim(),
        quantidade: qtd,
        valor_unitario: valor,
      });
      if (error) throw error;
      await registrarAuditoria({
        tenant_id: perfil.tenant_id,
        profile_id: perfil.id,
        entidade: "orcamento_item",
        acao: `adicionou item de ${tipo} ao orçamento`,
        projeto_id: projetoId,
        valor_novo: `${descricao.trim()} · ${fmtMoeda(qtd * valor)}`,
      });
    },
    onSuccess: () => {
      toast.success("Item adicionado ao orçamento");
      void queryClient.invalidateQueries({ queryKey: ["orcamento_itens"] });
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
              <h2 className="font-display text-[17px] font-bold">Novo item de orçamento</h2>
              <p className="text-[12px] text-muted-foreground">Receita contratada ou custo previsto do projeto.</p>
            </div>
            <button onClick={onFechar} className="text-muted-foreground transition hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Campo label="Tipo">
              <select value={tipo} onChange={(e) => setTipo(e.target.value as OrcamentoTipo)} className={inputClasses}>
                <option value="custo">Custo</option>
                <option value="receita">Receita</option>
              </select>
            </Campo>
            <Campo label="Categoria">
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClasses}>
                {CATEGORIAS_ORCAMENTO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Descrição" className="sm:col-span-2">
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: Equipe de desenvolvimento — sprint 3"
                className={inputClasses}
              />
            </Campo>
            <Campo label="Fase" className="sm:col-span-2">
              <select value={faseId} onChange={(e) => setFaseId(e.target.value)} className={inputClasses}>
                <option value="">Sem fase</option>
                {fases.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Quantidade">
              <input value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className={inputClasses} />
            </Campo>
            <Campo label="Valor unitário (R$)">
              <input
                value={valorUnitario}
                onChange={(e) => setValorUnitario(e.target.value)}
                placeholder="0,00"
                className={inputClasses}
              />
            </Campo>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
            <BotaoPrimario onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              Adicionar item
            </BotaoPrimario>
          </div>
        </Painel>
      </div>
    </div>
  );
}

/* ============================ Despesas ============================ */

function Despesas() {
  const { can, perfil } = useAuth();
  const queryClient = useQueryClient();
  const { data: despesas = [] } = useDespesas();
  const { data: projetos = [] } = useProjetos();
  const [filtroProjeto, setFiltroProjeto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<DespesaStatus | "">("");
  const [formAberto, setFormAberto] = useState(false);
  const podeLancar = can("despesa.lancar") || can("despesa.aprovar");
  const podeAprovar = can("despesa.aprovar");

  const lista = useMemo(
    () =>
      despesas.filter(
        (d) => (!filtroProjeto || d.projeto_id === filtroProjeto) && (!filtroStatus || d.status === filtroStatus),
      ),
    [despesas, filtroProjeto, filtroStatus],
  );

  const total = (status?: DespesaStatus) =>
    despesas.filter((d) => !status || d.status === status).reduce((acc, d) => acc + Number(d.valor), 0);

  const mudarStatus = useMutation({
    mutationFn: async ({ despesa, status }: { despesa: Despesa; status: DespesaStatus }) => {
      if (!perfil) throw new Error("Perfil não carregado");
      const decidido = status === "aprovada" || status === "rejeitada";
      const patch = {
        status,
        aprovador_id: decidido ? perfil.id : null,
        aprovado_em: decidido ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from("despesas").update(patch).eq("id", despesa.id);
      if (error) throw error;
      await registrarAuditoria({
        tenant_id: perfil.tenant_id,
        profile_id: perfil.id,
        entidade: "despesa",
        entidade_id: despesa.id,
        acao: `despesa ${DESPESA_STATUS[status].label.toLowerCase()}`,
        projeto_id: despesa.projeto_id,
        campo: "status",
        valor_anterior: DESPESA_STATUS[despesa.status].label,
        valor_novo: DESPESA_STATUS[status].label,
      });
    },
    onSuccess: () => {
      toast.success("Despesa atualizada");
      void queryClient.invalidateQueries({ queryKey: ["despesas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Total lançado" valor={fmtMoeda(total())} detalhe={`${despesas.length} lançamentos`} />
        <Indicador titulo="Aprovado" valor={fmtMoeda(total("aprovada"))} detalhe="entra no custo realizado" tom="positivo" />
        <Indicador
          titulo="Em aprovação"
          valor={fmtMoeda(total("enviada"))}
          detalhe={`${despesas.filter((d) => d.status === "enviada").length} aguardando decisão`}
          tom="atencao"
        />
        <Indicador titulo="Rejeitado" valor={fmtMoeda(total("rejeitada"))} detalhe="devolvido para ajuste" tom="negativo" />
      </div>

      <Painel className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Campo label="Projeto" className="min-w-56">
              <select value={filtroProjeto} onChange={(e) => setFiltroProjeto(e.target.value)} className={inputClasses}>
                <option value="">Todos os projetos</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Situação" className="min-w-44">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as DespesaStatus | "")}
                className={inputClasses}
              >
                <option value="">Todas</option>
                {(Object.keys(DESPESA_STATUS) as DespesaStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {DESPESA_STATUS[s].label}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          {podeLancar ? (
            <BotaoPrimario onClick={() => setFormAberto(true)}>
              <Plus className="size-4" /> Lançar despesa
            </BotaoPrimario>
          ) : null}
        </div>
      </Painel>

      <Painel padded={false} className="py-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-4xl border-collapse text-left">
            <thead>
              <tr className="text-[10px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2 font-medium">Despesa</th>
                <th className="px-3 py-2 font-medium">Projeto</th>
                <th className="px-3 py-2 font-medium">Quem lançou</th>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 text-right font-medium">Valor</th>
                <th className="px-3 py-2 font-medium">Situação</th>
                <th className="px-3 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((d) => {
                const minha = d.profile_id === perfil?.id;
                return (
                  <tr key={d.id} className="text-[12px]">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{d.descricao}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {d.categoria}
                        {d.fornecedor ? ` · ${d.fornecedor}` : ""}
                        {d.faturavel ? " · repassável ao cliente" : ""}
                        {d.reembolsavel ? " · reembolso" : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{d.projetos?.nome ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar nome={d.profiles?.nome} tone="muted" className="size-6" />
                        <span className="text-muted-foreground">{d.profiles?.nome ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {format(parseISO(d.data), "dd MMM yyyy", { locale: ptBR })}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold">{fmtMoeda(Number(d.valor))}</td>
                    <td className="px-3 py-2.5">
                      <Pill className={DESPESA_STATUS[d.status].pill}>{DESPESA_STATUS[d.status].label}</Pill>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        {minha && (d.status === "rascunho" || d.status === "rejeitada") ? (
                          <BotaoSecundario
                            className="px-2.5 py-1.5 text-[11px]"
                            onClick={() => mudarStatus.mutate({ despesa: d, status: "enviada" })}
                          >
                            <Send className="size-3.5" /> Enviar
                          </BotaoSecundario>
                        ) : null}
                        {podeAprovar && d.status === "enviada" ? (
                          <>
                            <BotaoPrimario
                              className="px-2.5 py-1.5 text-[11px]"
                              onClick={() => mudarStatus.mutate({ despesa: d, status: "aprovada" })}
                            >
                              <Check className="size-3.5" /> Aprovar
                            </BotaoPrimario>
                            <BotaoSecundario
                              className="px-2.5 py-1.5 text-[11px]"
                              onClick={() => mudarStatus.mutate({ despesa: d, status: "rejeitada" })}
                            >
                              <X className="size-3.5" /> Rejeitar
                            </BotaoSecundario>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {lista.length === 0 ? (
            <Vazio titulo="Nenhuma despesa encontrada" descricao="Ajuste os filtros ou lance um novo custo." />
          ) : null}
        </div>
      </Painel>

      {formAberto ? <NovaDespesaModal onFechar={() => setFormAberto(false)} /> : null}
    </>
  );
}

function NovaDespesaModal({ onFechar }: { onFechar: () => void }) {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();
  const { data: projetos = [] } = useProjetos();
  const { data: equipe = [] } = useEquipe();
  const [projetoId, setProjetoId] = useState(projetos[0]?.id ?? "");
  const [categoria, setCategoria] = useState<string>("Viagem");
  const [descricao, setDescricao] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [data, setData] = useState(isoDate(new Date()));
  const [valor, setValor] = useState("");
  const [faturavel, setFaturavel] = useState(false);
  const [reembolsavel, setReembolsavel] = useState(false);
  const [profileId, setProfileId] = useState(perfil?.id ?? "");
  const [enviarAprovacao, setEnviarAprovacao] = useState(true);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!perfil) throw new Error("Perfil não carregado");
      if (!projetoId) throw new Error("Selecione o projeto");
      if (!descricao.trim()) throw new Error("Descreva a despesa");
      const v = Number(valor.replace(".", "").replace(",", "."));
      if (!v || v <= 0) throw new Error("Informe um valor válido");
      const { error } = await supabase.from("despesas").insert({
        tenant_id: perfil.tenant_id,
        projeto_id: projetoId,
        profile_id: profileId || perfil.id,
        categoria,
        descricao: descricao.trim(),
        fornecedor: fornecedor.trim() || null,
        data,
        valor: v,
        faturavel,
        reembolsavel,
        status: enviarAprovacao ? "enviada" : "rascunho",
      });
      if (error) throw error;
      await registrarAuditoria({
        tenant_id: perfil.tenant_id,
        profile_id: perfil.id,
        entidade: "despesa",
        acao: enviarAprovacao ? "lançou despesa para aprovação" : "lançou despesa como rascunho",
        projeto_id: projetoId,
        valor_novo: `${descricao.trim()} · ${fmtMoeda(v)}`,
      });
    },
    onSuccess: () => {
      toast.success("Despesa lançada");
      void queryClient.invalidateQueries({ queryKey: ["despesas"] });
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
              <h2 className="font-display text-[17px] font-bold">Lançar despesa</h2>
              <p className="text-[12px] text-muted-foreground">
                Custos de viagem, licenças, terceiros e material ligados ao projeto.
              </p>
            </div>
            <button onClick={onFechar} className="text-muted-foreground transition hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Campo label="Projeto" className="sm:col-span-2">
              <select value={projetoId} onChange={(e) => setProjetoId(e.target.value)} className={inputClasses}>
                <option value="">Selecione</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · {p.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Descrição" className="sm:col-span-2">
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: Passagem para reunião de kickoff"
                className={inputClasses}
              />
            </Campo>
            <Campo label="Categoria">
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClasses}>
                {CATEGORIAS_DESPESA.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Fornecedor">
              <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className={inputClasses} />
            </Campo>
            <Campo label="Data">
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClasses} />
            </Campo>
            <Campo label="Valor (R$)">
              <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className={inputClasses} />
            </Campo>
            <Campo label="Quem gastou" className="sm:col-span-2">
              <select value={profileId} onChange={(e) => setProfileId(e.target.value)} className={inputClasses}>
                {equipe.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="mt-3 space-y-2 text-[12px]">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={faturavel} onChange={(e) => setFaturavel(e.target.checked)} className="size-4 accent-brand" />
              Repassável ao cliente
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={reembolsavel}
                onChange={(e) => setReembolsavel(e.target.checked)}
                className="size-4 accent-brand"
              />
              Reembolsar quem gastou
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enviarAprovacao}
                onChange={(e) => setEnviarAprovacao(e.target.checked)}
                className="size-4 accent-brand"
              />
              Enviar para aprovação agora
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
            <BotaoPrimario onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              Lançar despesa
            </BotaoPrimario>
          </div>
        </Painel>
      </div>
    </div>
  );
}
