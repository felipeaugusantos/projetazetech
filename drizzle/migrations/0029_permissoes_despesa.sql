-- 0029 — Permissões de despesa
-- O app e as políticas de despesas já usam despesa.lancar e despesa.aprovar
-- (financeiro.tsx, custos-reais.tsx, políticas de public.despesas), mas elas nunca foram
-- criadas em public.permissoes. Sem elas, ninguém consegue lançar despesa pelo Financeiro
-- nem aprovar, e o aviso "Despesa aguardando aprovação" (0026) não chega a ninguém.
--
-- Atribuição inicial (menor privilégio; ajustável em Configurações → Perfis):
--   despesa.aprovar : administrador, diretor, gerente, financeiro
--   despesa.lancar  : administrador, diretor, gerente, coordenador, lider_tecnico, financeiro
-- Vale para todas as empresas (por slug do perfil). Idempotente.

INSERT INTO public.permissoes (codigo, descricao, grupo) VALUES
  ('despesa.lancar',  'Lançar despesas',            'Financeiro'),
  ('despesa.aprovar', 'Aprovar ou rejeitar despesas', 'Financeiro')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.role_permissoes (role_id, permissao)
SELECT r.id, 'despesa.aprovar'
  FROM public.roles r
 WHERE r.slug IN ('administrador', 'diretor', 'gerente', 'financeiro')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissoes (role_id, permissao)
SELECT r.id, 'despesa.lancar'
  FROM public.roles r
 WHERE r.slug IN ('administrador', 'diretor', 'gerente', 'coordenador', 'lider_tecnico', 'financeiro')
ON CONFLICT DO NOTHING;
