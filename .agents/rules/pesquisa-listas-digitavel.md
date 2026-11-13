# Regra Obrigatória: Campos de Pesquisa e Listas de Seleção SEMPRE Digitáveis com Filtro em Tempo Real

Sempre que for criado ou ajustado qualquer **campo de pesquisa**, **filtro de tabela/lista** ou **lista de seleção (dropdown / select / combobox)** no sistema, ele **DEVE obrigatoriamente permitir digitação (`input` de texto ou combobox pesquisável)** e **filtrar/exibir o conteúdo imediatamente à medida que o usuário vai digitando (`oninput`)**.

## Diretrizes Obrigatórias
1. **Filtro instantâneo ao digitar (`oninput`):** Nunca exigir que o usuário aperte Enter ou clique em um botão separado para filtrar uma lista local; a cada letra digitada, os itens/linhas ou opções correspondentes já devem aparecer filtrados na hora.
2. **Normalização sem diferenciar acentos ou maiúsculas/minúsculas:** Toda busca digitável deve normalizar o texto (`normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()`) para que digitar com ou sem acento encontre o registro normalmente.
3. **Listas longas (Colaboradores, Clientes, Cursos, Equipamentos, Endereços, etc.):** Sempre usar campo digitável com filtro em tempo real (ou dropdown pesquisável) em vez de `<select>` estático sem busca.
4. **Caixa normal (`text-transform: none`):** Manter sempre a digitação em caixa normal, permitindo letras maiúsculas e minúsculas livremente.
