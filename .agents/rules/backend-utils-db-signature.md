# Regra Obrigatória: Utilitários do Backend (`backend/utils/*.js`) — Compatibilidade `db` / `dbAll` e Verificação de Assinaturas

Para evitar erros recorrentes nas telas do **APP › Liderança** (Candidatos, Entregas, Retiradas, Resumo da Rota) e demais rotas do backend como `TypeError: dbAll is not a function`:

## 1. Normalização Obrigatória do Parâmetro de Banco (`_wrapDb`)
Qualquer função em `backend/utils/*.js` que acesse o banco de dados **DEVE** aceitar tanto:
- A instância `db` do SQLite (`typeof db === 'object' && typeof db.all === 'function'`), quanto
- Funções promisificadas (`typeof dbAll === 'function'`).

Nunca chamar `await dbAll(...)` diretamente sobre um parâmetro sem antes normalizá-lo com `_wrapDb(dbOrFn)`:
```js
function _wrapDb(dbOrFn, secondFn) {
    if (dbOrFn && typeof dbOrFn === 'object' && typeof dbOrFn.all === 'function') {
        const db = dbOrFn;
        return {
            dbAll: (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (e, r) => e ? rej(e) : res(r || []))),
            dbGet: (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (e, r) => e ? rej(e) : res(r || null))),
            dbRun: (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function (e) { e ? rej(e) : res({ lastID: this.lastID, changes: this.changes }); }))
        };
    }
    if (typeof dbOrFn === 'function') {
        return {
            dbAll: dbOrFn,
            dbRun: typeof secondFn === 'function' ? secondFn : null,
            dbGet: async (sql, params = []) => { const r = await dbOrFn(sql, params); return Array.isArray(r) ? (r[0] || null) : (r || null); }
        };
    }
    throw new Error('Parâmetro de banco inválido');
}
```

## 2. Verificação Cruzada de Todas as Chamadas Antes do Commit
Sempre que criar ou alterar um módulo compartilhado (`backend/utils/*.js`):
1. Buscar todas as chamadas ao módulo em `backend/routes_*.js` e `backend/server.js`.
2. Confirmar que **todos os métodos chamados** estão presentes no `module.exports`.
3. Confirmar que a **quantidade e o tipo de argumentos** em cada chamada (`(db)`, `(db, req)`, `(db, data, uid)`) são suportados pela função exportada.

## 3. Smoke Test de Execução Real Antes do Push
Além de `node --check`, ao alterar qualquer arquivo em `backend/utils/*.js` ou `backend/routes_app_*.js`, executar um teste rápido em Node invocando as funções exportadas com um objeto `db` mockado (`{ all, get, run }`) para garantir que nenhuma chamada lance `TypeError: ... is not a function`.
