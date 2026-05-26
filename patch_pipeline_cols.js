const fs = require('fs');
let code = fs.readFileSync('frontend/pipeline.js', 'utf8');

const target1 = `    const total = PIPELINE_COLS.reduce((a, c) => a + (dados[c.key]||[]).length, 0);`;
const replacement1 = `    const diaSelecionado = document.getElementById('pipe-filtro-dia')?.value;
    const colunasExibidas = diaSelecionado 
        ? PIPELINE_COLS.filter(c => c.key === 'manutencao') 
        : PIPELINE_COLS;

    const total = colunasExibidas.reduce((a, c) => a + (dados[c.key]||[]).length, 0);`;

const target2 = `    \${PIPELINE_COLS.map(col => {`;
const replacement2 = `    \${colunasExibidas.map(col => {`;

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);

fs.writeFileSync('frontend/pipeline.js', code);
