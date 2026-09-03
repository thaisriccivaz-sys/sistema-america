const fs = require('fs');
let md = fs.readFileSync('C:/Users/thais/.gemini/config/GEMINI.md', 'utf8');

const newRule = `

---

## Persistência de dados no Frontend — REGRA OBRIGATÓRIA

### O problema raiz
Funções de upload (farmácia, consignado, mercado, multas) preenchem campos via \`atualizar(idx, campo, valor)\`, mas essa função **só atualiza a memória (_dados)** — NÃO salva no banco. Se o usuário não clicar em "Salvar", os dados somem ao atualizar a página.

### Regra 21 — Auto-save obrigatório após qualquer import/upload de fechamento

Toda vez que uma função de upload/import preencher campos na tabela de fechamento, ela DEVE chamar \`salvarSilencioso()\` ao final do sucesso.

Padrão obrigatório:
\`\`\`js
async function uploadXxx(input) {
    // processar e preencher _dados via atualizar()
    _dados.forEach((row, idx) => { atualizar(idx, 'campo', valor); });
    // OBRIGATÓRIO: salvar para persistência após refresh
    salvarSilencioso();
}
\`\`\`

A função \`salvarSilencioso()\` já existe em \`fechamento.js\` e chama \`POST /api/fechamento/salvar\` silenciosamente.

### Regra 22 — Botões de olho restaurados via dados do banco

Os botões de olho (farmácia, consignado, mercado) NÃO podem depender apenas do estado de sessão. Após o \`buscar\`, verificar se há dados e mostrar os botões:

\`\`\`js
// Após renderizarTabela(_dados):
var temFarm = _dados.some(r => parseFloat(r.farmacia) > 0);
if (temFarm) document.getElementById('fech-btn-eye-farmacia').style.display = 'inline-flex';
\`\`\`

### Regra 23 — Checklist ao implementar qualquer upload no fechamento

- [ ] Upload atualiza _dados via atualizar()
- [ ] Chama salvarSilencioso() ao final do sucesso
- [ ] Botão de olho aparece com display = 'inline-flex'
- [ ] Botão de olho continua aparecendo após refresh (verificação nos _dados carregados)
- [ ] Se há tabela própria (mercado_uploads etc.), existe GET por mes/ano para recuperar
`;

md = md + newRule;
fs.writeFileSync('C:/Users/thais/.gemini/config/GEMINI.md', md, 'utf8');
console.log('Rules adicionadas. Tamanho:', md.length);
