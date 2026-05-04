/**
 * ferias.js — Módulo de Controle de Férias
 * Versão 3.0 — Barra de progresso inteligente, status por concessão, marker de agendamento
 */
(function () {

    /* ═══════════════════════════════════════════════
       UTILITÁRIOS
    ═══════════════════════════════════════════════ */
    const fmt = (d) => {
        if (!d) return '—';
        const s = String(d).split('T')[0];
        const [y, m, day] = s.split('-');
        return (!y || !m || !day) ? d : `${day}/${m}/${y}`;
    };

    const parseDate = (s) => {
        if (!s) return null;
        const d = new Date(String(s).split('T')[0] + 'T12:00:00');
        return isNaN(d.getTime()) ? null : d;
    };

    const diffDays = (a, b) => Math.floor((b - a) / 86400000);

    const hj = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };

    /* ═══════════════════════════════════════════════
       CÁLCULO DO PERÍODO AQUISITIVO
    ═══════════════════════════════════════════════ */
    function calcularFerias(admissaoStr) {
        const admissao = parseDate(admissaoStr);
        if (!admissao) return null;
        const hoje = hj();

        const diasTotal = diffDays(admissao, hoje);
        const anosCompletos = Math.floor(diasTotal / 365);

        // Período aquisitivo em andamento (acumulando direito)
        const inicioAtual = new Date(admissao);
        inicioAtual.setFullYear(inicioAtual.getFullYear() + anosCompletos);
        const fimAtual = new Date(inicioAtual);
        fimAtual.setFullYear(fimAtual.getFullYear() + 1);
        const diasRestantesAquisitivo = diffDays(hoje, fimAtual);

        if (anosCompletos < 1) {
            return {
                periodos: [],
                periodoAtual: {
                    inicio: inicioAtual.toISOString().split('T')[0],
                    fim: fimAtual.toISOString().split('T')[0],
                    diasRestantes: diasRestantesAquisitivo,
                },
                temDireitoAtual: false,
            };
        }

        // Períodos aquisitivos completos
        const periodos = [];
        for (let i = 0; i < anosCompletos; i++) {
            const inicio = new Date(admissao); inicio.setFullYear(inicio.getFullYear() + i);
            const fim = new Date(admissao);    fim.setFullYear(fim.getFullYear() + i + 1);
            const prazoGozo = new Date(fim);   prazoGozo.setFullYear(prazoGozo.getFullYear() + 1);
            const vencida = hoje > prazoGozo;
            const diasParaVencer = diffDays(hoje, prazoGozo);
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
                diasRestantes: diasRestantesAquisitivo,
            },
            temDireitoAtual: true,
        };
    }

    /** Verifica se as férias agendadas estão dentro do período de concessão (fim → prazoGozo) */
    function agendadaDentroDoPeriodo(fIniStr, fFimStr, periodo) {
        if (!fIniStr || !periodo) return false;
        const ini = parseDate(fIniStr);
        if (!ini) return false;
        const pFim = parseDate(periodo.fim);       // início da concessão
        const pPrazo = parseDate(periodo.prazoGozo); // fim da concessão
        return pFim && pPrazo && ini >= pFim && ini <= pPrazo;
    }

    /* ═══════════════════════════════════════════════
       CÁLCULO DE STATUS
    ═══════════════════════════════════════════════

    Prioridades:
      1. DE FÉRIAS      → hoje está dentro do período de gozo agendado           (roxo)
      2. AGUARDANDO     → férias passadas concluídas, aguardando novo período     (azul-cinza)
      3. EM AQUISIÇÃO   → menos de 12 meses, sem direito ainda                   (cinza)
      4. AGENDADO       → tem férias futuras marcadas dentro do período           (verde)
      5. URGENTE        → sem agendamento, prazo de gozo ≤ 90 dias ou vencido    (vermelho)
      6. SEM AGENDA     → tem direito, sem agendamento, prazo > 90 dias          (amarelo)
    ═══════════════════════════════════════════════ */
    function getStatus(c) {
        const hoje = hj();
        const info = calcularFerias(c.data_admissao);
        const fIni = parseDate(c.ferias_programadas_inicio);
        const fFim = c.ferias_programadas_fim ? parseDate(c.ferias_programadas_fim) : null;

        // 1. DE FÉRIAS: hoje está entre início e fim das férias
        if (fIni && hoje >= fIni && (!fFim || hoje <= fFim)) return 'de_ferias';

        // 2. AGUARDANDO NOVO: férias já terminaram (fim < hoje), aguardando próximo período
        if (fIni && fFim && hoje > fFim) return 'aguardando_novo';

        // 3. EM AQUISIÇÃO: menos de 12 meses
        if (!info || !info.temDireitoAtual) return 'em_aquisicao';

        const periodos = info.periodos;
        const ult = periodos.length > 0 ? periodos[periodos.length - 1] : null;
        if (!ult) return 'em_aquisicao';

        // 4. AGENDADO: tem férias futuras marcadas
        const temAgendadoFuturo = fIni && fIni > hoje;
        if (temAgendadoFuturo) return 'agendado';

        // 5. URGENTE: sem agendamento E prazo de gozo ≤ 90 dias ou já vencido
        if (ult.vencida || ult.diasParaVencer <= 90) return 'urgente';

        // 6. SEM AGENDA: tem direito, prazo > 90 dias, sem férias agendadas
        return 'sem_agenda';
    }

    /* ═══════════════════════════════════════════════
       PALETA DE STATUS
    ═══════════════════════════════════════════════ */
    const STATUS_CONFIG = {
        urgente:       { label: 'Vence 90d',       bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', icon: 'ph-warning-circle'  },
        sem_agenda:    { label: 'Sem agenda',       bg: '#fef9c3', color: '#b45309', border: '#fde047', icon: 'ph-calendar-x'      },
        agendado:      { label: 'Agendado',          bg: '#dcfce7', color: '#15803d', border: '#86efac', icon: 'ph-calendar-check'  },
        de_ferias:     { label: 'De férias',         bg: '#f3e8ff', color: '#7c3aed', border: '#c4b5fd', icon: 'ph-island'          },
        aguardando_novo:{ label: 'Aguardando novo', bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc', icon: 'ph-clock-countdown'  },
        em_aquisicao:  { label: 'Em aquisição',     bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: 'ph-hourglass'        },
    };

    /* ═══════════════════════════════════════════════
       BARRA DE PROGRESSO INTELIGENTE
       Lógica de barra por status:
       - em_aquisicao / aguardando_novo → barra cinza do período aquisitivo atual
       - concessão (urgente/agendado/sem_agenda):
           → cor conforme urgência + marcador da data de férias agendadas
    ═══════════════════════════════════════════════ */
    function renderBarra(c, info, st, fIni, fFim) {
        if (!info) return '<span style="color:#94a3b8;font-size:0.8rem;">—</span>';
        const hoje = hj();

        /* ── Período AQUISITIVO (em aquisição e aguardando novo) ── */
        if (st === 'em_aquisicao' || st === 'aguardando_novo') {
            const pa = info.periodoAtual;
            const total = 365;
            const elapsed = Math.max(0, total - pa.diasRestantes);
            const pct = Math.min(100, Math.round(elapsed / total * 100));
            const label = st === 'aguardando_novo'
                ? `Novo período em ${pa.diasRestantes}d`
                : `${pa.diasRestantes}d p/ completar`;
            return `<div style="min-width:145px;">
                <div style="font-size:0.71rem;color:#64748b;margin-bottom:3px;">${fmt(pa.inicio)} → ${fmt(pa.fim)}</div>
                <div style="background:#e2e8f0;border-radius:99px;height:6px;position:relative;overflow:hidden;">
                    <div style="width:${pct}%;background:#94a3b8;height:100%;border-radius:99px;"></div>
                </div>
                <div style="font-size:0.69rem;color:#94a3b8;margin-top:2px;">${label}</div>
            </div>`;
        }

        /* ── Período de CONCESSÃO (urgente / agendado / sem_agenda / de_ferias) ── */
        const periodos = info.periodos;
        const ult = periodos.length > 0 ? periodos[periodos.length - 1] : null;
        if (!ult) return '<span style="color:#94a3b8;font-size:0.8rem;">—</span>';

        const inicioConcessao = parseDate(ult.fim);
        const fimConcessao = parseDate(ult.prazoGozo);
        if (!inicioConcessao || !fimConcessao) return '<span style="color:#94a3b8;font-size:0.8rem;">—</span>';

        const totalDias = diffDays(inicioConcessao, fimConcessao);
        const elapsed = Math.max(0, diffDays(inicioConcessao, hoje));
        const pct = Math.min(100, Math.round(elapsed / totalDias * 100));
        const diasRestantes = ult.diasParaVencer;

        // Cor da barra
        const emFerias = fIni && fFim && hoje >= fIni && hoje <= fFim;
        const temAgendadoFuturo = fIni && fIni > hoje;
        let barColor;
        if (emFerias) {
            barColor = '#7c3aed';         // roxo — colaborador está de férias agora
        } else if (temAgendadoFuturo) {
            barColor = '#16a34a';         // verde — tem férias agendadas (futuras)
        } else if (diasRestantes <= 90 || ult.vencida) {
            barColor = '#ef4444';         // vermelho — urgente
        } else if (diasRestantes <= 180) {
            barColor = '#f59e0b';         // amarelo — 6 meses ou menos
        } else {
            barColor = '#94a3b8';         // cinza — sem urgência
        }

        // Marcador da data de férias agendadas
        let marker = '';
        if (fIni && (fIni > hoje || emFerias)) {
            let markerPct = Math.round(diffDays(inicioConcessao, fIni) / totalDias * 100);
            markerPct = Math.min(100, Math.max(0, markerPct));
            const markerColor = emFerias ? '#7c3aed' : '#15803d'; // roxo se em andamento, verde se futuro
            marker = `<div style="position:absolute;left:${markerPct}%;top:-3px;width:4px;height:12px;
                background:${markerColor};border-radius:2px;transform:translateX(-50%);z-index:3;
                box-shadow:0 0 0 1.5px white;" title="Férias Programadas: ${fmt(fIni)}"></div>`;
        }

        const labelRestante = ult.vencida ? '⚠ Prazo vencido!' : `Vence ${diasRestantes}d`;

        return `<div style="min-width:145px;">
            <div style="font-size:0.71rem;color:#64748b;margin-bottom:3px;">${fmt(ult.fim)} → ${fmt(ult.prazoGozo)}</div>
            <div style="background:#e2e8f0;border-radius:99px;height:6px;position:relative;">
                <div style="width:${pct}%;background:${barColor};height:100%;border-radius:99px;position:relative;z-index:1;"></div>
                ${marker}
            </div>
            <div style="font-size:0.69rem;color:${ult.vencida ? '#ef4444' : '#94a3b8'};margin-top:2px;white-space:nowrap;">${labelRestante}</div>
        </div>`;
    }

    /* ═══════════════════════════════════════════════
       ESTADO GLOBAL
    ═══════════════════════════════════════════════ */
    let _allColabs = [];
    let _filtroStatus = null;

    /* ═══════════════════════════════════════════════
       RENDER PRINCIPAL
    ═══════════════════════════════════════════════ */
    function renderFerias() {
        const container = document.getElementById('ferias-container');
        if (!container) return;
        _filtroStatus = null;

        container.innerHTML = `
        <div style="padding:1.75rem 2rem;max-width:1600px;margin:0 auto;">

            <div style="margin-bottom:1.4rem;">
                <h1 style="font-size:1.55rem;font-weight:800;color:#0f172a;margin:0;display:flex;align-items:center;gap:0.55rem;">
                    <i class="ph ph-beach" style="color:#0891b2;font-size:1.7rem;"></i> Controle de Férias
                </h1>
                <p style="color:#64748b;font-size:0.87rem;margin:0.2rem 0 0;">Acompanhe períodos aquisitivos, concessivos e alertas de vencimento</p>
            </div>

            <!-- Chips de filtro por status -->
            <div id="ferias-status-cards" style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-bottom:1.1rem;"></div>

            <!-- Filtros de texto -->
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:0.9rem 1.25rem;margin-bottom:1.1rem;box-shadow:0 1px 3px rgba(0,0,0,.04);">
                <div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:flex-end;">
                    <div style="flex:2;min-width:180px;">
                        <label style="display:block;font-size:0.72rem;font-weight:700;color:#475569;margin-bottom:0.28rem;text-transform:uppercase;letter-spacing:.05em;">Buscar</label>
                        <input type="text" id="ferias-f-nome" placeholder="Nome, cargo ou departamento..."
                            style="width:100%;padding:0.48rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.87rem;color:#0f172a;background:#f8fafc;box-sizing:border-box;outline:none;"
                            oninput="window.feriasFiltrar()">
                    </div>
                    <div style="flex:1;min-width:120px;">
                        <label style="display:block;font-size:0.72rem;font-weight:700;color:#475569;margin-bottom:0.28rem;text-transform:uppercase;letter-spacing:.05em;">Departamento</label>
                        <select id="ferias-f-dept" style="width:100%;padding:0.48rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.87rem;color:#0f172a;background:#f8fafc;outline:none;" onchange="window.feriasFiltrar()">
                            <option value="">Todos</option>
                        </select>
                    </div>
                    <button onclick="window.feriasClearFiltro()"
                        style="padding:0.48rem 0.9rem;background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.8rem;color:#64748b;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;">
                        <i class="ph ph-x"></i> Limpar
                    </button>
                </div>
            </div>

            <!-- Tabela -->
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04);">
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
            ['ferias-f-nome','ferias-f-dept'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            feriasFiltrar();
        };
        window.feriasSetFiltroStatus = (st) => {
            _filtroStatus = (st === null || _filtroStatus === st) ? null : st;
            feriasFiltrar();
        };

        loadColabs();
    }

    /* ═══════════════════════════════════════════════
       CARREGAMENTO DE DADOS
    ═══════════════════════════════════════════════ */
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
                    <button onclick="window.renderFerias()" style="background:#0891b2;color:#fff;border:none;border-radius:8px;padding:0.45rem 0.9rem;cursor:pointer;font-size:0.82rem;display:inline-flex;align-items:center;gap:6px;">
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

    // Bloqueia apenas quem está explicitamente inativo/desligado
    // Null, vazio, Ativo, Afastado, Férias e qualquer outro valor são exibidos
    const STATUS_EXCLUIDOS = new Set(['inativo', 'demitido', 'desligado', 'rescindido', 'exonerado']);

    function feriasFiltrar() {
        const nome = (document.getElementById('ferias-f-nome')?.value || '').toLowerCase().trim();
        const dept = (document.getElementById('ferias-f-dept')?.value || '');

        // Exclui apenas desligados/inativos; todos os demais (Ativo, Afastado, Férias, nulo) aparecem
        const ativos = _allColabs.filter(c => {
            const st = (c.status || '').trim().toLowerCase();
            return !st || !STATUS_EXCLUIDOS.has(st);
        });

        const todos = ativos.map(c => ({ ...c, _status: getStatus(c) }));

        // Contadores por status (antes dos filtros de texto)
        const contadores = {};
        todos.forEach(c => { contadores[c._status] = (contadores[c._status] || 0) + 1; });

        const colabs = todos.filter(c => {
            if (dept && (c.departamento || '').trim() !== dept) return false;
            if (nome && !`${c.nome_completo||''} ${c.cargo||''} ${c.departamento||''}`.toLowerCase().includes(nome)) return false;
            if (_filtroStatus && c._status !== _filtroStatus) return false;
            return true;
        });

        renderStatusCards(contadores);
        renderTabela(colabs);
    }

    /* ═══════════════════════════════════════════════
       CHIPS DE STATUS (filtros visuais no topo)
    ═══════════════════════════════════════════════ */
    function renderStatusCards(contadores) {
        const el = document.getElementById('ferias-status-cards');
        if (!el) return;

        const total = Object.values(contadores).reduce((a, b) => a + b, 0);
        const todosAtivo = _filtroStatus === null;

        const btnTodos = `
        <button onclick="window.feriasSetFiltroStatus(null)"
            style="display:flex;align-items:center;gap:0.55rem;padding:0.55rem 1rem;
                background:${todosAtivo ? '#0f172a' : '#f1f5f9'};
                color:${todosAtivo ? '#fff' : '#475569'};
                border:2px solid ${todosAtivo ? '#0f172a' : '#e2e8f0'};
                border-radius:10px;cursor:pointer;font-weight:700;font-size:0.8rem;outline:none;
                box-shadow:${todosAtivo ? '0 2px 8px rgba(0,0,0,.2)' : 'none'};">
            <i class="ph ph-users" style="font-size:1rem;"></i>
            <span>Todos</span>
            <span style="background:${todosAtivo ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.08)'};
                border-radius:99px;padding:1px 7px;font-size:0.8rem;font-weight:800;">${total}</span>
        </button>`;

        const ordem = ['urgente','sem_agenda','agendado','de_ferias','aguardando_novo','em_aquisicao'];
        const chips = ordem.map(st => {
            const cfg = STATUS_CONFIG[st];
            const n = contadores[st] || 0;
            const ativo = _filtroStatus === st;
            return `
            <button onclick="window.feriasSetFiltroStatus('${st}')"
                style="display:flex;align-items:center;gap:0.55rem;padding:0.55rem 1rem;
                    background:${ativo ? cfg.color : cfg.bg};
                    color:${ativo ? '#fff' : cfg.color};
                    border:2px solid ${ativo ? cfg.color : cfg.border};
                    border-radius:10px;cursor:pointer;font-weight:700;font-size:0.8rem;outline:none;
                    box-shadow:${ativo ? '0 2px 8px rgba(0,0,0,.18)' : 'none'};">
                <i class="ph ${cfg.icon}" style="font-size:1rem;"></i>
                <span>${cfg.label}</span>
                <span style="background:${ativo ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.08)'};
                    border-radius:99px;padding:1px 7px;font-size:0.8rem;font-weight:800;">${n}</span>
            </button>`;
        }).join('');

        el.innerHTML = btnTodos + chips;
    }

    /* ═══════════════════════════════════════════════
       ORDENAÇÃO
    ═══════════════════════════════════════════════ */
    let _sortCol  = null;  // coluna atualmente ordenada
    let _sortAsc  = true;  // direção da ordenação

    const SORT_KEYS = {
        nome:      c => (c.nome_completo || '').toLowerCase(),
        admissao:  c => c.data_admissao || '',
        periodo:   c => { const i = calcularFerias(c.data_admissao); return i && i.periodos.length ? i.periodos[i.periodos.length-1].fim : ''; },
        situacao:  c => c._status || '',
        agendado:  c => c.ferias_programadas_inicio || '',
        prazo:     c => { const i = calcularFerias(c.data_admissao); return i && i.periodos.length ? i.periodos[i.periodos.length-1].prazoGozo : ''; },
    };

    window.feriasSort = function(col) {
        if (_sortCol === col) _sortAsc = !_sortAsc;
        else { _sortCol = col; _sortAsc = true; }
        feriasFiltrar();
    };

    function sortColabs(colabs) {
        if (!_sortCol || !SORT_KEYS[_sortCol]) return colabs;
        const fn = SORT_KEYS[_sortCol];
        return [...colabs].sort((a, b) => {
            const va = fn(a), vb = fn(b);
            const cmp = va < vb ? -1 : va > vb ? 1 : 0;
            return _sortAsc ? cmp : -cmp;
        });
    }

    /* ═══════════════════════════════════════════════
       TABELA
    ═══════════════════════════════════════════════ */
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

        const hoje = hj();
        const sorted = sortColabs(colabs);

        const thStyle = 'padding:0.6rem 0.65rem;text-align:left;font-size:0.69rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;cursor:pointer;user-select:none;';
        const thStyleL = 'padding:0.6rem 0.9rem 0.6rem 1.2rem;' + thStyle;
        const thStyleR = 'padding:0.6rem 1.2rem 0.6rem 0.65rem;text-align:right;font-size:0.69rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;';

        const sFn = (col, label) => {
            const ativo = _sortCol === col;
            const arrow = !ativo ? '↕' : _sortAsc ? '↑' : '↓';
            return `<th onclick="window.feriasSort('${col}')" style="${col === 'nome' ? thStyleL : thStyle}${ativo ? 'color:#0891b2;' : ''}">
                ${label} <span style="font-size:0.8rem;opacity:${ativo ? 1 : 0.4};">${arrow}</span></th>`;
        };

        const linhas = sorted.map(c => {
            const info = calcularFerias(c.data_admissao);
            const st = c._status || getStatus(c);
            const cfg = STATUS_CONFIG[st];
            const fIni = parseDate(c.ferias_programadas_inicio);
            const fFim = c.ferias_programadas_fim ? parseDate(c.ferias_programadas_fim) : null;
            const ult  = info && info.periodos.length ? info.periodos[info.periodos.length - 1] : null;

            /* ── Badge de situação (coluna 4) ── */
            const situacaoBadge = `
            <span style="display:inline-flex;align-items:center;gap:4px;
                background:${cfg.bg};color:${cfg.color};border:1.5px solid ${cfg.border};
                border-radius:7px;padding:3px 9px;font-size:0.77rem;font-weight:700;white-space:nowrap;">
                <i class="ph ${cfg.icon}"></i> ${cfg.label}
            </span>`;

            /* ── Período aquisitivo na coluna 3 ── */
            let periodoAcol = '<span style="color:#94a3b8;font-size:0.79rem;">Sem admissão</span>';
            let alertaBadge = '';
            if (info) {
                if (!info.temDireitoAtual) {
                    periodoAcol = `<span style="font-size:0.79rem;color:#64748b;">Em andamento até <strong>${fmt(info.periodoAtual.fim)}</strong></span>`;
                } else if (ult) {
                    periodoAcol = `<span style="font-size:0.79rem;color:#334155;">${fmt(ult.inicio)} → ${fmt(ult.fim)}</span>`;
                    if (ult.vencida) {
                        alertaBadge = `<span style="display:inline-flex;align-items:center;gap:2px;background:#fee2e2;color:#dc2626;border-radius:5px;padding:1px 6px;font-size:0.67rem;font-weight:800;margin-left:4px;vertical-align:middle;"><i class="ph ph-x-circle"></i> VENCIDA</span>`;
                    }
                }
            }

            /* ── Coluna: Férias Agendadas ── */
            let ferias_col = '<span style="color:#94a3b8;font-size:0.79rem;font-style:italic;">Não agendado</span>';
            if (c.ferias_programadas_inicio) {
                const dias = (fIni && fFim) ? diffDays(fIni, fFim) + 1 : null;
                const passadas = fFim && hoje > fFim;
                const emCurso = fIni && fFim && hoje >= fIni && hoje <= fFim;
                const futuras = fIni && hoje < fIni;
                const tagCor  = emCurso ? '#7c3aed' : passadas ? '#64748b' : '#0891b2';
                const tagBg   = emCurso ? '#f3e8ff'  : passadas ? '#f1f5f9'  : '#e0f2fe';
                const tagIcon = emCurso ? 'ph-island' : passadas ? 'ph-check-circle' : 'ph-calendar';
                const tagLabel = emCurso ? 'Em curso' : passadas ? 'Concluídas' : '';

                // 2ª Data (férias fracionadas tiradas)
                let frac2Html = '';
                if (c.ferias_fracionadas === 'Sim' && c.ferias_fracionadas_tipo === 'Tirada' && c.ferias_fracionadas_inicio2) {
                    const fIni2 = parseDate(c.ferias_fracionadas_inicio2);
                    const fFim2 = c.ferias_fracionadas_fim2 ? parseDate(c.ferias_fracionadas_fim2) : null;
                    const dias2 = (fIni2 && fFim2) ? diffDays(fIni2, fFim2) + 1 : null;
                    const emCurso2 = fIni2 && fFim2 && hoje >= fIni2 && hoje <= fFim2;
                    const tag2Cor = emCurso2 ? '#7c3aed' : '#8b5cf6';
                    const tag2Bg  = emCurso2 ? '#f3e8ff' : '#f5f3ff';
                    frac2Html = `<div style="margin-top:4px; display:flex; align-items:center; gap:5px;">
                        <span style="font-size:0.67rem;font-weight:800;color:#8b5cf6;background:#f5f3ff;border-radius:4px;padding:1px 5px;border:1px solid #ddd6fe;">2ª fração</span>
                        <span style="display:inline-flex;align-items:center;gap:4px;background:${tag2Bg};color:${tag2Cor};border-radius:6px;padding:3px 8px;font-size:0.77rem;font-weight:600;">
                            <i class="ph ph-calendar-blank"></i>
                            ${fmt(c.ferias_fracionadas_inicio2)}${c.ferias_fracionadas_fim2 ? ' → ' + fmt(c.ferias_fracionadas_fim2) : ''}
                        </span>
                        ${dias2 ? `<span style="font-size:0.73rem;color:#94a3b8;">${dias2}d</span>` : ''}
                    </div>`;
                } else if (c.ferias_fracionadas === 'Sim' && c.ferias_fracionadas_tipo === 'Vendida') {
                    frac2Html = `<div style="margin-top:4px;">
                        <span style="font-size:0.67rem;font-weight:800;color:#d97706;background:#fef3c7;border-radius:4px;padding:1px 5px;border:1px solid #fde68a;">Fração vendida</span>
                    </div>`;
                }

                ferias_col = `<div>
                    <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
                        <span style="display:inline-flex;align-items:center;gap:4px;background:${tagBg};color:${tagCor};border-radius:6px;padding:3px 8px;font-size:0.77rem;font-weight:600;">
                            <i class="ph ${tagIcon}"></i>
                            ${fmt(c.ferias_programadas_inicio)}${c.ferias_programadas_fim ? ' → ' + fmt(c.ferias_programadas_fim) : ''}
                        </span>
                        ${dias ? `<span style="font-size:0.73rem;color:#94a3b8;">${dias}d</span>` : ''}
                        ${tagLabel ? `<span style="font-size:0.7rem;font-weight:700;color:${tagCor};">${tagLabel}</span>` : ''}
                    </div>
                    ${frac2Html}
                </div>`;
            }

            /* ── Barra de progresso ── */
            const barra = renderBarra(c, info, st, fIni, fFim);

            /* ── Row highlight ── */
            const rowBg = st === 'urgente' ? '#fff9f9' : st === 'de_ferias' ? '#fdf4ff' : '';

            return `<tr style="border-bottom:1px solid #f1f5f9;transition:background .12s;${rowBg ? 'background:' + rowBg + ';' : ''}"
                onmouseover="this.style.background='#f8fafc'"
                onmouseout="this.style.background='${rowBg}'">
                <td style="padding:0.78rem 0.9rem 0.78rem 1.2rem;">
                    <div style="display:flex;align-items:center;gap:0.55rem;">
                        ${(() => {
                            // Usa o endpoint dedicado que serve base64 do banco (persiste no Render) ou arquivo físico
                            const fotoApiUrl = `/api/colaboradores/foto/${c.id}`;
                            const iniciais = (c.nome_completo||'?').trim().split(/\s+/).filter(w=>w).slice(0,2).map(w=>w[0]).join('').toUpperCase();
                            return `<img src="${fotoApiUrl}" alt="" style="width:31px;height:31px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid ${cfg.color}40;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div style="display:none;width:31px;height:31px;border-radius:50%;background:${cfg.color};align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;color:#fff;flex-shrink:0;opacity:.9;">${iniciais}</div>`;
                        })()}

                        <div>
                            <div style="font-weight:700;color:#0f172a;font-size:0.85rem;line-height:1.2;">${c.nome_completo||'—'}</div>
                            <div style="font-size:0.71rem;color:#94a3b8;margin-top:1px;">${c.cargo||'—'} · ${c.departamento||'—'}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:0.78rem 0.65rem;font-size:0.81rem;color:#334155;white-space:nowrap;">${c.data_admissao ? fmt(c.data_admissao) : '—'}</td>
                <td style="padding:0.78rem 0.65rem;">${periodoAcol}${alertaBadge}</td>
                <td style="padding:0.78rem 0.65rem;">${situacaoBadge}</td>
                <td style="padding:0.78rem 0.65rem;">${ferias_col}</td>
                <td style="padding:0.78rem 0.85rem;">${barra}</td>
                <td style="padding:0.78rem 1.2rem 0.78rem 0.65rem;text-align:right;">
                    <button onclick="window.feriasProntuario(${c.id})"
                        style="background:#0891b2;color:#fff;border:none;border-radius:8px;padding:0.38rem 0.8rem;font-size:0.77rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;"
                        onmouseover="this.style.background='#0e7490'" onmouseout="this.style.background='#0891b2'">
                        <i class="ph ph-notebook"></i> Prontuário
                    </button>
                </td>
            </tr>`;
        }).join('');

        wrap.innerHTML = `
        <table style="width:100%;border-collapse:collapse;">
            <thead>
                <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                    ${sFn('nome',     'Colaborador')}
                    ${sFn('admissao', 'Admissão')}
                    ${sFn('periodo',  'Período Aquisitivo')}
                    ${sFn('situacao', 'Situação')}
                    ${sFn('agendado', 'Férias Agendadas')}
                    ${sFn('prazo',    'Período em Curso')}
                    <th style="${thStyleR}">Ação</th>
                </tr>
            </thead>
            <tbody>${linhas}</tbody>
        </table>`;
    }

    /* ═══════════════════════════════════════════════
       NAVEGAR PARA PRONTUÁRIO
    ═══════════════════════════════════════════════ */
    window.feriasProntuario = function (id) {
        if (typeof window.openProntuarioTab === 'function') { window.openProntuarioTab(id); return; }
        const nav = document.querySelector('[data-target="colaboradores"]');
        if (nav) nav.click();
        setTimeout(() => { if (typeof window.openProntuario === 'function') window.openProntuario(id); }, 500);
    };

    /* ═══════════════════════════════════════════════
       LISTENER DE NAVEGAÇÃO
    ═══════════════════════════════════════════════ */
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-target="ferias"]')) setTimeout(() => renderFerias(), 50);
    });

    window.renderFerias      = renderFerias;
    window._feriasCalc       = calcularFerias;   // usado pelo formulário do colaborador
    window._feriasParse      = parseDate;
    window._feriasFmt        = fmt;
})();
