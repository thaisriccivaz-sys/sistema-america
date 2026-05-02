
let entregasData = [];

async function renderEntregasPage() {
    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
        const resp = await fetch('/api/logistica/entregas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await resp.json();
        entregasData = data;
        renderEntregasTable();
    } catch (e) {
        console.error(e);
        mostrarToastAviso('Erro ao carregar entregas');
    }
}

function renderEntregasTable() {
    const tbody = document.getElementById('tbody-entregas');
    if (!tbody) return;

    const fOs = document.getElementById('filtro-entregas-os').value.toLowerCase();
    const fCliente = document.getElementById('filtro-entregas-cliente').value.toLowerCase();
    const fEndereco = document.getElementById('filtro-entregas-endereco').value.toLowerCase();
    const fStatus = document.getElementById('filtro-entregas-status').value;

    let filtered = entregasData.filter(e => {
        if (fOs && !(e.numero_os||'').toLowerCase().includes(fOs)) return false;
        if (fCliente && !(e.cliente||'').toLowerCase().includes(fCliente)) return false;
        if (fEndereco && !(e.endereco||'').toLowerCase().includes(fEndereco)) return false;
        
        let anexos = [];
        if (e.link_video) {
            try { anexos = JSON.parse(e.link_video); }
            catch(err) { anexos = e.link_video.split(',').filter(Boolean); }
            if (!Array.isArray(anexos)) anexos = [anexos];
        }
        
        const hasAnexo = anexos.length > 0;
        if (fStatus === 'aguardando' && hasAnexo) return false;
        if (fStatus === 'anexado' && !hasAnexo) return false;
        
        return true;
    });

    tbody.innerHTML = filtered.map(e => {
        let anexos = [];
        if (e.link_video) {
            try { anexos = JSON.parse(e.link_video); }
            catch(err) { anexos = e.link_video.split(',').filter(Boolean); }
            if (!Array.isArray(anexos)) anexos = [anexos];
        }
        
        const statusBadge = anexos.length > 0 
            ? '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:0.8rem;">Anexado</span>'
            : '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:0.8rem;">Aguardando</span>';

        const anexosHtml = anexos.map((link, idx) => 
            `<button onclick="window.open('${link}', '_blank')" class="btn btn-sm" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;margin:2px;" title="Ver Anexo ${idx+1}">
                <i class="ph ph-eye"></i> ${idx+1}
            </button>`
        ).join('');

        return `
        <tr>
            <td>${e.numero_os || '-'}</td>
            <td>${e.data_os || '-'}</td>
            <td>${e.cliente || '-'}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${e.endereco}">${e.endereco || '-'}</td>
            <td>${statusBadge}</td>
            <td>${anexosHtml || '<span style="color:#94a3b8;font-size:0.8rem;">Nenhum anexo</span>'}</td>
            <td>
                <label class="btn btn-primary btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;margin:0;">
                    <i class="ph ph-upload-simple"></i> Anexar
                    <input type="file" style="display:none;" onchange="uploadAnexoEntrega(this, '${e.numero_os}')">
                </label>
            </td>
        </tr>`;
    }).join('');
}

async function uploadAnexoEntrega(input, numero_os) {
    const file = input.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('video', file);
    formData.append('numero_os', numero_os);

    try {
        mostrarToastAviso('Enviando anexo...');
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || sessionStorage.getItem('token') || '';
        const resp = await fetch('/api/logistica/os/upload-video', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const json = await resp.json();
        if (!resp.ok || !json.ok) throw new Error(json.error || 'Erro no upload');
        
        mostrarToastAviso('✅ Anexo enviado com sucesso!');
        await renderEntregasPage(); // recarrega a tabela
    } catch(e) {
        mostrarToastAviso('❌ Erro ao enviar anexo: ' + e.message);
    } finally {
        input.value = '';
    }
}

// Interceptar o menu click se não houver um renderEntregasPage default no app.js
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(() => {
        const module = document.getElementById('view-logistica-entregas');
        if (module && module.classList.contains("active") && !module.dataset.loaded) {
            module.dataset.loaded = 'true';
            renderEntregasPage();
        } else if (module && !module.classList.contains("active") && module.dataset.loaded) {
            module.dataset.loaded = '';
        }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
});
