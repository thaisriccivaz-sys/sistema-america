const fs = require('fs');

let c = fs.readFileSync('C:/Users/thais/.gemini/config/GEMINI.md', 'utf8');

const diagnosticRule = `

---

## Diagnóstico de erros — nunca tentar às cegas

Quando o usuário relatar um erro (seja por print, descrição ou mensagem), **nunca tentar corrigir sem diagnóstico**. O fluxo obrigatório é:

### Passo 1 — Classificar o tipo de erro

Antes de qualquer coisa, identificar onde o erro está ocorrendo:

| Sintoma relatado | Tipo de erro | Onde buscar |
|---|---|---|
| Botão não faz nada / trava | Frontend JS | F12 → Console |
| Tela em branco / layout quebrado | Frontend JS/CSS | F12 → Console |
| Dados não salvam / não carregam | Backend/API | F12 → Network → Response |
| "Erro ao processar" / mensagem de erro | Backend | F12 → Network → Response + Render Logs |
| Funcionava antes, parou de funcionar | Ambos | F12 → Console + F12 → Network |

### Passo 2 — Pedir as informações certas ao usuário

Sempre orientar o usuário com instruções claras e específicas. Usar este padrão:

**Para erros visuais / botão travado:**
> "Pode abrir o F12, ir na aba **Console**, reproduzir o erro e me mandar uma foto ou o texto do erro vermelho que aparecer?"

**Para dados não salvando / requisição falhando:**
> "Pode abrir o F12, ir na aba **Network**, reproduzir a ação (clicar no botão), clicar na requisição que aparecer em vermelho e me mandar o conteúdo da aba **Response**?"

**Para erros no servidor:**
> "Pode acessar o painel do Render → seu serviço → **Logs**, reproduzir o erro e me mandar as últimas linhas que aparecerem em vermelho?"

### Passo 3 — Se ainda não for suficiente, passar um teste de console

Quando o erro não for claro, fornecer um comando copy-paste para o usuário rodar no Console do navegador (F12 → Console):

Exemplos de comandos úteis:
\`\`\`js
// Testar se uma função existe
console.log(typeof window._pmProcessarDuplo);

// Ver o conteúdo de uma variável global
console.log(window._pdfDuploBase64);

// Simular o clique no botão e capturar o erro
try { window._pmEnviar(); } catch(e) { console.error('ERRO:', e.message, e.stack); }

// Ver o que uma requisição está enviando
// (rodar antes de clicar no botão)
const _origFetch = window.fetch;
window.fetch = async (...args) => { console.log('FETCH:', args[0], args[1]?.body?.substring?.(0,500)); return _origFetch(...args); };
\`\`\`

### Passo 4 — Só então propor a correção

Com o erro exato em mãos:
1. Localizar a origem no código com \`grep_search\`
2. Confirmar o contexto com \`view_file\`
3. Aplicar a correção mínima necessária
4. Verificar após a edição

### Regra de ouro

**Nunca fazer um \`git push\` sem saber o erro exato.** Se o usuário mandou só um print sem mensagem de erro, pedir o diagnóstico antes de tentar qualquer correção. Uma tentativa às cegas cria mais bugs do que resolve.
`;

fs.writeFileSync('C:/Users/thais/.gemini/config/GEMINI.md', c + diagnosticRule, 'utf8');
console.log('Rule de diagnóstico adicionada!');
console.log('Total de caracteres:', (c + diagnosticRule).length);
