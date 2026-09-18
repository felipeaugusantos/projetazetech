-- Fase 3: orçamento detalhado por projeto e lançamento de custos/despesas

CREATE TYPE public.orcamento_tipo AS ENUM ('receita', 'custo');
CREATE TYPE public.despesa_status AS ENUM ('rascunho', 'enviada', 'aprovada', 'rejeitada');

CREATE TABLE public.orcamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  fase_id uuid REFERENCES public.projeto_fases(id) ON DELETE SET NULL,
  tipo public.orcamento_tipo NOT NULL DEFAULT 'custo',
  categoria text NOT NULL DEFAULT 'Serviços',
  descricao text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamento_itens TO authenticated;
GRANT ALL ON public.orcamento_itens TO service_role;
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY orcamento_itens_select ON public.orcamento_itens FOR SELECT
  USING (tenant_id = current_tenant_id() AND has_permission('financeiro.ver'));
CREATE POLICY orcamento_itens_insert ON public.orcamento_itens FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND has_permission('orcamento.editar'));
CREATE POLICY orcamento_itens_update ON public.orcamento_itens FOR UPDATE
  USING (tenant_id = current_tenant_id() AND has_permission('orcamento.editar'));

CREATE INDEX orcamento_itens_projeto_idx ON public.orcamento_itens (projeto_id);
CREATE INDEX orcamento_itens_tenant_idx ON public.orcamento_itens (tenant_id);

CREATE TABLE public.despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  fase_id uuid REFERENCES public.projeto_fases(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  categoria text NOT NULL DEFAULT 'Outros',
  descricao text NOT NULL,
  fornecedor text,
  data date NOT NULL DEFAULT current_date,
  valor numeric NOT NULL DEFAULT 0,
  faturavel boolean NOT NULL DEFAULT false,
  reembolsavel boolean NOT NULL DEFAULT false,
  status public.despesa_status NOT NULL DEFAULT 'rascunho',
  aprovador_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  aprovado_em timestamptz,
  observacao_aprovacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas TO authenticated;
GRANT ALL ON public.despesas TO service_role;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY despesas_select ON public.despesas FOR SELECT
  USING (tenant_id = current_tenant_id() AND (profile_id = current_profile_id() OR has_permission('financeiro.ver')));
CREATE POLICY despesas_insert ON public.despesas FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND (has_permission('despesa.lancar') OR has_permission('despesa.aprovar')));
CREATE POLICY despesas_update ON public.despesas FOR UPDATE
  USING (tenant_id = current_tenant_id() AND ((profile_id = current_profile_id() AND status IN ('rascunho','rejeitada')) OR has_permission('despesa.aprovar')));

CREATE INDEX despesas_projeto_idx ON public.despesas (projeto_id);
CREATE INDEX despesas_tenant_data_idx ON public.despesas (tenant_id, data);
