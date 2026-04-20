/**
 * ferias.js — Módulo de Controle de Férias
 * Status: URGENTE(red), AGENDADO(green), DE_FERIAS(purple), SEM_AGENDA(yellow), EM_AQUISICAO(gray)
 */
(function () {

    /* ─── Utilitários de data ─── */
    const fmt = (d) => {
        if (!d) return '—';
        const s = String(d).split('T')[0];
        const [y, m, day] = s.split('-');
        if (!y || !m || !day) return d;
        return `${day}/${m}/${y}`;
    };

    const parseDate = (s) => {
        if (!s) return null;
        const clean = String(s).split('T')[0];
        const d = new Date(clean + 'T12:00:00');
        return isNaN(d.getTime()) ? null : d;
    };

    const diffDays = (a, b) => Math.floor((b - a) / 86400000);

    const hoje = () => {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        return d;
    };

    /* ─── Cálculo do período aquisitivo ─── */
    function calcularFerias(admissaoStr) {
        const admissao = parseDate(admissaoStr);
        if (!admissao) return null;
        const hj = hoje();

        const diasTotal = diffDays(admissao, hj);
        const anosCompletos = Math.floor(diasTotal / 365);

        // Período aquisitivo em andamento
        const inicioAtual = new Date(admissao);
        inicioAtual.setFullYear(inicioAtual.getFullYear() + anosCompletos);
        const fimAtual = new Date(inicioAtual);
        fimAtual.setFullYear(fimAtual.getFullYear() + 1);
        const diasRestantes = diffDays(hj, fimAtual);

        if (anosCompletos < 1) {
            return {
                periodos: [],
                periodoAtual: {
                    inicio: inicioAtual.toISOString().split('T')[0],
                    fim: fimAtual.toISOString().split('T')[0],
                    diasRestantes,
                },
                temDireitoAtual: false,
            };
        }

        const periodos = [];
        for (let i = 0; i < anosCompletos; i++) {
            const inicio = new Date(admissao);
            inicio.setFullYear(inicio.getFullYear() + i);
            const fim = new Date(admissao);
            fim.setFullYear(fim.getFullYear() + i + 1);
            const prazoGozo = new Date(fim);
            prazoGozo.setFullYear(prazoGozo.getFullYear() + 1);
            const vencida = hj > prazoGozo;
            const diasParaVencer = diffDays(hj, prazoGozo); // negativo se vencida

            periodos.push({
                numero: i + 1,
                inicio: inicio.toISOString().split('T')[0],
                fim: fim.toISOString().split('T')[0],
                prazoGozo: prazoGozo.toISOString().split('T')[0],
                vencida,
                diasParaVencer,
            });
        }

        return {
            periodos,
            periodoAtual: {
                inicio: inicioAtual.toISOString().split('T')[0],
                fim: fimAtual.toISOString().split('T')[0],
                diasRestantes,
            },
            temDireitoAtual: true,
        };
    }

    /**
     * Verifica se as férias agendadas estão dentro do período aquisitivo dado.
     * Considera agendado "dentro" se o início das férias fica entre inicio e prazoGozo do período.
     */
    function agendadaDentroDoPeriodo(feriasIni, feriasFim, periodo) {
        if (!feriasIni || !periodo) return false;
        const ini = parseDate(feriasIni);
        if (!ini) return false;
        const pIni = parseDate(periodo.inicio);
        const pPrazo = parseDate(periodo.prazoGozo);
        if (!pIni || !pPrazo) return false;
        return ini >= pIni && ini <= pPrazo;
    }

    /**
     * Determina o status de férias de um colaborador.
     *
     * Prioridades (em ordem):
     *  1. DE FÉRIAS  → hoje está dentro do período de gozo agendado               (roxo)
     *  2. EM AQUISIÇÃO → menos de 12 meses de trabalho, sem direito               (cinza)
     *  3. URGENTE    → prazo máximo do período (fim + 12 meses) ≤ 90 dias         (vermelho)
     *  4. AGENDADO   → tem férias marcadas dentro do período aquisitivo ativo     (verde)
     *  5. SEM AGENDA → tem direito mas nenhuma férias agendada no período         (amarelo)
     */
    function getStatus(c) {
        const hj = hoje();
        const info = calcularFerias(c.data_admissao);
        const fIni = parseDate(c.ferias_programadas_inicio);
        const fFim = c.ferias_programadas_fim ? parseDate(c.ferias_programadas_fim) : null;

        // 1. DE FÉRIAS: hoje está entre início e fim das férias
        if (fIni && hj >= fIni && (!fFim || hj <= fFim)) return 'de_ferias';

        // 2. EM AQUISIÇÃO: menos de 12 meses de trabalho (ainda sem direito)
        if (!info || !info.temDireitoAtual) return 'em_aquisicao';

        const periodos = info.periodos;
        const ult = periodos.length > 0 ? periodos[periodos.length - 1] : null;
        if (!ult) return 'em_aquisicao';

        // 3. URGENTE: prazo de gozo (fim do período + 12 meses) ≤ 90 dias OU já vencido
        //    Independe de ter ou não férias agendadas — o prazo legal está se esgotando
        if (ult.vencida || ult.diasParaVencer <= 90) return 'urgente';

        // 4. AGENDADO: tem férias marcadas dentro de algum período ativo (prazo não urgente)
        const temAgendado = periodos.some(p =>
            !p.vencida && agendadaDentroDoPeriodo(c.ferias_programadas_inicio, c.ferias_programadas_fim, p)
        );
        if (temAgendado) return 'agendado';

        // 5. SEM AGENDA: tem direito, prazo folgado, mas sem férias agendadas no período
        return 'sem_agenda';
    }

    /* ─── Paleta de status ─── */
    const STATUS_CONFIG = {
        urgente:     { label: 'Vence em 90d',   bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', icon: 'ph-warning-circle',  badgeBg: '#fee2e2', badgeColor: '#dc2626' },
        sem_agenda:  { label: 'Sem agenda',      bg: '#fef9c3', color: '#ca8a04', border: '#fde047', icon: 'ph-calendar-x',      badgeBg: '#fef9c3', badgeColor: '#b45309' },
        agendado:    { label: 'Agendado',         bg: '#dcfce7', color: '#15803d', border: '#86efac', icon: 'ph-calendar-check',  badgeBg: '#dcfce7', badgeColor: '#15803d' },
        de_ferias:   { label: 'De férias',        bg: '#f3e8ff', color: '#7c3aed', border: '#c4b5fd', icon: 'ph-island',          badgeBg: '#f3e8ff', badgeColor: '#7c3aed' },
        em_aquisicao:{ label: 'Em aquisição',     bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1', icon: 'ph-hourglass',       badgeBg: '#f1f5f9', badgeColor: '#64748b' },
    };

    /* ─── Estado global do módulo ─── */
    let _allColabs = [];
    let _filtroStatus = null; // null = todos

    /* ─── render principal ─── */
    function renderFerias() {
        const container = document.getElementById('ferias-container');
        if (!container) return;
        _filtroStatus = null;

        container.innerHTML = `
        <div style="padding:1.75rem 2rem;max-width:1500px;margin:0 auto;">

            <!-- Título -->
            <div style="margin-bottom:1.5rem;">
                <h1 style="font-size:1.55rem;font-weight:800;color:#0f172a;margin:0;display:flex;align-items:center;gap:0.55rem;">
                    <i class="ph ph-beach" style="color:#0891b2;font-size:1.7rem;"></i>
                    Controle de Férias
                </h1>
                <p style="color:#64748b;font-size:0.88rem;margin:0.2rem 0 0;">Acompanhe períodos aquisitivos, agendamentos e alertas de vencimento</p>
            </div>

            <!-- Cards de status (filtros visuais) -->
            <div id="ferias-status-cards" style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1.25rem;"></div>

            <!-- Filtros de texto -->
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:13px;padding:1rem 1.35rem;margin-bottom:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,.04);">
                <div style="display:flex;flex-wrap:wrap;gap:0.85rem;align-items:flex-end;">
                    <div style="flex:2;min-width:180px;">
                        <label style="display:block;font-size:0.73rem;font-weight:700;color:#475569;margin-bottom:0.3rem;text-transform:uppercase;letter-spacing:.05em;">Buscar</label>
                        <input type="text" id="ferias-f-nome" placeholder="Nome, cargo ou departamento..."
                            style="width:100%;padding:0.52rem 0.8rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.88rem;color:#0f172a;background:#f8fafc;box-sizing:border-box;outline:none;"
                            oninput="window.feriasFiltrar()">
                    </div>
                    <div style="flex:1;min-width:125px;">
                        <label style="display:block;font-size:0.73rem;font-weight:700;color:#475569;margin-bottom:0.3rem;text-transform:uppercase;letter-spacing:.05em;">Departamento</label>
                        <select id="ferias-f-dept" style="width:100%;padding:0.52rem 0.8rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.88rem;color:#0f172a;background:#f8fafc;outline:none;"
                            onchange="window.feriasFiltrar()">
                            <option value="">Todos</option>
                        </select>
                    </div>
                    <div style="flex:1;min-width:110px;">
                        <label style="display:block;font-size:0.73rem;font-weight:700;color:#475569;margin-bottom:0.3rem;text-transform:uppercase;letter-spacing:.05em;">Situação</label>
                        <select id="ferias-f-situacao" style="width:100%;padding:0.52rem 0.8rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.88rem;color:#0f172a;background:#f8fafc;outline:none;"
                            onchange="window.feriasFiltrar()">
                            <option value="">Todos</option>
                            <option value="Ativo">Ativos</option>
                            <option value="Inativo">Inativos</option>
                        </select>
                    </div>
                    <button onclick="window.feriasClearFiltro()"
                        style="padding:0.52rem 1rem;background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.82rem;color:#64748b;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;"
                        title="Limpar todos os filtros">
                        <i class="ph ph-x"></i> Limpar filtros
                    </button>
                </div>
            </div>

            <!-- Tabela -->
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:13px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04);">
                <div id="ferias-table-wrap" style="overflow-x:auto;">
                    <div style="padding:3rem;text-align:center;color:#94a3b8;">
                        <i class="ph ph-circle-notch ph-spin" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                        Carregando colaboradores...
                    </div>
                </div>
            </div>
        </div>`;

        window.feriasFiltrar = feriasFiltrar;
        window.feriasClearFiltro = () => {
            _filtroStatus = null;
            const nome = document.getElementById('ferias-f-nome');
            const dept = document.getElementById('ferias-f-dept');
            const sit = document.getElementById('ferias-f-situacao');
            if (nome) nome.value = '';
            if (dept) dept.value = '';
            if (sit) sit.value = '';
            feriasFiltrar();
        };
        window.feriasSetFiltroStatus = (st) => {
            // null = Todos; clique no mesmo chip remove o filtro (toggle)
            _filtroStatus = (st === null || _filtroStatus === st) ? null : st;
            feriasFiltrar();
        };

        loadColabs();
    }

    /* ─── Carregamento de dados ─── */
    async function loadColabs() {
        try {
            let data = null;

            if (typeof _todosColaboradores !== 'undefined' && Array.isArray(_todosColaboradores) && _todosColaboradores.length > 0) {
                data = _todosColaboradores;
            }
            if (!data && typeof apiGet === 'function') {
                try { data = await apiGet('/colaboradores'); } catch (_) {}
            }
            if (!data) {
                const token = localStorage.getItem('erp_token') || window.currentToken || localStorage.getItem('token') || '';
                const baseUrl = (typeof API_URL !== 'undefined' && API_URL) ? API_URL : (window.location.origin + '/api');
                const res = await fetch(`${baseUrl}/colaboradores`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    cache: 'no-store'
                });
                if (!res.ok) throw new Error(`Erro ${res.status}: ${res.statusText}`);
                data = await res.json();
            }

            _allColabs = Array.isArray(data) ? data : (data && (data.colaboradores || data.data || []));
            if (!Array.isArray(_allColabs)) _allColabs = [];

            preencherFiltros();
            feriasFiltrar();
        } catch (e) {
            console.error('[Férias] Erro:', e);
            const wrap = document.getElementById('ferias-table-wrap');
            if (wrap) wrap.innerHTML = `
                <div style="padding:3rem;text-align:center;color:#ef4444;">
                    <i class="ph ph-warning-circle" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;"></i>
                    <strong>Erro ao carregar colaboradores</strong><br>
                    <small style="color:#94a3b8;font-size:0.78rem;">${e.message}</small><br><br>
                    <button onclick="window.renderFerias()" style="background:#0891b2;color:#fff;border:none;border-radius:8px;padding:0.5rem 1rem;cursor:pointer;font-size:0.83rem;display:inline-flex;align-items:center;gap:6px;">
                        <i class="ph ph-arrow-clockwise"></i> Tentar novamente
                    </button>
                </div>`;
        }
    }

    function preencherFiltros() {
        const deptos = [...new Set(_allColabs.map(c => c.departamento).filter(Boolean))].sort();
        const sel = document.getElementById('ferias-f-dept');
        if (sel) {
            const cur = sel.value;
            sel.innerHTML = '<option value="">Todos</option>' + deptos.map(d => `<option value="${d}">${d}</option>`).join('');
            if (cur) sel.value = cur;
        }
    }

    /* ─── Filtrar e render ─── */
    function feriasFiltrar() {
        const nome = (document.getElementById('ferias-f-nome')?.value || '').toLowerCase().trim();
        const dept = (document.getElementById('ferias-f-dept')?.value || '');
        const sit = (document.getElementById('ferias-f-situacao')?.value || '');

        // Pré-calcular status de todos os colaboradores para os cards
        const todos = _allColabs.map(c => ({ ...c, _status: getStatus(c) }));

        // Contadores por status (antes dos filtros de texto, para mostrar totais reais)
        const contadores = {};
        todos.forEach(c => { contadores[c._status] = (contadores[c._status] || 0) + 1; });

        // Aplicar filtros
        let colabs = todos.filter(c => {
            if (sit) {
                const st = (c.status || 'Ativo').trim().toLowerCase();
                if (st !== sit.toLowerCase()) return false;
            }
            if (dept && (c.departamento || '').trim() !== dept) return false;
            if (nome) {
                const hay = `${c.nome_completo || ''} ${c.cargo || ''} ${c.departamento || ''}`.toLowerCase();
                if (!hay.includes(nome)) return false;
            }
            if (_filtroStatus && c._status !== _filtroStatus) return false;
            return true;
        });

        renderStatusCards(contadores);
        renderTabela(colabs);
    }

    /* ─── Cards de status (filtros visuais no topo) ─── */
    function renderStatusCards(contadores) {
        const el = document.getElementById('ferias-status-cards');
        if (!el) return;

        const total = Object.values(contadores).reduce((a, b) => a + b, 0);
        const ordem = ['urgente', 'sem_agenda', 'agendado', 'de_ferias', 'em_aquisicao'];

        // Botão TODOS
        const todosAtivo = _filtroStatus === null;
        const btnTodos = `
        <button onclick="window.feriasSetFiltroStatus(null)"
            title="Mostrar todos os colaboradores"
            style="display:flex;align-items:center;gap:0.6rem;padding:0.65rem 1.1rem;
                background:${todosAtivo ? '#0f172a' : '#f1f5f9'};
                color:${todosAtivo ? '#fff' : '#475569'};
                border:2px solid ${todosAtivo ? '#0f172a' : '#e2e8f0'};
                border-radius:11px;cursor:pointer;transition:all .15s;
                font-weight:700;font-size:0.82rem;
                box-shadow:${todosAtivo ? '0 2px 8px rgba(0,0,0,.2)' : '0 1px 2px rgba(0,0,0,.05)'};
                outline:none;">
            <i class="ph ph-users" style="font-size:1.1rem;"></i>
            <span>Todos</span>
            <span style="background:${todosAtivo ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.08)'};
                border-radius:99px;padding:1px 8px;font-size:0.82rem;font-weight:800;
                min-width:22px;text-align:center;">${total}</span>
        </button>`;

        const chips = ordem.map(st => {
            const cfg = STATUS_CONFIG[st];
            const n = contadores[st] || 0;
            const ativo = _filtroStatus === st;
            return `
            <button onclick="window.feriasSetFiltroStatus('${st}')"
                title="${ativo ? 'Remover filtro' : 'Filtrar: ' + cfg.label}"
                style="display:flex;align-items:center;gap:0.6rem;padding:0.65rem 1.1rem;
                    background:${ativo ? cfg.color : cfg.bg};
                    color:${ativo ? '#fff' : cfg.color};
                    border:2px solid ${ativo ? cfg.color : cfg.border};
                    border-radius:11px;cursor:pointer;transition:all .15s;
                    font-weight:700;font-size:0.82rem;
                    box-shadow:${ativo ? '0 2px 8px rgba(0,0,0,.18)' : '0 1px 2px rgba(0,0,0,.05)'};
                    outline:none;">
                <i class="ph ${cfg.icon}" style="font-size:1.1rem;"></i>
                <span>${cfg.label}</span>
                <span style="background:${ativo ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.08)'};
                    border-radius:99px;padding:1px 8px;font-size:0.82rem;font-weight:800;
                    min-width:22px;text-align:center;">${n}</span>
            </button>`;
        }).join('');

        el.innerHTML = btnTodos + chips;
    }

    /* ─── Tabela ─── */
    function renderTabela(colabs) {
        const wrap = document.getElementById('ferias-table-wrap');
        if (!wrap) return;

        if (!colabs.length) {
            wrap.innerHTML = `<div style="padding:3rem;text-align:center;color:#94a3b8;">
                <i class="ph ph-beach" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;opacity:.3;"></i>
                Nenhum colaborador encontrado
            </div>`;
            return;
        }

        const hj = hoje();

        const linhas = colabs.map(c => {
            const info = calcularFerias(c.data_admissao);
            const st = c._status || getStatus(c);
            const cfg = STATUS_CONFIG[st];
            const ult = info && info.periodos.length ? info.periodos[info.periodos.length - 1] : null;

            /* ── Período aquisitivo ── */
            let periodoAquisitivo = '<span style="color:#94a3b8;font-size:0.8rem;">Sem data de admissão</span>';
            let alertaBadge = '';
            if (info) {
                if (!info.temDireitoAtual) {
                    periodoAquisitivo = `<span style="font-size:0.8rem;color:#64748b;">Em andamento até <strong>${fmt(info.periodoAtual.fim)}</strong></span>`;
                } else if (ult) {
                    periodoAquisitivo = `<span style="font-size:0.8rem;color:#334155;">${fmt(ult.inicio)} → ${fmt(ult.fim)}</span>`;
                    if (ult.vencida) {
                        alertaBadge = `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#dc2626;border-radius:6px;padding:2px 7px;font-size:0.68rem;font-weight:800;margin-left:5px;vertical-align:middle;">
                            <i class="ph ph-x-circle"></i> VENCIDA
                        </span>`;
                    } else if (ult.diasParaVencer <= 30) {
                        alertaBadge = `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#ef4444;border-radius:6px;padding:2px 7px;font-size:0.68rem;font-weight:800;margin-left:5px;vertical-align:middle;">
                            <i class="ph ph-warning-circle"></i> ${ult.diasParaVencer}d p/ vencer
                        </span>`;
                    } else if (ult.diasParaVencer <= 90) {
                        alertaBadge = `<span style="display:inline-flex;align-items:center;gap:3px;background:#fef9c3;color:#ca8a04;border-radius:6px;padding:2px 7px;font-size:0.68rem;font-weight:800;margin-left:5px;vertical-align:middle;">
                            <i class="ph ph-warning"></i> ${ult.diasParaVencer}d p/ vencer
                        </span>`;
                    }
                }
            }

            /* ── Badge na coluna de férias agendadas ── */
            let agendamentoBadge = '';
            const fIni = parseDate(c.ferias_programadas_inicio);
            const fFim = c.ferias_programadas_fim ? parseDate(c.ferias_programadas_fim) : null;
            const dias = (fIni && fFim) ? diffDays(fIni, fFim) + 1 : null;

            // Badge de status (cor conforme getStatus)
            agendamentoBadge = `<span style="display:inline-flex;align-items:center;gap:5px;background:${cfg.badgeBg};color:${cfg.badgeColor};border-radius:7px;padding:4px 10px;font-size:0.78rem;font-weight:700;border:1.5px solid ${cfg.border};">
                <i class="ph ${cfg.icon}"></i> ${cfg.label}
            </span>`;

            // Datas de férias (se existirem)
            let datasFerias = '';
            if (c.ferias_programadas_inicio) {
                datasFerias = `<div style="font-size:0.75rem;color:#64748b;margin-top:3px;display:flex;align-items:center;gap:4px;">
                    <i class="ph ph-calendar"></i>
                    ${fmt(c.ferias_programadas_inicio)}${c.ferias_programadas_fim ? ' → ' + fmt(c.ferias_programadas_fim) : ''}
                    ${dias ? `<span style="opacity:.65;">(${dias}d)</span>` : ''}
                </div>`;
            }

            /* ── Período em curso ── */
            let emCurso = '<span style="color:#94a3b8;font-size:0.8rem;">—</span>';
            if (info) {
                const pa = info.periodoAtual;
                const pct = Math.min(100, Math.max(0, Math.round((1 - pa.diasRestantes / 365) * 100)));
                const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#0891b2';
                emCurso = `<div style="min-width:130px;">
                    <div style="font-size:0.73rem;color:#64748b;margin-bottom:3px;">${fmt(pa.inicio)} → ${fmt(pa.fim)}</div>
                    <div style="background:#e2e8f0;border-radius:99px;height:5px;overflow:hidden;">
                        <div style="width:${pct}%;background:${barColor};height:100%;border-radius:99px;"></div>
                    </div>
                    <div style="font-size:0.7rem;color:#94a3b8;margin-top:2px;">${pa.diasRestantes > 0 ? pa.diasRestantes + 'd restantes' : 'Concluído'}</div>
                </div>`;
            }

            /* ── Row highlight ── */
            const rowStyle = (st === 'urgente' || ult?.vencida)
                ? 'background:#fff9f9;'
                : st === 'de_ferias' ? 'background:#fdf4ff;'
                : '';

            return `<tr style="border-bottom:1px solid #f1f5f9;transition:background .12s;${rowStyle}"
                onmouseover="this.style.background='#f8fafc'"
                onmouseout="this.style.background='${rowStyle ? rowStyle.replace('background:','').replace(';','') : ''}'">
                <td style="padding:0.8rem 1rem 0.8rem 1.25rem;">
                    <div style="display:flex;align-items:center;gap:0.6rem;">
                        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${cfg.color},${cfg.badgeBg === cfg.bg ? cfg.color : cfg.color}88);display:flex;align-items:center;justify-content:center;font-size:0.77rem;font-weight:800;color:#fff;flex-shrink:0;">
                            ${(c.nome_completo || '?').replace(/\s+/g,' ').trim().split(' ').filter(w=>w).slice(0,2).map(w=>w[0]).join('').toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight:700;color:#0f172a;font-size:0.86rem;">${c.nome_completo || '—'}</div>
                            <div style="font-size:0.72rem;color:#94a3b8;margin-top:1px;">${c.cargo || '—'} · ${c.departamento || '—'}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:0.8rem 0.7rem;font-size:0.82rem;color:#334155;white-space:nowrap;">${c.data_admissao ? fmt(c.data_admissao) : '—'}</td>
                <td style="padding:0.8rem 0.7rem;">${periodoAquisitivo}${alertaBadge}</td>
                <td style="padding:0.8rem 0.7rem;">
                    ${agendamentoBadge}
                    ${datasFerias}
                </td>
                <td style="padding:0.8rem 0.9rem;">${emCurso}</td>
                <td style="padding:0.8rem 1.25rem 0.8rem 0.7rem;text-align:right;">
                    <button onclick="window.feriasProntuario(${c.id})"
                        style="background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;border:none;border-radius:8px;padding:0.4rem 0.85rem;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;"
                        onmouseover="this.style.opacity='0.82'" onmouseout="this.style.opacity='1'">
                        <i class="ph ph-notebook"></i> Prontuário
                    </button>
                </td>
            </tr>`;
        }).join('');

        wrap.innerHTML = `
        <table style="width:100%;border-collapse:collapse;">
            <thead>
                <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                    <th style="padding:0.65rem 1rem 0.65rem 1.25rem;text-align:left;font-size:0.7rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Colaborador</th>
                    <th style="padding:0.65rem 0.7rem;text-align:left;font-size:0.7rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Admissão</th>
                    <th style="padding:0.65rem 0.7rem;text-align:left;font-size:0.7rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Período Aquisitivo</th>
                    <th style="padding:0.65rem 0.7rem;text-align:left;font-size:0.7rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Situação / Férias Agendadas</th>
                    <th style="padding:0.65rem 0.7rem;text-align:left;font-size:0.7rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Período em Curso</th>
                    <th style="padding:0.65rem 1.25rem 0.65rem 0.7rem;text-align:right;font-size:0.7rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Ação</th>
                </tr>
            </thead>
            <tbody>${linhas}</tbody>
        </table>`;
    }

    /* ─── Abrir prontuário ─── */
    window.feriasProntuario = function (id) {
        if (typeof window.openProntuarioTab === 'function') { window.openProntuarioTab(id); return; }
        const nav = document.querySelector('[data-target="colaboradores"]');
        if (nav) nav.click();
        setTimeout(() => { if (typeof window.openProntuario === 'function') window.openProntuario(id); }, 500);
    };

    /* ─── Listener de nav ─── */
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-target="ferias"]')) {
            setTimeout(() => renderFerias(), 50);
        }
    });

    window.renderFerias = renderFerias;
})();
