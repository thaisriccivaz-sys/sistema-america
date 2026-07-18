/**
 * DRE V2 FINAL Extractor — America Rental
 * Reads FLUXO DE CAIXA + MANUT sheets
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DIR = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Financeiro';
const OUTPUT = 'C:\\Users\\thata\\.gemini\\antigravity\\brain\\ab5c6580-bbe2-40f8-bf16-7460ef541ac5\\scratch\\dre_v2.json';

const MONTHS = [
  { file:'DRE 01-2024.xlsx',   mm:'01',yyyy:'2024' },
  { file:'DRE 02-2024.xlsx',   mm:'02',yyyy:'2024' },
  { file:'DRE 03-2024.xlsx',   mm:'03',yyyy:'2024' },
  { file:'DRE - 04-2024.xlsx', mm:'04',yyyy:'2024' },
  { file:'DRE - 05-2024.xlsx', mm:'05',yyyy:'2024' },
  { file:'DRE - 06-2024.xlsx', mm:'06',yyyy:'2024' },
  { file:'DRE 07-2024...xlsx', mm:'07',yyyy:'2024' },
  { file:'DRE 08-2024.xlsx',   mm:'08',yyyy:'2024' },
  { file:'DRE 09-2024.xlsx',   mm:'09',yyyy:'2024' },
  { file:'DRE 10-2024.xlsx',   mm:'10',yyyy:'2024' },
  { file:'DRE 11-2024.xlsx',   mm:'11',yyyy:'2024' },
  { file:'DRE 12-2024.xlsx',   mm:'12',yyyy:'2024' },
  { file:'DRE 01-2025.xlsx',   mm:'01',yyyy:'2025' },
  { file:'DRE 02-2025.xlsx',   mm:'02',yyyy:'2025' },
  { file:'DRE 03-2025.xlsx',   mm:'03',yyyy:'2025' },
  { file:'DRE 04-2025.xlsx',   mm:'04',yyyy:'2025' },
  { file:'DRE 05-2025.xlsx',   mm:'05',yyyy:'2025' },
  { file:'DRE 06-2025.xlsx',   mm:'06',yyyy:'2025' },
  { file:'DRE 07-2025.xlsx',   mm:'07',yyyy:'2025' },
  { file:'DRE 08-2025.xlsx',   mm:'08',yyyy:'2025' },
  { file:'DRE 09-2025.xlsx',   mm:'09',yyyy:'2025' },
  { file:'DRE 10-2025.xlsx',   mm:'10',yyyy:'2025' },
  { file:'DRE 11-2025.xlsx',   mm:'11',yyyy:'2025' },
  { file:'DRE 12-2025.xlsx',   mm:'12',yyyy:'2025' },
  { file:'DRE 01-2026.xlsx',   mm:'01',yyyy:'2026' },
  { file:'DRE 02-2026.xlsx',   mm:'02',yyyy:'2026' },
  { file:'DRE 03-2026.xlsx',   mm:'03',yyyy:'2026' },
  { file:'DRE 04-2026.xlsx',   mm:'04',yyyy:'2026' },
  { file:'DRE 05-2026.xlsx',   mm:'05',yyyy:'2026' },
];

const MONTH_LABELS = {
  '01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun',
  '07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez'
};

const CAT_LABELS = {
  21:'Custo Direto',
  22:'Desp. com Pessoal',
  23:'Desp. Administrativas',
  24:'Custo da Estrutura',
  25:'Resultado Financeiro',
  26:'Despesa por Fora',
  27:'Sublocação de Equip.',
};

const CAT_FIELD = {
  21:'custoDireto', 22:'despPessoal', 23:'despAdmin',
  24:'custoEstrutura', 25:'resultFinanceiro',
  26:'despForaFora', 27:'sublocacaoEquip',
};

function r2(v) { return Math.round((v||0)*100)/100; }
function toNum(v) {
  if (v===null||v===undefined||v==='') return 0;
  if (typeof v==='number') return isNaN(v)?0:v;
  const s = String(v).trim().replace(/\s/g,'');
  // BR format "1.234,56"
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))
    return parseFloat(s.replace(/\./g,'').replace(',','.'))||0;
  return parseFloat(s.replace(',','.'))||0;
}

// ── FLUXO extraction ───────────────────────────────────────────────
function extractFluxo(wb) {
  const name = wb.SheetNames.find(s=>s.toUpperCase().includes('FLUXO'));
  if (!name) return null;
  console.log(`    FLUXO: "${name}"`);

  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], {header:1, defval:''});

  const d = {
    receitaTotal:0, receitaObras:0, receitaEventos:0, receitaDiversas:0,
    custosTotal:0, custoDireto:0, despPessoal:0, despAdmin:0,
    custoEstrutura:0, resultFinanceiro:0, despForaFora:0, sublocacaoEquip:0,
    lucroLiquido:null,
    topReceitas:[], detalhesItens:[],
  };

  for (const row of rows) {
    if (!row||row.length<2) continue;
    const codeRaw = String(row[0]||'').trim();
    const desc    = String(row[1]||'').trim().toUpperCase();
    const valor   = toNum(row[2]);
    const code    = parseFloat(codeRaw);
    if (isNaN(code)) continue;
    const ci = Math.floor(code);

    // Revenue totals
    if (ci===1 && desc.includes('TOTAL')&&desc.includes('RECEITA')) d.receitaTotal=valor;
    else if (ci===11) d.receitaObras=valor;
    else if (ci===12) d.receitaEventos=valor;
    else if (ci===13) d.receitaDiversas=valor;
    // Revenue detail
    else if (ci>=1100&&ci<=1399&&valor>0) {
      const cat = ci>=1200?'Eventos':ci>=1100?'Obras':'Diversas';
      d.topReceitas.push({code:ci, desc:String(row[1]||'').trim(), cat, valor:r2(valor)});
    }
    // Cost totals
    else if (ci===2&&desc.includes('TOTAL')&&desc.includes('CUSTO')) d.custosTotal=valor;
    else if (ci===21) d.custoDireto=valor;
    else if (ci===22) d.despPessoal=valor;
    else if (ci===23) d.despAdmin=valor;
    else if (ci===24) d.custoEstrutura=valor;
    else if (ci===25) d.resultFinanceiro=valor;
    else if (ci===26) d.despForaFora=valor;
    else if (ci===27) d.sublocacaoEquip=valor;
    // Cost detail items
    else if (ci>=2100&&ci<=2799&&valor>0) {
      const catCode = Math.floor(ci/100);
      d.detalhesItens.push({
        code:ci, desc:String(row[1]||'').trim(),
        cat: CAT_LABELS[catCode]||`Cat${catCode}`, valor:r2(valor)
      });
    }
    // Resultado Líquido (code like 45809, 46023 = date serial)
    else if (code>40000&&desc.includes('RESULTADO')&&desc.includes('LÍQUID')) {
      d.lucroLiquido=valor;
    }
  }

  // Fallbacks
  if (!d.custosTotal||d.custosTotal===0) {
    d.custosTotal=d.custoDireto+d.despPessoal+d.despAdmin+
      d.custoEstrutura+d.resultFinanceiro+d.despForaFora+d.sublocacaoEquip;
  }
  if (d.lucroLiquido===null) d.lucroLiquido=d.receitaTotal-d.custosTotal;

  d.topReceitas = d.topReceitas.sort((a,b)=>b.valor-a.valor).slice(0,10);
  d.topCustos   = d.detalhesItens.sort((a,b)=>b.valor-a.valor).slice(0,10);

  // Build detalhesCustos map
  d.detalhesCustos = {};
  for (const [ci,label] of Object.entries(CAT_LABELS)) {
    const v = d[CAT_FIELD[ci]];
    if (v&&v>0) d.detalhesCustos[label]=r2(v);
  }

  return d;
}

// ── MANUT extraction ───────────────────────────────────────────────
function extractManut(wb) {
  const name = wb.SheetNames.find(s=>s.toUpperCase().includes('MANUT'));
  if (!name) return { total:0, porFornecedor:[], porVeiculo:[] };
  console.log(`    MANUT: "${name}"`);

  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], {header:1, defval:''});

  let total = 0;
  const fornMap = {};
  const veicMap = {};

  for (let i=1; i<rows.length; i++) {
    const row = rows[i];
    if (!row||row.length<4) continue;

    // Col 4 = Centro de Custo (vehicle plate code like "MANUT. DE FROTA - GA")
    const cc  = String(row[4]||'').trim();
    // Col 2 = Razão Social (supplier)
    const sup = String(row[2]||'').trim();
    // Value: use col 15 (rateio) if available, else col 10, else col 9
    let val = toNum(row[15]);
    if (!val||val===0) val = toNum(row[10]);
    if (!val||val===0) val = toNum(row[9]);

    if (val>0 && val<5000000 && cc && !cc.toUpperCase().includes('TOTAL')) {
      total += val;
      // Extract plate from CC string (last 2-3 chars after last "-")
      const platePart = cc.split('-').pop().trim();
      const plate = platePart.length>0 && platePart.length<=10 ? platePart : cc.slice(-8);
      veicMap[plate] = (veicMap[plate]||0) + val;
      if (sup && sup.length>2) fornMap[sup] = (fornMap[sup]||0) + val;
    }
  }

  // If total from rows is 0, try the grand total cell (last row, col 10)
  if (total === 0) {
    for (let i=rows.length-1; i>=0; i--) {
      const row = rows[i];
      if (!row) continue;
      for (let j=8; j<=15; j++) {
        const v = toNum(row[j]);
        if (v>0 && v<5000000) { total=v; break; }
      }
      if (total>0) break;
    }
  }

  const porFornecedor = Object.entries(fornMap)
    .sort((a,b)=>b[1]-a[1]).slice(0,10)
    .map(([nome,valor])=>({nome, valor:r2(valor)}));

  const porVeiculo = Object.entries(veicMap)
    .sort((a,b)=>b[1]-a[1]).slice(0,15)
    .map(([placa,valor])=>({placa, valor:r2(valor)}));

  return { total:r2(total), porFornecedor, porVeiculo };
}

// ── MAIN ──────────────────────────────────────────────────────────
const output = [];
const errors = [];

for (const entry of MONTHS) {
  const fp = path.join(DIR, entry.file);
  const mesKey = `${entry.yyyy}-${entry.mm}`;
  const label  = `${MONTH_LABELS[entry.mm]}/${entry.yyyy.slice(2)}`;

  console.log(`\n📂 [${mesKey}] ${entry.file}`);

  if (!fs.existsSync(fp)) {
    console.log('  ❌ Not found'); errors.push({mes:mesKey,error:'Not found'}); continue;
  }

  let wb;
  try { wb = XLSX.readFile(fp, {cellNF:false, cellStyles:false}); }
  catch(e) { console.log('  ❌',e.message); errors.push({mes:mesKey,error:e.message}); continue; }

  const fluxo = extractFluxo(wb);
  const manut = extractManut(wb);

  if (!fluxo||fluxo.receitaTotal===0) {
    console.log('  ⚠️  No FLUXO data'); errors.push({mes:mesKey,error:'No FLUXO data'});
  }

  const f = fluxo||{};
  const margem = f.receitaTotal>0 ? (f.lucroLiquido/f.receitaTotal)*100 : 0;

  const rec = {
    mes: mesKey, label,
    receitaTotal:     r2(f.receitaTotal||0),
    receitaObras:     r2(f.receitaObras||0),
    receitaEventos:   r2(f.receitaEventos||0),
    receitaDiversas:  r2(f.receitaDiversas||0),
    custosTotal:      r2(f.custosTotal||0),
    custoDireto:      r2(f.custoDireto||0),
    despPessoal:      r2(f.despPessoal||0),
    despAdmin:        r2(f.despAdmin||0),
    custoEstrutura:   r2(f.custoEstrutura||0),
    resultFinanceiro: r2(f.resultFinanceiro||0),
    despForaFora:     r2(f.despForaFora||0),
    sublocacaoEquip:  r2(f.sublocacaoEquip||0),
    lucroLiquido:     r2(f.lucroLiquido||0),
    margem:           r2(margem),
    topReceitas:      f.topReceitas||[],
    topCustos:        f.topCustos||[],
    detalhesCustos:   f.detalhesCustos||{},
    manutTotal:       manut.total,
    manutFornecedor:  manut.porFornecedor,
    manutVeiculo:     manut.porVeiculo,
  };

  output.push(rec);
  const fmt = v=>(v||0).toLocaleString('pt-BR',{maximumFractionDigits:0});
  console.log(`  ✅ Rec=${fmt(rec.receitaTotal)} | Cust=${fmt(rec.custosTotal)} | Lucro=${fmt(rec.lucroLiquido)} | Margem=${rec.margem.toFixed(1)}%`);
  console.log(`     Obras=${fmt(rec.receitaObras)} | Eventos=${fmt(rec.receitaEventos)} | Diversas=${fmt(rec.receitaDiversas)}`);
  console.log(`     ManutFrota=${fmt(manut.total)}`);
}

fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf8');
console.log(`\n✅ ${output.length} months → ${OUTPUT}`);
if (errors.length) { console.log(`⚠️  ${errors.length} errors:`); errors.forEach(e=>console.log(`   ${e.mes}: ${e.error}`)); }

console.log('\n📊 FINAL TABLE:');
console.log('Mês      | Receita R$       | Custos R$        | Lucro R$         | Margem');
console.log('---------|------------------|------------------|------------------|-------');
for (const r of output) {
  const f = v=>(v||0).toLocaleString('pt-BR',{maximumFractionDigits:0}).padStart(16);
  console.log(`${r.label.padEnd(8)} |${f(r.receitaTotal)} |${f(r.custosTotal)} |${f(r.lucroLiquido)} | ${r.margem.toFixed(1)}%`);
}
