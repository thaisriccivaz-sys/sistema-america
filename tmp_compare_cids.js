const fs = require('fs');

const systemData = JSON.parse(fs.readFileSync('./backend/cid10.min.json', 'utf8').replace(/^\uFEFF/, ''));
const systemCids = new Map(systemData.map(c => [c.code, c.desc]));

// Codes realmente faltando (subcategoria + raiz sem correspondente no sistema)
// Os 7 críticos identificados:
const criticos = ['A27.0', 'A27.8', 'A27.9', 'B55.0', 'B55.1', 'B55.2', 'B55.9'];

// Verificar se a raiz existe
criticos.forEach(c => {
  const root = c.split('.')[0];
  const rootDesc = systemCids.get(root);
  console.log(`${c}: raiz ${root} = ${rootDesc || 'NÃO EXISTE NO SISTEMA'}`);
});

console.log('\n--- Verificar se A15/A16/A18/A27/B55 existem no sistema ---');
['A15','A16','A18','A27','B55'].forEach(r => {
  const d = systemCids.get(r);
  console.log(`${r}: ${d || 'NÃO EXISTE'}`);
});
