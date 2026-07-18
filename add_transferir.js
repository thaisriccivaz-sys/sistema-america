const fs = require('fs');
const path = require('path');

const estoqueJsPath = path.join(__dirname, 'frontend', 'estoque.js');
let content = fs.readFileSync(estoqueJsPath, 'utf8');

// Verify if the function truly exists
const fnExists = content.includes('window.abrirModalTransferirEstoque =');
console.log('Funcao existe no arquivo:', fnExists);

if (!fnExists) {
    const insertAfterAnchor = '// Preview de foto';
    const transferFunction = `// Transferir estoque entre enderecos
window.abrirModalTransferirEstoque = async function(itemId) {
    const item = window._estoqueCache[itemId];
    if (!item) { Swal.fire('Erro', 'Item nao encontrado. Recarregue a tabela.', 'error'); return; }

    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');

    let saldos = [];
    try {
        const sr = await fetch(API_URL + '/estoque/' + itemId + '/saldo-enderecos', { headers: { 'Authorization': 'Bearer ' + token } });
        if (sr.ok) saldos = await sr.json();
    } catch(e) { console.error('[transf] saldos:', e); }

    if (!window._estoqueEnderecos || window._estoqueEnderecos.length === 0) {
        try {
            const re = await fetch(API_URL + '/estoque-enderecos', { headers: { 'Authorization': 'Bearer ' + token } });
            if (re.ok) window._estoqueEnderecos = await re.json();
        } catch(e) { console.error('[transf] enderecos:', e); }
    }

    const saldosComQtd = saldos.filter(s => s.quantidade > 0);
    if (saldosComQtd.length === 0) {
        Swal.fire('Sem saldos', 'Este item nao possui saldo em nenhum endereco para transferir.', 'warning');
        return;
    }

    const origemOpts = saldosComQtd.map(s =>
        '<option value="' + s.endereco_id + '">' + s.endereco_nome + ' (' + s.quantidade + ' unid.)</option>'
    ).join('');

    const destinoOpts = (window._estoqueEnderecos || []).map(e =>
        '<option value="' + e.id + '">' + e.nome + '</option>'
    ).join('');

    const { value: vals, isConfirmed } = await Swal.fire({
        title: '<b><i class="ph ph-arrows-left-right" style="color:#1d4ed8"></i> Transferir Estoque</b>',
        html: '<div style="text-align:left;">' +
            '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;margin-bottom:16px;">' +
                '<strong style="color:#1e40af;">' + item.nome + '</strong>' +
                '<span style="color:#64748b;font-size:0.85rem;display:block;">Estoque total: ' + item.quantidade_atual + ' unid.</span>' +
            '</div>' +
            '<div style="margin-bottom:12px;">' +
                '<label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">De (Origem) *</label>' +
                '<select id="swal-transf-origem" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">' +
                    '<option value="">selecione a origem</option>' + origemOpts +
                '</select>' +
            '</div>' +
            '<div style="margin-bottom:12px;">' +
                '<label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Para (Destino) *</label>' +
                '<select id="swal-transf-destino" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">' +
                    '<option value="">selecione o destino</option>' + destinoOpts +
                '</select>' +
            '</div>' +
            '<div style="margin-bottom:12px;">' +
                '<label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Quantidade *</label>' +
                '<input type="number" id="swal-transf-qtd" min="1" value="1" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.95rem;">' +
            '</div>' +
            '<div>' +
                '<label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Motivo (opcional)</label>' +
                '<input type="text" id="swal-transf-motivo" placeholder="Ex: Reposicao de setor, Redistribuicao..." style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">' +
            '</div>' +
        '</div>',
        showCancelButton: true,
        confirmButtonText: 'Confirmar Transferencia',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#1d4ed8',
        preConfirm: () => {
            const origemId = document.getElementById('swal-transf-origem').value;
            const destinoId = document.getElementById('swal-transf-destino').value;
            const qtd = parseInt(document.getElementById('swal-transf-qtd').value);
            const motivo = document.getElementById('swal-transf-motivo').value.trim();
            if (!origemId) { Swal.showValidationMessage('Selecione o endereco de origem'); return false; }
            if (!destinoId) { Swal.showValidationMessage('Selecione o endereco de destino'); return false; }
            if (String(origemId) === String(destinoId)) { Swal.showValidationMessage('Origem e destino nao podem ser iguais'); return false; }
            if (!qtd || qtd <= 0) { Swal.showValidationMessage('Informe uma quantidade valida'); return false; }
            return { origemId, destinoId, quantidade: qtd, motivo };
        }
    });
    if (!isConfirmed || !vals) return;

    try {
        const res = await fetch(API_URL + '/estoque/' + itemId + '/transferir', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origem_id: parseInt(vals.origemId),
                destino_id: parseInt(vals.destinoId),
                quantidade: vals.quantidade,
                motivo: vals.motivo || 'Transferencia entre enderecos'
            })
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro ao transferir'); }
        const result = await res.json();
        Swal.fire({
            icon: 'success',
            title: 'Transferencia realizada!',
            html: '<span style="color:#64748b;">De: <strong>' + result.de + '</strong><br>Para: <strong>' + result.para + '</strong><br>Quantidade: <strong>' + result.quantidade + ' unid.</strong></span>',
            timer: 2200,
            showConfirmButton: false
        });
        window.renderEstoqueTable();
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};

`;

    content = content.replace(insertAfterAnchor, transferFunction + insertAfterAnchor);
    fs.writeFileSync(estoqueJsPath, content, 'utf8');
    console.log('OK: funcao de transferencia adicionada');
} else {
    console.log('Funcao ja existe no arquivo, nada a fazer');
}

try {
    new Function(content);
    console.log('SINTAXE VALIDA!');
} catch(e) {
    console.error('ERRO DE SINTAXE:', e.message);
}
