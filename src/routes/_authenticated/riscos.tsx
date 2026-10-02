import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEquipe, useProjetos, useRiscos } from "@/lib/dados";
import { RISCO_NIVEIS, fmtData, severidadeRisco, type RiscoNivel } from "@/lib/enzova";
import {
  Avatar,
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Indicador,
  Painel,
  Pill,
  TituloPagina,
  Vazio,
  inputClasses,
} from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/riscos")({
  head: () => ({
    meta: [
      { title: "Riscos · Projeta" },
      { name: "description", content: "Matriz de riscos do portfólio com probabilidade, impacto e plano de mitigação." },
      { property: "og:title", content: "Gestão de riscos" },
      { property: "og:description", content: "Riscos por projeto, severidade e plano de mitigação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Riscos,
});

const NIVEIS: RiscoNivel[] = ["baixo", "medio", "alto", "critico"];

function Riscos() {
  const { can } = useAuth();
  const { data: riscos = [] } = useRiscos();
  const { data: projetos = [] } = useProjetos();
  const { data: equipe = [] } = useEquipe();
  const [novo, setNovo] = useState(false);
  const [filtroProjeto, setFiltroProjeto] = useState("");
  const queryClient = useQueryClient();
  const { perfil } = useAuth();

  const lista = useMemo(
    () =>
      riscos
        .map((r) => ({
          ...r,
          projeto: projetos.find((p) => p.id === r.projeto_id),
          responsavel: equipe.find((p) => p.id === r.responsavel_id),
          severidade: severidadeRisco(r.probabilidade as RiscoNivel, r.impacto as RiscoNivel),
        }))
        .filter((r) => !filtroProjeto || r.projeto_id === filtroProjeto)
        .sort((a, b) => b.severidade.valor - a.severidade.valor),
    [riscos, projetos, equipe, filtroProjeto],
  );

  const abertos = lista.filter((r) => r.status !== "encerrado" && r.status !== "mitigado");
  const criticos = lista.filter((r) => r.severidade.nivel === "critico").length;

  const encerrar = useMutation({
    mutationFn: async (id: string) => {
      if (!perfil) throw new Error("Perfil não carregado");
      const { error } = await supabase.from("riscos").update({ status: "mitigado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Risco atualizado");
      void queryClient.invalidateQueries({ queryKey: ["riscos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <TituloPagina
        sobretitulo={
          <>
            <ShieldAlert className="size-3.5" /> Matriz de riscos do portfólio
          </>
        }
        titulo="Riscos"
        descricao="Probabilidade x impacto de cada risco, com responsável e plano de mitigação."
        acoes={
          can("projeto.editar") ? (
            <BotaoPrimario onClick={() => setNovo(true)}>
              <Plus className="size-4" /> Novo risco
            </BotaoPrimario>
          ) : null
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Riscos mapeados" valor={lista.length} detalhe={`${projetos.length} projetos`} />
        <Indicador titulo="Riscos abertos" valor={abertos.length} detalhe="em acompanhamento" tom={abertos.length ? "atencao" : "neutro"} />
        <Indicador titulo="Severidade crítica" valor={criticos} detalhe="ação imediata" tom={criticos ? "negativo" : "neutro"} />
        <Indicador
          titulo="Com plano de mitigação"
          valor={lista.filter((r) => r.plano_mitigacao).length}
          detalhe={`de ${lista.length} riscos`}
          tom="positivo"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Painel>
          <h2 className="font-display text-[15px] font-bold">Matriz probabilidade x impacto</h2>
          <div className="mt-4 grid grid-cols-[auto_repeat(4,1fr)] gap-1.5 text-[11px]">
            <div />
            {NIVEIS.map((n) => (
              <div key={n} className="text-center font-medium text-muted-foreground">
                {RISCO_NIVEIS[n].label}
              </div>
            ))}
            {[...NIVEIS].reverse().map((prob) => (
              <div key={prob} className="contents">
                <div className="flex items-center pr-1 text-right font-medium text-muted-foreground">{RISCO_NIVEIS[prob].label}</div>
                {NIVEIS.map((imp) => {
                  const { nivel } = severidadeRisco(prob, imp);
                  const itens = lista.filter((r) => r.probabilidade === prob && r.impacto === imp);
                  return (
                    <div
                      key={`${prob}-${imp}`}
                      title={`Probabilidade ${RISCO_NIVEIS[prob].label} · Impacto ${RISCO_NIVEIS[imp].label}`}
                      className={cn(
                        "grid h-14 place-items-center rounded-lg font-display text-[16px] font-bold",
                        nivel === "critico"
                          ? "bg-danger/25 text-danger"
                          : nivel === "alto"
                            ? "bg-danger-soft text-danger"
                            : nivel === "medio"
                              ? "bg-warning-soft text-warning"
                              : "bg-success-soft text-success",
                      )}
                    >
                      {itens.length || ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">
            Linhas: probabilidade · Colunas: impacto. Cada célula mostra quantos riscos estão naquele cruzamento.
          </div>
        </Painel>

        <Painel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-[15px] font-bold">Riscos por severidade</h2>
            <select value={filtroProjeto} onChange={(e) => setFiltroProjeto(e.target.value)} className={cn(inputClasses, "w-auto")}>
              <option value="">Todos os projetos</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 space-y-2">
            {lista.map((r) => (
              <div key={r.id} className="frost-soft rounded-xl px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill className={RISCO_NIVEIS[r.severidade.nivel].pill}>
                    {RISCO_NIVEIS[r.severidade.nivel].label} · {r.severidade.valor}
                  </Pill>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{r.descricao}</span>
                  <Pill className="bg-secondary text-muted-foreground">{r.status}</Pill>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  {r.projeto ? (
                    <Link to="/projetos/$projetoId" params={{ projetoId: r.projeto_id }} className="hover:text-brand">
                      {r.projeto.nome}
                    </Link>
                  ) : (
                    <span>—</span>
                  )}
                  <span>·</span>
                  <span>Prob. {RISCO_NIVEIS[r.probabilidade as RiscoNivel].label}</span>
                  <span>·</span>
                  <span>Impacto {RISCO_NIVEIS[r.impacto as RiscoNivel].label}</span>
                  <span>·</span>
                  <span>{fmtData(r.created_at)}</span>
                </div>
                {r.plano_mitigacao ? (
                  <div className="mt-2 flex items-start gap-2 text-[12px]">
                    <Avatar nome={r.responsavel?.nome} tone="muted" />
                    <span className="text-muted-foreground">{r.plano_mitigacao}</span>
                  </div>
                ) : null}
                {can("projeto.editar") && r.status !== "mitigado" ? (
                  <div className="mt-2 flex justify-end">
                    <BotaoSecundario onClick={() => encerrar.mutate(r.id)} disabled={encerrar.isPending}>
                      Marcar como mitigado
                    </BotaoSecundario>
                  </div>
                ) : null}
              </div>
            ))}
            {lista.length === 0 ? <Vazio titulo="Nenhum risco cadastrado" descricao="Registre riscos para acompanhar mitigações." /> : null}
          </div>
        </Painel>
      </div>

      {novo ? (
        <NovoRisco projetos={projetos.map((p) => ({ id: p.id, nome: p.nome }))} onFechar={() => setNovo(false)} />
      ) : null}
    </>
  );
}

function NovoRisco({ projetos, onFechar }: { projetos: { id: string; nome: string }[]; onFechar: () => void }) {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();
  const { data: equipe = [] } = useEquipe();
  const [projetoId, setProjetoId] = useState(projetos[0]?.id ?? "");
  const [descricao, setDescricao] = useState("");
  const [probabilidade, setProbabilidade] = useState<RiscoNivel>("medio");
  const [impacto, setImpacto] = useState<RiscoNivel>("alto");
  const [responsavelId, setResponsavelId] = useState("");
  const [plano, setPlano] = useState("");

  const salvar = useMutation({
    mutationFn: async () => {
      if (!perfil) throw new Error("Perfil não carregado");
      if (!descricao.trim()) throw new Error("Descreva o risco");
      const { error } = await supabase.from("riscos").insert({
        tenant_id: perfil.tenant_id,
        projeto_id: projetoId,
        descricao: descricao.trim(),
        probabilidade,
        impacto,
        responsavel_id: responsavelId || null,
        plano_mitigacao: plano || null,
        status: "aberto",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Risco registrado");
      void queryClient.invalidateQueries({ queryKey: ["riscos"] });
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
              <h2 className="font-display text-[17px] font-bold">Novo risco</h2>
              <p className="text-[12px] text-muted-foreground">Probabilidade x impacto define a severidade automaticamente.</p>
            </div>
            <button onClick={onFechar} className="text-muted-foreground transition hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Campo label="Projeto" className="sm:col-span-2">
              <select value={projetoId} onChange={(e) => setProjetoId(e.target.value)} className={inputClasses}>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Descrição do risco" className="sm:col-span-2">
              <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className={inputClasses} />
            </Campo>
            <Campo label="Probabilidade">
              <select value={probabilidade} onChange={(e) => setProbabilidade(e.target.value as RiscoNivel)} className={inputClasses}>
                {NIVEIS.map((n) => (
                  <option key={n} value={n}>
                    {RISCO_NIVEIS[n].label}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Impacto">
              <select value={impacto} onChange={(e) => setImpacto(e.target.value as RiscoNivel)} className={inputClasses}>
                {NIVEIS.map((n) => (
                  <option key={n} value={n}>
                    {RISCO_NIVEIS[n].label}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Responsável" className="sm:col-span-2">
              <select value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} className={inputClasses}>
                <option value="">Sem responsável</option>
                {equipe.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Plano de mitigação" className="sm:col-span-2">
              <textarea value={plano} onChange={(e) => setPlano(e.target.value)} rows={3} className={inputClasses} />
            </Campo>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
            <BotaoPrimario onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              Registrar risco
            </BotaoPrimario>
          </div>
        </Painel>
      </div>
    </div>
  );
}
