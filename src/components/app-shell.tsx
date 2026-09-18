import {
  BarChart3, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  FolderKanban,
  GanttChartSquare,
  Gauge,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Timer,
  Users,
  Smile,
  Wallet,

  X,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Avatar, Progresso } from "@/components/kit";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/meu-trabalho", label: "Meu Trabalho", icon: Gauge },
  { to: "/clientes", label: "Clientes", icon: Building2 },
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/tarefas", label: "Tarefas", icon: ListChecks },
  { to: "/cronograma", label: "Cronograma", icon: GanttChartSquare },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/equipe", label: "Equipe", icon: Users },
  { to: "/capacidade", label: "Capacidade", icon: SlidersHorizontal },
  { to: "/horas", label: "Horas", icon: Timer },
  { to: "/riscos", label: "Riscos", icon: ShieldAlert },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/satisfacao", label: "Satisfação", icon: Smile },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },

  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { perfil, tenant, papeis, sair } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [notifAberta, setNotifAberta] = useState(false);

  useEffect(() => setMenuAberto(false), [pathname]);

  const { data: notificacoes } = useQuery({
    queryKey: ["notificacoes", perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("id, titulo, mensagem, tipo, lida, created_at")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const { data: capacidade } = useQuery({
    queryKey: ["capacidade-semana", perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas")
        .select("horas_estimadas, status")
        .eq("responsavel_id", perfil!.id)
        .in("status", ["a_fazer", "em_andamento", "em_validacao", "bloqueada"]);
      if (error) throw error;
      const alocado = (data ?? []).reduce((acc, t) => acc + Number(t.horas_estimadas ?? 0), 0);
      const capacidadeSemanal = Number(perfil?.capacidade_semanal ?? 40);
      return { alocado: Math.min(alocado, capacidadeSemanal * 2), capacidade: capacidadeSemanal };
    },
  });

  const naoLidas = (notificacoes ?? []).filter((n) => !n.lida).length;

  async function marcarTodasLidas() {
    if (!notificacoes?.length) return;
    await supabase
      .from("notificacoes")
      .update({ lida: true })
      .in(
        "id",
        notificacoes.filter((n) => !n.lida).map((n) => n.id),
      );
    void queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
  }

  async function handleSair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await sair();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-canvas text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="halo" style={{ width: 520, height: 520, top: -160, left: 120, background: "#8FE0B2" }} />
        <div className="halo" style={{ width: 460, height: 460, bottom: -180, right: 80, background: "#C9EFD9" }} />
        <div className="halo" style={{ width: 360, height: 360, top: "40%", left: "55%", background: "#E6F5ED", opacity: 0.4 }} />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 shrink-0 p-4 transition-transform lg:static lg:translate-x-0",
            menuAberto ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="frost flex h-full flex-col rounded-2xl p-4">
            <div className="flex items-center gap-2.5 px-2 py-2">
              <div className="grid size-9 place-items-center rounded-xl bg-brand font-display text-sm font-bold text-primary-foreground shadow-lg shadow-brand/30">
                E
              </div>
              <div className="leading-tight">
                <div className="font-display text-[15px] font-bold">Projeta</div>
                <div className="-mt-0.5 text-[11px] text-muted-foreground">Gestão de projetos</div>
              </div>
              <button className="ml-auto lg:hidden" onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 px-2">
              <div className="grid size-7 place-items-center rounded-lg bg-brand-soft font-display text-xs font-bold text-brand-ink">
                {(tenant?.nome ?? "EN").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 leading-tight">
                <div className="truncate text-[12px] font-semibold">{tenant?.nome ?? "Workspace"}</div>
                <div className="text-[10px] text-muted-foreground">
                  Plano {tenant?.plano ?? "pro"} · {tenant?.assentos ?? 5} assentos
                </div>
              </div>
            </div>

            <nav className="mt-5 flex-1 space-y-1 overflow-y-auto scroll-slim">
              {NAV.map((item) => {
                const ativo = pathname === item.to || pathname.startsWith(`${item.to}/`);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition",
                      ativo
                        ? "bg-card font-semibold text-brand shadow-sm"
                        : "font-medium text-muted-foreground hover:bg-card/60",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 rounded-xl border border-card bg-gradient-to-br from-brand/10 to-card/40 p-3">
              <div className="text-[11px] font-semibold text-muted-foreground">Capacidade da semana</div>
              <Progresso
                valor={capacidade ? (capacidade.alocado / capacidade.capacidade) * 100 : 0}
                className="mt-2 h-1.5"
              />
              <div className="mt-1.5 text-[10px] text-muted-foreground">
                {Math.round(capacidade?.alocado ?? 0)}h alocadas de {capacidade?.capacidade ?? 40}h
              </div>
            </div>
          </div>
        </aside>

        {menuAberto ? (
          <div className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setMenuAberto(false)} />
        ) : null}

        {/* Conteúdo */}
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="frost-soft flex items-center gap-3 rounded-none border-x-0 border-t-0 px-4 py-3 lg:px-6">
            <button className="lg:hidden" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
              <Menu className="size-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => setBuscaAberta(true)}
              className="frost-soft hidden max-w-md flex-1 items-center gap-3 rounded-xl px-3.5 py-2.5 text-left sm:flex"
            >
              <Search className="size-4 text-muted-foreground" />
              <span className="text-[13px] text-muted-foreground">Buscar projeto, tarefa, cliente…</span>
              <span className="ml-auto rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ⌘K
              </span>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setBuscaAberta(true)} className="sm:hidden" aria-label="Buscar">
                <Search className="size-5 text-muted-foreground" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setNotifAberta((v) => !v)}
                  className="frost-soft grid size-10 place-items-center rounded-xl"
                  aria-label="Notificações"
                >
                  <Bell className="size-4 text-muted-foreground" />
                </button>
                {naoLidas > 0 ? (
                  <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-danger text-[10px] font-bold text-primary-foreground ring-2 ring-card">
                    {naoLidas}
                  </span>
                ) : null}

                {notifAberta ? (
                  <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl bg-card p-3 shadow-2xl">
                    <div className="flex items-center justify-between px-1 pb-2">
                      <span className="font-display text-[14px] font-semibold">Notificações</span>
                      <button onClick={marcarTodasLidas} className="text-[11px] font-medium text-brand">
                        marcar como lidas
                      </button>
                    </div>
                    <div className="max-h-80 space-y-2 overflow-y-auto scroll-slim">
                      {(notificacoes ?? []).length === 0 ? (
                        <div className="px-1 py-4 text-[12px] text-muted-foreground">Nenhuma notificação por aqui.</div>
                      ) : (
                        (notificacoes ?? []).map((n) => (
                          <div
                            key={n.id}
                            className={cn("rounded-xl px-3 py-2", n.lida ? "bg-secondary/60" : "bg-brand-soft/60")}
                          >
                            <div className="text-[12px] font-medium">{n.titulo}</div>
                            {n.mensagem ? (
                              <div className="mt-0.5 text-[11px] text-muted-foreground">{n.mensagem}</div>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2.5 border-l border-border pl-3">
                <Avatar nome={perfil?.nome} className="size-10 rounded-xl text-[13px]" />
                <div className="hidden leading-tight sm:block">
                  <div className="text-[13px] font-semibold">{perfil?.nome ?? "—"}</div>
                  <div className="text-[11px] text-muted-foreground">{papeis[0] ?? perfil?.cargo ?? "Usuário"}</div>
                </div>
                <button onClick={handleSair} className="ml-1 text-muted-foreground hover:text-danger" title="Sair">
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 lg:p-6">{children}</div>
        </main>
      </div>

      {buscaAberta ? <BuscaGlobal onFechar={() => setBuscaAberta(false)} /> : null}
    </div>
  );
}

function BuscaGlobal({ onFechar }: { onFechar: () => void }) {
  const [termo, setTermo] = useState("");
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["busca-global", termo],
    enabled: termo.trim().length >= 2,
    queryFn: async () => {
      const like = `%${termo.trim()}%`;
      const [projetos, clientes, tarefas] = await Promise.all([
        supabase.from("projetos").select("id, nome, codigo").or(`nome.ilike.${like},codigo.ilike.${like}`).limit(5),
        supabase.from("clientes").select("id, nome").ilike("nome", like).limit(5),
        supabase.from("tarefas").select("id, titulo, projeto_id").ilike("titulo", like).limit(6),
      ]);
      return {
        projetos: projetos.data ?? [],
        clientes: clientes.data ?? [],
        tarefas: tarefas.data ?? [],
      };
    },
  });

  const vazio = useMemo(
    () => !data || (!data.projetos.length && !data.clientes.length && !data.tarefas.length),
    [data],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/25 p-4 pt-24" onClick={onFechar}>
      <div className="w-full max-w-xl rounded-2xl bg-card p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-2 pb-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar projeto, cliente, tarefa ou código…"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
          <ChevronDown className="size-4 rotate-90 text-muted-foreground" />
        </div>
        <div className="max-h-80 overflow-y-auto scroll-slim py-2">
          {termo.trim().length < 2 ? (
            <div className="px-3 py-4 text-[12px] text-muted-foreground">Digite ao menos 2 caracteres.</div>
          ) : vazio ? (
            <div className="px-3 py-4 text-[12px] text-muted-foreground">Nada encontrado.</div>
          ) : (
            <>
              {data!.projetos.map((p) => (
                <button
                  key={p.id}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-secondary"
                  onClick={() => {
                    onFechar();
                    navigate({ to: "/projetos/$projetoId", params: { projetoId: p.id } });
                  }}
                >
                  <FolderKanban className="size-4 text-brand" />
                  <span className="text-[13px] font-medium">{p.nome}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">{p.codigo}</span>
                </button>
              ))}
              {data!.clientes.map((c) => (
                <button
                  key={c.id}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-secondary"
                  onClick={() => {
                    onFechar();
                    navigate({ to: "/clientes/$clienteId", params: { clienteId: c.id } });
                  }}
                >
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="text-[13px] font-medium">{c.nome}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">Cliente</span>
                </button>
              ))}
              {data!.tarefas.map((t) => (
                <button
                  key={t.id}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-secondary"
                  onClick={() => {
                    onFechar();
                    navigate({ to: "/projetos/$projetoId", params: { projetoId: t.projeto_id } });
                  }}
                >
                  <ListChecks className="size-4 text-muted-foreground" />
                  <span className="text-[13px] font-medium">{t.titulo}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">Tarefa</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
