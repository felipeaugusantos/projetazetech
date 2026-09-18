-- Configuração da marca d'água do relatório compartilhado (por empresa)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS marca_dagua_ativa boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS marca_dagua_texto text,
  ADD COLUMN IF NOT EXISTS marca_dagua_cor text,
  ADD COLUMN IF NOT EXISTS marca_dagua_opacidade numeric NOT NULL DEFAULT 0.08,
  ADD COLUMN IF NOT EXISTS marca_dagua_aviso text;

-- portal_resumo: expõe a configuração da marca d'água junto dos dados da empresa
CREATE OR REPLACE FUNCTION public.portal_resumo()
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

  SELECT jsonb_build_object(
    'acesso', jsonb_build_object('id', a.id, 'nome', a.nome, 'email', a.email, 'cargo', a.cargo),
    'cliente', (SELECT jsonb_build_object('id', c.id, 'nome', c.nome, 'nome_fantasia', c.nome_fantasia)
                  FROM public.clientes c WHERE c.id = a.cliente_id),
    'empresa', (SELECT jsonb_build_object(
                  'nome', t.nome,
                  'marca_dagua_ativa', t.marca_dagua_ativa,
                  'marca_dagua_texto', t.marca_dagua_texto,
                  'marca_dagua_cor', t.marca_dagua_cor,
                  'marca_dagua_opacidade', t.marca_dagua_opacidade,
                  'marca_dagua_aviso', t.marca_dagua_aviso)
                  FROM public.tenants t WHERE t.id = a.tenant_id),
    'tema', (SELECT jsonb_build_object(
                'nome_exibicao', tm.nome_exibicao, 'logo_url', tm.logo_url,
                'cor_primaria', tm.cor_primaria, 'cor_destaque', tm.cor_destaque,
                'mensagem', tm.mensagem)
               FROM public.portal_temas tm WHERE tm.cliente_id = a.cliente_id),
    'projetos', coalesce((
      SELECT jsonb_agg(p ORDER BY p->>'nome')
      FROM (
        SELECT jsonb_build_object(
          'id', pr.id, 'codigo', pr.codigo, 'nome', pr.nome, 'descricao', pr.descricao,
          'status', pr.status, 'progresso', pr.progresso,
          'data_inicio', pr.data_inicio, 'prazo', pr.prazo,
          'data_prevista_conclusao', pr.data_prevista_conclusao,
          'data_real_conclusao', pr.data_real_conclusao,
          'fases_total', (SELECT count(*) FROM public.projeto_fases f WHERE f.projeto_id = pr.id AND f.deleted_at IS NULL),
          'fases_concluidas', (SELECT count(*) FROM public.projeto_fases f WHERE f.projeto_id = pr.id AND f.deleted_at IS NULL AND f.status = 'concluida'),
          'marcos_pendentes', (SELECT count(*) FROM public.marcos m WHERE m.projeto_id = pr.id AND m.deleted_at IS NULL AND m.entrega_cliente AND m.status = 'previsto'),
          'documentos', (SELECT count(*) FROM public.documentos d WHERE d.projeto_id = pr.id AND d.deleted_at IS NULL AND d.visivel_cliente),
          'concluido', pr.status = 'concluido',
          'pesquisa_respondida', EXISTS (SELECT 1 FROM public.pesquisas_satisfacao ps
                                          WHERE ps.projeto_id = pr.id AND ps.portal_acesso_id = a.id)
        ) AS p
        FROM public.projetos pr
        WHERE pr.cliente_id = a.cliente_id AND pr.deleted_at IS NULL AND pr.status <> 'cancelado'
      ) s
    ), '[]'::jsonb)
  ) INTO v;

  RETURN v;
END;
$$;

-- relatorio_link_abrir: idem para o link compartilhável
CREATE OR REPLACE FUNCTION public.relatorio_link_abrir(p_token text, p_senha text DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.relatorio_links;
  v_status text;
  v_dados jsonb;
BEGIN
  SELECT * INTO v_link FROM public.relatorio_links WHERE token = p_token;
  IF v_link.id IS NULL THEN
    RETURN jsonb_build_object('status', 'nao_encontrado');
  END IF;

  IF NOT v_link.ativo THEN
    v_status := 'revogado';
  ELSIF v_link.expira_em <= now() THEN
    v_status := 'expirado';
  ELSIF v_link.max_acessos IS NOT NULL AND v_link.acessos >= v_link.max_acessos THEN
    v_status := 'limite';
  ELSIF v_link.senha_hash IS NOT NULL
        AND (p_senha IS NULL OR public.relatorio_link_hash(p_senha) IS DISTINCT FROM v_link.senha_hash) THEN
    v_status := CASE WHEN p_senha IS NULL THEN 'senha' ELSE 'senha_invalida' END;
  ELSE
    v_status := 'ok';
  END IF;

  IF v_status <> 'senha' THEN
    INSERT INTO public.relatorio_link_acessos (tenant_id, link_id, resultado, user_agent)
    VALUES (v_link.tenant_id, v_link.id, v_status, left(coalesce(p_user_agent, ''), 300));
  END IF;

  IF v_status <> 'ok' THEN
    RETURN jsonb_build_object('status', v_status, 'protegido', v_link.senha_hash IS NOT NULL);
  END IF;

  UPDATE public.relatorio_links
     SET acessos = acessos + 1, ultimo_acesso = now()
   WHERE id = v_link.id;

  SELECT jsonb_build_object(
    'projeto', jsonb_build_object(
      'id', pr.id, 'codigo', pr.codigo, 'nome', pr.nome, 'descricao', pr.descricao,
      'status', pr.status, 'progresso', pr.progresso, 'data_inicio', pr.data_inicio,
      'prazo', pr.prazo, 'data_prevista_conclusao', pr.data_prevista_conclusao,
      'data_real_conclusao', pr.data_real_conclusao,
      'gerente', (SELECT g.nome FROM public.profiles g WHERE g.id = pr.gerente_id)
    ),
    'empresa', jsonb_build_object(
      'nome', t.nome,
      'marca_dagua_ativa', t.marca_dagua_ativa,
      'marca_dagua_texto', t.marca_dagua_texto,
      'marca_dagua_cor', t.marca_dagua_cor,
      'marca_dagua_opacidade', t.marca_dagua_opacidade,
      'marca_dagua_aviso', t.marca_dagua_aviso
    ),
    'cliente', CASE WHEN c.id IS NULL THEN NULL
      ELSE jsonb_build_object('id', c.id, 'nome', c.nome, 'nome_fantasia', c.nome_fantasia) END,
    'tema', (
      SELECT jsonb_build_object('nome_exibicao', tm.nome_exibicao, 'logo_url', tm.logo_url,
        'cor_primaria', tm.cor_primaria, 'cor_destaque', tm.cor_destaque, 'mensagem', tm.mensagem)
      FROM public.portal_temas tm WHERE tm.cliente_id = c.id
    ),
    'fases', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', f.id, 'nome', f.nome, 'descricao', f.descricao,
        'ordem', f.ordem, 'status', f.status, 'progresso', f.progresso,
        'data_inicio', f.data_inicio, 'prazo', f.prazo) ORDER BY f.ordem)
      FROM public.projeto_fases f WHERE f.projeto_id = pr.id AND f.deleted_at IS NULL
    ), '[]'::jsonb),
    'marcos', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', m.id, 'nome', m.nome, 'descricao', m.descricao,
        'data', m.data, 'data_real', m.data_real, 'status', m.status,
        'entrega_cliente', m.entrega_cliente,
        'fase', (SELECT ff.nome FROM public.projeto_fases ff WHERE ff.id = m.fase_id),
        'decisao', (SELECT pa.decisao FROM public.portal_aprovacoes pa
                     WHERE pa.marco_id = m.id ORDER BY pa.created_at DESC LIMIT 1)
      ) ORDER BY m.data NULLS LAST)
      FROM public.marcos m WHERE m.projeto_id = pr.id AND m.deleted_at IS NULL
    ), '[]'::jsonb),
    'documentos', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', d.id, 'nome', d.nome, 'descricao', d.descricao,
        'categoria', d.categoria, 'url', d.url, 'tipo', d.tipo, 'tamanho', d.tamanho,
        'created_at', d.created_at,
        'fase', (SELECT ff.nome FROM public.projeto_fases ff WHERE ff.id = d.fase_id))
        ORDER BY d.created_at DESC)
      FROM public.documentos d
      WHERE d.projeto_id = pr.id AND d.deleted_at IS NULL AND d.visivel_cliente
    ), '[]'::jsonb),
    'comentarios', '[]'::jsonb,
    'pesquisa', NULL,
    'link', jsonb_build_object('descricao', v_link.descricao, 'expira_em', v_link.expira_em)
  )
  INTO v_dados
  FROM public.projetos pr
  JOIN public.tenants t ON t.id = pr.tenant_id
  LEFT JOIN public.clientes c ON c.id = pr.cliente_id
  WHERE pr.id = v_link.projeto_id AND pr.deleted_at IS NULL;

  IF v_dados IS NULL THEN
    RETURN jsonb_build_object('status', 'nao_encontrado');
  END IF;

  RETURN jsonb_build_object('status', 'ok', 'dados', v_dados);
END;
$$;

GRANT EXECUTE ON FUNCTION public.relatorio_link_abrir(text, text, text) TO anon, authenticated;