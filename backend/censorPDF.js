const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

// ===================================================================
// ESTRATÉGIA DINÂMICA:
// O BO da Polícia Civil SP sempre tem:
//   - "1 -" (X≈33) → início da seção Declarante  
//   - "2 -" (X≈33) → início da seção Partes (NÃO deve ser censurado)
//
// Detectamos os dois marcadores e desenhamos a tarja exatamente
// entre eles, independente da posição Y no documento.
// ===================================================================

async function findCensorBounds(buf) {
    try {
        const pdfjsLib = require('pdfjs-dist');
        const uint8Array = new Uint8Array(buf);
        const pdfDocument = await pdfjsLib.getDocument({ data: uint8Array }).promise;
        const numPages = Math.min(pdfDocument.numPages, 2);

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            const items = textContent.items;

            let y1 = null; // Y de "1 -" (topo da seção Declarante)
            let y2 = null; // Y de "2 -" (início de Partes — limite inferior)
            let foundPessoas = false;

            for (const item of items) {
                const str = (item.str || '').trim();
                const x = item.transform[4];
                const y = item.transform[5];

                // Marca que chegamos na seção "Pessoas Físicas"
                if (str.includes('Pessoas F') || str.includes('Pessoas Físicas')) {
                    foundPessoas = true;
                }

                // Dentro da seção Pessoas Físicas, encontra "1 -" (X pequeno, próximo à margem)
                if (foundPessoas && (str === '1 -' || str === '1-') && x < 60 && y1 === null) {
                    y1 = y;
                }

                // Depois de achar "1 -", procura "2 -" para delimitar o fim
                if (y1 !== null && (str === '2 -' || str === '2-') && x < 60 && y2 === null) {
                    y2 = y;
                    break;
                }
            }

            if (y1 !== null) {
                // Se achou "2 -", a tarja vai de logo acima de "2 -" até logo acima de "1 -"
                // Se não achou "2 -", usa altura fixa de ~115pts (7 linhas × ~17pts)
                const top = y1 + 17;   // um pouco acima da linha "1 - Declarante"
                const bottom = y2 !== null
                    ? y2 + 7           // logo acima de "2 - Partes"
                    : y1 - 115;        // fallback: 7 linhas abaixo de "1 -"

                console.log(`[CENSOR] Detectado: pág=${pageNum}, "1-" Y=${y1.toFixed(1)}, "2-" Y=${y2 !== null ? y2.toFixed(1) : 'N/A'}`);
                console.log(`[CENSOR] Tarja: bottom=${bottom.toFixed(0)} até top=${top.toFixed(0)}, height=${(top - bottom).toFixed(0)}`);

                return {
                    pageIndex: pageNum - 1,
                    x: 33,
                    y: bottom,
                    width: 530,
                    height: top - bottom,
                };
            }
        }
        return null;
    } catch (e) {
        console.warn('[CENSOR] pdfjs-dist falhou:', e.message);
        return null;
    }
}

async function censorBOPdfBuffer(pdfBuffer) {
    try {
        const buf = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

        // Detecta os limites dinamicamente
        const bounds = await findCensorBounds(buf);

        const pdfDoc = await PDFDocument.load(buf);
        const pages = pdfDoc.getPages();

        if (bounds && bounds.pageIndex < pages.length) {
            pages[bounds.pageIndex].drawRectangle({
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                color: rgb(0, 0, 0),
            });
            console.log(`[CENSOR] Tarja aplicada com sucesso.`);
        } else {
            // Fallback: coordenadas fixas baseadas no BO padrão SP (página 1)
            // "1 -" em Y≈464, "2 -" em Y≈353 → tarja de Y=360 até Y=481 (height=121)
            console.log('[CENSOR] Fallback: usando coordenadas fixas do layout padrão.');
            if (pages.length > 0) {
                pages[0].drawRectangle({
                    x: 33,
                    y: 360,
                    width: 530,
                    height: 121,
                    color: rgb(0, 0, 0),
                });
            }
        }

        return await pdfDoc.save();
    } catch (err) {
        console.error('[CENSOR] Erro crítico:', err.message);
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
