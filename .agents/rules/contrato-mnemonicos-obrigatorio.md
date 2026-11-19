---
trigger: always_on
---

# Regra Obrigatória — Mnemônicos de Campos do Contrato na Tela de Modelos de Contratos

Sempre que um **novo campo** for criado ou alterado na tela de **Contrato** (`Comercial → Contratos`), ou nas entidades vinculadas ao contrato (Cliente, Contato, Interveniente, Endereço de Instalação, Produtos, Serviços, Condições de Pagamento, Período, Valores):

1. **Incluir obrigatoriamente um mnemônico (`{{NOME_DO_CAMPO}}`)** correspondente a esse campo no catálogo de mnemônicos `window.CONTRATO_MNEMONICOS_CATALOGO` da tela **`Comercial → Administração → Modelos de Contratos`** (`frontend/proposta.js`), permitindo que o usuário clique no mnemônico para adicioná-lo ao texto do modelo de contrato.
2. **Atualizar obrigatoriamente o resolvedor de mnemônicos (`window.resolverTextoModeloContrato`)** em `frontend/proposta.js` para substituir `{{NOME_DO_CAMPO}}` pelo valor real do campo ao visualizar ou imprimir o contrato / enviar para assinatura.
3. **Respeitar a regra de documentos externos:** Nunca incluir o emoji do Grupo de Clientes (`💎`, `🥇`, `🥈`, `🥉`) nos valores resolvidos pelos mnemônicos do contrato (usar sempre `window.limparPrefixoGrupoCliente(...)`).
