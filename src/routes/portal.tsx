import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePortalResumo, vincularPortal } from "@/lib/portal";

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

  useEffect(() => {
    document.title = "Portal do cliente · Projeta";
  }, []);

  async function sair() {
    setSaindo(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/acesso-cliente", replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute inset-0">
        <div className="halo" style={{ width: 620, height: 620, top: -240, left: -60, background: "#C9EFD9" }} />
        <div className="halo" style={{ width: 460, height: 460, bottom: -200, right: -40, background: "#E6F5ED" }} />
      </div>

      <header className="relative z-10 border-b border-border/70 bg-card/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5">
          <Link to="/portal" className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-brand font-display text-sm font-bold text-primary-foreground shadow-lg shadow-brand/30">
              P
            </div>
            <div className="leading-tight">
              <div className="font-display text-[15px] font-bold">{data?.empresa?.nome ?? "Projeta"}</div>
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
            <button
              onClick={sair}
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
    </div>
  );
}
