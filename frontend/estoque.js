// frontend/estoque.js

// Cache global de enderecos
window._estoqueEnderecos = [];
window._estoqueCache = {};

async function _carregarEnderecos() {
    try {
        const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
        const res = await fetch(API_URL + "/estoque-enderecos", { headers: { "Authorization": "Bearer " + token } });
        if (res.ok) window._estoqueEnderecos = await res.json();
    } catch (e) { console.warn("[ESTOQUE] Erro ao carregar enderecos:", e.message); }
}

// ── TABELA PRINCIPAL ──────────────────────────────────────────────────────────
window.renderEstoqueTable = async function() {
    const table = document.getElementById("table-estoque");
    if (!table) return;
    try {
        table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;">Carregando...</td></tr>';
        const dept   = document.getElementById("filtro-estoque-dept").value;
        const cat    = document.getElementById("filtro-estoque-cat").value;
        const statusEl = document.getElementById("filtro-estoque-status");
        const status = statusEl ? statusEl.value : "";
        const nome   = document.getElementById("filtro-estoque-nome").value.toLowerCase();
        const token  = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
        let url = API_URL + "/estoque?";
        if (dept) url += "departamento=" + encodeURIComponent(dept) + "&";
        if (cat)  url += "categoria=" + encodeURIComponent(cat) + "&";

        const headers = { "Authorization": "Bearer " + token };
        const [r1, r2] = await Promise.all([
            fetch(url, { headers }),
            fetch(API_URL + "/estoque-saldos", { headers })
        ]);
        if (!r1.ok) throw new Error("Erro ao buscar estoque");
        let data = await r1.json();
        const saldosMap = r2.ok ? await r2.json() : {};

        if (window._estoqueEnderecos.length === 0) await _carregarEnderecos();
        if (nome) data = data.filter(i => i.nome.toLowerCase().includes(nome));
        if (status === "minimo") data = data.filter(i => {
            const saldos = saldosMap[i.id] || [];
            if (saldos.length > 0) return saldos.some(s => s.quantidade <= i.quantidade_minima);
            return i.quantidade_atual <= i.quantidade_minima;
        });

        if (data.length === 0) {
            table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;">Nenhum item encontrado.</td></tr>';
            return;
        }

        window._estoqueCache = {};
        data.forEach(item => { window._estoqueCache[item.id] = item; });

        let rows = '';
        data.forEach(item => {
            const saldos = saldosMap[item.id] || [];
            const multiEnd = saldos.length > 1;

            // ── Verificar se está no mínimo ──
            let isLow = false;
            if (saldos.length > 0) {
                isLow = saldos.some(s => s.quantidade <= item.quantidade_minima && item.quantidade_minima > 0);
            } else {
                isLow = item.quantidade_minima > 0 && item.quantidade_atual <= item.quantidade_minima;
            }

            // ── Foto ──
            const fotoSrc = item.foto_url || item.foto_base64 || "";
            const fotoHtml = fotoSrc
                ? '<img src="' + fotoSrc + '" style="width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;flex-shrink:0;">'
                : '<div style="width:40px;height:40px;border-radius:8px;background:#f1f5f9;border:1px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="ph ph-image" style="color:#94a3b8;font-size:1.2rem;"></i></div>';

            const warnIcon = isLow ? '<i class="ph ph-warning-circle" style="color:#ef4444;margin-right:4px;" title="Estoque Mínimo"></i>' : "";

            // ── Coluna Quantidade ──
            let qtdHtml;
            if (multiEnd) {
                qtdHtml = '<span style="color:#94a3b8;font-style:italic;">—</span>';
            } else {
                const qtd = saldos.length === 1 ? saldos[0].quantidade : item.quantidade_atual;
                qtdHtml = '<span style="font-weight:bold;color:' + (isLow ? '#ef4444' : '#10b981') + ';">' + qtd + '</span>';
            }

            // ── Coluna Endereços ──
            let endHtml;
            if (multiEnd) {
                endHtml = '<div style="display:flex;align-items:center;gap:6px;">' +
                    '<span style="color:#94a3b8;font-style:italic;font-size:0.78rem;">—</span>' +
                    '<button onclick="window._toggleExpandEstoque(' + item.id + ')" id="btn-expand-' + item.id + '" ' +
                    'style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:2px 8px;cursor:pointer;display:inline-flex;align-items:center;gap:3px;font-size:0.75rem;color:#475569;" title="Ver endereços">' +
                    '<i class="ph ph-caret-down" id="icon-expand-' + item.id + '" style="transition:transform 0.2s;"></i> detalhes</button>' +
                    '</div>';
            } else if (saldos.length === 1) {
                const s = saldos[0];
                const badgeColor = (s.quantidade <= item.quantidade_minima && item.quantidade_minima > 0) ? '#fef2f2' : '#eff6ff';
                const txtColor   = (s.quantidade <= item.quantidade_minima && item.quantidade_minima > 0) ? '#ef4444' : '#1d4ed8';
                const brdColor   = (s.quantidade <= item.quantidade_minima && item.quantidade_minima > 0) ? '#fca5a5' : '#bfdbfe';
                endHtml = '<span style="display:inline-flex;align-items:center;gap:3px;background:' + badgeColor + ';color:' + txtColor + ';border:1px solid ' + brdColor + ';border-radius:20px;padding:2px 8px;font-size:0.72rem;font-weight:600;white-space:nowrap;">' +
                    '<i class="ph ph-map-pin" style="font-size:0.75rem;"></i>' + s.nome +
                    '<span style="background:' + txtColor + ';color:#fff;border-radius:10px;padding:0 5px;font-size:0.7rem;">' + s.quantidade + '</span></span>';
            } else {
                endHtml = '<span style="color:#94a3b8;font-size:0.78rem;font-style:italic;">Sem endereço</span>';
            }

            const rowBg = isLow ? 'background:#fff5f5;border-left:3px solid #ef4444;' : '';

            // ── Linha principal ──
            rows += '<tr id="row-' + item.id + '" style="' + rowBg + '">' +
                '<td style="font-weight:500;display:flex;align-items:center;gap:12px;">' + fotoHtml + '<div>' + warnIcon + item.nome + '</div></td>' +
                '<td><span class="badge" style="background:#f1f5f9;color:#475569;">' + item.departamento + '</span></td>' +
                '<td>' + item.categoria + '</td>' +
                '<td>' + qtdHtml + '</td>' +
                '<td style="color:#64748b;font-size:0.85rem;">Min: ' + item.quantidade_minima + ' | Max: ' + item.quantidade_maxima + '</td>' +
                '<td style="max-width:240px;">' + endHtml + '</td>' +
                '<td style="text-align:right;white-space:nowrap;">' +
                    '<button class="btn btn-sm" onclick="window.abrirModalBaixaEstoque(window._estoqueCache[' + item.id + '])" title="Baixa Manual" style="background:#fff3e6;color:#e67700;border:1px solid #fed7aa;padding:4px 8px;border-radius:4px;margin-right:2px;"><i class="ph ph-arrow-down"></i></button>' +
                    '<button class="btn btn-sm" onclick="window.ajustarEstoqueRapido(' + item.id + ',' + item.quantidade_atual + ',1)" title="Entrada Rápida" style="background:#f0fdf4;border:1px solid #bbf7d0;color:#16a34a;padding:4px 8px;border-radius:4px;"><i class="ph ph-plus"></i></button>' +
                    '<button class="btn btn-sm btn-secondary" onclick="window.editarEstoque(window._estoqueCache[' + item.id + '])" title="Editar" style="margin-left:4px;"><i class="ph ph-pencil-simple"></i></button>' +
                    '<button class="btn btn-sm" onclick="window.excluirEstoque(' + item.id + ')" style="background:#fee2e2;color:#ef4444;border:none;margin-left:4px;"><i class="ph ph-trash"></i></button>' +
                '</td></tr>';

            // ── Sub-linha expandida (multi-endereço) ──
            if (multiEnd) {
                rows += '<tr id="expand-' + item.id + '" style="display:none;background:#f8fafc;">' +
                    '<td colspan="7" style="padding:0;">' +
                    '<div style="padding:10px 20px 14px 72px;">' +
                    '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
                saldos.forEach(s => {
                    const low = item.quantidade_minima > 0 && s.quantidade <= item.quantidade_minima;
                    rows += '<div style="display:inline-flex;align-items:center;gap:6px;background:' + (low ? '#fef2f2' : '#eff6ff') + ';border:1px solid ' + (low ? '#fca5a5' : '#bfdbfe') + ';border-radius:20px;padding:4px 12px;">' +
                        '<i class="ph ph-map-pin" style="color:' + (low ? '#ef4444' : '#1d4ed8') + ';font-size:0.8rem;"></i>' +
                        '<span style="font-size:0.8rem;font-weight:600;color:' + (low ? '#ef4444' : '#1e40af') + ';">' + s.nome + '</span>' +
                        '<span style="background:' + (low ? '#ef4444' : '#1d4ed8') + ';color:#fff;border-radius:10px;padding:0 7px;font-size:0.75rem;font-weight:700;">' + s.quantidade + '</span>' +
                        (low ? '<i class="ph ph-warning" style="color:#ef4444;font-size:0.75rem;" title="Abaixo do mínimo"></i>' : '') +
                        '</div>';
                });
                rows += '</div></div></td></tr>';
            }
        });

        table.innerHTML = rows;
    } catch (e) {
        console.error(e);
        table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ef4444;">' + e.message + '</td></tr>';
    }
};

// Toggle expand/collapse
window._toggleExpandEstoque = function(itemId) {
    const expandRow = document.getElementById('expand-' + itemId);
    const icon = document.getElementById('icon-expand-' + itemId);
    if (!expandRow) return;
    const isOpen = expandRow.style.display !== 'none';
    expandRow.style.display = isOpen ? 'none' : 'table-row';
    if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
};

// ── Modal: Baixa Manual por Endereco ─────────────────────────────────────────
window.abrirModalBaixaEstoque = async function(item) {
    if (!item) return;
    const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
    let saldos = [];
    try {
        const r = await fetch(API_URL + "/estoque/" + item.id + "/saldo-enderecos", { headers: { "Authorization": "Bearer " + token } });
        if (r.ok) saldos = await r.json();
    } catch(e) {}

    const semEndereco = saldos.length === 0;
    let optsEnd = saldos.filter(s => s.quantidade > 0).map(s =>
        '<option value="' + s.endereco_id + '">' + s.endereco_nome + ' (' + s.quantidade + ' unid.)</option>'
    ).join('');

    const { value: vals, isConfirmed } = await Swal.fire({
        title: '<b><i class="ph ph-arrow-down" style="color:#e67700"></i> Baixa de Estoque</b>',
        html: '<div style="text-align:left;">' +
            '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;margin-bottom:16px;">' +
                '<strong style="color:#c2410c;">' + item.nome + '</strong>' +
                '<span style="color:#64748b;font-size:0.85rem;display:block;">Total: ' + item.quantidade_atual + ' unid.</span>' +
            '</div>' +
            (!semEndereco ? '<div style="margin-bottom:12px;"><label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Endereço *</label>' +
                '<select id="swal-baixa-end" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">' +
                '<option value="">Selecione o endereço</option>' + optsEnd + '</select></div>' : '') +
            '<div><label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Quantidade *</label>' +
                '<input type="number" id="swal-baixa-qtd" min="1" value="1" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.95rem;"></div>' +
            '<div style="margin-top:12px;"><label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Motivo (opcional)</label>' +
                '<input type="text" id="swal-baixa-motivo" placeholder="Ex: Entrega colaborador..." style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;"></div>' +
        '</div>',
        showCancelButton: true,
        confirmButtonText: 'Confirmar Baixa',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e67700',
        preConfirm: () => {
            const endId = !semEndereco ? document.getElementById('swal-baixa-end').value : null;
            const qtd   = parseInt(document.getElementById('swal-baixa-qtd').value);
            const motivo = document.getElementById('swal-baixa-motivo').value.trim();
            if (!semEndereco && !endId) { Swal.showValidationMessage('Selecione o endereço'); return false; }
            if (!qtd || qtd <= 0) { Swal.showValidationMessage('Quantidade inválida'); return false; }
            return { endId, qtd, motivo };
        }
    });
    if (!isConfirmed || !vals) return;
    try {
        const body = { quantidade: -vals.qtd, motivo: vals.motivo || 'Baixa manual' };
        if (vals.endId) body.endereco_id = parseInt(vals.endId);
        const r = await fetch(API_URL + "/estoque/" + item.id + "/movimentar", {
            method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!r.ok) { const err = await r.json(); throw new Error(err.error || 'Erro ao dar baixa'); }
        Swal.fire({ icon: 'success', title: 'Baixa registrada!', timer: 1500, showConfirmButton: false });
        window.renderEstoqueTable();
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};

// ── HELPERS DE ENDEREÇOS NO MODAL ─────────────────────────────────────────────
window._enderecoLinhas = [];

window._calcularSomaEnderecos = function() {
    const soma = (window._enderecoLinhas || []).reduce((acc, l) => acc + (parseInt(l.quantidade) || 0), 0);
    const qtdEl = document.getElementById('estoque-qtd');
    if (qtdEl) {
        const temLinhas = window._enderecoLinhas.length > 0;
        qtdEl.value = soma;
        qtdEl.readOnly = temLinhas;
        qtdEl.style.background = temLinhas ? '#f8fafc' : '';
        qtdEl.style.cursor = temLinhas ? 'not-allowed' : '';
        qtdEl.style.color = temLinhas ? '#64748b' : '';
        const badge = document.getElementById('estoque-qtd-badge');
        if (badge) badge.textContent = temLinhas ? '(soma dos endereços)' : '';
    }
};

window._renderLinhasEndereco = function() {
    const lista = document.getElementById('estoque-enderecos-lista');
    const vazio = document.getElementById('estoque-enderecos-vazio');
    if (!lista) return;
    const linhas = window._enderecoLinhas;
    if (!linhas.length) {
        lista.innerHTML = '';
        if (vazio) vazio.style.display = 'block';
        window._calcularSomaEnderecos();
        return;
    }
    if (vazio) vazio.style.display = 'none';
    lista.innerHTML = linhas.map((linha, idx) => {
        const opcoesEnd = window._estoqueEnderecos.map(e =>
            '<option value="' + e.id + '"' + (e.id === linha.endereco_id ? ' selected' : '') + '>' + e.nome + '</option>'
        ).join('');
        return '<div style="display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;">' +
            '<i class="ph ph-map-pin" style="color:#1d4ed8;flex-shrink:0;"></i>' +
            '<select onchange="window._enderecoLinhas[' + idx + '].endereco_id = parseInt(this.value)" style="flex:1;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.85rem;background:#fff;">' +
                '<option value="">-- Selecione o endereço --</option>' + opcoesEnd +
            '</select>' +
            '<input type="number" min="0" value="' + (linha.quantidade || 0) + '" placeholder="Qtd" ' +
                'oninput="window._enderecoLinhas[' + idx + '].quantidade = parseInt(this.value) || 0; window._calcularSomaEnderecos();" ' +
                'style="width:80px;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.85rem;text-align:center;">' +
            '<button type="button" onclick="window._removerLinhaEndereco(' + idx + ')" ' +
                'style="background:#fee2e2;color:#ef4444;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;flex-shrink:0;">' +
                '<i class="ph ph-trash"></i>' +
            '</button>' +
        '</div>';
    }).join('');
    window._calcularSomaEnderecos();
};

window._adicionarLinhaEndereco = function() {
    window._enderecoLinhas.push({ endereco_id: null, quantidade: 0 });
    window._renderLinhasEndereco();
};

window._removerLinhaEndereco = function(idx) {
    window._enderecoLinhas.splice(idx, 1);
    window._renderLinhasEndereco();
};

// ── Modal Abrir (novo produto) ────────────────────────────────────────────────
window.abrirModalEstoque = async function() {
    await _carregarEnderecos();
    document.getElementById("form-estoque").reset();
    document.getElementById("estoque-id").value = "";
    const fi = document.getElementById("estoque-foto");
    if (fi) fi.value = "";
    document.getElementById("estoque-foto-base64").value = "";
    document.getElementById("estoque-foto-preview").src = "";
    document.getElementById("estoque-foto-preview").style.display = "none";
    document.getElementById("estoque-foto-icon").style.display = "block";
    window._enderecoLinhas = [];
    window._renderLinhasEndereco();
    document.getElementById("modal-estoque-title").innerHTML = '<i class="ph ph-package"></i> Adicionar Item de Estoque';
    document.getElementById("modal-estoque").style.display = "flex";
};

window.fecharModalEstoque = function() {
    document.getElementById("modal-estoque").style.display = "none";
};

// ── Modal Editar ──────────────────────────────────────────────────────────────
window.editarEstoque = async function(item) {
    if (!item) { console.error("[editarEstoque] item indefinido"); return; }
    await _carregarEnderecos();
    document.getElementById("estoque-id").value   = item.id;
    document.getElementById("estoque-nome").value = item.nome;
    document.getElementById("estoque-dept").value = item.departamento;
    document.getElementById("estoque-cat").value  = item.categoria;
    document.getElementById("estoque-qtd").value  = item.quantidade_atual;
    document.getElementById("estoque-min").value  = item.quantidade_minima;
    document.getElementById("estoque-max").value  = item.quantidade_maxima;
    const fi = document.getElementById("estoque-foto");
    if (fi) fi.value = "";
    document.getElementById("estoque-foto-base64").value = "";
    const src = item.foto_url || item.foto_base64 || "";
    document.getElementById("estoque-foto-preview").src = src;
    document.getElementById("estoque-foto-preview").style.display = src ? "block" : "none";
    document.getElementById("estoque-foto-icon").style.display   = src ? "none"  : "block";

    // Carregar endereços já vinculados
    window._enderecoLinhas = [];
    try {
        const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
        const r = await fetch(API_URL + "/estoque/" + item.id + "/saldo-enderecos", {
            headers: { "Authorization": "Bearer " + token }
        });
        if (r.ok) {
            const saldos = await r.json();
            window._enderecoLinhas = saldos.map(s => ({ endereco_id: s.endereco_id, quantidade: s.quantidade }));
        }
    } catch(e) { console.warn("[editarEstoque] erro ao carregar saldos:", e.message); }
    window._renderLinhasEndereco();
    document.getElementById("modal-estoque-title").innerHTML = '<i class="ph ph-pencil-simple"></i> Editar Item de Estoque';
    document.getElementById("modal-estoque").style.display = "flex";
};

// ── Salvar ────────────────────────────────────────────────────────────────────
window.salvarEstoque = async function(e) {
    e.preventDefault();
    const id = document.getElementById("estoque-id").value;
    const linhasValidas = (window._enderecoLinhas || []).filter(l => l.endereco_id && l.quantidade > 0);
    
    // Qtd. Atual = soma dos endereços SE houver, senão usa o campo (mantém quantidade já cadastrada)
    const somaEnderecos = linhasValidas.reduce((acc, l) => acc + (parseInt(l.quantidade) || 0), 0);
    const qtdAtual = linhasValidas.length > 0 
        ? somaEnderecos 
        : (parseInt(document.getElementById("estoque-qtd").value) || 0);

    const payload = {
        nome:              document.getElementById("estoque-nome").value,
        departamento:      document.getElementById("estoque-dept").value,
        categoria:         document.getElementById("estoque-cat").value,
        quantidade_atual:  qtdAtual,
        quantidade_minima: parseInt(document.getElementById("estoque-min").value) || 0,
        quantidade_maxima: parseInt(document.getElementById("estoque-max").value) || 0,
        foto_base64:       document.getElementById("estoque-foto-base64").value
    };
    const token  = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
    const url    = id ? API_URL + "/estoque/" + id : API_URL + "/estoque";
    const method = id ? "PUT" : "POST";
    const btn    = document.getElementById("btn-salvar-estoque");
    try {
        btn.innerHTML = "Salvando..."; btn.disabled = true;
        const res = await fetch(url, {
            method,
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Erro ao salvar"); }
        const result = await res.json();
        const prodId = id ? parseInt(id) : result.id;

        // Sincronizar apenas os endereços que foram preenchidos
        // Produtos sem endereço mantêm a quantidade como está no banco
        for (const linha of linhasValidas) {
            try {
                await fetch(API_URL + "/estoque/" + prodId + "/saldo-enderecos", {
                    method: "POST",
                    headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        endereco_id: linha.endereco_id, 
                        quantidade: linha.quantidade, 
                        motivo: id ? "Ajuste manual" : "Saldo inicial" 
                    })
                });
            } catch(es) { console.warn("[ESTOQUE] saldo endereco:", es.message); }
        }

        Swal.fire({ icon: "success", title: "Sucesso", text: "Item salvo com sucesso", timer: 1500, showConfirmButton: false });
        window.fecharModalEstoque();
        window.renderEstoqueTable();
    } catch (err) {
        Swal.fire("Erro", err.message, "error");
    } finally {
        btn.innerHTML = "Salvar Item"; btn.disabled = false;
    }
};

// ── Ajuste Rápido (+) ─────────────────────────────────────────────────────────
window.ajustarEstoqueRapido = async function(id, qtdAtual, variacao) {
    const novaQtd = qtdAtual + variacao;
    if (novaQtd < 0) return Swal.fire("Atenção", "A quantidade não pode ser menor que zero.", "warning");
    const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
    try {
        const r = await fetch(API_URL + "/estoque", { headers: { "Authorization": "Bearer " + token } });
        if (!r.ok) throw new Error();
        const itens = await r.json();
        const item  = itens.find(i => i.id === id);
        if (!item) throw new Error("Item não encontrado");
        const ur = await fetch(API_URL + "/estoque/" + id, {
            method: "PUT",
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ nome: item.nome, departamento: item.departamento, categoria: item.categoria, quantidade_atual: novaQtd, quantidade_minima: item.quantidade_minima, quantidade_maxima: item.quantidade_maxima })
        });
        if (!ur.ok) throw new Error("Erro ao atualizar");
        window.renderEstoqueTable();
    } catch(e) { Swal.fire("Erro", "Não foi possível atualizar a quantidade.", "error"); }
};

// ── Excluir ───────────────────────────────────────────────────────────────────
window.excluirEstoque = async function(id) {
    const ok = await Swal.fire({ title: "Excluir item?", text: "Esta ação não pode ser desfeita.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#64748b", confirmButtonText: "Sim, excluir" });
    if (!ok.isConfirmed) return;
    const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
    try {
        const r = await fetch(API_URL + "/estoque/" + id, { method: "DELETE", headers: { "Authorization": "Bearer " + token } });
        if (!r.ok) throw new Error("Erro ao excluir");
        window.renderEstoqueTable();
    } catch(err) { Swal.fire("Erro", err.message, "error"); }
};

// ── Transferir estoque entre enderecos (mantido para uso interno/futuro) ───────
window.abrirModalTransferirEstoque = async function(itemId) {
    const item = window._estoqueCache[itemId];
    if (!item) { Swal.fire('Erro', 'Item não encontrado. Recarregue a tabela.', 'error'); return; }
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    let saldos = [];
    try {
        const sr = await fetch(API_URL + '/estoque/' + itemId + '/saldo-enderecos', { headers: { 'Authorization': 'Bearer ' + token } });
        if (sr.ok) saldos = await sr.json();
    } catch(e) {}
    if (!window._estoqueEnderecos || window._estoqueEnderecos.length === 0) {
        try {
            const re = await fetch(API_URL + '/estoque-enderecos', { headers: { 'Authorization': 'Bearer ' + token } });
            if (re.ok) window._estoqueEnderecos = await re.json();
        } catch(e) {}
    }
    const saldosComQtd = saldos.filter(s => s.quantidade > 0);
    if (saldosComQtd.length === 0) {
        Swal.fire('Sem saldos', 'Este item não possui saldo em nenhum endereço para transferir.', 'warning');
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
            '</div>' +
            '<div style="margin-bottom:12px;"><label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">De (Origem) *</label>' +
                '<select id="swal-transf-origem" style="width:100%;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;"><option value="">Selecione</option>' + origemOpts + '</select></div>' +
            '<div style="margin-bottom:12px;"><label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Para (Destino) *</label>' +
                '<select id="swal-transf-destino" style="width:100%;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;"><option value="">Selecione</option>' + destinoOpts + '</select></div>' +
            '<div style="margin-bottom:12px;"><label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Quantidade *</label>' +
                '<input type="number" id="swal-transf-qtd" min="1" value="1" style="width:100%;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.95rem;"></div>' +
            '<div><label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Motivo (opcional)</label>' +
                '<input type="text" id="swal-transf-motivo" placeholder="Ex: Reposição de setor..." style="width:100%;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;"></div>' +
        '</div>',
        showCancelButton: true,
        confirmButtonText: 'Confirmar Transferência',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#1d4ed8',
        preConfirm: () => {
            const origemId  = document.getElementById('swal-transf-origem').value;
            const destinoId = document.getElementById('swal-transf-destino').value;
            const qtd       = parseInt(document.getElementById('swal-transf-qtd').value);
            const motivo    = document.getElementById('swal-transf-motivo').value.trim();
            if (!origemId)  { Swal.showValidationMessage('Selecione a origem'); return false; }
            if (!destinoId) { Swal.showValidationMessage('Selecione o destino'); return false; }
            if (String(origemId) === String(destinoId)) { Swal.showValidationMessage('Origem e destino iguais'); return false; }
            if (!qtd || qtd <= 0) { Swal.showValidationMessage('Quantidade inválida'); return false; }
            return { origemId, destinoId, quantidade: qtd, motivo };
        }
    });
    if (!isConfirmed || !vals) return;
    try {
        const res = await fetch(API_URL + '/estoque/' + itemId + '/transferir', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ origem_id: parseInt(vals.origemId), destino_id: parseInt(vals.destinoId), quantidade: vals.quantidade, motivo: vals.motivo || 'Transferência entre endereços' })
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro ao transferir'); }
        Swal.fire({ icon: 'success', title: 'Transferência realizada!', timer: 2000, showConfirmButton: false });
        window.renderEstoqueTable();
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};

// ── Preview de foto ───────────────────────────────────────────────────────────
window.previewEstoqueFoto = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById("estoque-foto-base64").value  = e.target.result;
        document.getElementById("estoque-foto-preview").src   = e.target.result;
        document.getElementById("estoque-foto-preview").style.display = "block";
        document.getElementById("estoque-foto-icon").style.display    = "none";
    };
    reader.readAsDataURL(file);
};

// ── Hook de navegação ─────────────────────────────────────────────────────────
const _origNavEstoque = window.navigateTo;
window.navigateTo = function(targetId) {
    if (_origNavEstoque) _origNavEstoque.apply(this, arguments);
    if (targetId === "estoque") window.renderEstoqueTable();
};

// ── Abas ──────────────────────────────────────────────────────────────────────
window.switchTabEstoque = function(tab) {
    document.getElementById("content-estoque-itens").style.display     = tab === "itens"     ? "block" : "none";
    document.getElementById("content-estoque-historico").style.display = tab === "historico" ? "block" : "none";
    ["itens","historico"].forEach(t => {
        const el = document.getElementById("tab-estoque-" + t);
        if (!el) return;
        el.style.color       = tab === t ? "#e67700" : "#64748b";
        el.style.borderColor = tab === t ? "#e67700" : "transparent";
        el.style.fontWeight  = tab === t ? "700" : "600";
    });
    if (tab === "historico") window.renderEstoqueHistorico();
};

// ── Histórico ─────────────────────────────────────────────────────────────────
window.renderEstoqueHistorico = async function() {
    const table = document.getElementById("table-estoque-historico");
    if (!table) return;
    try {
        table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;">Carregando histórico...</td></tr>';
        const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
        const r = await fetch(API_URL + "/estoque/historico", { headers: { "Authorization": "Bearer " + token } });
        if (!r.ok) throw new Error("Erro ao buscar histórico");
        const data = await r.json();
        if (data.length === 0) {
            table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;">Nenhuma movimentação registrada.</td></tr>';
            return;
        }
        table.innerHTML = "";
        data.forEach(h => {
            const tr = document.createElement("tr");
            let raw = h.data_hora || "";
            if (raw && !raw.includes("T")) raw = raw.replace(" ","T") + "Z";
            const dt = new Date(raw);
            const tipoColor = h.tipo === "Entrada" ? "#16a34a" : (h.tipo === "Saida" ? "#ef4444" : "#eab308");
            const tipoBg    = h.tipo === "Entrada" ? "#f0fdf4" : (h.tipo === "Saida" ? "#fef2f2" : "#fefce8");
            const sinal     = h.tipo === "Saida" ? "-" : "+";
            const endHtml   = h.endereco_nome
                ? '<span style="display:inline-flex;align-items:center;gap:3px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:20px;padding:2px 8px;font-size:0.72rem;font-weight:600;"><i class="ph ph-map-pin" style="font-size:0.75rem;"></i>' + h.endereco_nome + '</span>'
                : '<span style="color:#94a3b8;font-size:0.8rem;">—</span>';
            tr.innerHTML =
                '<td><div style="font-weight:500;">' + dt.toLocaleDateString("pt-BR") + '</div><div style="font-size:0.8em;color:#64748b;">' + dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) + '</div></td>' +
                '<td><div style="font-weight:600;color:#1e293b;">' + h.estoque_nome + '</div><div style="font-size:0.8em;color:#64748b;">' + h.estoque_departamento + '</div></td>' +
                '<td><span style="background:' + tipoBg + ';color:' + tipoColor + ';padding:2px 8px;border-radius:12px;font-size:0.8em;font-weight:600;">' + h.tipo + '</span></td>' +
                '<td style="font-weight:700;color:' + tipoColor + '">' + sinal + h.quantidade + '</td>' +
                '<td>' + (h.usuario || "-") + '</td>' +
                '<td style="color:#475569;font-size:0.9em;max-width:180px;">' + (h.motivo || "-") + '</td>' +
                '<td>' + endHtml + '</td>';
            table.appendChild(tr);
        });
    } catch(err) {
        table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ef4444;">Erro ao carregar histórico: ' + err.message + '</td></tr>';
    }
};
