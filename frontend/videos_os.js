// videos_os.js

const TELA_VIDEOS_OS = `
<div style="background:white; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,0.05); padding:1rem; margin:1rem;">
    <!-- FILTROS (Baseado no Pipeline) -->
    <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end; margin-bottom:1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem;">
        
        <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-width:80px;">
            <label style="font-size:0.75rem; font-weight:700; color:#64748b;">OS</label>
            <input type="text" id="vidos-filtro-os" placeholder="Nº da OS" style="border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; font-size:0.85rem;" onkeypress="if(event.key==='Enter') vidosCarregar()">
        </div>
        
        <div style="display:flex; flex-direction:column; gap:4px; flex:2; min-width:180px;">
            <label style="font-size:0.75rem; font-weight:700; color:#64748b;">Cliente</label>
            <input type="text" id="vidos-filtro-cliente" placeholder="Nome do Cliente" style="border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; font-size:0.85rem;" onkeypress="if(event.key==='Enter') vidosCarregar()">
        </div>

        <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-width:120px;">
            <label style="font-size:0.75rem; font-weight:700; color:#64748b;">Contrato</label>
            <input type="text" id="vidos-filtro-contrato" placeholder="Nº Contrato" style="border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; font-size:0.85rem;" onkeypress="if(event.key==='Enter') vidosCarregar()">
        </div>
        
        <div style="display:flex; flex-direction:column; gap:4px; flex:2; min-width:180px;">
            <label style="font-size:0.75rem; font-weight:700; color:#64748b;">Serviço</label>
            <input type="text" id="vidos-filtro-servico" placeholder="Ex: VAC, Bomb" style="border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; font-size:0.85rem;" onkeypress="if(event.key==='Enter') vidosCarregar()">
        </div>

        <div style="display:flex; flex-direction:column; gap:4px; flex:2; min-width:180px;">
            <label style="font-size:0.75rem; font-weight:700; color:#64748b;">Endereço</label>
            <input type="text" id="vidos-filtro-endereco" placeholder="Endereço" style="border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; font-size:0.85rem;" onkeypress="if(event.key==='Enter') vidosCarregar()">
        </div>
        
        <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-width:120px;">
            <label style="font-size:0.75rem; font-weight:700; color:#64748b;">Tipo</label>
            <select id="vidos-filtro-tipo" style="border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; font-size:0.85rem;" onchange="vidosCarregar()">
                <option value="">Todos</option>
                <option value="obra">Obra</option>
                <option value="evento">Evento</option>
            </select>
        </div>

        <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-width:120px;">
            <label style="font-size:0.75rem; font-weight:700; color:#64748b;">Turno</label>
            <select id="vidos-filtro-turno" style="border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; font-size:0.85rem;" onchange="vidosCarregar()">
                <option value="">Todos</option>
                <option value="diurno">Diurno</option>
                <option value="noturno">Noturno</option>
            </select>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-width:130px;">
            <label style="font-size:0.75rem; font-weight:700; color:#64748b;">De</label>
            <input type="date" id="vidos-filtro-data-de" style="border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; font-size:0.85rem;" onchange="vidosCarregar()">
        </div>
        
        <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-width:130px;">
            <label style="font-size:0.75rem; font-weight:700; color:#64748b;">Até</label>
            <input type="date" id="vidos-filtro-data-ate" style="border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; font-size:0.85rem;" onchange="vidosCarregar()">
        </div>
        
        <button onclick="vidosCarregar()" style="background:#3b82f6; color:white; border:none; border-radius:6px; padding:7px 16px; font-weight:600; cursor:pointer; height:32px;">
            <i class="ph ph-magnifying-glass"></i> Buscar
        </button>
    </div>

    <!-- TABELA DE RESULTADOS -->
    <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
            <thead>
                <tr style="background:#f1f5f9; text-align:left; color:#475569;">
                    <th style="padding:10px; border-bottom:2px solid #cbd5e1;">OS</th>
                    <th style="padding:10px; border-bottom:2px solid #cbd5e1;">Cliente</th>
                    <th style="padding:10px; border-bottom:2px solid #cbd5e1;">Serviço</th>
                    <th style="padding:10px; border-bottom:2px solid #cbd5e1;">Data</th>
                    <th style="padding:10px; border-bottom:2px solid #cbd5e1; width:350px;">Vídeo(s)</th>
                </tr>
            </thead>
            <tbody id="vidos-tbody">
                <tr><td colspan="5" style="text-align:center; padding:2rem; color:#94a3b8;">Utilize os filtros e clique em Buscar</td></tr>
            </tbody>
        </table>
    </div>
</div>
`;

window.vidosInit = function() {
    const container = document.getElementById('videos-os-container');
    if (container) {
        container.innerHTML = TELA_VIDEOS_OS;
        
        // Define as datas padrão (últimos 7 dias a próximos 7 dias)
        const dDe = new Date();
        dDe.setDate(dDe.getDate() - 7);
        const dAte = new Date();
        dAte.setDate(dAte.getDate() + 7);
        
        document.getElementById('vidos-filtro-data-de').value = dDe.toISOString().split('T')[0];
        document.getElementById('vidos-filtro-data-ate').value = dAte.toISOString().split('T')[0];
        
        vidosCarregar();
    }
}

async function vidosCarregar() {
    const tbody = document.getElementById('vidos-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem;"><i class="ph ph-spinner ph-spin" style="font-size:1.5rem;"></i> Carregando...</td></tr>';
    
    try {
        const qOs = (document.getElementById('vidos-filtro-os')?.value || '').trim();
        const qCli = (document.getElementById('vidos-filtro-cliente')?.value || '').trim();
        const qCont = (document.getElementById('vidos-filtro-contrato')?.value || '').trim();
        const qServ = (document.getElementById('vidos-filtro-servico')?.value || '').trim();
        const qEnd = (document.getElementById('vidos-filtro-endereco')?.value || '').trim();
        const qTipo = (document.getElementById('vidos-filtro-tipo')?.value || '').trim();
        const qTurno = (document.getElementById('vidos-filtro-turno')?.value || '').trim();
        const qDe = (document.getElementById('vidos-filtro-data-de')?.value || '').trim();
        const qAte = (document.getElementById('vidos-filtro-data-ate')?.value || '').trim();
        
        const params = new URLSearchParams();
        if (qOs) params.append('os', qOs);
        if (qCli) params.append('cliente', qCli);
        if (qCont) params.append('contrato', qCont);
        if (qServ) params.append('servico', qServ);
        if (qEnd) params.append('endereco', qEnd);
        if (qDe) params.append('dataDe', qDe);
        if (qAte) params.append('dataAte', qAte);
        
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const resp = await fetch('/api/logistica/pipeline?' + params.toString(), {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await resp.json();
        
        if (!data) throw new Error('Erro ao carregar OSs');
        
        let todasOs = [];
        // Concatena todas as OSs do objeto retornado pelo pipeline
        for (const status in data) {
            if (Array.isArray(data[status])) {
                let statusOs = data[status];
                
                // Filtro Tipo (Obra/Evento)
                if (qTipo) {
                    statusOs = statusOs.filter(item => (item.tipo_servico || '').toLowerCase().includes(qTipo.toLowerCase()));
                }
                
                // Filtro Turno
                if (qTurno) {
                    statusOs = statusOs.filter(item => (item.turno || '').toLowerCase() === qTurno.toLowerCase());
                }
                
                todasOs = todasOs.concat(statusOs);
            }
        }
        
        if (todasOs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:#94a3b8;">Nenhuma OS encontrada para os filtros aplicados.</td></tr>';
            return;
        }
        
        // Ordena por data (mais recente primeiro) e depois por número de OS
        todasOs.sort((a, b) => {
            const dA = new Date(a.data_os || '1970-01-01');
            const dB = new Date(b.data_os || '1970-01-01');
            if (dB - dA !== 0) return dB - dA;
            return (b.numero_os || 0) - (a.numero_os || 0);
        });
        
        tbody.innerHTML = '';
        todasOs.forEach(os => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #e2e8f0';
            
            let videosLinks = [];
            if (os.link_video) {
                try {
                    const p = JSON.parse(os.link_video);
                    videosLinks = Array.isArray(p) ? p : [os.link_video];
                } catch(e) {
                    videosLinks = os.link_video.split(',').filter(Boolean);
                }
            }
            
            let videosHtml = `<div style="display:flex; flex-direction:column; gap:4px;" id="vidos-cell-${os.id}">`;
            
            videosLinks.forEach(l => {
                const fullLink = l.startsWith('http') ? l : window.location.origin + (l.startsWith('/') ? l : '/' + l);
                videosHtml += `
                    <div style="display:flex; align-items:center; gap:6px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:4px; padding:3px 6px;">
                        <i class="ph ph-film-strip" style="color:#3b82f6;"></i>
                        <a href="${fullLink}" target="_blank" style="color:#1d4ed8; text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px; font-size:0.75rem;" title="${fullLink}">${fullLink.replace('https://', '').replace('http://', '')}</a>
                        <button onclick="navigator.clipboard.writeText('${fullLink}').then(()=>mostrarToastAviso('✅ Link copiado!'))" title="Copiar link" style="background:none; border:none; cursor:pointer; color:#10b981; padding:0; display:flex; align-items:center;"><i class="ph ph-copy" style="font-size:0.9rem;"></i></button>
                        <button onclick="vidosExcluirVideo(${os.id}, '${l}')" title="Excluir vídeo" style="background:none; border:none; cursor:pointer; color:#ef4444; padding:0; display:flex; align-items:center; margin-left:auto;"><i class="ph ph-trash" style="font-size:0.9rem;"></i></button>
                    </div>
                `;
            });
            
            videosHtml += `
                <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                    <input type="file" id="vidos-file-${os.id}" accept="video/*" style="display:none;" onchange="vidosFazerUpload(this, ${os.id}, ${os.numero_os || null})">
                    <button onclick="document.getElementById('vidos-file-${os.id}').click()" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer; padding:3px 8px; font-size:0.7rem; font-weight:600; display:flex; align-items:center; gap:4px;">
                        <i class="ph ph-upload-simple"></i> Enviar Vídeo
                    </button>
                    <span id="vidos-progress-${os.id}" style="display:none; font-size:0.7rem; color:#6b7280;">⏳ Enviando...</span>
                </div>
            `;
            videosHtml += `</div>`;
            
            let dataFormatada = os.data_os || '';
            if (dataFormatada && dataFormatada.includes('-')) {
                const p = dataFormatada.split('-');
                if (p.length === 3) dataFormatada = `${p[2]}/${p[1]}/${p[0]}`;
            }
            
            tr.innerHTML = `
                <td style="padding:10px;"><b>${os.numero_os || '—'}</b></td>
                <td style="padding:10px;">${os.cliente || '—'}</td>
                <td style="padding:10px;">${os.tipo_servico || '—'}</td>
                <td style="padding:10px;">${dataFormatada}</td>
                <td style="padding:10px; vertical-align:top;">${videosHtml}</td>
            `;
            
            tbody.appendChild(tr);
        });
        
    } catch(e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:#ef4444;">Erro: ${e.message}</td></tr>`;
    }
}

async function vidosFazerUpload(input, osId, numeroOs) {
    const file = input.files[0];
    if (!file) return;
    
    const progress = document.getElementById(`vidos-progress-${osId}`);
    if (progress) progress.style.display = 'inline';
    
    const formData = new FormData();
    formData.append('video', file);
    if (numeroOs) formData.append('numero_os', numeroOs);
    else formData.append('os_id', osId);
    
    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const resp = await fetch('/api/logistica/os/upload-video', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const json = await resp.json();
        
        if (!resp.ok || !json.ok) throw new Error(json.error || 'Erro no upload');
        
        mostrarToastAviso('✅ Vídeo enviado com sucesso!');
        // Recarrega a tabela para atualizar a coluna de vídeos
        vidosCarregar();
        
    } catch(e) {
        mostrarToastAviso('❌ Erro ao enviar vídeo: ' + e.message);
        if (progress) {
            progress.textContent = '❌ Falha';
            setTimeout(() => { progress.style.display = 'none'; progress.textContent = '⏳ Enviando...'; }, 3000);
        }
    } finally {
        input.value = '';
    }
}

window.vidosExcluirVideo = async function(osId, link) {
    if (!await confirmarAcao('Tem certeza que deseja excluir este vídeo?')) return;
    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const resp = await fetch(`/api/logistica/os-id/${osId}/link-video?link=${encodeURIComponent(link)}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(txt);
        }
        mostrarToastAviso('✅ Vídeo excluído com sucesso!');
        vidosCarregar();
    } catch(e) {
        mostrarModalAviso('Erro ao excluir', e.message, 'error');
    }
}
