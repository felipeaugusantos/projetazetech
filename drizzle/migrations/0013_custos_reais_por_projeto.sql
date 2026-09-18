CREATE TABLE public.custos_reais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  fase_id uuid REFERENCES public.projeto_fases(id) ON DELETE SET NULL,
  categoria text NOT NULL,
  descricao text NOT NULL,
  fornecedor text,
  documento text,
  data date NOT NULL DEFAULT current_date,
  valor numeric NOT NULL DEFAULT 0,
  observacao text,
  criado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX custos_reais_projeto_idx ON public.custos_reais (projeto_id, data DESC);
CREATE INDEX custos_reais_tenant_idx ON public.custos_reais (tenant_id, data DESC);

GRANT SELECT, INSERT, UPDATE ON public.custos_reais TO authenticated;
GRANT ALL ON public.custos_reais TO service_role;

ALTER TABLE public.custos_reais ENABLE ROW LEVEL SECURITY;

CREATE POLICY custos_reais_select ON public.custos_reais
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('financeiro.ver'));

CREATE POLICY custos_reais_insert ON public.custos_reais
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (public.has_permission('despesa.lancar') OR public.has_permission('orcamento.editar'))
  );

CREATE POLICY custos_reais_update ON public.custos_reais
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (public.has_permission('despesa.lancar') OR public.has_permission('orcamento.editar'))
  )
  WITH CHECK (tenant_id = public.current_tenant_id());