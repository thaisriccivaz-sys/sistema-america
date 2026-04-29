// Módulo de Credenciamento - Logística

let credenciamentoState = {
    colaboradores: [], // lista completa buscada
    veiculos: [],      // lista completa buscada
    selecionadosColabs: [], // ids (string)
    selecionadosVeic: []    // ids (string)
};

// ── Carregar colaboradores via API ───────────────────────────────────────────
async function loadColaboradoresCred() {
    const list = document.getElementById('lista-selecao-colab');
    if (list) list.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">Carregando...</p>';

    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Sem token de autenticação.');

        const res = await fetch('/api/colaboradores', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Erro ${res.status}`);

        const data = await res.json();
        // status pode ser 'Ativo' ou 'ativo' – comparação case-insensitive
        credenciamentoState.colaboradores = (data || []).filter(c =>
            (c.status || '').toLowerCase() === 'ativo'
        );
        renderListaColabsCred();
    } catch (e) {
        console.error('[Credenciamento] Erro ao carregar colaboradores:', e);
        if (list) list.innerHTML = `<p style="color:#ef4444; padding:10px;">Erro ao carregar: ${e.message}</p>`;
    }
}

// ── Carregar veículos via API ────────────────────────────────────────────────
async function loadVeiculosCred() {
    const list = document.getElementById('lista-selecao-veic');
    if (list) list.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">Carregando...</p>';

    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Sem token de autenticação.');

        const res = await fetch('/api/frota/veiculos', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Erro ${res.status}`);

        credenciamentoState.veiculos = await res.json() || [];
        renderListaVeicCred();
    } catch (e) {
        console.error('[Credenciamento] Erro ao carregar veículos:', e);
        if (list) list.innerHTML = `<p style="color:#ef4444; padding:10px;">Erro ao carregar: ${e.message}</p>`;
    }
}

// ── Renderizar lista de colaboradores no modal ────────────────────────────────
function renderListaColabsCred() {
    const list = document.getElementById('lista-selecao-colab');
    if (!list) return;

    if (credenciamentoState.colaboradores.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; font-size:13px; font-style:italic; padding:10px;">Nenhum colaborador ativo encontrado.</p>';
        return;
    }

    list.innerHTML = credenciamentoState.colaboradores.map(c => `
        <div class="cred-item-select" style="display:flex; align-items:center; gap: 10px; padding: 8px; border-bottom: 1px solid #eee;">
            <input type="checkbox" id="cred-colab-${c.id}" value="${c.id}"
                ${credenciamentoState.selecionadosColabs.includes(String(c.id)) ? 'checked' : ''}>
            <label for="cred-colab-${c.id}" style="cursor:pointer; margin:0; flex:1;">${c.nome_completo}</label>
        </div>
    `).join('');
}

// ── Renderizar lista de veículos no modal ────────────────────────────────────
function renderListaVeicCred() {
    const list = document.getElementById('lista-selecao-veic');
    if (!list) return;

    if (credenciamentoState.veiculos.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; font-size:13px; font-style:italic; padding:10px;">Nenhum veículo cadastrado na frota.</p>';
        return;
    }

    list.innerHTML = credenciamentoState.veiculos.map(v => `
        <div class="cred-item-select" style="display:flex; align-items:center; gap: 10px; padding: 8px; border-bottom: 1px solid #eee;">
            <input type="checkbox" id="cred-veic-${v.id}" value="${v.id}"
                ${credenciamentoState.selecionadosVeic.includes(String(v.id)) ? 'checked' : ''}>
            <label for="cred-veic-${v.id}" style="cursor:pointer; margin:0; flex:1;">
                <b>${v.placa}</b> — ${v.marca_modelo_versao || 'Sem modelo'}
            </label>
        </div>
    `).join('');
}

// ── Filtro de busca nos modais ────────────────────────────────────────────────
function filtrarListaCred(containerId, termo) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const divs = container.querySelectorAll('.cred-item-select');
    const t = termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    divs.forEach(div => {
        const label = div.querySelector('label');
        if (!label) return;
        const text = label.textContent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        div.style.display = text.includes(t) ? 'flex' : 'none';
    });
}

// ── Abrir / Fechar modais ─────────────────────────────────────────────────────
function abrirModalAddCredColab() {
    const modal = document.getElementById('modal-cred-colab');
    if (modal) modal.style.display = 'flex';

    // Sempre recarrega para garantir dados atualizados
    loadColaboradoresCred();

    const busca = document.getElementById('busca-cred-colab');
    if (busca) busca.value = '';
}

function fecharModalAddCredColab() {
    const modal = document.getElementById('modal-cred-colab');
    if (modal) modal.style.display = 'none';
}

function abrirModalAddCredVeic() {
    const modal = document.getElementById('modal-cred-veic');
    if (modal) modal.style.display = 'flex';

    // Sempre recarrega para garantir dados atualizados
    loadVeiculosCred();

    const busca = document.getElementById('busca-cred-veic');
    if (busca) busca.value = '';
}

function fecharModalAddCredVeic() {
    const modal = document.getElementById('modal-cred-veic');
    if (modal) modal.style.display = 'none';
}

// ── Confirmar seleção ─────────────────────────────────────────────────────────
function confirmarSelecaoCredColab() {
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]');
    credenciamentoState.selecionadosColabs = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    atualizarResumoColabs();
    fecharModalAddCredColab();
}

function confirmarSelecaoCredVeic() {
    const checkboxes = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]');
    credenciamentoState.selecionadosVeic = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    atualizarResumoVeiculos();
    fecharModalAddCredVeic();
}

// ── Remover item da seleção ───────────────────────────────────────────────────
function removerCredColab(idStr) {
    credenciamentoState.selecionadosColabs = credenciamentoState.selecionadosColabs.filter(id => id !== idStr);
    atualizarResumoColabs();
}

function removerCredVeic(idStr) {
    credenciamentoState.selecionadosVeic = credenciamentoState.selecionadosVeic.filter(id => id !== idStr);
    atualizarResumoVeiculos();
}

// ── Resumo de colaboradores selecionados ──────────────────────────────────────
function atualizarResumoColabs() {
    const list = document.getElementById('cred-colabs-list');
    if (!list) return;

    if (credenciamentoState.selecionadosColabs.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; font-size:13px; font-style:italic;">Nenhum colaborador selecionado.</p>';
        return;
    }

    list.innerHTML = credenciamentoState.selecionadosColabs.map(idStr => {
        const c = credenciamentoState.colaboradores.find(col => String(col.id) === idStr);
        if (!c) return '';
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:6px 10px; border-radius:4px; border:1px solid #e2e8f0;">
                <span style="font-size:14px; font-weight:500; color:#334155;">${c.nome_completo}</span>
                <i class="ph ph-trash" style="color:#ef4444; cursor:pointer;" onclick="removerCredColab('${idStr}')" title="Remover"></i>
            </div>
        `;
    }).join('');
}

// ── Resumo de veículos selecionados ───────────────────────────────────────────
function atualizarResumoVeiculos() {
    const list = document.getElementById('cred-veiculos-list');
    if (!list) return;

    if (credenciamentoState.selecionadosVeic.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; font-size:13px; font-style:italic;">Nenhum veículo selecionado.</p>';
        return;
    }

    list.innerHTML = credenciamentoState.selecionadosVeic.map(idStr => {
        const v = credenciamentoState.veiculos.find(ve => String(ve.id) === idStr);
        if (!v) return '';
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:6px 10px; border-radius:4px; border:1px solid #e2e8f0;">
                <span style="font-size:14px; font-weight:500; color:#334155;"><b>${v.placa}</b> — ${v.marca_modelo_versao || ''}</span>
                <i class="ph ph-trash" style="color:#ef4444; cursor:pointer;" onclick="removerCredVeic('${idStr}')" title="Remover"></i>
            </div>
        `;
    }).join('');
}

// ── Gerar e Enviar credenciamento ─────────────────────────────────────────────
async function gerarEnviarCredenciamento() {
    const clienteNome = (document.getElementById('cred-cliente-nome') || {}).value?.trim();
    const clienteEmail = (document.getElementById('cred-cliente-email') || {}).value?.trim();

    if (!clienteNome || !clienteEmail) {
        alert('Por favor, preencha o nome e e-mail do cliente.');
        return;
    }

    if (credenciamentoState.selecionadosColabs.length === 0 && credenciamentoState.selecionadosVeic.length === 0) {
        alert('Por favor, selecione ao menos um colaborador ou veículo para credenciar.');
        return;
    }

    const payload = {
        cliente_nome: clienteNome,
        cliente_email: clienteEmail,
        colaboradores: credenciamentoState.selecionadosColabs.map(idStr => {
            const c = credenciamentoState.colaboradores.find(col => String(col.id) === idStr);
            return { id: parseInt(idStr), nome: c ? c.nome_completo : idStr };
        }),
        veiculos: credenciamentoState.selecionadosVeic.map(idStr => {
            const v = credenciamentoState.veiculos.find(ve => String(ve.id) === idStr);
            return { id: parseInt(idStr), placa: v ? v.placa : idStr, modelo: v ? v.marca_modelo_versao : '' };
        })
    };

    const btn = document.getElementById('btn-enviar-cred');
    const originalHTML = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<i class="ph ph-spinner"></i> Enviando...'; btn.disabled = true; }

    try {
        const res = await fetch('/api/logistica/credenciamento', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao enviar credenciamento.');

        alert('✅ Credenciamento gerado e e-mail enviado com sucesso!');

        // Limpar formulário
        if (document.getElementById('cred-cliente-nome')) document.getElementById('cred-cliente-nome').value = '';
        if (document.getElementById('cred-cliente-email')) document.getElementById('cred-cliente-email').value = '';
        credenciamentoState.selecionadosColabs = [];
        credenciamentoState.selecionadosVeic = [];
        atualizarResumoColabs();
        atualizarResumoVeiculos();

    } catch (e) {
        alert('Erro: ' + e.message);
    } finally {
        if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; }
    }
}
