-- 0027 — Aviso de tarefas atrasadas (pg_cron)
-- Atraso não é um evento de linha (ninguém altera a tarefa quando o prazo passa), então
-- uma rotina diária procura tarefas vencidas e notifica o responsável.
--
--   * Considera tarefas com prazo anterior a hoje (data de Brasília), responsável definido,
--     fora de concluída/cancelada, em projeto ativo.
--   * Uma notificação por tarefa; repete a cada 7 dias enquanto continuar atrasada.
--   * Roda todos os dias às 08:00 (Brasília) = 11:00 UTC.
--
-- Pré-requisito: a extensão pg_cron habilitada (Supabase: Database → Extensions → pg_cron).
-- Se a extensão não puder ser criada, a migração continua e emite um WARNING; a função
-- abaixo funciona do mesmo jeito e pode ser agendada depois (instrução no final).

-- Referência da entidade, para não repetir o aviso da mesma tarefa
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS referencia_id uuid;
CREATE INDEX IF NOT EXISTS notificacoes_atraso_ref_idx
  ON public.notificacoes (referencia_id, created_at DESC) WHERE tipo = 'atraso';

CREATE OR REPLACE FUNCTION public.notificar_tarefas_atrasadas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_total integer;
BEGIN
  WITH atrasadas AS (
    SELECT t.id, t.tenant_id, t.projeto_id, t.titulo, t.prazo, t.responsavel_id,
           (v_hoje - t.prazo) AS dias
      FROM public.tarefas t
      JOIN public.projetos pr ON pr.id = t.projeto_id
      JOIN public.profiles p ON p.id = t.responsavel_id
     WHERE t.deleted_at IS NULL
       AND t.prazo < v_hoje
       AND t.responsavel_id IS NOT NULL
       AND t.status NOT IN ('concluida', 'cancelada')
       AND pr.deleted_at IS NULL
       AND pr.status NOT IN ('concluido', 'cancelado')
       AND p.deleted_at IS NULL AND p.ativo AND p.tenant_id = t.tenant_id
       AND NOT EXISTS (
         SELECT 1 FROM public.notificacoes n
          WHERE n.tipo = 'atraso'
            AND n.referencia_id = t.id
            AND n.created_at > now() - interval '7 days'
       )
  ), ins AS (
    INSERT INTO public.notificacoes (tenant_id, destinatario_id, tipo, titulo, mensagem, link, referencia_id)
    SELECT a.tenant_id, a.responsavel_id, 'atraso', 'Tarefa atrasada',
           left(a.titulo, 200) || ' · venceu em ' || to_char(a.prazo, 'DD/MM') ||
           ' (' || a.dias || CASE WHEN a.dias = 1 THEN ' dia' ELSE ' dias' END || ' de atraso)',
           '/projetos/' || a.projeto_id, a.id
      FROM atrasadas a
    RETURNING 1
  )
  SELECT count(*) INTO v_total FROM ins;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_tarefas_atrasadas() FROM PUBLIC, anon, authenticated;

-- Agendamento diário (idempotente: reagenda se já existir)
DO $do$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'pg_cron indisponivel (%). Habilite a extensao e execute: SELECT cron.schedule(''notificar-tarefas-atrasadas'', ''0 11 * * *'', ''SELECT public.notificar_tarefas_atrasadas()'');', SQLERRM;
    RETURN;
  END;

  -- Remove agendamento anterior com o mesmo nome (se houver) e recria
  BEGIN
    PERFORM cron.unschedule('notificar-tarefas-atrasadas');
  EXCEPTION WHEN OTHERS THEN
    NULL; -- não existia
  END;

  PERFORM cron.schedule(
    'notificar-tarefas-atrasadas',
    '0 11 * * *',
    'SELECT public.notificar_tarefas_atrasadas()'
  );
END
$do$;
