const fs = require('fs');
const path = require('path');

// 1. Modificar backend/server.js
let serverJs = fs.readFileSync('backend/server.js', 'utf8');
if (!serverJs.includes('/api/logistica/entregas')) {
    const apiCode = `
// Rota para a página de Entregas
app.get('/api/logistica/entregas', authenticateToken, (req, res) => {
    db.all(\`SELECT id, numero_os, cliente, endereco, data_os, tipo_servico, link_video 
            FROM os_logistica 
            WHERE tipo_servico LIKE '%ENTREGA%' AND status != 'Finalizado' AND status != 'Cancelado'
            ORDER BY data_os DESC\`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
`;
    // Insert before app.listen or at the end
    const lastAppGet = serverJs.lastIndexOf('app.get');
    const endOfLastGet = serverJs.indexOf('});', lastAppGet) + 3;
    serverJs = serverJs.slice(0, endOfLastGet) + '\n' + apiCode + serverJs.slice(endOfLastGet);

    // Modificar upload-video para suportar múltiplos links (JSON)
    const updateRegex = /db\.run\(\`UPDATE os_logistica SET link_video = \? WHERE numero_os = \`\,\s*\[linkCurto\,\s*numero_os\]\,\s*handleResponse\);/;
    // Wait, let's just replace the whole handleResponse logic
    serverJs = serverJs.replace(
        /if \(numero_os\) \{[\s\S]*?\} else \{/,
        `if (numero_os) {
                db.get('SELECT link_video FROM os_logistica WHERE numero_os = ?', [numero_os], (errSelect, row) => {
                    let newLinks = [linkCurto];
                    if (row && row.link_video) {
                        try {
                            const parsed = JSON.parse(row.link_video);
                            if (Array.isArray(parsed)) newLinks = [...parsed, linkCurto];
                            else newLinks = [row.link_video, linkCurto];
                        } catch(e) {
                            if (row.link_video.trim() !== '') {
                                newLinks = row.link_video.split(',').map(s=>s.trim()).filter(Boolean);
                                newLinks.push(linkCurto);
                            }
                        }
                    }
                    db.run('UPDATE os_logistica SET link_video = ? WHERE numero_os = ?', [JSON.stringify(newLinks), numero_os], handleResponse);
                });
            } else if (os_id) {
                db.get('SELECT link_video FROM os_logistica WHERE id = ?', [os_id], (errSelect, row) => {
                    let newLinks = [linkCurto];
                    if (row && row.link_video) {
                        try {
                            const parsed = JSON.parse(row.link_video);
                            if (Array.isArray(parsed)) newLinks = [...parsed, linkCurto];
                            else newLinks = [row.link_video, linkCurto];
                        } catch(e) {
                            if (row.link_video.trim() !== '') {
                                newLinks = row.link_video.split(',').map(s=>s.trim()).filter(Boolean);
                                newLinks.push(linkCurto);
                            }
                        }
                    }
                    db.run('UPDATE os_logistica SET link_video = ? WHERE id = ?', [JSON.stringify(newLinks), os_id], handleResponse);
                });
            } else {`
    );
    fs.writeFileSync('backend/server.js', serverJs);
    console.log('backend/server.js atualizado');
}

// 2. Modificar frontend/index.html
let indexHtml = fs.readFileSync('frontend/index.html', 'utf8');
if (!indexHtml.includes('logistica-entregas')) {
    // Add script
    indexHtml = indexHtml.replace('</head>', '    <script src="entregas.js" defer></script>\n</head>');
    
    // Add menu item
    indexHtml = indexHtml.replace(
        /<a href="#" class="nav-item" data-target="logistica-rota-redonda"/,
        '<a href="#" class="nav-item" data-target="logistica-entregas" onclick="navigateTo(\'logistica-entregas\'); return false;"><i class="ph ph-package"></i> Entregas</a>\n                    <a href="#" class="nav-item" data-target="logistica-rota-redonda"'
    );

    // Add module div
    const moduleDiv = `
    <!-- Módulo Logística: Entregas -->
    <div id="module-logistica-entregas" class="app-module" style="display:none; padding: 20px;">
        <h2 style="margin-bottom: 20px; color: #1e293b;">Entregas Agendadas</h2>
        
        <div class="card p-3" style="margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <input type="text" id="filtro-entregas-os" class="form-control" placeholder="Nº OS" style="width: 120px;">
            <input type="text" id="filtro-entregas-cliente" class="form-control" placeholder="Cliente" style="width: 200px;">
            <input type="text" id="filtro-entregas-endereco" class="form-control" placeholder="Endereço" style="width: 200px;">
            <select id="filtro-entregas-status" class="form-control" style="width: 150px;">
                <option value="">Todos os Status</option>
                <option value="aguardando">Aguardando Anexo</option>
                <option value="anexado">Anexado</option>
            </select>
            <button class="btn btn-primary" onclick="renderEntregasTable()"><i class="ph ph-magnifying-glass"></i> Filtrar</button>
        </div>

        <div class="card" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; min-width: 800px;">
                <thead>
                    <tr>
                        <th>OS</th>
                        <th>Data</th>
                        <th>Cliente</th>
                        <th>Endereço</th>
                        <th>Status</th>
                        <th style="width: 200px;">Anexos</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="tbody-entregas">
                    <!-- Preenchido via JS -->
                </tbody>
            </table>
        </div>
    </div>
`;
    indexHtml = indexHtml.replace('<!-- App Shell (ERP Layout) -->', moduleDiv + '\n    <!-- App Shell (ERP Layout) -->');
    fs.writeFileSync('frontend/index.html', indexHtml);
    console.log('frontend/index.html atualizado');
}

// 3. Criar frontend/entregas.js
const entregasJs = `
let entregasData = [];

async function renderEntregasPage() {
    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
        const resp = await fetch('/api/logistica/entregas', {
            headers: { 'Authorization': \`Bearer \${token}\` }
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
            \`<button onclick="window.open('\${link}', '_blank')" class="btn btn-sm" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;margin:2px;" title="Ver Anexo \${idx+1}">
                <i class="ph ph-eye"></i> \${idx+1}
            </button>\`
        ).join('');

        return \`
        <tr>
            <td>\${e.numero_os || '-'}</td>
            <td>\${e.data_os || '-'}</td>
            <td>\${e.cliente || '-'}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="\${e.endereco}">\${e.endereco || '-'}</td>
            <td>\${statusBadge}</td>
            <td>\${anexosHtml || '<span style="color:#94a3b8;font-size:0.8rem;">Nenhum anexo</span>'}</td>
            <td>
                <label class="btn btn-primary btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;margin:0;">
                    <i class="ph ph-upload-simple"></i> Anexar
                    <input type="file" style="display:none;" onchange="uploadAnexoEntrega(this, '\${e.numero_os}')">
                </label>
            </td>
        </tr>\`;
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
            headers: { 'Authorization': \`Bearer \${token}\` },
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
        const module = document.getElementById('module-logistica-entregas');
        if (module && module.style.display !== 'none' && !module.dataset.loaded) {
            module.dataset.loaded = 'true';
            renderEntregasPage();
        } else if (module && module.style.display === 'none') {
            module.dataset.loaded = '';
        }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
});
`;
fs.writeFileSync('frontend/entregas.js', entregasJs);
console.log('frontend/entregas.js criado');

// 4. Modificar app.js getTabMeta
let appJs = fs.readFileSync('frontend/app.js', 'utf8');
if (!appJs.includes('logistica-entregas')) {
    appJs = appJs.replace(
        /case 'logistica-rota-redonda':/,
        `case 'logistica-entregas': return { title: 'Entregas', color: '#2d9e5f', icon: 'ph-package' };
        case 'logistica-rota-redonda':`
    );
    appJs = appJs.replace(
        /case 'logistica-rota-redonda':\s*renderRotaRedondaPage\(\);\s*break;/,
        `case 'logistica-entregas': if(typeof renderEntregasPage === 'function') renderEntregasPage(); break;
        case 'logistica-rota-redonda':
            renderRotaRedondaPage();
            break;`
    );
    fs.writeFileSync('frontend/app.js', appJs);
    console.log('frontend/app.js atualizado');
}

// 5. Atualizar rota_redonda.js rrExibirLinkVideo para suportar array JSON
let rotaJs = fs.readFileSync('frontend/rota_redonda.js', 'utf8');
if (!rotaJs.includes('let links = [];')) {
    const replaceHtml = `function rrAbrirLinkVideo() {
    const display = document.getElementById('rr-video-link-display');
    const hidden  = document.getElementById('rr-input-video');
    const linkParaCopiar = display?.dataset.shortLink || hidden?.value || '';
    if (!linkParaCopiar) return;
    
    let links = [];
    try { links = JSON.parse(linkParaCopiar); }
    catch(e) { links = linkParaCopiar.split(',').filter(Boolean); }
    if (!Array.isArray(links)) links = [links];
    
    links.forEach(l => {
        const fullLink = l.startsWith('http') ? l : window.location.origin + l;
        window.open(fullLink, '_blank');
    });
}`;
    rotaJs = rotaJs.replace(/function rrAbrirLinkVideo\(\) \{[\s\S]*?\}\s*function _abrirPopupCoordenadas/, replaceHtml + '\n\nfunction _abrirPopupCoordenadas');
    fs.writeFileSync('frontend/rota_redonda.js', rotaJs);
    console.log('frontend/rota_redonda.js atualizado');
}

console.log('Patch Entregas finalizado.');
