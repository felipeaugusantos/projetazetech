DROP POLICY IF EXISTS "permissoes visiveis" ON public.permissoes;
CREATE POLICY "permissoes visiveis" ON public.permissoes FOR SELECT TO authenticated
USING (public.current_tenant_id() IS NOT NULL AND NOT public.is_portal_user());

DROP POLICY IF EXISTS "role permissoes visiveis" ON public.role_permissoes;
CREATE POLICY "role permissoes visiveis" ON public.role_permissoes FOR SELECT TO authenticated
USING (
  NOT public.is_portal_user()
  AND EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.id = role_permissoes.role_id
      AND (r.tenant_id IS NULL OR r.tenant_id = public.current_tenant_id())
  )
);