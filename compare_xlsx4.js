const XLSX = require('./node_modules/xlsx');
const nova = XLSX.readFile('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/Nova.xlsx');
const wsN = nova.Sheets[nova.SheetNames[0]];
const rowsN = XLSX.utils.sheet_to_json(wsN, { header: 1, defval: '' });

// What data might encode service type in the new spreadsheet?
// In antiga: notas had "MANUTENCAO OBRA\r\r\n1 STD OBRA\r\r\n1X - SEX"
// In nova: Titulo has emojis that indicate type, col "Load" (col 23, index 22) has qty
// Let's study: Titulo emojis, col 23 Load, col 24 Load2...

console.log('=== NOVA: Título emojis + Load cols ===');
rowsN.slice(1).forEach((r, i) => {
    const titulo = (r[7] || '').toString().trim();
    const load1  = (r[22] || '').toString().trim();  // Load
    const load2  = (r[23] || '').toString().trim();  // Load 2
    const load3  = (r[24] || '').toString().trim();  // Load 3
    const load4  = (r[25] || '').toString().trim();  // Load 4
    console.log(`  Row ${i+2}: T="${titulo.substring(0,60)}" | L1=${load1} L2=${load2} L3=${load3} L4=${load4}`);
});

// Also check Referência ID (col 3 = index 2)
// It might be the OS number from the Pipeline, which could have product info via API
console.log('\n=== NOVA: ref IDs ===');
rowsN.slice(1,6).forEach((r,i) => console.log(`  Row ${i+2}: ref="${r[2]}" titulo="${(r[7]||'').substring(0,60)}"`));
