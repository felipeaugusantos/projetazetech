import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PORTAL_INATIVIDADE_MIN,
  PORTAL_SESSAO_EXPIRADA,
  registrarEventoPortal,
  usePortalResumo,
  vincularPortal,
} from "@/lib/portal";

export const Route = createFileRoute("/portal")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/acesso-cliente" });
    const autorizado = await vincularPortal().catch(() => false);
    if (!autorizado) throw redirect({ to: "/acesso-cliente" });
  },
  component: PortalLayout,
});

function PortalLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = usePortalResumo();
  const [saindo, setSaindo] = useState(false);
  const encerrando = useRef(false);

  useEffect(() => {
    document.title = "Portal do cliente · Projeta";
  }, []);

  // Registra o acesso uma vez por sessão do navegador.
  useEffect(() => {
    if (sessionStorage.getItem("portal:acesso-registrado")) return;
    sessionStorage.setItem("portal:acesso-registrado", "1");
    void registrarEventoPortal("login");
  }, []);

  const encerrar = useCallback(
    async (motivo: "logout" | "sessao_expirada") => {
      if (encerrando.current) return;
      encerrando.current = true;
      setSaindo(true);
      await registrarEventoPortal(motivo);
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      sessionStorage.removeItem("portal:acesso-registrado");
      if (motivo === "sessao_expirada") sessionStorage.setItem(PORTAL_SESSAO_EXPIRADA, "1");
      navigate({ to: "/acesso-cliente", replace: true });
    },
    [navigate, queryClient],
  );

  // Expira a sessão após inatividade.
  useEffect(() => {
    let ultimaAtividade = Date.now();
    const marcar = () => {
      ultimaAtividade = Date.now();
    };
    const eventos = ["pointerdown", "keydown", "scroll", "visibilitychange"] as const;
    eventos.forEach((e) => window.addEventListener(e, marcar, { passive: true }));

    const timer = window.setInterval(() => {
      if (Date.now() - ultimaAtividade > PORTAL_INATIVIDADE_MIN * 60_000) void encerrar("sessao_expirada");
    }, 30_000);

    return () => {
      eventos.forEach((e) => window.removeEventListener(e, marcar));
      window.clearInterval(timer);
    };
  }, [encerrar]);

  const tema = data?.tema ?? null;
  const cor = tema?.cor_primaria ?? null;
  const destaque = tema?.cor_destaque ?? null;
  const marca = tema?.nome_exibicao ?? data?.empresa?.nome ?? "Projeta";

  const estiloTema = {
    ...(cor
      ? {
          "--primary": cor,
          "--brand-ink": cor,
          "--brand-hover": cor,
          "--brand-soft": `color-mix(in oklab, ${cor} 12%, white)`,
        }
      : {}),
    ...(destaque ? { "--neon": destaque, "--neon-hover": destaque } : {}),
  } as CSSProperties;

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas" style={estiloTema}>
      <div className="pointer-events-none absolute inset-0">
        <div className="halo" style={{ width: 620, height: 620, top: -240, left: -60, background: "#C9EFD9" }} />
        <div className="halo" style={{ width: 460, height: 460, bottom: -200, right: -40, background: "#E6F5ED" }} />
      </div>

      <header className="relative z-10 border-b border-border/70 bg-card/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5">
          <Link to="/portal" className="flex items-center gap-2.5">
            {tema?.logo_url ? (
              <img src={tema.logo_url} alt={marca} className="h-9 max-w-[140px] rounded-lg object-contain" />
            ) : (
              <div className="grid size-9 place-items-center rounded-xl bg-brand font-display text-sm font-bold text-primary-foreground shadow-lg shadow-brand/30">
                {marca.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="leading-tight">
              <div className="font-display text-[15px] font-bold">{marca}</div>
              <div className="-mt-0.5 text-[11px] text-muted-foreground">Portal do cliente</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-[13px] font-semibold">{data?.acesso?.nome ?? "Cliente"}</div>
              <div className="text-[11px] text-muted-foreground">
                {data?.cliente?.nome_fantasia ?? data?.cliente?.nome ?? ""}
              </div>
            </div>

            <Link
              to="/portal/senha"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <KeyRound className="size-4" />
              <span className="hidden sm:inline">Senha</span>
            </Link>

            <button
              onClick={() => void encerrar("logout")}
              disabled={saindo}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              {saindo ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-7">
        {isLoading ? (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando seus projetos…
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <footer className="relative z-10 pb-6 text-center text-[11px] text-muted-foreground">
        Por segurança, sua sessão é encerrada após {PORTAL_INATIVIDADE_MIN} minutos sem uso.
      </footer>
    </div>
  );
}
