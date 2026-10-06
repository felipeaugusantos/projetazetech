import { useQuery } from "@tanstack/react-query";
import { addDays, addWeeks, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { inicioSemana, type ApontamentoStatus } from "@/lib/enzova";

/* ===== Agrupamento (funções puras) ===== */

export type FiltroStatusHoras = "aprovado" | "aprovado_enviado" | "todos";

export const FILTRO_STATUS_HORAS: Record<
  FiltroStatusHoras,
  { rotulo: string; status: ApontamentoStatus[] }
> = {
  aprovado: { rotulo: "Só aprovadas", status: ["aprovado"] },
  aprovado_enviado: { rotulo: "Aprovadas e em aprovação", status: ["aprovado", "enviado"] },
  todos: {
    rotulo: "Todas (inclui rascunho e rejeitadas)",
    status: ["rascunho", "enviado", "aprovado", "rejeitado"],
  },
};

export type ApontamentoHoras = {
  projeto_id: string;
  data: string;
  horas: number | string;
  faturavel: boolean;
  status: ApontamentoStatus;
};

export type ProjetoRef = { id: string; codigo: string; nome: string; cliente_id: string | null };
export type ClienteRef = { id: string; nome: string; nome_fantasia: string | null };

export type LinhaProjetoHoras = {
  projeto_id: string;
  codigo: string;
  nome: string;
  porSemana: number[];
  total: number;
  faturavel: number;
};

export type LinhaClienteHoras = {
  id: string;
  nome: string;
  porSemana: number[];
  total: number;
  faturavel: number;
  projetos: LinhaProjetoHoras[];
};

export type ResultadoHoras = {
  /** Segundas-feiras (yyyy-MM-dd), da mais antiga para a mais recente. */
  semanas: string[];
  clientes: LinhaClienteHoras[];
  porSemana: number[];
  total: number;
  faturavel: number;
  /** Apontamentos que entraram na soma (dentro do período, do filtro e de um projeto conhecido). */
  considerados: number;
};

const ISO = "yyyy-MM-dd";

/** Segundas-feiras das últimas `quantidade` semanas, incluindo a semana de `hoje`. */
export function semanasDoPeriodo(quantidade: number, hoje: Date = new Date()): string[] {
  const base = inicioSemana(hoje);
  const n = Math.max(1, Math.floor(quantidade));
  return Array.from({ length: n }, (_, i) => format(addWeeks(base, -(n - 1 - i)), ISO));
}

/** Primeiro e último dia (yyyy-MM-dd) cobertos por uma lista de semanas. */
export function limitesDoPeriodo(semanas: string[]) {
  const primeira = semanas[0] ?? format(inicioSemana(new Date()), ISO);
  const ultima = semanas[semanas.length - 1] ?? primeira;
  return { desde: primeira, ate: format(addDays(inicioSemana(ultima), 6), ISO) };
}

const arredonda = (n: number) => Math.round(n * 100) / 100;

export function agruparHoras(entrada: {
  apontamentos: ApontamentoHoras[];
  projetos: ProjetoRef[];
  clientes: ClienteRef[];
  semanas: string[];
  status: ApontamentoStatus[];
  clienteId?: string;
}): ResultadoHoras {
  const { apontamentos, projetos, clientes, semanas, status, clienteId } = entrada;
  const indiceSemana = new Map(semanas.map((s, i) => [s, i]));
  const projetoPorId = new Map(projetos.map((p) => [p.id, p]));
  const nomeCliente = new Map(clientes.map((c) => [c.id, c.nome_fantasia ?? c.nome]));
  const statusValidos = new Set(status);

  const porProjeto = new Map<string, LinhaProjetoHoras>();
  let considerados = 0;

  for (const a of apontamentos) {
    if (!statusValidos.has(a.status)) continue;
    const projeto = projetoPorId.get(a.projeto_id);
    if (!projeto) continue;
    if (clienteId && projeto.cliente_id !== clienteId) continue;
    const i = indiceSemana.get(format(inicioSemana(a.data), ISO));
    if (i === undefined) continue;
    const horas = Number(a.horas);
    if (!Number.isFinite(horas) || horas <= 0) continue;

    const linha =
      porProjeto.get(projeto.id) ??
      ({
        projeto_id: projeto.id,
        codigo: projeto.codigo,
        nome: projeto.nome,
        porSemana: semanas.map(() => 0),
        total: 0,
        faturavel: 0,
      } satisfies LinhaProjetoHoras);
    linha.porSemana[i] = (linha.porSemana[i] ?? 0) + horas;
    linha.total += horas;
    if (a.faturavel) linha.faturavel += horas;
    porProjeto.set(projeto.id, linha);
    considerados += 1;
  }

  const porCliente = new Map<string, LinhaClienteHoras>();
  for (const linha of porProjeto.values()) {
    const projeto = projetoPorId.get(linha.projeto_id)!;
    const chave = projeto.cliente_id ?? "sem-cliente";
    const grupo =
      porCliente.get(chave) ??
      ({
        id: chave,
        nome: (projeto.cliente_id ? nomeCliente.get(projeto.cliente_id) : null) ?? "Sem cliente",
        porSemana: semanas.map(() => 0),
        total: 0,
        faturavel: 0,
        projetos: [],
      } satisfies LinhaClienteHoras);
    linha.porSemana.forEach((h, i) => {
      grupo.porSemana[i] = (grupo.porSemana[i] ?? 0) + h;
    });
    grupo.total += linha.total;
    grupo.faturavel += linha.faturavel;
    grupo.projetos.push(linha);
    porCliente.set(chave, grupo);
  }

  const arredondaLinha = <T extends { porSemana: number[]; total: number; faturavel: number }>(
    l: T,
  ): T => ({
    ...l,
    porSemana: l.porSemana.map(arredonda),
    total: arredonda(l.total),
    faturavel: arredonda(l.faturavel),
  });

  const listaClientes = Array.from(porCliente.values())
    .map((c) => ({
      ...arredondaLinha(c),
      projetos: c.projetos.map(arredondaLinha).sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));

  const porSemana = semanas.map((_, i) =>
    arredonda(listaClientes.reduce((s, c) => s + (c.porSemana[i] ?? 0), 0)),
  );
  return {
    semanas,
    clientes: listaClientes,
    porSemana,
    total: arredonda(listaClientes.reduce((s, c) => s + c.total, 0)),
    faturavel: arredonda(listaClientes.reduce((s, c) => s + c.faturavel, 0)),
    considerados,
  };
}

/** Série para o gráfico empilhado: os `max` clientes com mais horas e o restante em "Outros". */
export function dadosGrafico(resultado: ResultadoHoras, max = 5) {
  const principais = resultado.clientes.slice(0, max);
  const resto = resultado.clientes.slice(max);
  const series = [...principais.map((c) => c.nome), ...(resto.length ? ["Outros"] : [])];
  const linhas = resultado.semanas.map((semana, i) => {
    const linha: Record<string, string | number> = {
      semana: format(new Date(`${semana}T12:00:00`), "dd/MM"),
    };
    for (const c of principais) linha[c.nome] = c.porSemana[i] ?? 0;
    if (resto.length)
      linha["Outros"] = arredonda(resto.reduce((s, c) => s + (c.porSemana[i] ?? 0), 0));
    return linha;
  });
  return { series, linhas };
}

function celulaCsv(valor: string | number) {
  const texto = String(valor);
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

const num = (n: number) => n.toFixed(2).replace(".", ",");

/** CSV (separador ;, decimais com vírgula, BOM para o Excel): uma linha por projeto e uma semana por coluna. */
export function gerarCsvHoras(resultado: ResultadoHoras) {
  const cabecalho = [
    "Cliente",
    "Código",
    "Projeto",
    ...resultado.semanas.map((s) => format(new Date(`${s}T12:00:00`), "dd/MM/yyyy")),
    "Total (h)",
    "Faturáveis (h)",
  ];
  const linhas = resultado.clientes.flatMap((c) =>
    c.projetos.map((p) => [
      c.nome,
      p.codigo,
      p.nome,
      ...p.porSemana.map(num),
      num(p.total),
      num(p.faturavel),
    ]),
  );
  const total = [
    "Total",
    "",
    "",
    ...resultado.porSemana.map(num),
    num(resultado.total),
    num(resultado.faturavel),
  ];
  return `\ufeff${[cabecalho, ...linhas, total].map((l) => l.map(celulaCsv).join(";")).join("\r\n")}`;
}

/* ===== Dados ===== */

const PAGINA = 1000;

/** Apontamentos do período, paginados (o limite padrão do PostgREST é de 1000 linhas por consulta). */
export function useHorasPeriodo(desde: string, ate: string) {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["horas-periodo", perfil?.tenant_id, desde, ate],
    enabled: !!perfil,
    queryFn: async () => {
      const todos: ApontamentoHoras[] = [];
      for (let inicio = 0; ; inicio += PAGINA) {
        const { data, error } = await supabase
          .from("apontamentos")
          .select("id, projeto_id, data, horas, faturavel, status")
          .is("deleted_at", null)
          .gte("data", desde)
          .lte("data", ate)
          .order("data", { ascending: true })
          .order("id", { ascending: true })
          .range(inicio, inicio + PAGINA - 1);
        if (error) throw error;
        const lote = (data ?? []) as unknown as ApontamentoHoras[];
        todos.push(...lote);
        if (lote.length < PAGINA) break;
      }
      return todos;
    },
  });
}
