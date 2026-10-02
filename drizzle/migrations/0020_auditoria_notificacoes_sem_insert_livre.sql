-- 0020 — Fecha o INSERT livre em notificacoes e auditoria
-- Antes: qualquer usuário do tenant inseria linhas arbitrárias (notificar qualquer
-- colega, registrar auditoria em nome de outra pessoa, com data retroativa).

-- =====================================================================
-- notificacoes
--   Só o servidor cria notificações (funções SECURITY DEFINER do portal, que
--   não dependem de RLS/GRANT do usuário). O cliente apenas lê e marca como lida.
-- =====================================================================
DROP POLICY IF EXISTS "notificacoes criar" ON public.notificacoes;
REVOKE INSERT, DELETE ON public.notificacoes FROM authenticated;

-- A única edição legítima pelo usuário é marcar como lida.
REVOKE UPDATE ON public.notificacoes FROM authenticated;
GRANT UPDATE (lida) ON public.notificacoes TO authenticated;

-- =====================================================================
-- auditoria
--   O app registra a auditoria pelo cliente (registrarAuditoria). Para que o
--   histórico seja confiável, a linha precisa:
--     - ser do tenant do usuário e atribuída ao PRÓPRIO perfil;
--     - referenciar apenas projeto do mesmo tenant;
--     - ter data de servidor (sem retroagir).
--   A tabela já é append-only para o usuário (só SELECT e INSERT).
-- =====================================================================
DROP POLICY IF EXISTS "auditoria criar" ON public.auditoria;

CREATE POLICY "auditoria criar" ON public.auditoria FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND profile_id = public.current_profile_id()
    AND (
      projeto_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.projetos p
         WHERE p.id = projeto_id AND p.tenant_id = public.current_tenant_id()
      )
    )
  );

CREATE OR REPLACE FUNCTION public.auditoria_data_servidor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.created_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auditoria_data_servidor ON public.auditoria;
CREATE TRIGGER auditoria_data_servidor
  BEFORE INSERT ON public.auditoria
  FOR EACH ROW EXECUTE FUNCTION public.auditoria_data_servidor();
