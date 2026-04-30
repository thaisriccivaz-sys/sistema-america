// ============================================================
// EPI PDF RENDER - Funções de geração de PDF compartilhadas
// Usado por: epi.js (prontuário) e credenciamento-publico.html (link público)
// ============================================================

const TERMO_PADRAO_EPI = '•Confirmo perante minha assinatura que recebi o Equipamento de Proteção Individual - EPI, da Empresa: AMERICA RENTAL EQUIPAMENTOS LTDA. Vinculada ao CNPJ: 03.434.448/0001-01 de Inscrição estadual IE: 336.715.410.116 conforme descrito abaixo, para uso exclusivo no local de trabalho, conforme regulamentação da Norma Regulamentadora Nº 6, do Ministério do Trabalho e Emprego.\n•Declaro que estou ciente da obrigatoriedade do uso do EPI e da responsabilidade de usá-lo e conservá-lo. Minha recusa injustificada na utilização deste equipamento ou seu mau uso, constitui ato faltoso, conforme disposto no artigo 158 da CLT.\n•Declaro estar ciente da obrigatoriedade da devolução do Equipamento atual, quando da troca ou substituição dos mesmos.';

let _epiPdfLogoBase64 = null;
let _epiPdfLogoAspect = 0.11;
let _epiPdfLogoPromise = null;

window.ensureEpiPdfLogo = function(baseUrl) {
    if (_epiPdfLogoBase64) return Promise.resolve();
    if (_epiPdfLogoPromise) return _epiPdfLogoPromise;
    const src = (baseUrl || '') + '/assets/logo-header.png';
    _epiPdfLogoPromise = new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = src;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            _epiPdfLogoBase64 = canvas.toDataURL('image/png');
            _epiPdfLogoAspect = img.height / img.width;
            resolve();
        };
        img.onerror = () => resolve();
    });
    return _epiPdfLogoPromise;
};

function _epiPdfHeader(doc, W) {
    let y = 8;
    if (_epiPdfLogoBase64 && _epiPdfLogoAspect) {
        let lW = W - 26;
        let lH = lW * _epiPdfLogoAspect;
        if (lH > 28) { lH = 28; lW = lH / _epiPdfLogoAspect; }
        doc.addImage(_epiPdfLogoBase64, 'PNG', W/2 - lW/2, y, lW, lH);
        y += lH + 4;
    } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(13, 71, 161);
        doc.text('AMERICA Rental', W / 2, y, { align: 'center' });
        y += 8;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('RECURSOS HUMANOS - NR 06', W / 2, y, { align: 'center' });
    y += 5;
    doc.text('FICHA OBRIGATÓRIA DE E.P.I (RECIBO DE ENTREGA)', W / 2, y, { align: 'center' });
    return y + 4;
}

function _epiPdfColabBox(doc, W, margin, y, colab) {
    const boxH = 18;
    doc.setLineWidth(0.3);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, W - margin * 2, 6, 'FD');
    doc.rect(margin, y, W - margin * 2, boxH);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(30, 41, 59);
    doc.text('DADOS DO COLABORADOR', margin + 3, y + 4.2);

    y += 6;
    const col1 = margin + 3;
    const col2 = W / 2 + 10;
    const fmtData = s => { if (!s) return '—'; const p = s.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s; };

    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(0, 0, 0);
    doc.text('NOME:', col1, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(colab.nome || colab.nome_completo || '—', col1 + 10, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text('ADMISSÃO:', col2, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtData(colab.admissao || colab.data_admissao), col2 + 18, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text('RG:', col1, y + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(colab.rg || '—', col1 + 6, y + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.text('CPF:', col1 + 40, y + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(colab.cpf || '—', col1 + 48, y + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.text('CARGO:', col2, y + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(colab.cargo || '—', col2 + 13, y + 9.5);

    return y + boxH - 6 + 4;
}

function _epiPdfEntregaTable(doc, W, margin, y, linhas) {
    const colW = [28, 110, W - margin * 2 - 138];
    const heads = ['DATA', 'DESCRIÇÃO DE E.P.I', 'Ass. do Colaborador'];
    const hH = 8, rH = 10;
    let cx = margin;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0);
    heads.forEach((h, i) => {
        doc.setFillColor(228, 235, 245);
        doc.setLineWidth(0.3); doc.rect(cx, y, colW[i], hH, 'FD');
        doc.text(h, cx + colW[i] / 2, y + 5, { align: 'center' }); cx += colW[i];
    });
    y += hH;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    linhas.forEach(ln => {
        cx = margin;
        colW.forEach(w => { doc.setLineWidth(0.2); doc.rect(cx, y, w, rH); cx += w; });
        if (ln && typeof ln === 'object') {
            if (ln.data) doc.text(ln.data, margin + 2, y + 6.5);
            if (ln.descricao) {
                const wrapped = doc.splitTextToSize(ln.descricao, colW[1] - 4);
                doc.text(wrapped[0] + (wrapped.length > 1 ? '...' : ''), margin + colW[0] + 2, y + 6.5);
            }
            if (ln.assinatura_base64) {
                try {
                    const sigX = margin + colW[0] + colW[1] + 2;
                    const maxH = rH - 1; const maxW = colW[2] - 4;
                    const imgW = maxH * 3 > maxW ? maxW : maxH * 3;
                    const imgH = maxH * 3 > maxW ? maxW / 3 : maxH;
                    const offsetX = sigX + (colW[2] - imgW) / 2 - 1;
                    const offsetY = y + (rH - imgH) / 2;
                    doc.addImage(ln.assinatura_base64, 'PNG', offsetX, offsetY, imgW, imgH);
                } catch(e) {}
            }
        }
        y += rH;
    });
    return y;
}

/**
 * Gera o documento jsPDF da Ficha de EPI — IDÊNTICO ao prontuário.
 * @param {object} template - { epis[], termo_texto, rodape_texto }
 * @param {object} colab    - { nome, rg, cpf, cargo, admissao }
 * @param {function} jsPDF  - window.jspdf.jsPDF
 * @param {array}  linhasFilled - entregas: [{ data, descricao, assinatura_base64 }]
 * @returns {jsPDF doc}
 */
window.gerarDocEpiPublico = function(template, colab, jsPDF, linhasFilled) {
    const entries = linhasFilled || [];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, margin = 13;

    // FRENTE
    let y = _epiPdfHeader(doc, W);
    y = _epiPdfColabBox(doc, W, margin, y, colab);

    const epis = template.epis || [];
    const colMid = W / 2 + 4;
    const hdrH = 8, rowH = 6.8;
    const numBodyRows = epis.length;
    const bodyH = numBodyRows * rowH;
    const tableTop = y;

    doc.setFillColor(228, 235, 245);
    doc.setLineWidth(0.3);
    doc.rect(margin, tableTop, colMid - margin, hdrH, 'FD');
    doc.rect(colMid, tableTop, W - margin - colMid, hdrH, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
    doc.text('LISTA DE E.P.I NESCESSÁRIO', (margin + colMid) / 2, tableTop + 5.5, { align: 'center' });
    doc.text('TERMO DE RESPONSABILIDADE', (colMid + W - margin) / 2, tableTop + 5.5, { align: 'center' });
    y = tableTop + hdrH;

    doc.setLineWidth(0.25);
    doc.rect(margin, y, colMid - margin, bodyH);
    doc.rect(colMid, y, W - margin - colMid, bodyH);

    const toTitleCase = s => s.replace(/\wS*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    epis.forEach((epi, i) => {
        const ry = y + (i * rowH) + rowH - 2;
        doc.text(toTitleCase(epi), margin + 2, ry);
        doc.setLineWidth(0.1);
        doc.line(margin, y + (i + 1) * rowH, colMid, y + (i + 1) * rowH);
    });

    const termoItems = (template.termo_texto || TERMO_PADRAO_EPI).split('\n');
    let termoY = y + 5;
    doc.setFontSize(8.5);
    termoItems.forEach(linha => {
        const wrapped = doc.splitTextToSize(linha, W - margin - colMid - 5);
        wrapped.forEach(l => {
            if (termoY < y + bodyH - 20) { doc.text(l, colMid + 2.5, termoY); termoY += 4.2; }
        });
        termoY += 2;
    });

    // Assinatura do empregado
    const assinY = y + bodyH - 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('X', colMid + 8, assinY - 1);
    doc.setLineWidth(0.3); doc.line(colMid + 8, assinY, W - margin - 4, assinY);
    doc.text('ASSINATURA DO EMPREGADO', (colMid + W - margin) / 2, assinY + 5, { align: 'center' });
    if (entries.length > 0 && entries[0].assinatura_base64) {
        try {
            const sigW = W - margin - 4 - (colMid + 8);
            const imgH = 9;
            const imgW = imgH * 3 > sigW ? sigW : imgH * 3;
            const offsetX = colMid + 8 + (sigW - imgW) / 2;
            doc.addImage(entries[0].assinatura_base64, 'PNG', offsetX, assinY - 9, imgW, imgH);
        } catch(e) {}
    }

    y = y + bodyH + 6;

    const bottomSafe = 20;
    const availableHFront = 297 - y - bottomSafe;
    const rH_entry = 10;
    const rowsPage1 = Math.max(4, Math.floor((availableHFront - 8) / rH_entry));

    const entriesPage1 = entries.slice(0, rowsPage1);
    const blanksPage1 = rowsPage1 - entriesPage1.length;
    const linhasPage1 = [...entriesPage1, ...Array(blanksPage1).fill(null)];
    y = _epiPdfEntregaTable(doc, W, margin, y, linhasPage1);

    const rodapeY1 = 297 - 14;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(template.rodape_texto || 'LIBERAÇÃO DO EQUIPAMENTO DE SEGURANÇA SOMENTE APÓS ASSINATURA DESTE TERMO.', W / 2, rodapeY1, { align: 'center' });

    // VERSO e PÁGINAS ADICIONAIS
    let remainingEntries = entries.slice(rowsPage1);
    while (remainingEntries.length > 0) {
        doc.addPage();
        let currY = _epiPdfHeader(doc, W);
        currY = _epiPdfColabBox(doc, W, margin, currY, colab);

        const stampReserve = 52;
        const availableHBack = 297 - currY - stampReserve;
        const rowsPageN = Math.max(12, Math.floor((availableHBack - 8) / rH_entry));

        const entriesPageN = remainingEntries.slice(0, rowsPageN);
        const blanksPageN = rowsPageN - entriesPageN.length;
        const linhasPageN = [...entriesPageN, ...Array(Math.max(0, blanksPageN)).fill(null)];

        currY = _epiPdfEntregaTable(doc, W, margin, currY, linhasPageN);
        remainingEntries = remainingEntries.slice(rowsPageN);

        const rodapeYN = 297 - stampReserve + 2;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0,0,0);
        doc.text(template.rodape_texto || 'LIBERAÇÃO DO EQUIPAMENTO DE SEGURANÇA SOMENTE APÓS ASSINATURA DESTE TERMO.', W / 2, rodapeYN, { align: 'center' });

        const stampW = 85, stampX = W / 2 - stampW / 2;
        let stampY = rodapeYN + 6;
        if (_epiPdfLogoBase64 && _epiPdfLogoAspect) {
            let slW = 42, slH = slW * _epiPdfLogoAspect;
            if (slH > 14) { slH = 14; slW = slH / _epiPdfLogoAspect; }
            doc.addImage(_epiPdfLogoBase64, 'PNG', stampX + stampW/2 - slW/2, stampY, slW, slH);
            let my = stampY + slH + 3;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
            doc.text('AMÉRICA RENTAL EQUIPAMENTOS LTDA - ME', stampX + stampW/2, my, { align: 'center' });
            doc.setFontSize(7);
            doc.text('CNPJ: 03.434.448/0001-01', stampX + stampW/2, my + 4, { align: 'center' });
        }
    }

    return doc;
};
