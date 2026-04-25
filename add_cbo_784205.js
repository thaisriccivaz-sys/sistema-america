const fs = require('fs');

// Adicionar CBO 784205 - Alimentador de Linha de Producao
const cboPath = 'backend/cbo.min.json';
let cbos = JSON.parse(fs.readFileSync(cboPath, 'utf8'));

const novoCBO = { code: '784205', desc: 'Alimentador de linha de produção' };
const existe = cbos.find(c => c.code === '784205');
if (!existe) {
    cbos.push(novoCBO);
    // Ordenar por código
    cbos.sort((a, b) => a.code.localeCompare(b.code));
    fs.writeFileSync(cboPath, JSON.stringify(cbos), 'utf8');
    console.log('CBO 784205 adicionado. Total:', cbos.length);
} else {
    console.log('CBO 784205 ja existe:', existe);
}
