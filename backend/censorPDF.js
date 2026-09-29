const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
const { PdfReader } = require('pdfreader');
const path = require('path');
const os = require('os');

// ===================================================================
// CENSURA SELETIVA DO BO — DADOS SENSÍVEIS DA DECLARANTE
//
// Estratégia:
//   1. Usa pdfreader para extrair texto COM coordenadas de cada item
//   2. Localiza "Nicolle Mezuraro Maio" como ponto âncora do bloco Declarante
//   3. Na seção desse bloco, localiza os labels e seus valores:
//      - "Dt. de Nascimento:" → valor com formato DD/MM/AAAA
//      - "CPF:" → valor com 11 dígitos
//      - "Mãe:" → valor na mesma linha Y
//   4. Usa pdf-lib para desenhar retângulos pretos sobre cada valor
//
// O pdfreader usa um sistema de coordenadas onde:
//   - A página A4 tem dimensões aprox 37.19 x 52.63 unidades
//   - pdf-lib usa pts: A4 = 595 x 842 pts
//   - Fator de conversão: 16 pts por unidade pdfreader
//   - Y pdfreader cresce de cima para baixo; pdf-lib de baixo para cima
// ===================================================================

const PDFREADER_TO_POINTS = 16;    // fator de escala
const ROW_HEIGHT_PTS = 14;         // altura estimada de uma linha de texto em pts
const RECT_PADDING = 2;            // padding extra ao redor do texto

/**
 * Extrai itens de texto com coordenadas de um buffer PDF
 * usando pdfreader (que suporta módulos CommonJS).
 */
function extractItemsFromBuffer(pdfBuffer) {
    return new Promise((resolve, reject) => {
        const tmpPath = path.join(os.tmpdir(), `bo_censor_${Date.now()}.pdf`);
        fs.writeFileSync(tmpPath, pdfBuffer);

        const pageData = {}; // { pageNum: { meta, items: [] } }
        let currentPage = 0;

        new PdfReader().parseFileItems(tmpPath, (err, item) => {
            if (err) {
                try { fs.unlinkSync(tmpPath); } catch (_) {}
                reject(err);
                return;
            }
            if (!item) {
                try { fs.unlinkSync(tmpPath); } catch (_) {}
                resolve(pageData);
                return;
            }
            if (item.page) {
                currentPage = item.page;
                pageData[currentPage] = { meta: item, items: [] };
            }
            if (item.text && pageData[currentPage]) {
                pageData[currentPage].items.push({ ...item, pageNum: currentPage });
            }
        });
    });
}

/**
 * Dado os dados de página do pdfreader, identifica os itens de texto
 * que devem ser censurados (valores sensíveis da Nicolle Mezuraro Maio).
 */
function findItemsToRedact(pageData) {
    const toRedact = [];

    Object.keys(pageData).forEach(pageNum => {
        const { items } = pageData[pageNum];

        // Procurar âncora: nome completo da declarante
        const nicolleItem = items.find(i => i.text && i.text.includes('Nicolle Mezuraro Maio'));
        if (!nicolleItem) return;

        console.log(`[CENSOR] Declarante encontrada na pág. ${pageNum}, y=${nicolleItem.y.toFixed(3)}`);

        // Seção da Nicolle: do y do nome até ~8 unidades abaixo
        const yStart = nicolleItem.y;
        const yEnd = nicolleItem.y + 8;
        const sectionItems = items.filter(i => i.y >= yStart && i.y <= yEnd);

        // Definição dos valores a censurar
        const targets = [
            {
                label: 'Dt. de Nascimento:',
                valueTest: (t) => /\d{2}\/\d{2}\/\d{4}/.test(t),
            },
            {
                label: 'CPF:',
                // aceita 11 dígitos com ou sem pontos/traços
                valueTest: (t) => /^\d{11}$/.test(t.replace(/[.\-\s]/g, '')),
            },
            {
                label: 'Mãe:',
                // qualquer texto não trivial que não seja outro label ou "Não Informado"
                valueTest: (t) =>
                    t.length > 3 &&
                    t !== 'Não Informado' &&
                    !['CPF:', 'Sexo:', 'RG:', 'Pai:', 'Dt. de Nascimento:', 'Mãe:', 'Cútis:', 'Vulgo:'].includes(t),
            },
        ];

        targets.forEach(({ label, valueTest }) => {
            // Encontrar o label dentro da seção
            const labelItem = sectionItems.find(i => i.text === label);
            if (!labelItem) {
                console.log(`[CENSOR]   Label não encontrado: "${label}"`);
                return;
            }

            // Valor: mesmo y (tolerância 0.3), x maior que o label, texto diferente do label
            const valueItem = sectionItems.find(i =>
                Math.abs(i.y - labelItem.y) < 0.3 &&
                i.x > labelItem.x &&
                i.text !== label &&
                valueTest(i.text)
            );

            if (!valueItem) {
                console.log(`[CENSOR]   Valor não encontrado para: "${label}"`);
                return;
            }

            console.log(`[CENSOR]   Censurando "${label}" → "${valueItem.text}" (x=${valueItem.x}, y=${valueItem.y})`);
            toRedact.push({ ...valueItem, pageNum: parseInt(pageNum) });
        });
    });

    return toRedact;
}

/**
 * Aplica retângulos pretos sobre os itens identificados no PDF.
 */
async function applyRedactions(pdfBuffer, itemsToRedact) {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    itemsToRedact.forEach(item => {
        const page = pages[item.pageNum - 1];
        if (!page) return;

        const { height } = page.getSize();
        const F = PDFREADER_TO_POINTS;

        // Converter coordenadas pdfreader → pdf-lib
        // pdf-lib origin: canto inferior esquerdo
        const x = item.x * F - RECT_PADDING;
        const y = height - (item.y * F) - ROW_HEIGHT_PTS + RECT_PADDING;
        const w = (item.w || 80) + RECT_PADDING * 2;
        const h = ROW_HEIGHT_PTS + RECT_PADDING * 2;

        page.drawRectangle({
            x,
            y,
            width: w,
            height: h,
            color: rgb(0, 0, 0),
            opacity: 1,
        });

        console.log(`[CENSOR]   Retângulo: pág ${item.pageNum} | x=${x.toFixed(1)}, y=${y.toFixed(1)}, w=${w.toFixed(1)}, h=${h}`);
    });

    return Buffer.from(await pdfDoc.save());
}

/**
 * Censura seletiva do BO em memória.
 * Recebe um Buffer do PDF e retorna um novo Buffer com os dados censurados.
 * Se não encontrar dados da Nicolle, retorna o buffer original (sem erro).
 */
async function censorBOPdfBuffer(pdfBuffer) {
    try {
        const buf = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

        // Passo 1: extrair itens com coordenadas
        const pageData = await extractItemsFromBuffer(buf);

        // Passo 2: identificar itens a censurar
        const itemsToRedact = findItemsToRedact(pageData);

        if (itemsToRedact.length === 0) {
            console.log('[CENSOR] Nenhum dado sensível encontrado — PDF salvo sem censura.');
            return buf;
        }

        // Passo 3: aplicar retângulos de censura
        const censored = await applyRedactions(buf, itemsToRedact);
        console.log(`[CENSOR] Censura concluída: ${itemsToRedact.length} item(ns) ocultado(s).`);
        return censored;

    } catch (err) {
        console.error('[CENSOR] Erro crítico:', err.message);
        // Em caso de erro, retornar buffer original para não bloquear o fluxo
        return pdfBuffer;
    }
}

/**
 * Censura seletiva do BO em arquivo (lê input → escreve output).
 */
async function censorBOPdf(inputPath, outputPath) {
    try {
        const pdfBytes = fs.readFileSync(inputPath);
        const modified = await censorBOPdfBuffer(pdfBytes);
        fs.writeFileSync(outputPath, modified);
        return true;
    } catch (err) {
        console.error(`[CENSOR] Erro ao processar ${inputPath}:`, err.message);
        return false;
    }
}

module.exports = { censorBOPdf, censorBOPdfBuffer };
