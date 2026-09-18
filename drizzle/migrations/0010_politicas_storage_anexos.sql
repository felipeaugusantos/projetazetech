-- Anexos de comentários: caminho no formato {projeto_id}/{arquivo}
CREATE POLICY anexos_interno_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'anexos' AND public.current_profile_id() IS NOT NULL)
  WITH CHECK (bucket_id = 'anexos' AND public.current_profile_id() IS NOT NULL);

CREATE POLICY anexos_portal_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'anexos'
    AND EXISTS (
      SELECT 1
      FROM public.projetos p
      JOIN public.portal_acessos pa ON pa.cliente_id = p.cliente_id
      WHERE pa.user_id = auth.uid()
        AND pa.ativo
        AND pa.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND split_part(storage.objects.name, '/', 1) = p.id::text
    )
  );

CREATE POLICY anexos_portal_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'anexos'
    AND EXISTS (
      SELECT 1
      FROM public.projetos p
      JOIN public.portal_acessos pa ON pa.cliente_id = p.cliente_id
      WHERE pa.user_id = auth.uid()
        AND pa.ativo
        AND pa.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND split_part(storage.objects.name, '/', 1) = p.id::text
    )
  );