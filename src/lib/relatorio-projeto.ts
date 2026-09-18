import { jsPDF } from "jspdf";
import { FASE_STATUS, MARCO_STATUS, PROJETO_STATUS, fmtData } from "@/lib/enzova";
import type { PortalProjetoDetalhe, PortalTema } from "@/lib/portal";

export type MarcaDagua = {
  ativa?: boolean | null;
  texto?: string | null;
  cor?: string | null;
  opacidade?: number | null;
  aviso?: string | null;
};

type Contexto = {
  empresa?: string | undefined;
  cliente?: string | undefined;
  tema?: PortalTema | null | undefined;
  marcaDagua?: MarcaDagua | null | undefined;
};

/** Converte a configuração de marca d'água da empresa para o formato do relatório. */
export function marcaDaguaDaEmpresa(
  empresa:
    | {
        nome?: string;
        marca_dagua_ativa?: boolean | null;
        marca_dagua_texto?: string | null;
        marca_dagua_cor?: string | null;
        marca_dagua_opacidade?: number | null;
        marca_dagua_aviso?: string | null;
      }
    | null
    | undefined,
): MarcaDagua | undefined {
  if (!empresa) return undefined;
  return {
    ativa: empresa.marca_dagua_ativa ?? true,
    texto: empresa.marca_dagua_texto || empresa.nome || null,
    cor: empresa.marca_dagua_cor ?? null,
    opacidade: empresa.marca_dagua_opacidade ?? null,
    aviso: empresa.marca_dagua_aviso ?? null,
  };
}

function hexToRgb(hex: string | null | undefined, padrao: [number, number, number]): [number, number, number] {
  if (!hex) return padrao;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return padrao;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Relatório de acompanhamento do projeto para o cliente.
 * Traz progresso, fases, prazos, entregas e documentos compartilhados — nunca custos internos.
 */
export function gerarRelatorioProjeto(dados: PortalProjetoDetalhe, ctx: Contexto = {}) {
  const { projeto, fases, marcos, documentos } = dados;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const larguraPagina = doc.internal.pageSize.getWidth();
  const alturaPagina = doc.internal.pageSize.getHeight();
  const margem = 48;
  const largura = larguraPagina - margem * 2;
  const marca = hexToRgb(ctx.tema?.cor_primaria, [0, 128, 55]);
  const cinza: [number, number, number] = [110, 120, 115];
  let y = 0;

  function novaPagina() {
    doc.addPage();
    y = margem;
  }

  function garantir(espaco: number) {
    if (y + espaco > alturaPagina - margem) novaPagina();
  }

  function titulo(texto: string) {
    garantir(46);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...marca);
    doc.text(texto, margem, y);
    y += 8;
    doc.setDrawColor(209, 222, 216);
    doc.setLineWidth(0.8);
    doc.line(margem, y, margem + largura, y);
    y += 16;
    doc.setTextColor(26, 26, 26);
  }

  function linha(rotulo: string, valor: string) {
    garantir(18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...cinza);
    doc.text(rotulo, margem, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 26, 26);
    doc.text(valor, margem + 150, y);
    y += 16;
  }

  // ---------- Cabeçalho ----------
  doc.setFillColor(...marca);
  doc.rect(0, 0, larguraPagina, 92, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(ctx.tema?.nome_exibicao || ctx.empresa || "Relatório de projeto", margem, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Relatório de acompanhamento do projeto", margem, 58);
  doc.setFontSize(8.5);
  doc.text(`Emitido em ${fmtData(new Date().toISOString(), "dd MMM yyyy")}`, margem, 74);
  if (ctx.cliente) {
    doc.setFontSize(9);
    doc.text(ctx.cliente, larguraPagina - margem, 40, { align: "right" });
  }

  y = 124;
  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(doc.splitTextToSize(projeto.nome, largura) as string[], margem, y);
  y += 22 * (doc.splitTextToSize(projeto.nome, largura) as string[]).length;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...cinza);
  doc.text(`${projeto.codigo} · ${PROJETO_STATUS[projeto.status]?.label ?? projeto.status}`, margem, y);
  y += 18;

  if (projeto.descricao) {
    const linhas = doc.splitTextToSize(projeto.descricao, largura) as string[];
    doc.setTextColor(60, 70, 64);
    doc.text(linhas, margem, y);
    y += linhas.length * 13 + 6;
  }

  // ---------- Progresso ----------
  titulo("Progresso geral");
  const pct = Math.max(0, Math.min(100, projeto.progresso));
  doc.setFillColor(230, 245, 237);
  const larguraBarra = largura - 46;
  doc.roundedRect(margem, y, larguraBarra, 14, 7, 7, "F");
  doc.setFillColor(...marca);
  doc.roundedRect(margem, y, Math.max(8, (larguraBarra * pct) / 100), 14, 7, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(26, 26, 26);
  doc.text(`${pct}%`, margem + largura, y + 11, { align: "right" });

  y += 30;

  const fasesConcluidas = fases.filter((f) => f.status === "concluida").length;
  const prazo = projeto.prazo ?? projeto.data_prevista_conclusao;
  linha("Início", projeto.data_inicio ? fmtData(projeto.data_inicio, "dd MMM yyyy") : "a definir");
  linha("Prazo previsto", prazo ? fmtData(prazo, "dd MMM yyyy") : "a definir");
  if (projeto.data_real_conclusao) linha("Concluído em", fmtData(projeto.data_real_conclusao, "dd MMM yyyy"));
  linha("Fases concluídas", `${fasesConcluidas} de ${fases.length}`);
  linha("Entregas registradas", `${marcos.length}`);
  linha("Documentos compartilhados", `${documentos.length}`);
  if (projeto.gerente) linha("Responsável", projeto.gerente);

  // ---------- Fases ----------
  titulo("Fases e prazos");
  if (fases.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...cinza);
    doc.text("Fases em definição.", margem, y);
    y += 16;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...cinza);
    doc.text("FASE", margem, y);
    doc.text("SITUAÇÃO", margem + 230, y);
    doc.text("PROGRESSO", margem + 350, y);
    doc.text("PRAZO", margem + 430, y);
    y += 12;
    for (const f of fases) {
      garantir(20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(26, 26, 26);
      doc.text((doc.splitTextToSize(f.nome, 210) as string[])[0] ?? f.nome, margem, y);
      doc.setTextColor(...cinza);
      doc.text(FASE_STATUS[f.status]?.label ?? f.status, margem + 230, y);
      doc.text(`${f.progresso}%`, margem + 350, y);
      doc.text(f.prazo ? fmtData(f.prazo, "dd/MM/yyyy") : "—", margem + 430, y);
      y += 15;
      doc.setDrawColor(235, 240, 237);
      doc.setLineWidth(0.5);
      doc.line(margem, y - 5, margem + largura, y - 5);
    }
  }

  // ---------- Entregas ----------
  titulo("Entregas e marcos");
  if (marcos.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...cinza);
    doc.text("Nenhuma entrega registrada.", margem, y);
    y += 16;
  } else {
    for (const m of marcos) {
      garantir(28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(26, 26, 26);
      doc.text((doc.splitTextToSize(m.nome, largura - 120) as string[])[0] ?? m.nome, margem, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...cinza);
      doc.text(MARCO_STATUS[m.status]?.label ?? m.status, margem + largura, y, { align: "right" });
      y += 13;
      doc.setFontSize(8.5);
      const detalhe = [
        m.fase ?? null,
        m.data ? `previsto ${fmtData(m.data, "dd/MM/yyyy")}` : null,
        m.data_real ? `entregue ${fmtData(m.data_real, "dd/MM/yyyy")}` : null,
        m.decisao === "aprovado" ? "aprovado pelo cliente" : m.decisao === "ajustes" ? "ajustes solicitados" : null,
      ]
        .filter(Boolean)
        .join(" · ");
      doc.text(detalhe || "—", margem, y);
      y += 16;
    }
  }

  // ---------- Documentos ----------
  titulo("Documentos compartilhados");
  if (documentos.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...cinza);
    doc.text("Nenhum documento liberado até o momento.", margem, y);
    y += 16;
  } else {
    for (const d of documentos) {
      garantir(26);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(26, 26, 26);
      doc.text((doc.splitTextToSize(d.nome, largura - 120) as string[])[0] ?? d.nome, margem, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...cinza);
      doc.text(fmtData(d.created_at, "dd/MM/yyyy"), margem + largura, y, { align: "right" });
      y += 12;
      doc.text(`${d.categoria}${d.fase ? ` · ${d.fase}` : ""}`, margem, y);
      y += 16;
    }
  }

  // ---------- Marca d'água e rodapé ----------
  const md = ctx.marcaDagua;
  const marcaDaguaAtiva = md?.ativa !== false;
  const textoMarca = (md?.texto || ctx.empresa || ctx.tema?.nome_exibicao || "").trim();
  const corMarca = hexToRgb(md?.cor, marca);
  const opacidade = Math.max(0.02, Math.min(0.3, md?.opacidade ?? 0.08));

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);

    if (marcaDaguaAtiva && textoMarca) {
      const estado = doc.GState({ opacity: opacidade });
      doc.saveGraphicsState();
      doc.setGState(estado);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...corMarca);
      const tamanho = Math.max(26, Math.min(64, 520 / Math.max(6, textoMarca.length)) * 4);
      doc.setFontSize(tamanho);
      for (const [dx, dy] of [
        [0, -180],
        [0, 0],
        [0, 180],
      ] as const) {
        doc.text(textoMarca, larguraPagina / 2 + dx, alturaPagina / 2 + dy, {
          align: "center",
          angle: 32,
          baseline: "middle",
        });
      }
      doc.restoreGraphicsState();
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...cinza);
    doc.text(
      `${ctx.tema?.nome_exibicao || ctx.empresa || "Portal do cliente"} · relatório de acompanhamento`,
      margem,
      alturaPagina - 24,
    );
    doc.text(`${i}/${total}`, larguraPagina - margem, alturaPagina - 24, { align: "right" });
    if (md?.aviso) {
      doc.setFontSize(7.5);
      doc.text(
        (doc.splitTextToSize(md.aviso, largura) as string[])[0] ?? md.aviso,
        larguraPagina / 2,
        alturaPagina - 12,
        { align: "center" },
      );
    }
  }

  doc.save(`relatorio-${projeto.codigo.toLowerCase()}.pdf`);
}
