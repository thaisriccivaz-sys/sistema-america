/* ============================================================
   satisfacao_rh.js — Dashboard e Avaliações de Satisfação (RH)
   ============================================================ */
'use strict';

(function () {
    const API = window.API_URL || '';

    /* ── helpers ─────────────────────────────────────────────── */
    function authHeaders() {
        const tok = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || sessionStorage.getItem('erp_token') || sessionStorage.getItem('token') || '';
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` };
    }

    async function fetchJSON(url, opts = {}) {
        const r = await fetch(API + url, {
            headers: authHeaders(),
            cache: 'no-store',
            ...opts
        });
        if (!r.ok) {
            let errTxt = '';
            try {
                const j = await r.json();
                errTxt = j.error || j.message || JSON.stringify(j);
            } catch (e) {
                errTxt = await r.text();
            }
            throw new Error(errTxt || `Erro HTTP ${r.status}`);
        }
        return r.json();
    }

    function escHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Escala de 4 níveis: >=4.5 Verde (Bom) | 4.0–4.49 Amarelo (Ponto de Atenção) | 3.0–3.99 Laranja (Atenção Redobrada) | <3.0 Vermelho (Crítico)
    function scoreColor(v) {
        if (v === null || v === undefined || isNaN(v)) return '#94a3b8';
        const num = Number(v);
        if (num >= 4.5) return '#15803d'; // Verde
        if (num >= 4.0) return '#a16207'; // Amarelo (< 4.5)
        if (num >= 3.0) return '#c2410c'; // Laranja (< 4.0)
        return '#b91c1c';                 // Vermelho (< 3.0)
    }
    function scoreBg(v) {
        if (v === null || v === undefined || isNaN(v)) return 'rgba(148,163,184,.12)';
        const num = Number(v);
        if (num >= 4.5) return '#dcfce7'; // Verde claro
        if (num >= 4.0) return '#fef9c3'; // Amarelo claro (< 4.5)
        if (num >= 3.0) return '#ffedd5'; // Laranja claro (< 4.0)
        return '#fee2e2';                 // Vermelho claro (< 3.0)
    }
    function getStatusEspecial(ps) {
        if (!ps) return 'pendente';
        if (ps.respondido) return 'respondido';
        if (ps.status_especial === 'afastado') return 'afastado';
        if (ps.status_especial === 'na' || ps.nao_admitido) return 'na';
        return 'pendente';
    }
    function isConcluidoColab(ps) {
        const st = getStatusEspecial(ps);
        return st === 'respondido' || st === 'afastado' || st === 'na';
    }
    function trendIcon(arr, i) {
        if (i === 0 || arr[i - 1] === null || arr[i - 1] === undefined || arr[i] === null || arr[i] === undefined) return '';
        const diff = arr[i] - arr[i - 1];
        if (Math.abs(diff) < 0.1) return '<span style="color:#94a3b8" title="Estável">→</span>';
        return diff > 0
            ? `<span style="color:#22c55e" title="+${diff.toFixed(1)}">▲</span>`
            : `<span style="color:#ef4444" title="${diff.toFixed(1)}">▼</span>`;
    }
    function avatarHTML(col, size = 36) {
        const initials = (col.nome_completo || '?').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
        const colors = ['#7c3aed', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];
        const bg = colors[(col.nome_completo || '').charCodeAt(0) % colors.length];
        const fotoSrc = col.foto_base64 || (col.id ? `${API}/colaboradores/foto/${col.id}` : (col.foto_path ? (col.foto_path.startsWith('http') ? col.foto_path : `${API.replace('/api', '')}/${col.foto_path}`) : null));
        if (fotoSrc) {
            const finalSrc = fotoSrc.startsWith('data:') || fotoSrc.startsWith('http') || fotoSrc.startsWith('/') ? fotoSrc : `data:image/jpeg;base64,${fotoSrc}`;
            return `<img src="${finalSrc}" alt="${initials}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';"><div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};display:none;align-items:center;justify-content:center;color:#fff;font-size:${Math.round(size * 0.38)}px;font-weight:700;flex-shrink:0;">${initials}</div>`;
        }
        return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;color:#fff;font-size:${Math.round(size * 0.38)}px;font-weight:700;flex-shrink:0;">${initials}</div>`;
    }
    function fmtScore(v) {
        return v !== null && v !== undefined && !isNaN(v) ? Number(v).toFixed(1) : '—';
    }
    function periodLabel(p) {
        const mesNome = { 1: 'Fevereiro', 2: 'Maio', 3: 'Agosto', 4: 'Novembro' }[p.trimestre] || `T${p.trimestre}`;
        return `${mesNome} (${p.trimestre}º Trim. ${p.ano})`;
    }
    function normDepto(d) {
        return String(d || 'Sem Departamento').trim() || 'Sem Departamento';
    }

    /* ── STATE ───────────────────────────────────────────────── */
    let _dash = null;             // { periodos, dashboard, por_departamento, contagens }
    let _colabs = null;           // { periodos, colaboradores }
    let _mainTab = 'dashboard';   // 'dashboard' (padrão ao abrir) | 'avaliacoes'
    let _filterDeptDash = 'all';  // filtro de departamento no Dashboard
    let _filterDeptAval = 'all';  // filtro de departamento na aba Avaliações
    let _filterStatusAval = 'all';// 'all' | 'respondido' | 'pendente'
    let _selectedPeriodKey = null;// 'YYYY-TX' para os cards de resumo e relatório IA
    let _searchText = '';
    let _sortCol = null;
    let _sortDir = 1;

    /* ── MAIN INIT ───────────────────────────────────────────── */
    window.initSatisfacaoRH = async function (preserveTab = false) {
        const container = document.getElementById('satisfacao-rh-container');
        if (!container) return;
        if (!preserveTab) {
            _mainTab = 'dashboard'; // Sempre abrir na aba Dashboard por padrão ao entrar na tela
        }
        container.innerHTML = '<div style="display:flex;align-items:center;gap:1rem;padding:2rem;color:#94a3b8;"><div class="spinner-sm"></div> Carregando dados de satisfação…</div>';

        try {
            const [dash, colabs] = await Promise.all([
                fetchJSON('/avaliacoes/satisfacao/dashboard'),
                fetchJSON('/avaliacoes/satisfacao/colaboradores'),
            ]);
            _dash = dash;
            _colabs = colabs;

            // Definir período padrão inteligente: se o último período ainda tiver 0 respostas,
            // mas um período anterior tiver respostas (ex: Agosto), selecionar por padrão nos cards/IA o último período com respostas,
            // ou o último período se nenhum tiver respostas.
            const periodos = _dash.periodos || [];
            if (periodos.length > 0 && (!_selectedPeriodKey || !periodos.some(p => `${p.ano}-T${p.trimestre}` === _selectedPeriodKey))) {
                const allColabs = _colabs.colaboradores || [];
                let chosen = periodos[periodos.length - 1];
                for (let i = periodos.length - 1; i >= 0; i--) {
                    const k = `${periodos[i].ano}-T${periodos[i].trimestre}`;
                    const hasResp = allColabs.some(c => c.pesquisas && c.pesquisas[k] && c.pesquisas[k].respondido);
                    if (hasResp) {
                        chosen = periodos[i];
                        break;
                    }
                }
                _selectedPeriodKey = `${chosen.ano}-T${chosen.trimestre}`;
            }
        } catch (e) {
            container.innerHTML = `<div style="padding:2rem;color:#ef4444;">Erro ao carregar: ${escHtml(e.message)}</div>`;
            return;
        }

        render(container);
    };

    /* ── HELPERS DE DEPARTAMENTO ─────────────────────────────── */
    function getAllDepartamentos() {
        const set = new Set();
        (_colabs?.colaboradores || []).forEach(c => set.add(normDepto(c.departamento)));
        (_dash?.por_departamento || []).forEach(d => set.add(normDepto(d.departamento)));
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }

    function getGestorDepto(depto) {
        const colabs = (_colabs?.colaboradores || []).filter(c => normDepto(c.departamento).toLowerCase() === normDepto(depto).toLowerCase());
        const comResp = colabs.find(c => c.responsavel_nome && String(c.responsavel_nome).trim());
        return comResp ? String(comResp.responsavel_nome).trim() : null;
    }

    // Constrói mapa { departamento: [ { topico, '2026-T3': 4.7, ... } ] }
    function buildDeptoTopicsMap() {
        const periodos = _dash?.periodos || [];
        const map = {};

        // 1. Se o backend já enviou por_departamento, usar como base
        if (Array.isArray(_dash?.por_departamento) && _dash.por_departamento.length > 0) {
            _dash.por_departamento.forEach(item => {
                const dep = normDepto(item.departamento);
                if (!item.topico || item.topico.startsWith('_')) return;
                if (!map[dep]) map[dep] = [];
                map[dep].push(item);
            });
            return map;
        }

        // 2. Fallback: calcular diretamente a partir de _colabs.colaboradores
        const acc = {}; // { dep: { topico: { key: [vals] } } }
        (_colabs?.colaboradores || []).forEach(c => {
            const dep = normDepto(c.departamento);
            periodos.forEach(p => {
                const key = `${p.ano}-T${p.trimestre}`;
                const ps = c.pesquisas?.[key];
                if (!ps || !ps.respondido || !ps.respostas) return;
                let resp = ps.respostas;
                if (typeof resp === 'string') {
                    try { resp = JSON.parse(resp); } catch (e) { resp = {}; }
                }
                if (!resp || typeof resp !== 'object') return;

                if (resp.scores && typeof resp.scores === 'object') {
                    Object.entries(resp.scores).forEach(([topico, avg]) => {
                        const n = parseFloat(avg);
                        if (!isNaN(n)) {
                            if (!acc[dep]) acc[dep] = {};
                            if (!acc[dep][topico]) acc[dep][topico] = {};
                            if (!acc[dep][topico][key]) acc[dep][topico][key] = [];
                            acc[dep][topico][key].push(n);
                        }
                    });
                    return;
                }

                Object.entries(resp).forEach(([topico, notas]) => {
                    if (!topico || topico.startsWith('_') || topico === 'scores' || topico === 'topicos' || topico === 'info_adicional') return;
                    let nums = [];
                    if (Array.isArray(notas)) {
                        nums = notas.map(n => parseFloat(n)).filter(n => !isNaN(n));
                    } else if (typeof notas === 'object' && notas !== null) {
                        nums = Object.values(notas).map(n => parseFloat(n)).filter(n => !isNaN(n));
                    } else {
                        const n = parseFloat(notas);
                        if (!isNaN(n)) nums = [n];
                    }
                    if (nums.length > 0) {
                        const m = nums.reduce((a, b) => a + b, 0) / nums.length;
                        if (!acc[dep]) acc[dep] = {};
                        if (!acc[dep][topico]) acc[dep][topico] = {};
                        if (!acc[dep][topico][key]) acc[dep][topico][key] = [];
                        acc[dep][topico][key].push(m);
                    }
                });
            });
        });

        Object.entries(acc).forEach(([dep, topicosObj]) => {
            map[dep] = [];
            Object.entries(topicosObj).forEach(([topico, perMap]) => {
                const entry = { departamento: dep, topico };
                periodos.forEach(p => {
                    const key = `${p.ano}-T${p.trimestre}`;
                    const arr = perMap[key] || [];
                    entry[key] = arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;
                });
                map[dep].push(entry);
            });
        });

        return map;
    }

    /* ── RENDER PRINCIPAL ────────────────────────────────────── */
    function render(container) {
        container.innerHTML = `
        <style>
        #sat-root { font-family:'Inter',sans-serif; padding:1.5rem 2rem 3rem; color:#1e293b; }
        #sat-root h1 { font-size:1.6rem;font-weight:700;margin:0 0 0.25rem; display:flex; align-items:center; gap:.45rem; }
        #sat-root .sub { color:#64748b;font-size:.9rem;margin:0 0 1.25rem; }

        /* Abas principais (Dashboard | Avaliações) */
        .sat-main-tabs { display:flex; gap:.5rem; border-bottom:2px solid #e2e8f0; margin-bottom:1.5rem; }
        .sat-main-tab {
            padding:.7rem 1.35rem; font-size:.92rem; font-weight:700; cursor:pointer;
            border:none; background:transparent; color:#64748b; border-bottom:3px solid transparent;
            margin-bottom:-2px; display:inline-flex; align-items:center; gap:.5rem; transition:all .15s;
        }
        .sat-main-tab:hover { color:#7c3aed; background:rgba(124,58,237,.04); border-radius:8px 8px 0 0; }
        .sat-main-tab.active { color:#7c3aed; border-bottom-color:#7c3aed; background:rgba(124,58,237,.06); border-radius:8px 8px 0 0; }

        /* Barra de filtros superior */
        .sat-filter-bar {
            display:flex; gap:.85rem; align-items:center; justify-content:space-between; flex-wrap:wrap;
            background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:.85rem 1.1rem;
            margin-bottom:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,.04);
        }
        .sat-filter-group { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; }
        .sat-filter-label { font-size:.78rem; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.04em; display:flex; align-items:center; gap:.35rem; }
        .sat-select {
            padding:.48rem .85rem; border-radius:8px; border:1.5px solid #cbd5e1; background:#f8fafc;
            font-size:.84rem; font-weight:600; color:#1e293b; outline:none; cursor:pointer; min-width:210px;
        }
        .sat-select:focus { border-color:#7c3aed; background:#fff; }

        /* overview cards */
        .sat-cards { display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem; }
        .sat-card { background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1.1rem 1.4rem;min-width:180px;flex:1; box-shadow:0 1px 3px rgba(0,0,0,.06); }
        .sat-card .sc-label { font-size:.73rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:.35rem; }
        .sat-card .sc-val { font-size:2rem;font-weight:800;line-height:1; }
        .sat-card .sc-sub { font-size:.78rem;color:#94a3b8;margin-top:.35rem; }

        /* Department header card & table */
        .sat-dept-block {
            background:#fff; border:1px solid #e2e8f0; border-radius:14px;
            box-shadow:0 1px 4px rgba(0,0,0,.05); margin-bottom:1.5rem; overflow:hidden;
        }
        .sat-dept-header {
            display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.75rem;
            padding:1rem 1.25rem; background:#f8fafc; border-bottom:1px solid #e2e8f0;
        }
        .sat-dept-title { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; font-size:1.02rem; font-weight:700; color:#1e293b; }
        .sat-dept-actions { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; }
        .btn-ia-report {
            display:inline-flex; align-items:center; gap:.45rem; padding:.5rem .95rem;
            border-radius:8px; border:none; background:linear-gradient(135deg,#7c3aed,#6d28d9);
            color:#fff; font-size:.8rem; font-weight:700; cursor:pointer;
            box-shadow:0 2px 6px rgba(124,58,237,.25); transition:all .15s;
        }
        .btn-ia-report:hover { transform:translateY(-1px); box-shadow:0 4px 10px rgba(124,58,237,.35); }

        .sat-table-wrap { overflow-x:auto; background:#fff; }
        .sat-table { width:100%;border-collapse:collapse;min-width:520px; }
        .sat-table th { background:#f8fafc;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;padding:.65rem 1rem;border-bottom:1px solid #e2e8f0;white-space:nowrap;user-select:none; }
        .sat-table td { padding:.65rem 1rem;font-size:.83rem;border-bottom:1px solid #f1f5f9;vertical-align:middle; }
        .sat-table tr:last-child td { border-bottom:none; }
        .sat-table tr:hover td { background:#f8fafc; }
        .score-pill { display:inline-flex;align-items:center;justify-content:center;min-width:46px;padding:.2rem .55rem;border-radius:999px;font-size:.8rem;font-weight:700; }

        /* Status pills for Avaliações tab (sem notas!) */
        .status-pill-ok { display:inline-flex;align-items:center;gap:.3rem;background:#dcfce7;color:#15803d;border:1px solid #86efac;padding:.22rem .65rem;border-radius:999px;font-size:.76rem;font-weight:700; }
        .status-pill-pend { display:inline-flex;align-items:center;gap:.3rem;background:#fef9c3;color:#92400e;border:1px solid #fde047;padding:.22rem .65rem;border-radius:999px;font-size:.76rem;font-weight:700; }
        .status-pill-afastado { display:inline-flex;align-items:center;gap:.3rem;background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;padding:.22rem .65rem;border-radius:999px;font-size:.76rem;font-weight:700; }
        .status-pill-na { display:inline-flex;align-items:center;gap:.25rem;background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;padding:.2rem .6rem;border-radius:999px;font-size:.74rem;font-weight:700; }
        .sat-status-arrow-btn {
            width:22px;height:22px;border-radius:999px;border:1px solid transparent;background:transparent;
            color:#64748b;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;
            padding:0;font-size:.78rem;transition:all .15s;flex-shrink:0;
        }
        .sat-status-arrow-btn:hover, .sat-status-arrow-btn.open {
            background:#f1f5f9;border-color:#cbd5e1;color:#1e293b;
        }
        .sat-status-dropdown-menu {
            position:fixed;z-index:12000;background:#fff;border:1px solid #cbd5e1;border-radius:10px;
            box-shadow:0 10px 25px rgba(15,23,42,.16);padding:5px;min-width:136px;display:flex;flex-direction:column;gap:2px;
            font-family:'Inter',sans-serif;
        }
        .sat-status-dropdown-item {
            display:flex;align-items:center;gap:8px;width:100%;padding:6px 10px;border:none;border-radius:7px;
            background:transparent;color:#334155;font-size:.78rem;font-weight:600;cursor:pointer;text-align:left;
        }
        .sat-status-dropdown-item:hover { background:#f8fafc; }
        .sat-status-dropdown-item.active { background:#f5f3ff;color:#6d28d9;font-weight:700; }

        /* colabs table */
        .sat-search-bar { display:flex;gap:.75rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap; background:#fff; padding:.85rem 1rem; border-radius:12px; border:1px solid #e2e8f0; }
        .sat-search-input { padding:.5rem .9rem;border-radius:8px;border:1.5px solid #cbd5e1;font-size:.84rem;flex:1;min-width:200px;outline:none;transition:border-color .15s; }
        .sat-search-input:focus { border-color:#7c3aed; }
        .sat-badge { display:inline-flex;align-items:center;gap:.35rem;background:#ede9fe;color:#7c3aed;border-radius:8px;padding:.25rem .7rem;font-size:.75rem;font-weight:600; }
        .sat-badge-gestor { display:inline-flex;align-items:center;gap:.35rem;background:#e0f2fe;color:#0369a1;border-radius:8px;padding:.25rem .7rem;font-size:.75rem;font-weight:600; }
        .sat-avatar-cell { display:flex;align-items:center;gap:.65rem; }

        /* legend */
        .sat-legend { display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1rem; }
        .sat-legend-item { display:flex;align-items:center;gap:.4rem;font-size:.75rem;color:#64748b; }
        .sat-legend-dot { width:10px;height:10px;border-radius:50%; }

        /* no-data */
        .no-data-box { text-align:center;padding:3rem 1rem;color:#94a3b8; background:#fff; border-radius:12px; border:1px solid #e2e8f0; }
        .no-data-box i { font-size:3rem;display:block;margin-bottom:.75rem;color:#cbd5e1; }

        /* spinner */
        .spinner-sm { width:20px;height:20px;border:3px solid #e2e8f0;border-top-color:#7c3aed;border-radius:50%;animation:spin .7s linear infinite; display:inline-block; }
        @keyframes spin { to { transform:rotate(360deg); } }
        </style>

        <div id="sat-root">
            <h1><i class="ph ph-smiley" style="color:#7c3aed;"></i>Satisfação dos Colaboradores</h1>
            <p class="sub">Acompanhe os indicadores de satisfação por departamento, gere relatórios com IA para os gestores e gerencie o preenchimento das avaliações</p>

            <!-- Abas Principais: Dashboard (padrão) e Avaliações -->
            <div class="sat-main-tabs">
                <button class="sat-main-tab ${_mainTab === 'dashboard' ? 'active' : ''}" onclick="window._satSwitchMainTab('dashboard')">
                    <i class="ph ph-chart-bar"></i> Dashboard por Departamento
                </button>
                <button class="sat-main-tab ${_mainTab === 'avaliacoes' ? 'active' : ''}" onclick="window._satSwitchMainTab('avaliacoes')">
                    <i class="ph ph-clipboard-text"></i> Avaliações
                </button>
            </div>

            <div id="sat-tab-content"></div>
        </div>
        `;

        renderActiveTabContent();
    }

    window._satSwitchMainTab = function (tab) {
        _mainTab = tab === 'avaliacoes' ? 'avaliacoes' : 'dashboard';
        document.querySelectorAll('.sat-main-tab').forEach(btn => {
            const isDash = btn.textContent.includes('Dashboard');
            btn.classList.toggle('active', (_mainTab === 'dashboard' && isDash) || (_mainTab === 'avaliacoes' && !isDash));
        });
        renderActiveTabContent();
    };

    function renderActiveTabContent() {
        const area = document.getElementById('sat-tab-content');
        if (!area) return;
        if (_mainTab === 'dashboard') {
            area.innerHTML = renderDashboardTab();
        } else {
            area.innerHTML = renderAvaliacoesTab();
        }
    }

    /* ══════════════════════════════════════════════════════════════
       ABA 1: DASHBOARD POR DEPARTAMENTO
       ══════════════════════════════════════════════════════════════ */
    function renderDashboardTab() {
        const periodos = _dash?.periodos || [];
        if (periodos.length === 0) {
            return `<div class="no-data-box">
                <i class="ph ph-chart-bar"></i>
                <h3 style="color:#334155;margin:0 0 .5rem;">Nenhuma pesquisa de satisfação encontrada</h3>
                <p style="margin:0;">Assim que os colaboradores responderem o formulário na aba <strong>Avaliações</strong>, os dados aparecerão aqui.</p>
            </div>`;
        }

        const deptos = getAllDepartamentos();
        const activePeriodObj = periodos.find(p => `${p.ano}-T${p.trimestre}` === _selectedPeriodKey) || periodos[periodos.length - 1];
        const activeKey = activePeriodObj ? `${activePeriodObj.ano}-T${activePeriodObj.trimestre}` : null;

        return `
            <!-- Filtro por Departamento e Período de Referência -->
            <div class="sat-filter-bar">
                <div class="sat-filter-group">
                    <span class="sat-filter-label"><i class="ph ph-buildings" style="color:#7c3aed;font-size:1rem;"></i> Departamento:</span>
                    <select class="sat-select" id="sat-dash-dept-select" onchange="window._satSetDashDept(this.value)">
                        <option value="all" ${_filterDeptDash === 'all' ? 'selected' : ''}>Todos os departamentos (${deptos.length})</option>
                        ${deptos.map(d => `<option value="${escHtml(d)}" ${_filterDeptDash === d ? 'selected' : ''}>${escHtml(d)}</option>`).join('')}
                    </select>
                </div>
                <div class="sat-filter-group">
                    <span class="sat-filter-label"><i class="ph ph-calendar-blank" style="color:#7c3aed;font-size:1rem;"></i> Período de Referência (Cards & IA):</span>
                    <select class="sat-select" id="sat-dash-period-select" onchange="window._satSetDashPeriod(this.value)">
                        ${periodos.slice().reverse().map(p => {
                            const k = `${p.ano}-T${p.trimestre}`;
                            return `<option value="${k}" ${k === activeKey ? 'selected' : ''}>${periodLabel(p)}</option>`;
                        }).join('')}
                    </select>
                </div>
            </div>

            ${renderOverviewCards(activePeriodObj)}

            <div class="sat-legend">
                <div class="sat-legend-item"><div class="sat-legend-dot" style="background:#16a34a;"></div>Bom / Ponto Forte (≥ 4,5)</div>
                <div class="sat-legend-item"><div class="sat-legend-dot" style="background:#eab308;"></div>Ponto de Atenção (&lt; 4,5)</div>
                <div class="sat-legend-item"><div class="sat-legend-dot" style="background:#f97316;"></div>Atenção Redobrada (&lt; 4,0)</div>
                <div class="sat-legend-item"><div class="sat-legend-dot" style="background:#ef4444;"></div>Crítico (&lt; 3,0)</div>
                <div class="sat-legend-item"><div class="sat-legend-dot" style="background:#e2e8f0;"></div>Sem dados no período</div>
            </div>

            <div id="sat-dashboard-deptos-area">
                ${renderDepartamentosBlocks(activePeriodObj)}
            </div>
        `;
    }

    window._satSetDashDept = function (dept) {
        _filterDeptDash = dept || 'all';
        renderActiveTabContent();
    };

    window._satSetDashPeriod = function (periodKey) {
        _selectedPeriodKey = periodKey;
        renderActiveTabContent();
    };

    function renderOverviewCards(periodoRef) {
        const periodos = _dash?.periodos || [];
        const allColabs = _colabs?.colaboradores || [];
        const colabs = _filterDeptDash === 'all'
            ? allColabs
            : allColabs.filter(c => normDepto(c.departamento) === _filterDeptDash);

        const periodoKey = periodoRef ? `${periodoRef.ano}-T${periodoRef.trimestre}` : null;
        const elegiveis = colabs.filter(c => {
            if (!periodoKey) return true;
            const st = getStatusEspecial(c.pesquisas?.[periodoKey]);
            return st !== 'na' && st !== 'afastado';
        });
        const responderam = elegiveis.filter(c => periodoKey && c.pesquisas?.[periodoKey]?.respondido).length;
        const total = elegiveis.length;
        const faltam = colabs.filter(c => periodoKey && getStatusEspecial(c.pesquisas?.[periodoKey]) === 'pendente').length;
        const pct = total > 0 ? ((responderam / total) * 100).toFixed(1).replace('.0', '') : 0;

        // Média geral do período selecionado (filtrada por departamento se selecionado)
        const deptoMap = buildDeptoTopicsMap();
        let mediasPeriodo = [];
        Object.entries(deptoMap).forEach(([dep, topicos]) => {
            if (_filterDeptDash !== 'all' && dep !== _filterDeptDash) return;
            topicos.forEach(t => {
                const v = periodoKey ? t[periodoKey] : null;
                if (v !== null && v !== undefined && !isNaN(v)) mediasPeriodo.push(Number(v));
            });
        });
        const mediaGeralNum = mediasPeriodo.length > 0
            ? (mediasPeriodo.reduce((a, b) => a + b, 0) / mediasPeriodo.length)
            : null;
        const mediaGeralStr = mediaGeralNum !== null ? mediaGeralNum.toFixed(1) : '—';

        // Comparação com período imediatamente anterior
        let trendHTML = `<span style="color:#94a3b8;">${_filterDeptDash === 'all' ? 'Consolidado de todos os setores' : escHtml(_filterDeptDash)}</span>`;
        const idxRef = periodos.findIndex(p => `${p.ano}-T${p.trimestre}` === periodoKey);
        if (idxRef > 0) {
            const pAnt = periodos[idxRef - 1];
            const kAnt = `${pAnt.ano}-T${pAnt.trimestre}`;
            let valsAnt = [];
            Object.entries(deptoMap).forEach(([dep, topicos]) => {
                if (_filterDeptDash !== 'all' && dep !== _filterDeptDash) return;
                topicos.forEach(t => {
                    const v = t[kAnt];
                    if (v !== null && v !== undefined && !isNaN(v)) valsAnt.push(Number(v));
                });
            });
            if (valsAnt.length > 0 && mediaGeralNum !== null) {
                const mAnt = valsAnt.reduce((a, b) => a + b, 0) / valsAnt.length;
                const diff = mediaGeralNum - mAnt;
                trendHTML = diff >= 0.1
                    ? `<span style="color:#22c55e;font-weight:700;">▲ +${diff.toFixed(1)} vs ${periodLabel(pAnt)}</span>`
                    : diff <= -0.1
                        ? `<span style="color:#ef4444;font-weight:700;">▼ ${diff.toFixed(1)} vs ${periodLabel(pAnt)}</span>`
                        : `<span style="color:#94a3b8;">→ estável vs ${periodLabel(pAnt)}</span>`;
            }
        }

        const mc = scoreColor(mediaGeralNum);
        return `<div class="sat-cards">
            <div class="sat-card">
                <div class="sc-label">Responderam (${periodoRef ? periodLabel(periodoRef) : ''})</div>
                <div class="sc-val" style="color:#7c3aed;">${responderam}<span style="font-size:1rem;font-weight:400;color:#94a3b8;">/${total}</span></div>
                <div class="sc-sub">${pct}% de adesão ${_filterDeptDash !== 'all' ? `em ${escHtml(_filterDeptDash)}` : ''}</div>
            </div>
            <div class="sat-card">
                <div class="sc-label">Faltam responder</div>
                <div class="sc-val" style="color:#f59e0b;">${faltam}</div>
                <div class="sc-sub">${periodoRef ? periodLabel(periodoRef) : ''}</div>
            </div>
            <div class="sat-card">
                <div class="sc-label">Pontuação Média (${_filterDeptDash === 'all' ? 'Geral' : escHtml(_filterDeptDash)})</div>
                <div class="sc-val" style="color:${mc};">${mediaGeralStr}</div>
                <div class="sc-sub">${trendHTML}</div>
            </div>
        </div>`;
    }

    function renderDepartamentosBlocks(periodoRef) {
        const periodos = _dash?.periodos || [];
        const deptoMap = buildDeptoTopicsMap();
        const todosDeptos = getAllDepartamentos();
        const deptosParaExibir = _filterDeptDash === 'all'
            ? todosDeptos
            : todosDeptos.filter(d => d === _filterDeptDash);

        if (deptosParaExibir.length === 0) {
            return `<div class="no-data-box"><i class="ph ph-buildings"></i><p>Nenhum departamento encontrado para o filtro selecionado.</p></div>`;
        }

        const refKey = periodoRef ? `${periodoRef.ano}-T${periodoRef.trimestre}` : (periodos.length ? `${periodos[periodos.length - 1].ano}-T${periodos[periodos.length - 1].trimestre}` : null);
        let html = '';

        deptosParaExibir.forEach(depto => {
            const topicos = (deptoMap[depto] || []).filter(t => {
                if (!t.topico || t.topico.startsWith('_')) return false;
                return periodos.some(p => t[`${p.ano}-T${p.trimestre}`] !== null && t[`${p.ano}-T${p.trimestre}`] !== undefined);
            });

            const colabsDepto = (_colabs?.colaboradores || []).filter(c => normDepto(c.departamento) === depto);
            const elegiveisRef = colabsDepto.filter(c => {
                if (!refKey) return true;
                const st = getStatusEspecial(c.pesquisas?.[refKey]);
                return st !== 'na' && st !== 'afastado';
            });
            const respRef = elegiveisRef.filter(c => refKey && c.pesquisas?.[refKey]?.respondido).length;
            const gestorNome = getGestorDepto(depto);

            // Médias do departamento por período
            const deptAvgs = periodos.map(p => {
                const key = `${p.ano}-T${p.trimestre}`;
                const vals = topicos.map(t => t[key]).filter(v => v !== null && v !== undefined && !isNaN(v));
                return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null;
            });

            const idxRef = periodos.findIndex(p => `${p.ano}-T${p.trimestre}` === refKey);
            const mediaRefDepto = idxRef >= 0 ? deptAvgs[idxRef] : null;

            html += `
            <div class="sat-dept-block">
                <div class="sat-dept-header">
                    <div class="sat-dept-title">
                        <i class="ph ph-buildings" style="color:#7c3aed;font-size:1.2rem;"></i>
                        <span>${escHtml(depto)}</span>
                        <span class="sat-badge" title="Colaboradores que responderam em ${periodoRef ? periodLabel(periodoRef) : ''}">
                            <i class="ph ph-users"></i> ${respRef}/${elegiveisRef.length} respondentes
                        </span>
                        ${gestorNome ? `<span class="sat-badge-gestor" title="Gestor responsável pelo departamento"><i class="ph ph-user-Check"></i> Gestor: ${escHtml(gestorNome)}</span>` : ''}
                        ${mediaRefDepto !== null ? `<span class="score-pill" style="background:${scoreBg(mediaRefDepto)};color:${scoreColor(mediaRefDepto)};font-size:.82rem;">Média: ${fmtScore(mediaRefDepto)}</span>` : ''}
                    </div>
                    <div class="sat-dept-actions">
                        <button type="button" class="btn-ia-report" data-depto="${escHtml(depto)}" onclick="window._satOpenRelatorioIAModal(this.dataset.depto)">
                            <i class="ph ph-sparkle"></i> Relatório IA & Enviar ao Gestor
                        </button>
                    </div>
                </div>`;

            if (topicos.length === 0) {
                html += `
                <div style="padding:1.4rem 1.25rem;color:#94a3b8;font-size:.85rem;display:flex;align-items:center;gap:.5rem;">
                    <i class="ph ph-info" style="font-size:1.1rem;"></i>
                    Ainda não há respostas tabuladas para <strong>${escHtml(depto)}</strong> nos períodos exibidos.
                </div>`;
            } else {
                html += `
                <div class="sat-table-wrap">
                    <table class="sat-table">
                        <thead>
                            <tr>
                                <th>Tópico Avaliado</th>
                                ${periodos.map((p, i) => `<th style="text-align:center;">${periodLabel(p)}${i > 0 ? ' <span style="font-size:.7em;opacity:.55;">tendência</span>' : ''}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${topicos.map(t => {
                                const vals = periodos.map(p => t[`${p.ano}-T${p.trimestre}`] ?? null);
                                return `<tr>
                                    <td style="font-weight:600;color:#334155;">${escHtml(t.topico)}</td>
                                    ${vals.map((v, i) => `
                                        <td style="text-align:center;">
                                            <div style="display:flex;align-items:center;justify-content:center;gap:.45rem;">
                                                <span class="score-pill" style="background:${scoreBg(v)};color:${scoreColor(v)};">${fmtScore(v)}</span>
                                                ${trendIcon(vals, i)}
                                            </div>
                                        </td>
                                    `).join('')}
                                </tr>`;
                            }).join('')}
                            <tr style="background:#f8fafc;font-weight:700;">
                                <td style="color:#7c3aed;">Média do Departamento (${escHtml(depto)})</td>
                                ${deptAvgs.map((v, i) => `
                                    <td style="text-align:center;">
                                        <div style="display:flex;align-items:center;justify-content:center;gap:.45rem;">
                                            <span class="score-pill" style="background:${scoreBg(v)};color:${scoreColor(v)};font-weight:800;">${fmtScore(v)}</span>
                                            ${trendIcon(deptAvgs, i)}
                                        </div>
                                    </td>
                                `).join('')}
                            </tr>
                        </tbody>
                    </table>
                </div>`;
            }

            html += `</div>`;
        });

        return html;
    }

    /* ══════════════════════════════════════════════════════════════
       MODAL: RELATÓRIO IA POR DEPARTAMENTO & ENVIO AO GESTOR
       ══════════════════════════════════════════════════════════════ */
    let _iaModalState = {
        departamento: '',
        ano: null,
        trimestre: null
    };

    window._satOpenRelatorioIAModal = async function (departamento, anoParam = null, trimParam = null) {
        const periodos = _dash?.periodos || [];
        if (periodos.length === 0) {
            alert('Nenhum período de pesquisa disponível.');
            return;
        }

        // Determinar ano/trimestre inicial (usa o selecionado no Dashboard, ou o último com respostas desse departamento)
        let ano = anoParam;
        let trim = trimParam;
        if (!ano || !trim) {
            if (_selectedPeriodKey) {
                const [y, t] = _selectedPeriodKey.split('-T');
                ano = parseInt(y, 10);
                trim = parseInt(t, 10);
            } else {
                const ult = periodos[periodos.length - 1];
                ano = ult.ano;
                trim = ult.trimestre;
            }
        }

        _iaModalState = { departamento, ano, trimestre: trim };

        const existing = document.getElementById('sat-ia-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'sat-ia-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(3px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;';
        overlay.innerHTML = `
            <div style="background:#fff;border-radius:16px;width:100%;max-width:860px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 45px rgba(0,0,0,0.25);overflow:hidden;">
                <!-- Cabeçalho -->
                <div style="padding:1.25rem 1.75rem;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:1rem;">
                    <div>
                        <h2 style="margin:0;font-size:1.2rem;display:flex;align-items:center;gap:.5rem;color:#fff;">
                            <i class="ph ph-sparkle"></i> Relatório IA por Departamento — <span id="sat-ia-title-dept">${escHtml(departamento)}</span>
                        </h2>
                        <div style="font-size:.82rem;color:#ede9fe;margin-top:.25rem;">
                            Análise consolidada de pontos fortes, pontos fracos e pontos de atenção (100% anônima, sem citar nomes de colaboradores)
                        </div>
                    </div>
                    <button type="button" onclick="document.getElementById('sat-ia-modal-overlay')?.remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:34px;height:34px;border-radius:8px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">
                        <i class="ph ph-x"></i>
                    </button>
                </div>

                <!-- Corpo -->
                <div style="padding:1.5rem 1.75rem;overflow-y:auto;flex:1;background:#f8fafc;" id="sat-ia-modal-body">
                    <div style="display:flex;align-items:center;gap:.75rem;color:#64748b;padding:2rem;justify-content:center;">
                        <div class="spinner-sm"></div> Carregando dados do departamento…
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        await carregarDadosModalIA();
    };

    async function carregarDadosModalIA() {
        const bodyEl = document.getElementById('sat-ia-modal-body');
        if (!bodyEl) return;
        const { departamento, ano, trimestre } = _iaModalState;
        const periodos = _dash?.periodos || [];

        try {
            const data = await fetchJSON(`/avaliacoes/satisfacao/relatorio-ia?departamento=${encodeURIComponent(departamento)}&ano=${ano}&trimestre=${trimestre}`);
            const est = data.estatisticas || { total_colaboradores: 0, responderam: 0, media_geral: null, topicos: [], observacoes: [] };
            const gestor = data.gestor || {};
            const relSalvo = data.relatorio || null;

            bodyEl.innerHTML = `
                <!-- Barra de Período e Resumo Rápido -->
                <div style="display:flex;gap:1rem;align-items:center;justify-content:space-between;flex-wrap:wrap;background:#fff;padding:1rem 1.25rem;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:1.1rem;">
                    <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;">
                        <label style="font-size:.8rem;font-weight:700;color:#475569;text-transform:uppercase;">Período da Pesquisa:</label>
                        <select class="sat-select" onchange="window._satChangePeriodModalIA(this.value)">
                            ${periodos.slice().reverse().map(p => {
                                const k = `${p.ano}-T${p.trimestre}`;
                                const sel = (p.ano === Number(ano) && p.trimestre === Number(trimestre)) ? 'selected' : '';
                                return `<option value="${k}" ${sel}>${periodLabel(p)}</option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;">
                        <span class="sat-badge"><i class="ph ph-users"></i> ${est.responderam}/${est.total_colaboradores} responderam</span>
                        <span class="score-pill" style="background:${scoreBg(est.media_geral)};color:${scoreColor(est.media_geral)};font-size:.84rem;">
                            Média do Setor: ${est.media_geral != null ? Number(est.media_geral).toFixed(2) : '—'} / 5.0
                        </span>
                        <span style="font-size:.78rem;color:#64748b;background:#f1f5f9;padding:.25rem .65rem;border-radius:8px;font-weight:600;">
                            <i class="ph ph-chat-centered-text"></i> ${(est.observacoes || []).length} observação(ões) anônima(s)
                        </span>
                    </div>
                </div>

                <!-- Prévia da Tabela Comparativa de Períodos (enviada por e-mail ao gestor) -->
                ${data.tabela_comparativa_html ? `
                <div style="margin-bottom:1.1rem;">
                    <div style="font-size:.78rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.45rem;display:flex;align-items:center;gap:.4rem;">
                        <i class="ph ph-table" style="color:#7c3aed;font-size:1rem;"></i>
                        Quadro Comparativo de Notas (Incluído automaticamente no e-mail ao gestor)
                    </div>
                    ${data.tabela_comparativa_html}
                </div>
                ` : ''}

                <!-- Botão Gerar com IA -->
                <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:.75rem;">
                    <div style="font-size:.85rem;font-weight:700;color:#334155;display:flex;align-items:center;gap:.4rem;">
                        <i class="ph ph-file-text" style="color:#7c3aed;font-size:1.1rem;"></i>
                        Análise Consultiva do Departamento (Sem notas por extenso e sem expor comentários literais)
                    </div>
                    <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
                        <button type="button" id="btn-sat-gerar-ia" onclick="window._satGerarRelatorioIA()"
                            ${est.responderam === 0 ? 'disabled title="Nenhuma resposta registrada neste período"' : ''}
                            style="display:inline-flex;align-items:center;gap:.45rem;padding:.55rem 1.05rem;border-radius:8px;border:none;background:${est.responderam === 0 ? '#cbd5e1' : '#7c3aed'};color:#fff;font-size:.82rem;font-weight:700;cursor:${est.responderam === 0 ? 'not-allowed' : 'pointer'};">
                            <i class="ph ph-magic-wand"></i> ${relSalvo ? 'Regerar Análise com IA' : 'Gerar Análise com IA'}
                        </button>
                        <button type="button" id="btn-sat-salvar-ia" onclick="window._satSalvarRelatorioIA()"
                            style="display:inline-flex;align-items:center;gap:.4rem;padding:.55rem .95rem;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#334155;font-size:.82rem;font-weight:600;cursor:pointer;">
                            <i class="ph ph-floppy-disk"></i> Salvar Texto
                        </button>
                    </div>
                </div>

                ${est.responderam === 0 ? `
                <div style="padding:1rem 1.25rem;background:#fef9c3;border:1px solid #fde047;border-radius:10px;color:#854d0e;font-size:.84rem;margin-bottom:1rem;">
                    <i class="ph ph-warning-circle"></i> Não há respostas registradas para <strong>${escHtml(departamento)}</strong> em <strong>${escHtml(data.periodo_label)}</strong>. Selecione outro período acima (como Agosto) para analisar os dados já respondidos.
                </div>` : ''}

                <textarea id="sat-ia-textarea" rows="13"
                    placeholder="Clique em 'Gerar Análise com IA' acima para que a IA levante automaticamente os Pontos Fortes, Pontos Fracos e Pontos de Atenção deste departamento sem mencionar o nome de nenhum colaborador..."
                    style="width:100%;padding:1rem;border-radius:10px;border:1.5px solid #cbd5e1;font-family:'Inter',sans-serif;font-size:.88rem;line-height:1.6;color:#1e293b;background:#fff;resize:vertical;box-sizing:border-box;outline:none;text-transform:none !important;">${escHtml(relSalvo ? relSalvo.relatorio_texto : '')}</textarea>

                <!-- Seção de Envio para o Gestor do Departamento -->
                <div style="margin-top:1.25rem;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1.1rem 1.25rem;">
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.75rem;">
                        <div style="font-size:.9rem;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:.45rem;">
                            <i class="ph ph-paper-plane-tilt" style="color:#0ea5e9;font-size:1.1rem;"></i>
                            Enviar Avaliação Consolidada para o Gestor do Departamento
                        </div>
                        <span id="sat-ia-envio-badge" style="font-size:.76rem;background:${relSalvo && relSalvo.enviado_gestor_em ? '#dcfce7' : '#f1f5f9'};color:${relSalvo && relSalvo.enviado_gestor_em ? '#15803d' : '#64748b'};padding:.25rem .65rem;border-radius:999px;font-weight:700;${relSalvo && relSalvo.enviado_gestor_em ? '' : 'display:none;'}">
                            ${relSalvo && relSalvo.enviado_gestor_em ? `✓ Último envio: ${escHtml(relSalvo.enviado_para_email || 'gestor')}` : ''}
                        </span>
                    </div>
                    <div style="display:flex;gap:.85rem;align-items:flex-end;flex-wrap:wrap;">
                        <div style="flex:1;min-width:180px;">
                            <label style="display:block;font-size:.75rem;font-weight:600;color:#64748b;margin-bottom:.3rem;">Gestor Responsável (${escHtml(departamento)})</label>
                            <input type="text" readonly value="${escHtml(gestor.gestor_nome || 'Não vinculado em Departamentos')}"
                                style="width:100%;padding:.52rem .75rem;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-size:.84rem;box-sizing:border-box;">
                        </div>
                        <div style="flex:1.4;min-width:240px;">
                            <label style="display:block;font-size:.75rem;font-weight:600;color:#64748b;margin-bottom:.3rem;">E-mail do Gestor Destinatário</label>
                            <input type="email" id="sat-ia-email-gestor"
                                value="${escHtml(gestor.gestor_email || (relSalvo && relSalvo.enviado_para_email) || '')}"
                                placeholder="email.gestor@americarental.com.br"
                                style="width:100%;padding:.52rem .75rem;border-radius:8px;border:1.5px solid #cbd5e1;background:#fff;color:#1e293b;font-size:.84rem;box-sizing:border-box;outline:none;">
                        </div>
                        <button type="button" id="btn-sat-enviar-gestor" onclick="window._satEnviarRelatorioGestor()"
                            style="display:inline-flex;align-items:center;gap:.45rem;padding:.58rem 1.2rem;border-radius:8px;border:none;background:#0ea5e9;color:#fff;font-size:.84rem;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(14,165,233,.25);">
                            <i class="ph ph-paper-plane-right"></i> Enviar Avaliação para o Gestor
                        </button>
                    </div>
                </div>
            `;
        } catch (err) {
            bodyEl.innerHTML = `<div style="padding:1.5rem;color:#ef4444;">Erro ao carregar relatório do departamento: ${escHtml(err.message)}</div>`;
        }
    }

    window._satChangePeriodModalIA = function (periodKey) {
        if (!periodKey) return;
        const [y, t] = periodKey.split('-T');
        _iaModalState.ano = parseInt(y, 10);
        _iaModalState.trimestre = parseInt(t, 10);
        carregarDadosModalIA();
    };

    window._satGerarRelatorioIA = async function () {
        const btn = document.getElementById('btn-sat-gerar-ia');
        const txt = document.getElementById('sat-ia-textarea');
        if (!btn || !txt) return;

        const origHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner-sm" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;"></div> Analisando notas e observações com IA…';

        try {
            const res = await fetchJSON('/avaliacoes/satisfacao/relatorio-ia', {
                method: 'POST',
                body: JSON.stringify({
                    departamento: _iaModalState.departamento,
                    ano: _iaModalState.ano,
                    trimestre: _iaModalState.trimestre
                })
            });
            txt.value = res.relatorio_texto || '';
            const bdg = document.getElementById('sat-ia-envio-badge');
            if (bdg) {
                bdg.style.display = 'inline-flex';
                bdg.style.background = '#fef9c3';
                bdg.style.color = '#854d0e';
                bdg.textContent = 'Texto regerado — clique em "Enviar Avaliação para o Gestor" abaixo para enviar por e-mail';
            }
        } catch (err) {
            alert('Não foi possível gerar o relatório: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = origHTML;
        }
    };

    window._satSalvarRelatorioIA = async function () {
        const txt = document.getElementById('sat-ia-textarea');
        const btn = document.getElementById('btn-sat-salvar-ia');
        if (!txt || !txt.value.trim()) {
            alert('O texto do relatório está vazio. Gere ou escreva o relatório antes de salvar.');
            return;
        }
        const orig = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = 'Salvando…'; }
        try {
            await fetchJSON('/avaliacoes/satisfacao/relatorio-ia', {
                method: 'PUT',
                body: JSON.stringify({
                    departamento: _iaModalState.departamento,
                    ano: _iaModalState.ano,
                    trimestre: _iaModalState.trimestre,
                    relatorio_texto: txt.value.trim()
                })
            });
            if (btn) btn.innerHTML = '<i class="ph ph-check"></i> Salvo!';
            setTimeout(() => { if (btn) { btn.disabled = false; btn.innerHTML = orig; } }, 1500);
        } catch (err) {
            alert('Erro ao salvar: ' + err.message);
            if (btn) { btn.disabled = false; btn.innerHTML = orig; }
        }
    };

    window._satEnviarRelatorioGestor = async function () {
        const txt = document.getElementById('sat-ia-textarea');
        const emailInp = document.getElementById('sat-ia-email-gestor');
        const btn = document.getElementById('btn-sat-enviar-gestor');

        const relatorio_texto = txt ? txt.value.trim() : '';
        const email_destino = emailInp ? emailInp.value.trim() : '';

        if (!relatorio_texto) {
            alert('Por favor, clique em "Gerar Análise com IA" antes de enviar ao gestor.');
            return;
        }
        if (!email_destino || !email_destino.includes('@')) {
            alert('Informe um e-mail válido do gestor do departamento.');
            if (emailInp) emailInp.focus();
            return;
        }

        const orig = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner-sm" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;"></div> Enviando…';
        }

        try {
            const r = await fetchJSON('/avaliacoes/satisfacao/enviar-gestor', {
                method: 'POST',
                body: JSON.stringify({
                    departamento: _iaModalState.departamento,
                    ano: _iaModalState.ano,
                    trimestre: _iaModalState.trimestre,
                    relatorio_texto,
                    email_destino
                })
            });
            if (typeof Swal !== 'undefined') {
                await Swal.fire({
                    icon: 'success',
                    title: 'Relatório enviado por e-mail!',
                    html: `O relatório consolidado do departamento <b>${escHtml(_iaModalState.departamento)}</b> foi enviado para:<br><b>${escHtml(r.enviado_para)}</b>`,
                    confirmButtonColor: '#7c3aed'
                });
            } else {
                alert(`Relatório de Satisfação do departamento "${_iaModalState.departamento}" enviado com sucesso para ${r.enviado_para}!`);
            }
            await carregarDadosModalIA();
        } catch (err) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: 'Falha ao enviar e-mail', text: err.message, confirmButtonColor: '#7c3aed' });
            } else {
                alert('Erro ao enviar relatório ao gestor: ' + err.message);
            }
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        }
    };

    /* ══════════════════════════════════════════════════════════════
       ABA 2: AVALIAÇÕES (TELA LIMPA — SEM NOTAS NUMÉRICAS)
       ══════════════════════════════════════════════════════════════ */
    function renderAvaliacoesTab() {
        const deptos = getAllDepartamentos();
        return `
        <div class="sat-search-bar">
            <div style="display:flex;align-items:center;gap:.5rem;flex:1;min-width:220px;">
                <i class="ph ph-magnifying-glass" style="color:#94a3b8;font-size:1.1rem;"></i>
                <input class="sat-search-input" id="sat-colab-search"
                    value="${escHtml(_searchText)}"
                    placeholder="Buscar colaborador por nome, departamento ou cargo…"
                    oninput="window._satFilterColabs()" />
            </div>

            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
                <span class="sat-filter-label"><i class="ph ph-buildings" style="color:#7c3aed;"></i> Departamento:</span>
                <select class="sat-select" id="sat-aval-dept-select" onchange="window._satFilterColabs()">
                    <option value="all" ${_filterDeptAval === 'all' ? 'selected' : ''}>Todos os departamentos (${deptos.length})</option>
                    ${deptos.map(d => `<option value="${escHtml(d)}" ${_filterDeptAval === d ? 'selected' : ''}>${escHtml(d)}</option>`).join('')}
                </select>
            </div>

            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
                <span class="sat-filter-label"><i class="ph ph-funnel" style="color:#7c3aed;"></i> Status:</span>
                <select class="sat-select" id="sat-aval-status-select" style="min-width:185px;" onchange="window._satFilterColabs()">
                    <option value="all" ${_filterStatusAval === 'all' ? 'selected' : ''}>Todos</option>
                    <option value="pendente" ${_filterStatusAval === 'pendente' ? 'selected' : ''}>Pendentes no período atual</option>
                    <option value="concluido" ${_filterStatusAval === 'concluido' ? 'selected' : ''}>Concluídos (Respondido / Afastado / N/A)</option>
                    <option value="respondido" ${_filterStatusAval === 'respondido' ? 'selected' : ''}>Apenas Respondidos</option>
                    <option value="afastado" ${_filterStatusAval === 'afastado' ? 'selected' : ''}>Apenas Afastados</option>
                    <option value="na" ${_filterStatusAval === 'na' ? 'selected' : ''}>Apenas N/A</option>
                </select>
            </div>
        </div>

        <div class="sat-legend" style="margin-bottom:.75rem;">
            <div class="sat-legend-item"><span class="status-pill-ok" style="padding:.1rem .45rem;font-size:.7rem;">✓ Respondido</span> Pesquisa concluída</div>
            <div class="sat-legend-item"><span class="status-pill-afastado" style="padding:.1rem .45rem;font-size:.7rem;">Afastado</span> Colaborador afastado (considerado concluído)</div>
            <div class="sat-legend-item"><span class="status-pill-na" style="padding:.1rem .45rem;font-size:.7rem;">N/A</span> Não aplicável / Não admitido (considerado concluído)</div>
            <div class="sat-legend-item"><span class="status-pill-pend" style="padding:.1rem .45rem;font-size:.7rem;">Pendente</span> Aguardando preenchimento (use o seletor ao lado para mudar para N/A ou Afastado)</div>
        </div>

        <div class="sat-dept-block" id="sat-colab-table-wrap">
            ${renderColabTable()}
        </div>
        `;
    }

    function renderColabTable() {
        const periodos = _colabs?.periodos || [];
        const colabs = getFilteredColabs();

        if (colabs.length === 0) {
            return '<div class="no-data-box" style="border:none;"><i class="ph ph-users"></i><p>Nenhum colaborador encontrado para os filtros selecionados.</p></div>';
        }

        const lastKey = periodos.length > 0 ? `${periodos[periodos.length - 1].ano}-T${periodos[periodos.length - 1].trimestre}` : null;
        const responderam = colabs.filter(c => lastKey && c.pesquisas?.[lastKey]?.respondido).length;
        const afastados = colabs.filter(c => lastKey && getStatusEspecial(c.pesquisas?.[lastKey]) === 'afastado').length;
        const naCount = colabs.filter(c => lastKey && getStatusEspecial(c.pesquisas?.[lastKey]) === 'na').length;
        const concluidos = responderam + afastados + naCount;
        const pendentes = Math.max(0, colabs.length - concluidos);

        return `
        <div style="padding:.7rem 1rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:.8rem;color:#64748b;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;">
            <div>
                Mostrando <strong>${colabs.length}</strong> colaboradores ${_filterDeptAval !== 'all' ? `do departamento <strong>${escHtml(_filterDeptAval)}</strong>` : ''} —
                <span style="color:#16a34a;font-weight:700;">${concluidos} concluídos</span> (${responderam} respondidos${afastados > 0 ? `, <span style="color:#1d4ed8;">${afastados} afastados</span>` : ''}${naCount > 0 ? `, ${naCount} N/A` : ''}),
                <span style="color:#d97706;font-weight:700;">${pendentes} pendentes</span>
            </div>
            <div style="font-size:.75rem;color:#94a3b8;">
                <i class="ph ph-eye-slash"></i> Notas individuais ocultas nesta tela (consulte a pontuação consolidada na aba <strong>Dashboard</strong>).
            </div>
        </div>
        <div class="sat-table-wrap">
            <table class="sat-table" id="sat-colab-table">
                <thead><tr>
                    <th style="cursor:pointer;" onclick="window._satSortColabs('nome_completo')">Colaborador ${_sortCol === 'nome_completo' ? (_sortDir > 0 ? '▲' : '▼') : ''}</th>
                    <th style="cursor:pointer;" onclick="window._satSortColabs('departamento')">Departamento ${_sortCol === 'departamento' ? (_sortDir > 0 ? '▲' : '▼') : ''}</th>
                    ${periodos.map(p => `<th style="text-align:center;">${periodLabel(p)}</th>`).join('')}
                    <th style="text-align:center;width:120px;">Ações</th>
                </tr></thead>
                <tbody>
                    ${colabs.map(c => renderColabRowClean(c, periodos)).join('')}
                </tbody>
            </table>
        </div>`;
    }

    // Linha de colaborador na aba Avaliações — SEM notas numéricas (apenas status limpo + botão Responder/Editar)
    function renderColabRowClean(c, periodos) {
        const lastKey = periodos.length > 0 ? `${periodos[periodos.length - 1].ano}-T${periodos[periodos.length - 1].trimestre}` : null;
        const lastP = lastKey ? c.pesquisas?.[lastKey] : null;

        return `<tr>
            <td>
                <div class="sat-avatar-cell">
                    ${avatarHTML(c)}
                    <div>
                        <div style="font-weight:600;color:#1e293b;font-size:.85rem;" title="${escHtml(c.nome_completo)}">${escHtml(c.nome_completo)}</div>
                        <div style="color:#94a3b8;font-size:.74rem;">${escHtml(c.cargo || '—')}</div>
                    </div>
                </div>
            </td>
            <td style="color:#475569;font-size:.83rem;font-weight:500;">${escHtml(c.departamento || '—')}</td>
            ${periodos.map(p => {
                const key = `${p.ano}-T${p.trimestre}`;
                const ps = c.pesquisas?.[key];
                if (!ps) return `<td style="text-align:center;color:#94a3b8;">—</td>`;

                if (ps.respondido) {
                    const respB64 = ps.respostas ? btoa(unescape(encodeURIComponent(JSON.stringify(ps.respostas)))) : '';
                    const temDocAssinado = Boolean(ps.pdf_url || ps.selfie_url || ps.sat_doc_id);
                    const safeNomeJs = String(c.nome_completo || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    return `<td style="text-align:center;">
                        <div style="display:inline-flex;align-items:center;justify-content:center;gap:4px;">
                            <button type="button"
                                data-colab-id="${c.id}"
                                data-colab-nome="${escHtml(c.nome_completo || '')}"
                                data-colab-cargo="${escHtml(c.cargo || '')}"
                                data-colab-dept="${escHtml(c.departamento || '')}"
                                data-respostas="${respB64}"
                                data-ano="${p.ano}"
                                data-trim="${p.trimestre}"
                                onclick="window._satOpenFormBtn(this)"
                                title="Respondido em ${periodLabel(p)} — clique para editar"
                                style="background:transparent;border:none;padding:0;cursor:pointer;">
                                <span class="status-pill-ok"><i class="ph ph-check-circle"></i> Respondido</span>
                            </button>
                            ${temDocAssinado ? `<button type="button"
                                onclick="window.verComprovanteSatisfacao({ colabId: ${c.id}, ano: ${p.ano}, trimestre: ${p.trimestre}, nome: '${safeNomeJs}' })"
                                title="Ver Documento Assinado e Foto da Pesquisa"
                                style="background:#0f4c81;color:#fff;border:none;border-radius:6px;width:26px;height:24px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.85rem;">
                                <i class="ph ph-eye"></i>
                            </button>` : ''}
                        </div>
                    </td>`;
                }

                const st = getStatusEspecial(ps);
                let pillHtml = '';
                if (st === 'afastado') {
                    pillHtml = `<span class="status-pill-afastado" title="Colaborador afastado (considerado concluído)"><i class="ph ph-user-focus"></i> Afastado</span>`;
                } else if (st === 'na') {
                    pillHtml = `<span class="status-pill-na" title="Não aplicável neste período (considerado concluído)">N/A</span>`;
                } else {
                    pillHtml = `<button type="button"
                        data-colab-id="${c.id}"
                        data-colab-nome="${escHtml(c.nome_completo || '')}"
                        data-colab-cargo="${escHtml(c.cargo || '')}"
                        data-colab-dept="${escHtml(c.departamento || '')}"
                        data-respostas=""
                        data-ano="${p.ano}"
                        data-trim="${p.trimestre}"
                        onclick="window._satOpenFormBtn(this)"
                        title="Clique para responder ${periodLabel(p)}"
                        style="background:transparent;border:none;padding:0;cursor:pointer;">
                        <span class="status-pill-pend"><i class="ph ph-clock"></i> Pendente</span>
                    </button>`;
                }

                return `<td style="text-align:center;">
                    <div style="display:inline-flex;align-items:center;justify-content:center;gap:2px;">
                        ${pillHtml}
                        <button type="button" class="sat-status-arrow-btn"
                            title="Trocar situação em ${periodLabel(p)}"
                            onclick="window._satToggleStatusDropdown(event, ${c.id}, ${p.ano}, ${p.trimestre}, '${st}')">
                            <i class="ph ph-caret-down"></i>
                        </button>
                    </div>
                </td>`;
            }).join('')}
            <td style="text-align:center;">
                <div style="display:inline-flex;align-items:center;justify-content:center;gap:5px;">
                    <button
                        data-colab-id="${c.id}"
                        data-colab-nome="${escHtml(c.nome_completo || '')}"
                        data-colab-cargo="${escHtml(c.cargo || '')}"
                        data-colab-dept="${escHtml(c.departamento || '')}"
                        data-respostas="${lastP && lastP.respostas ? btoa(unescape(encodeURIComponent(JSON.stringify(lastP.respostas)))) : ''}"
                        data-ano="${periodos.length > 0 ? periodos[periodos.length - 1].ano : ''}"
                        data-trim="${periodos.length > 0 ? periodos[periodos.length - 1].trimestre : ''}"
                        onclick="window._satOpenFormBtn(this)"
                        style="background:${lastP && lastP.respondido ? '#0ea5e9' : '#7c3aed'};color:#fff;border:none;border-radius:6px;padding:0.38rem 0.7rem;font-size:0.76rem;cursor:pointer;font-weight:600;">
                        <i class="ph ph-pencil-simple" style="margin-right:4px;"></i>${lastP && lastP.respondido ? 'Editar' : 'Responder'}
                    </button>
                    ${(lastP && (lastP.pdf_url || lastP.selfie_url || lastP.sat_doc_id) && periodos.length > 0) ? `<button
                        type="button"
                        onclick="window.verComprovanteSatisfacao({ colabId: ${c.id}, ano: ${periodos[periodos.length - 1].ano}, trimestre: ${periodos[periodos.length - 1].trimestre}, nome: '${String(c.nome_completo || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}' })"
                        title="Ver Documento Assinado e Foto da Pesquisa"
                        style="background:#0f4c81;color:#fff;border:none;border-radius:6px;padding:0.38rem 0.55rem;font-size:0.88rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;">
                        <i class="ph ph-eye"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`;
    }

    function grupoFromDeptCargo(dept, cargo) {
        return window.matchTemplateGroup('satisfacao', dept, cargo);
    }

    /* ── FILTER & SORT (ABA AVALIAÇÕES) ─────────────────────── */
    function getFilteredColabs() {
        let colabs = (_colabs?.colaboradores || []).slice();
        const periodos = _colabs?.periodos || [];
        const lastKey = periodos.length > 0 ? `${periodos[periodos.length - 1].ano}-T${periodos[periodos.length - 1].trimestre}` : null;

        if (_filterDeptAval && _filterDeptAval !== 'all') {
            colabs = colabs.filter(c => normDepto(c.departamento) === _filterDeptAval);
        }
        if (lastKey && _filterStatusAval !== 'all') {
            if (_filterStatusAval === 'respondido') {
                colabs = colabs.filter(c => c.pesquisas?.[lastKey]?.respondido);
            } else if (_filterStatusAval === 'concluido') {
                colabs = colabs.filter(c => isConcluidoColab(c.pesquisas?.[lastKey]));
            } else if (_filterStatusAval === 'afastado') {
                colabs = colabs.filter(c => getStatusEspecial(c.pesquisas?.[lastKey]) === 'afastado');
            } else if (_filterStatusAval === 'na') {
                colabs = colabs.filter(c => getStatusEspecial(c.pesquisas?.[lastKey]) === 'na');
            } else if (_filterStatusAval === 'pendente') {
                colabs = colabs.filter(c => getStatusEspecial(c.pesquisas?.[lastKey]) === 'pendente');
            }
        }
        if (_searchText) {
            const q = _searchText.toLowerCase();
            colabs = colabs.filter(c =>
                (c.nome_completo || '').toLowerCase().includes(q) ||
                (c.departamento || '').toLowerCase().includes(q) ||
                (c.cargo || '').toLowerCase().includes(q)
            );
        }
        if (_sortCol) {
            colabs.sort((a, b) => {
                let va = a[_sortCol], vb = b[_sortCol];
                if (typeof va === 'string') va = va.toLowerCase();
                if (typeof vb === 'string') vb = vb.toLowerCase();
                if (va === null || va === undefined) va = '';
                if (vb === null || vb === undefined) vb = '';
                return va < vb ? -_sortDir : va > vb ? _sortDir : 0;
            });
        }
        return colabs;
    }

    window._satFilterColabs = function () {
        _searchText = document.getElementById('sat-colab-search')?.value || '';
        _filterDeptAval = document.getElementById('sat-aval-dept-select')?.value || 'all';
        _filterStatusAval = document.getElementById('sat-aval-status-select')?.value || 'all';
        const wrap = document.getElementById('sat-colab-table-wrap');
        if (wrap) wrap.innerHTML = renderColabTable();
    };

    window._satSortColabs = function (col) {
        if (_sortCol === col) _sortDir *= -1;
        else { _sortCol = col; _sortDir = 1; }
        const wrap = document.getElementById('sat-colab-table-wrap');
        if (wrap) wrap.innerHTML = renderColabTable();
    };

    function _fecharStatusDropdownSat() {
        const old = document.getElementById('sat-floating-status-menu');
        if (old) old.remove();
        document.querySelectorAll('.sat-status-arrow-btn.open').forEach(b => b.classList.remove('open'));
    }

    if (!window._satStatusDropdownDocBound) {
        window._satStatusDropdownDocBound = true;
        document.addEventListener('click', (ev) => {
            if (!ev.target.closest('#sat-floating-status-menu') && !ev.target.closest('.sat-status-arrow-btn')) {
                _fecharStatusDropdownSat();
            }
        });
        window.addEventListener('scroll', _fecharStatusDropdownSat, true);
    }

    window._satToggleStatusDropdown = function (ev, colabId, ano, trimestre, stAtual) {
        ev.preventDefault();
        ev.stopPropagation();
        const btn = ev.currentTarget;
        const jaAberto = btn.classList.contains('open');
        _fecharStatusDropdownSat();
        if (jaAberto) return;

        btn.classList.add('open');
        const rect = btn.getBoundingClientRect();
        const menu = document.createElement('div');
        menu.id = 'sat-floating-status-menu';
        menu.className = 'sat-status-dropdown-menu';

        const opcoes = [
            { val: 'pendente', label: 'Pendente', cor: '#eab308' },
            { val: 'afastado', label: 'Afastado', cor: '#2563eb' },
            { val: 'na', label: 'N/A', cor: '#64748b' }
        ];

        menu.innerHTML = opcoes.map(op => `
            <button type="button" class="sat-status-dropdown-item ${stAtual === op.val ? 'active' : ''}"
                onclick="window._satAlterarStatusColab(${colabId}, ${ano}, ${trimestre}, '${op.val}')">
                <span style="width:8px;height:8px;border-radius:50%;background:${op.cor};flex-shrink:0;"></span>
                <span style="flex:1;">${op.label}</span>
                ${stAtual === op.val ? '<i class="ph ph-check" style="font-size:.8rem;"></i>' : ''}
            </button>
        `).join('');

        document.body.appendChild(menu);
        const mRect = menu.getBoundingClientRect();
        let top = rect.bottom + 4;
        let left = rect.right - mRect.width;
        if (left < 8) left = 8;
        if (top + mRect.height > window.innerHeight - 8) {
            top = Math.max(8, rect.top - mRect.height - 4);
        }
        menu.style.top = top + 'px';
        menu.style.left = left + 'px';
    };

    window._satAlterarStatusColab = async function (colabId, ano, trimestre, novoStatus) {
        _fecharStatusDropdownSat();
        try {
            await fetchJSON('/avaliacoes/satisfacao/status-colaborador', {
                method: 'PUT',
                body: JSON.stringify({
                    colaborador_id: colabId,
                    ano: Number(ano),
                    trimestre: Number(trimestre),
                    status_manual: novoStatus
                })
            });

            // Atualizar localmente imediatamente e recarregar dados
            const key = `${ano}-T${trimestre}`;
            const colab = (_colabs?.colaboradores || []).find(c => Number(c.id) === Number(colabId));
            if (colab && colab.pesquisas && colab.pesquisas[key]) {
                const ps = colab.pesquisas[key];
                ps.status_manual = novoStatus;
                if (novoStatus === 'afastado') {
                    ps.status_especial = 'afastado';
                    ps.concluido_especial = true;
                    ps.nao_admitido = false;
                } else if (novoStatus === 'na') {
                    ps.status_especial = 'na';
                    ps.concluido_especial = true;
                    ps.nao_admitido = true;
                } else {
                    ps.status_especial = 'pendente';
                    ps.concluido_especial = false;
                    ps.nao_admitido = false;
                }
            }

            const wrap = document.getElementById('sat-colab-table-wrap');
            if (wrap) wrap.innerHTML = renderColabTable();
        } catch (err) {
            alert('Erro ao atualizar status do colaborador: ' + err.message);
            if (typeof window.initSatisfacaoRH === 'function') window.initSatisfacaoRH(true);
        }
    };

    /* ── FORMULÁRIO DE PREENCHIMENTO / EDIÇÃO DA AVALIAÇÃO ──── */
    window._satRhRbtnClick = function (el, isReadonly) {
        if (isReadonly) return;
        const grp = el.dataset.group;
        document.querySelectorAll('.sat-rbtn[data-group="' + grp + '"]').forEach(function (b) {
            b.style.background = '#fff';
            b.style.color = b.dataset.color;
            b.style.borderColor = '#cbd5e1';
        });
        el.style.background = el.dataset.bg;
        el.style.color = '#fff';
        el.style.borderColor = el.dataset.color;
        const inp = el.previousElementSibling;
        if (inp) inp.checked = true;

        const notaVal = inp ? parseInt(inp.value, 10) : 5;
        const obsName = String(grp || '').replace(/^av_/, 'av_obs_');
        const obsInp = document.querySelector('#sat-modal-form input[name="' + obsName + '"]');
        if (obsInp) {
            if (notaVal <= 4) {
                obsInp.placeholder = 'Observação obrigatória (nota de 1 a 4) *';
                if (!obsInp.value.trim()) {
                    obsInp.style.borderColor = '#ef4444';
                    obsInp.style.background = '#fef2f2';
                }
            } else {
                obsInp.placeholder = 'Observação (opcional)...';
                obsInp.style.borderColor = '#cbd5e1';
                obsInp.style.background = '#ffffff';
            }
        }
    };

    window._satOpenFormBtn = function (btn, isReadonly = false) {
        const id = parseInt(btn.dataset.colabId, 10);
        const nome = btn.dataset.colabNome;
        const cargo = btn.dataset.colabCargo;
        const dept = btn.dataset.colabDept;
        let saved = {};
        try {
            const raw = btn.dataset.respostas || '';
            if (raw) {
                try { saved = JSON.parse(decodeURIComponent(escape(atob(raw)))); } catch (e) { saved = {}; }
            }
        } catch (e) { saved = {}; }
        const ano = btn.dataset.ano;
        const trim = btn.dataset.trim;
        window._satOpenForm(id, nome, cargo, dept, saved, isReadonly, ano, trim);
    };

    window._satOpenForm = function (colabId, nome, cargo, dept, saved = {}, isReadonly = false, ano = null, trim = null) {
        if (!window.AVALIACAO_QUESTIONS || !window.AVALIACAO_QUESTIONS.satisfacao) {
            alert('Erro: Perguntas de satisfação não carregadas.');
            return;
        }
        if (typeof saved === 'string') {
            try { saved = JSON.parse(saved); } catch (e) { saved = {}; }
        }
        if (!saved || typeof saved !== 'object') saved = {};
        if (saved && saved.scores && typeof saved.scores === 'object') {
            saved = {};
        }
        if (!saved.__obs__ || typeof saved.__obs__ !== 'object') saved.__obs__ = {};

        const grupo = grupoFromDeptCargo(dept, cargo);
        if (!grupo) {
            const overlay = document.createElement('div');
            overlay.id = 'sat-modal-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(3px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
            overlay.innerHTML = `
                <div style="background:#fff;border-radius:14px;max-width:480px;width:100%;padding:2rem;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                    <i class="ph ph-warning-circle" style="font-size:3rem;color:#f59e0b;"></i>
                    <h3 style="margin:1rem 0 0.5rem;color:#1e293b;">Template não cadastrado</h3>
                    <p style="color:#64748b;margin-bottom:1.5rem;">
                        Não há um template de avaliação de satisfação cadastrado para o departamento<br>
                        <strong style="color:#0f4c81;">${escHtml(dept || cargo || 'deste colaborador')}</strong>.
                    </p>
                    <button onclick="document.getElementById('sat-modal-overlay').remove()" style="padding:0.6rem 1.5rem;background:#0f4c81;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Fechar</button>
                </div>`;
            document.body.appendChild(overlay);
            return;
        }

        const perguntasGroup = window.AVALIACAO_QUESTIONS.satisfacao[grupo];
        const templateCats = Object.keys(perguntasGroup || {});
        window._satCurrentColabMeta = { colabId, nome, cargo, dept, ano, trim, saved };

        let html = `<div id="sat-modal-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(3px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;">
            <div style="background:#fff;border-radius:14px;width:100%;max-width:98%;height:90vh;display:flex;flex-direction:column;box-shadow:0 10px 25px rgba(0,0,0,0.2);animation: satModalFadeIn 0.2s ease-out;">
                <div style="padding:1.5rem 2rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#0f4c81;color:#fff;border-radius:14px 14px 0 0;">
                    <div>
                        <h2 style="margin:0;font-size:1.25rem;color:#fff;"><i class="ph ph-smiley" style="color:#cffafe;margin-right:.5rem;"></i>Avaliação de Satisfação</h2>
                        <div style="color:#e0f2fe;font-size:0.85rem;margin-top:0.3rem;"><strong>${escHtml(nome)}</strong> — ${escHtml(cargo || dept)}</div>
                    </div>
                    <button onclick="window._satCloseForm()" style="background:none;border:none;font-size:1.5rem;color:#fff;cursor:pointer;transition:color 0.2s;"><i class="ph ph-x"></i></button>
                </div>
                
                <div style="padding:2rem;overflow-y:auto;flex:1;background:#f8fafc;" id="sat-form-body">
                    <p style="margin-top:0; margin-bottom:1.5rem; color:#0f4c81; font-size:1.05rem; font-weight:700; background:#e0f2fe; padding:12px 16px; border-radius:8px; border-left:5px solid #0ea5e9; box-shadow:0 2px 4px rgba(14,165,233,0.15);">
                        Avalie cada critério (1 Muito ruim - 2 Ruim - 3 Médio - 4 Bom - 5 Muito bom). Para notas de 1 a 4 é obrigatório preencher uma observação (apenas nota 5 é opcional). Ao finalizar 100% das perguntas será solicitada assinatura e selfie.
                    </p>
                    <style>
                        @keyframes satModalFadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                    </style>
                    <form id="sat-modal-form" onsubmit="window._satSubmitForm(event, ${colabId}, '${grupo}', ${ano}, ${trim})">`;

        let catIdx = 0;
        templateCats.forEach(topico => {
            html += `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:1.5rem; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="background:#f1f5f9; padding:0.75rem 1rem; border-bottom:1px solid #e2e8f0;">
                    <span style="font-weight:700; color:#334155;">${catIdx + 1}. ${escHtml(topico)}</span>
                </div>
                <div style="padding:1rem;">
            `;

            const topicoSaved = typeof window.resolveSavedAvaliacaoCategory === 'function'
                ? window.resolveSavedAvaliacaoCategory(saved, topico, catIdx, templateCats)
                : saved[topico];
            const obsSaved = (typeof window.resolveSavedAvaliacaoCategory === 'function'
                ? window.resolveSavedAvaliacaoCategory(saved.__obs__, topico, catIdx, templateCats)
                : (saved.__obs__ && saved.__obs__[topico])) || {};

            perguntasGroup[topico].forEach((pergunta, idx) => {
                if (!pergunta || !pergunta.trim()) return;
                const val = topicoSaved != null ? (topicoSaved[idx] ?? topicoSaved[String(idx)] ?? null) : null;
                const obsStr = (obsSaved[idx] ?? obsSaved[String(idx)]) || '';
                html += `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:1.5rem; padding:0.75rem 0; border-bottom:1px dashed #e2e8f0; flex-wrap:wrap;">
                    <div style="width:30%; min-width:250px; font-size:0.95rem; color:#475569; font-weight:500;">${escHtml(pergunta)}</div>
                    <div style="flex:1; display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                        <div style="display:flex; gap:0.35rem; flex-shrink:0;">
                `;

                const qColors = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#84cc16', 5: '#22c55e' };
                const rowVal = val != null ? parseInt(val, 10) : null;

                for (let v = 1; v <= 5; v++) {
                    const c = qColors[v];
                    const isChecked = (rowVal === v);
                    const checkedAttr = isChecked ? 'checked' : '';
                    const disabledAttr = isReadonly ? 'disabled' : '';
                    const btnBg = isChecked ? c : '#fff';
                    const btnColor = isChecked ? '#fff' : c;
                    const btnBorder = isChecked ? c : '#cbd5e1';
                    html += `
                    <label style="cursor:pointer; position:relative; margin:0;" title="Nota ${v}">
                        <input type="radio" name="av_${catIdx}_${idx}" value="${v}" ${checkedAttr} ${disabledAttr} style="position:absolute; opacity:0; pointer-events:none;">
                        <div class="sat-rbtn" data-color="${c}" data-bg="${c}" data-group="av_${catIdx}_${idx}"
                             style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:6px; font-weight:700; font-size:0.85rem; border:2px solid ${btnBorder}; background:${btnBg}; color:${btnColor}; transition:all 0.15s; cursor:pointer;"
                             onclick="window._satRhRbtnClick(this, ${isReadonly ? 'true' : 'false'})">
                            ${v}
                        </div>
                    </label>`;
                }

                const obsObrigatoria = (rowVal != null && rowVal <= 4);
                const obsFaltando = obsObrigatoria && !String(obsStr || '').trim();
                html += `
                        </div>
                        <input type="text" name="av_obs_${catIdx}_${idx}" value="${escHtml(obsStr)}" ${isReadonly ? 'disabled' : ''} placeholder="${obsObrigatoria ? 'Observação obrigatória (nota de 1 a 4) *' : 'Observação (opcional)...'}" oninput="if(this.value.trim()){this.style.borderColor='#cbd5e1';this.style.background='#ffffff';}" style="text-transform:none; flex:1; min-width:250px; padding:0.4rem 0.6rem; border:1px solid ${obsFaltando ? '#ef4444' : '#cbd5e1'}; background:${obsFaltando ? '#fef2f2' : '#ffffff'}; border-radius:6px; font-size:0.85rem; outline:none; color:#334155; height:32px; box-sizing:border-box;">
                    </div>
                </div>`;
            });
            html += `</div></div>`;
            catIdx++;
        });

        const infoAdic = saved.__obs_gerais__ ? saved.__obs_gerais__ : ((saved.__obs__ && saved.__obs__.info_adicional) ? saved.__obs__.info_adicional : '');
        html += `
                        <div style="margin-top:2.5rem;padding:1.5rem;background:#fff;border:1px dashed #cbd5e1;border-radius:8px;">
                            <label style="display:block;font-size:0.85rem;font-weight:600;color:#475569;margin-bottom:0.5rem;">Informações Adicionais / Observação Geral (Opcional)</label>
                            <textarea name="info_adicional" ${isReadonly ? 'disabled' : ''} rows="2" style="text-transform:none;width:100%;padding:0.75rem;border-radius:6px;border:1px solid #cbd5e1;font-size:0.9rem;font-family:inherit;resize:vertical;" placeholder="Observações, feedback extra...">${escHtml(infoAdic)}</textarea>
                        </div>
                        
                        <div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:2rem;">
                            <button type="button" onclick="window._satCloseForm()" style="padding:0.75rem 1.5rem;border-radius:8px;font-weight:600;border:1px solid #cbd5e1;background:#fff;color:#64748b;cursor:pointer;">Cancelar</button>
                            ${isReadonly ? '' : `<button type="submit" id="sat-btn-submit" style="padding:0.75rem 1.5rem;border-radius:8px;font-weight:600;border:none;background:#0f4c81;color:#fff;cursor:pointer;display:flex;align-items:center;gap:0.5rem;box-shadow:0 2px 4px rgba(15,76,129,0.3);"><i class="ph ph-check-circle"></i> Salvar Respostas</button>`}
                        </div>
                    </form>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', html);
    };

    window._satCloseForm = function () {
        const overlay = document.getElementById('sat-modal-overlay');
        if (overlay) overlay.remove();
    };

    window._satSubmitForm = async function (e, colabId, grupo, refAno, refTrim) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = document.getElementById('sat-btn-submit');

        // current quarter (Fevereiro=1, Maio=2, Agosto=3, Novembro=4)
        const _now = new Date();
        const _m = _now.getMonth() + 1;
        let _defYear = _now.getFullYear();
        let _defQ = 4;
        if (_m >= 2 && _m <= 4) _defQ = 1;
        else if (_m >= 5 && _m <= 7) _defQ = 2;
        else if (_m >= 8 && _m <= 10) _defQ = 3;
        else if (_m >= 11) _defQ = 4;
        else { _defQ = 4; _defYear--; }
        const currentYear = refAno || _defYear;
        const currentQ = refTrim || _defQ;

        const respostas = { __obs__: {} };
        const perguntasGroup = window.AVALIACAO_QUESTIONS.satisfacao[grupo];
        const categories = Object.keys(perguntasGroup);
        let erroObsObrigatoria = null;
        let totalQ = 0;
        let ansQ = 0;

        categories.forEach((cat, catIdx) => {
            respostas[cat] = [];
            respostas.__obs__[cat] = {};
            perguntasGroup[cat].forEach((q, i) => {
                if (!q || !q.trim()) return;
                totalQ++;
                const rads = form.elements[`av_${catIdx}_${i}`];
                const selected = rads && rads.length ? Array.from(rads).find(r => r.checked) : null;
                let notaNum = null;
                if (selected) {
                    notaNum = parseInt(selected.value, 10);
                    respostas[cat][i] = notaNum;
                    ansQ++;
                } else {
                    respostas[cat][i] = null;
                }
                const obs = form.elements[`av_obs_${catIdx}_${i}`];
                const obsTxt = obs ? obs.value.trim() : '';
                if (obsTxt) respostas.__obs__[cat][i] = obsTxt;
                if (notaNum != null && notaNum <= 4 && !obsTxt) {
                    if (obs) {
                        obs.style.borderColor = '#ef4444';
                        obs.style.background = '#fef2f2';
                    }
                    if (!erroObsObrigatoria) {
                        erroObsObrigatoria = { input: obs, pergunta: q, nota: notaNum };
                    }
                }
            });
            if (Object.keys(respostas.__obs__[cat]).length === 0) delete respostas.__obs__[cat];
        });

        if (erroObsObrigatoria) {
            if (erroObsObrigatoria.input) {
                try { erroObsObrigatoria.input.scrollIntoView({ behavior: 'smooth', block: 'center' }); erroObsObrigatoria.input.focus(); } catch (_) {}
            }
            if (window.Swal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Observação obrigatória',
                    text: `Para notas de 4 para baixo (nota ${erroObsObrigatoria.nota}), é obrigatório preencher uma observação na pergunta: "${erroObsObrigatoria.pergunta}". Apenas a nota 5 tem observação opcional.`,
                    confirmButtonColor: '#0f4c81'
                });
            } else {
                alert(`Observação obrigatória: para notas de 4 para baixo (nota ${erroObsObrigatoria.nota}), preencha a observação na pergunta "${erroObsObrigatoria.pergunta}".`);
            }
            return;
        }

        const infoAdicional = form.elements['info_adicional']?.value;
        if (infoAdicional) {
            respostas.__obs__.info_adicional = infoAdicional.trim();
            respostas.__obs_gerais__ = infoAdicional.trim();
        }

        respostas.__grupo__ = grupo;
        try {
            respostas.__categorias_snapshot__ = JSON.stringify(perguntasGroup);
        } catch (_) {}

        try {
            submitBtn.innerHTML = '<div class="spinner-sm" style="border-color:#c4b5fd;border-top-color:#fff;"></div> Salvando...';
            submitBtn.disabled = true;

            const tok = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
            const r = await fetch(API.replace('/api', '') + '/api/avaliacoes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + tok
                },
                body: JSON.stringify({
                    colaborador_id: colabId,
                    tipo: 'satisfacao',
                    ano: currentYear,
                    trimestre: currentQ,
                    respostas_json: JSON.stringify(respostas)
                })
            });

            if (!r.ok) throw new Error(await r.text());

            const is100 = (totalQ > 0 && ansQ === totalQ);
            const meta = window._satCurrentColabMeta || {};
            const colabObj = (_colabs?.colaboradores || []).find(c => Number(c.id) === Number(colabId));
            const nomeColab = meta.nome || colabObj?.nome_completo || 'Colaborador';
            const cargoColab = meta.cargo || colabObj?.cargo || '';
            const deptColab = meta.dept || colabObj?.departamento || '';

            window._satCloseForm();

            if (is100) {
                window._satAbrirModalAssinaturaSelfie({
                    colabId,
                    nome: nomeColab,
                    cargo: cargoColab,
                    dept: deptColab,
                    ano: currentYear,
                    trimestre: currentQ,
                    grupo,
                    respostas,
                    perguntasGroup,
                    onSigned: function () {
                        if (typeof window.initSatisfacaoRH === 'function') window.initSatisfacaoRH(true);
                    }
                });
            } else {
                alert(`Progresso salvo (${ansQ}/${totalQ} perguntas respondidas). Ao completar 100% das perguntas será solicitada a assinatura e a selfie.`);
                if (typeof window.initSatisfacaoRH === 'function') window.initSatisfacaoRH(true);
            }
        } catch (err) {
            alert('Erro ao salvar pesquisa: ' + err.message);
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="ph ph-check-circle"></i> Salvar Respostas';
                submitBtn.disabled = false;
            }
        }
    };

    /* ── MODAL GLOBAL DE ASSINATURA + SELFIE OBRIGATÓRIA (100% SATISFAÇÃO) ── */
    window._satAbrirModalAssinaturaSelfie = async function (opts) {
        const { colabId, nome, cargo, dept, ano, trimestre, grupo, respostas, perguntasGroup, onSigned } = opts || {};
        const nomeLimpo = (typeof window.limparPrefixoGrupoCliente === 'function') ? window.limparPrefixoGrupoCliente(nome || '') : String(nome || '');

        if (!window.SignaturePad) {
            try {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdn.jsdelivr.net/npm/signature_pad@4.1.7/dist/signature_pad.umd.min.js';
                    s.onload = resolve;
                    s.onerror = reject;
                    document.head.appendChild(s);
                });
            } catch (_) {}
        }

        document.getElementById('sat-sign-overlay')?.remove();

        const tok = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        let clientIp = 'Carregando...';
        let usuarioLogadoNome = '';
        try {
            const erpU = JSON.parse(localStorage.getItem('erp_user') || '{}');
            usuarioLogadoNome = erpU.nome_completo || erpU.nome || erpU.username || '';
        } catch (_) {}

        const html = `
        <div id="sat-sign-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);z-index:10005;display:flex;align-items:center;justify-content:center;padding:1rem;">
            <div style="background:#fff;border-radius:16px;width:100%;max-width:760px;max-height:95vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.4);overflow:hidden;">
                <div style="background:linear-gradient(135deg,#0f4c81,#1d6fa5);padding:1.25rem 1.5rem;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                    <div>
                        <div style="color:#fff;font-size:1.08rem;font-weight:700;"><i class="ph ph-signature" style="margin-right:6px;"></i>Assinatura e Selfie Obrigatórias — Pesquisa de Satisfação (100%)</div>
                        <div style="color:#bfdbfe;font-size:0.84rem;margin-top:3px;">Colaborador: <strong>${escHtml(nomeLimpo)}</strong> · ${escHtml(dept || '')}${cargo ? ' · ' + escHtml(cargo) : ''} · ${ano} / ${trimestre}º Trimestre</div>
                    </div>
                </div>

                <div style="overflow-y:auto;flex:1;padding:1.4rem;">
                    <div style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:10px;padding:0.9rem 1.15rem;margin-bottom:1.2rem;">
                        <div style="font-size:0.88rem;color:#1e3a8a;font-weight:700;margin-bottom:4px;"><i class="ph ph-check-circle" style="margin-right:4px;color:#0284c7;"></i>Preenchimento 100% Concluído</div>
                        <p style="margin:0;font-size:0.83rem;color:#1e40af;line-height:1.5;">
                            Para finalizar a Pesquisa de Satisfação de <strong>${escHtml(nomeLimpo)}</strong>, é obrigatório coletar a <strong>assinatura digital</strong> e tirar uma <strong>selfie</strong>.
                            A foto registrará automaticamente o nome do colaborador, a data/hora exata e o IP no momento da fotografia.
                        </p>
                    </div>

                    <div style="display:flex;gap:1.25rem;flex-wrap:wrap;">
                        <!-- Assinatura -->
                        <div style="flex:1;min-width:290px;">
                            <label style="display:block;font-size:0.85rem;font-weight:700;color:#334155;margin-bottom:0.5rem;">
                                <i class="ph ph-pen-nib" style="color:#0f4c81;margin-right:4px;"></i>1. Assinatura do Colaborador *
                            </label>
                            <div style="position:relative;border:2px dashed #94a3b8;border-radius:10px;background:#f8fafc;overflow:hidden;">
                                <canvas id="sat-sig-canvas" style="width:100%;display:block;touch-action:none;cursor:crosshair;" height="175"></canvas>
                                <button type="button" onclick="window._satClearSig()" style="position:absolute;top:8px;right:8px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:4px 9px;font-size:0.75rem;color:#dc2626;cursor:pointer;font-weight:600;">
                                    <i class="ph ph-eraser"></i> Limpar
                                </button>
                            </div>
                            <p style="font-size:0.75rem;color:#64748b;margin:5px 0 0;">Assine utilizando o dedo (celular/tablet) ou o mouse no quadro acima.</p>
                        </div>

                        <!-- Selfie com Carimbo -->
                        <div style="flex:1.15;min-width:310px;">
                            <label style="display:block;font-size:0.85rem;font-weight:700;color:#334155;margin-bottom:0.5rem;">
                                <i class="ph ph-camera" style="color:#0f4c81;margin-right:4px;"></i>2. Selfie com Nome, Data/Hora e IP *
                            </label>
                            <div style="position:relative;border-radius:10px;overflow:hidden;background:#0f172a;width:100%;height:215px;border:1.5px solid #cbd5e1;">
                                <video id="sat-selfie-video" autoplay playsinline muted style="width:100%;height:215px;object-fit:cover;display:block;"></video>
                                <div id="sat-selfie-live-meta" style="position:absolute;left:0;right:0;bottom:0;background:rgba(15,23,42,0.82);color:#fff;padding:6px 10px;font-family:monospace;font-size:11px;line-height:1.35;">
                                    <div style="font-weight:700;color:#38bdf8;">Colaborador: ${escHtml(nomeLimpo)}</div>
                                    <div id="sat-selfie-live-ts">Data/Hora: --/--/---- --:--:--</div>
                                    <div id="sat-selfie-live-ip">IP: Carregando...</div>
                                </div>
                                <canvas id="sat-selfie-canvas" style="display:none;"></canvas>
                                <img id="sat-selfie-preview" style="display:none;width:100%;height:215px;object-fit:contain;background:#0f172a;" />
                            </div>
                            <div style="display:flex;gap:0.6rem;margin-top:0.6rem;">
                                <button type="button" id="sat-btn-capturar" onclick="window._satCaptureSelfie()" style="flex:1;background:#0f4c81;color:#fff;border:none;border-radius:8px;padding:0.55rem 1rem;font-size:0.84rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                                    <i class="ph ph-camera"></i> Tirar Selfie
                                </button>
                                <button type="button" id="sat-btn-recapturar" onclick="window._satRetakeSelfie()" style="display:none;flex:1;background:#64748b;color:#fff;border:none;border-radius:8px;padding:0.55rem 1rem;font-size:0.84rem;font-weight:700;cursor:pointer;align-items:center;justify-content:center;gap:6px;">
                                    <i class="ph ph-arrow-counter-clockwise"></i> Tirar Outra Foto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;align-items:center;gap:0.75rem;background:#f8fafc;flex-shrink:0;">
                    <button type="button" id="sat-btn-confirmar-assinatura" onclick="window._satConfirmarAssinaturaSelfie()" style="padding:0.7rem 1.5rem;border-radius:8px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(16,185,129,0.35);font-size:0.9rem;">
                        <i class="ph ph-check-circle"></i> Finalizar, Assinar e Salvar Documento
                    </button>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', html);

        // Fetch IP real no momento da abertura da câmera
        (async function fetchIpNow() {
            try {
                const rIp = await fetch(API.replace('/api', '') + '/api/meu-ip', {
                    headers: { 'Authorization': 'Bearer ' + tok }
                });
                if (rIp.ok) {
                    const jIp = await rIp.json();
                    if (jIp.ip) clientIp = jIp.ip;
                    if (jIp.usuario_nome) usuarioLogadoNome = jIp.usuario_nome;
                }
            } catch (_) {}
            if (!clientIp || clientIp === 'Carregando...') {
                try {
                    const rExt = await fetch('https://api.ipify.org?format=json');
                    if (rExt.ok) {
                        const jExt = await rExt.json();
                        if (jExt.ip) clientIp = jExt.ip;
                    }
                } catch (_) { clientIp = 'Não identificado'; }
            }
            const ipEl = document.getElementById('sat-selfie-live-ip');
            if (ipEl) ipEl.textContent = 'IP: ' + clientIp;
        })();

        // Inicializar SignaturePad
        const sigCanvas = document.getElementById('sat-sig-canvas');
        sigCanvas.width = sigCanvas.parentElement.offsetWidth || 340;
        if (window.SignaturePad) {
            window._satSigPad = new window.SignaturePad(sigCanvas, {
                backgroundColor: 'rgba(255,255,255,0)',
                penColor: '#0f172a',
                minWidth: 1.5,
                maxWidth: 3
            });
        }
        window._satClearSig = function () {
            if (window._satSigPad) window._satSigPad.clear();
        };

        window._satStopCamera = function () {
            if (window._satCameraStream) {
                window._satCameraStream.getTracks().forEach(t => t.stop());
                window._satCameraStream = null;
            }
        };

        window._satSelfieData = null;
        window._satSelfieTimestamp = null;

        function getFormattedBRT() {
            return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        }

        window._satCaptureSelfie = function () {
            const vid = document.getElementById('sat-selfie-video');
            const can = document.getElementById('sat-selfie-canvas');
            const pre = document.getElementById('sat-selfie-preview');
            const metaBox = document.getElementById('sat-selfie-live-meta');
            if (!vid || !can || !pre) return;

            const w = vid.videoWidth || 640;
            const h = vid.videoHeight || 480;
            can.width = w;
            can.height = h;
            const ctx = can.getContext('2d');
            ctx.drawImage(vid, 0, 0, w, h);

            const dtMomento = getFormattedBRT();
            window._satSelfieTimestamp = dtMomento;

            // Desenhar tarja inferior na própria foto com Nome do Colaborador (Usuário da pesquisa), Data/Hora e IP
            const barH = Math.max(68, Math.round(h * 0.16));
            ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
            ctx.fillRect(0, h - barH, w, barH);

            const fontSizeTitle = Math.max(13, Math.round(w * 0.024));
            const fontSizeSub = Math.max(12, Math.round(w * 0.021));
            const padX = 12;

            ctx.fillStyle = '#38bdf8';
            ctx.font = `bold ${fontSizeTitle}px monospace`;
            ctx.fillText(`Colaborador: ${nomeLimpo}`, padX, h - barH + fontSizeTitle + 6);

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${fontSizeSub}px monospace`;
            ctx.fillText(`Data/Hora: ${dtMomento}`, padX, h - barH + fontSizeTitle + fontSizeSub + 12);

            ctx.fillStyle = '#e2e8f0';
            ctx.font = `bold ${fontSizeSub}px monospace`;
            ctx.fillText(`IP: ${clientIp}`, padX, h - barH + fontSizeTitle + fontSizeSub * 2 + 18);

            window._satSelfieData = can.toDataURL('image/jpeg', 0.90);
            pre.src = window._satSelfieData;

            vid.style.display = 'none';
            if (metaBox) metaBox.style.display = 'none';
            pre.style.display = 'block';

            const btnCap = document.getElementById('sat-btn-capturar');
            const btnRec = document.getElementById('sat-btn-recapturar');
            if (btnCap) btnCap.style.display = 'none';
            if (btnRec) btnRec.style.display = 'flex';
        };

        window._satRetakeSelfie = function () {
            window._satSelfieData = null;
            window._satSelfieTimestamp = null;
            const vid = document.getElementById('sat-selfie-video');
            const pre = document.getElementById('sat-selfie-preview');
            const metaBox = document.getElementById('sat-selfie-live-meta');
            if (pre) pre.style.display = 'none';
            if (vid) vid.style.display = 'block';
            if (metaBox) metaBox.style.display = 'block';

            const btnCap = document.getElementById('sat-btn-capturar');
            const btnRec = document.getElementById('sat-btn-recapturar');
            if (btnCap) btnCap.style.display = 'flex';
            if (btnRec) btnRec.style.display = 'none';
        };

        // Iniciar câmera
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false });
            window._satCameraStream = stream;
            const vid = document.getElementById('sat-selfie-video');
            if (vid) vid.srcObject = stream;

            const tickClock = () => {
                const tsEl = document.getElementById('sat-selfie-live-ts');
                if (!tsEl || !window._satCameraStream) return;
                tsEl.textContent = 'Data/Hora: ' + getFormattedBRT();
                if (!window._satSelfieData) setTimeout(tickClock, 1000);
            };
            tickClock();
        } catch (camErr) {
            const cap = document.getElementById('sat-btn-capturar');
            if (cap) {
                cap.disabled = true;
                cap.title = 'Câmera indisponível: ' + camErr.message;
            }
            alert('Não foi possível acessar a câmera para a selfie obrigatória: ' + camErr.message);
        }

        window._satConfirmarAssinaturaSelfie = async function () {
            if (!window._satSigPad || window._satSigPad.isEmpty()) {
                alert('É obrigatório assinar no quadro de assinatura antes de finalizar.');
                return;
            }
            if (!window._satSelfieData) {
                alert('É obrigatório tirar a selfie antes de finalizar.');
                return;
            }

            const btn = document.getElementById('sat-btn-confirmar-assinatura');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<div class="spinner-sm" style="border-color:#a7f3d0;border-top-color:#fff;width:16px;height:16px;border-width:2px;"></div> Gerando Documento e Salvando...';
            }

            try {
                const assinatura_base64 = window._satSigPad.toDataURL('image/png');
                const selfie_base64 = window._satSelfieData;
                const data_hora_foto = window._satSelfieTimestamp || getFormattedBRT();

                const r = await fetch(API.replace('/api', '') + '/api/satisfacao-documentos/assinar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + tok
                    },
                    body: JSON.stringify({
                        colaborador_id: colabId,
                        ano,
                        trimestre,
                        respostas_json: JSON.stringify(respostas),
                        assinatura_base64,
                        selfie_base64,
                        perguntas_text: perguntasGroup,
                        usuario_nome: nomeLimpo,
                        aplicador_nome: usuarioLogadoNome,
                        data_hora_foto,
                        ip_foto: clientIp,
                        dispositivo: navigator.userAgent
                    })
                });
                const data = await r.json();
                if (!r.ok) throw new Error(data.error || 'Erro ao salvar assinatura e selfie.');

                window._satStopCamera();
                document.getElementById('sat-sign-overlay')?.remove();

                if (typeof onSigned === 'function') {
                    try { onSigned(data); } catch (_) {}
                }

                // Abrir comprovante com o documento assinado e a foto
                window.verComprovanteSatisfacao({
                    id: data.id,
                    colabId,
                    ano,
                    trimestre,
                    nome: nomeLimpo,
                    pdf_url: data.pdf_url,
                    selfie_url: data.selfie_url,
                    assinatura_url: data.assinatura_url,
                    assinado_em: data.assinado_em || data_hora_foto,
                    ip_address: data.ip || clientIp
                });
            } catch (err) {
                alert('Erro ao finalizar documento assinado: ' + err.message);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="ph ph-check-circle"></i> Finalizar, Assinar e Salvar Documento';
                }
            }
        };
    };

    /* ── VISUALIZADOR GLOBAL DO DOCUMENTO ASSINADO + FOTO (TRILHA / PRONTUÁRIO / RH) ── */
    window.verComprovanteSatisfacao = async function (optsOrId) {
        document.getElementById('modal-comprovante-satisfacao')?.remove();

        const tok = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        let info = (typeof optsOrId === 'object' && optsOrId !== null) ? { ...optsOrId } : { id: optsOrId };

        const loadModal = document.createElement('div');
        loadModal.id = 'modal-comprovante-satisfacao';
        loadModal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.82);z-index:10010;display:flex;align-items:center;justify-content:center;padding:16px;';
        loadModal.innerHTML = `<div style="background:#fff;border-radius:16px;padding:2rem;min-width:300px;text-align:center;color:#64748b;">
            <i class="ph ph-spinner ph-spin" style="font-size:2rem;display:block;margin-bottom:8px;"></i> Carregando documento assinado e foto...
        </div>`;
        document.body.appendChild(loadModal);

        try {
            if (!info.pdf_url || !info.selfie_url) {
                let urlFetch = null;
                if (info.id) {
                    urlFetch = API.replace('/api', '') + '/api/satisfacao-documentos/id/' + info.id;
                } else if (info.colabId && info.ano && info.trimestre) {
                    urlFetch = API.replace('/api', '') + `/api/satisfacao-documentos/${info.colabId}/${info.ano}/${info.trimestre}`;
                }
                if (urlFetch) {
                    const r = await fetch(urlFetch, { headers: { 'Authorization': 'Bearer ' + tok } });
                    if (r.ok) {
                        const row = await r.json();
                        if (row) {
                            info = {
                                ...info,
                                id: row.id,
                                colabId: row.colaborador_id,
                                ano: row.ano,
                                trimestre: row.trimestre,
                                nome: row.colaborador_nome || row.usuario_nome || info.nome || 'Colaborador',
                                cargo: row.cargo || info.cargo || '',
                                departamento: row.departamento || info.departamento || '',
                                pdf_url: row.pdf_r2 || info.pdf_url,
                                selfie_url: row.selfie_r2 || info.selfie_url,
                                assinatura_url: row.assinatura_r2 || info.assinatura_url,
                                assinado_em: row.assinado_em || info.assinado_em,
                                ip_address: row.ip_address || info.ip_address
                            };
                        }
                    }
                }
            }

            if (!info.pdf_url && !info.selfie_url) {
                loadModal.remove();
                alert('Este registro de Pesquisa de Satisfação ainda não possui assinatura e selfie registradas.');
                return;
            }

            const nomeExib = info.nome || info.colaborador_nome || 'Colaborador';
            const dtExib = info.assinado_em || '—';
            const ipExib = info.ip_address || '—';

            loadModal.innerHTML = `
            <div style="background:#fff;border-radius:16px;width:100%;max-width:1150px;height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.45);">
                <div style="background:linear-gradient(135deg,#0f4c81,#1d6fa5);padding:1rem 1.5rem;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;gap:1rem;flex-wrap:wrap;">
                    <div>
                        <div style="color:#fff;font-size:1.05rem;font-weight:700;display:flex;align-items:center;gap:8px;">
                            <i class="ph ph-shield-check" style="font-size:1.3rem;color:#7dd3fc;"></i>
                            Comprovante Assinado — Pesquisa de Satisfação ${info.ano ? `(${info.trimestre}º Trim/${info.ano})` : ''}
                        </div>
                        <div style="color:#e0f2fe;font-size:0.82rem;margin-top:2px;">
                            Colaborador: <strong>${escHtml(nomeExib)}</strong> · Data/Hora: <strong>${escHtml(dtExib)}</strong> · IP: <strong>${escHtml(ipExib)}</strong>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        ${info.pdf_url ? `<a href="${info.pdf_url}" target="_blank" style="background:#10b981;color:#fff;text-decoration:none;padding:0.45rem 0.95rem;border-radius:8px;font-size:0.82rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                            <i class="ph ph-file-pdf"></i> Abrir / Baixar PDF
                        </a>` : ''}
                        <button onclick="document.getElementById('modal-comprovante-satisfacao').remove()" style="background:rgba(255,255,255,0.18);border:none;color:#fff;border-radius:8px;width:34px;height:34px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">✕</button>
                    </div>
                </div>

                <div style="flex:1;display:flex;overflow:hidden;background:#f1f5f9;flex-wrap:wrap;">
                    <!-- Coluna Esquerda: Selfie com Metadados + Assinatura -->
                    <div style="width:360px;max-width:100%;background:#fff;border-right:1px solid #e2e8f0;padding:1.25rem;overflow-y:auto;display:flex;flex-direction:column;gap:1rem;flex-shrink:0;">
                        <div>
                            <div style="font-size:0.78rem;font-weight:800;color:#0f4c81;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                                <i class="ph ph-camera"></i> Fotografia (Selfie da Pesquisa)
                            </div>
                            ${info.selfie_url ? `
                                <div style="border:1.5px solid #cbd5e1;border-radius:10px;overflow:hidden;background:#0f172a;">
                                    <img src="${info.selfie_url}" alt="Selfie da Pesquisa" style="width:100%;max-height:250px;object-fit:contain;display:block;cursor:pointer;" onclick="window.open(this.src,'_blank')" title="Clique para ampliar a foto" />
                                    <div style="background:#0f172a;color:#fff;padding:8px 10px;font-family:monospace;font-size:0.76rem;line-height:1.45;border-top:1px solid #334155;">
                                        <div><strong style="color:#38bdf8;">Usuário / Colaborador:</strong> ${escHtml(nomeExib)}</div>
                                        <div><strong style="color:#38bdf8;">Dia e Hora:</strong> ${escHtml(dtExib)}</div>
                                        <div><strong style="color:#38bdf8;">IP na Fotografia:</strong> ${escHtml(ipExib)}</div>
                                    </div>
                                </div>
                            ` : '<div style="padding:1rem;background:#f8fafc;border-radius:8px;color:#94a3b8;font-size:0.83rem;text-align:center;">Foto não disponível</div>'}
                        </div>

                        <div>
                            <div style="font-size:0.78rem;font-weight:800;color:#0f4c81;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                                <i class="ph ph-signature"></i> Assinatura Digital
                            </div>
                            ${info.assinatura_url ? `
                                <div style="border:1.5px solid #cbd5e1;border-radius:10px;padding:10px;background:#f8fafc;text-align:center;">
                                    <img src="${info.assinatura_url}" alt="Assinatura" style="max-width:100%;max-height:110px;object-fit:contain;" />
                                    <div style="border-top:1px solid #cbd5e1;margin-top:6px;padding-top:4px;font-size:0.78rem;font-weight:700;color:#334155;">${escHtml(nomeExib)}</div>
                                </div>
                            ` : '<div style="padding:1rem;background:#f8fafc;border-radius:8px;color:#94a3b8;font-size:0.83rem;text-align:center;">Assinatura não disponível</div>'}
                        </div>
                    </div>

                    <!-- Coluna Direita: Documento PDF Assinado -->
                    <div style="flex:1;min-width:320px;height:100%;display:flex;flex-direction:column;background:#334155;">
                        ${info.pdf_url ? `
                            <iframe src="${info.pdf_url}" style="width:100%;height:100%;border:none;flex:1;"></iframe>
                        ` : `
                            <div style="flex:1;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:0.95rem;">PDF não disponível</div>
                        `}
                    </div>
                </div>
            </div>`;
        } catch (err) {
            loadModal.remove();
            alert('Erro ao abrir comprovante: ' + err.message);
        }
    };
})();
