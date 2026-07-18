const https = require('https');
const axios = require('axios');

async function test() {
    const loginPayload = {
        login: 'integracao.america',
        password: process.env.RHID_PASSWORD || 'g@31DOMt',
    };
    try {
        const authRes = await axios.post('https://api.controlid.com.br/v1/auth/login', loginPayload);
        const jwt = authRes.data.jwt;
        
        const colabRes = await axios.get('https://api.controlid.com.br/v1/employees', {
            headers: { 'Authorization': `Bearer ${jwt}` }
        });
        
        const cpfLimpo = "43618835809"; // Pedro Henrique
        const emp = colabRes.data.employees.find(e => (e.cpf || '').replace(/\D/g, '') === cpfLimpo);
        if (!emp) return console.log("Nao achou emp");
        
        const month = "05";
        const year = "2026";
        const url = `https://api.controlid.com.br/v1/calculation/employee/${emp.id}?month=${month}&year=${year}`;
        const calcRes = await axios.get(url, { headers: { 'Authorization': `Bearer ${jwt}` } });
        
        // Log days that might be considered "faltas" under our new or old logic
        const data = calcRes.data.data;
        const faltas = data.filter(d => {
            console.log(`[${d.date || d.dateTimeStr}] Status: ${d.status||d.situacao||d.tipo}, DTrab: ${d.diasTrabalhados}, H.Uteis: ${d.horasUteis}, JustId: ${d.idJustification}, FaltasDiasInteiro: ${d.faltasDiasInteiro}`);
            return true;
        });
        
    } catch(e) {
        console.log(e.response ? e.response.data : e.message);
    }
}
test();
