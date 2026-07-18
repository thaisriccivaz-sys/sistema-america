/**
 * DRE Financial Data Extractor - America Rental
 * Handles both Format A (2024 early months) and Format B (2024 late + 2025/2026)
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const FINANCEIRO_DIR = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Financeiro';
const OUTPUT_FILE = 'C:\\Users\\thata\\.gemini\\antigravity\\brain\\ab5c6580-bbe2-40f8-bf16-7460ef541ac5\\scratch\\dre_extracted.json';

// ─── Brazilian number parser ──────────────────────────────────────────────────
function parseBR(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const s = String(val).trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')   // remove thousands separator
    .replace(',', '.');   // decimal separator
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// ─── Month/Year helpers ───────────────────────────────────────────────────────
const MONTH_LABELS = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
};

function makeLabel(mm, yyyy) {
  return `${MONTH_LABELS[mm] || mm}/${yyyy.slice(2)}`;
}

// ─── File list (in order) ─────────────────────────────────────────────────────
const FILE_MAP = [
  // FORMAT A
  { file: 'DRE 01-2024.xlsx',    mm: '01', yyyy: '2024', format: 'A' },
  { file: 'DRE 02-2024.xlsx',    mm: '02', yyyy: '2024', format: 'A' },
  { file: 'DRE 03-2024.xlsx',    mm: '03', yyyy: '2024', format: 'A' },
  { file: 'DRE - 04-2024.xlsx',  mm: '04', yyyy: '2024', format: 'A' },
  // 05 and 06-2024 are Format B
  { file: 'DRE - 05-2024.xlsx',  mm: '05', yyyy: '2024', format: 'B' },
  { file: 'DRE - 06-2024.xlsx',  mm: '06', yyyy: '2024', format: 'B' },
  { file: 'DRE 07-2024...xlsx',  mm: '07', yyyy: '2024', format: 'B' },
  // FORMAT B
  { file: 'DRE 08-2024.xlsx',    mm: '08', yyyy: '2024', format: 'B' },
  { file: 'DRE 09-2024.xlsx',    mm: '09', yyyy: '2024', format: 'B' },
  { file: 'DRE 10-2024.xlsx',    mm: '10', yyyy: '2024', format: 'B' },
  { file: 'DRE 11-2024.xlsx',    mm: '11', yyyy: '2024', format: 'B' },
  { file: 'DRE 12-2024.xlsx',    mm: '12', yyyy: '2024', format: 'B' },
  { file: 'DRE 01-2025.xlsx',    mm: '01', yyyy: '2025', format: 'B' },
  { file: 'DRE 02-2025.xlsx',    mm: '02', yyyy: '2025', format: 'B' },
  { file: 'DRE 03-2025.xlsx',    mm: '03', yyyy: '2025', format: 'B' },
  { file: 'DRE 04-2025.xlsx',    mm: '04', yyyy: '2025', format: 'B' },
  { file: 'DRE 05-2025.xlsx',    mm: '05', yyyy: '2025', format: 'B' },
  { file: 'DRE 06-2025.xlsx',    mm: '06', yyyy: '2025', format: 'B' },
  { file: 'DRE 07-2025.xlsx',    mm: '07', yyyy: '2025', format: 'B' },
  { file: 'DRE 08-2025.xlsx',    mm: '08', yyyy: '2025', format: 'B' },
  { file: 'DRE 09-2025.xlsx',    mm: '09', yyyy: '2025', format: 'B' },
  { file: 'DRE 10-2025.xlsx',    mm: '10', yyyy: '2025', format: 'B' },
  { file: 'DRE 11-2025.xlsx',    mm: '11', yyyy: '2025', format: 'B' },
  { file: 'DRE 12-2025.xlsx',    mm: '12', yyyy: '2025', format: 'B' },
  { file: 'DRE 01-2026.xlsx',    mm: '01', yyyy: '2026', format: 'B' },
  { file: 'DRE 02-2026.xlsx',    mm: '02', yyyy: '2026', format: 'B' },
  { file: 'DRE 03-2026.xlsx',    mm: '03', yyyy: '2026', format: 'B' },
  { file: 'DRE 04-2026.xlsx',    mm: '04', yyyy: '2026', format: 'B' },
  { file: 'DRE 05-2026.xlsx',    mm: '05', yyyy: '2026', format: 'B' },
];

// ─── FORMAT A EXTRACTION ──────────────────────────────────────────────────────
function extractFormatA(wb, mm, yyyy) {
  const result = {
    receitaTotal: 0, receitaObras: 0, receitaEventos: 0,
    custosTotal: 0,
    topReceitas: [], topCustos: [],
    custosPorCategoria: {}
  };

  const sheetNames = wb.SheetNames;
  console.log(`  Sheets: ${sheetNames.join(', ')}`);

  // Find revenue sheet
  let recSheet = null;
  let recSheetName = '';
  const recFound = sheetNames.find(s => s.toUpperCase().includes('RECEITA'));
  if (recFound) { recSheet = wb.Sheets[recFound]; recSheetName = recFound; console.log(`  → Revenue sheet: ${recFound}`); }

  // Find expense sheet
  let despSheet = null;
  const despFound = sheetNames.find(s => s.toUpperCase().includes('DESP'));
  if (despFound) { despSheet = wb.Sheets[despFound]; console.log(`  → Expense sheet: ${despFound}`); }

  // ── Revenue parsing ──
  if (recSheet) {
    const rows = XLSX.utils.sheet_to_json(recSheet, { header: 1, defval: '' });
    const receitaByCC = {};
    let headerRowIdx = -1;
    let colCC = 5, colRateio = 7, colVlr = 6;

    // Find header row
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      const rowStr = row.join('|').toUpperCase();
      if (rowStr.includes('CENTRO') || rowStr.includes('RATEIO') || rowStr.includes('VLR')) {
        headerRowIdx = i;
        // Detect actual column positions
        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || '').toUpperCase();
          if (cell.includes('CENTRO')) colCC = j;
          if (cell.includes('RATEIO')) colRateio = j;
          if (cell.includes('VLR') || cell.includes('PARCELA')) colVlr = j;
        }
        break;
      }
    }

    console.log(`  Header at row ${headerRowIdx}, CC=${colCC}, Rateio=${colRateio}, Vlr=${colVlr}`);

    for (let i = (headerRowIdx >= 0 ? headerRowIdx + 1 : 1); i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;

      const cc = String(row[colCC] || '').trim();
      let valor = parseBR(row[colRateio]);
      if (valor === 0) valor = parseBR(row[colVlr]);

      if (cc && valor > 0) {
        const prefixMatch = cc.match(/^(\d+)/);
        const prefix = prefixMatch ? parseInt(prefixMatch[1]) : 0;

        result.receitaTotal += valor;

        if (prefix >= 50 && prefix <= 65) result.receitaObras += valor;
        else if (prefix >= 66 && prefix <= 75) result.receitaEventos += valor;

        const ccKey = cc.length > 50 ? cc.slice(0, 50) : cc;
        receitaByCC[ccKey] = (receitaByCC[ccKey] || 0) + valor;
      }
    }

    result.topReceitas = Object.entries(receitaByCC)
      .map(([desc, valor]) => ({ desc, valor: Math.round(valor) }))
      .sort((a, b) => b.valor - a.valor).slice(0, 10);
  }

  // ── Expense parsing ──
  if (despSheet) {
    const rows = XLSX.utils.sheet_to_json(despSheet, { header: 1, defval: '' });
    const custoByCC = {};
    let headerRowIdx = -1;
    let colCC = 4, colValor = 8;

    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      const rowStr = row.join('|').toUpperCase();
      if (rowStr.includes('CENTRO') || rowStr.includes('FORNECEDOR')) {
        headerRowIdx = i;
        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || '').toUpperCase();
          if (cell.includes('CENTRO')) colCC = j;
          if (cell.includes('VALOR') || cell.includes('VLR')) colValor = j;
        }
        break;
      }
    }

    for (let i = (headerRowIdx >= 0 ? headerRowIdx + 1 : 1); i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;

      const cc = String(row[colCC] || '').trim();
      let valor = 0;
      for (let vi = colValor; vi <= Math.min(colValor + 5, row.length - 1); vi++) {
        const v = parseBR(row[vi]);
        if (v > 0 && v < 50000000) { valor = v; break; }
      }

      if (valor > 0) {
        result.custosTotal += valor;
        const ccKey = (cc && cc.length > 2) ? (cc.length > 50 ? cc.slice(0, 50) : cc) : 'SEM CLASSIFICAÇÃO';
        custoByCC[ccKey] = (custoByCC[ccKey] || 0) + valor;
      }
    }

    result.custosPorCategoria = buildCategorias(custoByCC);
    result.topCustos = Object.entries(custoByCC)
      .map(([desc, valor]) => ({ desc, valor: Math.round(valor) }))
      .sort((a, b) => b.valor - a.valor).slice(0, 10);
  }

  return result;
}

// ─── FORMAT B EXTRACTION ──────────────────────────────────────────────────────
function buildCategorias(byDesc) {
  const cats = {};
  for (const [desc, valor] of Object.entries(byDesc)) {
    const d = desc.toUpperCase();
    let cat = 'OUTROS';
    if (d.includes('SALÁRIO') || d.includes('SALARIO') || d.includes('FOLHA') || d.includes('REMUNERA') || d.includes('FÉRIAS') || d.includes('FERIAS') || d.includes('RESCIS') || d.includes('FGTS') || d.includes('INSS')) cat = 'PESSOAL';
    else if (d.includes('ALUGUEL') || d.includes('LOCAÇ') || d.includes('LOCAC')) cat = 'LOCAÇÕES';
    else if (d.includes('MANUT') || d.includes('REPARO')) cat = 'MANUTENÇÃO';
    else if (d.includes('COMBUST') || d.includes('FRETE') || d.includes('TRANSPORT')) cat = 'LOGÍSTICA';
    else if (d.includes('IMPOST') || d.includes('TRIBUT') || d.includes('TAXA') || d.includes('SIMPLES')) cat = 'TRIBUTOS';
    else if (d.includes('FINANC') || d.includes('JUROS') || d.includes('BANCO') || d.includes('IOF')) cat = 'FINANCEIRO';
    else if (d.includes('MATERIAL') || d.includes('FERRAMENT') || d.includes('EQUIP')) cat = 'MATERIAIS';
    cats[cat] = (cats[cat] || 0) + valor;
  }
  return cats;
}

function extractFormatBFromSheet(ws, sheetName) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let receitaTotal = 0, receitaObras = 0, receitaEventos = 0;
  let custosTotal = 0;
  const topReceitas = {};
  const topCustos = {};
  let found = false;
  let obrasFromSubs = 0, eventosFromSubs = 0;

  // Find column indices by scanning header rows
  let colOperacao = 0, colDescricao = 1, colEntradas = 2, colSaidas = 3;
  
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || '').toUpperCase().trim();
      if ((cell === 'OPERAÇÃO' || cell === 'OPERACAO' || cell === 'OP' || cell === 'CÓD' || cell === 'COD' || cell === 'CÓDIGO') && j < 3) colOperacao = j;
      if (cell.includes('DESCRI') && j > 0) colDescricao = j;
      if (cell.includes('ENTRADA')) colEntradas = j;
      if (cell.includes('SAÍDA') || cell.includes('SAIDA')) colSaidas = j;
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const opRaw = String(row[colOperacao] || '').trim();
    const descRaw = String(row[colDescricao] || '').trim().toUpperCase();
    const entradas = parseBR(row[colEntradas]);
    const saidas = parseBR(row[colSaidas]);

    const opNum = parseFloat(opRaw);
    const opInt = isNaN(opNum) ? -1 : Math.floor(opNum);

    // TOTAL DE RECEITAS (root)
    if (descRaw.includes('TOTAL DE RECEITA') || (opInt === 1 && entradas > 0)) {
      if (!descRaw.includes('OBRAS') && !descRaw.includes('EVENTO')) {
        if (entradas > receitaTotal) {
          receitaTotal = entradas;
          found = true;
        }
      }
    }

    // TOTAL OBRAS
    if ((descRaw.includes('TOTAL') && descRaw.includes('RECEITA') && descRaw.includes('OBRA')) || opInt === 11) {
      if (entradas > 0) receitaObras = entradas;
    }
    // TOTAL EVENTOS
    if ((descRaw.includes('TOTAL') && descRaw.includes('RECEITA') && descRaw.includes('EVENTO')) || opInt === 12) {
      if (entradas > 0) receitaEventos = entradas;
    }

    // Revenue detail lines (codes 1100-1215)
    if (opInt >= 1100 && opInt <= 1115 && entradas > 0) {
      obrasFromSubs += entradas;
      const desc = descRaw.length > 60 ? descRaw.slice(0, 60) : descRaw;
      topReceitas[desc] = (topReceitas[desc] || 0) + entradas;
    }
    if (opInt >= 1200 && opInt <= 1215 && entradas > 0) {
      eventosFromSubs += entradas;
      const desc = descRaw.length > 60 ? descRaw.slice(0, 60) : descRaw;
      topReceitas[desc] = (topReceitas[desc] || 0) + entradas;
    }

    // Costs (code >= 2000, saidas > 0)
    if (opInt >= 2000 && saidas > 0) {
      // Only leaf-level items (not subtotals)
      // Check if it looks like a total line
      const isTotal = descRaw.includes('TOTAL') || descRaw.includes('SUBTOTAL');
      if (!isTotal || topCustos[descRaw] === undefined) {
        custosTotal += saidas;
        const desc = descRaw.length > 60 ? descRaw.slice(0, 60) : descRaw;
        topCustos[desc] = (topCustos[desc] || 0) + saidas;
      }
    }
  }

  if (!found && receitaTotal === 0) return null;

  // Fix obras/eventos if not extracted from totals
  if (receitaObras === 0 && obrasFromSubs > 0) receitaObras = obrasFromSubs;
  if (receitaEventos === 0 && eventosFromSubs > 0) receitaEventos = eventosFromSubs;

  // Fix receitaTotal if it's still 0 but subs found
  if (receitaTotal === 0 && (obrasFromSubs + eventosFromSubs) > 0) {
    receitaTotal = obrasFromSubs + eventosFromSubs;
    found = true;
  }

  const topReceitasArr = Object.entries(topReceitas)
    .map(([desc, valor]) => ({ desc, valor: Math.round(valor) }))
    .sort((a, b) => b.valor - a.valor).slice(0, 10);

  const topCustosArr = Object.entries(topCustos)
    .map(([desc, valor]) => ({ desc, valor: Math.round(valor) }))
    .sort((a, b) => b.valor - a.valor).slice(0, 10);

  return {
    receitaTotal, receitaObras, receitaEventos, custosTotal,
    topReceitas: topReceitasArr, topCustos: topCustosArr,
    custosPorCategoria: buildCategorias(topCustos)
  };
}

function extractFormatB(wb) {
  const sheetNames = wb.SheetNames;
  console.log(`  Sheets: ${sheetNames.join(', ')}`);

  // First pass: skip summary sheets
  for (const name of sheetNames) {
    if (name.toUpperCase().includes('SEMESTRE') || name.toUpperCase().includes('ANUAL')) continue;
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const res = extractFormatBFromSheet(ws, name);
    if (res && res.receitaTotal > 0) {
      console.log(`  → Found data in sheet: "${name}" | Receita: ${res.receitaTotal.toFixed(2)}`);
      return res;
    }
  }

  // Second pass: include all sheets
  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const res = extractFormatBFromSheet(ws, name);
    if (res && res.receitaTotal > 0) {
      console.log(`  → Found data (2nd pass) in sheet: "${name}" | Receita: ${res.receitaTotal.toFixed(2)}`);
      return res;
    }
  }

  return null;
}

// ─── MAIN LOOP ────────────────────────────────────────────────────────────────
const results = [];
const errors = [];

for (const entry of FILE_MAP) {
  const filePath = path.join(FINANCEIRO_DIR, entry.file);
  console.log(`\n📂 [${entry.yyyy}-${entry.mm}] ${entry.file} [Format ${entry.format}]`);

  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found`);
    errors.push({ file: entry.file, error: 'File not found' });
    continue;
  }

  let wb;
  try {
    wb = XLSX.readFile(filePath, { cellNF: false, cellStyles: false });
  } catch (e) {
    console.log(`  ❌ Read error: ${e.message}`);
    errors.push({ file: entry.file, error: e.message });
    continue;
  }

  let extracted = null;
  let formatUsed = entry.format;

  if (entry.format === 'A') {
    extracted = extractFormatA(wb, entry.mm, entry.yyyy);
    if (!extracted || extracted.receitaTotal === 0) {
      console.log(`  ℹ️  Format A→0, trying Format B...`);
      const bResult = extractFormatB(wb);
      if (bResult && bResult.receitaTotal > 0) { extracted = bResult; formatUsed = 'B(fallback)'; }
    }
  } else {
    extracted = extractFormatB(wb);
    if (!extracted || extracted.receitaTotal === 0) {
      console.log(`  ℹ️  Format B→0, trying Format A...`);
      const aResult = extractFormatA(wb, entry.mm, entry.yyyy);
      if (aResult && aResult.receitaTotal > 0) { extracted = aResult; formatUsed = 'A(fallback)'; }
    }
  }

  if (!extracted || extracted.receitaTotal === 0) {
    console.log(`  ❌ No revenue data found`);
    errors.push({ file: entry.file, error: 'No revenue data extracted' });
    extracted = { receitaTotal: 0, receitaObras: 0, receitaEventos: 0, custosTotal: 0, topReceitas: [], topCustos: [], custosPorCategoria: {} };
  }

  const lucro = extracted.receitaTotal - extracted.custosTotal;
  const margem = extracted.receitaTotal > 0 ? (lucro / extracted.receitaTotal) * 100 : 0;

  const record = {
    mes: `${entry.yyyy}-${entry.mm}`,
    label: makeLabel(entry.mm, entry.yyyy),
    receitaTotal: Math.round(extracted.receitaTotal * 100) / 100,
    receitaObras: Math.round(extracted.receitaObras * 100) / 100,
    receitaEventos: Math.round(extracted.receitaEventos * 100) / 100,
    custosTotal: Math.round(extracted.custosTotal * 100) / 100,
    lucro: Math.round(lucro * 100) / 100,
    margem: Math.round(margem * 10) / 10,
    topReceitas: extracted.topReceitas || [],
    topCustos: extracted.topCustos || [],
    custosPorCategoria: extracted.custosPorCategoria || {},
    _formatUsed: formatUsed
  };

  results.push(record);
  console.log(`  ✅ Receita=${record.receitaTotal.toLocaleString('pt-BR')} | Custos=${record.custosTotal.toLocaleString('pt-BR')} | Lucro=${record.lucro.toLocaleString('pt-BR')} | Margem=${record.margem}% | Format=${formatUsed}`);
}

// ─── Save output ──────────────────────────────────────────────────────────────
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf8');

console.log('\n══════════════════════════════════════════════════════════════');
console.log(`✅ Extracted ${results.length} months | ⚠️  ${errors.length} with issues`);
if (errors.length > 0) {
  console.log('Issues:');
  errors.forEach(e => console.log(`   - ${e.file}: ${e.error}`));
}
console.log(`📄 Output: ${OUTPUT_FILE}`);
console.log('══════════════════════════════════════════════════════════════');

console.log('\n📊 SUMMARY:');
console.log('Month     | Receita R$       | Custos R$        | Lucro R$         | Margem');
console.log('----------|------------------|------------------|------------------|-------');
for (const r of results) {
  const f = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }).padStart(16);
  console.log(`${r.label.padEnd(9)} |${f(r.receitaTotal)} |${f(r.custosTotal)} |${f(r.lucro)} | ${r.margem.toFixed(1)}%`);
}
