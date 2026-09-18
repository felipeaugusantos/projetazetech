import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BotaoPrimario, Campo, inputClasses } from "@/components/kit";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar · Projeta" },
      { name: "description", content: "Acesse o workspace da sua empresa no Projeta." },
      { property: "og:title", content: "Entrar no Projeta" },
      { property: "og:description", content: "Login do workspace de gestão de projetos." },
    ],
  }),
  component: AuthPage,
});

type Modo = "entrar" | "criar" | "recuperar";

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/dashboard", replace: true });
      } else if (modo === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { emailRedirectTo: window.location.origin, data: { nome } },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada!");
          navigate({ to: "/dashboard", replace: true });
        } else {
          toast.success("Confira seu e-mail para confirmar o acesso.");
          setModo("entrar");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de redefinição para o seu e-mail.");
        setModo("entrar");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível concluir a operação.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="halo" style={{ width: 520, height: 520, top: -160, left: 80, background: "#60A5FA" }} />
        <div className="halo" style={{ width: 420, height: 420, bottom: -160, right: 60, background: "#A5B4FC" }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="mb-5 flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-brand font-display text-sm font-bold text-primary-foreground shadow-lg shadow-brand/30">
            E
          </div>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-bold">Projeta</div>
            <div className="-mt-0.5 text-[11px] text-muted-foreground">Gestão de projetos</div>
          </div>
        </Link>

        <div className="frost rounded-2xl p-6">
          <h1 className="font-display text-[22px] font-bold tracking-tight">
            {modo === "entrar" ? "Entrar no workspace" : modo === "criar" ? "Criar sua conta" : "Recuperar senha"}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {modo === "recuperar"
              ? "Informe seu e-mail e enviaremos um link para definir uma nova senha."
              : "Acesse a gestão de clientes, projetos e tarefas da sua empresa."}
          </p>

          <form onSubmit={enviar} className="mt-5 space-y-3">
            {modo === "criar" ? (
              <Campo label="Nome completo">
                <input
                  className={inputClasses}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Como você quer ser chamado"
                  required
                />
              </Campo>
            ) : null}

            <Campo label="E-mail corporativo">
              <input
                type="email"
                className={inputClasses}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
                required
              />
            </Campo>

            {modo !== "recuperar" ? (
              <Campo label="Senha">
                <input
                  type="password"
                  className={inputClasses}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </Campo>
            ) : null}

            <BotaoPrimario type="submit" disabled={carregando} className="w-full justify-center">
              {carregando ? <Loader2 className="size-4 animate-spin" /> : null}
              {modo === "entrar" ? "Entrar" : modo === "criar" ? "Criar conta" : "Enviar link"}
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
                Voltar para o login
              </button>
            )}
            {modo === "entrar" ? (
              <button className="text-muted-foreground" onClick={() => setModo("criar")}>
                Não tem conta? <span className="font-medium text-brand">Criar agora</span>
              </button>
            ) : modo === "criar" ? (
              <button className="text-muted-foreground" onClick={() => setModo("entrar")}>
                Já tenho conta
              </button>
            ) : null}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Novas contas entram no workspace de demonstração <strong>Projeta Tecnologia</strong> como Administrador.
        </p>
      </div>
    </div>
  );
}
