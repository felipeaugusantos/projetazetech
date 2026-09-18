import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useFases, useOrcamentoItens } from "@/lib/dados";
import { CATEGORIAS_ORCAMENTO, fmtData, fmtMoeda, isoDate } from "@/lib/enzova";
import {
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Indicador,
  Painel,
  Pill,
  Vazio,
  inputClasses,
} from "@/components/kit";

export type CustoReal = {
  id: string;
  projeto_id: string;
  fase_id: string | null;
  categoria: string;
  descricao: string;
  fornecedor: string | null;
  documento: string | null;
  data: string;
  valor: number;
  observacao: string | null;
};

const SELECT = "id, projeto_id, fase_id, categoria, descricao, fornecedor, documento, data, valor, observacao";

export function useCustosReais(projetoId?: string) {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["custos-reais", projetoId ?? "todos", perfil?.tenant_id],
    enabled: !!perfil,
    queryFn: async () => {
      let query = supabase.from("custos_reais").select(SELECT).is("deleted_at", null);
      if (projetoId) query = query.eq("projeto_id", projetoId);
      const { data, error } = await query.order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CustoReal[];
    },
  });
}

/** Painel interno de custos reais do projeto. Nunca aparece no portal do cliente. */
export function CustosReaisProjeto({ projetoId }: { projetoId: string }) {
  const { can, perfil } = useAuth();
  const queryClient = useQueryClient();
  const podeLancar = can("despesa.lancar") || can("orcamento.editar");

  const { data: custos = [], isLoading } = useCustosReais(projetoId);
  const { data: fases = [] } = useFases(projetoId);
  const { data: orcamento = [] } = useOrcamentoItens(projetoId);
  const [aberto, setAberto] = useState(false);

  const orcadoPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const item of orcamento) {
      if (item.tipo !== "custo") continue;
      mapa.set(item.categoria, (mapa.get(item.categoria) ?? 0) + item.quantidade * item.valor_unitario);
    }
    return mapa;
  }, [orcamento]);

  const realPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const c of custos) mapa.set(c.categoria, (mapa.get(c.categoria) ?? 0) + Number(c.valor));
    return mapa;
  }, [custos]);

  const categorias = useMemo(
    () => Array.from(new Set([...orcadoPorCategoria.keys(), ...realPorCategoria.keys()])).sort(),
    [orcadoPorCategoria, realPorCategoria],
  );

  const custoOrcado = useMemo(
    () => Array.from(orcadoPorCategoria.values()).reduce((s, v) => s + v, 0),
    [orcadoPorCategoria],
  );
  const custoReal = useMemo(() => custos.reduce((s, c) => s + Number(c.valor), 0), [custos]);
  const saldo = custoOrcado - custoReal;
  const consumo = custoOrcado ? Math.round((custoReal / custoOrcado) * 100) : 0;

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custos_reais")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["custos-reais"] });
      toast.success("Lançamento removido.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível remover."),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Custo orçado" valor={fmtMoeda(custoOrcado)} detalhe="Linhas de custo do orçamento" />
        <Indicador
          titulo="Custo real lançado"
          valor={fmtMoeda(custoReal)}
          detalhe={`${custos.length} lançamento(s)`}
          tom={custoOrcado && custoReal > custoOrcado ? "negativo" : "neutro"}
        />
        <Indicador
          titulo={saldo >= 0 ? "Saldo disponível" : "Estouro"}
          valor={fmtMoeda(Math.abs(saldo))}
          tom={saldo >= 0 ? "positivo" : "negativo"}
          detalhe={saldo >= 0 ? "Ainda dentro do orçado" : "Acima do orçado"}
        />
        <Indicador
          titulo="Orçamento consumido"
          valor={`${consumo}%`}
          progresso={Math.min(100, consumo)}
          tom={consumo > 100 ? "negativo" : consumo > 85 ? "atencao" : "positivo"}
          detalhe="Custo real sobre o orçado"
        />
      </div>

      <Painel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold">
              <Wallet className="size-4 text-brand" /> Custo real x orçamento
            </h2>
            <p className="text-[11.5px] text-muted-foreground">
              Uso interno. Nada daqui aparece no portal do cliente nem nos relatórios compartilhados.
            </p>
          </div>
          {podeLancar ? (
            <BotaoPrimario onClick={() => setAberto(true)}>
              <Plus className="size-4" /> Lançar custo real
            </BotaoPrimario>
          ) : null}
        </div>

        {categorias.length ? (
          <div className="scroll-slim mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[12.5px]">
              <thead className="text-left text-[11.5px] text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Categoria</th>
                  <th className="pb-2 text-right font-medium">Orçado</th>
                  <th className="pb-2 text-right font-medium">Real</th>
                  <th className="pb-2 text-right font-medium">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((cat) => {
                  const orcado = orcadoPorCategoria.get(cat) ?? 0;
                  const real = realPorCategoria.get(cat) ?? 0;
                  const dif = orcado - real;
                  return (
                    <tr key={cat} className="border-t border-border/70">
                      <td className="py-2 font-medium">{cat}</td>
                      <td className="py-2 text-right">{fmtMoeda(orcado)}</td>
                      <td className="py-2 text-right">{fmtMoeda(real)}</td>
                      <td className="py-2 text-right">
                        <Pill className={dif >= 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}>
                          {dif >= 0 ? "sobra " : "estouro "}
                          {fmtMoeda(Math.abs(dif))}
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Vazio titulo="Sem comparativo ainda" descricao="Lance custos reais ou monte o orçamento do projeto." />
        )}
      </Painel>

      <Painel>
        <h2 className="font-display text-[15px] font-bold">Lançamentos de custo real</h2>
        {isLoading ? (
          <div className="py-8 text-center text-[12.5px] text-muted-foreground">Carregando…</div>
        ) : custos.length ? (
          <div className="scroll-slim mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-[12.5px]">
              <thead className="text-left text-[11.5px] text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Descrição</th>
                  <th className="pb-2 font-medium">Categoria</th>
                  <th className="pb-2 font-medium">Fornecedor</th>
                  <th className="pb-2 font-medium">Fase</th>
                  <th className="pb-2 text-right font-medium">Valor</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {custos.map((c) => (
                  <tr key={c.id} className="border-t border-border/70">
                    <td className="py-2 whitespace-nowrap">{fmtData(c.data, "dd MMM yyyy")}</td>
                    <td className="py-2">
                      <div className="font-medium">{c.descricao}</div>
                      {c.documento ? (
                        <div className="text-[11px] text-muted-foreground">Doc. {c.documento}</div>
                      ) : null}
                    </td>
                    <td className="py-2">{c.categoria}</td>
                    <td className="py-2">{c.fornecedor ?? "—"}</td>
                    <td className="py-2">{fases.find((f) => f.id === c.fase_id)?.nome ?? "—"}</td>
                    <td className="py-2 text-right font-semibold">{fmtMoeda(Number(c.valor))}</td>
                    <td className="py-2 text-right">
                      {podeLancar ? (
                        <button
                          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-danger-soft hover:text-danger"
                          title="Remover lançamento"
                          onClick={() => excluir.mutate(c.id)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Vazio titulo="Nenhum custo real lançado" descricao="Registre notas, fornecedores e valores pagos." />
        )}
      </Painel>

      {aberto ? (
        <NovoCustoModal
          projetoId={projetoId}
          tenantId={perfil?.tenant_id ?? ""}
          profileId={perfil?.id ?? null}
          fases={fases.map((f) => ({ id: f.id as string, nome: f.nome as string }))}
          onFechar={() => setAberto(false)}
        />
      ) : null}
    </div>
  );
}

function NovoCustoModal({
  projetoId,
  tenantId,
  profileId,
  fases,
  onFechar,
}: {
  projetoId: string;
  tenantId: string;
  profileId: string | null;
  fases: { id: string; nome: string }[];
  onFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<string>("Terceiros");
  const [fornecedor, setFornecedor] = useState("");
  const [documento, setDocumento] = useState("");
  const [faseId, setFaseId] = useState("");
  const [data, setData] = useState(isoDate(new Date()));
  const [valor, setValor] = useState("");
  const [observacao, setObservacao] = useState("");

  const salvar = useMutation({
    mutationFn: async () => {
      const numero = Number(valor.replace(/\./g, "").replace(",", "."));
      if (!descricao.trim()) throw new Error("Informe a descrição do custo.");
      if (!Number.isFinite(numero) || numero <= 0) throw new Error("Informe um valor válido.");
      const { error } = await supabase.from("custos_reais").insert({
        tenant_id: tenantId,
        projeto_id: projetoId,
        fase_id: faseId || null,
        categoria,
        descricao: descricao.trim(),
        fornecedor: fornecedor.trim() || null,
        documento: documento.trim() || null,
        data,
        valor: numero,
        observacao: observacao.trim() || null,
        criado_por: profileId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["custos-reais"] });
      toast.success("Custo real lançado.");
      onFechar();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível lançar."),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-forest/30 p-4 backdrop-blur-sm">
      <Painel className="w-full max-w-lg">
        <h2 className="font-display text-[16px] font-bold">Lançar custo real</h2>
        <p className="text-[11.5px] text-muted-foreground">Visível apenas para a equipe interna.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Campo label="Descrição" className="sm:col-span-2">
            <input className={inputClasses} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Campo>
          <Campo label="Categoria">
            <select className={inputClasses} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS_ORCAMENTO.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Valor pago (R$)">
            <input
              className={inputClasses}
              value={valor}
              inputMode="decimal"
              placeholder="0,00"
              onChange={(e) => setValor(e.target.value)}
            />
          </Campo>
          <Campo label="Fornecedor">
            <input className={inputClasses} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
          </Campo>
          <Campo label="Nota / documento">
            <input className={inputClasses} value={documento} onChange={(e) => setDocumento(e.target.value)} />
          </Campo>
          <Campo label="Data">
            <input type="date" className={inputClasses} value={data} onChange={(e) => setData(e.target.value)} />
          </Campo>
          <Campo label="Fase">
            <select className={inputClasses} value={faseId} onChange={(e) => setFaseId(e.target.value)}>
              <option value="">Sem fase</option>
              {fases.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Observação" className="sm:col-span-2">
            <input className={inputClasses} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </Campo>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario disabled={salvar.isPending} onClick={() => salvar.mutate()}>
            {salvar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Lançar custo
          </BotaoPrimario>
        </div>
      </Painel>
    </div>
  );
}
