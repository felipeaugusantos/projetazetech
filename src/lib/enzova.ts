import { addDays, differenceInCalendarDays, format, isBefore, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

export type ProjetoStatus =
  | "planejamento"
  | "aguardando_inicio"
  | "em_andamento"
  | "pausado"
  | "em_validacao"
  | "em_risco"
  | "concluido"
  | "cancelado";

export type TarefaStatus =
  | "backlog"
  | "a_fazer"
  | "em_andamento"
  | "bloqueada"
  | "em_validacao"
  | "concluida"
  | "cancelada";

export type Prioridade = "baixa" | "normal" | "alta" | "urgente";
export type FaseStatus = "nao_iniciada" | "em_andamento" | "concluida" | "bloqueada";
export type SaudeNivel = "saudavel" | "atencao" | "em_risco" | "critico";

export const PROJETO_STATUS: Record<ProjetoStatus, { label: string; pill: string; dot: string }> = {
  planejamento: { label: "Planejamento", pill: "bg-brand-soft text-brand-ink", dot: "bg-brand" },
  aguardando_inicio: { label: "Aguardando início", pill: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground" },
  em_andamento: { label: "Em andamento", pill: "bg-success-soft text-success", dot: "bg-success" },
  pausado: { label: "Pausado", pill: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground" },
  em_validacao: { label: "Em validação", pill: "bg-warning-soft text-warning", dot: "bg-warning" },
  em_risco: { label: "Em risco", pill: "bg-danger-soft text-danger", dot: "bg-danger" },
  concluido: { label: "Concluído", pill: "bg-success-soft text-success", dot: "bg-success" },
  cancelado: { label: "Cancelado", pill: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground" },
};

export const TAREFA_STATUS: Record<TarefaStatus, { label: string; pill: string; dot: string }> = {
  backlog: { label: "Backlog", pill: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground" },
  a_fazer: { label: "A Fazer", pill: "bg-secondary text-foreground", dot: "bg-muted-foreground" },
  em_andamento: { label: "Em andamento", pill: "bg-brand-soft text-brand-ink", dot: "bg-brand" },
  bloqueada: { label: "Bloqueada", pill: "bg-danger-soft text-danger", dot: "bg-danger" },
  em_validacao: { label: "Em validação", pill: "bg-warning-soft text-warning", dot: "bg-warning" },
  concluida: { label: "Concluída", pill: "bg-success-soft text-success", dot: "bg-success" },
  cancelada: { label: "Cancelada", pill: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground" },
};

export const KANBAN_COLUNAS: TarefaStatus[] = [
  "backlog",
  "a_fazer",
  "em_andamento",
  "bloqueada",
  "em_validacao",
  "concluida",
];

export const PRIORIDADES: Record<Prioridade, { label: string; pill: string; dot: string }> = {
  baixa: { label: "Baixa", pill: "bg-success-soft text-success", dot: "bg-success" },
  normal: { label: "Normal", pill: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground" },
  alta: { label: "Alta", pill: "bg-warning-soft text-warning", dot: "bg-warning" },
  urgente: { label: "Urgente", pill: "bg-danger-soft text-danger", dot: "bg-danger" },
};

export const FASE_STATUS: Record<FaseStatus, { label: string; pill: string }> = {
  nao_iniciada: { label: "Aguardando", pill: "bg-secondary text-muted-foreground" },
  em_andamento: { label: "Em andamento", pill: "bg-brand-soft text-brand-ink" },
  concluida: { label: "Concluída", pill: "bg-success-soft text-success" },
  bloqueada: { label: "Bloqueada", pill: "bg-danger-soft text-danger" },
};

export const SAUDE: Record<SaudeNivel, { label: string; pill: string; dot: string }> = {
  saudavel: { label: "Saudável", pill: "bg-success-soft text-success", dot: "bg-success" },
  atencao: { label: "Atenção", pill: "bg-warning-soft text-warning", dot: "bg-warning" },
  em_risco: { label: "Em risco", pill: "bg-danger-soft text-danger", dot: "bg-danger" },
  critico: { label: "Crítico", pill: "bg-danger-soft text-danger", dot: "bg-danger" },
};

export function fmtData(value?: string | null, pattern = "dd MMM") {
  if (!value) return "—";
  try {
    return format(parseISO(value), pattern, { locale: ptBR });
  } catch {
    return "—";
  }
}

export function fmtDataLonga(value?: string | null) {
  return fmtData(value, "dd 'de' MMMM 'de' yyyy");
}

export function fmtMoeda(value?: number | null) {
  const n = Number(value ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function fmtHoras(value?: number | null) {
  const n = Number(value ?? 0);
  const horas = Math.floor(n);
  const minutos = Math.round((n - horas) * 60);
  return minutos > 0 ? `${horas}h${String(minutos).padStart(2, "0")}` : `${horas}h`;
}

export function iniciais(nome?: string | null) {
  if (!nome) return "–";
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

export function estaAtrasada(prazo?: string | null, status?: TarefaStatus) {
  if (!prazo || status === "concluida" || status === "cancelada") return false;
  return isBefore(parseISO(prazo), new Date());
}

export function diasRestantes(prazo?: string | null) {
  if (!prazo) return null;
  return differenceInCalendarDays(parseISO(prazo), new Date());
}

export type TarefaResumo = {
  status: TarefaStatus;
  prazo: string | null;
  horas_estimadas: number | null;
  horas_realizadas: number | null;
};

export type ProjetoResumo = {
  data_inicio: string | null;
  prazo: string | null;
  horas_previstas: number | null;
  orcamento: number | null;
  status: ProjetoStatus;
};

export type SaudeCalculada = {
  nivel: SaudeNivel;
  motivos: string[];
  prazoConsumido: number;
  tarefasConcluidas: number;
  tarefasAtrasadas: number;
  horasConsumidas: number;
  totalTarefas: number;
  horasRealizadas: number;
};

/** Indicador automático de saúde do projeto (regra interna da Fase 1). */
export function calcularSaude(projeto: ProjetoResumo, tarefas: TarefaResumo[]): SaudeCalculada {
  const total = tarefas.length;
  const concluidas = tarefas.filter((t) => t.status === "concluida").length;
  const atrasadas = tarefas.filter((t) => estaAtrasada(t.prazo, t.status)).length;
  const horasRealizadas = tarefas.reduce((acc, t) => acc + Number(t.horas_realizadas ?? 0), 0);

  const pctConcluidas = total ? Math.round((concluidas / total) * 100) : 0;
  const horasPrevistas = Number(projeto.horas_previstas ?? 0);
  const pctHoras = horasPrevistas ? Math.round((horasRealizadas / horasPrevistas) * 100) : 0;

  let pctPrazo = 0;
  if (projeto.data_inicio && projeto.prazo) {
    const inicio = parseISO(projeto.data_inicio).getTime();
    const fim = parseISO(projeto.prazo).getTime();
    const agora = Date.now();
    pctPrazo = fim > inicio ? Math.min(150, Math.max(0, Math.round(((agora - inicio) / (fim - inicio)) * 100))) : 0;
  }

  const motivos: string[] = [];
  let pontos = 0;

  if (atrasadas > 0) {
    motivos.push(`${atrasadas} ${atrasadas === 1 ? "tarefa atrasada" : "tarefas atrasadas"}`);
    pontos += atrasadas >= 5 ? 2 : 1;
  }
  if (pctPrazo > 100) {
    motivos.push(`Prazo estourado (${pctPrazo}% consumido)`);
    pontos += 2;
  } else if (pctPrazo - pctConcluidas >= 25) {
    motivos.push(`Prazo ${pctPrazo}% consumido com apenas ${pctConcluidas}% das tarefas concluídas`);
    pontos += 2;
  } else if (pctPrazo - pctConcluidas >= 15) {
    motivos.push(`Avanço abaixo do prazo consumido (${pctConcluidas}% x ${pctPrazo}%)`);
    pontos += 1;
  }
  if (pctHoras >= 100) {
    motivos.push(`Horas previstas esgotadas (${pctHoras}%)`);
    pontos += 2;
  } else if (pctHoras >= 85) {
    motivos.push(`${pctHoras}% das horas previstas já utilizadas`);
    pontos += 1;
  }
  if (projeto.status === "pausado") {
    motivos.push("Projeto pausado");
    pontos += 1;
  }

  let nivel: SaudeNivel = "saudavel";
  if (pontos >= 5) nivel = "critico";
  else if (pontos >= 3) nivel = "em_risco";
  else if (pontos >= 1) nivel = "atencao";

  if (projeto.status === "concluido") {
    nivel = "saudavel";
    motivos.length = 0;
    motivos.push("Projeto concluído");
  }
  if (!motivos.length) motivos.push("Prazo, escopo e horas dentro do planejado");

  return {
    nivel,
    motivos,
    prazoConsumido: pctPrazo,
    tarefasConcluidas: pctConcluidas,
    tarefasAtrasadas: atrasadas,
    horasConsumidas: pctHoras,
    totalTarefas: total,
    horasRealizadas,
  };
}

/* ================= Fase 2: horas, marcos, alocação e riscos ================= */

export type ApontamentoStatus = "rascunho" | "enviado" | "aprovado" | "rejeitado";
export type MarcoStatus = "previsto" | "atingido" | "atrasado" | "cancelado";
export type RiscoNivel = "baixo" | "medio" | "alto" | "critico";

export const APONTAMENTO_STATUS: Record<ApontamentoStatus, { label: string; pill: string; dot: string }> = {
  rascunho: { label: "Rascunho", pill: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground" },
  enviado: { label: "Em aprovação", pill: "bg-warning-soft text-warning", dot: "bg-warning" },
  aprovado: { label: "Aprovado", pill: "bg-success-soft text-success", dot: "bg-success" },
  rejeitado: { label: "Rejeitado", pill: "bg-danger-soft text-danger", dot: "bg-danger" },
};

export const MARCO_STATUS: Record<MarcoStatus, { label: string; pill: string; dot: string }> = {
  previsto: { label: "Previsto", pill: "bg-brand-soft text-brand-ink", dot: "bg-brand" },
  atingido: { label: "Atingido", pill: "bg-success-soft text-success", dot: "bg-success" },
  atrasado: { label: "Atrasado", pill: "bg-danger-soft text-danger", dot: "bg-danger" },
  cancelado: { label: "Cancelado", pill: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground" },
};

export const RISCO_NIVEIS: Record<RiscoNivel, { label: string; peso: number; pill: string }> = {
  baixo: { label: "Baixo", peso: 1, pill: "bg-success-soft text-success" },
  medio: { label: "Médio", peso: 2, pill: "bg-warning-soft text-warning" },
  alto: { label: "Alto", peso: 3, pill: "bg-danger-soft text-danger" },
  critico: { label: "Crítico", peso: 4, pill: "bg-danger-soft text-danger" },
};

/** Severidade do risco = probabilidade × impacto (1 a 16). */
export function severidadeRisco(probabilidade: RiscoNivel, impacto: RiscoNivel) {
  const valor = RISCO_NIVEIS[probabilidade].peso * RISCO_NIVEIS[impacto].peso;
  const nivel: RiscoNivel = valor >= 12 ? "critico" : valor >= 6 ? "alto" : valor >= 3 ? "medio" : "baixo";
  return { valor, nivel };
}

export function isoDate(data: Date) {
  return format(data, "yyyy-MM-dd");
}

/** Segunda-feira da semana da data informada. */
export function inicioSemana(data: Date | string) {
  const base = typeof data === "string" ? parseISO(data) : data;
  return startOfWeek(base, { weekStartsOn: 1 });
}

export function diasDaSemana(referencia: Date) {
  const inicio = inicioSemana(referencia);
  return Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
}

export function rotuloSemana(referencia: Date | string) {
  const inicio = inicioSemana(referencia);
  const fim = addDays(inicio, 6);
  return `${format(inicio, "dd MMM", { locale: ptBR })} — ${format(fim, "dd MMM", { locale: ptBR })}`;
}
