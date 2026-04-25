// Script para testar extração de texto de um BO PDF
// Uso: node test_bo_extract.js <caminho_para_bo.pdf>
const fs = require('fs');
const pdfParse = require('pdf-parse');

const filePath = process.argv[2];
if (!filePath) {
    console.log('Uso: node test_bo_extract.js <caminho_para_bo.pdf>');
    process.exit(1);
}

const buffer = fs.readFileSync(filePath);
pdfParse(buffer).then(data => {
    console.log('=== TEXTO EXTRAÍDO DO PDF ===');
    console.log(data.text);
    console.log('\n=== FIM DO TEXTO ===');
    console.log('\n=== TESTANDO REGEX ===');
    
    const text = data.text;
    
    // Testa vários padrões possíveis para boletim
    const boletimTests = [
        /Boletim\s+N[ºo°]?:?\s*([A-Za-z0-9][-A-Za-z0-9]*\/\d{4})/i,
        /Boletim[^:]*:\s*([A-Za-z]{2}\d+-\d+\/\d{4})/i,
        /BO[:\s]+([A-Za-z0-9][-A-Za-z0-9]*\/\d{4})/i,
        /N[ºo°]?\s+do\s+BO[:\s]+([A-Za-z0-9/-]+)/i,
        /([A-Z]{2}\d+-\d+\/\d{4})/,
    ];
    
    console.log('\n--- Boletim ---');
    boletimTests.forEach((r, i) => {
        const m = text.match(r);
        console.log(`Pattern ${i+1}: ${m ? m[1] : 'não encontrado'}`);
    });
    
    // Data/hora
    const dataTests = [
        /(\d{2}\/\d{2}\/\d{4})\s*[aà]s?\s*(\d{2}:\d{2})/i,
        /(\d{2}\/\d{2}\/\d{4})\s*(\d{2}h\d{2})/i,
        /Data.*?Ocorr[êe]ncia[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
        /Ocorr[êe]ncia[:\s]+(\d{2}\/\d{2}\/\d{4}\s*[aà]s?\s*\d{2}:\d{2})/i,
    ];
    
    console.log('\n--- Data/Hora ---');
    dataTests.forEach((r, i) => {
        const m = text.match(r);
        console.log(`Pattern ${i+1}: ${m ? JSON.stringify(m.slice(1)) : 'não encontrado'}`);
    });
    
    // Natureza
    const naturezaTests = [
        /Natureza[s]?\s+da\s+Ocorr[êe]ncia[:\s\n]+([^\n]+)/i,
        /Natureza[:\s]+([^\n]+)/i,
    ];
    
    console.log('\n--- Natureza ---');
    naturezaTests.forEach((r, i) => {
        const m = text.match(r);
        console.log(`Pattern ${i+1}: ${m ? m[1].trim() : 'não encontrado'}`);
    });
    
    // Placa
    const placaTests = [
        /Placa[:\s]+([A-Z]{3}[-\s]?\d[A-Z0-9]\d{2})/i,
        /Placa[:\s]+([A-Z0-9-]{6,8})/i,
        /\b([A-Z]{3}\d{4})\b/,
        /\b([A-Z]{3}-\d{4})\b/,
        /\b([A-Z]{3}\d[A-Z]\d{2})\b/,
    ];
    
    console.log('\n--- Placa ---');
    placaTests.forEach((r, i) => {
        const m = text.match(r);
        console.log(`Pattern ${i+1}: ${m ? m[1] : 'não encontrado'}`);
    });
    
    // Marca/Modelo
    const modeloTests = [
        /Marca\s*[\/e]\s*Modelo[:\s]+([^\n]+)/i,
        /Ve[íi]culo[:\s]+([^\n]+)/i,
        /Modelo[:\s]+([^\n]+)/i,
    ];
    
    console.log('\n--- Marca/Modelo ---');
    modeloTests.forEach((r, i) => {
        const m = text.match(r);
        console.log(`Pattern ${i+1}: ${m ? m[1].trim() : 'não encontrado'}`);
    });
    
}).catch(err => {
    console.error('Erro ao processar PDF:', err.message);
});
