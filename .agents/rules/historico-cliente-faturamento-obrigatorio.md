# Histórico Financeiro do Cliente (Faturamento) — Regra Obrigatória

Sempre que criarmos ou alterarmos a tela de **Faturamento (Financeiro)** ou qualquer fluxo que gere cobranças, faturas, notas fiscais, boletos, baixas ou recebimentos vinculados a clientes:

1. **Gravação obrigatória no histórico do cliente (`clientes_historico_faturamento`):**
   - Toda movimentação de faturamento (emissão de fatura/NF, geração de boleto/cobrança, pagamento/baixa total ou parcial, estorno ou cancelamento) **DEVE** registrar ou atualizar uma linha na tabela `clientes_historico_faturamento` usando o helper `registrarMovimentacaoFaturamentoCliente(dados)` em `backend/server.js`.
   - Campos obrigatórios a preencher:
     - `cliente_id` e `cliente_nome` (sempre limpo, sem emoji `💎`, `🥇`, `🥈`, `🥉`, usando `limparPrefixoGrupoCliente`);
     - `contrato_id`, `numero_contrato`, `numero_os`, `numero_nf`;
     - `tipo_lancamento` (ex.: `Fatura`, `Locação Mensal`, `Nota Fiscal`, `Boleto`, `Aditivo`, `Reembolso / Avaria`);
     - `competencia` (ex.: `2026-11` ou `11/2026`), `data_emissao`, `data_vencimento`, `data_pagamento`;
     - `valor_bruto`, `valor_desconto`, `valor_liquido`, `valor_pago`;
     - `status` (ex.: `Aberto`, `Faturado`, `Pago`, `Vencido`, `Parcial`, `Cancelado`, `Estornado`), `forma_pagamento`, `observacoes`;
     - `origem_modulo` (ex.: `financeiro_faturamento`) e `origem_registro_id` (ID único do lançamento de faturamento para permitir atualização idempotente em baixas/edições).

2. **Exibição automática no Popup de Histórico de Movimentações do Cliente:**
   - A rota `GET /api/clientes/historico-movimentacoes` já retorna `faturamentos` e os totalizadores `resumo.qtd_faturamentos`, `resumo.valor_total_faturado`, `resumo.valor_total_pago` e `resumo.valor_total_em_aberto`.
   - O popup global `window.abrirHistoricoMovimentacoesCliente({ clienteId, clienteNome, grupoCliente })` em `frontend/comercial_relatorios.js` consome essa rota e organiza os dados na **Visão Geral (Linha do Tempo)**, na aba **Faturamento** e no card **Faturamento Financeiro**.
   - Se a futura tela de Faturamento adicionar novos campos relevantes (ex.: link/chave da NF ou boleto), atualizar a rota `GET /api/clientes/historico-movimentacoes` e a aba **Faturamento** do popup para exibi-los claramente com valores em `R$`.

3. **Nome do Cliente clicável e Ícone do Grupo no Financeiro:**
   - Na tela de **Faturamento** do Financeiro, exibir o ícone do Grupo de Clientes (`💎`, `🥇`, `🥈`, `🥉`) na frente do nome via `window.formatarNomeClienteComIcone(...)` apenas na UI interna (nunca em PDFs/NFs/boletos/e-mails externos).
   - Tornar o nome do cliente clicável na listagem do Faturamento chamando `window.abrirHistoricoMovimentacoesCliente({ clienteId, clienteNome })`.

4. **Preservação de arquivos no Cloudflare R2:**
   - Nunca chamar `r2.deleteFromR2(...)` ao cancelar, estornar ou excluir um faturamento; apenas atualizar o status na tabela de faturamento e em `clientes_historico_faturamento`.
