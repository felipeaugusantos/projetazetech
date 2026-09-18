-- Acesso ao bucket privado "documentos"
CREATE POLICY "documentos_interno_all" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'documentos'
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.deleted_at IS NULL)
)
WITH CHECK (
  bucket_id = 'documentos'
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.deleted_at IS NULL)
);

CREATE POLICY "documentos_portal_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos'
  AND EXISTS (
    SELECT 1
      FROM public.documentos d
      JOIN public.projetos pr ON pr.id = d.projeto_id
      JOIN public.portal_acessos pa ON pa.cliente_id = pr.cliente_id
     WHERE d.arquivo_path = storage.objects.name
       AND d.visivel_cliente
       AND d.deleted_at IS NULL
       AND pr.deleted_at IS NULL
       AND pa.user_id = auth.uid()
       AND pa.ativo
       AND pa.deleted_at IS NULL
  )
);
