// frontend/comercial_credenciamento.js

window._historicoComCredDados = [];
window._historicoComCredSort = { col: 'data', dir: 'desc' };

window.abrirModalSolicitarCredenciamento = async function(id = null) {
    const modal = document.getElementById('modal-solicitar-credenciamento');
    if (modal) modal.style.display = 'flex';
    
    // Carregar licencas
    const licContainer = document.getElementById('solic-licencas-list');
    if (licContainer && licContainer.children[0].tagName === 'P') {
        licContainer.innerHTML = '<p>Carregando...</p>';
        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const res = await fetch('/api/licencas', { headers: { 'Authorization': `Bearer ${token}` } });
            const licencas = await res.json();
            licContainer.innerHTML = licencas.map(l => `<div><label><input type="checkbox" name="solic_licencas" value="${l.id}" data-nome="${l.nome}"> ${l.nome}</label></div>`).join('');
        } catch (e) {
            licContainer.innerHTML = '<p style="color:red;">Erro ao carregar licenças.</p>';
        }
    }

    if (!id) {
        // Clear fields
        document.getElementById('solic-id-edit').value = '';
        document.getElementById('solic-cliente-nome').value = '';
        document.getElementById('solic-os').value = '';
        document.getElementById('solic-cliente-email').value = '';
        document.getElementById('solic-endereco-instalacao').value = '';
        document.getElementById('solic-qtd-colabs').value = 0;
        document.getElementById('solic-qtd-veiculos').value = 0;
        document.getElementById('solic-data-limite').value = '';
        
        document.querySelectorAll('#solic-docs-exigidos input[type="checkbox"]').forEach(c => c.checked = false);
        if (licContainer) {
            document.querySelectorAll('#solic-licencas-list input[type="checkbox"]').forEach(c => c.checked = false);
        }
    } else {
        // Load data to edit
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
            
            const docs = item.docs_exigidos ? JSON.parse(item.docs_exigidos) : [];
            document.querySelectorAll('#solic-docs-exigidos input[type="checkbox"]').forEach(c => {
                c.checked = docs.includes(c.value);
            });
            
            const lics = item.licencas_ids ? JSON.parse(item.licencas_ids) : [];
            if (licContainer) {
                document.querySelectorAll('#solic-licencas-list input[type="checkbox"]').forEach(c => {
                    c.checked = lics.some(l => l.id == c.value);
                });
            }
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
    
    document.querySelectorAll('#solic-licencas-list input[type="checkbox"]:checked').forEach(c => {
        payload.licencas.push({ id: c.value, nome: c.getAttribute('data-nome') });
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
        const data = await res.json();
        
        window._historicoComCredDados = data || [];
        window.ordenarHistoricoComCred(window._historicoComCredSort.col);
    } catch(e) {
        console.error(e);
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
    if (!window._historicoComCredDados || window._historicoComCredDados.length === 0) return;

    let dados = [...window._historicoComCredDados];

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

    const tbody = document.getElementById('tbody-comercial-cred');
    if (!tbody) return;

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
