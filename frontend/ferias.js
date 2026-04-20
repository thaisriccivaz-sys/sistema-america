/**
 * ferias.js — Módulo de Controle de Férias
 * Calcula período aquisitivo, período de gozo, alerta 90 dias, etc.
 */
(function () {
    /* ─── Utilitários ─── */
    const fmt = (d) => {
        if (!d) return '—';
        const s = String(d).split('T')[0]; // remove hora se houver
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

    /**
     * Calcula os períodos aquisitivos e informações de férias.
     * Cada ano completo de trabalho = 30 dias de direito.
     */
    function calcularFerias(admissaoStr) {
        const admissao = parseDate(admissaoStr);
        if (!admissao) return null;
        const hoje = new Date();
        hoje.setHours(12, 0, 0, 0);

        const diasTotal = diffDays(admissao, hoje);
        const anosCompletos = Math.floor(diasTotal / 365);

        // Período em andamento (atual)
        const inicioAtual = new Date(admissao);
        inicioAtual.setFullYear(inicioAtual.getFullYear() + anosCompletos);
        const fimAtual = new Date(inicioAtual);
        fimAtual.setFullYear(fimAtual.getFullYear() + 1);
        const diasRestantes = diffDays(hoje, fimAtual);

        if (anosCompletos < 1) {
            return {
                periodos: [],
                periodoAtual: {
                    inicio: inicioAtual.toISOString().split('T')[0],
                    fim: fimAtual.toISOString().split('T')[0],
                    diasRestantes,
                    completo: false,
                },
                temDireitoAtual: false,
            };
        }

        // Períodos aquisitivos completos (todos, não apenas o último)
        const periodos = [];
        for (let i = 0; i < anosCompletos; i++) {
            const inicio = new Date(admissao);
            inicio.setFullYear(inicio.getFullYear() + i);
            const fim = new Date(admissao);
            fim.setFullYear(fim.getFullYear() + i + 1);
            // Prazo para gozo: 12 meses após fim do período aquisitivo
            const prazoGozo = new Date(fim);
            prazoGozo.setFullYear(prazoGozo.getFullYear() + 1);
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
                diasRestantes,
                completo: false,
            },
            temDireitoAtual: true,
        };
    }

    /** Retorna o último período relevante (não vencido) para alertas */
    function getUltimoPeriodoAtivo(info) {
        if (!info || !info.periodos.length) return null;
        // Pega o mais recente
        return info.periodos[info.periodos.length - 1];
    }

    /* ─── Estado ─── */
    let _allColabs = [];

    /* ─── Token helper ─── */
    function getToken() {
        // Tenta pegar do contexto global do app.js de várias formas
        if (typeof currentToken !== 'undefined' && currentToken) return currentToken;
        if (window.currentToken) return window.currentToken;
        if (typeof API_TOKEN !== 'undefined' && API_TOKEN) return API_TOKEN;
        return localStorage.getItem('token') || localStorage.getItem('erp_token') || '';
    }

    function getApiUrl() {
        if (typeof API_URL !== 'undefined' && API_URL) return API_URL;
        return window.location.origin + '/api';
    }

    /* ─── Render Principal ─── */
    function renderFerias() {
        const container = document.getElementById('ferias-container');
        if (!container) return;
        container.innerHTML = `
            <div style="padding:2rem;max-width:1500px;margin:0 auto;">

                <!-- Header -->
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.75rem;flex-wrap:wrap;gap:1rem;">
                    <div>
                        <h1 style="font-size:1.6rem;font-weight:800;color:#0f172a;margin:0;display:flex;align-items:center;gap:0.6rem;">
                            <i class="ph ph-beach" style="color:#0891b2;font-size:1.8rem;"></i>
                            Controle de Férias
                        </h1>
                        <p style="color:#64748b;font-size:0.9rem;margin:0.25rem 0 0;">Acompanhe períodos aquisitivos, agendamentos e alertas de vencimento</p>
                    </div>
                    <div id="ferias-stats" style="display:flex;gap:0.75rem;flex-wrap:wrap;"></div>
                </div>

                <!-- Filtros -->
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1.1rem 1.4rem;margin-bottom:1.25rem;box-shadow:0 1px 4px rgba(0,0,0,.04);">
                    <div style="display:flex;flex-wrap:wrap;gap:0.85rem;align-items:flex-end;">
                        <div style="flex:2;min-width:180px;">
                            <label style="display:block;font-size:0.75rem;font-weight:700;color:#475569;margin-bottom:0.35rem;text-transform:uppercase;letter-spacing:.05em;">Buscar</label>
                            <input type="text" id="ferias-f-nome" placeholder="Nome, cargo ou departamento..." autocomplete="off"
                                style="width:100%;padding:0.55rem 0.8rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;color:#0f172a;background:#f8fafc;box-sizing:border-box;outline:none;"
                                oninput="window.feriasFiltrar()">
                        </div>
                        <div style="flex:1;min-width:130px;">
                            <label style="display:block;font-size:0.75rem;font-weight:700;color:#475569;margin-bottom:0.35rem;text-transform:uppercase;letter-spacing:.05em;">Departamento</label>
                            <select id="ferias-f-dept" style="width:100%;padding:0.55rem 0.8rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;color:#0f172a;background:#f8fafc;outline:none;"
                                onchange="window.feriasFiltrar()">
                                <option value="">Todos</option>
                            </select>
                        </div>
                        <div style="flex:1;min-width:110px;">
                            <label style="display:block;font-size:0.75rem;font-weight:700;color:#475569;margin-bottom:0.35rem;text-transform:uppercase;letter-spacing:.05em;">Status</label>
                            <select id="ferias-f-status" style="width:100%;padding:0.55rem 0.8rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;color:#0f172a;background:#f8fafc;outline:none;"
                                onchange="window.feriasFiltrar()">
                                <option value="">Todos</option>
                                <option value="Ativo">Ativos</option>
                                <option value="Inativo">Inativos</option>
                            </select>
                        </div>
                        <div style="display:flex;gap:0.65rem;flex-wrap:wrap;align-items:center;padding-bottom:0.05rem;">
                            <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.85rem;color:#475569;font-weight:500;background:#fef9c3;padding:0.45rem 0.8rem;border-radius:8px;border:1.5px solid #fde047;white-space:nowrap;">
                                <input type="checkbox" id="ferias-f-alerta" onchange="window.feriasFiltrar()" style="accent-color:#f59e0b;">
                                <i class="ph ph-warning" style="color:#ca8a04;"></i> Vence em 90 dias
                            </label>
                            <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.85rem;color:#475569;font-weight:500;background:#fee2e2;padding:0.45rem 0.8rem;border-radius:8px;border:1.5px solid #fecaca;white-space:nowrap;">
                                <input type="checkbox" id="ferias-f-sem-agenda" onchange="window.feriasFiltrar()" style="accent-color:#ef4444;">
                                <i class="ph ph-calendar-x" style="color:#ef4444;"></i> Sem agendamento
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Tabela -->
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.04);">
                    <div id="ferias-table-wrap" style="overflow-x:auto;">
                        <div style="padding:3rem;text-align:center;color:#94a3b8;">
                            <i class="ph ph-circle-notch ph-spin" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                            Carregando colaboradores...
                        </div>
                    </div>
                </div>
            </div>
        `;

        window.feriasFiltrar = feriasFiltrar;
        loadColabs();
    }

    async function loadColabs() {
        try {
            let data = null;

            // 1. Tenta reutilizar dados já carregados na tela de Colaboradores
            if (typeof _todosColaboradores !== 'undefined' && Array.isArray(_todosColaboradores) && _todosColaboradores.length > 0) {
                data = _todosColaboradores;
            }

            // 2. Usa a função apiGet do app.js (já tem o token correto no closure)
            if (!data && typeof apiGet === 'function') {
                data = await apiGet('/colaboradores');
            }

            // 3. Fallback manual usando window.currentToken ou localStorage
            if (!data) {
                const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const url = (typeof API_URL !== 'undefined' && API_URL) ? API_URL : (window.location.origin + '/api');
                const res = await fetch(`${url}/colaboradores`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    cache: 'no-store'
                });
                if (!res.ok) throw new Error(`Erro ${res.status}: ${res.statusText}`);
                data = await res.json();
            }

            // Normaliza para array independente do formato retornado
            _allColabs = Array.isArray(data) ? data : (data && (data.colaboradores || data.data || []));
            if (!Array.isArray(_allColabs)) _allColabs = [];

            preencherFiltros();
            feriasFiltrar();
        } catch (e) {
            console.error('[Férias] Erro ao carregar colaboradores:', e);
            const wrap = document.getElementById('ferias-table-wrap');
            if (wrap) wrap.innerHTML = `
                <div style="padding:3rem;text-align:center;color:#ef4444;">
                    <i class="ph ph-warning-circle" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;"></i>
                    <strong>Erro ao carregar colaboradores</strong><br>
                    <small style="color:#94a3b8;">${e.message}</small><br><br>
                    <button onclick="window.renderFerias()" style="background:#0891b2;color:#fff;border:none;border-radius:8px;padding:0.5rem 1rem;cursor:pointer;font-size:0.85rem;">
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

    function feriasFiltrar() {
        const nome = (document.getElementById('ferias-f-nome')?.value || '').toLowerCase().trim();
        const dept = (document.getElementById('ferias-f-dept')?.value || '');
        const status = (document.getElementById('ferias-f-status')?.value || '');
        const alerta90 = document.getElementById('ferias-f-alerta')?.checked || false;
        const semAgenda = document.getElementById('ferias-f-sem-agenda')?.checked || false;

        let colabs = _allColabs.filter(c => {
            // Filtro status (case insensitive, ignora null/undefined como "Ativo")
            if (status) {
                const st = (c.status || 'Ativo').trim();
                if (st.toLowerCase() !== status.toLowerCase()) return false;
            }

            // Filtro departamento
            if (dept && (c.departamento || '').trim() !== dept) return false;

            // Filtro nome/cargo
            if (nome) {
                const haystack = `${c.nome_completo || ''} ${c.cargo || ''} ${c.departamento || ''}`.toLowerCase();
                if (!haystack.includes(nome)) return false;
            }

            // Filtro: vence em 90 dias
            if (alerta90) {
                const info = calcularFerias(c.data_admissao);
                if (!info || !info.periodos.length) return false;
                const ult = getUltimoPeriodoAtivo(info);
                if (!ult || ult.vencida || ult.diasParaVencer > 90 || ult.diasParaVencer < 0) return false;
            }

            // Filtro: sem agendamento
            if (semAgenda) {
                const info = calcularFerias(c.data_admissao);
                if (!info || !info.temDireitoAtual) return false;
                if (c.ferias_programadas_inicio) return false;
            }

            return true;
        });

        renderStats(colabs);
        renderTabela(colabs);
    }

    function renderStats(colabs) {
        const statsEl = document.getElementById('ferias-stats');
        if (!statsEl) return;

        let agendadas = 0, vencendo90 = 0, semAgenda = 0, emBreve = 0;
        const hoje = new Date();
        const em30 = new Date(); em30.setDate(hoje.getDate() + 30);

        colabs.forEach(c => {
            const info = calcularFerias(c.data_admissao);

            if (c.ferias_programadas_inicio) {
                agendadas++;
                const dIni = parseDate(c.ferias_programadas_inicio);
                if (dIni && dIni >= hoje && dIni <= em30) emBreve++;
            }

            if (info && info.periodos.length) {
                const ult = getUltimoPeriodoAtivo(info);
                if (ult && !ult.vencida && ult.diasParaVencer <= 90 && ult.diasParaVencer >= 0) vencendo90++;
                if (info.temDireitoAtual && !c.ferias_programadas_inicio) semAgenda++;
            }
        });

        statsEl.innerHTML = `
            <div style="background:#e0f2fe;border:1px solid #bae6fd;border-radius:10px;padding:0.55rem 0.9rem;text-align:center;min-width:88px;">
                <div style="font-size:1.35rem;font-weight:800;color:#0284c7;">${colabs.length}</div>
                <div style="font-size:0.7rem;color:#0369a1;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Total</div>
            </div>
            <div style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:10px;padding:0.55rem 0.9rem;text-align:center;min-width:88px;">
                <div style="font-size:1.35rem;font-weight:800;color:#16a34a;">${agendadas}</div>
                <div style="font-size:0.7rem;color:#15803d;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Agendadas</div>
            </div>
            <div style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:0.55rem 0.9rem;text-align:center;min-width:88px;">
                <div style="font-size:1.35rem;font-weight:800;color:#ca8a04;">${vencendo90}</div>
                <div style="font-size:0.7rem;color:#a16207;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Vencem 90d</div>
            </div>
            <div style="background:#fee2e2;border:1px solid #fecaca;border-radius:10px;padding:0.55rem 0.9rem;text-align:center;min-width:88px;">
                <div style="font-size:1.35rem;font-weight:800;color:#dc2626;">${semAgenda}</div>
                <div style="font-size:0.7rem;color:#b91c1c;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Sem Agenda</div>
            </div>
            ${emBreve > 0 ? `
            <div style="background:#f0fdf4;border:1.5px solid #4ade80;border-radius:10px;padding:0.55rem 0.9rem;text-align:center;min-width:88px;">
                <div style="font-size:1.35rem;font-weight:800;color:#15803d;">${emBreve}</div>
                <div style="font-size:0.7rem;color:#166534;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Em 30 dias</div>
            </div>` : ''}
        `;
    }

    function renderTabela(colabs) {
        const wrap = document.getElementById('ferias-table-wrap');
        if (!wrap) return;

        if (!colabs.length) {
            wrap.innerHTML = `<div style="padding:3rem;text-align:center;color:#94a3b8;">
                <i class="ph ph-beach" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;opacity:.35;"></i>
                <span style="font-size:0.95rem;">Nenhum colaborador encontrado para os filtros aplicados</span>
            </div>`;
            return;
        }

        const hoje = new Date();
        hoje.setHours(12, 0, 0, 0);

        const linhas = colabs.map(c => {
            const info = calcularFerias(c.data_admissao);
            const ult = getUltimoPeriodoAtivo(info);

            /* ── Badge de alerta ── */
            let alertaBadge = '';
            if (ult) {
                if (ult.vencida) {
                    alertaBadge = `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#dc2626;border-radius:6px;padding:2px 7px;font-size:0.7rem;font-weight:700;margin-left:5px;vertical-align:middle;">
                        <i class="ph ph-x-circle"></i> VENCIDA
                    </span>`;
                } else if (ult.diasParaVencer <= 30) {
                    alertaBadge = `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#ef4444;border-radius:6px;padding:2px 7px;font-size:0.7rem;font-weight:700;margin-left:5px;vertical-align:middle;">
                        <i class="ph ph-warning-circle"></i> ${ult.diasParaVencer}d
                    </span>`;
                } else if (ult.diasParaVencer <= 90) {
                    alertaBadge = `<span style="display:inline-flex;align-items:center;gap:3px;background:#fef9c3;color:#ca8a04;border-radius:6px;padding:2px 7px;font-size:0.7rem;font-weight:700;margin-left:5px;vertical-align:middle;">
                        <i class="ph ph-warning"></i> ${ult.diasParaVencer}d
                    </span>`;
                }
            }

            /* ── Período aquisitivo ── */
            let periodoAquisitivo = '';
            if (!info) {
                periodoAquisitivo = '<span style="color:#94a3b8;font-size:0.8rem;">Sem data de admissão</span>';
            } else if (!info.temDireitoAtual) {
                periodoAquisitivo = `<span style="font-size:0.8rem;color:#64748b;">
                    Em andamento até <strong>${fmt(info.periodoAtual.fim)}</strong>
                </span>`;
            } else {
                periodoAquisitivo = `<span style="font-size:0.8rem;color:#334155;">
                    ${fmt(ult.inicio)} → ${fmt(ult.fim)}
                </span>${alertaBadge}`;
            }

            /* ── Agendamento ── */
            let agendamento = '';
            if (c.ferias_programadas_inicio) {
                const dIni = parseDate(c.ferias_programadas_inicio);
                const dFim = c.ferias_programadas_fim ? parseDate(c.ferias_programadas_fim) : null;
                const passadas = dIni && dIni < hoje;
                const emBreve = dIni && !passadas && diffDays(hoje, dIni) <= 30;
                const dias = (dIni && dFim) ? diffDays(dIni, dFim) + 1 : null;
                const cor = passadas ? '#64748b' : (emBreve ? '#16a34a' : '#0891b2');
                const bg = passadas ? '#f1f5f9' : (emBreve ? '#dcfce7' : '#e0f2fe');
                const icon = passadas ? 'ph-check-circle' : (emBreve ? 'ph-calendar-check' : 'ph-calendar');
                agendamento = `<span style="display:inline-flex;align-items:center;gap:4px;background:${bg};color:${cor};border-radius:7px;padding:4px 9px;font-size:0.78rem;font-weight:600;">
                    <i class="ph ${icon}"></i>
                    ${fmt(c.ferias_programadas_inicio)}${c.ferias_programadas_fim ? ' → ' + fmt(c.ferias_programadas_fim) : ''}${dias ? ` <span style="opacity:.7;">(${dias}d)</span>` : ''}
                </span>`;
            } else if (info && info.temDireitoAtual) {
                agendamento = `<span style="display:inline-flex;align-items:center;gap:4px;background:#fee2e2;color:#dc2626;border-radius:7px;padding:4px 9px;font-size:0.78rem;font-weight:600;">
                    <i class="ph ph-calendar-x"></i> Não agendado
                </span>`;
            } else {
                agendamento = `<span style="color:#94a3b8;font-size:0.8rem;font-style:italic;">Sem direito ainda</span>`;
            }

            /* ── Período em curso ── */
            let emCurso = '<span style="color:#94a3b8;font-size:0.8rem;">—</span>';
            if (info) {
                const pa = info.periodoAtual;
                const pct = Math.min(100, Math.max(0, Math.round((1 - pa.diasRestantes / 365) * 100)));
                const barColor = pct >= 80 ? '#f59e0b' : '#0891b2';
                emCurso = `<div style="min-width:130px;">
                    <div style="font-size:0.75rem;color:#64748b;margin-bottom:4px;">${fmt(pa.inicio)} → ${fmt(pa.fim)}</div>
                    <div style="background:#e2e8f0;border-radius:99px;height:5px;overflow:hidden;">
                        <div style="width:${pct}%;background:${barColor};height:100%;border-radius:99px;transition:width .3s;"></div>
                    </div>
                    <div style="font-size:0.72rem;color:#94a3b8;margin-top:3px;">${pa.diasRestantes > 0 ? pa.diasRestantes + 'd restantes' : 'Concluído'}</div>
                </div>`;
            }

            /* ── Status badge ── */
            const st = (c.status || 'Ativo').trim();
            const stIsAtivo = st.toLowerCase() === 'ativo';
            const stBg = stIsAtivo ? '#dcfce7' : '#f1f5f9';
            const stColor = stIsAtivo ? '#15803d' : '#64748b';

            /* ── Linha de alerta de fundo ── */
            const rowBg = (ult && !ult.vencida && ult.diasParaVencer <= 30)
                ? 'background:#fff7ed;'
                : (ult && ult.vencida) ? 'background:#fff1f2;' : '';

            return `<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s;${rowBg}"
                onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${rowBg ? rowBg.replace('background:','').replace(';','') : ''}'">
                <td style="padding:0.85rem 1rem 0.85rem 1.25rem;">
                    <div style="display:flex;align-items:center;gap:0.6rem;">
                        <div style="width:33px;height:33px;border-radius:50%;background:linear-gradient(135deg,#0891b2,#0e7490);display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:700;color:#fff;flex-shrink:0;letter-spacing:.05em;">
                            ${(c.nome_completo || '?').replace(/\s+/g,' ').trim().split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight:700;color:#0f172a;font-size:0.87rem;line-height:1.2;">${c.nome_completo || '—'}</div>
                            <div style="font-size:0.73rem;color:#94a3b8;margin-top:1px;">${c.cargo || '—'} · ${c.departamento || '—'}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:0.85rem 0.7rem;">
                    <span style="background:${stBg};color:${stColor};border-radius:6px;padding:2px 8px;font-size:0.73rem;font-weight:700;">${st}</span>
                </td>
                <td style="padding:0.85rem 0.7rem;font-size:0.82rem;color:#334155;white-space:nowrap;">${c.data_admissao ? fmt(c.data_admissao) : '—'}</td>
                <td style="padding:0.85rem 0.7rem;">${periodoAquisitivo}</td>
                <td style="padding:0.85rem 0.7rem;">${agendamento}</td>
                <td style="padding:0.85rem 0.9rem;">${emCurso}</td>
                <td style="padding:0.85rem 1.25rem 0.85rem 0.7rem;text-align:right;">
                    <button onclick="window.feriasProntuario(${c.id})"
                        title="Abrir prontuário"
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
                        <th style="padding:0.7rem 1rem 0.7rem 1.25rem;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Colaborador</th>
                        <th style="padding:0.7rem 0.7rem;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Status</th>
                        <th style="padding:0.7rem 0.7rem;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Admissão</th>
                        <th style="padding:0.7rem 0.7rem;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Período Aquisitivo</th>
                        <th style="padding:0.7rem 0.7rem;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Férias Agendadas</th>
                        <th style="padding:0.7rem 0.7rem;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Período em Curso</th>
                        <th style="padding:0.7rem 1.25rem 0.7rem 0.7rem;text-align:right;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Ação</th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
        `;
    }

    /* ─── Ação: abrir prontuário ─── */
    window.feriasProntuario = function (colabId) {
        if (typeof window.openProntuarioTab === 'function') {
            window.openProntuarioTab(colabId);
            return;
        }
        // Fallback: vai para aba colaboradores e tenta abrir o prontuário
        const navEl = document.querySelector('[data-target="colaboradores"]');
        if (navEl) navEl.click();
        setTimeout(() => {
            if (typeof window.openProntuario === 'function') window.openProntuario(colabId);
        }, 500);
    };

    /* ─── Listener de nav ─── */
    document.addEventListener('click', (e) => {
        const navItem = e.target.closest('[data-target="ferias"]');
        if (navItem) {
            setTimeout(() => renderFerias(), 50);
        }
    });

    window.renderFerias = renderFerias;
})();
