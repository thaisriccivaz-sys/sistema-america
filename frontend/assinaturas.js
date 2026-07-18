// ============================================================================
// ASSINATURAS - FRONTEND LOGIC
// ============================================================================

// Retorna apenas primeiro e último nome
function primeiroUltimoNome(nomeCompleto) {
    if (!nomeCompleto) return '';
    const partes = nomeCompleto.trim().split(/\s+/);
    if (partes.length <= 2) return nomeCompleto.trim();
    return `${partes[0]} ${partes[partes.length - 1]}`;
}

function _assAuthHeader() {
    return { 'Authorization': 'Bearer ' + (window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token')) };
}

// ─── Dados em memória para filtros ───────────────────────────────────────────
let _assPendentesData = [];

window.assinaturasChangeTab = function(tab) {
    document.getElementById('assinaturas-tab-templates').style.display = tab === 'templates' ? 'block' : 'none';
    document.getElementById('assinaturas-tab-pendentes').style.display = tab === 'pendentes' ? 'block' : 'none';
    
    document.querySelectorAll('#view-assinaturas-adm .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().includes(tab.toLowerCase().substring(0, 4))) {
            btn.classList.add('active');
        }
    });

    if (tab === 'templates') {
        renderAssinaturasTemplates();
    } else {
        renderAssinaturasPendentes();
    }
};

window.renderAssinaturasTemplates = async function() {
    try {
        const res = await fetch('/api/assinaturas/templates', { headers: _assAuthHeader() });
        const data = await res.json();
        const tbody = document.getElementById('assinaturas-table-templates');
        tbody.innerHTML = '';
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum template cadastrado.</td></tr>';
            return;
        }

        data.forEach(t => {
            const tr = document.createElement('tr');
            const bgUrl = t.bg_image_path ? t.bg_image_path : '';
            tr.innerHTML = `
                <td>
                    ${bgUrl ? `<a href="${bgUrl}" target="_blank"><img src="${bgUrl}" style="width:60px; height:auto; border-radius:4px; margin-right:10px; vertical-align:middle; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"></a>` : ''}
                    <strong>${t.nome}</strong>
                </td>
                <td>${t.is_active ? '<span class="badge" style="background:#dcfce7;color:#166534;">Ativo</span>' : '<span class="badge" style="background:#f1f5f9;color:#64748b;">Inativo</span>'}</td>
                <td style="text-align: right;">
                    <button class="btn btn-secondary btn-sm" onclick='assinaturasAbrirModalTemplate(${JSON.stringify(t)})'><i class="ph ph-pencil"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="assinaturasExcluirTemplate(${t.id})"><i class="ph ph-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
    }
};

// ─── Render tabela de pendentes/geradas ──────────────────────────────────────
window.renderAssinaturasPendentes = async function() {
    try {
        const res = await fetch('/api/assinaturas/pendentes', { headers: _assAuthHeader() });
        const data = await res.json();
        _assPendentesData = data || [];
        _assRenderTabela();
    } catch (e) {
        console.error(e);
    }
};

function _assAvatarHtml(fotoPath, fotoBase64, nome, size) {
    size = size || 36;
    var base = (typeof API_URL !== 'undefined') ? API_URL.replace('/api', '') : '';
    if (fotoBase64) {
        let src = fotoBase64.startsWith('data:') ? fotoBase64 : `data:image/jpeg;base64,${fotoBase64}`;
        return `<img src="${src}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;flex-shrink:0;">`;
    }
    if (fotoPath) {
        var fotoSrc = fotoPath.startsWith('http') ? fotoPath : base + '/' + fotoPath;
        var fallbackDiv = `<div style="display:none;width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;font-size:${Math.round(size*0.4)}px;align-items:center;justify-content:center;flex-shrink:0;">${(nome||'?')[0].toUpperCase()}</div>`;
        return `<img src="${fotoSrc}" onerror="this.style.display='none';this.nextSibling.style.display='flex'" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;flex-shrink:0;">${fallbackDiv}`;
    }
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;font-size:${Math.round(size*0.4)}px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${(nome||'?')[0].toUpperCase()}</div>`;
}

function _assRenderTabela() {
    const tbody = document.getElementById('assinaturas-table-pendentes');
    if (!tbody) return;

    // Ler filtros
    const fNome = ((document.getElementById('ass-filter-nome') || {}).value || '').trim().toLowerCase();
    const fDept = ((document.getElementById('ass-filter-dept') || {}).value || '').trim().toLowerCase();
    const fStatus = ((document.getElementById('ass-filter-status') || {}).value || '');

    let data = _assPendentesData;

    if (fNome) data = data.filter(p => (p.nome_exibicao || p.nome_colaborador || '').toLowerCase().includes(fNome));
    if (fDept) data = data.filter(p => (p.dept_exibicao || p.departamento || '').toLowerCase().includes(fDept));
    if (fStatus) data = data.filter(p => p.pendencia_status === fStatus);

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#64748b;"><i class="ph ph-signature" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>Nenhuma assinatura encontrada.</td></tr>';
        return;
    }

    data.forEach(p => {
        const isPendente = p.pendencia_status === 'Pendente';
        const nomePrimeiroUltimo = primeiroUltimoNome(p.nome_exibicao || p.nome_colaborador);
        const emailExib = p.email_exibicao || p.email_corporativo || '-';
        const deptExib = p.dept_exibicao || p.departamento || '-';
        const dataCriacao = p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '-';

        const statusBadge = isPendente
            ? '<span class="badge" style="background:#fef9c3;color:#854d0e;border:1px solid #fde047;">Pendente</span>'
            : '<span class="badge" style="background:#dcfce7;color:#166534;border:1px solid #86efac;">Baixado</span>';

        const rowBg = isPendente ? '' : 'background:#f8fafc;';

        const tr = document.createElement('tr');
        tr.style.cssText = rowBg + 'border-bottom:1px solid #f1f5f9;';
        tr.onmouseover = function() { this.style.background = '#f0f9ff'; };
        tr.onmouseout = function() { this.style.background = isPendente ? '' : '#f8fafc'; };

        tr.innerHTML = `
            <td style="padding:0.75rem;">
                <div style="display:flex;align-items:center;gap:0.6rem;">
                    ${_assAvatarHtml(p.foto_path, p.foto_base64, p.nome_colaborador, 38)}
                    <div>
                        <div style="font-weight:700;font-size:0.9rem;color:#0f172a;">${nomePrimeiroUltimo}</div>
                        <div style="font-size:0.72rem;color:#6366f1;font-weight:600;">${emailExib}</div>
                    </div>
                </div>
            </td>
            <td style="padding:0.75rem;">
                <div style="font-size:0.85rem;font-weight:600;color:#334155;">${deptExib}</div>
            </td>
            <td style="padding:0.75rem;">
                <div style="font-size:0.85rem;color:#0f172a;">${p.template_nome || '-'}</div>
            </td>
            <!-- <td style="padding:0.75rem;">
                <div style="font-size:0.82rem;color:#64748b;">${dataCriacao}</div>
            </td> -->
            <td style="padding:0.75rem;">${statusBadge}</td>
            <td style="padding:0.75rem;">
                <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;">
                    <button class="btn btn-secondary btn-sm" onclick='assinaturasEditarDados(${JSON.stringify(p).replace(/'/g,"&apos;")})' title="Editar dados da assinatura" style="display:flex;align-items:center;gap:3px;"><i class="ph ph-pencil-simple"></i> Editar</button>
                    <button class="btn btn-secondary btn-sm" onclick='assinaturasVerPendente(${JSON.stringify(p).replace(/'/g,"&apos;")})' style="display:flex;align-items:center;gap:3px;"><i class="ph ph-eye"></i> Ver</button>
                    <button class="btn btn-primary btn-sm" onclick='assinaturasBaixarPendente(${JSON.stringify(p).replace(/'/g,"&apos;")})' style="display:flex;align-items:center;gap:3px;"><i class="ph ph-download-simple"></i> Baixar JPG</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.assinaturasAplicarFiltro = function() {
    _assRenderTabela();
};

// ─── Modal de edição de dados de exibição ─────────────────────────────────────
let _assEditandoColab = null;

window.assinaturasEditarDados = function(pendencia) {
    _assEditandoColab = pendencia;
    document.getElementById('ass-edit-nome').value = primeiroUltimoNome(pendencia.nome_exibicao || pendencia.nome_colaborador);
    document.getElementById('ass-edit-email').value = pendencia.email_exibicao || pendencia.email_corporativo || '';
    document.getElementById('ass-edit-dept').value = pendencia.dept_exibicao || pendencia.departamento || '';
    document.getElementById('modal-ass-editar-dados').style.display = 'flex';
};

window.assinaturasFecharModalEditar = function() {
    document.getElementById('modal-ass-editar-dados').style.display = 'none';
    _assEditandoColab = null;
};

window.assinaturasSalvarDados = async function() {
    if (!_assEditandoColab) return;
    const nome = document.getElementById('ass-edit-nome').value.trim();
    const email = document.getElementById('ass-edit-email').value.trim();
    const dept = document.getElementById('ass-edit-dept').value.trim();

    try {
        const res = await fetch(`/api/assinaturas/pendentes/${_assEditandoColab.colaborador_id}/dados`, {
            method: 'PATCH',
            headers: { ..._assAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome_exibicao: nome, email_exibicao: email, dept_exibicao: dept, cargo_exibicao: _assEditandoColab.cargo_exibicao || _assEditandoColab.cargo })
        });
        if (res.ok) {
            assinaturasFecharModalEditar();
            renderAssinaturasPendentes();
        } else {
            alert('Erro ao salvar dados.');
        }
    } catch (e) {
        alert('Erro de conexão: ' + e.message);
    }
};

window.assinaturasAbrirModalTemplate = function(template = null) {
    document.getElementById('assinaturas-template-id').value = template ? template.id : '';
    document.getElementById('assinaturas-template-nome').value = template ? template.nome : '';
    document.getElementById('assinaturas-template-bg').value = '';
    document.getElementById('assinaturas-template-bg-existing').value = template ? template.bg_image_path : '';
    document.getElementById('assinaturas-template-ativo').value = template ? template.is_active : '1';
    
    let config = {
        nome: { x: 10, y: 10, size: 24, font: 'Inter', color: '#000000', bold: true, italic: false },
        dept: { x: 10, y: 20, size: 16, font: 'Inter', color: '#475569', bold: true, italic: false },
        email: { x: 10, y: 30, size: 14, font: 'Inter', color: '#475569', bold: true, italic: false }
    };
    if (template && template.config_json) {
        try { config = JSON.parse(template.config_json); } catch (e) {}
    }

    ['nome', 'dept', 'email'].forEach(f => {
        if(config[f]) {
            const iX = document.getElementById(`assinaturas-pos-${f}-x`);
            const iY = document.getElementById(`assinaturas-pos-${f}-y`);
            const iSize = document.getElementById(`assinaturas-size-${f}`);
            const iFont = document.getElementById(`assinaturas-font-${f}`);
            const iColor = document.getElementById(`assinaturas-color-${f}`);
            const iBold = document.getElementById(`assinaturas-bold-${f}`);
            const iItalic = document.getElementById(`assinaturas-italic-${f}`);
            
            if(iX) iX.value = config[f].x || 10;
            if(iY) iY.value = config[f].y || 10;
            if(iSize) iSize.value = config[f].size || 14;
            if(iFont) iFont.value = config[f].font || 'Inter';
            if(iColor) iColor.value = config[f].color || '#000000';
            if(iBold) iBold.checked = config[f].bold !== false;
            if(iItalic) iItalic.checked = config[f].italic === true;
        }
    });

    const canvasDiv = document.getElementById('assinaturas-preview-canvas');
    const imgEl = document.getElementById('assinaturas-preview-img');
    const placeholder = document.getElementById('assinaturas-preview-placeholder');
    if (canvasDiv) canvasDiv.style.display = 'none';
    if (imgEl) imgEl.src = '';
    if (placeholder) placeholder.style.display = 'block';

    if (template && template.bg_image_path) {
        const bgUrl = template.bg_image_path;
        assinaturasLoadImagePreview(bgUrl, config);
    }

    document.getElementById('modal-assinatura-template').style.display = 'flex';
};

window.fecharModalAssinaturaTemplate = function() {
    document.getElementById('modal-assinatura-template').style.display = 'none';
};

let currentPreviewImg = null;
window.assinaturasLoadImagePreview = function(url, config) {
    const img = new Image();
    img.onload = () => {
        currentPreviewImg = img;
        const canvasDiv = document.getElementById('assinaturas-preview-canvas');
        const imgEl = document.getElementById('assinaturas-preview-img');
        const placeholder = document.getElementById('assinaturas-preview-placeholder');
        
        if (placeholder) placeholder.style.display = 'none';
        if (canvasDiv) canvasDiv.style.display = 'block';
        if (imgEl) imgEl.src = img.src;
        
        assinaturasAtualizarPreview();
    };
    img.src = url;
};

window.assinaturasAtualizarPreview = function() {
    const imgEl = document.getElementById('assinaturas-preview-img');
    
    const scale = (imgEl && imgEl.naturalWidth && imgEl.clientWidth)
        ? (imgEl.clientWidth / imgEl.naturalWidth)
        : 1;

    const fields = ['nome', 'dept', 'email'];
    fields.forEach(f => {
        const iX = document.getElementById(`assinaturas-pos-${f}-x`);
        const iY = document.getElementById(`assinaturas-pos-${f}-y`);
        const iSize = document.getElementById(`assinaturas-size-${f}`);
        const iFont = document.getElementById(`assinaturas-font-${f}`);
        const iColor = document.getElementById(`assinaturas-color-${f}`);
        const dragEl = document.getElementById(`drag-${f}`);
        
        if(!dragEl) return;
        if(iX && iX.value !== '') dragEl.style.left = `${iX.value}%`;
        if(iY && iY.value !== '') dragEl.style.top = `${iY.value}%`;
        if(iSize && iSize.value) {
            dragEl.style.fontSize = `${iSize.value * scale}px`;
            const isBold = document.getElementById(`assinaturas-bold-${f}`)?.checked;
            const isItalic = document.getElementById(`assinaturas-italic-${f}`)?.checked;
            dragEl.style.fontWeight = isBold ? 'bold' : 'normal';
            dragEl.style.fontStyle = isItalic ? 'italic' : 'normal';
            const fontFamily = (iFont && iFont.value) ? iFont.value : 'Inter';
            dragEl.style.fontFamily = `${fontFamily}, sans-serif`;
        }
        if(iColor && iColor.value) dragEl.style.color = iColor.value;
    });
};

window.addEventListener('resize', () => {
    if (document.getElementById('modal-assinatura-template') &&
        document.getElementById('modal-assinatura-template').style.display === 'flex') {
        assinaturasAtualizarPreview();
    }
});

window.assinaturasRenderCanvas = function(config, exportMode = false, colabData = null) {
    if (!currentPreviewImg) return null;
    if (!exportMode) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = currentPreviewImg.width;
    canvas.height = currentPreviewImg.height;
    
    ctx.drawImage(currentPreviewImg, 0, 0);

    // Usar dados de exibição (editados ou padrão)
    const dataNome = colabData ? primeiroUltimoNome(colabData.nome_exibicao || colabData.nome_colaborador) : "Nome Sobrenome";
    const dataDept = colabData ? (colabData.dept_exibicao || colabData.departamento || "") : "Administrativo";
    const dataEmail = colabData ? (colabData.email_exibicao || colabData.email_corporativo || colabData.telefone_corporativo || "") : "nome.sobrenome@americarental.com.br";

    const drawText = (text, field) => {
        if(!text) return;
        if(!config[field]) return;
        
        const fontName = config[field].font || 'Inter';
        const xPos = (config[field].x / 100) * canvas.width;
        const yPos = (config[field].y / 100) * canvas.height;
        const weight = config[field].bold ? 'bold' : 'normal';
        const style = config[field].italic ? 'italic ' : '';
        ctx.font = `${style}${weight} ${config[field].size}px "${fontName}", sans-serif`;
        ctx.fillStyle = config[field].color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text, xPos, yPos);
    };

    drawText(dataNome, 'nome');
    drawText(dataDept, 'dept');
    drawText(dataEmail, 'email');

    return canvas;
};

window.assinaturasSalvarTemplate = async function() {
    const file = document.getElementById('assinaturas-template-bg').files[0];
    const formData = new FormData();
    formData.append('id', document.getElementById('assinaturas-template-id').value);
    formData.append('nome', document.getElementById('assinaturas-template-nome').value);
    formData.append('is_active', document.getElementById('assinaturas-template-ativo').value);
    formData.append('bg_image_path_existing', document.getElementById('assinaturas-template-bg-existing').value);
    
    const config = {
        nome: { 
            x: document.getElementById('assinaturas-pos-nome-x').value || 10,
            y: document.getElementById('assinaturas-pos-nome-y').value || 10,
            size: document.getElementById('assinaturas-size-nome').value || 24,
            font: document.getElementById('assinaturas-font-nome') ? document.getElementById('assinaturas-font-nome').value : 'Inter',
            color: document.getElementById('assinaturas-color-nome').value || '#000000',
            bold: document.getElementById('assinaturas-bold-nome') ? document.getElementById('assinaturas-bold-nome').checked : true,
            italic: document.getElementById('assinaturas-italic-nome') ? document.getElementById('assinaturas-italic-nome').checked : false
        },
        dept: { 
            x: document.getElementById('assinaturas-pos-dept-x').value || 10,
            y: document.getElementById('assinaturas-pos-dept-y').value || 20,
            size: document.getElementById('assinaturas-size-dept').value || 16,
            font: document.getElementById('assinaturas-font-dept') ? document.getElementById('assinaturas-font-dept').value : 'Inter',
            color: document.getElementById('assinaturas-color-dept').value || '#475569',
            bold: document.getElementById('assinaturas-bold-dept') ? document.getElementById('assinaturas-bold-dept').checked : true,
            italic: document.getElementById('assinaturas-italic-dept') ? document.getElementById('assinaturas-italic-dept').checked : false
        },
        email: { 
            x: document.getElementById('assinaturas-pos-email-x').value || 10,
            y: document.getElementById('assinaturas-pos-email-y').value || 30,
            size: document.getElementById('assinaturas-size-email').value || 14,
            font: document.getElementById('assinaturas-font-email') ? document.getElementById('assinaturas-font-email').value : 'Inter',
            color: document.getElementById('assinaturas-color-email').value || '#475569',
            bold: document.getElementById('assinaturas-bold-email') ? document.getElementById('assinaturas-bold-email').checked : true,
            italic: document.getElementById('assinaturas-italic-email') ? document.getElementById('assinaturas-italic-email').checked : false
        }
    };
    formData.append('config_json', JSON.stringify(config));

    if (file) {
        formData.append('bg_image', file);
    }

    try {
        const res = await fetch('/api/assinaturas/templates', {
            method: 'POST',
            headers: _assAuthHeader(),
            body: formData
        });
        if (res.ok) {
            alert('Template salvo com sucesso!');
            fecharModalAssinaturaTemplate();
            renderAssinaturasTemplates();
        } else {
            alert('Erro ao salvar template');
        }
    } catch (e) {
        console.error(e);
        alert('Erro de conexão ao salvar template');
    }
};

window.assinaturasExcluirTemplate = async function(id) {
    if(!confirm("Certeza que deseja excluir este template?")) return;
    try {
        const res = await fetch(`/api/assinaturas/templates/${id}`, {
            method: 'DELETE',
            headers: _assAuthHeader()
        });
        if (res.ok) {
            renderAssinaturasTemplates();
        } else {
            const errData = await res.json();
            alert(errData.error || "Erro ao excluir o template.");
        }
    } catch (e) {
        console.error(e);
    }
};

window.assinaturasVerPendente = async function(pendencia) {
    if (!pendencia.config_json) {
        alert("Nenhum template ativo foi encontrado.");
        return;
    }
    const config = JSON.parse(pendencia.config_json);
    const bgUrl = pendencia.bg_image_path;
    
    Swal.fire({
        title: 'Gerando preview...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    const renderAndShow = () => {
        currentPreviewImg = img;
        const canvas = assinaturasRenderCanvas(config, true, pendencia);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        Swal.fire({
            title: `Assinatura: ${primeiroUltimoNome(pendencia.nome_exibicao || pendencia.nome_colaborador)}`,
            imageUrl: dataUrl,
            imageWidth: '100%',
            imageAlt: 'Preview da Assinatura',
            confirmButtonText: 'Fechar',
            width: '800px',
            didOpen: () => {
                // Ensure Swal doesn't show old cached image by replacing src directly just in case
                const swalImage = document.querySelector('.swal2-image');
                if(swalImage) swalImage.src = dataUrl;
            }
        });
    };

    img.onload = () => {
        renderAndShow();
    };
    img.onerror = () => {
        Swal.fire('Erro', 'Não foi possível carregar a imagem de fundo do template. Verifique sua conexão.', 'error');
    };
    img.src = '/api/proxy-image?url=' + encodeURIComponent(bgUrl) + '&_t=' + new Date().getTime(); // cache buster
    
    if (img.complete && img.naturalWidth > 0) {
        renderAndShow();
    }
};

window.assinaturasBaixarTodas = async function() {
    try {
        const response = await fetch('/api/assinaturas/pendentes', {
            headers: _assAuthHeader()
        });
        const data = await response.json();
        // Filtrar apenas pendentes para o download em lote
        const pendentes = (data || []).filter(p => p.pendencia_status === 'Pendente');
        if (!pendentes || pendentes.length === 0) {
            alert('Nenhuma assinatura pendente para baixar.');
            return;
        }

        const templateData = pendentes.find(p => p.config_json);
        if (!templateData) {
            alert("Nenhum template ativo foi encontrado.");
            return;
        }
        const config = JSON.parse(templateData.config_json);
        const bgUrl = templateData.bg_image_path;

        Swal.fire({
            title: 'Gerando assinaturas...',
            html: 'Por favor aguarde, isso pode levar alguns segundos.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = async () => {
            currentPreviewImg = img;
            const zip = new JSZip();
            
            for (const p of pendentes) {
                const canvas = assinaturasRenderCanvas(config, true, p);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                const base64Data = dataUrl.split(',')[1];
                const fileName = `Assinatura_${primeiroUltimoNome(p.nome_exibicao || p.nome_colaborador).replace(/[^a-z0-9]/gi, '_')}.jpg`;
                zip.file(fileName, base64Data, {base64: true});
            }

            const content = await zip.generateAsync({type: "blob"});
            const url = window.URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Assinaturas_Pendentes.zip`;
            a.click();
            window.URL.revokeObjectURL(url);

            // Marcar todos como baixados
            for (const p of pendentes) {
                try {
                    await fetch(`/api/assinaturas/pendentes/${p.colaborador_id}/baixar`, {
                        method: 'POST',
                        headers: _assAuthHeader()
                    });
                } catch(e) {}
            }
            renderAssinaturasPendentes();
            Swal.close();
            Swal.fire('Sucesso!', 'Todas as assinaturas foram baixadas.', 'success');
        };
        img.onerror = () => {
            Swal.fire('Erro', 'Não foi possível carregar a imagem de fundo do template. Verifique sua conexão.', 'error');
        };
        img.src = '/api/proxy-image?url=' + encodeURIComponent(bgUrl);
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Ocorreu um erro ao baixar as assinaturas.', 'error');
    }
};

window.assinaturasBaixarPendente = async function(pendencia) {
    if (!pendencia.config_json) {
        alert("Nenhum template ativo foi encontrado. Configure e ative um template antes de gerar assinaturas.");
        return;
    }
    const config = JSON.parse(pendencia.config_json);
    const bgUrl = pendencia.bg_image_path;
    
    Swal.fire({
        title: 'Gerando assinatura...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = async () => {
        currentPreviewImg = img;
        const canvas = assinaturasRenderCanvas(config, true, pendencia);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `Assinatura_${primeiroUltimoNome(pendencia.nome_exibicao || pendencia.nome_colaborador).replace(/[^a-z0-9]/gi, '_')}.jpg`;
        a.click();
        
        try {
            await fetch(`/api/assinaturas/pendentes/${pendencia.colaborador_id}/baixar`, {
                method: 'POST',
                headers: _assAuthHeader()
            });
            renderAssinaturasPendentes();
            Swal.close();
        } catch (e) {
            console.error(e);
            Swal.close();
        }
    };
    img.onerror = () => {
        Swal.fire('Erro', 'Não foi possível carregar a imagem de fundo do template. Verifique sua conexão.', 'error');
    };
    img.src = '/api/proxy-image?url=' + encodeURIComponent(bgUrl);
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const bgInput = document.getElementById('assinaturas-template-bg');
    if(bgInput) {
        bgInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const canvasDiv = document.getElementById('assinaturas-preview-canvas');
                    const imgEl = document.getElementById('assinaturas-preview-img');
                    const placeholder = document.getElementById('assinaturas-preview-placeholder');
                    
                    if (placeholder) placeholder.style.display = 'none';
                    if (canvasDiv) canvasDiv.style.display = 'block';
                    if (imgEl) imgEl.src = event.target.result;
                    
                    const img = new Image();
                    img.onload = () => {
                        currentPreviewImg = img;
                        assinaturasAtualizarPreview();
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Lógica Drag & Drop
    let draggedElement = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    const canvasDiv = document.getElementById('assinaturas-preview-canvas');

    document.querySelectorAll('.draggable-text').forEach(el => {
        el.addEventListener('mousedown', (e) => {
            draggedElement = el;
            const rect = el.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            el.style.cursor = 'grabbing';
            e.preventDefault();
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (!draggedElement || !canvasDiv) return;
        const canvasRect = canvasDiv.getBoundingClientRect();
        
        let newLeft = e.clientX - canvasRect.left - dragOffsetX;
        let newTop = e.clientY - canvasRect.top - dragOffsetY;
        
        let pctX = (newLeft / canvasRect.width) * 100;
        let pctY = (newTop / canvasRect.height) * 100;

        pctX = Math.max(0, Math.min(100, pctX));
        pctY = Math.max(0, Math.min(100, pctY));

        draggedElement.style.left = `${pctX}%`;
        draggedElement.style.top = `${pctY}%`;

        const target = draggedElement.getAttribute('data-target');
        const inputX = document.getElementById(`assinaturas-pos-${target}-x`);
        const inputY = document.getElementById(`assinaturas-pos-${target}-y`);
        if (inputX) inputX.value = Math.round(pctX);
        if (inputY) inputY.value = Math.round(pctY);
    });

    document.addEventListener('mouseup', () => {
        if (draggedElement) {
            draggedElement.style.cursor = 'grab';
            draggedElement = null;
        }
    });

    const fields = ['nome', 'dept', 'email'];
    fields.forEach(f => {
        const iX = document.getElementById(`assinaturas-pos-${f}-x`);
        const iY = document.getElementById(`assinaturas-pos-${f}-y`);
        const iSize = document.getElementById(`assinaturas-size-${f}`);
        const iFont = document.getElementById(`assinaturas-font-${f}`);
        const iColor = document.getElementById(`assinaturas-color-${f}`);
        const iBold = document.getElementById(`assinaturas-bold-${f}`);
        const iItalic = document.getElementById(`assinaturas-italic-${f}`);
        
        if(iX) iX.addEventListener('input', assinaturasAtualizarPreview);
        if(iY) iY.addEventListener('input', assinaturasAtualizarPreview);
        if(iSize) iSize.addEventListener('input', assinaturasAtualizarPreview);
        if(iFont) iFont.addEventListener('input', assinaturasAtualizarPreview);
        if(iColor) iColor.addEventListener('input', assinaturasAtualizarPreview);
        if(iBold) iBold.addEventListener('change', assinaturasAtualizarPreview);
        if(iItalic) iItalic.addEventListener('change', assinaturasAtualizarPreview);
    });

    // Escutar mudança de tela para renderizar se for assinaturas
    const observer = new MutationObserver(() => {
        if(document.getElementById('view-assinaturas-adm') && document.getElementById('view-assinaturas-adm').style.display !== 'none') {
            if(document.getElementById('assinaturas-table-templates') && document.getElementById('assinaturas-table-templates').innerHTML === '') {
                renderAssinaturasTemplates();
            }
        }
    });
    const contentArea = document.querySelector('.main-content');
    if(contentArea) observer.observe(contentArea, { childList: true, subtree: true, attributes: true });
});
