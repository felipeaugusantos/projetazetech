import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDataLonga } from "@/lib/enzova";
import { Avatar, BotaoPrimario, BotaoSecundario, Campo, Painel, Pill, Vazio, inputClasses } from "@/components/kit";

type Acesso = {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  ativo: boolean;
  user_id: string | null;
  ultimo_acesso: string | null;
};

const EVENTOS: Record<string, string> = {
  login: "Entrou no portal",
  logout: "Saiu do portal",
  sessao_expirada: "Sessão encerrada por inatividade",
  senha_alterada: "Alterou a senha",
};

function HistoricoAcessos({ acessoIds, nomes }: { acessoIds: string[]; nomes: { id: string; nome: string }[] }) {
  const { data: registros = [] } = useQuery({
    queryKey: ["portal-acesso-logs", acessoIds],
    enabled: acessoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_acesso_logs")
        .select("id, portal_acesso_id, evento, created_at")
        .in("portal_acesso_id", acessoIds)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as { id: string; portal_acesso_id: string; evento: string; created_at: string }[];
    },
  });

  const nomePor = new Map(nomes.map((n) => [n.id, n.nome]));

  return (
    <div className="mt-4 border-t border-border/70 pt-3">
      <h3 className="text-[12.5px] font-semibold">Histórico de acessos</h3>
      {registros.length === 0 ? (
        <p className="mt-1 text-[11.5px] text-muted-foreground">Nenhum acesso registrado ainda.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {registros.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
              <span className="text-foreground">
                <strong className="font-semibold">{nomePor.get(r.portal_acesso_id) ?? "Contato"}</strong> ·{" "}
                {EVENTOS[r.evento] ?? r.evento}
              </span>
              <span className="text-muted-foreground">{fmtDataLonga(r.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PortalAcessos({ clienteId }: { clienteId: string }) {
  const { can, perfil } = useAuth();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("");

  const podeGerenciar = can("cliente.editar");

  const { data: acessos = [] } = useQuery({
    queryKey: ["portal-acessos", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_acessos")
        .select("id, nome, email, cargo, ativo, user_id, ultimo_acesso")
        .eq("cliente_id", clienteId)
        .is("deleted_at", null)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Acesso[];
    },
  });

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: ["portal-acessos", clienteId] });
  }

  const autorizar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("portal_acessos").insert({
        tenant_id: perfil?.tenant_id ?? "",
        cliente_id: clienteId,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        cargo: cargo.trim() || null,
        ativo: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAberto(false);
      setNome("");
      setEmail("");
      setCargo("");
      invalidar();
      toast.success("Acesso autorizado. O cliente cria a senha em /acesso-cliente.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Não foi possível autorizar o acesso."),
  });

  const alternar = useMutation({
    mutationFn: async (acesso: Acesso) => {
      const { error } = await supabase.from("portal_acessos").update({ ativo: !acesso.ativo }).eq("id", acesso.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Acesso atualizado.");
    },
    onError: () => toast.error("Não foi possível atualizar o acesso."),
  });

  return (
    <Painel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-bold">Portal do cliente</h2>
          <p className="text-[11.5px] text-muted-foreground">
            Quem pode acompanhar progresso, fases, prazos e documentos liberados.
          </p>
        </div>
        {podeGerenciar ? (
          <BotaoSecundario onClick={() => setAberto(true)} className="px-3 py-2">
            <UserPlus className="size-4" /> Autorizar
          </BotaoSecundario>
        ) : null}
      </div>

      <div className="mt-3 space-y-2.5">
        {acessos.map((a) => (
          <div key={a.id} className="frost-soft flex flex-wrap items-center justify-between gap-3 rounded-xl p-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar nome={a.nome} />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold">{a.nome}</div>
                <div className="truncate text-[11px] text-muted-foreground">{a.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Pill className={a.ativo ? "bg-success/12 text-success" : "bg-secondary text-muted-foreground"}>
                {a.ativo ? "Ativo" : "Suspenso"}
              </Pill>
              <Pill className="bg-secondary text-muted-foreground">
                {a.user_id
                  ? a.ultimo_acesso
                    ? `Último acesso ${fmtDataLonga(a.ultimo_acesso)}`
                    : "Senha criada"
                  : "Aguardando 1º acesso"}
              </Pill>
              {podeGerenciar ? (
                <button
                  onClick={() => alternar.mutate(a)}
                  title={a.ativo ? "Suspender acesso" : "Reativar acesso"}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-card hover:text-brand"
                >
                  {a.ativo ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {acessos.length === 0 ? (
          <Vazio titulo="Nenhum acesso autorizado" descricao="Autorize um contato para liberar o portal." />
        ) : null}
      </div>

      {acessos.length ? <HistoricoAcessos acessoIds={acessos.map((a) => a.id)} nomes={acessos} /> : null}

      {aberto ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-forest/40 p-4 backdrop-blur-sm">
          <div className="frost w-full max-w-md rounded-2xl p-5">
            <h3 className="font-display text-[17px] font-bold">Autorizar acesso ao portal</h3>
            <p className="mt-1 text-[12px] text-muted-foreground">
              O cliente cria a própria senha em <strong>/acesso-cliente</strong> usando este e-mail. Nenhum custo interno
              é exibido no portal.
            </p>
            <div className="mt-4 space-y-3">
              <Campo label="Nome do contato">
                <input className={inputClasses} value={nome} onChange={(e) => setNome(e.target.value)} required />
              </Campo>
              <Campo label="E-mail">
                <input
                  type="email"
                  className={inputClasses}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@cliente.com.br"
                  required
                />
              </Campo>
              <Campo label="Cargo (opcional)">
                <input className={inputClasses} value={cargo} onChange={(e) => setCargo(e.target.value)} />
              </Campo>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario
                disabled={autorizar.isPending || !nome.trim() || !email.trim()}
                onClick={() => autorizar.mutate()}
              >
                {autorizar.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Autorizar
              </BotaoPrimario>
            </div>
          </div>
        </div>
      ) : null}
    </Painel>
  );
}
