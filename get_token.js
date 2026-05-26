const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.get("SELECT valor FROM config WHERE chave = 'sigor_prod_token'", async (err, row) => {
    try {
        const token = row.valor;
        const r2 = await fetch('https://mtrr.cetesb.sp.gov.br/apiws/rest/retornaManifesto/260011827085', {
            method: 'GET',
            headers: { 'Authorization': token, 'Content-Type': 'application/json' }
        });
        const text = await r2.text();
        console.log('STATUS 085:', r2.status);
        console.log('TEXT 085:', text.substring(0, 500));

        const r3 = await fetch('https://mtrr.cetesb.sp.gov.br/apiws/rest/retornaManifesto/260011827081', {
            method: 'GET',
            headers: { 'Authorization': token, 'Content-Type': 'application/json' }
        });
        const text3 = await r3.text();
        console.log('STATUS 081:', r3.status);
        console.log('TEXT 081:', text3.substring(0, 500));
    } catch(e) {
        console.error(e);
    }
});
