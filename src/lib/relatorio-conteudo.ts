import { FASE_STATUS, MARCO_STATUS, PROJETO_STATUS, fmtData } from "@/lib/enzova";
import type { PortalProjetoDetalhe } from "@/lib/portal";

export type ResumoExecutivo = {
  resumo: string;
  prazos: string[];
  entregas: string[];
  pendencias: string[];
  alertas: string[];
};

/**
 * Monta o texto base do relatório (progresso, fases, prazos, entregas e documentos)
 * que alimenta o resumo executivo. Nunca inclui custos, orçamento ou horas internas.
 */
export function conteudoDoRelatorio(dados: PortalProjetoDetalhe): string {
  const { projeto, fases, marcos, documentos } = dados;
  const linhas: string[] = [
    `Projeto: ${projeto.nome} (${projeto.codigo})`,
    `Situação: ${PROJETO_STATUS[projeto.status]?.label ?? projeto.status} · progresso ${projeto.progresso}%`,
    `Início: ${projeto.data_inicio ? fmtData(projeto.data_inicio, "dd/MM/yyyy") : "a definir"}`,
    `Prazo previsto: ${
      projeto.prazo || projeto.data_prevista_conclusao
        ? fmtData(projeto.prazo ?? projeto.data_prevista_conclusao, "dd/MM/yyyy")
        : "a definir"
    }`,
  ];
  if (projeto.data_real_conclusao) {
    linhas.push(`Concluído em: ${fmtData(projeto.data_real_conclusao, "dd/MM/yyyy")}`);
  }
  if (projeto.descricao) linhas.push(`Escopo: ${projeto.descricao}`);
  linhas.push(`Data de hoje: ${fmtData(new Date().toISOString(), "dd/MM/yyyy")}`);

  if (fases.length) {
    linhas.push("", "Fases e prazos:");
    for (const f of fases) {
      linhas.push(
        `- ${f.nome}: ${FASE_STATUS[f.status]?.label ?? f.status}, ${f.progresso}%, prazo ${
          f.prazo ? fmtData(f.prazo, "dd/MM/yyyy") : "a definir"
        }`,
      );
    }
  }

  if (marcos.length) {
    linhas.push("", "Entregas e marcos:");
    for (const m of marcos) {
      const detalhe = [
        MARCO_STATUS[m.status]?.label ?? m.status,
        m.data ? `previsto ${fmtData(m.data, "dd/MM/yyyy")}` : null,
        m.data_real ? `entregue ${fmtData(m.data_real, "dd/MM/yyyy")}` : null,
        m.decisao === "aprovado" ? "aprovado pelo cliente" : m.decisao === "ajustes" ? "ajustes solicitados" : null,
        m.entrega_cliente ? "entrega ao cliente" : null,
      ]
        .filter(Boolean)
        .join(" · ");
      linhas.push(`- ${m.nome}: ${detalhe}`);
    }
  }

  if (documentos.length) {
    linhas.push("", "Documentos compartilhados:");
    for (const d of documentos) {
      linhas.push(`- ${d.nome} (${d.categoria}) em ${fmtData(d.created_at, "dd/MM/yyyy")}`);
    }
  }

  const conversa = (dados.comentarios ?? []).slice(-8);
  if (conversa.length) {
    linhas.push("", "Últimas mensagens da conversa do projeto:");
    for (const c of conversa) {
      linhas.push(
        `- ${c.do_cliente ? "Cliente" : (c.autor ?? "Equipe")} em ${fmtData(c.created_at, "dd/MM/yyyy")}: ${c.conteudo}`,
      );
    }
  }

  return linhas.join("\n");
}
