
function formatUTCDate(dateStr) {
    if (!dateStr) return 'Data não registrada';
    const isoStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const finalStr = isoStr.endsWith('Z') ? isoStr : isoStr + 'Z';
    return new Date(finalStr).toLocaleString('pt-BR');
}

window.renderAvatar = function(nome, foto, b64) {
    const initial = (nome || 'U')[0].toUpperCase();
    if (b64) return `<img src="${b64}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">`;
    if (foto) return `<img src="/${foto}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" onerror="this.outerHTML='<div style=\'width:36px; height:36px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#64748b; font-size:16px;\'>${initial}</div>'">`;
    return `<div style="width:36px; height:36px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#64748b; font-size:16px;">${initial}</div>`;
};

// frontend/comercial_credenciamento.js

window._historicoComCredDados = [];
window._historicoComCredSort = { col: 'data', dir: 'asc' };

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

window._updateLicencasTabCounts = function() {
    document.querySelectorAll('.solic-lic-tab-btn').forEach(btn => {
        const emp = btn.dataset.emp;
        const panel = document.querySelector(`.solic-lic-panel[data-emp="${emp}"]`);
        if (panel) {
            const count = panel.querySelectorAll('input[type="checkbox"]:checked').length;
            const span = btn.querySelector('.tab-count');
            if (span) span.textContent = `(${count})`;
        }
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
            return `<button type="button" class="solic-lic-tab-btn" data-emp="${emp}" onclick="window._switchLicencaTab('${emp}')"
                style="padding:6px 14px; border-radius:6px; border:1.5px solid ${ativo ? '#7048e8' : '#e2e8f0'};
                background:${ativo ? '#7048e8' : '#f1f5f9'}; color:${ativo ? '#fff' : '#475569'};
                font-weight:${ativo ? '700' : '400'}; font-size:13px; cursor:pointer; white-space:nowrap;">
                <i class="ph ph-buildings"></i> ${emp}
                <span class="tab-count" style="font-size:11px; opacity:0.75;">(0)</span>
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
                        <input type="checkbox" name="solic_licencas" value="${l.id}" data-nome="${l.nome}" data-empresa="${emp}" ${checked} onchange="window._updateLicencasTabCounts()">
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
        
        
        let cepAlert = "";
        const cepMatchAlert = payload.endereco_instalacao ? payload.endereco_instalacao.match(/\b\d{5}-?\d{3}\b/) : null;
        if (cepMatchAlert) {
            const cepAlertVal = cepMatchAlert[0].replace('-', '');
            const outroCredAlert = (window._historicoComCredDados || []).find(c => {
                if (c.id == id) return false;
                if (!c.endereco_instalacao) return false;
                const m = c.endereco_instalacao.match(/\b\d{5}-?\d{3}\b/);
                return m && m[0].replace('-', '') === cepAlertVal;
            });
            if (outroCredAlert) {
                cepAlert = `\n\n⚠️ ATENÇÃO: O CEP ${cepMatchAlert[0]} também está cadastrado na OS ${outroCredAlert.os || '-'} do cliente ${outroCredAlert.cliente_nome}.`;
            }
        }
        
        alert("Solicitação salva e Logística notificada!" + cepAlert);
    
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
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:2rem;">Carregando histórico...</td></tr>';
        
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/logistica/credenciamentos', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Erro ${res.status}`);
        }
        const data = await res.json();
        
        window._historicoComCredDados = Array.isArray(data) ? data : [];
        window.ordenarHistoricoComCred('data', 'desc');
    } catch(e) {
        console.error(e);
        window._historicoComCredDados = [];
        const tbody = document.getElementById('tbody-comercial-cred');
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Erro: ${e.message}</td></tr>`;
    }
}

window.filtrarHistoricoComCred = function() {
    const elOs = document.getElementById('filtro-pesquisa-os-com-cred');
    const elCliente = document.getElementById('filtro-pesquisa-cliente-com-cred');
    const elEndereco = document.getElementById('filtro-pesquisa-endereco-com-cred');
    const elEmail = document.getElementById('filtro-pesquisa-email-com-cred');
    
    const termoOs = elOs ? (elOs.value || '').toLowerCase().trim() : '';
    const termoCliente = elCliente ? (elCliente.value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
    const termoEndereco = elEndereco ? (elEndereco.value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
    const termoEmail = elEmail ? (elEmail.value || '').toLowerCase().trim() : '';
    
    const rows = document.querySelectorAll('#tbody-comercial-cred tr');
    let lastRowMatch = true;
    
    rows.forEach(row => {
        if (row.cells.length === 1) {
            if (!lastRowMatch) row.style.display = 'none';
            return;
        }
        
        const osText = row.cells[0].textContent.toLowerCase().trim();
        let cName = '', cEmail = '', cEnd = '';
        
        if (row.cells[1]) {
            const b = row.cells[1].querySelector('b');
            const spans = row.cells[1].querySelectorAll('span');
            cName = b ? b.textContent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
            cEmail = spans.length > 0 ? spans[0].textContent.toLowerCase().trim() : '';
            cEnd = spans.length > 1 ? spans[1].textContent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
        }
        
        let match = true;
        if (termoOs && !osText.includes(termoOs)) match = false;
        if (termoCliente && !cName.includes(termoCliente)) match = false;
        if (termoEmail && !cEmail.includes(termoEmail)) match = false;
        if (termoEndereco && !cEnd.includes(termoEndereco)) match = false;
        
        row.style.display = match ? '' : 'none';
        lastRowMatch = match;
    });
}

window.ordenarHistoricoComCred = function(coluna, forceDir = null) {
    if (forceDir) {
        window._historicoComCredSort.col = coluna;
        window._historicoComCredSort.dir = forceDir;
    } else if (window._historicoComCredSort.col === coluna) {
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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:2rem; font-style:italic;">Nenhuma solicitação encontrada.</td></tr>';
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
    } else if (coluna === 'os') {
        dados.sort((a, b) => {
            const osA = (a.os || '').toLowerCase();
            const osB = (b.os || '').toLowerCase();
            if (osA < osB) return window._historicoComCredSort.dir === 'asc' ? -1 : 1;
            if (osA > osB) return window._historicoComCredSort.dir === 'asc' ? 1 : -1;
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
            statusBadge = `<span style="color:#eab308; font-weight:600;"><i class="ph ph-clock"></i> Solicitado</span>`;
        } else if (new Date() > new Date(cred.valid_until)) {
            statusBadge = `<span style="color:#dc2626; font-weight:600;"><i class="ph ph-x-circle"></i> Expirado</span>`;
        } else if (cred.acessado_em) {
            statusBadge = `<span style="color:#16a34a; font-weight:600;"><i class="ph ph-check-circle"></i> Acessado</span>`;
        } else {
            statusBadge = `<span style="color:#4f46e5; font-weight:600;"><i class="ph ph-paper-plane-right"></i> Enviado</span>`;
        }
        
        const docs = cred.docs_exigidos ? JSON.parse(cred.docs_exigidos) : [];
        const lics = cred.licencas_ids ? JSON.parse(cred.licencas_ids) : [];
        
        const docNamesMap = {
            'cnh': 'CNH', 'cpf': 'CPF', 'aso': 'ASO', 'ficha_registro': 'Ficha de Registro',
            'treinamento': 'Carteira de Vacinação', 'epi': 'Ficha de EPI',
            'contrato_esocial': 'Contrato e-social', 'nr1': 'NR1 / Ordem de Serviço'
        };
        const docsArr = docs.map(d => docNamesMap[d] || d);
        const docsFormatted = docsArr.length > 0 ? docsArr.join(' - ') : 'Nenhum';

        const licGroups = {};
        lics.forEach(l => {
            const comp = l.empresa || 'América Rental';
            if (!licGroups[comp]) licGroups[comp] = [];
            licGroups[comp].push(l.nome);
        });
        
        let licsFormatted = '';
        if (Object.keys(licGroups).length > 0) {
            licsFormatted = Object.entries(licGroups).map(([comp, nomes]) => `<b>${comp}:</b> ${nomes.join(' - ')}`).join('<br>');
        } else {
            licsFormatted = 'Nenhuma';
        }
        
        let acoes = '';
        if (cred.status === 'solicitado') {
            acoes = `<button class="btn btn-warning btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="window.abrirModalSolicitarCredenciamento('${cred.id}')" title="Editar Solicitação"><i class="ph ph-pencil-simple"></i></button>`;
        } else if (cred.token) {
            acoes = `<button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="window.reenviarEmailCredenciamento('${cred.id}', '${cred.cliente_email}')" title="Reenviar E-mail"><i class="ph ph-envelope-simple"></i></button>`;
        }
        
        const dtLimite = cred.data_limite_envio ? new Date(cred.data_limite_envio).toLocaleDateString('pt-BR') : '-';


        const solNome = cred.sol_nome_usuario || cred.sol_username || cred.solicitado_por_nome || 'Usuário Comercial';
        const envNome = cred.env_nome_usuario || cred.env_username || cred.enviado_por_nome || 'Usuário Logística';
        const solDataStr = cred.created_at ? formatUTCDate(cred.created_at) : 'Data não registrada';
        const envDataStr = cred.enviado_em ? formatUTCDate(cred.enviado_em) : 'Data não registrada';

        let alertaCepHtml = '';
        if (cred.endereco_instalacao) {
            const cepMatch = cred.endereco_instalacao.match(/\b\d{5}-?\d{3}\b/);
            if (cepMatch) {
                const cep = cepMatch[0].replace('-', '');
                const outroCred = dados.find(c => {
                    if (c.id === cred.id) return false;
                    if (!c.endereco_instalacao) return false;
                    const match = c.endereco_instalacao.match(/\b\d{5}-?\d{3}\b/);
                    return match && match[0].replace('-', '') === cep;
                });
                if (outroCred) {
                    alertaCepHtml = `
                    <div style="background:#fffbeb; border:1px solid #fde68a; color:#b45309; padding:10px 15px; border-radius:8px; margin-bottom:15px; display:flex; align-items:flex-start; gap:10px;">
                        <i class="ph-fill ph-warning" style="color:#d97706; font-size:1.4rem; margin-top:2px;"></i>
                        <div>
                            <strong style="display:block; margin-bottom:4px;">Atenção: CEP em comum</strong>
                            A OS <b>${outroCred.os || '-'}</b> (Cliente: <b>${outroCred.cliente_nome}</b>) possui o mesmo número de CEP cadastrado: <b>${cepMatch[0]}</b>.
                            <div style="font-size:0.8rem; margin-top:4px; opacity:0.8;">Endereço vinculado: ${outroCred.endereco_instalacao}</div>
                        </div>
                    </div>`;
                }
            }
        }


        return `
        <tr>
            <td><b>${cred.os || '-'}</b></td>
            <td>
                <b>${cred.cliente_nome}</b><br>
                <span style="font-size:0.8rem; color:#64748b;">${cred.cliente_email}</span>
                ${cred.endereco_instalacao ? `<br><span style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-map-pin"></i> ${cred.endereco_instalacao}</span>` : ''}
            </td>
            <td>${cred.qtd_max_colaboradores || 0}</td>
            <td>${cred.qtd_max_veiculos || 0}</td>
            <td>${lics.length > 0 ? 'Sim' : 'Não'}</td>
            <td>${dtLimite}</td>
            <td>${statusBadge}</td>
            <td style="text-align:right;">
                <button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="toggleCredDetails(this, 'cred-det-${cred.id}')" title="Ver Detalhes"><i class="ph ph-caret-down"></i></button>
                ${acoes}
            </td>
        </tr>
        <tr id="cred-det-${cred.id}" style="display:none; background:#f8fafc;">
            <td colspan="8" style="padding:15px; font-size:0.85rem; border-left:3px solid #7048e8;">
                ${alertaCepHtml}
                <div style="display:flex; flex-wrap:wrap; gap:30px;">
                    
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:4px;">📄 Documentos Solicitados:</div>
                        <div style="color:#334155;">${docsFormatted}</div>
                    </div>
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:4px;">🏷️ Licenças Solicitadas:</div>
                        <div style="color:#334155; line-height:1.6;">${licsFormatted}</div>
                    </div>
                </div>
                ${cred.observacoes ? `<div style="margin-top:15px; padding-top:10px; border-top:1px solid #e2e8f0;"><span style="color:#64748b; font-weight:600;">📝 Observações:</span> <span style="color:#475569;">${cred.observacoes}</span></div>` : ''}
                
                
                <div style="margin-top:15px; padding-top:15px; border-top:1px solid #e2e8f0; display:flex; flex-wrap:wrap; gap:30px;">
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#eab308; font-weight:600; margin-bottom:8px;">Solicitação:</div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            ${window.renderAvatar(solNome, cred.sol_foto, cred.sol_foto_b64)}
                            <div>
                                <div style="font-weight:600; color:#334155; font-size:0.9rem;">${solNome}</div>
                                <div style="font-size:0.75rem; color:#64748b;"><i class="ph ph-calendar-blank"></i> ${solDataStr}</div>
                            </div>
                        </div>
                    </div>

                    <div style="flex:1; min-width:250px;">
                        <div style="color:#3b82f6; font-weight:600; margin-bottom:8px;">Envio do Credenciamento:</div>
                        ${cred.status === 'enviado' || cred.enviado_em ? `
                            <div style="display:flex; align-items:center; gap:10px;">
                                ${window.renderAvatar(envNome, cred.env_foto, cred.env_foto_b64)}
                                <div>
                                    <div style="font-weight:600; color:#334155; font-size:0.9rem;">${envNome}</div>
                                    <div style="font-size:0.75rem; color:#64748b;"><i class="ph ph-calendar-blank"></i> ${envDataStr}</div>
                                </div>
                            </div>
                        ` : `
                            <div style="padding:10px; background:#fef2f2; color:#ef4444; border-radius:6px; font-size:0.8rem; display:inline-block;">
                                <i class="ph ph-x-circle"></i> Credenciamento não enviado
                            </div>
                        `}
                    </div>
                    
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:8px;">Acesso do Cliente:</div>
                        ${cred.acessado_em ? `
                            <div style="padding:10px; background:#f0fdf4; color:#166534; border-radius:6px; font-size:0.8rem; display:inline-block; border:1px solid #bbf7d0;">
                                <i class="ph ph-check-circle"></i> Link acessado pelo cliente
                                <div style="margin-top:4px; font-weight:600;">
                                    <i class="ph ph-clock"></i> Acessado em: ${formatUTCDate(cred.acessado_em)}
                                </div>
                            </div>
                        ` : `
                            <div style="font-size:0.8rem; color:#94a3b8; font-style:italic;">
                                Cliente ainda não abriu o link.
                            </div>
                        `}
                    </div>
                </div>
            </td>
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

window.toggleCredDetails = function(btn, id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.style.display === 'none') {
        el.style.display = 'table-row';
        btn.innerHTML = '<i class="ph ph-caret-up"></i>';
        btn.classList.replace('btn-outline', 'btn-secondary');
    } else {
        el.style.display = 'none';
        btn.innerHTML = '<i class="ph ph-caret-down"></i>';
        btn.classList.replace('btn-secondary', 'btn-outline');
    }
};
