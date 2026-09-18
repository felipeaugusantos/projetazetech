-- ========== Permissões ==========
INSERT INTO public.permissoes (codigo, descricao, grupo) VALUES
  ('documento.aprovar','Aprovar documentos antes do portal do cliente','Documentos')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.role_permissoes (role_id, permissao)
SELECT r.id, 'documento.aprovar' FROM public.roles r
WHERE r.slug IN ('administrador','diretor','gerente')
ON CONFLICT DO NOTHING;

-- ========== Cadastro de equipe ==========
CREATE POLICY "perfis criar" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('usuario.gerenciar'));

GRANT INSERT, DELETE ON public.usuario_roles TO authenticated;

CREATE POLICY "usuario roles criar" ON public.usuario_roles FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id()
    AND (public.has_permission('usuario.gerenciar') OR public.has_permission('permissao.gerenciar')));

CREATE POLICY "usuario roles remover" ON public.usuario_roles FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id()
    AND (public.has_permission('usuario.gerenciar') OR public.has_permission('permissao.gerenciar')));

-- ========== Aprovação de documentos ==========
ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS aprovacao_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS solicita_portal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aprovador_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS observacao_aprovacao text;

UPDATE public.documentos
   SET aprovacao_status = 'aprovado',
       solicita_portal = visivel_cliente,
       aprovado_em = coalesce(aprovado_em, created_at)
 WHERE aprovacao_status = 'pendente';

ALTER TABLE public.documentos
  ADD CONSTRAINT documentos_aprovacao_status_check
  CHECK (aprovacao_status IN ('pendente','aprovado','rejeitado'));

CREATE OR REPLACE FUNCTION public.documentos_aplica_aprovacao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.visivel_cliente := (NEW.aprovacao_status = 'aprovado' AND NEW.solicita_portal);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_documentos_aprovacao ON public.documentos;
CREATE TRIGGER trg_documentos_aprovacao
  BEFORE INSERT OR UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.documentos_aplica_aprovacao();

CREATE INDEX IF NOT EXISTS documentos_aprovacao_status_idx
  ON public.documentos (tenant_id, aprovacao_status);
