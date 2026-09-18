import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BotaoPrimario, Campo, Painel, TituloPagina, inputClasses } from "@/components/kit";
import { registrarEventoPortal } from "@/lib/portal";

export const Route = createFileRoute("/portal/senha")({
  head: () => ({
    meta: [
      { title: "Minha senha · Portal do cliente" },
      { name: "description", content: "Altere a senha de acesso ao portal do cliente." },
      { property: "og:title", content: "Minha senha · Portal do cliente" },
      { property: "og:description", content: "Troque sua senha de acesso ao portal com segurança." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalSenha,
});

function PortalSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (nova !== confirmacao) {
      toast.error("As senhas não conferem.");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nova, current_password: atual } as {
        password: string;
        current_password: string;
      });
      if (error) throw error;
      await registrarEventoPortal("senha_alterada");
      setAtual("");
      setNova("");
      setConfirmacao("");
      toast.success("Senha atualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a senha.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <TituloPagina
        sobretitulo={
          <>
            <KeyRound className="size-4 text-brand" /> <span>Segurança</span>
          </>
        }
        titulo="Minha senha"
        descricao="Escolha uma nova senha para acessar o portal. Toda troca fica registrada no histórico de acessos."
        acoes={
          <Link
            to="/portal"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        }
      />

      <Painel className="max-w-md">
        <form onSubmit={enviar} className="space-y-3">
          <Campo label="Senha atual">
            <input
              type="password"
              className={inputClasses}
              value={atual}
              onChange={(e) => setAtual(e.target.value)}
              required
            />
          </Campo>
          <Campo label="Nova senha">
            <input
              type="password"
              className={inputClasses}
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              minLength={8}
              required
            />
          </Campo>
          <Campo label="Confirmar nova senha">
            <input
              type="password"
              className={inputClasses}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              minLength={8}
              required
            />
          </Campo>
          <BotaoPrimario type="submit" disabled={salvando} className="w-full justify-center">
            {salvando ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Salvar nova senha
          </BotaoPrimario>
        </form>
        <p className="mt-3 text-[11.5px] text-muted-foreground">
          Esqueceu a senha atual? Saia do portal e use “Esqueci minha senha” na tela de acesso.
        </p>
      </Painel>
    </>
  );
}
