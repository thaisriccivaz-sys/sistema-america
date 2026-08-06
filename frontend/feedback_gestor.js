/* ============================================================
   desempenho_rh.js — Dashboard de Desempenho dos Colaboradores
   ============================================================ */
'use strict';

(function () {
    const API = window.API_URL || '';

    /* ── helpers ─────────────────────────────────────────────── */
    function authHeaders() {
        const tok = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || sessionStorage.getItem('erp_token') || sessionStorage.getItem('token') || '';
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` };
    }

    async function fetchJSON(url) {
        const r = await fetch(API + url, { headers: authHeaders(), cache: 'no-store' });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }

    function scoreColor(v) {
        if (v === null || v === undefined) return '#94a3b8';
        if (v >= 4) return '#22c55e';
        if (v >= 3) return '#f59e0b';
        return '#ef4444';
    }
    function scoreBg(v) {
        if (v === null || v === undefined) return 'rgba(148,163,184,.12)';
        if (v >= 4) return 'rgba(34,197,94,.13)';
        if (v >= 3) return 'rgba(245,158,11,.13)';
        return 'rgba(239,68,68,.13)';
    }
    function trendIcon(arr, i) {
        if (i === 0 || arr[i - 1] === null || arr[i] === null) return '';
        const diff = arr[i] - arr[i - 1];
        if (Math.abs(diff) < 0.1) return '<span style="color:#94a3b8">→</span>';
        return diff > 0
            ? '<span style="color:#22c55e">▲</span>'
            : '<span style="color:#ef4444">▼</span>';
    }
    function avatarHTML(col, size = 36) {
        const initials = (col.nome_completo || '?').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
        const fotoSrc = col.foto_base64 || (col.foto_path ? `${API_URL.replace('/api', '')}/${col.foto_path}` : null);
        if (fotoSrc) {
            const finalSrc = fotoSrc.startsWith('data:') || fotoSrc.startsWith('http') || fotoSrc.startsWith('/') ? fotoSrc : `data:image/jpeg;base64,${fotoSrc}`;
            return `<img src="${finalSrc}" alt="${initials}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;">`;
        }
        const colors = ['#7c3aed','#0ea5e9','#f59e0b','#10b981','#ef4444','#ec4899'];
        const bg = colors[(col.nome_completo||'').charCodeAt(0) % colors.length];
        return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;color:#fff;font-size:${Math.round(size*0.38)}px;font-weight:700;flex-shrink:0;">${initials}</div>`;
    }
    function fmtScore(v) {
        return v !== null && v !== undefined ? v.toFixed(1) : '—';
    }
    function periodLabel(p) {
        const mesNome = { 1: 'Janeiro', 2: 'Abril', 3: 'Julho', 4: 'Setembro' }[p.trimestre] || `T${p.trimestre}`;
        return `${mesNome} (${p.trimestre}º Trim. ${p.ano})`;
    }
    function grupoLabel(g) {
        return { escritorio: 'Escritório', motorista: 'Motoristas', manutencao: 'Manutenção' }[g] || g;
    }

    /* ── STATE ───────────────────────────────────────────────── */
    let _dash = null;   // { periodos, dashboard, contagens }
    let _colabs = null; // { periodos, colaboradores }
    let _filterGroup = 'all';
    let _searchText = '';
    let _sortCol = null;
    let _sortDir = 1;

    /* ── MAIN INIT ───────────────────────────────────────────── */
    window.initFeedbackGestor = async function () {
        const container = document.getElementById('feedback-gestor-container');
        if (!container) return;
        container.innerHTML = '<div style="display:flex;align-items:center;gap:1rem;padding:2rem;color:#94a3b8;"><div class="spinner-sm"></div> Carregando dados de desempenho…</div>';

        try {
            // Busca departamentos diretamente para garantir que temos os dados corretos,
            // independente da ordem de carregamento assíncrono de _myManagedDeptsGlob
            let myDepts = window._myManagedDeptsGlob;
            if (!myDepts || myDepts.length === 0) {
                try {
                    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                    const deptsRes = await fetch('/api/departamentos', { headers: { 'Authorization': `Bearer ${token}` } });
                    const depts = deptsRes.ok ? await deptsRes.json() : [];

                    let cUserId = null, cNome = '';
                    try {
                        const erpUser = JSON.parse(localStorage.getItem('erp_user') || '{}');
                        cUserId = String(erpUser.id || '');
                        cNome = (erpUser.nome || erpUser.username || '').toLowerCase().trim();
                    } catch(e) {}

                    const cleanStr = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
                    const managed = depts.filter(d => {
                        const gestorId = d.responsavel_id ? String(d.responsavel_id) : null;
                        const gestorNome = cleanStr(d.responsavel_nome);
                        const meuNome = cleanStr(cNome);
                        return (gestorId && cUserId && gestorId === cUserId) ||
                               (gestorNome && meuNome && meuNome.length > 3 &&
                                (gestorNome === meuNome || gestorNome.includes(meuNome) || meuNome.includes(gestorNome)));
                    });
                    myDepts = managed.map(d => d.nome);
                    // Salva para uso futuro
                    window._myManagedDeptsGlob = myDepts;
                } catch(e) { myDepts = []; }
            }

            const [dash, colabs] = await Promise.all([
                fetchJSON('/api/avaliacoes/desempenho/dashboard?_t=' + Date.now()),
                fetchJSON('/api/avaliacoes/desempenho/colaboradores?_t=' + Date.now()),
            ]);
            
            if (window.isTopAdmin) {
                _colabs = colabs;
            } else {
                _colabs = {
                    ...colabs,
                    colaboradores: (colabs.colaboradores || []).filter(c => myDepts.includes(c.departamento))
                };
            }
            _dash = dash;
        } catch (e) {
            container.innerHTML = `<div style="padding:2rem;color:#ef4444;">Erro ao carregar: ${e.message}</div>`;
            return;
        }

        render(container);
    };

    /* ── RENDER ──────────────────────────────────────────────── */
    function render(container) {
        const periodos = _dash.periodos || [];  // [{ano, trimestre}] crescente
        const hasData = periodos.length > 0;

        container.innerHTML = `
        <style>
        #sat-root { font-family:'Inter',sans-serif; padding:1.5rem 2rem 3rem; color:#1e293b; }
        #sat-root h1 { font-size:1.6rem;font-weight:700;margin:0 0 0.25rem; }
        #sat-root .sub { color:#64748b;font-size:.9rem;margin:0 0 1.75rem; }

        /* overview cards */
        .sat-cards { display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.75rem; }
        .sat-card { background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1.1rem 1.4rem;min-width:160px;flex:1; box-shadow:0 1px 3px rgba(0,0,0,.06); }
        .sat-card .sc-label { font-size:.73rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:.35rem; }
        .sat-card .sc-val { font-size:2rem;font-weight:800;line-height:1; }
        .sat-card .sc-sub { font-size:.78rem;color:#94a3b8;margin-top:.3rem; }

        /* tabs / group filter */
        .sat-tabs { display:flex;gap:.5rem;margin-bottom:1.5rem;flex-wrap:wrap; }
        .sat-tab { padding:.45rem 1.1rem;border-radius:999px;font-size:.83rem;font-weight:600;cursor:pointer;border:1.5px solid #e2e8f0;background:#f8fafc;color:#64748b;transition:all .15s; }
        .sat-tab.active { background:#7c3aed;border-color:#7c3aed;color:#fff; }

        /* dashboard table */
        .sat-section-title { font-size:1rem;font-weight:700;color:#334155;margin:1.5rem 0 .7rem; display:flex;align-items:center;gap:.5rem; }
        .sat-table-wrap { overflow-x:auto;border-radius:12px;border:1px solid #e2e8f0;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.05);margin-bottom:2rem; }
        .sat-table { width:100%;border-collapse:collapse;min-width:520px; }
        .sat-table th { background:#f8fafc;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;padding:.65rem 1rem;border-bottom:1px solid #e2e8f0;white-space:nowrap;cursor:pointer;user-select:none; }
        .sat-table th:hover { color:#7c3aed; }
        .sat-table td { padding:.65rem 1rem;font-size:.83rem;border-bottom:1px solid #f1f5f9;vertical-align:middle; }
        .sat-table tr:last-child td { border-bottom:none; }
        .sat-table tr:hover td { background:#f8fafc; }
        .score-pill { display:inline-flex;align-items:center;justify-content:center;min-width:46px;padding:.2rem .55rem;border-radius:999px;font-size:.8rem;font-weight:700; }

        /* colabs table */
        .sat-search-bar { display:flex;gap:.75rem;align-items:center;margin-bottom:.8rem;flex-wrap:wrap; }
        .sat-search-input { padding:.5rem .9rem;border-radius:8px;border:1.5px solid #e2e8f0;font-size:.83rem;flex:1;min-width:180px;outline:none;transition:border-color .15s; }
        .sat-search-input:focus { border-color:#7c3aed; }
        .sat-badge { display:inline-flex;align-items:center;gap:.35rem;background:#ede9fe;color:#7c3aed;border-radius:8px;padding:.25rem .7rem;font-size:.75rem;font-weight:600; }
        .sat-avatar-cell { display:flex;align-items:center;gap:.6rem; }

        /* legend */
        .sat-legend { display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1rem; }
        .sat-legend-item { display:flex;align-items:center;gap:.4rem;font-size:.75rem;color:#64748b; }
        .sat-legend-dot { width:10px;height:10px;border-radius:50%; }

        /* trend mini bar */
        .trend-bar-wrap { display:flex;align-items:center;gap:2px; }
        .trend-bar-seg { width:18px;height:24px;border-radius:3px;display:flex;align-items:flex-end;overflow:hidden; }
        .trend-bar-inner { width:100%;border-radius:3px;transition:height .3s; }

        /* no-data */
        .no-data-box { text-align:center;padding:3rem 1rem;color:#94a3b8; }
        .no-data-box i { font-size:3.5rem;display:block;margin-bottom:1rem;color:#e2e8f0; }

        /* spinner */
        .spinner-sm { width:22px;height:22px;border:3px solid #e2e8f0;border-top-color:#7c3aed;border-radius:50%;animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        </style>

        <div id="sat-root">
            <h1><i class="ph ph-smiley" style="color:#7c3aed;margin-right:.4rem;"></i>Desempenho dos Colaboradores</h1>
            <p class="sub">Acompanhe a desempenho por departamento e tópico nas últimas 4 pesquisas</p>

            ${hasData ? '' : renderNoData()}
            ${hasData ? renderOverviewCards() : ''}
            ${hasData ? renderGroupTabs() : ''}
            ${hasData ? `<div id="sat-dashboard-area"></div>` : ''}
            ${renderColaboradoresSection()}
        </div>
        `;

        if (hasData) {
            renderDashboardArea();
        }
        bindColabsTable();
    }

    function renderNoData() {
        return `<div class="no-data-box">
            <i class="ph ph-chart-bar"></i>
            <h3 style="color:#334155;margin:0 0 .5rem;">Nenhuma pesquisa de desempenho encontrada</h3>
            <p style="margin:0;">Assim que os colaboradores responderem o formulário, os dados aparecerão aqui.</p>
        </div>`;
    }

    /* ── OVERVIEW CARDS ─────────────────────────────────────── */
    function renderOverviewCards() {
        const periodos = _dash.periodos || [];
        const colabs = _colabs.colaboradores || [];
        const ultimoPeriodo = periodos[periodos.length - 1];
        const periodoKey = ultimoPeriodo ? `${ultimoPeriodo.ano}-T${ultimoPeriodo.trimestre}` : null;

        const responderam = colabs.filter(c => periodoKey && c.pesquisas?.[periodoKey]?.respondido).length;
        const total = colabs.length;
        const faltam = total - responderam;
        const pct = total > 0 ? ((responderam / total) * 100).toFixed(1).replace('.0', '') : 0;

        // Média geral última pesquisa
        let mediasUlt = [];
        _dash.dashboard.forEach(d => {
            const v = d[periodoKey];
            if (v !== null && v !== undefined) mediasUlt.push(v);
        });
        const mediaGeral = mediasUlt.length > 0 ? (mediasUlt.reduce((a, b) => a + b, 0) / mediasUlt.length).toFixed(1) : '—';

        // tendência geral (último vs anterior)
        let trendHTML = '';
        if (periodos.length >= 2) {
            const p1 = periodos[periodos.length - 2];
            const p2 = periodos[periodos.length - 1];
            const k1 = `${p1.ano}-T${p1.trimestre}`;
            const k2 = `${p2.ano}-T${p2.trimestre}`;
            let sum1 = [], sum2 = [];
            _dash.dashboard.forEach(d => {
                if (d[k1] !== null) sum1.push(d[k1]);
                if (d[k2] !== null) sum2.push(d[k2]);
            });
            if (sum1.length && sum2.length) {
                const m1 = sum1.reduce((a, b) => a + b, 0) / sum1.length;
                const m2 = sum2.reduce((a, b) => a + b, 0) / sum2.length;
                const diff = m2 - m1;
                trendHTML = diff >= 0.1
                    ? `<span style="color:#22c55e;font-weight:700;">▲ +${diff.toFixed(1)} vs período anterior</span>`
                    : diff <= -0.1
                        ? `<span style="color:#ef4444;font-weight:700;">▼ ${diff.toFixed(1)} vs período anterior</span>`
                        : `<span style="color:#94a3b8;">→ estável vs período anterior</span>`;
            }
        }

        const mc = scoreColor(parseFloat(mediaGeral));
        return `<div class="sat-cards">
            <div class="sat-card">
                <div class="sc-label">Responderam (último período)</div>
                <div class="sc-val" style="color:#7c3aed;">${responderam}<span style="font-size:1rem;font-weight:400;color:#94a3b8;">/${total}</span></div>
                <div class="sc-sub">${pct}% de adesão</div>
            </div>
            <div class="sat-card">
                <div class="sc-label">Faltam responder</div>
                <div class="sc-val" style="color:#f59e0b;">${faltam}</div>
                <div class="sc-sub">${ultimoPeriodo ? periodLabel(ultimoPeriodo) : ''}</div>
            </div>
            <div class="sat-card">
                <div class="sc-label">Média geral (último período)</div>
                <div class="sc-val" style="color:${mc};">${mediaGeral}</div>
                <div class="sc-sub">${trendHTML}</div>
            </div>
        </div>`;
    }

    /* ── GROUP TABS ──────────────────────────────────────────── */
    function renderGroupTabs() {
        const grupos = ['all', ...new Set((_dash.dashboard || []).map(d => d.grupo))];
        return `<div class="sat-tabs" id="sat-group-tabs">
            ${grupos.map(g => `
                <button class="sat-tab ${g === _filterGroup ? 'active' : ''}" onclick="window._desSetGroup('${g}')">
                    ${g === 'all' ? 'Todos os grupos' : grupoLabel(g)}
                </button>
            `).join('')}
        </div>`;
    }

    window._desSetGroup = function (g) {
        _filterGroup = g;
        document.querySelectorAll('.sat-tab').forEach(b => {
            b.classList.toggle('active', b.textContent.trim() === (g === 'all' ? 'Todos os grupos' : grupoLabel(g)));
        });
        renderDashboardArea();
    };

    /* ── DASHBOARD AREA (topic table per group) ──────────────── */
    function renderDashboardArea() {
        const area = document.getElementById('sat-dashboard-area');
        if (!area) return;
        const periodos = _dash.periodos || [];
        const allData = _dash.dashboard || [];

        // Filter by group
        const data = _filterGroup === 'all' ? allData : allData.filter(d => d.grupo === _filterGroup);

        // Group by grupo
        const grupos = {};
        data.forEach(d => {
            if (d.topico === '_obs_') return; // Ocultar linha _obs_
            if (!grupos[d.grupo]) grupos[d.grupo] = [];
            grupos[d.grupo].push(d);
        });

        if (Object.keys(grupos).length === 0) {
            area.innerHTML = '<div class="no-data-box"><i class="ph ph-chart-line-down"></i><p>Nenhum dado de dashboard para o filtro selecionado.</p></div>';
            return;
        }

        let html = `
        <div class="sat-legend">
            <div class="sat-legend-item"><div class="sat-legend-dot" style="background:#22c55e;"></div>Bom (≥4)</div>
            <div class="sat-legend-item"><div class="sat-legend-dot" style="background:#f59e0b;"></div>Regular (3–3.9)</div>
            <div class="sat-legend-item"><div class="sat-legend-dot" style="background:#ef4444;"></div>Crítico (&lt;3)</div>
            <div class="sat-legend-item"><div class="sat-legend-dot" style="background:#e2e8f0;"></div>Sem dados</div>
        </div>`;

        Object.entries(grupos).forEach(([grupo, topicos]) => {
            const totalRespondents = calcTotalRespondents(grupo, periodos);
            html += `<div class="sat-section-title">
                <i class="ph ph-buildings" style="color:#7c3aed;font-size:1.1rem;"></i>
                ${grupoLabel(grupo)}
                <span class="sat-badge" style="margin-left:.4rem;">${totalRespondents} respondentes</span>
            </div>`;

            html += `<div class="sat-table-wrap"><table class="sat-table">
                <thead><tr>
                    <th>Tópico</th>
                    ${periodos.map((p, i) => `<th style="text-align:center;">${periodLabel(p)}${i > 0 ? ' <span style="font-size:.7em;opacity:.5;">tendência</span>' : ''}</th>`).join('')}
                </tr></thead>
                <tbody>`;

            topicos.forEach(t => {
                const vals = periodos.map(p => t[`${p.ano}-T${p.trimestre}`] ?? null);
                if (vals.every(v => v === null)) return; // Oculta tópicos sem dados

                html += `<tr>
                    <td style="font-weight:600;color:#334155;">${t.topico}</td>
                    ${vals.map((v, i) => `
                        <td>
                            <div style="display:flex;align-items:center;justify-content:center;gap:.45rem;">
                                <span class="score-pill" style="background:${scoreBg(v)};color:${scoreColor(v)};">${fmtScore(v)}</span>
                                ${trendIcon(vals, i)}
                            </div>
                        </td>
                    `).join('')}
                </tr>`;
            });

            // Linha de média do grupo por período
            const groupAvgs = periodos.map(p => {
                const key = `${p.ano}-T${p.trimestre}`;
                const vals = topicos.map(t => t[key]).filter(v => v !== null);
                return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null;
            });
            html += `<tr style="background:#f8fafc;font-weight:700;">
                <td style="color:#7c3aed;">Média do grupo</td>
                ${groupAvgs.map((v, i) => `<td>
                    <div style="display:flex;align-items:center;justify-content:center;gap:.45rem;">
                        <span class="score-pill" style="background:${scoreBg(v)};color:${scoreColor(v)};font-weight:800;">${fmtScore(v)}</span>
                        ${trendIcon(groupAvgs, i)}
                    </div>
                </td>`).join('')}
            </tr>`;

            html += `</tbody></table></div>`;
        });

        area.innerHTML = html;
    }

    function calcTotalRespondents(grupo, periodos) {
        if (!_dash.contagens || periodos.length === 0) return 0;
        const ultPeriodo = periodos[periodos.length - 1];
        // count collaborators that match the group in the last period
        return _dash.contagens
            .filter(c => {
                const g = grupoFromDeptCargo(c.departamento, c.cargo);
                return g === grupo && c.ano === ultPeriodo.ano && c.trimestre === ultPeriodo.trimestre;
            })
            .reduce((s, c) => s + (c.responderam || 0), 0);
    }

    function grupoFromDeptCargo(dept, cargo) {
        return window.matchTemplateGroup('desempenho', dept, cargo);
    }

    /* ── COLABORADORES TABLE ─────────────────────────────────── */
    function renderColaboradoresSection() {
        const periodos = _colabs.periodos || [];
        return `
        <div class="sat-section-title" style="margin-top:2rem;">
            <i class="ph ph-users" style="color:#7c3aed;font-size:1.1rem;"></i>
            Colaboradores — histórico individual
        </div>
        <div class="sat-search-bar">
            <input class="sat-search-input" id="sat-colab-search" placeholder="Filtrar por nome, departamento ou cargo…" oninput="window._desFilterColabs()" />
        </div>
        <div class="sat-legend" style="margin-bottom:.75rem;">
            <div class="sat-legend-item"><div class="sat-legend-dot" style="background:#e2e8f0;"></div>Não estava admitido na época</div>
            <div class="sat-legend-item"><div class="sat-legend-dot" style="background:#fef9c3;border:1px solid #fbbf24;"></div>Não respondeu</div>
        </div>
        <div class="sat-table-wrap" id="sat-colab-table-wrap">
            ${renderColabTable()}
        </div>
        `;
    }

    function renderColabTable() {
        const periodos = _colabs.periodos || [];
        const colabs = getFilteredColabs();

        if (colabs.length === 0) {
            return '<div class="no-data-box" style="padding:2rem;"><i class="ph ph-users"></i><p>Nenhum colaborador encontrado.</p></div>';
        }

        const responderam = colabs.filter(c => {
            const lastKey = periodos.length > 0 ? `${periodos[periodos.length - 1].ano}-T${periodos[periodos.length - 1].trimestre}` : null;
            return lastKey && c.pesquisas?.[lastKey]?.respondido;
        }).length;

        return `
        <div style="padding:.6rem 1rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:.78rem;color:#64748b;">
            Mostrando <strong>${colabs.length}</strong> colaboradores —
            <span style="color:#22c55e;font-weight:600;">${responderam} responderam</span> o último período,
            <span style="color:#f59e0b;font-weight:600;">${colabs.length - responderam} pendentes</span>
        </div>
        <table class="sat-table" id="sat-colab-table">
            <thead><tr>
                <th onclick="window._desSortColabs('nome')">Colaborador ${_sortCol==='nome'?(_sortDir>0?'▲':'▼'):''}</th>
                <th onclick="window._desSortColabs('departamento')">Departamento ${_sortCol==='departamento'?(_sortDir>0?'▲':'▼'):''}</th>
                ${periodos.map(p => `<th style="text-align:center;">${periodLabel(p)}</th>`).join('')}
                <th style="text-align:center;width:100px;">Ações</th>
            </tr></thead>
            <tbody>
            ${colabs.map(c => renderColabRow(c, periodos)).join('')}
            </tbody>
        </table>`;
    }

    function renderColabRow(c, periodos) {
        const lastKey = periodos.length > 0 ? `${periodos[periodos.length - 1].ano}-T${periodos[periodos.length - 1].trimestre}` : null;
        const lastP = lastKey ? c.pesquisas?.[lastKey] : null;
        const isNaoAdmitidoLast = lastP?.nao_admitido;

        return `<tbody class="sat-colab-group"><tr>\n            <td>\n                <div class="sat-avatar-cell">\n                    <button class="btn-sat-toggle-history" onclick="window._desToggleHistory(this)" style="background:transparent;border:none;cursor:pointer;padding:0.2rem;margin-right:0.5rem;display:flex;align-items:center;justify-content:center;color:#64748b;transition:transform 0.2s;"><i class="ph ph-caret-right" style="font-size:1.1rem;font-weight:bold;"></i></button>
                    ${avatarHTML(c)}
                    <div>
                        <div style="font-weight:600;color:#1e293b;font-size:.83rem;" title="${c.nome_completo}">${c.nome_completo.length > 15 ? c.nome_completo.substring(0, 15) + '...' : c.nome_completo}</div>
                        <div style="color:#94a3b8;font-size:.72rem;">${c.cargo || '—'}</div>
                    </div>
                </div>
            </td>
            <td style="color:#64748b;font-size:.82rem;">
                <div style="font-weight:bold;color:#334155;">${c.departamento || '—'}</div>
                ${c.responsavel_nome ? `<div style="font-size:.72rem;color:#94a3b8;margin-top:2px;">${c.responsavel_nome}</div>` : ''}
            </td>
            ${periodos.map(p => {
                const key = `${p.ano}-T${p.trimestre}`;
                const ps = c.pesquisas?.[key];
                if (!ps) return `<td style="text-align:center;color:#94a3b8;">—</td>`;
                if (ps.nao_admitido) {
                    return `<td style="text-align:center;background:#f8fafc;"><span style="color:#cbd5e1;font-size:.75rem;">N/A</span></td>`;
                }
                if (!ps.respondido) {
                    return `<td style="text-align:center;background:#fef9c3;"><span style="color:#92400e;font-size:.75rem;font-weight:600;">Pendente</span></td>`;
                }
                return `<td style="text-align:center;">
                    <span class="score-pill" style="background:${scoreBg(ps.media)};color:${scoreColor(ps.media)};">${fmtScore(ps.media)}</span>
                </td>`;
            }).join('')}
            <td style="text-align:center;">
                <div style="display:flex;gap:4px;justify-content:center;align-items:center;flex-wrap:wrap;">
                <button
                    data-colab-id="${c.id}"
                    data-colab-nome="${(c.nome_completo || '').replace(/"/g, '&quot;')}"
                    data-colab-cargo="${(c.cargo || '').replace(/"/g, '&quot;')}"
                    data-colab-dept="${(c.departamento || '').replace(/"/g, '&quot;')}"
                    data-respostas="${lastP && lastP.respostas ? btoa(unescape(encodeURIComponent(JSON.stringify(lastP.respostas)))) : ''}"
                    data-ano="${lastKey ? lastKey.split('-T')[0] : ''}"
                    data-trim="${lastKey ? lastKey.split('-T')[1] : ''}"
                    onclick="window._desOpenFormBtn(this)"
                    style="background:${lastP && lastP.respondido ? '#0ea5e9' : '#7c3aed'};color:#fff;border:none;border-radius:6px;padding:0.35rem 0.6rem;font-size:0.75rem;cursor:pointer;font-weight:600;">
                    <i class="ph ph-pencil-simple" style="margin-right:4px;"></i>${lastP && lastP.respondido ? 'Editar' : 'Responder'}
                </button>
                ${lastP && lastP.respondido ? (
                    (lastP.pdf_url && lastP.pdf_url !== 'null' && lastP.pdf_url !== 'undefined') ? `
                    <button
                        onclick="window.open('${lastP.pdf_url}', '_blank')"
                        title="Ver PDF do Feedback Assinado"
                        style="background:#0f4c81;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.6rem;font-size:0.75rem;cursor:pointer;font-weight:600;">
                        <i class="ph ph-eye"></i>
                    </button>` : `
                    <button
                        onclick="window._desFeedbackBtn(${c.id}, '${(c.nome_completo||'').replace(/'/g,"'")}', '${(c.departamento||'').replace(/'/g,"'")}', '${(c.cargo||'').replace(/'/g,"'")}', '${lastKey ? lastKey.split('-T')[0] : ''}', '${lastKey ? lastKey.split('-T')[1] : ''}')"
                        title="Registrar Feedback"
                        style="background:#10b981;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.6rem;font-size:0.75rem;cursor:pointer;font-weight:600;">
                        <i class="ph ph-chat-circle-text"></i>
                    </button>`
                ) : ''}
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

                        // Process periods data
                        const periodosData = periodos.map(p => {
                            const key = `${p.ano}-T${p.trimestre}`;
                            const ps = c.pesquisas?.[key];
                            if (!ps || !ps.respondido) return { ...p, notas: {}, media: null, hasDetails: false };

                            let respostasObj = ps.respostas;
                            if (typeof respostasObj === 'string') {
                                try { respostasObj = JSON.parse(respostasObj); } catch(e) { respostasObj = null; }
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

                        // Build Table Header
                        let theadHtml = `<tr>
                            <th style="text-align:left;color:#64748b;font-weight:600;font-size:0.8rem;padding:8px 12px;border-bottom:2px solid #e2e8f0;width:50%;">Perguntas</th>`;
                        
                        periodos.forEach(p => {
                            theadHtml += `<th style="text-align:center;color:#64748b;font-weight:600;font-size:0.8rem;padding:8px 12px;border-bottom:2px solid #e2e8f0;width:12%;">${periodLabel(p)}</th>`;
                        });
                        theadHtml += '</tr>';

                        let tbodyHtml = '';

                        Object.entries(perguntasGroup).forEach(([cat, questions]) => {
                            if (!questions || questions.length === 0) return;
                            
                            // Category Header Row
                            tbodyHtml += `<tr>
                                <td colspan="${periodos.length + 1}" style="padding:10px 12px 4px 12px;">
                                    <div style="font-weight:800;font-size:0.75rem;text-transform:uppercase;letter-spacing:.05em;color:#7c3aed;">${cat}</div>
                                </td>
                            </tr>`;

                            // Questions Rows
                            questions.forEach((qText, idx) => {
                                if (!qText || !qText.trim()) return;
                                
                                tbodyHtml += `<tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:6px 12px;font-size:0.78rem;color:#334155;line-height:1.35;">${qText}</td>`;
                                
                                periodosData.forEach(pd => {
                                    let nVal = '—';
                                    let nColor = '#cbd5e1'; // light gray for empty
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
                                            // Resposta existe mas sem detalhes
                                            nVal = '<span style="font-size:0.7rem;color:#94a3b8;" title="Sem detalhes">S/D</span>';
                                        }
                                    }

                                    // If empty but has details in other categories? or just empty
                                    const nValStr = String(nVal);
                                    const pillStyle = nVal !== '—' && nValStr.indexOf('<span') === -1 ? `background:${nBg};color:${nColor};font-weight:700;font-size:0.82rem;padding:2px 8px;border-radius:12px;display:inline-block;min-width:28px;` : `color:#cbd5e1;`;
                                    
                                    tbodyHtml += `<td style="text-align:center;padding:6px 12px;">
                                        <span style="${pillStyle}">${nVal}</span>
                                    </td>`;
                                });
                                
                                tbodyHtml += '</tr>';
                            });
                        });

                        // Medias row at the bottom
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

    
    window._desToggleHistory = function(btn) {
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
/* ── FILTER & SORT ──────────────────────────────────────── */
    function getFilteredColabs() {
        let colabs = (_colabs.colaboradores || []).slice();
        if (_searchText) {
            const normalize = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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
                if (va === null || va === undefined) va = -Infinity;
                if (vb === null || vb === undefined) vb = -Infinity;
                return va < vb ? -_sortDir : va > vb ? _sortDir : 0;
            });
        }
        return colabs;
    }

    function bindColabsTable() {
        // nothing extra needed — oninput / onclick are inline
    }

    window._desFilterColabs = function () {
        _searchText = document.getElementById('sat-colab-search')?.value || '';
        const wrap = document.getElementById('sat-colab-table-wrap');
        if (wrap) wrap.innerHTML = renderColabTable();
    };

    window._desSortColabs = function (col) {
        if (_sortCol === col) _sortDir *= -1;
        else { _sortCol = col; _sortDir = 1; }
        const wrap = document.getElementById('sat-colab-table-wrap');
        if (wrap) wrap.innerHTML = renderColabTable();
    };

    /* Handler global para clique nos botões de nota — evita SyntaxError de quotes inline */
    window._desRbtnClick = function(el, isReadonly) {
        if (isReadonly) return;
        var grp = el.dataset.group;
        document.querySelectorAll('.sat-rbtn[data-group="'+grp+'"]').forEach(function(b) {
            b.style.background = '#fff';
            b.style.color = b.dataset.color;
            b.style.borderColor = '#cbd5e1';
        });
        el.style.background = el.dataset.bg;
        el.style.color = '#fff';
        el.style.borderColor = el.dataset.color;
        var inp = el.previousElementSibling;
        if (inp) inp.checked = true;
    };

    let _lastOpenedBtn = null; // referencia direta ao botao que abriu o form

    window._desOpenFormBtn = function(btn, isReadonly = false) {
        _lastOpenedBtn = isReadonly ? null : btn; // guarda referencia para atualizar depois
        const id = parseInt(btn.dataset.colabId, 10);
        const nome = btn.dataset.colabNome;
        const cargo = btn.dataset.colabCargo;
        const dept = btn.dataset.colabDept;
        let saved = {};
        try { 
            const raw = btn.dataset.respostas || '';
            if (raw) {
                // decodificar base64
                try { saved = JSON.parse(decodeURIComponent(escape(atob(raw)))); } catch(e) { saved = {}; }
            }
        } catch(e) { saved = {}; }
        const ano = btn.dataset.ano; const trim = btn.dataset.trim; window._desOpenForm(id, nome, cargo, dept, saved, isReadonly, ano, trim);
    };

    window._desOpenForm = function(colabId, nome, cargo, dept, saved = {}, isReadonly = false, ano = null, trim = null) {
        if (!window.AVALIACAO_QUESTIONS || !window.AVALIACAO_QUESTIONS.desempenho) {
            alert('Erro: Perguntas de desempenho não carregadas.');
            return;
        }
        if (typeof saved === 'string') {
            try { saved = JSON.parse(saved); } catch(e) { saved = {}; }
        }
        // Normalizar formato legado { scores: {...}, topicos: [...] } — ignorar prefill, usar formulário limpo
        if (saved && saved.scores && typeof saved.scores === 'object') {
            // formato antigo do prontuário: não conseguimos preencher individualmente
            saved = {};
        }
        // Garantir que saved tem __obs__
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
                        <h2 style="margin:0;font-size:1.25rem;color:#fff;"><i class="ph ph-smiley" style="color:#cffafe;margin-right:.5rem;"></i>Avaliação de Desempenho</h2>
                        <div style="color:#e0f2fe;font-size:0.85rem;margin-top:0.3rem;"><strong>${nome}</strong> — ${cargo || dept}</div>
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
                    <span style="font-weight:700; color:#334155;">${catIdx+1}. ${topico}</span>
                </div>
                <div style="padding:1rem;">
            `;
            
            perguntasGroup[topico].forEach((pergunta, idx) => {
                if (!pergunta || !pergunta.trim()) return; // pular perguntas vazias/undefined
                // lookup: JSON salva como string key '0','1'... converter
                const topicoSaved = saved[topico];
                const val = topicoSaved != null ? (topicoSaved[idx] ?? topicoSaved[String(idx)] ?? null) : null;
                const obsSaved = saved.__obs__ && saved.__obs__[topico] ? saved.__obs__[topico] : {};
                const obsStr = (obsSaved[idx] ?? obsSaved[String(idx)]) || '';
                html += `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:1.5rem; padding:0.75rem 0; border-bottom:1px dashed #e2e8f0; flex-wrap:wrap;">
                    <div style="width:30%; min-width:250px; font-size:0.95rem; color:#475569; font-weight:500;">${pergunta}</div>
                    <div style="flex:1; display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                        <div style="display:flex; gap:0.35rem; flex-shrink:0;">
                `;
                
                const qColors = { 1:'#ef4444', 2:'#f97316', 3:'#eab308', 4:'#84cc16', 5:'#22c55e' };
                const bgColors = { 1:'#fee2e2', 2:'#ffedd5', 3:'#fef3c7', 4:'#ecfccb', 5:'#dcfce7' };
                
                for(let v=1; v<=5; v++) {
                    const c = qColors[v]; const bg = bgColors[v];
                    const isChecked = (val != null && parseInt(val) === v);
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
                             onclick="window._desRbtnClick(this, ${isReadonly ? 'true' : 'false'})">
                            ${v}
                        </div>
                    </label>`;
                }
                
                const fbkObsSaved = (saved.__feedback_obs__ && saved.__feedback_obs__[topico]) ? (saved.__feedback_obs__[topico][idx] || saved.__feedback_obs__[topico][String(idx)] || '') : '';
                html += `
                        </div>
                        <div style="flex:1;display:flex;flex-direction:column;gap:4px;min-width:250px;">
                            <input type="text" name="av_obs_${catIdx}_${idx}" value="${String(obsStr).replace(/"/g, '&quot;')}" ${isReadonly ? 'disabled' : ''} placeholder="Observação do colaborador (opcional)..." style="width:100%; padding:0.4rem 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; outline:none; color:#334155; height:32px; box-sizing:border-box;">
                            <input type="text" name="av_fbk_${catIdx}_${idx}" value="${String(fbkObsSaved).replace(/"/g, '&quot;')}" placeholder="📝 Feedback do gestor (opcional)..." style="width:100%; padding:0.4rem 0.6rem; border:1.5px solid #bfdbfe; border-radius:6px; font-size:0.85rem; outline:none; color:#1d4ed8; background:#eff6ff; height:32px; box-sizing:border-box;">
                        </div>
                    </div>
                </div>`;
            });
            html += `</div></div>`;
            catIdx++;
        });

        const infoAdic = saved.__obs_gerais__ ? saved.__obs_gerais__ : ((saved.__obs__ && saved.__obs__.info_adicional) ? saved.__obs__.info_adicional : '');
        const fbkGeralSaved = saved.__feedback_obs_geral__ || '';
        html += `
                        <div style="margin-top:2.5rem;padding:1.5rem;background:#fff;border:1px dashed #cbd5e1;border-radius:8px;">
                            <label style="display:block;font-size:0.85rem;font-weight:600;color:#475569;margin-bottom:0.5rem;">Informações Adicionais / Observação Geral (Opcional)</label>
                            <textarea name="info_adicional" ${isReadonly ? 'disabled' : ''} rows="2" style="width:100%;padding:0.75rem;border-radius:6px;border:1px solid #cbd5e1;font-size:0.9rem;font-family:inherit;resize:vertical;" placeholder="Observações gerais...">${infoAdic}</textarea>
                        </div>

                        <div style="margin-top:1rem;padding:1.5rem;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:8px;">
                            <label style="display:block;font-size:0.85rem;font-weight:600;color:#1d4ed8;margin-bottom:0.5rem;"><i class="ph ph-chat-circle-text" style="margin-right:4px;"></i>Observações de Feedback do Gestor (Opcional)</label>
                            <textarea name="obs_feedback_geral" rows="3" style="width:100%;padding:0.75rem;border-radius:6px;border:1.5px solid #bfdbfe;font-size:0.9rem;font-family:inherit;resize:vertical;background:#fff;color:#1d4ed8;" placeholder="Observações gerais de feedback para o colaborador...">${fbkGeralSaved}</textarea>
                        </div>
                        
                        <div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:2rem;">
                            <button type="button" onclick="window._desCloseForm()" style="padding:0.75rem 1.5rem;border-radius:8px;font-weight:600;border:1px solid #cbd5e1;background:#fff;color:#64748b;cursor:pointer;">Cancelar</button>
                            ${isReadonly ? '' : `<button type="submit" id="sat-btn-submit" style="padding:0.75rem 1.5rem;border-radius:8px;font-weight:600;border:none;background:#0f4c81;color:#fff;cursor:pointer;display:flex;align-items:center;gap:0.5rem;box-shadow:0 2px 4px rgba(15,76,129,0.3);"><i class="ph ph-check-circle"></i> Salvar Respostas</button>`}
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);
    };

    window._desCloseForm = function() {
        const overlay = document.getElementById('sat-modal-overlay');
        if (overlay) overlay.remove();
    };

    window._desSubmitForm = async function(e, colabId, grupo, refAno, refTrim) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = document.getElementById('sat-btn-submit');
        
        // current quarter
        const currentYear = refAno || new Date().getFullYear();
        const currentQ = refTrim || Math.floor(new Date().getMonth() / 3) + 1;
        
        // build respostas_json — salva como arrays para compatibilidade com backend
        const respostas = { __obs__: {}, __feedback_obs__: {} };
        const perguntasGroup = window.AVALIACAO_QUESTIONS.desempenho[grupo];
        const categories = Object.keys(perguntasGroup);
        let missingRequired = [];
        
        categories.forEach((cat, catIdx) => {
            respostas[cat] = [];
            respostas.__obs__[cat] = [];
            respostas.__feedback_obs__[cat] = [];
            perguntasGroup[cat].forEach((q, i) => {
                if (!q || !q.trim()) { respostas[cat].push(null); respostas.__obs__[cat].push(''); respostas.__feedback_obs__[cat].push(''); return; }
                const rads = form.elements[`av_${catIdx}_${i}`];
                const selected = rads && rads.length ? Array.from(rads).find(r => r.checked) : null;
                if (selected) {
                    respostas[cat].push(parseInt(selected.value, 10));
                } else {
                    respostas[cat].push(null);
                    missingRequired.push(`${cat} — Pergunta ${i+1}`);
                }
                const obs = form.elements[`av_obs_${catIdx}_${i}`];
                respostas.__obs__[cat].push((obs && obs.value.trim()) ? obs.value.trim() : '');
                const fbk = form.elements[`av_fbk_${catIdx}_${i}`];
                respostas.__feedback_obs__[cat].push((fbk && fbk.value.trim()) ? fbk.value.trim() : '');
            });
            // limpar arrays vazios ao final
            if (respostas.__obs__[cat].every(v => v === '')) delete respostas.__obs__[cat];
            if (respostas.__feedback_obs__[cat].every(v => v === '')) delete respostas.__feedback_obs__[cat];
        });
        
        if (missingRequired.length > 0) {
            alert('Por favor, responda todas as perguntas antes de salvar.\n\nPendentes:\n' + missingRequired.slice(0,5).join('\n'));
            return;
        }
        
        const infoAdicional = form.elements['info_adicional']?.value;
        if (infoAdicional) { respostas.__obs__.info_adicional = infoAdicional.trim(); respostas.__obs_gerais__ = infoAdicional.trim(); }
        
        const obsFbkGeral = form.elements['obs_feedback_geral']?.value;
        if (obsFbkGeral) { respostas.__feedback_obs_geral__ = obsFbkGeral.trim(); }
        
        try {
            submitBtn.innerHTML = '<div class="spinner-sm" style="border-color:#c4b5fd;border-top-color:#fff;"></div> Salvando...';
            submitBtn.disabled = true;
            
            const r = await fetch(API + '/api/avaliacoes', {
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

            // Salvar obs de feedback separadamente
            const obsFbkJson = {};
            categories.forEach((cat) => {
                if (respostas.__feedback_obs__[cat]) obsFbkJson[cat] = respostas.__feedback_obs__[cat];
            });
            if (obsFbkGeral) obsFbkJson.__obs_feedback_geral__ = obsFbkGeral.trim();

            const erpUser = JSON.parse(localStorage.getItem('erp_user') || '{}');
            await fetch(API + '/api/feedback-documentos/salvar-obs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token'))
                },
                body: JSON.stringify({
                    colaborador_id: colabId,
                    ano: currentYear,
                    trimestre: currentQ,
                    gestor_nome: erpUser.nome || erpUser.username || '',
                    obs_feedback_json: JSON.stringify(obsFbkJson)
                })
            });
            window._desCloseForm();
            _lastOpenedBtn = null;
            alert('Pesquisa salva com sucesso!');
            window.location.reload();


        } catch(err) {
            alert('Erro ao salvar pesquisa: ' + err.message);
            submitBtn.innerHTML = '<i class="ph ph-check-circle"></i> Salvar Pesquisa';
            submitBtn.disabled = false;
        }
    };

    /* ── PAINEL DE FEEDBACK: FORMULÁRIO COMPLETO → ASSINATURA + SELFIE + PDF ────── */
    window._desFeedbackBtn = async function(colabId, nome, dept, cargo, ano, trim) {
        const tok = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';

        // 1. Buscar avaliação salva
        let respostas = {};
        try {
            const r = await fetch(`${API}/api/avaliacoes/desempenho/colaboradores`, { headers: { 'Authorization': `Bearer ${tok}` } });
            if (r.ok) {
                const data = await r.json();
                const colab = (data.colaboradores || []).find(c => c.id == colabId);
                const key = `${ano}-T${trim}`;
                const ps = colab?.pesquisas?.[key];
                if (ps?.respostas) {
                    respostas = typeof ps.respostas === 'string' ? JSON.parse(ps.respostas) : ps.respostas;
                }
            }
        } catch(e) {}

        // 2. Buscar documento de feedback (obs de feedback já salvas)
        let docFeedback = null;
        try {
            const r = await fetch(`${API}/api/feedback-documentos/${colabId}/${ano}/${trim}`, { headers: { 'Authorization': `Bearer ${tok}` } });
            if (r.ok) docFeedback = await r.json();
        } catch(e) {}

        const jaAssinado = docFeedback && docFeedback.pdf_r2;
        let obsFbkSalvas = {};
        try { obsFbkSalvas = JSON.parse(docFeedback?.obs_feedback_json || '{}'); } catch(e) {}

        // 3. Obter perguntas do grupo do colaborador
        const grupo = window.matchTemplateGroup ? window.matchTemplateGroup('desempenho', dept, cargo) : 'escritorio';
        const perguntasGroup = (window.AVALIACAO_QUESTIONS && window.AVALIACAO_QUESTIONS.desempenho) ? window.AVALIACAO_QUESTIONS.desempenho[grupo] : null;

        // 4. Construir HTML das perguntas
        let questionsHtml = '';
        if (perguntasGroup) {
            const categories = Object.keys(perguntasGroup);
            const obsRespostas = respostas.__obs__ || {};
            const obsFbkCats = {};
            // Compatibilizar obs de feedback: podem estar no root do obsFbkSalvas ou em categoria
            categories.forEach(cat => {
                obsFbkCats[cat] = obsFbkSalvas[cat] || [];
            });

            categories.forEach((cat, catIdx) => {
                const perguntas = perguntasGroup[cat] || [];
                const notasCat = respostas[cat] || [];
                const obsCat = obsRespostas[cat] || [];
                const fbkCat = obsFbkCats[cat] || [];

                if (!perguntas.length) return;

                questionsHtml += `
                <div style="margin-bottom:1.5rem;">
                    <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#7c3aed;margin-bottom:0.75rem;padding-bottom:0.4rem;border-bottom:2px solid #ede9fe;">
                        <i class="ph ph-tag" style="margin-right:4px;"></i>${cat}
                    </div>`;

                perguntas.forEach((q, i) => {
                    if (!q || !q.trim()) return;
                    const nota = notasCat[i];
                    const notaStr = (nota !== null && nota !== undefined) ? nota : '—';
                    const notaColor = scoreColor(nota);
                    const notaBg = scoreBg(nota);
                    const obsDesemp = (Array.isArray(obsCat) ? obsCat[i] : obsCat[String(i)]) || '';
                    const obsFbk = (Array.isArray(fbkCat) ? fbkCat[i] : fbkCat[String(i)]) || '';

                    questionsHtml += `
                    <div style="background:#f8fafc;border-radius:10px;padding:0.9rem 1rem;margin-bottom:0.6rem;border:1px solid #e2e8f0;">
                        <div style="display:flex;align-items:flex-start;gap:0.75rem;margin-bottom:0.55rem;">
                            <span style="background:${notaBg};color:${notaColor};font-weight:800;font-size:0.9rem;padding:0.2rem 0.55rem;border-radius:6px;flex-shrink:0;min-width:34px;text-align:center;">${notaStr}</span>
                            <span style="font-size:0.83rem;color:#334155;line-height:1.4;">${q}</span>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:0.4rem;margin-top:0.4rem;">
                            <div>
                                <label style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:2px;">Observação de Desempenho</label>
                                <div style="background:#fff;border:1px solid #cbd5e1;border-radius:6px;padding:0.45rem 0.65rem;font-size:0.83rem;color:#475569;min-height:28px;">${obsDesemp || '<span style="color:#cbd5e1;font-style:italic;">Sem observação</span>'}</div>
                            </div>
                            <div>
                                <label style="font-size:0.72rem;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:2px;">Observação de Feedback</label>
                                <input type="text" data-cat="${encodeURIComponent(cat)}" data-idx="${i}"
                                    class="fbk-obs-campo"
                                    value="${obsFbk.replace(/"/g,'&quot;')}"
                                    placeholder="Feedback do gestor para esta pergunta..."
                                    style="width:100%;box-sizing:border-box;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:6px;padding:0.45rem 0.65rem;font-size:0.83rem;color:#1d4ed8;outline:none;">
                            </div>
                        </div>
                    </div>`;
                });

                questionsHtml += '</div>';
            });
        }

        const obsGeralColab = respostas.__obs_gerais__ || (respostas.__obs__ && respostas.__obs__.info_adicional) || '';
        const fbkGeralSalvo = obsFbkSalvas.__obs_feedback_geral__ || '';

        document.getElementById('fbk-form-overlay')?.remove();

        const html = `
        <div id="fbk-form-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.75);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;">
            <div style="background:#fff;border-radius:16px;width:100%;max-width:780px;max-height:95vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.35);overflow:hidden;">
                <!-- Header -->
                <div style="background:linear-gradient(135deg,#0f4c81,#1d6fa5);padding:1.25rem 1.5rem;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                    <div>
                        <div style="color:#fff;font-size:1.05rem;font-weight:700;"><i class="ph ph-chat-circle-text" style="margin-right:6px;"></i>Formulário de Feedback — ${ano} · ${trim}º Trimestre</div>
                        <div style="color:#bfdbfe;font-size:0.82rem;margin-top:2px;">${nome} · ${dept}${cargo ? ' · ' + cargo : ''}</div>
                    </div>
                    <button onclick="document.getElementById('fbk-form-overlay').remove()" style="background:rgba(255,255,255,0.15);border:none;border-radius:8px;color:#fff;font-size:1.2rem;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>
                </div>

                <!-- Body -->
                <div style="overflow-y:auto;flex:1;padding:1.5rem;">
                    ${jaAssinado ? `
                    <div style="background:#dcfce7;border:1px solid #86efac;border-radius:10px;padding:1rem;margin-bottom:1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
                        <div style="color:#166534;font-weight:600;font-size:0.88rem;"><i class="ph ph-check-circle" style="margin-right:6px;"></i>Feedback assinado em ${docFeedback.assinado_em || ''} (BRT)</div>
                        <button onclick="window.open('${docFeedback.pdf_r2}','_blank')" style="background:#166534;color:#fff;border:none;border-radius:8px;padding:0.45rem 0.9rem;font-size:0.82rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-eye"></i> Ver PDF</button>
                    </div>
                    ` : ''}

                    <!-- Legenda -->
                    <div style="display:flex;gap:1.5rem;margin-bottom:1.25rem;flex-wrap:wrap;">
                        <div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:#64748b;"><div style="width:14px;height:14px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:3px;"></div> Observação de Desempenho (somente leitura)</div>
                        <div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:#1d4ed8;"><div style="width:14px;height:14px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:3px;"></div> Observação de Feedback (editável)</div>
                    </div>

                    ${questionsHtml || '<div style="text-align:center;padding:2rem;color:#94a3b8;">Perguntas não disponíveis para este colaborador.</div>'}

                    <!-- Obs Geral Colaborador -->
                    ${obsGeralColab ? `
                    <div style="margin-top:0.75rem;padding:1rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                        <label style="display:block;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin-bottom:6px;">Informações Adicionais / Observação Geral</label>
                        <div style="font-size:0.85rem;color:#475569;">${obsGeralColab}</div>
                    </div>` : ''}

                    <!-- Observação Final do Feedback -->
                    <div style="margin-top:1rem;padding:1.25rem;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;">
                        <label style="display:block;font-size:0.82rem;font-weight:700;color:#1d4ed8;margin-bottom:6px;"><i class="ph ph-note-pencil" style="margin-right:4px;"></i>Observação Final do Feedback</label>
                        <textarea id="fbk-obs-final" rows="3"
                            placeholder="Observação final do gestor sobre o feedback geral do colaborador..."
                            style="width:100%;box-sizing:border-box;padding:0.75rem;border-radius:8px;border:1.5px solid #bfdbfe;font-size:0.88rem;font-family:inherit;resize:vertical;color:#1d4ed8;background:#fff;outline:none;">${fbkGeralSalvo}</textarea>
                    </div>
                </div>

                <!-- Footer -->
                <div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:0.75rem;background:#f8fafc;flex-shrink:0;flex-wrap:wrap;">
                    <button onclick="document.getElementById('fbk-form-overlay').remove()" style="padding:0.65rem 1.25rem;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#64748b;font-weight:600;cursor:pointer;">Fechar</button>
                    <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
                        <button onclick="window._fbkSalvarObsDoFormulario(${colabId},${ano},${trim})" style="padding:0.65rem 1.2rem;border-radius:8px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;"><i class="ph ph-floppy-disk"></i> Salvar Feedback</button>
                        <button onclick="window._fbkAbrirAssinatura(${colabId},'${nome.replace(/'/g,"\\'")}','${dept.replace(/'/g,"\\'")}','${(cargo||'').replace(/'/g,"\\'")}',${ano},${trim})" style="padding:0.65rem 1.4rem;border-radius:8px;border:none;background:linear-gradient(135deg,#0f4c81,#1d6fa5);color:#fff;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(15,76,129,0.3);"><i class="ph ph-signature"></i> Assinar</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    };

    /* Salva as obs de feedback direto do formulário antes de assinar */
    window._fbkSalvarObsDoFormulario = async function(colabId, ano, trim) {
        const tok = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const campos = document.querySelectorAll('.fbk-obs-campo');
        const obsFbkJson = {};
        campos.forEach(el => {
            const cat = decodeURIComponent(el.dataset.cat);
            const idx = parseInt(el.dataset.idx, 10);
            if (!obsFbkJson[cat]) obsFbkJson[cat] = [];
            while (obsFbkJson[cat].length <= idx) obsFbkJson[cat].push('');
            obsFbkJson[cat][idx] = el.value.trim();
        });
        const finalObs = document.getElementById('fbk-obs-final')?.value.trim() || '';
        if (finalObs) obsFbkJson.__obs_feedback_geral__ = finalObs;

        const erpUser = JSON.parse(localStorage.getItem('erp_user') || '{}');
        try {
            const r = await fetch(`${API}/api/feedback-documentos/salvar-obs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
                body: JSON.stringify({
                    colaborador_id: colabId, ano, trimestre: trim,
                    gestor_nome: erpUser.nome || erpUser.username || '',
                    obs_feedback_json: JSON.stringify(obsFbkJson)
                })
            });
            if (!r.ok) throw new Error(await r.text());
            // Visual feedback rápido
            const btn = document.querySelector('[onclick*="_fbkSalvarObsDoFormulario"]');
            if (btn) { const orig = btn.innerHTML; btn.innerHTML = '<i class="ph ph-check"></i> Salvo!'; btn.style.background='#dcfce7';btn.style.color='#166534'; setTimeout(()=>{btn.innerHTML=orig;btn.style.background='#eff6ff';btn.style.color='#1d4ed8';},1800); }
        } catch(e) { alert('Erro ao salvar: ' + e.message); }
    };

    /* Abre o painel de assinatura + selfie */
    window._fbkAbrirAssinatura = async function(colabId, nome, dept, cargo, ano, trim) {
        // Salvar campos de feedback antes de abrir assinatura
        await window._fbkSalvarObsDoFormulario(colabId, ano, trim);

        // Carregar signature_pad via CDN se não estiver disponível
        if (!window.SignaturePad) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/signature_pad@4.1.7/dist/signature_pad.umd.min.js';
                s.onload = resolve; s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        document.getElementById('fbk-sign-overlay')?.remove();

        const html = `
        <div id="fbk-sign-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.82);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;">
            <div style="background:#fff;border-radius:16px;width:100%;max-width:700px;max-height:95vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.35);overflow:hidden;">
                <!-- Header -->
                <div style="background:linear-gradient(135deg,#0f4c81,#1d6fa5);padding:1.25rem 1.5rem;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                    <div>
                        <div style="color:#fff;font-size:1.05rem;font-weight:700;"><i class="ph ph-signature" style="margin-right:6px;"></i>Assinatura de Ciência do Feedback</div>
                        <div style="color:#bfdbfe;font-size:0.82rem;margin-top:2px;">${nome} · ${dept}${cargo ? ' · ' + cargo : ''}</div>
                    </div>
                    <button onclick="document.getElementById('fbk-sign-overlay').remove();window._fbkStopCamera();" style="background:rgba(255,255,255,0.15);border:none;border-radius:8px;color:#fff;font-size:1.2rem;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>
                </div>

                <div style="overflow-y:auto;flex:1;padding:1.5rem;">

                    <!-- Texto de ciência -->
                    <div style="background:#fefce8;border:1.5px solid #fde68a;border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.25rem;">
                        <div style="font-size:0.88rem;color:#92400e;font-weight:600;margin-bottom:4px;"><i class="ph ph-info" style="margin-right:4px;"></i>Declaração de Ciência</div>
                        <p style="margin:0;font-size:0.84rem;color:#78350f;line-height:1.55;">
                            Ao assinar abaixo, <strong>${nome}</strong> declara estar <strong>ciente do feedback de desempenho</strong> recebido referente ao <strong>${trim}º trimestre de ${ano}</strong>,
                            tendo compreendido os pontos avaliados, as observações do gestor e as expectativas para os próximos períodos.
                            Esta assinatura não representa concordância, apenas o recebimento e ciência das informações apresentadas.
                        </p>
                    </div>

                    <!-- Assinatura e Selfie lado a lado -->
                    <div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-bottom:1.5rem;">
                        <!-- Assinatura -->
                        <div style="flex:1;min-width:300px;">
                            <label style="display:block;font-size:0.85rem;font-weight:700;color:#334155;margin-bottom:0.5rem;"><i class="ph ph-pen-nib" style="color:#0f4c81;margin-right:4px;"></i>Assinatura do Colaborador</label>
                            <div style="position:relative;border:2px dashed #cbd5e1;border-radius:10px;background:#f8fafc;overflow:hidden;">
                                <canvas id="fbk-sig-canvas" style="width:100%;display:block;touch-action:none;cursor:crosshair;" height="140"></canvas>
                                <button onclick="window._fbkClearSig()" style="position:absolute;top:6px;right:6px;background:rgba(239,68,68,0.1);border:1px solid #fca5a5;border-radius:6px;padding:3px 8px;font-size:0.75rem;color:#dc2626;cursor:pointer;"><i class="ph ph-eraser"></i> Limpar</button>
                            </div>
                            <p style="font-size:0.75rem;color:#94a3b8;margin:4px 0 0;">Use o dedo (celular/tablet) ou o mouse para assinar no campo acima.</p>
                        </div>

                        <!-- Selfie -->
                        <div style="flex:1;min-width:300px;">
                            <label style="display:block;font-size:0.85rem;font-weight:700;color:#334155;margin-bottom:0.5rem;"><i class="ph ph-camera" style="color:#0f4c81;margin-right:4px;"></i>Selfie do Colaborador <span style="color:#64748b;font-weight:400;font-size:0.78rem;">(data/hora BRT carimbada)</span></label>
                            <div style="display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap;">
                                <div style="position:relative;border-radius:10px;overflow:hidden;background:#0f172a;width:180px;height:140px;flex-shrink:0;">
                                    <video id="fbk-selfie-video" autoplay playsinline style="width:180px;height:140px;object-fit:cover;display:block;"></video>
                                    <div id="fbk-selfie-ts" style="position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,0.65);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;font-family:monospace;"></div>
                                    <canvas id="fbk-selfie-canvas" style="display:none;"></canvas>
                                    <img id="fbk-selfie-preview" style="display:none;width:180px;height:140px;object-fit:cover;border-radius:10px;" />
                                </div>
                                <div style="display:flex;flex-direction:column;gap:0.6rem;">
                                    <button id="fbk-btn-capturar" onclick="window._fbkCaptureSelfie()" style="background:#0f4c81;color:#fff;border:none;border-radius:8px;padding:0.6rem 1rem;font-size:0.83rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-camera"></i> Capturar</button>
                                    <button id="fbk-btn-recapturar" onclick="window._fbkRetakeSelfie()" style="display:none;background:#64748b;color:#fff;border:none;border-radius:8px;padding:0.6rem 1rem;font-size:0.83rem;font-weight:600;cursor:pointer;"><i class="ph ph-arrow-counter-clockwise"></i> Recapturar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:0.75rem;background:#f8fafc;flex-shrink:0;flex-wrap:wrap;">
                    <button onclick="document.getElementById('fbk-sign-overlay').remove();window._fbkStopCamera();" style="padding:0.65rem 1.25rem;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#64748b;font-weight:600;cursor:pointer;">Voltar</button>
                    <button id="fbk-btn-salvar" onclick="window._fbkSalvarAssinar(${colabId},'${nome.replace(/'/g,"\\'")}',${ano},${trim},'${dept.replace(/'/g,"\\'")}','${cargo.replace(/'/g,"\\'")}')" style="padding:0.65rem 1.4rem;border-radius:8px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(16,185,129,0.35);"><i class="ph ph-file-pdf"></i> Confirmar e Gerar PDF</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);

        // Inicializar signature pad
        const canvas = document.getElementById('fbk-sig-canvas');
        canvas.width = canvas.parentElement.offsetWidth || 640;
        window._fbkSigPad = new SignaturePad(canvas, { backgroundColor: 'rgba(255,255,255,0)', penColor: '#1e293b', minWidth: 1.5, maxWidth: 3 });
        window._fbkClearSig = function() { window._fbkSigPad.clear(); };

        window._fbkStopCamera = function() {
            if (window._fbkStream) {
                window._fbkStream.getTracks().forEach(t => t.stop());
                window._fbkStream = null;
            }
        };

        window._fbkCaptureSelfie = function() {
            const vid = document.getElementById('fbk-selfie-video');
            const can = document.getElementById('fbk-selfie-canvas');
            const pre = document.getElementById('fbk-selfie-preview');
            const tsEl = document.getElementById('fbk-selfie-ts');
            if (!vid || !can || !pre || !tsEl) return;
            
            can.width = vid.videoWidth || 560;
            can.height = vid.videoHeight || 420;
            const ctx = can.getContext('2d');
            ctx.drawImage(vid, 0, 0, can.width, can.height);
            
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, can.height - 40, can.width, 40);
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px monospace';
            ctx.fillText(tsEl.textContent, 10, can.height - 15);
            
            window._fbkSelfieData = can.toDataURL('image/jpeg', 0.85);
            pre.src = window._fbkSelfieData;
            
            vid.style.display = 'none';
            tsEl.style.display = 'none';
            pre.style.display = 'block';
            
            const btnCap = document.getElementById('fbk-btn-capturar');
            const btnRec = document.getElementById('fbk-btn-recapturar');
            if (btnCap) btnCap.style.display = 'none';
            if (btnRec) btnRec.style.display = 'flex';
        };

        window._fbkRetakeSelfie = function() {
            window._fbkSelfieData = null;
            document.getElementById('fbk-selfie-preview').style.display = 'none';
            document.getElementById('fbk-selfie-video').style.display = 'block';
            document.getElementById('fbk-selfie-ts').style.display = 'block';
            
            const btnCap = document.getElementById('fbk-btn-capturar');
            const btnRec = document.getElementById('fbk-btn-recapturar');
            if (btnCap) btnCap.style.display = 'flex';
            if (btnRec) btnRec.style.display = 'none';
        };

        // Iniciar câmera
        window._fbkStream = null;
        window._fbkSelfieData = null;

        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 560, height: 420 }, audio: false });
                window._fbkStream = stream;
                const vid = document.getElementById('fbk-selfie-video');
                if (vid) { vid.srcObject = stream; }
                function updateTS() {
                    const tsEl = document.getElementById('fbk-selfie-ts');
                    if (!tsEl || !window._fbkStream) return;
                    const nowBRT = new Date(Date.now() - 3 * 60 * 60 * 1000);
                    tsEl.textContent = nowBRT.toISOString().replace('T',' ').substring(0,19) + ' BRT';
                    if (!window._fbkSelfieData) setTimeout(updateTS, 1000);
                }
                updateTS();
            } catch(e) {
                const cap = document.getElementById('fbk-btn-capturar');
                if (cap) { cap.disabled = true; cap.title = 'Câmera não disponível: ' + e.message; }
            }
        }
        startCamera();
    };


    window._fbkSalvarAssinar = async function(colabId, nome, ano, trim, deptStr, cargoStr) {
        if (!window._fbkSigPad || window._fbkSigPad.isEmpty()) {
            alert('Por favor, o colaborador deve assinar antes de continuar.'); return;
        }
        if (!window._fbkSelfieData) {
            alert('Por favor, capture a selfie do colaborador antes de continuar.'); return;
        }
        const btn = document.getElementById('fbk-btn-salvar');
        if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner-sm" style="border-color:#a7f3d0;border-top-color:#fff;width:16px;height:16px;border-width:2px;"></div> Gerando PDF...'; }

        try {
            const tok = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
            const assinatura_base64 = window._fbkSigPad.toDataURL('image/png');
            const selfie_base64 = window._fbkSelfieData;

            const grupo = window.matchTemplateGroup ? window.matchTemplateGroup('desempenho', deptStr, cargoStr) : null;
            const perguntas_text = (grupo && window.AVALIACAO_QUESTIONS && window.AVALIACAO_QUESTIONS.desempenho) ? window.AVALIACAO_QUESTIONS.desempenho[grupo] : null;

            const r = await fetch(`${API}/api/feedback-documentos/assinar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
                body: JSON.stringify({ colaborador_id: colabId, ano, trimestre: trim, assinatura_base64, selfie_base64, perguntas_text })
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'Erro ao gerar PDF');

            window._fbkStopCamera();
            document.getElementById('fbk-sign-overlay')?.remove();

            // Atualizar o botão da tabela diretamente para virar um ícone de olho
            const rowBtn = document.querySelector(`button[data-colab-id="${colabId}"]`);
            if (rowBtn && rowBtn.parentElement) {
                const parent = rowBtn.parentElement;
                const regBtn = parent.querySelector('button[title="Registrar Feedback"]');
                if (regBtn) regBtn.remove();
                if (!parent.querySelector('button[title="Ver PDF do Feedback Assinado"]')) {
                    parent.insertAdjacentHTML('beforeend', 
                    `<button
                        onclick="window.open('${data.pdf_url}', '_blank')"
                        title="Ver PDF do Feedback Assinado"
                        style="background:#0f4c81;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.6rem;font-size:0.75rem;cursor:pointer;font-weight:600;margin-left:4px;">
                        <i class="ph ph-eye"></i>
                    </button>`);
                }
            }

            // Mostrar modal de sucesso com botão para ver PDF
            const s = document.createElement('div');
            s.innerHTML = `
            <div id="fbk-success-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.7);z-index:10001;display:flex;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:16px;padding:2.5rem 2rem;max-width:420px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                    <div style="font-size:3rem;margin-bottom:1rem;">✅</div>
                    <h3 style="margin:0 0 0.5rem;color:#166534;">Feedback Registrado!</h3>
                    <p style="color:#64748b;margin:0 0 1.5rem;font-size:0.9rem;">Assinatura e selfie salvas com sucesso. O PDF foi gerado e armazenado.</p>
                    <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
                        <button onclick="window.open('${data.pdf_url}','_blank')" style="background:#0f4c81;color:#fff;border:none;border-radius:8px;padding:0.65rem 1.25rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-eye"></i> Ver PDF</button>
                        <button onclick="document.getElementById('fbk-success-overlay').remove();if(typeof window.initFeedbackGestor==='function')window.initFeedbackGestor();" style="background:#f1f5f9;color:#334155;border:none;border-radius:8px;padding:0.65rem 1.25rem;font-weight:600;cursor:pointer;">Fechar</button>
                    </div>
                </div>
            </div>`;
            document.body.appendChild(s);

        } catch(err) {
            alert('Erro: ' + err.message);
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-file-pdf"></i> Assinar e Gerar PDF'; }
        }
    };
    // Helper global para excluir avaliação
    window._desExcluirAvaliacao = async function(colabId, ano, trimestre) {
        if (!confirm('Tem certeza que deseja excluir esta avaliação de desempenho e recomeçar?\n\nIsso apagará o formulário respondido e o PDF gerado (se houver).')) return;
        
        try {
            const tok = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
            const r = await fetch(`${API}/api/avaliacoes/desempenho/${colabId}/${ano}/${trimestre}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${tok}` }
            });
            if (!r.ok) throw new Error(await r.text());
            
            alert('Avaliação excluída com sucesso.');
            if (typeof window.initFeedbackGestor === 'function') window.initFeedbackGestor();
        } catch (e) {
            alert('Erro ao excluir avaliação: ' + e.message);
        }
    };
})();

