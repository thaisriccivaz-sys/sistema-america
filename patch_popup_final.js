/**
 * patch_popup_final.js
 * Remove AMBAS as versões da função e insere uma versão limpa e definitiva
 */
const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, 'frontend', 'app.js');
let app = fs.readFileSync(f, 'utf8');

// Encontrar TODAS as ocorrências de openContratoViewerPopup e removê-las
function findAndRemoveFunction(src, funcName) {
    const marker = 'window.' + funcName + ' = function';
    let result = src;
    let offset = 0;
    let found = 0;
    
    while (true) {
        const idx = result.indexOf(marker, offset);
        if (idx === -1) break;
        
        // Encontrar o fechamento balanceado da função
        let depth = 0, fnEnd = idx;
        for (let i = idx; i < result.length; i++) {
            if (result[i] === '{') depth++;
            else if (result[i] === '}') {
                depth--;
                if (depth === 0) { fnEnd = i + 1; break; }
            }
        }
        
        // Remover também o ponto-e-vírgula e newlines extras após a função
        let endClean = fnEnd;
        while (endClean < result.length && (result[endClean] === ';' || result[endClean] === '\n' || result[endClean] === '\r')) {
            endClean++;
        }
        
        // Remover o comentário antes (se existir)
        let startClean = idx;
        // Voltar até encontrar o início da linha
        while (startClean > 0 && result[startClean-1] !== '\n') startClean--;
        // Ver se a linha anterior também é comentário
        let lineStart = startClean;
        while (lineStart > 0 && result[lineStart-1] !== '\n') lineStart--;
        const prevLine = result.slice(lineStart, startClean).trim();
        if (prevLine.startsWith('//') || prevLine.startsWith('/*') || prevLine.startsWith('*')) {
            startClean = lineStart;
        }
        
        console.log(`  Removendo instância ${++found} de ${funcName} (chars ${startClean}-${endClean})`);
        result = result.slice(0, startClean) + result.slice(endClean);
        // Não avançar offset - continuar da mesma posição pois o texto mudou
    }
    return { result, found };
}

console.log('Removendo todas as instâncias de openContratoViewerPopup...');
const { result: app2, found } = findAndRemoveFunction(app, 'openContratoViewerPopup');
console.log(`✅ ${found} instâncias removidas`);

// Inserir a versão limpa ANTES de buildContratosSignatureRows
const INSERT_BEFORE = 'window.buildContratosSignatureRows = function';
const insertIdx = app2.indexOf(INSERT_BEFORE);
if (insertIdx === -1) {
    console.error('❌ Não encontrou buildContratosSignatureRows');
    process.exit(1);
}

// Versão final usando APENAS var/createElement, sem template literals, sem aspas aninhadas
const CLEAN_FN = `// Popup fullscreen para visualizar PDFs de contratos
window.openContratoViewerPopup = function(pdfUrl, nomeDoc) {
    if (!pdfUrl || pdfUrl.endsWith('undefined')) {
        alert('URL do documento nao encontrada.');
        return;
    }
    var token = window.currentToken || localStorage.getItem('erp_token') || '';
    var finalUrl = (pdfUrl.includes('onrender.com') || pdfUrl.includes(window.location.hostname))
        ? (pdfUrl.includes('?') ? pdfUrl + '&token=' + token : pdfUrl + '?token=' + token)
        : pdfUrl;
    var nomeSafe = (nomeDoc || 'Documento');

    var prev = document.getElementById('cv-overlay-fs');
    if (prev) prev.remove();

    var overlay = document.createElement('div');
    overlay.id = 'cv-overlay-fs';
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

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'background:#1e293b;display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1.25rem;flex-shrink:0;border-bottom:1px solid #334155;min-height:58px;box-sizing:border-box;';

    var left = document.createElement('div');
    left.style.cssText = 'display:flex;align-items:center;gap:0.75rem;';
    var icon = document.createElement('i');
    icon.className = 'ph ph-file-pdf';
    icon.style.cssText = 'color:#ef4444;font-size:1.5rem;';
    var info = document.createElement('div');
    var title = document.createElement('div');
    title.style.cssText = 'font-weight:700;color:#f1f5f9;font-size:0.95rem;';
    title.textContent = nomeSafe;
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:0.72rem;color:#94a3b8;';
    sub.textContent = 'Visualizador de Documento';
    info.appendChild(title);
    info.appendChild(sub);
    left.appendChild(icon);
    left.appendChild(info);

    var right = document.createElement('div');
    right.style.cssText = 'display:flex;gap:0.5rem;';

    var dlBtn = document.createElement('a');
    dlBtn.href = finalUrl;
    dlBtn.setAttribute('download', nomeSafe + '.pdf');
    dlBtn.target = '_blank';
    dlBtn.style.cssText = 'display:inline-flex;align-items:center;gap:0.4rem;background:#22c55e;color:#fff;padding:0.5rem 1.1rem;border-radius:8px;font-weight:600;font-size:0.85rem;text-decoration:none;';
    dlBtn.innerHTML = '<i class="ph ph-download-simple"></i> Baixar';

    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:#ef4444;color:#fff;border:none;border-radius:8px;padding:0.5rem 1.1rem;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;';
    closeBtn.innerHTML = '<i class="ph ph-x"></i> Fechar';
    closeBtn.onclick = function() { overlay.remove(); };

    right.appendChild(dlBtn);
    right.appendChild(closeBtn);
    header.appendChild(left);
    header.appendChild(right);

    // Content
    var content = document.createElement('div');
    content.style.cssText = 'flex:1;position:relative;background:#525659;overflow:hidden;';

    var loading = document.createElement('div');
    loading.id = 'cv-fs-loading';
    loading.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;gap:0.75rem;z-index:1;';
    loading.innerHTML = '<i class="ph ph-circle-notch ph-spin" style="font-size:3rem;color:#6366f1;"></i><span style="font-weight:600;">Carregando documento...</span>';

    var iframe = document.createElement('iframe');
    iframe.src = finalUrl;
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;z-index:2;';
    iframe.onload = function() {
        var l = document.getElementById('cv-fs-loading');
        if (l) l.style.display = 'none';
    };

    content.appendChild(loading);
    content.appendChild(iframe);
    overlay.appendChild(header);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    var onEsc = function(e) {
        if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc); }
    };
    document.addEventListener('keydown', onEsc);
};

`;

const finalApp = app2.slice(0, insertIdx) + CLEAN_FN + app2.slice(insertIdx);
fs.writeFileSync(f, finalApp, 'utf8');
console.log('✅ Função limpa inserida antes de buildContratosSignatureRows');
