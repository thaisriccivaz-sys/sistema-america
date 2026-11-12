# Regra Obrigatória: Campos em Caixa Normal / Baixa (Permissão de Letras Minúsculas)

Todos os campos de digitação (`input`, `textarea`, `select`, `option`) e textos exibidos/gerados no sistema **DEVEM** permitir letras minúsculas e maiúsculas normalmente (`text-transform: none`).

## Diretrizes Obrigatórias
1. **Nunca forçar caixa alta (`uppercase`) por padrão:** Não aplicar `text-transform: uppercase` em `input`, `textarea` ou `select`, nem converter o valor digitado com `.toUpperCase()`.
2. **Exceção somente sob pedido explícito:** Só aplicar caixa alta em um campo se o usuário pedir explicitamente na especificação daquela tela/campo específico.
