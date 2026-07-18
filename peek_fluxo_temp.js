/**
 * Peek at FLUXO DE CAIXA sheet structure across several DRE files
 */
const XLSX = require('xlsx');
const path = require('path');

const DIR = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Financeiro';

const FILES_TO_PEEK = [
  'DRE 01-2026.xlsx',
  'DRE 01-2025.xlsx',
  'DRE 05-2026.xlsx',
  'DRE 12-2025.xlsx',
  'DRE 01-2024.xlsx',
  'DRE - 04-2024.xlsx',
];

for (const fname of FILES_TO_PEEK) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`FILE: ${fname}`);
  console.log(`${'═'.repeat(70)}`);
  const wb = XLSX.readFile(path.join(DIR, fname), { cellNF: false, cellStyles: false });
  console.log('Sheets:', wb.SheetNames.join(', '));

  const fluxoSheet = wb.SheetNames.find(s => s.toUpperCase().includes('FLUXO'));
  if (!fluxoSheet) { console.log('  ❌ No FLUXO sheet found!'); continue; }
  console.log(`Using sheet: "${fluxoSheet}"`);

  const ws = wb.Sheets[fluxoSheet];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  console.log(`Total rows: ${rows.length}`);
  console.log('\nFirst 60 rows (col0, col1, col2, col3):');
  for (let i = 0; i < Math.min(60, rows.length); i++) {
    const r = rows[i];
    if (!r || r.every(c => c === '' || c === null)) continue;
    const c0 = String(r[0] || '').slice(0, 15).padEnd(16);
    const c1 = String(r[1] || '').slice(0, 40).padEnd(42);
    const c2 = String(r[2] || '').slice(0, 20).padEnd(22);
    const c3 = String(r[3] || '').slice(0, 20);
    console.log(`  Row ${String(i).padStart(3)}: [${c0}] [${c1}] [${c2}] [${c3}]`);
  }
}
