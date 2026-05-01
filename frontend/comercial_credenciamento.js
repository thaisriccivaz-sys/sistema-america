// frontend/comercial_credenciamento.js

window._historicoComCredDados = [];
window._historicoComCredSort = { col: 'data', dir: 'desc' };

// Empresas fixas sempre exibidas como abas
const EMPRESAS_LICENCAS = ['América Rental', 'Attend Ambiental', 'BRK'];

// Alterna aba ativa no painel de licenças (apenas show/hide — checkboxes ficam no DOM)
window._switchLicencaTab = function(empKey) {
    document.querySelectorAll('.solic-lic-tab-btn').forEach(btn => {
        const ativo = btn.dataset.emp === empKey;
        btn.style.background = ativo ? '#7048e8' : '#f1f5f9';
        btn.style.color = ativo ? '#fff' : '#475569';
        btn.style.borderColor = ativo ? '#7048e8' : '#e2e8f0';
        btn.style.fontWeight = ativo ? '700' : '400';
    });
    document.querySelectorAll('.solic-lic-panel').forEach(panel => {
        panel.style.display = panel.dataset.emp === empKey ? 'grid' : 'none';
    });
};

// Carrega licenças em abas — todas no DOM, só ativa/oculta por CSS
async function _carregarLicencasAgrupadas(licsSelecionadas = []) {
    const container = document.getElementById('solic-licencas-empresas');
    if (!container) return;
    container.innerHTML = '<p style="color:#94a3b8; font-size:13px;">Carregando licenças...</p>';
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/licencas', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        const todas = Array.isArray(data) ? data : [];

        // Agrupar por empresa
        const grupos = {};
        EMPRESAS_LICENCAS.forEach(e => grupos[e] = []); // garante as 3 sempre existem
        todas.forEach(l => {
            let emp = (l.empresa || 'Outras').trim();
            
            // Normalizar nomes para garantir que caiam na aba certa (ex: 'america-rental' vira 'América Rental')
            const empStr = emp.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (empStr === 'americarental') emp = 'América Rental';
            else if (empStr === 'attendambiental') emp = 'Attend Ambiental';
            else if (empStr === 'brk') emp = 'BRK';

            if (!grupos[emp]) grupos[emp] = [];
            grupos[emp].push(l);
        });

        // Empresas para mostrar: 3 fixas + outras que existirem
        const extras = Object.keys(grupos).filter(e => !EMPRESAS_LICENCAS.includes(e));
        const todasEmpresas = [...EMPRESAS_LICENCAS, ...extras];
        const primeiraEmp = todasEmpresas[0];

        // Abas (botões)
        const tabsHtml = todasEmpresas.map(emp => {
            const ativo = emp === primeiraEmp;
            const count = grupos[emp].length;
            return `<button class="solic-lic-tab-btn" data-emp="${emp}" onclick="window._switchLicencaTab('${emp}')"
                style="padding:6px 14px; border-radius:6px; border:1.5px solid ${ativo ? '#7048e8' : '#e2e8f0'};
                background:${ativo ? '#7048e8' : '#f1f5f9'}; color:${ativo ? '#fff' : '#475569'};
                font-weight:${ativo ? '700' : '400'}; font-size:13px; cursor:pointer; white-space:nowrap;">
                <i class="ph ph-buildings"></i> ${emp}
                <span style="font-size:11px; opacity:0.75;">(${count})</span>
            </button>`;
        }).join('');

        // Painéis (um por empresa — todos no DOM, só ativa é visível)
        const panelsHtml = todasEmpresas.map(emp => {
            const lics = grupos[emp];
            const isAtivo = emp === primeiraEmp;
            const items = lics.length === 0
                ? `<p style="color:#94a3b8; font-size:12px; font-style:italic; grid-column:1/-1; margin:4px 0;">Nenhuma licença cadastrada para esta empresa.</p>`
                : lics.map(l => {
                    const checked = licsSelecionadas.some(s => String(s.id) === String(l.id)) ? 'checked' : '';
                    return `<label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer; padding:4px 0;">
                        <input type="checkbox" name="solic_licencas" value="${l.id}" data-nome="${l.nome}" data-empresa="${emp}" ${checked}>
                        ${l.nome}
                    </label>`;
                }).join('');

            return `<div class="solic-lic-panel" data-emp="${emp}"
                style="display:${isAtivo ? 'grid' : 'none'}; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:4px 16px;
                background:#f8fafc; border:1px solid #e2e8f0; border-radius:0 6px 6px 6px; padding:12px; margin-top:0;">
                ${items}
            </div>`;
        }).join('');

        container.innerHTML = `
            <div style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:0;">${tabsHtml}</div>
            ${panelsHtml}
        `;
    } catch (e) {
        container.innerHTML = '<p style="color:#dc2626; font-size:13px;">Erro ao carregar licenças.</p>';
    }
}


window.abrirModalSolicitarCredenciamento = async function(id = null) {
    const modal = document.getElementById('modal-solicitar-credenciamento');
    if (modal) modal.style.display = 'flex';

    if (!id) {
        // Limpar campos
        document.getElementById('solic-id-edit').value = '';
        document.getElementById('solic-cliente-nome').value = '';
        document.getElementById('solic-os').value = '';
        document.getElementById('solic-cliente-email').value = '';
        document.getElementById('solic-endereco-instalacao').value = '';
        document.getElementById('solic-qtd-colabs').value = 0;
        document.getElementById('solic-qtd-veiculos').value = 0;
        document.getElementById('solic-data-limite').value = '';
        const obs = document.getElementById('solic-observacoes'); if (obs) obs.value = '';
        document.querySelectorAll('#solic-docs-exigidos input[type="checkbox"]').forEach(c => c.checked = false);
        await _carregarLicencasAgrupadas([]);
    } else {
        const item = window._historicoComCredDados.find(c => c.id == id);
        if (item) {
            document.getElementById('solic-id-edit').value = item.id;
            document.getElementById('solic-cliente-nome').value = item.cliente_nome || '';
            document.getElementById('solic-os').value = item.os || '';
            document.getElementById('solic-cliente-email').value = item.cliente_email || '';
            document.getElementById('solic-endereco-instalacao').value = item.endereco_instalacao || '';
            document.getElementById('solic-qtd-colabs').value = item.qtd_max_colaboradores || 0;
            document.getElementById('solic-qtd-veiculos').value = item.qtd_max_veiculos || 0;
            document.getElementById('solic-data-limite').value = item.data_limite_envio ? item.data_limite_envio.split('T')[0] : '';
            const obs = document.getElementById('solic-observacoes'); if (obs) obs.value = item.observacoes || '';

            const docs = item.docs_exigidos ? JSON.parse(item.docs_exigidos) : [];
            document.querySelectorAll('#solic-docs-exigidos input[type="checkbox"]').forEach(c => {
                c.checked = docs.includes(c.value);
            });

            const lics = item.licencas_ids ? JSON.parse(item.licencas_ids) : [];
            await _carregarLicencasAgrupadas(lics);
        }
    }
}

window.fecharModalSolicitarCredenciamento = function() {
    const modal = document.getElementById('modal-solicitar-credenciamento');
    if (modal) modal.style.display = 'none';
}

window.salvarSolicitacaoCredenciamento = async function() {
    const id = document.getElementById('solic-id-edit').value;
    const btn = document.querySelector('#modal-solicitar-credenciamento .btn-primary');
    
    const payload = {
        cliente_nome: document.getElementById('solic-cliente-nome').value,
        os: document.getElementById('solic-os').value,
        cliente_email: document.getElementById('solic-cliente-email').value,
        endereco_instalacao: document.getElementById('solic-endereco-instalacao').value,
        qtd_max_colaboradores: document.getElementById('solic-qtd-colabs').value || 0,
        qtd_max_veiculos: document.getElementById('solic-qtd-veiculos').value || 0,
        data_limite_envio: document.getElementById('solic-data-limite').value || null,
        observacoes: (document.getElementById('solic-observacoes') || {}).value || '',
        docs_exigidos: [],
        licencas: []
    };
    
    if (!payload.cliente_nome || !payload.cliente_email) {
        alert("Preencha Nome e E-mail do cliente.");
        return;
    }
    
    document.querySelectorAll('#solic-docs-exigidos input[type="checkbox"]:checked').forEach(c => {
        payload.docs_exigidos.push(c.value);
    });
    
    // Coletar licenças do novo container agrupado
    document.querySelectorAll('#solic-licencas-empresas input[type="checkbox"]:checked').forEach(c => {
        payload.licencas.push({ id: c.value, nome: c.getAttribute('data-nome'), empresa: c.getAttribute('data-empresa') });
    });
    
    try {
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
        btn.disabled = true;
        
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const url = id ? `/api/comercial/credenciamento/${id}` : '/api/comercial/credenciamento';
        const method = id ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
        
        alert("Solicitação salva e Logística notificada!");
        window.fecharModalSolicitarCredenciamento();
        window.carregarHistoricoComCred();
    } catch (e) {
        alert(e.message);
    } finally {
        btn.innerHTML = '<i class="ph ph-paper-plane-right"></i> Salvar e Notificar Logística';
        btn.disabled = false;
    }
}

window.carregarHistoricoComCred = async function() {
    try {
        const tbody = document.getElementById('tbody-comercial-cred');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:2rem;">Carregando histórico...</td></tr>';
        
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/logistica/credenciamentos', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Erro ${res.status}`);
        }
        const data = await res.json();
        
        window._historicoComCredDados = Array.isArray(data) ? data : [];
        window.ordenarHistoricoComCred(window._historicoComCredSort.col);
    } catch(e) {
        console.error(e);
        window._historicoComCredDados = [];
        const tbody = document.getElementById('tbody-comercial-cred');
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Erro: ${e.message}</td></tr>`;
    }
}

window.filtrarHistoricoComCred = function() {
    const termo = (document.getElementById('filtro-pesquisa-com-cred').value || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    const rows = document.querySelectorAll('#tbody-comercial-cred tr');
    rows.forEach(row => {
        if (row.cells.length === 1) return;
        const texto = row.cells[0].textContent.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        row.style.display = texto.includes(termo) ? '' : 'none';
    });
}

window.ordenarHistoricoComCred = function(coluna) {
    if (window._historicoComCredSort.col === coluna) {
        window._historicoComCredSort.dir = window._historicoComCredSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        window._historicoComCredSort.col = coluna;
        window._historicoComCredSort.dir = 'asc';
    }

    const tbody = document.getElementById('tbody-comercial-cred');
    if (!tbody) return;

    // Show all records (both solicitado and sent) for commercial view
    const todos = Array.isArray(window._historicoComCredDados) ? window._historicoComCredDados : [];

    if (todos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:2rem; font-style:italic;">Nenhuma solicitação encontrada.</td></tr>';
        return;
    }

    let dados = [...todos];

    if (coluna === 'cliente') {
        dados.sort((a, b) => {
            const nomeA = (a.cliente_nome || '').toLowerCase();
            const nomeB = (b.cliente_nome || '').toLowerCase();
            if (nomeA < nomeB) return window._historicoComCredSort.dir === 'asc' ? -1 : 1;
            if (nomeA > nomeB) return window._historicoComCredSort.dir === 'asc' ? 1 : -1;
            return 0;
        });
    } else if (coluna === 'data') {
        dados.sort((a, b) => {
            const dataA = new Date(a.created_at || 0).getTime();
            const dataB = new Date(b.created_at || 0).getTime();
            return window._historicoComCredSort.dir === 'asc' ? dataA - dataB : dataB - dataA;
        });
    }


    tbody.innerHTML = dados.map(cred => {
        let dtFormatada = '';
        if (cred.created_at) {
            const d = new Date(cred.created_at);
            dtFormatada = d.toLocaleDateString('pt-BR');
        }
        
        let statusBadge = '';
        if (cred.status === 'solicitado') {
            statusBadge = `<span style="color:#eab308; font-weight:600;"><i class="ph ph-clock"></i> Solicitado em ${dtFormatada}</span>`;
        } else if (cred.status === 'enviado') {
            statusBadge = `<span style="color:#4f46e5; font-weight:600;"><i class="ph ph-paper-plane-right"></i> Enviado</span>`;
        } else if (new Date() > new Date(cred.valid_until)) {
            statusBadge = `<span style="color:#dc2626; font-weight:600;"><i class="ph ph-x-circle"></i> Expirado</span>`;
        } else if (cred.acessado_em) {
            statusBadge = `<span style="color:#16a34a; font-weight:600;"><i class="ph ph-check-circle"></i> Acessado</span>`;
        } else {
            statusBadge = `<span style="color:#4f46e5; font-weight:600;"><i class="ph ph-paper-plane-right"></i> Enviado</span>`;
        }
        
        const docs = cred.docs_exigidos ? JSON.parse(cred.docs_exigidos) : [];
        const lics = cred.licencas_ids ? JSON.parse(cred.licencas_ids) : [];
        
        const docsHover = docs.length > 0 ? docs.join(', ') : 'Nenhum';
        const licsHover = lics.length > 0 ? lics.map(l=>l.nome).join(', ') : 'Nenhuma';
        
        let acoes = '';
        if (cred.status === 'solicitado') {
            acoes = `<button class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="window.abrirModalSolicitarCredenciamento('${cred.id}')"><i class="ph ph-pencil"></i></button>`;
        }
        
        const dtLimite = cred.data_limite_envio ? new Date(cred.data_limite_envio).toLocaleDateString('pt-BR') : '-';

        return `
        <tr>
            <td>
                <b>${cred.cliente_nome}</b><br>
                <span style="font-size:0.8rem; color:#64748b;">${cred.cliente_email}</span>
                ${cred.endereco_instalacao ? `<br><span style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-map-pin"></i> ${cred.endereco_instalacao}</span>` : ''}
            </td>
            <td title="Documentos: ${docsHover}" style="cursor:help; border-bottom:1px dotted #94a3b8;">${cred.qtd_max_colaboradores || 0}</td>
            <td>${cred.qtd_max_veiculos || 0}</td>
            <td title="${licsHover}" style="cursor:help; border-bottom:1px dotted #94a3b8;">${lics.length > 0 ? 'Sim' : 'Não'}</td>
            <td>${dtLimite}</td>
            <td>${statusBadge}</td>
            <td style="text-align:right;">${acoes}</td>
        </tr>`;
    }).join('');
    
    window.filtrarHistoricoComCred();
}

// Intercept routing to load
const originalNavigateToComCred = window.navigateTo;
window.navigateTo = function(target) {
    if (target === 'comercial-credenciamento') {
        window.carregarHistoricoComCred();
    }
    if (originalNavigateToComCred) originalNavigateToComCred(target);
};
