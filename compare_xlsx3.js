const XLSX = require('./node_modules/xlsx');
const nova = XLSX.readFile('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/Nova.xlsx');
const antiga = XLSX.readFile('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/antiga.xlsx');

const wsN = nova.Sheets[nova.SheetNames[0]];
const wsA = antiga.Sheets[antiga.SheetNames[0]];
const rowsN = XLSX.utils.sheet_to_json(wsN, { header: 1, defval: '' });
const rowsA = XLSX.utils.sheet_to_json(wsA, { header: 1, defval: '' });
const hN = rowsN[0];

// In the nova spreadsheet, look at what the Título column (col 8 = index 7) has
// vs the antiga (had emojis + notas combined via Simpliroute in col 36)
// Check "Título" (H) more carefully
console.log('=== NOVA - Título column (col 8, index 7) - first 15 rows ===');
rowsN.slice(1, 16).forEach((r, i) => {
    const titulo = (r[7] || '').toString().trim();
    const notas = (r[35] || '').toString().trim();
    console.log(`  Row ${i+2}: Título="${titulo.substring(0,80)}" | Notas="${notas.substring(0,60)}"`);
});

console.log('\n=== ANTIGA - Título vs Notas - first 10 rows with notas ===');
let shown = 0;
rowsA.slice(1).forEach((r, i) => {
    const titulo = (r[7] || '').toString().trim();
    const notas = (r[35] || '').toString().trim();
    if (notas && shown < 10) {
        console.log(`  Row ${i+2}: Título="${titulo.substring(0,60)}" | Notas="${notas.substring(0,80)}"`);
        shown++;
    }
});

// Check what _rrParseNotas does and what it expects
// From the code: notas has servico + produto lines separated by \r\r\n
// Check if Titulo in nova has that info embedded
console.log('\n=== NOVA - Checking Comentários (col 28) ===');
rowsN.slice(1, 10).forEach((r, i) => {
    const v = (r[27] || '').toString().trim();
    if (v) console.log(`  Row ${i+2}: "${v.substring(0,120)}"`);
});

console.log('\n=== NOVA - Checking Habilidades necessárias (col 34) ===');
rowsN.slice(1, 16).forEach((r, i) => {
    const v = (r[33] || '').toString().trim();
    if (v) console.log(`  Row ${i+2}: "${v.substring(0,120)}"`);
});

console.log('\n=== NOVA - Checking Habilidades adicionais (col 35) ===');
rowsN.slice(1, 16).forEach((r, i) => {
    const v = (r[34] || '').toString().trim();
    if (v) console.log(`  Row ${i+2}: "${v.substring(0,120)}"`);
});

// Check the Referência ID (col 3)
console.log('\n=== NOVA - Referência ID (col 3) - first 10 ===');
rowsN.slice(1, 11).forEach((r, i) => {
    const v = (r[2] || '').toString().trim();
    if (v) console.log(`  Row ${i+2}: "${v}"`);
});

// Check Antiga - all columns that had data in first row with notas
console.log('\n=== ANTIGA - Full first notas row ===');
for (const r of rowsA.slice(1)) {
    const notas = (r[35] || '').toString().trim();
    if (notas) {
        r.forEach((v, i) => {
            if (v !== '' && v !== null && v !== undefined) {
                console.log(`  [${i+1}] ${rowsA[0][i]}: "${v.toString().substring(0,80)}"`);
            }
        });
        break;
    }
}
