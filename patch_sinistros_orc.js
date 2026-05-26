const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'sinistros.js');
let c = fs.readFileSync(filePath, 'utf8');

// --- PARTE 1: Substituir bloco HTML de orçamentos no RH ---
const oldOrcHtml =
  '                            <div id="sin-orc-upload" style="display:none; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:10px;">\r\n' +
  '                                <div id="sin-orcamentos-list" style="display:flex; flex-direction:column; gap:8px;">\r\n' +
  '                                    <input type="file" name="sin_orc_file" accept=".pdf,image/*" class="form-control" style="font-size:0.8rem;">\r\n' +
  '                                </div>\r\n' +
  '                                <button type="button" class="btn btn-sm" onclick="window._addSinOrcField()" style="margin-top:8px; width:100%; border:1px dashed #cbd5e1; background:#fff; color:#475569;"><i class="ph ph-plus"></i> Anexar mais documentos</button>\r\n' +
  '                            </div>';

const newOrcHtml =
  '                            <div id="sin-orc-upload" style="display:none; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:10px;">\r\n' +
  '                                <div id="sin-orc-dropzone"\r\n' +
  '                                    style="border:2px dashed #cbd5e1; border-radius:10px; background:#f1f5f9; padding:1.2rem 1rem; text-align:center; cursor:pointer; transition:all .2s;"\r\n' +
  '                                    onclick="document.getElementById(\'sin-orcs-file\').click()"\r\n' +
  '                                    ondragover="event.preventDefault(); this.style.background=\'#e2e8f0\'; this.style.borderColor=\'#94a3b8\';"\r\n' +
  '                                    ondragleave="this.style.background=\'#f1f5f9\'; this.style.borderColor=\'#cbd5e1\';"\r\n' +
  '                                    ondrop="event.preventDefault(); this.style.background=\'#f1f5f9\'; this.style.borderColor=\'#cbd5e1\'; window._sinAdicionarOrcs(event.dataTransfer.files);">\r\n' +
  '                                    <i class="ph ph-image" style="font-size:1.8rem; color:#94a3b8; display:block; margin-bottom:4px;"></i>\r\n' +
  '                                    <p style="margin:0; font-weight:600; font-size:0.82rem; color:#475569;">Arraste fotos dos orçamentos aqui</p>\r\n' +
  '                                    <p style="margin:2px 0 0; font-size:0.72rem; color:#94a3b8;">ou clique para selecionar &bull; apenas JPG e PNG &bull; múltiplos de uma vez</p>\r\n' +
  '                                    <input type="file" id="sin-orcs-file" multiple accept="image/jpeg,image/png,.jpg,.png" style="display:none;"\r\n' +
  '                                        onchange="window._sinAdicionarOrcs(this.files); this.value=\'\';">\r\n' +
  '                                </div>\r\n' +
  '                                <div id="sin-orcs-preview" style="display:none; margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;"></div>\r\n' +
  '                                <p id="sin-orcs-count" style="margin:6px 0 0; font-size:0.75rem; color:#475569; display:none;"></p>\r\n' +
  '                            </div>';

if (c.includes(oldOrcHtml)) {
    c = c.replace(oldOrcHtml, newOrcHtml);
    console.log('PARTE 1 (HTML orcamentos RH) OK');
} else {
    console.error('PARTE 1 - bloco HTML NAO ENCONTRADO');
}

// --- PARTE 2: Adicionar _sinAdicionarOrcs nas funcoes JS ---
// Inserir logo após a linha window._sinMidiasFiles = [];
const insertAfter = 'window._sinMidiasFiles = [];';
const newOrcFuncs = `
// ============================================================
// GERENCIADOR DE ORÇAMENTOS DO RH - drag-and-drop, JPG/PNG
// ============================================================
window._sinOrcFiles = [];

window._sinAdicionarOrcs = function(fileList) {
    if (!fileList || !fileList.length) return;
    Array.from(fileList).forEach(function(f) {
        var ext = f.name.split('.').pop().toLowerCase();
        if (!['jpg','jpeg','png'].includes(ext)) {
            alert('Apenas imagens JPG ou PNG são aceitas para orçamentos. Arquivo ignorado: ' + f.name);
            return;
        }
        var jaExiste = window._sinOrcFiles.some(function(x) { return x.name === f.name && x.size === f.size; });
        if (!jaExiste) window._sinOrcFiles.push(f);
    });
    window._sinAtualizarPreviewOrcs();
};

window._sinRemoverOrc = function(idx) {
    window._sinOrcFiles.splice(idx, 1);
    window._sinAtualizarPreviewOrcs();
};

window._sinAtualizarPreviewOrcs = function() {
    var previewEl = document.getElementById('sin-orcs-preview');
    var countEl   = document.getElementById('sin-orcs-count');
    if (!previewEl) return;
    var files = window._sinOrcFiles;
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
        btn.setAttribute('onclick', 'window._sinRemoverOrc(' + idx + ')');
        card.appendChild(btn);
        previewEl.appendChild(card);
    });
};

`;

if (c.includes(insertAfter)) {
    c = c.replace(insertAfter, insertAfter + newOrcFuncs);
    console.log('PARTE 2 (funcoes orcs RH) OK');
} else {
    console.error('PARTE 2 - marker NAO ENCONTRADO');
}

// --- PARTE 3: Reset de orçamentos ao abrir modal ---
c = c.replace(
    "    window._sinMidiasFiles = [];\n    if (typeof window._sinAtualizarPreviewMidias === 'function') window._sinAtualizarPreviewMidias();",
    "    window._sinMidiasFiles = [];\n    if (typeof window._sinAtualizarPreviewMidias === 'function') window._sinAtualizarPreviewMidias();\n    window._sinOrcFiles = [];\n    if (typeof window._sinAtualizarPreviewOrcs === 'function') window._sinAtualizarPreviewOrcs();"
);
console.log('PARTE 3 (reset orcamentos no modal) OK');

// --- PARTE 4: Coleta de orcamentos no salvarSinistroFinal ---
// Encontrar onde os orçamentos são coletados via querySelectorAll
c = c.replace(
    "        const orcInputs = document.querySelectorAll('input[name=\"sin_orc_file\"]');\r\n        const filesOrc = [];\r\n        orcInputs.forEach(i => { if(i.files && i.files.length > 0) Array.from(i.files).forEach(f => filesOrc.push(f)); });",
    "        const filesOrc = window._sinOrcFiles || [];"
);
c = c.replace(
    "        const orcInputs = document.querySelectorAll('input[name=\"sin_orc_file\"]');\n        const filesOrc = [];\n        orcInputs.forEach(i => { if(i.files && i.files.length > 0) Array.from(i.files).forEach(f => filesOrc.push(f)); });",
    "        const filesOrc = window._sinOrcFiles || [];"
);
console.log('PARTE 4 (coleta orcamentos) OK');

fs.writeFileSync(filePath, c, 'utf8');
console.log('DONE - bytes:', Buffer.byteLength(c));
