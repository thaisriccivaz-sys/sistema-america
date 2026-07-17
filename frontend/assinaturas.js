// ============================================================================
// ASSINATURAS - FRONTEND LOGIC
// ============================================================================

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
        const res = await fetch('/api/assinaturas/templates', { headers: { 'Authorization': 'Bearer ' + (window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token')) } });
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

window.renderAssinaturasPendentes = async function() {
    try {
        const res = await fetch('/api/assinaturas/pendentes', { headers: { 'Authorization': 'Bearer ' + (window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token')) } });
        const data = await res.json();
        const tbody = document.getElementById('assinaturas-table-pendentes');
        tbody.innerHTML = '';
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhuma assinatura pendente.</td></tr>';
            return;
        }

        data.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:600;">${p.nome_colaborador}</div>
                    <div style="font-size:0.8rem;color:#64748b;">${p.email_corporativo || p.telefone_corporativo || '-'}</div>
                </td>
                <td>
                    <div>${p.departamento || '-'}</div>
                    <div style="font-size:0.85rem;color:#64748b;">${p.cargo || '-'}</div>
                </td>
                <td>${p.template_nome}</td>
                <td><span class="badge" style="background:#fef08a;color:#854d0e;">${p.pendencia_status}</span></td>
                <td style="text-align: right; display: flex; gap: 5px; justify-content: flex-end;">
                    <button class="btn btn-secondary btn-sm" onclick='assinaturasVerPendente(${JSON.stringify(p).replace(/'/g, "&apos;")})'><i class="ph ph-eye"></i> Ver</button>
                    <button class="btn btn-primary btn-sm" onclick='assinaturasBaixarPendente(${JSON.stringify(p).replace(/'/g, "&apos;")})'><i class="ph ph-download-simple"></i> Baixar JPG</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
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
        if (canvasDiv) canvasDiv.style.display = 'inline-block';
        if (imgEl) imgEl.src = img.src;
        
        assinaturasAtualizarPreview();
    };
    img.src = url;
};

// Event listener added in init

window.assinaturasAtualizarPreview = function() {
    const imgEl = document.getElementById('assinaturas-preview-img');
    const scale = (imgEl && imgEl.naturalWidth && imgEl.clientWidth) ? (imgEl.clientWidth / imgEl.naturalWidth) : 1;

    const fields = ['nome', 'dept', 'email'];
    fields.forEach(f => {
        const iX = document.getElementById(`assinaturas-pos-${f}-x`);
        const iY = document.getElementById(`assinaturas-pos-${f}-y`);
        const iSize = document.getElementById(`assinaturas-size-${f}`);
        const iFont = document.getElementById(`assinaturas-font-${f}`);
        const iColor = document.getElementById(`assinaturas-color-${f}`);
        const dragEl = document.getElementById(`drag-${f}`);
        
        if(!dragEl) return;
        if(iX && iX.value) dragEl.style.left = `${iX.value}%`;
        if(iY && iY.value) dragEl.style.top = `${iY.value}%`;
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
    if (document.getElementById('modal-assinatura-template').style.display === 'flex') {
        assinaturasAtualizarPreview();
    }
});


window.assinaturasRenderCanvas = function(config, exportMode = false, colabData = null) {
    if (!currentPreviewImg) return null;
    
    // Only used for exporting/downloading now
    if (!exportMode) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = currentPreviewImg.width;
    canvas.height = currentPreviewImg.height;
    
    ctx.drawImage(currentPreviewImg, 0, 0);

    const dataNome = colabData ? colabData.nome_colaborador : "Nome Sobrenome da Silva";
    const dataDept = colabData ? (colabData.departamento || "") : "Administrativo";
    const dataEmail = colabData ? (colabData.email_corporativo || colabData.telefone_corporativo || "") : "nome.sobrenome@americarental.com.br";

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
            headers: { 'Authorization': 'Bearer ' + (window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token')) },
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
            headers: { 'Authorization': 'Bearer ' + (window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token')) }
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
    img.onload = async () => {
        currentPreviewImg = img;
        const canvas = assinaturasRenderCanvas(config, true, pendencia);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        Swal.fire({
            title: `Assinatura: ${pendencia.nome_colaborador}`,
            imageUrl: dataUrl,
            imageWidth: '100%',
            imageAlt: 'Preview da Assinatura',
            confirmButtonText: 'Fechar',
            width: '800px'
        });
    };
    img.onerror = () => {
        Swal.fire('Erro', 'Não foi possível carregar a imagem de fundo do template. Verifique sua conexão.', 'error');
    };
    img.src = '/api/proxy-image?url=' + encodeURIComponent(bgUrl);
};

window.assinaturasBaixarTodas = async function() {
    try {
        const response = await fetch('/api/assinaturas/pendentes', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
        });
        const data = await response.json();
        if (!data || data.length === 0) {
            alert('Nenhuma assinatura na fila.');
            return;
        }

        const templateData = data.find(p => p.config_json);
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
            
            for (const p of data) {
                const canvas = assinaturasRenderCanvas(config, true, p);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                const base64Data = dataUrl.split(',')[1];
                const fileName = `Assinatura_${p.nome_colaborador.replace(/[^a-z0-9]/gi, '_')}.jpg`;
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
            for (const p of data) {
                try {
                    await fetch(`/api/assinaturas/pendentes/${p.colaborador_id}/baixar`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
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
        
        // Baixar imagem
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `Assinatura_${pendencia.nome_colaborador.replace(/[^a-z0-9]/gi, '_')}.jpg`;
        a.click();
        
        try {
            await fetch(`/api/assinaturas/pendentes/${pendencia.colaborador_id}/baixar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
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
                    if (canvasDiv) canvasDiv.style.display = 'inline-block';
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
        if(iX) iX.addEventListener('input', assinaturasAtualizarPreview);
        if(iY) iY.addEventListener('input', assinaturasAtualizarPreview);
        if(iSize) iSize.addEventListener('input', assinaturasAtualizarPreview);
        if(iFont) iFont.addEventListener('input', assinaturasAtualizarPreview);
        if(iColor) iColor.addEventListener('input', assinaturasAtualizarPreview);
    });


    // Escutar mudança de tela para renderizar se for assinaturas
    const observer = new MutationObserver(() => {
        if(document.getElementById('view-assinaturas-adm') && document.getElementById('view-assinaturas-adm').style.display !== 'none') {
            if(document.getElementById('assinaturas-table-templates').innerHTML === '') {
                renderAssinaturasTemplates();
            }
        }
    });
    const contentArea = document.querySelector('.main-content');
    if(contentArea) observer.observe(contentArea, { childList: true, subtree: true, attributes: true });
});
