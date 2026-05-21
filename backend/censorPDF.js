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

async function censorBOPdf(inputPath, outputPath) {
    try {
        const pdfBytes = fs.readFileSync(inputPath);
        
        // Find coordinate
        const coord = await getDeclaranteYCoordinate(pdfBytes);
        
        // Load for editing
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        if (coord) {
            // The text is found
            const pageIndex = coord.pageNum - 1;
            const page = pdfDoc.getPages()[pageIndex];
            
            // Draw a black rectangle over the details.
            // The text "1 - Declarante" is at coord.y. The details (Name, CPF, etc.) are below it.
            // Since Y is from bottom-left, "below" means a SMALLER Y value.
            // We'll draw a box starting from (coord.y - 80) up to (coord.y - 10).
            // Height = 75 points. Width = 500 (covers the whole width). X = 40 (left margin).
            page.drawRectangle({
                x: 40,
                y: coord.y - 80,
                width: 520,
                height: 85,
                color: rgb(0, 0, 0), // Black
            });
            console.log(`[CENSOR] Censura aplicada na página ${coord.pageNum} na altura Y=${coord.y}`);
        } else {
            console.log(`[CENSOR] AVISO: "1 - Declarante" não encontrado no BO ${inputPath}.`);
        }
        
        const modifiedPdfBytes = await pdfDoc.save();
        fs.writeFileSync(outputPath, modifiedPdfBytes);
        return true;
    } catch (err) {
        console.error(`[CENSOR] Erro ao censurar ${inputPath}:`, err.message);
        return false;
    }
}

module.exports = { censorBOPdf };
