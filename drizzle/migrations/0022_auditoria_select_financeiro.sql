-- 0022 — Leitura da auditoria: registros financeiros só para quem tem financeiro.ver
-- A auditoria passou a gravar valores anteriores/novos (migração 0021). Mudanças de
-- despesas, orçamento e custos, e de campos financeiros do projeto, deixam de ser
-- visíveis a toda a equipe do tenant. O restante do histórico continua visível.

DROP POLICY IF EXISTS "auditoria ver" ON public.auditoria;

CREATE POLICY "auditoria ver" ON public.auditoria FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      NOT (
        entidade IN ('despesa', 'orcamento_item', 'custo_real')
        OR (entidade = 'projeto' AND campo IN ('orcamento', 'custo_previsto', 'receita_prevista'))
      )
      OR public.has_permission('financeiro.ver')
    )
  );
