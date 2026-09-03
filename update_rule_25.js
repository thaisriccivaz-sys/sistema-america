const fs = require('fs');
let md = fs.readFileSync('C:/Users/thais/.gemini/config/GEMINI.md', 'utf8');

const newRule = \

---

## Persistência Silenciosa — Prevenção de Falsos Positivos ao Salvar

### O problema raiz
Quando adicionamos um novo campo no frontend (ex: dias_uteis_vt no recibos.js) e enviamos no payload (fetch POST/PUT), o backend recebe o campo. PORÉM, se a **coluna não existir na tabela do banco de dados**, o backend descarta o valor silenciosamente. O usuário clica em "Salvar", não dá erro na tela, os dados parecem estar salvos, mas somem ao dar F5.

### Regra 25 — Novo campo persistente em QUALQUER tabela = 3 pontos obrigatórios

Sempre que criar um campo novo no frontend que precisa ser salvo e carregado do banco (seja recibos_historico, fechamento, etc.):

1. **Migration (Banco):** CRIAR a coluna na tabela correspondente (ex: \ALTER TABLE recibos_historico ADD COLUMN...\) no \server.js\.
2. **Payload (Backend/Frontend):** Garantir que o valor está sendo lido da interface e inserido no payload de envio (POST/PUT), e que a query no backend insere/atualiza este campo.
3. **Load (Carregamento):** Garantir que, ao carregar a página (GET), o frontend lê o valor do banco e preenche a interface ou o state (ex: \_recibosSelecoes[h.colaborador_id].diasUteisVT = h.dias_uteis_vt\).

**Checklist mental obrigatório para novos campos:**
- [ ] A coluna existe no banco?
- [ ] O frontend manda?
- [ ] O backend salva?
- [ ] O frontend carrega de volta ao dar F5?
\

md = md + newRule;
fs.writeFileSync('C:/Users/thais/.gemini/config/GEMINI.md', md, 'utf8');
console.log('Rule 25 adicionada com sucesso!');
