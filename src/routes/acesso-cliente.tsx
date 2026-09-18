import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BotaoPrimario, Campo, inputClasses } from "@/components/kit";
import { PORTAL_SESSAO_EXPIRADA, registrarEventoPortal, vincularPortal } from "@/lib/portal";

export const Route = createFileRoute("/acesso-cliente")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Portal do cliente · Projeta" },
      {
        name: "description",
        content: "Acompanhe o andamento, as fases, os prazos e os documentos do seu projeto.",
      },
      { property: "og:title", content: "Portal do cliente · Projeta" },
      {
        property: "og:description",
        content: "Área exclusiva para clientes acompanharem projetos, entregas e documentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcessoCliente,
});

type Modo = "entrar" | "criar" | "recuperar";

function AcessoCliente() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(PORTAL_SESSAO_EXPIRADA)) {
      sessionStorage.removeItem(PORTAL_SESSAO_EXPIRADA);
      toast.info("Sua sessão foi encerrada por inatividade. Entre novamente para continuar.");
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const ok = await vincularPortal().catch(() => false);
      if (ok) navigate({ to: "/portal", replace: true });
    });
  }, [navigate]);

  async function entrarNoPortal() {
    const autorizado = await vincularPortal();
    if (!autorizado) {
      await supabase.auth.signOut();
      throw new Error("Este e-mail ainda não foi autorizado. Fale com a equipe responsável pelo seu projeto.");
    }
    await registrarEventoPortal("login");
    sessionStorage.setItem("portal:acesso-registrado", "1");
    navigate({ to: "/portal", replace: true });
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        await entrarNoPortal();
        toast.success("Acesso liberado.");
      } else if (modo === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { emailRedirectTo: `${window.location.origin}/acesso-cliente` },
        });
        if (error) throw error;
        if (data.session) {
          await entrarNoPortal();
          toast.success("Senha criada. Bem-vindo ao portal!");
        } else {
          toast.success("Confira seu e-mail para confirmar o acesso.");
          setModo("entrar");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link para definir sua senha.");
        setModo("entrar");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível concluir o acesso.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="halo" style={{ width: 520, height: 520, top: -160, left: 60, background: "#8FE0B2" }} />
        <div className="halo" style={{ width: 420, height: 420, bottom: -170, right: 40, background: "#C9EFD9" }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="mb-5 flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-brand font-display text-sm font-bold text-primary-foreground shadow-lg shadow-brand/30">
            P
          </div>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-bold">Projeta</div>
            <div className="-mt-0.5 text-[11px] text-muted-foreground">Portal do cliente</div>
          </div>
        </Link>

        <div className="frost rounded-2xl p-6">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-2 py-1 text-[11px] font-semibold text-brand-ink">
            <ShieldCheck className="size-3.5" /> Acesso autorizado
          </div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">
            {modo === "entrar"
              ? "Acompanhe seu projeto"
              : modo === "criar"
                ? "Criar sua senha de acesso"
                : "Recuperar acesso"}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {modo === "recuperar"
              ? "Informe o e-mail autorizado e enviaremos um link para definir uma nova senha."
              : "Use o e-mail que você informou à equipe do projeto. Nenhum dado interno de custos é exibido aqui."}
          </p>

          <form onSubmit={enviar} className="mt-5 space-y-3">
            <Campo label="Seu e-mail">
              <input
                type="email"
                className={inputClasses}
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="voce@suaempresa.com.br"
                required
              />
            </Campo>

            {modo !== "recuperar" ? (
              <Campo label="Senha">
                <input
                  type="password"
                  className={inputClasses}
                  value={senha}
                  onChange={(ev) => setSenha(ev.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </Campo>
            ) : null}

            <BotaoPrimario type="submit" disabled={carregando} className="w-full justify-center">
              {carregando ? <Loader2 className="size-4 animate-spin" /> : null}
              {modo === "entrar" ? "Entrar no portal" : modo === "criar" ? "Criar senha" : "Enviar link"}
              {!carregando ? <ArrowRight className="size-4" /> : null}
            </BotaoPrimario>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12px]">
            {modo !== "recuperar" ? (
              <button className="font-medium text-brand" onClick={() => setModo("recuperar")}>
                Esqueci minha senha
              </button>
            ) : (
              <button className="font-medium text-brand" onClick={() => setModo("entrar")}>
                Voltar para o acesso
              </button>
            )}
            {modo === "entrar" ? (
              <button className="text-muted-foreground" onClick={() => setModo("criar")}>
                Primeiro acesso? <span className="font-medium text-brand">Criar senha</span>
              </button>
            ) : modo === "criar" ? (
              <button className="text-muted-foreground" onClick={() => setModo("entrar")}>
                Já tenho senha
              </button>
            ) : null}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          É da equipe interna?{" "}
          <Link to="/auth" className="font-medium text-brand">
            Entrar no workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
