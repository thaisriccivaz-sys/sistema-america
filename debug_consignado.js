const XLSX = require('xlsx');
const path = require('path');

const xlsxPath = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\Folha\\Junho 2026\\Planilha consignado.xlsx';
const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const header = rows[0];
const idxCpf = header.indexOf('cpf');
const idxNome = header.indexOf('nomeTrabalhador');
const idxValor = header.indexOf('valorParcela');
const idxInicio = header.indexOf('competenciaInicioDesconto');
const idxTotal = header.indexOf('totalParcelas');

console.log('Colunas:', header.join(' | '));
console.log('\nDados CPF | Nome | Valor | Início | TotalParcelas:');

// Filtrar Walace, Ygor, Jailson, Levi, Erik
const targets = ['walace', 'ygor', 'jailson', 'levi', 'erik', 'wendell'];

const grouped = {};
for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[idxNome]) continue;
    const nomeL = (row[idxNome] || '').toLowerCase();
    const isTarget = targets.some(t => nomeL.includes(t));
    if (isTarget) {
        const cpf = String(row[idxCpf] || '').replace(/[.\-]/g, '');
        if (!grouped[cpf]) grouped[cpf] = { nome: row[idxNome], valor: 0, parcelas: [] };
        const val = parseFloat(row[idxValor]) || 0;
        grouped[cpf].valor = Math.round((grouped[cpf].valor + val) * 100) / 100;
        grouped[cpf].parcelas.push({ val, inicio: row[idxInicio], total: row[idxTotal] });
        console.log(`  CPF="${cpf}" | Nome="${row[idxNome]}" | Valor=${val} | Início=${row[idxInicio]} | Total=${row[idxTotal]}`);
    }
}

console.log('\n=== TOTAIS POR CPF ===');
Object.entries(grouped).forEach(([cpf, d]) => {
    console.log(`CPF: ${cpf} | ${d.nome} | Total: R$ ${d.valor}`);
});
