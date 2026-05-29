// frontend/estoque.js

window.renderEstoqueTable = async function() {
    const table = document.getElementById('table-estoque');
    if (!table) return;

    try {
        table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;">Carregando...</td></tr>';
        
        const dept = document.getElementById('filtro-estoque-dept').value;
        const cat = document.getElementById('filtro-estoque-cat').value;
        const status = document.getElementById('filtro-estoque-status')?.value || '';
        const nomeFilter = document.getElementById('filtro-estoque-nome').value.toLowerCase();
        
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        let url = `${API_URL}/estoque?`;
        if (dept) url += `departamento=${encodeURIComponent(dept)}&`;
        if (cat) url += `categoria=${encodeURIComponent(cat)}&`;
        
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});
        if (!response.ok) throw new Error('Erro ao buscar estoque');
        
        let data = await response.json();
        
        if (nomeFilter) {
            data = data.filter(item => item.nome.toLowerCase().includes(nomeFilter));
        }
        
        if (status === 'minimo') {
            data = data.filter(item => item.quantidade_atual <= item.quantidade_minima);
        }
        
        if (data.length === 0) {
            table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;">Nenhum item encontrado.</td></tr>';
            return;
        }

        table.innerHTML = data.map(item => {
            const isLow = item.quantidade_atual <= item.quantidade_minima;
            return `
                <tr style="${isLow ? 'background:#fff5f5;' : ''}">
                    <td style="font-weight:500; display: flex; align-items: center; gap: 12px;">
                        ${(item.foto_url || item.foto_base64)
                            ? `<img src="${item.foto_url || item.foto_base64}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; flex-shrink: 0;">` 
                            : `<div style="width: 40px; height: 40px; border-radius: 8px; background: #f1f5f9; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><i class="ph ph-image" style="color: #94a3b8; font-size: 1.2rem;"></i></div>`
                        }
                        <div>
                            ${isLow ? '<i class="ph ph-warning-circle" style="color:#ef4444; margin-right:4px;" title="Estoque Mínimo Atingido"></i>' : ''}
                            ${item.nome}
                        </div>
                    </td>
                    <td><span class="badge" style="background:#f1f5f9; color:#475569;">${item.departamento}</span></td>
                    <td>${item.categoria}</td>
                    <td style="font-weight:bold; color:${isLow ? '#ef4444' : '#10b981'};">
                        ${item.quantidade_atual}
                    </td>
                    <td style="color:#64748b; font-size:0.85rem;">
                        Min: ${item.quantidade_minima} | Máx: ${item.quantidade_maxima}
                    </td>
                    <td style="text-align:right; white-space:nowrap;">
                        <button class="btn btn-sm" onclick="window.ajustarEstoqueRápido(${item.id}, ${item.quantidade_atual}, -1)" title="Diminuir" style="background:#f1f5f9; border:1px solid #cbd5e1; color:#475569; padding:4px 8px; border-radius:4px;"><i class="ph ph-minus"></i></button>
                        <button class="btn btn-sm" onclick="window.ajustarEstoqueRápido(${item.id}, ${item.quantidade_atual}, 1)" title="Aumentar" style="background:#f1f5f9; border:1px solid #cbd5e1; color:#475569; padding:4px 8px; border-radius:4px;"><i class="ph ph-plus"></i></button>
                        <button class="btn btn-sm btn-secondary" onclick='window.editarEstoque(${JSON.stringify(item).replace(/'/g, "&#39;")})' style="margin-left:8px;"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn btn-sm" onclick="window.excluirEstoque(${item.id})" style="background:#fee2e2; color:#ef4444; border:none; margin-left:4px;"><i class="ph ph-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error(e);
        table.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ef4444;">${e.message}</td></tr>`;
    }
}

window.abrirModalEstoque = function() {
    document.getElementById('form-estoque').reset();
    document.getElementById('estoque-id').value = '';
    
    // Limpar foto
    const fileInput = document.getElementById('estoque-foto');
    if (fileInput) fileInput.value = '';
    document.getElementById('estoque-foto-base64').value = '';
    document.getElementById('estoque-foto-preview').src = '';
    document.getElementById('estoque-foto-preview').style.display = 'none';
    document.getElementById('estoque-foto-icon').style.display = 'block';

    document.getElementById('modal-estoque-title').innerHTML = '<i class="ph ph-package"></i> Adicionar Item de Estoque';
    document.getElementById('modal-estoque').style.display = 'flex';
}

window.fecharModalEstoque = function() {
    document.getElementById('modal-estoque').style.display = 'none';
}

window.editarEstoque = function(item) {
    document.getElementById('estoque-id').value = item.id;
    document.getElementById('estoque-nome').value = item.nome;
    document.getElementById('estoque-dept').value = item.departamento;
    document.getElementById('estoque-cat').value = item.categoria;
    document.getElementById('estoque-qtd').value = item.quantidade_atual;
    document.getElementById('estoque-min').value = item.quantidade_minima;
    document.getElementById('estoque-max').value = item.quantidade_maxima;
    
    // Mostrar foto — prioridade: foto_url (R2) > foto_base64 (legado)
    const fileInput = document.getElementById('estoque-foto');
    if (fileInput) fileInput.value = '';
    document.getElementById('estoque-foto-base64').value = '';
    const fotoSrc = item.foto_url || item.foto_base64 || '';
    if (fotoSrc) {
        document.getElementById('estoque-foto-preview').src = fotoSrc;
        document.getElementById('estoque-foto-preview').style.display = 'block';
        document.getElementById('estoque-foto-icon').style.display = 'none';
    } else {
        document.getElementById('estoque-foto-preview').src = '';
        document.getElementById('estoque-foto-preview').style.display = 'none';
        document.getElementById('estoque-foto-icon').style.display = 'block';
    }
    
    document.getElementById('modal-estoque-title').innerHTML = '<i class="ph ph-pencil-simple"></i> Editar Item de Estoque';
    document.getElementById('modal-estoque').style.display = 'flex';
}

window.salvarEstoque = async function(e) {
    e.preventDefault();
    const id = document.getElementById('estoque-id').value;
    const data = {
        nome: document.getElementById('estoque-nome').value,
        departamento: document.getElementById('estoque-dept').value,
        categoria: document.getElementById('estoque-cat').value,
        quantidade_atual: parseInt(document.getElementById('estoque-qtd').value) || 0,
        quantidade_minima: parseInt(document.getElementById('estoque-min').value) || 0,
        quantidade_maxima: parseInt(document.getElementById('estoque-max').value) || 0,
        foto_base64: document.getElementById('estoque-foto-base64').value
    };

    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    const url = id ? `${API_URL}/estoque/${id}` : `${API_URL}/estoque`;
    const method = id ? 'PUT' : 'POST';

    try {
        const btn = document.getElementById('btn-salvar-estoque');
        const origText = btn.innerHTML;
        btn.innerHTML = 'Salvando...';
        btn.disabled = true;

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Erro ao salvar');
        }

        Swal.fire({ icon: 'success', title: 'Sucesso', text: 'Item salvo com sucesso', timer: 1500, showConfirmButton: false });
        window.fecharModalEstoque();
        window.renderEstoqueTable();
    } catch (err) {
        Swal.fire('Erro', err.message, 'error');
    } finally {
        const btn = document.getElementById('btn-salvar-estoque');
        btn.innerHTML = 'Salvar Item';
        btn.disabled = false;
    }
}

window.ajustarEstoqueRápido = async function(id, qtdAtual, variacao) {
    const novaQtd = qtdAtual + variacao;
    if (novaQtd < 0) return Swal.fire('Atenção', 'A quantidade não pode ser menor que zero.', 'warning');
    
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    
    try {
        // Buscar item completo primeiro
        const res = await fetch(`${API_URL}/estoque`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (!res.ok) throw new Error();
        const itens = await res.json();
        const item = itens.find(i => i.id === id);
        if (!item) throw new Error('Item não encontrado');
        
        // Enviar apenas campos de dados — NÃO enviar foto_base64 (pode ser gigante)
        // foto_url será preservada pelo backend pois não chegará nova foto_base64
        const updateRes = await fetch(`${API_URL}/estoque/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: item.nome,
                departamento: item.departamento,
                categoria: item.categoria,
                quantidade_atual: novaQtd,
                quantidade_minima: item.quantidade_minima,
                quantidade_maxima: item.quantidade_maxima
                // sem foto_base64: o backend preserva foto_url e foto_base64 existentes
            })
        });
        
        if (!updateRes.ok) throw new Error('Erro ao atualizar');
        
        window.renderEstoqueTable();
    } catch(e) {
        Swal.fire('Erro', 'Não foi possível atualizar a quantidade.', 'error');
    }
}

window.excluirEstoque = async function(id) {
    const confirm = await Swal.fire({
        title: 'Excluir item?',
        text: 'Esta ação não pode ser desfeita.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sim, excluir'
    });

    if (confirm.isConfirmed) {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/estoque/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Erro ao excluir');
            window.renderEstoqueTable();
        } catch (err) {
            Swal.fire('Erro', err.message, 'error');
        }
    }
}

// Hook navigation
const origNavForEstoque = window.navigateTo;
window.navigateTo = function(targetId) {
    if (origNavForEstoque) origNavForEstoque.apply(this, arguments);
    if (targetId === 'estoque') {
        window.renderEstoqueTable();
    }
};

window.previewEstoqueFoto = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('estoque-foto-base64').value = e.target.result;
            document.getElementById('estoque-foto-preview').src = e.target.result;
            document.getElementById('estoque-foto-preview').style.display = 'block';
            document.getElementById('estoque-foto-icon').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
};

// Funções de aba
window.switchTabEstoque = function(tab) {
    document.getElementById('content-estoque-itens').style.display = tab === 'itens' ? 'block' : 'none';
    document.getElementById('content-estoque-historico').style.display = tab === 'historico' ? 'block' : 'none';
    
    document.getElementById('tab-estoque-itens').style.color = tab === 'itens' ? '#e67700' : '#64748b';
    document.getElementById('tab-estoque-itens').style.borderColor = tab === 'itens' ? '#e67700' : 'transparent';
    document.getElementById('tab-estoque-itens').style.fontWeight = tab === 'itens' ? '700' : '600';
    
    document.getElementById('tab-estoque-historico').style.color = tab === 'historico' ? '#e67700' : '#64748b';
    document.getElementById('tab-estoque-historico').style.borderColor = tab === 'historico' ? '#e67700' : 'transparent';
    document.getElementById('tab-estoque-historico').style.fontWeight = tab === 'historico' ? '700' : '600';

    if (tab === 'historico') {
        window.renderEstoqueHistorico();
    }
};

window.renderEstoqueHistorico = async function() {
    const table = document.getElementById('table-estoque-historico');
    if (!table) return;

    try {
        table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;">Carregando histórico...</td></tr>';
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/estoque/historico`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (!response.ok) throw new Error('Erro ao buscar histórico');
        
        const data = await response.json();
        
        if (data.length === 0) {
            table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;">Nenhuma movimentação registrada.</td></tr>';
            return;
        }

        table.innerHTML = '';
        data.forEach(h => {
            const tr = document.createElement('tr');
            
            // Format datetime
            let rawDate = h.data_hora || '';
            if (rawDate && !rawDate.includes('T')) rawDate = rawDate.replace(' ', 'T') + 'Z';
            const dt = new Date(rawDate);
            const dataStr = dt.toLocaleDateString('pt-BR');
            const horaStr = dt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            
            // Tipo styling
            const tipoColor = h.tipo === 'Entrada' ? '#16a34a' : (h.tipo === 'Saída' ? '#ef4444' : '#eab308');
            const tipoBg = h.tipo === 'Entrada' ? '#f0fdf4' : (h.tipo === 'Saída' ? '#fef2f2' : '#fefce8');

            tr.innerHTML = `
                <td><div style="font-weight:500;">${dataStr}</div><div style="font-size:0.8em;color:#64748b;">${horaStr}</div></td>
                <td><div style="font-weight:600;color:#1e293b;">${h.estoque_nome}</div><div style="font-size:0.8em;color:#64748b;">${h.estoque_departamento}</div></td>
                <td><span style="background:${tipoBg}; color:${tipoColor}; padding:2px 8px; border-radius:12px; font-size:0.8em; font-weight:600;">${h.tipo}</span></td>
                <td style="font-weight:700; color:${tipoColor};">${h.tipo === 'Saída' ? '-' : '+'}${h.quantidade}</td>
                <td>${h.usuario || '-'}</td>
                <td style="color:#475569; font-size:0.9em; max-width:200px;">${h.motivo || '-'}</td>
            `;
            table.appendChild(tr);
        });

    } catch (err) {
        table.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ef4444;">Erro ao carregar histórico: ${err.message}</td></tr>`;
    }
};
