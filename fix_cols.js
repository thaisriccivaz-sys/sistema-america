const fs = require('fs');
let f = fs.readFileSync('frontend/testes_candidatos.js', 'utf8');

const start = f.indexOf('const COLUNAS = [');
const end = f.indexOf('];', start) + 2;

if (start > -1 && end > -1) {
    const newColunas = \const COLUNAS = [
        { id: "Entrevistas",       cor: "#6366f1", icone: "ph-users" },
        { id: "Aguardando Data",   cor: "#f59e0b", icone: "ph-calendar-blank" },
        { id: "Respondido",        cor: "#8b5cf6", icone: "ph-check-square-offset" },
        { id: "Dias de Teste",     cor: "#3b82f6", icone: "ph-calendar-check" },
        { id: "Teste Finalizado",  cor: "#14b8a6", icone: "ph-flag-checkered" }
    ];\;
    f = f.substring(0, start) + newColunas + f.substring(end);
    fs.writeFileSync('frontend/testes_candidatos.js', f, 'utf8');
    console.log('Columns replaced.');
} else {
    console.log('Could not find COLUNAS array');
}
