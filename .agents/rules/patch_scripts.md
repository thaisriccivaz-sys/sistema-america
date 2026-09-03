---
description: Regras para evitar injeções duplicadas em scripts de patch Node.js
always_on: true
---

## Validação estrita em scripts de Patch Node.js

25. **Uso seguro do `includes()` em scripts de patch:** 
    Quando escrever scripts Node.js para editar arquivos do projeto e usar `String.includes('nomeDaFuncao')` para evitar que a injeção seja feita duas vezes, **nunca busque apenas pelo nome da função** se você for injetar o nome da função no meio de uma tag HTML (ex: `onchange="nomeDaFuncao()"`).
    - O `replace()` da tag HTML pode inserir a string procurada acidentalmente no meio do arquivo.
    - Se a lógica for injetada no final do arquivo condicionalmente (`if (!js.includes('nomeDaFuncao'))`), o `includes` retornará **true** prematuramente (pois encontrou a chamada recém-inserida no HTML), e a declaração da função não será inserida, causando quebra de JS.
    - **Solução obrigatória:** Sempre verifique pela assinatura de declaração da função, não apenas pelo nome solto. Exemplo: `if (!js.includes('window.nomeDaFuncao ='))` ou `if (!js.includes('function nomeDaFuncao'))`.
