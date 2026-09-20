import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, Clock, Download, FileCheck2, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Indicador, Painel, Pill, TituloPagina, Vazio } from "@/components/kit";
import { MARCO_STATUS, diasRestantes, fmtData, fmtHoras } from "@/lib/enzova";
import { baixarDocumento, usePortalPainel, usePortalSatisfacao } from "@/lib/portal";

export const Route = createFileRoute("/portal/painel")({
  head: () => ({
    meta: [
      { title: "Painel · Portal do cliente" },
      { name: "description", content: "Prazos, documentos aprovados e horas dedicadas aos seus projetos." },
      { property: "og:title", content: "Painel · Portal do cliente" },
      { property: "og:description", content: "Prazos, documentos aprovados e horas por pessoa nos seus projetos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalPainelPage,
});

function PortalPainelPage() {
  const { data, isLoading } = usePortalPainel();
  const [baixando, setBaixando] = useState<string | null>(null);

  const prazos = data?.prazos ?? [];
  const documentos = data?.documentos ?? [];
  const pessoas = data?.horas_por_pessoa ?? [];
  const projetos = data?.horas_por_projeto ?? [];

  const proximos = useMemo(
    () =>
      [...prazos]
        .filter((p) => p.status !== "atingido" && p.status !== "cancelado")
        .sort((a, b) => (a.data ?? "9999").localeCompare(b.data ?? "9999")),
    [prazos],
  );
  const atrasados = proximos.filter((p) => {
    const d = diasRestantes(p.data);
    return d !== null && d < 0;
  }).length;
  const totalHoras = pessoas.reduce((t, p) => t + Number(p.horas ?? 0), 0);

  const graficoPessoas = pessoas.slice(0, 8).map((p) => ({
    nome: p.nome.split(" ")[0] ?? p.nome,
    horas: Number(p.horas ?? 0),
  }));

  async function abrir(id: string) {
    setBaixando(id);
    try {
      const url = await baixarDocumento(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível abrir o documento agora.");
    } finally {
      setBaixando(null);
    }
  }

  return (
    <>
      <TituloPagina
        sobretitulo={<span>Visão geral</span>}
        titulo="Painel"
        descricao="Prazos das entregas, documentos já aprovados e horas dedicadas aos seus projetos."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador titulo="Entregas previstas" valor={proximos.length} detalhe={`${prazos.length} no total`} />
        <Indicador titulo="Entregas em atraso" valor={atrasados} tom={atrasados ? "negativo" : "positivo"} />
        <Indicador titulo="Documentos aprovados" valor={documentos.length} />
        <Indicador titulo="Horas dedicadas" valor={fmtHoras(totalHoras)} detalhe={`${pessoas.length} pessoas`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Painel>
          <div className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold">
            <CalendarClock className="size-4 text-brand" /> Próximos prazos
          </div>
          {isLoading ? null : proximos.length === 0 ? (
            <Vazio titulo="Nenhum prazo previsto" descricao="Assim que houver entregas programadas, elas aparecem aqui." />
          ) : (
            <ul className="divide-y divide-border/70">
              {proximos.slice(0, 10).map((p) => {
                const dias = diasRestantes(p.data);
                const st = MARCO_STATUS[p.status as keyof typeof MARCO_STATUS] ?? MARCO_STATUS.previsto;
                return (
                  <li key={`${p.tipo}-${p.id}`} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold">{p.nome}</div>
                      <Link
                        to="/portal/$projetoId"
                        params={{ projetoId: p.projeto_id }}
                        className="text-[11.5px] text-muted-foreground hover:text-brand"
                      >
                        {p.codigo} · {p.projeto}
                      </Link>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Pill className={st.pill}>{p.data ? fmtData(p.data, "dd MMM yyyy") : "sem data"}</Pill>
                      <span className={dias !== null && dias < 0 ? "text-[11px] text-danger" : "text-[11px] text-muted-foreground"}>
                        {dias === null ? "a definir" : dias < 0 ? `${Math.abs(dias)} dias de atraso` : `${dias} dias`}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Painel>

        <Painel>
          <div className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold">
            <Users className="size-4 text-brand" /> Horas por pessoa
          </div>
          {graficoPessoas.length === 0 ? (
            <Vazio titulo="Sem horas registradas" descricao="As horas aparecem aqui após a aprovação interna." />
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={graficoPessoas}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <Tooltip formatter={(v: number) => fmtHoras(v)} />
                    <Bar dataKey="horas" name="Horas" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 divide-y divide-border/70">
                {pessoas.slice(0, 8).map((p) => (
                  <li key={p.profile_id} className="flex items-center gap-2.5 py-2">
                    <Avatar nome={p.nome} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{p.nome}</div>
                      {p.cargo ? <div className="text-[11px] text-muted-foreground">{p.cargo}</div> : null}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold">
                      <Clock className="size-3.5 text-brand" /> {fmtHoras(Number(p.horas ?? 0))}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Painel>

        <Painel className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold">
            <FileCheck2 className="size-4 text-brand" /> Documentos aprovados
          </div>
          {documentos.length === 0 ? (
            <Vazio titulo="Nenhum documento aprovado" descricao="Os documentos liberados para você aparecem aqui." />
          ) : (
            <ul className="divide-y divide-border/70">
              {documentos.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold">{d.nome}</div>
                    <div className="text-[11.5px] text-muted-foreground">
                      {d.codigo} · {d.projeto} · {d.categoria}
                      {d.aprovado_em ? ` · aprovado em ${fmtData(d.aprovado_em, "dd MMM yyyy")}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => void abrir(d.id)}
                    disabled={baixando === d.id}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium text-brand transition hover:bg-brand-soft disabled:opacity-60"
                  >
                    <Download className="size-3.5" /> Abrir documento
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Painel>

        {projetos.length ? (
          <Painel className="lg:col-span-2">
            <div className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold">
              <Clock className="size-4 text-brand" /> Horas por projeto
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projetos.map((p) => ({ nome: p.codigo, horas: Number(p.horas ?? 0) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip formatter={(v: number) => fmtHoras(v)} />
                  <Bar dataKey="horas" name="Horas" fill="var(--neon)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Painel>
        ) : null}
      </div>
    </>
  );
}
