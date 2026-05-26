const fs = require('fs');
const path = require('path');

// ============================================================
// PATCH COMPLETO: logistica_sinistros.js
// 1) Mídias: drag-and-drop (pendente)
// 2) Orçamentos: drag-and-drop, JPG/PNG apenas
// ============================================================

const filePath = path.join(__dirname, 'frontend', 'logistica_sinistros.js');
let c = fs.readFileSync(filePath, 'utf8');

// --- PARTE 1: Corrigir funcao _addLogSinMidiaField ---
c = c.replace(
  "window._addLogSinMidiaField = function() {\r\n    const d = document.createElement('input');\r\n    d.type = 'file';\r\n    d.name = 'log_sin_midia_file';\r\n    d.accept = 'image/*,video/*';\r\n    d.className = 'form-control';\r\n    d.style.fontSize = '0.8rem';\r\n    document.getElementById('log-sin-midias-list').appendChild(d);\r\n};",
  `// ============================================================
// GERENCIADOR DE MÍDIAS DA LOGÍSTICA - drag-and-drop + multi-select
// ============================================================
window._logSinMidiasFiles = [];

window._logSinAdicionarMidias = function(fileList) {
    if (!fileList || !fileList.length) return;
    Array.from(fileList).forEach(function(f) {
        var jaExiste = window._logSinMidiasFiles.some(function(x) { return x.name === f.name && x.size === f.size; });
        if (!jaExiste) window._logSinMidiasFiles.push(f);
    });
    window._logSinAtualizarPreviewMidias();
};

window._logSinRemoverMidia = function(idx) {
    window._logSinMidiasFiles.splice(idx, 1);
    window._logSinAtualizarPreviewMidias();
};

window._logSinAtualizarPreviewMidias = function() {
    var previewEl = document.getElementById('log-sin-midias-preview');
    var countEl   = document.getElementById('log-sin-midias-count');
    if (!previewEl) return;
    var files = window._logSinMidiasFiles;
    if (!files.length) {
        previewEl.style.display = 'none';
        if (countEl) countEl.style.display = 'none';
        return;
    }
    previewEl.style.display = 'flex';
    previewEl.innerHTML = '';
    if (countEl) {
        var nFotos  = files.filter(function(f){ return f.type.startsWith('image/'); }).length;
        var nVideos = files.filter(function(f){ return f.type.startsWith('video/'); }).length;
        var partes = [];
        if (nFotos)  partes.push(nFotos  + ' foto'  + (nFotos  > 1 ? 's' : ''));
        if (nVideos) partes.push(nVideos + ' vídeo' + (nVideos > 1 ? 's' : ''));
        countEl.textContent = 'Selecionado: ' + partes.join(' e ');
        countEl.style.display = 'block';
    }
    files.forEach(function(f, idx) {
        var card = document.createElement('div');
        card.title = f.name;
        card.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:2px solid #bae6fd;background:#f0f9ff;flex-shrink:0;';
        if (f.type.startsWith('image/')) {
            var img = document.createElement('img');
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            var reader = new FileReader();
            reader.onload = function(ev) { img.src = ev.target.result; };
            reader.readAsDataURL(f);
            card.appendChild(img);
        } else {
            var icon = document.createElement('div');
            icon.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1e293b;';
            icon.innerHTML = '<i class="ph ph-video" style="font-size:1.6rem;color:#60a5fa;"></i><span style="font-size:0.55rem;color:#94a3b8;margin-top:2px;padding:0 4px;overflow:hidden;word-break:break-all;">' + f.name.slice(0,14) + '</span>';
            card.appendChild(icon);
        }
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = '&times;';
        btn.style.cssText = 'position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(239,68,68,0.9);color:#fff;font-size:0.8rem;cursor:pointer;padding:0;';
        btn.setAttribute('onclick', 'window._logSinRemoverMidia(' + idx + ')');
        card.appendChild(btn);
        previewEl.appendChild(card);
    });
};

// ============================================================
// GERENCIADOR DE ORÇAMENTOS DA LOGÍSTICA - drag-and-drop, JPG/PNG
// ============================================================
window._logSinOrcFiles = [];

window._logSinAdicionarOrcs = function(fileList) {
    if (!fileList || !fileList.length) return;
    Array.from(fileList).forEach(function(f) {
        var ext = f.name.split('.').pop().toLowerCase();
        if (!['jpg','jpeg','png'].includes(ext)) {
            alert('Apenas imagens JPG ou PNG são aceitas para orçamentos. Arquivo ignorado: ' + f.name);
            return;
        }
        var jaExiste = window._logSinOrcFiles.some(function(x) { return x.name === f.name && x.size === f.size; });
        if (!jaExiste) window._logSinOrcFiles.push(f);
    });
    window._logSinAtualizarPreviewOrcs();
};

window._logSinRemoverOrc = function(idx) {
    window._logSinOrcFiles.splice(idx, 1);
    window._logSinAtualizarPreviewOrcs();
};

window._logSinAtualizarPreviewOrcs = function() {
    var previewEl = document.getElementById('log-sin-orcs-preview');
    var countEl   = document.getElementById('log-sin-orcs-count');
    if (!previewEl) return;
    var files = window._logSinOrcFiles;
    if (!files.length) {
        previewEl.style.display = 'none';
        if (countEl) countEl.style.display = 'none';
        return;
    }
    previewEl.style.display = 'flex';
    previewEl.innerHTML = '';
    if (countEl) {
        countEl.textContent = files.length + ' orçamento' + (files.length > 1 ? 's' : '') + ' selecionado' + (files.length > 1 ? 's' : '');
        countEl.style.display = 'block';
    }
    files.forEach(function(f, idx) {
        var card = document.createElement('div');
        card.title = f.name;
        card.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:2px solid #d1d5db;background:#f9fafb;flex-shrink:0;';
        var img = document.createElement('img');
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        var reader = new FileReader();
        reader.onload = function(ev) { img.src = ev.target.result; };
        reader.readAsDataURL(f);
        card.appendChild(img);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = '&times;';
        btn.style.cssText = 'position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(239,68,68,0.9);color:#fff;font-size:0.8rem;cursor:pointer;padding:0;';
        btn.setAttribute('onclick', 'window._logSinRemoverOrc(' + idx + ')');
        card.appendChild(btn);
        previewEl.appendChild(card);
    });
};`
);
console.log('PARTE 1 (funcao midias) OK');

// --- PARTE 2: Substituir bloco HTML de orçamentos no modal ---
const oldOrcBlock =
  '                        <div style="background:#f8fafc; padding:1rem; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:1rem;">\r\n' +
  '                            <p style="margin:0 0 10px; font-weight:600; font-size:0.9rem;"><i class="ph ph-paperclip"></i> Anexar Orçamentos</p>\r\n' +
  '                            <div id="log-sin-orc-upload">\r\n' +
  '                                <div id="log-sin-orcamentos-list" style="display:flex; flex-direction:column; gap:8px;">\r\n' +
  '                                    <input type="file" name="log_sin_orc_file" accept=".pdf,image/*" class="form-control" style="font-size:0.8rem;">\r\n' +
  '                                </div>\r\n' +
  '                                <button type="button" class="btn btn-sm" onclick="window._addLogSinOrcField()" style="margin-top:8px; width:100%; border:1px dashed #cbd5e1; background:#fff; color:#475569;"><i class="ph ph-plus"></i> Adicionar mais orçamentos</button>\r\n' +
  '                            </div>\r\n' +
  '                        </div>';

const newOrcBlock =
  '                        <div style="background:#f8fafc; padding:1rem; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:1rem;">\r\n' +
  '                            <p style="margin:0 0 8px; font-weight:600; font-size:0.9rem;"><i class="ph ph-receipt"></i> Orçamentos (fotos JPG/PNG)</p>\r\n' +
  '                            <div id="log-sin-orc-dropzone"\r\n' +
  '                                style="border:2px dashed #cbd5e1; border-radius:10px; background:#f1f5f9; padding:1.2rem 1rem; text-align:center; cursor:pointer; transition:all .2s;"\r\n' +
  '                                onclick="document.getElementById(\'log-sin-orcs-file\').click()"\r\n' +
  '                                ondragover="event.preventDefault(); this.style.background=\'#e2e8f0\'; this.style.borderColor=\'#94a3b8\';"\r\n' +
  '                                ondragleave="this.style.background=\'#f1f5f9\'; this.style.borderColor=\'#cbd5e1\';"\r\n' +
  '                                ondrop="event.preventDefault(); this.style.background=\'#f1f5f9\'; this.style.borderColor=\'#cbd5e1\'; window._logSinAdicionarOrcs(event.dataTransfer.files);">\r\n' +
  '                                <i class="ph ph-image" style="font-size:1.8rem; color:#94a3b8; display:block; margin-bottom:4px;"></i>\r\n' +
  '                                <p style="margin:0; font-weight:600; font-size:0.82rem; color:#475569;">Arraste fotos dos orçamentos aqui</p>\r\n' +
  '                                <p style="margin:2px 0 0; font-size:0.72rem; color:#94a3b8;">ou clique para selecionar &bull; apenas JPG e PNG &bull; múltiplos de uma vez</p>\r\n' +
  '                                <input type="file" id="log-sin-orcs-file" multiple accept="image/jpeg,image/png,.jpg,.png" style="display:none;"\r\n' +
  '                                    onchange="window._logSinAdicionarOrcs(this.files); this.value=\'\';">\r\n' +
  '                            </div>\r\n' +
  '                            <div id="log-sin-orcs-preview" style="display:none; margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;"></div>\r\n' +
  '                            <p id="log-sin-orcs-count" style="margin:6px 0 0; font-size:0.75rem; color:#475569; display:none;"></p>\r\n' +
  '                        </div>';

if (c.includes(oldOrcBlock)) {
    c = c.replace(oldOrcBlock, newOrcBlock);
    console.log('PARTE 2 (HTML orcamentos) OK');
} else {
    console.error('PARTE 2 - bloco HTML orcamentos NAO ENCONTRADO');
}

// --- PARTE 3: Reset do modal - adicionar limpeza de orçamentos ---
c = c.replace(
    "    // reset orcamentos list\r\n    const orcList = document.getElementById('log-sin-orcamentos-list');\r\n    if (orcList) {\r\n        orcList.innerHTML = '<input type=\"file\" name=\"log_sin_orc_file\" accept=\".pdf,image/*\" class=\"form-control\" style=\"font-size:0.8rem;\">';\r\n    }\r\n    const midiaList = document.getElementById('log-sin-midias-list');\r\n    if (midiaList) {\r\n        midiaList.innerHTML = '<input type=\"file\" name=\"log_sin_midia_file\" accept=\"image/*,video/*\" class=\"form-control\" style=\"font-size:0.8rem;\">';\r\n    }",
    "    // reset arquivos\r\n    window._logSinOrcFiles = [];\r\n    if (typeof window._logSinAtualizarPreviewOrcs === 'function') window._logSinAtualizarPreviewOrcs();\r\n    window._logSinMidiasFiles = [];\r\n    if (typeof window._logSinAtualizarPreviewMidias === 'function') window._logSinAtualizarPreviewMidias();"
);
console.log('PARTE 3 (reset modal) OK');

// --- PARTE 4: Coleta de mídias e orçamentos no logSinSalvarFinal ---
c = c.replace(
    "    const midiaInputs = document.querySelectorAll('input[name=\"log_sin_midia_file\"]');\r\n    const filesMidia = [];\r\n    midiaInputs.forEach(i => { if(i.files && i.files.length > 0) for(let f of i.files) filesMidia.push(f); });",
    "    const filesMidia = window._logSinMidiasFiles || [];"
);

// Substituir coleta de orçamentos por _logSinOrcFiles
c = c.replace(
    "    const fileInputs = document.querySelectorAll('input[name=\"log_sin_orc_file\"]');\r\n    const filesOrc = [];\r\n    fileInputs.forEach(i => { if(i.files && i.files.length > 0) for(let f of i.files) filesOrc.push(f); });",
    "    const filesOrc = window._logSinOrcFiles || [];"
);
console.log('PARTE 4 (coleta arquivos) OK');

// --- PARTE 5: Remover funcao _addLogSinOrcField antiga ---
c = c.replace(
    "window._addLogSinOrcField = function() {\r\n    const d = document.createElement('input');\r\n    d.type = 'file';\r\n    d.name = 'log_sin_orc_file';\r\n    d.accept = '.pdf,image/*';\r\n    d.className = 'form-control';\r\n    d.style.fontSize = '0.8rem';\r\n    document.getElementById('log-sin-orcamentos-list').appendChild(d);\r\n};",
    "// _addLogSinOrcField removido - usar _logSinAdicionarOrcs com drag-and-drop"
);
console.log('PARTE 5 (remover funcao antiga) OK');

fs.writeFileSync(filePath, c, 'utf8');
console.log('DONE - bytes:', Buffer.byteLength(c));
