// frontend/logistica_estoque.js
// Tela Logística -> Estoque (Controle de equipamentos de estoque, vínculo com equipamentos do Comercial e reservas automáticas de Contratos)

window._logEstoqueState = {
    abaAtiva: 'estoque', // 'estoque' | 'reservas'
    itens: [],
    modelos: [],
    reservas: [],
    equipamentosComercial: [],
    filtroTexto: '',
    filtroModelos: [], // array de códigos selecionados (ex: ['STD OBRA', 'LX OBRA'])
    filtroDataDe: '',
    filtroDataAte: '',
    filtroContexto: 'INDIFERENTE', // 'INDIFERENTE' | 'OBRA' | 'EVENTO'
    editandoId: null,
    comercialSelecionadosModal: [], // array of ids or names
    vinculosExpandidosPorItem: {},  // { [itemId]: true/false } — inicia sempre minimizado ({})
    quadrosMinimizados: false       // true = oculta os 17 quadros para melhor visualização da lista
};

// Ordem oficial solicitada dos quadros de estoque (sempre Obra seguido de Evento para os que separam):
// STD, Luxo, EXL, PCD, Mictório, PBII, PBIII, Chuveiro, Hidráulico, Guarita Individual, Guarita Dupla, Grade de Aço
window._ORDEM_QUADROS_ESTOQUE_LOGISTICA = [
    { codigo: 'STD OBRA',           icone: '💙', label: '💙 STD OBRA',           categoria: 'OBRA',   ordem: 1 },
    { codigo: 'STD EVENTO',         icone: '💜', label: '💜 STD EVENTO',         categoria: 'EVENTO', ordem: 2 },
    { codigo: 'LX OBRA',            icone: '🟦', label: '🟦 LX OBRA',            categoria: 'OBRA',   ordem: 3 },
    { codigo: 'LX EVENTO',          icone: '🟣', label: '🟣 LX EVENTO',          categoria: 'EVENTO', ordem: 4 },
    { codigo: 'EXL OBRA',           icone: '🔵', label: '🔵 EXL OBRA',           categoria: 'OBRA',   ordem: 5 },
    { codigo: 'EXL EVENTO',         icone: '🟣', label: '🟣 EXL EVENTO',         categoria: 'EVENTO', ordem: 6 },
    { codigo: 'PCD OBRA',           icone: '♿', label: '♿ PCD OBRA',           categoria: 'OBRA',   ordem: 7 },
    { codigo: 'PCD EVENTO',         icone: '♿', label: '♿ PCD EVENTO',         categoria: 'EVENTO', ordem: 8 },
    { codigo: 'MICTÓRIO',           icone: '💦', label: '💦 MICTÓRIO',           categoria: 'UNICO',  ordem: 9 },
    { codigo: 'PBII',               icone: '🧼', label: '🧼 PBII',               categoria: 'UNICO',  ordem: 10 },
    { codigo: 'PBIII',              icone: '🧼', label: '🧼 PBIII',              categoria: 'UNICO',  ordem: 11 },
    { codigo: 'CHUVEIRO OBRA',      icone: '🚿', label: '🚿 CHUVEIRO OBRA',      categoria: 'OBRA',   ordem: 12 },
    { codigo: 'CHUVEIRO EVENTO',    icone: '🚿', label: '🚿 CHUVEIRO EVENTO',    categoria: 'EVENTO', ordem: 13 },
    { codigo: 'HIDRÁULICO',         icone: '🚽', label: '🚽 HIDRÁULICO',         categoria: 'UNICO',  ordem: 14 },
    { codigo: 'GUARITA INDIVIDUAL', icone: '⬜', label: '⬜ GUARITA INDIVIDUAL', categoria: 'UNICO',  ordem: 15 },
    { codigo: 'GUARITA DUPLA',      icone: '⚪', label: '⚪ GUARITA DUPLA',      categoria: 'UNICO',  ordem: 16 },
    { codigo: 'GRADE DE AÇO',       icone: '🚧', label: '🚧 GRADE DE AÇO',       categoria: 'UNICO',  ordem: 17 }
];

function _escLogEst(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function _normLogEst(s) {
    return String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function _formatarDataBrLogEst(ymd) {
    const s = String(ymd || '').trim();
    if (!s || s === 'SEM_DATA') return 'Sem data definida';
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[3] + '/' + m[2] + '/' + m[1];
    return s;
}

function _fmtModeloComIconeLogEst(mod) {
    if (typeof window.formatarModeloEstoqueLogisticaComIcone === 'function') {
        return window.formatarModeloEstoqueLogisticaComIcone(mod);
    }
    return String(mod || '').trim();
}

window.renderTelaLogisticaEstoque = async function() {
    const root = document.getElementById('logistica-estoque-root') || document.getElementById('view-logistica-estoque');
    if (!root) return;

    if (!root.dataset.initialized || !document.getElementById('logistica-estoque-tabela-container')) {
        root.dataset.initialized = '1';
        root.innerHTML =
            '<div style="display:flex;flex-direction:column;gap:1.15rem;">' +
                // Header
                '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1.1rem 1.4rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;box-shadow:0 1px 3px rgba(15,23,42,0.03);">' +
                    '<div style="display:flex;align-items:center;gap:0.9rem;">' +
                        '<div style="width:44px;height:44px;border-radius:12px;background:#ecfdf5;border:1px solid #a7f3d0;color:#059669;display:flex;align-items:center;justify-content:center;font-size:1.45rem;flex-shrink:0;">' +
                            '<i class="ph ph-package"></i>' +
                        '</div>' +
                        '<div>' +
                            '<h2 style="margin:0;font-size:1.25rem;font-weight:800;color:#0f172a;letter-spacing:-0.01em;">Estoque da Logística</h2>' +
                        '</div>' +
                    '</div>' +
                    '<div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;">' +
                        '<button type="button" class="btn btn-secondary" onclick="window.baixarModeloPlanilhaLogisticaEstoque()" style="display:inline-flex;align-items:center;gap:6px;font-weight:600;font-size:0.83rem;background:#f8fafc;border:1px solid #cbd5e1;color:#334155;padding:0.55rem 0.9rem;border-radius:9px;cursor:pointer;">' +
                            '<i class="ph ph-file-xls" style="font-size:1.05rem;color:#059669;"></i> Planilha Modelo (.xlsx)' +
                        '</button>' +
                        '<label class="btn btn-secondary" style="display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:0.83rem;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;padding:0.55rem 0.95rem;border-radius:9px;cursor:pointer;margin:0;">' +
                            '<i class="ph ph-upload-simple" style="font-size:1.05rem;"></i> Importar em Massa' +
                            '<input type="file" id="inp-importar-logistica-estoque" accept=".xlsx,.xls,.csv" style="display:none;" onchange="window.importarPlanilhaLogisticaEstoque(event)">' +
                        '</label>' +
                        '<button type="button" class="btn btn-primary" onclick="window.abrirModalItemLogisticaEstoque()" style="display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:0.85rem;background:#059669;border:none;color:#fff;padding:0.58rem 1.1rem;border-radius:9px;cursor:pointer;box-shadow:0 2px 6px rgba(5,150,105,0.22);">' +
                            '<i class="ph ph-plus-circle" style="font-size:1.1rem;"></i> Adicionar Manualmente' +
                        '</button>' +
                    '</div>' +
                '</div>' +

                // Barra Unificada no Topo: Abas (Equipamentos em Estoque / Reservas de Contratos) + Todos os Filtros (Pesquisar, Filtrar Modelo, De/Até, Tipo Obra/Evento) + Seta para Minimizar Quadros
                '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1rem 1.25rem;display:flex;flex-direction:column;gap:0.9rem;box-shadow:0 1px 3px rgba(15,23,42,0.03);">' +
                    // Linha 1 do Topo: Botões de Abas + Sincronizar Contratos + Seta para Minimizar/Expandir Quadros
                    '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;border-bottom:1px solid #f1f5f9;padding-bottom:0.75rem;">' +
                        '<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">' +
                            '<button type="button" id="tab-btn-log-est-estoque" onclick="window.trocarAbaLogisticaEstoque(\'estoque\')" style="padding:0.5rem 1rem;border-radius:9px;border:1px solid #059669;background:#ecfdf5;color:#047857;font-weight:700;font-size:0.84rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">' +
                                '<i class="ph ph-stack"></i> Equipamentos em Estoque <span id="badge-count-log-est-itens" style="background:#059669;color:#fff;border-radius:999px;padding:1px 8px;font-size:0.74rem;">0</span>' +
                            '</button>' +
                            '<button type="button" id="tab-btn-log-est-reservas" onclick="window.trocarAbaLogisticaEstoque(\'reservas\')" style="padding:0.5rem 1rem;border-radius:9px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-weight:700;font-size:0.84rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">' +
                                '<i class="ph ph-calendar-check"></i> Reservas de Contratos por Data de Entrega <span id="badge-count-log-est-reservas" style="background:#64748b;color:#fff;border-radius:999px;padding:1px 8px;font-size:0.74rem;">0</span>' +
                            '</button>' +
                        '</div>' +
                        '<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">' +
                            '<button type="button" onclick="window.recalcularReservasLogisticaEstoque()" title="Recalcular reservas de todos os contratos ativos" style="padding:0.45rem 0.85rem;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#334155;font-weight:600;font-size:0.8rem;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">' +
                                '<i class="ph ph-arrows-clockwise"></i> Sincronizar Contratos' +
                            '</button>' +
                            '<button type="button" id="btn-toggle-quadros-log-est" onclick="window.toggleQuadrosModelosLogisticaEstoque()" title="Diminuir ou mostrar os quadros de resumo de estoque" style="padding:0.45rem 0.85rem;border-radius:8px;border:1px solid #cbd5e1;background:#f8fafc;color:#334155;font-weight:700;font-size:0.8rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">' +
                                '<span id="txt-toggle-quadros-log-est">Ocultar Quadros</span>' +
                                '<i id="ico-toggle-quadros-log-est" class="ph ph-caret-up" style="font-size:0.9rem;"></i>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +

                    // Linha 2 do Topo: Pesquisar + Filtrar Modelo + Período De/Até + Tipo (Todos/Obra/Evento) + Limpar
                    '<div style="display:flex;align-items:flex-end;flex-wrap:wrap;gap:0.75rem;">' +
                        '<div style="flex:1;min-width:250px;">' +
                            '<label style="display:block;font-size:0.76rem;font-weight:700;color:#475569;margin-bottom:4px;">Pesquisar</label>' +
                            '<div style="position:relative;">' +
                                '<i class="ph ph-magnifying-glass" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1rem;"></i>' +
                                '<input type="text" id="filtro-log-est-texto" class="form-control" placeholder="Digite para filtrar em tempo real..." oninput="window.filtrarTelaLogisticaEstoque()" style="width:100%;padding-left:34px;height:38px;">' +
                            '</div>' +
                        '</div>' +
                        '<div style="width:235px;position:relative;" id="wrap-filtro-log-est-modelos">' +
                            '<label style="display:block;font-size:0.76rem;font-weight:700;color:#475569;margin-bottom:4px;">Filtrar Modelo</label>' +
                            '<button type="button" id="btn-dropdown-filtro-log-est-modelos" onclick="window.toggleDropdownFiltroModelosLogEst(event)" style="width:100%;height:38px;padding:0 10px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#334155;font-size:0.81rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:6px;text-align:left;">' +
                                '<span id="lbl-btn-filtro-log-est-modelos" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Todos os modelos</span>' +
                                '<i class="ph ph-caret-down" style="color:#64748b;flex-shrink:0;"></i>' +
                            '</button>' +
                            '<div id="dropdown-filtro-log-est-modelos" style="display:none;position:absolute;top:calc(100% + 4px);left:0;width:270px;background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 12px 28px rgba(15,23,42,0.16);z-index:10020;padding:8px;">' +
                                '<div style="position:relative;margin-bottom:6px;">' +
                                    '<i class="ph ph-magnifying-glass" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:0.9rem;"></i>' +
                                    '<input type="text" id="inp-busca-dropdown-modelo-log-est" class="form-control" placeholder="Buscar modelo..." oninput="window.renderOpcoesDropdownFiltroModelosLogEst(this.value)" style="width:100%;padding-left:28px;height:32px;font-size:0.79rem;">' +
                                '</div>' +
                                '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-bottom:1px solid #f1f5f9;margin-bottom:4px;font-size:0.74rem;">' +
                                    '<button type="button" onclick="window.selecionarTodosModelosFiltroLogEst(true)" style="border:none;background:none;color:#1d4ed8;font-weight:700;cursor:pointer;padding:2px 4px;">Marcar todos</button>' +
                                    '<button type="button" onclick="window.selecionarTodosModelosFiltroLogEst(false)" style="border:none;background:none;color:#64748b;font-weight:600;cursor:pointer;padding:2px 4px;">Limpar seleção</button>' +
                                '</div>' +
                                '<div id="lista-opcoes-dropdown-modelo-log-est" style="max-height:230px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;"></div>' +
                            '</div>' +
                        '</div>' +
                        '<div>' +
                            '<label style="display:block;font-size:0.76rem;font-weight:700;color:#475569;margin-bottom:4px;"><i class="ph ph-calendar-blank"></i> Período — De</label>' +
                            '<input type="date" id="filtro-log-est-data-de" class="form-control" onchange="window.filtrarTopoQuadrosLogisticaEstoque()" oninput="window.filtrarTopoQuadrosLogisticaEstoque()" style="width:142px;height:38px;">' +
                        '</div>' +
                        '<div>' +
                            '<label style="display:block;font-size:0.76rem;font-weight:700;color:#475569;margin-bottom:4px;"><i class="ph ph-calendar-check"></i> Até <span style="font-weight:500;color:#94a3b8;">(opcional)</span></label>' +
                            '<input type="date" id="filtro-log-est-data-ate" class="form-control" onchange="window.filtrarTopoQuadrosLogisticaEstoque()" oninput="window.filtrarTopoQuadrosLogisticaEstoque()" style="width:142px;height:38px;">' +
                        '</div>' +
                        '<div>' +
                            '<label style="display:block;font-size:0.76rem;font-weight:700;color:#475569;margin-bottom:4px;"><i class="ph ph-funnel"></i> Tipo (Obra / Evento)</label>' +
                            '<div style="display:inline-flex;background:#f1f5f9;padding:3px;border-radius:10px;border:1px solid #e2e8f0;gap:3px;height:38px;box-sizing:border-box;align-items:center;">' +
                                '<button type="button" id="btn-ctx-log-est-INDIFERENTE" onclick="window.setFiltroContextoLogisticaEstoque(\'INDIFERENTE\')" style="padding:0.35rem 0.75rem;border-radius:7px;border:none;background:#059669;color:#fff;font-weight:700;font-size:0.78rem;cursor:pointer;transition:all 0.15s;">Todos</button>' +
                                '<button type="button" id="btn-ctx-log-est-OBRA" onclick="window.setFiltroContextoLogisticaEstoque(\'OBRA\')" style="padding:0.35rem 0.75rem;border-radius:7px;border:none;background:transparent;color:#475569;font-weight:700;font-size:0.78rem;cursor:pointer;transition:all 0.15s;">💙 Obra</button>' +
                                '<button type="button" id="btn-ctx-log-est-EVENTO" onclick="window.setFiltroContextoLogisticaEstoque(\'EVENTO\')" style="padding:0.35rem 0.75rem;border-radius:7px;border:none;background:transparent;color:#475569;font-weight:700;font-size:0.78rem;cursor:pointer;transition:all 0.15s;">💜 Evento</button>' +
                            '</div>' +
                        '</div>' +
                        '<div>' +
                            '<button type="button" onclick="window.limparTodosFiltrosLogisticaEstoque()" style="height:38px;padding:0 0.9rem;border-radius:8px;border:1px solid #cbd5e1;background:#f8fafc;color:#475569;font-weight:600;font-size:0.8rem;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;">' +
                                '<i class="ph ph-broom"></i> Limpar' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                // Cards de Resumo por Modelo (com suporte a minimizar/expandir via seta)
                '<div id="logistica-estoque-cards-modelos" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:0.85rem;"></div>' +

                // Container da tabela ativa
                '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1rem 1.25rem;">' +
                    '<div id="logistica-estoque-tabela-container"></div>' +
                '</div>' +
            '</div>';
        window.renderOpcoesDropdownFiltroModelosLogEst('');
        window.renderCardsModelosLogisticaEstoque();
        window.renderTabelaAtivaLogisticaEstoque();
    }

    await window.carregarLogisticaEstoque();
};

window._reservaBatePeriodoLogEst = function(reservaOuData) {
    const dtDe = String(window._logEstoqueState.filtroDataDe || '').trim();
    const dtAte = String(window._logEstoqueState.filtroDataAte || '').trim();
    if (!dtDe && !dtAte) return true;

    const isObj = typeof reservaOuData === 'object' && reservaOuData !== null;
    const dtIni = String(isObj ? (reservaOuData.data_entrega || '') : (reservaOuData || '')).trim().slice(0, 10);
    const dtFimRaw = isObj ? String(reservaOuData.data_retirada || '').trim().slice(0, 10) : '';
    const dtFim = (dtFimRaw && dtFimRaw >= dtIni) ? dtFimRaw : dtIni;

    if (!dtIni) return false;
    if (dtDe && dtAte) {
        return dtIni <= dtAte && dtFim >= dtDe;
    }
    if (dtDe) {
        if (dtFimRaw && dtFimRaw >= dtIni) return dtIni <= dtDe && dtFimRaw >= dtDe;
        return dtIni === dtDe;
    }
    if (dtAte) {
        return dtIni <= dtAte;
    }
    return true;
};

window.toggleVinculosItemLogisticaEstoque = function(itemId) {
    const key = String(itemId);
    if (!window._logEstoqueState.vinculosExpandidosPorItem) {
        window._logEstoqueState.vinculosExpandidosPorItem = {};
    }
    const atual = Boolean(window._logEstoqueState.vinculosExpandidosPorItem[key]);
    window._logEstoqueState.vinculosExpandidosPorItem[key] = !atual;

    const box = document.getElementById('log-est-vinculos-box-' + key);
    const icon = document.getElementById('log-est-vinculos-icon-' + key);
    const txt = document.getElementById('log-est-vinculos-txt-' + key);
    if (box) {
        const aberto = !atual;
        box.style.display = aberto ? 'flex' : 'none';
        if (icon) icon.className = aberto ? 'ph ph-caret-up' : 'ph ph-caret-down';
        if (txt) {
            const count = box.getAttribute('data-count') || '0';
            txt.textContent = aberto
                ? ('Ocultar ' + count + ' equipamento(s) vinculado(s)')
                : (count + ' equipamento(s) vinculado(s)');
        }
    } else {
        window.renderTabelaAtivaLogisticaEstoque();
    }
};

// Distribui as unidades reservadas de cada modelo (filtradas pelas datas de entrega/retirada)
// entre os equipamentos físicos daquele modelo (ordenados por Série), para mostrar em qual
// Nº de Contrato cada equipamento físico está alocado na data/período selecionado.
window._calcularAlocacaoContratosPorItemEstoqueLogEst = function() {
    const itensAll = (window._logEstoqueState.itens || []).slice();
    const reservasAtivas = (window._logEstoqueState.reservas || []).filter(r => window._reservaBatePeriodoLogEst(r));

    // Ordena as reservas por data de entrega e número de contrato
    reservasAtivas.sort((a, b) => {
        const da = String(a.data_entrega || '');
        const db = String(b.data_entrega || '');
        if (da !== db) return da.localeCompare(db);
        return String(a.contrato_numero || a.numero_contrato || '').localeCompare(String(b.contrato_numero || b.numero_contrato || ''), 'pt-BR', { numeric: true });
    });

    // Agrupa os itens físicos por modelo normalizado, ordenados por número de série (numérico/alfabético)
    const itensPorModelo = new Map();
    itensAll.forEach(it => {
        const modKey = _normLogEst(it.modelo);
        if (!modKey) return;
        if (!itensPorModelo.has(modKey)) itensPorModelo.set(modKey, []);
        itensPorModelo.get(modKey).push(it);
    });

    itensPorModelo.forEach(lista => {
        lista.sort((a, b) => {
            const sa = String(a.numero_serie || '').trim();
            const sb = String(b.numero_serie || '').trim();
            if (sa && sb) return sa.localeCompare(sb, 'pt-BR', { numeric: true });
            if (sa) return -1;
            if (sb) return 1;
            return (Number(a.id) || 0) - (Number(b.id) || 0);
        });
    });

    // Fila de unidades de reserva por modelo
    const filaUnidadesPorModelo = new Map();
    reservasAtivas.forEach(r => {
        const modKey = _normLogEst(r.modelo_estoque);
        if (!modKey) return;
        if (!filaUnidadesPorModelo.has(modKey)) filaUnidadesPorModelo.set(modKey, []);
        const qtd = Math.max(0, parseInt(r.quantidade ?? r.quantidade_reservada ?? 0, 10) || 0);
        const fila = filaUnidadesPorModelo.get(modKey);
        for (let i = 0; i < qtd; i++) {
            fila.push({
                proposta_id: r.proposta_id,
                contrato_numero: String(r.contrato_numero || r.numero_contrato || r.proposta_id || '').trim(),
                cliente_nome: r.cliente_nome || '',
                data_entrega: r.data_entrega || '',
                data_retirada: r.data_retirada || '',
                equipamento_comercial_nome: r.equipamento_comercial_nome || ''
            });
        }
    });

    // Mapa item.id -> array de reservas alocadas àquele equipamento físico
    const alocacaoPorItemId = new Map();
    itensPorModelo.forEach((listaItensMod, modKey) => {
        const fila = filaUnidadesPorModelo.get(modKey) || [];
        let ptr = 0;
        listaItensMod.forEach(item => {
            const cap = Math.max(1, parseInt(item.quantidade ?? 1, 10) || 1);
            const alocadas = [];
            for (let c = 0; c < cap && ptr < fila.length; c++) {
                alocadas.push(fila[ptr++]);
            }
            alocacaoPorItemId.set(Number(item.id), alocadas);
        });
    });

    return alocacaoPorItemId;
};

window._modeloBateContextoLogEst = function(modeloRaw) {
    const ctx = String(window._logEstoqueState.filtroContexto || 'INDIFERENTE').toUpperCase();
    if (ctx === 'INDIFERENTE') return true;
    const mUp = String(modeloRaw || '').toUpperCase();
    if (ctx === 'OBRA') {
        // Exibe modelos de OBRA e modelos de Estoque Único (que não são exclusivos de EVENTO)
        return !mUp.includes('EVENTO');
    }
    if (ctx === 'EVENTO') {
        // Exibe modelos de EVENTO e modelos de Estoque Único (que não são exclusivos de OBRA)
        return !mUp.includes('OBRA');
    }
    return true;
};

window.carregarLogisticaEstoque = async function() {
    try {
        const apiBase = (typeof API_URL !== 'undefined' && API_URL) ? API_URL : '/api';
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const dataDe = document.getElementById('filtro-log-est-data-de')?.value || window._logEstoqueState.filtroDataDe || '';
        const dataAte = document.getElementById('filtro-log-est-data-ate')?.value || window._logEstoqueState.filtroDataAte || '';
        const params = new URLSearchParams();
        if (dataDe) params.set('data_de', dataDe);
        if (dataAte) params.set('data_ate', dataAte);
        const qs = params.toString() ? ('?' + params.toString()) : '';
        const r = await fetch(apiBase + '/logistica/estoque' + qs, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!r.ok) throw new Error('Falha ao carregar estoque da logística');
        const d = await r.json();
        window._logEstoqueState.itens = d.itens || [];
        window._logEstoqueState.modelos = d.modelos || d.modelos_resumo || [];
        window._logEstoqueState.reservas = d.reservas || [];
        window._logEstoqueState.equipamentosComercial = d.equipamentos_comercial || [];

        window.renderCardsModelosLogisticaEstoque();
        window.renderTabelaAtivaLogisticaEstoque();
    } catch (err) {
        console.error('[LogisticaEstoque]', err);
        window.renderCardsModelosLogisticaEstoque();
        window.renderTabelaAtivaLogisticaEstoque();
    }
};

window.trocarAbaLogisticaEstoque = function(aba) {
    window._logEstoqueState.abaAtiva = aba === 'reservas' ? 'reservas' : 'estoque';
    const btnEst = document.getElementById('tab-btn-log-est-estoque');
    const btnRes = document.getElementById('tab-btn-log-est-reservas');
    if (btnEst && btnRes) {
        if (window._logEstoqueState.abaAtiva === 'estoque') {
            btnEst.style.borderColor = '#059669';
            btnEst.style.background = '#ecfdf5';
            btnEst.style.color = '#047857';
            btnRes.style.borderColor = '#e2e8f0';
            btnRes.style.background = '#f8fafc';
            btnRes.style.color = '#475569';
        } else {
            btnRes.style.borderColor = '#1d4ed8';
            btnRes.style.background = '#eff6ff';
            btnRes.style.color = '#1d4ed8';
            btnEst.style.borderColor = '#e2e8f0';
            btnEst.style.background = '#f8fafc';
            btnEst.style.color = '#475569';
        }
    }
    window.renderTabelaAtivaLogisticaEstoque();
};

window.toggleQuadrosModelosLogisticaEstoque = function() {
    window._logEstoqueState.quadrosMinimizados = !window._logEstoqueState.quadrosMinimizados;
    const box = document.getElementById('logistica-estoque-cards-modelos');
    const txt = document.getElementById('txt-toggle-quadros-log-est');
    const ico = document.getElementById('ico-toggle-quadros-log-est');
    const min = Boolean(window._logEstoqueState.quadrosMinimizados);
    if (box) box.style.display = min ? 'none' : 'grid';
    if (txt) txt.textContent = min ? 'Mostrar Quadros' : 'Ocultar Quadros';
    if (ico) ico.className = min ? 'ph ph-caret-down' : 'ph ph-caret-up';
};

window.limparTodosFiltrosLogisticaEstoque = function() {
    const elTxt = document.getElementById('filtro-log-est-texto');
    const elDe = document.getElementById('filtro-log-est-data-de');
    const elAte = document.getElementById('filtro-log-est-data-ate');
    const elBuscaMod = document.getElementById('inp-busca-dropdown-modelo-log-est');
    if (elTxt) elTxt.value = '';
    if (elDe) elDe.value = '';
    if (elAte) elAte.value = '';
    if (elBuscaMod) elBuscaMod.value = '';
    window._logEstoqueState.filtroTexto = '';
    window._logEstoqueState.filtroModelos = [];
    window._logEstoqueState.filtroDataDe = '';
    window._logEstoqueState.filtroDataAte = '';
    window._atualizarTextoBotaoFiltroModelosLogEst();
    window.renderOpcoesDropdownFiltroModelosLogEst('');
    window.setFiltroContextoLogisticaEstoque('INDIFERENTE');
};

window._modeloPassaFiltroSelecionadosLogEst = function(modeloRaw) {
    const selecionados = window._logEstoqueState.filtroModelos || [];
    if (!Array.isArray(selecionados) || selecionados.length === 0) return true;
    const alvo = _normLogEst(modeloRaw);
    return selecionados.some(m => _normLogEst(m) === alvo);
};

window._atualizarTextoBotaoFiltroModelosLogEst = function() {
    const lbl = document.getElementById('lbl-btn-filtro-log-est-modelos');
    const btn = document.getElementById('btn-dropdown-filtro-log-est-modelos');
    if (!lbl) return;
    const sel = window._logEstoqueState.filtroModelos || [];
    if (sel.length === 0) {
        lbl.textContent = 'Todos os modelos';
        if (btn) {
            btn.style.borderColor = '#cbd5e1';
            btn.style.background = '#fff';
            btn.style.color = '#334155';
        }
    } else if (sel.length === 1) {
        lbl.textContent = _fmtModeloComIconeLogEst(sel[0]);
        if (btn) {
            btn.style.borderColor = '#059669';
            btn.style.background = '#ecfdf5';
            btn.style.color = '#047857';
        }
    } else {
        lbl.textContent = sel.length + ' modelos selecionados';
        if (btn) {
            btn.style.borderColor = '#059669';
            btn.style.background = '#ecfdf5';
            btn.style.color = '#047857';
        }
    }
};

window.toggleDropdownFiltroModelosLogEst = function(event) {
    if (event) event.stopPropagation();
    const dd = document.getElementById('dropdown-filtro-log-est-modelos');
    if (!dd) return;
    const abrir = dd.style.display !== 'block';
    dd.style.display = abrir ? 'block' : 'none';
    if (abrir) {
        const inp = document.getElementById('inp-busca-dropdown-modelo-log-est');
        if (inp) {
            inp.value = '';
            window.renderOpcoesDropdownFiltroModelosLogEst('');
            setTimeout(() => inp.focus(), 30);
        } else {
            window.renderOpcoesDropdownFiltroModelosLogEst('');
        }
    }
};

window.renderOpcoesDropdownFiltroModelosLogEst = function(termo) {
    const cont = document.getElementById('lista-opcoes-dropdown-modelo-log-est');
    if (!cont) return;
    const q = _normLogEst(termo || '');
    const catalogo = window._ORDEM_QUADROS_ESTOQUE_LOGISTICA || [];
    const sel = window._logEstoqueState.filtroModelos || [];

    const filtrados = catalogo.filter(it => !q || _normLogEst(it.codigo).includes(q) || _normLogEst(it.label).includes(q));
    if (filtrados.length === 0) {
        cont.innerHTML = '<div style="padding:8px;text-align:center;color:#94a3b8;font-size:0.78rem;">Nenhum modelo encontrado</div>';
        return;
    }

    cont.innerHTML = filtrados.map(it => {
        const checked = sel.some(m => _normLogEst(m) === _normLogEst(it.codigo));
        return '<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:7px;cursor:pointer;font-size:0.8rem;font-weight:700;color:#0f172a;background:' + (checked ? '#ecfdf5' : 'transparent') + ';" onmouseover="if(!this.querySelector(\'input\').checked)this.style.background=\'#f8fafc\'" onmouseout="this.style.background=this.querySelector(\'input\').checked?\'#ecfdf5\':\'transparent\'">' +
            '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="window.toggleModeloFiltroCheckboxLogEst(\'' + _escLogEst(it.codigo) + '\')" style="cursor:pointer;accent-color:#059669;width:15px;height:15px;">' +
            '<span>' + _escLogEst(it.label) + '</span>' +
        '</label>';
    }).join('');
};

window.toggleModeloFiltroCheckboxLogEst = function(codigo) {
    const arr = (window._logEstoqueState.filtroModelos || []).slice();
    const idx = arr.findIndex(m => _normLogEst(m) === _normLogEst(codigo));
    if (idx >= 0) {
        arr.splice(idx, 1);
    } else {
        arr.push(codigo);
    }
    window._logEstoqueState.filtroModelos = arr;
    window._atualizarTextoBotaoFiltroModelosLogEst();
    const inp = document.getElementById('inp-busca-dropdown-modelo-log-est');
    window.renderOpcoesDropdownFiltroModelosLogEst(inp ? inp.value : '');
    window.renderCardsModelosLogisticaEstoque();
    window.renderTabelaAtivaLogisticaEstoque();
};

window.selecionarTodosModelosFiltroLogEst = function(marcarTodos) {
    if (marcarTodos) {
        window._logEstoqueState.filtroModelos = (window._ORDEM_QUADROS_ESTOQUE_LOGISTICA || []).map(x => x.codigo);
    } else {
        window._logEstoqueState.filtroModelos = [];
    }
    window._atualizarTextoBotaoFiltroModelosLogEst();
    const inp = document.getElementById('inp-busca-dropdown-modelo-log-est');
    window.renderOpcoesDropdownFiltroModelosLogEst(inp ? inp.value : '');
    window.renderCardsModelosLogisticaEstoque();
    window.renderTabelaAtivaLogisticaEstoque();
};

document.addEventListener('click', function(e) {
    const dd = document.getElementById('dropdown-filtro-log-est-modelos');
    const wrap = document.getElementById('wrap-filtro-log-est-modelos');
    if (dd && dd.style.display === 'block' && wrap && !wrap.contains(e.target)) {
        dd.style.display = 'none';
    }
});

window.abrirContratoPeloEstoqueLogistica = function(propostaId) {
    const idNum = Number(propostaId);
    if (!idNum) return;
    if (typeof window.abrirContratoDaProposta === 'function') {
        window.abrirContratoDaProposta(idNum);
    } else if (typeof window.abrirPropostaDiretoId === 'function') {
        window.abrirPropostaDiretoId(idNum);
    }
};

window._atualizarResumoFiltroTopoLogEst = function() {
    // Texto de resumo removido conforme solicitação
};

window.setFiltroContextoLogisticaEstoque = function(ctx) {
    const novo = (ctx === 'OBRA' || ctx === 'EVENTO') ? ctx : 'INDIFERENTE';
    window._logEstoqueState.filtroContexto = novo;
    const estilos = {
        INDIFERENTE: { bg: '#059669', color: '#fff' },
        OBRA:        { bg: '#1d4ed8', color: '#fff' },
        EVENTO:      { bg: '#7e22ce', color: '#fff' }
    };
    ['INDIFERENTE', 'OBRA', 'EVENTO'].forEach(k => {
        const btn = document.getElementById('btn-ctx-log-est-' + k);
        if (!btn) return;
        if (k === novo) {
            btn.style.background = estilos[k].bg;
            btn.style.color = estilos[k].color;
        } else {
            btn.style.background = 'transparent';
            btn.style.color = '#475569';
        }
    });
    window._atualizarResumoFiltroTopoLogEst();
    window.renderCardsModelosLogisticaEstoque();
    window.renderTabelaAtivaLogisticaEstoque();
};

window.filtrarTopoQuadrosLogisticaEstoque = function() {
    const dtDe = document.getElementById('filtro-log-est-data-de')?.value || '';
    const dtAte = document.getElementById('filtro-log-est-data-ate')?.value || '';
    window._logEstoqueState.filtroDataDe = dtDe;
    window._logEstoqueState.filtroDataAte = dtAte;
    window._atualizarResumoFiltroTopoLogEst();
    window.renderCardsModelosLogisticaEstoque();
    window.renderTabelaAtivaLogisticaEstoque();
};

window.limparFiltrosTopoLogisticaEstoque = function() {
    const elDe = document.getElementById('filtro-log-est-data-de');
    const elAte = document.getElementById('filtro-log-est-data-ate');
    if (elDe) elDe.value = '';
    if (elAte) elAte.value = '';
    window._logEstoqueState.filtroDataDe = '';
    window._logEstoqueState.filtroDataAte = '';
    window.setFiltroContextoLogisticaEstoque('INDIFERENTE');
};

window.filtrarTelaLogisticaEstoque = function() {
    const txt = document.getElementById('filtro-log-est-texto')?.value || '';
    window._logEstoqueState.filtroTexto = txt;
    window.renderCardsModelosLogisticaEstoque();
    window.renderTabelaAtivaLogisticaEstoque();
};

window.limparFiltrosLogisticaEstoque = function() {
    window.limparTodosFiltrosLogisticaEstoque();
};

window.filtrarPorModeloCardLogisticaEstoque = function(modelo) {
    window.toggleModeloFiltroCheckboxLogEst(modelo);
};

window.renderCardsModelosLogisticaEstoque = function() {
    const box = document.getElementById('logistica-estoque-cards-modelos');
    if (!box) return;
    const modelosBackend = window._logEstoqueState.modelos || [];
    const reservasAll = window._logEstoqueState.reservas || [];
    const eqComercialAll = window._logEstoqueState.equipamentosComercial || [];
    const dtDe = window._logEstoqueState.filtroDataDe || '';
    const dtAte = window._logEstoqueState.filtroDataAte || '';
    const temFiltroData = Boolean(dtDe || dtAte);
    const modelosSel = window._logEstoqueState.filtroModelos || [];

    // Garante que todos os 17 quadros na ordem oficial existam (mesmo com estoque 0)
    const ordemCatalogo = window._ORDEM_QUADROS_ESTOQUE_LOGISTICA || [];
    const mapPorCodigo = new Map();

    ordemCatalogo.forEach(cat => {
        mapPorCodigo.set(cat.codigo, {
            modelo: cat.codigo,
            categoria: cat.categoria,
            ordem: cat.ordem,
            quantidade_total: 0,
            quantidade_manutencao: 0,
            equipamentos_comercial: []
        });
    });

    modelosBackend.forEach(m => {
        const cod = String(m.modelo || '').trim().toUpperCase();
        if (!cod) return;
        const existente = mapPorCodigo.get(cod);
        if (existente) {
            existente.quantidade_total = Number(m.quantidade_total) || 0;
            existente.quantidade_manutencao = Number(m.quantidade_manutencao) || 0;
            existente.equipamentos_comercial = Array.isArray(m.equipamentos_comercial) ? m.equipamentos_comercial : [];
        } else {
            mapPorCodigo.set(cod, {
                modelo: cod,
                categoria: m.categoria || (cod.includes('EVENTO') ? 'EVENTO' : (cod.includes('OBRA') ? 'OBRA' : 'UNICO')),
                ordem: Number(m.ordem) || 999,
                quantidade_total: Number(m.quantidade_total) || 0,
                quantidade_manutencao: Number(m.quantidade_manutencao) || 0,
                equipamentos_comercial: Array.isArray(m.equipamentos_comercial) ? m.equipamentos_comercial : []
            });
        }
    });

    // Complementa contagem de vínculos a partir dos equipamentos do comercial carregados
    eqComercialAll.forEach(eq => {
        const cod = String(eq.logistica_estoque_modelo || '').trim().toUpperCase();
        if (cod && mapPorCodigo.has(cod)) {
            const entry = mapPorCodigo.get(cod);
            if (!entry.equipamentos_comercial.some(x => Number(x.id) === Number(eq.id))) {
                entry.equipamentos_comercial.push({ id: eq.id, codigo: eq.codigo, nome: eq.nome });
            }
        }
    });

    // Filtra pelo Tipo (Todos / Obra / Evento) e pelos modelos selecionados no dropdown, ordenando na sequência oficial
    const listaQuadros = Array.from(mapPorCodigo.values())
        .filter(m => window._modeloBateContextoLogEst(m.modelo) && window._modeloPassaFiltroSelecionadosLogEst(m.modelo))
        .sort((a, b) => (a.ordem !== b.ordem ? a.ordem - b.ordem : a.modelo.localeCompare(b.modelo, 'pt-BR')));

    const labelRes = temFiltroData
        ? (dtDe && dtAte ? 'Reserv. Período' : 'Reserv. Data')
        : 'Reservado';

    box.innerHTML = listaQuadros.map(m => {
        const isSel = modelosSel.some(s => _normLogEst(s) === _normLogEst(m.modelo));
        const qtdTotal = Number(m.quantidade_total) || 0;
        const qtdManut = Number(m.quantidade_manutencao) || 0;

        // Calcula reservas deste modelo considerando o filtro de período De / Até do topo (entrega e retirada)
        const qtdRes = reservasAll.reduce((acc, r) => {
            if (_normLogEst(r.modelo_estoque) !== _normLogEst(m.modelo)) return acc;
            if (!window._reservaBatePeriodoLogEst(r)) return acc;
            return acc + (Number(r.quantidade ?? r.quantidade_reservada ?? 0) || 0);
        }, 0);

        const disponivel = qtdTotal - qtdRes - qtdManut;
        const corDisp = disponivel < 0 ? '#dc2626' : (disponivel === 0 ? '#d97706' : '#059669');

        const mUp = String(m.modelo || '').toUpperCase();
        const badgeStyle = mUp.includes('EVENTO')
            ? 'background:#faf5ff;color:#7e22ce;border:1px solid #e9d5ff;'
            : (mUp.includes('OBRA')
                ? 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;'
                : 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;');

        return '<div onclick="window.filtrarPorModeloCardLogisticaEstoque(\'' + _escLogEst(m.modelo) + '\')" style="background:#fff;border:2px solid ' + (isSel ? '#059669' : '#e2e8f0') + ';border-radius:12px;padding:0.9rem 1rem;cursor:pointer;transition:all 0.15s;box-shadow:0 1px 2px rgba(15,23,42,0.03);">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">' +
                '<span style="' + badgeStyle + 'border-radius:7px;padding:3px 10px;font-weight:800;font-size:0.84rem;display:inline-flex;align-items:center;gap:5px;">' +
                    '' + _escLogEst(_fmtModeloComIconeLogEst(m.modelo)) +
                '</span>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;text-align:center;background:#f8fafc;border-radius:8px;padding:7px 4px;">' +
                '<div>' +
                    '<div style="font-size:0.65rem;color:#64748b;font-weight:600;">Estoque</div>' +
                    '<div style="font-size:0.95rem;font-weight:800;color:#0f172a;">' + qtdTotal + '</div>' +
                '</div>' +
                '<div style="border-left:1px solid #e2e8f0;">' +
                    '<div style="font-size:0.65rem;color:#64748b;font-weight:600;">' + labelRes + '</div>' +
                    '<div style="font-size:0.95rem;font-weight:800;color:#1d4ed8;">' + qtdRes + '</div>' +
                '</div>' +
                '<div style="border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">' +
                    '<div style="font-size:0.65rem;color:#64748b;font-weight:600;">Manutenção</div>' +
                    '<div style="font-size:0.95rem;font-weight:800;color:#d97706;">' + qtdManut + '</div>' +
                '</div>' +
                '<div>' +
                    '<div style="font-size:0.65rem;color:#64748b;font-weight:600;">Disponível</div>' +
                    '<div style="font-size:0.95rem;font-weight:800;color:' + corDisp + ';">' + disponivel + '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');
};

window.renderTabelaAtivaLogisticaEstoque = function() {
    const cont = document.getElementById('logistica-estoque-tabela-container');
    if (!cont) return;

    const badgeItens = document.getElementById('badge-count-log-est-itens');
    const badgeRes = document.getElementById('badge-count-log-est-reservas');
    const itensCtx = (window._logEstoqueState.itens || []).filter(it => window._modeloBateContextoLogEst(it.modelo) && window._modeloPassaFiltroSelecionadosLogEst(it.modelo));
    const resCtx = (window._logEstoqueState.reservas || []).filter(r => window._modeloBateContextoLogEst(r.modelo_estoque) && window._modeloPassaFiltroSelecionadosLogEst(r.modelo_estoque) && window._reservaBatePeriodoLogEst(r));
    if (badgeItens) badgeItens.textContent = String(itensCtx.length);
    if (badgeRes) badgeRes.textContent = String(resCtx.length);

    if (window._logEstoqueState.abaAtiva === 'reservas') {
        window._renderTabelaReservasContratosLogEst(cont);
    } else {
        window._renderTabelaItensEstoqueLogEst(cont);
    }
};

window._renderTabelaItensEstoqueLogEst = function(cont) {
    const q = _normLogEst(window._logEstoqueState.filtroTexto);
    const eqComercialAll = window._logEstoqueState.equipamentosComercial || [];
    const alocacaoMap = window._calcularAlocacaoContratosPorItemEstoqueLogEst();
    const expandidosMap = window._logEstoqueState.vinculosExpandidosPorItem || {};

    const lista = (window._logEstoqueState.itens || []).filter(item => {
        if (!window._modeloBateContextoLogEst(item.modelo)) return false;
        if (!window._modeloPassaFiltroSelecionadosLogEst(item.modelo)) return false;
        if (!q) return true;
        const vincs = (item.equipamentos_comercial || []).map(x => typeof x === 'object' ? (x.nome || x.codigo || '') : String(x)).join(' ');
        const eqPorMod = eqComercialAll.filter(e => _normLogEst(e.logistica_estoque_modelo) === _normLogEst(item.modelo)).map(e => (e.codigo || '') + ' ' + (e.nome || '')).join(' ');
        const alocados = (alocacaoMap.get(Number(item.id)) || []).map(a => (a.contrato_numero || '') + ' ' + (a.cliente_nome || '')).join(' ');
        const alvo = _normLogEst([item.modelo, item.cor, item.numero_serie, item.medidas, vincs, eqPorMod, alocados].join(' '));
        return alvo.includes(q);
    });

    if (lista.length === 0) {
        cont.innerHTML =
            '<div style="text-align:center;padding:2.5rem 1rem;color:#64748b;background:#f8fafc;border-radius:12px;border:1px dashed #cbd5e1;">' +
                '<i class="ph ph-package" style="font-size:2.2rem;color:#94a3b8;display:block;margin-bottom:6px;"></i>' +
                '<div style="font-weight:700;color:#334155;margin-bottom:4px;">Nenhum equipamento de estoque encontrado</div>' +
                '<div style="font-size:0.82rem;">Adicione equipamentos manualmente ou importe uma planilha Excel (.xlsx).</div>' +
            '</div>';
        return;
    }

    const rowsHtml = lista.map(item => {
        // Reúne tanto os equipamentos vinculados diretamente no item quanto os vinculados ao modelo na tela de Equipamentos do Comercial
        const nomesMap = new Map();
        (item.equipamentos_comercial || []).forEach(v => {
            if (typeof v === 'object' && v !== null) {
                const label = (v.codigo ? '[' + v.codigo + '] ' : '') + (v.nome || '');
                if (label.trim()) nomesMap.set(_normLogEst(v.nome || label), label.trim());
            } else if (String(v || '').trim()) {
                const s = String(v).trim();
                nomesMap.set(_normLogEst(s), s);
            }
        });
        eqComercialAll.forEach(eq => {
            if (_normLogEst(eq.logistica_estoque_modelo) === _normLogEst(item.modelo)) {
                const label = (eq.codigo ? '[' + eq.codigo + '] ' : '') + (eq.nome || '');
                if (label.trim()) nomesMap.set(_normLogEst(eq.nome || label), label.trim());
            }
        });

        const vinculosList = Array.from(nomesMap.values());
        const itemIdKey = String(item.id);
        const isExpanded = Boolean(expandidosMap[itemIdKey]);
        const vinculosHtml = vinculosList.length > 0
            ? '<div>' +
                '<button type="button" onclick="window.toggleVinculosItemLogisticaEstoque(\'' + _escLogEst(itemIdKey) + '\')" style="display:inline-flex;align-items:center;gap:6px;background:#f8fafc;color:#1e293b;border:1px solid #cbd5e1;border-radius:7px;padding:4px 10px;font-size:0.77rem;font-weight:700;cursor:pointer;transition:all 0.15s;" onmouseover="this.style.background=\'#eff6ff\';this.style.borderColor=\'#93c5fd\';this.style.color=\'#1d4ed8\'" onmouseout="this.style.background=\'#f8fafc\';this.style.borderColor=\'#cbd5e1\';this.style.color=\'#1e293b\'">' +
                    '<i class="ph ph-link" style="color:#1d4ed8;"></i>' +
                    '<span id="log-est-vinculos-txt-' + _escLogEst(itemIdKey) + '">' +
                        (isExpanded ? ('Ocultar ' + vinculosList.length + ' equipamento(s) vinculado(s)') : (vinculosList.length + ' equipamento(s) vinculado(s)')) +
                    '</span>' +
                    '<i id="log-est-vinculos-icon-' + _escLogEst(itemIdKey) + '" class="' + (isExpanded ? 'ph ph-caret-up' : 'ph ph-caret-down') + '" style="font-size:0.85rem;color:#475569;"></i>' +
                '</button>' +
                '<div id="log-est-vinculos-box-' + _escLogEst(itemIdKey) + '" data-count="' + vinculosList.length + '" style="display:' + (isExpanded ? 'flex' : 'none') + ';flex-wrap:wrap;gap:4px;margin-top:7px;padding:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">' +
                    vinculosList.map(v =>
                        '<span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:2px 8px;font-size:0.74rem;font-weight:600;">' + _escLogEst(v) + '</span>'
                    ).join('') +
                '</div>' +
              '</div>'
            : '<span style="color:#94a3b8;font-size:0.78rem;">Sem vínculo comercial</span>';

        // Contrato vinculado/reservado para este equipamento considerando a data/período selecionado (apenas o número do contrato clicável para abrir o contrato)
        const alocadas = alocacaoMap.get(Number(item.id)) || [];
        let contratoColHtml = '';
        if (alocadas.length > 0) {
            contratoColHtml = '<div style="display:flex;flex-wrap:wrap;gap:5px;">' +
                alocadas.map(a => {
                    const numCtr = a.contrato_numero || a.proposta_id || '—';
                    const propId = Number(a.proposta_id) || 0;
                    return '<button type="button" onclick="window.abrirContratoPeloEstoqueLogistica(' + propId + ')" title="Clique para abrir o Contrato ' + _escLogEst(numCtr) + '" style="display:inline-flex;align-items:center;gap:4px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:8px;padding:3px 9px;font-weight:800;font-size:0.78rem;cursor:pointer;white-space:nowrap;transition:all 0.15s;" onmouseover="this.style.background=\'#dbeafe\';this.style.borderColor=\'#93c5fd\'" onmouseout="this.style.background=\'#eff6ff\';this.style.borderColor=\'#bfdbfe\'">' +
                        _escLogEst(numCtr) +
                    '</button>';
                }).join('') +
            '</div>';
        } else {
            contratoColHtml = '<span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;padding:3px 10px;font-weight:700;font-size:0.75rem;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;"><i class="ph ph-check-circle"></i> Disponível</span>';
        }

        const serieStr = String(item.numero_serie || '').trim();
        const serieBadge = serieStr
            ? '<span style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:6px;padding:3px 9px;font-weight:800;font-size:0.8rem;font-family:monospace;white-space:nowrap;">' + _escLogEst(serieStr) + '</span>'
            : '<span style="color:#94a3b8;font-size:0.8rem;">—</span>';
        const modStyle = String(item.modelo || '').toUpperCase().includes('EVENTO')
            ? '#faf5ff;color:#7e22ce;border:1px solid #e9d5ff'
            : (String(item.modelo || '').toUpperCase().includes('OBRA') ? '#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe' : '#ecfdf5;color:#047857;border:1px solid #a7f3d0');

        return '<tr>' +
            '<td>' + serieBadge + '</td>' +
            '<td><span style="background:' + modStyle + ';border-radius:7px;padding:3px 10px;font-weight:800;font-size:0.82rem;white-space:nowrap;">' + _escLogEst(_fmtModeloComIconeLogEst(item.modelo)) + '</span></td>' +
            '<td style="color:#334155;font-weight:600;">' + (_escLogEst(item.cor) || '<span style="color:#94a3b8;">—</span>') + '</td>' +
            '<td>' + contratoColHtml + '</td>' +
            '<td>' + vinculosHtml + '</td>' +
            '<td style="text-align:right;white-space:nowrap;">' +
                '<div style="display:inline-flex;gap:6px;">' +
                    '<button type="button" class="btn btn-sm" onclick="window.abrirModalItemLogisticaEstoque(' + item.id + ')" title="Editar" style="background:#f8fafc;color:#334155;border:1px solid #cbd5e1;padding:4px 9px;border-radius:7px;cursor:pointer;">' +
                        '<i class="ph ph-pencil-simple"></i>' +
                    '</button>' +
                    '<button type="button" class="btn btn-sm" onclick="window.excluirItemLogisticaEstoque(' + item.id + ')" title="Excluir" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;padding:4px 9px;border-radius:7px;cursor:pointer;">' +
                        '<i class="ph ph-trash"></i>' +
                    '</button>' +
                '</div>' +
            '</td>' +
        '</tr>';
    }).join('');

    cont.innerHTML =
        '<div class="table-responsive">' +
            '<table class="data-table" style="width:100%;font-size:0.78rem;">' +
                '<thead>' +
                    '<tr style="font-size:0.75rem;">' +
                        '<th style="width:110px;font-size:0.75rem;">Série</th>' +
                        '<th style="font-size:0.75rem;">Modelo</th>' +
                        '<th style="font-size:0.75rem;">Cor</th>' +
                        '<th style="font-size:0.75rem;">Contrato / Disponibilidade</th>' +
                        '<th style="font-size:0.75rem;">Vínculo com Equipamentos</th>' +
                        '<th style="text-align:right;font-size:0.75rem;">Ações</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody>' + rowsHtml + '</tbody>' +
            '</table>' +
        '</div>';
};

window._renderTabelaReservasContratosLogEst = function(cont) {
    const q = _normLogEst(window._logEstoqueState.filtroTexto);

    const lista = (window._logEstoqueState.reservas || []).filter(r => {
        if (!window._modeloBateContextoLogEst(r.modelo_estoque)) return false;
        if (!window._modeloPassaFiltroSelecionadosLogEst(r.modelo_estoque)) return false;
        if (!window._reservaBatePeriodoLogEst(r)) return false;
        if (!q) return true;
        const alvo = _normLogEst([r.contrato_numero, r.cliente_nome, r.equipamento_comercial_nome, r.modelo_estoque, r.data_entrega].join(' '));
        return alvo.includes(q);
    });

    if (lista.length === 0) {
        cont.innerHTML =
            '<div style="text-align:center;padding:2.2rem 1rem;color:#64748b;background:#f8fafc;border-radius:12px;border:1px dashed #cbd5e1;">' +
                '<i class="ph ph-calendar-blank" style="font-size:2rem;color:#94a3b8;display:block;margin-bottom:6px;"></i>' +
                '<div style="font-weight:700;color:#334155;">Nenhuma reserva de contrato encontrada para os filtros selecionados</div>' +
            '</div>';
        return;
    }

    const rowsHtml = lista.map(r => {
        const nomeCliRaw = r.cliente_nome || '—';
        const nomeCliFmt = typeof window.formatarNomeClienteComIcone === 'function'
            ? window.formatarNomeClienteComIcone(nomeCliRaw)
            : nomeCliRaw;
        const numCtr = r.contrato_numero || r.proposta_id || '—';

        return '<tr>' +
            '<td><span style="background:#f8fafc;color:#0f172a;border:1px solid #cbd5e1;border-radius:7px;padding:2px 8px;font-weight:700;font-size:0.75rem;white-space:nowrap;"><i class="ph ph-calendar"></i> ' + _escLogEst(_formatarDataBrLogEst(r.data_entrega)) + '</span></td>' +
            '<td><button type="button" onclick="window.abrirContratoPeloEstoqueLogistica(' + (Number(r.proposta_id) || 0) + ')" title="Clique para abrir o Contrato ' + _escLogEst(numCtr) + '" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:7px;padding:2px 8px;font-weight:800;font-size:0.76rem;white-space:nowrap;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">' + _escLogEst(numCtr) + '</button></td>' +
            '<td style="font-weight:700;color:#0f172a;font-size:0.76rem;">' + _escLogEst(nomeCliFmt) + '</td>' +
            '<td style="color:#334155;font-weight:600;font-size:0.76rem;">' + _escLogEst(r.equipamento_comercial_nome) + '</td>' +
            '<td><span style="background:' + (String(r.modelo_estoque || '').toUpperCase().includes('EVENTO') ? '#faf5ff;color:#7e22ce;border:1px solid #e9d5ff' : '#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe') + ';border-radius:7px;padding:2px 8px;font-weight:800;font-size:0.75rem;white-space:nowrap;">' + _escLogEst(_fmtModeloComIconeLogEst(r.modelo_estoque)) + '</span></td>' +
            '<td style="font-weight:800;color:#1d4ed8;font-size:0.84rem;">' + (Number(r.quantidade) || 0) + '</td>' +
        '</tr>';
    }).join('');

    cont.innerHTML =
        '<div class="table-responsive">' +
            '<table class="data-table" style="width:100%;font-size:0.76rem;">' +
                '<thead>' +
                    '<tr style="font-size:0.74rem;">' +
                        '<th style="font-size:0.74rem;">Entrega</th>' +
                        '<th style="font-size:0.74rem;">Nº Contrato</th>' +
                        '<th style="font-size:0.74rem;">Cliente</th>' +
                        '<th style="font-size:0.74rem;">Equipamento no Contrato</th>' +
                        '<th style="font-size:0.74rem;">Modelo Reservado</th>' +
                        '<th style="font-size:0.74rem;">Qtd.</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody>' + rowsHtml + '</tbody>' +
            '</table>' +
        '</div>';
};

// ============================================================================
// MODAL DE ADICIONAR / EDITAR EQUIPAMENTO DE ESTOQUE DA LOGÍSTICA
// ============================================================================
window._garantirModalItemLogisticaEstoque = function() {
    if (document.getElementById('modal-item-logistica-estoque')) return;
    const overlay = document.createElement('div');
    overlay.id = 'modal-item-logistica-estoque';
    overlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:10060;background:rgba(15,23,42,0.65);backdrop-filter:blur(2px);align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    overlay.onclick = function(e) {
        if (e.target === overlay) window.fecharModalItemLogisticaEstoque();
    };

    overlay.innerHTML =
        '<div style="background:#fff;border-radius:16px;max-width:680px;width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.4rem;border-bottom:1px solid #e2e8f0;background:#f8fafc;">' +
                '<div style="display:flex;align-items:center;gap:10px;">' +
                    '<div style="width:38px;height:38px;border-radius:10px;background:#ecfdf5;color:#059669;display:flex;align-items:center;justify-content:center;font-size:1.25rem;">' +
                        '<i class="ph ph-package"></i>' +
                    '</div>' +
                    '<div>' +
                        '<h3 id="modal-log-est-titulo" style="margin:0;font-size:1.05rem;font-weight:800;color:#0f172a;">Adicionar Equipamento ao Estoque</h3>' +
                        '<p style="margin:2px 0 0;font-size:0.78rem;color:#64748b;">Preencha os dados do equipamento e o vínculo com o Comercial</p>' +
                    '</div>' +
                '</div>' +
                '<button type="button" onclick="window.fecharModalItemLogisticaEstoque()" style="border:none;background:#e2e8f0;color:#334155;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem;">' +
                    '<i class="ph ph-x"></i>' +
                '</button>' +
            '</div>' +

            '<form id="form-item-logistica-estoque" onsubmit="window.salvarItemLogisticaEstoque(event)" style="padding:1.25rem 1.4rem;overflow-y:auto;display:flex;flex-direction:column;gap:0.95rem;">' +
                '<input type="hidden" id="log-est-inp-id" value="">' +

                '<input type="hidden" id="log-est-inp-quantidade" value="1">' +
                '<div style="display:grid;grid-template-columns:140px 1fr 180px;gap:0.85rem;">' +
                    '<div>' +
                        '<label style="display:block;font-size:0.82rem;font-weight:700;color:#334155;margin-bottom:4px;">Série *</label>' +
                        '<input type="text" id="log-est-inp-serie" required class="form-control" placeholder="Ex: 1 (ou 1, 2, 3)" style="width:100%;">' +
                    '</div>' +
                    '<div style="position:relative;" id="wrap-log-est-inp-modelo">' +
                        '<label style="display:block;font-size:0.82rem;font-weight:700;color:#334155;margin-bottom:4px;">Modelo *</label>' +
                        '<div style="position:relative;display:flex;align-items:center;">' +
                            '<input type="text" id="log-est-inp-modelo" required class="form-control" placeholder="Clique ou digite: 💙 STD OBRA, 💜 STD EVENTO, 🚿 CHUVEIRO..." autocomplete="off" onfocus="window.abrirComboModeloModalLogEst(\'\')" onclick="window.abrirComboModeloModalLogEst(\'\')" oninput="window.abrirComboModeloModalLogEst(this.value)" style="width:100%;padding-right:32px;">' +
                            '<button type="button" tabindex="-1" onclick="window.abrirComboModeloModalLogEst(\'\')" style="position:absolute;right:4px;background:none;border:none;color:#64748b;cursor:pointer;padding:4px 6px;"><i class="ph ph-caret-down"></i></button>' +
                        '</div>' +
                        '<div id="combo-list-log-est-modelo" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:10080;background:#fff;border:1px solid #cbd5e1;border-radius:8px;max-height:230px;overflow-y:auto;box-shadow:0 10px 25px -5px rgba(0,0,0,0.2);margin-top:3px;"></div>' +
                    '</div>' +
                    '<div>' +
                        '<label style="display:block;font-size:0.82rem;font-weight:700;color:#334155;margin-bottom:4px;">Cor</label>' +
                        '<input type="text" id="log-est-inp-cor" class="form-control" placeholder="Ex: Roxo, Azul..." style="width:100%;">' +
                    '</div>' +
                '</div>' +

                // Vínculo com Equipamentos do Comercial
                '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:0.95rem;">' +
                    '<label style="display:block;font-size:0.83rem;font-weight:700;color:#0f172a;margin-bottom:3px;">' +
                        '<i class="ph ph-link" style="color:#059669;"></i> Vínculo com Equipamento(s) do Comercial' +
                    '</label>' +
                    '<div style="font-size:0.75rem;color:#64748b;margin-bottom:8px;">' +
                        'Selecione quais equipamentos/pacotes da tela <strong>Comercial → Administração → Equipamentos</strong> (ex: BANHEIRO QUÍMICO STANDARD O04XZA) reservam este modelo de estoque quando viram Contrato:' +
                    '</div>' +
                    '<div style="position:relative;margin-bottom:8px;">' +
                        '<i class="ph ph-magnifying-glass" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;"></i>' +
                        '<input type="text" id="log-est-inp-busca-comercial" class="form-control" placeholder="Digite para pesquisar equipamentos do Comercial em tempo real..." oninput="window.renderListaEquipamentosComercialModalLogEst()" onfocus="window.renderListaEquipamentosComercialModalLogEst()" style="width:100%;padding-left:32px;background:#fff;">' +
                    '</div>' +
                    '<div id="log-est-chips-selecionados" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;"></div>' +
                    '<div id="log-est-lista-comercial" style="max-height:175px;overflow-y:auto;background:#fff;border:1px solid #cbd5e1;border-radius:8px;divide-y:1px solid #f1f5f9;"></div>' +
                '</div>' +

                '<div style="display:flex;justify-content:flex-end;gap:0.65rem;padding-top:0.5rem;border-top:1px solid #e2e8f0;">' +
                    '<button type="button" class="btn btn-secondary" onclick="window.fecharModalItemLogisticaEstoque()" style="padding:0.55rem 1.1rem;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#475569;font-weight:600;cursor:pointer;">Cancelar</button>' +
                    '<button type="submit" id="btn-salvar-item-log-est" class="btn btn-primary" style="padding:0.55rem 1.35rem;border-radius:8px;border:none;background:#059669;color:#fff;font-weight:700;cursor:pointer;">Salvar Equipamento</button>' +
                '</div>' +
            '</form>' +
        '</div>';

    document.body.appendChild(overlay);
};

window.abrirModalItemLogisticaEstoque = function(id) {
    window._garantirModalItemLogisticaEstoque();
    const modal = document.getElementById('modal-item-logistica-estoque');
    if (!modal) return;

    const eqComercialAll = window._logEstoqueState.equipamentosComercial || [];
    const tituloEl = document.getElementById('modal-log-est-titulo');
    const buscaEl = document.getElementById('log-est-inp-busca-comercial');
    if (buscaEl) buscaEl.value = '';

    if (id) {
        const item = (window._logEstoqueState.itens || []).find(x => String(x.id) === String(id));
        if (!item) return;
        if (tituloEl) tituloEl.textContent = 'Editar Equipamento de Estoque';
        document.getElementById('log-est-inp-id').value = item.id;
        document.getElementById('log-est-inp-modelo').value = _fmtModeloComIconeLogEst(item.modelo || '');
        document.getElementById('log-est-inp-quantidade').value = Number(item.quantidade) || 0;
        document.getElementById('log-est-inp-cor').value = item.cor || '';
        document.getElementById('log-est-inp-serie').value = item.numero_serie || '';
        if (document.getElementById('log-est-inp-medidas')) if (document.getElementById('log-est-inp-medidas')) document.getElementById('log-est-inp-medidas').value = '';

        const selSet = new Set();
        (item.equipamentos_comercial || []).forEach(v => {
            if (typeof v === 'object' && v !== null && v.id) {
                selSet.add(Number(v.id));
            } else {
                const found = eqComercialAll.find(e => _normLogEst(e.nome) === _normLogEst(v) || _normLogEst(e.codigo) === _normLogEst(v));
                if (found) selSet.add(Number(found.id));
            }
        });
        eqComercialAll.forEach(e => {
            if (_normLogEst(e.logistica_estoque_modelo) === _normLogEst(item.modelo)) {
                selSet.add(Number(e.id));
            }
        });
        window._logEstoqueState.comercialSelecionadosModal = Array.from(selSet);
    } else {
        if (tituloEl) tituloEl.textContent = 'Adicionar Equipamento ao Estoque';
        document.getElementById('log-est-inp-id').value = '';
        document.getElementById('log-est-inp-modelo').value = '';
        document.getElementById('log-est-inp-quantidade').value = 1;
        document.getElementById('log-est-inp-cor').value = '';
        document.getElementById('log-est-inp-serie').value = '';
        if (document.getElementById('log-est-inp-medidas')) document.getElementById('log-est-inp-medidas').value = '';
        window._logEstoqueState.comercialSelecionadosModal = [];
    }

    window.renderChipsEquipamentosComercialModalLogEst();
    window.renderListaEquipamentosComercialModalLogEst();
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('log-est-inp-modelo')?.focus(), 60);
};

window.fecharModalItemLogisticaEstoque = function() {
    const modal = document.getElementById('modal-item-logistica-estoque');
    if (modal) modal.style.display = 'none';
    const dd = document.getElementById('combo-list-log-est-modelo');
    if (dd) dd.style.display = 'none';
};

window.selecionarModeloModalLogEst = function(codigo) {
    const inp = document.getElementById('log-est-inp-modelo');
    const dd = document.getElementById('combo-list-log-est-modelo');
    if (inp) inp.value = _fmtModeloComIconeLogEst(codigo);
    if (dd) dd.style.display = 'none';
};

window.abrirComboModeloModalLogEst = function(termo) {
    const dd = document.getElementById('combo-list-log-est-modelo');
    if (!dd) return;
    const catalogo = window.EQUIPAMENTOS_OS_LOGISTICA_CATALOGO || [];
    const q = _normLogEst(termo);
    const filtrados = catalogo.filter(it => !q || _normLogEst(it.codigo).includes(q) || _normLogEst(it.categoria).includes(q));
    const grupos = [
        { key: 'OBRA',   titulo: 'BANHEIROS E CHUVEIRO — OBRA',   cor: '#1d4ed8', bg: '#eff6ff' },
        { key: 'EVENTO', titulo: 'BANHEIROS E CHUVEIRO — EVENTO', cor: '#7e22ce', bg: '#faf5ff' },
        { key: 'UNICO',  titulo: 'ESTOQUE ÚNICO (OBRA E EVENTO)', cor: '#047857', bg: '#ecfdf5' }
    ];
    let html = '';
    grupos.forEach(g => {
        const itensG = filtrados.filter(x => x.categoria === g.key);
        if (!itensG.length) return;
        html += '<div style="padding:5px 12px;font-size:0.71rem;font-weight:800;color:' + g.cor + ';background:' + g.bg + ';border-bottom:1px solid #e2e8f0;">' + _escLogEst(g.titulo) + '</div>';
        itensG.forEach(it => {
            html += '<div onmousedown="event.preventDefault(); window.selecionarModeloModalLogEst(\'' + _escLogEst(it.codigo) + '\');" style="padding:8px 12px;cursor:pointer;font-size:0.84rem;font-weight:700;color:#0f172a;border-bottom:1px solid #f8fafc;" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'#fff\'">' +
                _escLogEst(it.label) +
            '</div>';
        });
    });
    dd.innerHTML = html || '<div style="padding:8px 12px;font-size:0.8rem;color:#64748b;">Digite ou selecione um modelo</div>';
    dd.style.display = 'block';
};

document.addEventListener('click', function(e) {
    const dd = document.getElementById('combo-list-log-est-modelo');
    const wrap = document.getElementById('wrap-log-est-inp-modelo');
    if (dd && dd.style.display === 'block' && wrap && !wrap.contains(e.target)) {
        dd.style.display = 'none';
    }
});

window.toggleEquipamentoComercialModalLogEst = function(eqId) {
    const numId = Number(eqId);
    const arr = window._logEstoqueState.comercialSelecionadosModal || [];
    const idx = arr.indexOf(numId);
    if (idx >= 0) {
        arr.splice(idx, 1);
    } else {
        arr.push(numId);
    }
    window._logEstoqueState.comercialSelecionadosModal = arr;
    window.renderChipsEquipamentosComercialModalLogEst();
    window.renderListaEquipamentosComercialModalLogEst();
};

window.renderChipsEquipamentosComercialModalLogEst = function() {
    const box = document.getElementById('log-est-chips-selecionados');
    if (!box) return;
    const sel = window._logEstoqueState.comercialSelecionadosModal || [];
    const eqAll = window._logEstoqueState.equipamentosComercial || [];
    if (sel.length === 0) {
        box.innerHTML = '<span style="font-size:0.75rem;color:#94a3b8;">Nenhum equipamento comercial selecionado ainda.</span>';
        return;
    }
    box.innerHTML = sel.map(id => {
        const eq = eqAll.find(e => Number(e.id) === Number(id));
        if (!eq) return '';
        return '<span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:7px;padding:3px 8px;font-size:0.76rem;font-weight:700;display:inline-flex;align-items:center;gap:5px;">' +
            '[' + _escLogEst(eq.codigo) + '] ' + _escLogEst(eq.nome) +
            '<button type="button" onclick="window.toggleEquipamentoComercialModalLogEst(' + eq.id + ')" style="border:none;background:transparent;color:#047857;cursor:pointer;font-weight:800;padding:0 2px;">×</button>' +
        '</span>';
    }).join('');
};

window.renderListaEquipamentosComercialModalLogEst = function() {
    const listEl = document.getElementById('log-est-lista-comercial');
    if (!listEl) return;
    const q = _normLogEst(document.getElementById('log-est-inp-busca-comercial')?.value || '');
    const eqAll = window._logEstoqueState.equipamentosComercial || [];
    const sel = window._logEstoqueState.comercialSelecionadosModal || [];

    const filtrados = eqAll.filter(eq => {
        if (!q) return true;
        return _normLogEst((eq.codigo || '') + ' ' + (eq.nome || '') + ' ' + (eq.grupo_produto || '')).includes(q);
    });

    if (filtrados.length === 0) {
        listEl.innerHTML = '<div style="padding:10px;text-align:center;color:#94a3b8;font-size:0.8rem;">Nenhum equipamento comercial encontrado.</div>';
        return;
    }

    listEl.innerHTML = filtrados.map(eq => {
        const checked = sel.includes(Number(eq.id));
        const modAtual = eq.logistica_estoque_modelo ? (' <span style="font-size:0.7rem;color:#059669;font-weight:700;">(Atual: ' + _escLogEst(eq.logistica_estoque_modelo) + ')</span>') : '';
        return '<div onclick="window.toggleEquipamentoComercialModalLogEst(' + eq.id + ')" style="padding:7px 10px;border-bottom:1px solid #f1f5f9;cursor:pointer;display:flex;align-items:center;gap:8px;background:' + (checked ? '#f0fdf4' : '#fff') + ';font-size:0.81rem;">' +
            '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onclick="event.stopPropagation(); window.toggleEquipamentoComercialModalLogEst(' + eq.id + ')" style="cursor:pointer;">' +
            '<span style="font-weight:700;color:#c2410c;font-size:0.75rem;">[' + _escLogEst(eq.codigo) + ']</span>' +
            '<span style="font-weight:600;color:#0f172a;flex:1;">' + _escLogEst(eq.nome) + modAtual + '</span>' +
        '</div>';
    }).join('');
};

window.salvarItemLogisticaEstoque = async function(event) {
    if (event) event.preventDefault();
    const id = (document.getElementById('log-est-inp-id')?.value || '').trim();
    const modeloRaw = (document.getElementById('log-est-inp-modelo')?.value || '').trim();
    const modelo = typeof window.normalizarCodigoModeloEstoqueLogistica === 'function'
        ? window.normalizarCodigoModeloEstoqueLogistica(modeloRaw)
        : modeloRaw;
    const quantidade = Number(document.getElementById('log-est-inp-quantidade')?.value) || 0;
    const cor = (document.getElementById('log-est-inp-cor')?.value || '').trim();
    const numero_serie = (document.getElementById('log-est-inp-serie')?.value || '').trim();
    const medidas = (document.getElementById('log-est-inp-medidas')?.value || '').trim();

    if (!modelo) {
        Swal.fire({ icon: 'warning', title: 'Atenção', text: 'Informe o modelo do equipamento (ex: STD, LUXO).' });
        return;
    }

    const eqAll = window._logEstoqueState.equipamentosComercial || [];
    const selIds = window._logEstoqueState.comercialSelecionadosModal || [];
    const equipamentos_comercial = selIds.map(eqId => {
        const found = eqAll.find(e => Number(e.id) === Number(eqId));
        return found ? { id: found.id, codigo: found.codigo, nome: found.nome } : { id: eqId };
    });

    const btn = document.getElementById('btn-salvar-item-log-est');
    const orig = btn ? btn.innerHTML : '';
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = 'Salvando...'; }
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const apiBase = (typeof API_URL !== 'undefined' && API_URL) ? API_URL : '/api';

        // Quando estiver adicionando novo item, permite cadastrar cada número de série 1 por 1
        const seriesList = (!id && numero_serie.includes(','))
            ? numero_serie.split(',').map(s => s.trim()).filter(Boolean)
            : [numero_serie];

        for (const serieUnit of seriesList) {
            const url = id ? (apiBase + '/logistica/estoque/' + id) : (apiBase + '/logistica/estoque');
            const method = id ? 'PUT' : 'POST';
            const r = await fetch(url, {
                method,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    modelo,
                    quantidade: 1,
                    cor,
                    numero_serie: serieUnit,
                    medidas,
                    equipamentos_comercial
                })
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.error || 'Erro ao salvar equipamento de estoque');
        }

        window.fecharModalItemLogisticaEstoque();
        await window.carregarLogisticaEstoque();
        if (typeof window.carregarEquipamentosEstoque === 'function') {
            window.carregarEquipamentosEstoque();
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
};

window.excluirItemLogisticaEstoque = async function(id) {
    const item = (window._logEstoqueState.itens || []).find(x => String(x.id) === String(id));
    if (!item) return;

    const { isConfirmed } = await Swal.fire({
        icon: 'warning',
        title: 'Excluir do Estoque?',
        html: 'Deseja remover o item <strong>' + _escLogEst(item.modelo) + '</strong> (Qtd: ' + item.quantidade + ') do estoque da logística?',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar'
    });
    if (!isConfirmed) return;

    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const r = await fetch(((typeof API_URL !== 'undefined' && API_URL) ? API_URL : '/api') + '/logistica/estoque/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!r.ok) throw new Error('Falha ao excluir item');
        await window.carregarLogisticaEstoque();
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
    }
};

window.baixarModeloPlanilhaLogisticaEstoque = async function() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const r = await fetch(((typeof API_URL !== 'undefined' && API_URL) ? API_URL : '/api') + '/logistica/estoque/modelo-xlsx', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!r.ok) throw new Error('Erro ao gerar planilha modelo');
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modelo_importacao_estoque_logistica.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
    }
};

window.importarPlanilhaLogisticaEstoque = async function(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const base64 = e.target?.result || '';
            Swal.fire({
                title: 'Importando equipamentos...',
                text: 'Processando planilha e vínculos com o Comercial...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const r = await fetch(((typeof API_URL !== 'undefined' && API_URL) ? API_URL : '/api') + '/logistica/estoque/importar', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ file_base64: base64 })
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.error || 'Erro ao importar planilha');

            await window.carregarLogisticaEstoque();
            if (typeof window.carregarEquipamentosEstoque === 'function') {
                window.carregarEquipamentosEstoque();
            }

            Swal.fire({
                icon: 'success',
                title: 'Importação Concluída!',
                html: 'Foram importados <strong>' + (d.inseridos || 0) + '</strong> registro(s) para o Estoque da Logística.'
            });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Erro na Importação', text: err.message });
        }
    };
    reader.readAsDataURL(file);
};

window.recalcularReservasLogisticaEstoque = async function() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const r = await fetch(((typeof API_URL !== 'undefined' && API_URL) ? API_URL : '/api') + '/logistica/estoque/recalcular-reservas', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Erro ao sincronizar reservas');
        await window.carregarLogisticaEstoque();
        Swal.fire({
            icon: 'success',
            title: 'Reservas Sincronizadas',
            text: 'Contratos ativos verificados: ' + (d.contratos_processados || 0),
            timer: 1800,
            showConfirmButton: false
        });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
    }
};
