import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Smile, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtData } from "@/lib/enzova";
import { Indicador, Painel, Pill, TituloPagina, Vazio, inputClasses } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/satisfacao")({
  head: () => ({
    meta: [
      { title: "Satisfação do cliente · Projeta" },
      {
        name: "description",
        content: "Resultados das pesquisas de satisfação respondidas pelos clientes nos projetos concluídos.",
      },
      { property: "og:title", content: "Satisfação do cliente" },
      { property: "og:description", content: "Notas, recomendação e comentários dos clientes por projeto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Satisfacao,
});

type Resposta = {
  id: string;
  nota_geral: number;
  nota_prazo: number | null;
  nota_qualidade: number | null;
  nota_comunicacao: number | null;
  recomendaria: number | null;
  comentario: string | null;
  created_at: string;
  projetos: { id: string; codigo: string; nome: string } | null;
  clientes: { id: string; nome: string } | null;
  portal_acessos: { nome: string } | null;
};

function media(valores: (number | null)[]) {
  const nums = valores.filter((v): v is number => typeof v === "number");
  if (!nums.length) return null;
  return nums.reduce((t, v) => t + v, 0) / nums.length;
}

function Estrelas({ valor }: { valor: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={n <= valor ? "size-3.5 fill-brand text-brand" : "size-3.5 text-muted-foreground/35"} />
      ))}
    </span>
  );
}

function Satisfacao() {
  const { can } = useAuth();
  const [cliente, setCliente] = useState("todos");

  const { data: respostas } = useQuery({
    queryKey: ["pesquisas-satisfacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pesquisas_satisfacao")
        .select(
          "id, nota_geral, nota_prazo, nota_qualidade, nota_comunicacao, recomendaria, comentario, created_at, projetos(id, codigo, nome), clientes(id, nome), portal_acessos(nome)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Resposta[];
    },
  });

  const lista = respostas ?? [];
  const clientes = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const r of lista) if (r.clientes) mapa.set(r.clientes.id, r.clientes.nome);
    return [...mapa.entries()];
  }, [lista]);

  const filtradas = cliente === "todos" ? lista : lista.filter((r) => r.clientes?.id === cliente);

  const geral = media(filtradas.map((r) => r.nota_geral));
  const prazo = media(filtradas.map((r) => r.nota_prazo));
  const qualidade = media(filtradas.map((r) => r.nota_qualidade));
  const comunicacao = media(filtradas.map((r) => r.nota_comunicacao));
  const notas = filtradas.map((r) => r.recomendaria).filter((v): v is number => typeof v === "number");
  const promotores = notas.filter((n) => n >= 9).length;
  const detratores = notas.filter((n) => n <= 6).length;
  const nps = notas.length ? Math.round(((promotores - detratores) / notas.length) * 100) : null;

  if (!can("relatorio.ver") && !can("projeto.ver")) {
    return (
      <Painel>
        <Vazio titulo="Sem acesso" descricao="Você não tem permissão para ver os resultados das pesquisas." />
      </Painel>
    );
  }

  return (
    <>
      <TituloPagina
        sobretitulo={
          <>
            <Smile className="size-4 text-brand" /> <span>Voz do cliente</span>
          </>
        }
        titulo="Satisfação do cliente"
        descricao="Avaliações enviadas pelos clientes no portal após a conclusão dos projetos."
        acoes={
          clientes.length > 1 ? (
            <select
              className={`${inputClasses} w-auto`}
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
            >
              <option value="todos">Todos os clientes</option>
              {clientes.map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </select>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador
          titulo="Satisfação geral"
          valor={geral ? geral.toFixed(1) : "—"}
          detalhe={`${filtradas.length} avaliações`}
          tom={geral && geral >= 4 ? "positivo" : geral && geral < 3 ? "negativo" : "neutro"}
          {...(geral ? { progresso: (geral / 5) * 100 } : {})}
        />
        <Indicador titulo="Prazos" valor={prazo ? prazo.toFixed(1) : "—"} detalhe="Média de 1 a 5" />
        <Indicador titulo="Qualidade" valor={qualidade ? qualidade.toFixed(1) : "—"} detalhe="Média de 1 a 5" />
        <Indicador
          titulo="NPS"
          valor={nps === null ? "—" : nps}
          detalhe={`${promotores} promotores · ${detratores} detratores`}
          tom={nps !== null && nps >= 50 ? "positivo" : nps !== null && nps < 0 ? "negativo" : "neutro"}
        />
      </div>

      <Painel className="mt-6">
        <h2 className="font-display text-[15px] font-semibold">Avaliações recebidas</h2>
        <p className="text-[11.5px] text-muted-foreground">
          Comunicação média: {comunicacao ? comunicacao.toFixed(1) : "—"} de 5.
        </p>
        <div className="mt-3 divide-y divide-border/70">
          {filtradas.map((r) => (
            <div key={r.id} className="py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.projetos ? (
                      <Link
                        to="/projetos/$projetoId"
                        params={{ projetoId: r.projetos.id }}
                        className="text-[13.5px] font-semibold transition hover:text-brand"
                      >
                        {r.projetos.nome}
                      </Link>
                    ) : (
                      <span className="text-[13.5px] font-semibold">Projeto removido</span>
                    )}
                    <Pill className="bg-brand-soft text-brand-ink">{r.projetos?.codigo ?? "—"}</Pill>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {r.clientes?.nome ?? "—"}
                    {r.portal_acessos?.nome ? ` · ${r.portal_acessos.nome}` : ""} ·{" "}
                    {fmtData(r.created_at, "dd MMM yyyy")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Estrelas valor={r.nota_geral} />
                  {typeof r.recomendaria === "number" ? (
                    <Pill
                      className={
                        r.recomendaria >= 9
                          ? "bg-success/12 text-success"
                          : r.recomendaria <= 6
                            ? "bg-danger/12 text-danger"
                            : "bg-warning/12 text-warning"
                      }
                    >
                      NPS {r.recomendaria}
                    </Pill>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-muted-foreground">
                <span>Prazo: {r.nota_prazo ?? "—"}/5</span>
                <span>Qualidade: {r.nota_qualidade ?? "—"}/5</span>
                <span>Comunicação: {r.nota_comunicacao ?? "—"}/5</span>
              </div>

              {r.comentario ? (
                <p className="mt-2 rounded-xl bg-secondary px-3 py-2 text-[12.5px] whitespace-pre-line">
                  {r.comentario}
                </p>
              ) : null}
            </div>
          ))}
          {filtradas.length === 0 ? (
            <Vazio
              titulo="Nenhuma avaliação ainda"
              descricao="Os clientes podem avaliar cada projeto pelo portal depois que ele é concluído."
            />
          ) : null}
        </div>
      </Painel>
    </>
  );
}
