// comissao_relatorio_pdf.js — Relatório de Comissão (contratos fechados × estornados) para anexar ao holerite
// O layout é desenhado SEMPRE pelo sistema (pdf-lib), usando apenas os DADOS importados da planilha
// (data, nº do contrato, nº do motivo do estorno). A formatação original do Excel nunca é copiada.
'use strict';

const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

// ── Utilitários ────────────────────────────────────────────────────────────────
function normName(str) {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toLowerCase();
}

function parseJsonArray(s) {
    try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}

// Normaliza qualquer formato de data vindo da planilha para DD/MM/AAAA
function normalizarData(raw) {
    const s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[3] + '/' + m[2] + '/' + m[1];
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
    if (m) {
        let a = parseInt(m[1], 10), b = parseInt(m[2], 10), y = parseInt(m[3], 10);
        if (y < 100) y += 2000;
        let dia = a, mes = b;
        if (a <= 12 && b > 12) { dia = b; mes = a; } // formato americano mm/dd
        return String(dia).padStart(2, '0') + '/' + String(mes).padStart(2, '0') + '/' + y;
    }
    return s;
}

// Normaliza nº do contrato (remove espaços e ".0" de números vindos do Excel)
function normalizarNumero(raw) {
    const s = String(raw == null ? '' : raw).trim();
    if (/^\d+(\.0+)?$/.test(s)) return String(parseInt(s, 10));
    return s;
}

// Período de apuração: dia 26 do mês anterior até dia 25 do mês de referência (mesma regra do upload)
function periodoApuracao(mes, ano) {
    const ini = new Date(ano, mes - 2, 26);
    const fim = new Date(ano, mes - 1, 25);
    const f = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    return f(ini) + ' a ' + f(fim);
}

// ── Busca dos dados no banco (tabela comissao_comercial, alimentada pela tela Comercial → Comissão) ──
function buscarComissaoColaborador(db, { colaboradorId, nomeColab, mes, ano }) {
    return new Promise((resolve) => {
        db.all('SELECT * FROM comissao_comercial WHERE mes = ? AND ano = ?', [parseInt(mes, 10), parseInt(ano, 10)], (err, rows) => {
            if (err || !rows || !rows.length) return resolve(null);
            let row = rows.find(r => r.colaborador_id && String(r.colaborador_id) === String(colaboradorId));
            if (!row && nomeColab) {
                const alvo = normName(String(nomeColab).trim().substring(0, 15));
                row = rows.find(r => normName(String(r.colaborador_nome || '').trim().substring(0, 15)) === alvo);
            }
            resolve(row || null);
        });
    });
}

// Mapa { colaborador_id: { contratos, estornos, final } } de todos com contratos no mês (usado na tela de revisão)
function resumoComissaoDoMes(db, mes, ano) {
    return new Promise((resolve) => {
        db.all('SELECT * FROM comissao_comercial WHERE mes = ? AND ano = ?', [parseInt(mes, 10), parseInt(ano, 10)], (err, rows) => {
            const out = [];
            (rows || []).forEach(r => {
                const qtd = parseJsonArray(r.detalhe_contratos).length;
                if (qtd > 0) out.push({
                    colaborador_id: r.colaborador_id || null,
                    colaborador_nome: r.colaborador_nome,
                    contratos: qtd,
                    estornos: r.contratos_estorno || 0,
                    final: r.contratos_liquidos || 0,
                });
            });
            resolve(out);
        });
    });
}

// ── Geração do PDF ─────────────────────────────────────────────────────────────
const COR_CAB = rgb(21 / 255, 96 / 255, 130 / 255);   // azul-petróleo do cabeçalho (padrão do anexo)
const COR_ZEBRA = rgb(217 / 255, 217 / 255, 217 / 255); // cinza das linhas alternadas
const COR_TEXTO = rgb(0.12, 0.14, 0.18);
const COR_SUAVE = rgb(0.42, 0.45, 0.50);

async function carregarLogo(pdf) {
    try {
        const p = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
        if (!fs.existsSync(p)) return null;
        const buf = fs.readFileSync(p);
        try { return await pdf.embedPng(buf); } catch (e1) {
            try { return await pdf.embedJpg(buf); } catch (e2) { return null; }
        }
    } catch (e) { return null; }
}

/**
 * Gera as páginas do Relatório de Comissão de um colaborador.
 * Retorna null se o colaborador não tiver contratos no mês (não gera documento).
 * Retorna { bytes, pages, resumo } caso contrário.
 */
async function gerarRelatorioComissao(db, { colaboradorId, nomeColab, mes, ano }) {
    const row = await buscarComissaoColaborador(db, { colaboradorId, nomeColab, mes, ano });
    if (!row) return null;

    const contratos = parseJsonArray(row.detalhe_contratos).map(c => ({
        data: normalizarData(c.data), numero: normalizarNumero(c.numero),
    })).filter(c => c.numero);
    if (!contratos.length) return null; // sem contrato algum → não gera

    const estornos = parseJsonArray(row.detalhe_estornos).map(e => ({
        data: normalizarData(e.data), numero: normalizarNumero(e.numero),
        motivo: String(e.motivo_cod == null ? '' : e.motivo_cod).trim().replace(/^0+(?=\d)/, ''),
    })).filter(e => e.numero);

    const mesNum = parseInt(mes, 10), anoNum = parseInt(ano, 10);
    const mesAno = String(mesNum).padStart(2, '0') + '/' + anoNum;
    const total = row.contratos_brutos != null ? row.contratos_brutos : contratos.length;
    const qtdEst = row.contratos_estorno != null ? row.contratos_estorno : estornos.length;
    const final = row.contratos_liquidos != null ? row.contratos_liquidos : Math.max(0, total - qtdEst);
    const abono = row.abono || 0;
    const nome = String(nomeColab || row.colaborador_nome || '').trim();

    const pdf = await PDFDocument.create();
    const fReg = await pdf.embedFont(StandardFonts.Helvetica);
    const fBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const logo = await carregarLogo(pdf);

    // Texto seguro: remove caracteres que a fonte padrão não codifica (evita exceção do pdf-lib)
    const cacheOk = {};
    const safe = (s, font) => {
        let out = '';
        for (const ch of String(s == null ? '' : s)) {
            const k = ch + (font === fBold ? 'b' : 'r');
            if (cacheOk[k] === undefined) { try { font.encodeText(ch); cacheOk[k] = true; } catch (e) { cacheOk[k] = false; } }
            if (cacheOk[k]) out += ch;
            else { const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); out += (base && base !== ch) ? base : ''; }
        }
        return out;
    };
    const W = 595.28, H = 841.89, M = 40;
    const centro = (page, txt, x, w, y, size, font, color) => {
        const t = safe(txt, font);
        const tw = font.widthOfTextAtSize(t, size);
        page.drawText(t, { x: x + (w - tw) / 2, y, size, font, color });
    };
    const ajustar = (txt, font, size, maxW) => {
        let t = safe(txt, font);
        if (font.widthOfTextAtSize(t, size) <= maxW) return t;
        while (t.length > 1 && font.widthOfTextAtSize(t + '...', size) > maxW) t = t.slice(0, -1);
        return t.trim() + '...';
    };

    const ROW_H = 14, HEAD_H = 20, TITLE_H = 18, BOTTOM = 55;
    // larguras: esquerda (fechados) e direita (estornados)
    const L = { x: M, cols: [110, 120] };
    const R = { x: M + 230 + 25, cols: [85, 85, 90] };

    const paginas = [];
    const novaPagina = (primeira) => {
        const page = pdf.addPage([W, H]);
        paginas.push(page);
        let y = H - M;
        if (primeira) {
            if (logo) {
                const lw = W; // banner em largura total, igual aos demais documentos gerados
                const lh = (logo.height / logo.width) * lw; // mantém a proporção original (sem achatar)
                page.drawImage(logo, { x: 0, y: H - lh, width: lw, height: lh });
                y = H - lh - 22;
            }
            centro(page, 'RELATÓRIO DE COMISSÃO - ' + mesAno, 0, W, y - 4, 17, fBold, COR_CAB);
            y -= 26;
            page.drawText(safe('Colaborador: ', fBold), { x: M, y, size: 10, font: fBold, color: COR_TEXTO });
            page.drawText(ajustar(nome, fReg, 10, W - 2 * M - 70), { x: M + fBold.widthOfTextAtSize('Colaborador: ', 10), y, size: 10, font: fReg, color: COR_TEXTO });
            y -= 14;
            page.drawText(safe('Período de apuração: ', fBold), { x: M, y, size: 10, font: fBold, color: COR_TEXTO });
            page.drawText(safe(periodoApuracao(mesNum, anoNum), fReg), { x: M + fBold.widthOfTextAtSize('Período de apuração: ', 10), y, size: 10, font: fReg, color: COR_TEXTO });
            y -= 22;

            // Quadros-resumo (quantidades; sem valores em dinheiro)
            const caixas = [
                { lbl: 'Total de contratos', val: String(total), bg: rgb(0.90, 0.95, 0.98), cor: COR_CAB },
                { lbl: 'Estornos', val: String(qtdEst), bg: rgb(0.99, 0.91, 0.91), cor: rgb(0.72, 0.11, 0.11) },
            ];
            if (abono > 0) caixas.push({ lbl: 'Estornos abonados', val: String(abono), bg: rgb(0.99, 0.95, 0.85), cor: rgb(0.70, 0.40, 0.03) });
            caixas.push({ lbl: 'Quantidade final considerada', val: String(final), bg: rgb(0.88, 0.96, 0.89), cor: rgb(0.09, 0.45, 0.20) });
            const gap = 10, bw = (W - 2 * M - gap * (caixas.length - 1)) / caixas.length, bh = 48;
            caixas.forEach((c, i) => {
                const bx = M + i * (bw + gap);
                page.drawRectangle({ x: bx, y: y - bh, width: bw, height: bh, color: c.bg });
                centro(page, c.val, bx, bw, y - 26, 20, fBold, c.cor);
                centro(page, c.lbl, bx, bw, y - 41, 8.5, fReg, COR_TEXTO);
            });
            y -= bh + 20;
        } else {
            page.drawText(safe('RELATÓRIO DE COMISSÃO - ' + mesAno + '  |  ' + nome + '  (continuação)', fBold), { x: M, y: y - 8, size: 9, font: fBold, color: COR_SUAVE });
            y -= 28;
        }
        return { page, y };
    };

    const desenharCabecalho = (page, tab, titulo, titulosCols, y) => {
        const largura = tab.cols.reduce((a, b) => a + b, 0);
        page.drawText(safe(titulo, fBold), { x: tab.x, y: y - 11, size: 10, font: fBold, color: COR_TEXTO });
        const yTop = y - TITLE_H;
        page.drawRectangle({ x: tab.x, y: yTop - HEAD_H, width: largura, height: HEAD_H, color: COR_CAB });
        let cx = tab.x;
        titulosCols.forEach((t, i) => {
            centro(page, t, cx, tab.cols[i], yTop - HEAD_H + 6.5, 9, fBold, rgb(1, 1, 1));
            cx += tab.cols[i];
        });
        return yTop - HEAD_H;
    };

    const desenharLinha = (page, tab, valores, idx, yTopLinha, fundoOverride) => {
        const largura = tab.cols.reduce((a, b) => a + b, 0);
        if (idx % 2 === 0) page.drawRectangle({ x: tab.x, y: yTopLinha - ROW_H, width: largura, height: ROW_H, color: COR_ZEBRA });
        let cx = tab.x;
        valores.forEach((v, i) => {
            centro(page, ajustar(v, fReg, 9, tab.cols[i] - 6), cx, tab.cols[i], yTopLinha - ROW_H + 4.5, 9, fReg, COR_TEXTO);
            cx += tab.cols[i];
        });
    };

    const totalLinhas = Math.max(contratos.length, estornos.length);
    let idx = 0, primeira = true;
    while (idx < totalLinhas || primeira) {
        const { page, y } = novaPagina(primeira);
        const mostrarR = primeira || idx < estornos.length; // continuação só repete estornos se ainda restarem
        const yL = desenharCabecalho(page, L, 'Contratos fechados (' + contratos.length + ')', ['Data da Entrega', 'Nº Contrato'], y);
        const yR = mostrarR ? desenharCabecalho(page, R, 'Contratos estornados (' + estornos.length + ')', ['Data da Entrega', 'Nº Contrato', 'Motivo do Estorno'], y) : null;
        const cap = Math.max(1, Math.floor((yL - BOTTOM) / ROW_H));
        for (let i = 0; i < cap && idx + i < totalLinhas; i++) {
            const yTopLinha = yL - i * ROW_H;
            const c = contratos[idx + i];
            if (c) desenharLinha(page, L, [c.data, c.numero], i, yTopLinha);
            const e = estornos[idx + i];
            if (e) desenharLinha(page, R, [e.data, e.numero, e.motivo], i, yTopLinha);
        }
        // Quando não houver estornos, informa na primeira página
        if (primeira && !estornos.length) {
            page.drawText(safe('Nenhum estorno no período.', fReg), { x: R.x + 4, y: yR - 12, size: 9, font: fReg, color: COR_SUAVE });
        }
        // linha de fecho das tabelas
        const linhasPag = Math.min(cap, totalLinhas - idx);
        const yFim = yL - Math.max(linhasPag, 1) * ROW_H;
        page.drawLine({ start: { x: L.x, y: yFim }, end: { x: L.x + L.cols[0] + L.cols[1], y: yFim }, thickness: 1, color: COR_TEXTO });
        if (estornos.length) {
            const linhasR = Math.max(0, Math.min(linhasPag, estornos.length - idx));
            if (linhasR > 0) {
                const yFimR = yL - linhasR * ROW_H;
                page.drawLine({ start: { x: R.x, y: yFimR }, end: { x: R.x + R.cols[0] + R.cols[1] + R.cols[2], y: yFimR }, thickness: 1, color: COR_TEXTO });
            }
        }
        idx += cap;
        primeira = false;
    }

    // Rodapé com numeração (apenas das páginas deste relatório)
    const n = paginas.length;
    const hoje = new Date();
    const dataGer = String(hoje.getDate()).padStart(2, '0') + '/' + String(hoje.getMonth() + 1).padStart(2, '0') + '/' + hoje.getFullYear();
    paginas.forEach((pg, i) => {
        pg.drawText(safe('Documento gerado automaticamente pelo sistema em ' + dataGer + '.', fReg), { x: M, y: 28, size: 7.5, font: fReg, color: COR_SUAVE });
        const t = safe('Relatório de Comissão - página ' + (i + 1) + ' de ' + n, fReg);
        pg.drawText(t, { x: W - M - fReg.widthOfTextAtSize(t, 7.5), y: 28, size: 7.5, font: fReg, color: COR_SUAVE });
    });

    const bytes = await pdf.save();
    return {
        bytes, pages: n,
        resumo: { contratos: contratos.length, estornos: estornos.length, total, qtdEst, final, abono },
    };
}

module.exports = { gerarRelatorioComissao, resumoComissaoDoMes, buscarComissaoColaborador, normalizarData, normalizarNumero };
