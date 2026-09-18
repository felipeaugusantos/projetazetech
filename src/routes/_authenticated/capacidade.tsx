import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Gauge, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { registrarAuditoria, useAlocacoes, useApontamentos, useEquipe, useProjetos } from "@/lib/dados";
import { fmtHoras, fmtMoeda, inicioSemana, isoDate, rotuloSemana } from "@/lib/enzova";
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

export const Route = createFileRoute("/_authenticated/capacidade")({
  head: () => ({
    meta: [
      { title: "Capacidade · Projeta" },
      { name: "description", content: "Planejamento de alocação semanal da equipe, capacidade e sobrecarga." },
      { property: "og:title", content: "Capacidade e alocação" },
      { property: "og:description", content: "Horas planejadas por pessoa e por projeto, semana a semana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Capacidade,
});

function Capacidade() {
  const { can } = useAuth();
  const { data: equipe = [] } = useEquipe();
  const { data: projetos = [] } = useProjetos();
  const { data: alocacoes = [] } = useAlocacoes();
  const { data: apontamentos = [] } = useApontamentos();
  const [semanaBase, setSemanaBase] = useState(() => inicioSemana(new Date()));
  const [editando, setEditando] = useState<{ profileId: string; nome: string } | null>(null);

  const podeGerenciar = can("alocacao.gerenciar");
  const verCusto = can("financeiro.ver");

  const semanas = useMemo(
    () => Array.from({ length: 5 }, (_, i) => isoDate(addWeeks(semanaBase, i))),
    [semanaBase],
  );

  const linhas = useMemo(
    () =>
      equipe
        .map((m) => {
          const capacidade = Number(m.capacidade_semanal ?? 40);
          const porSemana = semanas.map((s) => {
            const planejado = alocacoes
              .filter((a) => a.profile_id === m.id && a.semana === s)
              .reduce((acc, a) => acc + Number(a.horas_planejadas), 0);
            return { semana: s, planejado, capacidade, utilizacao: capacidade ? (planejado / capacidade) * 100 : 0 };
          });
          const apontadas = apontamentos
            .filter((a) => a.profile_id === m.id && a.data >= semanas[0]!)
            .reduce((acc, a) => acc + Number(a.horas), 0);
          return {
            id: m.id,
            nome: m.nome,
            cargo: m.cargo,
            custo: Number(m.custo_hora ?? 0),
            capacidade,
            porSemana,
            apontadas,
            projetos: [...new Set(alocacoes.filter((a) => a.profile_id === m.id).map((a) => a.projeto_id))].length,
          };
        })
        .sort((a, b) => (b.porSemana[0]?.utilizacao ?? 0) - (a.porSemana[0]?.utilizacao ?? 0)),
    [equipe, alocacoes, apontamentos, semanas],
  );

  const capacidadeTotal = linhas.reduce((acc, l) => acc + l.capacidade, 0);
  const planejadoSemana = linhas.reduce((acc, l) => acc + (l.porSemana[0]?.planejado ?? 0), 0);
  const sobrecarregados = linhas.filter((l) => (l.porSemana[0]?.utilizacao ?? 0) > 100).length;
  const ociosos = linhas.filter((l) => (l.porSemana[0]?.utilizacao ?? 0) < 60).length;

  const porProjeto = useMemo(
    () =>
      projetos
        .map((p) => {
          const planejado = alocacoes
            .filter((a) => a.projeto_id === p.id && semanas.includes(a.semana))
            .reduce((acc, a) => acc + Number(a.horas_planejadas), 0);
          return { id: p.id, nome: p.nome, planejado };
        })
        .filter((p) => p.planejado > 0)
        .sort((a, b) => b.planejado - a.planejado),
    [projetos, alocacoes, semanas],
  );
  const maxProjeto = Math.max(1, ...porProjeto.map((p) => p.planejado));

  return (
    <>
      <TituloPagina
        sobretitulo={
          <>
            <Gauge className="size-3.5" /> Alocação e capacidade
          </>
        }
        titulo="Capacidade"
        descricao="Planeje quantas horas cada pessoa dedica a cada projeto por semana e identifique sobrecarga."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          titulo="Capacidade da semana"
          valor={fmtHoras(capacidadeTotal)}
          detalhe={`${linhas.length} pessoas`}
        />
        <Indicador
          titulo="Horas planejadas"
          valor={fmtHoras(planejadoSemana)}
          detalhe={`${capacidadeTotal ? Math.round((planejadoSemana / capacidadeTotal) * 100) : 0}% de ocupação`}
          progresso={capacidadeTotal ? (planejadoSemana / capacidadeTotal) * 100 : 0}
        />
        <Indicador titulo="Sobrecarregados" valor={sobrecarregados} detalhe="acima de 100% da capacidade" tom={sobrecarregados ? "negativo" : "neutro"} />
        <Indicador titulo="Com folga" valor={ociosos} detalhe="abaixo de 60% de ocupação" tom={ociosos ? "atencao" : "neutro"} />
      </div>

      <Painel padded={false} className="mb-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
          <h2 className="font-display text-[15px] font-bold">Alocação semanal</h2>
          <div className="flex items-center gap-2">
            <BotaoSecundario onClick={() => setSemanaBase(addWeeks(semanaBase, -1))} aria-label="Semanas anteriores">
              <ChevronLeft className="size-4" />
            </BotaoSecundario>
            <span className="text-[12px] font-medium text-muted-foreground">a partir de {rotuloSemana(semanaBase)}</span>
            <BotaoSecundario onClick={() => setSemanaBase(addWeeks(semanaBase, 1))} aria-label="Semanas seguintes">
              <ChevronRight className="size-4" />
            </BotaoSecundario>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-left">
            <thead>
              <tr className="text-[10px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2 font-medium">Pessoa</th>
                {semanas.map((s) => (
                  <th key={s} className="px-3 py-2 text-center font-medium">
                    {format(new Date(`${s}T12:00:00`), "dd/MM", { locale: ptBR })}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Projetos</th>
                {podeGerenciar ? <th className="px-3 py-2" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {linhas.map((l) => (
                <tr key={l.id} className="text-[12px]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar nome={l.nome} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{l.nome}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {l.cargo ?? "—"} · {fmtHoras(l.capacidade)}/semana
                          {verCusto ? ` · ${fmtMoeda(l.custo)}/h` : ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  {l.porSemana.map((s) => (
                    <td key={s.semana} className="px-3 py-2.5">
                      <div className="text-center text-[12px] font-semibold">{s.planejado ? fmtHoras(s.planejado) : "—"}</div>
                      <Progresso
                        valor={s.utilizacao}
                        className={cn("mt-1 h-1.5", s.utilizacao > 100 && "[&>div]:bg-danger", s.utilizacao > 85 && s.utilizacao <= 100 && "[&>div]:bg-warning")}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{l.projetos}</td>
                  {podeGerenciar ? (
                    <td className="px-3 py-2.5 text-right">
                      <BotaoSecundario onClick={() => setEditando({ profileId: l.id, nome: l.nome })}>Planejar</BotaoSecundario>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {linhas.length === 0 ? <Vazio titulo="Nenhuma pessoa cadastrada" /> : null}
        </div>
      </Painel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel>
          <h2 className="font-display text-[15px] font-bold">Demanda por projeto</h2>
          <div className="mt-4 space-y-3.5">
            {porProjeto.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between text-[12px]">
                  <span className="truncate font-medium">{p.nome}</span>
                  <span className="text-muted-foreground">{fmtHoras(p.planejado)} nas 5 semanas</span>
                </div>
                <Progresso valor={(p.planejado / maxProjeto) * 100} className="mt-1.5 h-1.5" />
              </div>
            ))}
            {porProjeto.length === 0 ? <Vazio titulo="Nenhuma alocação planejada" /> : null}
          </div>
        </Painel>

        <Painel>
          <h2 className="font-display text-[15px] font-bold">Planejado x realizado</h2>
          <div className="mt-4 space-y-2.5">
            {linhas.slice(0, 8).map((l) => {
              const planejado = l.porSemana.reduce((acc, s) => acc + s.planejado, 0);
              const desvio = l.apontadas - planejado;
              return (
                <div key={l.id} className="frost-soft flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <Avatar nome={l.nome} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{l.nome}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {fmtHoras(planejado)} planejadas · {fmtHoras(l.apontadas)} apontadas
                    </div>
                  </div>
                  <Pill
                    className={
                      Math.abs(desvio) < 4
                        ? "bg-success-soft text-success"
                        : desvio > 0
                          ? "bg-danger-soft text-danger"
                          : "bg-warning-soft text-warning"
                    }
                  >
                    {desvio > 0 ? "+" : ""}
                    {fmtHoras(Math.abs(desvio))}
                  </Pill>
                </div>
              );
            })}
            {linhas.length === 0 ? <Vazio titulo="Sem dados de alocação" /> : null}
          </div>
        </Painel>
      </div>

      {editando ? (
        <PlanejarAlocacao
          profileId={editando.profileId}
          nome={editando.nome}
          semanas={semanas}
          projetos={projetos.map((p) => ({ id: p.id, nome: p.nome }))}
          onFechar={() => setEditando(null)}
        />
      ) : null}
    </>
  );
}

function PlanejarAlocacao({
  profileId,
  nome,
  semanas,
  projetos,
  onFechar,
}: {
  profileId: string;
  nome: string;
  semanas: string[];
  projetos: { id: string; nome: string }[];
  onFechar: () => void;
}) {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();
  const [projetoId, setProjetoId] = useState(projetos[0]?.id ?? "");
  const [semana, setSemana] = useState(semanas[0] ?? isoDate(inicioSemana(new Date())));
  const [horas, setHoras] = useState("20");

  const salvar = useMutation({
    mutationFn: async () => {
      if (!perfil) throw new Error("Perfil não carregado");
      if (!projetoId) throw new Error("Selecione um projeto");
      const valor = Number(horas.replace(",", "."));
      if (valor < 0 || valor > 80) throw new Error("Informe entre 0 e 80 horas");
      const { error } = await supabase
        .from("alocacoes")
        .upsert(
          {
            tenant_id: perfil.tenant_id,
            profile_id: profileId,
            projeto_id: projetoId,
            semana,
            horas_planejadas: valor,
          },
          { onConflict: "profile_id,projeto_id,semana" },
        );
      if (error) throw error;
      await registrarAuditoria({
        tenant_id: perfil.tenant_id,
        profile_id: perfil.id,
        entidade: "alocacao",
        acao: "planejou alocação",
        projeto_id: projetoId,
        valor_novo: `${nome}: ${valor}h na semana de ${semana}`,
      });
    },
    onSuccess: () => {
      toast.success("Alocação atualizada");
      void queryClient.invalidateQueries({ queryKey: ["alocacoes"] });
      onFechar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Painel>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-[17px] font-bold">Planejar alocação</h2>
              <p className="text-[12px] text-muted-foreground">{nome}</p>
            </div>
            <button onClick={onFechar} className="text-muted-foreground transition hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <Campo label="Projeto">
              <select value={projetoId} onChange={(e) => setProjetoId(e.target.value)} className={inputClasses}>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Semana">
              <select value={semana} onChange={(e) => setSemana(e.target.value)} className={inputClasses}>
                {semanas.map((s) => (
                  <option key={s} value={s}>
                    {rotuloSemana(s)}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Horas planejadas na semana">
              <input type="number" step="1" min="0" max="80" value={horas} onChange={(e) => setHoras(e.target.value)} className={inputClasses} />
            </Campo>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
            <BotaoPrimario onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              Salvar alocação
            </BotaoPrimario>
          </div>
        </Painel>
      </div>
    </div>
  );
}
