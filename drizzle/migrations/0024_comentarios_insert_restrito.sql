-- 0024 — Restringe INSERT em comentarios e comentario_anexos
-- Antes: o INSERT só exigia tenant e autoria. Um usuário podia:
--   * apontar o comentário para projeto/tarefa/entrega de OUTRO tenant (e, com
--     interno = false, fazê-lo aparecer na conversa do cliente daquele tenant);
--   * gravar como se fosse um contato do portal (portal_acesso_id);
--   * anexar arquivos a comentários de outras pessoas ou com caminho de outro projeto.

-- =====================================================================
-- comentarios
-- =====================================================================
DROP POLICY IF EXISTS "comentarios criar" ON public.comentarios;

CREATE POLICY "comentarios criar" ON public.comentarios FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND autor_id = public.current_profile_id()
    AND portal_acesso_id IS NULL          -- comentário do portal só nasce nas funções portal_*
    AND deleted_at IS NULL
    AND (comentarios.projeto_id IS NOT NULL OR comentarios.tarefa_id IS NOT NULL OR comentarios.marco_id IS NOT NULL)
    AND (
      comentarios.projeto_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.projetos p
         WHERE p.id = comentarios.projeto_id AND p.tenant_id = public.current_tenant_id()
      )
    )
    AND (
      comentarios.tarefa_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.tarefas t
         WHERE t.id = comentarios.tarefa_id
           AND t.tenant_id = public.current_tenant_id()
           AND (comentarios.projeto_id IS NULL OR t.projeto_id = comentarios.projeto_id)
      )
    )
    AND (
      comentarios.marco_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.marcos m
         WHERE m.id = comentarios.marco_id
           AND m.tenant_id = public.current_tenant_id()
           AND (comentarios.projeto_id IS NULL OR m.projeto_id = comentarios.projeto_id)
      )
    )
  );

-- Mesma brecha por UPDATE: depois de criado, o autor só edita o texto ou exclui.
-- (O app não altera outras colunas de comentarios; DELETE nunca teve política.)
REVOKE UPDATE, DELETE ON public.comentarios FROM authenticated;
GRANT UPDATE (conteudo, deleted_at) ON public.comentarios TO authenticated;

-- =====================================================================
-- comentario_anexos
--   O anexo precisa pertencer a um comentário do próprio usuário, no mesmo tenant,
--   e o arquivo precisa estar na pasta do projeto do comentário ({projeto_id}/…).
-- =====================================================================
DROP POLICY IF EXISTS comentario_anexos_insert ON public.comentario_anexos;

CREATE POLICY comentario_anexos_insert ON public.comentario_anexos
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_profile_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.comentarios c
       WHERE c.id = comentario_anexos.comentario_id
         AND c.tenant_id = comentario_anexos.tenant_id
         AND c.autor_id = public.current_profile_id()
         AND c.deleted_at IS NULL
         AND c.projeto_id IS NOT NULL
         AND split_part(comentario_anexos.arquivo_path, '/', 1) = c.projeto_id::text
    )
  );
