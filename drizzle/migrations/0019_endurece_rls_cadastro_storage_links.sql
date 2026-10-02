-- 0019 — Endurecimento de segurança (RLS)
--   1. bootstrap_perfil: fim do auto-cadastro como Administrador
--   2. Storage (documentos/anexos): isolamento por tenant
--   3. Link compartilhável: bloqueio temporário após senhas erradas

-- =====================================================================
-- 1. bootstrap_perfil
--    Antes: qualquer conta nova virava Administrador do tenant de demonstração.
--    Agora: só vincula a conta a um perfil PRÉ-CADASTRADO (convite) com o mesmo
--    e-mail; sem convite, o cadastro é recusado e nada é criado.
-- =====================================================================
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

  -- Somente perfis convidados (criados por quem tem usuario.gerenciar) e ainda sem login.
  SELECT id INTO v_profile FROM public.profiles
   WHERE user_id IS NULL
     AND deleted_at IS NULL
     AND coalesce(v_email, '') <> ''
     AND lower(email) = lower(v_email)
   ORDER BY created_at
   LIMIT 1;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'cadastro nao autorizado: solicite um convite ao administrador';
  END IF;

  UPDATE public.profiles SET user_id = v_uid WHERE id = v_profile;
  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_perfil(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_perfil(text) TO authenticated;

-- =====================================================================
-- 2. Storage: acesso interno limitado ao tenant dono do projeto.
--    Os caminhos já são "{projeto_id}/{arquivo}" nos dois buckets.
-- =====================================================================
DROP POLICY IF EXISTS "documentos_interno_all" ON storage.objects;
DROP POLICY IF EXISTS anexos_interno_all ON storage.objects;

CREATE OR REPLACE FUNCTION public.projeto_do_tenant_atual(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projetos p
     WHERE p.id::text = split_part(_path, '/', 1)
       AND p.tenant_id = public.current_tenant_id()
  )
$$;

REVOKE ALL ON FUNCTION public.projeto_do_tenant_atual(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.projeto_do_tenant_atual(text) TO authenticated;

-- documentos: leitura para a equipe do tenant; escrita exige projeto.editar
CREATE POLICY documentos_interno_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND public.projeto_do_tenant_atual(name));

CREATE POLICY documentos_interno_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND public.projeto_do_tenant_atual(name)
              AND public.has_permission('projeto.editar'));

CREATE POLICY documentos_interno_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos' AND public.projeto_do_tenant_atual(name)
         AND public.has_permission('projeto.editar'))
  WITH CHECK (bucket_id = 'documentos' AND public.projeto_do_tenant_atual(name));

CREATE POLICY documentos_interno_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND public.projeto_do_tenant_atual(name)
         AND public.has_permission('projeto.editar'));

-- anexos de conversa: qualquer membro da equipe do tenant lê e anexa; só quem edita remove
CREATE POLICY anexos_interno_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'anexos' AND public.projeto_do_tenant_atual(name));

CREATE POLICY anexos_interno_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'anexos' AND public.projeto_do_tenant_atual(name));

CREATE POLICY anexos_interno_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'anexos' AND public.projeto_do_tenant_atual(name)
         AND public.has_permission('projeto.editar'));

-- =====================================================================
-- 3. Link compartilhável: bloqueio após 5 senhas erradas em 15 minutos.
--    A função existente vira "base" (sem acesso externo) e um wrapper com o
--    nome original aplica o bloqueio antes de delegar.
-- =====================================================================
ALTER FUNCTION public.relatorio_link_abrir(text, text, text)
  RENAME TO relatorio_link_abrir_base;

REVOKE ALL ON FUNCTION public.relatorio_link_abrir_base(text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.relatorio_link_abrir(
  p_token text,
  p_senha text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id uuid;
  v_falhas integer;
BEGIN
  SELECT id INTO v_link_id FROM public.relatorio_links WHERE token = p_token;

  IF v_link_id IS NOT NULL THEN
    SELECT count(*) INTO v_falhas
      FROM public.relatorio_link_acessos
     WHERE link_id = v_link_id
       AND resultado = 'senha_invalida'
       AND created_at > now() - interval '15 minutes';

    IF v_falhas >= 5 THEN
      RETURN jsonb_build_object('status', 'bloqueado', 'protegido', true);
    END IF;
  END IF;

  RETURN public.relatorio_link_abrir_base(p_token, p_senha, p_user_agent);
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_link_abrir(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.relatorio_link_abrir(text, text, text) TO anon, authenticated;
