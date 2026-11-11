// ═══════════════════════════════════════════════════════════════════════════════
// APP › Liderança › Entregas (mobile-first, uso operacional no celular)
// Agenda semanal/mensal, filtros (Pendentes, OK, Com avaria, Todas + data),
// motorista/veículo do Resumo de Rota, checklist por unidade (joinha 👍/👎,
// observação, 1 foto obrigatória por item, vídeo opcional) e identificação
// do líder (foto + nome) que realizou a conferência.
// ═══════════════════════════════════════════════════════════════════════════════
(function () {
    'use strict';

    const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const S = {
        modo: 'semana',
        semanaIni: null,
        mesRef: null,
        diaSel: null,
        filtro: 'pendentes', // 'pendentes' | 'avaria' | 'ok' | 'todas'
        busca: '',
        itens: [],
        inicioControle: '2026-11-10',
        hoje: null,
        osAberta: null,       // payload completo do GET /api/app/entregas/os/:id
        unidadeAtiva: null,   // unidade_key selecionada na aba
        salvando: false,
        enviandoMidia: null   // item_key ou 'video' em upload
    };

    const tok = () => localStorage.getItem('token') || '';
    const hdr = (json = true) => {
        const h = { 'Authorization': 'Bearer ' + tok() };
        if (json) h['Content-Type'] = 'application/json';
        return h;
    };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // Regra global: sempre exibir o ícone do Grupo de Clientes ao lado do nome internamente
    const fmtCliente = n => (typeof window.formatarNomeClienteComIcone === 'function' ? window.formatarNomeClienteComIcone(n) : String(n || ''));
    const pad = n => String(n).padStart(2, '0');
    const toIso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const fromIso = s => { const [y, m, d] = (s || '').split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0); };
    const hojeIso = () => S.hoje || toIso(new Date());
    const fmtBR = s => s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split('-').reverse().join('/') : (s || '—');
    const fmtDataHora = s => {
        if (!s) return '';
        const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
        if (isNaN(d.getTime())) return s;
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    function inicioSemana(iso) {
        const d = fromIso(iso);
        d.setDate(d.getDate() - d.getDay());
        return toIso(d);
    }
    function somaDias(iso, n) {
        const d = fromIso(iso);
        d.setDate(d.getDate() + n);
        return toIso(d);
    }
    function intervaloCarregamento() {
        if (S.modo === 'semana') return { de: S.semanaIni, ate: somaDias(S.semanaIni, 6) };
        const [y, m] = S.mesRef.split('-').map(Number);
        const ini = new Date(y, m - 1, 1, 12); ini.setDate(ini.getDate() - ini.getDay());
        const fim = new Date(y, m, 0, 12); fim.setDate(fim.getDate() + (6 - fim.getDay()));
        return { de: toIso(ini), ate: toIso(fim) };
    }
    function toast(msg, erro) {
        let t = document.getElementById('alc-toast');
        if (!t) { t = document.createElement('div'); t.id = 'alc-toast'; document.body.appendChild(t); }
        t.className = 'alc-toast ' + (erro ? 'erro' : 'ok');
        t.innerHTML = `<i class="ph ${erro ? 'ph-warning-circle' : 'ph-check-circle'}"></i><span>${esc(msg)}</span>`;
        t.classList.add('visivel');
        clearTimeout(t._tm);
        t._tm = setTimeout(() => t.classList.remove('visivel'), 2600);
    }

    // Transforma URL privada de mídia em URL autenticada com token na query para <img>/<video>
    function urlMidia(u) {
        if (!u) return '';
        return u + (u.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(tok());
    }

    // ═══ Entrada principal ══════════════════════════════════════════════════════
    window.renderAppLiderancaEntregas = async function () {
        const box = document.getElementById('app-lideranca-entregas-container');
        if (!box) return;
        const hj = hojeIso();
        if (!S.semanaIni) S.semanaIni = inicioSemana(hj);
        if (!S.mesRef) S.mesRef = hj.slice(0, 7);
        aplicarModoCelular();
        await carregar();
    };

    async function carregar() {
        const box = document.getElementById('app-lideranca-entregas-container');
        if (!box) return;
        if (!S.itens.length) {
            box.innerHTML = `<div class="alc-vazio"><i class="ph ph-spinner ph-spin"></i>Carregando entregas...</div>`;
        }
        try {
            const { de, ate } = intervaloCarregamento();
            const r = await fetch(`/api/app/entregas?de=${de}&ate=${ate}`, { headers: hdr(false) });
            if (!r.ok) {
                const j = await r.json().catch(() => ({}));
                box.innerHTML = `<div class="alc-vazio"><i class="ph ph-lock-key"></i>${esc(j.error || 'Sem acesso a esta tela.')}</div>`;
                return;
            }
            const data = await r.json();
            S.itens = data.itens || [];
            S.inicioControle = data.inicio_controle || '2026-11-10';
            S.hoje = data.hoje || toIso(new Date());
            desenhar();
        } catch (e) {
            box.innerHTML = `<div class="alc-vazio"><i class="ph ph-wifi-slash"></i>Erro de conexão: ${esc(e.message)}</div>`;
        }
    }

    // ═══ Renderização da tela principal ═════════════════════════════════════════
    function desenhar() {
        const box = document.getElementById('app-lideranca-entregas-container');
        if (!box) return;
        const pendentesTotal = S.itens.filter(i => i.pendente).length;
        const avariasTotal = S.itens.filter(i => i.tem_avaria && i.data_iso >= S.inicioControle).length;
        const okTotal = S.itens.filter(i => i.situacao === 'ok' && i.data_iso >= S.inicioControle).length;

        box.innerHTML = `
            <div class="alc-shell">
                <header class="alc-top">
                    <div class="alc-top-row">
                        <button type="button" class="alc-icon-btn alc-menu-btn" onclick="window._aleMenu()" title="Menu">
                            <i class="ph ph-list"></i>
                        </button>
                        <div class="alc-titulo">
                            <h1><i class="ph ph-truck"></i> Entregas</h1>
                            <span class="alc-sub">${ esc(subtituloCabecalho()) }</span>
                        </div>
                        <div class="alc-acoes-top">
                            <button type="button" class="alc-chip-btn" onclick="window._aleHoje()">Hoje</button>
                            <button type="button" class="alc-icon-btn" onclick="window._aleModo()" title="Alternar semana/mês">
                                <i class="ph ${S.modo === 'semana' ? 'ph-calendar-dots' : 'ph-rows'}"></i>
                            </button>
                            <button type="button" class="alc-icon-btn" onclick="window.renderAppLiderancaEntregas()" title="Atualizar">
                                <i class="ph ph-arrows-clockwise"></i>
                            </button>
                        </div>
                    </div>

                    ${renderCalendario()}

                    <div class="alr-filtros-bar">
                        <button type="button" class="alr-filtro-pill ${S.filtro === 'pendentes' ? 'ativo vermelho' : ''}" onclick="window._aleFiltro('pendentes')">
                            <i class="ph ph-warning-circle"></i> Pendentes
                            ${pendentesTotal > 0 ? `<span class="alr-pill-qtd">${pendentesTotal}</span>` : ''}
                        </button>
                        <button type="button" class="alr-filtro-pill ${S.filtro === 'avaria' ? 'ativo vermelho' : ''}" onclick="window._aleFiltro('avaria')">
                            <i class="ph ph-warning-octagon"></i> Com avaria
                            ${avariasTotal > 0 ? `<span class="alr-pill-qtd">${avariasTotal}</span>` : ''}
                        </button>
                        <button type="button" class="alr-filtro-pill ${S.filtro === 'ok' ? 'ativo verde' : ''}" onclick="window._aleFiltro('ok')">
                            <i class="ph ph-thumbs-up"></i> Equipamentos OK
                            ${okTotal > 0 ? `<span class="alr-pill-qtd ok">${okTotal}</span>` : ''}
                        </button>
                        <button type="button" class="alr-filtro-pill ${S.filtro === 'todas' ? 'ativo' : ''}" onclick="window._aleFiltro('todas')">
                            <i class="ph ph-stack"></i> Todas
                        </button>
                    </div>

                    <div class="alr-busca-row">
                        <div class="alr-busca-input">
                            <i class="ph ph-magnifying-glass"></i>
                            <input type="search" placeholder="Buscar OS, cliente, motorista, placa..." value="${esc(S.busca)}" oninput="window._aleBusca(this.value)">
                        </div>
                        <label class="alr-data-jump" title="Ir para uma data específica">
                            <i class="ph ph-calendar"></i>
                            <input type="date" value="${esc(S.diaSel || '')}" onchange="window._aleIrData(this.value)">
                        </label>
                    </div>
                </header>
                <div class="alc-body">
                    ${renderLista()}
                </div>
            </div>
        `;
    }

    function subtituloCabecalho() {
        if (S.diaSel) return `Dia ${fmtBR(S.diaSel)} · toque novamente para ver o período`;
        if (S.modo === 'semana') return `Semana ${fmtBR(S.semanaIni).slice(0, 5)} a ${fmtBR(somaDias(S.semanaIni, 6)).slice(0, 5)}`;
        const [y, m] = S.mesRef.split('-').map(Number);
        return `${MESES[m - 1]} ${y}`;
    }

    function marcadorDoDia(iso) {
        const doDia = S.itens.filter(i => i.data_iso === iso && i.total_unidades > 0);
        if (!doDia.length) return '';
        if (doDia.some(i => i.pendente || i.tem_avaria)) return '<span class="alc-dot vermelho"></span>';
        if (doDia.every(i => i.situacao === 'ok')) return '<span class="alc-dot verde"></span>';
        if (doDia.some(i => i.futura)) return '<span class="alc-dot azul"></span>';
        return '<span class="alc-dot cinza"></span>';
    }

    function renderCalendario() {
        const hj = hojeIso();
        if (S.modo === 'semana') {
            const dias = [];
            for (let i = 0; i < 7; i++) {
                const iso = somaDias(S.semanaIni, i);
                const d = fromIso(iso);
                const qtd = S.itens.filter(x => x.data_iso === iso).length;
                const cls = ['alc-dia', iso === hj ? 'hoje' : '', S.diaSel === iso ? 'sel' : ''].filter(Boolean).join(' ');
                dias.push(`
                    <button type="button" class="${cls}" onclick="window._aleDia('${iso}')">
                        <span class="alc-dia-sem">${DIAS_CURTOS[d.getDay()]}</span>
                        <span class="alc-dia-num">${d.getDate()}</span>
                        ${qtd ? `<span class="alr-dia-qtd">${qtd}</span>` : marcadorDoDia(iso)}
                    </button>
                `);
            }
            return `
                <div class="alc-strip-wrap">
                    <button type="button" class="alc-nav-seta" onclick="window._aleNav(-1)" aria-label="Semana anterior"><i class="ph ph-caret-left"></i></button>
                    <div class="alc-strip">${dias.join('')}</div>
                    <button type="button" class="alc-nav-seta" onclick="window._aleNav(1)" aria-label="Próxima semana"><i class="ph ph-caret-right"></i></button>
                </div>
            `;
        }
        const [y, m] = S.mesRef.split('-').map(Number);
        const { de, ate } = intervaloCarregamento();
        const cab = DIAS_CURTOS.map(d => `<div class="alc-mes-cab">${d}</div>`).join('');
        const celulas = [];
        let cur = de;
        while (cur <= ate) {
            const d = fromIso(cur);
            const fora = (d.getMonth() + 1) !== m;
            const cls = ['alc-dia', 'mes', fora ? 'fora' : '', cur === hj ? 'hoje' : '', S.diaSel === cur ? 'sel' : ''].filter(Boolean).join(' ');
            celulas.push(`
                <button type="button" class="${cls}" onclick="window._aleDia('${cur}')">
                    <span class="alc-dia-num">${d.getDate()}</span>
                    ${marcadorDoDia(cur)}
                </button>
            `);
            cur = somaDias(cur, 1);
        }
        return `
            <div class="alc-mes-nav">
                <button type="button" class="alc-nav-seta" onclick="window._aleNav(-1)"><i class="ph ph-caret-left"></i></button>
                <strong>${MESES[m - 1]} ${y}</strong>
                <button type="button" class="alc-nav-seta" onclick="window._aleNav(1)"><i class="ph ph-caret-right"></i></button>
            </div>
            <div class="alc-mes-grid">${cab}${celulas.join('')}</div>
        `;
    }

    function renderLista() {
        const { de, ate } = intervaloCarregamento();
        const q = S.busca.trim().toLowerCase();
        const passaBusca = i => {
            if (!q) return true;
            return [i.numero_os, i.cliente, i.endereco, i.motorista, i.veiculo, i.contrato]
                .some(v => String(v || '').toLowerCase().includes(q));
        };

        let base = S.itens.filter(passaBusca);
        if (S.diaSel) {
            base = base.filter(i => i.data_iso === S.diaSel);
        } else {
            base = base.filter(i => (i.data_iso >= de && i.data_iso <= ate) || (S.filtro === 'pendentes' && i.pendente));
        }

        if (S.filtro === 'pendentes') {
            base = base.filter(i => S.diaSel ? (i.situacao !== 'ok' && i.situacao !== 'sem_checklist') : (i.pendente || i.situacao === 'andamento'));
        } else if (S.filtro === 'avaria') {
            base = base.filter(i => i.tem_avaria);
        } else if (S.filtro === 'ok') {
            base = base.filter(i => i.situacao === 'ok');
        }

        base.sort((a, b) => a.data_iso === b.data_iso ? (b.os_id - a.os_id) : (a.data_iso < b.data_iso ? 1 : -1));

        if (!base.length) {
            const msg = S.filtro === 'pendentes'
                ? 'Nenhuma entrega pendente de checklist neste filtro.'
                : S.filtro === 'avaria'
                    ? 'Nenhum equipamento entregue com avaria neste período.'
                    : S.filtro === 'ok'
                        ? 'Nenhuma entrega conferida como OK neste período.'
                        : 'Nenhuma entrega encontrada para a data selecionada.';
            return `<div class="alc-vazio"><i class="ph ph-check-Fat"></i>${esc(msg)}</div>`;
        }

        return `<section class="alc-grupo">${base.map(cardHtml).join('')}</section>`;
    }

    function badgeSituacao(i) {
        if (i.situacao === 'avaria') return '<span class="alc-badge vermelho"><i class="ph ph-warning-octagon"></i> AVARIA</span>';
        if (i.situacao === 'ok') return '<span class="alc-badge verde"><i class="ph ph-thumbs-up"></i> OK</span>';
        if (i.situacao === 'sem_checklist') return '<span class="alc-badge cinza"><i class="ph ph-prohibit"></i> Sem checklist</span>';
        const av = i.tem_avaria ? '<span class="alc-badge vermelho"><i class="ph ph-warning-octagon"></i> AVARIA</span>' : '';
        if (i.pendente) return '<span class="alc-badge vermelho"><i class="ph ph-warning-circle"></i> Pendente</span>' + av;
        if (i.situacao === 'andamento') return '<span class="alc-badge laranja"><i class="ph ph-list-checks"></i> Em andamento</span>' + av;
        if (i.futura) return '<span class="alc-badge azul"><i class="ph ph-calendar-check"></i> Agendada</span>';
        return '<span class="alc-badge cinza"><i class="ph ph-clock-counter-clockwise"></i> Sem conferência</span>';
    }

    function cardHtml(i) {
        const chipsUnidades = (i.unidades || []).map(u => {
            let cls = 'alr-uni-chip';
            let ic = 'ph-circle-dashed';
            if (u.status === 'concluido' && u.tem_avaria) { cls += ' avaria'; ic = 'ph-thumbs-down'; }
            else if (u.status === 'concluido') { cls += ' ok'; ic = 'ph-thumbs-up'; }
            else if (u.respondidos > 0) { cls += ' andamento'; ic = 'ph-hourglass-medium'; }
            return `<span class="${cls}"><i class="ph ${ic}"></i> ${esc(u.rotulo)}</span>`;
        }).join('');

        const semChk = (i.sem_checklist || []).map(s => `<span class="alr-uni-chip neutro">${esc(s.qtd + 'x ' + s.descricao)}</span>`).join('');

        const rotaHtml = (i.motorista || i.veiculo) ? `
            <div class="alr-rota-pill">
                <i class="ph ph-steering-wheel"></i>
                <span><strong>${esc(i.motorista || 'Motorista não definido')}</strong>${i.veiculo ? ' · ' + esc(i.veiculo) : ''}${i.ordem_rota ? ' · Parada ' + esc(i.ordem_rota) : ''}</span>
            </div>
        ` : `
            <div class="alr-rota-pill sem">
                <i class="ph ph-truck"></i>
                <span>Sem rota atribuída no Resumo de Rota</span>
            </div>
        `;

        const conferenteHtml = i.conferente ? `
            <div class="alr-lider-assinatura">
                ${i.conferente.foto
                    ? `<img src="${esc(i.conferente.foto)}" alt="" class="alr-lider-avatar" onerror="this.style.display='none'">`
                    : `<span class="alr-lider-iniciais">${esc((i.conferente.nome || 'L').slice(0, 2).toUpperCase())}</span>`}
                <span>Conferido por <strong>${esc(i.conferente.nome)}</strong>${i.conferente.em ? ' · ' + esc(fmtDataHora(i.conferente.em)) : ''}</span>
            </div>
        ` : '';

        return `
            <article class="alc-card ${i.tem_avaria ? 'alr-card-avaria' : ''}" onclick="window._aleAbrir(${i.os_id})">
                <div class="alc-card-main">
                    <div class="alc-card-top">
                        <span class="alc-nome">OS #${esc(i.numero_os)} · ${esc(fmtCliente(i.cliente))}</span>
                        <div class="alr-badges-wrap">${badgeSituacao(i)}</div>
                    </div>
                    <div class="alc-meta">
                        <span><i class="ph ph-calendar-blank"></i> ${fmtBR(i.data_iso)}</span>
                        ${i.horario_ini ? `<span><i class="ph ph-clock"></i> ${esc(i.horario_ini)}${i.horario_fim ? '–' + esc(i.horario_fim) : ''}</span>` : ''}
                        <span><i class="ph ${i.turno === 'noturno' ? 'ph-moon-stars' : 'ph-sun'}"></i> ${i.turno === 'noturno' ? 'Noturno' : 'Diurno'}</span>
                        <span><i class="ph ph-toilet"></i> ${i.unidades_concluidas}/${i.total_unidades} conferido(s)</span>
                    </div>
                    ${i.endereco ? `<div class="alr-endereco"><i class="ph ph-map-pin"></i> ${esc(i.endereco)}</div>` : ''}
                    ${rotaHtml}
                    <div class="alr-uni-row">${chipsUnidades}${semChk}</div>
                    ${conferenteHtml}
                </div>
                <i class="ph ph-caret-right alc-card-seta"></i>
            </article>
        `;
    }

    // ── Controles de filtro, busca e agenda ─────────────────────────────────────
    window._aleFiltro = function (f) { S.filtro = f; desenhar(); };
    window._aleBusca = function (v) { S.busca = v || ''; desenhar(); };
    window._aleNav = function (dir) {
        if (S.modo === 'semana') S.semanaIni = somaDias(S.semanaIni, 7 * dir);
        else { const [y, m] = S.mesRef.split('-').map(Number); const d = new Date(y, m - 1 + dir, 1); S.mesRef = d.getFullYear() + '-' + pad(d.getMonth() + 1); }
        carregar();
    };
    window._aleModo = function () { S.modo = S.modo === 'semana' ? 'mes' : 'semana'; S.mesRef = (S.diaSel || S.semanaIni).slice(0, 7); carregar(); };
    window._aleHoje = function () { S.semanaIni = inicioSemana(hojeIso()); S.mesRef = hojeIso().slice(0, 7); S.diaSel = hojeIso(); carregar(); };
    window._aleDia = function (iso) { S.diaSel = S.diaSel === iso ? null : iso; desenhar(); };
    window._aleIrData = function (iso) {
        if (!iso) return;
        S.diaSel = iso; S.semanaIni = inicioSemana(iso); S.mesRef = iso.slice(0, 7);
        carregar();
    };

    // ── Modo celular (tela cheia dentro do sistema) ─────────────────────────────
    window._aleMenu = function () { document.body.classList.toggle('app-rail-open'); };
    function aplicarModoCelular() {
        const vEnt = document.getElementById('view-app-lideranca-entregas');
        const vRet = document.getElementById('view-app-lideranca-retiradas');
        const vCand = document.getElementById('view-app-lideranca-candidatos');
        const ativo = !!((vEnt && vEnt.classList.contains('active')) || (vRet && vRet.classList.contains('active')) || (vCand && vCand.classList.contains('active')));
        document.body.classList.toggle('app-mobile-on', ativo && window.innerWidth <= 768);
        if (!ativo) document.body.classList.remove('app-rail-open');
    }
    window.addEventListener('resize', aplicarModoCelular);
    document.addEventListener('DOMContentLoaded', function () {
        const v = document.getElementById('view-app-lideranca-entregas');
        if (v) new MutationObserver(aplicarModoCelular).observe(v, { attributes: true, attributeFilter: ['class'] });
        aplicarModoCelular();
    });
    document.addEventListener('click', function (e) {
        if (document.body.classList.contains('app-rail-open') && !e.target.closest('#app-sidebar') && !e.target.closest('.alc-icon-btn')) document.body.classList.remove('app-rail-open');
    });

    // ═══ Detalhe da entrega (tela cheia) ════════════════════════════════════════
    function overlay() {
        let o = document.getElementById('ale-overlay');
        if (!o) { o = document.createElement('div'); o.id = 'ale-overlay'; o.className = 'alc-overlay'; document.body.appendChild(o); }
        document.body.classList.add('alc-no-scroll');
        return o;
    }
    window._aleFechar = function () {
        const o = document.getElementById('ale-overlay');
        if (o) o.remove();
        document.body.classList.remove('alc-no-scroll');
        S.osAberta = null;
        S.unidadeAtiva = null;
        carregar();
    };

    window._aleAbrir = async function (osId, unidadeKeyOpcional) {
        const ov = overlay();
        ov.innerHTML = `<div class="alc-vazio"><i class="ph ph-spinner ph-spin"></i>Carregando checklist da entrega...</div>`;
        try {
            const r = await fetch(`/api/app/entregas/os/${osId}`, { headers: hdr(false) });
            const j = await r.json();
            if (!r.ok) { toast(j.error || 'Erro ao abrir OS.', true); window._aleFechar(); return; }
            S.osAberta = j;
            const unidades = j.unidades || [];
            if (unidadeKeyOpcional && unidades.some(u => u.unidade_key === unidadeKeyOpcional)) {
                S.unidadeAtiva = unidadeKeyOpcional;
            } else if (!S.unidadeAtiva || !unidades.some(u => u.unidade_key === S.unidadeAtiva)) {
                const primeiraAberta = unidades.find(u => u.status !== 'concluido');
                S.unidadeAtiva = primeiraAberta ? primeiraAberta.unidade_key : (unidades[0] ? unidades[0].unidade_key : null);
            }
            desenharDetalhe();
        } catch (e) {
            toast('Falha ao carregar OS: ' + e.message, true);
            window._aleFechar();
        }
    };

    window._aleTrocarUnidade = function (key) {
        S.unidadeAtiva = key;
        desenharDetalhe();
    };

    function desenharDetalhe() {
        const ov = document.getElementById('ale-overlay');
        if (!ov || !S.osAberta) return;
        const { os, unidades, sem_checklist, pode_reabrir } = S.osAberta;
        const u = unidades.find(x => x.unidade_key === S.unidadeAtiva) || unidades[0] || null;

        const abasHtml = unidades.length > 1 ? `
            <div class="alr-unidades-tabs">
                ${unidades.map(x => {
                    const ativa = u && x.unidade_key === u.unidade_key;
                    const concl = x.status === 'concluido';
                    const av = x.tem_avaria || x.itens.some(i => i.status === 'avaria');
                    const cls = ['alr-uni-tab', ativa ? 'ativa' : '', concl ? (av ? 'avaria' : 'ok') : ''].filter(Boolean).join(' ');
                    const ic = concl ? (av ? 'ph-thumbs-down' : 'ph-thumbs-up') : 'ph-toilet';
                    return `<button type="button" class="${cls}" onclick="window._aleTrocarUnidade('${esc(x.unidade_key)}')">
                        <i class="ph ${ic}"></i> ${esc(x.rotulo)}
                    </button>`;
                }).join('')}
            </div>
        ` : '';

        const boxRota = `
            <div class="alr-rota-destaque">
                <div class="alr-rota-icone"><i class="ph ph-truck"></i></div>
                <div class="alr-rota-info">
                    <div class="alr-rota-titulo">Acompanhe a saída / entrega de</div>
                    <div class="alr-rota-principal">
                        ${os.motorista ? `<strong>${esc(os.motorista)}</strong>` : '<span style="color:#94a3b8;">Motorista não vinculado no Resumo de Rota</span>'}
                        ${os.veiculo ? `<span class="alr-placa-tag"><i class="ph ph-car-profile"></i> ${esc(os.veiculo)}</span>` : ''}
                    </div>
                    ${(os.ajudante || os.ordem_rota || os.horario_rota) ? `
                        <div class="alr-rota-sub">
                            ${os.ajudante ? `<span>Ajudante: <strong>${esc(os.ajudante)}</strong></span>` : ''}
                            ${os.ordem_rota ? `<span>Parada: <strong>${esc(os.ordem_rota)}</strong></span>` : ''}
                            ${os.horario_rota ? `<span>Horário rota: <strong>${esc(os.horario_rota)}</strong></span>` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        if (!u) {
            ov.innerHTML = `
                <div class="alc-det-top">
                    <button type="button" class="alc-icon-btn" onclick="window._aleFechar()"><i class="ph ph-arrow-left"></i></button>
                    <div class="alc-det-tit">
                        <h2>OS #${esc(os.numero_os)} · ${esc(fmtCliente(os.cliente))}</h2>
                        <span>${fmtBR(os.data_iso)} · ${esc(os.tipo_servico)}</span>
                    </div>
                </div>
                <div class="alc-det-body">
                    ${boxRota}
                    <div class="alc-secao">
                        <h3><i class="ph ph-info"></i> Equipamentos desta OS</h3>
                        <p style="font-size:.9rem;color:#475569;margin:0;">Esta OS possui apenas itens sem checklist cadastrado (${esc((sem_checklist || []).map(s => s.qtd + 'x ' + s.descricao).join(', ') || 'nenhum item')}).</p>
                    </div>
                </div>
            `;
            return;
        }

        const bloqueado = u.status === 'concluido';
        const total = u.itens.length;
        const respondidos = u.itens.filter(i => i.status === 'ok' || i.status === 'avaria').length;
        const comFoto = u.itens.filter(i => !!i.foto).length;
        const avarias = u.itens.filter(i => i.status === 'avaria').length;
        const pct = total ? Math.round(( Math.min(respondidos, comFoto) / total) * 100) : 0;

        const assinaturaUnidade = u.conferido_por_nome ? `
            <div class="alr-conferido-banner ${u.tem_avaria ? 'avaria' : 'ok'}">
                ${u.conferido_por_foto
                    ? `<img src="${esc(u.conferido_por_foto)}" alt="" class="alr-lider-avatar grande" onerror="this.style.display='none'">`
                    : `<span class="alr-lider-iniciais grande">${esc((u.conferido_por_nome || 'L').slice(0, 2).toUpperCase())}</span>`}
                <div>
                    <strong>Conferido por ${esc(u.conferido_por_nome)}</strong>
                    <span>${esc(fmtDataHora(u.conferido_em))} · ${u.tem_avaria ? 'Concluído com avaria' : 'Equipamento OK'}</span>
                </div>
            </div>
        ` : '';

        const itensHtml = u.itens.map((it, idx) => {
            const st = it.status;
            const ehOk = st === 'ok';
            const ehAv = st === 'avaria';
            const temFoto = !!it.foto;
            const env = S.enviandoMidia === it.key;
            return `
                <div class="alr-item-card ${ehAv ? 'avaria' : ehOk ? 'ok' : ''}" id="ale-item-${esc(it.key)}">
                    <div class="alr-item-head">
                        <div class="alr-item-nome">
                            <span class="alr-item-num">${idx + 1}</span>
                            <strong>${esc(it.label)}</strong>
                            ${ehAv ? '<span class="alc-badge vermelho">AVARIA</span>' : ''}
                        </div>
                        <div class="alr-joinhas">
                            <button type="button" class="alr-joinha-btn ok ${ehOk ? 'ativo' : ''}" ${bloqueado ? 'disabled' : ''}
                                onclick="window._aleMarcar('${esc(it.key)}','ok')" title="Peça OK">
                                <i class="ph-fill ph-thumbs-up"></i><span>OK</span>
                            </button>
                            <button type="button" class="alr-joinha-btn avaria ${ehAv ? 'ativo' : ''}" ${bloqueado ? 'disabled' : ''}
                                onclick="window._aleMarcar('${esc(it.key)}','avaria')" title="Peça avariada">
                                <i class="ph-fill ph-thumbs-down"></i><span>Avaria</span>
                            </button>
                        </div>
                    </div>

                    <div class="alr-item-midia-row">
                        ${temFoto ? `
                            <div class="alr-foto-preview">
                                <img src="${esc(urlMidia(it.foto.url))}" alt="${esc(it.label)}" onclick="window._aleVerFoto('${esc(urlMidia(it.foto.url))}','${esc(it.label)}')">
                                ${!bloqueado ? `
                                    <label class="alr-trocar-foto">
                                        <i class="ph ph-camera-rotate"></i> Trocar foto
                                        <input type="file" accept="image/*" capture="environment" hidden onchange="window._aleFoto('${esc(it.key)}', this)">
                                    </label>
                                ` : `<span class="alr-foto-ok-tag"><i class="ph ph-check-circle"></i> Foto registrada</span>`}
                            </div>
                        ` : `
                            <label class="alr-btn-foto ${env ? 'enviando' : ''}">
                                <i class="ph ${env ? 'ph-spinner ph-spin' : 'ph-camera'}"></i>
                                <span>${env ? 'Enviando foto...' : 'Tirar foto obrigatória'}</span>
                                ${!bloqueado && !env ? `<input type="file" accept="image/*" capture="environment" hidden onchange="window._aleFoto('${esc(it.key)}', this)">` : ''}
                            </label>
                        `}

                        <input type="text" class="alr-obs-input ${ehAv && !String(it.obs || '').trim() ? 'obrigatoria' : ''}"
                            placeholder="${ehAv ? 'Descreva a avaria (obrigatório)...' : 'Observação da peça (opcional)...'}"
                            value="${esc(it.obs || '')}" ${bloqueado ? 'disabled' : ''}
                            onchange="window._aleObs('${esc(it.key)}', this.value)">
                    </div>
                </div>
            `;
        }).join('');

        const videosHtml = (u.videos || []).map(v => `
            <div class="alr-video-item">
                <video src="${esc(urlMidia(v.url))}" controls preload="metadata"></video>
                ${!bloqueado ? `<button type="button" class="alr-video-del" onclick="window._aleDelMidia(${v.id})"><i class="ph ph-trash"></i> Remover vídeo</button>` : ''}
            </div>
        `).join('');

        ov.innerHTML = `
            <div class="alc-det-top">
                <button type="button" class="alc-icon-btn" onclick="window._aleFechar()" aria-label="Voltar"><i class="ph ph-arrow-left"></i></button>
                <div class="alc-det-tit">
                    <h2>OS #${esc(os.numero_os)} · ${esc(fmtCliente(os.cliente))}</h2>
                    <span>${fmtBR(os.data_iso)} · ${esc(u.modelo_nome)} (${esc(u.rotulo)})</span>
                </div>
                <span class="alc-Save-ind" id="ale-save-ind"></span>
            </div>

            ${abasHtml}

            <div class="alc-det-body">
                ${boxRota}
                ${assinaturaUnidade}

                <div class="alc-secao">
                    <h3>
                        <span><i class="ph ph-list-checks"></i> Checklist · ${esc(u.rotulo)} (${esc(u.descricao_item)})</span>
                        <span>${respondidos}/${total} · 📷 ${comFoto}/${total}${avarias ? ` · ⚠️ ${avarias}` : ''}</span>
                    </h3>
                    <div class="alc-prog"><div class="alc-prog-fill" style="width:${pct}%"></div></div>
                    <p class="alr-regra-hint"><i class="ph ph-camera"></i> Cada item exige 👍 ou 👎 e <strong>1 foto obrigatória</strong>. Em caso de 👎, descreva a avaria.</p>
                    <div class="alr-itens-lista">${itensHtml}</div>
                </div>

                <div class="alc-secao">
                    <h3>
                        <span><i class="ph ph-video-camera"></i> Vídeo do equipamento (opcional)</span>
                        <span>${(u.videos || []).length} vídeo(s)</span>
                    </h3>
                    ${videosHtml}
                    ${!bloqueado ? `
                        <label class="alr-btn-video ${S.enviandoMidia === 'video' ? 'enviando' : ''}">
                            <i class="ph ${S.enviandoMidia === 'video' ? 'ph-spinner ph-spin' : 'ph-video-camera'}"></i>
                            <span>${S.enviandoMidia === 'video' ? 'Enviando vídeo para o R2...' : 'Gravar ou anexar vídeo (opcional · até 60 MB)'}</span>
                            ${S.enviandoMidia !== 'video' ? `<input type="file" accept="video/*" capture="environment" hidden onchange="window._aleVideo(this)">` : ''}
                        </label>
                    ` : ''}
                </div>
            </div>

            <div class="alc-det-foot">
                ${!bloqueado ? `
                    <button type="button" class="alc-cta" onclick="window._aleConcluir()">
                        <i class="ph ph-check-circle"></i> Concluir conferência (${esc(u.rotulo)})
                    </button>
                ` : (pode_reabrir ? `
                    <button type="button" class="alc-cta sec" onclick="window._aleReabrir()">
                        <i class="ph ph-lock-key-open"></i> Reabrir checklist (Admin)
                    </button>
                ` : `
                    <button type="button" class="alc-cta sec" disabled>
                        <i class="ph ph-check-circle"></i> Conferência concluída
                    </button>
                `)}
            </div>
        `;
    }

    // ═══ Ações de item: 👍/👎, observação, foto comprimida e vídeo no R2 ═══════
    function unidadeAtual() {
        if (!S.osAberta) return null;
        return (S.osAberta.unidades || []).find(x => x.unidade_key === S.unidadeAtiva) || null;
    }

    function indicarSalvando(txt) {
        const el = document.getElementById('ale-save-ind');
        if (el) el.textContent = txt || '';
    }

    window._aleMarcar = async function (itemKey, status) {
        const u = unidadeAtual();
        if (!u || u.status === 'concluido') return;
        const it = u.itens.find(x => x.key === itemKey);
        if (!it) return;
        it.status = status;
        u.tem_avaria = u.itens.some(x => x.status === 'avaria');
        desenharDetalhe();
        await salvarItemServidor(u, itemKey, it.status, it.obs);
    };

    window._aleObs = async function (itemKey, obs) {
        const u = unidadeAtual();
        if (!u || u.status === 'concluido') return;
        const it = u.itens.find(x => x.key === itemKey);
        if (!it) return;
        it.obs = obs || '';
        await salvarItemServidor(u, itemKey, it.status, it.obs);
    };

    async function salvarItemServidor(u, itemKey, status, obs) {
        try {
            indicarSalvando('Salvando...');
            const r = await fetch(`/api/app/entregas/os/${S.osAberta.os.id}/unidades/${encodeURIComponent(u.unidade_key)}/checklist`, {
                method: 'PUT',
                headers: hdr(true),
                body: JSON.stringify({ itens: { [itemKey]: { status, obs } } })
            });
            const j = await r.json();
            if (!r.ok) { toast(j.error || 'Erro ao salvar.', true); indicarSalvando(''); return; }
            indicarSalvando('✓ Salvo');
            setTimeout(() => indicarSalvando(''), 1400);
        } catch (e) {
            indicarSalvando('');
            toast('Falha ao salvar: ' + e.message, true);
        }
    }

    // Comprime imagem no cliente (máx 1600 px, JPEG 0.82) para upload rápido no 4G
    function comprimirImagem(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
            reader.onload = () => {
                const img = new Image();
                img.onerror = () => resolve({ base64: reader.result, mime: file.type || 'image/jpeg' });
                img.onload = () => {
                    const max = 1600;
                    let w = img.width, h = img.height;
                    if (w > max || h > max) {
                        if (w > h) { h = Math.round(h * (max / w)); w = max; }
                        else { w = Math.round(w * (max / h)); h = max; }
                    }
                    const cv = document.createElement('canvas');
                    cv.width = w; cv.height = h;
                    cv.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve({ base64: cv.toDataURL('image/jpeg', 0.82), mime: 'image/jpeg' });
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function lerArquivoBase64(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onerror = () => reject(new Error('Falha ao ler arquivo.'));
            r.onload = () => resolve(r.result);
            r.readAsDataURL(file);
        });
    }

    window._aleFoto = async function (itemKey, input) {
        const file = input && input.files && input.files[0];
        if (!file) return;
        const u = unidadeAtual();
        if (!u) return;
        S.enviandoMidia = itemKey;
        desenharDetalhe();
        try {
            const { base64, mime } = await comprimirImagem(file);
            const r = await fetch(`/api/app/entregas/os/${S.osAberta.os.id}/unidades/${encodeURIComponent(u.unidade_key)}/midia`, {
                method: 'POST',
                headers: hdr(true),
                body: JSON.stringify({ tipo: 'foto', item_key: itemKey, base64, mime, nome: file.name })
            });
            const j = await r.json();
            if (!r.ok) { toast(j.error || 'Erro ao enviar foto.', true); return; }
            const it = u.itens.find(x => x.key === itemKey);
            if (it) it.foto = j.midia;
            toast('Foto salva!');
        } catch (e) {
            toast('Erro no upload da foto: ' + e.message, true);
        } finally {
            S.enviandoMidia = null;
            desenharDetalhe();
        }
    };

    window._aleVideo = async function (input) {
        const file = input && input.files && input.files[0];
        if (!file) return;
        if (file.size > 60 * 1024 * 1024) {
            toast('O vídeo excede o limite de 60 MB.', true);
            return;
        }
        const u = unidadeAtual();
        if (!u) return;
        S.enviandoMidia = 'video';
        desenharDetalhe();
        try {
            const base64 = await lerArquivoBase64(file);
            const r = await fetch(`/api/app/entregas/os/${S.osAberta.os.id}/unidades/${encodeURIComponent(u.unidade_key)}/midia`, {
                method: 'POST',
                headers: hdr(true),
                body: JSON.stringify({ tipo: 'video', base64, mime: file.type || 'video/mp4', nome: file.name })
            });
            const j = await r.json();
            if (!r.ok) { toast(j.error || 'Erro ao enviar vídeo.', true); return; }
            if (!u.videos) u.videos = [];
            u.videos.push(j.midia);
            toast('Vídeo salvo no R2!');
        } catch (e) {
            toast('Erro no upload do vídeo: ' + e.message, true);
        } finally {
            S.enviandoMidia = null;
            desenharDetalhe();
        }
    };

    window._aleDelMidia = async function (id) {
        const u = unidadeAtual();
        if (!u) return;
        try {
            const r = await fetch(`/api/app/entregas/midia/${id}`, { method: 'DELETE', headers: hdr(false) });
            if (!r.ok) { const j = await r.json().catch(() => ({})); toast(j.error || 'Erro ao remover.', true); return; }
            u.videos = (u.videos || []).filter(v => v.id !== id);
            toast('Vídeo removido.');
            desenharDetalhe();
        } catch (e) {
            toast('Erro: ' + e.message, true);
        }
    };

    window._aleVerFoto = function (url, titulo) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ title: titulo || 'Foto', imageUrl: url, imageAlt: titulo || '', showConfirmButton: true, confirmButtonText: 'Fechar' });
        } else {
            window.open(url, '_blank');
        }
    };

    // ═══ Concluir / Reabrir conferência da unidade ═════════════════════════════
    window._aleConcluir = async function () {
        const u = unidadeAtual();
        if (!u || !S.osAberta) return;

        // Validação imediata no cliente com rolagem até o 1º item pendente
        for (const it of u.itens) {
            if (it.status !== 'ok' && it.status !== 'avaria') {
                toast(`Marque 👍 ou 👎 em "${it.label}".`, true);
                rolarParaItem(it.key);
                return;
            }
            if (!it.foto) {
                toast(`Tire a foto obrigatória de "${it.label}".`, true);
                rolarParaItem(it.key);
                return;
            }
            if (it.status === 'avaria' && !String(it.obs || '').trim()) {
                toast(`Descreva a avaria de "${it.label}".`, true);
                rolarParaItem(it.key);
                return;
            }
        }

        try {
            const r = await fetch(`/api/app/entregas/os/${S.osAberta.os.id}/unidades/${encodeURIComponent(u.unidade_key)}/concluir`, {
                method: 'POST',
                headers: hdr(true)
            });
            const j = await r.json();
            if (!r.ok) { toast(j.error || 'Não foi possível concluir.', true); return; }
            toast(`${u.rotulo} concluído com sucesso!`);
            // Recarrega a OS e avança automaticamente para a próxima unidade pendente (se houver)
            const prox = (S.osAberta.unidades || []).find(x => x.unidade_key !== u.unidade_key && x.status !== 'concluido');
            await window._aleAbrir(S.osAberta.os.id, prox ? prox.unidade_key : u.unidade_key);
        } catch (e) {
            toast('Erro ao concluir: ' + e.message, true);
        }
    };

    window._aleReabrir = async function () {
        const u = unidadeAtual();
        if (!u || !S.osAberta) return;
        try {
            const r = await fetch(`/api/app/entregas/os/${S.osAberta.os.id}/unidades/${encodeURIComponent(u.unidade_key)}/reabrir`, {
                method: 'POST',
                headers: hdr(true)
            });
            const j = await r.json();
            if (!r.ok) { toast(j.error || 'Erro ao reabrir.', true); return; }
            toast('Checklist reaberto para edição.');
            await window._aleAbrir(S.osAberta.os.id, u.unidade_key);
        } catch (e) {
            toast('Erro: ' + e.message, true);
        }
    };

    function rolarParaItem(key) {
        const el = document.getElementById('ale-item-' + key);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('alr-item-shake');
            setTimeout(() => el.classList.remove('alr-item-shake'), 1200);
        }
    }
})();
