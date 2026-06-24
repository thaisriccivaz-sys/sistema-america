// frontend/end-produto.js
// Tela de Gerenciamento de Endereços de Produto (End. Prod.)

window.renderEndProdutoTable = async function() {
    const tbody = document.getElementById('table-end-produto');
    if (!tbody) return;
    try {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#64748b;">Carregando...</td></tr>';
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const r = await fetch(API_URL + '/estoque-enderecos', { headers: { 'Authorization': 'Bearer ' + token } });
        if (!r.ok) throw new Error('Erro ao buscar endereços');
        const data = await r.json();
        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#64748b;">Nenhum endereço cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(end => {
            const tipoBadge = end.tipo_notificacao === 'compra'
                ? '<span style="background:#fff3e6;color:#e67700;border:1px solid #fed7aa;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-shopping-cart-simple"></i> Pedido de Compra</span>'
                : end.tipo_notificacao === 'reposicao'
                ? '<span style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-arrows-left-right"></i> Pedido de Reposição</span>'
                : '<span style="background:#f1f5f9;color:#94a3b8;border-radius:20px;padding:2px 10px;font-size:0.75rem;">Sem notificação</span>';
            return '<tr>' +
                '<td style="font-weight:600;display:flex;align-items:center;gap:8px;"><i class="ph ph-map-pin" style="color:#1d4ed8;"></i>' + end.nome + '</td>' +
                '<td>' + tipoBadge + '</td>' +
                '<td style="color:#64748b;font-size:0.83rem;">' + (end.criado_em ? new Date(end.criado_em).toLocaleDateString('pt-BR') : '—') + '</td>' +
                '<td style="text-align:right;white-space:nowrap;">' +
                    '<button class="btn btn-sm btn-secondary" onclick="window.abrirModalEditarEndProduto(' + JSON.stringify(JSON.stringify(end)).replace(/"/g,'&quot;') + ')" style="margin-right:4px;"><i class="ph ph-pencil-simple"></i></button>' +
                    '<button class="btn btn-sm" onclick="window.excluirEndProduto(' + end.id + ')" style="background:#fee2e2;color:#ef4444;border:none;"><i class="ph ph-trash"></i></button>' +
                '</td>' +
            '</tr>';
        }).join('');
    } catch(e) {
        const tbody = document.getElementById('table-end-produto');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="color:#ef4444;text-align:center;">' + e.message + '</td></tr>';
    }
};

window.abrirModalEndProduto = async function() {
    const { value: vals, isConfirmed } = await Swal.fire({
        title: '<b><i class="ph ph-map-pin" style="color:#1d4ed8"></i> Novo Endereço</b>',
        html: _htmlFormEndProduto(null),
        showCancelButton: true,
        confirmButtonText: 'Criar Endereço',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#1d4ed8',
        focusConfirm: false,
        preConfirm: () => {
            const nome = document.getElementById('swal-end-nome').value.trim();
            const tipo = document.getElementById('swal-end-tipo').value;
            if (!nome) { Swal.showValidationMessage('Informe o nome do endereço'); return false; }
            return { nome, tipo_notificacao: tipo };
        }
    });
    if (!isConfirmed || !vals) return;
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        const res = await fetch(API_URL + '/estoque-enderecos', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(vals)
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erro'); }
        // Salvar tipo_notificacao no PUT logo após criar (POST não suporta tipo ainda)
        const novo = await res.json();
        if (vals.tipo_notificacao) {
            await fetch(API_URL + '/estoque-enderecos/' + novo.id, {
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: vals.nome, tipo_notificacao: vals.tipo_notificacao })
            });
        }
        Swal.fire({ icon: 'success', title: 'Endereço criado!', timer: 1400, showConfirmButton: false });
        window.renderEndProdutoTable();
        // Atualizar cache de endereços no estoque
        window._estoqueEnderecos = window._estoqueEnderecos || [];
        window._estoqueEnderecos.push(novo);
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};

window.abrirModalEditarEndProduto = async function(endJson) {
    const end = typeof endJson === 'string' ? JSON.parse(endJson) : endJson;
    const { value: vals, isConfirmed } = await Swal.fire({
        title: '<b><i class="ph ph-pencil-simple" style="color:#1d4ed8"></i> Editar Endereço</b>',
        html: _htmlFormEndProduto(end),
        showCancelButton: true,
        confirmButtonText: 'Salvar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#1d4ed8',
        focusConfirm: false,
        preConfirm: () => {
            const nome = document.getElementById('swal-end-nome').value.trim();
            const tipo = document.getElementById('swal-end-tipo').value;
            if (!nome) { Swal.showValidationMessage('Informe o nome do endereço'); return false; }
            return { nome, tipo_notificacao: tipo };
        }
    });
    if (!isConfirmed || !vals) return;
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        const res = await fetch(API_URL + '/estoque-enderecos/' + end.id, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(vals)
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erro'); }
        Swal.fire({ icon: 'success', title: 'Endereço atualizado!', timer: 1400, showConfirmButton: false });
        window.renderEndProdutoTable();
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};

window.excluirEndProduto = async function(id) {
    const ok = await Swal.fire({ title: 'Excluir endereço?', text: 'Os saldos vinculados serão removidos.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Excluir' });
    if (!ok.isConfirmed) return;
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        const r = await fetch(API_URL + '/estoque-enderecos/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Erro'); }
        window.renderEndProdutoTable();
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};

function _htmlFormEndProduto(end) {
    const nome = end ? end.nome : '';
    const tipo = end ? (end.tipo_notificacao || '') : '';
    return '<div style="text-align:left;margin-top:8px;">' +
        '<div style="margin-bottom:14px;">' +
            '<label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:5px;">Nome do Endereço *</label>' +
            '<input id="swal-end-nome" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;" placeholder="Ex: Depósito Central, Prateleira A3..." value="' + nome + '">' +
        '</div>' +
        '<div>' +
            '<label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:5px;"><i class="ph ph-bell-ringing" style="color:#e67700;"></i> Tipo de Notificação ao atingir estoque mínimo</label>' +
            '<select id="swal-end-tipo" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;background:#fff;">' +
                '<option value=""' + (!tipo ? ' selected' : '') + '>🔕 Sem notificação automática</option>' +
                '<option value="compra"' + (tipo === 'compra' ? ' selected' : '') + '>🛒 Pedido de Compra — notifica grupo &quot;Estoque mínimo para compra&quot;</option>' +
                '<option value="reposicao"' + (tipo === 'reposicao' ? ' selected' : '') + '>🔄 Pedido de Reposição — notifica grupo &quot;Mínimo para reposição de estoque&quot;</option>' +
            '</select>' +
            '<p style="font-size:0.78rem;color:#94a3b8;margin-top:6px;line-height:1.4;">' +
                '<strong>Compra:</strong> indica que o produto está acabando e deve ser comprado.<br>' +
                '<strong>Reposição:</strong> indica que o produto deve ser transferido de um endereço maior para este.' +
            '</p>' +
        '</div>' +
    '</div>';
}

// Hook de navegação
const _origNavEnd = window.navigateTo;
window.navigateTo = function(targetId) {
    if (_origNavEnd) _origNavEnd.apply(this, arguments);
    if (targetId === 'end-produto') window.renderEndProdutoTable();
};
