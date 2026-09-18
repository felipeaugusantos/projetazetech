CREATE TABLE public.portal_acesso_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  portal_acesso_id uuid NOT NULL REFERENCES public.portal_acessos(id),
  evento text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX portal_acesso_logs_acesso_idx ON public.portal_acesso_logs (portal_acesso_id, created_at DESC);
CREATE INDEX portal_acesso_logs_tenant_idx ON public.portal_acesso_logs (tenant_id, created_at DESC);

GRANT SELECT ON public.portal_acesso_logs TO authenticated;
GRANT ALL ON public.portal_acesso_logs TO service_role;

ALTER TABLE public.portal_acesso_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_logs_select" ON public.portal_acesso_logs
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    OR portal_acesso_id IN (SELECT id FROM public.portal_acessos WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.portal_registrar_evento(p_evento text, p_user_agent text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acesso public.portal_acessos;
  v_id uuid;
BEGIN
  v_acesso := public.portal_acesso_atual();
  IF v_acesso.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_evento NOT IN ('login', 'logout', 'sessao_expirada', 'senha_alterada') THEN
    RAISE EXCEPTION 'Evento inválido';
  END IF;

  INSERT INTO public.portal_acesso_logs (tenant_id, portal_acesso_id, evento, user_agent)
  VALUES (v_acesso.tenant_id, v_acesso.id, p_evento, left(coalesce(p_user_agent, ''), 300))
  RETURNING id INTO v_id;

  IF p_evento = 'login' THEN
    UPDATE public.portal_acessos SET ultimo_acesso = now() WHERE id = v_acesso.id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_registrar_evento(text, text) TO authenticated;