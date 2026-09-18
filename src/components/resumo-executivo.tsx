import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { useDocumentos } from "@/components/documentos-projeto";
import { BotaoPrimario, BotaoSecundario, Painel, Pill, inputClasses } from "@/components/kit";
import { useFases, useMarcos, useProjeto } from "@/lib/dados";
import { FASE_STATUS, PROJETO_STATUS, fmtData } from "@/lib/enzova";
import { gerarResumoExecutivo, type ResumoExecutivo } from "@/lib/resumo-executivo.functions";

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

/** Gera um resumo executivo por IA a partir do conteúdo de um relatório compartilhado. */
export function ResumoExecutivoRelatorio({ projetoId }: { projetoId: string }) {
  const { data: projeto } = useProjeto(projetoId);
  const { data: fases } = useFases(projetoId);
  const { data: marcos } = useMarcos(projetoId);
  const { data: documentos } = useDocumentos(projetoId);
  const [conteudo, setConteudo] = useState("");
  const [resumo, setResumo] = useState<ResumoExecutivo | null>(null);
  const gerar = useServerFn(gerarResumoExecutivo);

  const mutation = useMutation({
    mutationFn: async () =>
      gerar({ data: { conteudo: conteudo.trim(), projeto: projeto?.nome ?? null } }),
    onSuccess: (dados) => {
      setResumo(dados);
      toast.success("Resumo executivo gerado.");
    },
    onError: (erro: unknown) =>
      toast.error(erro instanceof Error ? erro.message : "Não foi possível gerar o resumo."),
  });

  function preencher() {
    const linhas: string[] = [];
    if (projeto) {
      linhas.push(
        `Projeto: ${projeto.nome} (${projeto.codigo})`,
        `Situação: ${PROJETO_STATUS[projeto.status]?.label ?? projeto.status} · progresso ${projeto.progresso}%`,
        `Início: ${fmtData(projeto.data_inicio, "dd/MM/yyyy")} · Prazo: ${fmtData(projeto.prazo, "dd/MM/yyyy")}`,
      );
    }
    if (fases?.length) {
      linhas.push("", "Fases:");
      for (const f of fases) {
        linhas.push(
          `- ${f.nome}: ${FASE_STATUS[f.status]?.label ?? f.status}, ${f.progresso}%, prazo ${fmtData(f.prazo, "dd/MM/yyyy")}`,
        );
      }
    }
    if (marcos?.length) {
      linhas.push("", "Entregas e marcos:");
      for (const m of marcos) {
        linhas.push(
          `- ${m.titulo}: previsto ${fmtData(m.data, "dd/MM/yyyy")}${m.data_real ? `, entregue ${fmtData(m.data_real, "dd/MM/yyyy")}` : ""} (${m.status})`,
        );
      }
    }
    const compartilhados = (documentos ?? []).filter((d) => d.visivel_cliente);
    if (compartilhados.length) {
      linhas.push("", "Documentos compartilhados:");
      for (const d of compartilhados) linhas.push(`- ${d.nome} (${d.categoria})`);
    }
    setConteudo(linhas.join("\n"));
  }

  return (
    <Painel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Resumo executivo por IA</h3>
          <p className="text-sm text-muted-foreground">
            Cole o conteúdo do relatório compartilhado em PDF e gere um resumo com prazos, entregas e pendências.
          </p>
        </div>
        <Pill className="bg-brand-soft text-brand-ink">
          <Sparkles className="mr-1 inline h-3.5 w-3.5" /> IA
        </Pill>
      </div>

      <textarea
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        rows={8}
        placeholder="Cole aqui o texto do relatório em PDF compartilhado com o cliente..."
        className={`${inputClasses} mt-4 min-h-[180px] resize-y font-mono text-xs leading-relaxed`}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <BotaoPrimario
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || conteudo.trim().length < 40}
        >
          <Wand2 className="h-4 w-4" />
          {mutation.isPending ? "Gerando resumo..." : "Gerar resumo executivo"}
        </BotaoPrimario>
        <BotaoSecundario onClick={preencher}>Usar o relatório deste projeto</BotaoSecundario>
        {conteudo ? (
          <button
            type="button"
            onClick={() => {
              setConteudo("");
              setResumo(null);
            }}
            className="text-xs text-muted-foreground underline"
          >
            Limpar
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
        </div>
      ) : null}
    </Painel>
  );
}
