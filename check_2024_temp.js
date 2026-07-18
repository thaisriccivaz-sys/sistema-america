/**
 * Check Jan/2025 full FLUXO sheet and a few 2024 files
 */
const XLSX = require('xlsx');
const path = require('path');

const DIR = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Financeiro';

const FILES = [
  'DRE 01-2024.xlsx',
  'DRE 02-2024.xlsx',
  'DRE 03-2024.xlsx',
  'DRE 01-2025.xlsx',
  'DRE 06-2025.xlsx',
];

for (const fname of FILES) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`FILE: ${fname}`);
  const wb = XLSX.readFile(path.join(DIR, fname), { cellNF: false, cellStyles: false });
  console.log('All sheets:', wb.SheetNames.join(', '));
  const fluxoSheet = wb.SheetNames.find(s => s.toUpperCase().includes('FLUXO'));
  if (!fluxoSheet) { console.log('NO FLUXO SHEET'); continue; }
  console.log(`Using: "${fluxoSheet}"`);
  const ws = wb.Sheets[fluxoSheet];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(c => c === '' || c === null || c === undefined)) continue;
    const c0 = String(r[0] || '').slice(0, 18).padEnd(19);
    const c1 = String(r[1] || '').slice(0, 45).padEnd(46);
    const c2 = String(r[2] || '').slice(0, 20).padEnd(21);
    const c3 = String(r[3] || '').slice(0, 15);
    console.log(`  ${String(i).padStart(3)}: [${c0}] [${c1}] [${c2}] [${c3}]`);
  }
}
