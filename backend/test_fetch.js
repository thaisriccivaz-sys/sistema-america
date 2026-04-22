const sqlite3 = require('sqlite3').verbose();
const https = require('https');
const db = new sqlite3.Database('backend/cadastro.db');
db.get("SELECT assinafy_id FROM documentos WHERE assinafy_status = 'Assinado' AND assinafy_id IS NOT NULL LIMIT 1", (err, row) => {
    if (!row) return console.log('no doc');
    console.log('DOC_ID:', row.assinafy_id);
    const options = {
        hostname: 'api.assinafy.com.br',
        path: '/v1/documents/' + row.assinafy_id,
        method: 'GET',
        headers: { 'X-Api-Key': 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd', 'Accept': 'application/json' }
    };
    https.request(options, r => {
        let d = '';
        r.on('data', c=>d+=c);
        r.on('end', () => { console.log(d); });
    }).end();
});
