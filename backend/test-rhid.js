const axios = require('axios');
const RHID_BASE_URL = 'https://www.rhid.com.br/v2/api.svc';
const DEFAULT_EMAIL = 'thais.ricci@americarental.com.br';
const DEFAULT_PASSWORD = process.env.RHID_PASSWORD || 'g@31DOMt';

async function test() {
    try {
        const authRes = await axios.post(`${RHID_BASE_URL}/login`, {
            email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD
        });
        const token = authRes.data.accessToken;
        
        let start = 0;
        let idPerson = null;
        while (!idPerson) {
            const pessoasRes = await axios.get(`${RHID_BASE_URL}/person`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { start, length: 50 }
            });
            const records = pessoasRes.data.records;
            if (!records || records.length === 0) break;
            const p = records.find(p => String(p.cpf || '').includes('436') && String(p.cpf || '').includes('188'));
            if (p) { idPerson = p.id; break; }
            start += 50;
        }
        if (!idPerson) return console.log("Pedro n achado");
        
        const apuracaoRes = await axios.get(`${RHID_BASE_URL}/apuracao_ponto`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { dataIni: '2026-05-01', dataFinal: '2026-05-31', idPerson }
        });
        
        console.log(JSON.stringify(apuracaoRes.data, null, 2));
    } catch(e) {
        console.log(e.message);
    }
}
test();
