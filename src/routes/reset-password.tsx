import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BotaoPrimario, Campo, inputClasses } from "@/components/kit";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Definir nova senha · Projeta" },
      { name: "description", content: "Escolha uma nova senha para acessar o Projeta." },
      { property: "og:title", content: "Definir nova senha" },
      { property: "og:description", content: "Redefinição de senha do Projeta." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (senha !== confirmacao) {
      toast.error("As senhas não conferem.");
      return;
    }
    setCarregando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a senha.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="halo" style={{ width: 480, height: 480, top: -140, left: 100, background: "#60A5FA" }} />
      </div>
      <div className="frost relative z-10 w-full max-w-md rounded-2xl p-6">
        <h1 className="font-display text-[22px] font-bold tracking-tight">Definir nova senha</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Escolha uma senha com pelo menos 6 caracteres.</p>
        <form onSubmit={enviar} className="mt-5 space-y-3">
          <Campo label="Nova senha">
            <input
              type="password"
              className={inputClasses}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={6}
              required
            />
          </Campo>
          <Campo label="Confirmar nova senha">
            <input
              type="password"
              className={inputClasses}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              minLength={6}
              required
            />
          </Campo>
          <BotaoPrimario type="submit" disabled={carregando} className="w-full justify-center">
            {carregando ? <Loader2 className="size-4 animate-spin" /> : null} Salvar nova senha
          </BotaoPrimario>
        </form>
      </div>
    </div>
  );
}
