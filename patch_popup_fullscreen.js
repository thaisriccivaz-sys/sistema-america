/**
 * patch_popup_fullscreen.js
 * Corrige openContratoViewerPopup para realmente ocupar 100% da tela
 * Problema: o overlay com display:flex sem height:100vh não expandia corretamente
 */
const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, 'frontend', 'app.js');
let app = fs.readFileSync(f, 'utf8');

// Localizar o início da função
const START = 'window.openContratoViewerPopup = function(pdfUrl, nomeDoc) {';
const idx = app.indexOf(START);
if (idx === -1) { console.error('❌ Função não encontrada'); process.exit(1); }

// Localizar o fim da função (procurar o fechamento de bloco balanceado)
let depth = 0, fnEnd = idx;
for (let i = idx; i < app.length; i++) {
    if (app[i] === '{') depth++;
    else if (app[i] === '}') { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
}

const oldFn = app.slice(idx, fnEnd);
console.log('Função encontrada, substituindo...');

const newFn = `window.openContratoViewerPopup = function(pdfUrl, nomeDoc) {
    if (!pdfUrl || pdfUrl.endsWith('undefined') || pdfUrl === (API_URL.replace('/api','') + '')) {
        alert('URL do documento não encontrada. O arquivo pode não ter sido enviado ao servidor.');
        return;
    }
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    // Adiciona token para URLs da API interna
    let finalUrl = pdfUrl;
    if (pdfUrl.includes('onrender.com') || pdfUrl.includes(window.location.hostname)) {
        finalUrl = pdfUrl.includes('?') ? pdfUrl + '&token=' + token : pdfUrl + '?token=' + token;
    }

    // Remove popup anterior
    const prev = document.getElementById('contrato-viewer-overlay');
    if (prev) prev.remove();

    const overlay = document.createElement('div');
    overlay.id = 'contrato-viewer-overlay';
    // FULLSCREEN: position fixed cobrindo 100% da tela com z-index altíssimo
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = '#0f172a';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.overflow = 'hidden';
    document.body.appendChild(overlay);

    const nomeSafe = (nomeDoc || 'Documento').replace(/[<>"']/g, '');

    overlay.innerHTML =
        '<div style="background:#1e293b;display:flex;align-items:center;justify-content:space-between;' +
        'padding:0.75rem 1.25rem;flex-shrink:0;border-bottom:1px solid #334155;min-height:56px;">' +
            '<div style="display:flex;align-items:center;gap:0.75rem;">' +
                '<i class="ph ph-file-pdf" style="color:#ef4444;font-size:1.5rem;"></i>' +
                '<div>' +
                    '<div style="font-weight:700;color:#f1f5f9;font-size:0.95rem;">' + nomeSafe + '</div>' +
                    '<div style="font-size:0.72rem;color:#94a3b8;">Visualizador de Documento</div>' +
                '</div>' +
            '</div>' +
            '<div style="display:flex;gap:0.5rem;">' +
                '<a href="' + finalUrl + '" download="' + nomeSafe + '.pdf" target="_blank"' +
                '   style="display:inline-flex;align-items:center;gap:0.4rem;background:#22c55e;color:#fff;' +
                '   padding:0.5rem 1.1rem;border-radius:8px;font-weight:600;font-size:0.85rem;text-decoration:none;">' +
                    '<i class="ph ph-download-simple"></i> Baixar' +
                '</a>' +
                '<button onclick="document.getElementById(\'contrato-viewer-overlay\').remove()"' +
                '        style="background:#ef4444;color:#fff;border:none;border-radius:8px;' +
                '        padding:0.5rem 1.1rem;cursor:pointer;font-weight:600;' +
                '        display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;">' +
                    '<i class="ph ph-x"></i> Fechar' +
                '</button>' +
            '</div>' +
        '</div>' +
        '<div style="flex:1;position:relative;background:#525659;height:calc(100vh - 56px);">' +
            '<div id="cv-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;' +
            '     align-items:center;justify-content:center;color:#fff;gap:0.75rem;z-index:1;">' +
                '<i class="ph ph-circle-notch ph-spin" style="font-size:3rem;color:#6366f1;"></i>' +
                '<span style="font-weight:600;">Carregando documento...</span>' +
            '</div>' +
            '<iframe src="' + finalUrl + '"' +
            '    style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;z-index:2;"' +
            '    onload="var l=document.getElementById(\'cv-loading\');if(l)l.style.display=\'none\';">' +
            '</iframe>' +
        '</div>';

    // ESC fecha
    const onEsc = function(e) {
        if (e.key === 'Escape') {
            var el = document.getElementById('contrato-viewer-overlay');
            if (el) el.remove();
            document.removeEventListener('keydown', onEsc);
        }
    };
    document.addEventListener('keydown', onEsc);
};`;

app = app.slice(0, idx) + newFn + app.slice(fnEnd);
fs.writeFileSync(f, app, 'utf8');
console.log('✅ openContratoViewerPopup reescrita com fullscreen correto');
