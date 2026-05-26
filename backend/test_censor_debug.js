// Script de diagnóstico: detecta posição do texto "1 - Declarante" no BO
// Uso: node backend/test_censor_debug.js <caminho_para_o_pdf>
const fs = require('fs');
const pdfjsLib = require('pdfjs-dist');

async function analisar(pdfPath) {
    const pdfBuffer = fs.readFileSync(pdfPath);
    const uint8Array = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;
    
    console.log(`Páginas: ${pdfDocument.numPages}`);
    
    for (let pageNum = 1; pageNum <= Math.min(pdfDocument.numPages, 3); pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        console.log(`\n=== PÁGINA ${pageNum} (altura=${viewport.height.toFixed(1)}, largura=${viewport.width.toFixed(1)}) ===`);
        
        const textContent = await page.getTextContent();
        for (const item of textContent.items) {
            if (item.str && item.str.trim().length > 1) {
                const x = item.transform[4].toFixed(1);
                const y = item.transform[5].toFixed(1);
                // Só mostrar itens que contenham palavras-chave
                const str = item.str.toLowerCase();
                if (str.includes('declarante') || str.includes('cpf') || str.includes('nascimento') 
                    || str.includes('mãe') || str.includes('mae') || str.includes('nome')
                    || str.includes('1 -') || str.includes('2 -') || str.includes('pessoas')) {
                    console.log(`  Y=${y} X=${x} | "${item.str}"`);
                }
            }
        }
    }
}

const pdfPath = process.argv[2];
if (!pdfPath) {
    console.error('Uso: node test_censor_debug.js <caminho_pdf>');
    process.exit(1);
}
analisar(pdfPath).catch(console.error);
