/**
 * patch_popup_v2.js - Segunda versão, sem concatenação de strings com aspas simples aninhadas
 */
const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, 'frontend', 'app.js');
let app = fs.readFileSync(f, 'utf8');

// Localizar início e fim da função
const START = 'window.openContratoViewerPopup = function(pdfUrl, nomeDoc) {';
const idx = app.indexOf(START);
if (idx === -1) { console.error('❌ Função não encontrada'); process.exit(1); }

let depth = 0, fnEnd = idx;
for (let i = idx; i < app.length; i++) {
    if (app[i] === '{') depth++;
    else if (app[i] === '}') { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
}

// Nova versão usando createElement em vez de innerHTML com strings concatenadas
// Isso evita TOTALMENTE o problema de aspas aninhadas
const newFn = `window.openContratoViewerPopup = function(pdfUrl, nomeDoc) {
    if (!pdfUrl || pdfUrl.endsWith('undefined')) {
        alert('URL do documento nao encontrada.');
        return;
    }
    var token = window.currentToken || localStorage.getItem('erp_token') || '';
    var finalUrl = (pdfUrl.includes('onrender.com') || pdfUrl.includes(window.location.hostname))
        ? (pdfUrl.includes('?') ? pdfUrl + '&token=' + token : pdfUrl + '?token=' + token)
        : pdfUrl;
    var nomeSafe = (nomeDoc || 'Documento');

    var prev = document.getElementById('cv-overlay-fullscreen');
    if (prev) prev.remove();

    // Overlay fullscreen
    var overlay = document.createElement('div');
    overlay.id = 'cv-overlay-fullscreen';
    overlay.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'width:100vw', 'height:100vh',
        'background:#0f172a', 'z-index:999999', 'display:flex',
        'flex-direction:column', 'overflow:hidden'
    ].join(';');

    // Header bar
    var header = document.createElement('div');
    header.style.cssText = 'background:#1e293b;display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1.25rem;flex-shrink:0;border-bottom:1px solid #334155;min-height:58px;box-sizing:border-box;';

    var titleArea = document.createElement('div');
    titleArea.style.cssText = 'display:flex;align-items:center;gap:0.75rem;';
    titleArea.innerHTML = '<i class="ph ph-file-pdf" style="color:#ef4444;font-size:1.5rem;"></i>';
    var titleText = document.createElement('div');
    titleText.innerHTML = '<div style="font-weight:700;color:#f1f5f9;font-size:0.95rem;">' + nomeSafe + '</div>' +
        '<div style="font-size:0.72rem;color:#94a3b8;">Visualizador de Documento</div>';
    titleArea.appendChild(titleText);

    var btnArea = document.createElement('div');
    btnArea.style.cssText = 'display:flex;gap:0.5rem;';

    var dlBtn = document.createElement('a');
    dlBtn.href = finalUrl;
    dlBtn.download = nomeSafe + '.pdf';
    dlBtn.target = '_blank';
    dlBtn.style.cssText = 'display:inline-flex;align-items:center;gap:0.4rem;background:#22c55e;color:#fff;padding:0.5rem 1.1rem;border-radius:8px;font-weight:600;font-size:0.85rem;text-decoration:none;';
    dlBtn.innerHTML = '<i class="ph ph-download-simple"></i> Baixar';

    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:#ef4444;color:#fff;border:none;border-radius:8px;padding:0.5rem 1.1rem;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;';
    closeBtn.innerHTML = '<i class="ph ph-x"></i> Fechar';
    closeBtn.onclick = function() { overlay.remove(); };

    btnArea.appendChild(dlBtn);
    btnArea.appendChild(closeBtn);
    header.appendChild(titleArea);
    header.appendChild(btnArea);

    // Content area com iframe
    var content = document.createElement('div');
    content.style.cssText = 'flex:1;position:relative;background:#525659;overflow:hidden;';

    var loading = document.createElement('div');
    loading.id = 'cv-fullscreen-loading';
    loading.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;gap:0.75rem;z-index:1;';
    loading.innerHTML = '<i class="ph ph-circle-notch ph-spin" style="font-size:3rem;color:#6366f1;"></i><span style="font-weight:600;">Carregando documento...</span>';

    var iframe = document.createElement('iframe');
    iframe.src = finalUrl;
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;z-index:2;';
    iframe.onload = function() {
        var l = document.getElementById('cv-fullscreen-loading');
        if (l) l.style.display = 'none';
    };

    content.appendChild(loading);
    content.appendChild(iframe);
    overlay.appendChild(header);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // ESC fecha
    var onEsc = function(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc); } };
    document.addEventListener('keydown', onEsc);
};`;

app = app.slice(0, idx) + newFn + app.slice(fnEnd);
fs.writeFileSync(f, app, 'utf8');
console.log('✅ openContratoViewerPopup v2 aplicada');
