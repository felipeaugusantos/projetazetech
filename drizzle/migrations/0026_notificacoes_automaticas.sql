-- 0026 — Notificações automáticas por trigger
-- O app só lia notificações (as únicas geradas eram as do portal do cliente). Agora o
-- banco gera as notificações dos fluxos internos, sem depender do cliente (o INSERT do
-- cliente está fechado desde a 0020/0025). Quem executa a ação nunca é notificado dela.
--
--   tarefas    : atribuída a você · concluída (para o gerente do projeto)
--   projetos   : você passou a ser o gerente
--   despesas   : enviada p/ aprovação (quem tem despesa.aprovar) · aprovada/rejeitada (solicitante)
--   documentos : enviado p/ aprovação do portal (quem tem documento.aprovar) · aprovado/rejeitado (autor)
--
-- Atraso e menção não entram aqui: atraso exige rotina agendada (não é evento de linha) e
-- o app ainda não tem menção estruturada nos comentários.

-- ---------------------------------------------------------------------
-- Auxiliares (uso interno dos triggers)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_perfil(
  p_tenant uuid, p_destinatario uuid, p_tipo text, p_titulo text, p_mensagem text, p_link text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sem destinatário, ou é quem fez a ação: nada a avisar.
  IF p_destinatario IS NULL OR p_destinatario IS NOT DISTINCT FROM public.current_profile_id() THEN
    RETURN;
  END IF;
  INSERT INTO public.notificacoes (tenant_id, destinatario_id, tipo, titulo, mensagem, link)
  SELECT p_tenant, p.id, p_tipo, p_titulo, left(p_mensagem, 300), p_link
    FROM public.profiles p
   WHERE p.id = p_destinatario AND p.tenant_id = p_tenant AND p.deleted_at IS NULL AND p.ativo;
END;
$$;

CREATE OR REPLACE FUNCTION public.notificar_permissao(
  p_tenant uuid, p_permissao text, p_tipo text, p_titulo text, p_mensagem text, p_link text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notificacoes (tenant_id, destinatario_id, tipo, titulo, mensagem, link)
  SELECT DISTINCT p_tenant, p.id, p_tipo, p_titulo, left(p_mensagem, 300), p_link
    FROM public.profiles p
    JOIN public.usuario_roles ur ON ur.profile_id = p.id
    JOIN public.role_permissoes rp ON rp.role_id = ur.role_id
   WHERE p.tenant_id = p_tenant
     AND p.deleted_at IS NULL AND p.ativo
     AND rp.permissao = p_permissao
     AND p.id IS DISTINCT FROM public.current_profile_id();
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_perfil(uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notificar_permissao(uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- tarefas
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notifica_tarefa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gerente uuid;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NULL; END IF;

  IF NEW.responsavel_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id) THEN
    PERFORM public.notificar_perfil(NEW.tenant_id, NEW.responsavel_id, 'tarefa',
      'Tarefa atribuída a você', NEW.titulo, '/projetos/' || NEW.projeto_id);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'concluida' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT gerente_id INTO v_gerente FROM public.projetos WHERE id = NEW.projeto_id;
    -- O gerente do projeto é avisado (a menos que ele mesmo tenha concluído a tarefa).
    PERFORM public.notificar_perfil(NEW.tenant_id, v_gerente, 'tarefa',
      'Tarefa concluída', NEW.titulo, '/projetos/' || NEW.projeto_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS notifica_tarefa ON public.tarefas;
CREATE TRIGGER notifica_tarefa
  AFTER INSERT OR UPDATE OF responsavel_id, status ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION public.notifica_tarefa();

-- ---------------------------------------------------------------------
-- projetos: novo gerente
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notifica_projeto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NULL AND NEW.gerente_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.gerente_id IS DISTINCT FROM OLD.gerente_id) THEN
    PERFORM public.notificar_perfil(NEW.tenant_id, NEW.gerente_id, 'projeto',
      'Você é o gerente de um projeto', NEW.codigo || ' · ' || NEW.nome, '/projetos/' || NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS notifica_projeto ON public.projetos;
CREATE TRIGGER notifica_projeto
  AFTER INSERT OR UPDATE OF gerente_id ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.notifica_projeto();

-- ---------------------------------------------------------------------
-- despesas
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notifica_despesa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NULL; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NULL; END IF;

  IF NEW.status = 'enviada' THEN
    PERFORM public.notificar_permissao(NEW.tenant_id, 'despesa.aprovar', 'despesa',
      'Despesa aguardando aprovação', NEW.descricao, '/financeiro');
  ELSIF NEW.status IN ('aprovada', 'rejeitada') THEN
    PERFORM public.notificar_perfil(NEW.tenant_id, NEW.profile_id, 'despesa',
      CASE NEW.status WHEN 'aprovada' THEN 'Despesa aprovada' ELSE 'Despesa rejeitada' END,
      NEW.descricao, '/financeiro');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS notifica_despesa ON public.despesas;
CREATE TRIGGER notifica_despesa
  AFTER INSERT OR UPDATE OF status ON public.despesas
  FOR EACH ROW EXECUTE FUNCTION public.notifica_despesa();

-- ---------------------------------------------------------------------
-- documentos (aprovação antes de ir ao portal do cliente)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notifica_documento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NULL; END IF;

  -- Pedido de publicação no portal aguardando aprovação
  IF NEW.solicita_portal AND NEW.aprovacao_status = 'pendente'
     AND (TG_OP = 'INSERT' OR NOT OLD.solicita_portal OR OLD.aprovacao_status IS DISTINCT FROM NEW.aprovacao_status) THEN
    PERFORM public.notificar_permissao(NEW.tenant_id, 'documento.aprovar', 'documento',
      'Documento aguardando aprovação', NEW.nome, '/documentos');
  END IF;

  -- Decisão
  IF TG_OP = 'UPDATE' AND NEW.aprovacao_status IN ('aprovado', 'rejeitado')
     AND OLD.aprovacao_status IS DISTINCT FROM NEW.aprovacao_status THEN
    PERFORM public.notificar_perfil(NEW.tenant_id, NEW.autor_id, 'documento',
      CASE NEW.aprovacao_status WHEN 'aprovado' THEN 'Documento aprovado' ELSE 'Documento recusado' END,
      NEW.nome, '/documentos');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS notifica_documento ON public.documentos;
CREATE TRIGGER notifica_documento
  AFTER INSERT OR UPDATE OF solicita_portal, aprovacao_status ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.notifica_documento();
