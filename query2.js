const db = require('./backend/database');
db.all(`SELECT nome_completo, data_admissao, ferias_inicio, ferias_fim, ferias_retorno FROM colaboradores WHERE tipo_contrato LIKE '%CLT%' OR tipo_contrato IS NULL OR tipo_contrato = ''`, [], (err, rows) => {
    if (err) { console.error(err); return; }
    
    // Simula a data de hoje para o mesmo timezone local igual ao front-end
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    
    const inRed = [];
    rows.forEach(c => {
        if (!c.data_admissao) return;
        
        let admDias = 999;
        if (c.data_admissao.includes('-')) {
            const [y, m, d] = c.data_admissao.split('-');
            admDias = new Date(y, m-1, d);
        } else if (c.data_admissao.includes('/')) {
            const [d, m, y] = c.data_admissao.split('/');
            admDias = new Date(y, m-1, d);
        }
        
        if (!admDias || isNaN(admDias.getTime())) return;
        
        // Como o app.js calcula o período concessivo:
        let target = new Date(admDias);
        while (target <= hoje) {
            target.setFullYear(target.getFullYear() + 1);
        }
        
        const aquisitivoFim = new Date(target);
        aquisitivoFim.setFullYear(aquisitivoFim.getFullYear() - 1);
        
        const concessivoFim = new Date(aquisitivoFim);
        concessivoFim.setFullYear(concessivoFim.getFullYear() + 1);
        
        const diffDays = Math.ceil((concessivoFim - hoje) / (1000 * 60 * 60 * 24));
        
        const hasScheduled = !!c.ferias_inicio;
        
        // Se falta 90 dias ou menos (ou venceu) e JÁ tem férias agendadas:
        if (diffDays <= 90 && hasScheduled) {
            inRed.push({
                nome: c.nome_completo,
                concessivoFim: concessivoFim.toLocaleDateString('pt-BR'),
                diasRestantes: diffDays,
                feriasInicio: c.ferias_inicio,
                feriasFim: c.ferias_fim
            });
        }
    });

    console.log(JSON.stringify(inRed, null, 2));
});
