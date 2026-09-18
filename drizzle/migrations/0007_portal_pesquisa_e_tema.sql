-- ============ Personalização do portal por cliente ============

CREATE TABLE public.portal_temas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome_exibicao text,
  logo_url text,
  cor_primaria text,
  cor_destaque text,
  mensagem text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX portal_temas_cliente_uk ON public.portal_temas (cliente_id);

GRANT SELECT, INSERT, UPDATE ON public.portal_temas TO authenticated;
GRANT ALL ON public.portal_temas TO service_role;
ALTER TABLE public.portal_temas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_temas_select" ON public.portal_temas FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    OR cliente_id IN (SELECT cliente_id FROM public.portal_acessos WHERE user_id = auth.uid() AND ativo AND deleted_at IS NULL)
  );
CREATE POLICY "portal_temas_insert" ON public.portal_temas FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('cliente.editar'));
CREATE POLICY "portal_temas_update" ON public.portal_temas FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('cliente.editar'));

-- ============ Pesquisa de satisfação ============

CREATE TABLE public.pesquisas_satisfacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  portal_acesso_id uuid REFERENCES public.portal_acessos(id) ON DELETE SET NULL,
  nota_geral integer NOT NULL,
  nota_prazo integer,
  nota_qualidade integer,
  nota_comunicacao integer,
  recomendaria integer,
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pesquisas_nota_geral_ck CHECK (nota_geral BETWEEN 1 AND 5),
  CONSTRAINT pesquisas_nota_prazo_ck CHECK (nota_prazo IS NULL OR nota_prazo BETWEEN 1 AND 5),
  CONSTRAINT pesquisas_nota_qualidade_ck CHECK (nota_qualidade IS NULL OR nota_qualidade BETWEEN 1 AND 5),
  CONSTRAINT pesquisas_nota_comunicacao_ck CHECK (nota_comunicacao IS NULL OR nota_comunicacao BETWEEN 1 AND 5),
  CONSTRAINT pesquisas_recomendaria_ck CHECK (recomendaria IS NULL OR recomendaria BETWEEN 0 AND 10)
);

CREATE UNIQUE INDEX pesquisas_projeto_acesso_uk ON public.pesquisas_satisfacao (projeto_id, portal_acesso_id);
CREATE INDEX pesquisas_tenant_idx ON public.pesquisas_satisfacao (tenant_id, created_at DESC);

GRANT SELECT ON public.pesquisas_satisfacao TO authenticated;
GRANT ALL ON public.pesquisas_satisfacao TO service_role;
ALTER TABLE public.pesquisas_satisfacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pesquisas_select" ON public.pesquisas_satisfacao FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    OR portal_acesso_id IN (SELECT id FROM public.portal_acessos WHERE user_id = auth.uid())
  );

-- ============ Portal: resumo com tema e status da pesquisa ============

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
    'empresa', (SELECT jsonb_build_object('nome', t.nome) FROM public.tenants t WHERE t.id = a.tenant_id),
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

-- ============ Portal: detalhe do projeto com pesquisa ============

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
        'fase', (SELECT f.nome FROM public.projeto_fases f WHERE f.id = d.fase_id)
      ) ORDER BY d.created_at DESC) FROM public.documentos d
       WHERE d.projeto_id = p_projeto_id AND d.deleted_at IS NULL AND d.visivel_cliente), '[]'::jsonb),
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

-- ============ Portal: resposta da pesquisa de satisfação ============

CREATE OR REPLACE FUNCTION public.portal_responder_pesquisa(
  p_projeto_id uuid,
  p_nota_geral integer,
  p_nota_prazo integer DEFAULT NULL,
  p_nota_qualidade integer DEFAULT NULL,
  p_nota_comunicacao integer DEFAULT NULL,
  p_recomendaria integer DEFAULT NULL,
  p_comentario text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.portal_acessos;
  v_nome text;
  v_id uuid;
BEGIN
  a := public.portal_acesso_atual();
  IF a.id IS NULL THEN RAISE EXCEPTION 'sem acesso ao portal'; END IF;
  IF p_nota_geral IS NULL OR p_nota_geral < 1 OR p_nota_geral > 5 THEN RAISE EXCEPTION 'nota invalida'; END IF;

  SELECT pr.nome INTO v_nome FROM public.projetos pr
   WHERE pr.id = p_projeto_id AND pr.cliente_id = a.cliente_id
     AND pr.deleted_at IS NULL AND pr.status = 'concluido';
  IF v_nome IS NULL THEN RAISE EXCEPTION 'pesquisa disponivel apenas para projetos concluidos'; END IF;

  INSERT INTO public.pesquisas_satisfacao (
    tenant_id, projeto_id, cliente_id, portal_acesso_id,
    nota_geral, nota_prazo, nota_qualidade, nota_comunicacao, recomendaria, comentario
  ) VALUES (
    a.tenant_id, p_projeto_id, a.cliente_id, a.id,
    p_nota_geral, p_nota_prazo, p_nota_qualidade, p_nota_comunicacao, p_recomendaria,
    nullif(trim(coalesce(p_comentario, '')), '')
  )
  ON CONFLICT (projeto_id, portal_acesso_id) DO UPDATE
     SET nota_geral = excluded.nota_geral,
         nota_prazo = excluded.nota_prazo,
         nota_qualidade = excluded.nota_qualidade,
         nota_comunicacao = excluded.nota_comunicacao,
         recomendaria = excluded.recomendaria,
         comentario = excluded.comentario,
         created_at = now()
  RETURNING id INTO v_id;

  INSERT INTO public.notificacoes (tenant_id, destinatario_id, tipo, titulo, mensagem, link)
  SELECT a.tenant_id, pr.gerente_id, 'pesquisa', 'Pesquisa de satisfação respondida',
         a.nome || ' avaliou ' || pr.nome || ' com nota ' || p_nota_geral || '/5', '/satisfacao'
    FROM public.projetos pr
   WHERE pr.id = p_projeto_id AND pr.gerente_id IS NOT NULL;

  INSERT INTO public.auditoria (tenant_id, entidade, entidade_id, acao, projeto_id, valor_novo)
  VALUES (a.tenant_id, 'pesquisa', v_id, 'cliente respondeu pesquisa de satisfacao', p_projeto_id, p_nota_geral::text);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_responder_pesquisa(uuid, integer, integer, integer, integer, integer, text) TO authenticated;
