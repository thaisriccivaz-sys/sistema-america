const XLSX = require('./node_modules/xlsx');
const antiga = XLSX.readFile('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/antiga.xlsx');
const wsA = antiga.Sheets[antiga.SheetNames[0]];
const rowsA = XLSX.utils.sheet_to_json(wsA, { header: 1, defval: '' });

// Cross reference Load 2 vs Notas in ANTIGA to understand what L2 means
console.log('=== ANTIGA: All rows with L2 > 0 ===');
rowsA.slice(1).forEach((r, i) => {
    const load2 = parseInt(r[23]) || 0;
    if (load2 > 0) {
        const titulo = (r[7] || '').toString().trim();
        const notas = (r[35] || '').toString().replace(/\r\r\n/g, ' | ').trim();
        const load1 = parseInt(r[22]) || 0;
        const load3 = parseInt(r[24]) || 0;
        console.log(`  Row ${i+2}: L1=${load1} L2=${load2} L3=${load3} | Notas="${notas.substring(0,100)}" | T="${titulo.substring(0,50)}"`);
    }
});

console.log('\n=== ANTIGA: All rows with L3 > 0 ===');
rowsA.slice(1).forEach((r, i) => {
    const load3 = parseInt(r[24]) || 0;
    if (load3 > 0) {
        const titulo = (r[7] || '').toString().trim();
        const notas = (r[35] || '').toString().replace(/\r\r\n/g, ' | ').trim();
        const load1 = parseInt(r[22]) || 0;
        const load2 = parseInt(r[23]) || 0;
        console.log(`  Row ${i+2}: L1=${load1} L2=${load2} L3=${load3} | Notas="${notas.substring(0,100)}" | T="${titulo.substring(0,50)}"`);
    }
});

// Cross ref L1 - what products are in antiga when L1 > 0?
console.log('\n=== ANTIGA: When L1 > 1, what does notas say? ===');
let shown = 0;
rowsA.slice(1).forEach((r, i) => {
    const load1 = parseInt(r[22]) || 0;
    const notas = (r[35] || '').toString().trim();
    if (load1 > 1 && notas && shown < 8) {
        const titulo = (r[7] || '').toString().trim();
        const n = notas.replace(/\r\r\n/g, ' | ');
        console.log(`  L1=${load1} Notas="${n.substring(0,100)}" T="${titulo.substring(0,40)}"`);
        shown++;
    }
});
