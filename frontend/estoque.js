// frontend/estoque.js

// ── Cache global de endereços ─────────────────────────────────────────────────
window._estoqueEnderecos = [];

async function _carregarEnderecos() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/estoque-enderecos`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) window._estoqueEnderecos = await res.json();
    } catch (e) { console.warn('[ESTOQUE] Erro ao carregar endereços:', e.message); }
}

function _popularSelectEndereco() {
    const sel = document.getElementById('estoque-endereco-select');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">— Nenhum —</option>' +
        window._estoqueEnderecos.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
    if (currentVal) sel.value = currentVal;
}

// ── Tabela principal ──────────────────────────────────────────────────────────
window.renderEstoqueTable = async function() {
    const table = document.getElementById('table-estoque');
    if (!table) return;
    try {
        table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;">Carregando...</td></tr>';
        const dept   = document.getElementById('filtro-estoque-dept').value;
        const cat    = document.getElementById('filtro-estoque-cat').value;
        const status = document.getElementById('filtro-estoque-status')?.value || '';
        const nome   = document.getElementById('filtro-estoque-nome').value.toLowerCase();
        const token  = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        let url = `${API_URL}/estoque?`;
        if (dept) url += `departamento=${encodeURIComponent(dept)}&`;
        if (cat)  url += `categoria=${encodeURIComponent(cat)}&`;

        const [r1, r2] = await Promise.all([
            fetch(url, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/estoque-saldos`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (!r1.ok) throw new Error('Erro ao buscar estoque');
        let data = await r1.json();
        const saldosMap = r2.ok ? await r2.json() : {};

        if (window._estoqueEnderecos.length === 0) await _carregarEnderecos();
        if (nome)              data = data.filter(i => i.nome.toLowerCase().includes(nome));
        if (status === 'minimo') data = data.filter(i => i.quantidade_atual <= i.quantidade_minima);

        if (data.length === 0) {
            table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;">Nenhum item encontrado.</td></tr>';
            return;
        }

        table.innerHTML = data.map(item => {
            const isLow  = item.quantidade_atual <= item.quantidade_minima;
            const saldos = saldosMap[item.id] || [];
            const badges = saldos.length > 0
                ? saldos.map(s =>
                    `<span style="display:inline-flex;align-items:center;gap:3px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:20px;padding:2px 8px;font-size:0.72rem;font-weight:600;white-space:nowrap;">` +
                    `<i class="ph ph-map-pin" style="font-size:0.75rem;"></i>${s.nome}` +
                    `<span style="background:#1d4ed8;color:#fff;border-radius:10px;padding:0 5px;font-size:0.7rem;">${s.quantidade}</span></span>`
                  ).join(' ')
                : '<span style="color:#94a3b8;font-size:0.78rem;font-style:italic;">Sem endereço</span>';

            const fotoHtml = (item.foto_url || item.foto_base64)
                ? `<img src="${item.foto_url || item.foto_base64}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;flex-shrink:0;">`
                : `<div style="width:40px;height:40px;border-radius:8px;background:#f1f5f9;border:1px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="ph ph-image" style="color:#94a3b8;font-size:1.2rem;"></i></div>`;

            const itemJson = JSON.stringify(item).replace(/'/g, "&#39;");
            return `
                <tr style="${isLow ? 'background:#fff5f5;' : ''}">
                    <td style="font-weight:500;display:flex;align-items:center;gap:12px;">
                        ${fotoHtml}
                        <div>${isLow ? '<i class="ph ph-warning-circle" style="color:#ef4444;margin-right:4px;" title="Estoque Mínimo Atingido"></i>' : ''}${item.nome}</div>
                    </td>
                    <td><span class="badge" style="background:#f1f5f9;color:#475569;">${item.departamento}</span></td>
                    <td>${item.categoria}</td>
                    <td style="font-weight:bold;color:${isLow ? '#ef4444' : '#10b981'};">${item.quantidade_atual}</td>
                    <td style="color:#64748b;font-size:0.85rem;">Min: ${item.quantidade_minima} | Máx: ${item.quantidade_maxima}</td>
                    <td style="max-width:240px;"><div style="display:flex;flex-wrap:wrap;gap:4px;">${badges}</div></td>
                    <td style="text-align:right;white-space:nowrap;">
                        <button class="btn btn-sm" onclick="window.abrirModalBaixaEstoque(${itemJson})" title="Baixa Manual" style="background:#fff3e6;color:#e67700;border:1px solid #fed7aa;padding:4px 8px;border-radius:4px;margin-right:2px;"><i class="ph ph-arrow-down"></i></button>
                        <button class="btn btn-sm" onclick="window.ajustarEstoqueRapido(${item.id},${item.quantidade_atual},1)" title="Entrada Rápida" style="background:#f0fdf4;border:1px solid #bbf7d0;color:#16a34a;padding:4px 8px;border-radius:4px;"><i class="ph ph-plus"></i></button>
                        <button class="btn btn-sm btn-secondary" onclick="window.editarEstoque(${itemJson})" style="margin-left:6px;"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn btn-sm" onclick="window.excluirEstoque(${item.id})" style="background:#fee2e2;color:#ef4444;border:none;margin-left:4px;"><i class="ph ph-trash"></i></button>
                    </td>
                </tr>`;
        }).join('');
    } catch (e) {
        console.error(e);
        table.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#ef4444;">${e.message}</td></tr>`;
    }
};

// ── Modal: Baixa Manual por Endereço ─────────────────────────────────────────
window.abrirModalBaixaEstoque = async function(item) {
    await _carregarEnderecos();
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    let saldos = [];
    try {
        const sr = await fetch(`${API_URL}/estoque/${item.id}/saldo-enderecos`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (sr.ok) saldos = await sr.json();
    } catch(e) {}

    const opts = window._estoqueEnderecos.map(e => {
        const s = saldos.find(x => x.endereco_id === e.id);
        return `<option value="${e.id}">${e.nome} (${s ? s.quantidade : 0} em estoque)</option>`;
    }).join('');

    const { value: vals, isConfirmed } = await Swal.fire({
        title: '<b><i class="ph ph-arrow-down" style="color:#e67700"></i> Baixa Manual</b>',
        html: `<div style="text-align:left;">
            <div style="background:#fff3e6;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;margin-bottom:16px;">
                <strong style="color:#92400e;">${item.nome}</strong>
                <span style="color:#64748b;font-size:0.85rem;display:block;">Estoque total: ${item.quantidade_atual} unid.</span>
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Endereço para baixa *</label>
                <select id="swal-baixa-end" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    <option value="">— Selecione o local —</option>${opts}
                </select>
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Quantidade *</label>
                <input type="number" id="swal-baixa-qtd" min="1" value="1" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.95rem;">
            </div>
            <div>
                <label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Motivo</label>
                <input type="text" id="swal-baixa-motivo" placeholder="Ex: Uso interno, perda..." style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
            </div>
        </div>`,
        showCancelButton: true,
        confirmButtonText: 'Confirmar Baixa',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e67700',
        preConfirm: () => {
            const endId = document.getElementById('swal-baixa-end').value;
            const qtd   = parseInt(document.getElementById('swal-baixa-qtd').value);
            const mot   = document.getElementById('swal-baixa-motivo').value.trim();
            if (!endId) { Swal.showValidationMessage('Selecione o endereço'); return false; }
            if (!qtd || qtd <= 0) { Swal.showValidationMessage('Informe uma quantidade válida'); return false; }
            return { enderecoId: endId, quantidade: qtd, motivo: mot };
        }
    });
    if (!isConfirmed || !vals) return;

    try {
        const res = await fetch(`${API_URL}/estoque/${item.id}/baixa`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ endereco_id: parseInt(vals.enderecoId), quantidade: vals.quantidade, motivo: vals.motivo || 'Baixa Manual' })
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro ao dar baixa'); }
        Swal.fire({ icon: 'success', title: 'Baixa registrada!', timer: 1400, showConfirmButton: false });
        window.renderEstoqueTable();
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};

// ── Criar novo endereço (botão "+") ──────────────────────────────────────────
window.abrirModalNovoEndereco = async function() {
    const { value: nome, isConfirmed } = await Swal.fire({
        title: 'Novo Endereço de Estoque',
        input: 'text',
        inputLabel: 'Nome do endereço (ex: Depósito A, Prateleira 2...)',
        inputPlaceholder: 'Nome do endereço',
        showCancelButton: true,
        confirmButtonText: 'Criar',
        confirmButtonColor: '#1d4ed8',
        cancelButtonText: 'Cancelar',
        inputValidator: v => { if (!v || !v.trim()) return 'Informe o nome do endereço'; }
    });
    if (!isConfirmed || !nome) return;
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/estoque-enderecos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nome.trim() })
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro'); }
        const novo = await res.json();
        window._estoqueEnderecos.push(novo);
        _popularSelectEndereco();
        Swal.fire({ icon: 'success', title: 'Endereço criado!', text: `"${novo.nome}" adicionado.`, timer: 1400, showConfirmButton: false });
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};

// ── Modal Abrir/Fechar ────────────────────────────────────────────────────────
window.abrirModalEstoque = async function() {
    await _carregarEnderecos();
    document.getElementById('form-estoque').reset();
    document.getElementById('estoque-id').value = '';
    const fi = document.getElementById('estoque-foto');
    if (fi) fi.value = '';
    document.getElementById('estoque-foto-base64').value = '';
    document.getElementById('estoque-foto-preview').src = '';
    document.getElementById('estoque-foto-preview').style.display = 'none';
    document.getElementById('estoque-foto-icon').style.display = 'block';
    _popularSelectEndereco();
    document.getElementById('modal-estoque-title').innerHTML = '<i class="ph ph-package"></i> Adicionar Item de Estoque';
    document.getElementById('modal-estoque').style.display = 'flex';
};

window.fecharModalEstoque = function() {
    document.getElementById('modal-estoque').style.display = 'none';
};

window.editarEstoque = async function(item) {
    await _carregarEnderecos();
    document.getElementById('estoque-id').value    = item.id;
    document.getElementById('estoque-nome').value  = item.nome;
    document.getElementById('estoque-dept').value  = item.departamento;
    document.getElementById('estoque-cat').value   = item.categoria;
    document.getElementById('estoque-qtd').value   = item.quantidade_atual;
    document.getElementById('estoque-min').value   = item.quantidade_minima;
    document.getElementById('estoque-max').value   = item.quantidade_maxima;
    const fi = document.getElementById('estoque-foto');
    if (fi) fi.value = '';
    document.getElementById('estoque-foto-base64').value = '';
    const src = item.foto_url || item.foto_base64 || '';
    document.getElementById('estoque-foto-preview').src = src;
    document.getElementById('estoque-foto-preview').style.display = src ? 'block' : 'none';
    document.getElementById('estoque-foto-icon').style.display   = src ? 'none'  : 'block';
    _popularSelectEndereco();
    document.getElementById('modal-estoque-title').innerHTML = '<i class="ph ph-pencil-simple"></i> Editar Item de Estoque';
    document.getElementById('modal-estoque').style.display = 'flex';
};

// ── Salvar ────────────────────────────────────────────────────────────────────
window.salvarEstoque = async function(e) {
    e.preventDefault();
    const id      = document.getElementById('estoque-id').value;
    const endId   = document.getElementById('estoque-endereco-select')?.value || '';
    const qtdNova = parseInt(document.getElementById('estoque-qtd').value) || 0;
    const payload = {
        nome:              document.getElementById('estoque-nome').value,
        departamento:      document.getElementById('estoque-dept').value,
        categoria:         document.getElementById('estoque-cat').value,
        quantidade_atual:  qtdNova,
        quantidade_minima: parseInt(document.getElementById('estoque-min').value) || 0,
        quantidade_maxima: parseInt(document.getElementById('estoque-max').value) || 0,
        foto_base64:       document.getElementById('estoque-foto-base64').value
    };
    const token  = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    const url    = id ? `${API_URL}/estoque/${id}` : `${API_URL}/estoque`;
    const method = id ? 'PUT' : 'POST';
    const btn    = document.getElementById('btn-salvar-estoque');
    try {
        btn.innerHTML = 'Salvando...'; btn.disabled = true;
        const res = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro ao salvar'); }
        const result = await res.json();

        // Se novo item com endereço, registrar saldo apenas na tabela saldo_por_endereco (sem somar ao total novamente)
        if (!id && endId && result.id && qtdNova > 0) {
            try {
                // Insere diretamente sem chamar POST /saldo-enderecos (que somaria ao total)
                // Em vez disso, usa PATCH ou simplesmente registra manualmente via backend
                // A abordagem mais simples e segura: POST /saldo-enderecos com qtd=0 e depois atualiza direto
                await fetch(`${API_URL}/estoque/${result.id}/saldo-enderecos`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endereco_id: parseInt(endId), quantidade: qtdNova, motivo: 'Saldo inicial' })
                });
                // Corrige total que foi duplicado: PUT com qtd original
                await fetch(`${API_URL}/estoque/${result.id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, foto_base64: '' })
                });
            } catch(es) { console.warn('[ESTOQUE] saldo endereço:', es.message); }
        }

        Swal.fire({ icon: 'success', title: 'Sucesso', text: 'Item salvo com sucesso', timer: 1500, showConfirmButton: false });
        window.fecharModalEstoque();
        window.renderEstoqueTable();
    } catch (err) {
        Swal.fire('Erro', err.message, 'error');
    } finally {
        btn.innerHTML = 'Salvar Item'; btn.disabled = false;
    }
};

// ── Ajuste Rápido (+) ─────────────────────────────────────────────────────────
window.ajustarEstoqueRapido = async function(id, qtdAtual, variacao) {
    const novaQtd = qtdAtual + variacao;
    if (novaQtd < 0) return Swal.fire('Atenção', 'A quantidade não pode ser menor que zero.', 'warning');
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        const r = await fetch(`${API_URL}/estoque`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!r.ok) throw new Error();
        const itens = await r.json();
        const item  = itens.find(i => i.id === id);
        if (!item) throw new Error('Item não encontrado');
        const ur = await fetch(`${API_URL}/estoque/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: item.nome, departamento: item.departamento, categoria: item.categoria, quantidade_atual: novaQtd, quantidade_minima: item.quantidade_minima, quantidade_maxima: item.quantidade_maxima })
        });
        if (!ur.ok) throw new Error('Erro ao atualizar');
        window.renderEstoqueTable();
    } catch(e) { Swal.fire('Erro', 'Não foi possível atualizar a quantidade.', 'error'); }
};

// ── Excluir ───────────────────────────────────────────────────────────────────
window.excluirEstoque = async function(id) {
    const ok = await Swal.fire({ title: 'Excluir item?', text: 'Esta ação não pode ser desfeita.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b', confirmButtonText: 'Sim, excluir' });
    if (!ok.isConfirmed) return;
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        const r = await fetch(`${API_URL}/estoque/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (!r.ok) throw new Error('Erro ao excluir');
        window.renderEstoqueTable();
    } catch(err) { Swal.fire('Erro', err.message, 'error'); }
};

// ── Preview de foto ───────────────────────────────────────────────────────────
window.previewEstoqueFoto = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('estoque-foto-base64').value  = e.target.result;
        document.getElementById('estoque-foto-preview').src   = e.target.result;
        document.getElementById('estoque-foto-preview').style.display = 'block';
        document.getElementById('estoque-foto-icon').style.display    = 'none';
    };
    reader.readAsDataURL(file);
};

// ── Hook de navegação ─────────────────────────────────────────────────────────
const origNavForEstoque = window.navigateTo;
window.navigateTo = function(targetId) {
    if (origNavForEstoque) origNavForEstoque.apply(this, arguments);
    if (targetId === 'estoque') window.renderEstoqueTable();
};

// ── Abas ──────────────────────────────────────────────────────────────────────
window.switchTabEstoque = function(tab) {
    document.getElementById('content-estoque-itens').style.display     = tab === 'itens'     ? 'block' : 'none';
    document.getElementById('content-estoque-historico').style.display = tab === 'historico' ? 'block' : 'none';
    ['itens','historico'].forEach(t => {
        const el = document.getElementById(`tab-estoque-${t}`);
        if (!el) return;
        el.style.color       = tab === t ? '#e67700' : '#64748b';
        el.style.borderColor = tab === t ? '#e67700' : 'transparent';
        el.style.fontWeight  = tab === t ? '700' : '600';
    });
    if (tab === 'historico') window.renderEstoqueHistorico();
};

// ── Histórico ─────────────────────────────────────────────────────────────────
window.renderEstoqueHistorico = async function() {
    const table = document.getElementById('table-estoque-historico');
    if (!table) return;
    try {
        table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;">Carregando histórico...</td></tr>';
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const r = await fetch(`${API_URL}/estoque/historico`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!r.ok) throw new Error('Erro ao buscar histórico');
        const data = await r.json();
        if (data.length === 0) {
            table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;">Nenhuma movimentação registrada.</td></tr>';
            return;
        }
        table.innerHTML = '';
        data.forEach(h => {
            const tr = document.createElement('tr');
            let raw = h.data_hora || '';
            if (raw && !raw.includes('T')) raw = raw.replace(' ','T') + 'Z';
            const dt = new Date(raw);
            const tipoColor = h.tipo === 'Entrada' ? '#16a34a' : (h.tipo === 'Saída' ? '#ef4444' : '#eab308');
            const tipoBg    = h.tipo === 'Entrada' ? '#f0fdf4' : (h.tipo === 'Saída' ? '#fef2f2' : '#fefce8');
            const endHtml   = h.endereco_nome
                ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:20px;padding:2px 8px;font-size:0.72rem;font-weight:600;"><i class="ph ph-map-pin" style="font-size:0.75rem;"></i>${h.endereco_nome}</span>`
                : '<span style="color:#94a3b8;font-size:0.8rem;">—</span>';
            tr.innerHTML = `
                <td><div style="font-weight:500;">${dt.toLocaleDateString('pt-BR')}</div><div style="font-size:0.8em;color:#64748b;">${dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div></td>
                <td><div style="font-weight:600;color:#1e293b;">${h.estoque_nome}</div><div style="font-size:0.8em;color:#64748b;">${h.estoque_departamento}</div></td>
                <td><span style="background:${tipoBg};color:${tipoColor};padding:2px 8px;border-radius:12px;font-size:0.8em;font-weight:600;">${h.tipo}</span></td>
                <td style="font-weight:700;color:${tipoColor};">${h.tipo==='Saída'?'-':'+'}${h.quantidade}</td>
                <td>${h.usuario || '-'}</td>
                <td style="color:#475569;font-size:0.9em;max-width:180px;">${h.motivo || '-'}</td>
                <td>${endHtml}</td>`;
            table.appendChild(tr);
        });
    } catch(err) {
        table.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#ef4444;">Erro ao carregar histórico: ${err.message}</td></tr>`;
    }
};
