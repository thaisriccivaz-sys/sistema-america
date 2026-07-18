/**
 * Peek MANUT sheet structure
 */
const XLSX = require('xlsx');
const path = require('path');

const DIR = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Financeiro';

const FILES = [
  'DRE 05-2026.xlsx',
  'DRE 01-2026.xlsx',
  'DRE 12-2025.xlsx',
  'DRE 01-2025.xlsx',
];

for (const fname of FILES) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`FILE: ${fname}`);
  const wb = XLSX.readFile(path.join(DIR, fname), { cellNF:false, cellStyles:false });
  console.log('Sheets:', wb.SheetNames.join(', '));

  const manutSheet = wb.SheetNames.find(s => s.toUpperCase().includes('MANUT'));
  if (!manutSheet) { console.log('NO MANUT SHEET'); continue; }
  console.log(`MANUT sheet: "${manutSheet}"`);

  const ws = wb.Sheets[manutSheet];
  const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
  console.log(`Total rows: ${rows.length}`);

  // Show first 20 rows to find header
  console.log('First 20 rows:');
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const r = rows[i];
    if (!r || r.every(c => !c)) continue;
    console.log(`  Row ${String(i).padStart(3)}: ${r.map((c,j)=>`[${j}:${String(c||'').slice(0,20)}]`).join(' ')}`);
  }

  // Show last 10 rows (usually totals)
  console.log('Last 10 rows:');
  for (let i = Math.max(0, rows.length-10); i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(c => !c)) continue;
    console.log(`  Row ${String(i).padStart(3)}: ${r.map((c,j)=>`[${j}:${String(c||'').slice(0,20)}]`).join(' ')}`);
  }
}
