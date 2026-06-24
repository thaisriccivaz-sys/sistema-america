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
        table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;">Carregando...</td></tr>';
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
        
        const tipoEl = document.getElementById("filtro-estoque-tipo");
        const tipoFilter = tipoEl ? tipoEl.value : "";
        if (tipoFilter) {
            data = data.filter(i => {
                const saldos = saldosMap[i.id] || [];
                if (tipoFilter === "sem_tipo") {
                    if (saldos.length === 0) return true;
                    return saldos.every(s => {
                        const endObj = window._estoqueEnderecos.find(e => String(e.id) === String(s.endereco_id));
                        return !endObj || !endObj.tipo_notificacao;
                    });
                } else {
                    return saldos.some(s => {
                        const endObj = window._estoqueEnderecos.find(e => String(e.id) === String(s.endereco_id));
                        return endObj && endObj.tipo_notificacao === tipoFilter;
                    });
                }
            });
        }

        if (data.length === 0) {
            table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;">Nenhum item encontrado.</td></tr>';
            return;
        }

        window._estoqueCache = {};
        data.forEach(item => { window._estoqueCache[item.id] = item; });

        let rows = '';
        data.forEach(item => {
            const saldos = saldosMap[item.id] || [];
            const multiEnd = saldos.length > 1;

            // ── Verificar se está no mínimo (usa min/max por endereço) ──
            let isLow = false;
            if (saldos.length > 0) {
                isLow = saldos.some(s => {
                    const minRef = (s.quantidade_minima > 0) ? s.quantidade_minima : item.quantidade_minima;
                    return minRef > 0 && s.quantidade <= minRef;
                });
            } else {
                isLow = item.quantidade_minima > 0 && item.quantidade_atual <= item.quantidade_minima;
            }

            const rowBorderLeft = isLow ? '3px solid #ef4444' : '3px solid transparent';

            // ── Foto ──
            const fotoSrc = item.foto_url || item.foto_base64 || "";
            const fotoHtml = fotoSrc
                ? '<img src="' + fotoSrc + '" style="width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;">'
                : '<div style="width:40px;height:40px;border-radius:8px;background:#f1f5f9;border:1px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;"><i class="ph ph-image" style="color:#94a3b8;font-size:1.2rem;"></i></div>';

            const warnIcon = isLow ? '<i class="ph ph-warning-circle" style="color:#ef4444;margin-right:4px;" title="Estoque Mínimo"></i>' : "";

            // ── Botões de ação (apenas na primeira linha do produto) ──
            const acoesBtns =
                '<button class="btn btn-sm" onclick="window.abrirModalBaixaEstoque(window._estoqueCache[' + item.id + '])" title="Baixa Manual" style="background:#fff3e6;color:#e67700;border:1px solid #fed7aa;padding:4px 8px;border-radius:4px;margin-right:2px;"><i class="ph ph-minus"></i></button>' +
                '<button class="btn btn-sm" onclick="window.ajustarEstoqueRapido(' + item.id + ',' + item.quantidade_atual + ',1)" title="Entrada Rápida" style="background:#f0fdf4;border:1px solid #bbf7d0;color:#16a34a;padding:4px 8px;border-radius:4px;"><i class="ph ph-plus"></i></button>' +
                '<button class="btn btn-sm btn-secondary" onclick="window.editarEstoque(window._estoqueCache[' + item.id + '])" title="Editar" style="margin-left:4px;"><i class="ph ph-pencil-simple"></i></button>' +
                '<button class="btn btn-sm" onclick="window.excluirEstoque(' + item.id + ')" style="background:#fee2e2;color:#ef4444;border:none;margin-left:4px;"><i class="ph ph-trash"></i></button>';

            // ── Gerar linhas: uma por endereço (ou uma única se sem endereço) ──
            const linhasEndereco = saldos.length > 0 ? saldos : [null];

            linhasEndereco.forEach(function(s, idx) {
                const primeiraLinha = idx === 0;
                const ultimaLinha  = idx === linhasEndereco.length - 1;

                // Cor/estado deste endereço
                let lowEnd = false;
                if (s) {
                    const minRef = (s.quantidade_minima > 0) ? s.quantidade_minima : item.quantidade_minima;
                    lowEnd = minRef > 0 && s.quantidade <= minRef;
                }

                // Qtd. Atual deste endereço
                let qtdCell;
                if (!s) {
                    qtdCell = '<span style="color:#94a3b8;font-style:italic;">—</span>';
                } else {
                    qtdCell = '<span style="font-weight:700;font-size:1rem;color:' + (lowEnd ? '#ef4444' : '#10b981') + ';">' + s.quantidade + '</span>';
                }

                // Min/Máx deste endereço
                let minMaxCell;
                if (!s) {
                    minMaxCell = '<span style="color:#94a3b8;font-size:0.8rem;">—</span>';
                } else {
                    const hasMin = s.quantidade_minima > 0;
                    const hasMax = s.quantidade_maxima > 0;
                    if (hasMin || hasMax) {
                        let parts = [];
                        if (hasMin) parts.push('<span style="color:#64748b;font-size:0.8rem;">min ' + s.quantidade_minima + '</span>');
                        if (hasMax) parts.push('<span style="color:#64748b;font-size:0.8rem;">max ' + s.quantidade_maxima + '</span>');
                        minMaxCell = parts.join('<span style="color:#cbd5e1;margin:0 6px;">|</span>');
                    } else {
                        minMaxCell = '<span style="color:#94a3b8;font-size:0.78rem;">—</span>';
                    }
                }

                // Endereço badge
                let endCell;
                if (!s) {
                    endCell = '<span style="color:#94a3b8;font-size:0.78rem;font-style:italic;">Sem endereço</span>';
                } else {
                    endCell = '<span style="display:inline-flex;align-items:center;gap:4px;background:' + (lowEnd ? '#fef2f2' : '#eff6ff') + ';color:' + (lowEnd ? '#ef4444' : '#1d4ed8') + ';border:1px solid ' + (lowEnd ? '#fca5a5' : '#bfdbfe') + ';border-radius:6px;padding:3px 10px;font-size:0.8rem;font-weight:600;">' +
                        s.nome +
                        (lowEnd ? ' <i class="ph ph-warning" style="color:#ef4444;font-size:0.78rem;"></i>' : '') +
                        '</span>';
                }

                // Separador entre linhas do mesmo produto
                const borderTop = primeiraLinha ? '' : 'border-top:1px dashed #e2e8f0;';
                const bgRow = lowEnd ? 'background:#fff5f5;' : '';

                const rowSpanAttr = linhasEndereco.length > 1 && primeiraLinha ? ' rowspan="' + linhasEndereco.length + '"' : '';

                rows += '<tr style="border-left:' + rowBorderLeft + ';' + bgRow + borderTop + '">';
                
                // Nome + foto
                if (primeiraLinha) {
                    rows += '<td' + rowSpanAttr + ' style="vertical-align:middle;font-weight:500;' + (linhasEndereco.length > 1 ? 'border-bottom:1px solid #e2e8f0;' : '') + '">' +
                                '<div style="display:flex;align-items:center;gap:12px;">' + fotoHtml + '<div>' + warnIcon + item.nome + '</div></div>' +
                            '</td>';
                            
                    // Categoria
                    rows += '<td' + rowSpanAttr + ' style="vertical-align:middle;' + (linhasEndereco.length > 1 ? 'border-bottom:1px solid #e2e8f0;' : '') + '">' +
                                item.categoria +
                            '</td>';
                }
                
                // Qtd. Atual
                rows += '<td style="vertical-align:middle;">' + qtdCell + '</td>';
                // Min/Máx
                rows += '<td style="vertical-align:middle;">' + minMaxCell + '</td>';
                // Endereço
                rows += '<td style="vertical-align:middle;">' + endCell + '</td>';
                
                // Ações
                if (primeiraLinha) {
                    rows += '<td' + rowSpanAttr + ' style="text-align:right;white-space:nowrap;vertical-align:middle;' + (linhasEndereco.length > 1 ? 'border-bottom:1px solid #e2e8f0;' : '') + '">' +
                                acoesBtns +
                            '</td>';
                }
                rows += '</tr>';
            });
        });

        table.innerHTML = rows;
    } catch (e) {
        console.error(e);
        table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#ef4444;">' + e.message + '</td></tr>';
    }
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

window._renderLinhasEndereco = function() {
    const lista = document.getElementById('estoque-enderecos-lista');
    const vazio = document.getElementById('estoque-enderecos-vazio');
    if (!lista) return;
    const linhas = window._enderecoLinhas;
    if (!linhas.length) {
        lista.innerHTML = '';
        if (vazio) vazio.style.display = 'block';
        
        return;
    }
    if (vazio) vazio.style.display = 'none';
    
    const btnTransferir = document.getElementById('btn-transferir-modal');
    if (btnTransferir) {
        const validos = linhas.filter(l => l.endereco_id);
        btnTransferir.style.display = 'none'; // validos.length > 1 ? 'flex' : 'none';
    }

    lista.innerHTML = linhas.map((linha, idx) => {
        const opcoesEnd = window._estoqueEnderecos.map(e =>
            '<option value="' + e.id + '"' + (e.id === linha.endereco_id ? ' selected' : '') + '>' + e.nome + '</option>'
        ).join('');
        return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;margin-bottom:2px;">' +
            // Linha 1: ícone + select endereço + botão remover
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                '<i class="ph ph-map-pin" style="color:#1d4ed8;flex-shrink:0;font-size:1rem;"></i>' +
                '<select onchange="window._enderecoLinhas[' + idx + '].endereco_id = parseInt(this.value)" ' +
                    'style="flex:1;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.85rem;background:#fff;">' +
                    '<option value="">-- Selecione o endereço --</option>' + opcoesEnd +
                '</select>' +
                '<button type="button" onclick="window._removerLinhaEndereco(' + idx + ')" ' +
                    'style="background:#fee2e2;color:#ef4444;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;flex-shrink:0;" title="Remover">' +
                    '<i class="ph ph-trash"></i>' +
                '</button>' +
            '</div>' +
            // Linha 2: Qtd Atual | Qtd Mínima | Qtd Máxima
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">' +
                '<div>' +
                    '<label style="display:block;font-size:0.72rem;font-weight:600;color:#475569;margin-bottom:2px;">Qtd. Atual</label>' +
                    '<input type="number" min="0" value="' + (linha.quantidade || 0) + '" placeholder="0" ' +
                        'oninput="window._enderecoLinhas[' + idx + '].quantidade = parseInt(this.value) || 0; " ' +
                        'style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.85rem;text-align:center;box-sizing:border-box;">' +
                '</div>' +
                '<div>' +
                    '<label style="display:block;font-size:0.72rem;font-weight:600;color:#f59e0b;margin-bottom:2px;">Qtd. Mínima</label>' +
                    '<input type="number" min="0" value="' + (linha.quantidade_minima || 0) + '" placeholder="0" ' +
                        'oninput="window._enderecoLinhas[' + idx + '].quantidade_minima = parseInt(this.value) || 0;" ' +
                        'style="width:100%;border:1.5px solid #fde68a;border-radius:6px;padding:4px 8px;font-size:0.85rem;text-align:center;background:#fffbeb;box-sizing:border-box;">' +
                '</div>' +
                '<div>' +
                    '<label style="display:block;font-size:0.72rem;font-weight:600;color:#10b981;margin-bottom:2px;">Qtd. Máxima</label>' +
                    '<input type="number" min="0" value="' + (linha.quantidade_maxima || 0) + '" placeholder="0" ' +
                        'oninput="window._enderecoLinhas[' + idx + '].quantidade_maxima = parseInt(this.value) || 0;" ' +
                        'style="width:100%;border:1.5px solid #a7f3d0;border-radius:6px;padding:4px 8px;font-size:0.85rem;text-align:center;background:#f0fdf4;box-sizing:border-box;">' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');
    
};

window._adicionarLinhaEndereco = function() {
    window._enderecoLinhas.push({ endereco_id: null, quantidade: 0, quantidade_minima: 0, quantidade_maxima: 0 });
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
    // Foco no campo nome
    setTimeout(() => { const n = document.getElementById("estoque-nome"); if(n) n.focus(); }, 200);
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
            window._enderecoLinhas = saldos.map(s => ({
                endereco_id:       s.endereco_id,
                quantidade:        s.quantidade,
                quantidade_minima: s.quantidade_minima || 0,
                quantidade_maxima: s.quantidade_maxima || 0
            }));
        }
    } catch(e) { console.warn("[editarEstoque] erro ao carregar saldos:", e.message); }
    // Produto sem endereço: deixar lista vazia com opção de adicionar (não pré-preencher)
    window._renderLinhasEndereco();
    document.getElementById("modal-estoque-title").innerHTML = '<i class="ph ph-pencil-simple"></i> Editar Item de Estoque';
    document.getElementById("modal-estoque").style.display = "flex";
};

// ── Salvar ────────────────────────────────────────────────────────────────────
window.salvarEstoque = async function(e) {
    e.preventDefault();
    const id = document.getElementById("estoque-id").value;
    const linhasValidas = (window._enderecoLinhas || []).filter(l => l.endereco_id);

    // NOVO produto: obrigatório ter pelo menos 1 endereço selecionado
    if (!id && linhasValidas.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Endereço obrigatório',
            text: 'Adicione e selecione pelo menos um endereço para o produto.',
            confirmButtonColor: '#e67700'
        });
        return;
    }

    // Qtd. Atual = soma das quantidades por endereço (ou 0 se sem endereço cadastrado)
    const somaEnderecos = linhasValidas.reduce((acc, l) => acc + (parseInt(l.quantidade) || 0), 0);
    const qtdAtual = somaEnderecos;

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

        // Sincronizar endereços com o novo endpoint que apaga os removidos
        try {
            await fetch(API_URL + "/estoque/" + prodId + "/sync-enderecos", {
                method: "POST",
                headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    enderecos: linhasValidas.map(l => ({
                        endereco_id:       l.endereco_id,
                        quantidade:        l.quantidade,
                        quantidade_minima: l.quantidade_minima || 0,
                        quantidade_maxima: l.quantidade_maxima || 0
                    }))
                })
            });
        } catch(es) { console.warn("[ESTOQUE] erro ao sincronizar enderecos:", es.message); }

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
        table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;">Carregando histórico...</td></tr>';
        const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
        const r = await fetch(API_URL + "/estoque/historico", { headers: { "Authorization": "Bearer " + token } });
        if (!r.ok) throw new Error("Erro ao buscar histórico");
        const data = await r.json();
        if (data.length === 0) {
            table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;">Nenhuma movimentação registrada.</td></tr>';
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
                '<td>' + endHtml + '</td>';
            table.appendChild(tr);
        });
    } catch(err) {
        table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#ef4444;">Erro ao carregar histórico: ' + err.message + '</td></tr>';
    }
};

window._transferirLocal = async function() {
    const validos = window._enderecoLinhas.filter(l => l.endereco_id);
    if (validos.length < 2) return;

    const options = validos.map(l => {
        const end = window._estoqueEnderecos.find(e => e.id == l.endereco_id);
        return '<option value="' + l.endereco_id + '">' + (end ? end.nome : 'Endereço ' + l.endereco_id) + ' (Qtd Atual: ' + (l.quantidade||0) + ')</option>';
    }).join('');

    const { value: vals, isConfirmed } = await Swal.fire({
        target: document.getElementById('modal-estoque') || document.body,
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

// ── Modais Globais de Entrada e Saída ─────────────────────────────────────────
window.abrirModalGlobalMovimentacao = async function(tipo) {
    const isEntrada = tipo === 'entrada';
    const titulo = isEntrada ? '<i class="ph ph-arrow-down-left" style="color:#16a34a"></i> Entrada de Produtos' : '<i class="ph ph-arrow-up-right" style="color:#ef4444"></i> Saída de Produtos';
    const corBtn = isEntrada ? '#16a34a' : '#ef4444';
    const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");

    Swal.fire({
        title: 'Carregando produtos...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    let produtos = [];
    try {
        const r = await fetch(API_URL + "/estoque", { headers: { "Authorization": "Bearer " + token } });
        if (r.ok) produtos = await r.json();
        if (!window._estoqueEnderecos || window._estoqueEnderecos.length === 0) {
            await _carregarEnderecos();
        }
    } catch(e) {
        return Swal.fire('Erro', 'Falha ao carregar produtos', 'error');
    }

    if (produtos.length === 0) {
        return Swal.fire('Atenção', 'Nenhum produto cadastrado no estoque.', 'warning');
    }

    // Ordenar alfabeticamente
    produtos.sort((a,b) => a.nome.localeCompare(b.nome));

    const optsProdutos = produtos.map(p => `<option value="${p.id}">${p.nome} (Total: ${p.quantidade_atual})</option>`).join('');

    let html = `<div style="text-align:left;">
        <div style="margin-bottom:12px;">
            <label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Produto *</label>
            <select id="swal-global-produto" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                <option value="">Selecione o produto</option>
                ${optsProdutos}
            </select>
        </div>
        <div style="margin-bottom:12px;">
            <label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Endereço *</label>
            <select id="swal-global-endereco" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;" disabled>
                <option value="">Selecione um produto primeiro</option>
            </select>
            <small id="swal-global-endereco-hint" style="color:#64748b;font-size:0.75rem;display:none;">Carregando endereços...</small>
        </div>
        <div>
            <label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Quantidade *</label>
            <input type="number" id="swal-global-qtd" min="1" value="1" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.95rem;">
        </div>`;
    
    if (!isEntrada) {
        html += `<div style="margin-top:12px;">
            <label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Motivo *</label>
            <input type="text" id="swal-global-motivo" placeholder="Motivo da saída..." style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
        </div>`;
    }

    html += `</div>`;

    const { value: vals, isConfirmed } = await Swal.fire({
        title: `<b>${titulo}</b>`,
        html: html,
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: corBtn,
        didOpen: () => {
            const selProd = document.getElementById('swal-global-produto');
            const selEnd = document.getElementById('swal-global-endereco');
            const hint = document.getElementById('swal-global-endereco-hint');
            
            selProd.addEventListener('change', async (e) => {
                const pId = e.target.value;
                selEnd.innerHTML = '<option value="">Selecione o endereço</option>';
                if (!pId) {
                    selEnd.disabled = true;
                    return;
                }
                
                selEnd.disabled = true;
                hint.style.display = 'block';

                try {
                    const rs = await fetch(API_URL + "/estoque/" + pId + "/saldo-enderecos", { headers: { "Authorization": "Bearer " + token } });
                    let saldos = [];
                    if (rs.ok) saldos = await rs.json();
                    
                    hint.style.display = 'none';
                    selEnd.disabled = false;
                    
                    let optionsHTML = '<option value="">Selecione o endereço</option>';
                    if (isEntrada) {
                        const ends = window._estoqueEnderecos;
                        optionsHTML += ends.map(end => {
                            const foundSaldo = saldos.find(s => String(s.endereco_id) === String(end.id));
                            const qty = foundSaldo ? foundSaldo.quantidade : 0;
                            return `<option value="${end.id}">${end.nome} (Atual: ${qty})</option>`;
                        }).join('');
                    } else {
                        const avail = saldos.filter(s => s.quantidade > 0);
                        if (avail.length === 0) {
                            optionsHTML = '<option value="">(Sem saldo em nenhum endereço)</option>';
                            selEnd.disabled = true;
                        } else {
                            optionsHTML += avail.map(s => `<option value="${s.endereco_id}">${s.endereco_nome} (Atual: ${s.quantidade})</option>`).join('');
                        }
                    }
                    selEnd.innerHTML = optionsHTML;
                } catch(err) {
                    hint.style.display = 'none';
                }
            });
        },
        preConfirm: () => {
            const pId = document.getElementById('swal-global-produto').value;
            const endId = document.getElementById('swal-global-endereco').value;
            const qtd = parseInt(document.getElementById('swal-global-qtd').value);
            let motivo = '';
            if (!isEntrada) {
                motivo = document.getElementById('swal-global-motivo').value.trim();
                if (!motivo) { Swal.showValidationMessage('Motivo é obrigatório para saída'); return false; }
            }
            if (!pId) { Swal.showValidationMessage('Selecione o produto'); return false; }
            if (!endId) { Swal.showValidationMessage('Selecione o endereço'); return false; }
            if (!qtd || qtd <= 0) { Swal.showValidationMessage('Quantidade inválida'); return false; }
            
            return { pId, endId, qtd, motivo };
        }
    });

    if (isConfirmed && vals) {
        try {
            const body = { 
                quantidade: isEntrada ? vals.qtd : -vals.qtd, 
                endereco_id: parseInt(vals.endId)
            };
            if (!isEntrada) body.motivo = vals.motivo;
            else body.motivo = 'Entrada de produtos';

            const r = await fetch(API_URL + "/estoque/" + vals.pId + "/movimentar", {
                method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!r.ok) { const err = await r.json(); throw new Error(err.error || 'Erro ao processar movimentação'); }
            Swal.fire({ icon: 'success', title: 'Movimentação registrada!', timer: 1500, showConfirmButton: false });
            window.renderEstoqueTable();
        } catch(e) { Swal.fire('Erro', e.message, 'error'); }
    }
};

window.abrirModalGlobalEntrada = () => window.abrirModalGlobalMovimentacao('entrada');
window.abrirModalGlobalSaida = () => window.abrirModalGlobalMovimentacao('saida');
