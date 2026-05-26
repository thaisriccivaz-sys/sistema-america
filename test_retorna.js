const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

const SIGOR_CFG = {
  api: 'https://mtr.cetesb.sp.gov.br/apiws/manifesto',
};

async function sigorGetToken() {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM config WHERE chave = ?', ['sigor_token'], (err, row) => {
      if (err || !row) return reject(new Error('Token SIGOR não configurado'));
      const val = JSON.parse(row.valor);
      resolve(val.token);
    });
  });
}

async function sigorReq(path, method = 'GET', body = null) {
  const token = await sigorGetToken();
  const opts = { method, headers: { 'Authorization': token, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(SIGOR_CFG.api + path, opts);
  return resp.json();
}

(async () => {
    try {
        console.log('Fetching...');
        const res = await sigorReq('/retornaManifesto/260011827085');
        console.log('Result:', JSON.stringify(res, null, 2));
    } catch(e) {
        console.error('Error:', e);
    }
})();
