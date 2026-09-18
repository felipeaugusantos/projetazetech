import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMonths, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange, Check, Flag, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { registrarAuditoria, useEquipe, useMarcos, useProjetos, useTarefas } from "@/lib/dados";
import { FASE_STATUS, MARCO_STATUS, fmtData, isoDate, type FaseStatus, type MarcoStatus } from "@/lib/enzova";
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

export const Route = createFileRoute("/_authenticated/cronograma")({
  head: () => ({
    meta: [
      { title: "Cronograma · Projeta" },
      { name: "description", content: "Cronograma visual das fases, marcos e entregas de cada projeto." },
      { property: "og:title", content: "Cronograma e marcos" },
      { property: "og:description", content: "Linha do tempo das fases e marcos de entrega dos projetos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cronograma,
});

type Fase = {
  id: string;
  nome: string;
  ordem: number;
  data_inicio: string | null;
  prazo: string | null;
  status: FaseStatus;
  progresso: number;
  responsavel_id: string | null;
};

function Cronograma() {
  const { can } = useAuth();
  const { data: projetos = [] } = useProjetos();
  const { data: marcos = [] } = useMarcos();
  const { data: tarefas = [] } = useTarefas();
  const [projetoId, setProjetoId] = useState<string>("");
  const [novoMarco, setNovoMarco] = useState(false);

  const projetoAtual = projetoId || projetos[0]?.id || "";
  const projeto = projetos.find((p) => p.id === projetoAtual);

  const { data: fases = [] } = useQuery({
    queryKey: ["fases-cronograma", projetoAtual],
    enabled: !!projetoAtual,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_fases")
        .select("id, nome, ordem, data_inicio, prazo, status, progresso, responsavel_id")
        .eq("projeto_id", projetoAtual)
        .is("deleted_at", null)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Fase[];
    },
  });

  const marcosProjeto = marcos.filter((m) => m.projeto_id === projetoAtual);

  const janela = useMemo(() => {
    const datas: Date[] = [];
    for (const f of fases) {
      if (f.data_inicio) datas.push(parseISO(f.data_inicio));
      if (f.prazo) datas.push(parseISO(f.prazo));
    }
    for (const m of marcosProjeto) if (m.data) datas.push(parseISO(m.data));
    if (projeto?.data_inicio) datas.push(parseISO(projeto.data_inicio));
    if (projeto?.prazo) datas.push(parseISO(projeto.prazo));
    if (!datas.length) {
      const hoje = new Date();
      return { inicio: startOfMonth(hoje), fim: endOfMonth(addMonths(hoje, 2)) };
    }
    const min = new Date(Math.min(...datas.map((d) => d.getTime())));
    const max = new Date(Math.max(...datas.map((d) => d.getTime())));
    return { inicio: startOfMonth(min), fim: endOfMonth(max) };
  }, [fases, marcosProjeto, projeto]);

  const totalDias = Math.max(1, differenceInCalendarDays(janela.fim, janela.inicio));
  const pos = (data: string | Date) => {
    const d = typeof data === "string" ? parseISO(data) : data;
    return Math.max(0, Math.min(100, (differenceInCalendarDays(d, janela.inicio) / totalDias) * 100));
  };

  const meses = useMemo(() => {
    const lista: { label: string; left: number; width: number }[] = [];
    let cursor = startOfMonth(janela.inicio);
    while (cursor <= janela.fim) {
      const fimMes = endOfMonth(cursor);
      lista.push({
        label: format(cursor, "MMM yy", { locale: ptBR }),
        left: pos(cursor),
        width: pos(fimMes > janela.fim ? janela.fim : fimMes) - pos(cursor),
      });
      cursor = addMonths(cursor, 1);
    }
    return lista;
  }, [janela]);

  const hojePos = pos(new Date());
  const atrasados = marcos.filter((m) => m.status === "atrasado").length;
  const atingidos = marcos.filter((m) => m.status === "atingido").length;
  const proximos = marcos
    .filter((m) => m.status === "previsto" && m.data && m.data >= isoDate(new Date()))
    .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""))
    .slice(0, 6);

  return (
    <>
      <TituloPagina
        sobretitulo={
          <>
            <CalendarRange className="size-3.5" /> Fases, marcos e entregas
          </>
        }
        titulo="Cronograma"
        descricao="Linha do tempo do projeto com as fases planejadas e os marcos de aceite do cliente."
        acoes={
          can("marco.gerenciar") ? (
            <BotaoPrimario onClick={() => setNovoMarco(true)}>
              <Plus className="size-4" /> Novo marco
            </BotaoPrimario>
          ) : null
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Marcos no portfólio" valor={marcos.length} detalhe={`${projetos.length} projetos`} />
        <Indicador titulo="Marcos atingidos" valor={atingidos} detalhe="entregas confirmadas" tom="positivo" />
        <Indicador titulo="Marcos atrasados" valor={atrasados} detalhe="data prevista vencida" tom={atrasados ? "negativo" : "neutro"} />
        <Indicador
          titulo="Entregas ao cliente"
          valor={marcos.filter((m) => m.entrega_cliente).length}
          detalhe="marcos com aceite externo"
        />
      </div>

      <Painel className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[15px] font-bold">{projeto?.nome ?? "Nenhum projeto"}</h2>
            <div className="text-[11px] text-muted-foreground">
              {projeto?.clientes?.nome ?? "—"} · {fmtData(projeto?.data_inicio)} a {fmtData(projeto?.prazo)}
            </div>
          </div>
          <select value={projetoAtual} onChange={(e) => setProjetoId(e.target.value)} className={cn(inputClasses, "w-auto min-w-56")}>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="min-w-3xl">
            <div className="flex">
              <div className="w-52 shrink-0" />
              <div className="relative h-6 flex-1">
                {meses.map((m) => (
                  <div
                    key={m.label}
                    className="absolute top-0 text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
                    style={{ left: `${m.left}%`, width: `${m.width}%` }}
                  >
                    <span className="border-l border-border pl-1.5">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {fases.map((f) => {
                const inicio = f.data_inicio ?? projeto?.data_inicio ?? isoDate(janela.inicio);
                const fim = f.prazo ?? projeto?.prazo ?? isoDate(janela.fim);
                const left = pos(inicio);
                const width = Math.max(2, pos(fim) - left);
                return (
                  <div key={f.id} className="flex items-center">
                    <div className="w-52 shrink-0 pr-3">
                      <div className="truncate text-[12px] font-medium">{f.nome}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {fmtData(f.data_inicio)} — {fmtData(f.prazo)}
                      </div>
                    </div>
                    <div className="relative h-9 flex-1 rounded-lg bg-secondary/50">
                      <div
                        className={cn(
                          "absolute top-1.5 h-6 rounded-lg px-2 text-[10px] font-semibold leading-6 text-primary-foreground",
                          f.status === "concluida" ? "bg-success" : f.status === "bloqueada" ? "bg-danger" : "bg-brand",
                        )}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${f.nome} · ${FASE_STATUS[f.status].label} · ${f.progresso}%`}
                      >
                        <span className="block truncate">{f.progresso}%</span>
                      </div>
                      {marcosProjeto
                        .filter((m) => m.fase_id === f.id && m.data)
                        .map((m) => (
                          <span
                            key={m.id}
                            title={`${m.nome} · ${fmtData(m.data)}`}
                            className={cn(
                              "absolute top-3 size-3 rotate-45 rounded-[2px] ring-2 ring-card",
                              m.status === "atingido" ? "bg-success" : m.status === "atrasado" ? "bg-danger" : "bg-warning",
                            )}
                            style={{ left: `calc(${pos(m.data!)}% - 6px)` }}
                          />
                        ))}
                      <span className="absolute inset-y-0 w-px bg-danger/70" style={{ left: `${hojePos}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {fases.length === 0 ? <Vazio titulo="Projeto sem fases cadastradas" /> : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded bg-brand" /> Fase em andamento
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded bg-success" /> Fase concluída
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rotate-45 rounded-[2px] bg-warning" /> Marco previsto
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-px bg-danger" /> Hoje
          </span>
        </div>
      </Painel>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <MarcosProjeto marcos={marcosProjeto} projetoId={projetoAtual} fases={fases} />

        <Painel>
          <h2 className="font-display text-[15px] font-bold">Próximas entregas do portfólio</h2>
          <div className="mt-4 space-y-2">
            {proximos.map((m) => {
              const p = projetos.find((x) => x.id === m.projeto_id);
              return (
                <Link
                  key={m.id}
                  to="/projetos/$projetoId"
                  params={{ projetoId: m.projeto_id }}
                  className="frost-soft flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-card"
                >
                  <Flag className="size-4 shrink-0 text-brand" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{m.nome}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{p?.nome ?? "—"}</div>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold">{fmtData(m.data)}</span>
                </Link>
              );
            })}
            {proximos.length === 0 ? <Vazio titulo="Nenhum marco futuro previsto" /> : null}
          </div>
        </Painel>
      </div>

      {novoMarco ? (
        <NovoMarcoModal projetoId={projetoAtual} fases={fases} onFechar={() => setNovoMarco(false)} />
      ) : null}
    </>
  );
}

function MarcosProjeto({
  marcos,
  projetoId,
  fases,
}: {
  marcos: { id: string; nome: string; data: string | null; data_real: string | null; status: MarcoStatus; entrega_cliente: boolean; fase_id: string | null; responsavel_id: string | null }[];
  projetoId: string;
  fases: Fase[];
}) {
  const { perfil, can } = useAuth();
  const queryClient = useQueryClient();
  const { data: equipe = [] } = useEquipe();

  const concluir = useMutation({
    mutationFn: async (marcoId: string) => {
      if (!perfil) throw new Error("Perfil não carregado");
      const { error } = await supabase
        .from("marcos")
        .update({ status: "atingido", data_real: isoDate(new Date()) })
        .eq("id", marcoId);
      if (error) throw error;
      await registrarAuditoria({
        tenant_id: perfil.tenant_id,
        profile_id: perfil.id,
        entidade: "marco",
        entidade_id: marcoId,
        acao: "marcou entrega como atingida",
        projeto_id: projetoId,
      });
    },
    onSuccess: () => {
      toast.success("Marco atingido");
      void queryClient.invalidateQueries({ queryKey: ["marcos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Painel>
      <h2 className="font-display text-[15px] font-bold">Marcos do projeto</h2>
      <div className="mt-4 space-y-2">
        {marcos.map((m) => {
          const responsavel = equipe.find((p) => p.id === m.responsavel_id);
          const fase = fases.find((f) => f.id === m.fase_id);
          return (
            <div key={m.id} className="frost-soft flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5">
              <Avatar nome={responsavel?.nome} tone={m.status === "atingido" ? "muted" : "brand"} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium">{m.nome}</span>
                  {m.entrega_cliente ? <Pill className="bg-brand-soft text-brand-ink">Cliente</Pill> : null}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {fase ? `${fase.nome} · ` : ""}previsto {fmtData(m.data)}
                  {m.data_real ? ` · entregue ${fmtData(m.data_real)}` : ""}
                </div>
              </div>
              <Pill className={MARCO_STATUS[m.status].pill}>{MARCO_STATUS[m.status].label}</Pill>
              {can("marco.gerenciar") && m.status !== "atingido" ? (
                <BotaoSecundario onClick={() => concluir.mutate(m.id)} disabled={concluir.isPending}>
                  <Check className="size-4" /> Atingido
                </BotaoSecundario>
              ) : null}
            </div>
          );
        })}
        {marcos.length === 0 ? <Vazio titulo="Nenhum marco neste projeto" descricao="Cadastre os pontos de aceite e entregas." /> : null}
      </div>
      <Progresso
        valor={marcos.length ? (marcos.filter((m) => m.status === "atingido").length / marcos.length) * 100 : 0}
        className="mt-4 h-1.5"
      />
      <div className="mt-1.5 text-[11px] text-muted-foreground">
        {marcos.filter((m) => m.status === "atingido").length} de {marcos.length} marcos atingidos
      </div>
    </Painel>
  );
}

function NovoMarcoModal({ projetoId, fases, onFechar }: { projetoId: string; fases: Fase[]; onFechar: () => void }) {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();
  const { data: equipe = [] } = useEquipe();
  const [nome, setNome] = useState("");
  const [data, setData] = useState(isoDate(new Date()));
  const [faseId, setFaseId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [entrega, setEntrega] = useState(true);
  const [descricao, setDescricao] = useState("");

  const salvar = useMutation({
    mutationFn: async () => {
      if (!perfil) throw new Error("Perfil não carregado");
      if (!nome.trim()) throw new Error("Informe o nome do marco");
      const { error } = await supabase.from("marcos").insert({
        tenant_id: perfil.tenant_id,
        projeto_id: projetoId,
        fase_id: faseId || null,
        nome: nome.trim(),
        descricao: descricao || null,
        data,
        status: "previsto",
        entrega_cliente: entrega,
        responsavel_id: responsavelId || null,
      });
      if (error) throw error;
      await registrarAuditoria({
        tenant_id: perfil.tenant_id,
        profile_id: perfil.id,
        entidade: "marco",
        acao: "criou marco",
        projeto_id: projetoId,
        valor_novo: nome.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Marco criado");
      void queryClient.invalidateQueries({ queryKey: ["marcos"] });
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
              <h2 className="font-display text-[17px] font-bold">Novo marco</h2>
              <p className="text-[12px] text-muted-foreground">Pontos de controle e entregas com aceite do cliente.</p>
            </div>
            <button onClick={onFechar} className="text-muted-foreground transition hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Campo label="Nome do marco" className="sm:col-span-2">
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Aceite da homologação" className={inputClasses} />
            </Campo>
            <Campo label="Data prevista">
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClasses} />
            </Campo>
            <Campo label="Fase">
              <select value={faseId} onChange={(e) => setFaseId(e.target.value)} className={inputClasses}>
                <option value="">Sem fase</option>
                {fases.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
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
            <Campo label="Descrição" className="sm:col-span-2">
              <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className={inputClasses} />
            </Campo>
          </div>

          <label className="mt-3 flex items-center gap-2 text-[12px]">
            <input type="checkbox" checked={entrega} onChange={(e) => setEntrega(e.target.checked)} className="size-4 accent-brand" />
            Entrega com aceite do cliente
          </label>

          <div className="mt-5 flex justify-end gap-2">
            <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
            <BotaoPrimario onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              Criar marco
            </BotaoPrimario>
          </div>
        </Painel>
      </div>
    </div>
  );
}
