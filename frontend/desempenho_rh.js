/* ============================================================
   desempenho_rh.js — Dashboard por Departamento e Avaliações de Desempenho (RH)
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
        const r = await fetch(API + url, { headers: authHeaders(), cache: 'no-store', ...opts });
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

    // Escala de 4 cores: >=4.5 Verde | 4.0-4.49 Amarelo | 3.0-3.99 Laranja | <3.0 Vermelho
    function scoreColor(v) {
        if (v === null || v === undefined || isNaN(v)) return '#94a3b8';
        const num = Number(v);
        if (num >= 4.5) return '#15803d';
        if (num >= 4.0) return '#a16207';
        if (num >= 3.0) return '#c2410c';
        return '#b91c1c';
    }
    function scoreBg(v) {
        if (v === null || v === undefined || isNaN(v)) return 'rgba(148,163,184,.12)';
        const num = Number(v);
        if (num >= 4.5) return '#dcfce7';
        if (num >= 4.0) return '#fef9c3';
        if (num >= 3.0) return '#ffedd5';
        return '#fee2e2';
    }
    function trendIcon(arr, i) {
        if (i === 0 || arr[i - 1] === null || arr[i - 1] === undefined || arr[i] === null || arr[i] === undefined) return '';
        const diff = arr[i] - arr[i - 1];
        if (Math.abs(diff) < 0.1) return '<span style="color:#94a3b8" title="Estável">→</span>';
        return diff > 0
            ? `<span style="color:#16a34a" title="+${diff.toFixed(1)}">▲</span>`
            : `<span style="color:#dc2626" title="${diff.toFixed(1)}">▼</span>`;
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
    function grupoFromDeptCargo(dept, cargo) {
        return window.matchTemplateGroup('desempenho', dept, cargo);
    }

    /* ── STATE ───────────────────────────────────────────────── */
    let _dash = null;             // { periodos, dashboard, por_departamento, contagens }
    let _colabs = null;           // { periodos, colaboradores }
    let _mainTab = 'dashboard';   // Abre na aba Dashboard por padrão!
    let _filterDeptDash = 'all';
    let _filterDeptColabs = 'all';
    let _selectedPeriodKey = null;
    let _searchText = '';
    let _sortCol = null;
    let _sortDir = 1;

    /* ── MAIN INIT ───────────────────────────────────────────── */
    window.initDesempenhoRH = async function (preserveTab = false) {
        const container = document.getElementById('desempenho-rh-container');
        if (!container) return;
        if (!preserveTab) {
            _mainTab = 'dashboard'; // Sempre abrir na aba Dashboard
        }
        container.innerHTML = '<div style="display:flex;align-items:center;gap:1rem;padding:2rem;color:#94a3b8;"><div class="spinner-sm"></div> Carregando dados de desempenho…</div>';

        try {
            const [dash, colabs] = await Promise.all([
                fetchJSON('/avaliacoes/desempenho/dashboard'),
                fetchJSON('/avaliacoes/desempenho/colaboradores'),
            ]);
            _dash = dash;
            _colabs = colabs;

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

    function buildDeptoTopicsMap() {
        const periodos = _dash?.periodos || [];
        const map = {};

        if (Array.isArray(_dash?.por_departamento) && _dash.por_departamento.length > 0) {
            _dash.por_departamento.forEach(item => {
                const dep = normDepto(item.departamento);
                if (!item.topico || item.topico.startsWith('_')) return;
                if (!map[dep]) map[dep] = [];
                map[dep].push(item);
            });
            return map;
        }

        const acc = {};
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
        #des-root { font-family:'Inter',sans-serif; padding:1.5rem 2rem 3rem; color:#1e293b; }
        #des-root h1 { font-size:1.6rem;font-weight:700;margin:0 0 0.25rem; display:flex; align-items:center; gap:.45rem; }
        #des-root .sub { color:#64748b;font-size:.9rem;margin:0 0 1.25rem; }

        .des-main-tabs { display:flex; gap:.5rem; border-bottom:2px solid #e2e8f0; margin-bottom:1.5rem; }
        .des-main-tab {
            padding:.7rem 1.35rem; font-size:.92rem; font-weight:700; cursor:pointer;
            border:none; background:transparent; color:#64748b; border-bottom:3px solid transparent;
            margin-bottom:-2px; display:inline-flex; align-items:center; gap:.5rem; transition:all .15s;
        }
        .des-main-tab:hover { color:#7c3aed; background:rgba(124,58,237,.04); border-radius:8px 8px 0 0; }
        .des-main-tab.active { color:#7c3aed; border-bottom-color:#7c3aed; background:rgba(124,58,237,.06); border-radius:8px 8px 0 0; }

        .des-filter-bar {
            display:flex; gap:.85rem; align-items:center; justify-content:space-between; flex-wrap:wrap;
            background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:.85rem 1.1rem;
            margin-bottom:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,.04);
        }
        .des-filter-group { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; }
        .des-filter-label { font-size:.78rem; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.04em; display:flex; align-items:center; gap:.35rem; }
        .des-select {
            padding:.48rem .85rem; border-radius:8px; border:1.5px solid #cbd5e1; background:#f8fafc;
            font-size:.84rem; font-weight:600; color:#1e293b; outline:none; cursor:pointer; min-width:210px;
        }
        .des-select:focus { border-color:#7c3aed; background:#fff; }

        .sat-cards { display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem; }
        .sat-card { background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1.1rem 1.4rem;min-width:180px;flex:1; box-shadow:0 1px 3px rgba(0,0,0,.06); }
        .sat-card .sc-label { font-size:.73rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:.35rem; }
        .sat-card .sc-val { font-size:2rem;font-weight:800;line-height:1; }
        .sat-card .sc-sub { font-size:.78rem;color:#94a3b8;margin-top:.35rem; }

        .des-dept-block {
            background:#fff; border:1px solid #e2e8f0; border-radius:14px;
            box-shadow:0 1px 4px rgba(0,0,0,.05); margin-bottom:1.5rem; overflow:hidden;
        }
        .des-dept-header {
            display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.75rem;
            padding:1rem 1.25rem; background:#f8fafc; border-bottom:1px solid #e2e8f0;
        }
        .des-dept-title { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; font-size:1.02rem; font-weight:700; color:#1e293b; }
        .des-dept-actions { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; }
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

        .sat-search-bar { display:flex;gap:.75rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap; background:#fff; padding:.85rem 1rem; border-radius:12px; border:1px solid #e2e8f0; }
        .sat-search-input { padding:.5rem .9rem;border-radius:8px;border:1.5px solid #cbd5e1;font-size:.84rem;flex:1;min-width:200px;outline:none;transition:border-color .15s; }
        .sat-search-input:focus { border-color:#7c3aed; }
        .sat-badge { display:inline-flex;align-items:center;gap:.35rem;background:#ede9fe;color:#7c3aed;border-radius:8px;padding:.25rem .7rem;font-size:.75rem;font-weight:600; }
        .sat-badge-gestor { display:inline-flex;align-items:center;gap:.35rem;background:#e0f2fe;color:#0369a1;border-radius:8px;padding:.25rem .7rem;font-size:.75rem;font-weight:600; }
        .sat-avatar-cell { display:flex;align-items:center;gap:.65rem; }

        .sat-legend { display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1rem; }
        .sat-legend-item { display:flex;align-items:center;gap:.4rem;font-size:.75rem;color:#64748b; }
        .sat-legend-dot { width:10px;height:10px;border-radius:50%; }

        .no-data-box { text-align:center;padding:3rem 1rem;color:#94a3b8; background:#fff; border-radius:12px; border:1px solid #e2e8f0; }
        .no-data-box i { font-size:3rem;display:block;margin-bottom:.75rem;color:#cbd5e1; }

        .spinner-sm { width:20px;height:20px;border:3px solid #e2e8f0;border-top-color:#7c3aed;border-radius:50%;animation:spin .7s linear infinite; display:inline-block; }
        @keyframes spin { to { transform:rotate(360deg); } }
        </style>

        <div id="des-root">
            <h1><i class="ph ph-trend-up" style="color:#7c3aed;"></i>Desempenho dos Colaboradores</h1>
            <p class="sub">Acompanhe o desempenho consolidado por departamento, gere análises consultivas com IA para os gestores e gerencie as avaliações individuais</p>

            <!-- Abas Principais: Dashboard (padrão ao abrir) | Colaboradores -->
            <div class="des-main-tabs">
                <button class="des-main-tab ${_mainTab === 'dashboard' ? 'active' : ''}" onclick="window._desToggleMainTab('dashboard')">
                    <i class="ph ph-chart-bar"></i> Dashboard
                </button>
                <button class="des-main-tab ${_mainTab === 'colaboradores' ? 'active' : ''}" onclick="window._desToggleMainTab('colaboradores')">
                    <i class="ph ph-users"></i> Colaboradores
                </button>
            </div>

            <div id="des-tab-content"></div>
        </div>
        `;

        renderActiveTabContent();
    }

    window._desToggleMainTab = function (tab) {
        _mainTab = tab === 'colaboradores' ? 'colaboradores' : 'dashboard';
        document.querySelectorAll('.des-main-tab').forEach(btn => {
            const isDash = btn.textContent.trim().startsWith('Dashboard');
            btn.classList.toggle('active', (_mainTab === 'dashboard' && isDash) || (_mainTab === 'colaboradores' && !isDash));
        });
        renderActiveTabContent();
    };

    function renderActiveTabContent() {
        const area = document.getElementById('des-tab-content');
        if (!area) return;
        if (_mainTab === 'dashboard') {
            area.innerHTML = renderDashboardTab();
        } else {
            area.innerHTML = renderColaboradoresSection();
        }
    }

    /* ══════════════════════════════════════════════════════════════
       ABA 1: DASHBOARD POR DEPARTAMENTO (PADRÃO AO ABRIR)
       ══════════════════════════════════════════════════════════════ */
    function renderDashboardTab() {
        const periodos = _dash?.periodos || [];
        if (periodos.length === 0) {
            return `<div class="no-data-box">
                <i class="ph ph-chart-bar"></i>
                <h3 style="color:#334155;margin:0 0 .5rem;">Nenhuma avaliação de desempenho encontrada</h3>
                <p style="margin:0;">Assim que as avaliações forem respondidas na aba <strong>Colaboradores</strong>, os dados aparecerão aqui.</p>
            </div>`;
        }

        const deptos = getAllDepartamentos();
        const activePeriodObj = periodos.find(p => `${p.ano}-T${p.trimestre}` === _selectedPeriodKey) || periodos[periodos.length - 1];
        const activeKey = activePeriodObj ? `${activePeriodObj.ano}-T${activePeriodObj.trimestre}` : null;

        return `
            <div class="des-filter-bar">
                <div class="des-filter-group">
                    <span class="des-filter-label"><i class="ph ph-buildings" style="color:#7c3aed;font-size:1rem;"></i> Departamento:</span>
                    <select class="des-select" onchange="window._desSetDashDept(this.value)">
                        <option value="all" ${_filterDeptDash === 'all' ? 'selected' : ''}>Todos os departamentos (${deptos.length})</option>
                        ${deptos.map(d => `<option value="${escHtml(d)}" ${_filterDeptDash === d ? 'selected' : ''}>${escHtml(d)}</option>`).join('')}
                    </select>
                </div>
                <div class="des-filter-group">
                    <span class="des-filter-label"><i class="ph ph-calendar-blank" style="color:#7c3aed;font-size:1rem;"></i> Período de Referência (Cards & IA):</span>
                    <select class="des-select" onchange="window._desSetDashPeriod(this.value)">
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

            <div id="des-dashboard-deptos-area">
                ${renderDepartamentosBlocks(activePeriodObj)}
            </div>
        `;
    }

    window._desSetDashDept = function (dept) {
        _filterDeptDash = dept || 'all';
        renderActiveTabContent();
    };

    window._desSetDashPeriod = function (periodKey) {
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
        const elegiveis = colabs.filter(c => !(periodoKey && c.pesquisas?.[periodoKey]?.nao_admitido));
        const responderam = elegiveis.filter(c => periodoKey && c.pesquisas?.[periodoKey]?.respondido).length;
        const total = elegiveis.length;
        const faltam = Math.max(0, total - responderam);
        const pct = total > 0 ? ((responderam / total) * 100).toFixed(1).replace('.0', '') : 0;

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
                    ? `<span style="color:#16a34a;font-weight:700;">▲ +${diff.toFixed(1)} vs ${periodLabel(pAnt)}</span>`
                    : diff <= -0.1
                        ? `<span style="color:#dc2626;font-weight:700;">▼ ${diff.toFixed(1)} vs ${periodLabel(pAnt)}</span>`
                        : `<span style="color:#94a3b8;">→ estável vs ${periodLabel(pAnt)}</span>`;
            }
        }

        const mc = scoreColor(mediaGeralNum);
        return `<div class="sat-cards">
            <div class="sat-card">
                <div class="sc-label">Avaliados (${periodoRef ? periodLabel(periodoRef) : ''})</div>
                <div class="sc-val" style="color:#7c3aed;">${responderam}<span style="font-size:1rem;font-weight:400;color:#94a3b8;">/${total}</span></div>
                <div class="sc-sub">${pct}% de adesão ${_filterDeptDash !== 'all' ? `em ${escHtml(_filterDeptDash)}` : ''}</div>
            </div>
            <div class="sat-card">
                <div class="sc-label">Faltam avaliar</div>
                <div class="sc-val" style="color:#f59e0b;">${faltam}</div>
                <div class="sc-sub">${periodoRef ? periodLabel(periodoRef) : ''}</div>
            </div>
            <div class="sat-card">
                <div class="sc-label">Média Geral (${_filterDeptDash === 'all' ? 'Geral' : escHtml(_filterDeptDash)})</div>
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
            const elegiveisRef = colabsDepto.filter(c => !(refKey && c.pesquisas?.[refKey]?.nao_admitido));
            const respRef = elegiveisRef.filter(c => refKey && c.pesquisas?.[refKey]?.respondido).length;
            const gestorNome = getGestorDepto(depto);

            const deptAvgs = periodos.map(p => {
                const key = `${p.ano}-T${p.trimestre}`;
                const vals = topicos.map(t => t[key]).filter(v => v !== null && v !== undefined && !isNaN(v));
                return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null;
            });

            const idxRef = periodos.findIndex(p => `${p.ano}-T${p.trimestre}` === refKey);
            const mediaRefDepto = idxRef >= 0 ? deptAvgs[idxRef] : null;

            html += `
            <div class="des-dept-block">
                <div class="des-dept-header">
                    <div class="des-dept-title">
                        <i class="ph ph-buildings" style="color:#7c3aed;font-size:1.2rem;"></i>
                        <span>${escHtml(depto)}</span>
                        <span class="sat-badge" title="Colaboradores avaliados em ${periodoRef ? periodLabel(periodoRef) : ''}">
                            <i class="ph ph-users"></i> ${respRef}/${elegiveisRef.length} respondentes
                        </span>
                        ${gestorNome ? `<span class="sat-badge-gestor" title="Gestor responsável pelo departamento"><i class="ph ph-user-check"></i> Gestor: ${escHtml(gestorNome)}</span>` : ''}
                        ${mediaRefDepto !== null ? `<span class="score-pill" style="background:${scoreBg(mediaRefDepto)};color:${scoreColor(mediaRefDepto)};font-size:.82rem;">Média: ${fmtScore(mediaRefDepto)}</span>` : ''}
                    </div>
                    <div class="des-dept-actions">
                        <button type="button" class="btn-ia-report" data-depto="${escHtml(depto)}" onclick="window._desOpenRelatorioIAModal(this.dataset.depto)">
                            <i class="ph ph-sparkle"></i> Relatório IA & Enviar ao Gestor
                        </button>
                    </div>
                </div>`;

            if (topicos.length === 0) {
                html += `
                <div style="padding:1.4rem 1.25rem;color:#94a3b8;font-size:.85rem;display:flex;align-items:center;gap:.5rem;">
                    <i class="ph ph-info" style="font-size:1.1rem;"></i>
                    Ainda não há avaliações de desempenho tabuladas para <strong>${escHtml(depto)}</strong> nos períodos exibidos.
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
       MODAL: RELATÓRIO IA POR DEPARTAMENTO & ENVIO AO GESTOR (EXCLUSIVO RH)
       ══════════════════════════════════════════════════════════════ */
    let _desIaModalState = { departamento: '', ano: null, trimestre: null };

    window._desOpenRelatorioIAModal = async function (departamento, anoParam = null, trimParam = null) {
        const periodos = _dash?.periodos || [];
        if (periodos.length === 0) {
            alert('Nenhum período de desempenho disponível.');
            return;
        }

        let ano = anoParam;
        let trim = trimParam;
        if (!ano || !trim) {
            if (_selectedPeriodKey) {
                const [y, t] = _selectedPeriodKey.split('-T');
                ano = parseInt(y, 10);
                trim = parseInt(t, 10);
            } else {
                const colabsDepto = (_colabs?.colaboradores || []).filter(c => normDepto(c.departamento) === normDepto(departamento));
                let periodoComResp = null;
                for (let i = periodos.length - 1; i >= 0; i--) {
                    const p = periodos[i];
                    const k = `${p.ano}-T${p.trimestre}`;
                    if (colabsDepto.some(c => c.pesquisas?.[k]?.respondido)) {
                        periodoComResp = p;
                        break;
                    }
                }
                const ult = periodoComResp || periodos[periodos.length - 1];
                ano = ult.ano;
                trim = ult.trimestre;
            }
        }

        _desIaModalState = { departamento, ano, trimestre: trim };

        const existing = document.getElementById('des-ia-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'des-ia-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(3px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;';
        overlay.innerHTML = `
            <div style="background:#fff;border-radius:16px;width:100%;max-width:860px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 45px rgba(0,0,0,0.25);overflow:hidden;">
                <div style="padding:1.25rem 1.75rem;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:1rem;">
                    <div>
                        <h2 style="margin:0;font-size:1.2rem;display:flex;align-items:center;gap:.5rem;color:#fff;">
                            <i class="ph ph-sparkle"></i> Relatório IA de Desempenho — <span>${escHtml(departamento)}</span>
                        </h2>
                        <div style="font-size:.82rem;color:#ede9fe;margin-top:.25rem;">
                            Análise consultiva consolidada do departamento para o gestor (exclusiva do módulo RH)
                        </div>
                    </div>
                    <button type="button" onclick="document.getElementById('des-ia-modal-overlay')?.remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:34px;height:34px;border-radius:8px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">
                        <i class="ph ph-x"></i>
                    </button>
                </div>
                <div style="padding:1.5rem 1.75rem;overflow-y:auto;flex:1;background:#f8fafc;" id="des-ia-modal-body">
                    <div style="display:flex;align-items:center;gap:.75rem;color:#64748b;padding:2rem;justify-content:center;">
                        <div class="spinner-sm"></div> Carregando dados de desempenho do departamento…
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        await carregarDadosModalDesIA();
    };

    async function carregarDadosModalDesIA() {
        const bodyEl = document.getElementById('des-ia-modal-body');
        if (!bodyEl) return;
        const { departamento, ano, trimestre } = _desIaModalState;
        const periodos = _dash?.periodos || [];

        try {
            const data = await fetchJSON(`/avaliacoes/desempenho/relatorio-ia?departamento=${encodeURIComponent(departamento)}&ano=${ano}&trimestre=${trimestre}`);
            const est = data.estatisticas || { total_colaboradores: 0, responderam: 0, media_geral: null, topicos: [], observacoes: [] };
            const gestor = data.gestor || {};
            const relSalvo = data.relatorio || null;

            bodyEl.innerHTML = `
                <div style="display:flex;gap:1rem;align-items:center;justify-content:space-between;flex-wrap:wrap;background:#fff;padding:1rem 1.25rem;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:1.1rem;">
                    <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;">
                        <label style="font-size:.8rem;font-weight:700;color:#475569;text-transform:uppercase;">Período:</label>
                        <select class="des-select" onchange="window._desChangePeriodModalIA(this.value)">
                            ${periodos.slice().reverse().map(p => {
                                const k = `${p.ano}-T${p.trimestre}`;
                                const sel = (p.ano === Number(ano) && p.trimestre === Number(trimestre)) ? 'selected' : '';
                                return `<option value="${k}" ${sel}>${periodLabel(p)}</option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;">
                        <span class="sat-badge"><i class="ph ph-users"></i> ${est.responderam}/${est.total_colaboradores} avaliados</span>
                        <span class="score-pill" style="background:${scoreBg(est.media_geral)};color:${scoreColor(est.media_geral)};font-size:.84rem;">
                            Média do Setor: ${est.media_geral != null ? Number(est.media_geral).toFixed(2) : '—'} / 5.0
                        </span>
                    </div>
                </div>

                ${data.tabela_comparativa_html ? `
                <div style="margin-bottom:1.1rem;">
                    <div style="font-size:.78rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.45rem;display:flex;align-items:center;gap:.4rem;">
                        <i class="ph ph-table" style="color:#7c3aed;font-size:1rem;"></i>
                        Quadro Comparativo de Desempenho (Incluído automaticamente no e-mail ao gestor)
                    </div>
                    ${data.tabela_comparativa_html}
                </div>
                ` : ''}

                <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:.75rem;">
                    <div style="font-size:.85rem;font-weight:700;color:#334155;display:flex;align-items:center;gap:.4rem;">
                        <i class="ph ph-file-text" style="color:#7c3aed;font-size:1.1rem;"></i>
                        Análise Consultiva do Departamento
                    </div>
                    <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
                        <button type="button" id="btn-des-gerar-ia" onclick="window._desGerarRelatorioIA()"
                            ${est.responderam === 0 ? 'disabled title="Nenhuma resposta registrada neste período"' : ''}
                            style="display:inline-flex;align-items:center;gap:.45rem;padding:.55rem 1.05rem;border-radius:8px;border:none;background:${est.responderam === 0 ? '#cbd5e1' : '#7c3aed'};color:#fff;font-size:.82rem;font-weight:700;cursor:${est.responderam === 0 ? 'not-allowed' : 'pointer'};">
                            <i class="ph ph-magic-wand"></i> ${relSalvo ? 'Regerar Análise com IA' : 'Gerar Análise com IA'}
                        </button>
                        <button type="button" id="btn-des-salvar-ia" onclick="window._desSalvarRelatorioIA()"
                            style="display:inline-flex;align-items:center;gap:.4rem;padding:.55rem .95rem;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#334155;font-size:.82rem;font-weight:600;cursor:pointer;">
                            <i class="ph ph-floppy-disk"></i> Salvar Texto
                        </button>
                    </div>
                </div>

                ${est.responderam === 0 ? `
                <div style="padding:1rem 1.25rem;background:#fef9c3;border:1px solid #fde047;border-radius:10px;color:#854d0e;font-size:.84rem;margin-bottom:1rem;">
                    <i class="ph ph-warning-circle"></i> Não há avaliações registradas para <strong>${escHtml(departamento)}</strong> em <strong>${escHtml(data.periodo_label)}</strong>. Selecione outro período acima para analisar os dados já respondidos.
                </div>` : ''}

                <textarea id="des-ia-textarea" rows="13"
                    placeholder="Clique em 'Gerar Análise com IA' acima para que a IA analise os pontos fortes, pontos de melhoria e recomendações de desenvolvimento para este departamento..."
                    style="width:100%;padding:1rem;border-radius:10px;border:1.5px solid #cbd5e1;font-family:'Inter',sans-serif;font-size:.88rem;line-height:1.6;color:#1e293b;background:#fff;resize:vertical;box-sizing:border-box;outline:none;text-transform:none !important;">${escHtml(relSalvo ? relSalvo.relatorio_texto : '')}</textarea>

                <div style="margin-top:1.25rem;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1.1rem 1.25rem;">
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.75rem;">
                        <div style="font-size:.9rem;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:.45rem;">
                            <i class="ph ph-paper-plane-tilt" style="color:#0ea5e9;font-size:1.1rem;"></i>
                            Enviar Avaliação Consolidada para o Gestor do Departamento
                        </div>
                        ${relSalvo && relSalvo.enviado_gestor_em ? `
                            <span style="font-size:.76rem;background:#dcfce7;color:#15803d;padding:.25rem .65rem;border-radius:999px;font-weight:700;">
                                ✓ Enviado para ${escHtml(relSalvo.enviado_para_email || 'gestor')}
                            </span>
                        ` : ''}
                    </div>
                    <div style="display:flex;gap:.85rem;align-items:flex-end;flex-wrap:wrap;">
                        <div style="flex:1;min-width:180px;">
                            <label style="display:block;font-size:.75rem;font-weight:600;color:#64748b;margin-bottom:.3rem;">Gestor Responsável (${escHtml(departamento)})</label>
                            <input type="text" readonly value="${escHtml(gestor.gestor_nome || 'Não vinculado em Departamentos')}"
                                style="width:100%;padding:.52rem .75rem;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-size:.84rem;box-sizing:border-box;text-transform:none !important;">
                        </div>
                        <div style="flex:1.4;min-width:240px;">
                            <label style="display:block;font-size:.75rem;font-weight:600;color:#64748b;margin-bottom:.3rem;">E-mail do Gestor Destinatário</label>
                            <input type="email" id="des-ia-email-gestor"
                                value="${escHtml(gestor.gestor_email || (relSalvo && relSalvo.enviado_para_email) || '')}"
                                placeholder="email.gestor@americarental.com.br"
                                style="width:100%;padding:.52rem .75rem;border-radius:8px;border:1.5px solid #cbd5e1;background:#fff;color:#1e293b;font-size:.84rem;box-sizing:border-box;outline:none;text-transform:none !important;">
                        </div>
                        <button type="button" id="btn-des-enviar-gestor" onclick="window._desEnviarRelatorioGestor()"
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

    window._desChangePeriodModalIA = function (periodKey) {
        if (!periodKey) return;
        const [y, t] = periodKey.split('-T');
        _desIaModalState.ano = parseInt(y, 10);
        _desIaModalState.trimestre = parseInt(t, 10);
        carregarDadosModalDesIA();
    };

    window._desGerarRelatorioIA = async function () {
        const btn = document.getElementById('btn-des-gerar-ia');
        const txt = document.getElementById('des-ia-textarea');
        if (!btn || !txt) return;

        const origHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner-sm" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;"></div> Analisando desempenho com IA…';

        try {
            const res = await fetchJSON('/avaliacoes/desempenho/relatorio-ia', {
                method: 'POST',
                body: JSON.stringify({
                    departamento: _desIaModalState.departamento,
                    ano: _desIaModalState.ano,
                    trimestre: _desIaModalState.trimestre
                })
            });
            txt.value = res.relatorio_texto || '';
        } catch (err) {
            alert('Não foi possível gerar o relatório: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = origHTML;
        }
    };

    window._desSalvarRelatorioIA = async function () {
        const txt = document.getElementById('des-ia-textarea');
        const btn = document.getElementById('btn-des-salvar-ia');
        if (!txt || !txt.value.trim()) {
            alert('O texto do relatório está vazio. Gere ou escreva o relatório antes de salvar.');
            return;
        }
        const orig = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = 'Salvando…'; }
        try {
            await fetchJSON('/avaliacoes/desempenho/relatorio-ia', {
                method: 'PUT',
                body: JSON.stringify({
                    departamento: _desIaModalState.departamento,
                    ano: _desIaModalState.ano,
                    trimestre: _desIaModalState.trimestre,
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

    window._desEnviarRelatorioGestor = async function () {
        const txt = document.getElementById('des-ia-textarea');
        const emailInp = document.getElementById('des-ia-email-gestor');
        const btn = document.getElementById('btn-des-enviar-gestor');

        const relatorio_texto = txt ? txt.value.trim() : '';
        const email_destino = emailInp ? emailInp.value.trim() : '';

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
            const r = await fetchJSON('/avaliacoes/desempenho/enviar-gestor', {
                method: 'POST',
                body: JSON.stringify({
                    departamento: _desIaModalState.departamento,
                    ano: _desIaModalState.ano,
                    trimestre: _desIaModalState.trimestre,
                    relatorio_texto,
                    email_destino
                })
            });
            if (r.relatorio_texto && txt && !txt.value.trim()) {
                txt.value = r.relatorio_texto;
            }
            if (r.ano && r.trimestre) {
                _desIaModalState.ano = r.ano;
                _desIaModalState.trimestre = r.trimestre;
            }
            if (typeof Swal !== 'undefined') {
                await Swal.fire({
                    icon: 'success',
                    title: 'Relatório de Desempenho enviado!',
                    html: `O relatório consolidado do departamento <b>${escHtml(_desIaModalState.departamento)}</b> foi enviado para:<br><b>${escHtml(r.enviado_para)}</b>`,
                    confirmButtonColor: '#7c3aed'
                });
            } else {
                alert(`Relatório de Desempenho do departamento "${_desIaModalState.departamento}" enviado com sucesso para ${r.enviado_para}!`);
            }
            await carregarDadosModalDesIA();
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
       ABA 2: COLABORADORES (HISTÓRICO INDIVIDUAL & FORMULÁRIO)
       ══════════════════════════════════════════════════════════════ */
    function renderColaboradoresSection() {
        const deptos = getAllDepartamentos();
        return `
        <div class="sat-search-bar">
            <div style="display:flex;align-items:center;gap:.5rem;flex:1;min-width:220px;">
                <i class="ph ph-magnifying-glass" style="color:#94a3b8;font-size:1.1rem;"></i>
                <input class="sat-search-input" id="sat-colab-search"
                    value="${escHtml(_searchText)}"
                    placeholder="Filtrar por nome, departamento ou cargo…"
                    oninput="window._desFilterColabs()" />
            </div>
            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
                <span class="des-filter-label"><i class="ph ph-buildings" style="color:#7c3aed;"></i> Departamento:</span>
                <select class="des-select" id="des-colab-dept-select" onchange="window._desFilterColabs()">
                    <option value="all" ${_filterDeptColabs === 'all' ? 'selected' : ''}>Todos os departamentos (${deptos.length})</option>
                    ${deptos.map(d => `<option value="${escHtml(d)}" ${_filterDeptColabs === d ? 'selected' : ''}>${escHtml(d)}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="sat-legend" style="margin-bottom:.75rem;">
            <div class="sat-legend-item"><div class="sat-legend-dot" style="background:#e2e8f0;"></div>Não estava admitido na época</div>
            <div class="sat-legend-item"><div class="sat-legend-dot" style="background:#fef9c3;border:1px solid #fbbf24;"></div>Pendente</div>
        </div>
        <div class="des-dept-block" id="sat-colab-table-wrap">
            ${renderColabTable()}
        </div>
        `;
    }

    function renderColabTable() {
        const periodos = _colabs?.periodos || [];
        const colabs = getFilteredColabs();

        if (colabs.length === 0) {
            return '<div class="no-data-box" style="padding:2rem;border:none;"><i class="ph ph-users"></i><p>Nenhum colaborador encontrado.</p></div>';
        }

        const responderam = colabs.filter(c => {
            const lastKey = periodos.length > 0 ? `${periodos[periodos.length - 1].ano}-T${periodos[periodos.length - 1].trimestre}` : null;
            return lastKey && c.pesquisas?.[lastKey]?.respondido;
        }).length;

        return `
        <div style="padding:.65rem 1rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:.8rem;color:#64748b;">
            Mostrando <strong>${colabs.length}</strong> colaboradores —
            <span style="color:#16a34a;font-weight:700;">${responderam} responderam</span> no último período,
            <span style="color:#d97706;font-weight:700;">${colabs.length - responderam} pendentes</span>
        </div>
        <div class="sat-table-wrap">
            <table class="sat-table" id="sat-colab-table">
                <thead><tr>
                    <th style="cursor:pointer;" onclick="window._desSortColabs('nome_completo')">Colaborador ${_sortCol === 'nome_completo' ? (_sortDir > 0 ? '▲' : '▼') : ''}</th>
                    <th style="cursor:pointer;" onclick="window._desSortColabs('departamento')">Departamento ${_sortCol === 'departamento' ? (_sortDir > 0 ? '▲' : '▼') : ''}</th>
                    ${periodos.map(p => `<th style="text-align:center;">${periodLabel(p)}</th>`).join('')}
                    <th style="text-align:center;width:120px;">Ações</th>
                </tr></thead>
                ${colabs.map(c => renderColabRow(c, periodos)).join('')}
            </table>
        </div>`;
    }

    function renderColabRow(c, periodos) {
        const lastKey = periodos.length > 0 ? `${periodos[periodos.length - 1].ano}-T${periodos[periodos.length - 1].trimestre}` : null;
        const lastP = lastKey ? c.pesquisas?.[lastKey] : null;

        return `<tbody class="sat-colab-group"><tr>
            <td>
                <div class="sat-avatar-cell">
                    <button class="btn-sat-toggle-history" onclick="window._desToggleHistory(this)" style="background:transparent;border:none;cursor:pointer;padding:0.2rem;margin-right:0.25rem;display:flex;align-items:center;justify-content:center;color:#64748b;transition:transform 0.2s;"><i class="ph ph-caret-right" style="font-size:1.1rem;font-weight:bold;"></i></button>
                    ${avatarHTML(c)}
                    <div>
                        <div style="font-weight:600;color:#1e293b;font-size:.84rem;" title="${escHtml(c.nome_completo)}">${escHtml(c.nome_completo)}</div>
                        <div style="color:#94a3b8;font-size:.73rem;">${escHtml(c.cargo || '—')}</div>
                    </div>
                </div>
            </td>
            <td style="color:#64748b;font-size:.82rem;">
                <div style="font-weight:700;color:#334155;">${escHtml(c.departamento || '—')}</div>
                ${c.responsavel_nome ? `<div style="font-size:.72rem;color:#94a3b8;margin-top:2px;">${escHtml(c.responsavel_nome)}</div>` : ''}
            </td>
            ${periodos.map(p => {
                const key = `${p.ano}-T${p.trimestre}`;
                const ps = c.pesquisas?.[key];
                if (!ps) return `<td style="text-align:center;color:#94a3b8;">—</td>`;
                if (ps.nao_admitido && !ps.respondido) {
                    return `<td style="text-align:center;background:#f8fafc;"><span style="color:#94a3b8;font-size:.75rem;font-weight:600;">N/A</span></td>`;
                }
                if (!ps.respondido) {
                    return `<td style="text-align:center;"><span style="background:#fef9c3;color:#92400e;border:1px solid #fde047;padding:.2rem .55rem;border-radius:999px;font-size:.74rem;font-weight:700;">Pendente</span></td>`;
                }
                return `<td style="text-align:center;">
                    <span class="score-pill" style="background:${scoreBg(ps.media)};color:${scoreColor(ps.media)};">${fmtScore(ps.media)}</span>
                </td>`;
            }).join('')}
            <td style="text-align:center;">
                <div style="display:flex;gap:4px;justify-content:center;align-items:center;flex-wrap:wrap;">
                <button
                    data-colab-id="${c.id}"
                    data-colab-nome="${escHtml(c.nome_completo || '')}"
                    data-colab-cargo="${escHtml(c.cargo || '')}"
                    data-colab-dept="${escHtml(c.departamento || '')}"
                    data-respostas="${lastP && lastP.respostas ? btoa(unescape(encodeURIComponent(JSON.stringify(lastP.respostas)))) : ''}"
                    data-ano="${lastKey ? lastKey.split('-T')[0] : ''}"
                    data-trim="${lastKey ? lastKey.split('-T')[1] : ''}"
                    onclick="window._desOpenFormBtn(this)"
                    style="background:${lastP && lastP.respondido ? '#0ea5e9' : '#7c3aed'};color:#fff;border:none;border-radius:6px;padding:0.35rem 0.6rem;font-size:0.75rem;cursor:pointer;font-weight:600;">
                    <i class="ph ph-pencil-simple" style="margin-right:4px;"></i>${lastP && lastP.respondido ? 'Editar' : 'Responder'}
                </button>
                ${lastP && lastP.respondido && (lastP.pdf_url && lastP.pdf_url !== 'null' && lastP.pdf_url !== 'undefined') ? `
                <button
                    onclick="window.open('${escHtml(lastP.pdf_url)}', '_blank')"
                    title="Ver PDF do Feedback Assinado"
                    style="background:#0f4c81;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.6rem;font-size:0.75rem;cursor:pointer;font-weight:600;">
                    <i class="ph ph-eye"></i>
                </button>` : ''}
                </div>
            </td>
        </tr>
        <tr class="sat-history-row" style="display:none;background:#f8fafc;">
            <td colspan="100%" style="padding:0.75rem 1.5rem 1rem;border-bottom:1px solid #e2e8f0;box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1rem 1.25rem;">
                    <div style="font-weight:700;font-size:0.85rem;color:#334155;margin-bottom:0.75rem;display:flex;align-items:center;gap:0.4rem;">
                        <i class="ph ph-chart-line-up" style="color:#7c3aed;"></i> Histórico de Respostas por Período
                    </div>
                    ${(() => {
                        const grupo = window.matchTemplateGroup('desempenho', c.departamento, c.cargo);
                        const perguntasGroup = window.AVALIACAO_QUESTIONS && window.AVALIACAO_QUESTIONS.desempenho ? window.AVALIACAO_QUESTIONS.desempenho[grupo] : null;

                        if (!perguntasGroup) {
                            return '<div style="text-align:center;padding:1.5rem;color:#94a3b8;font-style:italic;font-size:0.82rem;">Nenhum formulário ou template de perguntas encontrado.</div>';
                        }

                        const periodosData = periodos.map(p => {
                            const key = `${p.ano}-T${p.trimestre}`;
                            const ps = c.pesquisas?.[key];
                            if (!ps || !ps.respondido) return { ...p, notas: {}, media: null, hasDetails: false };

                            let respostasObj = ps.respostas;
                            if (typeof respostasObj === 'string') {
                                try { respostasObj = JSON.parse(respostasObj); } catch (e) { respostasObj = null; }
                            }

                            let notas = {};
                            let hasDetails = false;

                            if (respostasObj && typeof respostasObj === 'object') {
                                const isGrouped = Object.keys(respostasObj).some(k => !k.startsWith('__') && k !== 'info_adicional' && k !== 'scores' && typeof respostasObj[k] === 'object' && respostasObj[k] !== null);
                                if (isGrouped) {
                                    hasDetails = true;
                                    Object.entries(respostasObj).forEach(([cat, notasObj]) => {
                                        if (cat.startsWith('__') || cat === 'info_adicional' || cat === 'scores') return;
                                        if (typeof notasObj !== 'object' || notasObj === null) return;
                                        if (!notas[cat]) notas[cat] = {};
                                        Object.entries(notasObj).forEach(([idxStr, n]) => {
                                            const idx = parseInt(idxStr, 10);
                                            notas[cat][idx] = n;
                                        });
                                    });
                                }
                            }

                            return { ...p, notas, media: ps.media, hasDetails };
                        });

                        const hasAnyResponse = periodosData.some(pd => pd.media !== null);
                        if (!hasAnyResponse) {
                            return '<div style="text-align:center;padding:1.5rem;color:#94a3b8;font-style:italic;font-size:0.82rem;">Nenhum formulário preenchido nos períodos anteriores.</div>';
                        }

                        let theadHtml = `<tr>
                            <th style="text-align:left;color:#64748b;font-weight:600;font-size:0.8rem;padding:8px 12px;border-bottom:2px solid #e2e8f0;width:50%;">Perguntas</th>`;
                        periodos.forEach(p => {
                            theadHtml += `<th style="text-align:center;color:#64748b;font-weight:600;font-size:0.8rem;padding:8px 12px;border-bottom:2px solid #e2e8f0;width:12%;">${periodLabel(p)}</th>`;
                        });
                        theadHtml += '</tr>';

                        let tbodyHtml = '';
                        Object.entries(perguntasGroup).forEach(([cat, questions]) => {
                            if (!questions || questions.length === 0) return;
                            tbodyHtml += `<tr>
                                <td colspan="${periodos.length + 1}" style="padding:10px 12px 4px 12px;">
                                    <div style="font-weight:800;font-size:0.75rem;text-transform:uppercase;letter-spacing:.05em;color:#7c3aed;">${escHtml(cat)}</div>
                                </td>
                            </tr>`;

                            questions.forEach((qText, idx) => {
                                if (!qText || !qText.trim()) return;
                                tbodyHtml += `<tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:6px 12px;font-size:0.78rem;color:#334155;line-height:1.35;">${escHtml(qText)}</td>`;

                                periodosData.forEach(pd => {
                                    let nVal = '—';
                                    let nColor = '#cbd5e1';
                                    let nBg = 'transparent';

                                    if (pd.media !== null) {
                                        if (pd.hasDetails && pd.notas[cat] && pd.notas[cat][idx] !== undefined) {
                                            const v = pd.notas[cat][idx];
                                            nVal = (v !== null && v !== undefined) ? v : '—';
                                            const m = parseFloat(v);
                                            if (!isNaN(m)) {
                                                nColor = scoreColor(m);
                                                nBg = scoreBg(m);
                                            } else {
                                                nColor = '#475569';
                                            }
                                        } else if (!pd.hasDetails) {
                                            nVal = '<span style="font-size:0.7rem;color:#94a3b8;" title="Sem detalhes">S/D</span>';
                                        }
                                    }

                                    const nValStr = String(nVal);
                                    const pillStyle = nVal !== '—' && nValStr.indexOf('<span') === -1
                                        ? `background:${nBg};color:${nColor};font-weight:700;font-size:0.82rem;padding:2px 8px;border-radius:12px;display:inline-block;min-width:28px;`
                                        : `color:#cbd5e1;`;

                                    tbodyHtml += `<td style="text-align:center;padding:6px 12px;">
                                        <span style="${pillStyle}">${nVal}</span>
                                    </td>`;
                                });

                                tbodyHtml += '</tr>';
                            });
                        });

                        tbodyHtml += `<tr style="background:#f8fafc;border-top:2px solid #e2e8f0;">
                            <td style="text-align:right;padding:10px 12px;font-weight:700;font-size:0.8rem;color:#334155;">Média Geral:</td>`;
                        periodosData.forEach(pd => {
                            if (pd.media !== null) {
                                tbodyHtml += `<td style="text-align:center;padding:10px 12px;">
                                    <span class="score-pill" style="background:${scoreBg(pd.media)};color:${scoreColor(pd.media)};font-size:0.8rem;font-weight:800;">${fmtScore(pd.media)}</span>
                                </td>`;
                            } else {
                                tbodyHtml += `<td style="text-align:center;padding:10px 12px;color:#cbd5e1;">—</td>`;
                            }
                        });
                        tbodyHtml += '</tr>';

                        return `
                        <div style="border:1px solid #e2e8f0;border-radius:8px;overflow-x:auto;">
                            <table style="width:100%;border-collapse:collapse;">
                                <thead>${theadHtml}</thead>
                                <tbody>${tbodyHtml}</tbody>
                            </table>
                        </div>`;
                    })()}
                </div>
            </td>
        </tr></tbody>`;
    }

    window._desToggleHistory = function (btn) {
        const tbody = btn.closest('tbody');
        const historyRow = tbody.querySelector('.sat-history-row');
        const icon = btn.querySelector('i');
        if (historyRow.style.display === 'none') {
            historyRow.style.display = 'table-row';
            icon.style.transform = 'rotate(90deg)';
        } else {
            historyRow.style.display = 'none';
            icon.style.transform = 'rotate(0deg)';
        }
    };

    function getFilteredColabs() {
        let colabs = (_colabs?.colaboradores || []).slice();
        if (_filterDeptColabs && _filterDeptColabs !== 'all') {
            colabs = colabs.filter(c => normDepto(c.departamento) === _filterDeptColabs);
        }
        if (_searchText) {
            const normalize = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const q = normalize(_searchText);
            colabs = colabs.filter(c =>
                normalize(c.nome_completo).includes(q) ||
                normalize(c.departamento).includes(q) ||
                normalize(c.cargo).includes(q) ||
                normalize(c.responsavel_nome).includes(q)
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

    window._desFilterColabs = function () {
        _searchText = document.getElementById('sat-colab-search')?.value || '';
        _filterDeptColabs = document.getElementById('des-colab-dept-select')?.value || 'all';
        const wrap = document.getElementById('sat-colab-table-wrap');
        if (wrap) wrap.innerHTML = renderColabTable();
    };

    window._desSortColabs = function (col) {
        if (_sortCol === col) _sortDir *= -1;
        else { _sortCol = col; _sortDir = 1; }
        const wrap = document.getElementById('sat-colab-table-wrap');
        if (wrap) wrap.innerHTML = renderColabTable();
    };

    /* ── FORMULÁRIO INDIVIDUAL DE DESEMPENHO ─────────────────── */
    window._desRhRbtnClick = function (el, isReadonly) {
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
    };

    window._desOpenFormBtn = function (btn, isReadonly = false) {
        const id = parseInt(btn.dataset.colabId, 10);
        const nome = btn.dataset.colabNome;
        const cargo = btn.dataset.colabCargo;
        const dept = btn.dataset.colabDept;
        let saved = {};

        try {
            const raw = btn.dataset.respostas || btn.dataset.saved || '';
            if (raw) {
                try {
                    saved = JSON.parse(decodeURIComponent(escape(atob(raw))));
                } catch (e1) {
                    try { saved = JSON.parse(raw); } catch (e2) { /* ignore */ }
                }
            }
        } catch (e) { saved = {}; }

        const ano = btn.dataset.ano;
        const trim = btn.dataset.trim;
        window._desOpenForm(id, nome, cargo, dept, saved, isReadonly, ano, trim);
    };

    window._desOpenForm = function (colabId, nome, cargo, dept, saved = {}, isReadonly = false, ano = null, trim = null) {
        if (!window.AVALIACAO_QUESTIONS || !window.AVALIACAO_QUESTIONS.desempenho) {
            alert('Erro: Perguntas de desempenho não carregadas.');
            return;
        }
        if (typeof saved === 'string') {
            try { saved = JSON.parse(saved); } catch (e) { saved = {}; }
        }
        if (saved && saved.scores && typeof saved.scores === 'object') {
            saved = {};
        }
        if (!saved.__obs__) saved.__obs__ = {};

        const grupo = grupoFromDeptCargo(dept, cargo);
        const perguntasGroup = window.AVALIACAO_QUESTIONS.desempenho[grupo];
        if (!perguntasGroup) {
            alert('Erro: Perguntas não encontradas para o grupo "' + grupo + '".');
            return;
        }

        let html = `<div id="sat-modal-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(3px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;">
            <div style="background:#fff;border-radius:14px;width:100%;max-width:98%;height:90vh;display:flex;flex-direction:column;box-shadow:0 10px 25px rgba(0,0,0,0.2);animation: satModalFadeIn 0.2s ease-out;">
                <div style="padding:1.5rem 2rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#0f4c81;color:#fff;border-radius:14px 14px 0 0;">
                    <div>
                        <h2 style="margin:0;font-size:1.25rem;color:#fff;"><i class="ph ph-trend-up" style="color:#cffafe;margin-right:.5rem;"></i>Avaliação de Desempenho</h2>
                        <div style="color:#e0f2fe;font-size:0.85rem;margin-top:0.3rem;"><strong>${escHtml(nome)}</strong> — ${escHtml(cargo || dept)}</div>
                    </div>
                    <button onclick="window._desCloseForm()" style="background:none;border:none;font-size:1.5rem;color:#fff;cursor:pointer;transition:color 0.2s;"><i class="ph ph-x"></i></button>
                </div>
                
                <div style="padding:2rem;overflow-y:auto;flex:1;background:#f8fafc;" id="sat-form-body">
                    <p style="margin-top:0; margin-bottom:1.5rem; color:#0f4c81; font-size:1.05rem; font-weight:700; background:#e0f2fe; padding:12px 16px; border-radius:8px; border-left:5px solid #0ea5e9; box-shadow:0 2px 4px rgba(14,165,233,0.15);">
                        Avalie cada critério (1 Muito ruim - 2 Ruim - 3 Médio - 4 Bom - 5 Muito bom) e adicione uma observação caso aplicável.
                    </p>
                    <style>
                        @keyframes satModalFadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                    </style>
                    <form id="sat-modal-form" onsubmit="window._desSubmitForm(event, ${colabId}, '${grupo}', ${ano}, ${trim})">`;

        let catIdx = 0;
        Object.keys(perguntasGroup).forEach(topico => {
            html += `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:1.5rem; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="background:#f1f5f9; padding:0.75rem 1rem; border-bottom:1px solid #e2e8f0;">
                    <span style="font-weight:700; color:#334155;">${catIdx + 1}. ${escHtml(topico)}</span>
                </div>
                <div style="padding:1rem;">
            `;

            perguntasGroup[topico].forEach((pergunta, idx) => {
                if (!pergunta || !pergunta.trim()) return;
                const topicoSaved = saved[topico];
                const val = topicoSaved != null ? (topicoSaved[idx] ?? topicoSaved[String(idx)] ?? null) : null;
                const obsSaved = saved.__obs__ && saved.__obs__[topico] ? saved.__obs__[topico] : {};
                const obsStr = (obsSaved[idx] ?? obsSaved[String(idx)]) || '';
                html += `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:1.5rem; padding:0.75rem 0; border-bottom:1px dashed #e2e8f0; flex-wrap:wrap;">
                    <div style="width:30%; min-width:250px; font-size:0.95rem; color:#475569; font-weight:500;">${escHtml(pergunta)}</div>
                    <div style="flex:1; display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                        <div style="display:flex; gap:0.35rem; flex-shrink:0;">
                `;

                const qColors = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#84cc16', 5: '#22c55e' };

                for (let v = 1; v <= 5; v++) {
                    const c = qColors[v];
                    const isChecked = (val != null && parseInt(val, 10) === v);
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
                             onclick="window._desRhRbtnClick(this, ${isReadonly ? 'true' : 'false'})">
                            ${v}
                        </div>
                    </label>`;
                }

                html += `
                        </div>
                        <input type="text" name="av_obs_${catIdx}_${idx}" value="${escHtml(obsStr)}" ${isReadonly ? 'disabled' : ''} placeholder="Observação (opcional)..." style="flex:1; min-width:250px; padding:0.4rem 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; outline:none; color:#334155; height:32px; box-sizing:border-box; text-transform:none !important;">
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
                            <textarea name="info_adicional" ${isReadonly ? 'disabled' : ''} rows="2" style="width:100%;padding:0.75rem;border-radius:6px;border:1px solid #cbd5e1;font-size:0.9rem;font-family:inherit;resize:vertical;text-transform:none !important;" placeholder="Observações, feedback extra...">${escHtml(infoAdic)}</textarea>
                        </div>
                        
                        <div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:2rem;">
                            <button type="button" onclick="window._desCloseForm()" style="padding:0.75rem 1.5rem;border-radius:8px;font-weight:600;border:1px solid #cbd5e1;background:#fff;color:#64748b;cursor:pointer;">Cancelar</button>
                            ${isReadonly ? '' : `<button type="button" id="btn-gerar-ia" onclick="window.gerarFeedbackIA(document.getElementById('sat-modal-form'))" style="padding:0.75rem 1.5rem;border-radius:8px;font-weight:600;border:1px solid #a855f7;background:#f3e8ff;color:#9333ea;cursor:pointer;display:flex;align-items:center;gap:0.5rem;"><i class="ph ph-sparkle"></i> Gerar Texto com IA</button>`}
                            ${isReadonly ? '' : `<button type="submit" id="sat-btn-submit" style="padding:0.75rem 1.5rem;border-radius:8px;font-weight:600;border:none;background:#0f4c81;color:#fff;cursor:pointer;display:flex;align-items:center;gap:0.5rem;box-shadow:0 2px 4px rgba(15,76,129,0.3);"><i class="ph ph-check-circle"></i> Salvar Respostas</button>`}
                        </div>
                    </form>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', html);
    };

    window._desCloseForm = function () {
        const overlay = document.getElementById('sat-modal-overlay');
        if (overlay) overlay.remove();
    };

    window._desSubmitForm = async function (e, colabId, grupo, refAno, refTrim) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = document.getElementById('sat-btn-submit');

        const currentYear = refAno || new Date().getFullYear();
        const currentQ = refTrim || Math.floor(new Date().getMonth() / 3) + 1;

        const respostas = { __obs__: {} };
        const perguntasGroup = window.AVALIACAO_QUESTIONS.desempenho[grupo];
        const categories = Object.keys(perguntasGroup);

        categories.forEach((cat, catIdx) => {
            respostas[cat] = [];
            respostas.__obs__[cat] = [];
            perguntasGroup[cat].forEach((q, i) => {
                if (!q || !q.trim()) { respostas[cat].push(null); respostas.__obs__[cat].push(''); return; }
                const rads = form.elements[`av_${catIdx}_${i}`];
                const selected = rads && rads.length ? Array.from(rads).find(r => r.checked) : null;
                if (selected) {
                    respostas[cat].push(parseInt(selected.value, 10));
                } else {
                    respostas[cat].push(null);
                }
                const obs = form.elements[`av_obs_${catIdx}_${i}`];
                respostas.__obs__[cat].push((obs && obs.value.trim()) ? obs.value.trim() : '');
            });
            if (respostas.__obs__[cat].every(v => v === '')) delete respostas.__obs__[cat];
        });

        const infoAdicional = form.elements['info_adicional']?.value;
        if (infoAdicional) { respostas.__obs__.info_adicional = infoAdicional.trim(); respostas.__obs_gerais__ = infoAdicional.trim(); }

        try {
            submitBtn.innerHTML = '<div class="spinner-sm" style="border-color:#c4b5fd;border-top-color:#fff;"></div> Salvando...';
            submitBtn.disabled = true;

            const r = await fetch(API.replace('/api', '') + '/api/avaliacoes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token'))
                },
                body: JSON.stringify({
                    colaborador_id: colabId,
                    tipo: 'desempenho',
                    ano: currentYear,
                    trimestre: currentQ,
                    respostas_json: JSON.stringify(respostas)
                })
            });

            if (!r.ok) throw new Error(await r.text());

            alert('Avaliação salva com sucesso!');
            window._desCloseForm();

            if (typeof window.initDesempenhoRH === 'function') window.initDesempenhoRH(true);
        } catch (err) {
            alert('Erro ao salvar avaliação: ' + err.message);
            submitBtn.innerHTML = '<i class="ph ph-check-circle"></i> Salvar Respostas';
            submitBtn.disabled = false;
        }
    };

    window._desRhExcluirAvaliacao = async function (colabId, ano, trimestre) {
        if (!confirm('Tem certeza que deseja excluir esta avaliação de desempenho e recomeçar?\n\nIsso apagará o formulário respondido e o PDF gerado (se houver).')) return;

        try {
            const tok = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
            const r = await fetch(`${API}/avaliacoes/desempenho/${colabId}/${ano}/${trimestre}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${tok}` }
            });
            if (!r.ok) throw new Error(await r.text());

            alert('Avaliação excluída com sucesso.');
            if (typeof window.initDesempenhoRH === 'function') window.initDesempenhoRH(true);
        } catch (e) {
            alert('Erro ao excluir avaliação: ' + e.message);
        }
    };
})();
