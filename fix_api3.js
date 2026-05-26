const fs = require('fs');
const lines = fs.readFileSync('backend/server.js', 'utf8').split('\n');

const startLicencasIdx = lines.findIndex(l => l.includes("app.get('/api/licencas/:id/view'"));
if (startLicencasIdx > -1) {
    let entregasIdx = -1;
    let endOfLicencas = -1;
    for(let i=startLicencasIdx; i<lines.length; i++) {
        if(lines[i].includes('// Rota para a página de Entregas')) {
            entregasIdx = i;
        }
        if(entregasIdx > -1 && lines[i].includes('});') && lines[i-1] && lines[i-1].includes('});')) {
            endOfLicencas = i; // the last });
            break;
        }
    }
    
    // We want to extract from entregasIdx to the end of its block
    // Entregas block is:
    // // Rota para a página de Entregas
    // app.get('/api/logistica/entregas', ... {
    //     db.all(..., (err, rows) => {
    //         ...
    //     });
    // });
    // So it's 10 lines.
    const entregasEndIdx = lines.findIndex((l, i) => i > entregasIdx && l.includes('});') && lines[i-1].includes('});'));
    
    if (entregasIdx > -1 && entregasEndIdx > -1) {
        const extracted = lines.slice(entregasIdx, entregasEndIdx);
        // Remove it from current location
        lines.splice(entregasIdx, entregasEndIdx - entregasIdx);
        
        // Find function verificarLicencasVencimentoCron
        const cronIdx = lines.findIndex(l => l.includes('function verificarLicencasVencimentoCron() {'));
        
        // Insert extracted BEFORE cron
        lines.splice(cronIdx, 0, ...extracted, '');
        
        fs.writeFileSync('backend/server.js', lines.join('\n'));
        console.log('Fixed correctly.');
    }
}
