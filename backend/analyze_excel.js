const XLSX = require('xlsx');
const path = require('path');
const basePath = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\Folha\\Junho 2026';

function main() {
    // Read consignado.xlsx
    const wb1 = XLSX.readFile(path.join(basePath, 'Planilha consignado.xlsx'));
    const ws1 = wb1.Sheets[wb1.SheetNames[0]];
    const data1 = XLSX.utils.sheet_to_json(ws1, { header: 1 });
    console.log('=== PLANILHA CONSIGNADO ===');
    console.log('Linha 1 (headers):', data1[0]);
    console.log('\nPrimeiros 10 dados:');
    data1.slice(1, 11).forEach((row, i) => console.log(`  Row${i+2}:`, JSON.stringify(row)));

    // Read relatorio junho.xlsx
    const wb2 = XLSX.readFile(path.join(basePath, 'relatorio junho.xlsx'));
    console.log('\n=== RELATÓRIO JUNHO XLSX ===');
    console.log('Sheets:', wb2.SheetNames);
    const ws2 = wb2.Sheets[wb2.SheetNames[0]];
    const data2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
    console.log('\nLinha 1:', JSON.stringify(data2[0]));
    console.log('\nLinha 2:', JSON.stringify(data2[1]));
    console.log('\nPrimeiros 8 colaboradores (a partir da linha 2):');
    data2.slice(1, 9).forEach((row, i) => console.log(`  Row${i+2}:`, JSON.stringify(row)));

    // Show cell range info
    const range = XLSX.utils.decode_range(ws2['!ref']);
    console.log('\nRange:', ws2['!ref'], '- Cols:', range.e.c+1, '- Rows:', range.e.r+1);
}
main();
