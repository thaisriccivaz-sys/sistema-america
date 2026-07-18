
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const dir = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Financeiro';

const arquivos = [
  { file: 'DRE 01-2024.xlsx', mes: '2024-01', label: 'Jan/24', fluxo: 'FLUXO CAIXA ANAL.ORIG' },
  { file: 'DRE 02-2024.xlsx', mes: '2024-02', label: 'Fev/24', fluxo: 'FLUXO DE CAIXA ANAL. 02-2024' },
  { file: 'DRE 03-2024.xlsx', mes: '2024-03', label: 'Mar/24', fluxo: 'FLUXO DE CAIXA ANAL.03-2024' },
  { file: 'DRE - 04-2024.xlsx', mes: '2024-04', label: 'Abr/24', fluxo: 'FLUXO DE CAIXA ANAL. 04-2024' },
  { file: 'DRE - 05-2024.xlsx', mes: '2024-05', label: 'Mai/24', fluxo: 'FLUXO DE CAIXA ANAL. 05-24' },
  { file: 'DRE - 06-2024.xlsx', mes: '2024-06', label: 'Jun/24', fluxo: 'FLUXO DE CAIXA ANAL.06-2024' },
  { file: 'DRE 07-2024...xlsx', mes: '2024-07', label: 'Jul/24', fluxo: 'FLUXO DE CAIXA ANAL. 07-2024' },
  { file: 'DRE 08-2024.xlsx', mes: '2024-08', label: 'Ago/24', fluxo: 'FLUXO ANAL.08-2024' },
  { file: 'DRE 09-2024.xlsx', mes: '2024-09', label: 'Set/24', fluxo: 'FLUXO CAIXA 09-2024' },
  { file: 'DRE 10-2024.xlsx', mes: '2024-10', label: 'Out/24', fluxo: 'FLUXO DE CAIXA 10-2024' },
  { file: 'DRE 11-2024.xlsx', mes: '2024-11', label: 'Nov/24', fluxo: 'FLUXO DE CAIXA  11-2024' },
  { file: 'DRE 12-2024.xlsx', mes: '2024-12', label: 'Dez/24', fluxo: 'FLUXO DE CAIXA 12-2024' },
  { file: 'DRE 01-2025.xlsx', mes: '2025-01', label: 'Jan/25', fluxo: 'FLUXO DE CAIXA 01-2025' },
  { file: 'DRE 02-2025.xlsx', mes: '2025-02', label: 'Fev/25', fluxo: 'FLUXO DE CAIXA 02-2025' },
  { file: 'DRE 03-2025.xlsx', mes: '2025-03', label: 'Mar/25', fluxo: 'FLUXO DE CAIXA 03-2025' },
  { file: 'DRE 04-2025.xlsx', mes: '2025-04', label: 'Abr/25', fluxo: 'FLUXO DE CAIXA 04-2025' },
  { file: 'DRE 05-2025.xlsx', mes: '2025-05', label: 'Mai/25', fluxo: 'FLUXO DE CAIXA 05-2025' },
  { file: 'DRE 06-2025.xlsx', mes: '2025-06', label: 'Jun/25', fluxo: 'FLUXO DE CAIXA 06-2025' },
  { file: 'DRE 07-2025.xlsx', mes: '2025-07', label: 'Jul/25', fluxo: 'FLUXO DE CAIXA 07-2025' },
  { file: 'DRE 08-2025.xlsx', mes: '2025-08', label: 'Ago/25', fluxo: 'FLUXO DE CAIXA ANAL. 08-2025' },
  { file: 'DRE 09-2025.xlsx', mes: '2025-09', label: 'Set/25', fluxo: 'FLUXO DE CAIXA ANAL. 09-2025' },
  { file: 'DRE 10-2025.xlsx', mes: '2025-10', label: 'Out/25', fluxo: 'FLUXO DE CAIXA ANAL. 10-2025' },
  { file: 'DRE 11-2025.xlsx', mes: '2025-11', label: 'Nov/25', fluxo: 'FLUXO DE CAIXA ANAL.11-2025' },
  { file: 'DRE 12-2025.xlsx', mes: '2025-12', label: 'Dez/25', fluxo: 'FLUXO DE CAIXA ANAL.12-2025' },
  { file: 'DRE 01-2026.xlsx', mes: '2026-01', label: 'Jan/26', fluxo: 'FLUXO DE CAIXA 01-2026' },
  { file: 'DRE 02-2026.xlsx', mes: '2026-02', label: 'Fev/26', fluxo: 'FLUXO DE CAIXA 02-2026' },
  { file: 'DRE 03-2026.xlsx', mes: '2026-03', label: 'Mar/26', fluxo: 'FLUXO DE CAIXA 03-2026' },
  { file: 'DRE 04-2026.xlsx', mes: '2026-04', label: 'Abr/26', fluxo: 'FLUXO DE CAIXA 04-2026' },
  { file: 'DRE 05-2026.xlsx', mes: '2026-05', label: 'Mai/26', fluxo: 'FLUXO DE CAIXA 05-2026' },
];

function parseVal(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;
}

function findVal(data, cod, descKey) {
  for (const row of data) {
    const c = row[0];
    const d = String(row[1] || '').trim().toUpperCase();
    if (cod !== null && (c === cod || c === String(cod))) return parseVal(row[2]);
    if (descKey && d.includes(descKey.toUpperCase())) return parseVal(row[2]);
  }
  return 0;
}

function getLineItems(data, fromCod, toCod) {
  const items = [];
  for (const row of data) {
    const c = Number(row[0]);
    if (c >= fromCod && c < toCod && row[1] && parseVal(row[2]) > 0) {
      items.push({ desc: String(row[1]).trim(), valor: parseVal(row[2]) });
    }
  }
  return items.sort((a, b) => b.valor - a.valor);
}

const resultado = [];

for (const arq of arquivos) {
  try {
    const wb = XLSX.readFile(path.join(dir, arq.file));
    // Encontrar aba FLUXO
    const wsName = wb.SheetNames.find(s => s === arq.fluxo) ||
                   wb.SheetNames.find(s => s.toUpperCase().includes('FLUXO'));
    if (!wsName) { console.log('SEM FLUXO: ' + arq.file); continue; }
    
    const ws = wb.Sheets[wsName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    const receitaTotal  = findVal(data, 1, null);
    const receitaObras  = findVal(data, 11, null);
    const receitaEventos= findVal(data, 12, null);
    const receitaDiversas= findVal(data, 13, null);
    const custosTotal   = findVal(data, 2, null);
    const custoDireto   = findVal(data, 21, null);
    const despPessoal   = findVal(data, 22, null);
    const despAdmin     = findVal(data, 23, null);
    const custoEstrutura= findVal(data, 24, null);
    const resultFinanc  = findVal(data, 25, null);
    const despForaFora  = findVal(data, 26, null);
    const sublocacao    = findVal(data, 27, null);

    // Resultado líquido - procurar por descrição
    let lucroLiquido = 0;
    for (const row of data) {
      const d = String(row[1] || '').toUpperCase();
      if (d.includes('RESULTADO') && (d.includes('LÍQUIDO') || d.includes('LIQUIDO') || d.includes('POSITIVO') || d.includes('NEGATIVO'))) {
        lucroLiquido = parseVal(row[2]);
        // Se negativo está na descrição
        if (d.includes('NEGATIVO')) lucroLiquido = -Math.abs(lucroLiquido);
        break;
      }
    }
    // Fallback
    if (lucroLiquido === 0) lucroLiquido = receitaTotal - custosTotal;

    const margem = receitaTotal > 0 ? (lucroLiquido / receitaTotal * 100) : 0;

    // Detalhes por linha
    const itensReceita  = getLineItems(data, 1100, 1400);
    const itensCustoDireto = getLineItems(data, 2100, 2200);
    const itensPessoal  = getLineItems(data, 2200, 2300);
    const itensAdmin    = getLineItems(data, 2300, 2400);
    const itensEstrutura= getLineItems(data, 2400, 2500);
    const itensFinanc   = getLineItems(data, 2500, 2600);

    resultado.push({
      mes: arq.mes, label: arq.label,
      receitaTotal, receitaObras, receitaEventos, receitaDiversas,
      custosTotal, custoDireto, despPessoal, despAdmin,
      custoEstrutura, resultFinanc, despForaFora, sublocacao,
      lucroLiquido, margem: +margem.toFixed(2),
      itensReceita: itensReceita.slice(0,10),
      itensCustoDireto: itensCustoDireto.slice(0,10),
      itensPessoal: itensPessoal.slice(0,10),
      itensAdmin: itensAdmin.slice(0,10),
      itensEstrutura, itensFinanc: itensFinanc.slice(0,10),
    });

    const sinal = lucroLiquido >= 0 ? '+' : '';
    console.log(`${arq.label} | Receita: R$${Math.round(receitaTotal).toLocaleString('pt-BR')} | Custos: R$${Math.round(custosTotal).toLocaleString('pt-BR')} | Resultado: ${sinal}R$${Math.round(lucroLiquido).toLocaleString('pt-BR')} (${margem.toFixed(1)}%)`);
  } catch(e) {
    console.error('ERRO em ' + arq.file + ': ' + e.message);
  }
}

const outPath = 'C:\\Users\\thata\\.gemini\\antigravity\\brain\\1c72ece8-0c4f-4134-bab6-026c8d479804\\scratch\\dre_v2.json';
fs.writeFileSync(outPath, JSON.stringify(resultado, null, 2));
console.log('\n✅ Dados salvos em: ' + outPath);
console.log('Total de meses extraídos: ' + resultado.length);
