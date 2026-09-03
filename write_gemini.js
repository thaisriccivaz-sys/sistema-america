const fs = require('fs');
const content = `# Regras de Edição Cirúrgica de Código

## Antes de qualquer edição

1. **Sempre ler antes de editar.** Use \`view_file\` ou \`grep_search\` para localizar o trecho exato do arquivo antes de propor qualquer alteração. Nunca assuma o conteúdo de um arquivo.

2. **Confirmar a linha exata.** Identifique o número da linha onde a mudança será feita e mencione ela antes de editar.

3. **Pensar nos efeitos em cadeia.** Antes de aplicar a mudança, verificar se a variável, função ou estrutura modificada é usada em outros lugares do mesmo arquivo ou em arquivos relacionados.

## Durante a edição

4. **Edição mínima.** Alterar somente o trecho necessário. Nunca reescrever blocos inteiros quando apenas uma linha precisa mudar.

5. **Uma mudança por vez.** Aplicar e verificar antes de partir para a próxima. Não encadear múltiplas edições sem confirmar que a anterior foi aplicada corretamente.

6. **Verificar após editar.** Depois de cada \`replace_file_content\`, usar \`grep_search\` ou \`view_file\` para confirmar que a mudança foi aplicada exatamente como planejado.

## Em caso de erro

7. **Diagnóstico antes da correção.** Ao receber um erro (mensagem de console, stacktrace ou comportamento inesperado), primeiro localizar a origem exata no código antes de propor solução.

8. **Nunca adivinhar parâmetros.** Se não tiver certeza do valor de uma variável, constante ou parâmetro — ler o arquivo para confirmar antes de usar.

9. **Restaurar via git se o arquivo quebrar.** Se uma edição corromper o arquivo (ex: arquivo ficou vazio), usar \`git checkout <arquivo>\` para restaurar o estado do último commit antes de tentar novamente.

## Ao lidar com arquivos grandes

10. **Usar grep para localizar, view_file para confirmar.** Em arquivos com mais de 5.000 linhas, sempre usar \`grep_search\` para encontrar o ponto de interesse e depois \`view_file\` com \`StartLine\`/\`EndLine\` para ver o contexto completo ao redor.

11. **Usar scripts Node.js para substituições complexas.** Quando a substituição envolve caracteres especiais, múltiplas linhas ou risco de encoding, escrever um script \`.js\` e executá-lo com \`node\` em vez de usar \`replace_file_content\` diretamente.

---

## Segurança em SQL

12. **Contar placeholders antes de salvar.** Toda vez que houver \`db.run\`, \`db.get\` ou \`db.all\` com \`?\`, contar os \`?\` na string SQL e comparar com o número de elementos no array de parâmetros. Se não baterem, corrigir antes de continuar.

13. **Nunca omitir o WHERE id no UPDATE.** Todo \`UPDATE documentos SET ... WHERE id = ?\` deve ter o \`docId\` como último elemento do array de parâmetros.

---

## Verificação de escopo de variáveis

14. **Variável nova = verificar escopo imediatamente.** Toda vez que uma nova variável for introduzida (ex: \`bufCom\`, \`temComFlag\`), verificar com \`grep_search\` se ela é usada em outros blocos do mesmo arquivo. Se sim, garantir que está declarada em todos os escopos onde é usada.

15. **Nunca referenciar variável sem confirmar declaração.** Antes de usar qualquer variável em um bloco de código, verificar se ela foi declarada naquele escopo (não apenas em outro \`if\` ou bloco acima).

---

## Propagação de campos novos

16. **Novo campo = checklist completo.** Ao adicionar qualquer campo novo ao sistema (ex: \`comunicacao\`, \`emprestimo\`), percorrer e atualizar obrigatoriamente todos os pontos:
    - [ ] UI do frontend (input/label HTML)
    - [ ] Leitura do input no JavaScript do frontend
    - [ ] Conversão para base64 e envio no body da requisição
    - [ ] Definição do buffer no backend (\`const bufXxx = ...\`)
    - [ ] Cada bloco de merge de PDF (forcarAnexar, merge normal, criação nova)
    - [ ] Parâmetros do \`UPDATE\` ou \`INSERT\` no banco de dados
    - [ ] \`SELECT\` que retorna o campo para leituras futuras

17. **Buscar todos os blocos similares.** Quando um bloco de lógica existe em múltiplos lugares (ex: \`forcarAnexar\` e merge normal), qualquer mudança em um deve ser replicada nos demais. Usar \`grep_search\` para encontrar todos os blocos antes de editar.

---

## Checklist pré-push

18. **Antes de \`git push\`, verificar tamanho do arquivo.** Confirmar que o arquivo editado tem tamanho maior que 0 bytes. Arquivo vazio = encoding corrompeu; usar \`git checkout\` para restaurar.

19. **Antes de \`git push\`, rodar grep de sanidade.** Para cada variável nova introduzida, confirmar com \`grep_search\` que ela aparece tanto na declaração quanto no uso, e que o número de usos é o esperado.

20. **Nunca usar scripts Python para editar arquivos JS com emojis ou caracteres especiais.** Python tem problemas de encoding com surrogates. Sempre usar Node.js (\`node script.js\`) para manipular arquivos \`.js\` do projeto.
`;

fs.writeFileSync('C:/Users/thais/.gemini/config/GEMINI.md', content, 'utf8');
console.log('GEMINI.md gravado! Linhas:', content.split('\n').length);
