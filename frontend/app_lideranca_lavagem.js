/**
 * Frontend: APP -> Liderança -> Lavagem de Veículos
 * Mobile-first (360-430px), ícones Phosphor, busca em tempo real sem acentos,
 * fotos no Cloudflare R2, cores de status nos cards (verde concluído, amarelo em andamento, vermelho atrasado).
 */
(function () {
    'use strict';

    const state = {
        hoje: '',
        selectedDate: '',
        calMode: 'week', // 'week' | 'month'
        calRefDate: '',
        agendaDias: {},
        itens: [],
        cronogramaSemana: [],
        escala: null,
        fimDeSemana: false,
        frotaResumo: null,
        filtroStatus: 'todos', // 'todos' | 'pendentes' | 'simples' | 'detalhada' | 'concluidos'
        busca: '',
        mostrarCronogramaSemanal: false,
        activeItemKey: null, // `${tipo_lavagem}::${placa}`
        uploadingItemKey: null
    };

    function getToken() {
        return localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    }

    function norm(s) {
        return String(s || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getHojeLocalISO() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function addDaysISO(iso, delta) {
        const [y, m, d] = String(iso).split('-').map(Number);
        const dt = new Date(y, m - 1, d, 12, 0, 0);
        dt.setDate(dt.getDate() + delta);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }

    function formatDateBR(iso) {
        if (!iso) return '';
        const [y, m, d] = String(iso).split('-');
        return `${d}/${m}/${y}`;
    }

    function formatShortDateBR(iso) {
        if (!iso) return '';
        const [, m, d] = String(iso).split('-');
        return `${d}/${m}`;
    }

    function getWeekRange(refISO) {
        const [y, m, d] = String(refISO).split('-').map(Number);
        const dt = new Date(y, m - 1, d, 12, 0, 0);
        const dow = dt.getDay(); // 0=Dom..6=Sab
        const diffToMon = dow === 0 ? -6 : (1 - dow);
        const start = addDaysISO(refISO, diffToMon);
        const days = [];
        for (let i = 0; i < 7; i++) days.push(addDaysISO(start, i));
        return { start, end: days[6], days };
    }

    function getMonthRange(refISO) {
        const [y, m] = String(refISO).split('-').map(Number);
        const first = new Date(y, m - 1, 1, 12, 0, 0);
        const last = new Date(y, m, 0, 12, 0, 0);
        const start = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-01`;
        const end = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
        const days = [];
        let cur = start;
        while (cur <= end) {
            days.push(cur);
            cur = addDaysISO(cur, 1);
        }
        return { start, end, days, year: y, month: m };
    }

    function toast(msg, tipo = 'info') {
        const bg = tipo === 'erro' ? '#dc2626' : tipo === 'sucesso' ? '#16a34a' : '#1e293b';
        const el = document.createElement('div');
        el.style.cssText = `position:fixed;bottom:84px;left:50%;transform:translateX(-50%);background:${bg};color:#fff;padding:12px 18px;border-radius:12px;font-size:0.9rem;font-weight:700;z-index:100000;box-shadow:0 8px 24px rgba(0,0,0,0.25);max-width:92vw;text-align:center;`;
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3500);
    }

    function injectStyles() {
        if (document.getElementById('app-lavagem-styles')) return;
        const st = document.createElement('style');
        st.id = 'app-lavagem-styles';
        st.textContent = `
            .alav-wrap {
                max-width: 920px;
                margin: 0 auto;
                padding: 12px 12px 88px;
                font-family: 'Inter', system-ui, sans-serif;
            }
            .alav-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 12px;
                flex-wrap: wrap;
            }
            .alav-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 1.2rem;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
            }
            .alav-title i {
                font-size: 1.5rem;
                color: #2563eb;
                background: #dbeafe;
                padding: 8px;
                border-radius: 12px;
            }
            .alav-cal-card {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 14px;
                padding: 12px;
                margin-bottom: 12px;
                box-shadow: 0 1px 3px rgba(15,23,42,0.04);
            }
            .alav-cal-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 10px;
                flex-wrap: wrap;
            }
            .alav-week-grid {
                display: grid;
                grid-template-columns: repeat(7, minmax(0, 1fr));
                gap: 6px;
            }
            .alav-day-btn {
                border: 1.5px solid #e2e8f0;
                background: #f8fafc;
                border-radius: 12px;
                padding: 8px 4px;
                min-height: 62px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 3px;
                cursor: pointer;
                transition: all 0.15s;
            }
            .alav-day-btn.selected {
                border-color: #2563eb;
                background: #eff6ff;
                box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
            }
            .alav-day-btn.today .alav-day-num {
                color: #2563eb;
                font-weight: 900;
            }
            .alav-day-dow {
                font-size: 0.68rem;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
            }
            .alav-day-num {
                font-size: 0.95rem;
                font-weight: 800;
                color: #0f172a;
            }
            .alav-day-badge {
                font-size: 0.68rem;
                font-weight: 800;
                padding: 1px 6px;
                border-radius: 999px;
            }
            .alav-escala-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 10px;
                margin-bottom: 12px;
            }
            .alav-escala-card {
                background: #fff;
                border: 1.5px solid #e2e8f0;
                border-radius: 14px;
                padding: 12px 14px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
            }
            .alav-search-row {
                display: flex;
                gap: 8px;
                margin-bottom: 10px;
                flex-wrap: wrap;
            }
            .alav-search-input {
                flex: 1;
                min-width: 220px;
                min-height: 48px;
                padding: 10px 14px 10px 40px;
                border: 1.5px solid #cbd5e1;
                border-radius: 12px;
                font-size: 16px;
                color: #0f172a;
                background: #fff;
                outline: none;
                text-transform: none !important;
                box-sizing: border-box;
            }
            .alav-search-input:focus {
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
            }
            .alav-chips {
                display: flex;
                gap: 8px;
                overflow-x: auto;
                padding-bottom: 6px;
                margin-bottom: 12px;
                -webkit-overflow-scrolling: touch;
            }
            .alav-chip {
                min-height: 42px;
                padding: 8px 14px;
                border-radius: 999px;
                border: 1.5px solid #cbd5e1;
                background: #fff;
                color: #334155;
                font-size: 0.84rem;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                white-space: nowrap;
                cursor: pointer;
            }
            .alav-chip.active {
                background: #1e293b;
                color: #fff;
                border-color: #1e293b;
            }
            .alav-card {
                border-radius: 16px;
                padding: 14px 16px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: transform 0.12s, box-shadow 0.12s;
                border: 2px solid #e2e8f0;
                background: #fff;
                box-shadow: 0 2px 6px rgba(15,23,42,0.04);
            }
            .alav-card:active {
                transform: scale(0.99);
            }
            .alav-card.st-concluido {
                background: #dcfce7 !important;
                border-color: #16a34a !important;
            }
            .alav-card.st-andamento {
                background: #fef9c3 !important;
                border-color: #eab308 !important;
            }
            .alav-card.st-atrasado {
                background: #fee2e2 !important;
                border-color: #ef4444 !important;
            }
            .alav-drawer-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(15,23,42,0.65);
                z-index: 99990;
                display: flex;
                justify-content: center;
                align-items: flex-end;
            }
            .alav-drawer {
                background: #f8fafc;
                width: 100%;
                max-width: 680px;
                height: 94vh;
                border-radius: 20px 20px 0 0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-shadow: 0 -10px 30px rgba(0,0,0,0.25);
            }
            @media (max-width: 640px) {
                .alav-drawer {
                    height: 100dvh;
                    border-radius: 0;
                }
            }
            .alav-item-row {
                background: #fff;
                border: 1.5px solid #e2e8f0;
                border-radius: 14px;
                padding: 12px 14px;
                margin-bottom: 10px;
            }
            .alav-item-row.done {
                border-color: #86efac;
                background: #f0fdf4;
            }
        `;
        document.head.appendChild(st);
    }

    async function carregarAgendaPeriodo() {
        const range = state.calMode === 'month'
            ? getMonthRange(state.calRefDate)
            : getWeekRange(state.calRefDate);

        try {
            const resp = await fetch(`/api/app/lavagem/agenda?inicio=${range.start}&fim=${range.end}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` },
                cache: 'no-store'
            });
            if (resp.ok) {
                const data = await resp.json();
                state.agendaDias = data.dias || {};
                if (data.hoje) state.hoje = data.hoje;
            }
        } catch (err) {
            console.error('[APP-LAVAGEM] Erro agenda:', err);
        }
    }

    async function carregarDia(dataISO) {
        state.selectedDate = dataISO;
        const root = document.getElementById('app-lavagem-root');
        if (root && !state.itens.length) {
            root.innerHTML = `<div style="padding:2.5rem;text-align:center;color:#64748b;"><i class="ph ph-spinner ph-spin" style="font-size:2rem;color:#2563eb;"></i><p style="margin-top:8px;font-weight:600;">Carregando programação de lavagem...</p></div>`;
        }
        try {
            const resp = await fetch(`/api/app/lavagem?data=${encodeURIComponent(dataISO)}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` },
                cache: 'no-store'
            });
            if (!resp.ok) throw new Error('Falha ao carregar lavagem de veículos');
            const data = await resp.json();
            state.hoje = data.hoje || state.hoje || getHojeLocalISO();
            state.itens = Array.isArray(data.itens) ? data.itens : [];
            state.cronogramaSemana = Array.isArray(data.cronograma_semana) ? data.cronograma_semana : [];
            state.escala = data.escala || null;
            state.fimDeSemana = !!data.fim_de_semana;
            state.frotaResumo = data.frota_resumo || null;
            render();
        } catch (err) {
            console.error('[APP-LAVAGEM] Erro ao carregar dia:', err);
            if (root) {
                root.innerHTML = `<div style="padding:2rem;text-align:center;color:#dc2626;"><i class="ph ph-warning-circle" style="font-size:2rem;"></i><p>${esc(err.message)}</p><button onclick="window.initAppLiderancaLavagem()" style="min-height:48px;padding:10px 18px;border-radius:10px;background:#2563eb;color:#fff;border:none;font-weight:700;cursor:pointer;">Tentar novamente</button></div>`;
            }
        }
    }

    function filtrarItens() {
        const q = norm(state.busca);
        return state.itens.filter(it => {
            if (state.filtroStatus === 'pendentes' && it.status === 'concluido') return false;
            if (state.filtroStatus === 'concluidos' && it.status !== 'concluido') return false;
            if (state.filtroStatus === 'simples' && it.tipo_lavagem !== 'simples') return false;
            if (state.filtroStatus === 'detalhada' && it.tipo_lavagem !== 'detalhada') return false;

            if (q) {
                const alvo = norm(`${it.placa} ${it.placa_fmt} ${it.modelo} ${it.nome_exibicao} ${it.categoria_label} ${it.tipo_lavagem_label} ${it.origem_rota} ${it.motorista_rota}`);
                if (!alvo.includes(q)) return false;
            }
            return true;
        });
    }

    function renderCalendarioHTML() {
        const dows = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const range = state.calMode === 'month'
            ? getMonthRange(state.calRefDate)
            : getWeekRange(state.calRefDate);

        const mesesNome = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const [ry, rm] = String(state.calRefDate).split('-').map(Number);
        const tituloPeriodo = state.calMode === 'month'
            ? `${mesesNome[(rm || 1) - 1]} ${ry}`
            : `${formatShortDateBR(range.start)} a ${formatShortDateBR(range.end)}`;

        const cellsHtml = range.days.map(dt => {
            const [, , dd] = dt.split('-');
            const [y, m, d] = dt.split('-').map(Number);
            const dowIdx = new Date(y, m - 1, d, 12, 0, 0).getDay();
            const isWeekend = (dowIdx === 0 || dowIdx === 6);
            const info = state.agendaDias[dt] || { total: 0, concluidos: 0, pendentes: 0 };
            const isSel = dt === state.selectedDate;
            const isToday = dt === state.hoje;

            let badgeHtml = `<span class="alav-day-badge" style="background:#f1f5f9;color:#94a3b8;">—</span>`;
            if (!isWeekend && info.total > 0) {
                const allOk = info.concluidos === info.total;
                const bg = allOk ? '#dcfce7' : (dt < state.hoje ? '#fee2e2' : '#dbeafe');
                const fg = allOk ? '#166534' : (dt < state.hoje ? '#b91c1c' : '#1d4ed8');
                badgeHtml = `<span class="alav-day-badge" style="background:${bg};color:${fg};">${info.concluidos}/${info.total}</span>`;
            }

            return `
                <button type="button" class="alav-day-btn ${isSel ? 'selected' : ''} ${isToday ? 'today' : ''}" onclick="window._alavSelectDate('${dt}')">
                    <span class="alav-day-dow">${dows[dowIdx]}</span>
                    <span class="alav-day-num">${dd}</span>
                    ${badgeHtml}
                </button>
            `;
        }).join('');

        return `
            <div class="alav-cal-card">
                <div class="alav-cal-top">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <button type="button" onclick="window._alavNavCal(-1)" style="min-width:40px;min-height:40px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"><i class="ph ph-caret-left"></i></button>
                        <span style="font-weight:800;font-size:0.92rem;color:#0f172a;min-width:130px;text-align:center;">${esc(tituloPeriodo)}</span>
                        <button type="button" onclick="window._alavNavCal(1)" style="min-width:40px;min-height:40px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"><i class="ph ph-caret-right"></i></button>
                        <button type="button" onclick="window._alavGoHoje()" style="min-height:40px;padding:0 12px;border-radius:10px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;font-weight:700;font-size:0.8rem;cursor:pointer;">Hoje</button>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button type="button" onclick="window._alavSetCalMode('week')" style="min-height:38px;padding:0 12px;border-radius:10px;border:1px solid ${state.calMode === 'week' ? '#2563eb' : '#cbd5e1'};background:${state.calMode === 'week' ? '#2563eb' : '#fff'};color:${state.calMode === 'week' ? '#fff' : '#475569'};font-weight:700;font-size:0.8rem;cursor:pointer;">Semana</button>
                        <button type="button" onclick="window._alavSetCalMode('month')" style="min-height:38px;padding:0 12px;border-radius:10px;border:1px solid ${state.calMode === 'month' ? '#2563eb' : '#cbd5e1'};background:${state.calMode === 'month' ? '#2563eb' : '#fff'};color:${state.calMode === 'month' ? '#fff' : '#475569'};font-weight:700;font-size:0.8rem;cursor:pointer;">Mês</button>
                    </div>
                </div>
                <div class="alav-week-grid">
                    ${cellsHtml}
                </div>
            </div>
        `;
    }

    function renderEscalaHTML() {
        if (!state.escala) return '';
        const d = state.escala.diurno || {};
        const n = state.escala.noturno || {};
        const respD = d.nomes || (d.escalados && d.escalados.map(x => x.nome_curto || x.nome).join(' / ')) || 'Não definido';
        const respN = n.nomes || (n.escalados && n.escalados.map(x => x.nome_curto || x.nome).join(' / ')) || 'Não definido';
        const folgaD = (d.folga || []).map(x => x.nome_curto || x.nome).join(', ');
        const folgaN = (n.folga || []).map(x => x.nome_curto || x.nome).join(', ');

        return `
            <div class="alav-escala-grid">
                <div class="alav-escala-card">
                    <div>
                        <div style="font-size:0.75rem;font-weight:700;color:#d97706;display:flex;align-items:center;gap:5px;"><i class="ph ph-sun"></i> Escala Diurna (Rotas do Dia)</div>
                        <div style="font-size:0.92rem;font-weight:800;color:#0f172a;margin-top:2px;">${esc(respD)}</div>
                        ${folgaD ? `<div style="font-size:0.72rem;color:#64748b;margin-top:2px;">Folga no dia: ${esc(folgaD)}</div>` : ''}
                    </div>
                    <span style="font-size:0.74rem;background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:999px;font-weight:700;">Diurno</span>
                </div>
                <div class="alav-escala-card" style="border-color:#93c5fd;background:#f8fafc;">
                    <div>
                        <div style="font-size:0.75rem;font-weight:700;color:#1d4ed8;display:flex;align-items:center;gap:5px;"><i class="ph ph-moon-stars"></i> Escala Noturna (Execução da Lavagem)</div>
                        <div style="font-size:0.92rem;font-weight:800;color:#0f172a;margin-top:2px;">${esc(respN)}</div>
                        ${folgaN ? `<div style="font-size:0.72rem;color:#64748b;margin-top:2px;">Folga no dia: ${esc(folgaN)}</div>` : ''}
                    </div>
                    <span style="font-size:0.74rem;background:#dbeafe;color:#1e40af;padding:4px 10px;border-radius:999px;font-weight:700;">Lavagem à Noite</span>
                </div>
            </div>
        `;
    }

    function renderCronogramaSemanalHTML() {
        if (!state.cronogramaSemana || !state.cronogramaSemana.length) return '';
        return `
            <div style="background:#fff;border:1.5px solid #e0e7ff;border-radius:14px;padding:12px 14px;margin-bottom:12px;">
                <div onclick="window._alavToggleCronogramaSemanal()" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;min-height:40px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <i class="ph ph-sparkle" style="color:#4f46e5;font-size:1.25rem;"></i>
                        <div>
                            <div style="font-weight:800;font-size:0.9rem;color:#1e1b4b;">Cronograma Automático — Lavagem Detalhada (Seg a Sex)</div>
                            <div style="font-size:0.75rem;color:#64748b;">1 Utilitário/dia + alternância Caminhonete / Caminhão (e 1 Caminhão Tanque a cada 15 dias)</div>
                        </div>
                    </div>
                    <i class="ph ${state.mostrarCronogramaSemanal ? 'ph-caret-up' : 'ph-caret-down'}" style="font-size:1.1rem;color:#4f46e5;"></i>
                </div>
                ${state.mostrarCronogramaSemanal ? `
                    <div style="margin-top:10px;border-top:1px solid #e2e8f0;padding-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:8px;">
                        ${state.cronogramaSemana.map(dia => {
                            const isSelected = dia.data === state.selectedDate;
                            return `
                                <div onclick="window._alavSelectDate('${dia.data}')" style="border:1.5px solid ${isSelected ? '#4f46e5' : '#e2e8f0'};background:${isSelected ? '#eef2ff' : '#f8fafc'};border-radius:10px;padding:8px 10px;cursor:pointer;">
                                    <div style="font-weight:800;font-size:0.78rem;color:#312e81;margin-bottom:6px;display:flex;justify-content:space-between;">
                                        <span>${esc(dia.dia_nome.replace('-feira', ''))}</span>
                                        <span style="color:#6366f1;">${formatShortDateBR(dia.data)}</span>
                                    </div>
                                    ${(dia.veiculos || []).map(v => `
                                        <div style="font-size:0.75rem;color:#1e293b;padding:4px 6px;background:#fff;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:4px;">
                                            <div style="font-weight:800;color:#0f172a;">${esc(v.placa_fmt)}</div>
                                            <div style="color:#64748b;font-size:0.7rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(v.categoria_label)} · ${esc(v.modelo)}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    function render() {
        injectStyles();
        const root = document.getElementById('app-lavagem-root');
        if (!root) return;

        const total = state.itens.length;
        const concluidos = state.itens.filter(i => i.status === 'concluido').length;
        const pendentes = total - concluidos;
        const qtdSimples = state.itens.filter(i => i.tipo_lavagem === 'simples').length;
        const qtdDetalhada = state.itens.filter(i => i.tipo_lavagem === 'detalhada').length;

        const filtrados = filtrarItens();

        let listaHtml = '';
        if (state.fimDeSemana) {
            listaHtml = `
                <div style="background:#fff;border:1.5px dashed #cbd5e1;border-radius:16px;padding:2rem 1.2rem;text-align:center;color:#475569;">
                    <i class="ph ph-calendar-x" style="font-size:2.4rem;color:#64748b;"></i>
                    <h3 style="margin:8px 0 4px;font-size:1.05rem;color:#0f172a;">Fim de Semana — Sem Cronograma de Lavagem</h3>
                    <p style="margin:0;font-size:0.86rem;color:#64748b;">O cronograma de lavagem funciona de <strong>segunda a sexta-feira</strong>. Os veículos das rotas de sexta à noite e fim de semana entram automaticamente na segunda-feira.</p>
                </div>
            `;
        } else if (filtrados.length === 0) {
            listaHtml = `
                <div style="background:#fff;border:1.5px dashed #cbd5e1;border-radius:16px;padding:2rem 1.2rem;text-align:center;color:#64748b;">
                    <i class="ph ph-Drop" style="font-size:2.2rem;"></i>
                    <p style="margin:6px 0 0;font-weight:700;color:#334155;">Nenhum veículo encontrado para este filtro na data ${formatDateBR(state.selectedDate)}.</p>
                </div>
            `;
        } else {
            listaHtml = filtrados.map(item => {
                const cardClass = item.status === 'concluido'
                    ? 'st-concluido'
                    : item.status === 'em_andamento'
                        ? 'st-andamento'
                        : item.atrasado
                            ? 'st-atrasado'
                            : '';

                const isDetalhada = item.tipo_lavagem === 'detalhada';
                const badgeTipo = isDetalhada
                    ? `<span style="background:#ede9fe;color:#5b21b6;border:1px solid #c4b5fd;padding:3px 9px;border-radius:999px;font-size:0.74rem;font-weight:800;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-sparkle"></i> Lavagem Detalhada</span>`
                    : `<span style="background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;padding:3px 9px;border-radius:999px;font-size:0.74rem;font-weight:800;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-drop"></i> Lavagem Simples (Rota)</span>`;

                const badgeCat = `<span style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:3px 9px;border-radius:999px;font-size:0.74rem;font-weight:700;">${esc(item.categoria_label)}</span>`;

                const statusBadge = item.status === 'concluido'
                    ? `<span style="background:#16a34a;color:#fff;padding:4px 10px;border-radius:999px;font-size:0.75rem;font-weight:800;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-check-circle"></i> Concluído</span>`
                    : item.status === 'em_andamento'
                        ? `<span style="background:#ca8a04;color:#fff;padding:4px 10px;border-radius:999px;font-size:0.75rem;font-weight:800;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-clock"></i> Em andamento</span>`
                        : item.atrasado
                            ? `<span style="background:#dc2626;color:#fff;padding:4px 10px;border-radius:999px;font-size:0.75rem;font-weight:800;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-warning-circle"></i> Atrasado</span>`
                            : `<span style="background:#e2e8f0;color:#334155;padding:4px 10px;border-radius:999px;font-size:0.75rem;font-weight:800;">Pendente</span>`;

                const itemKey = `${item.tipo_lavagem}::${item.placa}`;
                const pct = item.progresso.total > 0
                    ? Math.round((item.progresso.concluidos / item.progresso.total) * 100)
                    : 0;

                return `
                    <div class="alav-card ${cardClass}" onclick="window._alavOpenChecklist('${esc(itemKey)}')">
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:44px;height:44px;border-radius:12px;background:${isDetalhada ? '#ede9fe' : '#dbeafe'};color:${isDetalhada ? '#6d28d9' : '#1d4ed8'};display:flex;align-items:center;justify-content:center;font-size:1.35rem;flex-shrink:0;">
                                    <i class="ph ${item.categoria === 'caminhao_tanque' ? 'ph-drop' : item.categoria === 'caminhao' ? 'ph-truck' : 'ph-car-profile'}"></i>
                                </div>
                                <div>
                                    <div style="font-size:1.02rem;font-weight:900;color:#0f172a;">${esc(item.placa_fmt)} <span style="font-weight:700;color:#334155;font-size:0.9rem;">— ${esc(item.modelo || item.categoria_label)}</span></div>
                                    <div style="font-size:0.78rem;color:#475569;margin-top:2px;">
                                        <i class="ph ph-map-pin-line"></i> ${esc(item.origem_rota || (isDetalhada ? 'Cronograma Detalhado' : 'Saída em Rota'))}
                                        ${item.motorista_rota ? ` · <i class="ph ph-user"></i> ${esc(item.motorista_rota)}` : ''}
                                    </div>
                                </div>
                            </div>
                            ${statusBadge}
                        </div>

                        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:8px;">
                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                ${badgeTipo}
                                ${badgeCat}
                            </div>
                            <div style="font-size:0.8rem;font-weight:800;color:#1e293b;display:flex;align-items:center;gap:8px;">
                                <span><i class="ph ph-check-square-offset"></i> ${item.progresso.concluidos}/${item.progresso.total} itens</span>
                                <span><i class="ph ph-camera"></i> ${item.progresso.fotos_total} foto(s)</span>
                                <i class="ph ph-caret-right" style="font-size:1rem;color:#64748b;"></i>
                            </div>
                        </div>

                        <div style="margin-top:8px;height:6px;background:rgba(15,23,42,0.08);border-radius:999px;overflow:hidden;">
                            <div style="width:${pct}%;height:100%;background:${item.status === 'concluido' ? '#16a34a' : '#2563eb'};transition:width 0.2s;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        root.innerHTML = `
            <div class="alav-wrap">
                <div class="alav-header">
                    <h2 class="alav-title">
                        <i class="ph ph-drop"></i>
                        <div>
                            <div>Lavagem de Veículos</div>
                            <div style="font-size:0.76rem;font-weight:600;color:#64748b;">Lavagem simples diária (rotas) e cronograma detalhado (Seg a Sex)</div>
                        </div>
                    </h2>
                    <button type="button" onclick="window._alavReload()" style="min-height:44px;padding:0 14px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;font-weight:700;font-size:0.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                        <i class="ph ph-arrows-clockwise"></i> Atualizar
                    </button>
                </div>

                ${renderCalendarioHTML()}
                ${renderEscalaHTML()}
                ${renderCronogramaSemanalHTML()}

                <!-- Campo de pesquisa digitável em tempo real -->
                <div class="alav-search-row">
                    <div style="position:relative;flex:1;min-width:240px;">
                        <i class="ph ph-magnifying-glass" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#64748b;font-size:1.15rem;"></i>
                        <input type="text" id="alav-search-input" class="alav-search-input"
                            placeholder="Pesquisar placa, veículo, categoria ou motorista..."
                            value="${esc(state.busca)}"
                            oninput="window._alavOnSearch(this.value)">
                    </div>
                </div>

                <!-- Filtros rápidos -->
                <div class="alav-chips">
                    <button type="button" class="alav-chip ${state.filtroStatus === 'todos' ? 'active' : ''}" onclick="window._alavSetFiltro('todos')">
                        <i class="ph ph-list-bullets"></i> Todos (${total})
                    </button>
                    <button type="button" class="alav-chip ${state.filtroStatus === 'pendentes' ? 'active' : ''}" onclick="window._alavSetFiltro('pendentes')">
                        <i class="ph ph-clock"></i> Pendentes (${pendentes})
                    </button>
                    <button type="button" class="alav-chip ${state.filtroStatus === 'simples' ? 'active' : ''}" onclick="window._alavSetFiltro('simples')">
                        <i class="ph ph-drop"></i> Lavagem Simples (${qtdSimples})
                    </button>
                    <button type="button" class="alav-chip ${state.filtroStatus === 'detalhada' ? 'active' : ''}" onclick="window._alavSetFiltro('detalhada')">
                        <i class="ph ph-sparkle"></i> Lavagem Detalhada (${qtdDetalhada})
                    </button>
                    <button type="button" class="alav-chip ${state.filtroStatus === 'concluidos' ? 'active' : ''}" onclick="window._alavSetFiltro('concluidos')">
                        <i class="ph ph-check-circle"></i> Concluídos (${concluidos})
                    </button>
                </div>

                <div id="alav-lista-container">
                    ${listaHtml}
                </div>
            </div>
        `;

        if (state.activeItemKey) {
            renderDrawer();
        }
    }

    function renderDrawer() {
        document.getElementById('alav-drawer-backdrop')?.remove();
        if (!state.activeItemKey) return;

        const item = state.itens.find(it => `${it.tipo_lavagem}::${it.placa}` === state.activeItemKey);
        if (!item) {
            state.activeItemKey = null;
            return;
        }

        const isDetalhada = item.tipo_lavagem === 'detalhada';
        const backdrop = document.createElement('div');
        backdrop.id = 'alav-drawer-backdrop';
        backdrop.className = 'alav-drawer-backdrop';

        const itensHtml = (item.itens || []).map(sub => {
            const temFoto = sub.fotos && sub.fotos.length > 0;
            const isOk = sub.status === 'ok' && (temFoto || !sub.obrigatorio);
            const isNa = sub.status === 'na' && !sub.obrigatorio;
            const isUploading = state.uploadingItemKey === sub.key;

            return `
                <div class="alav-item-row ${(isOk || isNa) ? 'done' : ''}">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div style="width:40px;height:40px;border-radius:10px;background:${(isOk || isNa) ? '#dcfce7' : '#f1f5f9'};color:${(isOk || isNa) ? '#16a34a' : '#475569'};display:flex;align-items:center;justify-content:center;font-size:1.25rem;">
                                <i class="ph ${sub.icon || 'ph-check-circle'}"></i>
                            </div>
                            <div>
                                <div style="font-weight:800;font-size:0.95rem;color:#0f172a;">
                                    ${esc(sub.label)}
                                    ${sub.obrigatorio
                                        ? `<span style="font-size:0.7rem;color:#dc2626;font-weight:700;margin-left:4px;">* Foto obrigatória</span>`
                                        : `<span style="font-size:0.7rem;color:#64748b;font-weight:600;margin-left:4px;">(se houver)</span>`}
                                </div>
                                <div style="font-size:0.75rem;color:${isOk ? '#16a34a' : isNa ? '#64748b' : '#d97706'};font-weight:700;">
                                    ${isOk ? '✓ Verificado com foto' : isNa ? 'Não possui tanque (N/A)' : 'Pendente de foto / verificação'}
                                </div>
                            </div>
                        </div>

                        <div style="display:flex;align-items:center;gap:8px;">
                            ${!sub.obrigatorio ? `
                                <button type="button" onclick="window._alavMarcarItem('${esc(sub.key)}', '${isNa ? '' : 'na'}')"
                                    style="min-height:48px;padding:0 12px;border-radius:10px;border:1.5px solid ${isNa ? '#475569' : '#cbd5e1'};background:${isNa ? '#334155' : '#fff'};color:${isNa ? '#fff' : '#475569'};font-weight:700;font-size:0.8rem;cursor:pointer;">
                                    Não há tanque
                                </button>
                            ` : ''}
                            <label style="min-height:48px;padding:0 16px;border-radius:12px;background:#2563eb;color:#fff;font-weight:800;font-size:0.86rem;display:inline-flex;align-items:center;gap:6px;cursor:pointer;box-shadow:0 2px 6px rgba(37,99,235,0.25);">
                                <i class="ph ${isUploading ? 'ph-spinner ph-spin' : 'ph-camera'}" style="font-size:1.15rem;"></i>
                                <span>${isUploading ? 'Enviando...' : 'Tirar Foto'}</span>
                                <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="window._alavUploadFoto('${esc(sub.key)}', this)" ${isUploading ? 'disabled' : ''}>
                            </label>
                        </div>
                    </div>

                    ${temFoto ? `
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px dashed #cbd5e1;">
                            ${sub.fotos.map(f => `
                                <div style="position:relative;width:78px;height:78px;border-radius:10px;overflow:hidden;border:2px solid #86efac;background:#0f172a;">
                                    <img src="${esc(f.url)}" alt="Foto" onclick="window.open('${esc(f.url)}', '_blank')" style="width:100%;height:100%;object-fit:cover;cursor:pointer;">
                                    <button type="button" onclick="window._alavExcluirFoto(${f.id})" title="Remover foto"
                                        style="position:absolute;top:3px;right:3px;width:24px;height:24px;border-radius:50%;background:rgba(220,38,38,0.9);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.8rem;">
                                        <i class="ph ph-trash"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        backdrop.innerHTML = `
            <div class="alav-drawer" onclick="event.stopPropagation()">
                <div style="background:${isDetalhada ? 'linear-gradient(135deg,#4f46e5,#3730a3)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)'};color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0;">
                    <div>
                        <div style="font-size:0.75rem;font-weight:700;opacity:0.9;display:flex;align-items:center;gap:5px;">
                            <i class="ph ${isDetalhada ? 'ph-sparkle' : 'ph-drop'}"></i> ${esc(item.tipo_lavagem_label)} · ${formatDateBR(item.data_programada)}
                        </div>
                        <div style="font-size:1.08rem;font-weight:900;margin-top:2px;">${esc(item.placa_fmt)} — ${esc(item.modelo || item.categoria_label)}</div>
                    </div>
                    <button type="button" onclick="window._alavCloseDrawer()" style="width:42px;height:42px;border-radius:50%;border:none;background:rgba(255,255,255,0.2);color:#fff;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                        <i class="ph ph-x"></i>
                    </button>
                </div>

                <div style="flex:1;overflow-y:auto;padding:14px;">
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                        <div style="font-size:0.82rem;color:#334155;">
                            <strong>Categoria:</strong> ${esc(item.categoria_label)} &nbsp;|&nbsp;
                            <strong>Origem:</strong> ${esc(item.origem_rota)}
                        </div>
                        <div style="font-size:0.82rem;font-weight:800;color:#1d4ed8;">
                            Progresso: ${item.progresso.concluidos}/${item.progresso.total} obrigatórios
                        </div>
                    </div>

                    ${itensHtml}

                    <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:12px 14px;margin-top:12px;">
                        <label style="display:block;font-weight:800;font-size:0.85rem;color:#334155;margin-bottom:6px;">
                            <i class="ph ph-note-pencil"></i> Observações da Lavagem (opcional)
                        </label>
                        <textarea id="alav-obs-geral" rows="2" placeholder="Digite alguma observação se necessário..."
                            style="width:100%;padding:10px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:16px;font-family:inherit;text-transform:none !important;box-sizing:border-box;"
                            onblur="window._alavSalvarObsGeral(this.value)">${esc(item.observacoes || '')}</textarea>
                    </div>
                </div>

                <div style="padding:12px 16px;background:#fff;border-top:1px solid #e2e8f0;display:flex;gap:10px;flex-shrink:0;">
                    <button type="button" onclick="window._alavCloseDrawer()" style="min-height:50px;padding:0 18px;border-radius:12px;border:1.5px solid #cbd5e1;background:#f8fafc;color:#334155;font-weight:800;font-size:0.9rem;cursor:pointer;">
                        Fechar
                    </button>
                    <button type="button" onclick="window._alavConcluirLavagem()" style="flex:1;min-height:50px;border-radius:12px;border:none;background:#16a34a;color:#fff;font-weight:900;font-size:0.98rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 12px rgba(22,163,74,0.3);">
                        <i class="ph ph-check-circle" style="font-size:1.25rem;"></i>
                        <span>${item.status === 'concluido' ? 'Lavagem Concluída (Atualizar)' : 'Concluir Lavagem'}</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);
    }

    function comprimirImagemBase64(file, maxWidth = 1280, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    let w = img.width;
                    let h = img.height;
                    if (w > maxWidth) {
                        h = Math.round((h * maxWidth) / w);
                        w = maxWidth;
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ─── Handlers Globais ─────────────────────────────────────────────────────
    window._alavSelectDate = async function (dt) {
        state.selectedDate = dt;
        state.calRefDate = dt;
        await carregarAgendaPeriodo();
        await carregarDia(dt);
    };

    window._alavNavCal = async function (dir) {
        const delta = state.calMode === 'month' ? (dir * 30) : (dir * 7);
        state.calRefDate = addDaysISO(state.calRefDate, delta);
        await carregarAgendaPeriodo();
        render();
    };

    window._alavGoHoje = async function () {
        const h = state.hoje || getHojeLocalISO();
        state.calRefDate = h;
        state.selectedDate = h;
        await carregarAgendaPeriodo();
        await carregarDia(h);
    };

    window._alavSetCalMode = async function (mode) {
        state.calMode = mode;
        await carregarAgendaPeriodo();
        render();
    };

    window._alavToggleCronogramaSemanal = function () {
        state.mostrarCronogramaSemanal = !state.mostrarCronogramaSemanal;
        render();
    };

    window._alavOnSearch = function (val) {
        state.busca = val || '';
        const pos = document.getElementById('alav-search-input')?.selectionStart || state.busca.length;
        render();
        const inp = document.getElementById('alav-search-input');
        if (inp) {
            inp.focus();
            try { inp.setSelectionRange(pos, pos); } catch (_) {}
        }
    };

    window._alavSetFiltro = function (f) {
        state.filtroStatus = f;
        render();
    };

    window._alavReload = async function () {
        await carregarAgendaPeriodo();
        await carregarDia(state.selectedDate);
        toast('Lista atualizada!', 'sucesso');
    };

    window._alavOpenChecklist = function (key) {
        state.activeItemKey = key;
        renderDrawer();
    };

    window._alavCloseDrawer = function () {
        state.activeItemKey = null;
        document.getElementById('alav-drawer-backdrop')?.remove();
    };

    window._alavUploadFoto = async function (itemKey, inputEl) {
        const file = inputEl && inputEl.files && inputEl.files[0];
        if (!file) return;
        const item = state.itens.find(it => `${it.tipo_lavagem}::${it.placa}` === state.activeItemKey);
        if (!item) return;

        state.uploadingItemKey = itemKey;
        renderDrawer();

        try {
            const base64 = await comprimirImagemBase64(file);
            const resp = await fetch('/api/app/lavagem/midia', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data_programada: item.data_programada,
                    tipo_lavagem: item.tipo_lavagem,
                    veiculo_placa: item.placa,
                    veiculo_nome: item.nome_exibicao,
                    categoria_veiculo: item.categoria,
                    origem_rota: item.origem_rota,
                    item_key: itemKey,
                    base64
                })
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(data.error || 'Erro ao enviar foto');

            toast('Foto salva com sucesso!', 'sucesso');
            await carregarAgendaPeriodo();
            await carregarDia(state.selectedDate);
        } catch (err) {
            toast(err.message || 'Erro ao enviar foto', 'erro');
        } finally {
            state.uploadingItemKey = null;
            renderDrawer();
        }
    };

    window._alavExcluirFoto = async function (midiaId) {
        if (!confirm('Deseja remover esta foto do item?')) return;
        try {
            const resp = await fetch(`/api/app/lavagem/midia/${midiaId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!resp.ok) throw new Error('Erro ao remover foto');
            toast('Foto removida.', 'info');
            await carregarAgendaPeriodo();
            await carregarDia(state.selectedDate);
        } catch (err) {
            toast(err.message, 'erro');
        }
    };

    window._alavMarcarItem = async function (itemKey, novoStatus) {
        const item = state.itens.find(it => `${it.tipo_lavagem}::${it.placa}` === state.activeItemKey);
        if (!item) return;
        try {
            const resp = await fetch('/api/app/lavagem/item', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data_programada: item.data_programada,
                    tipo_lavagem: item.tipo_lavagem,
                    veiculo_placa: item.placa,
                    veiculo_nome: item.nome_exibicao,
                    categoria_veiculo: item.categoria,
                    origem_rota: item.origem_rota,
                    item_key: itemKey,
                    status: novoStatus
                })
            });
            if (!resp.ok) throw new Error('Erro ao atualizar item');
            await carregarAgendaPeriodo();
            await carregarDia(state.selectedDate);
        } catch (err) {
            toast(err.message, 'erro');
        }
    };

    window._alavSalvarObsGeral = async function (texto) {
        const item = state.itens.find(it => `${it.tipo_lavagem}::${it.placa}` === state.activeItemKey);
        if (!item) return;
        try {
            await fetch('/api/app/lavagem/item', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data_programada: item.data_programada,
                    tipo_lavagem: item.tipo_lavagem,
                    veiculo_placa: item.placa,
                    veiculo_nome: item.nome_exibicao,
                    categoria_veiculo: item.categoria,
                    origem_rota: item.origem_rota,
                    observacoes_gerais: texto
                })
            });
            item.observacoes = texto;
        } catch (_) {}
    };

    window._alavConcluirLavagem = async function () {
        const item = state.itens.find(it => `${it.tipo_lavagem}::${it.placa}` === state.activeItemKey);
        if (!item) return;
        const obs = document.getElementById('alav-obs-geral')?.value || item.observacoes || '';

        try {
            const resp = await fetch('/api/app/lavagem/concluir', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data_programada: item.data_programada,
                    tipo_lavagem: item.tipo_lavagem,
                    veiculo_placa: item.placa,
                    veiculo_nome: item.nome_exibicao,
                    categoria_veiculo: item.categoria,
                    origem_rota: item.origem_rota,
                    observacoes: obs
                })
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                throw new Error(data.error || 'Não foi possível concluir a lavagem.');
            }
            toast('Lavagem concluída com sucesso!', 'sucesso');
            state.activeItemKey = null;
            document.getElementById('alav-drawer-backdrop')?.remove();
            await carregarAgendaPeriodo();
            await carregarDia(state.selectedDate);
        } catch (err) {
            toast(err.message, 'erro');
        }
    };

    window.renderAppLiderancaLavagem = window.initAppLiderancaLavagem = async function () {
        injectStyles();
        const h = getHojeLocalISO();
        if (!state.selectedDate) state.selectedDate = h;
        if (!state.calRefDate) state.calRefDate = state.selectedDate;
        await carregarAgendaPeriodo();
        await carregarDia(state.selectedDate);
    };
})();
