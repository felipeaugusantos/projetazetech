import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { useDocumentos } from "@/components/documentos-projeto";
import { BotaoPrimario, BotaoSecundario, Painel, Pill } from "@/components/kit";
import { useFases, useMarcos, useProjeto } from "@/lib/dados";
import { conteudoDoRelatorio } from "@/lib/relatorio-conteudo";
import { gerarResumoExecutivo, type ResumoExecutivo } from "@/lib/resumo-executivo.functions";
import type { PortalProjetoDetalhe } from "@/lib/portal";

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <ul className="mt-2 space-y-1.5">
        {itens.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Resumo executivo do relatório do projeto, preenchido automaticamente por IA. */
export function ResumoExecutivoRelatorio({ projetoId }: { projetoId: string }) {
  const { data: projeto } = useProjeto(projetoId);
  const { data: fases } = useFases(projetoId);
  const { data: marcos } = useMarcos(projetoId);
  const { data: documentos } = useDocumentos(projetoId);
  const [resumo, setResumo] = useState<ResumoExecutivo | null>(null);
  const gerar = useServerFn(gerarResumoExecutivo);

  const dados = projeto
    ? ({
        projeto: {
          id: projeto.id,
          codigo: projeto.codigo,
          nome: projeto.nome,
          descricao: projeto.descricao,
          status: projeto.status,
          progresso: projeto.progresso,
          data_inicio: projeto.data_inicio,
          prazo: projeto.prazo,
          data_prevista_conclusao: projeto.data_prevista_conclusao,
          data_real_conclusao: projeto.data_real_conclusao,
          gerente: projeto.gerente?.nome ?? null,
        },
        fases: (fases ?? []).map((f) => ({
          id: f.id,
          nome: f.nome,
          descricao: f.descricao,
          ordem: f.ordem,
          status: f.status,
          progresso: f.progresso,
          data_inicio: f.data_inicio,
          prazo: f.prazo,
        })),
        marcos: (marcos ?? []).map((m) => ({
          id: m.id,
          nome: m.nome,
          descricao: m.descricao,
          data: m.data,
          data_real: m.data_real,
          status: m.status,
          entrega_cliente: m.entrega_cliente,
          fase: null,
          decisao: null,
        })),
        documentos: (documentos ?? [])
          .filter((d) => d.visivel_cliente)
          .map((d) => ({
            id: d.id,
            nome: d.nome,
            descricao: d.descricao,
            categoria: d.categoria,
            url: d.url,
            tipo: d.tipo,
            tamanho: d.tamanho,
            created_at: d.created_at,
            fase: null,
          })),
        comentarios: [],
        pesquisa: null,
      } satisfies PortalProjetoDetalhe)
    : null;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!dados) throw new Error("Projeto ainda carregando.");
      return gerar({ data: { conteudo: conteudoDoRelatorio(dados), projeto: dados.projeto.nome } });
    },
    onSuccess: (novo) => {
      setResumo(novo);
      toast.success("Resumo executivo gerado.");
    },
    onError: (erro: unknown) =>
      toast.error(erro instanceof Error ? erro.message : "Não foi possível gerar o resumo."),
  });

  return (
    <Painel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Resumo executivo por IA</h3>
          <p className="text-sm text-muted-foreground">
            Gerado a partir do próprio relatório do projeto: prazos, entregas, pendências e alertas — sem digitar nada.
          </p>
        </div>
        <Pill className="bg-brand-soft text-brand-ink">
          <Sparkles className="mr-1 inline h-3.5 w-3.5" /> IA
        </Pill>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {resumo ? (
          <BotaoSecundario onClick={() => mutation.mutate()} disabled={mutation.isPending || !dados}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Gerar novamente
          </BotaoSecundario>
        ) : (
          <BotaoPrimario onClick={() => mutation.mutate()} disabled={mutation.isPending || !dados}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {mutation.isPending ? "Analisando o relatório..." : "Gerar resumo executivo"}
          </BotaoPrimario>
        )}
        {resumo ? (
          <button
            type="button"
            onClick={() => {
              const texto = [
                resumo.resumo,
                resumo.prazos.length ? `\nPrazos:\n${resumo.prazos.map((i) => `- ${i}`).join("\n")}` : "",
                resumo.entregas.length ? `\nEntregas:\n${resumo.entregas.map((i) => `- ${i}`).join("\n")}` : "",
                resumo.pendencias.length ? `\nPendências:\n${resumo.pendencias.map((i) => `- ${i}`).join("\n")}` : "",
                resumo.alertas.length ? `\nAlertas:\n${resumo.alertas.map((i) => `- ${i}`).join("\n")}` : "",
              ]
                .filter(Boolean)
                .join("\n");
              void navigator.clipboard.writeText(texto);
              toast.success("Resumo copiado.");
            }}
            className="text-xs font-medium text-brand-ink underline"
          >
            Copiar resumo
          </button>
        ) : null}
      </div>

      {resumo ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-border/70 bg-brand-soft/40 p-4">
          <p className="text-sm leading-relaxed text-foreground">{resumo.resumo}</p>
          <Lista titulo="Prazos" itens={resumo.prazos} />
          <Lista titulo="Entregas" itens={resumo.entregas} />
          <Lista titulo="Pendências" itens={resumo.pendencias} />
          <Lista titulo="Alertas" itens={resumo.alertas} />
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          O mesmo resumo entra automaticamente no PDF que o cliente baixa no portal e nos links compartilhados.
        </p>
      )}
    </Painel>
  );
}
