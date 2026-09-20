CREATE OR REPLACE FUNCTION public.portal_painel()
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
    'prazos', coalesce((
      SELECT jsonb_agg(x ORDER BY x->>'data' NULLS LAST)
      FROM (
        SELECT jsonb_build_object(
          'id', m.id, 'tipo', 'entrega', 'nome', m.nome,
          'projeto', pr.nome, 'projeto_id', pr.id, 'codigo', pr.codigo,
          'data', m.data, 'status', m.status::text
        ) AS x
        FROM public.marcos m
        JOIN public.projetos pr ON pr.id = m.projeto_id
        WHERE pr.cliente_id = a.cliente_id AND pr.deleted_at IS NULL AND pr.status <> 'cancelado'
          AND m.deleted_at IS NULL AND m.entrega_cliente AND m.status <> 'cancelado'
        UNION ALL
        SELECT jsonb_build_object(
          'id', pr.id, 'tipo', 'projeto', 'nome', 'Conclusão do projeto',
          'projeto', pr.nome, 'projeto_id', pr.id, 'codigo', pr.codigo,
          'data', coalesce(pr.prazo, pr.data_prevista_conclusao),
          'status', CASE WHEN pr.status = 'concluido' THEN 'atingido' ELSE 'previsto' END
        ) AS x
        FROM public.projetos pr
        WHERE pr.cliente_id = a.cliente_id AND pr.deleted_at IS NULL AND pr.status <> 'cancelado'
          AND coalesce(pr.prazo, pr.data_prevista_conclusao) IS NOT NULL
      ) s
    ), '[]'::jsonb),
    'documentos', coalesce((
      SELECT jsonb_agg(x ORDER BY x->>'aprovado_em' DESC NULLS LAST)
      FROM (
        SELECT jsonb_build_object(
          'id', d.id, 'nome', d.nome, 'categoria', d.categoria,
          'projeto', pr.nome, 'projeto_id', pr.id, 'codigo', pr.codigo,
          'aprovado_em', d.aprovado_em, 'created_at', d.created_at
        ) AS x
        FROM public.documentos d
        JOIN public.projetos pr ON pr.id = d.projeto_id
        WHERE pr.cliente_id = a.cliente_id AND pr.deleted_at IS NULL AND pr.status <> 'cancelado'
          AND d.deleted_at IS NULL AND d.visivel_cliente AND d.aprovacao_status = 'aprovado'
      ) s
    ), '[]'::jsonb),
    'horas_por_pessoa', coalesce((
      SELECT jsonb_agg(x ORDER BY (x->>'horas')::numeric DESC)
      FROM (
        SELECT jsonb_build_object(
          'profile_id', pf.id, 'nome', pf.nome, 'cargo', pf.cargo,
          'horas', round(sum(ap.horas)::numeric, 2)
        ) AS x
        FROM public.apontamentos ap
        JOIN public.projetos pr ON pr.id = ap.projeto_id
        JOIN public.profiles pf ON pf.id = ap.profile_id
        WHERE pr.cliente_id = a.cliente_id AND pr.deleted_at IS NULL AND pr.status <> 'cancelado'
          AND ap.deleted_at IS NULL AND ap.status = 'aprovado'
        GROUP BY pf.id, pf.nome, pf.cargo
      ) s
    ), '[]'::jsonb),
    'horas_por_projeto', coalesce((
      SELECT jsonb_agg(x ORDER BY x->>'codigo')
      FROM (
        SELECT jsonb_build_object(
          'projeto_id', pr.id, 'codigo', pr.codigo, 'projeto', pr.nome,
          'horas', round(coalesce(sum(ap.horas), 0)::numeric, 2)
        ) AS x
        FROM public.projetos pr
        LEFT JOIN public.apontamentos ap
          ON ap.projeto_id = pr.id AND ap.deleted_at IS NULL AND ap.status = 'aprovado'
        WHERE pr.cliente_id = a.cliente_id AND pr.deleted_at IS NULL AND pr.status <> 'cancelado'
        GROUP BY pr.id, pr.codigo, pr.nome
      ) s
    ), '[]'::jsonb)
  ) INTO v;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.portal_painel() FROM public;
GRANT EXECUTE ON FUNCTION public.portal_painel() TO authenticated;
