import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Tabela = "profiles" | "projeto_fases" | "clientes" | "projetos" | "tarefas" | "roles";

/** Colunas de chave estrangeira que a auditoria registra como UUID, e a tabela de cada uma. */
const TABELA_DO_CAMPO: Record<string, Tabela> = {
  responsavel_id: "profiles",
  gerente_id: "profiles",
  profile_id: "profiles",
  aprovador_id: "profiles",
  autor_id: "profiles",
  fase_id: "projeto_fases",
  cliente_id: "clientes",
  projeto_id: "projetos",
  tarefa_id: "tarefas",
  role_id: "roles",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Linha = { campo: string | null; valor_anterior: string | null; valor_novo: string | null };

async function buscarNomes(ids: Record<Tabela, string[]>) {
  const nomes: Record<string, string> = {};
  const guardar = (linhas: { id: string; nome?: string; titulo?: string }[] | null) => {
    for (const l of linhas ?? []) nomes[l.id] = (l.nome ?? l.titulo ?? "").trim();
  };
  const consultas: PromiseLike<void>[] = [];
  if (ids.profiles.length)
    consultas.push(
      supabase
        .from("profiles")
        .select("id, nome")
        .in("id", ids.profiles)
        .then((r) => guardar(r.data)),
    );
  if (ids.projeto_fases.length)
    consultas.push(
      supabase
        .from("projeto_fases")
        .select("id, nome")
        .in("id", ids.projeto_fases)
        .then((r) => guardar(r.data)),
    );
  if (ids.clientes.length)
    consultas.push(
      supabase
        .from("clientes")
        .select("id, nome")
        .in("id", ids.clientes)
        .then((r) => guardar(r.data)),
    );
  if (ids.projetos.length)
    consultas.push(
      supabase
        .from("projetos")
        .select("id, nome")
        .in("id", ids.projetos)
        .then((r) => guardar(r.data)),
    );
  if (ids.tarefas.length)
    consultas.push(
      supabase
        .from("tarefas")
        .select("id, titulo")
        .in("id", ids.tarefas)
        .then((r) => guardar(r.data)),
    );
  if (ids.roles.length)
    consultas.push(
      supabase
        .from("roles")
        .select("id, nome")
        .in("id", ids.roles)
        .then((r) => guardar(r.data)),
    );
  await Promise.all(consultas);
  return nomes;
}

/**
 * Troca UUIDs do histórico (responsável, fase, cliente…) pelo nome do registro.
 * Devolve uma função `(campo, valor) => texto`; enquanto carrega, ou se o registro
 * não existe mais, mostra "(removido)" para UUIDs e o valor original para o resto.
 */
export function useNomesHistorico(itens: Linha[]) {
  const { perfil } = useAuth();

  const ids: Record<Tabela, string[]> = {
    profiles: [],
    projeto_fases: [],
    clientes: [],
    projetos: [],
    tarefas: [],
    roles: [],
  };
  for (const i of itens) {
    const tabela = i.campo ? TABELA_DO_CAMPO[i.campo] : undefined;
    if (!tabela) continue;
    for (const v of [i.valor_anterior, i.valor_novo]) {
      if (v && UUID.test(v) && !ids[tabela].includes(v)) ids[tabela].push(v);
    }
  }
  for (const t of Object.keys(ids) as Tabela[]) ids[t].sort();
  const chave = Object.values(ids).flat().join(",");

  const { data: nomes } = useQuery({
    queryKey: ["historico-nomes", perfil?.tenant_id, chave],
    enabled: !!perfil && chave !== "",
    staleTime: 60_000,
    queryFn: () => buscarNomes(ids),
  });

  return (campo: string | null, valor: string | null): string | null => {
    if (!valor) return valor;
    if (!campo || !TABELA_DO_CAMPO[campo] || !UUID.test(valor)) return valor;
    return nomes?.[valor] || (nomes ? "(removido)" : "…");
  };
}
