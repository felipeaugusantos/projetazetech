-- ============ Portal do cliente: acessos, documentos e aprovações ============

CREATE TABLE public.portal_acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  contato_id uuid REFERENCES public.cliente_contatos(id) ON DELETE SET NULL,
  user_id uuid,
  nome text NOT NULL,
  email text NOT NULL,
  cargo text,
  ativo boolean NOT NULL DEFAULT true,
  ultimo_acesso timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX portal_acessos_email_uk ON public.portal_acessos (tenant_id, lower(email)) WHERE deleted_at IS NULL;
CREATE INDEX portal_acessos_user_idx ON public.portal_acessos (user_id);
CREATE INDEX portal_acessos_cliente_idx ON public.portal_acessos (cliente_id);

GRANT SELECT, INSERT, UPDATE ON public.portal_acessos TO authenticated;
GRANT ALL ON public.portal_acessos TO service_role;
ALTER TABLE public.portal_acessos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_acessos_select" ON public.portal_acessos FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR user_id = auth.uid());
CREATE POLICY "portal_acessos_insert" ON public.portal_acessos FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('cliente.editar'));
CREATE POLICY "portal_acessos_update" ON public.portal_acessos FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('cliente.editar'));

-- ============ Documentos do projeto ============

CREATE TABLE public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  fase_id uuid REFERENCES public.projeto_fases(id) ON DELETE SET NULL,
  nome text NOT NULL,
  descricao text,
  categoria text NOT NULL DEFAULT 'Documento',
  arquivo_path text,
  url text,
  tipo text,
  tamanho bigint,
  visivel_cliente boolean NOT NULL DEFAULT false,
  autor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX documentos_projeto_idx ON public.documentos (projeto_id) WHERE deleted_at IS NULL;
CREATE INDEX documentos_tenant_idx ON public.documentos (tenant_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documentos_select" ON public.documentos FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "documentos_insert" ON public.documentos FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('projeto.editar'));
CREATE POLICY "documentos_update" ON public.documentos FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('projeto.editar'));

-- ============ Aprovações feitas pelo cliente ============

CREATE TABLE public.portal_aprovacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  marco_id uuid REFERENCES public.marcos(id) ON DELETE CASCADE,
  portal_acesso_id uuid REFERENCES public.portal_acessos(id) ON DELETE SET NULL,
  decisao text NOT NULL,
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portal_aprovacoes_decisao_ck CHECK (decisao IN ('aprovado', 'ajustes'))
);

CREATE INDEX portal_aprovacoes_projeto_idx ON public.portal_aprovacoes (projeto_id, created_at DESC);

GRANT SELECT ON public.portal_aprovacoes TO authenticated;
GRANT ALL ON public.portal_aprovacoes TO service_role;
ALTER TABLE public.portal_aprovacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_aprovacoes_select" ON public.portal_aprovacoes FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    OR portal_acesso_id IN (SELECT id FROM public.portal_acessos WHERE user_id = auth.uid())
  );

-- ============ Comentários do portal ============

ALTER TABLE public.comentarios
  ADD COLUMN portal_acesso_id uuid REFERENCES public.portal_acessos(id) ON DELETE SET NULL;

-- ============ Helpers ============

CREATE OR REPLACE FUNCTION public.portal_acesso_atual()
RETURNS public.portal_acessos
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.portal_acessos
   WHERE user_id = auth.uid() AND ativo AND deleted_at IS NULL
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_portal_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portal_acessos
     WHERE user_id = auth.uid() AND ativo AND deleted_at IS NULL
  );
$$;

-- Vincula o usuário autenticado ao convite de portal com o mesmo e-mail.
CREATE OR REPLACE FUNCTION public.portal_vincular()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  SELECT id INTO v_id FROM public.portal_acessos
   WHERE user_id = v_uid AND ativo AND deleted_at IS NULL LIMIT 1;

  IF v_id IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
    IF v_email IS NULL THEN RETURN false; END IF;
    SELECT id INTO v_id FROM public.portal_acessos
     WHERE user_id IS NULL AND ativo AND deleted_at IS NULL AND lower(email) = lower(v_email)
     LIMIT 1;
    IF v_id IS NULL THEN RETURN false; END IF;
    UPDATE public.portal_acessos SET user_id = v_uid WHERE id = v_id;
  END IF;

  UPDATE public.portal_acessos SET ultimo_acesso = now() WHERE id = v_id;
  RETURN true;
END;
$$;

-- Bloqueia a criação de perfil interno para usuários do portal do cliente.
CREATE OR REPLACE FUNCTION public.bootstrap_perfil(_nome text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_profile uuid;
  v_tenant uuid := '11111111-1111-1111-1111-111111111111';
  v_role uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

  SELECT id INTO v_profile FROM public.profiles WHERE user_id = v_uid;
  IF v_profile IS NOT NULL THEN RETURN v_profile; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  IF EXISTS (
    SELECT 1 FROM public.portal_acessos
     WHERE deleted_at IS NULL
       AND (user_id = v_uid OR lower(email) = lower(coalesce(v_email, '')))
  ) THEN
    RAISE EXCEPTION 'acesso restrito ao portal do cliente';
  END IF;

  SELECT id INTO v_profile FROM public.profiles
   WHERE tenant_id = v_tenant AND user_id IS NULL AND lower(email) = lower(coalesce(v_email,''))
   LIMIT 1;

  IF v_profile IS NOT NULL THEN
    UPDATE public.profiles SET user_id = v_uid WHERE id = v_profile;
  ELSE
    INSERT INTO public.profiles (user_id, tenant_id, nome, email, cargo, custo_hora)
    VALUES (v_uid, v_tenant, coalesce(_nome, split_part(coalesce(v_email,'usuario'),'@',1)), coalesce(v_email,''), 'Administrador', 0)
    RETURNING id INTO v_profile;
  END IF;

  SELECT id INTO v_role FROM public.roles WHERE tenant_id = v_tenant AND slug = 'administrador';
  IF v_role IS NOT NULL THEN
    INSERT INTO public.usuario_roles (tenant_id, profile_id, role_id)
    VALUES (v_tenant, v_profile, v_role) ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_profile;
END;
$$;

-- ============ Leitura do portal (somente dados do cliente, sem custos) ============

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
          'documentos', (SELECT count(*) FROM public.documentos d WHERE d.projeto_id = pr.id AND d.deleted_at IS NULL AND d.visivel_cliente)
        ) AS p
        FROM public.projetos pr
        WHERE pr.cliente_id = a.cliente_id AND pr.deleted_at IS NULL AND pr.status <> 'cancelado'
      ) s
    ), '[]'::jsonb)
  ) INTO v;

  RETURN v;
END;
$$;

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
       WHERE co.projeto_id = p_projeto_id AND co.deleted_at IS NULL AND co.interno = false), '[]'::jsonb)
  ) INTO v;

  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_comentar(p_projeto_id uuid, p_conteudo text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.portal_acessos;
  v_id uuid;
BEGIN
  a := public.portal_acesso_atual();
  IF a.id IS NULL THEN RAISE EXCEPTION 'sem acesso ao portal'; END IF;
  IF coalesce(trim(p_conteudo), '') = '' THEN RAISE EXCEPTION 'comentario vazio'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projetos pr WHERE pr.id = p_projeto_id AND pr.cliente_id = a.cliente_id AND pr.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'projeto nao disponivel para este acesso';
  END IF;

  INSERT INTO public.comentarios (tenant_id, projeto_id, conteudo, interno, portal_acesso_id)
  VALUES (a.tenant_id, p_projeto_id, trim(p_conteudo), false, a.id)
  RETURNING id INTO v_id;

  INSERT INTO public.notificacoes (tenant_id, destinatario_id, tipo, titulo, mensagem, link)
  SELECT a.tenant_id, pr.gerente_id, 'portal', 'Novo comentário do cliente',
         a.nome || ' comentou em ' || pr.nome, '/projetos/' || pr.id
    FROM public.projetos pr
   WHERE pr.id = p_projeto_id AND pr.gerente_id IS NOT NULL;

  INSERT INTO public.auditoria (tenant_id, entidade, entidade_id, acao, projeto_id, valor_novo)
  VALUES (a.tenant_id, 'portal', v_id, 'cliente comentou no portal', p_projeto_id, a.nome);

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_decidir_marco(p_marco_id uuid, p_decisao text, p_comentario text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.portal_acessos;
  v_projeto uuid;
  v_nome text;
  v_id uuid;
BEGIN
  a := public.portal_acesso_atual();
  IF a.id IS NULL THEN RAISE EXCEPTION 'sem acesso ao portal'; END IF;
  IF p_decisao NOT IN ('aprovado', 'ajustes') THEN RAISE EXCEPTION 'decisao invalida'; END IF;

  SELECT m.projeto_id, m.nome INTO v_projeto, v_nome
    FROM public.marcos m
    JOIN public.projetos pr ON pr.id = m.projeto_id
   WHERE m.id = p_marco_id AND m.deleted_at IS NULL AND m.entrega_cliente
     AND pr.cliente_id = a.cliente_id AND pr.deleted_at IS NULL;

  IF v_projeto IS NULL THEN RAISE EXCEPTION 'entrega nao disponivel para este acesso'; END IF;

  INSERT INTO public.portal_aprovacoes (tenant_id, projeto_id, marco_id, portal_acesso_id, decisao, comentario)
  VALUES (a.tenant_id, v_projeto, p_marco_id, a.id, p_decisao, nullif(trim(coalesce(p_comentario, '')), ''))
  RETURNING id INTO v_id;

  IF p_decisao = 'aprovado' THEN
    UPDATE public.marcos
       SET status = 'atingido', data_real = coalesce(data_real, current_date)
     WHERE id = p_marco_id;
  END IF;

  INSERT INTO public.notificacoes (tenant_id, destinatario_id, tipo, titulo, mensagem, link)
  SELECT a.tenant_id, pr.gerente_id, 'portal',
         CASE WHEN p_decisao = 'aprovado' THEN 'Entrega aprovada pelo cliente' ELSE 'Cliente pediu ajustes' END,
         a.nome || ' · ' || v_nome, '/projetos/' || pr.id
    FROM public.projetos pr
   WHERE pr.id = v_projeto AND pr.gerente_id IS NOT NULL;

  INSERT INTO public.auditoria (tenant_id, entidade, entidade_id, acao, projeto_id, valor_novo)
  VALUES (a.tenant_id, 'marco', p_marco_id,
          CASE WHEN p_decisao = 'aprovado' THEN 'cliente aprovou entrega' ELSE 'cliente solicitou ajustes' END,
          v_projeto, a.nome);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_acesso_atual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_portal_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_vincular() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_resumo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_projeto(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_comentar(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_decidir_marco(uuid, text, text) TO authenticated;
