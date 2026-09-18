-- =========================================================
-- ENZOVA PROJECTS · FASE 1 · NÚCLEO MULTI-TENANT
-- =========================================================

-- ---------- ENUMS ----------
CREATE TYPE public.projeto_status AS ENUM ('planejamento','aguardando_inicio','em_andamento','pausado','em_validacao','em_risco','concluido','cancelado');
CREATE TYPE public.tarefa_status AS ENUM ('backlog','a_fazer','em_andamento','bloqueada','em_validacao','concluida','cancelada');
CREATE TYPE public.prioridade AS ENUM ('baixa','normal','alta','urgente');
CREATE TYPE public.fase_status AS ENUM ('nao_iniciada','em_andamento','concluida','bloqueada');
CREATE TYPE public.cliente_tipo AS ENUM ('pf','pj');
CREATE TYPE public.saude AS ENUM ('saudavel','atencao','em_risco','critico');
CREATE TYPE public.risco_nivel AS ENUM ('baixo','medio','alto','critico');

-- ---------- TENANTS ----------
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE NOT NULL,
  plano text NOT NULL DEFAULT 'pro',
  assentos int NOT NULL DEFAULT 5,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ---------- PROFILES (usuários) ----------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  cargo text,
  avatar_url text,
  custo_hora numeric(12,2) DEFAULT 0,
  capacidade_semanal numeric(5,2) DEFAULT 40,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---------- FUNÇÕES DE CONTEXTO ----------
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ---------- RBAC ----------
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug text NOT NULL,
  nome text NOT NULL,
  descricao text,
  sistema boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.permissoes (
  codigo text PRIMARY KEY,
  descricao text NOT NULL,
  grupo text NOT NULL
);
GRANT SELECT ON public.permissoes TO authenticated;
GRANT ALL ON public.permissoes TO service_role;
ALTER TABLE public.permissoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissoes (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permissao text NOT NULL REFERENCES public.permissoes(codigo) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permissao)
);
GRANT SELECT ON public.role_permissoes TO authenticated;
GRANT ALL ON public.role_permissoes TO service_role;
ALTER TABLE public.role_permissoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.usuario_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, role_id)
);
CREATE INDEX idx_usuario_roles_tenant ON public.usuario_roles(tenant_id);
GRANT SELECT ON public.usuario_roles TO authenticated;
GRANT ALL ON public.usuario_roles TO service_role;
ALTER TABLE public.usuario_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_permission(_permissao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.usuario_roles ur ON ur.profile_id = p.id
    JOIN public.role_permissoes rp ON rp.role_id = ur.role_id
    WHERE p.user_id = auth.uid() AND rp.permissao = _permissao
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_slug text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.usuario_roles ur ON ur.profile_id = p.id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.user_id = auth.uid() AND r.slug = _slug
  );
$$;

-- ---------- CLIENTES ----------
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo public.cliente_tipo NOT NULL DEFAULT 'pj',
  nome text NOT NULL,
  razao_social text,
  nome_fantasia text,
  cpf text,
  cnpj text,
  telefone text,
  whatsapp text,
  email text,
  endereco text,
  cidade text,
  uf text,
  responsavel text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_clientes_tenant ON public.clientes(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cliente_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cargo text,
  departamento text,
  telefone text,
  whatsapp text,
  email text,
  principal boolean NOT NULL DEFAULT false,
  financeiro boolean NOT NULL DEFAULT false,
  tecnico boolean NOT NULL DEFAULT false,
  responsavel_projeto boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_contatos_cliente ON public.cliente_contatos(cliente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_contatos TO authenticated;
GRANT ALL ON public.cliente_contatos TO service_role;
ALTER TABLE public.cliente_contatos ENABLE ROW LEVEL SECURITY;

-- ---------- PROJETOS ----------
CREATE TABLE public.projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  gerente_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  prioridade public.prioridade NOT NULL DEFAULT 'normal',
  status public.projeto_status NOT NULL DEFAULT 'planejamento',
  data_inicio date,
  prazo date,
  data_prevista_conclusao date,
  data_real_conclusao date,
  orcamento numeric(14,2) DEFAULT 0,
  custo_previsto numeric(14,2) DEFAULT 0,
  receita_prevista numeric(14,2) DEFAULT 0,
  horas_previstas numeric(10,2) DEFAULT 0,
  progresso int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, codigo)
);
CREATE INDEX idx_projetos_tenant ON public.projetos(tenant_id);
CREATE INDEX idx_projetos_cliente ON public.projetos(cliente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projetos TO authenticated;
GRANT ALL ON public.projetos TO service_role;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.projeto_fases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ordem int NOT NULL DEFAULT 1,
  responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_inicio date,
  prazo date,
  status public.fase_status NOT NULL DEFAULT 'nao_iniciada',
  progresso int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_fases_projeto ON public.projeto_fases(projeto_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projeto_fases TO authenticated;
GRANT ALL ON public.projeto_fases TO service_role;
ALTER TABLE public.projeto_fases ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.projeto_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  papel text,
  percentual_alocacao int DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (projeto_id, profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projeto_membros TO authenticated;
GRANT ALL ON public.projeto_membros TO service_role;
ALTER TABLE public.projeto_membros ENABLE ROW LEVEL SECURITY;

-- ---------- TAREFAS ----------
CREATE TABLE public.tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  fase_id uuid REFERENCES public.projeto_fases(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  prioridade public.prioridade NOT NULL DEFAULT 'normal',
  status public.tarefa_status NOT NULL DEFAULT 'backlog',
  data_inicio date,
  prazo date,
  horas_estimadas numeric(8,2) DEFAULT 0,
  horas_realizadas numeric(8,2) DEFAULT 0,
  ordem int NOT NULL DEFAULT 1,
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_tarefas_tenant ON public.tarefas(tenant_id);
CREATE INDEX idx_tarefas_projeto ON public.tarefas(projeto_id);
CREATE INDEX idx_tarefas_responsavel ON public.tarefas(responsavel_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO authenticated;
GRANT ALL ON public.tarefas TO service_role;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subtarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  prazo date,
  horas_estimadas numeric(8,2) DEFAULT 0,
  status public.tarefa_status NOT NULL DEFAULT 'a_fazer',
  ordem int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_subtarefas_tarefa ON public.subtarefas(tarefa_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtarefas TO authenticated;
GRANT ALL ON public.subtarefas TO service_role;
ALTER TABLE public.subtarefas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  titulo text NOT NULL DEFAULT 'Checklist',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklists_tarefa ON public.checklists(tarefa_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklists TO authenticated;
GRANT ALL ON public.checklists TO service_role;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.checklist_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  concluido boolean NOT NULL DEFAULT false,
  ordem int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_itens_checklist ON public.checklist_itens(checklist_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_itens TO authenticated;
GRANT ALL ON public.checklist_itens TO service_role;
ALTER TABLE public.checklist_itens ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.tarefa_dependencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  tarefa_relacionada_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'depende_de',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tarefa_id, tarefa_relacionada_id, tipo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefa_dependencias TO authenticated;
GRANT ALL ON public.tarefa_dependencias TO service_role;
ALTER TABLE public.tarefa_dependencias ENABLE ROW LEVEL SECURITY;

-- ---------- TAGS ----------
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT 'slate',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.tarefa_tags (
  tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (tarefa_id, tag_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefa_tags TO authenticated;
GRANT ALL ON public.tarefa_tags TO service_role;
ALTER TABLE public.tarefa_tags ENABLE ROW LEVEL SECURITY;

-- ---------- COMENTÁRIOS ----------
CREATE TABLE public.comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE CASCADE,
  tarefa_id uuid REFERENCES public.tarefas(id) ON DELETE CASCADE,
  conteudo text NOT NULL,
  interno boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_comentarios_tarefa ON public.comentarios(tarefa_id);
CREATE INDEX idx_comentarios_projeto ON public.comentarios(projeto_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comentarios TO authenticated;
GRANT ALL ON public.comentarios TO service_role;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;

-- ---------- RISCOS ----------
CREATE TABLE public.riscos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  probabilidade public.risco_nivel NOT NULL DEFAULT 'medio',
  impacto public.risco_nivel NOT NULL DEFAULT 'medio',
  responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  plano_mitigacao text,
  status text NOT NULL DEFAULT 'aberto',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_riscos_projeto ON public.riscos(projeto_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.riscos TO authenticated;
GRANT ALL ON public.riscos TO service_role;
ALTER TABLE public.riscos ENABLE ROW LEVEL SECURITY;

-- ---------- NOTIFICAÇÕES ----------
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  destinatario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'geral',
  titulo text NOT NULL,
  mensagem text,
  link text,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notificacoes_dest ON public.notificacoes(destinatario_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- ---------- FAVORITOS ----------
CREATE TABLE public.favoritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entidade text NOT NULL,
  entidade_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, entidade, entidade_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favoritos TO authenticated;
GRANT ALL ON public.favoritos TO service_role;
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;

-- ---------- AUDITORIA / HISTÓRICO ----------
CREATE TABLE public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  entidade text NOT NULL,
  entidade_id uuid,
  acao text NOT NULL,
  campo text,
  valor_anterior text,
  valor_novo text,
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_auditoria_projeto ON public.auditoria(projeto_id);
GRANT SELECT, INSERT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- POLÍTICAS RLS (isolamento por tenant)
-- =========================================================
CREATE POLICY "tenant proprio" ON public.tenants FOR SELECT TO authenticated
  USING (id = public.current_tenant_id());

CREATE POLICY "perfis do tenant" ON public.profiles FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "atualizar proprio perfil" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (tenant_id = public.current_tenant_id() AND public.has_permission('usuario.gerenciar')))
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "roles visiveis" ON public.roles FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = public.current_tenant_id());
CREATE POLICY "permissoes visiveis" ON public.permissoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "role permissoes visiveis" ON public.role_permissoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuario roles do tenant" ON public.usuario_roles FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- clientes
CREATE POLICY "clientes ver" ON public.clientes FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND deleted_at IS NULL);
CREATE POLICY "clientes criar" ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('cliente.editar'));
CREATE POLICY "clientes editar" ON public.clientes FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('cliente.editar'))
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "contatos ver" ON public.cliente_contatos FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND deleted_at IS NULL);
CREATE POLICY "contatos escrever" ON public.cliente_contatos FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('cliente.editar'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('cliente.editar'));

-- projetos
CREATE POLICY "projetos ver" ON public.projetos FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND deleted_at IS NULL AND public.has_permission('projeto.ver'));
CREATE POLICY "projetos criar" ON public.projetos FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('projeto.criar'));
CREATE POLICY "projetos editar" ON public.projetos FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('projeto.editar'))
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "fases ver" ON public.projeto_fases FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND deleted_at IS NULL);
CREATE POLICY "fases escrever" ON public.projeto_fases FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('projeto.editar'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('projeto.editar'));

CREATE POLICY "membros ver" ON public.projeto_membros FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "membros escrever" ON public.projeto_membros FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('projeto.editar'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('projeto.editar'));

-- tarefas
CREATE POLICY "tarefas ver" ON public.tarefas FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND deleted_at IS NULL);
CREATE POLICY "tarefas criar" ON public.tarefas FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.criar'));
CREATE POLICY "tarefas editar" ON public.tarefas FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'))
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "subtarefas ver" ON public.subtarefas FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND deleted_at IS NULL);
CREATE POLICY "subtarefas escrever" ON public.subtarefas FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'));

CREATE POLICY "checklists ver" ON public.checklists FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "checklists escrever" ON public.checklists FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'));

CREATE POLICY "checklist itens ver" ON public.checklist_itens FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "checklist itens escrever" ON public.checklist_itens FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'));

CREATE POLICY "dependencias ver" ON public.tarefa_dependencias FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "dependencias escrever" ON public.tarefa_dependencias FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'));

CREATE POLICY "tags ver" ON public.tags FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "tags escrever" ON public.tags FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'));

CREATE POLICY "tarefa tags ver" ON public.tarefa_tags FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "tarefa tags escrever" ON public.tarefa_tags FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('tarefa.editar'));

CREATE POLICY "comentarios ver" ON public.comentarios FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND deleted_at IS NULL);
CREATE POLICY "comentarios criar" ON public.comentarios FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND autor_id = public.current_profile_id());
CREATE POLICY "comentarios editar proprio" ON public.comentarios FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND autor_id = public.current_profile_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "riscos ver" ON public.riscos FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND deleted_at IS NULL);
CREATE POLICY "riscos escrever" ON public.riscos FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('projeto.editar'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permission('projeto.editar'));

CREATE POLICY "notificacoes proprias" ON public.notificacoes FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND destinatario_id = public.current_profile_id());
CREATE POLICY "notificacoes marcar" ON public.notificacoes FOR UPDATE TO authenticated
  USING (destinatario_id = public.current_profile_id())
  WITH CHECK (destinatario_id = public.current_profile_id());
CREATE POLICY "notificacoes criar" ON public.notificacoes FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "favoritos proprios" ON public.favoritos FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (tenant_id = public.current_tenant_id() AND profile_id = public.current_profile_id());

CREATE POLICY "auditoria ver" ON public.auditoria FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "auditoria criar" ON public.auditoria FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

-- =========================================================
-- BOOTSTRAP: liga a conta autenticada a um perfil do tenant demo
-- =========================================================
CREATE OR REPLACE FUNCTION public.bootstrap_perfil(_nome text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
GRANT EXECUTE ON FUNCTION public.bootstrap_perfil(text) TO authenticated;

-- =========================================================
-- DADOS DE DEMONSTRAÇÃO
-- =========================================================
INSERT INTO public.tenants (id, nome, slug, plano, assentos) VALUES
  ('11111111-1111-1111-1111-111111111111','Enzova Tecnologia','enzova-tecnologia','pro',5);

INSERT INTO public.permissoes (codigo, descricao, grupo) VALUES
  ('projeto.ver','Visualizar projetos','Projetos'),
  ('projeto.criar','Criar projetos','Projetos'),
  ('projeto.editar','Editar projetos','Projetos'),
  ('projeto.excluir','Excluir projetos','Projetos'),
  ('projeto.aprovar','Aprovar projetos','Projetos'),
  ('tarefa.criar','Criar tarefas','Tarefas'),
  ('tarefa.editar','Editar tarefas','Tarefas'),
  ('tarefa.prazo','Alterar prazo de tarefas','Tarefas'),
  ('tarefa.responsavel','Alterar responsável','Tarefas'),
  ('orcamento.editar','Alterar orçamento','Financeiro'),
  ('financeiro.ver','Visualizar financeiro e custos','Financeiro'),
  ('horas.aprovar','Aprovar apontamentos de horas','Horas'),
  ('relatorio.ver','Acessar relatórios','Relatórios'),
  ('cliente.ver','Visualizar clientes','Clientes'),
  ('cliente.editar','Cadastrar e editar clientes','Clientes'),
  ('usuario.gerenciar','Gerenciar usuários','Administração'),
  ('permissao.gerenciar','Gerenciar perfis e permissões','Administração');

INSERT INTO public.roles (id, tenant_id, slug, nome, descricao) VALUES
  ('a0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','administrador','Administrador','Acesso total ao workspace'),
  ('a0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','diretor','Diretor','Visão executiva e financeira'),
  ('a0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','gerente','Gerente de Projetos','Gestão completa de projetos'),
  ('a0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','coordenador','Coordenador','Coordenação de equipes e prazos'),
  ('a0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','lider_tecnico','Líder Técnico','Condução técnica das entregas'),
  ('a0000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','colaborador','Colaborador','Execução de tarefas'),
  ('a0000000-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','financeiro','Financeiro','Custos, orçamento e faturamento'),
  ('a0000000-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','comercial','Comercial','Clientes e propostas'),
  ('a0000000-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','cliente','Cliente','Portal do cliente');

-- Administrador: todas as permissões
INSERT INTO public.role_permissoes (role_id, permissao)
SELECT 'a0000000-0000-0000-0000-000000000001', codigo FROM public.permissoes;
-- Diretor
INSERT INTO public.role_permissoes (role_id, permissao)
SELECT 'a0000000-0000-0000-0000-000000000002', codigo FROM public.permissoes
WHERE codigo IN ('projeto.ver','projeto.criar','projeto.editar','projeto.aprovar','financeiro.ver','relatorio.ver','cliente.ver','horas.aprovar','orcamento.editar','tarefa.criar','tarefa.editar');
-- Gerente
INSERT INTO public.role_permissoes (role_id, permissao)
SELECT 'a0000000-0000-0000-0000-000000000003', codigo FROM public.permissoes
WHERE codigo IN ('projeto.ver','projeto.criar','projeto.editar','tarefa.criar','tarefa.editar','tarefa.prazo','tarefa.responsavel','relatorio.ver','cliente.ver','cliente.editar','horas.aprovar','financeiro.ver');
-- Coordenador
INSERT INTO public.role_permissoes (role_id, permissao)
SELECT 'a0000000-0000-0000-0000-000000000004', codigo FROM public.permissoes
WHERE codigo IN ('projeto.ver','projeto.editar','tarefa.criar','tarefa.editar','tarefa.prazo','tarefa.responsavel','relatorio.ver','cliente.ver');
-- Líder técnico
INSERT INTO public.role_permissoes (role_id, permissao)
SELECT 'a0000000-0000-0000-0000-000000000005', codigo FROM public.permissoes
WHERE codigo IN ('projeto.ver','tarefa.criar','tarefa.editar','tarefa.responsavel','cliente.ver');
-- Colaborador
INSERT INTO public.role_permissoes (role_id, permissao)
SELECT 'a0000000-0000-0000-0000-000000000006', codigo FROM public.permissoes
WHERE codigo IN ('projeto.ver','tarefa.editar','cliente.ver');
-- Financeiro
INSERT INTO public.role_permissoes (role_id, permissao)
SELECT 'a0000000-0000-0000-0000-000000000007', codigo FROM public.permissoes
WHERE codigo IN ('projeto.ver','financeiro.ver','orcamento.editar','relatorio.ver','cliente.ver','horas.aprovar');
-- Comercial
INSERT INTO public.role_permissoes (role_id, permissao)
SELECT 'a0000000-0000-0000-0000-000000000008', codigo FROM public.permissoes
WHERE codigo IN ('projeto.ver','cliente.ver','cliente.editar','relatorio.ver');
-- Cliente
INSERT INTO public.role_permissoes (role_id, permissao) VALUES
  ('a0000000-0000-0000-0000-000000000009','projeto.ver');

INSERT INTO public.profiles (id, tenant_id, nome, email, cargo, custo_hora, capacidade_semanal) VALUES
  ('22222222-2222-2222-2222-000000000001','11111111-1111-1111-1111-111111111111','Felipe Nogueira','felipe@enzova.com.br','Gerente de Projetos',120,40),
  ('22222222-2222-2222-2222-000000000002','11111111-1111-1111-1111-111111111111','Marina Reis','marina@enzova.com.br','Líder Técnica',95,40),
  ('22222222-2222-2222-2222-000000000003','11111111-1111-1111-1111-111111111111','Carlos Almeida','carlos@enzova.com.br','Analista de Dados',65,40),
  ('22222222-2222-2222-2222-000000000004','11111111-1111-1111-1111-111111111111','Lucas Nunes','lucas@enzova.com.br','Desenvolvedor',70,40),
  ('22222222-2222-2222-2222-000000000005','11111111-1111-1111-1111-111111111111','Paula Souza','paula@enzova.com.br','Coordenadora de Implantação',85,40);

INSERT INTO public.usuario_roles (tenant_id, profile_id, role_id) VALUES
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000001','a0000000-0000-0000-0000-000000000003'),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000002','a0000000-0000-0000-0000-000000000005'),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000003','a0000000-0000-0000-0000-000000000006'),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000004','a0000000-0000-0000-0000-000000000006'),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000005','a0000000-0000-0000-0000-000000000004');

INSERT INTO public.tags (tenant_id, nome, cor) VALUES
  ('11111111-1111-1111-1111-111111111111','Urgente','rose'),
  ('11111111-1111-1111-1111-111111111111','Bug','amber'),
  ('11111111-1111-1111-1111-111111111111','Implantação','brand'),
  ('11111111-1111-1111-1111-111111111111','Desenvolvimento','indigo'),
  ('11111111-1111-1111-1111-111111111111','Suporte','emerald'),
  ('11111111-1111-1111-1111-111111111111','Cliente','slate');

INSERT INTO public.clientes (id, tenant_id, tipo, nome, razao_social, nome_fantasia, cnpj, telefone, whatsapp, email, endereco, cidade, uf, responsavel, observacoes) VALUES
  ('33333333-3333-3333-3333-000000000001','11111111-1111-1111-1111-111111111111','pj','Empresa Alpha','Alpha Indústria e Comércio LTDA','Alpha','12.345.678/0001-90','(11) 3344-5566','(11) 99887-6655','contato@alpha.com.br','Av. Paulista, 1200','São Paulo','SP','Renata Coelho','Cliente estratégico, contrato anual de implantação.'),
  ('33333333-3333-3333-3333-000000000002','11111111-1111-1111-1111-111111111111','pj','Construtora Beta','Beta Engenharia e Construções S/A','Beta Engenharia','98.765.432/0001-10','(31) 3222-1100','(31) 98877-1122','projetos@betaeng.com.br','Rua das Acácias, 340','Belo Horizonte','MG','Eduardo Lima','Portal do cliente em fase de planejamento.'),
  ('33333333-3333-3333-3333-000000000003','11111111-1111-1111-1111-111111111111','pj','Grupo Ômega','Ômega Participações LTDA','Ômega','45.678.912/0001-33','(41) 3555-8899','(41) 99666-4433','ti@grupoomega.com.br','Av. das Torres, 88','Curitiba','PR','Sandra Prado','Integrações críticas com ERP legado.');

INSERT INTO public.cliente_contatos (tenant_id, cliente_id, nome, cargo, departamento, telefone, whatsapp, email, principal, financeiro, tecnico, responsavel_projeto) VALUES
  ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-000000000001','Renata Coelho','Diretora de Operações','Operações','(11) 3344-5566','(11) 99887-6655','renata@alpha.com.br',true,false,false,true),
  ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-000000000001','Tiago Martins','Analista Fiscal','Financeiro','(11) 3344-5570',null,'tiago@alpha.com.br',false,true,false,false),
  ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-000000000002','Eduardo Lima','Gerente de TI','Tecnologia','(31) 3222-1100','(31) 98877-1122','eduardo@betaeng.com.br',true,false,true,true),
  ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-000000000003','Sandra Prado','Coordenadora de Sistemas','Tecnologia','(41) 3555-8899',null,'sandra@grupoomega.com.br',true,false,true,true),
  ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-000000000003','Marcos Vieira','Controller','Financeiro','(41) 3555-8801',null,'marcos@grupoomega.com.br',false,true,false,false);

INSERT INTO public.projetos (id, tenant_id, codigo, nome, descricao, cliente_id, gerente_id, prioridade, status, data_inicio, prazo, data_prevista_conclusao, orcamento, custo_previsto, receita_prevista, horas_previstas, progresso) VALUES
  ('44444444-4444-4444-4444-000000000001','11111111-1111-1111-1111-111111111111','PRJ-0001','Implantação ERP Alpha','Implantação completa do ERP com migração de dados, testes e treinamento das equipes.','33333333-3333-3333-3333-000000000001','22222222-2222-2222-2222-000000000001','alta','em_andamento', CURRENT_DATE - 60, CURRENT_DATE + 25, CURRENT_DATE + 25, 250000, 140000, 250000, 1200, 64),
  ('44444444-4444-4444-4444-000000000002','11111111-1111-1111-1111-111111111111','PRJ-0002','Portal Cliente Beta','Portal de acompanhamento de obras com área do cliente e documentos.','33333333-3333-3333-3333-000000000002','22222222-2222-2222-2222-000000000005','normal','planejamento', CURRENT_DATE - 8, CURRENT_DATE + 90, CURRENT_DATE + 90, 90000, 48000, 90000, 520, 12),
  ('44444444-4444-4444-4444-000000000003','11111111-1111-1111-1111-111111111111','PRJ-0003','Integração API Ômega','Integração de pedidos e financeiro com o ERP legado do Grupo Ômega.','33333333-3333-3333-3333-000000000003','22222222-2222-2222-2222-000000000002','urgente','em_risco', CURRENT_DATE - 45, CURRENT_DATE + 6, CURRENT_DATE + 20, 50000, 25000, 50000, 380, 41);

INSERT INTO public.projeto_membros (tenant_id, projeto_id, profile_id, papel, percentual_alocacao) VALUES
  ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','22222222-2222-2222-2222-000000000001','Gerente',50),
  ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','22222222-2222-2222-2222-000000000003','Analista de dados',60),
  ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','22222222-2222-2222-2222-000000000005','Coordenadora',40),
  ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','22222222-2222-2222-2222-000000000005','Coordenadora',30),
  ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','22222222-2222-2222-2222-000000000004','Desenvolvedor',50),
  ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','22222222-2222-2222-2222-000000000002','Líder técnica',60),
  ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','22222222-2222-2222-2222-000000000004','Desenvolvedor',40);

-- Fases (5 por projeto)
INSERT INTO public.projeto_fases (id, tenant_id, projeto_id, nome, ordem, responsavel_id, data_inicio, prazo, status, progresso) VALUES
  ('55555555-0001-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','Levantamento',1,'22222222-2222-2222-2222-000000000001',CURRENT_DATE - 60, CURRENT_DATE - 45,'concluida',100),
  ('55555555-0001-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','Desenvolvimento',2,'22222222-2222-2222-2222-000000000002',CURRENT_DATE - 44, CURRENT_DATE + 2,'em_andamento',68),
  ('55555555-0001-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','Testes',3,'22222222-2222-2222-2222-000000000004',CURRENT_DATE + 3, CURRENT_DATE + 12,'nao_iniciada',0),
  ('55555555-0001-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','Homologação',4,'22222222-2222-2222-2222-000000000005',CURRENT_DATE + 13, CURRENT_DATE + 20,'nao_iniciada',0),
  ('55555555-0001-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','Implantação',5,'22222222-2222-2222-2222-000000000001',CURRENT_DATE + 21, CURRENT_DATE + 25,'nao_iniciada',0),
  ('55555555-0002-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','Levantamento',1,'22222222-2222-2222-2222-000000000005',CURRENT_DATE - 8, CURRENT_DATE + 10,'em_andamento',45),
  ('55555555-0002-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','Planejamento',2,'22222222-2222-2222-2222-000000000005',CURRENT_DATE + 11, CURRENT_DATE + 25,'nao_iniciada',0),
  ('55555555-0002-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','Desenvolvimento',3,'22222222-2222-2222-2222-000000000004',CURRENT_DATE + 26, CURRENT_DATE + 60,'nao_iniciada',0),
  ('55555555-0002-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','Testes',4,'22222222-2222-2222-2222-000000000004',CURRENT_DATE + 61, CURRENT_DATE + 75,'nao_iniciada',0),
  ('55555555-0002-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','Implantação',5,'22222222-2222-2222-2222-000000000005',CURRENT_DATE + 76, CURRENT_DATE + 90,'nao_iniciada',0),
  ('55555555-0003-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','Levantamento',1,'22222222-2222-2222-2222-000000000002',CURRENT_DATE - 45, CURRENT_DATE - 35,'concluida',100),
  ('55555555-0003-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','Desenvolvimento',2,'22222222-2222-2222-2222-000000000002',CURRENT_DATE - 34, CURRENT_DATE - 5,'em_andamento',55),
  ('55555555-0003-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','Testes',3,'22222222-2222-2222-2222-000000000004',CURRENT_DATE - 4, CURRENT_DATE + 2,'bloqueada',20),
  ('55555555-0003-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','Homologação',4,'22222222-2222-2222-2222-000000000002',CURRENT_DATE + 3, CURRENT_DATE + 5,'nao_iniciada',0),
  ('55555555-0003-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','Encerramento',5,'22222222-2222-2222-2222-000000000001',CURRENT_DATE + 6, CURRENT_DATE + 6,'nao_iniciada',0);

-- Tarefas (30)
INSERT INTO public.tarefas (id, tenant_id, projeto_id, fase_id, titulo, descricao, responsavel_id, prioridade, status, data_inicio, prazo, horas_estimadas, horas_realizadas, ordem, concluida_em) VALUES
 ('66666666-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','55555555-0001-0000-0000-000000000001','Levantamento de requisitos fiscais','Entrevistas com o time fiscal da Alpha.','22222222-2222-2222-2222-000000000001','alta','concluida',CURRENT_DATE-60,CURRENT_DATE-52,24,26,1,now()-interval '50 days'),
 ('66666666-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','55555555-0001-0000-0000-000000000001','Mapear processos de estoque',null,'22222222-2222-2222-2222-000000000005','normal','concluida',CURRENT_DATE-58,CURRENT_DATE-50,16,18,2,now()-interval '49 days'),
 ('66666666-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','55555555-0001-0000-0000-000000000001','Documentar regras de negócio',null,'22222222-2222-2222-2222-000000000003','normal','concluida',CURRENT_DATE-55,CURRENT_DATE-48,12,11,3,now()-interval '47 days'),
 ('66666666-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','55555555-0001-0000-0000-000000000001','Validar escopo com o cliente',null,'22222222-2222-2222-2222-000000000001','alta','concluida',CURRENT_DATE-50,CURRENT_DATE-46,8,9,4,now()-interval '45 days'),
 ('66666666-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','55555555-0001-0000-0000-000000000002','Migrar base de clientes','Carga inicial e deduplicação dos cadastros.','22222222-2222-2222-2222-000000000003','alta','em_andamento',CURRENT_DATE-20,CURRENT_DATE+1,40,28,5,null),
 ('66666666-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','55555555-0001-0000-0000-000000000002','Desenvolver módulo fiscal',null,'22222222-2222-2222-2222-000000000002','alta','em_andamento',CURRENT_DATE-18,CURRENT_DATE+4,60,34,6,null),
 ('66666666-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','55555555-0001-0000-0000-000000000002','Configurar centro de custos',null,'22222222-2222-2222-2222-000000000004','normal','a_fazer',CURRENT_DATE-2,CURRENT_DATE+7,20,0,7,null),
 ('66666666-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','55555555-0001-0000-0000-000000000002','Implantar ambiente de homologação','Provisionar banco, usuários e deploy.','22222222-2222-2222-2222-000000000004','alta','em_andamento',CURRENT_DATE-5,CURRENT_DATE+3,16,8,8,null),
 ('66666666-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','55555555-0001-0000-0000-000000000002','Revisar integrações bancárias',null,'22222222-2222-2222-2222-000000000002','normal','bloqueada',CURRENT_DATE-6,CURRENT_DATE-1,12,4,9,null),
 ('66666666-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','55555555-0001-0000-0000-000000000003','Plano de testes integrados',null,'22222222-2222-2222-2222-000000000004','normal','backlog',null,CURRENT_DATE+12,24,0,10,null),
 ('66666666-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','55555555-0001-0000-0000-000000000003','Testes de carga',null,'22222222-2222-2222-2222-000000000004','normal','backlog',null,CURRENT_DATE+14,16,0,11,null),
 ('66666666-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','55555555-0001-0000-0000-000000000004','Roteiro de homologação com a Alpha',null,'22222222-2222-2222-2222-000000000005','normal','backlog',null,CURRENT_DATE+18,12,0,12,null),
 ('66666666-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','55555555-0001-0000-0000-000000000005','Treinamento dos key users',null,'22222222-2222-2222-2222-000000000005','alta','backlog',null,CURRENT_DATE+24,32,0,13,null),
 ('66666666-0000-0000-0000-000000000014','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','55555555-0001-0000-0000-000000000005','Go live e acompanhamento',null,'22222222-2222-2222-2222-000000000001','urgente','backlog',null,CURRENT_DATE+25,24,0,14,null),
 ('66666666-0000-0000-0000-000000000015','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','55555555-0002-0000-0000-000000000001','Levantamento de requisitos',null,'22222222-2222-2222-2222-000000000005','normal','concluida',CURRENT_DATE-8,CURRENT_DATE-2,16,15,1,now()-interval '1 day'),
 ('66666666-0000-0000-0000-000000000016','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','55555555-0002-0000-0000-000000000001','Fluxo de cadastro no portal',null,'22222222-2222-2222-2222-000000000004','normal','em_andamento',CURRENT_DATE-3,CURRENT_DATE+3,20,6,2,null),
 ('66666666-0000-0000-0000-000000000017','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','55555555-0002-0000-0000-000000000001','Definir critérios de aceite',null,'22222222-2222-2222-2222-000000000001','baixa','a_fazer',null,CURRENT_DATE+8,8,0,3,null),
 ('66666666-0000-0000-0000-000000000018','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','55555555-0002-0000-0000-000000000002','Cronograma macro do portal',null,'22222222-2222-2222-2222-000000000005','normal','backlog',null,CURRENT_DATE+20,12,0,4,null),
 ('66666666-0000-0000-0000-000000000019','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','55555555-0002-0000-0000-000000000002','Arquitetura de permissões',null,'22222222-2222-2222-2222-000000000002','alta','backlog',null,CURRENT_DATE+24,16,0,5,null),
 ('66666666-0000-0000-0000-000000000020','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','55555555-0002-0000-0000-000000000003','Tela de acompanhamento de obra',null,'22222222-2222-2222-2222-000000000004','normal','backlog',null,CURRENT_DATE+45,40,0,6,null),
 ('66666666-0000-0000-0000-000000000021','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','55555555-0002-0000-0000-000000000003','Upload de documentos',null,'22222222-2222-2222-2222-000000000004','normal','backlog',null,CURRENT_DATE+52,24,0,7,null),
 ('66666666-0000-0000-0000-000000000022','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','55555555-0002-0000-0000-000000000004','Testes de aceitação com Beta',null,'22222222-2222-2222-2222-000000000005','normal','backlog',null,CURRENT_DATE+70,16,0,8,null),
 ('66666666-0000-0000-0000-000000000023','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','55555555-0003-0000-0000-000000000001','Mapear endpoints do ERP legado',null,'22222222-2222-2222-2222-000000000002','alta','concluida',CURRENT_DATE-45,CURRENT_DATE-38,20,22,1,now()-interval '37 days'),
 ('66666666-0000-0000-0000-000000000024','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','55555555-0003-0000-0000-000000000001','Definir contratos de dados',null,'22222222-2222-2222-2222-000000000002','normal','concluida',CURRENT_DATE-42,CURRENT_DATE-36,12,13,2,now()-interval '35 days'),
 ('66666666-0000-0000-0000-000000000025','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','55555555-0003-0000-0000-000000000002','Integrar API de pagamentos','Bloqueada: ambiente do cliente indisponível.','22222222-2222-2222-2222-000000000002','urgente','bloqueada',CURRENT_DATE-20,CURRENT_DATE-3,40,26,3,null),
 ('66666666-0000-0000-0000-000000000026','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','55555555-0003-0000-0000-000000000002','Sincronizar pedidos',null,'22222222-2222-2222-2222-000000000004','alta','em_andamento',CURRENT_DATE-15,CURRENT_DATE+1,32,24,4,null),
 ('66666666-0000-0000-0000-000000000027','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','55555555-0003-0000-0000-000000000002','Tratamento de erros e retentativas',null,'22222222-2222-2222-2222-000000000004','normal','em_andamento',CURRENT_DATE-9,CURRENT_DATE-2,16,12,5,null),
 ('66666666-0000-0000-0000-000000000028','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','55555555-0003-0000-0000-000000000003','Testes de integração ponta a ponta',null,'22222222-2222-2222-2222-000000000002','urgente','em_validacao',CURRENT_DATE-4,CURRENT_DATE+2,24,10,6,null),
 ('66666666-0000-0000-0000-000000000029','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','55555555-0003-0000-0000-000000000003','Monitoramento de filas',null,'22222222-2222-2222-2222-000000000003','alta','a_fazer',null,CURRENT_DATE-1,12,0,7,null),
 ('66666666-0000-0000-0000-000000000030','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','55555555-0003-0000-0000-000000000004','Homologação com Grupo Ômega',null,'22222222-2222-2222-2222-000000000001','alta','backlog',null,CURRENT_DATE+5,16,0,8,null);

INSERT INTO public.subtarefas (tenant_id, tarefa_id, titulo, responsavel_id, prazo, horas_estimadas, status, ordem) VALUES
 ('11111111-1111-1111-1111-111111111111','66666666-0000-0000-0000-000000000005','Extrair dados do sistema legado','22222222-2222-2222-2222-000000000003',CURRENT_DATE-10,12,'concluida',1),
 ('11111111-1111-1111-1111-111111111111','66666666-0000-0000-0000-000000000005','Deduplicar cadastros','22222222-2222-2222-2222-000000000003',CURRENT_DATE-2,10,'em_andamento',2),
 ('11111111-1111-1111-1111-111111111111','66666666-0000-0000-0000-000000000005','Validar carga com o cliente','22222222-2222-2222-2222-000000000001',CURRENT_DATE+1,6,'a_fazer',3),
 ('11111111-1111-1111-1111-111111111111','66666666-0000-0000-0000-000000000006','Cálculo de ICMS','22222222-2222-2222-2222-000000000002',CURRENT_DATE-1,20,'concluida',1),
 ('11111111-1111-1111-1111-111111111111','66666666-0000-0000-0000-000000000006','Emissão de NF-e','22222222-2222-2222-2222-000000000002',CURRENT_DATE+4,24,'em_andamento',2),
 ('11111111-1111-1111-1111-111111111111','66666666-0000-0000-0000-000000000025','Obter credenciais do gateway','22222222-2222-2222-2222-000000000002',CURRENT_DATE-5,4,'bloqueada',1),
 ('11111111-1111-1111-1111-111111111111','66666666-0000-0000-0000-000000000025','Implementar webhook de retorno','22222222-2222-2222-2222-000000000004',CURRENT_DATE+2,12,'a_fazer',2),
 ('11111111-1111-1111-1111-111111111111','66666666-0000-0000-0000-000000000016','Wireframe do cadastro','22222222-2222-2222-2222-000000000005',CURRENT_DATE-1,4,'concluida',1),
 ('11111111-1111-1111-1111-111111111111','66666666-0000-0000-0000-000000000016','Validação de campos','22222222-2222-2222-2222-000000000004',CURRENT_DATE+3,8,'em_andamento',2);

INSERT INTO public.checklists (id, tenant_id, tarefa_id, titulo) VALUES
 ('77777777-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','66666666-0000-0000-0000-000000000008','Implantar ambiente'),
 ('77777777-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','66666666-0000-0000-0000-000000000026','Sincronização de pedidos');

INSERT INTO public.checklist_itens (tenant_id, checklist_id, descricao, concluido, ordem) VALUES
 ('11111111-1111-1111-1111-111111111111','77777777-0000-0000-0000-000000000001','Banco criado',true,1),
 ('11111111-1111-1111-1111-111111111111','77777777-0000-0000-0000-000000000001','Usuário criado',true,2),
 ('11111111-1111-1111-1111-111111111111','77777777-0000-0000-0000-000000000001','Backup realizado',true,3),
 ('11111111-1111-1111-1111-111111111111','77777777-0000-0000-0000-000000000001','Deploy realizado',false,4),
 ('11111111-1111-1111-1111-111111111111','77777777-0000-0000-0000-000000000001','Teste de acesso',false,5),
 ('11111111-1111-1111-1111-111111111111','77777777-0000-0000-0000-000000000001','Homologação',false,6),
 ('11111111-1111-1111-1111-111111111111','77777777-0000-0000-0000-000000000002','Mapear campos do pedido',true,1),
 ('11111111-1111-1111-1111-111111111111','77777777-0000-0000-0000-000000000002','Implementar fila de envio',true,2),
 ('11111111-1111-1111-1111-111111111111','77777777-0000-0000-0000-000000000002','Testar reprocessamento',false,3);

INSERT INTO public.tarefa_dependencias (tenant_id, tarefa_id, tarefa_relacionada_id, tipo) VALUES
 ('11111111-1111-1111-1111-111111111111','66666666-0000-0000-0000-000000000028','66666666-0000-0000-0000-000000000025','depende_de'),
 ('11111111-1111-1111-1111-111111111111','66666666-0000-0000-0000-000000000011','66666666-0000-0000-0000-000000000010','depende_de');

INSERT INTO public.comentarios (tenant_id, autor_id, projeto_id, tarefa_id, conteudo) VALUES
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000002','44444444-4444-4444-4444-000000000003','66666666-0000-0000-0000-000000000025','@Felipe verificar integração antes da homologação. Seguimos sem credenciais do gateway.'),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000001','44444444-4444-4444-4444-000000000003','66666666-0000-0000-0000-000000000025','Escalei com a Sandra do Grupo Ômega. Previsão de acesso para amanhã.'),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000003','44444444-4444-4444-4444-000000000001','66666666-0000-0000-0000-000000000005','Deduplicação encontrou 1.240 registros duplicados. Vou validar com o time fiscal.'),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000005','44444444-4444-4444-4444-000000000001',null,'Cliente confirmou treinamento presencial na semana do go live.'),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000004','44444444-4444-4444-4444-000000000002','66666666-0000-0000-0000-000000000016','Fluxo revisado, faltam as validações de CNPJ.');

INSERT INTO public.riscos (tenant_id, projeto_id, descricao, probabilidade, impacto, responsavel_id, plano_mitigacao, status) VALUES
 ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','Indisponibilidade do ambiente do cliente para testes','alto','critico','22222222-2222-2222-2222-000000000002','Negociar janela dedicada e ambiente espelho interno','aberto'),
 ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000003','Documentação incompleta da API legada','medio','alto','22222222-2222-2222-2222-000000000004','Sessões técnicas semanais com o time do cliente','aberto'),
 ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000001','Qualidade dos dados legados abaixo do esperado','medio','alto','22222222-2222-2222-2222-000000000003','Rotina de saneamento e validação em duas etapas','aberto'),
 ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-000000000002','Escopo do portal ainda em definição','alto','medio','22222222-2222-2222-2222-000000000005','Congelar escopo após aprovação do cronograma macro','aberto');

INSERT INTO public.auditoria (tenant_id, profile_id, entidade, entidade_id, acao, campo, valor_anterior, valor_novo, projeto_id, created_at) VALUES
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000001','projeto','44444444-4444-4444-4444-000000000003','criado',null,null,null,'44444444-4444-4444-4444-000000000003',now()-interval '45 days'),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000001','projeto_membro','44444444-4444-4444-4444-000000000003','adicionado','membro',null,'Marina Reis','44444444-4444-4444-4444-000000000003',now()-interval '44 days'),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000001','projeto','44444444-4444-4444-4444-000000000003','alterado','prazo',(CURRENT_DATE+20)::text,(CURRENT_DATE+6)::text,'44444444-4444-4444-4444-000000000003',now()-interval '9 days'),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000002','tarefa','66666666-0000-0000-0000-000000000025','alterado','status','em_andamento','bloqueada','44444444-4444-4444-4444-000000000003',now()-interval '3 days'),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000001','projeto','44444444-4444-4444-4444-000000000003','alterado','status','em_andamento','em_risco','44444444-4444-4444-4444-000000000003',now()-interval '2 days'),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-000000000003','tarefa','66666666-0000-0000-0000-000000000005','alterado','horas_realizadas','20','28','44444444-4444-4444-4444-000000000001',now()-interval '1 day');
