const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.get("SELECT valor FROM config_sistema WHERE chave = 'sigor_prod_senha'", async (err, row) => {
    try {
        const r1 = await fetch('https://mtrr.cetesb.sp.gov.br/apiws/rest/gettoken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpfCnpj: '38058722839', senha: row.valor, unidade: '19201' })
        });
        const d1 = await r1.json();
        const token = d1.objetoResposta;

        const r2 = await fetch('https://mtrr.cetesb.sp.gov.br/apiws/rest/retornaManifesto/260011827085', {
            method: 'GET',
            headers: { 'Authorization': token, 'Content-Type': 'application/json' }
        });
        const d2 = await r2.json();
        console.log(d2.objetoResposta ? d2.objetoResposta.situacaoManifesto : d2);
    } catch(e) {
        console.error(e);
    }
});
