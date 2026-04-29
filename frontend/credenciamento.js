// script de logística credenciamento

let credenciamentoState = {
    colaboradores: [], // lista completa buscada
    veiculos: [], // lista completa buscada
    selecionadosColabs: [], // ids
    selecionadosVeic: [] // ids
};

// Funções para carregar dados
async function loadColaboradoresCred() {
    try {
        const res = await fetch('/api/colaboradores', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
            credenciamentoState.colaboradores = await res.json();
            renderListaColabsCred();
        }
    } catch (e) {
        console.error("Erro ao carregar colaboradores credenciamento", e);
    }
}

async function loadVeiculosCred() {
    try {
        const res = await fetch('/api/frota/veiculos', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
            credenciamentoState.veiculos = await res.json();
            renderListaVeicCred();
        }
    } catch (e) {
        console.error("Erro ao carregar veículos credenciamento", e);
    }
}

function renderListaColabsCred() {
    const list = document.getElementById('lista-selecao-colab');
    list.innerHTML = credenciamentoState.colaboradores.filter(c => c.status === 'ativo').map(c => `
        <div class="cred-item-select" style="display:flex; align-items:center; gap: 10px; padding: 8px; border-bottom: 1px solid #eee;">
            <input type="checkbox" id="cred-colab-${c.id}" value="${c.id}" ${credenciamentoState.selecionadosColabs.includes(c.id.toString()) ? 'checked' : ''}>
            <label for="cred-colab-${c.id}" style="cursor:pointer; margin:0; flex:1;">${c.nome_completo}</label>
        </div>
    `).join('');
}

function renderListaVeicCred() {
    const list = document.getElementById('lista-selecao-veic');
    list.innerHTML = credenciamentoState.veiculos.map(v => `
        <div class="cred-item-select" style="display:flex; align-items:center; gap: 10px; padding: 8px; border-bottom: 1px solid #eee;">
            <input type="checkbox" id="cred-veic-${v.id}" value="${v.id}" ${credenciamentoState.selecionadosVeic.includes(v.id.toString()) ? 'checked' : ''}>
            <label for="cred-veic-${v.id}" style="cursor:pointer; margin:0; flex:1;"><b>${v.placa}</b> - ${v.marca_modelo_versao || 'Sem modelo'}</label>
        </div>
    `).join('');
}

function filtrarListaCred(containerId, termo) {
    const container = document.getElementById(containerId);
    const divs = container.querySelectorAll('.cred-item-select');
    const t = termo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    divs.forEach(div => {
        const text = div.querySelector('label').textContent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (text.includes(t)) {
            div.style.display = 'flex';
        } else {
            div.style.display = 'none';
        }
    });
}

function abrirModalAddCredColab() {
    document.getElementById('modal-cred-colab').style.display = 'flex';
    if (credenciamentoState.colaboradores.length === 0) loadColaboradoresCred();
    else renderListaColabsCred();
    document.getElementById('busca-cred-colab').value = '';
}

function fecharModalAddCredColab() {
    document.getElementById('modal-cred-colab').style.display = 'none';
}

function abrirModalAddCredVeic() {
    document.getElementById('modal-cred-veic').style.display = 'flex';
    if (credenciamentoState.veiculos.length === 0) loadVeiculosCred();
    else renderListaVeicCred();
    document.getElementById('busca-cred-veic').value = '';
}

function fecharModalAddCredVeic() {
    document.getElementById('modal-cred-veic').style.display = 'none';
}

function confirmarSelecaoCredColab() {
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]');
    credenciamentoState.selecionadosColabs = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    atualizarResumoColabs();
    fecharModalAddCredColab();
}

function confirmarSelecaoCredVeic() {
    const checkboxes = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]');
    credenciamentoState.selecionadosVeic = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    atualizarResumoVeiculos();
    fecharModalAddCredVeic();
}

function removerCredColab(idStr) {
    credenciamentoState.selecionadosColabs = credenciamentoState.selecionadosColabs.filter(id => id !== idStr);
    atualizarResumoColabs();
}

function removerCredVeic(idStr) {
    credenciamentoState.selecionadosVeic = credenciamentoState.selecionadosVeic.filter(id => id !== idStr);
    atualizarResumoVeiculos();
}

function atualizarResumoColabs() {
    const list = document.getElementById('cred-colabs-list');
    if (credenciamentoState.selecionadosColabs.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; font-size:13px; font-style:italic;">Nenhum colaborador selecionado.</p>';
        return;
    }
    
    let html = '';
    credenciamentoState.selecionadosColabs.forEach(idStr => {
        const c = credenciamentoState.colaboradores.find(col => col.id.toString() === idStr);
        if (c) {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:6px 10px; border-radius:4px; border:1px solid #e2e8f0;">
                    <span style="font-size:14px; font-weight:500; color:#334155;">${c.nome_completo}</span>
                    <i class="ph ph-trash" style="color:#ef4444; cursor:pointer;" onclick="removerCredColab('${idStr}')" title="Remover"></i>
                </div>
            `;
        }
    });
    list.innerHTML = html;
}

function atualizarResumoVeiculos() {
    const list = document.getElementById('cred-veiculos-list');
    if (credenciamentoState.selecionadosVeic.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; font-size:13px; font-style:italic;">Nenhum veículo selecionado.</p>';
        return;
    }
    
    let html = '';
    credenciamentoState.selecionadosVeic.forEach(idStr => {
        const v = credenciamentoState.veiculos.find(ve => ve.id.toString() === idStr);
        if (v) {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:6px 10px; border-radius:4px; border:1px solid #e2e8f0;">
                    <span style="font-size:14px; font-weight:500; color:#334155;"><b>${v.placa}</b> - ${v.marca_modelo_versao || ''}</span>
                    <i class="ph ph-trash" style="color:#ef4444; cursor:pointer;" onclick="removerCredVeic('${idStr}')" title="Remover"></i>
                </div>
            `;
        }
    });
    list.innerHTML = html;
}

async function gerarEnviarCredenciamento() {
    const clienteNome = document.getElementById('cred-cliente-nome').value.trim();
    const clienteEmail = document.getElementById('cred-cliente-email').value.trim();

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
            const c = credenciamentoState.colaboradores.find(col => col.id.toString() === idStr);
            return { id: parseInt(idStr), nome: c.nome_completo };
        }),
        veiculos: credenciamentoState.selecionadosVeic.map(idStr => {
            const v = credenciamentoState.veiculos.find(ve => ve.id.toString() === idStr);
            return { id: parseInt(idStr), placa: v.placa, modelo: v.marca_modelo_versao };
        })
    };

    const btn = document.getElementById('btn-enviar-cred');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
    btn.disabled = true;

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

        alert('Credenciamento gerado e enviado com sucesso!');
        
        // Limpar form
        document.getElementById('cred-cliente-nome').value = '';
        document.getElementById('cred-cliente-email').value = '';
        credenciamentoState.selecionadosColabs = [];
        credenciamentoState.selecionadosVeic = [];
        atualizarResumoColabs();
        atualizarResumoVeiculos();
        
    } catch (e) {
        alert('Erro: ' + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
