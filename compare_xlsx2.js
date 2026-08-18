const XLSX = require('./node_modules/xlsx');

const antiga = XLSX.readFile('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/antiga.xlsx');
const nova   = XLSX.readFile('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/Nova.xlsx');

const wsA = antiga.Sheets[antiga.SheetNames[0]];
const wsN = nova.Sheets[nova.SheetNames[0]];

const rowsA = XLSX.utils.sheet_to_json(wsA, { header: 1, defval: '' });
const rowsN = XLSX.utils.sheet_to_json(wsN, { header: 1, defval: '' });

const hA = rowsA[0];
const hN = rowsN[0];

// Indices (0-based) of key columns
const keyHeaders = ['Motorista','Co-pilotos','Veículo','Título','Observações','Notas'];
console.log('=== KEY COLUMN INDICES ===');
keyHeaders.forEach(h => {
    const iA = hA.indexOf(h);
    const iN = hN.indexOf(h);
    console.log(`"${h}": antiga col ${iA+1} (${String.fromCharCode(65+iA)}) | nova col ${iN+1} (${String.fromCharCode(65+iN)}) | same=${iA===iN}`);
});

// Check Notas col content - first 5 rows with something
console.log('\n=== "Notas" column (col 36) - ANTIGA first 5 non-empty ===');
let found = 0;
for (const r of rowsA.slice(1)) {
    const v = (r[35] || '').toString().trim();
    if (v && found < 5) { console.log('  >', v.substring(0,120)); found++; }
}

console.log('\n=== "Notas" column (col 36) - NOVA first 5 non-empty ===');
found = 0;
for (const r of rowsN.slice(1)) {
    const v = (r[35] || '').toString().trim();
    if (v && found < 5) { console.log('  >', v.substring(0,120)); found++; }
}

// Check Observacoes col
console.log('\n=== "Observações" column (col 29) - ANTIGA first 5 non-empty ===');
found = 0;
for (const r of rowsA.slice(1)) {
    const v = (r[28] || '').toString().trim();
    if (v && found < 5) { console.log('  >', v.substring(0,120)); found++; }
}

console.log('\n=== "Observações" column (col 29) - NOVA first 5 non-empty ===');
found = 0;
for (const r of rowsN.slice(1)) {
    const v = (r[28] || '').toString().trim();
    if (v && found < 5) { console.log('  >', v.substring(0,120)); found++; }
}

// Check Veículo col - nova
console.log('\n=== "Veículo" column (col 7) - NOVA all unique values ===');
const veicsN = new Set(rowsN.slice(1).map(r => (r[6]||'').toString().trim()).filter(Boolean));
veicsN.forEach(v => console.log(' ', v));

// Print full rows of first 3 data rows from NOVA
console.log('\n=== NOVA - first 3 data rows (all columns with values) ===');
rowsN.slice(1,4).forEach((r, ri) => {
    console.log(`\n--- Row ${ri+2} ---`);
    r.forEach((v, i) => {
        if (v !== '' && v !== null && v !== undefined) {
            console.log(`  [${i+1}] ${hN[i]}: "${v.toString().substring(0,80)}"`);
        }
    });
});
