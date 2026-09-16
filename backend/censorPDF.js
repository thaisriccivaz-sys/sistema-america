const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

// ===================================================================

// ESTRATÉGIA DINÂMICA:
// O BO da Polícia Civil SP tem (na seção "Pessoas Físicas"):
//   - "1 -" Partes (colaborador envolvido) → NÃO censurar
//   - "2 -" Declarante (quem registrou o BO) → CENSURAR
//   - "3 -" próxima entrada → limite inferior da censura
//
// Detectamos "2 -" e "3 -" e desenhamos a tarja entre eles.
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

            let y2 = null; // Y de "2 -" (início da seção Declarante — topo da censura)
            let y3 = null; // Y de "3 -" (próxima seção — limite inferior da censura)
            let foundPessoas = false;

            for (const item of items) {
                const str = (item.str || '').trim();
                const x = item.transform[4];
                const y = item.transform[5];

                // Marca que chegamos na seção "Pessoas Físicas"
                if (str.includes('Pessoas F') || str.includes('Pessoas Físicas')) {
                    foundPessoas = true;
                }

                // Dentro de Pessoas Físicas, encontra "2 -" (X próximo à margem)
                if (foundPessoas && (str === '2 -' || str === '2-') && x < 60 && y2 === null) {
                    y2 = y;
                }

                // Depois de achar "2 -", procura "3 -" para delimitar o fim
                if (y2 !== null && (str === '3 -' || str === '3-') && x < 60 && y3 === null) {
                    y3 = y;
                    break;
                }
            }

            if (y2 !== null) {
                // Topo: um pouco acima da linha "2 - Declarante"
                // Base: logo acima de "3 -" (ou fallback de 7 linhas abaixo de "2 -")
                const top = y2 + 17;
                const bottom = y3 !== null
                    ? y3 + 7           // logo acima de "3 -"
                    : y2 - 115;        // fallback: ~7 linhas

                console.log(`[CENSOR] Detectado: pág=${pageNum}, "2-" Y=${y2.toFixed(1)}, "3-" Y=${y3 !== null ? y3.toFixed(1) : 'N/A'}`);
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
            // "2 -" Declarante em Y≈353, "3 -" em Y≈242 → tarja de Y=249 até Y=370 (height=121)
            console.log('[CENSOR] Fallback: usando coordenadas fixas do layout padrão.');
            if (pages.length > 0) {
                pages[0].drawRectangle({
                    x: 33,
                    y: 249,
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
