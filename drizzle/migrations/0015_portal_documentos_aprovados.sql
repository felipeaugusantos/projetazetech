CREATE OR REPLACE FUNCTION public.portal_projeto(p_projeto_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.portal_acessos;
  v jsonb;
BEGIN
  a := public.portal_acesso_atual();
  IF a.id IS NULL THEN RAISE EXCEPTION 'sem acesso ao portal'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.projetos pr
     WHERE pr.id = p_projeto_id AND pr.cliente_id = a.cliente_id AND pr.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'projeto nao disponivel para este acesso';
  END IF;

  SELECT jsonb_build_object(
    'projeto', (SELECT jsonb_build_object(
        'id', pr.id, 'codigo', pr.codigo, 'nome', pr.nome, 'descricao', pr.descricao,
        'status', pr.status, 'progresso', pr.progresso,
        'data_inicio', pr.data_inicio, 'prazo', pr.prazo,
        'data_prevista_conclusao', pr.data_prevista_conclusao,
        'data_real_conclusao', pr.data_real_conclusao,
        'gerente', (SELECT g.nome FROM public.profiles g WHERE g.id = pr.gerente_id)
      ) FROM public.projetos pr WHERE pr.id = p_projeto_id),
    'fases', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', f.id, 'nome', f.nome, 'descricao', f.descricao, 'ordem', f.ordem,
        'status', f.status, 'progresso', f.progresso,
        'data_inicio', f.data_inicio, 'prazo', f.prazo
      ) ORDER BY f.ordem) FROM public.projeto_fases f
       WHERE f.projeto_id = p_projeto_id AND f.deleted_at IS NULL), '[]'::jsonb),
    'marcos', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', m.id, 'nome', m.nome, 'descricao', m.descricao, 'data', m.data,
        'data_real', m.data_real, 'status', m.status, 'entrega_cliente', m.entrega_cliente,
        'fase', (SELECT f.nome FROM public.projeto_fases f WHERE f.id = m.fase_id),
        'decisao', (SELECT ap.decisao FROM public.portal_aprovacoes ap
                     WHERE ap.marco_id = m.id ORDER BY ap.created_at DESC LIMIT 1)
      ) ORDER BY m.data) FROM public.marcos m
       WHERE m.projeto_id = p_projeto_id AND m.deleted_at IS NULL AND m.entrega_cliente), '[]'::jsonb),
    'documentos', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', d.id, 'nome', d.nome, 'descricao', d.descricao, 'categoria', d.categoria,
        'url', d.url, 'tipo', d.tipo, 'tamanho', d.tamanho, 'created_at', d.created_at,
        'aprovacao_status', d.aprovacao_status, 'aprovado_em', d.aprovado_em,
        'fase', (SELECT f.nome FROM public.projeto_fases f WHERE f.id = d.fase_id)
      ) ORDER BY d.created_at DESC) FROM public.documentos d
       WHERE d.projeto_id = p_projeto_id AND d.deleted_at IS NULL AND d.visivel_cliente
         AND d.aprovacao_status = 'aprovado'), '[]'::jsonb),
    'comentarios', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', co.id, 'conteudo', co.conteudo, 'created_at', co.created_at,
        'autor', coalesce((SELECT pf.nome FROM public.profiles pf WHERE pf.id = co.autor_id),
                          (SELECT pa.nome FROM public.portal_acessos pa WHERE pa.id = co.portal_acesso_id)),
        'do_cliente', co.portal_acesso_id IS NOT NULL
      ) ORDER BY co.created_at) FROM public.comentarios co
       WHERE co.projeto_id = p_projeto_id AND co.deleted_at IS NULL AND co.interno = false), '[]'::jsonb),
    'pesquisa', (SELECT jsonb_build_object(
        'id', ps.id, 'nota_geral', ps.nota_geral, 'nota_prazo', ps.nota_prazo,
        'nota_qualidade', ps.nota_qualidade, 'nota_comunicacao', ps.nota_comunicacao,
        'recomendaria', ps.recomendaria, 'comentario', ps.comentario, 'created_at', ps.created_at)
      FROM public.pesquisas_satisfacao ps
      WHERE ps.projeto_id = p_projeto_id AND ps.portal_acesso_id = a.id)
  ) INTO v;

  RETURN v;
END;
$$;