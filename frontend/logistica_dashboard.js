/* ══════════════════════════════════════════════════════════════════
   MÓDULO: DASHBOARD DE LOGÍSTICA
   ══════════════════════════════════════════════════════════════════ */

const DIAS_SEMANA_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_SEMANA_FULL  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const TIPO_SERVICO_CORES = {
    'ENTREGA':     '#2d9e5f',
    'RETIRADA':    '#ef4444',
    'MANUTENCAO':  '#f59e0b',
    'VISITA':      '#3b82f6',
    'LIMPA FOSSA': '#8b5cf6',
    'REPARO':      '#06b6d4',
    'SUCCAO':      '#f97316',
    'OUTROS':      '#94a3b8',
};

let _dashCharts = {};

function _destroyDashChart(id) {
    if (_dashCharts[id]) { _dashCharts[id].destroy(); delete _dashCharts[id]; }
}

function _normalizarTipoServico(ts) {
    const u = (ts || '').toUpperCase();
    if (u.includes('ENTREGA'))      return 'ENTREGA';
    if (u.includes('RETIRADA'))     return 'RETIRADA';
    if (u.includes('MANUTENCAO') || u.includes('MANUTENÇÃO')) return 'MANUTENCAO';
    if (u.includes('VISITA'))       return 'VISITA';
    if (u.includes('LIMPA FOSSA')) return 'LIMPA FOSSA';
    if (u.includes('REPARO'))       return 'REPARO';
    if (u.includes('SUCCAO') || u.includes('SUCÇÃO')) return 'SUCCAO';
    return 'OUTROS';
}

/* Converte dias_semana do banco (array JSON ou string) → array de índices numéricos 0–6 */
function _parseDiasSemana(raw) {
    if (!raw) return [];
    try {
        const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!Array.isArray(arr)) return [];
        return arr.map(d => {
            if (typeof d === 'number') return d;
            const s = String(d).toUpperCase();
            const map = { DOM:0, SEG:1, TER:2, QUA:3, QUI:4, SEX:5, SAB:6, 'SÁB':6 };
            for (const [k,v] of Object.entries(map)) { if (s.startsWith(k)) return v; }
            return parseInt(d);
        }).filter(n => !isNaN(n) && n >= 0 && n <= 6);
    } catch { return []; }
}

/* Conta banheiros (itens de produtos) de uma OS */
function _contarBanheiros(produtosRaw) {
    if (!produtosRaw) return 0;
    try {
        const arr = typeof produtosRaw === 'string' ? JSON.parse(produtosRaw) : produtosRaw;
        if (!Array.isArray(arr)) return 0;
        return arr.reduce((acc, p) => acc + (parseInt(p.qtd || p.quantidade || 0)), 0);
    } catch { return 0; }
}

window.renderLogisticaDashboard = async function() {
    const container = document.getElementById('logistica-dashboard-container');
    if (!container) return;

    container.innerHTML = `
    <div style="padding:1.5rem;">
        <!-- Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
            <div style="display:flex; align-items:center; gap:14px;">
                <div style="background:linear-gradient(135deg,#2d9e5f,#059669); width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(45,158,95,0.3);">
                    <i class="ph ph-chart-bar" style="font-size:1.7rem; color:#fff;"></i>
                </div>
                <div>
                    <h1 style="margin:0; font-size:1.5rem; font-weight:800; color:#0f172a;">Dashboard de Logística</h1>
                    <p style="margin:0; color:#64748b; font-size:0.85rem;">Análise de OSs · Rota Redonda</p>
                </div>
            </div>
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                <select id="dash-filtro-periodo" onchange="renderLogisticaDashboard()" style="padding:8px 12px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:0.88rem; background:#fff; outline:none; color:#334155; cursor:pointer;">
                    <option value="todos">Todos os registros</option>
                    <option value="30">Últimos 30 dias</option>
                    <option value="90">Últimos 90 dias</option>
                    <option value="180">Últimos 180 dias</option>
                </select>
                <select id="dash-filtro-tipo-os" onchange="renderLogisticaDashboard()" style="padding:8px 12px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:0.88rem; background:#fff; outline:none; color:#334155; cursor:pointer;">
                    <option value="todos">Obra + Evento</option>
                    <option value="Obra">Apenas Obra</option>
                    <option value="Evento">Apenas Evento</option>
                </select>
                <button onclick="renderLogisticaDashboard()" style="background:#2d9e5f; color:#fff; border:none; padding:8px 16px; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.88rem;">
                    <i class="ph ph-arrows-clockwise"></i> Atualizar
                </button>
            </div>
        </div>

        <!-- KPI Cards -->
        <div id="dash-kpi-row" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:1rem; margin-bottom:1.5rem;">
            <div style="text-align:center; padding:20px; background:#fff; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <i class="ph ph-spinner ph-spin" style="font-size:2rem; color:#94a3b8;"></i>
                <p style="color:#94a3b8; margin:8px 0 0; font-size:0.85rem;">Carregando...</p>
            </div>
        </div>

        <!-- Gráfico 1 + 2 -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:1.25rem;">
            <div class="dash-card" style="background:#fff; border-radius:14px; border:1px solid #e2e8f0; box-shadow:0 2px 10px rgba(0,0,0,0.05); padding:1.25rem;">
                <h3 style="margin:0 0 1rem; font-size:0.95rem; font-weight:700; color:#1e293b; display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-calendar-check" style="color:#2d9e5f;"></i> Atendimentos por Dia da Semana
                </h3>
                <div style="position: relative; height: 260px; width: 100%;">
                    <canvas id="chart-dias-semana"></canvas>
                </div>
            </div>
            <div class="dash-card" style="background:#fff; border-radius:14px; border:1px solid #e2e8f0; box-shadow:0 2px 10px rgba(0,0,0,0.05); padding:1.25rem;">
                <h3 style="margin:0 0 1rem; font-size:0.95rem; font-weight:700; color:#1e293b; display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-chart-pie" style="color:#7c3aed;"></i> Tipos de Serviço
                </h3>
                <div style="position: relative; height: 260px; width: 100%;">
                    <canvas id="chart-tipos-servico"></canvas>
                </div>
            </div>
        </div>

        <!-- Gráfico 3 -->
        <div style="background:#fff; border-radius:14px; border:1px solid #e2e8f0; box-shadow:0 2px 10px rgba(0,0,0,0.05); padding:1.25rem; margin-bottom:1.25rem;">
            <h3 style="margin:0 0 1rem; font-size:0.95rem; font-weight:700; color:#1e293b; display:flex; align-items:center; gap:8px;">
                <i class="ph ph-toilet" style="color:#06b6d4;"></i> Serviços e Banheiros por Motorista
            </h3>
            <div style="overflow-x:auto;">
                <div style="position: relative; height: 260px; min-width: 600px;">
                    <canvas id="chart-motorista-banheiros"></canvas>
                </div>
            </div>
        </div>

        <!-- Gráfico 4 -->
        <div style="background:#fff; border-radius:14px; border:1px solid #e2e8f0; box-shadow:0 2px 10px rgba(0,0,0,0.05); padding:1.25rem;">
            <h3 style="margin:0 0 1rem; font-size:0.95rem; font-weight:700; color:#1e293b; display:flex; align-items:center; gap:8px;">
                <i class="ph ph-table" style="color:#f59e0b;"></i> Quantidade de OSs por Motorista × Dia da Semana
            </h3>
            <div id="table-motorista-dia" style="overflow-x:auto;"></div>
        </div>
    </div>`;

    // Buscar dados
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    let todasOs = [];
    try {
        const res = await fetch('/api/logistica/os/buscar', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) todasOs = await res.json();
    } catch(e) { console.error('[Dashboard Logística]', e); }

    // Filtros
    const periodoEl = document.getElementById('dash-filtro-periodo');
    const tipoOsEl  = document.getElementById('dash-filtro-tipo-os');
    const dias  = periodoEl ? parseInt(periodoEl.value) : null;
    const tipoF = tipoOsEl ? tipoOsEl.value : 'todos';

    if (dias && !isNaN(dias)) {
        const corte = new Date(); corte.setDate(corte.getDate() - dias);
        todasOs = todasOs.filter(o => o.data_os && new Date(o.data_os) >= corte);
    }
    if (tipoF !== 'todos') {
        todasOs = todasOs.filter(o => (o.tipo_os || '').toLowerCase() === tipoF.toLowerCase());
    }

    _renderKpis(todasOs);
    _renderChartDiasSemana(todasOs);
    _renderChartTiposServico(todasOs);
    _renderChartMotoristaBanheiros(todasOs);
    _renderTabelaMotoristasDia(todasOs);
};

/* ── KPIs ─────────────────────────────────────────────────────────── */
function _renderKpis(os) {
    const row = document.getElementById('dash-kpi-row');
    if (!row) return;

    const totalOs       = os.length;
    const motoristas    = [...new Set(os.map(o => (o.responsavel || '').trim()).filter(Boolean))];
    const totalBanheiros = os.reduce((a, o) => a + _contarBanheiros(o.produtos), 0);
    const tiposSet      = new Set(os.map(o => _normalizarTipoServico(o.tipo_servico)));
    const totalMotorist = motoristas.length;

    const kpis = [
        { icon: 'ph-clipboard-text', color: '#2d9e5f', bg: '#dcfce7', val: totalOs,        label: 'Total de OSs' },
        { icon: 'ph-user-circle',    color: '#3b82f6', bg: '#dbeafe', val: totalMotorist,   label: 'Motoristas Ativos' },
        { icon: 'ph-toilet',         color: '#06b6d4', bg: '#cffafe', val: totalBanheiros,  label: 'Banheiros Atendidos' },
        { icon: 'ph-list-checks',    color: '#7c3aed', bg: '#ede9fe', val: tiposSet.size,   label: 'Tipos de Serviço' },
    ];

    row.innerHTML = kpis.map(k => `
        <div style="background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:1.1rem 1rem; display:flex; align-items:center; gap:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            <div style="background:${k.bg}; width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="ph ${k.icon}" style="font-size:1.4rem; color:${k.color};"></i>
            </div>
            <div>
                <div style="font-size:1.6rem; font-weight:800; color:#0f172a; line-height:1;">${k.val.toLocaleString('pt-BR')}</div>
                <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">${k.label}</div>
            </div>
        </div>`).join('');
}

/* ── Chart 1: Atendimentos por Dia da Semana agrupados por Tipo ────── */
function _renderChartDiasSemana(os) {
    _destroyDashChart('dias');
    const canvas = document.getElementById('chart-dias-semana');
    if (!canvas) return;

    // Conta por dia e tipo
    const tipos = [...new Set(os.map(o => _normalizarTipoServico(o.tipo_servico)))].sort();
    const data = {};
    tipos.forEach(t => { data[t] = Array(7).fill(0); });

    os.forEach(o => {
        const tipo  = _normalizarTipoServico(o.tipo_servico);
        const dias  = _parseDiasSemana(o.dias_semana);
        dias.forEach(d => { if (data[tipo]) data[tipo][d]++; });
        // Se não tiver dias_semana, usa data_os
        if (dias.length === 0 && o.data_os) {
            const d = new Date(o.data_os + 'T12:00:00').getDay();
            if (data[tipo]) data[tipo][d]++;
        }
    });

    const datasets = tipos.map(t => ({
        label: t,
        data: data[t],
        backgroundColor: (TIPO_SERVICO_CORES[t] || '#94a3b8') + 'CC',
        borderColor: TIPO_SERVICO_CORES[t] || '#94a3b8',
        borderWidth: 1,
        borderRadius: 4,
    }));

    _dashCharts['dias'] = new Chart(canvas, {
        type: 'bar',
        data: { labels: DIAS_SEMANA_LABEL, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } } },
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

/* ── Chart 2: Tipos de Serviço (Doughnut) ───────────────────────── */
function _renderChartTiposServico(os) {
    _destroyDashChart('tipos');
    const canvas = document.getElementById('chart-tipos-servico');
    if (!canvas) return;

    const contagem = {};
    os.forEach(o => {
        const t = _normalizarTipoServico(o.tipo_servico);
        contagem[t] = (contagem[t] || 0) + 1;
    });

    const labels = Object.keys(contagem);
    const values = Object.values(contagem);
    const cores  = labels.map(l => TIPO_SERVICO_CORES[l] || '#94a3b8');

    _dashCharts['tipos'] = new Chart(canvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: cores, borderWidth: 2 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 8 } },
                tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} OS` } }
            }
        }
    });
}

/* ── Chart 3: Serviços + Banheiros por Motorista ────────────────── */
function _renderChartMotoristaBanheiros(os) {
    _destroyDashChart('motorista');
    const canvas = document.getElementById('chart-motorista-banheiros');
    if (!canvas) return;

    const agr = {};
    os.forEach(o => {
        const nome = (o.responsavel || 'Não atribuído').trim();
        if (!agr[nome]) agr[nome] = { servicos: 0, banheiros: 0 };
        agr[nome].servicos++;
        agr[nome].banheiros += _contarBanheiros(o.produtos);
    });

    // Ordena por serviços desc, top 20
    const sorted = Object.entries(agr).sort((a,b) => b[1].servicos - a[1].servicos).slice(0, 20);
    const labels    = sorted.map(([n]) => n.split(' ').slice(0,2).join(' '));
    const servicos  = sorted.map(([,v]) => v.servicos);
    const banheiros = sorted.map(([,v]) => v.banheiros);

    // Canvas dinâmico baseado no número de motoristas
    canvas.width = Math.max(sorted.length * 50, 400);
    canvas.height = 260;

    _dashCharts['motorista'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Serviços (OSs)', data: servicos,  backgroundColor: '#2d9e5f99', borderColor: '#2d9e5f', borderWidth: 1.5, borderRadius: 4, yAxisID: 'y' },
                { label: 'Banheiros',      data: banheiros, backgroundColor: '#06b6d499', borderColor: '#06b6d4', borderWidth: 1.5, borderRadius: 4, yAxisID: 'y2' },
            ]
        },
        options: {
            responsive: false, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } } },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 35 } },
                y:  { beginAtZero: true, position: 'left',  title: { display: true, text: 'OSs', font: { size: 11 } }, ticks: { precision: 0 } },
                y2: { beginAtZero: true, position: 'right', title: { display: true, text: 'Banheiros', font: { size: 11 } }, grid: { drawOnChartArea: false }, ticks: { precision: 0 } },
            }
        }
    });
}

/* ── Tabela 4: Motorista × Dia da Semana ────────────────────────── */
function _renderTabelaMotoristasDia(os) {
    const container = document.getElementById('table-motorista-dia');
    if (!container) return;

    const motoristas = [...new Set(os.map(o => (o.responsavel || 'Não atribuído').trim()))].sort();
    const grid = {}; // grid[motorista][dia] = count
    motoristas.forEach(m => { grid[m] = Array(7).fill(0); });

    os.forEach(o => {
        const m    = (o.responsavel || 'Não atribuído').trim();
        const dias = _parseDiasSemana(o.dias_semana);
        dias.forEach(d => { if (grid[m]) grid[m][d]++; });
        if (dias.length === 0 && o.data_os) {
            const d = new Date(o.data_os + 'T12:00:00').getDay();
            if (grid[m]) grid[m][d]++;
        }
    });

    if (motoristas.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:2rem;">Nenhum dado disponível.</p>';
        return;
    }

    const maxVal = Math.max(...motoristas.flatMap(m => grid[m])) || 1;

    const heatColor = (v) => {
        if (!v) return '#f8fafc';
        const pct = v / maxVal;
        if (pct < 0.25) return '#dcfce7';
        if (pct < 0.5)  return '#86efac';
        if (pct < 0.75) return '#22c55e';
        return '#15803d';
    };
    const txtColor = (v) => {
        const pct = v / maxVal;
        return pct >= 0.5 ? '#fff' : '#1e293b';
    };

    const totaisDia = DIAS_SEMANA_LABEL.map((_, i) => motoristas.reduce((a, m) => a + grid[m][i], 0));

    const rows = motoristas.map(m => {
        const total = grid[m].reduce((a,b) => a+b, 0);
        const cells = grid[m].map((v, i) => `
            <td title="${DIAS_SEMANA_FULL[i]}: ${v} OS" style="text-align:center; padding:6px 8px; background:${heatColor(v)}; color:${txtColor(v)}; font-weight:${v ? '700' : '400'}; font-size:0.82rem; white-space:nowrap; border-radius:4px; min-width:44px;">
                ${v || '—'}
            </td>`).join('');
        return `<tr>
            <td style="padding:6px 10px; font-weight:600; font-size:0.82rem; color:#334155; white-space:nowrap; border-bottom:1px solid #f1f5f9;">${m.split(' ').slice(0,2).join(' ')}</td>
            ${cells}
            <td style="text-align:center; padding:6px 10px; font-weight:800; color:#2d9e5f; font-size:0.88rem; border-left:2px solid #e2e8f0;">${total}</td>
        </tr>`;
    }).join('');

    const totaisCells = totaisDia.map(v => `<td style="text-align:center; padding:6px 8px; font-weight:800; font-size:0.82rem; color:#475569; border-top:2px solid #e2e8f0;">${v || 0}</td>`).join('');

    container.innerHTML = `
    <table style="width:100%; border-collapse:separate; border-spacing:2px 2px; font-size:0.83rem;">
        <thead>
            <tr>
                <th style="text-align:left; padding:8px 10px; background:#f8fafc; border-radius:6px 0 0 6px; color:#475569; font-weight:700; font-size:0.8rem;">Motorista</th>
                ${DIAS_SEMANA_LABEL.map(d => `<th style="text-align:center; padding:8px; background:#f8fafc; color:#475569; font-weight:700; font-size:0.8rem;">${d}</th>`).join('')}
                <th style="text-align:center; padding:8px; background:#f8fafc; border-radius:0 6px 6px 0; color:#2d9e5f; font-weight:700; font-size:0.8rem;">Total</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
            <tr>
                <td style="padding:6px 10px; font-weight:800; font-size:0.82rem; color:#475569; border-top:2px solid #e2e8f0;">Total</td>
                ${totaisCells}
                <td style="text-align:center; padding:6px 10px; font-weight:800; color:#2d9e5f; font-size:0.88rem; border-top:2px solid #e2e8f0; border-left:2px solid #e2e8f0;">${totaisDia.reduce((a,b)=>a+b,0)}</td>
            </tr>
        </tfoot>
    </table>`;
}
