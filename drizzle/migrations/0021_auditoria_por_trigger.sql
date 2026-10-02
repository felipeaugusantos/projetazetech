-- 0021 — Auditoria gerada no banco (triggers)
-- Antes: o front-end gravava a auditoria (registrarAuditoria), então o conteúdo podia
-- ser omitido ou forjado. Agora cada INSERT/UPDATE/DELETE nas tabelas de negócio gera
-- o registro no próprio banco, atribuído a quem executou (current_profile_id()).
-- O cliente deixa de ter INSERT em public.auditoria.

CREATE OR REPLACE FUNCTION public.auditar_alteracoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entidade text := TG_ARGV[0];
  v_ignorar text[] := string_to_array(coalesce(TG_ARGV[1], ''), ',') || ARRAY['updated_at','created_at','deleted_at','ordem'];
  v_old jsonb;
  v_new jsonb;
  v_ref jsonb;
  v_tenant uuid;
  v_projeto uuid;
  v_id uuid;
  v_profile uuid := public.current_profile_id();
  v_chave text;
BEGIN
  IF TG_OP = 'DELETE' THEN v_ref := to_jsonb(OLD); ELSE v_ref := to_jsonb(NEW); END IF;

  v_tenant := (v_ref ->> 'tenant_id')::uuid;
  v_id := (v_ref ->> 'id')::uuid;
  v_projeto := CASE WHEN TG_TABLE_NAME = 'projetos' THEN v_id ELSE (v_ref ->> 'projeto_id')::uuid END;

  -- Exclusão em cascata (projeto/empresa já removidos): não há onde referenciar.
  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_tenant) THEN RETURN NULL; END IF;
    IF v_projeto IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.projetos WHERE id = v_projeto) THEN
      v_projeto := NULL;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.auditoria (tenant_id, profile_id, entidade, entidade_id, acao, projeto_id)
    VALUES (v_tenant, v_profile, v_entidade, v_id, 'criado', v_projeto);

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.auditoria (tenant_id, profile_id, entidade, entidade_id, acao, projeto_id)
    VALUES (v_tenant, v_profile, v_entidade, v_id, 'excluído', v_projeto);

  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);

    -- Exclusão lógica (deleted_at preenchido)
    IF (v_new ->> 'deleted_at') IS NOT NULL AND (v_old ->> 'deleted_at') IS NULL THEN
      INSERT INTO public.auditoria (tenant_id, profile_id, entidade, entidade_id, acao, projeto_id)
      VALUES (v_tenant, v_profile, v_entidade, v_id, 'excluído', v_projeto);
      RETURN NULL;
    END IF;

    FOR v_chave IN SELECT jsonb_object_keys(v_new) LOOP
      CONTINUE WHEN v_chave = ANY (v_ignorar);
      IF (v_old -> v_chave) IS DISTINCT FROM (v_new -> v_chave) THEN
        INSERT INTO public.auditoria
          (tenant_id, profile_id, entidade, entidade_id, acao, campo, valor_anterior, valor_novo, projeto_id)
        VALUES
          (v_tenant, v_profile, v_entidade, v_id, 'alterado', v_chave,
           left(v_old ->> v_chave, 500), left(v_new ->> v_chave, 500), v_projeto);
      END IF;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.auditar_alteracoes() FROM PUBLIC, anon, authenticated;

-- (tabela, rótulo da entidade, colunas ignoradas)
-- profiles: não registra custo_hora (valor sensível) nem o vínculo técnico user_id.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('tarefas',        'tarefa',        ''),
      ('projetos',       'projeto',       ''),
      ('projeto_fases',  'fase',          ''),
      ('clientes',       'cliente',       ''),
      ('riscos',         'risco',         ''),
      ('apontamentos',   'apontamento',   ''),
      ('marcos',         'marco',         ''),
      ('alocacoes',      'alocacao',      ''),
      ('orcamento_itens','orcamento_item',''),
      ('despesas',       'despesa',       ''),
      ('custos_reais',   'custo_real',    ''),
      ('documentos',     'documento',     ''),
      ('profiles',       'pessoa',        'user_id,custo_hora'),
      ('usuario_roles',  'papel',         '')
    ) AS v(tabela, entidade, ignorar)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS auditar_%1$s ON public.%1$I', t.tabela);
    EXECUTE format(
      'CREATE TRIGGER auditar_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION public.auditar_alteracoes(%2$L, %3$L)',
      t.tabela, t.entidade, t.ignorar);
  END LOOP;
END $$;

-- O cliente não escreve mais auditoria: só o banco (triggers e funções SECURITY DEFINER).
DROP POLICY IF EXISTS "auditoria criar" ON public.auditoria;
REVOKE INSERT ON public.auditoria FROM authenticated;
