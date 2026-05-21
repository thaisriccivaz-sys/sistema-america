const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
const pdfjsLib = require('pdfjs-dist');

async function getDeclaranteYCoordinate(pdfBuffer) {
    const uint8Array = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;
    
    // Check first 2 pages
    const numPages = Math.min(pdfDocument.numPages, 2);
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        for (const item of textContent.items) {
            // Find "1 - Declarante" or similar
            if (item.str && item.str.includes('1 - Declarante')) {
                // item.transform is a 6-element array: [scaleX, skewY, skewX, scaleY, x, y]
                // item.transform[5] is the Y coordinate from the bottom of the page
                return { pageNum, y: item.transform[5] };
            }
        }
    }
    return null; // Not found
}

async function censorBOPdfBuffer(pdfBuffer) {
    try {
        const coord = await getDeclaranteYCoordinate(pdfBuffer);
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        
        if (coord) {
            const pageIndex = coord.pageNum - 1;
            const page = pdfDoc.getPages()[pageIndex];
            
            page.drawRectangle({
                x: 40,
                y: coord.y - 80,
                width: 520,
                height: 85,
                color: rgb(0, 0, 0),
            });
            console.log(`[CENSOR] Censura aplicada na página ${coord.pageNum} na altura Y=${coord.y}`);
        } else {
            console.log(`[CENSOR] AVISO: "1 - Declarante" não encontrado no BO em memória.`);
        }
        
        return await pdfDoc.save();
    } catch (err) {
        console.error(`[CENSOR] Erro ao censurar buffer em memória:`, err.message);
        return null;
    }
}

async function censorBOPdf(inputPath, outputPath) {
    try {
        const pdfBytes = fs.readFileSync(inputPath);
        const modifiedPdfBytes = await censorBOPdfBuffer(pdfBytes);
        if (modifiedPdfBytes) {
            fs.writeFileSync(outputPath, modifiedPdfBytes);
            return true;
        }
        return false;
    } catch (err) {
        console.error(`[CENSOR] Erro ao ler/salvar ${inputPath}:`, err.message);
        return false;
    }
}

module.exports = { censorBOPdf, censorBOPdfBuffer };
