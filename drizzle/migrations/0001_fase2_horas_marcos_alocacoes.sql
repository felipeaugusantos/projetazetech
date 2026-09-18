-- Fase 2: apontamento de horas, marcos de cronograma e alocação de capacidade

DO $$ BEGIN
  CREATE TYPE public.apontamento_status AS ENUM ('rascunho','enviado','aprovado','rejeitado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marco_status AS ENUM ('previsto','atingido','atrasado','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ apontamentos (timesheet) ============
CREATE TABLE public.apontamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id),
  tarefa_id uuid REFERENCES public.tarefas(id),
  data date NOT NULL DEFAULT current_date,
  horas numeric NOT NULL DEFAULT 0,
  descricao text,
  faturavel boolean NOT NULL DEFAULT true,
  status public.apontamento_status NOT NULL DEFAULT 'rascunho',
  aprovador_id uuid REFERENCES public.profiles(id),
  aprovado_em timestamptz,
  observacao_aprovacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX apontamentos_tenant_data_idx ON public.apontamentos (tenant_id, data DESC);
CREATE INDEX apontamentos_profile_idx ON public.apontamentos (profile_id, data DESC);
CREATE INDEX apontamentos_projeto_idx ON public.apontamentos (projeto_id);
CREATE INDEX apontamentos_status_idx ON public.apontamentos (tenant_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apontamentos TO authenticated;
GRANT ALL ON public.apontamentos TO service_role;
ALTER TABLE public.apontamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apontamentos_select" ON public.apontamentos FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "apontamentos_insert" ON public.apontamentos FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (profile_id = public.current_profile_id() OR public.has_permission('hora.aprovar'))
  );
CREATE POLICY "apontamentos_update" ON public.apontamentos FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (profile_id = public.current_profile_id() OR public.has_permission('hora.aprovar'))
  );

-- ============ marcos (milestones) ============
CREATE TABLE public.marcos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id),
  fase_id uuid REFERENCES public.projeto_fases(id),
  nome text NOT NULL,
  descricao text,
  data date,
  data_real date,
  status public.marco_status NOT NULL DEFAULT 'previsto',
  entrega_cliente boolean NOT NULL DEFAULT false,
  responsavel_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX marcos_projeto_idx ON public.marcos (projeto_id, data);
CREATE INDEX marcos_tenant_idx ON public.marcos (tenant_id, data);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marcos TO authenticated;
GRANT ALL ON public.marcos TO service_role;
ALTER TABLE public.marcos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marcos_select" ON public.marcos FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "marcos_insert" ON public.marcos FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('projeto.editar'));
CREATE POLICY "marcos_update" ON public.marcos FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('projeto.editar'));

-- ============ alocacoes (capacidade semanal) ============
CREATE TABLE public.alocacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id),
  semana date NOT NULL,
  horas_planejadas numeric NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, projeto_id, semana)
);
CREATE INDEX alocacoes_tenant_semana_idx ON public.alocacoes (tenant_id, semana);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alocacoes TO authenticated;
GRANT ALL ON public.alocacoes TO service_role;
ALTER TABLE public.alocacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alocacoes_select" ON public.alocacoes FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "alocacoes_write" ON public.alocacoes FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('alocacao.gerenciar'));
CREATE POLICY "alocacoes_update" ON public.alocacoes FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('alocacao.gerenciar'));
CREATE POLICY "alocacoes_delete" ON public.alocacoes FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('alocacao.gerenciar'));
