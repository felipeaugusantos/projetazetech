-- Links seguros e compartilháveis do relatório de projeto (sem custos internos)
CREATE TABLE public.relatorio_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  descricao text,
  expira_em timestamptz NOT NULL,
  senha_hash text,
  max_acessos integer,
  acessos integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES public.profiles(id),
  ultimo_acesso timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revogado_em timestamptz
);

CREATE INDEX relatorio_links_projeto_idx ON public.relatorio_links (projeto_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.relatorio_links TO authenticated;
GRANT ALL ON public.relatorio_links TO service_role;

ALTER TABLE public.relatorio_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY relatorio_links_select ON public.relatorio_links
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY relatorio_links_insert ON public.relatorio_links
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('projeto.editar'));

CREATE POLICY relatorio_links_update ON public.relatorio_links
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('projeto.editar'));

-- Registro de cada abertura do link
CREATE TABLE public.relatorio_link_acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  link_id uuid NOT NULL REFERENCES public.relatorio_links(id) ON DELETE CASCADE,
  resultado text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX relatorio_link_acessos_idx ON public.relatorio_link_acessos (link_id, created_at DESC);

GRANT SELECT ON public.relatorio_link_acessos TO authenticated;
GRANT ALL ON public.relatorio_link_acessos TO service_role;

ALTER TABLE public.relatorio_link_acessos ENABLE ROW LEVEL SECURITY;

CREATE POLICY relatorio_link_acessos_select ON public.relatorio_link_acessos
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- Hash simples de senha do link (não é credencial de usuário)
CREATE OR REPLACE FUNCTION public.relatorio_link_hash(p_senha text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT CASE
    WHEN p_senha IS NULL OR btrim(p_senha) = '' THEN NULL
    ELSE encode(extensions.digest('projeta-relatorio:' || btrim(p_senha), 'sha256'), 'hex')
  END
$$;

GRANT EXECUTE ON FUNCTION public.relatorio_link_hash(text) TO authenticated;

-- Abre o link público: valida validade, revogação, limite de acessos e senha
CREATE OR REPLACE FUNCTION public.relatorio_link_abrir(
  p_token text,
  p_senha text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_link public.relatorio_links;
  v_status text;
  v_dados jsonb;
BEGIN
  SELECT * INTO v_link FROM public.relatorio_links WHERE token = p_token;
  IF NOT FOUND THEN
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
    'empresa', jsonb_build_object('nome', t.nome),
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
