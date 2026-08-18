const XLSX = require('./node_modules/xlsx');
const nova = XLSX.readFile('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/Nova.xlsx');
const wsN = nova.Sheets[nova.SheetNames[0]];
const rowsN = XLSX.utils.sheet_to_json(wsN, { header: 1, defval: '' });

// Load 1 = banheiro STD
// Load 2 = ELX ou banheiro evento especial (💜 emoji in título)  
// Load 3 = PCD (banheiro acessível 🧑🏾‍🦽 emoji)
// Load 4 = ?

// Let's cross-reference emoji in title with which Load column is filled
console.log('=== MAPPING: emoji in title -> load columns ===');
rowsN.slice(1).forEach((r, i) => {
    const titulo = (r[7] || '').toString().trim();
    const load1  = parseInt(r[22]) || 0;
    const load2  = parseInt(r[23]) || 0;
    const load3  = parseInt(r[24]) || 0;
    const load4  = parseInt(r[25]) || 0;
    if (load1 || load2 || load3 || load4) {
        const hasEvento = titulo.includes('💜');
        const hasRetira = titulo.includes('⭕');
        const hasEntrega = titulo.includes('🚚') || titulo.includes('🟢');
        const hasCarret  = titulo.includes('🔗');
        const hasPCD     = titulo.includes('🦽') || titulo.includes('♿');
        const tipo = hasRetira ? 'RETIRADA' : hasEvento ? 'EVENTO' : 'OBRA';
        console.log(`  Row ${i+2}: L1=${load1} L2=${load2} L3=${load3} L4=${load4} | tipo=${tipo} | titulo="${titulo.substring(0,60)}"`);
    }
});

// Antiga: cross-ref to confirm Load columns
const antiga = XLSX.readFile('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/antiga.xlsx');
const wsA = antiga.Sheets[antiga.SheetNames[0]];
const rowsA = XLSX.utils.sheet_to_json(wsA, { header: 1, defval: '' });

console.log('\n=== ANTIGA: Load cols vs Notas ===');
let shown = 0;
rowsA.slice(1).forEach((r, i) => {
    const notas = (r[35] || '').toString().trim();
    if (notas && shown < 10) {
        const load1 = parseInt(r[22]) || 0;
        const load2 = parseInt(r[23]) || 0;
        const load3 = parseInt(r[24]) || 0;
        const load4 = parseInt(r[25]) || 0;
        const titulo = (r[7] || '').toString().trim();
        console.log(`  Row ${i+2}: L1=${load1} L2=${load2} L3=${load3} L4=${load4}`);
        console.log(`    Notas: "${notas.replace(/\r\r\n/g,'\\n').substring(0,100)}"`);
        console.log(`    Titulo: "${titulo.substring(0,60)}"`);
        shown++;
    }
});
