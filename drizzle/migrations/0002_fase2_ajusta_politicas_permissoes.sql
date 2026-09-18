-- Alinha as políticas da Fase 2 com os códigos de permissão existentes
DROP POLICY IF EXISTS "apontamentos_insert" ON public.apontamentos;
DROP POLICY IF EXISTS "apontamentos_update" ON public.apontamentos;

CREATE POLICY "apontamentos_insert" ON public.apontamentos FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (profile_id = public.current_profile_id() OR public.has_permission('horas.aprovar'))
  );
CREATE POLICY "apontamentos_update" ON public.apontamentos FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (profile_id = public.current_profile_id() OR public.has_permission('horas.aprovar'))
  );
