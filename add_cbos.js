const fs = require('fs');
const path = require('path');

const filePath = path.join('backend', 'cbo.min.json');
let cboList = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// CBOs da família 3421 a adicionar
const novos = [
    { code: "3421-05", desc: "Agente de informações turísticas" },
    { code: "3421-10", desc: "Guia de turismo" },
    { code: "3421-15", desc: "Técnico em logística" },
    { code: "3421-20", desc: "Tecnólogo em gestão de transportes" },
    { code: "3421-25", desc: "Tecnólogo em logística de transporte" },
    { code: "3421-30", desc: "Assistente de logística" },
    { code: "3421-35", desc: "Analista de logística" },
    { code: "3421-40", desc: "Coordenador de logística" },
    { code: "3421-45", desc: "Supervisor de logística" },
];

// Verificar quais já existem
const existentes = new Set(cboList.map(c => c.code.replace(/-/g, '')));
let adicionados = 0;

novos.forEach(novo => {
    const normalizado = novo.code.replace(/-/g, '');
    if (!existentes.has(normalizado)) {
        cboList.push(novo);
        adicionados++;
        console.log(`✅ Adicionado: ${novo.code} - ${novo.desc}`);
    } else {
        console.log(`⚠️  Já existe: ${novo.code}`);
    }
});

// Ordenar por código
cboList.sort((a, b) => a.code.replace(/-/g, '').localeCompare(b.code.replace(/-/g, '')));

fs.writeFileSync(filePath, JSON.stringify(cboList));
console.log(`\n✅ Total adicionados: ${adicionados}. Total CBOs: ${cboList.length}`);
