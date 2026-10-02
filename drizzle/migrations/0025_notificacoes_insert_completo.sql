-- 0025 — Notificações: fechamento completo do INSERT
-- A migração 0020 removeu o INSERT livre (política + GRANT). Esta adiciona as camadas
-- que faltavam para que o fechamento não dependa de um único GRANT:
--   1. política RESTRITIVA que nega INSERT/DELETE a authenticated, mesmo que algum
--      GRANT volte por engano (as funções SECURITY DEFINER do portal não são afetadas);
--   2. trigger que garante destinatário do MESMO tenant da notificação;
--   3. restrição no link (só caminho interno do app);
--   4. política de UPDATE também com checagem de tenant.

-- 1. Negação explícita (RESTRICTIVE: vale em conjunto com qualquer outra política)
DROP POLICY IF EXISTS notificacoes_sem_insert ON public.notificacoes;
CREATE POLICY notificacoes_sem_insert ON public.notificacoes
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS notificacoes_sem_delete ON public.notificacoes;
CREATE POLICY notificacoes_sem_delete ON public.notificacoes
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

REVOKE ALL ON public.notificacoes FROM PUBLIC, anon;

-- 2. Destinatário precisa pertencer ao tenant informado
CREATE OR REPLACE FUNCTION public.notificacoes_valida_destinatario()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = NEW.destinatario_id AND p.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'destinatario nao pertence ao tenant da notificacao';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notificacoes_valida_destinatario ON public.notificacoes;
CREATE TRIGGER notificacoes_valida_destinatario
  BEFORE INSERT ON public.notificacoes
  FOR EACH ROW EXECUTE FUNCTION public.notificacoes_valida_destinatario();

-- 3. Link só pode ser caminho interno (/projetos/…, /satisfacao…); nada de URL externa
--    nem esquemas como javascript:. NOT VALID: vale para novas linhas, sem reescrever o histórico.
ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_link_interno;
ALTER TABLE public.notificacoes
  ADD CONSTRAINT notificacoes_link_interno
  CHECK (link IS NULL OR (link LIKE '/%' AND link NOT LIKE '//%' AND link NOT LIKE '%\%')) NOT VALID;

-- 4. UPDATE: além de ser o destinatário, precisa ser do tenant (a coluna editável já
--    é só `lida`, por GRANT da 0020)
DROP POLICY IF EXISTS "notificacoes marcar" ON public.notificacoes;
CREATE POLICY "notificacoes marcar" ON public.notificacoes FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND destinatario_id = public.current_profile_id())
  WITH CHECK (tenant_id = public.current_tenant_id() AND destinatario_id = public.current_profile_id());
