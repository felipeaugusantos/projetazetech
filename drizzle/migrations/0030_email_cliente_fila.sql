-- 0030 — E-mails ao cliente (fila no banco)
-- O banco decide QUANDO avisar o cliente e enfileira o e-mail; um envio periódico no app
-- (rota /api/public/hooks/enviar-emails, ver src/lib/email) entrega a fila pelo provedor.
-- Assim o aviso não depende de ninguém ter o app aberto e o provedor pode ser trocado
-- sem mexer nas regras.
--
-- Eventos (cada um respeita o opt-out do contato e só vai para acessos ativos do cliente):
--   convite   : acesso ao portal criado (ou reativado, ainda sem primeiro acesso)
--   entrega   : entrega do cliente (marco) disponível para aprovação
--   documento : documento aprovado publicado no portal (agrupa em ~10 min por projeto)
--   mensagem  : nova mensagem da equipe na conversa (agrupa em ~5 min por projeto)
--   pesquisa  : projeto concluído, pesquisa de satisfação disponível
-- Não vai conteúdo de mensagem, documento ou custo no e-mail: só o aviso e o link do portal.

-- ---------------------------------------------------------------------
-- Preferência do contato
-- ---------------------------------------------------------------------
ALTER TABLE public.portal_acessos
  ADD COLUMN IF NOT EXISTS email_notificacoes boolean NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------
-- Fila
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_fila (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  portal_acesso_id uuid REFERENCES public.portal_acessos(id) ON DELETE SET NULL,
  destinatario_email text NOT NULL,
  destinatario_nome text,
  tipo text NOT NULL CHECK (tipo IN ('convite', 'entrega', 'documento', 'mensagem', 'pesquisa')),
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  chave text NOT NULL,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'enviando', 'enviado', 'erro', 'cancelado')),
  tentativas integer NOT NULL DEFAULT 0,
  ultimo_erro text,
  enviar_apos timestamptz NOT NULL DEFAULT now(),
  enviado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Um aviso pendente por chave (é o que agrupa várias ocorrências num único e-mail)
CREATE UNIQUE INDEX IF NOT EXISTS email_fila_chave_pendente_uk
  ON public.email_fila (chave) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS email_fila_pronta_idx
  ON public.email_fila (enviar_apos) WHERE status IN ('pendente', 'enviando');
CREATE INDEX IF NOT EXISTS email_fila_tenant_idx ON public.email_fila (tenant_id, created_at DESC);

ALTER TABLE public.email_fila ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_fila FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.email_fila TO authenticated;      -- só leitura (histórico)
GRANT ALL ON public.email_fila TO service_role;

DROP POLICY IF EXISTS email_fila_select ON public.email_fila;
CREATE POLICY email_fila_select ON public.email_fila FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('cliente.editar'));

-- ---------------------------------------------------------------------
-- Enfileirar (uso interno dos triggers)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.email_enfileirar(
  p_acesso uuid, p_tipo text, p_dados jsonb, p_chave text,
  p_atraso interval DEFAULT interval '0', p_unico boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- "Único": nunca repete a mesma chave, mesmo depois de enviada (convite, pesquisa, entrega)
  IF p_unico AND EXISTS (SELECT 1 FROM public.email_fila WHERE chave = p_chave) THEN
    RETURN;
  END IF;

  INSERT INTO public.email_fila
    (tenant_id, portal_acesso_id, destinatario_email, destinatario_nome, tipo, dados, chave, enviar_apos)
  SELECT pa.tenant_id, pa.id, pa.email, pa.nome, p_tipo,
         p_dados || jsonb_build_object('empresa', t.nome),
         p_chave, now() + p_atraso
    FROM public.portal_acessos pa
    JOIN public.tenants t ON t.id = pa.tenant_id
   WHERE pa.id = p_acesso
     AND pa.ativo AND pa.deleted_at IS NULL
     AND pa.email_notificacoes
     AND pa.email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ON CONFLICT (chave) WHERE status = 'pendente' DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.email_enfileirar_cliente(
  p_cliente uuid, p_tipo text, p_dados jsonb, p_chave text,
  p_atraso interval DEFAULT interval '0', p_unico boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acesso uuid;
BEGIN
  IF p_cliente IS NULL THEN RETURN; END IF;
  FOR v_acesso IN
    SELECT id FROM public.portal_acessos WHERE cliente_id = p_cliente AND ativo AND deleted_at IS NULL
  LOOP
    PERFORM public.email_enfileirar(v_acesso, p_tipo, p_dados, p_chave || ':' || v_acesso, p_atraso, p_unico);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.email_enfileirar(uuid, text, jsonb, text, interval, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_enfileirar_cliente(uuid, text, jsonb, text, interval, boolean) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------

-- Convite: acesso criado (ou reativado) que ainda não fez o primeiro acesso
CREATE OR REPLACE FUNCTION public.email_gatilho_convite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ativo AND NEW.deleted_at IS NULL AND NEW.user_id IS NULL
     AND (TG_OP = 'INSERT' OR NOT OLD.ativo) THEN
    PERFORM public.email_enfileirar(NEW.id, 'convite', '{}'::jsonb,
      'convite:' || NEW.id || ':' || to_char(now(), 'YYYYMMDDHH24MISS'), interval '0', true);
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS email_convite ON public.portal_acessos;
CREATE TRIGGER email_convite AFTER INSERT OR UPDATE OF ativo ON public.portal_acessos
  FOR EACH ROW EXECUTE FUNCTION public.email_gatilho_convite();

-- Entrega do cliente disponível
CREATE OR REPLACE FUNCTION public.email_gatilho_entrega()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_projeto public.projetos;
BEGIN
  IF NEW.entrega_cliente AND NEW.deleted_at IS NULL AND NEW.status = 'previsto'
     AND (TG_OP = 'INSERT' OR NOT OLD.entrega_cliente) THEN
    SELECT * INTO v_projeto FROM public.projetos WHERE id = NEW.projeto_id AND deleted_at IS NULL;
    IF v_projeto.id IS NOT NULL THEN
      PERFORM public.email_enfileirar_cliente(v_projeto.cliente_id, 'entrega',
        jsonb_build_object('projeto_id', v_projeto.id, 'projeto_nome', v_projeto.nome,
                           'entrega_nome', NEW.nome, 'data', NEW.data),
        'entrega:' || NEW.id, interval '5 minutes', true);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS email_entrega ON public.marcos;
CREATE TRIGGER email_entrega AFTER INSERT OR UPDATE OF entrega_cliente ON public.marcos
  FOR EACH ROW EXECUTE FUNCTION public.email_gatilho_entrega();

-- Documento publicado no portal (após aprovação interna): agrupa por projeto
CREATE OR REPLACE FUNCTION public.email_gatilho_documento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_projeto public.projetos;
BEGIN
  IF NEW.visivel_cliente AND NEW.deleted_at IS NULL
     AND (TG_OP = 'INSERT' OR NOT OLD.visivel_cliente) THEN
    SELECT * INTO v_projeto FROM public.projetos WHERE id = NEW.projeto_id AND deleted_at IS NULL;
    IF v_projeto.id IS NOT NULL THEN
      PERFORM public.email_enfileirar_cliente(v_projeto.cliente_id, 'documento',
        jsonb_build_object('projeto_id', v_projeto.id, 'projeto_nome', v_projeto.nome),
        'documento:' || v_projeto.id, interval '10 minutes');
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS email_documento ON public.documentos;
CREATE TRIGGER email_documento AFTER INSERT OR UPDATE OF visivel_cliente ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.email_gatilho_documento();

-- Mensagem da equipe visível ao cliente: agrupa por projeto
CREATE OR REPLACE FUNCTION public.email_gatilho_mensagem()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_projeto public.projetos;
  v_marco text;
BEGIN
  IF NOT NEW.interno AND NEW.portal_acesso_id IS NULL AND NEW.autor_id IS NOT NULL
     AND NEW.deleted_at IS NULL THEN
    SELECT p.* INTO v_projeto FROM public.projetos p
     WHERE p.id = coalesce(NEW.projeto_id, (SELECT m.projeto_id FROM public.marcos m WHERE m.id = NEW.marco_id))
       AND p.deleted_at IS NULL;
    IF v_projeto.id IS NOT NULL THEN
      SELECT nome INTO v_marco FROM public.marcos WHERE id = NEW.marco_id;
      PERFORM public.email_enfileirar_cliente(v_projeto.cliente_id, 'mensagem',
        jsonb_build_object('projeto_id', v_projeto.id, 'projeto_nome', v_projeto.nome, 'entrega_nome', v_marco),
        'mensagem:' || v_projeto.id, interval '5 minutes');
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS email_mensagem ON public.comentarios;
CREATE TRIGGER email_mensagem AFTER INSERT ON public.comentarios
  FOR EACH ROW EXECUTE FUNCTION public.email_gatilho_mensagem();

-- Projeto concluído: convida para a pesquisa de satisfação (uma vez por contato)
CREATE OR REPLACE FUNCTION public.email_gatilho_pesquisa()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'concluido' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.deleted_at IS NULL THEN
    PERFORM public.email_enfileirar_cliente(NEW.cliente_id, 'pesquisa',
      jsonb_build_object('projeto_id', NEW.id, 'projeto_nome', NEW.nome),
      'pesquisa:' || NEW.id, interval '1 hour', true);
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS email_pesquisa ON public.projetos;
CREATE TRIGGER email_pesquisa AFTER UPDATE OF status ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.email_gatilho_pesquisa();

-- ---------------------------------------------------------------------
-- Preferência do contato (chamada pelo portal)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.portal_email_preferencia(p_ativo boolean DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acesso public.portal_acessos;
BEGIN
  v_acesso := public.portal_acesso_atual();
  IF v_acesso.id IS NULL THEN RAISE EXCEPTION 'acesso nao autorizado'; END IF;

  IF p_ativo IS NOT NULL THEN
    UPDATE public.portal_acessos SET email_notificacoes = p_ativo WHERE id = v_acesso.id;
    IF NOT p_ativo THEN
      UPDATE public.email_fila SET status = 'cancelado', updated_at = now()
       WHERE portal_acesso_id = v_acesso.id AND status = 'pendente';
    END IF;
    RETURN p_ativo;
  END IF;
  RETURN v_acesso.email_notificacoes;
END;
$$;
REVOKE ALL ON FUNCTION public.portal_email_preferencia(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_email_preferencia(boolean) TO authenticated;

-- ---------------------------------------------------------------------
-- Envio (usado só pelo servidor, com service_role)
-- ---------------------------------------------------------------------

-- Reserva um lote: cancela o que deixou de ser elegível (opt-out/acesso suspenso) e marca
-- o restante como "enviando". Reservas presas há mais de 10 min voltam para a fila.
CREATE OR REPLACE FUNCTION public.email_fila_reservar(p_limite integer DEFAULT 20)
RETURNS SETOF public.email_fila
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.email_fila f
     SET status = 'cancelado', updated_at = now(), ultimo_erro = 'contato inativo ou sem e-mails'
   WHERE f.status = 'pendente' AND f.enviar_apos <= now()
     AND NOT EXISTS (
       SELECT 1 FROM public.portal_acessos pa
        WHERE pa.id = f.portal_acesso_id AND pa.ativo AND pa.deleted_at IS NULL AND pa.email_notificacoes
     );

  RETURN QUERY
  UPDATE public.email_fila f
     SET status = 'enviando', tentativas = f.tentativas + 1, updated_at = now()
   WHERE f.id IN (
     SELECT x.id FROM public.email_fila x
      WHERE (x.status = 'pendente' AND x.enviar_apos <= now())
         OR (x.status = 'enviando' AND x.updated_at < now() - interval '10 minutes')
      ORDER BY x.enviar_apos
      LIMIT greatest(1, least(p_limite, 100))
      FOR UPDATE SKIP LOCKED
   )
  RETURNING f.*;
END;
$$;

-- Resultado do envio: sucesso, nova tentativa com espera crescente (até 5) ou erro definitivo
CREATE OR REPLACE FUNCTION public.email_fila_concluir(
  p_id uuid, p_ok boolean, p_erro text DEFAULT NULL, p_definitivo boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.email_fila;
BEGIN
  SELECT * INTO v_item FROM public.email_fila WHERE id = p_id FOR UPDATE;
  IF v_item.id IS NULL THEN RETURN; END IF;

  IF p_ok THEN
    UPDATE public.email_fila
       SET status = 'enviado', enviado_em = now(), ultimo_erro = NULL, updated_at = now()
     WHERE id = p_id;
  ELSIF p_definitivo OR v_item.tentativas >= 5 THEN
    UPDATE public.email_fila
       SET status = 'erro', ultimo_erro = left(p_erro, 500), updated_at = now()
     WHERE id = p_id;
  ELSIF EXISTS (SELECT 1 FROM public.email_fila WHERE chave = v_item.chave AND status = 'pendente' AND id <> p_id) THEN
    -- já existe outro aviso pendente igual: este vira redundante
    UPDATE public.email_fila SET status = 'cancelado', ultimo_erro = left(p_erro, 500), updated_at = now() WHERE id = p_id;
  ELSE
    UPDATE public.email_fila
       SET status = 'pendente', ultimo_erro = left(p_erro, 500), updated_at = now(),
           enviar_apos = now() + (v_item.tentativas * v_item.tentativas) * interval '2 minutes'
     WHERE id = p_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.email_fila_reservar(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_fila_concluir(uuid, boolean, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_fila_reservar(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_fila_concluir(uuid, boolean, text, boolean) TO service_role;

-- ---------------------------------------------------------------------
-- Agendamento do envio (rodar UMA vez, no SQL Editor, com a URL publicada e o segredo)
--   select public.email_agendar_envio(
--     'https://SEU-APP/api/public/hooks/enviar-emails', 'VALOR_DE_LOVABLE_CRON_SECRET');
-- Chama a rota a cada minuto (pg_cron + pg_net). O segredo fica no comando do job
-- (visível só a quem administra o banco). Para parar: select cron.unschedule('enviar-emails');
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.email_agendar_envio(
  p_url text, p_segredo text, p_cron text DEFAULT '* * * * *'
) RETURNS bigint
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  IF p_url !~ '^https://' THEN RAISE EXCEPTION 'a URL precisa ser https://'; END IF;
  EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron';
  EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_net';
  BEGIN
    PERFORM cron.unschedule('enviar-emails');
  EXCEPTION WHEN OTHERS THEN
    NULL; -- não existia
  END;
  EXECUTE format(
    'SELECT cron.schedule(%L, %L, %L)',
    'enviar-emails', p_cron,
    format('SELECT net.http_post(url := %L, headers := %L::jsonb, body := ''{}''::jsonb)',
           p_url, jsonb_build_object('Authorization', 'Bearer ' || p_segredo, 'Content-Type', 'application/json')::text)
  ) INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.email_agendar_envio(text, text, text) FROM PUBLIC, anon, authenticated;
