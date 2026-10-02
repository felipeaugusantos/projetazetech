# Projeta - Gestão de Projetos

Crie um sistema SaaS completo de Gestão de Projetos voltado para pequenas e médias empresas prestadoras de serviço.

Nome provisório do sistema: **Enzova Projects**.

O sistema deve combinar:

* gestão de clientes;
* gestão de projetos;
* tarefas e subtarefas;
* equipes;
* apontamento de horas;
* custos;
* documentos;
* comunicação;
* portal do cliente;
* indicadores;
* financeiro básico;
* acompanhamento de prazo;
* histórico;
* auditoria.

O principal objetivo do sistema não deve ser apenas gerenciar tarefas.

O sistema deverá controlar o fluxo completo:

Lead/Cliente → Projeto → Planejamento → Tarefas → Execução → Validação → Entrega → Aceite → Financeiro.

O sistema deve ser simples de utilizar, profissional, responsivo, multiempresa e preparado para crescimento.

---

# 1. Público-alvo

O sistema deverá ser preparado principalmente para empresas como:

* software houses;
* empresas de tecnologia;
* consultorias;
* agências de marketing;
* escritórios;
* empresas de engenharia;
* empresas de instalação;
* prestadores de serviço;
* empresas de manutenção;
* equipes internas de projetos.

A arquitetura deve ser flexível o suficiente para atender diferentes segmentos sem customizações profundas.

---

# 2. Arquitetura SaaS

O sistema deverá ser multi-tenant.

Cada empresa deve possuir seus próprios:

* usuários;
* clientes;
* projetos;
* equipes;
* documentos;
* dados financeiros;
* configurações.

Nenhum tenant poderá visualizar informações de outro tenant.

As entidades principais devem utilizar:

tenant_id

Quando aplicável:

empresa_id

Criar estrutura preparada para:

* múltiplas empresas;
* múltiplos departamentos;
* múltiplas equipes;
* múltiplos projetos;
* múltiplos clientes.

---

# 3. Autenticação

Criar autenticação segura.

Funcionalidades:

* login;
* logout;
* recuperação de senha;
* redefinição de senha;
* troca de senha;
* convite de usuários;
* ativação/desativação de usuários.

Preparar arquitetura para MFA futuramente.

---

# 4. Perfis e permissões

Criar sistema RBAC.

Perfis iniciais:

* Administrador;
* Diretor;
* Gerente de Projetos;
* Coordenador;
* Líder Técnico;
* Colaborador;
* Financeiro;
* Comercial;
* Cliente.

Permissões deverão ser configuráveis.

Exemplos:

* visualizar projeto;
* criar projeto;
* editar projeto;
* excluir projeto;
* criar tarefa;
* alterar prazo;
* alterar responsável;
* alterar orçamento;
* visualizar financeiro;
* aprovar horas;
* aprovar projeto;
* acessar relatórios.

Não utilizar apenas controle visual.

As permissões devem ser aplicadas também no backend.

---

# 5. Dashboard principal

Criar dashboard executivo.

Mostrar:

* projetos ativos;
* projetos atrasados;
* projetos em risco;
* projetos concluídos;
* tarefas abertas;
* tarefas atrasadas;
* tarefas concluídas;
* horas planejadas;
* horas realizadas;
* custo planejado;
* custo realizado;
* faturamento previsto;
* faturamento realizado.

Mostrar gráficos:

* projetos por status;
* tarefas por status;
* tarefas por responsável;
* horas por projeto;
* produtividade por equipe;
* projetos atrasados;
* evolução do projeto;
* orçamento planejado x realizado.

Criar filtros por:

* período;
* cliente;
* projeto;
* equipe;
* responsável;
* status.

---

# 6. Cadastro de clientes

Criar cadastro completo de clientes.

Tipos:

* Pessoa Física;
* Pessoa Jurídica.

Campos:

* nome;
* razão social;
* nome fantasia;
* CPF;
* CNPJ;
* telefone;
* WhatsApp;
* e-mail;
* endereço;
* responsável;
* observações.

Criar histórico do cliente.

Mostrar:

* projetos;
* contatos;
* documentos;
* propostas;
* horas trabalhadas;
* faturamento;
* pendências.

---

# 7. Contatos do cliente

Permitir vários contatos por cliente.

Campos:

* nome;
* cargo;
* telefone;
* WhatsApp;
* e-mail;
* departamento.

Marcar:

* contato principal;
* financeiro;
* técnico;
* responsável pelo projeto.

---

# 8. Cadastro de projetos

Criar cadastro completo.

Campos:

* código;
* nome;
* descrição;
* cliente;
* gerente responsável;
* equipe;
* prioridade;
* data de início;
* prazo;
* data prevista de conclusão;
* data real de conclusão;
* orçamento;
* horas previstas;
* status;
* progresso.

Status:

* Planejamento;
* Aguardando início;
* Em andamento;
* Pausado;
* Em validação;
* Em risco;
* Concluído;
* Cancelado.

---

# 9. Saúde do projeto

Criar indicador automático de saúde.

Exemplos:

* Saudável;
* Atenção;
* Em risco;
* Crítico.

Calcular com base em:

* tarefas atrasadas;
* prazo consumido;
* tarefas concluídas;
* horas utilizadas;
* orçamento consumido;
* dependências atrasadas.

Exemplo:

Projeto XPTO

Prazo consumido:
72%.

Tarefas concluídas:
43%.

Tarefas atrasadas:
8.

Horas utilizadas:
88%.

Status calculado:
Em risco.

Mostrar os motivos.

---

# 10. Fases do projeto

Cada projeto poderá possuir fases.

Exemplos:

* Levantamento;
* Planejamento;
* Desenvolvimento;
* Testes;
* Homologação;
* Implantação;
* Treinamento;
* Encerramento.

Cada fase deverá possuir:

* responsável;
* prazo;
* descrição;
* progresso;
* status.

---

# 11. Templates de projetos

Criar modelos reutilizáveis.

Exemplo:

Template:

Implantação de sistema.

Criar automaticamente:

1. Levantamento.
2. Preparação.
3. Configuração.
4. Migração.
5. Testes.
6. Homologação.
7. Implantação.
8. Treinamento.

Cada template poderá possuir:

* fases;
* tarefas;
* subtarefas;
* responsáveis padrão;
* duração estimada;
* dependências.

---

# 12. Tarefas

Criar módulo completo de tarefas.

Campos:

* título;
* descrição;
* projeto;
* fase;
* responsável;
* participantes;
* prioridade;
* prazo;
* início;
* estimativa de horas;
* horas realizadas;
* status;
* tags.

Status:

* Backlog;
* A Fazer;
* Em andamento;
* Bloqueada;
* Em validação;
* Concluída;
* Cancelada.

---

# 13. Subtarefas

Uma tarefa poderá possuir subtarefas.

Cada subtarefa deve possuir:

* título;
* responsável;
* prazo;
* status;
* estimativa.

O progresso da tarefa poderá ser calculado pelas subtarefas.

---

# 14. Checklist

Permitir checklist dentro da tarefa.

Exemplo:

Tarefa:
Implantar ambiente.

Checklist:

* Banco criado.
* Usuário criado.
* Backup realizado.
* Deploy realizado.
* Teste de acesso.
* Homologação.

---

# 15. Dependências

Permitir dependências.

Exemplo:

Tarefa B não pode iniciar enquanto Tarefa A não estiver concluída.

Tipos:

* depende de;
* bloqueia;
* relacionada.

Mostrar alerta quando houver dependência atrasada.

---

# 16. Kanban

Criar visão Kanban.

Colunas:

Backlog.

A Fazer.

Em andamento.

Bloqueada.

Validação.

Concluída.

Permitir:

* drag and drop;
* filtros;
* responsável;
* prioridade;
* projeto;
* tags.

---

# 17. Lista

Criar visualização em tabela.

Colunas:

* tarefa;
* projeto;
* responsável;
* prioridade;
* status;
* início;
* prazo;
* horas previstas;
* horas realizadas.

Permitir personalizar colunas.

---

# 18. Cronograma / Gantt

Criar visão de cronograma.

Mostrar:

* projetos;
* fases;
* tarefas;
* dependências;
* início;
* fim;
* duração.

Permitir zoom:

* dia;
* semana;
* mês.

Mostrar tarefas atrasadas.

---

# 19. Calendário

Criar calendário.

Mostrar:

* início de tarefa;
* prazo;
* reuniões;
* entregas;
* marcos.

Visualizações:

* mensal;
* semanal;
* diária.

---

# 20. Marcos do projeto

Criar milestones.

Exemplos:

* Kickoff;
* Homologação;
* Go Live;
* Aceite;
* Encerramento.

Campos:

* nome;
* descrição;
* data;
* responsável;
* status.

---

# 21. Comentários

Cada projeto e tarefa deverá aceitar comentários.

Permitir:

* texto;
* menções;
* anexos;
* histórico.

Exemplo:

@Felipe verificar integração antes da homologação.

Criar notificações por menção.

---

# 22. Anexos

Permitir anexar arquivos.

Tipos:

* PDF;
* imagem;
* documento;
* planilha;
* arquivo compactado.

Registrar:

* usuário;
* data;
* versão;
* projeto;
* tarefa.

Não sobrescrever arquivos sem histórico.

---

# 23. Documentos

Criar módulo de documentos.

Estrutura:

Cliente → Projeto → Pasta → Documento.

Permitir:

* organização por pasta;
* upload;
* download;
* versão;
* descrição;
* tags.

---

# 24. Gestão de horas

Criar apontamento de horas.

Campos:

* projeto;
* tarefa;
* usuário;
* data;
* horas;
* descrição;
* faturável;
* não faturável.

Exemplo:

Projeto:
ERP Cliente ABC.

Tarefa:
Integração API.

Usuário:
João.

Horas:
3h30.

---

# 25. Timesheet

Criar tela semanal.

Exemplo:

Segunda:
7h30.

Terça:
8h.

Quarta:
7h.

Total:
22h30.

Permitir aprovação por gestor.

Status:

* Rascunho;
* Enviado;
* Aprovado;
* Rejeitado.

---

# 26. Capacidade da equipe

Criar módulo de capacidade.

Exemplo:

Felipe

Capacidade semanal:
40h.

Alocado:
38h.

Disponível:
2h.

Mostrar:

* subalocado;
* normal;
* sobrecarregado.

Criar visão semanal e mensal.

---

# 27. Alocação de recursos

Permitir alocar colaboradores em projetos.

Campos:

* projeto;
* usuário;
* início;
* fim;
* percentual de alocação;
* horas semanais.

Exemplo:

Projeto A:
50%.

Projeto B:
30%.

Projeto C:
20%.

---

# 28. Custos

Cada usuário poderá possuir custo/hora.

Exemplo:

Usuário:
João.

Custo/hora:
R$ 65.

Se trabalhar 10h:

Custo:
R$ 650.

Calcular custo real por projeto.

---

# 29. Orçamento do projeto

Campos:

* orçamento previsto;
* custo previsto;
* receita prevista;
* horas previstas.

Comparar:

Planejado x Realizado.

Exemplo:

Orçamento:
R$ 50.000.

Custo previsto:
R$ 25.000.

Custo realizado:
R$ 28.500.

Margem prevista:
R$ 25.000.

Margem atual:
R$ 21.500.

---

# 30. Financeiro básico

Criar estrutura simples.

Permitir:

* valor do projeto;
* parcelas;
* vencimentos;
* recebimentos;
* despesas;
* custos.

Não implementar contabilidade completa.

Preparar integração futura com sistemas financeiros.

---

# 31. Portal do cliente

Criar acesso específico para cliente.

O cliente poderá visualizar apenas projetos autorizados.

Mostrar:

* progresso;
* fases;
* prazo;
* entregas;
* documentos;
* pendências;
* marcos.

Não mostrar:

* custos internos;
* salário;
* custo/hora;
* comentários internos;
* margem.

---

# 32. Aprovação do cliente

Permitir enviar entregáveis para aceite.

Fluxo:

Entrega → Aguardando aprovação → Aprovado / Reprovado.

Campos:

* descrição;
* arquivo;
* data;
* responsável;
* comentário do cliente.

Registrar aceite.

---

# 33. Solicitação de alteração

Cliente poderá solicitar alteração.

Criar Change Request.

Campos:

* projeto;
* descrição;
* motivo;
* solicitante;
* impacto;
* horas estimadas;
* custo;
* prazo adicional;
* status.

Status:

* Solicitado;
* Em análise;
* Aprovado;
* Rejeitado;
* Em execução;
* Concluído.

---

# 34. Riscos

Criar registro de riscos.

Campos:

* descrição;
* probabilidade;
* impacto;
* responsável;
* plano de mitigação;
* status.

Classificação:

* Baixo;
* Médio;
* Alto;
* Crítico.

---

# 35. Impedimentos

Criar registro de impedimentos.

Exemplo:

Ambiente do cliente indisponível.

Campos:

* descrição;
* projeto;
* responsável;
* data;
* impacto;
* status;
* solução.

---

# 36. Reuniões

Criar registro de reuniões.

Campos:

* projeto;
* título;
* data;
* participantes;
* pauta;
* ata;
* decisões;
* pendências.

Permitir criar tarefas a partir de uma decisão da reunião.

---

# 37. Histórico

Criar timeline completa.

Exemplo:

08:10 Projeto criado.

09:15 João foi adicionado.

10:30 Prazo alterado.

14:20 Tarefa concluída.

16:05 Documento anexado.

Registrar alterações importantes.

---

# 38. Auditoria

Auditar:

* projetos;
* tarefas;
* prazos;
* responsáveis;
* custos;
* orçamento;
* permissões;
* aprovações.

Registrar:

* usuário;
* data;
* hora;
* valor anterior;
* valor novo.

---

# 39. Notificações

Criar central de notificações.

Notificar:

* tarefa atribuída;
* prazo próximo;
* tarefa atrasada;
* menção;
* mudança de status;
* comentário;
* aprovação;
* rejeição;
* projeto em risco.

---

# 40. Preferências de notificação

Permitir configurar:

* dentro do sistema;
* e-mail futuramente;
* WhatsApp futuramente.

Não implementar integrações externas inicialmente.

---

# 41. Busca global

Criar busca no topo.

Pesquisar:

* projeto;
* cliente;
* tarefa;
* usuário;
* documento;
* código.

---

# 42. Indicadores do projeto

Mostrar:

* percentual concluído;
* tarefas totais;
* tarefas concluídas;
* tarefas atrasadas;
* horas previstas;
* horas realizadas;
* orçamento;
* custo;
* margem;
* dias restantes.

---

# 43. Relatórios

Criar relatórios:

## Projetos

* por cliente;
* por status;
* por gerente;
* por período;
* atrasados;
* em risco.

## Tarefas

* por responsável;
* por projeto;
* atrasadas;
* concluídas.

## Horas

* por colaborador;
* por projeto;
* faturáveis;
* não faturáveis.

## Financeiro

* receita por projeto;
* custo por projeto;
* margem;
* previsto x realizado.

## Equipe

* carga;
* capacidade;
* horas;
* produtividade.

---

# 44. Dashboard individual

Cada usuário deverá possuir "Meu Trabalho".

Mostrar:

* tarefas de hoje;
* tarefas atrasadas;
* próximas tarefas;
* projetos;
* horas da semana;
* notificações.

---

# 45. Favoritos

Permitir favoritar:

* projetos;
* clientes;
* tarefas.

Criar acesso rápido.

---

# 46. Tags

Criar tags configuráveis.

Exemplos:

* Urgente.
* Cliente.
* Bug.
* Implantação.
* Desenvolvimento.
* Suporte.

---

# 47. Prioridade

Prioridades:

* Baixa;
* Normal;
* Alta;
* Urgente.

Utilizar padrão visual consistente.

---

# 48. Automação

Criar estrutura para automações por regra.

Exemplos futuros:

SE tarefa ficar atrasada

ENTÃO notificar gerente.

SE projeto atingir 80% do prazo e menos de 60% das tarefas estiverem concluídas

ENTÃO marcar projeto "Em risco".

SE todas as tarefas de uma fase forem concluídas

ENTÃO concluir fase automaticamente.

Inicialmente implementar apenas algumas regras internas.

Não criar construtor avançado de automações nesta fase.

---

# 49. IA — preparar, não implementar

Deixar arquitetura preparada para IA futura.

Possibilidades:

* gerar plano de projeto;
* criar tarefas;
* resumir projeto;
* analisar risco;
* analisar produtividade;
* gerar ata de reunião;
* resumir comentários.

Não conectar IA externa inicialmente.

---

# 50. Templates com IA futura

Preparar cenário:

Usuário informa:

"Implantação de ERP com prazo de 60 dias."

Futuramente a IA poderá sugerir:

* fases;
* tarefas;
* prazos;
* riscos;
* responsáveis.

Não implementar agora.

---

# 51. Interface

Criar interface moderna de SaaS B2B.

Menu lateral:

Dashboard.

Meu Trabalho.

Clientes.

Projetos.

Tarefas.

Calendário.

Equipe.

Horas.

Documentos.

Financeiro.

Relatórios.

Configurações.

No topo:

* busca;
* notificações;
* tenant;
* usuário.

---

# 52. Página de projeto

A página do projeto deverá possuir abas:

Visão Geral.

Tarefas.

Cronograma.

Equipe.

Horas.

Custos.

Documentos.

Riscos.

Reuniões.

Histórico.

Cliente.

---

# 53. Visualização geral do projeto

Mostrar:

Nome.

Cliente.

Gerente.

Prazo.

Progresso.

Saúde.

Horas.

Orçamento.

Equipe.

Próximos marcos.

Tarefas atrasadas.

Riscos.

---

# 54. UX

O sistema deve ser simples.

Evitar formulários gigantes.

Utilizar:

* abas;
* modais;
* drawers;
* atalhos;
* filtros;
* busca.

Manter consistência.

Sempre mostrar feedback visual.

Exemplo:

"Projeto criado com sucesso."

"Não foi possível salvar."

---

# 55. Responsividade

Desktop deverá ser prioridade.

Também adaptar para:

* notebook;
* tablet;
* celular.

No celular priorizar:

* minhas tarefas;
* apontamento de horas;
* comentários;
* notificações;
* aprovação.

---

# 56. Banco de dados

Criar estrutura relacional.

Principais tabelas:

tenants

empresas

usuarios

roles

permissoes

usuario_roles

clientes

cliente_contatos

projetos

projeto_fases

projeto_membros

templates_projeto

template_fases

tarefas

subtarefas

checklists

checklist_itens

dependencias

comentarios

anexos

documentos

timesheets

apontamentos_horas

alocacoes

custos_usuario

projeto_orcamentos

projeto_financeiro

milestones

aprovacoes

change_requests

riscos

impedimentos

reunioes

reuniao_participantes

notificacoes

auditoria

tags

Todos os registros operacionais devem estar vinculados ao tenant_id.

Criar foreign keys.

Criar índices.

Evitar dados órfãos.

---

# 57. Exclusão de dados

Evitar exclusão física de registros importantes.

Utilizar:

deleted_at

ou:

ativo.

Projetos concluídos não devem ser excluídos.

Tarefas importantes não devem desaparecer do histórico.

Apontamentos de horas aprovados não devem ser excluídos.

---

# 58. Segurança

Implementar isolamento real entre tenants.

Validar tenant no backend.

Não aceitar tenant_id enviado pelo frontend sem validação.

Não expor:

* custo/hora;
* margem;
* financeiro;
* dados internos;

para usuários sem permissão.

---

# 59. Dados de demonstração

Criar tenant fictício:

Enzova Tecnologia.

Criar clientes fictícios:

* Empresa Alpha.
* Construtora Beta.
* Grupo Ômega.

Criar projetos:

## Projeto 1

Implantação ERP Alpha.

Status:
Em andamento.

Fases:

* Levantamento.
* Desenvolvimento.
* Testes.
* Homologação.
* Implantação.

## Projeto 2

Portal Cliente Beta.

Status:
Planejamento.

## Projeto 3

Integração API Ômega.

Status:
Em risco.

Criar aproximadamente:

* 5 usuários;
* 3 clientes;
* 3 projetos;
* 5 fases por projeto;
* 30 tarefas;
* comentários;
* horas apontadas;
* documentos;
* riscos.

O dashboard deve funcionar com esses dados.

---

# 60. MVP

Não implementar tudo de uma única vez.

FASE 1 deve conter somente:

1. Autenticação.
2. Multi-tenant.
3. Empresas.
4. Usuários.
5. Perfis.
6. Permissões.
7. Clientes.
8. Projetos.
9. Fases.
10. Tarefas.
11. Subtarefas.
12. Checklist.
13. Kanban.
14. Lista.
15. Comentários.
16. Dashboard.
17. Meu Trabalho.
18. Notificações básicas.

Não implementar inicialmente:

* financeiro completo;
* IA;
* integrações;
* WhatsApp;
* cobrança SaaS;
* Gantt avançado;
* automações complexas;
* portal do cliente completo.

Deixar arquitetura preparada.

---

# 61. Segunda fase

Após conclusão da Fase 1:

Implementar:

* apontamento de horas;
* timesheet;
* capacidade da equipe;
* custos;
* alocação;
* cronograma;
* milestones;
* riscos.

---

# 62. Terceira fase

Depois implementar:

* portal do cliente;
* aprovações;
* Change Requests;
* documentos;
* reuniões;
* financeiro do projeto.

---

# 63. Quarta fase

Posteriormente:

* automações;
* IA;
* integrações;
* dashboards avançados;
* API pública;
* webhooks.

---

# 64. Regra de desenvolvimento

Antes de implementar qualquer nova funcionalidade:

1. verificar o código existente;
2. verificar banco atual;
3. identificar funcionalidades existentes;
4. não duplicar tabelas;
5. não recriar componentes desnecessariamente;
6. preservar funcionalidades funcionando;
7. manter compatibilidade;
8. documentar alterações importantes.

---

# 65. Primeiro objetivo do Lovable

Comece implementando somente:

* arquitetura visual;
* autenticação;
* multi-tenant;
* estrutura de permissões;
* dashboard;
* clientes;
* projetos;
* fases;
* tarefas;
* subtarefas;
* checklist;
* Kanban;
* Meu Trabalho.

Criar dados fictícios para demonstração.

Após concluir esta etapa, apresente:

* telas criadas;
* tabelas criadas;
* fluxo implementado;
* funcionalidades pendentes;
* possíveis riscos técnicos.

Não iniciar automaticamente as próximas fases sem nova instrução.

O sistema deve parecer uma plataforma profissional de gestão de projetos desde a primeira versão.

Evitar aparência de simples CRUD ou clone básico de Trello.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://projetazetech.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8ddf9bdb-caf8-438c-919d-3360231d72d1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
