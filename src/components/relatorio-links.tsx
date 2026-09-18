import { useState } from "react";
import { toast } from "sonner";
import { Ban, Check, Copy, History, Link2, Loader2, Lock, RotateCcw } from "lucide-react";
import { BotaoPrimario, BotaoSecundario, Campo, Painel, Pill, Vazio, inputClasses } from "@/components/kit";
import { useAuth } from "@/lib/auth";
import { fmtData, fmtDataLonga } from "@/lib/enzova";
import {
  urlRelatorioLink,
  useCriarRelatorioLink,
  useRelatorioLinkAcessos,
  useRelatorioLinks,
  useRevogarRelatorioLink,
  type RelatorioLink,
} from "@/lib/relatorio-links";

const VALIDADES = [
  { valor: 7, label: "7 dias" },
  { valor: 15, label: "15 dias" },
  { valor: 30, label: "30 dias" },
  { valor: 90, label: "90 dias" },
];

const RESULTADOS: Record<string, string> = {
  ok: "Aberto",
  senha_invalida: "Senha incorreta",
  expirado: "Tentativa após o vencimento",
  revogado: "Tentativa em link revogado",
  limite: "Limite de aberturas atingido",
};

function situacao(link: RelatorioLink) {
  if (!link.ativo) return { label: "Revogado", pill: "bg-destructive/12 text-destructive" };
  if (new Date(link.expira_em) <= new Date()) return { label: "Expirado", pill: "bg-warning/12 text-warning" };
  if (link.max_acessos !== null && link.acessos >= link.max_acessos)
    return { label: "Limite atingido", pill: "bg-warning/12 text-warning" };
  return { label: "Ativo", pill: "bg-success/12 text-success" };
}

export function RelatorioLinks({ projetoId }: { projetoId: string }) {
  const { can, perfil } = useAuth();
  const { data: links = [] } = useRelatorioLinks(projetoId);
  const criar = useCriarRelatorioLink(projetoId);
  const revogar = useRevogarRelatorioLink(projetoId);

  const [descricao, setDescricao] = useState("");
  const [dias, setDias] = useState(30);
  const [senha, setSenha] = useState("");
  const [limite, setLimite] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [historico, setHistorico] = useState<string | null>(null);

  const podeGerenciar = can("projeto.editar");

  async function copiar(token: string) {
    const url = urlRelatorioLink(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(token);
      toast.success("Link copiado para a área de transferência.");
      setTimeout(() => setCopiado(null), 2500);
    } catch {
      toast.error(`Copie manualmente: ${url}`);
    }
  }

  async function gerar() {
    if (!perfil) return;
    try {
      const token = await criar.mutateAsync({
        tenantId: perfil.tenant_id,
        projetoId,
        profileId: perfil.id,
        descricao,
        diasValidade: dias,
        senha: senha.trim() || undefined,
        maxAcessos: limite ? Number(limite) : undefined,
      });
      setDescricao("");
      setSenha("");
      setLimite("");
      await copiar(token);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o link.");
    }
  }

  return (
    <Painel>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
            <Link2 className="size-4 text-brand" /> Link do relatório em PDF
          </h2>
          <p className="text-[11.5px] text-muted-foreground">
            Compartilhe a apresentação do projeto com quem não tem acesso ao sistema. Nenhum custo interno aparece no
            relatório.
          </p>
        </div>
      </div>

      {podeGerenciar ? (
        <div className="mt-4 grid gap-3 rounded-xl border border-border bg-card/70 p-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="Identificação">
            <input
              className={inputClasses}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Apresentação para a diretoria"
            />
          </Campo>
          <Campo label="Validade">
            <select className={inputClasses} value={dias} onChange={(e) => setDias(Number(e.target.value))}>
              {VALIDADES.map((v) => (
                <option key={v.valor} value={v.valor}>
                  {v.label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Senha (opcional)">
            <input
              className={inputClasses}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Deixe vazio para acesso livre"
            />
          </Campo>
          <Campo label="Limite de aberturas (opcional)">
            <input
              className={inputClasses}
              type="number"
              min={1}
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
              placeholder="Sem limite"
            />
          </Campo>
          <div className="sm:col-span-2 lg:col-span-4">
            <BotaoPrimario onClick={gerar} disabled={criar.isPending}>
              {criar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
              Gerar link seguro
            </BotaoPrimario>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {links.map((l) => {
          const st = situacao(l);
          return (
            <div key={l.id} className="rounded-xl border border-border bg-card px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold">{l.descricao ?? "Link do relatório"}</span>
                    <Pill className={st.pill}>{st.label}</Pill>
                    {l.senha_hash ? (
                      <Pill className="bg-brand-soft text-brand-ink">
                        <Lock className="size-3" /> Com senha
                      </Pill>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    Válido até {fmtData(l.expira_em, "dd MMM yyyy")} · {l.acessos}
                    {l.max_acessos ? `/${l.max_acessos}` : ""} abertura(s)
                    {l.ultimo_acesso ? ` · última em ${fmtDataLonga(l.ultimo_acesso)}` : ""}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-muted-foreground/80">{urlRelatorioLink(l.token)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <BotaoSecundario className="px-3 py-2" onClick={() => copiar(l.token)}>
                    {copiado === l.token ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copiado === l.token ? "Copiado" : "Copiar"}
                  </BotaoSecundario>
                  <BotaoSecundario
                    className="px-3 py-2"
                    onClick={() => setHistorico(historico === l.id ? null : l.id)}
                  >
                    <History className="size-4" /> Acessos
                  </BotaoSecundario>
                  {podeGerenciar ? (
                    <BotaoSecundario
                      className="px-3 py-2"
                      onClick={() => revogar.mutate({ id: l.id, ativo: !l.ativo })}
                      disabled={revogar.isPending}
                    >
                      {l.ativo ? <Ban className="size-4" /> : <RotateCcw className="size-4" />}
                      {l.ativo ? "Revogar" : "Reativar"}
                    </BotaoSecundario>
                  ) : null}
                </div>
              </div>
              {historico === l.id ? <HistoricoLink linkId={l.id} /> : null}
            </div>
          );
        })}
        {links.length === 0 ? (
          <Vazio
            titulo="Nenhum link gerado"
            descricao="Gere um link com validade para compartilhar o relatório deste projeto."
          />
        ) : null}
      </div>
    </Painel>
  );
}

function HistoricoLink({ linkId }: { linkId: string }) {
  const { data: acessos = [], isLoading } = useRelatorioLinkAcessos(linkId);
  if (isLoading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Carregando acessos…
      </div>
    );
  }
  if (acessos.length === 0) {
    return <p className="mt-3 text-[12px] text-muted-foreground">Este link ainda não foi aberto.</p>;
  }
  return (
    <ul className="mt-3 space-y-1.5 border-t border-border/70 pt-3">
      {acessos.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
          <span className="font-medium">{RESULTADOS[a.resultado] ?? a.resultado}</span>
          <span className="text-muted-foreground">{fmtDataLonga(a.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}
