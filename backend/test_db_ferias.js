const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT id, nome_completo as nome, status, data_admissao, ferias_programadas_inicio FROM colaboradores WHERE status IN ('Ativo', 'Férias')", [], (err, rows) => {
    console.log(rows);
    
    // Simulate feriasVencendo logic
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const res = rows.map(r => {
        let adm = r.data_admissao;
        let admDias;
        if (adm && adm.includes('/')) {
            const pts = adm.split('/');
            if(pts.length===3) admDias = new Date(`${pts[2]}-${pts[1]}-${pts[0]}T12:00:00`);
        } else if (adm) {
            admDias = new Date(adm + 'T12:00:00');
        }
        if(!admDias || isNaN(admDias.getTime())) return null;
        
        let target = new Date(admDias);
        while (target <= today) {
            target.setFullYear(target.getFullYear() + 1);
        }
        
        const aquisitivoFim = new Date(target);
        aquisitivoFim.setFullYear(aquisitivoFim.getFullYear() - 1);
        
        const concessivoEnd = new Date(aquisitivoFim);
        concessivoEnd.setFullYear(concessivoEnd.getFullYear() + 1);
        
        let feriasValidasAtual = false;
        if (r.ferias_programadas_inicio) {
            let dStr = r.ferias_programadas_inicio;
            let dataAgendada;
            if (dStr.includes('/')) {
                const p = dStr.split('/');
                if(p.length===3) dataAgendada = new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00`);
            } else {
                dataAgendada = new Date(dStr + 'T12:00:00');
            }
            if (dataAgendada && !isNaN(dataAgendada) && dataAgendada >= aquisitivoFim) {
                feriasValidasAtual = true;
            }
        }
        
        const diffDays = Math.ceil((concessivoEnd - today) / (1000 * 60 * 60 * 24));
        return {
            id: r.id, 
            nome: r.nome,
            status: r.status,
            admissao: adm,
            aquisitivoFim: aquisitivoFim.toISOString().split('T')[0],
            concessivoEnd: concessivoEnd.toISOString().split('T')[0],
            diasRestantes: diffDays,
            feriasValidasAtual: feriasValidasAtual
        };
    }).filter(x => x !== null);
    
    console.log("\nSimulação (só quem está Ativo e faltaria <90 dias sem férias atual):");
    console.log(res.filter(r => r.status === 'Ativo' && r.diasRestantes >= 0 && r.diasRestantes <= 90 && !r.feriasValidasAtual));
});
