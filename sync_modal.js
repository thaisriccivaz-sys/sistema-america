const fs = require('fs');

function syncLogisticsModalLayout() {
    // 1. Update index.html
    let htmlPath = 'frontend/index.html';
    let html = fs.readFileSync(htmlPath, 'utf8');

    // Replace Endereço de Instalação group to include OS
    const oldAddressBlock = `<div class="form-group" style="grid-column: 1 / -1;">
                            <label>Endereço de Instalação</label>
                            <input type="text" id="cred-endereco-instalacao" placeholder="Ex: Rua das Flores, 123 - Centro">
                        </div>`;
    const newAddressBlock = `<div class="form-group" style="grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 3fr; gap: 1rem;">
                            <div>
                                <label style="display:block; margin-bottom:4px; font-weight:600;">OS</label>
                                <input type="text" id="cred-os" placeholder="Ex: OS-12345" style="width:100%; padding:0.6rem; border:1px solid #e2e8f0; border-radius:6px; box-sizing:border-box;">
                            </div>
                            <div>
                                <label style="display:block; margin-bottom:4px; font-weight:600;">Endereço de Instalação</label>
                                <input type="text" id="cred-endereco-instalacao" placeholder="Ex: Rua das Flores, 123 - Centro" style="width:100%; padding:0.6rem; border:1px solid #e2e8f0; border-radius:6px; box-sizing:border-box;">
                            </div>
                        </div>`;
    html = html.replace(oldAddressBlock, newAddressBlock);

    // Replace Licenças da Empresa block
    const oldLicencasBlock = `<div class="card" style="margin-bottom: 1.5rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                        <h3><i class="ph ph-seal-check" style="color:#16a34a;"></i> Licenças da Empresa</h3>
                        <button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px;" onclick="window.abrirModalAddCredLicenca()"><i class="ph ph-plus"></i> Adicionar</button>
                    </div>
                    <div id="cred-licencas-list" style="display:flex; flex-direction:column; gap: 8px;">
                        <p style="color:#94a3b8; font-size:13px; font-style:italic;">Nenhuma licença selecionada.</p>
                    </div>
                </div>`;
    const newLicencasBlock = `<div class="card" style="margin-bottom: 1.5rem;">
                    <h3 style="margin-bottom: 1rem;"><i class="ph ph-seal-check" style="color:#16a34a;"></i> Licenças da Empresa</h3>
                    <div id="cred-licencas-empresas">
                        <p style="color:#94a3b8; font-size:13px;">Carregando licenças...</p>
                    </div>
                </div>`;
    html = html.replace(oldLicencasBlock, newLicencasBlock);

    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log("Updated index.html layout for Logistica modal.");


    // 2. Update frontend/credenciamento.js
    let logJsPath = 'frontend/credenciamento.js';
    let logJs = fs.readFileSync(logJsPath, 'utf8');

    // Add _carregarLicencasAgrupadasLogistica logic at the top of the file or near the end
    const logicToInject = `
window._switchLicencaTabCred = function(empresa) {
    document.querySelectorAll('.cred-lic-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-emp') === empresa) {
            btn.style.border = '1.5px solid #7048e8';
            btn.style.background = '#7048e8';
            btn.style.color = '#fff';
            btn.style.fontWeight = '700';
        } else {
            btn.style.border = '1.5px solid #e2e8f0';
            btn.style.background = '#f1f5f9';
            btn.style.color = '#475569';
            btn.style.fontWeight = '400';
        }
    });

    document.querySelectorAll('.cred-lic-panel').forEach(panel => {
        if (panel.getAttribute('data-emp') === empresa) {
            panel.style.display = 'grid';
        } else {
            panel.style.display = 'none';
        }
    });
};

window._updateLicencasTabCountsCred = function() {
    document.querySelectorAll('.cred-lic-tab-btn').forEach(btn => {
        const emp = btn.getAttribute('data-emp');
        const panel = document.querySelector(\`.cred-lic-panel[data-emp="\${emp}"]\`);
        if (panel) {
            const count = panel.querySelectorAll('input[type="checkbox"]:checked').length;
            const span = btn.querySelector('.tab-count');
            if (span) span.textContent = \`(\${count})\`;
        }
    });
};

async function _carregarLicencasAgrupadasLogistica(licsSelecionadas = []) {
    const container = document.getElementById('cred-licencas-empresas');
    if (!container) return;
    container.innerHTML = '<p style="color:#94a3b8; font-size:13px;">Carregando licenças...</p>';
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/licencas', { headers: { 'Authorization': \`Bearer \${token}\` } });
        const data = await res.json();
        const todas = Array.isArray(data) ? data : [];
        
        credenciamentoState.licencas = todas; // For validation fallback
        const EMPRESAS_LICENCAS = ['América Rental', 'Attend Ambiental', 'BRK'];

        const grupos = {};
        EMPRESAS_LICENCAS.forEach(e => grupos[e] = []);
        todas.forEach(l => {
            let emp = (l.empresa || 'Outras').trim();
            const empStr = emp.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (empStr === 'americarental') emp = 'América Rental';
            else if (empStr === 'attendambiental') emp = 'Attend Ambiental';
            else if (empStr === 'brk') emp = 'BRK';

            if (!grupos[emp]) grupos[emp] = [];
            grupos[emp].push(l);
        });

        const extras = Object.keys(grupos).filter(e => !EMPRESAS_LICENCAS.includes(e));
        const todasEmpresas = [...EMPRESAS_LICENCAS, ...extras];
        const primeiraEmp = todasEmpresas[0];

        const tabsHtml = todasEmpresas.map(emp => {
            const ativo = emp === primeiraEmp;
            return \`<button type="button" class="cred-lic-tab-btn" data-emp="\${emp}" onclick="window._switchLicencaTabCred('\${emp}')"
                style="padding:6px 14px; border-radius:6px; border:1.5px solid \${ativo ? '#7048e8' : '#e2e8f0'};
                background:\${ativo ? '#7048e8' : '#f1f5f9'}; color:\${ativo ? '#fff' : '#475569'};
                font-weight:\${ativo ? '700' : '400'}; font-size:13px; cursor:pointer; white-space:nowrap;">
                <i class="ph ph-buildings"></i> \${emp}
                <span class="tab-count" style="font-size:11px; opacity:0.75;">(0)</span>
            </button>\`;
        }).join('');

        const panelsHtml = todasEmpresas.map(emp => {
            const lics = grupos[emp];
            const isAtivo = emp === primeiraEmp;
            const items = lics.length === 0
                ? \`<p style="color:#94a3b8; font-size:12px; font-style:italic; grid-column:1/-1; margin:4px 0;">Nenhuma licença cadastrada para esta empresa.</p>\`
                : lics.map(l => {
                    const isChecked = licsSelecionadas.some(s => {
                        const sid = typeof s === 'object' ? s.id : s;
                        return String(sid) === String(l.id);
                    });
                    const checked = isChecked ? 'checked' : '';
                    
                    const hj = new Date(); hj.setHours(0,0,0,0);
                    const isVencida = l.validade && new Date(l.validade + 'T12:00:00') < hj;
                    const vencStyle = isVencida ? 'color:#dc2626;font-weight:bold;' : 'color:#94a3b8;';
                    const vencIcon = isVencida ? '⚠ Vencida' : (l.validade ? l.validade.split('-').reverse().join('/') : 'Sem vencimento');

                    return \`<label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer; padding:4px 0;">
                        <input type="checkbox" name="cred_licencas" value="\${l.id}" data-nome="\${l.nome}" data-empresa="\${emp}" data-validade="\${l.validade || ''}" \${checked} onchange="window._updateLicencasTabCountsCred()">
                        \${l.nome} <span style="font-size:11px; \${vencStyle}">(\${vencIcon})</span>
                    </label>\`;
                }).join('');

            return \`<div class="cred-lic-panel" data-emp="\${emp}"
                style="display:\${isAtivo ? 'grid' : 'none'}; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:4px 16px;
                background:#f8fafc; border:1px solid #e2e8f0; border-radius:0 6px 6px 6px; padding:12px; margin-top:0;">
                \${items}
            </div>\`;
        }).join('');

        container.innerHTML = \`
            <div style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:-1px; position:relative; z-index:2;">
                \${tabsHtml}
            </div>
            \${panelsHtml}
        \`;
        window._updateLicencasTabCountsCred();
    } catch(e) {
        container.innerHTML = \`<p style="color:#ef4444; font-size:13px;">Erro ao carregar licenças.</p>\`;
    }
}
`;

    if (!logJs.includes('_carregarLicencasAgrupadasLogistica')) {
        logJs = logicToInject + '\n' + logJs;
    }

    // Replace opening modal logic
    const oldModalOpen = `        const nome = document.getElementById('cred-cliente-nome'); if (nome) nome.value = dados.cliente_nome || '';
        const email = document.getElementById('cred-cliente-email'); if (email) email.value = dados.cliente_email || '';
        const end = document.getElementById('cred-endereco-instalacao'); if (end) end.value = dados.endereco_instalacao || '';

        // Pré-marcar documentos exigidos
        let docsArr = [];
        try { docsArr = JSON.parse(dados.docs_exigidos || '[]'); } catch(e) {}
        document.querySelectorAll('#cred-docs-exigidos input').forEach(cb => {
            cb.checked = docsArr.includes(cb.value);
        });`;
    
    const newModalOpen = `        const nome = document.getElementById('cred-cliente-nome'); if (nome) nome.value = dados.cliente_nome || '';
        const email = document.getElementById('cred-cliente-email'); if (email) email.value = dados.cliente_email || '';
        const end = document.getElementById('cred-endereco-instalacao'); if (end) end.value = dados.endereco_instalacao || '';
        const osInput = document.getElementById('cred-os'); if (osInput) osInput.value = dados.os || '';

        // Pré-marcar documentos exigidos
        let docsArr = [];
        try { docsArr = JSON.parse(dados.docs_exigidos || '[]'); } catch(e) {}
        document.querySelectorAll('#cred-docs-exigidos input').forEach(cb => {
            cb.checked = docsArr.includes(cb.value);
        });
        
        let licsSelecionadas = [];
        try { licsSelecionadas = JSON.parse(dados.licencas_ids || '[]'); } catch(e) {}
        _carregarLicencasAgrupadasLogistica(licsSelecionadas);`;
        
    logJs = logJs.replace(oldModalOpen, newModalOpen);

    // Replace ValidarVencimentos logic
    const oldValidarLicencas = `    // 1. Validar licenças selecionadas
    for (const id of credenciamentoState.selecionadosLicencas) {
        const lic = credenciamentoState.licencas.find(l => String(l.id) === id);
        if (lic && lic.validade) {
            if (new Date(lic.validade + 'T12:00:00') < hoje)
                erros.push(\`Licença "\${lic.nome}" está VENCIDA (\${lic.validade.split('-').reverse().join('/')})\`);
        }
    }`;
    const newValidarLicencas = `    // 1. Validar licenças selecionadas via Checkboxes na Logística
    const licencasChecked = document.querySelectorAll('#cred-licencas-empresas input[type="checkbox"]:checked');
    licencasChecked.forEach(cb => {
        const validade = cb.getAttribute('data-validade');
        if (validade) {
            if (new Date(validade + 'T12:00:00') < hoje) {
                erros.push(\`Licença "\${cb.getAttribute('data-nome')}" está VENCIDA (\${validade.split('-').reverse().join('/')})\`);
            }
        }
    });`;
    logJs = logJs.replace(oldValidarLicencas, newValidarLicencas);

    // Replace gerarEnviarCredenciamento payload logic
    const oldPayloadLicencas = `        licencas: credenciamentoState.selecionadosLicencas.map(id => {
            const l = credenciamentoState.licencas.find(x => String(x.id) === id);
            return l ? { id: l.id, nome: l.nome, empresa: l.empresa, validade: l.validade } : null;
        }).filter(Boolean),`;
    const newPayloadLicencas = `        os: (document.getElementById('cred-os') || {}).value?.trim(),
        licencas: Array.from(document.querySelectorAll('#cred-licencas-empresas input[type="checkbox"]:checked')).map(cb => {
            return { id: cb.value, nome: cb.getAttribute('data-nome'), empresa: cb.getAttribute('data-empresa') };
        }),`;
    logJs = logJs.replace(oldPayloadLicencas, newPayloadLicencas);

    fs.writeFileSync(logJsPath, logJs, 'utf8');
    console.log("Updated credenciamento.js logic.");
}

syncLogisticsModalLayout();