const XLSX = require('./node_modules/xlsx');

const antiga = XLSX.readFile('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/antiga.xlsx');
const nova   = XLSX.readFile('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/Nova.xlsx');

const wsA = antiga.Sheets[antiga.SheetNames[0]];
const wsN = nova.Sheets[nova.SheetNames[0]];

const rowsA = XLSX.utils.sheet_to_json(wsA, { header: 1, defval: '' });
const rowsN = XLSX.utils.sheet_to_json(wsN, { header: 1, defval: '' });

console.log('=== ANTIGA ===');
console.log('Sheets:', antiga.SheetNames);
console.log('Total rows:', rowsA.length);
console.log('Header row (row 1):', JSON.stringify(rowsA[0]));

console.log('\n=== NOVA ===');
console.log('Sheets:', nova.SheetNames);
console.log('Total rows:', rowsN.length);
console.log('Header row (row 1):', JSON.stringify(rowsN[0]));

// Compare headers
const hA = rowsA[0] || [];
const hN = rowsN[0] || [];
console.log('\n=== DIFF HEADERS ===');
console.log('Antiga cols:', hA.length, '| Nova cols:', hN.length);
hA.forEach((h, i) => {
    if (h !== hN[i]) {
        console.log(`  Col ${i+1} (${String.fromCharCode(64 + i + 1)}): ANTIGA="${h}" | NOVA="${hN[i] || 'N/A'}"`);
    }
});
if (hN.length > hA.length) {
    for (let i = hA.length; i < hN.length; i++) {
        console.log(`  Col ${i+1} (new): NOVA="${hN[i]}"`);
    }
}

// Show key columns in first data row
console.log('\n=== AMOSTRA ROW 2 (ANTIGA) ===');
const r2A = rowsA[1] || [];
[5,6,7,8,28,29,35,36].forEach(idx => {
    console.log(`  col ${idx+1} [${String.fromCharCode(65+idx)}]: "${(r2A[idx]||'').toString().substring(0,60)}"`);
});

console.log('\n=== AMOSTRA ROW 2 (NOVA) ===');
const r2N = rowsN[1] || [];
[5,6,7,8,28,29,35,36].forEach(idx => {
    console.log(`  col ${idx+1} [${String.fromCharCode(65+idx)}]: "${(r2N[idx]||'').toString().substring(0,60)}"`);
});
