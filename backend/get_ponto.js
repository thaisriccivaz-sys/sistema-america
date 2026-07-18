const axios = require('axios');
const fs = require('fs');

async function getPonto(cpf, mes, ano) {
    try {
        const res = await axios.get(`http://localhost:3000/api/diretoria/controlid/ponto-colaborador?cpf=${cpf}&mes=${mes}&ano=${ano}`);
        let raw = res.data.apuracaoRaw;
        if (typeof raw === 'string') raw = JSON.parse(raw);
        if (raw && !Array.isArray(raw) && Array.isArray(raw.records)) raw = raw.records;
        
        const faltasArr = raw.filter(d => {
            const status = (d.status || d.situacao || d.tipo || '').toString().toLowerCase();
            if (status.includes('folga') || status.includes('dsr') || status.includes('feriado') ||
                d.folga === true || d.isHoliday === 1 || d.isHoliday === true) {
                return false;
            }
            const horasUteis = d.horasUteis || d.horas_uteis || 0;
            const minutosUteis = parseInt(horasUteis) || 0;
            if (minutosUteis === 0 && (!d.diasTrabalhados || d.diasTrabalhados === 0)) {
                return false;
            }
            if (status === 'falta' || status === 'ausente' || status === '3' ||
                status.includes('falt') || status.includes('atestado') || status.includes('afastamento') || 
                status.includes('licença') || status.includes('licenca') || status.includes('justificad') || 
                (d.faltaDiaInteiro === true) || (d.faltasDiasInteiro > 0)) {
                return true;
            }
            if (d.idJustification != null && (!d.diasTrabalhados || d.diasTrabalhados === 0)) {
                if (minutosUteis > 0) return true;
            }
            return false;
        });
        console.log(`CPF: ${cpf} - Total faltas calculadas: ${res.data.faltas}`);
        console.log("Dias considerados faltas:");
        console.log(JSON.stringify(faltasArr.map(f => ({
            date: f.date,
            horasUteis: f.horasUteis,
            minutosUteis: parseInt(f.horasUteis || f.horas_uteis || 0),
            folga: f.folga,
            status: f.status,
            faltaDiaInteiro: f.faltaDiaInteiro,
            idJustification: f.idJustification,
            abreviationJustification: f.abreviationJustification
        })), null, 2));
    } catch (e) {
        console.error(e.response?.data || e.message);
    }
}

async function run() {
    await getPonto('436.188.358-09', 5, 2026); // Pedro
    await getPonto('391.087.958-60', 5, 2026); // Bruno
    await getPonto('228.556.858-42', 5, 2026); // Juliano
}
run();
