
function getBadgeColors(nome, isLow) {
    if (isLow) return { bg: '#fef2f2', color: '#ef4444', border: '#fca5a5' };
    const n = (nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (n.includes('terreno')) {
        return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' }; // green
    } else if (n.includes('almoxarifado')) {
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }; // blue
    } else if (n.includes('loja')) {
        return { bg: '#fefce8', color: '#a16207', border: '#fef08a' }; // yellow
    } else if (n.includes('galpao')) {
        return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' }; // purple
    }
    return { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' }; // default slate
}

// frontend/estoque.js

// Cache global de enderecos
window._estoqueEnderecos = [];
window._estoqueCache = {};

async function _carregarEnderecos() {
    try {
        const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
        const res = await fetch(API_URL + "/estoque-enderecos", { headers: { "Authorization": "Bearer " + token } });
        if (res.ok) {
            let todos = await res.json();
            if (typeof window.isTopAdmin !== 'undefined' && !window.isTopAdmin && window.activeUserPerms) {
                const hasAnyEndPerm = Object.keys(window.activeUserPerms).some(k => k.startsWith('estoque-endereco:') && window.activeUserPerms[k]);
                if (hasAnyEndPerm) {
                    todos = todos.filter(end => window.activeUserPerms['estoque-endereco:' + end.id]);
                }
            }
            window._estoqueEnderecos = todos;
        }
    } catch (e) { console.warn("[ESTOQUE] Erro ao carregar enderecos:", e.message); }
}

// ── Rua do endereço Almoxarifado (A a Z) ─────────────────────────────────────
window._estNormTxt = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
window._ehAlmoxarifadoNome = nome => window._estNormTxt(nome).includes('almoxarifado');
window._ehAlmoxarifado = function(endId) {
    const e = (window._estoqueEnderecos || []).find(x => String(x.id) === String(endId));
    return !!e && window._ehAlmoxarifadoNome(e.nome);
};
window._normalizarRuaLetra = function(raw) {
    const v = String(raw || '').trim().toUpperCase();
    if (/^[A-Z]$/.test(v)) return v;
    const n = parseInt(v, 10);
    if (n >= 1 && n <= 26) return String.fromCharCode(64 + n);
    return '';
};
// Select "Rua" exibido ao lado direito do endereço (somente quando o endereço é Almoxarifado)
window._ruaSelectHtml = function(idx, linha, prefixo) {
    const alm = window._ehAlmoxarifado(linha.endereco_id);
    const rAtual = window._normalizarRuaLetra(linha.rua);
    if (linha.rua && rAtual) linha.rua = rAtual;
    let opts = '<option value="">Rua</option>';
    for (let i = 0; i < 26; i++) {
        const L = String.fromCharCode(65 + i);
        opts += '<option value="' + L + '"' + (rAtual === L ? ' selected' : '') + '>Rua ' + L + '</option>';
    }
    return '<select id="estoque-rua-' + prefixo + idx + '" title="Rua do almoxarifado" onchange="window._enderecoLinhas[' + idx + '].rua = this.value" ' +
        'style="width:96px;flex-shrink:0;border:1.5px solid #fed7aa;border-radius:6px;padding:6px 8px;font-size:0.84rem;background:#fff7ed;color:#9a3412;font-weight:700;display:' + (alm ? 'block' : 'none') + ';">' + opts + '</select>';
};
window._onEnderecoChange = function(idx, val, prefixo) {
    const l = (window._enderecoLinhas || [])[idx];
    if (!l) return;
    l.endereco_id = parseInt(val, 10) || null;
    const alm = window._ehAlmoxarifado(l.endereco_id);
    if (!alm) l.rua = '';
    const sel = document.getElementById('estoque-rua-' + prefixo + idx);
    if (sel) { sel.style.display = alm ? 'block' : 'none'; sel.value = alm ? window._normalizarRuaLetra(l.rua) : ''; }
};
// Nome do endereço com letra da rua do almoxarifado (ex.: "Almoxarifado - A")
window._nomeEnderecoComRua = function(s) {
    const r = s && s.rua ? window._normalizarRuaLetra(s.rua) : '';
    const nome = s && s.nome ? s.nome : '';
    return nome + (r ? ' - ' + r : '');
};
window._ruaBadgeHtml = function() { return ''; };

window.abrirDropdownEnderecoEstoque = function() {
    const dropdown = document.getElementById('filtro-estoque-endereco-dropdown');
    if (!dropdown) return;
    const willOpen = dropdown.style.display !== 'block';
    dropdown.style.display = willOpen ? 'block' : 'none';
    if (willOpen) {
        const inp = document.getElementById('filtro-estoque-end-busca');
        if (inp) {
            inp.value = '';
            window.filtrarOpcoesEnderecoEstoque('');
            setTimeout(() => inp.focus(), 30);
        }
    }
};

window.filtrarOpcoesEnderecoEstoque = function(texto) {
    const t = String(texto || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const items = document.querySelectorAll('#filtro-estoque-endereco-dropdown .filtro-estoque-end-item');
    const todosLbl = document.getElementById('filtro-estoque-end-todos-label');
    const vazioEl = document.getElementById('filtro-estoque-end-vazio');
    if (todosLbl) todosLbl.style.display = t ? 'none' : 'flex';
    let visiveis = 0;
    items.forEach(lbl => {
        const match = !t || (lbl.dataset.end || '').includes(t);
        lbl.style.display = match ? 'flex' : 'none';
        if (match) visiveis++;
    });
    if (vazioEl) vazioEl.style.display = visiveis === 0 ? 'block' : 'none';
};

// ── TABELA PRINCIPAL ──────────────────────────────────────────────────────────

window.toggleTodosEnderecosFiltro = function(cbTodos) {
    const checkboxes = document.querySelectorAll('.filtro-estoque-end-cb');
    checkboxes.forEach(cb => cb.checked = false);
    cbTodos.checked = true; // Força "Todos" a ficar marcado quando clicado sozinho
    window.updateEnderecoFiltroText();
    window.renderEstoqueTable();
};

window.updateEnderecoFiltroText = function() {
    const checkboxes = document.querySelectorAll('.filtro-estoque-end-cb:checked');
    const todosCb = document.querySelector('#filtro-estoque-endereco-dropdown input[value=""]');
    const textEl = document.getElementById("filtro-estoque-endereco-text");
    if (!textEl) return;
    
    if (checkboxes.length === 0) {
        if(todosCb) todosCb.checked = true;
        textEl.textContent = "Todos";
    } else {
        if(todosCb) todosCb.checked = false;
        if (checkboxes.length === 1) {
            textEl.textContent = checkboxes[0].parentNode.textContent.trim();
        } else {
            textEl.textContent = `${checkboxes.length} selecionados`;
        }
    }
};

const _CATEGORIAS_ESTOQUE_LISTA = [
    'Automotivo',
    'Copa',
    'Descartáveis',
    'Elétrica',
    'Embalagens',
    'EPI',
    'Ferragens e Fixadores',
    'Ferramentas',
    'Hidráulica',
    'Informática e Eletrônicos',
    'Itens de Escritório',
    'Limpeza e Higiene',
    'Lubrificantes e Fluidos',
    'Outros',
    'Peças para Sanitários/Equipamentos',
    'Pets',
    'Pintura e Acabamento',
    'Pneus e Borracharia',
    'Produtos Químicos',
    'Uniforme',
    'Utilidades Gerais'
];

function _popularDropdownCategoriasEstoque() {
    const opcoesContainer = document.getElementById('filtro-estoque-cat-opcoes');
    if (!opcoesContainer || opcoesContainer.dataset.populated === 'true') return;
    opcoesContainer.dataset.populated = 'true';
    const sortedCats = _CATEGORIAS_ESTOQUE_LISTA.slice().sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    opcoesContainer.innerHTML = sortedCats.map(cat =>
        '<label class="filtro-estoque-cat-item" data-cat="' + cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + '" ' +
            'style="display:flex; align-items:center; gap:8px; padding:6px; cursor:pointer; font-size:0.85rem; color:#334155; border-radius:4px;" ' +
            'onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'transparent\'">' +
            '<input type="checkbox" value="' + cat + '" class="filtro-estoque-cat-cb" onchange="window.updateCategoriaFiltroText(); window.renderEstoqueTable()"> ' +
            '<span>' + cat + '</span>' +
        '</label>'
    ).join('') + '<div id="filtro-estoque-cat-vazio" style="display:none;padding:8px;color:#94a3b8;font-size:0.82rem;text-align:center;">Nenhuma categoria encontrada</div>';
}

window.abrirDropdownCategoriaEstoque = function() {
    _popularDropdownCategoriasEstoque();
    const dropdown = document.getElementById('filtro-estoque-cat-dropdown');
    if (!dropdown) return;
    const willOpen = dropdown.style.display !== 'block';
    dropdown.style.display = willOpen ? 'block' : 'none';
    if (willOpen) {
        const inp = document.getElementById('filtro-estoque-cat-busca');
        if (inp) {
            inp.value = '';
            window.filtrarOpcoesCategoriaEstoque('');
            setTimeout(() => inp.focus(), 30);
        }
    }
};

window.filtrarOpcoesCategoriaEstoque = function(texto) {
    _popularDropdownCategoriasEstoque();
    const t = String(texto || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const items = document.querySelectorAll('#filtro-estoque-cat-opcoes .filtro-estoque-cat-item');
    const todasLbl = document.getElementById('filtro-estoque-cat-todas-label');
    const vazioEl = document.getElementById('filtro-estoque-cat-vazio');
    if (todasLbl) todasLbl.style.display = t ? 'none' : 'flex';
    let visiveis = 0;
    items.forEach(lbl => {
        const match = !t || (lbl.dataset.cat || '').includes(t);
        lbl.style.display = match ? 'flex' : 'none';
        if (match) visiveis++;
    });
    if (vazioEl) vazioEl.style.display = visiveis === 0 ? 'block' : 'none';
};

window.toggleTodasCategoriasFiltro = function(cbTodas) {
    const checkboxes = document.querySelectorAll('.filtro-estoque-cat-cb');
    checkboxes.forEach(cb => { cb.checked = false; });
    cbTodas.checked = true;
    window.updateCategoriaFiltroText();
    window.renderEstoqueTable();
};

window.updateCategoriaFiltroText = function() {
    const checkboxes = document.querySelectorAll('.filtro-estoque-cat-cb:checked');
    const todasCb = document.getElementById('filtro-estoque-cat-todas-cb');
    const textEl = document.getElementById('filtro-estoque-cat-text');
    const hiddenEl = document.getElementById('filtro-estoque-cat');
    if (!textEl) return;

    if (checkboxes.length === 0) {
        if (todasCb) todasCb.checked = true;
        textEl.textContent = 'Todas';
        if (hiddenEl) hiddenEl.value = '';
    } else {
        if (todasCb) todasCb.checked = false;
        if (checkboxes.length === 1) {
            textEl.textContent = checkboxes[0].value;
            if (hiddenEl) hiddenEl.value = checkboxes[0].value;
        } else {
            textEl.textContent = checkboxes.length + ' categorias selecionadas';
            if (hiddenEl) hiddenEl.value = '';
        }
    }
};

document.addEventListener('click', (e) => {
    const btn = document.getElementById("filtro-estoque-endereco-btn");
    const dropdown = document.getElementById("filtro-estoque-endereco-dropdown");
    if (btn && dropdown) {
        if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    }
    const catBtn = document.getElementById("filtro-estoque-cat-btn");
    const catDropdown = document.getElementById("filtro-estoque-cat-dropdown");
    if (catBtn && catDropdown) {
        if (!catBtn.contains(e.target) && !catDropdown.contains(e.target)) {
            catDropdown.style.display = 'none';
        }
    }
    const modalCatWrap = document.getElementById("estoque-cat-modal-wrap");
    const modalCatDd = document.getElementById("estoque-cat-modal-dd");
    if (modalCatWrap && modalCatDd && !modalCatWrap.contains(e.target)) {
        modalCatDd.style.display = 'none';
    }
});

// ── Seletor pesquisável de Categoria dentro do Modal Adicionar/Editar Estoque ──
function _normCatModalEstoque(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
function _escCatModalEstoque(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function _renderOpcoesCatModalEstoque(filtro) {
    const dd = document.getElementById('estoque-cat-modal-dd');
    if (!dd) return;
    const h = document.getElementById('estoque-cat');
    const atual = (h && h.value) || 'EPI';
    const catsList = _CATEGORIAS_ESTOQUE_LISTA.slice().sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    if (atual && !catsList.includes(atual)) catsList.unshift(atual);
    const f = _normCatModalEstoque(filtro);
    const filtradas = f ? catsList.filter(c => _normCatModalEstoque(c).includes(f)) : catsList;
    if (!filtradas.length) {
        dd.innerHTML = '<div style="padding:8px 10px;color:#94a3b8;font-size:0.82rem;text-align:center;">Nenhuma categoria encontrada</div>';
        return;
    }
    dd.innerHTML = filtradas.map(c => {
        const sel = c === atual;
        return '<div class="estoque-cat-modal-opt" data-cat="' + _escCatModalEstoque(c) + '" onclick="window.selecionarCatModalEstoque(this.dataset.cat)" ' +
            'onmouseover="this.style.background=\'#eff6ff\'" onmouseout="this.style.background=\'' + (sel ? '#f1f5f9' : 'transparent') + '\'" ' +
            'style="padding:7px 10px;cursor:pointer;font-size:0.85rem;color:' + (sel ? '#1d4ed8' : '#334155') + ';font-weight:' + (sel ? '700' : '500') + ';background:' + (sel ? '#f1f5f9' : 'transparent') + ';border-radius:6px;display:flex;justify-content:space-between;align-items:center;">' +
            '<span>' + _escCatModalEstoque(c) + '</span>' + (sel ? '<i class="ph ph-check" style="color:#1d4ed8;"></i>' : '') + '</div>';
    }).join('');
}
window.abrirDropdownCatModalEstoque = function(mostrarTodas) {
    const dd = document.getElementById('estoque-cat-modal-dd');
    const inp = document.getElementById('estoque-cat-input');
    if (!dd) return;
    _renderOpcoesCatModalEstoque(mostrarTodas ? '' : (inp ? inp.value : ''));
    dd.style.display = 'block';
};
window.toggleDropdownCatModalEstoque = function() {
    const dd = document.getElementById('estoque-cat-modal-dd');
    if (!dd) return;
    if (dd.style.display === 'block') dd.style.display = 'none';
    else { window.abrirDropdownCatModalEstoque(true); const inp = document.getElementById('estoque-cat-input'); if (inp) inp.focus(); }
};
window.filtrarDropdownCatModalEstoque = function(val) {
    _renderOpcoesCatModalEstoque(val);
    const dd = document.getElementById('estoque-cat-modal-dd');
    if (dd) dd.style.display = 'block';
    const vTrim = String(val || '').trim();
    const matchExato = _CATEGORIAS_ESTOQUE_LISTA.find(c => _normCatModalEstoque(c) === _normCatModalEstoque(vTrim));
    const h = document.getElementById('estoque-cat');
    if (matchExato) {
        if (h) h.value = matchExato;
        window.togglePlacasEstoque(matchExato);
    } else if (vTrim) {
        if (h) h.value = vTrim;
        window.togglePlacasEstoque(vTrim);
    }
};
window.selecionarCatModalEstoque = function(cat) {
    const inp = document.getElementById('estoque-cat-input');
    const h = document.getElementById('estoque-cat');
    const dd = document.getElementById('estoque-cat-modal-dd');
    if (inp) inp.value = cat;
    if (h) h.value = cat;
    if (dd) dd.style.display = 'none';
    window.togglePlacasEstoque(cat);
};
window.enterDropdownCatModalEstoque = function() {
    const first = document.querySelector('#estoque-cat-modal-dd .estoque-cat-modal-opt');
    if (first && first.dataset.cat) window.selecionarCatModalEstoque(first.dataset.cat);
};
window.renderEstoqueTable = async function(preserveScroll = false) {
    const table = document.getElementById("table-estoque");
    if (!table) return;
    
    const lastScrollY = window.scrollY;
    
    try {
        if (!preserveScroll) {
            table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;">Carregando...</td></tr>';
        }
        _popularDropdownCategoriasEstoque();
        const dept   = document.getElementById("filtro-estoque-dept").value;
        const selectedCategorias = Array.from(document.querySelectorAll('.filtro-estoque-cat-cb:checked')).map(cb => cb.value);
        const statusEl = document.getElementById("filtro-estoque-status");
        const status = statusEl ? statusEl.value : "";
        const nome   = document.getElementById("filtro-estoque-nome").value.toLowerCase();
        const token  = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
        let url = API_URL + "/estoque?";
        if (dept) url += "departamento=" + encodeURIComponent(dept) + "&";
        if (selectedCategorias.length === 1) url += "categoria=" + encodeURIComponent(selectedCategorias[0]) + "&";

        const headers = { "Authorization": "Bearer " + token };
        const [r1, r2] = await Promise.all([
            fetch(url, { headers }),
            fetch(API_URL + "/estoque-saldos", { headers })
        ]);
        if (!r1.ok) throw new Error("Erro ao buscar estoque");
        let data = await r1.json();
        const saldosMap = r2.ok ? await r2.json() : {};

        if (window._estoqueEnderecos.length === 0) await _carregarEnderecos();

        const endContainer = document.getElementById("filtro-estoque-endereco-dropdown");
        if (endContainer && !endContainer.dataset.populated && window._estoqueEnderecos.length > 0) {
            endContainer.dataset.populated = "true";
            let html = `<div style="position: sticky; top: -0.5rem; background: #fff; padding: 4px 0 6px 0; border-bottom: 1px solid #f1f5f9; margin-bottom: 4px; z-index: 2;">
                <input type="text" id="filtro-estoque-end-busca" placeholder="Digite para pesquisar endereço..." autocomplete="off"
                    oninput="window.filtrarOpcoesEnderecoEstoque(this.value)"
                    style="width: 100%; padding: 6px 10px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-size: 0.83rem; box-sizing: border-box; outline: none;">
            </div>
            <label id="filtro-estoque-end-todos-label" style="display:flex; align-items:center; gap:8px; padding:6px; cursor:pointer; font-size:0.85rem; color:#334155; border-radius:4px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                <input type="checkbox" value="" checked onchange="window.toggleTodosEnderecosFiltro(this)"> Todos
            </label>`;
            window._estoqueEnderecos.forEach(end => {
                const endNorm = String(end.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                html += `<label class="filtro-estoque-end-item" data-end="${endNorm}" style="display:flex; align-items:center; gap:8px; padding:6px; cursor:pointer; font-size:0.85rem; color:#334155; border-radius:4px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                    <input type="checkbox" value="${end.id}" class="filtro-estoque-end-cb" onchange="window.updateEnderecoFiltroText(); window.renderEstoqueTable()"> <span>${end.nome}</span>
                </label>`;
            });
            html += `<div id="filtro-estoque-end-vazio" style="display:none;padding:8px;color:#94a3b8;font-size:0.82rem;text-align:center;">Nenhum endereço encontrado</div>`;
            endContainer.innerHTML = html;
        }

        let selectedEnderecos = [];
        if (endContainer) {
            const checkboxes = endContainer.querySelectorAll('.filtro-estoque-end-cb:checked');
            selectedEnderecos = Array.from(checkboxes).map(cb => cb.value);
        }

        if (selectedCategorias.length > 0) {
            data = data.filter(i => selectedCategorias.includes(String(i.categoria || '').trim()));
        }
        if (nome) data = data.filter(i => i.nome.toLowerCase().includes(nome));
        const veicEl = document.getElementById("filtro-estoque-placa");
        const veicFiltro = veicEl ? String(veicEl.value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() : '';
        if (veicFiltro) {
            if (!window._veiculosParaEstoque) {
                try {
                    const rVeic = await fetch(API_URL + "/frota/veiculos", { headers });
                    if (rVeic.ok) {
                        const listV = await rVeic.json();
                        window._veiculosParaEstoque = [{ placa: 'Outros' }].concat((listV || []).slice().sort((a, b) => {
                            const ta = String(a.tipo_veiculo || '\uffff').trim();
                            const tb = String(b.tipo_veiculo || '\uffff').trim();
                            const ct = ta.localeCompare(tb, 'pt-BR', { sensitivity: 'base' });
                            if (ct !== 0) return ct;
                            return String(a.placa || '').localeCompare(String(b.placa || ''), 'pt-BR', { sensitivity: 'base' });
                        }));
                    }
                } catch (_) {}
            }
            const veicMap = { outros: 'outros' };
            (window._veiculosParaEstoque || []).forEach(v => {
                if (!v || !v.placa) return;
                const pk = String(v.placa).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                veicMap[pk] = (v.placa + ' ' + (v.marca_modelo_versao || '') + ' ' + (v.tipo_veiculo || '')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            });
            const termosVeic = veicFiltro.split(/\s+/).filter(Boolean);
            data = data.filter(i => {
                const placas = String(i.placas_vinculadas || '').split(',').map(s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()).filter(Boolean);
                if (!placas.length) return false;
                return placas.some(p => {
                    const infoV = veicMap[p] || p;
                    return termosVeic.every(t => infoV.includes(t));
                });
            });
        }
        if (selectedEnderecos.length > 0) {
            data = data.filter(i => {
                const saldos = saldosMap[i.id] || [];
                return saldos.some(s => selectedEnderecos.includes(String(s.endereco_id)));
            });
        }

        // Filtra por permissões de endereço
        if (typeof window.isTopAdmin !== 'undefined' && !window.isTopAdmin && window.activeUserPerms) {
            const hasAnyEndPerm = Object.keys(window.activeUserPerms).some(k => k.startsWith('estoque-endereco:') && window.activeUserPerms[k]);
            if (hasAnyEndPerm) {
                data = data.filter(item => {
                    const saldos = saldosMap[item.id] || [];
                    if (saldos.length > 0) {
                        const saldosPermitidos = saldos.filter(s => window.activeUserPerms['estoque-endereco:' + s.endereco_id]);
                        if (saldosPermitidos.length === 0) return false; // Hide completely Se não tiver nenhum endereço permitido
                    }
                    return true;
                });
            }
        }

        if (status === "minimo") data = data.filter(i => {
            const saldos = saldosMap[i.id] || [];
            if (saldos.length > 0) return saldos.some(s => (parseInt(s.quantidade)||0) < (parseInt(s.quantidade_minima)||0) || (parseInt(s.quantidade)||0) < (parseInt(i.quantidade_minima)||0));
            return (parseInt(i.quantidade_atual)||0) < (parseInt(i.quantidade_minima)||0);
        });
        
        const tipoEl = document.getElementById("filtro-estoque-tipo");
        const tipoFilter = tipoEl ? tipoEl.value : "";
        if (tipoFilter) {
            data = data.filter(i => {
                const saldos = saldosMap[i.id] || [];
                if (tipoFilter === "sem_tipo") {
                    if (saldos.length === 0) return true;
                    return saldos.every(s => !s.tipo_estoque || s.tipo_estoque === 'matriz');
                } else {
                    // tipoFilter: 'reposicao' ou 'compra'
                    const tipoEsperado = tipoFilter === 'reposicao' ? 'reposicao' : 'matriz';
                    return saldos.some(s => (s.tipo_estoque || 'matriz') === tipoEsperado);
                }
            });
        }

        if (data.length === 0) {
            table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;">Nenhum item encontrado.</td></tr>';
            return;
        }

        window._estoqueCache = {};
        data.forEach(item => { window._estoqueCache[item.id] = item; });

        if (typeof window._ordemTamanhoEstoque !== 'function') {
            window._ordemTamanhoEstoque = function(tam) {
                const t = String(tam || '').trim().toUpperCase();
                const map = {
                    'PP': 1, 'P': 2, 'M': 3, 'G': 4, 'GG': 5,
                    'XG': 6, 'EG': 7, 'EXG': 8, 'XGG': 9, 'XXG': 10, 'XXGG': 11, 'EGG': 12, 'EXGG': 13,
                    'G1': 14, 'G2': 15, 'G3': 16, 'G4': 17, 'UNICO': 18, 'ÚNICO': 18
                };
                if (map[t] !== undefined) return map[t];
                const num = parseInt(t, 10);
                if (!isNaN(num)) return 100 + num;
                return 900;
            };
        }

        if (!window._estoqueProdutosExpandidos) {
            window._estoqueProdutosExpandidos = {};
        }

        if (typeof window.toggleDetalhesTamanhosEstoque !== 'function') {
            window.toggleDetalhesTamanhosEstoque = function(prodId) {
                const isOpen = !!window._estoqueProdutosExpandidos[prodId];
                window._estoqueProdutosExpandidos[prodId] = !isOpen;
                const rowsEl = document.querySelectorAll('.estoque-detalhe-tam-' + prodId);
                rowsEl.forEach(function(r) {
                    r.style.display = !isOpen ? '' : 'none';
                });
                const icon = document.getElementById('estoque-prod-arrow-' + prodId);
                if (icon) {
                    icon.style.transform = !isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
                }
            };
        }

        if (typeof window.ampliarFotoEstoque !== 'function') {
            window.ampliarFotoEstoque = function(src, titulo) {
                if (!src) return;
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: titulo || 'Foto do Produto',
                        html: '<div style="display:flex;align-items:center;justify-content:center;padding:8px;"><img src="' + src + '" style="max-width:100%;max-height:75vh;border-radius:10px;object-fit:contain;box-shadow:0 4px 16px rgba(0,0,0,0.12);"></div>',
                        width: 'auto',
                        showConfirmButton: false,
                        showCloseButton: true,
                        backdrop: 'rgba(15, 23, 42, 0.75)'
                    });
                }
            };
        }

        if (typeof window.ordenarTabelaEstoque !== 'function') {
            window._estoqueSortState = { col: 'nome', asc: true };
            window.ordenarTabelaEstoque = function(col, thEl) {
                if (!window._estoqueSortState) window._estoqueSortState = { col: 'nome', asc: true };
                if (window._estoqueSortState.col === col) {
                    window._estoqueSortState.asc = !window._estoqueSortState.asc;
                } else {
                    window._estoqueSortState.col = col;
                    window._estoqueSortState.asc = true;
                }
                document.querySelectorAll('#thead-estoque-row .sort-icon-estoque').forEach(function(ic) {
                    ic.className = 'ph ph-arrows-down-up sort-icon-estoque';
                    ic.style.color = '#94a3b8';
                });
                if (thEl) {
                    const ic = thEl.querySelector('.sort-icon-estoque');
                    if (ic) {
                        ic.className = 'ph ' + (window._estoqueSortState.asc ? 'ph-arrow-up' : 'ph-arrow-down') + ' sort-icon-estoque';
                        ic.style.color = '#1d4ed8';
                    }
                }
                window.renderEstoqueTable(true);
            };
        }

        const sortState = window._estoqueSortState || { col: 'nome', asc: true };
        const dir = sortState.asc ? 1 : -1;

        function _getQtdTotalItem(it) {
            const sList = saldosMap[it.id] || [];
            if (sList.length > 0) return sList.reduce((acc, s) => acc + (parseInt(s.quantidade) || 0), 0);
            return parseInt(it.quantidade_atual) || 0;
        }
        function _getMinItem(it) {
            const sList = saldosMap[it.id] || [];
            if (sList.length > 0) return Math.min.apply(null, sList.map(s => parseInt(s.quantidade_minima) || 0));
            return parseInt(it.quantidade_minima) || 0;
        }
        function _getEndNomeItem(it) {
            const sList = saldosMap[it.id] || [];
            return sList.length > 0 ? String(sList[0].nome || '') : '';
        }
        function _getTipoItem(it) {
            const sList = saldosMap[it.id] || [];
            if (sList.some(s => (s.tipo_estoque || 'matriz') !== 'reposicao')) return 'matriz';
            return sList.length > 0 ? String(sList[0].tipo_estoque || 'matriz') : 'matriz';
        }
        function _getOrdemMatrizItem(it) {
            const sList = saldosMap[it.id] || [];
            if (sList.length === 0) return 0;
            return sList.some(s => (s.tipo_estoque || 'matriz') !== 'reposicao') ? 0 : 1;
        }

        // Ordenar mantendo o agrupamento por Categoria e aplicando a coluna clicada dentro de cada categoria
        data.sort(function(a, b) {
            const catA = String(a.categoria || 'Sem Categoria').trim();
            const catB = String(b.categoria || 'Sem Categoria').trim();
            const cmpCat = catA.localeCompare(catB, 'pt-BR', { sensitivity: 'base' });
            if (cmpCat !== 0) {
                return sortState.col === 'categoria' ? (cmpCat * dir) : cmpCat;
            }
            if (sortState.col === 'qtd') {
                const diff = _getQtdTotalItem(a) - _getQtdTotalItem(b);
                if (diff !== 0) return diff * dir;
            } else if (sortState.col === 'minmax') {
                const diff = _getMinItem(a) - _getMinItem(b);
                if (diff !== 0) return diff * dir;
            } else if (sortState.col === 'endereco') {
                const cmpE = _getEndNomeItem(a).localeCompare(_getEndNomeItem(b), 'pt-BR', { sensitivity: 'base' });
                if (cmpE !== 0) return cmpE * dir;
            } else if (sortState.col === 'tipo') {
                const cmpT = _getTipoItem(a).localeCompare(_getTipoItem(b), 'pt-BR', { sensitivity: 'base' });
                if (cmpT !== 0) return cmpT * dir;
            }
            const ordMat = _getOrdemMatrizItem(a) - _getOrdemMatrizItem(b);
            if (ordMat !== 0) return ordMat;
            const cmpNome = String(a.nome || '').trim().localeCompare(String(b.nome || '').trim(), 'pt-BR', { sensitivity: 'base', numeric: true });
            return sortState.col === 'nome' ? (cmpNome * dir) : cmpNome;
        });

        // Contar itens por categoria para exibir no cabeçalho separador
        const contagemPorCategoria = {};
        data.forEach(function(item) {
            const cat = String(item.categoria || 'Sem Categoria').trim();
            contagemPorCategoria[cat] = (contagemPorCategoria[cat] || 0) + 1;
        });

        let rows = '';
        let ultimaCategoria = null;
        data.forEach(item => {
            const catAtual = String(item.categoria || 'Sem Categoria').trim();
            if (catAtual !== ultimaCategoria) {
                ultimaCategoria = catAtual;
                const qtdItensCat = contagemPorCategoria[catAtual] || 0;
                rows += '<tr style="background:#f1f5f9;border-top:2px solid #cbd5e1;border-bottom:1px solid #cbd5e1;">' +
                    '<td colspan="7" style="padding:8px 14px;font-weight:700;font-size:0.85rem;color:#1e293b;letter-spacing:0.02em;text-transform:uppercase;">' +
                        '<div style="display:flex;align-items:center;gap:8px;">' +
                            '<i class="ph ph-folders" style="color:#2563eb;font-size:1.05rem;"></i>' +
                            '<span>' + catAtual + '</span>' +
                            '<span style="background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;padding:1px 8px;font-size:0.72rem;font-weight:700;text-transform:none;">' +
                                qtdItensCat + (qtdItensCat === 1 ? ' produto' : ' produtos') +
                            '</span>' +
                        '</div>' +
                    '</td>' +
                '</tr>';
            }

            let saldos = (saldosMap[item.id] || []).slice().sort(function(a, b) {
                const ta = (a && a.tipo_estoque === 'reposicao') ? 1 : 0;
                const tb = (b && b.tipo_estoque === 'reposicao') ? 1 : 0;
                if (ta !== tb) return ta - tb;
                return String((a && a.nome) || '').localeCompare(String((b && b.nome) || ''), 'pt-BR', { sensitivity: 'base' });
            });
            if (typeof window.isTopAdmin !== 'undefined' && !window.isTopAdmin && window.activeUserPerms) {
                const hasAnyEndPerm = Object.keys(window.activeUserPerms).some(k => k.startsWith('estoque-endereco:') && window.activeUserPerms[k]);
                if (hasAnyEndPerm) {
                    saldos = saldos.filter(s => window.activeUserPerms['estoque-endereco:' + s.endereco_id]);
                }
            }

            const hasSizes = !!(item.tem_tamanho || saldos.some(s => s.tamanho && String(s.tamanho).trim() !== ''));

            // ── Verificar se está no mínimo (usa min/max por endereço/tamanho) ──
            let isLow = false;
            if (saldos.length > 0) {
                isLow = saldos.some(s => {
                    const minRef = (parseInt(s.quantidade_minima) > 0) ? parseInt(s.quantidade_minima) : parseInt(item.quantidade_minima) || 0;
                    return minRef > 0 && (parseInt(s.quantidade)||0) < minRef;
                });
            } else {
                isLow = (parseInt(item.quantidade_minima) > 0) && (parseInt(item.quantidade_atual)||0) < parseInt(item.quantidade_minima);
            }

            const rowBorderLeft = isLow ? '3px solid #ef4444' : '3px solid transparent';

            // ── Foto clicável para ampliar ──
            const fotoSrc = item.foto_url || item.foto_base64 || "";
            const safeItemNome = String(item.nome || 'Produto').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const fotoHtml = fotoSrc
                ? '<img src="' + fotoSrc + '" onclick="event.stopPropagation(); window.ampliarFotoEstoque(this.src, \'' + safeItemNome + '\')" title="Clique para ampliar a foto" style="width:40px;height:40px;min-width:40px;flex-shrink:0;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;cursor:zoom-in;transition:transform 0.15s;" onmouseover="this.style.transform=\'scale(1.08)\'" onmouseout="this.style.transform=\'scale(1)\'">'
                : '<div style="width:40px;height:40px;min-width:40px;flex-shrink:0;border-radius:8px;background:#f1f5f9;border:1px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;"><i class="ph ph-image" style="color:#94a3b8;font-size:1.2rem;"></i></div>';

            const warnIcon = isLow ? '<i class="ph ph-warning-circle" style="color:#ef4444;margin-right:4px;" title="Estoque Mínimo"></i>' : "";

            // ── Botões de ação ──
            const acoesBtns =
                '<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); window.editarEstoque(window._estoqueCache[' + item.id + '])" title="Editar / Gerenciar Tamanhos" style="margin-left:4px;"><i class="ph ph-pencil-simple"></i></button>' +
                '<button class="btn btn-sm" onclick="event.stopPropagation(); window.excluirEstoque(' + item.id + ')" style="background:#fee2e2;color:#ef4444;border:none;margin-left:4px;" title="Excluir"><i class="ph ph-trash"></i></button>';

            // ── CASO 1: PRODUTO COM TAMANHOS (Linha principal com seta + linhas expansíveis por tamanho e endereço) ──
            if (hasSizes) {
                const isOpen = !!window._estoqueProdutosExpandidos[item.id];
                const mapTamEnderecos = {};
                try {
                    const savedTams = JSON.parse(item.tamanhos_lista || '[]');
                    if (Array.isArray(savedTams)) {
                        savedTams.forEach(t => {
                            const tk = String(t || '').trim().toUpperCase();
                            if (tk && !mapTamEnderecos[tk]) mapTamEnderecos[tk] = [];
                        });
                    }
                } catch(e) {}

                let saldosFiltrados = saldos.slice();
                if (selectedEnderecos && selectedEnderecos.length > 0) {
                    saldosFiltrados = saldosFiltrados.filter(s => s && selectedEnderecos.includes(String(s.endereco_id)));
                }
                if (tipoFilter && tipoFilter !== 'sem_tipo') {
                    const tipoEsperado = tipoFilter === 'reposicao' ? 'reposicao' : 'matriz';
                    const filtroAtivo = saldosFiltrados.filter(s => s && (s.tipo_estoque || 'matriz') === tipoEsperado);
                    if (filtroAtivo.length > 0) saldosFiltrados = filtroAtivo;
                }

                saldosFiltrados.forEach(s => {
                    const tk = String(s.tamanho || 'ÚNICO').trim().toUpperCase();
                    if (!mapTamEnderecos[tk]) mapTamEnderecos[tk] = [];
                    mapTamEnderecos[tk].push(s);
                });

                const tamsSorted = Object.keys(mapTamEnderecos).sort((a, b) => window._ordemTamanhoEstoque(a) - window._ordemTamanhoEstoque(b));
                const totalQtdProd = saldosFiltrados.reduce((acc, s) => acc + (parseInt(s.quantidade) || 0), 0);

                // Endereços únicos para resumo na linha principal
                const enderecosUnicosMap = {};
                const tiposUnicosSet = new Set();
                saldosFiltrados.forEach(s => {
                    if (s && s.nome) {
                        const minRef = (parseInt(s.quantidade_minima) > 0) ? parseInt(s.quantidade_minima) : 0;
                        const lowThis = minRef > 0 && (parseInt(s.quantidade) || 0) < minRef;
                        if (!enderecosUnicosMap[s.nome]) enderecosUnicosMap[s.nome] = { nome: s.nome, low: false };
                        if (lowThis) enderecosUnicosMap[s.nome].low = true;
                    }
                    if (s) tiposUnicosSet.add(s.tipo_estoque || 'matriz');
                });

                const resumoEnderecosHtml = Object.values(enderecosUnicosMap).length > 0
                    ? '<div style="display:flex;flex-wrap:wrap;gap:4px;">' + Object.values(enderecosUnicosMap).map(eInfo => {
                        const endColors = getBadgeColors(eInfo.nome, eInfo.low);
                        return '<span style="display:inline-flex;align-items:center;gap:4px;background:' + endColors.bg + ';color:' + endColors.color + ';border:1px solid ' + endColors.border + ';border-radius:6px;padding:3px 8px;font-size:0.7rem;font-weight:600;white-space:nowrap;">' +
                            eInfo.nome + (eInfo.low ? ' <i class="ph ph-warning" style="color:#ef4444;font-size:0.78rem;"></i>' : '') +
                        '</span>';
                    }).join('') + '</div>'
                    : '<span style="color:#94a3b8;font-size:0.78rem;font-style:italic;">Sem endereço</span>';

                const resumoTiposHtml = Array.from(tiposUnicosSet).length > 0
                    ? '<div style="display:flex;flex-wrap:wrap;gap:4px;">' + Array.from(tiposUnicosSet).map(tp =>
                        tp === 'reposicao'
                            ? '<span style="display:inline-flex;align-items:center;gap:2px;background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe;border-radius:6px;padding:2px 8px;font-size:0.72rem;font-weight:600;">🔄 Reposição</span>'
                            : '<span style="display:inline-flex;align-items:center;gap:2px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:2px 8px;font-size:0.72rem;font-weight:600;">🏢 Matriz</span>'
                    ).join('') + '</div>'
                    : '<span style="color:#94a3b8;font-size:0.78rem;">—</span>';

                // Linha Principal do Produto (com Seta)
                rows += '<tr onclick="window.toggleDetalhesTamanhosEstoque(' + item.id + ')" style="cursor:pointer;border-left:' + rowBorderLeft + ';' + (isLow ? 'background:#fff5f5;' : '') + 'transition:background 0.15s;">' +
                    '<td style="vertical-align:middle;font-weight:600;">' +
                        '<div style="display:flex;align-items:center;gap:10px;">' +
                            '<span title="Clique para ver os tamanhos e estoques mínimo/máximo" style="width:26px;height:26px;border-radius:6px;background:#e0e7ff;color:#1d4ed8;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                                '<i id="estoque-prod-arrow-' + item.id + '" class="ph ph-caret-right" style="font-size:0.95rem;transition:transform 0.2s;' + (isOpen ? 'transform:rotate(90deg);' : '') + '"></i>' +
                            '</span>' +
                            fotoHtml +
                            '<div>' +
                                '<div style="display:flex;align-items:center;gap:6px;">' +
                                    '<span>' + warnIcon + item.nome + '</span>' +
                                    '<span style="background:#e2e8f0;color:#475569;border-radius:999px;padding:1px 8px;font-size:0.7rem;font-weight:700;">' + tamsSorted.length + (tamsSorted.length === 1 ? ' tamanho' : ' tamanhos') + '</span>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</td>' +
                    '<td style="vertical-align:middle;">' + (item.categoria || '-') + '</td>' +
                    '<td style="vertical-align:middle;"><span style="font-weight:700;font-size:1rem;color:' + (isLow ? '#ef4444' : '#10b981') + ';">' + totalQtdProd + '</span></td>' +
                    '<td style="vertical-align:middle;white-space:nowrap;"><span style="color:#2563eb;font-size:0.78rem;font-weight:600;">Ver por tamanho ▾</span></td>' +
                    '<td style="vertical-align:middle;">' + resumoEnderecosHtml + '</td>' +
                    '<td style="vertical-align:middle;white-space:nowrap;">' + resumoTiposHtml + '</td>' +
                    '<td style="text-align:right;white-space:nowrap;vertical-align:middle;">' + acoesBtns + '</td>' +
                '</tr>';

                // Linhas Detalhadas de Cada Tamanho e Cada Endereço (exibidas ao clicar na seta)
                tamsSorted.forEach(function(tam) {
                    const endsDoTam = mapTamEnderecos[tam] && mapTamEnderecos[tam].length > 0 ? mapTamEnderecos[tam] : [null];
                    const tamLow = endsDoTam.some(function(s) {
                        if (!s) return false;
                        const minRef = (parseInt(s.quantidade_minima) > 0) ? parseInt(s.quantidade_minima) : 0;
                        return minRef > 0 && (parseInt(s.quantidade) || 0) < minRef;
                    });

                    endsDoTam.forEach(function(s, idxEnd) {
                        const primeiraLinhaTam = idxEnd === 0;
                        const rowSpanTam = endsDoTam.length > 1 && primeiraLinhaTam ? ' rowspan="' + endsDoTam.length + '"' : '';
                        const minRef = s ? (parseInt(s.quantidade_minima) || 0) : 0;
                        const maxRef = s ? (parseInt(s.quantidade_maxima) || 0) : 0;
                        const qtdEnd = s ? (parseInt(s.quantidade) || 0) : 0;
                        const lowEnd = s ? (minRef > 0 && qtdEnd < minRef) : false;

                        let qtdCellTam = !s
                            ? '<span style="color:#94a3b8;font-style:italic;">0</span>'
                            : '<span style="font-weight:700;font-size:0.95rem;color:' + (lowEnd ? '#ef4444' : '#10b981') + ';">' + qtdEnd + '</span>';

                        let minMaxCellTam = '<span style="color:#94a3b8;font-size:0.78rem;">—</span>';
                        if (s && (minRef > 0 || maxRef > 0)) {
                            const parts = [];
                            if (minRef > 0) parts.push('<span style="white-space:nowrap;color:#64748b;font-size:0.8rem;">min ' + minRef + '</span>');
                            if (maxRef > 0) parts.push('<span style="white-space:nowrap;color:#64748b;font-size:0.8rem;">max ' + maxRef + '</span>');
                            minMaxCellTam = '<div style="display:flex;align-items:center;gap:6px;white-space:nowrap;">' + parts.join('<span style="color:#cbd5e1;">|</span>') + '</div>';
                        }

                        let endCellTam = '<span style="color:#94a3b8;font-size:0.78rem;font-style:italic;">Sem endereço</span>';
                        let tipoCellTam = '<span style="color:#94a3b8;font-size:0.78rem;">—</span>';
                        if (s) {
                            const tipoEstoque = s.tipo_estoque || 'matriz';
                            tipoCellTam = tipoEstoque === 'reposicao'
                                ? '<span style="display:inline-flex;align-items:center;gap:2px;background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe;border-radius:6px;padding:2px 8px;font-size:0.72rem;font-weight:600;">🔄 Reposição</span>'
                                : '<span style="display:inline-flex;align-items:center;gap:2px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:2px 8px;font-size:0.72rem;font-weight:600;">🏢 Matriz</span>';
                            const endColors = getBadgeColors(s.nome, lowEnd);
                            endCellTam = '<span style="display:inline-flex;align-items:center;gap:4px;background:' + endColors.bg + ';color:' + endColors.color + ';border:1px solid ' + endColors.border + ';border-radius:6px;padding:3px 8px;font-size:0.7rem;font-weight:600;white-space:nowrap;">' +
                                window._nomeEnderecoComRua(s) + (lowEnd ? ' <i class="ph ph-warning" style="color:#ef4444;font-size:0.78rem;"></i>' : '') +
                            '</span>';
                        }

                        const bgTamRow = lowEnd ? 'background:#fff1f2;' : 'background:#f8fafc;';
                        const borderTopTam = primeiraLinhaTam ? 'border-top:1px solid #e2e8f0;' : 'border-top:1px dashed #e2e8f0;';

                        rows += '<tr class="estoque-detalhe-tam-' + item.id + '" style="display:' + (isOpen ? '' : 'none') + ';border-left:3px solid ' + (tamLow ? '#ef4444' : '#3b82f6') + ';' + bgTamRow + borderTopTam + '">';
                        if (primeiraLinhaTam) {
                            rows += '<td' + rowSpanTam + ' style="vertical-align:middle;padding-left:48px;">' +
                                '<div style="display:flex;align-items:center;gap:8px;">' +
                                    '<span style="color:#94a3b8;font-size:0.9rem;">↳</span>' +
                                    '<span style="background:' + (tamLow ? '#fef2f2' : '#dbeafe') + ';color:' + (tamLow ? '#dc2626' : '#1e40af') + ';border:1px solid ' + (tamLow ? '#fecaca' : '#93c5fd') + ';border-radius:6px;padding:2px 10px;font-size:0.8rem;font-weight:800;">Tamanho ' + tam + '</span>' +
                                    '<span style="color:#475569;font-size:0.84rem;font-weight:500;">' + item.nome + '</span>' +
                                '</div>' +
                            '</td>';
                            rows += '<td' + rowSpanTam + ' style="vertical-align:middle;color:#64748b;font-size:0.82rem;">Tam. <b>' + tam + '</b></td>';
                        }
                        rows += '<td style="vertical-align:middle;">' + qtdCellTam + '</td>';
                        rows += '<td style="vertical-align:middle;white-space:nowrap;">' + minMaxCellTam + '</td>';
                        rows += '<td style="vertical-align:middle;">' + endCellTam + '</td>';
                        rows += '<td style="vertical-align:middle;white-space:nowrap;">' + tipoCellTam + '</td>';
                        if (primeiraLinhaTam) {
                            rows += '<td' + rowSpanTam + ' style="text-align:right;white-space:nowrap;vertical-align:middle;">' +
                                '<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); window.editarEstoque(window._estoqueCache[' + item.id + '], \'' + tam + '\')" title="Gerenciar Tamanho ' + tam + '" style="font-size:0.75rem;padding:3px 8px;"><i class="ph ph-pencil-simple"></i> Editar</button>' +
                            '</td>';
                        }
                        rows += '</tr>';
                    });
                });
                return;
            }

            // ── CASO 2: PRODUTO SEM TAMANHO (Renderização padrão) ──
            let linhasEndereco = saldos.length > 0 ? saldos : [null];

            if (selectedEnderecos && selectedEnderecos.length > 0) {
                linhasEndereco = linhasEndereco.filter(s => s && selectedEnderecos.includes(String(s.endereco_id)));
            }

            let linhasParaRenderizar = linhasEndereco;
            if (tipoFilter && tipoFilter !== 'sem_tipo') {
                const tipoEsperado = tipoFilter === 'reposicao' ? 'reposicao' : 'matriz';
                const filtroAtivo = linhasEndereco.filter(s => {
                    if (!s) return false;
                    if ((s.tipo_estoque || 'matriz') !== tipoEsperado) return false;
                    const minRef = (parseInt(s.quantidade_minima) > 0) ? parseInt(s.quantidade_minima) : parseInt(item.quantidade_minima) || 0;
                    return minRef > 0 && (parseInt(s.quantidade) || 0) < minRef;
                });
                if (filtroAtivo.length > 0) linhasParaRenderizar = filtroAtivo;
            }

            linhasParaRenderizar.forEach(function(s, idx) {
                const primeiraLinha = idx === 0;

                // Cor/estado deste endereço
                let lowEnd = false;
                if (s) {
                    const minRef = (parseInt(s.quantidade_minima) > 0) ? parseInt(s.quantidade_minima) : parseInt(item.quantidade_minima) || 0;
                    lowEnd = minRef > 0 && (parseInt(s.quantidade)||0) < minRef;
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
                        if (hasMin) parts.push('<span style="white-space:nowrap;color:#64748b;font-size:0.8rem;">min ' + s.quantidade_minima + '</span>');
                        if (hasMax) parts.push('<span style="white-space:nowrap;color:#64748b;font-size:0.8rem;">max ' + s.quantidade_maxima + '</span>');
                        minMaxCell = '<div style="display:flex;align-items:center;gap:6px;white-space:nowrap;">' + parts.join('<span style="color:#cbd5e1;">|</span>') + '</div>';
                    } else {
                        minMaxCell = '<span style="color:#94a3b8;font-size:0.78rem;">—</span>';
                    }
                }

                // Endereço badge
                let endCell;
                let tipoCell;
                if (!s) {
                    endCell = '<span style="color:#94a3b8;font-size:0.78rem;font-style:italic;">Sem endereço</span>';
                    tipoCell = '<span style="color:#94a3b8;font-size:0.78rem;">—</span>';
                } else {
                    const tipoEstoque = s.tipo_estoque || 'matriz';
                    tipoCell = tipoEstoque === 'reposicao'
                        ? '<span style="display:inline-flex;align-items:center;gap:2px;background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe;border-radius:6px;padding:2px 8px;font-size:0.72rem;font-weight:600;">🔄 Reposição</span>'
                        : '<span style="display:inline-flex;align-items:center;gap:2px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:2px 8px;font-size:0.72rem;font-weight:600;">🏢 Matriz</span>';
                    const endColors = getBadgeColors(s.nome, lowEnd);
                    endCell = '<span style="display:inline-flex;align-items:center;gap:4px;background:' + endColors.bg + ';color:' + endColors.color + ';border:1px solid ' + endColors.border + ';border-radius:6px;padding:3px 8px;font-size:0.7rem;font-weight:600;white-space:nowrap;">' +
                        window._nomeEnderecoComRua(s) +
                        (lowEnd ? ' <i class="ph ph-warning" style="color:#ef4444;font-size:0.78rem;"></i>' : '') +
                        '</span>';
                }

                // Separador entre linhas do mesmo produto
                const borderTop = primeiraLinha ? '' : 'border-top:1px dashed #e2e8f0;';
                const bgRow = lowEnd ? 'background:#fff5f5;' : '';

                const rowSpanAttr = linhasParaRenderizar.length > 1 && primeiraLinha ? ' rowspan="' + linhasParaRenderizar.length + '"' : '';

                rows += '<tr style="border-left:' + rowBorderLeft + ';' + bgRow + borderTop + '">';
                
                if (primeiraLinha) {
                    rows += '<td' + rowSpanAttr + ' style="vertical-align:middle;font-weight:500;' + (linhasParaRenderizar.length > 1 ? 'border-bottom:1px solid #e2e8f0;' : '') + '">' +
                                '<div style="display:flex;align-items:center;gap:10px;"><span style="width:26px;height:26px;display:inline-flex;flex-shrink:0;"></span>' + fotoHtml + '<div><div>' + warnIcon + item.nome + '</div></div></div>' +
                            '</td>';
                            
                    rows += '<td' + rowSpanAttr + ' style="vertical-align:middle;' + (linhasParaRenderizar.length > 1 ? 'border-bottom:1px solid #e2e8f0;' : '') + '">' +
                                (item.categoria || '-') +
                            '</td>';
                }
                
                rows += '<td style="vertical-align:middle;">' + qtdCell + '</td>';
                rows += '<td style="vertical-align:middle;white-space:nowrap;">' + minMaxCell + '</td>';
                rows += '<td style="vertical-align:middle;">' + endCell + '</td>';
                rows += '<td style="vertical-align:middle;white-space:nowrap;">' + tipoCell + '</td>';
                
                if (primeiraLinha) {
                    rows += '<td' + rowSpanAttr + ' style="text-align:right;white-space:nowrap;vertical-align:middle;' + (linhasParaRenderizar.length > 1 ? 'border-bottom:1px solid #e2e8f0;' : '') + '">' +
                                acoesBtns +
                            '</td>';
                }
                rows += '</tr>';
            });
        });

        table.innerHTML = rows;
        if (preserveScroll) {
            window.scrollTo(0, lastScrollY);
            setTimeout(() => window.scrollTo(0, lastScrollY), 10);
            setTimeout(() => window.scrollTo(0, lastScrollY), 50);
        }
    } catch (e) {
        console.error(e);
        table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ef4444;">' + e.message + '</td></tr>';
    }
};


// ── Modal: Baixa Manual por Endereco ─────────────────────────────────────────
window.abrirModalBaixaEstoque = async function(item) {
    if (!item) return;
    const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
    let saldos = [];
    try {
        const r = await fetch(API_URL + "/estoque/" + item.id + "/saldo-enderecos", { headers: { "Authorization": "Bearer " + token } });
        if (r.ok) {
            saldos = await r.json();
            if (typeof window.isTopAdmin !== 'undefined' && !window.isTopAdmin && window.activeUserPerms) {
                saldos = saldos.filter(s => window._estoqueEnderecos.some(e => String(e.id) === String(s.endereco_id)));
            }
        }
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

// ── HELPERS DE ENDEREÇOS E TAMANHOS NO MODAL ──────────────────────────────────
window._enderecoLinhas = [];
window._tamanhosProdutoAtual = [];

const _SUGESTOES_TAMANHOS_ROUPA = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'EXG', 'XGG'];
const _SUGESTOES_TAMANHOS_NUM = ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];

window.toggleTemTamanhoEstoque = function(checked) {
    const secCom = document.getElementById('estoque-secao-com-tamanho');
    const secSem = document.getElementById('estoque-secao-sem-tamanho');
    if (secCom) secCom.style.display = checked ? 'block' : 'none';
    if (secSem) secSem.style.display = checked ? 'none' : 'block';
    if (checked) {
        window._renderTamanhosNoModal();
    } else {
        window._renderLinhasEndereco();
    }
};

window._modalTamanhosExpandidos = {};

window._toggleTamanhoCardNoModal = function(tamRaw) {
    const tam = String(tamRaw || '').trim().toUpperCase();
    window._modalTamanhosExpandidos = window._modalTamanhosExpandidos || {};
    const willOpen = !window._modalTamanhosExpandidos[tam];
    window._modalTamanhosExpandidos[tam] = willOpen;
    const bodyEl = document.getElementById('modal-tam-body-' + tam);
    if (bodyEl) bodyEl.style.display = willOpen ? 'block' : 'none';
    const arrowEl = document.getElementById('modal-tam-arrow-' + tam);
    if (arrowEl) arrowEl.style.transform = willOpen ? 'rotate(90deg)' : 'rotate(0deg)';
};

window._toggleTodosTamanhosNoModal = function() {
    const tams = window._tamanhosProdutoAtual || [];
    window._modalTamanhosExpandidos = window._modalTamanhosExpandidos || {};
    const algumFechado = tams.some(t => !window._modalTamanhosExpandidos[t]);
    tams.forEach(t => { window._modalTamanhosExpandidos[t] = algumFechado; });
    window._renderTamanhosNoModal();
};

window.incluirTamanhoEstoque = function(tamRaw) {
    const tam = String(tamRaw || '').trim().toUpperCase();
    if (!tam) return;
    window._tamanhosProdutoAtual = window._tamanhosProdutoAtual || [];
    window._modalTamanhosExpandidos = window._modalTamanhosExpandidos || {};
    if (!window._tamanhosProdutoAtual.includes(tam)) {
        window._tamanhosProdutoAtual.push(tam);
        window._modalTamanhosExpandidos[tam] = true;
    } else {
        window._modalTamanhosExpandidos[tam] = !window._modalTamanhosExpandidos[tam];
    }
    // Se ainda não existe nenhuma linha de endereço para este tamanho, criar uma padrão
    const jaTemLinha = (window._enderecoLinhas || []).some(l => String(l.tamanho || '').trim().toUpperCase() === tam);
    if (!jaTemLinha) {
        // Se havia uma linha sem tamanho preenchida antes de marcar o checkbox, reaproveitar para o primeiro tamanho
        const linhaSemTam = (window._enderecoLinhas || []).find(l => !l.tamanho || String(l.tamanho).trim() === '');
        if (linhaSemTam && window._tamanhosProdutoAtual.length === 1) {
            linhaSemTam.tamanho = tam;
        } else {
            const defaultEndId = (window._estoqueEnderecos && window._estoqueEnderecos.length === 1) ? window._estoqueEnderecos[0].id : null;
            window._enderecoLinhas.push({
                endereco_id: defaultEndId,
                tamanho: tam,
                quantidade: 0,
                quantidade_minima: 0,
                quantidade_maxima: 0,
                tipo_estoque: 'matriz'
            });
        }
    }
    window._tamanhosProdutoAtual.sort((a, b) => window._ordemTamanhoEstoque(a) - window._ordemTamanhoEstoque(b));
    window._renderTamanhosNoModal();
};

window.incluirTamanhoInputEstoque = function() {
    const inp = document.getElementById('estoque-novo-tamanho-input');
    if (!inp) return;
    const val = inp.value.trim().toUpperCase();
    if (!val) return;
    inp.value = '';
    window.incluirTamanhoEstoque(val);
};

window._removerTamanhoEstoque = function(tam) {
    const t = String(tam || '').trim().toUpperCase();
    window._tamanhosProdutoAtual = (window._tamanhosProdutoAtual || []).filter(x => x !== t);
    window._enderecoLinhas = (window._enderecoLinhas || []).filter(l => String(l.tamanho || '').trim().toUpperCase() !== t);
    window._renderTamanhosNoModal();
};

// Movimentar (Entrada ou Baixa) diretamente dentro do tamanho no modal do produto
window._movimentarTamanhoNoModal = async function(tam, tipo) {
    const t = String(tam || '').trim().toUpperCase();
    const isEntrada = tipo === 'entrada';
    const prodId = document.getElementById('estoque-id')?.value;
    const linhasTam = (window._enderecoLinhas || []).map((l, i) => ({ l, i })).filter(x => String(x.l.tamanho || '').trim().toUpperCase() === t && x.l.endereco_id);

    if (linhasTam.length === 0) {
        return Swal.fire({
            target: document.getElementById('modal-estoque') || document.body,
            icon: 'warning',
            title: 'Selecione um endereço',
            text: 'Primeiro escolha o endereço do Tamanho ' + t + ' antes de registrar ' + (isEntrada ? 'entrada' : 'baixa') + '.',
            confirmButtonColor: '#1d4ed8'
        });
    }

    const optsEnd = linhasTam.map(x => {
        const endObj = (window._estoqueEnderecos || []).find(e => String(e.id) === String(x.l.endereco_id));
        const endNome = endObj ? endObj.nome : ('Endereço ' + x.l.endereco_id);
        return '<option value="' + x.i + '">' + endNome + ' (Saldo atual: ' + (x.l.quantidade || 0) + ')</option>';
    }).join('');

    const cor = isEntrada ? '#16a34a' : '#ef4444';
    const titulo = isEntrada
        ? '<i class="ph ph-arrow-down-left" style="color:#16a34a"></i> Entrada — Tamanho ' + t
        : '<i class="ph ph-arrow-up-right" style="color:#ef4444"></i> Baixa — Tamanho ' + t;

    const { value: vals, isConfirmed } = await Swal.fire({
        target: document.getElementById('modal-estoque') || document.body,
        title: titulo,
        html: '<div style="text-align:left;">' +
            '<div style="margin-bottom:10px;">' +
                '<label style="display:block;font-size:0.82rem;font-weight:600;color:#475569;margin-bottom:4px;">Endereço do Tamanho ' + t + ' *</label>' +
                '<select id="swal-tam-mov-idx" style="width:100%;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.9rem;">' + optsEnd + '</select>' +
            '</div>' +
            '<div style="margin-bottom:10px;">' +
                '<label style="display:block;font-size:0.82rem;font-weight:600;color:#475569;margin-bottom:4px;">Quantidade a ' + (isEntrada ? 'adicionar (Entrada)' : 'retirar (Baixa)') + ' *</label>' +
                '<input type="number" id="swal-tam-mov-qtd" min="1" value="1" style="width:100%;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.95rem;box-sizing:border-box;">' +
            '</div>' +
            (!isEntrada ? (
                '<div>' +
                    '<label style="display:block;font-size:0.82rem;font-weight:600;color:#475569;margin-bottom:4px;">Motivo da Baixa</label>' +
                    '<input type="text" id="swal-tam-mov-motivo" placeholder="Ex: Entrega / ajuste..." style="width:100%;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">' +
                '</div>'
            ) : '') +
        '</div>',
        showCancelButton: true,
        confirmButtonText: isEntrada ? 'Confirmar Entrada' : 'Confirmar Baixa',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: cor,
        preConfirm: () => {
            const idx = parseInt(document.getElementById('swal-tam-mov-idx').value, 10);
            const qtd = parseInt(document.getElementById('swal-tam-mov-qtd').value, 10);
            const motivo = document.getElementById('swal-tam-mov-motivo')?.value?.trim() || '';
            if (isNaN(idx) || !window._enderecoLinhas[idx]) {
                Swal.showValidationMessage('Selecione o endereço');
                return false;
            }
            if (!qtd || qtd <= 0) {
                Swal.showValidationMessage('Informe uma quantidade válida');
                return false;
            }
            const atual = parseInt(window._enderecoLinhas[idx].quantidade) || 0;
            if (!isEntrada && qtd > atual) {
                Swal.showValidationMessage('Saldo insuficiente neste endereço (Atual: ' + atual + ')');
                return false;
            }
            return { idx, qtd, motivo };
        }
    });

    if (!isConfirmed || !vals) return;
    const targetLinha = window._enderecoLinhas[vals.idx];
    const delta = isEntrada ? vals.qtd : -vals.qtd;
    targetLinha.quantidade = Math.max(0, (parseInt(targetLinha.quantidade) || 0) + delta);
    window._renderTamanhosNoModal();

    // Se o produto já existe no banco, persistir imediatamente a movimentação
    if (prodId) {
        try {
            const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
            await fetch(API_URL + "/estoque/" + prodId + "/movimentar", {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quantidade: delta,
                    endereco_id: parseInt(targetLinha.endereco_id, 10),
                    tamanho: t,
                    motivo: vals.motivo || (isEntrada ? 'Entrada por tamanho' : 'Baixa por tamanho')
                })
            });
            window.renderEstoqueTable(true);
        } catch(e) {
            console.warn('[movimentarTamanhoNoModal]', e.message);
        }
    }
};

window._renderTamanhosNoModal = function() {
    const chipsEl = document.getElementById('estoque-tamanhos-chips');
    const listaEl = document.getElementById('estoque-tamanhos-lista');
    if (!listaEl) return;

    const tamsAtivos = window._tamanhosProdutoAtual || [];

    if (chipsEl) {
        const todosChips = _SUGESTOES_TAMANHOS_ROUPA.concat(_SUGESTOES_TAMANHOS_NUM);
        chipsEl.innerHTML = todosChips.map(c => {
            const ativo = tamsAtivos.includes(c);
            const bg = ativo ? '#1d4ed8' : '#fff';
            const col = ativo ? '#fff' : '#334155';
            const brd = ativo ? '#1d4ed8' : '#cbd5e1';
            return '<button type="button" onclick="window.incluirTamanhoEstoque(\'' + c + '\')" ' +
                'style="background:' + bg + ';color:' + col + ';border:1px solid ' + brd + ';border-radius:6px;padding:3px 9px;font-size:0.76rem;font-weight:700;cursor:pointer;transition:all 0.15s;">' +
                (ativo ? '✓ ' : '+ ') + c +
            '</button>';
        }).join('');
    }

    if (tamsAtivos.length === 0) {
        listaEl.innerHTML = '<div style="text-align:center;padding:18px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:10px;color:#64748b;font-size:0.84rem;">' +
            'Nenhum tamanho incluído ainda. Clique em um dos tamanhos acima (ex: <b>P, M, G, GG</b> ou <b>38, 40, 42</b>) para vincular tamanhos, endereços e saldos a este produto.' +
        '</div>';
        return;
    }

    window._modalTamanhosExpandidos = window._modalTamanhosExpandidos || {};
    const algumFechado = tamsAtivos.some(t => !window._modalTamanhosExpandidos[t]);
    const barraTopoHtml = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">' +
        '<span style="font-size:0.78rem;color:#64748b;font-weight:600;"><i class="ph ph-hand-pointing"></i> Clique na seta de cada tamanho para abrir/editar endereço e quantidades:</span>' +
        '<button type="button" onclick="window._toggleTodosTamanhosNoModal()" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:3px 10px;font-size:0.75rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">' +
            '<i class="ph ' + (algumFechado ? 'ph-arrows-out-line-vertical' : 'ph-arrows-in-line-vertical') + '"></i> ' +
            (algumFechado ? 'Expandir todos os tamanhos' : 'Recolher todos os tamanhos') +
        '</button>' +
    '</div>';

    listaEl.innerHTML = barraTopoHtml + tamsAtivos.map(tam => {
        const isTamOpen = !!window._modalTamanhosExpandidos[tam];
        const linhasDoTam = (window._enderecoLinhas || [])
            .map((linha, idxGlobal) => ({ linha, idxGlobal }))
            .filter(x => String(x.linha.tamanho || '').trim().toUpperCase() === tam)
            .sort((a, b) => ((a.linha.tipo_estoque === 'reposicao') ? 1 : 0) - ((b.linha.tipo_estoque === 'reposicao') ? 1 : 0));

        const totalTam = linhasDoTam.reduce((acc, x) => acc + (parseInt(x.linha.quantidade) || 0), 0);

        // Resumo compacto de endereços para exibir na barra do tamanho
        const resumoEndsBar = linhasDoTam.map(({ linha }) => {
            const endObj = (window._estoqueEnderecos || []).find(e => String(e.id) === String(linha.endereco_id));
            const nomeEnd = endObj ? endObj.nome : 'Sem endereço';
            const minV = parseInt(linha.quantidade_minima) || 0;
            const maxV = parseInt(linha.quantidade_maxima) || 0;
            const qtdV = parseInt(linha.quantidade) || 0;
            const isLow = minV > 0 && qtdV < minV;
            const mmTxt = (minV > 0 || maxV > 0) ? ' (min ' + minV + ' | max ' + maxV + ')' : '';
            return '<span style="display:inline-flex;align-items:center;gap:3px;background:' + (isLow ? '#fef2f2' : '#fff') + ';color:' + (isLow ? '#dc2626' : '#475569') + ';border:1px solid ' + (isLow ? '#fecaca' : '#cbd5e1') + ';border-radius:6px;padding:2px 7px;font-size:0.72rem;font-weight:600;">' +
                '<i class="ph ph-map-pin" style="color:#1d4ed8;"></i> ' + nomeEnd + ': <b>' + qtdV + '</b>' + mmTxt +
            '</span>';
        }).join('');

        const enderecosHtml = linhasDoTam.map(({ linha, idxGlobal }) => {
            const opcoesEnd = (window._estoqueEnderecos || []).map(e =>
                '<option value="' + e.id + '"' + (String(e.id) === String(linha.endereco_id) ? ' selected' : '') + '>' + e.nome + '</option>'
            ).join('');
            const tipoAtual = linha.tipo_estoque || 'matriz';
            return '<div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;margin-top:8px;">' +
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
                    '<i class="ph ph-map-pin" style="color:#1d4ed8;flex-shrink:0;font-size:1rem;"></i>' +
                    '<select onchange="window._onEnderecoChange(' + idxGlobal + ', this.value, \'t\')" ' +
                        'style="flex:1;min-width:0;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;font-size:0.86rem;background:#fff;">' +
                        '<option value="">-- Selecione o endereço do Tam. ' + tam + ' --</option>' + opcoesEnd +
                    '</select>' +
                    window._ruaSelectHtml(idxGlobal, linha, 't') +
                    '<select onchange="window._enderecoLinhas[' + idxGlobal + '].tipo_estoque = this.value; window._renderTamanhosNoModal();" ' +
                        'style="width:240px;border:1.5px solid #ddd6fe;border-radius:6px;padding:6px 8px;font-size:0.8rem;background:#faf5ff;color:#5b21b6;font-weight:600;">' +
                        '<option value="matriz"' + (tipoAtual === 'matriz' ? ' selected' : '') + '>🏢 Matriz de Estoque (Pedido de Compra)</option>' +
                        '<option value="reposicao"' + (tipoAtual === 'reposicao' ? ' selected' : '') + '>🔄 Reposição de Estoque (Pedido de Reposição)</option>' +
                    '</select>' +
                    '<button type="button" onclick="window._removerLinhaEndereco(' + idxGlobal + ')" ' +
                        'style="background:#fee2e2;color:#ef4444;border:none;border-radius:6px;padding:6px 9px;cursor:pointer;flex-shrink:0;" title="Remover endereço">' +
                        '<i class="ph ph-trash"></i>' +
                    '</button>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' +
                    '<div>' +
                        '<label style="display:block;font-size:0.72rem;font-weight:600;color:#475569;margin-bottom:3px;">Qtd. Atual (Tam. ' + tam + ')</label>' +
                        '<input type="number" min="0" value="' + (linha.quantidade || 0) + '" placeholder="0" ' +
                            'oninput="window._enderecoLinhas[' + idxGlobal + '].quantidade = parseInt(this.value) || 0;" ' +
                            'style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:6px 8px;font-size:0.9rem;text-align:center;box-sizing:border-box;font-weight:700;">' +
                    '</div>' +
                    '<div>' +
                        '<label style="display:block;font-size:0.72rem;font-weight:600;color:#f59e0b;margin-bottom:3px;">Qtd. Mínima</label>' +
                        '<input type="number" min="0" value="' + (linha.quantidade_minima || 0) + '" placeholder="0" ' +
                            'oninput="window._enderecoLinhas[' + idxGlobal + '].quantidade_minima = parseInt(this.value) || 0;" ' +
                            'style="width:100%;border:1.5px solid #fde68a;border-radius:6px;padding:6px 8px;font-size:0.9rem;text-align:center;background:#fffbeb;box-sizing:border-box;">' +
                    '</div>' +
                    '<div>' +
                        '<label style="display:block;font-size:0.72rem;font-weight:600;color:#10b981;margin-bottom:3px;">Qtd. Máxima</label>' +
                        '<input type="number" min="0" value="' + (linha.quantidade_maxima || 0) + '" placeholder="0" ' +
                            'oninput="window._enderecoLinhas[' + idxGlobal + '].quantidade_maxima = parseInt(this.value) || 0;" ' +
                            'style="width:100%;border:1.5px solid #a7f3d0;border-radius:6px;padding:6px 8px;font-size:0.9rem;text-align:center;background:#f0fdf4;box-sizing:border-box;">' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');

        return '<div id="modal-tam-card-' + tam + '" style="background:#f1f5f9;border:1.5px solid #cbd5e1;border-left:4px solid #1d4ed8;border-radius:10px;padding:9px 12px;">' +
            '<div onclick="window._toggleTamanhoCardNoModal(\'' + tam + '\')" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;user-select:none;">' +
                '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
                    '<span title="Clique para abrir/recolher endereço e quantidades do Tamanho ' + tam + '" style="width:24px;height:24px;border-radius:6px;background:#dbeafe;color:#1d4ed8;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                        '<i id="modal-tam-arrow-' + tam + '" class="ph ph-caret-right" style="font-size:0.9rem;transition:transform 0.2s;' + (isTamOpen ? 'transform:rotate(90deg);' : '') + '"></i>' +
                    '</span>' +
                    '<span style="background:#1d4ed8;color:#fff;border-radius:6px;padding:3px 10px;font-size:0.84rem;font-weight:800;">Tamanho ' + tam + '</span>' +
                    '<span style="font-size:0.8rem;color:#334155;font-weight:700;">Saldo: ' + totalTam + ' unid.</span>' +
                    resumoEndsBar +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;" onclick="event.stopPropagation();">' +
                    '<button type="button" onclick="window._movimentarTamanhoNoModal(\'' + tam + '\', \'entrada\')" style="background:#dcfce7;color:#15803d;border:1px solid #86efac;border-radius:6px;padding:3px 9px;font-size:0.76rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:3px;" title="Dar Entrada neste tamanho">' +
                        '<i class="ph-bold ph-plus"></i> Entrada' +
                    '</button>' +
                    '<button type="button" onclick="window._movimentarTamanhoNoModal(\'' + tam + '\', \'saida\')" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:6px;padding:3px 9px;font-size:0.76rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:3px;" title="Dar Baixa neste tamanho">' +
                        '<i class="ph-bold ph-minus"></i> Baixa' +
                    '</button>' +
                    '<button type="button" onclick="window._adicionarLinhaEndereco(\'' + tam + '\')" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:3px 9px;font-size:0.76rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:3px;">' +
                        '<i class="ph ph-map-pin"></i> + Endereço' +
                    '</button>' +
                    '<button type="button" onclick="window._removerTamanhoEstoque(\'' + tam + '\')" style="background:#fff;color:#64748b;border:1px solid #cbd5e1;border-radius:6px;padding:3px 7px;font-size:0.75rem;cursor:pointer;" title="Remover Tamanho ' + tam + '">' +
                        '<i class="ph ph-trash"></i>' +
                    '</button>' +
                '</div>' +
            '</div>' +
            '<div id="modal-tam-body-' + tam + '" style="display:' + (isTamOpen ? 'block' : 'none') + ';">' +
                enderecosHtml +
            '</div>' +
        '</div>';
    }).join('');
};

window._renderLinhasEndereco = function() {
    const temTam = !!document.getElementById('estoque-tem-tamanho')?.checked;
    if (temTam) {
        window._renderTamanhosNoModal();
        return;
    }
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
        btnTransferir.style.display = 'none';
    }

    const linhasOrdenadas = linhas
        .map((linha, idx) => ({ linha, idx }))
        .sort((a, b) => ((a.linha.tipo_estoque === 'reposicao') ? 1 : 0) - ((b.linha.tipo_estoque === 'reposicao') ? 1 : 0));

    lista.innerHTML = linhasOrdenadas.map(({ linha, idx }) => {
        const opcoesEnd = window._estoqueEnderecos.map(e =>
            '<option value="' + e.id + '"' + (e.id === linha.endereco_id ? ' selected' : '') + '>' + e.nome + '</option>'
        ).join('');
        const tipoAtual = linha.tipo_estoque || 'matriz';
        return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;margin-bottom:2px;">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                '<i class="ph ph-map-pin" style="color:#1d4ed8;flex-shrink:0;font-size:1rem;"></i>' +
                '<select onchange="window._onEnderecoChange(' + idx + ', this.value, \'n\')" ' +
                    'style="flex:1;min-width:0;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.85rem;background:#fff;">' +
                    '<option value="">-- Selecione o endereço --</option>' + opcoesEnd +
                '</select>' +
                window._ruaSelectHtml(idx, linha, 'n') +
                '<button type="button" onclick="window._removerLinhaEndereco(' + idx + ')" ' +
                    'style="background:#fee2e2;color:#ef4444;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;flex-shrink:0;" title="Remover">' +
                    '<i class="ph ph-trash"></i>' +
                '</button>' +
            '</div>' +
            '<div style="margin-bottom:6px;">' +
                '<label style="display:block;font-size:0.72rem;font-weight:600;color:#7c3aed;margin-bottom:2px;">Tipo de Estoque</label>' +
                '<select onchange="window._enderecoLinhas[' + idx + '].tipo_estoque = this.value; window._renderLinhasEndereco();" ' +
                    'style="width:100%;border:1.5px solid #ddd6fe;border-radius:6px;padding:4px 8px;font-size:0.85rem;background:#faf5ff;color:#5b21b6;font-weight:600;">' +
                    '<option value="matriz"' + (tipoAtual === 'matriz' ? ' selected' : '') + '>🏢 Matriz de Estoque (Pedido de Compra)</option>' +
                    '<option value="reposicao"' + (tipoAtual === 'reposicao' ? ' selected' : '') + '>🔄 Reposição de Estoque (Pedido de Reposição)</option>' +
                '</select>' +
            '</div>' +
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

window._adicionarLinhaEndereco = function(tamanhoOpcional) {
    const tam = tamanhoOpcional ? String(tamanhoOpcional).trim().toUpperCase() : '';
    if (tam) {
        window._modalTamanhosExpandidos = window._modalTamanhosExpandidos || {};
        window._modalTamanhosExpandidos[tam] = true;
    }
    window._enderecoLinhas.push({
        endereco_id: null,
        tamanho: tam,
        quantidade: 0,
        quantidade_minima: 0,
        quantidade_maxima: 0,
        tipo_estoque: 'matriz'
    });
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
    const chkTam = document.getElementById("estoque-tem-tamanho");
    if (chkTam) chkTam.checked = false;
    window._tamanhosProdutoAtual = [];
    window._enderecoLinhas = [];
    window._modalTamanhosExpandidos = {};
    window.toggleTemTamanhoEstoque(false);

    const fi = document.getElementById("estoque-foto");
    if (fi) fi.value = "";
    document.getElementById("estoque-foto-base64").value = "";
    document.getElementById("estoque-foto-preview").src = "";
    document.getElementById("estoque-foto-preview").style.display = "none";
    document.getElementById("estoque-foto-icon").style.display = "block";
    const modalEl = document.getElementById("modal-estoque");
    if (modalEl && modalEl.parentElement !== document.body) document.body.appendChild(modalEl);
    document.getElementById("modal-estoque-title").innerHTML = '<i class="ph ph-package"></i> Adicionar Item de Estoque';
    document.getElementById("modal-estoque").style.display = "flex";
    
    // Esconder/limpar placas ao abrir para novo item
    document.getElementById("estoque-cat").value = "EPI";
    const catInpNovo = document.getElementById("estoque-cat-input");
    if (catInpNovo) catInpNovo.value = "EPI";
    const catDdNovo = document.getElementById("estoque-cat-modal-dd");
    if (catDdNovo) catDdNovo.style.display = "none";
    window.togglePlacasEstoque(document.getElementById("estoque-cat").value);
    if (window._veiculosParaEstoque) _renderPlacasCheckboxes([]);

    // Foco no campo nome
    setTimeout(() => { const n = document.getElementById("estoque-nome"); if(n) n.focus(); }, 200);
};

window.fecharModalEstoque = function() {
    document.getElementById("modal-estoque").style.display = "none";
};

// ── Modal Editar ──────────────────────────────────────────────────────────────
window.editarEstoque = async function(item, tamanhoFoco) {
    if (!item) { console.error("[editarEstoque] item indefinido"); return; }
    await _carregarEnderecos();
    document.getElementById("estoque-id").value   = item.id;
    document.getElementById("estoque-nome").value = item.nome;
    const catNorm = item.categoria === 'Peças Automotivas'
        ? 'Automotivo'
        : (item.categoria === 'Peças para Sanitários' ? 'Peças para Sanitários/Equipamentos' : (item.categoria || ''));
    document.getElementById("estoque-cat").value  = catNorm;
    const catInpEd = document.getElementById("estoque-cat-input");
    if (catInpEd) catInpEd.value = catNorm;
    const catDdEd = document.getElementById("estoque-cat-modal-dd");
    if (catDdEd) catDdEd.style.display = "none";
    const modalElEd = document.getElementById("modal-estoque");
    if (modalElEd && modalElEd.parentElement !== document.body) document.body.appendChild(modalElEd);
    window.togglePlacasEstoque(catNorm);
    if (window._veiculosParaEstoque) {
        _renderPlacasCheckboxes((item.placas_vinculadas || '').split(',').map(s=>s.trim()).filter(Boolean));
    } else if (_ehCategoriaVeiculoEstoque(catNorm)) {
        const origCb = _renderPlacasCheckboxes;
        _renderPlacasCheckboxes = function() {
            origCb((item.placas_vinculadas || '').split(',').map(s=>s.trim()).filter(Boolean));
            _renderPlacasCheckboxes = origCb;
        };
    }
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
    window._hiddenEnderecoLinhas = [];
    window._tamanhosProdutoAtual = [];
    window._modalTamanhosExpandidos = {};
    if (tamanhoFoco) {
        window._modalTamanhosExpandidos[String(tamanhoFoco).trim().toUpperCase()] = true;
    }
    try {
        const savedList = JSON.parse(item.tamanhos_lista || '[]');
        if (Array.isArray(savedList)) {
            savedList.forEach(t => {
                const tk = String(t || '').trim().toUpperCase();
                if (tk && !window._tamanhosProdutoAtual.includes(tk)) window._tamanhosProdutoAtual.push(tk);
            });
        }
    } catch(e) {}

    try {
        const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
        const r = await fetch(API_URL + "/estoque/" + item.id + "/saldo-enderecos", {
            headers: { "Authorization": "Bearer " + token }
        });
        if (r.ok) {
            const saldos = await r.json();
            let saldosPermitidos = saldos;
            if (typeof window.isTopAdmin !== 'undefined' && !window.isTopAdmin && window.activeUserPerms) {
                saldosPermitidos = saldos.filter(s => window._estoqueEnderecos.some(e => String(e.id) === String(s.endereco_id)));
                window._hiddenEnderecoLinhas = saldos.filter(s => !window._estoqueEnderecos.some(e => String(e.id) === String(s.endereco_id))).map(s => ({
                    endereco_id:       s.endereco_id,
                    tamanho:           String(s.tamanho || '').trim().toUpperCase(),
                    quantidade:        s.quantidade,
                    quantidade_minima: s.quantidade_minima || 0,
                    quantidade_maxima: s.quantidade_maxima || 0,
                    tipo_estoque:      s.tipo_estoque || 'matriz',
                    rua:               s.rua || ''
                }));
            }
            window._enderecoLinhas = saldosPermitidos.map(s => {
                const tk = String(s.tamanho || '').trim().toUpperCase();
                if (tk && !window._tamanhosProdutoAtual.includes(tk)) {
                    window._tamanhosProdutoAtual.push(tk);
                }
                return {
                    endereco_id:       s.endereco_id,
                    tamanho:           tk,
                    quantidade:        s.quantidade,
                    quantidade_minima: s.quantidade_minima || 0,
                    quantidade_maxima: s.quantidade_maxima || 0,
                    tipo_estoque:      s.tipo_estoque || 'matriz',
                    rua:               s.rua || ''
                };
            });
        }
    } catch(e) { console.warn("[editarEstoque] erro ao carregar saldos:", e.message); }

    window._tamanhosProdutoAtual.sort((a, b) => window._ordemTamanhoEstoque(a) - window._ordemTamanhoEstoque(b));
    const temTam = !!(item.tem_tamanho || window._tamanhosProdutoAtual.length > 0);
    const chkTam = document.getElementById("estoque-tem-tamanho");
    if (chkTam) chkTam.checked = temTam;
    window.toggleTemTamanhoEstoque(temTam);

    document.getElementById("modal-estoque-title").innerHTML = '<i class="ph ph-pencil-simple"></i> Editar Item de Estoque';
    document.getElementById("modal-estoque").style.display = "flex";
    if (tamanhoFoco) {
        setTimeout(() => {
            const cardEl = document.getElementById('modal-tam-card-' + String(tamanhoFoco).trim().toUpperCase());
            if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
    }
};

// ── Salvar ────────────────────────────────────────────────────────────────────
window.salvarEstoque = async function(e) {
    e.preventDefault();
    const id = document.getElementById("estoque-id").value;
    const temTam = !!document.getElementById("estoque-tem-tamanho")?.checked;

    let linhasValidas = (window._enderecoLinhas || []).filter(l => l.endereco_id && (!temTam || (l.tamanho && String(l.tamanho).trim() !== '')));
    if (window._hiddenEnderecoLinhas && window._hiddenEnderecoLinhas.length > 0) {
        linhasValidas = linhasValidas.concat(window._hiddenEnderecoLinhas);
    }

    if (temTam && (!window._tamanhosProdutoAtual || window._tamanhosProdutoAtual.length === 0)) {
        Swal.fire({
            target: document.getElementById('modal-estoque') || document.body,
            icon: 'warning',
            title: 'Tamanhos obrigatórios',
            text: 'Inclua pelo menos um tamanho para o produto.',
            confirmButtonColor: '#e67700'
        });
        return;
    }

    // NOVO produto: obrigatório ter pelo menos 1 endereço selecionado
    if (!id && linhasValidas.length === 0) {
        Swal.fire({
            target: document.getElementById('modal-estoque') || document.body,
            icon: 'warning',
            title: 'Endereço obrigatório',
            text: 'Adicione e selecione pelo menos um endereço para o produto.',
            confirmButtonColor: '#e67700'
        });
        return;
    }

    // Qtd. Atual = soma das quantidades por endereço/tamanho
    const somaEnderecos = linhasValidas.reduce((acc, l) => acc + (parseInt(l.quantidade) || 0), 0);
    const qtdAtual = somaEnderecos;

    const payload = {
        nome:              document.getElementById("estoque-nome").value,
        departamento:      '',
        categoria:         document.getElementById("estoque-cat").value,
        tem_tamanho:       temTam ? 1 : 0,
        tamanhos_lista:    temTam ? (window._tamanhosProdutoAtual || []) : [],
        quantidade_atual:  qtdAtual,
        quantidade_minima: parseInt(document.getElementById("estoque-min").value) || 0,
        quantidade_maxima: parseInt(document.getElementById("estoque-max").value) || 0,
        foto_base64:       document.getElementById("estoque-foto-base64").value,
        placas_vinculadas: Array.from(document.querySelectorAll('.estoque-placa-chk:checked')).map(el => el.value).join(',')
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
            body: JSON.stringify({ ...payload, skip_history: (method === 'PUT' && linhasValidas.length > 0) })
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Erro ao salvar"); }
        const result = await res.json();
        const prodId = id ? parseInt(id) : result.id;

        // Sincronizar endereços/tamanhos
        try {
            await fetch(API_URL + "/estoque/" + prodId + "/sync-enderecos", {
                method: "POST",
                headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    enderecos: linhasValidas.map(l => ({
                        endereco_id:       l.endereco_id,
                        tamanho:           temTam ? String(l.tamanho || '').trim().toUpperCase() : '',
                        quantidade:        l.quantidade,
                        quantidade_minima: l.quantidade_minima || 0,
                        quantidade_maxima: l.quantidade_maxima || 0,
                        tipo_estoque:      l.tipo_estoque || 'matriz',
                        rua:               window._ehAlmoxarifado(l.endereco_id) ? String(l.rua || '') : ''
                    }))
                })
            });
        } catch(es) { console.warn("[ESTOQUE] erro ao sincronizar enderecos:", es.message); }

        Swal.fire({ icon: "success", title: "Sucesso", text: "Item salvo com sucesso", timer: 1500, showConfirmButton: false });
        window.fecharModalEstoque();
        window.renderEstoqueTable(true);
        if (typeof window.initComprasEstoque === 'function' && document.getElementById('compras-estoque-container')) {
            window.initComprasEstoque();
        }
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
        window.renderEstoqueTable(true);
    } catch(e) { Swal.fire("Erro", "Não foi possível atualizar a quantidade.", "error"); }
};

// ── Excluir (com senha admin123) ──────────────────────────────────────────────
window.excluirEstoque = async function(id) {
    const ok = await Swal.fire({
        title: "Excluir produto?",
        html: '<p style="color:#475569;font-size:0.9rem;margin-bottom:10px;">Esta ação não pode ser desfeita.<br>Digite a senha para confirmar a exclusão:</p>' +
              '<input type="password" id="swal-senha-excluir-estoque" class="swal2-input" placeholder="Digite a senha..." style="margin:0;width:100%;box-sizing:border-box;">',
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Sim, excluir",
        cancelButtonText: "Cancelar",
        didOpen: () => {
            const inp = document.getElementById('swal-senha-excluir-estoque');
            if (inp) inp.focus();
        },
        preConfirm: () => {
            const senha = (document.getElementById('swal-senha-excluir-estoque')?.value || '').trim();
            if (senha !== 'admin123') {
                Swal.showValidationMessage('Senha incorreta!');
                return false;
            }
            return true;
        }
    });
    if (!ok.isConfirmed) return;
    const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
    try {
        const r = await fetch(API_URL + "/estoque/" + id, { method: "DELETE", headers: { "Authorization": "Bearer " + token } });
        if (!r.ok) throw new Error("Erro ao excluir");
        Swal.fire({ icon: "success", title: "Excluído!", text: "Produto excluído com sucesso.", timer: 1400, showConfirmButton: false });
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

// ── Permissões por Aba do Estoque (Itens de Estoque vs Equipamentos) ──────────
window._getEstoquePerms = function() {
    if (window.isTopAdmin) return { itens: true, equipamentos: true };
    if (window.estoquePerms) return window.estoquePerms;
    if (window.activeUserPerms) {
        return {
            itens: !!window.activeUserPerms['estoque'],
            equipamentos: !!window.activeUserPerms['estoque-equipamentos']
        };
    }
    return { itens: true, equipamentos: true };
};

window.aplicarPermissoesAbasEstoque = function() {
    const perms = window._getEstoquePerms();
    const tabItens = document.getElementById('tab-estoque-itens');
    const tabEquip = document.getElementById('tab-estoque-equipamentos');
    const tabHist  = document.getElementById('tab-estoque-historico');
    const headerBtnsItens = document.getElementById('estoque-itens-header-actions');

    if (tabItens) tabItens.style.display = perms.itens ? '' : 'none';
    if (tabEquip) tabEquip.style.display = perms.equipamentos ? '' : 'none';

    // Histórico de movimentação funciona apenas para os Itens de Estoque (nunca para Equipamentos)
    const mostrarHistorico = perms.itens && window._abaAtivaEstoque !== 'equipamentos';
    if (tabHist) tabHist.style.display = mostrarHistorico ? '' : 'none';
    if (headerBtnsItens) headerBtnsItens.style.display = (perms.itens && window._abaAtivaEstoque !== 'equipamentos') ? 'flex' : 'none';

    // Se a aba atual não é permitida para o usuário, redirecionar automaticamente para a aba permitida
    if ((window._abaAtivaEstoque === 'itens' || window._abaAtivaEstoque === 'historico') && !perms.itens && perms.equipamentos) {
        window.switchTabEstoque('equipamentos');
    } else if (window._abaAtivaEstoque === 'equipamentos' && !perms.equipamentos && perms.itens) {
        window.switchTabEstoque('itens');
    }
};

// ── Hook de navegação ─────────────────────────────────────────────────────────
const _origNavEstoque = window.navigateTo;
window.navigateTo = function(targetId) {
    if (targetId === 'estoque-equipamentos') {
        if (_origNavEstoque) _origNavEstoque.call(this, 'estoque');
        window.aplicarPermissoesAbasEstoque();
        window.switchTabEstoque('equipamentos');
        return;
    }
    if (_origNavEstoque) _origNavEstoque.apply(this, arguments);
    if (targetId === "estoque") {
        window.aplicarPermissoesAbasEstoque();
        const perms = window._getEstoquePerms();
        if (!perms.itens && perms.equipamentos) {
            window.switchTabEstoque('equipamentos');
        } else {
            if (window._abaAtivaEstoque === 'equipamentos' && perms.equipamentos) {
                window.switchTabEstoque('equipamentos');
            } else {
                window.switchTabEstoque('itens');
                window.renderEstoqueTable();
            }
        }
    }
};

// ── Abas ──────────────────────────────────────────────────────────────────────
window._abaAtivaEstoque = "itens";
window.switchTabEstoque = function(tab) {
    const perms = window._getEstoquePerms();
    if ((tab === "itens" || tab === "historico") && !perms.itens) {
        if (perms.equipamentos) tab = "equipamentos";
        else return;
    }
    if (tab === "equipamentos" && !perms.equipamentos) {
        if (perms.itens) tab = "itens";
        else return;
    }

    window._abaAtivaEstoque = tab;
    const elItens = document.getElementById("content-estoque-itens");
    const elEquip = document.getElementById("content-estoque-equipamentos");
    const elHist  = document.getElementById("content-estoque-historico");
    if (elItens) elItens.style.display = tab === "itens"        ? "block" : "none";
    if (elEquip) elEquip.style.display = tab === "equipamentos" ? "block" : "none";
    if (elHist)  elHist.style.display  = tab === "historico"    ? "block" : "none";

    // Histórico de movimentação e botões de movimentação só aparecem para Itens em Estoque
    const tabItensEl = document.getElementById("tab-estoque-itens");
    const tabEquipEl = document.getElementById("tab-estoque-equipamentos");
    const tabHistEl  = document.getElementById("tab-estoque-historico");
    const headerBtnsItens = document.getElementById("estoque-itens-header-actions");

    if (tabItensEl) tabItensEl.style.display = perms.itens ? "" : "none";
    if (tabEquipEl) tabEquipEl.style.display = perms.equipamentos ? "" : "none";
    if (tabHistEl)  tabHistEl.style.display  = (perms.itens && tab !== "equipamentos") ? "" : "none";
    if (headerBtnsItens) headerBtnsItens.style.display = (perms.itens && tab !== "equipamentos") ? "flex" : "none";

    ["itens", "equipamentos", "historico"].forEach(t => {
        const el = document.getElementById("tab-estoque-" + t);
        if (!el) return;
        el.style.color       = tab === t ? "#e67700" : "#64748b";
        el.style.borderColor = tab === t ? "#e67700" : "transparent";
        el.style.fontWeight  = tab === t ? "700" : "600";
    });
    if (tab === "historico") window.renderEstoqueHistorico();
    if (tab === "equipamentos" && typeof window.carregarEquipamentosEstoque === "function") {
        window.carregarEquipamentosEstoque();
    }
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
            const tipoNorm = (h.tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g,'');
            const isSaida  = tipoNorm === 'SAIDA' || tipoNorm.startsWith('SAI');
            const isEntrad = tipoNorm === 'ENTRADA' || tipoNorm.startsWith('ENT');
            const tipoDisplay = isEntrad ? 'Entrada' : (isSaida ? 'Sa\u00edda' : (h.tipo || 'Ajuste'));
            const tipoColor = isEntrad ? "#16a34a" : (isSaida ? "#ef4444" : "#eab308");
            const tipoBg    = isEntrad ? "#f0fdf4" : (isSaida ? "#fef2f2" : "#fefce8");
            const sinal     = isSaida  ? "-" : "+";
            const endHtml   = h.endereco_nome
                ? '<span style="display:inline-flex;align-items:center;gap:3px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:20px;padding:2px 8px;font-size:0.72rem;font-weight:600;"><i class="ph ph-map-pin" style="font-size:0.75rem;"></i>' + h.endereco_nome + '</span>'
                : '<span style="color:#94a3b8;font-size:0.8rem;">—</span>';
            tr.innerHTML =
                '<td><div style="font-weight:500;">' + dt.toLocaleDateString("pt-BR") + '</div><div style="font-size:0.8em;color:#64748b;">' + dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) + '</div></td>' +
                '<td><div style="font-weight:600;color:#1e293b;">' + h.estoque_nome + '</div><div style="margin-top:2px;">' + endHtml + '</div></td>' +
                '<td><span style="background:' + tipoBg + ';color:' + tipoColor + ';padding:2px 8px;border-radius:12px;font-size:0.8em;font-weight:600;">' + tipoDisplay + '</span></td>' +
                '<td style="font-weight:700;color:' + tipoColor + '">' + sinal + h.quantidade + '</td>' +
                '<td>' + (h.usuario || "-") + '</td>';
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
        
        if (!isEntrada) {
            produtos = produtos.filter(p => p.categoria !== 'EPI' && p.categoria !== 'Uniforme');
        }

        if (!window._estoqueEnderecos || window._estoqueEnderecos.length === 0) {
            await _carregarEnderecos();
        }
    } catch(e) {
        return Swal.fire('Erro', 'Falha ao carregar produtos', 'error');
    }

    if (produtos.length === 0) {
        const msg = !isEntrada ? 'Nenhum produto disponível para saída direta. (Itens de EPI e Uniforme devem ter saída pela Ficha de EPI)' : 'Nenhum produto cadastrado no estoque.';
        return Swal.fire('Atenção', msg, 'warning');
    }

    // Ordenar alfabeticamente
    produtos.sort((a,b) => a.nome.localeCompare(b.nome));

    const optsProdutos = produtos.map(p => `<option value="${p.id}">${p.nome} (Total: ${p.quantidade_atual})</option>`).join('');

    // Gerar lista de produtos para busca rápida
    const produtosJSON = JSON.stringify(produtos.map(p => ({ id: p.id, nome: p.nome, quantidade_atual: p.quantidade_atual, tem_tamanho: p.tem_tamanho ? 1 : 0, tamanhos_lista: p.tamanhos_lista || '[]' })));

    let html = `<div style="text-align:left;">
        <div style="margin-bottom:12px;">
            <label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Produto *</label>
            <input type="text" id="swal-global-produto-busca" placeholder="Digite para buscar o produto..." autocomplete="off"
                style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">
            <div id="swal-global-produto-lista" style="max-height:180px;overflow-y:auto;border:1.5px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;background:#fff;display:none;">
            </div>
            <input type="hidden" id="swal-global-produto" value="">
            <div id="swal-global-produto-selecionado" style="display:none;margin-top:6px;padding:6px 10px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;font-size:0.85rem;color:#15803d;font-weight:600;"></div>
        </div>
        <div id="swal-global-tamanho-container" style="margin-bottom:12px;display:none;">
            <label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:4px;">Tamanho *</label>
            <select id="swal-global-tamanho" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                <option value="">Selecione o tamanho</option>
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
            const allProdutos = JSON.parse(document.getElementById('swal-global-produto').dataset.produtos || produtosJSON);
            // Armazenar os produtos no elemento hidden para acesso posterior
            document.getElementById('swal-global-produto').dataset.produtos = produtosJSON;

            const inputBusca = document.getElementById('swal-global-produto-busca');
            const listaProdutos = document.getElementById('swal-global-produto-lista');
            const hiddenProduto = document.getElementById('swal-global-produto');
            const labelSelecionado = document.getElementById('swal-global-produto-selecionado');
            const tamContainer = document.getElementById('swal-global-tamanho-container');
            const selTam = document.getElementById('swal-global-tamanho');
            const selEnd = document.getElementById('swal-global-endereco');
            const hint = document.getElementById('swal-global-endereco-hint');
            let _currentSaldos = [];
            let _currentTemTamanho = false;

            function atualizarOpcoesEnderecos(tamFiltro) {
                let optionsHTML = '<option value="">Selecione o endereço</option>';
                const saldosFiltrados = _currentTemTamanho
                    ? _currentSaldos.filter(s => String(s.tamanho || '').toUpperCase() === String(tamFiltro || '').toUpperCase())
                    : _currentSaldos;
                if (_currentTemTamanho && !tamFiltro) {
                    selEnd.innerHTML = '<option value="">Selecione o tamanho primeiro</option>';
                    selEnd.disabled = true;
                    return;
                }
                selEnd.disabled = false;
                if (isEntrada) {
                    const ends = window._estoqueEnderecos;
                    optionsHTML += ends.map(end => {
                        const foundSaldo = saldosFiltrados.find(s => String(s.endereco_id) === String(end.id));
                        const qty = foundSaldo ? foundSaldo.quantidade : 0;
                        return `<option value="${end.id}">${end.nome} (Atual: ${qty})</option>`;
                    }).join('');
                } else {
                    let avail = saldosFiltrados.filter(s => s.quantidade > 0);
                    avail = avail.filter(s => window._estoqueEnderecos.some(e => String(e.id) === String(s.endereco_id)));
                    if (avail.length === 0) {
                        optionsHTML = '<option value="">(Sem saldo em nenhum endereço permitido)</option>';
                        selEnd.disabled = true;
                    } else {
                        optionsHTML += avail.map(s => `<option value="${s.endereco_id}">${s.endereco_nome} (Atual: ${s.quantidade})</option>`).join('');
                    }
                }
                selEnd.innerHTML = optionsHTML;
            }

            selTam.addEventListener('change', () => {
                atualizarOpcoesEnderecos(selTam.value);
            });

            // Função para carregar endereços ao selecionar produto
            async function carregarEnderecosProduto(pId, prodNome, prodQtd) {
                hiddenProduto.value = pId;
                labelSelecionado.textContent = prodNome + ' (Total: ' + prodQtd + ')';
                labelSelecionado.style.display = 'block';
                inputBusca.value = '';
                listaProdutos.style.display = 'none';

                const prodObj = allProdutos.find(p => String(p.id) === String(pId));
                selEnd.innerHTML = '<option value="">Selecione o endereço</option>';
                selEnd.disabled = true;
                hint.style.display = 'block';

                try {
                    const rs = await fetch(API_URL + "/estoque/" + pId + "/saldo-enderecos", { headers: { "Authorization": "Bearer " + token } });
                    let saldos = [];
                    if (rs.ok) saldos = await rs.json();
                    _currentSaldos = saldos;

                    let tams = [];
                    try { tams = JSON.parse(prodObj?.tamanhos_lista || '[]'); } catch (_) {}
                    saldos.forEach(s => {
                        if (s.tamanho && !tams.includes(s.tamanho)) tams.push(s.tamanho);
                    });
                    _currentTemTamanho = Boolean((prodObj && prodObj.tem_tamanho) || tams.length > 0);
                    hiddenProduto.dataset.temTamanho = _currentTemTamanho ? '1' : '0';

                    hint.style.display = 'none';
                    if (_currentTemTamanho) {
                        tamContainer.style.display = 'block';
                        selTam.innerHTML = '<option value="">Selecione o tamanho</option>' + tams.map(t => {
                            const totTam = saldos.filter(s => String(s.tamanho || '').toUpperCase() === String(t).toUpperCase()).reduce((acc, s) => acc + (parseInt(s.quantidade) || 0), 0);
                            return `<option value="${t}">${t} (Saldo: ${totTam})</option>`;
                        }).join('');
                        selEnd.innerHTML = '<option value="">Selecione o tamanho primeiro</option>';
                        selEnd.disabled = true;
                    } else {
                        tamContainer.style.display = 'none';
                        selTam.innerHTML = '<option value=""></option>';
                        atualizarOpcoesEnderecos('');
                    }
                } catch(err) {
                    hint.style.display = 'none';
                }
            }

            // Renderiza lista filtrada
            function renderListaProdutos(texto) {
                const t = texto.trim().toLowerCase();
                const filtrados = t ? allProdutos.filter(p => p.nome.toLowerCase().includes(t)) : allProdutos;
                if (filtrados.length === 0) {
                    listaProdutos.innerHTML = '<div style="padding:10px 14px;color:#94a3b8;font-size:0.85rem;">Nenhum produto encontrado</div>';
                } else {
                    listaProdutos.innerHTML = filtrados.map(p =>
                        `<div data-id="${p.id}" data-nome="${p.nome}" data-qtd="${p.quantidade_atual}"
                            style="padding:8px 14px;cursor:pointer;font-size:0.88rem;border-bottom:1px solid #f1f5f9;
                            transition:background 0.15s;"
                            onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background=''">
                            <span style="font-weight:600;color:#1e293b;">${p.nome}</span>
                            <span style="color:#94a3b8;font-size:0.8rem;margin-left:6px;">(Total: ${p.quantidade_atual})</span>
                        </div>`
                    ).join('');
                    // Evento de clique nos itens da lista
                    listaProdutos.querySelectorAll('[data-id]').forEach(el => {
                        el.addEventListener('click', () => {
                            carregarEnderecosProduto(el.dataset.id, el.dataset.nome, el.dataset.qtd);
                        });
                    });
                }
                listaProdutos.style.display = 'block';
            }

            // Listener no campo de busca
            inputBusca.addEventListener('input', (e) => {
                const t = e.target.value.trim();
                if (!t) {
                    listaProdutos.style.display = 'none';
                    return;
                }
                renderListaProdutos(t);
            });

            // Mostrar lista ao focar
            inputBusca.addEventListener('focus', (e) => {
                if (e.target.value.trim()) renderListaProdutos(e.target.value);
            });

            // Fechar lista ao clicar fora
            document.addEventListener('click', function fecharLista(ev) {
                if (!listaProdutos.contains(ev.target) && ev.target !== inputBusca) {
                    listaProdutos.style.display = 'none';
                    document.removeEventListener('click', fecharLista);
                }
            });

            // Foco automático
            setTimeout(() => inputBusca.focus(), 100);
        },
        preConfirm: () => {
            const hiddenEl = document.getElementById('swal-global-produto');
            const pId = hiddenEl.value;
            const temTam = hiddenEl.dataset.temTamanho === '1';
            const tam = document.getElementById('swal-global-tamanho')?.value || '';
            const endId = document.getElementById('swal-global-endereco').value;
            const qtd = parseInt(document.getElementById('swal-global-qtd').value);
            let motivo = '';
            if (!isEntrada) {
                motivo = document.getElementById('swal-global-motivo').value.trim();
                if (!motivo) { Swal.showValidationMessage('Motivo é obrigatório para saída'); return false; }
            }
            if (!pId) { Swal.showValidationMessage('Selecione o produto'); return false; }
            if (temTam && !tam) { Swal.showValidationMessage('Selecione o tamanho'); return false; }
            if (!endId) { Swal.showValidationMessage('Selecione o endereço'); return false; }
            if (!qtd || qtd <= 0) { Swal.showValidationMessage('Quantidade inválida'); return false; }
            
            return { pId, endId, qtd, motivo, tam };
        }
    });

    if (isConfirmed && vals) {
        try {
            const body = { 
                quantidade: isEntrada ? vals.qtd : -vals.qtd, 
                endereco_id: parseInt(vals.endId),
                tamanho: vals.tam || ''
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


    window.formatarPlacas = function(placas) {
        if (!placas) return '';
        const list = placas.split(',').map(p => p.trim()).filter(Boolean);
        if (!list.length) return '';
        return list.map(p => `<span style="color:#94a3b8;font-size:0.85rem;margin-right:4px;border:1px solid #e2e8f0;padding:2px 4px;border-radius:4px;">${p}</span>`).join('');
    };

    function _ehCategoriaVeiculoEstoque(cat) {
        return cat === 'Automotivo' || cat === 'Peças Automotivas' || cat === 'Pneus e Borracharia' || cat === 'Lubrificantes e Fluidos';
    }
    function _normVeicEstoque(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }
    function _escVeicEstoque(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window.togglePlacasEstoque = function(cat) {
        const c = document.getElementById('estoque-placas-container');
        if (!c) return;
        if (_ehCategoriaVeiculoEstoque(cat)) {
            c.style.display = 'block';
            if (!window._veiculosParaEstoque) {
                _fetchVeiculosEstoque();
            } else if (!document.querySelector('#estoque-placas-list .estoque-placa-chk')) {
                _renderPlacasCheckboxes([]);
            }
        } else {
            c.style.display = 'none';
        }
    };

    window._veiculosParaEstoque = null;
    function _fetchVeiculosEstoque() {
        const cont = document.getElementById('estoque-placas-list');
        if (cont) cont.innerHTML = '<div style="color:#64748b;font-size:0.9rem;">Carregando veículos...</div>';
        apiGet('/frota/veiculos').then(res => {
            window._veiculosParaEstoque = [{ placa: 'Outros' }].concat((res || []).slice().sort((a, b) => {
                const ta = String(a.tipo_veiculo || '\uffff').trim();
                const tb = String(b.tipo_veiculo || '\uffff').trim();
                const ct = ta.localeCompare(tb, 'pt-BR', { sensitivity: 'base' });
                if (ct !== 0) return ct;
                return String(a.placa || '').localeCompare(String(b.placa || ''), 'pt-BR', { sensitivity: 'base' });
            }));
            _renderPlacasCheckboxes();
        }).catch(e => {
            if (cont) cont.innerHTML = '<div style="color:#ef4444;font-size:0.9rem;">Erro ao carregar veículos.</div>';
        });
    }

    function _renderPlacasCheckboxes(selectedPlacas = []) {
        const cont = document.getElementById('estoque-placas-list');
        if (!cont || !window._veiculosParaEstoque) return;
        const selSet = new Set(selectedPlacas);
        const tiposMap = {};
        window._veiculosParaEstoque.forEach(v => {
            const tp = String(v.tipo_veiculo || '').trim();
            if (tp) tiposMap[tp] = (tiposMap[tp] || 0) + 1;
        });
        const tiposList = Object.keys(tiposMap).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

        let html = '<div style="position:sticky;top:-10px;background:#fff;z-index:4;padding-bottom:6px;border-bottom:1px solid #e2e8f0;margin-bottom:2px;">' +
            '<input type="text" id="estoque-placas-busca" placeholder="Digite o modelo, tipo de veículo ou placa..." oninput="window.filtrarPlacasEstoqueModal(this.value)" ' +
                'style="width:100%;padding:5px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.84rem;box-sizing:border-box;margin-bottom:6px;">';

        if (tiposList.length) {
            html += '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;align-items:center;">' +
                '<span style="font-size:0.74rem;font-weight:700;color:#64748b;">Por tipo:</span>' +
                tiposList.map(tp => {
                    const tpKey = _normVeicEstoque(tp);
                    const veicsDoTipo = window._veiculosParaEstoque.filter(v => _normVeicEstoque(v.tipo_veiculo) === tpKey);
                    const chkTp = veicsDoTipo.length > 0 && veicsDoTipo.every(v => selSet.has(v.placa));
                    return '<label style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;border:1px solid ' + (chkTp ? '#93c5fd' : '#cbd5e1') + ';background:' + (chkTp ? '#eff6ff' : '#f8fafc') + ';color:' + (chkTp ? '#1d4ed8' : '#334155') + ';font-size:0.75rem;font-weight:700;cursor:pointer;user-select:none;">' +
                        '<input type="checkbox" class="estoque-tipo-veic-chk" data-tipo="' + _escVeicEstoque(tpKey) + '" ' + (chkTp ? 'checked' : '') + ' onchange="window.toggleTipoVeiculoEstoqueModal(this.dataset.tipo,this.checked)" style="accent-color:#1d4ed8;cursor:pointer;">' +
                        '<span>' + _escVeicEstoque(tp) + ' (' + tiposMap[tp] + ')</span></label>';
                }).join('') +
            '</div>';
        }

        const allChecked = window._veiculosParaEstoque.every(v => !v.placa || selSet.has(v.placa));
        html += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:2px 0;">' +
            '<input type="checkbox" id="estoque-placas-todas" onchange="window.toggleTodasPlacasEstoque(this.checked)" ' + (allChecked ? 'checked' : '') + '>' +
            '<span id="estoque-placas-todas-txt" style="font-weight:700;font-size:0.84rem;color:#1e293b;">Selecionar Todos</span>' +
        '</label></div>';

        window._veiculosParaEstoque.forEach(v => {
            if (!v.placa) return;
            const chk = selSet.has(v.placa) ? 'checked' : '';
            const textoBusca = _normVeicEstoque((v.marca_modelo_versao || '') + ' ' + (v.tipo_veiculo || '') + ' ' + v.placa);
            const tipoKey = _normVeicEstoque(v.tipo_veiculo || '');
            html += '<label class="estoque-placa-row" data-search="' + _escVeicEstoque(textoBusca) + '" data-tipo="' + _escVeicEstoque(tipoKey) + '" style="display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;padding:3px 4px;border-radius:6px;">' +
                '<span style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">' +
                    '<input type="checkbox" class="estoque-placa-chk" value="' + _escVeicEstoque(v.placa) + '" ' + chk + ' onchange="window.verificarTodasPlacasEstoque()">' +
                    '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><b>' + _escVeicEstoque(v.placa) + '</b>' + (v.marca_modelo_versao ? ' - ' + _escVeicEstoque(v.marca_modelo_versao) : '') + '</span>' +
                '</span>' +
                (v.tipo_veiculo ? '<span style="background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;font-size:0.7rem;font-weight:700;padding:1px 7px;border-radius:999px;white-space:nowrap;flex-shrink:0;">' + _escVeicEstoque(v.tipo_veiculo) + '</span>' : '') +
            '</label>';
        });
        cont.innerHTML = html;
    }

    window.filtrarPlacasEstoqueModal = function(txt) {
        const f = _normVeicEstoque(txt);
        document.querySelectorAll('#estoque-placas-list .estoque-placa-row').forEach(row => {
            const match = !f || (row.dataset.search || '').includes(f);
            row.style.display = match ? 'flex' : 'none';
        });
        const lblTodas = document.getElementById('estoque-placas-todas-txt');
        if (lblTodas) lblTodas.textContent = f ? 'Selecionar Todos (filtrados)' : 'Selecionar Todos';
        window.verificarTodasPlacasEstoque();
    };

    window.toggleTipoVeiculoEstoqueModal = function(tipoKey, checked) {
        document.querySelectorAll('#estoque-placas-list .estoque-placa-row').forEach(row => {
            if (row.dataset.tipo === tipoKey) {
                const cb = row.querySelector('.estoque-placa-chk');
                if (cb) cb.checked = checked;
            }
        });
        window.verificarTodasPlacasEstoque();
    };

    window.toggleTodasPlacasEstoque = function(checked) {
        document.querySelectorAll('#estoque-placas-list .estoque-placa-row').forEach(row => {
            if (row.style.display === 'none') return;
            const cb = row.querySelector('.estoque-placa-chk');
            if (cb) cb.checked = checked;
        });
        window.verificarTodasPlacasEstoque();
    };
    
    window.verificarTodasPlacasEstoque = function() {
        const rowsVisiveis = Array.from(document.querySelectorAll('#estoque-placas-list .estoque-placa-row')).filter(r => r.style.display !== 'none');
        const cbsVisiveis = rowsVisiveis.map(r => r.querySelector('.estoque-placa-chk')).filter(Boolean);
        const todas = document.getElementById('estoque-placas-todas');
        if (todas) {
            todas.checked = cbsVisiveis.length > 0 && cbsVisiveis.every(el => el.checked);
        }
        const checkedPlacas = new Set(Array.from(document.querySelectorAll('#estoque-placas-list .estoque-placa-chk:checked')).map(el => el.value));
        document.querySelectorAll('#estoque-placas-list .estoque-tipo-veic-chk').forEach(tc => {
            const tk = tc.dataset.tipo;
            const veics = (window._veiculosParaEstoque || []).filter(v => _normVeicEstoque(v.tipo_veiculo) === tk);
            const allChk = veics.length > 0 && veics.every(v => checkedPlacas.has(v.placa));
            tc.checked = allChk;
            const lbl = tc.parentElement;
            if (lbl) {
                lbl.style.borderColor = allChk ? '#93c5fd' : '#cbd5e1';
                lbl.style.background = allChk ? '#eff6ff' : '#f8fafc';
                lbl.style.color = allChk ? '#1d4ed8' : '#334155';
            }
        });
    };

window.enviarEmailEstoqueMinimo = async function(tipo) {
    const isRepos = tipo === 'reposicao';
    const btnId = isRepos ? 'btn-estoque-enviar-reposicao' : 'btn-estoque-enviar-compras';
    const btn = document.getElementById(btnId);
    const origHtml = btn ? btn.innerHTML : '';
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
        }
        const resp = await fetch(API_URL + '/estoque/enviar-email-minimo', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tipo: isRepos ? 'reposicao' : 'compra' })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.error || ('Erro ' + resp.status));

        if (data && data.success) {
            Swal.fire({
                icon: 'success',
                title: isRepos ? 'E-mail de Reposição Enviado!' : 'E-mail de Compras Enviado!',
                html: 'Lista com <b>' + data.total_itens + '</b> ' + (data.total_itens === 1 ? 'produto' : 'produtos') + ' enviada para:<br><small style="color:#475569;">' + (data.destinatarios || []).join(', ') + '</small>'
            });
        } else {
            Swal.fire({
                icon: data && data.empty ? 'info' : 'warning',
                title: data && data.empty ? (isRepos ? 'Sem itens para reposição' : 'Sem itens para compra') : 'Atenção',
                text: (data && data.message) || 'Não foi possível enviar o e-mail.'
            });
        }
    } catch (e) {
        Swal.fire({
            icon: 'error',
            title: 'Erro ao enviar e-mail',
            text: e.message
        });
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
};


// ══════════════════════════════════════════════════════════════════════════════
// ABA: EQUIPAMENTOS (ESTOQUE ADMINISTRATIVO)
// ══════════════════════════════════════════════════════════════════════════════
window._equipamentosEstoqueData = [];
window._equipamentosEstoqueSortCol = 'codigo';
window._equipamentosEstoqueSortAsc = true;

window.carregarEquipamentosEstoque = async function() {
    const tbody = document.getElementById('table-estoque-equipamentos');
    if (tbody && (!window._equipamentosEstoqueData || window._equipamentosEstoqueData.length === 0)) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#64748b;">Carregando equipamentos...</td></tr>';
    }
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const r = await fetch(API_URL + '/estoque-equipamentos', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!r.ok) throw new Error('Erro ao carregar equipamentos');
        const rows = await r.json();
        window._equipamentosEstoqueData = Array.isArray(rows) ? rows : [];
        window.renderEquipamentosEstoqueTable();
    } catch (err) {
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#ef4444;">Erro ao carregar equipamentos: ' + err.message + '</td></tr>';
        }
    }
};

window.ordenarTabelaEquipamentosEstoque = function(col) {
    if (window._equipamentosEstoqueSortCol === col) {
        window._equipamentosEstoqueSortAsc = !window._equipamentosEstoqueSortAsc;
    } else {
        window._equipamentosEstoqueSortCol = col;
        window._equipamentosEstoqueSortAsc = true;
    }
    window.renderEquipamentosEstoqueTable();
};

window.renderEquipamentosEstoqueTable = function() {
    const tbody = document.getElementById('table-estoque-equipamentos');
    if (!tbody) return;

    const busca = (document.getElementById('filtro-equip-est-busca')?.value || '').trim().toLowerCase();
    const grupo = (document.getElementById('filtro-equip-est-grupo')?.value || '').trim();
    const fonte = (document.getElementById('filtro-equip-est-fonte')?.value || '').trim();
    const venda = (document.getElementById('filtro-equip-est-venda')?.value || '').trim();
    const tipoItem = (document.getElementById('filtro-equip-est-tipo-item')?.value || '').trim();

    let lista = (window._equipamentosEstoqueData || []).filter(item => {
        if (busca) {
            const matchNome = String(item.nome || '').toLowerCase().includes(busca);
            const matchCod  = String(item.codigo || '').toLowerCase().includes(busca);
            const matchEsp  = String(item.especificacao_tecnica || '').toLowerCase().includes(busca);
            if (!matchNome && !matchCod && !matchEsp) return false;
        }
        if (grupo && !String(item.grupo_produto || '').toUpperCase().includes(grupo.toUpperCase())) return false;
        if (fonte && !String(item.fonte_fornecimento || '').toUpperCase().includes(fonte.toUpperCase())) return false;
        if (venda !== '' && String(item.produto_venda ? '1' : '0') !== venda) return false;
        if (tipoItem !== '' && String(item.tipo_item || 'matriz').toLowerCase() !== tipoItem) return false;
        return true;
    });

    const col = window._equipamentosEstoqueSortCol || 'codigo';
    const dir = window._equipamentosEstoqueSortAsc ? 1 : -1;
    lista.sort((a, b) => {
        if (col === 'produto_venda') {
            return ((a.produto_venda ? 1 : 0) - (b.produto_venda ? 1 : 0)) * dir;
        }
        if (col === 'tipo_item') {
            const ta = String(a.tipo_item || 'matriz').toLowerCase();
            const tb = String(b.tipo_item || 'matriz').toLowerCase();
            return ta.localeCompare(tb, 'pt-BR') * dir;
        }
        const va = String(a[col] || '').toLowerCase();
        const vb = String(b[col] || '').toLowerCase();
        return va.localeCompare(vb, 'pt-BR', { numeric: true }) * dir;
    });

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#64748b;padding:2rem;">Nenhum equipamento encontrado.</td></tr>';
        return;
    }

    const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    tbody.innerHTML = lista.map(item => {
        const isVenda = !!item.produto_venda;
        const badgeVenda = isVenda
            ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#dcfce7;color:#15803d;border:1px solid #86efac;border-radius:999px;padding:2px 10px;font-size:0.74rem;font-weight:700;white-space:nowrap;"><span style="width:7px;height:7px;border-radius:50%;background:#16a34a;"></span>ON (Sim)</span>'
            : '<span style="display:inline-flex;align-items:center;gap:4px;background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;border-radius:999px;padding:2px 10px;font-size:0.74rem;font-weight:600;white-space:nowrap;"><span style="width:7px;height:7px;border-radius:50%;background:#94a3b8;"></span>OFF (Não)</span>';

        const isMatriz = String(item.tipo_item || 'matriz').toLowerCase() !== 'estoque';
        const badgeTipoItem = isMatriz
            ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;border-radius:999px;padding:2px 10px;font-size:0.74rem;font-weight:700;white-space:nowrap;" title="Disponível para seleção na tela de Proposta"><span style="width:7px;height:7px;border-radius:50%;background:#2563eb;"></span>ON (Produto Matriz)</span>'
            : '<span style="display:inline-flex;align-items:center;gap:4px;background:#fef3c7;color:#b45309;border:1px solid #fcd34d;border-radius:999px;padding:2px 10px;font-size:0.74rem;font-weight:700;white-space:nowrap;" title="Controle interno de quantidade disponível em estoque"><span style="width:7px;height:7px;border-radius:50%;background:#d97706;"></span>OFF (Estoque)</span>';

        const especTexto = String(item.especificacao_tecnica || '').trim();
        const especPreview = especTexto
            ? '<div style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#475569;font-size:0.82rem;" title="' + esc(especTexto) + '">' + esc(especTexto) + '</div>'
            : '<span style="color:#94a3b8;font-size:0.8rem;">—</span>';

        return '<tr>' +
            '<td><span style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:6px;padding:3px 8px;font-weight:700;font-size:0.78rem;white-space:nowrap;">' + esc(item.codigo) + '</span></td>' +
            '<td style="font-weight:600;color:#1e293b;">' + esc(item.nome) + '</td>' +
            '<td><span style="background:#f8fafc;color:#334155;border:1px solid #e2e8f0;border-radius:6px;padding:2px 8px;font-size:0.76rem;font-weight:600;white-space:nowrap;">' + esc(item.unidade_medida) + '</span></td>' +
            '<td style="color:#334155;font-size:0.84rem;font-weight:600;text-transform:uppercase;">' + esc(String(item.fonte_fornecimento || '').toUpperCase()) + '</td>' +
            '<td><span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:2px 8px;font-size:0.75rem;font-weight:700;white-space:nowrap;">' + esc(String(item.grupo_produto || '').toUpperCase()) + '</span></td>' +
            '<td style="text-align:center;">' + badgeVenda + '</td>' +
            '<td style="text-align:center;">' + badgeTipoItem + '</td>' +
            '<td>' + especPreview + '</td>' +
            '<td style="text-align:right;white-space:nowrap;">' +
                '<div style="display:inline-flex;gap:6px;align-items:center;">' +
                    '<button type="button" class="btn btn-sm" onclick="window.duplicarEquipamentoEstoque(' + item.id + ')" title="Duplicar equipamento para editar e salvar" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;display:inline-flex;align-items:center;gap:4px;font-weight:600;font-size:0.76rem;padding:4px 9px;">' +
                        '<i class="ph ph-copy"></i> Duplicar' +
                    '</button>' +
                    '<button type="button" class="btn btn-sm" onclick="window.abrirModalEquipamentoEstoque(' + item.id + ')" title="Editar" style="background:#f8fafc;color:#334155;border:1px solid #cbd5e1;padding:4px 8px;">' +
                        '<i class="ph ph-pencil-simple"></i>' +
                    '</button>' +
                    '<button type="button" class="btn btn-sm" onclick="window.excluirEquipamentoEstoque(' + item.id + ')" title="Excluir" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;padding:4px 8px;">' +
                        '<i class="ph ph-trash"></i>' +
                    '</button>' +
                '</div>' +
            '</td>' +
        '</tr>';
    }).join('');
};

window.setVendaEquipamentoEstoqueUI = function(ativo) {
    const inp = document.getElementById('equipamento-est-venda');
    const btn = document.getElementById('btn-toggle-venda-equipamento');
    const dot = document.getElementById('dot-toggle-venda-equipamento');
    const lbl = document.getElementById('lbl-toggle-venda-equipamento');
    const isOn = !!ativo;
    if (inp) inp.value = isOn ? '1' : '0';
    if (btn) {
        btn.style.background  = isOn ? '#dcfce7' : '#e2e8f0';
        btn.style.borderColor = isOn ? '#22c55e' : '#cbd5e1';
        btn.style.color       = isOn ? '#15803d' : '#475569';
    }
    if (dot) {
        dot.style.background = isOn ? '#16a34a' : '#64748b';
    }
    if (lbl) {
        lbl.textContent = isOn ? 'ON (Sim)' : 'OFF (Não)';
    }
};

window.toggleVendaEquipamentoEstoque = function() {
    const inp = document.getElementById('equipamento-est-venda');
    const atual = inp && inp.value === '1';
    window.setVendaEquipamentoEstoqueUI(!atual);
};

window.setTipoItemEquipamentoEstoqueUI = function(isMatriz) {
    const inp = document.getElementById('equipamento-est-tipo-item');
    const btn = document.getElementById('btn-toggle-matriz-equipamento');
    const dot = document.getElementById('dot-toggle-matriz-equipamento');
    const lbl = document.getElementById('lbl-toggle-matriz-equipamento');
    const matrizOn = isMatriz !== false && isMatriz !== 'estoque' && isMatriz !== '0';
    if (inp) inp.value = matrizOn ? 'matriz' : 'estoque';
    if (btn) {
        btn.style.background  = matrizOn ? '#dbeafe' : '#fef3c7';
        btn.style.borderColor = matrizOn ? '#3b82f6' : '#f59e0b';
        btn.style.color       = matrizOn ? '#1d4ed8' : '#b45309';
    }
    if (dot) {
        dot.style.background = matrizOn ? '#2563eb' : '#d97706';
    }
    if (lbl) {
        lbl.textContent = matrizOn ? 'ON (Produto Matriz)' : 'OFF (Produto de Estoque)';
    }
};

window.toggleTipoItemEquipamentoEstoque = function() {
    const inp = document.getElementById('equipamento-est-tipo-item');
    const atualMatriz = !inp || inp.value !== 'estoque';
    window.setTipoItemEquipamentoEstoqueUI(!atualMatriz);
};

window._buscarProximoCodigoEquipamento = async function() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const r = await fetch(API_URL + '/estoque-equipamentos/proximo-codigo', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (r.ok) {
            const d = await r.json();
            if (d && d.codigo) return d.codigo;
        }
    } catch (e) {}
    return 'Automático';
};

window.abrirModalEquipamentoEstoque = async function(id) {
    const modal = document.getElementById('modal-estoque-equipamento');
    if (!modal) return;

    const titleEl = document.getElementById('modal-equipamento-estoque-title');
    const subEl   = document.getElementById('modal-equipamento-estoque-subtitle');
    const btnDup  = document.getElementById('btn-modal-duplicar-equipamento');

    if (id) {
        const item = (window._equipamentosEstoqueData || []).find(x => x.id == id);
        if (!item) return;
        document.getElementById('equipamento-est-id').value = item.id;
        document.getElementById('equipamento-est-codigo').value = item.codigo || '';
        document.getElementById('equipamento-est-nome').value = item.nome || '';
        document.getElementById('equipamento-est-unidade').value = item.unidade_medida || 'UNIDADE [UN]';
        document.getElementById('equipamento-est-fonte').value = String(item.fonte_fornecimento || 'OUTROS').toUpperCase();
        document.getElementById('equipamento-est-grupo').value = String(item.grupo_produto || 'STANDARD').toUpperCase();
        document.getElementById('equipamento-est-especificacao').value = item.especificacao_tecnica || '';
        window.setVendaEquipamentoEstoqueUI(!!item.produto_venda);
        window.setTipoItemEquipamentoEstoqueUI(String(item.tipo_item || 'matriz').toLowerCase() !== 'estoque');
        if (titleEl) titleEl.textContent = 'Editar Equipamento';
        if (subEl) subEl.textContent = 'Edite os dados ou clique em Duplicar para criar uma cópia';
        if (btnDup) btnDup.style.display = 'inline-flex';
    } else {
        document.getElementById('equipamento-est-id').value = '';
        document.getElementById('equipamento-est-codigo').value = 'Gerando...';
        document.getElementById('equipamento-est-nome').value = '';
        document.getElementById('equipamento-est-unidade').value = 'UNIDADE [UN]';
        document.getElementById('equipamento-est-fonte').value = 'QUÍMICOS OBRA';
        document.getElementById('equipamento-est-grupo').value = 'STANDARD';
        document.getElementById('equipamento-est-especificacao').value = '';
        window.setVendaEquipamentoEstoqueUI(false);
        window.setTipoItemEquipamentoEstoqueUI(true);
        if (titleEl) titleEl.textContent = 'Cadastrar Equipamento';
        if (subEl) subEl.textContent = 'O código é gerado automaticamente';
        if (btnDup) btnDup.style.display = 'none';

        const proxCod = await window._buscarProximoCodigoEquipamento();
        document.getElementById('equipamento-est-codigo').value = proxCod;
    }

    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('equipamento-est-nome')?.focus(), 80);
};

window.duplicarEquipamentoEstoque = async function(id) {
    const item = (window._equipamentosEstoqueData || []).find(x => x.id == id);
    if (!item) return;

    const modal = document.getElementById('modal-estoque-equipamento');
    if (!modal) return;

    document.getElementById('equipamento-est-id').value = '';
    document.getElementById('equipamento-est-codigo').value = 'Gerando...';
    document.getElementById('equipamento-est-nome').value = item.nome || '';
    document.getElementById('equipamento-est-unidade').value = item.unidade_medida || 'UNIDADE [UN]';
    document.getElementById('equipamento-est-fonte').value = String(item.fonte_fornecimento || 'OUTROS').toUpperCase();
    document.getElementById('equipamento-est-grupo').value = String(item.grupo_produto || 'STANDARD').toUpperCase();
    document.getElementById('equipamento-est-especificacao').value = item.especificacao_tecnica || '';
    window.setVendaEquipamentoEstoqueUI(!!item.produto_venda);
    window.setTipoItemEquipamentoEstoqueUI(String(item.tipo_item || 'matriz').toLowerCase() !== 'estoque');

    const titleEl = document.getElementById('modal-equipamento-estoque-title');
    const subEl   = document.getElementById('modal-equipamento-estoque-subtitle');
    const btnDup  = document.getElementById('btn-modal-duplicar-equipamento');
    if (titleEl) titleEl.textContent = 'Duplicar Equipamento';
    if (subEl) subEl.textContent = 'Altere o nome e as informações necessárias antes de salvar';
    if (btnDup) btnDup.style.display = 'none';

    modal.style.display = 'flex';
    const proxCod = await window._buscarProximoCodigoEquipamento();
    document.getElementById('equipamento-est-codigo').value = proxCod;
    setTimeout(() => {
        const inpNome = document.getElementById('equipamento-est-nome');
        if (inpNome) {
            inpNome.focus();
            inpNome.select();
        }
    }, 80);
};

window.duplicarEquipamentoDoModal = async function() {
    document.getElementById('equipamento-est-id').value = '';
    document.getElementById('equipamento-est-codigo').value = 'Gerando...';
    const titleEl = document.getElementById('modal-equipamento-estoque-title');
    const subEl   = document.getElementById('modal-equipamento-estoque-subtitle');
    const btnDup  = document.getElementById('btn-modal-duplicar-equipamento');
    if (titleEl) titleEl.textContent = 'Duplicar Equipamento';
    if (subEl) subEl.textContent = 'Cópia pronta — altere o nome e edite as informações antes de salvar';
    if (btnDup) btnDup.style.display = 'none';

    const proxCod = await window._buscarProximoCodigoEquipamento();
    document.getElementById('equipamento-est-codigo').value = proxCod;
    const inpNome = document.getElementById('equipamento-est-nome');
    if (inpNome) {
        inpNome.focus();
        inpNome.select();
    }
};

window.fecharModalEquipamentoEstoque = function() {
    const modal = document.getElementById('modal-estoque-equipamento');
    if (modal) modal.style.display = 'none';
};

window.salvarEquipamentoEstoque = async function(event) {
    if (event) event.preventDefault();

    const id = (document.getElementById('equipamento-est-id')?.value || '').trim();
    const nome = (document.getElementById('equipamento-est-nome')?.value || '').trim();
    const unidade_medida = document.getElementById('equipamento-est-unidade')?.value || 'UNIDADE [UN]';
    const fonte_fornecimento = String(document.getElementById('equipamento-est-fonte')?.value || 'OUTROS').trim().toUpperCase();
    const grupo_produto = String(document.getElementById('equipamento-est-grupo')?.value || 'STANDARD').trim().toUpperCase();
    const especificacao_tecnica = (document.getElementById('equipamento-est-especificacao')?.value || '').trim();
    const produto_venda = document.getElementById('equipamento-est-venda')?.value === '1' ? 1 : 0;
    const tipo_item = document.getElementById('equipamento-est-tipo-item')?.value === 'estoque' ? 'estoque' : 'matriz';

    if (!nome) {
        Swal.fire({ icon: 'warning', title: 'Atenção', text: 'Informe o nome do equipamento.' });
        return;
    }

    // Validação no frontend: não permitir 2 equipamentos com o mesmo nome exato
    const nomeNorm = nome.toLowerCase();
    const existente = (window._equipamentosEstoqueData || []).find(item =>
        String(item.nome || '').trim().toLowerCase() === nomeNorm && String(item.id) !== String(id)
    );
    if (existente) {
        Swal.fire({
            icon: 'warning',
            title: 'Nome já cadastrado',
            text: 'Já existe um equipamento cadastrado com exatamente o nome "' + existente.nome + '" (Código: ' + existente.codigo + '). Altere o nome antes de salvar.'
        });
        return;
    }

    const btn = document.getElementById('btn-salvar-equipamento-estoque');
    const origText = btn ? btn.innerHTML : '';
    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = 'Salvando...';
        }
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const url = id ? (API_URL + '/estoque-equipamentos/' + id) : (API_URL + '/estoque-equipamentos');
        const method = id ? 'PUT' : 'POST';

        const r = await fetch(url, {
            method,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome,
                unidade_medida,
                fonte_fornecimento,
                grupo_produto,
                especificacao_tecnica,
                produto_venda,
                tipo_item
            })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
            throw new Error(data.error || 'Erro ao salvar equipamento');
        }

        window.fecharModalEquipamentoEstoque();
        await window.carregarEquipamentosEstoque();
        Swal.fire({
            icon: 'success',
            title: id ? 'Equipamento atualizado!' : 'Equipamento cadastrado!',
            text: !id && data.codigo ? ('Código gerado: ' + data.codigo) : undefined,
            timer: 1800,
            showConfirmButton: false
        });
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Não foi possível salvar',
            text: err.message
        });
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origText;
        }
    }
};

window.excluirEquipamentoEstoque = async function(id) {
    const item = (window._equipamentosEstoqueData || []).find(x => x.id == id);
    if (!item) return;

    const conf = await Swal.fire({
        icon: 'warning',
        title: 'Excluir equipamento?',
        html: 'Deseja realmente excluir <b>' + item.codigo + ' — ' + item.nome + '</b>?',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar'
    });
    if (!conf.isConfirmed) return;

    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const r = await fetch(API_URL + '/estoque-equipamentos/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'Erro ao excluir equipamento');
        await window.carregarEquipamentosEstoque();
        Swal.fire({ icon: 'success', title: 'Equipamento excluído!', timer: 1400, showConfirmButton: false });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Erro ao excluir', text: err.message });
    }
};


window.baixarModeloPlanilhaEquipamentos = async function() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const r = await fetch(API_URL + '/estoque-equipamentos/modelo-xlsx', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!r.ok) throw new Error('Falha ao baixar planilha modelo');
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modelo_importacao_equipamentos.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Erro', text: e.message });
    }
};

window.abrirModalImportarEquipamentos = async function() {
    const { value: file, isConfirmed } = await Swal.fire({
        title: '<span style="font-size:1.15rem;font-weight:800;color:#0f172a;"><i class="ph ph-file-xls" style="color:#0f766e;"></i> Importar Produtos (.xlsx)</span>',
        width: 620,
        html: `
            <div style="text-align:left;font-size:0.86rem;color:#334155;">
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px;margin-bottom:14px;">
                    <div style="font-weight:700;color:#166534;margin-bottom:6px;">Colunas esperadas na planilha (.xlsx):</div>
                    <ul style="margin:0;padding-left:18px;color:#15803d;line-height:1.55;font-size:0.82rem;">
                        <li><b>Nome</b> (obrigatório — nomes duplicados são ignorados automaticamente)</li>
                        <li><b>Unidade de medida</b> (ex: UNIDADE [UN], CAIXA [CX], LITRO [LT]...)</li>
                        <li><b>Grupo</b> (ex: STANDARD, LUXO, LAVATÓRIOS, GUARITAS...)</li>
                        <li><b>Fonte de fornecimento</b> (QUÍMICOS OBRA, QUÍMICOS EVENTO, HIDRÁULICOS, LAVATÓRIOS, GUARITAS, PARCEIROS, SERVIÇOS, OUTROS)</li>
                        <li><b>Texto técnico</b> (Especificação técnica)</li>
                        <li><b>Venda</b> (Sim ou Não)</li>
                        <li><b>Estoque ou Produto</b> (<b>Produto</b> / <b>Matriz</b> = aparece na Proposta | <b>Estoque</b> = controle interno)</li>
                    </ul>
                    <div style="margin-top:10px;">
                        <button type="button" onclick="window.baixarModeloPlanilhaEquipamentos()" style="background:#fff;color:#0f766e;border:1px solid #0f766e;border-radius:6px;padding:5px 12px;font-size:0.78rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
                            <i class="ph ph-download-simple"></i> Baixar Planilha Modelo (.xlsx)
                        </button>
                    </div>
                </div>
                <label style="display:block;font-weight:700;color:#1e293b;margin-bottom:6px;">Selecione o arquivo Excel (.xlsx):</label>
                <input type="file" id="input-import-equipamentos-xlsx" accept=".xlsx,.xls" class="form-control" style="width:100%;padding:8px;">
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#0f766e',
        confirmButtonText: '<i class="ph ph-upload-simple"></i> Importar Planilha',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const inp = document.getElementById('input-import-equipamentos-xlsx');
            if (!inp || !inp.files || !inp.files[0]) {
                Swal.showValidationMessage('Selecione uma planilha .xlsx para continuar.');
                return false;
            }
            return inp.files[0];
        }
    });

    if (!isConfirmed || !file) return;

    Swal.fire({
        title: 'Importando equipamentos...',
        text: 'Processando planilha, aguarde...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const fd = new FormData();
        fd.append('arquivo', file);

        const r = await fetch(API_URL + '/estoque-equipamentos/importar', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: fd
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
            throw new Error(data.error || 'Erro ao importar planilha de equipamentos.');
        }

        await window.carregarEquipamentosEstoque();

        let msgHtml = '<div style="text-align:left;font-size:0.88rem;">' +
            '<p style="margin:0 0 8px;"><b>Equipamentos importados com sucesso:</b> <span style="color:#16a34a;font-weight:800;">' + (data.importados || 0) + '</span></p>';
        if (data.ignorados_duplicados > 0) {
            msgHtml += '<p style="margin:0 0 6px;color:#b45309;"><b>Ignorados por nome já existente:</b> ' + data.ignorados_duplicados + '</p>';
            if (Array.isArray(data.duplicados_nomes) && data.duplicados_nomes.length > 0) {
                msgHtml += '<div style="max-height:110px;overflow-y:auto;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:6px 10px;font-size:0.78rem;color:#92400e;">' +
                    data.duplicados_nomes.join('<br>') +
                '</div>';
            }
        }
        msgHtml += '</div>';

        Swal.fire({
            icon: 'success',
            title: 'Importação Concluída!',
            html: msgHtml,
            confirmButtonColor: '#0f766e'
        });
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Falha na importação',
            text: err.message
        });
    }
};


// ── Combobox Pesquisável / Digitável para Fonte de Fornecimento e Grupo de Produto ──
window._FONTES_EQUIPAMENTO_PADRAO = [
    'QUÍMICOS OBRA',
    'QUÍMICOS EVENTO',
    'HIDRÁULICOS',
    'LAVATÓRIOS',
    'GUARITAS',
    'PARCEIROS',
    'SERVIÇOS',
    'OUTROS'
];

window._GRUPOS_EQUIPAMENTO_PADRAO = [
    'STANDARD',
    'LUXO',
    'EXTRA LUXO',
    'PCD',
    'MICTÓRIO',
    'LAVATÓRIOS',
    'CHUVEIRO',
    'HIDRÁULICO',
    'GUARITAS',
    'SERVIÇOS',
    'AVARIA',
    'ACESSÓRIO',
    'OUTROS',
    'CONTAINER',
    'CONTENÇÃO',
    'PISOS',
    'ESTRUTURAS',
    'BRINQUEDOS',
    'TENDA',
    'MOBILIÁRIO',
    'LICENÇAS',
    'GUARITAS / BILHETERIAS',
    'VIP'
];

window._obterOpcoesComboEquipamento = function(tipo) {
    const isFonte = tipo.includes('fonte');
    const base = isFonte ? window._FONTES_EQUIPAMENTO_PADRAO.slice() : window._GRUPOS_EQUIPAMENTO_PADRAO.slice();
    const setNorm = new Set(base.map(x => x.toUpperCase()));
    (window._equipamentosEstoqueData || []).forEach(item => {
        const val = String(isFonte ? item.fonte_fornecimento : item.grupo_produto || '').trim().toUpperCase();
        if (val && !setNorm.has(val)) {
            setNorm.add(val);
            base.push(val);
        }
    });
    return base;
};

window._getComboConfigEquipamento = function(tipo) {
    if (tipo === 'filtro-grupo') {
        return { inputId: 'filtro-equip-est-grupo', listId: 'combo-list-filtro-grupo', isFiltro: true, labelTodos: 'TODOS OS GRUPOS' };
    }
    if (tipo === 'filtro-fonte') {
        return { inputId: 'filtro-equip-est-fonte', listId: 'combo-list-filtro-fonte', isFiltro: true, labelTodos: 'TODAS AS FONTES' };
    }
    if (tipo === 'modal-fonte') {
        return { inputId: 'equipamento-est-fonte', listId: 'combo-list-modal-fonte', isFiltro: false };
    }
    if (tipo === 'modal-grupo') {
        return { inputId: 'equipamento-est-grupo', listId: 'combo-list-modal-grupo', isFiltro: false };
    }
    return null;
};

window.fecharTodosCombosEquipamento = function(excetoListId) {
    ['combo-list-filtro-grupo', 'combo-list-filtro-fonte', 'combo-list-modal-fonte', 'combo-list-modal-grupo'].forEach(id => {
        if (id !== excetoListId) {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        }
    });
};

window.abrirComboEquipamento = function(tipo, filtrarPorTexto) {
    const cfg = window._getComboConfigEquipamento(tipo);
    if (!cfg) return;
    const inputEl = document.getElementById(cfg.inputId);
    const listEl  = document.getElementById(cfg.listId);
    if (!inputEl || !listEl) return;

    window.fecharTodosCombosEquipamento(cfg.listId);

    const todasOpcoes = window._obterOpcoesComboEquipamento(tipo);
    const termo = filtrarPorTexto ? String(inputEl.value || '').trim().toUpperCase() : '';
    const norm = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const termoNorm = norm(termo);

    const filtradas = termoNorm
        ? todasOpcoes.filter(op => norm(op).includes(termoNorm))
        : todasOpcoes;

    const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    let html = '';
    if (cfg.isFiltro) {
        html += '<div onmousedown="window.selecionarOpcaoComboEquipamento(\'' + tipo + '\', \'\')" ' +
            'style="padding:8px 12px;cursor:pointer;font-size:0.8rem;font-weight:700;color:#64748b;border-bottom:1px solid #f1f5f9;background:#f8fafc;" ' +
            'onmouseover="this.style.background=\'#e2e8f0\'" onmouseout="this.style.background=\'#f8fafc\'">' +
            esc(cfg.labelTodos) + '</div>';
    }

    if (filtradas.length === 0 && termo) {
        html += '<div onmousedown="window.selecionarOpcaoComboEquipamento(\'' + tipo + '\', \'' + esc(termo) + '\')" ' +
            'style="padding:9px 12px;cursor:pointer;font-size:0.81rem;font-weight:700;color:#0f766e;background:#f0fdf4;">' +
            '<i class="ph ph-plus-circle"></i> Usar "' + esc(termo) + '"</div>';
    } else {
        html += filtradas.map(op => {
            const selecionado = String(inputEl.value || '').trim().toUpperCase() === op;
            const bg = selecionado ? '#fff7ed' : '#fff';
            const cor = selecionado ? '#c2410c' : '#1e293b';
            return '<div onmousedown="window.selecionarOpcaoComboEquipamento(\'' + tipo + '\', \'' + esc(op) + '\')" ' +
                'style="padding:8px 12px;cursor:pointer;font-size:0.81rem;font-weight:600;color:' + cor + ';background:' + bg + ';border-bottom:1px solid #f8fafc;text-transform:uppercase;" ' +
                'onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'' + bg + '\'">' +
                esc(op) + '</div>';
        }).join('');
    }

    listEl.innerHTML = html;
    listEl.style.display = 'block';
};

window.toggleComboEquipamento = function(tipo) {
    const cfg = window._getComboConfigEquipamento(tipo);
    if (!cfg) return;
    const listEl = document.getElementById(cfg.listId);
    const inputEl = document.getElementById(cfg.inputId);
    if (!listEl) return;
    if (listEl.style.display === 'block') {
        listEl.style.display = 'none';
    } else {
        window.abrirComboEquipamento(tipo, false);
        if (inputEl) inputEl.focus();
    }
};

window.selecionarOpcaoComboEquipamento = function(tipo, valor) {
    const cfg = window._getComboConfigEquipamento(tipo);
    if (!cfg) return;
    const inputEl = document.getElementById(cfg.inputId);
    const listEl  = document.getElementById(cfg.listId);
    if (inputEl) inputEl.value = String(valor || '').toUpperCase();
    if (listEl) listEl.style.display = 'none';
    if (cfg.isFiltro) {
        window.renderEquipamentosEstoqueTable();
    }
};

if (!window._comboEquipamentoClickOutsideBound) {
    window._comboEquipamentoClickOutsideBound = true;
    document.addEventListener('mousedown', function(e) {
        const wraps = [
            'wrap-filtro-equip-est-grupo',
            'wrap-filtro-equip-est-fonte',
            'wrap-modal-equip-est-fonte',
            'wrap-modal-equip-est-grupo'
        ];
        const clicouDentro = wraps.some(wId => {
            const el = document.getElementById(wId);
            return el && el.contains(e.target);
        });
        if (!clicouDentro) {
            window.fecharTodosCombosEquipamento();
        }
    });
}
