const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

async function getHomToken() {
    return new Promise((res, rej) => {
        db.get("SELECT * FROM config WHERE chave = 'sigor_hom_token'", (err, row) => {
            if(err || !row) return rej('no token');
            res(JSON.parse(row.valor).token);
        });
    });
}

(async () => {
   try {
     const t = await getHomToken();
     const r = await fetch('https://mtr-hom.cetesb.sp.gov.br/apiws/manifesto/retornaListaClasse', {
        method: 'POST', headers: { 'Authorization': t }
     });
     const d = await r.json();
     console.log(d.objetoResposta.filter(c => c.claDescricao.includes('II')));
   } catch(e) { console.error(e); }
})();
