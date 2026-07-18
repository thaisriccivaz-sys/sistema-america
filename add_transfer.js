const fs = require('fs');

// 1. Modificar index.html para adicionar o botão Transferir
let html = fs.readFileSync('frontend/index.html', 'utf8');
const oldBtnAdd = `<button type="button" onclick="window._adicionarLinhaEndereco()" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:4px 12px;font-size:0.8rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;">
                                        <i class="ph ph-plus"></i> Adicionar Endereço
                                    </button>`;
const newBtns = `<div style="display:flex; gap:8px;">
                                        <button type="button" id="btn-transferir-modal" onclick="window._transferirLocal()" style="display:none; background:#fefce8;color:#a16207;border:1px solid #fef08a;border-radius:6px;padding:4px 12px;font-size:0.8rem;font-weight:600;cursor:pointer;align-items:center;gap:4px;">
                                            <i class="ph ph-arrows-left-right"></i> Transferir
                                        </button>
                                        <button type="button" onclick="window._adicionarLinhaEndereco()" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:4px 12px;font-size:0.8rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;">
                                            <i class="ph ph-plus"></i> Adicionar Endereço
                                        </button>
                                    </div>`;

if (html.includes(oldBtnAdd)) {
    html = html.replace(oldBtnAdd, newBtns);
    fs.writeFileSync('frontend/index.html', html, 'utf8');
    console.log('index.html atualizado');
} else {
    console.log('Não achei o botão em index.html');
}

// 2. Modificar estoque.js
let js = fs.readFileSync('frontend/estoque.js', 'utf8');
const oldRender = `    if (vazio) vazio.style.display = 'none';
    lista.innerHTML = linhas.map((linha, idx) => {`;
const newRender = `    if (vazio) vazio.style.display = 'none';
    
    const btnTransferir = document.getElementById('btn-transferir-modal');
    if (btnTransferir) {
        const validos = linhas.filter(l => l.endereco_id);
        btnTransferir.style.display = validos.length > 1 ? 'flex' : 'none';
    }

    lista.innerHTML = linhas.map((linha, idx) => {`;

if (js.includes(oldRender)) {
    js = js.replace(oldRender, newRender);
}

const funcTransfer = `
window._transferirLocal = async function() {
    const validos = window._enderecoLinhas.filter(l => l.endereco_id);
    if (validos.length < 2) return;

    const options = validos.map(l => {
        const end = window._estoqueEnderecos.find(e => e.id == l.endereco_id);
        return '<option value="' + l.endereco_id + '">' + (end ? end.nome : 'Endereço ' + l.endereco_id) + ' (Qtd Atual: ' + (l.quantidade||0) + ')</option>';
    }).join('');

    const { value: vals, isConfirmed } = await Swal.fire({
        title: '<i class="ph ph-arrows-left-right" style="color:#a16207"></i> Transferir entre Endereços',
        html: '<div style="text-align:left;">' +
              '<p style="font-size:0.85rem;color:#64748b;margin-top:0;">Esta transferência será efetivada quando você salvar o item.</p>' +
              '<label style="font-size:0.85rem;font-weight:600;">Origem (Retirar de) *</label>' +
              '<select id="swal-loc-origem" class="swal2-input" style="width:100%;margin:5px 0 15px;font-size:0.9rem;"><option value="">Selecione...</option>' + options + '</select>' +
              '<label style="font-size:0.85rem;font-weight:600;">Destino (Enviar para) *</label>' +
              '<select id="swal-loc-destino" class="swal2-input" style="width:100%;margin:5px 0 15px;font-size:0.9rem;"><option value="">Selecione...</option>' + options + '</select>' +
              '<label style="font-size:0.85rem;font-weight:600;">Quantidade *</label>' +
              '<input type="number" id="swal-loc-qtd" min="1" value="1" class="swal2-input" style="width:100%;margin:5px 0 0;">' +
              '</div>',
        showCancelButton: true,
        confirmButtonText: 'Aplicar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e67700',
        preConfirm: () => {
            const origem = document.getElementById('swal-loc-origem').value;
            const destino = document.getElementById('swal-loc-destino').value;
            const qtd = parseInt(document.getElementById('swal-loc-qtd').value);
            if (!origem || !destino) { Swal.showValidationMessage('Selecione origem e destino'); return false; }
            if (origem === destino) { Swal.showValidationMessage('Origem e destino não podem ser o mesmo'); return false; }
            if (!qtd || qtd <= 0) { Swal.showValidationMessage('Quantidade inválida'); return false; }
            
            const linhaOrigem = window._enderecoLinhas.find(l => l.endereco_id == origem);
            if ((linhaOrigem.quantidade||0) < qtd) { Swal.showValidationMessage('Saldo insuficiente na origem. Saldo atual: ' + (linhaOrigem.quantidade||0)); return false; }
            
            return { origem, destino, qtd };
        }
    });

    if (isConfirmed && vals) {
        const o = window._enderecoLinhas.find(l => l.endereco_id == vals.origem);
        const d = window._enderecoLinhas.find(l => l.endereco_id == vals.destino);
        o.quantidade = (o.quantidade || 0) - vals.qtd;
        d.quantidade = (d.quantidade || 0) + vals.qtd;
        window._renderLinhasEndereco();
    }
};
`;

if (!js.includes('window._transferirLocal')) {
    js += '\\n' + funcTransfer;
    fs.writeFileSync('frontend/estoque.js', js, 'utf8');
    console.log('estoque.js atualizado');
}
