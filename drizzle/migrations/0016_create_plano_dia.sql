CREATE TABLE public.plano_dia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  projeto_id uuid REFERENCES public.projetos(id),
  tarefa_id uuid REFERENCES public.tarefas(id),
  data date NOT NULL,
  titulo text NOT NULL,
  detalhe text,
  horas_previstas numeric(6,2) NOT NULL DEFAULT 0,
  concluido boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  criado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX plano_dia_tenant_data_idx ON public.plano_dia (tenant_id, data);
CREATE INDEX plano_dia_pessoa_data_idx ON public.plano_dia (profile_id, data);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_dia TO authenticated;
GRANT ALL ON public.plano_dia TO service_role;

ALTER TABLE public.plano_dia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plano_dia ver do tenant" ON public.plano_dia
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND NOT public.is_portal_user());

CREATE POLICY "plano_dia criar" ON public.plano_dia
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'));

CREATE POLICY "plano_dia editar" ON public.plano_dia
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (public.has_permission('tarefa.editar') OR profile_id = public.current_profile_id())
  );

CREATE POLICY "plano_dia excluir" ON public.plano_dia
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'));