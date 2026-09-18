CREATE OR REPLACE FUNCTION public.portal_documento_arquivo(p_documento_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object('nome', d.nome, 'arquivo_path', d.arquivo_path, 'url', d.url)
    FROM public.documentos d
    JOIN public.projetos pr ON pr.id = d.projeto_id
    JOIN public.portal_acessos pa ON pa.cliente_id = pr.cliente_id
   WHERE d.id = p_documento_id
     AND d.visivel_cliente
     AND d.deleted_at IS NULL
     AND pr.deleted_at IS NULL
     AND pa.user_id = auth.uid()
     AND pa.ativo
     AND pa.deleted_at IS NULL
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.portal_documento_arquivo(uuid) TO authenticated;
