/* ============================================================
   satisfacao_rh.js — Dashboard de Satisfação dos Colaboradores
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
    window.initSatisfacaoRH = async function () {
        const container = document.getElementById('satisfacao-rh-container');
        if (!container) return;
        container.innerHTML = '<div style="display:flex;align-items:center;gap:1rem;padding:2rem;color:#94a3b8;"><div class="spinner-sm"></div> Carregando dados de satisfação…</div>';

        try {
            const [dash, colabs] = await Promise.all([
                fetchJSON('/avaliacoes/satisfacao/dashboard'),
                fetchJSON('/avaliacoes/satisfacao/colaboradores'),
            ]);
            _dash = dash;
            _colabs = colabs;
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
            <h1><i class="ph ph-smiley" style="color:#7c3aed;margin-right:.4rem;"></i>Satisfação dos Colaboradores</h1>
            <p class="sub">Acompanhe a satisfação por departamento e tópico nas últimas 4 pesquisas</p>

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
            <h3 style="color:#334155;margin:0 0 .5rem;">Nenhuma pesquisa de satisfação encontrada</h3>
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
                <button class="sat-tab ${g === _filterGroup ? 'active' : ''}" onclick="window._satSetGroup('${g}')">
                    ${g === 'all' ? 'Todos os grupos' : grupoLabel(g)}
                </button>
            `).join('')}
        </div>`;
    }

    window._satSetGroup = function (g) {
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
        const d = (dept || '').toLowerCase();
        const c = (cargo || '').toLowerCase();
        if (c.includes('motorista') || d.includes('motorista') || c.includes('ajudante') || d.includes('ajudante')) return 'motorista';
        if (d.includes('manutencao') || d.includes('manutenção') || c.includes('manutencao') || c.includes('manutenção')) return 'manutencao';
        return 'escritorio';
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
            <input class="sat-search-input" id="sat-colab-search" placeholder="Filtrar por nome, departamento ou cargo…" oninput="window._satFilterColabs()" />
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
                <th onclick="window._satSortColabs('nome')">Colaborador ${_sortCol==='nome'?(_sortDir>0?'▲':'▼'):''}</th>
                <th onclick="window._satSortColabs('departamento')">Departamento ${_sortCol==='departamento'?(_sortDir>0?'▲':'▼'):''}</th>
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

        return `<tr>
            <td>
                <div class="sat-avatar-cell">
                    ${avatarHTML(c)}
                    <div>
                        <div style="font-weight:600;color:#1e293b;font-size:.83rem;" title="${c.nome_completo}">${c.nome_completo.length > 15 ? c.nome_completo.substring(0, 15) + '...' : c.nome_completo}</div>
                        <div style="color:#94a3b8;font-size:.72rem;">${c.cargo || '—'}</div>
                    </div>
                </div>
            </td>
            <td style="color:#64748b;font-size:.82rem;">${c.departamento || '—'}</td>
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
                <button
                    data-colab-id="${c.id}"
                    data-colab-nome="${(c.nome_completo || '').replace(/"/g, '&quot;')}"
                    data-colab-cargo="${(c.cargo || '').replace(/"/g, '&quot;')}"
                    data-colab-dept="${(c.departamento || '').replace(/"/g, '&quot;')}"
                    data-respostas="${lastP && lastP.respostas ? btoa(unescape(encodeURIComponent(JSON.stringify(lastP.respostas)))) : ''}"
                    onclick="window._satOpenFormBtn(this)"
                    style="background:${lastP && lastP.respondido ? '#0ea5e9' : '#7c3aed'};color:#fff;border:none;border-radius:6px;padding:0.35rem 0.6rem;font-size:0.75rem;cursor:pointer;font-weight:600;">
                    <i class="ph ph-pencil-simple" style="margin-right:4px;"></i>${lastP && lastP.respondido ? 'Editar' : 'Responder'}
                </button>
            </td>
        </tr>`;
    }

    /* ── FILTER & SORT ──────────────────────────────────────── */
    function getFilteredColabs() {
        let colabs = (_colabs.colaboradores || []).slice();
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

    window._satFilterColabs = function () {
        _searchText = document.getElementById('sat-colab-search')?.value || '';
        const wrap = document.getElementById('sat-colab-table-wrap');
        if (wrap) wrap.innerHTML = renderColabTable();
    };

    window._satSortColabs = function (col) {
        if (_sortCol === col) _sortDir *= -1;
        else { _sortCol = col; _sortDir = 1; }
        const wrap = document.getElementById('sat-colab-table-wrap');
        if (wrap) wrap.innerHTML = renderColabTable();
    };

    window._satOpenFormBtn = function(btn) {
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
        window._satOpenForm(id, nome, cargo, dept, saved);
    };

    window._satOpenForm = function(colabId, nome, cargo, dept, saved = {}) {
        if (!window.AVALIACAO_QUESTIONS || !window.AVALIACAO_QUESTIONS.satisfacao) {
            alert('Erro: Perguntas de satisfação não carregadas.');
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
        const perguntasGroup = window.AVALIACAO_QUESTIONS.satisfacao[grupo];
        if (!perguntasGroup) {
            alert('Erro: Perguntas não encontradas para o grupo "' + grupo + '".');
            return;
        }
        
        let html = `<div id="sat-modal-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(3px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;">
            <div style="background:#fff;border-radius:14px;width:100%;max-width:900px;height:90vh;display:flex;flex-direction:column;box-shadow:0 10px 25px rgba(0,0,0,0.2);animation: satModalFadeIn 0.2s ease-out;">
                <div style="padding:1.5rem 2rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#0f4c81;color:#fff;border-radius:14px 14px 0 0;">
                    <div>
                        <h2 style="margin:0;font-size:1.25rem;color:#fff;"><i class="ph ph-smiley" style="color:#cffafe;margin-right:.5rem;"></i>Avaliação de Satisfação</h2>
                        <div style="color:#e0f2fe;font-size:0.85rem;margin-top:0.3rem;"><strong>${nome}</strong> — ${cargo || dept}</div>
                    </div>
                    <button onclick="window._satCloseForm()" style="background:none;border:none;font-size:1.5rem;color:#fff;cursor:pointer;transition:color 0.2s;"><i class="ph ph-x"></i></button>
                </div>
                
                <div style="padding:2rem;overflow-y:auto;flex:1;background:#f8fafc;" id="sat-form-body">
                    <p style="margin-top:0; margin-bottom:1.5rem; color:#0f4c81; font-size:1.05rem; font-weight:700; background:#e0f2fe; padding:12px 16px; border-radius:8px; border-left:5px solid #0ea5e9; box-shadow:0 2px 4px rgba(14,165,233,0.15);">
                        Avalie cada critério (1 Muito ruim - 2 Ruim - 3 Médio - 4 Bom - 5 Muito bom) e adicione uma observação caso aplicável.
                    </p>
                    <style>
                        @keyframes satModalFadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                    </style>
                    <form id="sat-modal-form" onsubmit="window._satSubmitForm(event, ${colabId}, '${grupo}')">`;

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
                    <div style="width:35%; min-width:280px; font-size:0.95rem; color:#475569; font-weight:500;">${pergunta}</div>
                    <div style="flex:1; display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                        <div style="display:flex; gap:0.35rem; flex-shrink:0;">
                `;
                
                const qColors = { 1:'#ef4444', 2:'#f97316', 3:'#eab308', 4:'#84cc16', 5:'#22c55e' };
                const bgColors = { 1:'#fee2e2', 2:'#ffedd5', 3:'#fef3c7', 4:'#ecfccb', 5:'#dcfce7' };
                
                for(let v=1; v<=5; v++) {
                    const c = qColors[v]; const bg = bgColors[v];
                    const isChecked = (val != null && parseInt(val) === v);
                    const checkedAttr = isChecked ? 'checked' : '';
                    const btnBg = isChecked ? c : '#fff';
                    const btnColor = isChecked ? '#fff' : c;
                    const btnBorder = isChecked ? c : '#cbd5e1';
                    html += `
                    <label style="cursor:pointer; position:relative; margin:0;" title="Nota ${v}">
                        <input type="radio" name="av_${catIdx}_${idx}" value="${v}" ${checkedAttr} style="position:absolute; opacity:0; pointer-events:none;">
                        <div class="sat-rbtn" data-color="${c}" data-bg="${c}" data-group="av_${catIdx}_${idx}"
                             style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:6px; font-weight:700; font-size:0.85rem; border:2px solid ${btnBorder}; background:${btnBg}; color:${btnColor}; transition:all 0.15s; cursor:pointer;"
                             onclick="(function(el){var grp=el.dataset.group; document.querySelectorAll('.sat-rbtn[data-group=\''+grp+'\']').forEach(function(b){b.style.background='#fff';b.style.color=b.dataset.color;b.style.borderColor='#cbd5e1';}); el.style.background=el.dataset.bg; el.style.color='#fff'; el.style.borderColor=el.dataset.color; var inp=el.previousElementSibling; if(inp)inp.checked=true;})(this)">
                            ${v}
                        </div>
                    </label>`;
                }
                
                html += `
                        </div>
                        <input type="text" name="av_obs_${catIdx}_${idx}" value="${String(obsStr).replace(/"/g, '&quot;')}" placeholder="Observação (opcional)..." style="flex:1; min-width:250px; padding:0.4rem 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; outline:none; color:#334155; height:32px; box-sizing:border-box;">
                    </div>
                </div>`;
            });
            html += `</div></div>`;
            catIdx++;
        });

        const infoAdic = (saved.__obs__ && saved.__obs__.info_adicional) ? saved.__obs__.info_adicional : '';
        html += `
                        <div style="margin-top:2.5rem;padding:1.5rem;background:#fff;border:1px dashed #cbd5e1;border-radius:8px;">
                            <label style="display:block;font-size:0.85rem;font-weight:600;color:#475569;margin-bottom:0.5rem;">Informações Adicionais / Observação Geral (Opcional)</label>
                            <textarea name="info_adicional" rows="2" style="width:100%;padding:0.75rem;border-radius:6px;border:1px solid #cbd5e1;font-size:0.9rem;font-family:inherit;resize:vertical;" placeholder="Observações, feedback extra...">${infoAdic}</textarea>
                        </div>
                        
                        <div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:2rem;">
                            <button type="button" onclick="window._satCloseForm()" style="padding:0.75rem 1.5rem;border-radius:8px;font-weight:600;border:1px solid #cbd5e1;background:#fff;color:#64748b;cursor:pointer;">Cancelar</button>
                            <button type="submit" id="sat-btn-submit" style="padding:0.75rem 1.5rem;border-radius:8px;font-weight:600;border:none;background:#0f4c81;color:#fff;cursor:pointer;display:flex;align-items:center;gap:0.5rem;box-shadow:0 2px 4px rgba(15,76,129,0.3);"><i class="ph ph-check-circle"></i> Salvar Respostas</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);
    };

    window._satCloseForm = function() {
        const overlay = document.getElementById('sat-modal-overlay');
        if (overlay) overlay.remove();
    };

    window._satSubmitForm = async function(e, colabId, grupo) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = document.getElementById('sat-btn-submit');
        
        // current quarter
        const currentYear = new Date().getFullYear();
        const currentQ = Math.floor(new Date().getMonth() / 3) + 1;
        
        // build respostas_json — salva como arrays para compatibilidade com backend
        const respostas = { __obs__: {} };
        const perguntasGroup = window.AVALIACAO_QUESTIONS.satisfacao[grupo];
        const categories = Object.keys(perguntasGroup);
        let missingRequired = [];
        
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
                    missingRequired.push(`${cat} — Pergunta ${i+1}`);
                }
                const obs = form.elements[`av_obs_${catIdx}_${i}`];
                respostas.__obs__[cat].push((obs && obs.value.trim()) ? obs.value.trim() : '');
            });
            // limpar array de obs vazio ao final
            if (respostas.__obs__[cat].every(v => v === '')) delete respostas.__obs__[cat];
        });
        
        if (missingRequired.length > 0) {
            alert('Por favor, responda todas as perguntas antes de salvar.\n\nPendentes:\n' + missingRequired.slice(0,5).join('\n'));
            return;
        }
        
        const infoAdicional = form.elements['info_adicional']?.value;
        if (infoAdicional) respostas.__obs__.info_adicional = infoAdicional.trim();
        
        try {
            submitBtn.innerHTML = '<div class="spinner-sm" style="border-color:#c4b5fd;border-top-color:#fff;"></div> Salvando...';
            submitBtn.disabled = true;
            
            const r = await fetch(API_URL.replace('/api', '') + '/api/avaliacoes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token'))
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
            
            alert('Pesquisa salva com sucesso!');
            window._satCloseForm();
            
            // Recarregar a tela inteira para atualizar os números
            if (typeof window.initSatisfacaoRH === 'function') window.initSatisfacaoRH();
            
        } catch(err) {
            alert('Erro ao salvar pesquisa: ' + err.message);
            submitBtn.innerHTML = '<i class="ph ph-check-circle"></i> Salvar Pesquisa';
            submitBtn.disabled = false;
        }
    };
})();
