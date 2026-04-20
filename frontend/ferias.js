/**
 * ferias.js — Módulo de Controle de Férias
 * Calcula período aquisitivo, período de gozo, alerta 90 dias, etc.
 */
(function () {
    /* ─── Utilitários ─── */
    const fmt = (d) => {
        if (!d) return '—';
        const [y, m, day] = String(d).split('-');
        if (!y || !m || !day) return d;
        return `${day}/${m}/${y}`;
    };

    const parseDate = (s) => {
        if (!s) return null;
        const d = new Date(s + 'T12:00:00');
        return isNaN(d) ? null : d;
    };

    const diffDays = (a, b) => Math.floor((b - a) / 86400000);

    /**
     * Calcula os períodos aquisitivos e informações de férias.
     * Cada ano completo de trabalho gera direito a 30 dias.
     */
    function calcularFerias(admissaoStr) {
        const admissao = parseDate(admissaoStr);
        if (!admissao) return null;
        const hoje = new Date();

        // Quantos anos completos já passou?
        const anosCompletos = Math.floor(diffDays(admissao, hoje) / 365);
        if (anosCompletos < 1) {
            // Ainda no primeiro período aquisitivo
            const inicioPeriodo = new Date(admissao);
            const fimPeriodo = new Date(admissao);
            fimPeriodo.setFullYear(fimPeriodo.getFullYear() + 1);
            const diasRestantes = diffDays(hoje, fimPeriodo);
            return {
                periodos: [],
                periodoAtual: {
                    inicio: admissaoStr,
                    fim: fimPeriodo.toISOString().split('T')[0],
                    diasRestantes,
                    completo: false,
                },
                proximoVencimento: fimPeriodo.toISOString().split('T')[0],
                temDireitoAtual: false,
            };
        }

        // Listar períodos aquisitivos completos
        const periodos = [];
        for (let i = 0; i < anosCompletos; i++) {
            const inicio = new Date(admissao);
            inicio.setFullYear(inicio.getFullYear() + i);
            const fim = new Date(admissao);
            fim.setFullYear(fim.getFullYear() + i + 1);
            // Prazo máximo para gozo: 12 meses após o fim do período aquisitivo
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

        // Próximo período (em andamento)
        const inicioProximo = new Date(admissao);
        inicioProximo.setFullYear(inicioProximo.getFullYear() + anosCompletos);
        const fimProximo = new Date(inicioProximo);
        fimProximo.setFullYear(fimProximo.getFullYear() + 1);
        const diasRestantes = diffDays(hoje, fimProximo);

        return {
            periodos,
            periodoAtual: {
                inicio: inicioProximo.toISOString().split('T')[0],
                fim: fimProximo.toISOString().split('T')[0],
                diasRestantes,
                completo: false,
            },
            proximoVencimento: fimProximo.toISOString().split('T')[0],
            temDireitoAtual: anosCompletos >= 1,
        };
    }

    /** Verifica se o colaborador tem férias agendadas nos próximos N dias */
    function feriasDentroDeNDias(inicio, fim, diasFuturos) {
        if (!inicio) return false;
        const hoje = new Date();
        const limite = new Date();
        limite.setDate(limite.getDate() + diasFuturos);
        const dIni = parseDate(inicio);
        const dFim = fim ? parseDate(fim) : dIni;
        if (!dIni) return false;
        // Considera como "nas próximas N dias" se o início está dentro do intervalo
        return dIni >= hoje && dIni <= limite;
    }

    /* ─── Estado ─── */
    let _allColabs = [];
    let _filtro = { nome: '', status: 'Ativo', alerta90: false, semAgendamento: false, departamento: '' };

    /* ─── Render Principal ─── */
    function renderFerias() {
        const container = document.getElementById('ferias-container');
        if (!container) return;
        container.innerHTML = `
            <div style="padding:2rem;max-width:1400px;margin:0 auto;">

                <!-- Header -->
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
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
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;box-shadow:0 1px 4px rgba(0,0,0,.04);">
                    <div style="display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end;">
                        <div style="flex:2;min-width:200px;">
                            <label style="display:block;font-size:0.8rem;font-weight:600;color:#475569;margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:.04em;">Buscar colaborador</label>
                            <input type="text" id="ferias-f-nome" placeholder="Nome ou cargo..." autocomplete="off"
                                style="width:100%;padding:0.6rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;color:#0f172a;background:#f8fafc;box-sizing:border-box;outline:none;"
                                oninput="window.feriasFiltrar()">
                        </div>
                        <div style="flex:1;min-width:140px;">
                            <label style="display:block;font-size:0.8rem;font-weight:600;color:#475569;margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:.04em;">Departamento</label>
                            <select id="ferias-f-dept" style="width:100%;padding:0.6rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;color:#0f172a;background:#f8fafc;outline:none;"
                                onchange="window.feriasFiltrar()">
                                <option value="">Todos</option>
                            </select>
                        </div>
                        <div style="flex:1;min-width:130px;">
                            <label style="display:block;font-size:0.8rem;font-weight:600;color:#475569;margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:.04em;">Status</label>
                            <select id="ferias-f-status" style="width:100%;padding:0.6rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;color:#0f172a;background:#f8fafc;outline:none;"
                                onchange="window.feriasFiltrar()">
                                <option value="Ativo">Ativos</option>
                                <option value="">Todos</option>
                                <option value="Inativo">Inativos</option>
                            </select>
                        </div>
                        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;padding-bottom:0.1rem;">
                            <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.88rem;color:#475569;font-weight:500;background:#f1f5f9;padding:0.5rem 0.85rem;border-radius:8px;border:1.5px solid #e2e8f0;">
                                <input type="checkbox" id="ferias-f-alerta" onchange="window.feriasFiltrar()" style="accent-color:#f59e0b;">
                                <i class="ph ph-warning" style="color:#f59e0b;"></i> Vence em 90 dias
                            </label>
                            <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.88rem;color:#475569;font-weight:500;background:#f1f5f9;padding:0.5rem 0.85rem;border-radius:8px;border:1.5px solid #e2e8f0;">
                                <input type="checkbox" id="ferias-f-sem-agenda" onchange="window.feriasFiltrar()" style="accent-color:#ef4444;">
                                <i class="ph ph-calendar-x" style="color:#ef4444;"></i> Sem agendamento
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Tabela -->
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.04);">
                    <div id="ferias-table-wrap" style="overflow-x:auto;">
                        <div style="padding:2.5rem;text-align:center;color:#94a3b8;">
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
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const url = (typeof API_URL !== 'undefined') ? API_URL : (window.location.origin + '/api');
            const res = await fetch(`${url}/colaboradores`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Erro ' + res.status);
            _allColabs = await res.json();

            // Popular filtro de departamento
            const deptos = [...new Set(_allColabs.map(c => c.departamento).filter(Boolean))].sort();
            const sel = document.getElementById('ferias-f-dept');
            if (sel) {
                const cur = sel.value;
                sel.innerHTML = '<option value="">Todos</option>' + deptos.map(d => `<option value="${d}">${d}</option>`).join('');
                if (cur) sel.value = cur;
            }

            feriasFiltrar();
        } catch (e) {
            const wrap = document.getElementById('ferias-table-wrap');
            if (wrap) wrap.innerHTML = `<div style="padding:2rem;text-align:center;color:#ef4444;"><i class="ph ph-warning-circle"></i> Erro ao carregar dados: ${e.message}</div>`;
        }
    }

    function feriasFiltrar() {
        const nome = (document.getElementById('ferias-f-nome')?.value || '').toLowerCase();
        const dept = (document.getElementById('ferias-f-dept')?.value || '');
        const status = (document.getElementById('ferias-f-status')?.value || '');
        const alerta90 = document.getElementById('ferias-f-alerta')?.checked || false;
        const semAgenda = document.getElementById('ferias-f-sem-agenda')?.checked || false;

        let colabs = _allColabs.filter(c => {
            if (status && (c.status || 'Ativo') !== status) return false;
            if (dept && c.departamento !== dept) return false;
            if (nome && !`${c.nome_completo} ${c.cargo || ''} ${c.departamento || ''}`.toLowerCase().includes(nome)) return false;
            const info = calcularFerias(c.data_admissao);
            if (alerta90) {
                // Deve ter férias vencendo em 90 dias E sem agendamento nesse período
                if (!info || !info.periodos.length) return false;
                const ultimo = info.periodos[info.periodos.length - 1];
                if (ultimo.vencida) return false;
                if (ultimo.diasParaVencer > 90 || ultimo.diasParaVencer < 0) return false;
            }
            if (semAgenda) {
                // Tem direito mas NÃO tem férias agendadas
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

        let agendadas = 0, vencendo90 = 0, semAgenda = 0, ferias30dias = 0;
        colabs.forEach(c => {
            if (c.ferias_programadas_inicio) {
                agendadas++;
                if (feriasDentroDeNDias(c.ferias_programadas_inicio, c.ferias_programadas_fim, 30)) ferias30dias++;
            }
            const info = calcularFerias(c.data_admissao);
            if (info && info.periodos.length) {
                const ultimo = info.periodos[info.periodos.length - 1];
                if (!ultimo.vencida && ultimo.diasParaVencer <= 90 && ultimo.diasParaVencer >= 0) vencendo90++;
                if (info.temDireitoAtual && !c.ferias_programadas_inicio) semAgenda++;
            }
        });

        statsEl.innerHTML = `
            <div style="background:#e0f2fe;border:1px solid #bae6fd;border-radius:10px;padding:0.6rem 1rem;text-align:center;min-width:95px;">
                <div style="font-size:1.4rem;font-weight:800;color:#0284c7;">${colabs.length}</div>
                <div style="font-size:0.72rem;color:#0369a1;font-weight:600;text-transform:uppercase;">Colaboradores</div>
            </div>
            <div style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:10px;padding:0.6rem 1rem;text-align:center;min-width:95px;">
                <div style="font-size:1.4rem;font-weight:800;color:#16a34a;">${agendadas}</div>
                <div style="font-size:0.72rem;color:#15803d;font-weight:600;text-transform:uppercase;">Agendadas</div>
            </div>
            <div style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:0.6rem 1rem;text-align:center;min-width:95px;">
                <div style="font-size:1.4rem;font-weight:800;color:#ca8a04;">${vencendo90}</div>
                <div style="font-size:0.72rem;color:#a16207;font-weight:600;text-transform:uppercase;">Vencem 90d</div>
            </div>
            <div style="background:#fee2e2;border:1px solid #fecaca;border-radius:10px;padding:0.6rem 1rem;text-align:center;min-width:95px;">
                <div style="font-size:1.4rem;font-weight:800;color:#dc2626;">${semAgenda}</div>
                <div style="font-size:0.72rem;color:#b91c1c;font-weight:600;text-transform:uppercase;">Sem agenda</div>
            </div>
            ${ferias30dias > 0 ? `
            <div style="background:#f0fdf4;border:1.5px solid #4ade80;border-radius:10px;padding:0.6rem 1rem;text-align:center;min-width:100px;">
                <div style="font-size:1.4rem;font-weight:800;color:#15803d;">${ferias30dias}</div>
                <div style="font-size:0.72rem;color:#166534;font-weight:600;text-transform:uppercase;">Férias em 30d</div>
            </div>` : ''}
        `;
    }

    function renderTabela(colabs) {
        const wrap = document.getElementById('ferias-table-wrap');
        if (!wrap) return;

        if (!colabs.length) {
            wrap.innerHTML = `<div style="padding:3rem;text-align:center;color:#94a3b8;">
                <i class="ph ph-beach" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;opacity:.4;"></i>
                Nenhum colaborador encontrado
            </div>`;
            return;
        }

        const hoje = new Date();
        const linhas = colabs.map(c => {
            const info = calcularFerias(c.data_admissao);
            const temDireito = info && info.temDireitoAtual;
            const ultimoPeriodo = info && info.periodos.length > 0 ? info.periodos[info.periodos.length - 1] : null;

            // Badge alerta
            let alertaBadge = '';
            if (ultimoPeriodo && !ultimoPeriodo.vencida && ultimoPeriodo.diasParaVencer <= 90) {
                const urgencia = ultimoPeriodo.diasParaVencer <= 30 ? '#ef4444' : '#f59e0b';
                const bgUrgencia = ultimoPeriodo.diasParaVencer <= 30 ? '#fee2e2' : '#fef9c3';
                alertaBadge = `<span style="display:inline-flex;align-items:center;gap:3px;background:${bgUrgencia};color:${urgencia};border-radius:6px;padding:2px 7px;font-size:0.72rem;font-weight:700;margin-left:4px;">
                    <i class="ph ph-warning-circle"></i> ${ultimoPeriodo.diasParaVencer}d
                </span>`;
            } else if (ultimoPeriodo && ultimoPeriodo.vencida) {
                alertaBadge = `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#dc2626;border-radius:6px;padding:2px 7px;font-size:0.72rem;font-weight:700;margin-left:4px;">
                    <i class="ph ph-x-circle"></i> VENCIDA
                </span>`;
            }

            // Período aquisitivo atual
            let periodoAquisitivo = '—';
            if (!info) {
                periodoAquisitivo = '<span style="color:#94a3b8;font-size:0.82rem;">Sem admissão</span>';
            } else if (ultimoPeriodo) {
                periodoAquisitivo = `<span style="font-size:0.82rem;color:#334155;">${fmt(ultimoPeriodo.inicio)} → ${fmt(ultimoPeriodo.fim)}</span>`;
            } else {
                periodoAquisitivo = `<span style="font-size:0.82rem;color:#64748b;">Em andamento até ${fmt(info.periodoAtual.fim)}</span>`;
            }

            // Período agendado
            let agendamento = '';
            if (c.ferias_programadas_inicio) {
                const dIni = parseDate(c.ferias_programadas_inicio);
                const dFim = c.ferias_programadas_fim ? parseDate(c.ferias_programadas_fim) : null;
                const emBreve = dIni && dIni > hoje && diffDays(hoje, dIni) <= 30;
                const cor = emBreve ? '#16a34a' : '#0891b2';
                const bg = emBreve ? '#dcfce7' : '#e0f2fe';
                const dias = dFim ? diffDays(dIni, dFim) + 1 : null;
                agendamento = `<span style="display:inline-flex;align-items:center;gap:3px;background:${bg};color:${cor};border-radius:7px;padding:3px 9px;font-size:0.8rem;font-weight:600;">
                    <i class="ph ph-calendar-check"></i> ${fmt(c.ferias_programadas_inicio)}${dFim ? ' → ' + fmt(c.ferias_programadas_fim) : ''}${dias ? ` (${dias}d)` : ''}
                </span>`;
            } else if (temDireito) {
                agendamento = `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#dc2626;border-radius:7px;padding:3px 9px;font-size:0.8rem;font-weight:600;">
                    <i class="ph ph-calendar-x"></i> Não agendado
                </span>`;
            } else {
                agendamento = `<span style="color:#94a3b8;font-size:0.8rem;">Sem direito ainda</span>`;
            }

            // Período aquisitivo em curso
            let emCurso = '—';
            if (info) {
                const pa = info.periodoAtual;
                const pct = Math.min(100, Math.max(0, Math.round((1 - pa.diasRestantes / 365) * 100)));
                emCurso = `<div>
                    <div style="font-size:0.78rem;color:#64748b;margin-bottom:3px;">${fmt(pa.inicio)} → ${fmt(pa.fim)}</div>
                    <div style="background:#e2e8f0;border-radius:99px;height:6px;overflow:hidden;">
                        <div style="width:${pct}%;background:linear-gradient(90deg,#0891b2,#0e7490);height:100%;border-radius:99px;"></div>
                    </div>
                    <div style="font-size:0.73rem;color:#94a3b8;margin-top:2px;">${pa.diasRestantes}d restantes</div>
                </div>`;
            }

            const statusColab = (c.status || 'Ativo');
            const statusBg = statusColab === 'Ativo' ? '#dcfce7' : '#f1f5f9';
            const statusColor = statusColab === 'Ativo' ? '#15803d' : '#94a3b8';

            return `<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                <td style="padding:0.9rem 1rem 0.9rem 1.25rem;">
                    <div style="display:flex;align-items:center;gap:0.65rem;">
                        <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#0891b2,#0e7490);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:#fff;flex-shrink:0;">
                            ${(c.nome_completo || '?').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight:700;color:#0f172a;font-size:0.88rem;">${c.nome_completo || '—'}</div>
                            <div style="font-size:0.75rem;color:#94a3b8;">${c.cargo || '—'} · ${c.departamento || '—'}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:0.9rem 0.75rem;">
                    <span style="background:${statusBg};color:${statusColor};border-radius:6px;padding:2px 8px;font-size:0.75rem;font-weight:600;">${statusColab}</span>
                </td>
                <td style="padding:0.9rem 0.75rem;font-size:0.82rem;color:#334155;">${c.data_admissao ? fmt(c.data_admissao) : '—'}</td>
                <td style="padding:0.9rem 0.75rem;">${periodoAquisitivo}${alertaBadge}</td>
                <td style="padding:0.9rem 0.75rem;">${agendamento}</td>
                <td style="padding:0.9rem 1rem;">${emCurso}</td>
                <td style="padding:0.9rem 1.25rem 0.9rem 0.75rem;text-align:right;">
                    <button onclick="window.feriasProntuario(${c.id})"
                        title="Abrir prontuário do colaborador"
                        style="background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;border:none;border-radius:8px;padding:0.45rem 0.9rem;font-size:0.8rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:opacity 0.15s;"
                        onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                        <i class="ph ph-notebook"></i> Prontuário
                    </button>
                </td>
            </tr>`;
        }).join('');

        wrap.innerHTML = `
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                        <th style="padding:0.75rem 1rem 0.75rem 1.25rem;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Colaborador</th>
                        <th style="padding:0.75rem 0.75rem;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Status</th>
                        <th style="padding:0.75rem 0.75rem;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Admissão</th>
                        <th style="padding:0.75rem 0.75rem;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Período Aquisitivo</th>
                        <th style="padding:0.75rem 0.75rem;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Férias Agendadas</th>
                        <th style="padding:0.75rem 0.75rem;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Período em Curso</th>
                        <th style="padding:0.75rem 1.25rem 0.75rem 0.75rem;text-align:right;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Ação</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhas}
                </tbody>
            </table>
        `;
    }

    /* ─── Ação: abrir prontuário ─── */
    window.feriasProntuario = function (colabId) {
        // Usa o sistema de navegação existente: carrega a view do colaborador
        const colab = _allColabs.find(c => c.id === colabId);
        if (!colab) return;
        // Navega para a tela de colaboradores e abre o prontuário
        const navEl = document.querySelector('[data-target="colaboradores"]');
        if (navEl) navEl.click();
        setTimeout(() => {
            if (typeof window.openProntuario === 'function') {
                window.openProntuario(colabId);
            } else if (typeof window.loadColaboradores === 'function') {
                window.loadColaboradores(colabId);
            }
        }, 400);
    };

    /* ─── Listener de nav ─── */
    document.addEventListener('click', (e) => {
        const navItem = e.target.closest('[data-target="ferias"]');
        if (navItem) {
            setTimeout(() => renderFerias(), 50);
        }
    });

    // Expor para acesso externo se necessário
    window.renderFerias = renderFerias;
})();
