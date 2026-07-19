# Plan: Melhorias na Tela de Integração

## Problema Atual / Contexto
1. A API de processos de integração está retornando erro 500 por causa de uma coluna inválida (`c.departamento_id`).
2. Os responsáveis por ações na integração (ex: Logística, Financeiro) hoje veem as ações de todo mundo e os botões atuais ("Marcar Feito") não são tão práticos.
3. Faltam alertas (e-mail e popup) para notificar os responsáveis de que um novo colaborador tem ações pendentes.
4. A administradora (thais.ricci) precisa conseguir visualizar e gerenciar tudo como se fosse a responsável master.

## User Review Required
> [!IMPORTANT]
> A exibição das ações para os usuários não-admin será filtrada **apenas** para as ações da responsabilidade deles. Você confirma que eles não devem ver as ações de outros departamentos no processo? 
> A tabela que você mencionou ("mostrar uma tabela com todas as ações...") será feita **dentro da janela de detalhes do processo de integração**. Confirmado?

## Open Questions
- Sobre o "popup avisando que um novo colaborador tem ações pendentes": Onde você prefere que esse popup apareça? Quando a pessoa faz o login e entra no sistema pela primeira vez no dia, ou na aba de Integração? (Vou colocar um popup na tela principal/dashboard por padrão).

## Proposed Changes

### Backend (`server.js`)
#### [MODIFY] `server.js`
- Corrigir a falha de SQL que causava o Erro 500, substituindo `c.departamento_id` pelo `JOIN` correto de departamento (usando o nome do departamento).
- **Envio de E-mails**: Ao gerar os passos da integração para um novo colaborador (`POST /api/integ/colaboradores`), agrupar as ações por `responsavel_user_id` e enviar um e-mail para cada um deles. O e-mail conterá a lista de ações que aquele gestor precisa fazer e a Data de Admissão do colaborador.
- Na API de listar processos (`GET /api/integracao/processos`), a % e o total de pendentes retornarão calculados de forma isolada para o usuário logado (a não ser que seja a thais.ricci/admin, que verá o total geral).
- Na API de visualizar detalhes (`GET /api/integracao/processos/:id`), filtrar as ações retornadas para que um não-admin receba apenas as ações atribuídas a ele.

### Frontend (`frontend/integracao.js` e Dashboard)
#### [MODIFY] `frontend/integracao.js`
- Alterar o visual das ações dentro do processo de integração para uma tabela, utilizando um Checkbox (`<input type="checkbox">`) ao invés do botão "Marcar Feito".
- Mostrar a % de conclusão individual na lista de processos para usuários normais, e a geral para a master.
- Verificar se o usuário logado possui ações pendentes no carregamento do sistema e disparar o Popup avisando.

#### [MODIFY] `frontend/js/app.js` (ou onde o login/dashboard é gerenciado)
- Adicionar lógica para exibir o popup (modal ou toast persistente) de "Existem ações de integração pendentes!" quando o usuário normal entrar.

## Verification Plan
### Automated Tests
- N/A
### Manual Verification
- Acessar a tela de integração como a usuária master Thais Ricci e confirmar se consigo ver todas as ações e marcá-las.
- Corrigir o erro 500, garantindo que os processos abram novamente.
- Cadastrar (ou simular o cadastro) um processo e verificar nos logs do servidor (e teste real) se o e-mail de notificação para o gestor foi disparado com sucesso e no formato de tabela.
