-- 0028 — Resumo diário de atrasos para o gerente do projeto
-- Complementa a 0027 (aviso individual ao responsável): todo dia, cada gerente recebe UMA
-- notificação por projeto que gerencia e tenha tarefas atrasadas, com o total, quantas não
-- têm responsável e há quantos dias está a mais antiga.
--
--   * Considera tarefas com prazo anterior a hoje (data de Brasília), fora de
--     concluída/cancelada/excluída, em projeto ativo — com ou sem responsável.
--   * Sem tarefas atrasadas, nenhuma notificação.
--   * No máximo uma por projeto por dia (reexecuções no mesmo dia não duplicam).
--   * Roda todos os dias às 08:05 (Brasília) = 11:05 UTC, logo depois do aviso individual.
--
-- Mesmo pré-requisito da 0027: pg_cron habilitado (se não estiver, a migração emite um
-- WARNING e a função continua disponível para agendar depois).

CREATE OR REPLACE FUNCTION public.notificar_resumo_atrasos_gerentes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_total integer;
BEGIN
  WITH por_projeto AS (
    SELECT pr.id AS projeto_id, pr.tenant_id, pr.gerente_id, pr.codigo, pr.nome,
           count(*) AS atrasadas,
           count(*) FILTER (WHERE t.responsavel_id IS NULL) AS sem_responsavel,
           max(v_hoje - t.prazo) AS dias_mais_antiga
      FROM public.projetos pr
      JOIN public.tarefas t ON t.projeto_id = pr.id
      JOIN public.profiles g ON g.id = pr.gerente_id
     WHERE pr.deleted_at IS NULL
       AND pr.status NOT IN ('concluido', 'cancelado')
       AND g.deleted_at IS NULL AND g.ativo AND g.tenant_id = pr.tenant_id
       AND t.deleted_at IS NULL
       AND t.prazo < v_hoje
       AND t.status NOT IN ('concluida', 'cancelada')
     GROUP BY pr.id, pr.tenant_id, pr.gerente_id, pr.codigo, pr.nome
  ), ins AS (
    INSERT INTO public.notificacoes (tenant_id, destinatario_id, tipo, titulo, mensagem, link, referencia_id)
    SELECT p.tenant_id, p.gerente_id, 'atraso', 'Resumo de atrasos',
           p.atrasadas || CASE WHEN p.atrasadas = 1 THEN ' tarefa atrasada' ELSE ' tarefas atrasadas' END
             || ' em ' || p.codigo || ' · ' || left(p.nome, 120)
             || CASE WHEN p.sem_responsavel > 0 THEN ' (' || p.sem_responsavel || ' sem responsável)' ELSE '' END
             || '. Mais antiga: ' || p.dias_mais_antiga
             || CASE WHEN p.dias_mais_antiga = 1 THEN ' dia.' ELSE ' dias.' END,
           '/projetos/' || p.projeto_id, p.projeto_id
      FROM por_projeto p
     WHERE NOT EXISTS (
       SELECT 1 FROM public.notificacoes n
        WHERE n.tipo = 'atraso'
          AND n.titulo = 'Resumo de atrasos'
          AND n.referencia_id = p.projeto_id
          AND n.created_at > now() - interval '20 hours'
     )
    RETURNING 1
  )
  SELECT count(*) INTO v_total FROM ins;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_resumo_atrasos_gerentes() FROM PUBLIC, anon, authenticated;

DO $do$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'pg_cron indisponivel (%). Habilite a extensao e execute: SELECT cron.schedule(''notificar-resumo-atrasos'', ''5 11 * * *'', ''SELECT public.notificar_resumo_atrasos_gerentes()'');', SQLERRM;
    RETURN;
  END;

  BEGIN
    PERFORM cron.unschedule('notificar-resumo-atrasos');
  EXCEPTION WHEN OTHERS THEN
    NULL; -- não existia
  END;

  PERFORM cron.schedule(
    'notificar-resumo-atrasos',
    '5 11 * * *',
    'SELECT public.notificar_resumo_atrasos_gerentes()'
  );
END
$do$;
