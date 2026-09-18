import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEquipe, useTarefas } from "@/lib/dados";
import { estaAtrasada, fmtHoras, fmtMoeda } from "@/lib/enzova";
import { Avatar, Indicador, Painel, Pill, Progresso, TituloPagina, Vazio } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe · Enzova Projects" },
      { name: "description", content: "Pessoas, papéis de acesso e carga de trabalho da semana." },
      { property: "og:title", content: "Equipe" },
      { property: "og:description", content: "Pessoas, papéis de acesso e carga de trabalho." },
    ],
  }),
  component: Equipe,
});

function Equipe() {
  const { can } = useAuth();
  const { data: equipe = [], isLoading } = useEquipe();
  const { data: tarefas = [] } = useTarefas();

  const { data: papeis = [] } = useQuery({
    queryKey: ["usuario-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("usuario_roles").select("profile_id, roles(nome, slug)");
      if (error) throw error;
      return (data ?? []) as unknown as { profile_id: string; roles: { nome: string; slug: string } | null }[];
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

  const abertas = tarefas.filter((t) => t.status !== "concluida" && t.status !== "cancelada");
  const atrasadas = abertas.filter((t) => estaAtrasada(t.prazo, t.status));
  const capacidadeTotal = equipe.reduce((acc, m) => acc + Number(m.capacidade_semanal ?? 40), 0);
  const alocado = abertas.reduce((acc, t) => acc + Number(t.horas_estimadas ?? 0), 0);

  return (
    <>
      <TituloPagina
        sobretitulo={<>{equipe.length} pessoas na empresa</>}
        titulo="Equipe"
        descricao="Carga estimada da semana calculada pelas horas das tarefas abertas."
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
        <Indicador titulo="Tarefas atrasadas" valor={atrasadas.length} detalhe="em toda a equipe" tom={atrasadas.length ? "negativo" : "positivo"} />
      </div>

      {isLoading ? (
        <Painel>
          <Vazio titulo="Carregando equipe…" />
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
                  {!m.ativo ? <Pill className="ml-auto bg-secondary text-muted-foreground">Inativo</Pill> : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(papeisPorPessoa.get(m.id) ?? ["Sem papel"]).map((p) => (
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

      <Painel className="mt-4">
        <h2 className="font-display text-[15px] font-bold">Alocação avançada</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Mapa de capacidade por período, alocação percentual por projeto e custo real por pessoa entram na Fase 2.
        </p>
      </Painel>
    </>
  );
}
