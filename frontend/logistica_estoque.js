// frontend/logistica_estoque.js
// Tela Logística -> Estoque (Controle de equipamentos de estoque, vínculo com equipamentos do Comercial e reservas automáticas de Contratos)

window._logEstoqueState = {
    abaAtiva: 'estoque', // 'estoque' | 'reservas'
    itens: [],
    modelos: [],
    reservas: [],
    equipamentosComercial: [],
    filtroTexto: '',
    filtroModelo: '',
    filtroDataEntrega: '',
    editandoId: null,
    comercialSelecionadosModal: [] // array of ids or names
};

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
                '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1.25rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;box-shadow:0 1px 3px rgba(15,23,42,0.03);">' +
                    '<div style="display:flex;align-items:center;gap:0.9rem;">' +
                        '<div style="width:46px;height:46px;border-radius:12px;background:#ecfdf5;border:1px solid #a7f3d0;color:#059669;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">' +
                            '<i class="ph ph-package"></i>' +
                        '</div>' +
                        '<div>' +
                            '<h2 style="margin:0;font-size:1.25rem;font-weight:800;color:#0f172a;letter-spacing:-0.01em;">Estoque da Logística</h2>' +
                            '<p style="margin:2px 0 0;font-size:0.84rem;color:#64748b;">Controle de equipamentos em estoque, vínculo com pacotes/equipamentos do Comercial e reserva automática por data de entrega de <strong>Contratos</strong>.</p>' +
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

                // Cards de Resumo por Modelo
                '<div id="logistica-estoque-cards-modelos" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:0.85rem;"></div>' +

                // Barra de Abas + Filtros
                '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1rem 1.25rem;display:flex;flex-direction:column;gap:0.9rem;">' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;border-bottom:1px solid #f1f5f9;padding-bottom:0.75rem;">' +
                        '<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">' +
                            '<button type="button" id="tab-btn-log-est-estoque" onclick="window.trocarAbaLogisticaEstoque(\'estoque\')" style="padding:0.5rem 1rem;border-radius:9px;border:1px solid #059669;background:#ecfdf5;color:#047857;font-weight:700;font-size:0.84rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">' +
                                '<i class="ph ph-stack"></i> Equipamentos em Estoque <span id="badge-count-log-est-itens" style="background:#059669;color:#fff;border-radius:999px;padding:1px 8px;font-size:0.74rem;">0</span>' +
                            '</button>' +
                            '<button type="button" id="tab-btn-log-est-reservas" onclick="window.trocarAbaLogisticaEstoque(\'reservas\')" style="padding:0.5rem 1rem;border-radius:9px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-weight:700;font-size:0.84rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">' +
                                '<i class="ph ph-calendar-check"></i> Reservas de Contratos por Data de Entrega <span id="badge-count-log-est-reservas" style="background:#64748b;color:#fff;border-radius:999px;padding:1px 8px;font-size:0.74rem;">0</span>' +
                            '</button>' +
                        '</div>' +
                        '<div style="display:flex;align-items:center;gap:0.5rem;">' +
                            '<button type="button" onclick="window.recalcularReservasLogisticaEstoque()" title="Recalcular reservas de todos os contratos ativos" style="padding:0.45rem 0.85rem;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#334155;font-weight:600;font-size:0.8rem;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">' +
                                '<i class="ph ph-arrows-clockwise"></i> Sincronizar Contratos' +
                            '</button>' +
                        '</div>' +
                    '</div>' +

                    // Filtros em tempo real
                    '<div style="display:grid;grid-template-columns:1fr 220px 210px auto;gap:0.75rem;align-items:end;">' +
                        '<div>' +
                            '<label style="display:block;font-size:0.76rem;font-weight:700;color:#475569;margin-bottom:4px;">Pesquisar (Série, Modelo, Cor, Equipamento Comercial, Contrato ou Cliente)</label>' +
                            '<div style="position:relative;">' +
                                '<i class="ph ph-magnifying-glass" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1rem;"></i>' +
                                '<input type="text" id="filtro-log-est-texto" class="form-control" placeholder="Digite para filtrar em tempo real..." oninput="window.filtrarTelaLogisticaEstoque()" style="width:100%;padding-left:34px;">' +
                            '</div>' +
                        '</div>' +
                        '<div>' +
                            '<label style="display:block;font-size:0.76rem;font-weight:700;color:#475569;margin-bottom:4px;">Filtrar Modelo</label>' +
                            '<input type="text" id="filtro-log-est-modelo" class="form-control" placeholder="Ex: STD, LUXO, PCD..." oninput="window.filtrarTelaLogisticaEstoque()" style="width:100%;">' +
                        '</div>' +
                        '<div>' +
                            '<label style="display:block;font-size:0.76rem;font-weight:700;color:#475569;margin-bottom:4px;">Data de Entrega (Reserva)</label>' +
                            '<input type="date" id="filtro-log-est-data" class="form-control" onchange="window.filtrarTelaLogisticaEstoque()" oninput="window.filtrarTelaLogisticaEstoque()" style="width:100%;">' +
                        '</div>' +
                        '<div>' +
                            '<button type="button" onclick="window.limparFiltrosLogisticaEstoque()" style="padding:0.55rem 0.9rem;border-radius:8px;border:1px solid #cbd5e1;background:#f8fafc;color:#475569;font-weight:600;font-size:0.82rem;cursor:pointer;white-space:nowrap;">' +
                                '<i class="ph ph-broom"></i> Limpar' +
                            '</button>' +
                        '</div>' +
                    '</div>' +

                    // Container da tabela ativa
                    '<div id="logistica-estoque-tabela-container"></div>' +
                '</div>' +
            '</div>';
        window.renderCardsModelosLogisticaEstoque();
        window.renderTabelaAtivaLogisticaEstoque();
    }

    await window.carregarLogisticaEstoque();
};

window.carregarLogisticaEstoque = async function() {
    try {
        const apiBase = (typeof API_URL !== 'undefined' && API_URL) ? API_URL : '/api';
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const dataFiltro = document.getElementById('filtro-log-est-data')?.value || '';
        const qs = dataFiltro ? ('?data=' + encodeURIComponent(dataFiltro)) : '';
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

window.filtrarTelaLogisticaEstoque = function() {
    const txt = document.getElementById('filtro-log-est-texto')?.value || '';
    const mod = document.getElementById('filtro-log-est-modelo')?.value || '';
    const dt = document.getElementById('filtro-log-est-data')?.value || '';
    const mudouData = window._logEstoqueState.filtroDataEntrega !== dt;
    window._logEstoqueState.filtroTexto = txt;
    window._logEstoqueState.filtroModelo = mod;
    window._logEstoqueState.filtroDataEntrega = dt;
    if (mudouData) {
        window.carregarLogisticaEstoque();
    } else {
        window.renderCardsModelosLogisticaEstoque();
        window.renderTabelaAtivaLogisticaEstoque();
    }
};

window.limparFiltrosLogisticaEstoque = function() {
    const elTxt = document.getElementById('filtro-log-est-texto');
    const elMod = document.getElementById('filtro-log-est-modelo');
    const elDt = document.getElementById('filtro-log-est-data');
    if (elTxt) elTxt.value = '';
    if (elMod) elMod.value = '';
    if (elDt) elDt.value = '';
    window._logEstoqueState.filtroTexto = '';
    window._logEstoqueState.filtroModelo = '';
    const tinhaData = !!window._logEstoqueState.filtroDataEntrega;
    window._logEstoqueState.filtroDataEntrega = '';
    if (tinhaData) {
        window.carregarLogisticaEstoque();
    } else {
        window.renderCardsModelosLogisticaEstoque();
        window.renderTabelaAtivaLogisticaEstoque();
    }
};

window.filtrarPorModeloCardLogisticaEstoque = function(modelo) {
    const elMod = document.getElementById('filtro-log-est-modelo');
    if (!elMod) return;
    if (_normLogEst(elMod.value) === _normLogEst(modelo)) {
        elMod.value = '';
    } else {
        elMod.value = modelo;
    }
    window.filtrarTelaLogisticaEstoque();
};

window.renderCardsModelosLogisticaEstoque = function() {
    const box = document.getElementById('logistica-estoque-cards-modelos');
    if (!box) return;
    const modelos = window._logEstoqueState.modelos || [];
    const dataFiltro = window._logEstoqueState.filtroDataEntrega;
    const modAtivo = _normLogEst(window._logEstoqueState.filtroModelo);

    if (modelos.length === 0) {
        box.innerHTML =
            '<div style="grid-column:1/-1;background:#fff;border:1px dashed #cbd5e1;border-radius:12px;padding:1.25rem;text-align:center;color:#64748b;font-size:0.86rem;">' +
                'Nenhum modelo de estoque cadastrado ainda. Clique em <strong>Adicionar Manualmente</strong> ou <strong>Importar em Massa</strong> para cadastrar seus equipamentos (ex: STD, LUXO, PCD).' +
            '</div>';
        return;
    }

    box.innerHTML = modelos.map(m => {
        const isSel = modAtivo && modAtivo === _normLogEst(m.modelo);
        const qtdTotal = Number(m.quantidade_total) || 0;
        const qtdRes = dataFiltro ? (Number(m.reservado_na_data) || 0) : (Number(m.reservado_total) || 0);
        const disponivel = qtdTotal - qtdRes;
        const corDisp = disponivel < 0 ? '#dc2626' : (disponivel === 0 ? '#d97706' : '#059669');
        const eqCount = (m.equipamentos_comercial || []).length;

        return '<div onclick="window.filtrarPorModeloCardLogisticaEstoque(\'' + _escLogEst(m.modelo) + '\')" style="background:#fff;border:2px solid ' + (isSel ? '#059669' : '#e2e8f0') + ';border-radius:12px;padding:0.95rem 1.1rem;cursor:pointer;transition:all 0.15s;box-shadow:0 1px 2px rgba(15,23,42,0.03);">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">' +
                '<span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:7px;padding:3px 10px;font-weight:800;font-size:0.86rem;display:inline-flex;align-items:center;gap:5px;">' +
                    '' + _escLogEst(_fmtModeloComIconeLogEst(m.modelo)) +
                '</span>' +
                '<span style="font-size:0.73rem;color:#64748b;font-weight:600;" title="Equipamentos do Comercial vinculados a este modelo">' +
                    '<i class="ph ph-link"></i> ' + eqCount + ' vínculo(s)' +
                '</span>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center;background:#f8fafc;border-radius:8px;padding:7px 6px;">' +
                '<div>' +
                    '<div style="font-size:0.68rem;color:#64748b;font-weight:600;">Estoque</div>' +
                    '<div style="font-size:1rem;font-weight:800;color:#0f172a;">' + qtdTotal + '</div>' +
                '</div>' +
                '<div style="border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">' +
                    '<div style="font-size:0.68rem;color:#64748b;font-weight:600;">' + (dataFiltro ? 'Reserv. Data' : 'Reservado') + '</div>' +
                    '<div style="font-size:1rem;font-weight:800;color:#1d4ed8;">' + qtdRes + '</div>' +
                '</div>' +
                '<div>' +
                    '<div style="font-size:0.68rem;color:#64748b;font-weight:600;">Disponível</div>' +
                    '<div style="font-size:1rem;font-weight:800;color:' + corDisp + ';">' + disponivel + '</div>' +
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
    if (badgeItens) badgeItens.textContent = String((window._logEstoqueState.itens || []).length);
    if (badgeRes) badgeRes.textContent = String((window._logEstoqueState.reservas || []).length);

    if (window._logEstoqueState.abaAtiva === 'reservas') {
        window._renderTabelaReservasContratosLogEst(cont);
    } else {
        window._renderTabelaItensEstoqueLogEst(cont);
    }
};

window._renderTabelaItensEstoqueLogEst = function(cont) {
    const q = _normLogEst(window._logEstoqueState.filtroTexto);
    const qMod = _normLogEst(window._logEstoqueState.filtroModelo);
    const eqComercialAll = window._logEstoqueState.equipamentosComercial || [];

    const lista = (window._logEstoqueState.itens || []).filter(item => {
        if (qMod && !_normLogEst(item.modelo).includes(qMod)) return false;
        if (!q) return true;
        const vincs = (item.equipamentos_comercial || []).map(x => typeof x === 'object' ? (x.nome || x.codigo || '') : String(x)).join(' ');
        const eqPorMod = eqComercialAll.filter(e => _normLogEst(e.logistica_estoque_modelo) === _normLogEst(item.modelo)).map(e => (e.codigo || '') + ' ' + (e.nome || '')).join(' ');
        const alvo = _normLogEst([item.modelo, item.cor, item.numero_serie, item.medidas, vincs, eqPorMod].join(' '));
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
        const vinculosHtml = vinculosList.length > 0
            ? '<div style="display:flex;flex-wrap:wrap;gap:4px;">' +
                vinculosList.map(v =>
                    '<span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:2px 8px;font-size:0.74rem;font-weight:600;">' + _escLogEst(v) + '</span>'
                ).join('') +
              '</div>'
            : '<span style="color:#94a3b8;font-size:0.78rem;">Sem vínculo comercial</span>';

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
            '<table class="data-table" style="width:100%;">' +
                '<thead>' +
                    '<tr>' +
                        '<th style="width:110px;">Série</th>' +
                        '<th>Modelo</th>' +
                        '<th>Cor</th>' +
                        '<th>Vínculo com Equipamentos</th>' +
                        '<th style="text-align:right;">Ações</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody>' + rowsHtml + '</tbody>' +
            '</table>' +
        '</div>';
};

window._renderTabelaReservasContratosLogEst = function(cont) {
    const q = _normLogEst(window._logEstoqueState.filtroTexto);
    const qMod = _normLogEst(window._logEstoqueState.filtroModelo);
    const dtFiltro = window._logEstoqueState.filtroDataEntrega;

    const lista = (window._logEstoqueState.reservas || []).filter(r => {
        if (dtFiltro && String(r.data_entrega || '') !== dtFiltro) return false;
        if (qMod && !_normLogEst(r.modelo_estoque).includes(qMod)) return false;
        if (!q) return true;
        const alvo = _normLogEst([r.contrato_numero, r.cliente_nome, r.equipamento_comercial_nome, r.modelo_estoque, r.data_entrega].join(' '));
        return alvo.includes(q);
    });

    const avisoHtml =
        '<div style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:10px;padding:10px 14px;font-size:0.82rem;margin-bottom:0.85rem;display:flex;align-items:center;gap:8px;">' +
            '<i class="ph ph-info" style="font-size:1.15rem;flex-shrink:0;"></i>' +
            '<span>As reservas abaixo são geradas <strong>automaticamente apenas para Contratos ativos</strong> (propostas em negociação não reservam estoque). Ao selecionar um pacote/equipamento vinculado no contrato, o sistema reserva a quantidade correspondente para a data de entrega.</span>' +
        '</div>';

    if (lista.length === 0) {
        cont.innerHTML = avisoHtml +
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

        return '<tr>' +
            '<td><span style="background:#f8fafc;color:#0f172a;border:1px solid #cbd5e1;border-radius:7px;padding:3px 9px;font-weight:700;font-size:0.8rem;white-space:nowrap;"><i class="ph ph-calendar"></i> ' + _escLogEst(_formatarDataBrLogEst(r.data_entrega)) + '</span></td>' +
            '<td><span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:7px;padding:3px 9px;font-weight:800;font-size:0.8rem;white-space:nowrap;">Contrato #' + _escLogEst(r.contrato_numero || r.proposta_id) + '</span></td>' +
            '<td style="font-weight:700;color:#0f172a;">' + _escLogEst(nomeCliFmt) + '</td>' +
            '<td style="color:#334155;font-weight:600;">' + _escLogEst(r.equipamento_comercial_nome) + '</td>' +
            '<td><span style="background:' + (String(r.modelo_estoque || '').toUpperCase().includes('EVENTO') ? '#faf5ff;color:#7e22ce;border:1px solid #e9d5ff' : '#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe') + ';border-radius:7px;padding:3px 10px;font-weight:800;font-size:0.8rem;white-space:nowrap;">' + _escLogEst(_fmtModeloComIconeLogEst(r.modelo_estoque)) + '</span></td>' +
            '<td style="font-weight:800;color:#1d4ed8;font-size:0.95rem;">' + (Number(r.quantidade) || 0) + '</td>' +
        '</tr>';
    }).join('');

    cont.innerHTML = avisoHtml +
        '<div class="table-responsive">' +
            '<table class="data-table" style="width:100%;">' +
                '<thead>' +
                    '<tr>' +
                        '<th>Data de Entrega</th>' +
                        '<th>Nº Contrato</th>' +
                        '<th>Cliente</th>' +
                        '<th>Equipamento no Contrato (Comercial)</th>' +
                        '<th>Modelo Reservado no Estoque</th>' +
                        '<th>Qtd. Reservada</th>' +
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
        document.getElementById('log-est-inp-medidas').value = '';
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
        { key: 'OBRA',   titulo: 'BANHEIROS — OBRA',              cor: '#1d4ed8', bg: '#eff6ff' },
        { key: 'EVENTO', titulo: 'BANHEIROS — EVENTO',            cor: '#7e22ce', bg: '#faf5ff' },
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
