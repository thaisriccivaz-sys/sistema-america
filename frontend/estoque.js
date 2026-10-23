
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

document.addEventListener('click', (e) => {
    const btn = document.getElementById("filtro-estoque-endereco-btn");
    const dropdown = document.getElementById("filtro-estoque-endereco-dropdown");
    if (btn && dropdown) {
        if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    }
});
window.renderEstoqueTable = async function(preserveScroll = false) {
    const table = document.getElementById("table-estoque");
    if (!table) return;
    
    const lastScrollY = window.scrollY;
    
    try {
        if (!preserveScroll) {
            table.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;">Carregando...</td></tr>';
        }
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

        const endContainer = document.getElementById("filtro-estoque-endereco-dropdown");
        if (endContainer && !endContainer.dataset.populated && window._estoqueEnderecos.length > 0) {
            endContainer.dataset.populated = "true";
            let html = `<label style="display:flex; align-items:center; gap:8px; padding:6px; cursor:pointer; font-size:0.85rem; color:#334155; border-radius:4px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                <input type="checkbox" value="" checked onchange="window.toggleTodosEnderecosFiltro(this)"> Todos
            </label>`;
            window._estoqueEnderecos.forEach(end => {
                html += `<label style="display:flex; align-items:center; gap:8px; padding:6px; cursor:pointer; font-size:0.85rem; color:#334155; border-radius:4px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                    <input type="checkbox" value="${end.id}" class="filtro-estoque-end-cb" onchange="window.updateEnderecoFiltroText(); window.renderEstoqueTable()"> ${end.nome}
                </label>`;
            });
            endContainer.innerHTML = html;
        }

        let selectedEnderecos = [];
        if (endContainer) {
            const checkboxes = endContainer.querySelectorAll('.filtro-estoque-end-cb:checked');
            selectedEnderecos = Array.from(checkboxes).map(cb => cb.value);
        }

        if (nome) data = data.filter(i => i.nome.toLowerCase().includes(nome));
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
                    'XG': 6, 'EG': 7, 'EXG': 8, 'XGG': 9, 'XXG': 10, 'EGG': 11,
                    'G1': 12, 'G2': 13, 'G3': 14, 'G4': 15, 'UNICO': 16, 'ÚNICO': 16
                };
                if (map[t] !== undefined) return map[t];
                const num = parseInt(t, 10);
                if (!isNaN(num)) return 100 + num;
                return 900;
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

        // Ordenar por Categoria (ordem alfabética) e, dentro de cada categoria, por Nome do produto (ordem alfabética)
        data.sort(function(a, b) {
            const catA = String(a.categoria || 'Sem Categoria').trim();
            const catB = String(b.categoria || 'Sem Categoria').trim();
            const cmpCat = catA.localeCompare(catB, 'pt-BR', { sensitivity: 'base' });
            if (cmpCat !== 0) return cmpCat;
            return String(a.nome || '').trim().localeCompare(String(b.nome || '').trim(), 'pt-BR', { sensitivity: 'base', numeric: true });
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

            let saldos = saldosMap[item.id] || [];
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
                ? '<img src="' + fotoSrc + '" onclick="event.stopPropagation(); window.ampliarFotoEstoque(this.src, \'' + safeItemNome + '\')" title="Clique para ampliar a foto" style="width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;cursor:zoom-in;transition:transform 0.15s;" onmouseover="this.style.transform=\'scale(1.08)\'" onmouseout="this.style.transform=\'scale(1)\'">'
                : '<div style="width:40px;height:40px;border-radius:8px;background:#f1f5f9;border:1px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;"><i class="ph ph-image" style="color:#94a3b8;font-size:1.2rem;"></i></div>';

            const warnIcon = isLow ? '<i class="ph ph-warning-circle" style="color:#ef4444;margin-right:4px;" title="Estoque Mínimo"></i>' : "";

            // Resumo de tamanhos abaixo do nome quando o produto possui tamanhos
            let resumoTamanhosHtml = '';
            if (hasSizes) {
                const mapTam = {};
                try {
                    const savedTams = JSON.parse(item.tamanhos_lista || '[]');
                    if (Array.isArray(savedTams)) {
                        savedTams.forEach(t => {
                            const tk = String(t || '').trim().toUpperCase();
                            if (tk) mapTam[tk] = { qtd: 0, low: false };
                        });
                    }
                } catch(e) {}
                saldos.forEach(s => {
                    const tk = String(s.tamanho || '').trim().toUpperCase();
                    if (!tk) return;
                    if (!mapTam[tk]) mapTam[tk] = { qtd: 0, low: false };
                    mapTam[tk].qtd += (parseInt(s.quantidade) || 0);
                    const minRef = (parseInt(s.quantidade_minima) > 0) ? parseInt(s.quantidade_minima) : parseInt(item.quantidade_minima) || 0;
                    if (minRef > 0 && (parseInt(s.quantidade) || 0) < minRef) {
                        mapTam[tk].low = true;
                    }
                });
                const tamsSorted = Object.keys(mapTam).sort((a, b) => window._ordemTamanhoEstoque(a) - window._ordemTamanhoEstoque(b));
                if (tamsSorted.length > 0) {
                    resumoTamanhosHtml = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">' +
                        tamsSorted.map(tk => {
                            const info = mapTam[tk];
                            const bg = info.low ? '#fef2f2' : '#eff6ff';
                            const col = info.low ? '#dc2626' : '#1e40af';
                            const brd = info.low ? '#fecaca' : '#bfdbfe';
                            return '<span style="display:inline-flex;align-items:center;gap:3px;background:' + bg + ';color:' + col + ';border:1px solid ' + brd + ';border-radius:6px;padding:1px 6px;font-size:0.7rem;font-weight:700;">' +
                                tk + ': ' + info.qtd + (info.low ? ' <i class="ph ph-warning" style="font-size:0.72rem;"></i>' : '') +
                            '</span>';
                        }).join('') +
                    '</div>';
                }
            }

            // ── Botões de ação (apenas na primeira linha do produto) ──
            const acoesBtns =
                '<button class="btn btn-sm btn-secondary" onclick="window.editarEstoque(window._estoqueCache[' + item.id + '])" title="Editar / Gerenciar Tamanhos" style="margin-left:4px;"><i class="ph ph-pencil-simple"></i></button>' +
                '<button class="btn btn-sm" onclick="window.excluirEstoque(' + item.id + ')" style="background:#fee2e2;color:#ef4444;border:none;margin-left:4px;" title="Excluir"><i class="ph ph-trash"></i></button>';

            // ── Agrupar saldos por endereço para exibição limpa na tabela ──
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

            // Se o produto tem múltiplos tamanhos no mesmo endereço, consolidar 1 linha visual por endereço na tabela principal
            if (hasSizes && linhasParaRenderizar.length > 0 && linhasParaRenderizar[0] !== null) {
                const porEndMap = {};
                linhasParaRenderizar.forEach(s => {
                    const k = String(s.endereco_id) + '__' + (s.tipo_estoque || 'matriz');
                    if (!porEndMap[k]) {
                        porEndMap[k] = {
                            endereco_id: s.endereco_id,
                            nome: s.nome,
                            tipo_estoque: s.tipo_estoque || 'matriz',
                            quantidade: 0,
                            quantidade_minima: s.quantidade_minima || 0,
                            quantidade_maxima: s.quantidade_maxima || 0,
                            anyLow: false
                        };
                    }
                    porEndMap[k].quantidade += (parseInt(s.quantidade) || 0);
                    const minRef = (parseInt(s.quantidade_minima) > 0) ? parseInt(s.quantidade_minima) : parseInt(item.quantidade_minima) || 0;
                    if (minRef > 0 && (parseInt(s.quantidade) || 0) < minRef) {
                        porEndMap[k].anyLow = true;
                    }
                });
                linhasParaRenderizar = Object.values(porEndMap);
            }

            linhasParaRenderizar.forEach(function(s, idx) {
                const primeiraLinha = idx === 0;

                // Cor/estado deste endereço
                let lowEnd = false;
                if (s) {
                    if (s.anyLow !== undefined) {
                        lowEnd = s.anyLow;
                    } else {
                        const minRef = (parseInt(s.quantidade_minima) > 0) ? parseInt(s.quantidade_minima) : parseInt(item.quantidade_minima) || 0;
                        lowEnd = minRef > 0 && (parseInt(s.quantidade)||0) < minRef;
                    }
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
                        s.nome +
                        (lowEnd ? ' <i class="ph ph-warning" style="color:#ef4444;font-size:0.78rem;"></i>' : '') +
                        '</span>';
                }

                // Separador entre linhas do mesmo produto
                const borderTop = primeiraLinha ? '' : 'border-top:1px dashed #e2e8f0;';
                const bgRow = lowEnd ? 'background:#fff5f5;' : '';

                const rowSpanAttr = linhasParaRenderizar.length > 1 && primeiraLinha ? ' rowspan="' + linhasParaRenderizar.length + '"' : '';

                rows += '<tr style="border-left:' + rowBorderLeft + ';' + bgRow + borderTop + '">';
                
                // Nome + foto + resumo de tamanhos
                if (primeiraLinha) {
                    rows += '<td' + rowSpanAttr + ' style="vertical-align:middle;font-weight:500;' + (linhasParaRenderizar.length > 1 ? 'border-bottom:1px solid #e2e8f0;' : '') + '">' +
                                '<div style="display:flex;align-items:center;gap:12px;">' + fotoHtml + '<div><div>' + warnIcon + item.nome + '</div>' + resumoTamanhosHtml + '</div></div>' +
                            '</td>';
                            
                    // Categoria
                    rows += '<td' + rowSpanAttr + ' style="vertical-align:middle;' + (linhasParaRenderizar.length > 1 ? 'border-bottom:1px solid #e2e8f0;' : '') + '">' +
                                (item.categoria || '-') +
                            '</td>';
                }
                
                // Qtd. Atual
                rows += '<td style="vertical-align:middle;">' + qtdCell + '</td>';
                // Min/Máx
                rows += '<td style="vertical-align:middle;white-space:nowrap;">' + minMaxCell + '</td>';
                // Endereço
                rows += '<td style="vertical-align:middle;">' + endCell + '</td>';
                // Tipo
                rows += '<td style="vertical-align:middle;white-space:nowrap;">' + tipoCell + '</td>';
                
                // Ações
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

window.incluirTamanhoEstoque = function(tamRaw) {
    const tam = String(tamRaw || '').trim().toUpperCase();
    if (!tam) return;
    window._tamanhosProdutoAtual = window._tamanhosProdutoAtual || [];
    if (!window._tamanhosProdutoAtual.includes(tam)) {
        window._tamanhosProdutoAtual.push(tam);
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

    listaEl.innerHTML = tamsAtivos.map(tam => {
        const linhasDoTam = (window._enderecoLinhas || [])
            .map((linha, idxGlobal) => ({ linha, idxGlobal }))
            .filter(x => String(x.linha.tamanho || '').trim().toUpperCase() === tam);

        const totalTam = linhasDoTam.reduce((acc, x) => acc + (parseInt(x.linha.quantidade) || 0), 0);

        const enderecosHtml = linhasDoTam.map(({ linha, idxGlobal }) => {
            const opcoesEnd = (window._estoqueEnderecos || []).map(e =>
                '<option value="' + e.id + '"' + (String(e.id) === String(linha.endereco_id) ? ' selected' : '') + '>' + e.nome + '</option>'
            ).join('');
            const tipoAtual = linha.tipo_estoque || 'matriz';
            return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin-top:6px;">' +
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                    '<i class="ph ph-map-pin" style="color:#1d4ed8;flex-shrink:0;font-size:0.95rem;"></i>' +
                    '<select onchange="window._enderecoLinhas[' + idxGlobal + '].endereco_id = parseInt(this.value)" ' +
                        'style="flex:1;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.84rem;background:#fff;">' +
                        '<option value="">-- Selecione o endereço do Tam. ' + tam + ' --</option>' + opcoesEnd +
                    '</select>' +
                    '<select onchange="window._enderecoLinhas[' + idxGlobal + '].tipo_estoque = this.value" ' +
                        'style="width:190px;border:1.5px solid #ddd6fe;border-radius:6px;padding:4px 6px;font-size:0.78rem;background:#faf5ff;color:#5b21b6;font-weight:600;">' +
                        '<option value="matriz"' + (tipoAtual === 'matriz' ? ' selected' : '') + '>🏢 Matriz (Compra)</option>' +
                        '<option value="reposicao"' + (tipoAtual === 'reposicao' ? ' selected' : '') + '>🔄 Reposição</option>' +
                    '</select>' +
                    '<button type="button" onclick="window._removerLinhaEndereco(' + idxGlobal + ')" ' +
                        'style="background:#fee2e2;color:#ef4444;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;flex-shrink:0;" title="Remover endereço">' +
                        '<i class="ph ph-trash"></i>' +
                    '</button>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">' +
                    '<div>' +
                        '<label style="display:block;font-size:0.7rem;font-weight:600;color:#475569;margin-bottom:2px;">Qtd. Atual (Tam. ' + tam + ')</label>' +
                        '<input type="number" min="0" value="' + (linha.quantidade || 0) + '" placeholder="0" ' +
                            'oninput="window._enderecoLinhas[' + idxGlobal + '].quantidade = parseInt(this.value) || 0;" ' +
                            'style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.85rem;text-align:center;box-sizing:border-box;font-weight:700;">' +
                    '</div>' +
                    '<div>' +
                        '<label style="display:block;font-size:0.7rem;font-weight:600;color:#f59e0b;margin-bottom:2px;">Qtd. Mínima</label>' +
                        '<input type="number" min="0" value="' + (linha.quantidade_minima || 0) + '" placeholder="0" ' +
                            'oninput="window._enderecoLinhas[' + idxGlobal + '].quantidade_minima = parseInt(this.value) || 0;" ' +
                            'style="width:100%;border:1.5px solid #fde68a;border-radius:6px;padding:4px 8px;font-size:0.85rem;text-align:center;background:#fffbeb;box-sizing:border-box;">' +
                    '</div>' +
                    '<div>' +
                        '<label style="display:block;font-size:0.7rem;font-weight:600;color:#10b981;margin-bottom:2px;">Qtd. Máxima</label>' +
                        '<input type="number" min="0" value="' + (linha.quantidade_maxima || 0) + '" placeholder="0" ' +
                            'oninput="window._enderecoLinhas[' + idxGlobal + '].quantidade_maxima = parseInt(this.value) || 0;" ' +
                            'style="width:100%;border:1.5px solid #a7f3d0;border-radius:6px;padding:4px 8px;font-size:0.85rem;text-align:center;background:#f0fdf4;box-sizing:border-box;">' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');

        return '<div style="background:#f1f5f9;border:1.5px solid #cbd5e1;border-left:4px solid #1d4ed8;border-radius:10px;padding:10px 12px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<span style="background:#1d4ed8;color:#fff;border-radius:6px;padding:3px 10px;font-size:0.84rem;font-weight:800;">Tamanho ' + tam + '</span>' +
                    '<span style="font-size:0.8rem;color:#334155;font-weight:700;">Saldo: ' + totalTam + ' unid.</span>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
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
            enderecosHtml +
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

    lista.innerHTML = linhas.map((linha, idx) => {
        const opcoesEnd = window._estoqueEnderecos.map(e =>
            '<option value="' + e.id + '"' + (e.id === linha.endereco_id ? ' selected' : '') + '>' + e.nome + '</option>'
        ).join('');
        const tipoAtual = linha.tipo_estoque || 'matriz';
        return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;margin-bottom:2px;">' +
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
            '<div style="margin-bottom:6px;">' +
                '<label style="display:block;font-size:0.72rem;font-weight:600;color:#7c3aed;margin-bottom:2px;">Tipo de Estoque</label>' +
                '<select onchange="window._enderecoLinhas[' + idx + '].tipo_estoque = this.value" ' +
                    'style="width:100%;border:1.5px solid #ddd6fe;border-radius:6px;padding:4px 8px;font-size:0.85rem;background:#faf5ff;color:#5b21b6;font-weight:600;">' +
                    '<option value="matriz"' + (tipoAtual === 'matriz' ? ' selected' : '') + '>🏢 Estoque Matriz (Pedido de Compra)</option>' +
                    '<option value="reposicao"' + (tipoAtual === 'reposicao' ? ' selected' : '') + '>🔄 Estoque de Reposição (Pedido de Reposição)</option>' +
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
    window.toggleTemTamanhoEstoque(false);

    const fi = document.getElementById("estoque-foto");
    if (fi) fi.value = "";
    document.getElementById("estoque-foto-base64").value = "";
    document.getElementById("estoque-foto-preview").src = "";
    document.getElementById("estoque-foto-preview").style.display = "none";
    document.getElementById("estoque-foto-icon").style.display = "block";
    document.getElementById("modal-estoque-title").innerHTML = '<i class="ph ph-package"></i> Adicionar Item de Estoque';
    document.getElementById("modal-estoque").style.display = "flex";
    
    // Esconder/limpar placas ao abrir para novo item
    window.togglePlacasEstoque(document.getElementById("estoque-cat").value);
    document.querySelectorAll('.estoque-placa-chk').forEach(el => el.checked = false);
    if(document.getElementById('estoque-placas-todas')) document.getElementById('estoque-placas-todas').checked = false;

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
    document.getElementById("estoque-cat").value  = item.categoria || '';
    window.togglePlacasEstoque(item.categoria);
    if (window._veiculosParaEstoque) {
        _renderPlacasCheckboxes((item.placas_vinculadas || '').split(',').map(s=>s.trim()).filter(Boolean));
    } else if (item.categoria === 'Peças Automotivas' || item.categoria === 'Pneus e Borracharia') {
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
                    tipo_estoque:      s.tipo_estoque || 'matriz'
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
                    tipo_estoque:      s.tipo_estoque || 'matriz'
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
                        tipo_estoque:      l.tipo_estoque || 'matriz'
                    }))
                })
            });
        } catch(es) { console.warn("[ESTOQUE] erro ao sincronizar enderecos:", es.message); }

        Swal.fire({ icon: "success", title: "Sucesso", text: "Item salvo com sucesso", timer: 1500, showConfirmButton: false });
        window.fecharModalEstoque();
        window.renderEstoqueTable(true);
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

    window.togglePlacasEstoque = function(cat) {
        const c = document.getElementById('estoque-placas-container');
        if (cat === 'Peças Automotivas' || cat === 'Pneus e Borracharia') {
            c.style.display = 'block';
            if (!window._veiculosParaEstoque) {
                _fetchVeiculosEstoque();
            }
        } else {
            c.style.display = 'none';
        }
    };

    window._veiculosParaEstoque = null;
    function _fetchVeiculosEstoque() {
        const cont = document.getElementById('estoque-placas-list');
        cont.innerHTML = '<div style="color:#64748b;font-size:0.9rem;">Carregando veículos...</div>';
        apiGet('/frota/veiculos').then(res => {
            window._veiculosParaEstoque = [{ placa: 'Outros' }].concat(res.sort((a,b) => (a.placa||'').localeCompare(b.placa||'')));
            _renderPlacasCheckboxes();
        }).catch(e => {
            cont.innerHTML = '<div style="color:#ef4444;font-size:0.9rem;">Erro ao carregar veículos.</div>';
        });
    }

    function _renderPlacasCheckboxes(selectedPlacas = []) {
        const cont = document.getElementById('estoque-placas-list');
        if (!window._veiculosParaEstoque) return;
        
        let html = `
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 0;border-bottom:1px solid #f1f5f9;margin-bottom:4px;">
                <input type="checkbox" id="estoque-placas-todas" onchange="window.toggleTodasPlacasEstoque(this.checked)" ${window._veiculosParaEstoque.every(v => selectedPlacas.includes(v.placa)) ? 'checked' : ''}>
                <span style="font-weight:600;">Selecionar Todos</span>
            </label>
        `;
        
        window._veiculosParaEstoque.forEach(v => {
            if (!v.placa) return;
            const chk = selectedPlacas.includes(v.placa) ? 'checked' : '';
            html += `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:2px 0;">
                    <input type="checkbox" class="estoque-placa-chk" value="${v.placa}" ${chk} onchange="window.verificarTodasPlacasEstoque()">
                    <span>${v.marca_modelo_versao ? v.marca_modelo_versao + ' - ' : ''}${v.placa}</span>
                </label>
            `;
        });
        cont.innerHTML = html;
    }

    window.toggleTodasPlacasEstoque = function(checked) {
        document.querySelectorAll('.estoque-placa-chk').forEach(el => el.checked = checked);
    };
    
    window.verificarTodasPlacasEstoque = function() {
        const all = Array.from(document.querySelectorAll('.estoque-placa-chk'));
        const todas = document.getElementById('estoque-placas-todas');
        if (todas && all.length > 0) {
            todas.checked = all.every(el => el.checked);
        }
    };
