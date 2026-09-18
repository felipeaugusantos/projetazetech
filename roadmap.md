# Projeta — Roadmap

## Fase 1 (concluída)
- [x] Lovable Cloud habilitado
- [x] Banco: tenants, usuarios/profiles, roles, permissoes, usuario_roles, clientes, cliente_contatos, projetos, projeto_fases, projeto_membros, tarefas, subtarefas, checklists, checklist_itens, comentarios, notificacoes, tags, auditoria
- [x] RLS por tenant + has_role/has_permission
- [x] Dados de demonstração (Projeta Tecnologia, 3 clientes, 3 projetos, fases, ~30 tarefas)
- [x] Design system "Frosted SaaS" em src/styles.css
- [x] Autenticação (/auth) + recuperação de senha
- [x] Shell (sidebar + topbar + busca + notificações + tenant)
- [x] Dashboard executivo
- [x] Meu Trabalho
- [x] Clientes (lista + detalhe)
- [x] Projetos (lista + detalhe com abas, fases, saúde)
- [x] Tarefas (Kanban + Lista + drawer com subtarefas/checklist/comentários)

- [x] Equipe, Configurações (empresa/perfis/permissões/usuários), Calendário, Horas e Financeiro (visões de Fase 1)

## Fase 2 (concluída)
- [x] Banco: apontamentos, marcos, alocacoes (+ permissões horas.apontar, alocacao.gerenciar, marco.gerenciar)
- [x] Dados de demonstração (apontamentos das últimas semanas, marcos por fase, alocações de 4 semanas)
- [x] Horas: Meu timesheet (semana), Aprovações, Consolidado
- [x] Cronograma: Gantt de fases + marcos/entregas do portfólio
- [x] Capacidade: alocação semanal por pessoa/projeto, sobrecarga, planejado x realizado
- [x] Riscos: matriz probabilidade x impacto, severidade, plano de mitigação

## Fase 3 (concluída) — orçamento, custos, alocação e horas
- [x] Banco: orcamento_itens, despesas (+ permissões despesa.lancar, despesa.aprovar)
- [x] Dados de demonstração (orçamento por projeto/fase, despesas em vários estágios)
- [x] Financeiro: Resultado (receita x custo previsto x realizado, margem por projeto)
- [x] Financeiro: Orçamento por projeto (linhas de receita/custo, custo por categoria)
- [x] Financeiro: Despesas com fluxo enviar → aprovar/rejeitar
- [x] Projeto: aba Orçamento com linhas e despesas do projeto
- [x] Horas: timesheet com envio e aprovação (Fase 2, integrado ao custo realizado)
- [x] Capacidade: alocação semanal planejada x realizada (Fase 2)

## Portal do cliente (concluído)
- [x] Acessos autorizados por cliente (`portal_acessos`), primeiro acesso com senha própria em `/acesso-cliente`
- [x] Portal em `/portal`: projetos, progresso, fases, prazos, entregas e documentos (sem custos internos)
- [x] Aprovação de entregas pelo cliente e conversa com a equipe (notifica o gerente + auditoria)
- [x] Documentos por projeto com controle de visibilidade ao cliente (aba Documentos)
- [x] Gestão de acessos na ficha do cliente (autorizar, suspender, reativar)
- [x] Pesquisa de satisfação de projetos concluídos (notas, NPS, comentário) + página interna `/satisfacao`
- [x] Relatório PDF do projeto pelo portal (progresso, fases, prazos, entregas, documentos; sem custos)
- [x] Personalização do portal por cliente (logotipo, nome e cores) com dados isolados
- [x] Link seguro e compartilhável do relatório em PDF (validade, senha, limite de aberturas, revogação e histórico de acessos)
- [x] Resumo executivo por IA do relatório compartilhado (prazos, entregas, pendências e alertas)

## Fases seguintes (não iniciar sem instrução)
- Fase 4 (restante): change requests, reuniões, automações, IA, integrações, API pública



- [x] Conversa por entrega no portal, com histórico e anexos (cliente e equipe)
- [ ] Notificações por e-mail ao cliente (aguardando domínio de envio do cliente)
- [x] Painel interno de Relatórios por projeto (progresso x prazo, pendências, entregas, tabela e exportação CSV)
- [x] Resumo executivo por IA preenchido automaticamente no PDF (portal e link compartilhado)
