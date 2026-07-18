/**
 * DRE V2 Extractor — America Rental
 * Reads FLUXO DE CAIXA sheet from each monthly DRE file.
 * 
 * Structure (confirmed):
 *   Col 0 = Operação (code)
 *   Col 1 = Descrição
 *   Col 2 = Valores (JS number, no parsing needed)
 * 
 * Key codes:
 *   1   = TOTAL DE RECEITAS
 *   11  = TOTAL RECEITAS OBRAS
 *   12  = TOTAL RECEITAS EVENTOS
 *   13  = TOTAL RECEITAS DIVERSAS
 *   1100-1199 = obras detail
 *   1200-1299 = eventos detail
 *   1300-1399 = diversas detail
 *   2   = TOTAL CUSTOS E DESPESAS
 *   21  = Custo Direto
 *   22  = Despesas com Pessoal
 *   23  = Despesas Administrativas
 *   24  = Custo da Estrutura
 *   25  = Resultado Financeiro
 *   26  = Despesa por Fora
 *   27  = Sublocação de Equipamentos
 *   2100-2799 = detail items
 *   big number (like 45809, 46023) with "RESULTADO LÍQUIDO" = lucro líquido
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DIR = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Financeiro';
const OUTPUT = 'C:\\Users\\thata\\.gemini\\antigravity\\brain\\ab5c6580-bbe2-40f8-bf16-7460ef541ac5\\scratch\\dre_v2.json';

const MONTHS = [
  { file: 'DRE 01-2024.xlsx',   mm:'01', yyyy:'2024' },
  { file: 'DRE 02-2024.xlsx',   mm:'02', yyyy:'2024' },
  { file: 'DRE 03-2024.xlsx',   mm:'03', yyyy:'2024' },
  { file: 'DRE - 04-2024.xlsx', mm:'04', yyyy:'2024' },
  { file: 'DRE - 05-2024.xlsx', mm:'05', yyyy:'2024' },
  { file: 'DRE - 06-2024.xlsx', mm:'06', yyyy:'2024' },
  { file: 'DRE 07-2024...xlsx', mm:'07', yyyy:'2024' },
  { file: 'DRE 08-2024.xlsx',   mm:'08', yyyy:'2024' },
  { file: 'DRE 09-2024.xlsx',   mm:'09', yyyy:'2024' },
  { file: 'DRE 10-2024.xlsx',   mm:'10', yyyy:'2024' },
  { file: 'DRE 11-2024.xlsx',   mm:'11', yyyy:'2024' },
  { file: 'DRE 12-2024.xlsx',   mm:'12', yyyy:'2024' },
  { file: 'DRE 01-2025.xlsx',   mm:'01', yyyy:'2025' },
  { file: 'DRE 02-2025.xlsx',   mm:'02', yyyy:'2025' },
  { file: 'DRE 03-2025.xlsx',   mm:'03', yyyy:'2025' },
  { file: 'DRE 04-2025.xlsx',   mm:'04', yyyy:'2025' },
  { file: 'DRE 05-2025.xlsx',   mm:'05', yyyy:'2025' },
  { file: 'DRE 06-2025.xlsx',   mm:'06', yyyy:'2025' },
  { file: 'DRE 07-2025.xlsx',   mm:'07', yyyy:'2025' },
  { file: 'DRE 08-2025.xlsx',   mm:'08', yyyy:'2025' },
  { file: 'DRE 09-2025.xlsx',   mm:'09', yyyy:'2025' },
  { file: 'DRE 10-2025.xlsx',   mm:'10', yyyy:'2025' },
  { file: 'DRE 11-2025.xlsx',   mm:'11', yyyy:'2025' },
  { file: 'DRE 12-2025.xlsx',   mm:'12', yyyy:'2025' },
  { file: 'DRE 01-2026.xlsx',   mm:'01', yyyy:'2026' },
  { file: 'DRE 02-2026.xlsx',   mm:'02', yyyy:'2026' },
  { file: 'DRE 03-2026.xlsx',   mm:'03', yyyy:'2026' },
  { file: 'DRE 04-2026.xlsx',   mm:'04', yyyy:'2026' },
  { file: 'DRE 05-2026.xlsx',   mm:'05', yyyy:'2026' },
];

const MONTH_LABELS = {
  '01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun',
  '07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez'
};

function round2(v) { return Math.round((v||0) * 100) / 100; }

function toNum(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  // Handle Brazilian string format (fallback for older sheets)
  const s = String(v).trim().replace(/\s/g,'');
  // If it looks like BR format "1.234,56"
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    return parseFloat(s.replace(/\./g,'').replace(',','.')) || 0;
  }
  return parseFloat(s.replace(',','.')) || 0;
}

/**
 * Category labels for cost codes
 */
const CAT_LABELS = {
  21: 'Custo Direto',
  22: 'Desp. com Pessoal',
  23: 'Desp. Administrativas',
  24: 'Custo da Estrutura',
  25: 'Resultado Financeiro',
  26: 'Despesa por Fora',
  27: 'Sublocação de Equip.',
};

function extractFluxo(wb, mm, yyyy) {
  // Find the FLUXO sheet
  const fluxoName = wb.SheetNames.find(s => s.toUpperCase().includes('FLUXO'));
  if (!fluxoName) return null;
  console.log(`    Sheet: "${fluxoName}"`);

  const ws = wb.Sheets[fluxoName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const result = {
    receitaTotal: 0,
    receitaObras: 0,
    receitaEventos: 0,
    receitaDiversas: 0,
    custosTotal: 0,
    custoDireto: 0,
    despPessoal: 0,
    despAdmin: 0,
    custoEstrutura: 0,
    resultFinanceiro: 0,
    despForaFora: 0,
    sublocacaoEquip: 0,
    lucroLiquido: null,
    topReceitas: [],
    topCustos: [],
    detalhesCustos: {}, // cat label => total
    detalhesItens: [],  // [{code, desc, cat, valor}]
  };

  // Scan all rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const codeRaw = String(row[0] || '').trim();
    const desc = String(row[1] || '').trim().toUpperCase();
    const valor = toNum(row[2]);

    const codeNum = parseFloat(codeRaw);
    if (isNaN(codeNum)) continue;
    const codeInt = Math.floor(codeNum);

    // ── Revenue totals ──
    if (codeInt === 1 && desc.includes('TOTAL') && desc.includes('RECEITA')) {
      result.receitaTotal = valor;
    } else if (codeInt === 11) {
      result.receitaObras = valor;
    } else if (codeInt === 12) {
      result.receitaEventos = valor;
    } else if (codeInt === 13) {
      result.receitaDiversas = valor;
    }

    // ── Revenue detail items ──
    else if (codeInt >= 1100 && codeInt <= 1399 && valor > 0) {
      const cat = codeInt >= 1200 ? 'Eventos' : codeInt >= 1100 ? 'Obras' : 'Diversas';
      result.topReceitas.push({ code: codeInt, desc: String(row[1]||'').trim(), cat, valor: round2(valor) });
    }

    // ── Cost totals (group-level codes 21-27) ──
    else if (codeInt === 2 && desc.includes('TOTAL') && desc.includes('CUSTO')) {
      result.custosTotal = valor;
    } else if (codeInt === 21) {
      result.custoDireto = valor;
    } else if (codeInt === 22) {
      result.despPessoal = valor;
    } else if (codeInt === 23) {
      result.despAdmin = valor;
    } else if (codeInt === 24) {
      result.custoEstrutura = valor;
    } else if (codeInt === 25) {
      result.resultFinanceiro = valor;
    } else if (codeInt === 26) {
      result.despForaFora = valor;
    } else if (codeInt === 27) {
      result.sublocacaoEquip = valor;
    }

    // ── Cost detail items (2100–2799) ──
    else if (codeInt >= 2100 && codeInt <= 2799 && valor > 0) {
      const catCode = Math.floor(codeInt / 100); // 21, 22, 23, 24, 25, 26, 27
      const catLabel = CAT_LABELS[catCode] || `Cat ${catCode}`;
      result.detalhesItens.push({
        code: codeInt,
        desc: String(row[1]||'').trim(),
        cat: catLabel,
        valor: round2(valor)
      });
    }

    // ── RESULTADO LÍQUIDO ──
    else if (codeNum > 40000 && desc.includes('RESULTADO') && desc.includes('LÍQUID')) {
      result.lucroLiquido = valor;
    }
  }

  // Build detalhesCustos from group subtotals
  for (const [code, label] of Object.entries(CAT_LABELS)) {
    const val = result[{
      21:'custoDireto', 22:'despPessoal', 23:'despAdmin',
      24:'custoEstrutura', 25:'resultFinanceiro', 26:'despForaFora', 27:'sublocacaoEquip'
    }[code]];
    if (val && val > 0) result.detalhesCustos[label] = round2(val);
  }

  // Top 10 receitas by valor
  result.topReceitas = result.topReceitas
    .sort((a,b) => b.valor - a.valor).slice(0, 10);

  // Top 10 custo items by valor
  result.topCustos = result.detalhesItens
    .sort((a,b) => b.valor - a.valor).slice(0, 10);

  // Fallback: if custosTotal not found from code=2, sum group totals
  if (!result.custosTotal || result.custosTotal === 0) {
    result.custosTotal = result.custoDireto + result.despPessoal + result.despAdmin +
      result.custoEstrutura + result.resultFinanceiro + result.despForaFora + result.sublocacaoEquip;
  }

  // Fallback: if lucroLiquido not found, compute it
  if (result.lucroLiquido === null) {
    result.lucroLiquido = result.receitaTotal - result.custosTotal;
  }

  return result;
}

// ── MAIN ──────────────────────────────────────────────────────────
const output = [];
const errors = [];

for (const entry of MONTHS) {
  const filePath = path.join(DIR, entry.file);
  const mesKey = `${entry.yyyy}-${entry.mm}`;
  const label = `${MONTH_LABELS[entry.mm]}/${entry.yyyy.slice(2)}`;

  console.log(`\n📂 [${mesKey}] ${entry.file}`);

  if (!fs.existsSync(filePath)) {
    console.log('  ❌ File not found');
    errors.push({ mes: mesKey, error: 'File not found' });
    continue;
  }

  let wb;
  try {
    wb = XLSX.readFile(filePath, { cellNF: false, cellStyles: false });
  } catch(e) {
    console.log('  ❌ Read error:', e.message);
    errors.push({ mes: mesKey, error: e.message });
    continue;
  }

  const data = extractFluxo(wb, entry.mm, entry.yyyy);
  if (!data || data.receitaTotal === 0) {
    console.log('  ⚠️  No revenue found in FLUXO sheet');
    errors.push({ mes: mesKey, error: 'No data in FLUXO sheet' });
  }

  const rec = data || {};
  const margem = rec.receitaTotal > 0
    ? (rec.lucroLiquido / rec.receitaTotal) * 100 : 0;

  const record = {
    mes: mesKey,
    label,
    receitaTotal:      round2(rec.receitaTotal || 0),
    receitaObras:      round2(rec.receitaObras || 0),
    receitaEventos:    round2(rec.receitaEventos || 0),
    receitaDiversas:   round2(rec.receitaDiversas || 0),
    custosTotal:       round2(rec.custosTotal || 0),
    custoDireto:       round2(rec.custoDireto || 0),
    despPessoal:       round2(rec.despPessoal || 0),
    despAdmin:         round2(rec.despAdmin || 0),
    custoEstrutura:    round2(rec.custoEstrutura || 0),
    resultFinanceiro:  round2(rec.resultFinanceiro || 0),
    despForaFora:      round2(rec.despForaFora || 0),
    sublocacaoEquip:   round2(rec.sublocacaoEquip || 0),
    lucroLiquido:      round2(rec.lucroLiquido || 0),
    margem:            round2(margem),
    topReceitas:       rec.topReceitas || [],
    topCustos:         rec.topCustos || [],
    detalhesCustos:    rec.detalhesCustos || {},
  };

  output.push(record);

  const f = v => (v||0).toLocaleString('pt-BR',{maximumFractionDigits:0});
  console.log(`  ✅ Receita=${f(record.receitaTotal)} | Obras=${f(record.receitaObras)} | Eventos=${f(record.receitaEventos)}`);
  console.log(`     Custos=${f(record.custosTotal)} | Lucro=${f(record.lucroLiquido)} | Margem=${record.margem.toFixed(1)}%`);
  console.log(`     CustDir=${f(record.custoDireto)} | Pessoal=${f(record.despPessoal)} | Admin=${f(record.despAdmin)}`);
  console.log(`     Estrut=${f(record.custoEstrutura)} | FinRes=${f(record.resultFinanceiro)} | ForaFora=${f(record.despForaFora)} | SubLoc=${f(record.sublocacaoEquip)}`);
}

fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf8');

console.log('\n' + '═'.repeat(70));
console.log(`✅ Extracted ${output.length} months to: ${OUTPUT}`);
if (errors.length > 0) {
  console.log(`⚠️  ${errors.length} errors:`);
  errors.forEach(e => console.log(`   ${e.mes}: ${e.error}`));
}

console.log('\n📊 FINAL SUMMARY TABLE:');
console.log('Month    | Receita R$       | Custos R$        | Lucro Líquido    | Margem');
console.log('---------|------------------|------------------|------------------|-------');
for (const r of output) {
  const f = v => (v||0).toLocaleString('pt-BR',{maximumFractionDigits:0}).padStart(16);
  const sign = r.lucroLiquido >= 0 ? '+' : '';
  console.log(`${r.label.padEnd(8)} |${f(r.receitaTotal)} |${f(r.custosTotal)} | ${sign}${f(r.lucroLiquido).trim().padStart(15)} | ${r.margem.toFixed(1)}%`);
}
