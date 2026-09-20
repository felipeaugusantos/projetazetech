CREATE OR REPLACE FUNCTION public.portal_satisfacao()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.portal_acessos;
  v jsonb;
BEGIN
  a := public.portal_acesso_atual();
  IF a.id IS NULL THEN RAISE EXCEPTION 'sem acesso ao portal'; END IF;

  SELECT jsonb_build_object(
    'respostas', coalesce(count(*), 0),
    'media_geral', round(avg(ps.nota_geral)::numeric, 2),
    'media_prazo', round(avg(ps.nota_prazo)::numeric, 2),
    'media_qualidade', round(avg(ps.nota_qualidade)::numeric, 2),
    'media_comunicacao', round(avg(ps.nota_comunicacao)::numeric, 2),
    'media_recomendaria', round(avg(ps.recomendaria)::numeric, 2)
  )
  INTO v
  FROM public.pesquisas_satisfacao ps
  JOIN public.projetos pr ON pr.id = ps.projeto_id
  WHERE pr.cliente_id = a.cliente_id AND pr.deleted_at IS NULL;

  v := v || jsonb_build_object(
    'itens', coalesce((
      SELECT jsonb_agg(x ORDER BY x->>'created_at' DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', ps.id,
          'projeto', pr.nome,
          'projeto_id', pr.id,
          'codigo', pr.codigo,
          'nota_geral', ps.nota_geral,
          'nota_prazo', ps.nota_prazo,
          'nota_qualidade', ps.nota_qualidade,
          'nota_comunicacao', ps.nota_comunicacao,
          'recomendaria', ps.recomendaria,
          'comentario', ps.comentario,
          'created_at', ps.created_at
        ) AS x
        FROM public.pesquisas_satisfacao ps
        JOIN public.projetos pr ON pr.id = ps.projeto_id
        WHERE pr.cliente_id = a.cliente_id AND pr.deleted_at IS NULL
      ) s
    ), '[]'::jsonb)
  );

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.portal_satisfacao() FROM public;
GRANT EXECUTE ON FUNCTION public.portal_satisfacao() TO authenticated;
