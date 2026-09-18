-- Comentários vinculados a uma entrega (marco) e anexos de comentários.
ALTER TABLE public.comentarios ADD COLUMN IF NOT EXISTS marco_id uuid REFERENCES public.marcos(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS comentarios_marco_idx ON public.comentarios (marco_id, created_at);

CREATE TABLE IF NOT EXISTS public.comentario_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  comentario_id uuid NOT NULL REFERENCES public.comentarios(id) ON DELETE CASCADE,
  nome text NOT NULL,
  arquivo_path text NOT NULL,
  tipo text,
  tamanho bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.comentario_anexos TO authenticated;
GRANT ALL ON public.comentario_anexos TO service_role;

ALTER TABLE public.comentario_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY comentario_anexos_select ON public.comentario_anexos
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    OR EXISTS (
      SELECT 1
      FROM public.comentarios c
      JOIN public.marcos m ON m.id = c.marco_id
      JOIN public.projetos p ON p.id = m.projeto_id
      JOIN public.portal_acessos pa ON pa.cliente_id = p.cliente_id
      WHERE c.id = comentario_anexos.comentario_id
        AND pa.user_id = auth.uid()
        AND pa.ativo
        AND pa.deleted_at IS NULL
        AND c.interno = false
    )
  );

CREATE POLICY comentario_anexos_insert ON public.comentario_anexos
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.current_profile_id() IS NOT NULL);

-- Lista a conversa de uma entrega para o cliente do portal.
CREATE OR REPLACE FUNCTION public.portal_marco_comentarios(p_marco_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acesso public.portal_acessos;
  v_resultado jsonb;
BEGIN
  v_acesso := public.portal_acesso_atual();
  IF v_acesso.id IS NULL THEN RETURN '[]'::jsonb; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.marcos m
    JOIN public.projetos p ON p.id = m.projeto_id
    WHERE m.id = p_marco_id AND p.cliente_id = v_acesso.cliente_id AND p.deleted_at IS NULL
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(item ORDER BY item->>'created_at'), '[]'::jsonb) INTO v_resultado
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'conteudo', c.conteudo,
      'created_at', c.created_at,
      'autor', coalesce(pr.nome, pac.nome),
      'do_cliente', c.portal_acesso_id IS NOT NULL,
      'anexos', coalesce((
        SELECT jsonb_agg(jsonb_build_object('id', a.id, 'nome', a.nome, 'tipo', a.tipo, 'tamanho', a.tamanho) ORDER BY a.created_at)
        FROM public.comentario_anexos a WHERE a.comentario_id = c.id
      ), '[]'::jsonb)
    ) AS item
    FROM public.comentarios c
    LEFT JOIN public.profiles pr ON pr.id = c.autor_id
    LEFT JOIN public.portal_acessos pac ON pac.id = c.portal_acesso_id
    WHERE c.marco_id = p_marco_id AND c.interno = false AND c.deleted_at IS NULL
  ) s;

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_marco_comentarios(uuid) TO authenticated;

-- Cliente comenta em uma entrega, com anexos opcionais.
CREATE OR REPLACE FUNCTION public.portal_marco_comentar(p_marco_id uuid, p_conteudo text, p_anexos jsonb DEFAULT '[]'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acesso public.portal_acessos;
  v_projeto public.projetos;
  v_marco public.marcos;
  v_comentario uuid;
  v_anexo jsonb;
BEGIN
  v_acesso := public.portal_acesso_atual();
  IF v_acesso.id IS NULL THEN RAISE EXCEPTION 'Acesso ao portal não autorizado'; END IF;
  IF coalesce(btrim(p_conteudo), '') = '' THEN RAISE EXCEPTION 'Escreva uma mensagem'; END IF;

  SELECT * INTO v_marco FROM public.marcos WHERE id = p_marco_id AND deleted_at IS NULL;
  IF v_marco.id IS NULL THEN RAISE EXCEPTION 'Entrega não encontrada'; END IF;

  SELECT * INTO v_projeto FROM public.projetos
  WHERE id = v_marco.projeto_id AND cliente_id = v_acesso.cliente_id AND deleted_at IS NULL;
  IF v_projeto.id IS NULL THEN RAISE EXCEPTION 'Entrega não disponível'; END IF;

  INSERT INTO public.comentarios (tenant_id, projeto_id, marco_id, portal_acesso_id, conteudo, interno)
  VALUES (v_projeto.tenant_id, v_projeto.id, v_marco.id, v_acesso.id, btrim(p_conteudo), false)
  RETURNING id INTO v_comentario;

  FOR v_anexo IN SELECT * FROM jsonb_array_elements(coalesce(p_anexos, '[]'::jsonb)) LOOP
    INSERT INTO public.comentario_anexos (tenant_id, comentario_id, nome, arquivo_path, tipo, tamanho)
    VALUES (
      v_projeto.tenant_id,
      v_comentario,
      coalesce(v_anexo->>'nome', 'anexo'),
      v_anexo->>'arquivo_path',
      v_anexo->>'tipo',
      nullif(v_anexo->>'tamanho', '')::bigint
    );
  END LOOP;

  IF v_projeto.gerente_id IS NOT NULL THEN
    INSERT INTO public.notificacoes (tenant_id, destinatario_id, tipo, titulo, mensagem, link)
    VALUES (
      v_projeto.tenant_id,
      v_projeto.gerente_id,
      'comentario',
      'Nova mensagem do cliente na entrega',
      v_acesso.nome || ' comentou em "' || v_marco.nome || '".',
      '/projetos/' || v_projeto.id
    );
  END IF;

  INSERT INTO public.auditoria (tenant_id, entidade, entidade_id, acao, projeto_id, valor_novo)
  VALUES (v_projeto.tenant_id, 'marco', v_marco.id, 'comentou', v_projeto.id, btrim(p_conteudo));

  RETURN v_comentario;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_marco_comentar(uuid, text, jsonb) TO authenticated;

-- Caminho do anexo liberado ao cliente do portal.
CREATE OR REPLACE FUNCTION public.portal_anexo_arquivo(p_anexo_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acesso public.portal_acessos;
  v_res jsonb;
BEGIN
  v_acesso := public.portal_acesso_atual();
  IF v_acesso.id IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object('nome', a.nome, 'arquivo_path', a.arquivo_path) INTO v_res
  FROM public.comentario_anexos a
  JOIN public.comentarios c ON c.id = a.comentario_id
  JOIN public.marcos m ON m.id = c.marco_id
  JOIN public.projetos p ON p.id = m.projeto_id
  WHERE a.id = p_anexo_id AND c.interno = false AND p.cliente_id = v_acesso.cliente_id AND p.deleted_at IS NULL;

  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_anexo_arquivo(uuid) TO authenticated;