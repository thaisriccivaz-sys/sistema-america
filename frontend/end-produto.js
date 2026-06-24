// frontend/end-produto.js
// Tela de Gerenciamento de Endereços de Produto (End. Prod.)

window.renderEndProdutoTable = async function() {
    const tbody = document.getElementById('table-end-produto');
    if (!tbody) return;
    try {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#64748b;">Carregando...</td></tr>';
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const [r, rDepts] = await Promise.all([
            fetch(API_URL + '/estoque-enderecos', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(API_URL + '/departamentos', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);
        if (!r.ok) throw new Error('Erro ao buscar endereços');
        const data = await r.json();
        let departamentos = [];
        if (rDepts.ok) departamentos = await rDepts.json();

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
            
            let deptNames = '—';
            if (end.departamentos_vinculados) {
                try {
                    let vinculados = typeof end.departamentos_vinculados === 'string' ? JSON.parse(end.departamentos_vinculados) : end.departamentos_vinculados;
                    if (Array.isArray(vinculados) && vinculados.length > 0) {
                        const nomes = vinculados.map(v => {
                            const d = departamentos.find(x => String(x.id) === String(v));
                            return d ? d.nome : v;
                        });
                        deptNames = nomes.join(', ');
                    }
                } catch(e) {}
            }

            return '<tr>' +
                '<td style="font-weight:600;display:flex;align-items:center;gap:8px;"><i class="ph ph-map-pin" style="color:#1d4ed8;"></i>' + end.nome + '</td>' +
                '<td>' + tipoBadge + '</td>' +
                '<td style="color:#64748b;font-size:0.83rem;">' + deptNames + '</td>' +
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
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    let departamentos = [];
    try {
        const rDepts = await fetch(API_URL + '/departamentos', { headers: { 'Authorization': 'Bearer ' + token } });
        if (rDepts.ok) departamentos = await rDepts.json();
    } catch(e) {}

    const { value: vals, isConfirmed } = await Swal.fire({
        title: '<b><i class="ph ph-map-pin" style="color:#1d4ed8"></i> Novo Endereço</b>',
        html: _htmlFormEndProduto(null, departamentos),
        showCancelButton: true,
        confirmButtonText: 'Criar Endereço',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#1d4ed8',
        focusConfirm: false,
        preConfirm: () => {
            const nome = document.getElementById('swal-end-nome').value.trim();
            const tipo = document.getElementById('swal-end-tipo').value;
            const checkboxes = document.querySelectorAll('input[name="swal-end-depts-chk"]:checked');
            const departamentos_vinculados = Array.from(checkboxes).map(chk => chk.value);
            if (!nome) { Swal.showValidationMessage('Informe o nome do endereço'); return false; }
            return { nome, tipo_notificacao: tipo, departamentos_vinculados };
        }
    });
    if (!isConfirmed || !vals) return;
    try {
        const res = await fetch(API_URL + '/estoque-enderecos', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(vals)
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erro'); }
        // Salvar tipo_notificacao e departamentos no PUT logo após criar (POST não suporta tipo ainda)
        const novo = await res.json();
        if (vals.tipo_notificacao || vals.departamentos_vinculados) {
            await fetch(API_URL + '/estoque-enderecos/' + novo.id, {
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: vals.nome, tipo_notificacao: vals.tipo_notificacao, departamentos_vinculados: vals.departamentos_vinculados })
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
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    let departamentos = [];
    try {
        const rDepts = await fetch(API_URL + '/departamentos', { headers: { 'Authorization': 'Bearer ' + token } });
        if (rDepts.ok) departamentos = await rDepts.json();
    } catch(e) {}

    const { value: vals, isConfirmed } = await Swal.fire({
        title: '<b><i class="ph ph-pencil-simple" style="color:#1d4ed8"></i> Editar Endereço</b>',
        html: _htmlFormEndProduto(end, departamentos),
        showCancelButton: true,
        confirmButtonText: 'Salvar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#1d4ed8',
        focusConfirm: false,
        preConfirm: () => {
            const nome = document.getElementById('swal-end-nome').value.trim();
            const tipo = document.getElementById('swal-end-tipo').value;
            const checkboxes = document.querySelectorAll('input[name="swal-end-depts-chk"]:checked');
            const departamentos_vinculados = Array.from(checkboxes).map(chk => chk.value);
            if (!nome) { Swal.showValidationMessage('Informe o nome do endereço'); return false; }
            return { nome, tipo_notificacao: tipo, departamentos_vinculados };
        }
    });
    if (!isConfirmed || !vals) return;
    try {
        const res = await fetch(API_URL + '/estoque-enderecos/' + end.id, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(vals)
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erro'); }
        Swal.fire({ icon: 'success', title: 'Endereço atualizado!', timer: 1400, showConfirmButton: false });
        window._estoqueEnderecos = []; // clear cache
        if (typeof window.renderEstoqueTable === 'function') window.renderEstoqueTable();
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
        window._estoqueEnderecos = []; // clear cache
        if (typeof window.renderEstoqueTable === 'function') window.renderEstoqueTable();
        window.renderEndProdutoTable();
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};

function _htmlFormEndProduto(end, departamentos) {
    const nome = end ? end.nome : '';
    const tipo = end ? (end.tipo_notificacao || '') : '';
    
    let deptsVinculados = [];
    if (end && end.departamentos_vinculados) {
        try {
            deptsVinculados = typeof end.departamentos_vinculados === 'string' ? JSON.parse(end.departamentos_vinculados) : end.departamentos_vinculados;
        } catch(e) {}
    }

    let optionsDepts = '<div style="max-height:120px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:8px; background:#f8fafc; margin-top:4px;">';
    (departamentos || []).forEach(d => {
        const isSelected = deptsVinculados.includes(String(d.id)) || deptsVinculados.includes(d.id);
        optionsDepts += '<label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; cursor:pointer; font-size:0.85rem; color:#334155;">' +
                        '<input type="checkbox" name="swal-end-depts-chk" value="' + d.id + '"' + (isSelected ? ' checked' : '') + ' style="cursor:pointer; width:16px; height:16px;">' +
                        d.nome + '</label>';
    });
    if (!departamentos || departamentos.length === 0) optionsDepts += '<span style="color:#94a3b8;font-size:0.8rem;">Nenhum departamento cadastrado.</span>';
    optionsDepts += '</div>';

    return '<div style="text-align:left;margin-top:8px;">' +
        '<div style="margin-bottom:14px;">' +
            '<label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:5px;">Nome do Endereço *</label>' +
            '<input id="swal-end-nome" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;" placeholder="Ex: Depósito Central, Prateleira A3..." value="' + nome + '">' +
        '</div>' +
        '<div style="margin-bottom:14px;">' +
            '<label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:5px;">Departamentos Vinculados</label>' +
            optionsDepts +
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
