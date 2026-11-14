/**
 * app_lideranca_entregas.js
 * APP › Liderança › Entregas  (uso OPERACIONAL — mobile-first, ícones, toques grandes)
 *
 * - Agenda (semana / mês) com as entregas do pipeline; filtros: Todos · Pendentes · OK · Com avaria
 * - Separado por turno: ☀️ Escala Diurna e 🌙 Escala Noturna (com foto + nome do líder responsável na escala e de quem realizou)
 * - Cada equipamento entregue (1 por unidade da OS) tem checklist por modelo: 👍 OK / 👎 avariado,
 *   observação, FOTO obrigatória por item e ÁUDIO opcional gravado ao vivo pelo microfone (arquivos no Cloudflare R2)
 * - Mostra motorista + veículo da rota do dia (Resumo de Rota) e o líder que conferiu (foto + nome do colaborador)
 *
 * Endpoints: /api/app/entregas/*   |   Permissão: página 'app-lideranca-entregas'
 */
(function () {
    'use strict';

    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const ICONES_ITEM = [
        [/porta/, 'ph-door'], [/fechadura/, 'ph-lock-key'], [/chave/, 'ph-key'], [/teto/, 'ph-house-line'], [/piso/, 'ph-grid-four'],
        [/telas?/, 'ph-grid-nine'], [/assento|vaso/, 'ph-toilet'], [/placa|adesivo/, 'ph-sticker'], [/torneira|pia|lavatorio|cuba|tampinha|parte_de/, 'ph-drop'],
        [/dispenser/, 'ph-hand-soap'], [/ralo|encanamento|tubo/, 'ph-circle-dashed'], [/chicote/, 'ph-plugs'], [/bomba/, 'ph-gauge'],
        [/vidro|janela/, 'ph-app-window'], [/interruptor/, 'ph-toggle-right'], [/soquete/, 'ph-plug'], [/balcao/, 'ph-table'], [/pintura/, 'ph-paint-roller'],
        [/reservatorio|caixa/, 'ph-package'], [/barra/, 'ph-wheelchair'], [/cabo|dobradica|laterais?/, 'ph-wrench']
    ];
    const iconeItem = id => { for (const [re, ic] of ICONES_ITEM) if (re.test(id)) return ic; return 'ph-check-square'; };

    const S = {
        busca: '', dados: null, diaSel: null, modo: 'semana', semanaIni: null, mesRef: null,
        filtro: 'todos', turnoSel: 'todos',
        det: null, ui: 0, estado: {}, mid: {}, aud: null, vid: null, local: {}, subindo: {},
        rec: null, recTimer: null, recSeg: 0, _cancelaRec: false,
        saveTimer: null, saveEstado: 'ok', carregando: false
    };

    // ── Utilidades ───────────────────────────────────────────────────────────────
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const pad = n => String(n).padStart(2, '0');
    const isoDe = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const hojeIso = () => isoDe(new Date());
    const dataDe = iso => new Date(iso + 'T12:00:00');
    const fmtCurta = iso => { const d = dataDe(iso); return DIAS[d.getDay()] + ', ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1); };
    const fmtBr = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
    const fmtDataHora = s => { if (!s) return ''; const d = new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') || String(s).includes('T') ? '' : 'Z')); return isNaN(d) ? String(s) : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); };
    const getToken = () => window.currentToken || (typeof currentToken !== 'undefined' ? currentToken : '') || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    const apiBase = () => (typeof API_URL !== 'undefined' ? API_URL : '/api');
    const ehAdmin = () => {
        try {
            const u = window.currentUser || JSON.parse(localStorage.getItem('erp_user') || '{}');
            return u.role === 'Diretoria' || u.role === 'Administrador' || u.departamento === 'Diretoria' || String(u.grupo_nome || '').toLowerCase() === 'diretoria';
        } catch (e) { return false; }
    };
    const inicioSemana = iso => { const d = dataDe(iso); d.setDate(d.getDate() - d.getDay()); return isoDe(d); };
    const somaDias = (iso, n) => { const d = dataDe(iso); d.setDate(d.getDate() + n); return isoDe(d); };

    async function api(path, opts) {
        opts = opts || {};
        const headers = Object.assign({ Authorization: 'Bearer ' + getToken() }, opts.headers || {});
        if (opts.body && !(opts.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
        const r = await fetch(apiBase() + path, Object.assign({}, opts, { headers }));
        let b = null;
        try { b = await r.json(); } catch (e) { /* sem JSON */ }
        if (!r.ok) throw new Error((b && b.error) || ('Erro HTTP ' + r.status));
        return b;
    }
    const erro = (titulo, msg) => Swal.fire({ icon: 'error', title: titulo, text: msg, confirmButtonColor: '#556b2f', confirmButtonText: 'OK' });
    const midiaUrl = id => apiBase() + '/app/entregas/midia/' + id + '?token=' + encodeURIComponent(getToken());
    const fotoColab = id => apiBase() + '/colaboradores/foto/' + id;

    // Nome do cliente sem emojis da planilha + ícone do Grupo de Clientes (regra interna do sistema)
    const limparCliente = s => String(s || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
    function nomeCliente(s) {
        const n = limparCliente(s);
        try { if (typeof window.formatarNomeClienteComIcone === 'function') return window.formatarNomeClienteComIcone(n); } catch (e) { /* usa o nome simples */ }
        return n;
    }

    function avatarPessoa(nome, colabId, fotoPath, cls) {
        const ini = esc((String(nome || '?').trim()[0] || '?').toUpperCase());
        const src = fotoPath ? (String(fotoPath).startsWith('/api') || String(fotoPath).startsWith('http') ? fotoPath : apiBase() + fotoPath) : (colabId ? fotoColab(colabId) : '');
        const fb = oculto => `<span class="alr-av-fb" style="${oculto ? 'display:none;' : ''}">${ini}</span>`;
        if (!src) return `<span class="alr-av ${cls || ''}">${fb(false)}</span>`;
        return `<span class="alr-av ${cls || ''}"><img src="${esc(src)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">${fb(true)}</span>`;
    }

    function renderAvatarMini(pessoa, size) {
        const sz = size || 22;
        const nome = (pessoa && (pessoa.nome_curto || pessoa.nome)) || 'Líder';
        const ini = esc((String(nome).trim()[0] || '?').toUpperCase());
        const url = (pessoa && pessoa.foto_url) || (pessoa && pessoa.colab_id ? fotoColab(pessoa.colab_id) : '');
        const bg = '#556b2f';
        if (!url) {
            return `<span class="arr-mini-av" style="width:${sz}px;height:${sz}px;font-size:${Math.max(9, Math.round(sz * 0.44))}px;background:${bg};" title="${esc(nome)}">${ini}</span>`;
        }
        return `<span class="arr-mini-av" style="width:${sz}px;height:${sz}px;font-size:${Math.max(9, Math.round(sz * 0.44))}px;background:${bg};" title="${esc(nome)}">` +
            `<img src="${esc(url)}" alt="${esc(nome)}" loading="lazy" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='inline-flex';">` +
            `<span class="arr-mini-av-fb" style="display:none;">${ini}</span>` +
        `</span>`;
    }

    function renderPessoasChips(lista, fallbackTexto, size) {
        const arr = Array.isArray(lista) ? lista.filter(Boolean) : [];
        if (!arr.length) return `<span class="arr-lider-empty">${esc(fallbackTexto || 'Não definido')}</span>`;
        return `<span class="arr-lider-chips">` + arr.map(p => {
            const nome = p.nome_curto || p.nome || 'Líder';
            return `<span class="arr-lider-chip">${renderAvatarMini(p, size || 22)}<b>${esc(nome)}</b></span>`;
        }).join('') + `</span>`;
    }

    // ── Tela principal ───────────────────────────────────────────────────────────
    window.renderAppLiderancaEntregas = async function () {
        const c = document.getElementById('app-lideranca-entregas-container');
        if (!c) return;
        if (!S.semanaIni) { S.semanaIni = inicioSemana(hojeIso()); S.mesRef = hojeIso().slice(0, 7); S.diaSel = hojeIso(); }
        c.innerHTML = `<div class="alc-wrap" id="ale-wrap"><div class="alc-loading"><i class="ph ph-spinner ph-spin"></i> Carregando entregas...</div></div>`;
        await carregar();
    };
    window._aleRecarregar = () => window.renderAppLiderancaEntregas();

    function faixa() {
        if (S.modo === 'semana') return { de: somaDias(S.semanaIni, -7), ate: somaDias(S.semanaIni, 13) };
        const [y, m] = S.mesRef.split('-').map(Number);
        return { de: somaDias(y + '-' + pad(m) + '-01', -7), ate: somaDias(y + '-' + pad(m) + '-' + pad(new Date(y, m, 0).getDate()), 7) };
    }
    async function carregar() {
        if (S.carregando) return;
        S.carregando = true;
        try {
            const f = faixa();
            S.dados = await api('/app/entregas?de=' + f.de + '&ate=' + f.ate + (S.busca ? '&q=' + encodeURIComponent(S.busca) : ''));
            desenhar();
        } catch (e) {
            const w = document.getElementById('ale-wrap');
            if (w) w.innerHTML = `<div class="alc-erro"><i class="ph ph-warning-circle"></i><div>${esc(e.message)}</div><button class="alc-btn alc-btn-primary" onclick="window._aleRecarregar()"><i class="ph ph-arrow-clockwise"></i> Tentar de novo</button></div>`;
        } finally { S.carregando = false; }
    }

    const itensDoDia = iso => (S.dados.itens || []).filter(i => i.data_entrega === iso);

    function contagens() {
        const m = {};
        (S.dados.itens || []).forEach(i => {
            if (S.turnoSel !== 'todos' && (i.turno_escala || 'diurno') !== S.turnoSel) return;
            const o = m[i.data_entrega] = m[i.data_entrega] || { total: 0, pend: 0, avaria: 0 };
            o.total++; if (i.pendente) o.pend++; if (i.tem_avaria) o.avaria++;
        });
        return m;
    }

    function basePorTurno(lista) {
        if (S.turnoSel === 'diurno') return lista.filter(i => (i.turno_escala || 'diurno') !== 'noturno');
        if (S.turnoSel === 'noturno') return lista.filter(i => i.turno_escala === 'noturno');
        return lista;
    }

    function listaFiltrada() {
        const q = String(S.busca || '').trim().toLowerCase();
        const casa = i => String(i.numero_os || '').toLowerCase().includes(q) || String(i.cliente || '').toLowerCase().includes(q);
        const todosBase = q ? (S.dados.itens || []).filter(casa) : (S.diaSel ? itensDoDia(S.diaSel) : (S.dados.itens || []));
        const todos = basePorTurno(todosBase);
        const pendGlobais = basePorTurno((S.dados.itens || []).filter(i => i.pendente && (!q || casa(i))));
        if (S.filtro === 'ok') return todos.filter(i => i.situacao === 'ok');
        if (S.filtro === 'avaria') return todos.filter(i => i.tem_avaria);
        if (S.filtro === 'pendentes') return pendGlobais.slice().sort((a, b) => (a.data_entrega + a.cliente).localeCompare(b.data_entrega + b.cliente));
        return todos;
    }
    function contadoresFiltro() {
        const q = String(S.busca || '').trim().toLowerCase();
        const casa = i => String(i.numero_os || '').toLowerCase().includes(q) || String(i.cliente || '').toLowerCase().includes(q);
        const todos = basePorTurno(q ? (S.dados.itens || []).filter(casa) : (S.diaSel ? itensDoDia(S.diaSel) : (S.dados.itens || [])));
        const pendentes = basePorTurno((S.dados.itens || []).filter(i => i.pendente && (!q || casa(i))));
        return {
            todos: todos.length,
            pendentes: pendentes.length,
            ok: todos.filter(i => i.situacao === 'ok').length,
            avaria: todos.filter(i => i.tem_avaria).length
        };
    }

    function desenhar() {
        const w = document.getElementById('ale-wrap');
        if (!w || !S.dados) return;
        w.innerHTML = `
        <header class="alc-head">
            <button class="alc-icon-btn alc-only-mobile" onclick="window._aleMenu()" aria-label="Menu do sistema"><i class="ph ph-list"></i></button>
            <div class="alc-head-title"><i class="ph ph-truck" style="color:#556b2f"></i><div><h2>Entregas</h2><span>Liderança · Checklist dos equipamentos</span></div></div>
            <button class="alc-icon-btn" onclick="window._aleRecarregar()" title="Atualizar" aria-label="Atualizar"><i class="ph ph-arrow-clockwise"></i></button>
        </header>
        ${htmlAgenda()}
        ${htmlEscalaTurnos()}
        <div class="alr-busca"><i class="ph ph-magnifying-glass"></i><input id="ale-busca" type="search" inputmode="search" autocomplete="off" placeholder="Pesquisar nº da OS ou cliente" value="${esc(S.busca)}" oninput="window._aleBusca(this.value)" onfocus="window._aleBuscaFoco=true" onblur="window._aleBuscaFoco=false">${S.busca ? '<button type="button" class="alr-busca-x" onclick="window._aleBusca(\'\')" aria-label="Limpar pesquisa"><i class="ph ph-x-circle"></i></button>' : ''}</div>
        <div id="ale-filtros">${htmlFiltros()}</div>
        <div id="ale-lista">${htmlLista()}</div>`;
        const bi = document.getElementById('ale-busca');
        if (bi && window._aleBuscaFoco) { bi.focus(); try { bi.setSelectionRange(bi.value.length, bi.value.length); } catch (x) { /* ignora */ } }
    }

    // ── Cards de Escala Diurna e Escala Noturna (igual ao Resumo da Rota) ────────
    function htmlEscalaTurnos() {
        const diaRef = S.diaSel || (S.dados && S.dados.hoje) || hojeIso();
        const escMap = (S.dados && S.dados.escala_por_dia) || {};
        const escDia = escMap[diaRef] || (S.dados && S.dados.escala_hoje) || {};
        const dEsc = escDia.diurno || { nomes: 'Eduardo Assis / Vivian Regina', escalados: [], folga: [] };
        const nEsc = escDia.noturno || { nomes: 'Vitor Leandro / Ana Paula', escalados: [], folga: [] };

        const baseLista = S.diaSel ? itensDoDia(S.diaSel) : (S.dados.itens || []);
        const itensD = baseLista.filter(i => (i.turno_escala || 'diurno') !== 'noturno' && i.situacao !== 'sem_checklist');
        const itensN = baseLista.filter(i => i.turno_escala === 'noturno' && i.situacao !== 'sem_checklist');

        const conclD = itensD.filter(i => i.situacao === 'ok' || i.situacao === 'avaria').length;
        const conclN = itensN.filter(i => i.situacao === 'ok' || i.situacao === 'avaria').length;

        const colRealizadores = lista => {
            const m = new Map();
            lista.forEach(os => {
                (os.realizado_por || []).forEach(r => {
                    const k = String(r.nome || '').toLowerCase();
                    if (k && !m.has(k)) m.set(k, r);
                });
            });
            return [...m.values()];
        };
        const realD = colRealizadores(itensD);
        const realN = colRealizadores(itensN);

        const renderFolgaOuFerias = listaFolga => {
            const arr = Array.isArray(listaFolga) ? listaFolga : [];
            if (!arr.length) return '';
            const ferias = arr.filter(f => f.em_ferias);
            const folgas = arr.filter(f => !f.em_ferias);
            const partes = [];
            if (ferias.length) partes.push(`🏖️ Férias: ${ferias.map(f => esc(f.nome_curto || f.nome)).join(' / ')}`);
            if (folgas.length) partes.push(`Folga no dia: ${folgas.map(f => esc(f.nome_curto || f.nome)).join(' / ')}`);
            return `<div class="arr-escala-folga">${partes.join(' · ')}</div>`;
        };

        const renderRealizado = (realList, totalTurno, conclTurno) => {
            if (realList.length) {
                return `<div class="arr-escala-real ok"><i class="ph-fill ph-check-circle"></i> <span class="arr-real-lbl">Realizado por:</span> ${renderPessoasChips(realList, '', 20)}</div>`;
            }
            if (totalTurno > 0) {
                return `<div class="arr-escala-real pend"><i class="ph-fill ph-clock"></i> Ainda não realizado neste turno (${conclTurno}/${totalTurno})</div>`;
            }
            return `<div class="arr-escala-real vazio"><i class="ph ph-minus-circle"></i> Sem entregas neste turno</div>`;
        };

        const dAtivo = S.turnoSel === 'diurno';
        const nAtivo = S.turnoSel === 'noturno';

        return `<div class="arr-escala-grid" style="margin-bottom:10px;">
            <div class="arr-escala-card diurno ${dAtivo ? 'ativo' : ''}" onclick="window._aleTurno('diurno')" role="button" tabindex="0" title="Toque para filtrar entregas diurnas">
                <div class="arr-escala-top">
                    <span class="arr-escala-tag diurno">☀️ Escala Diurna</span>
                    <span class="arr-escala-prog ${itensD.length && conclD === itensD.length ? 'ok' : ''}">${conclD}/${itensD.length}</span>
                </div>
                <div class="arr-escala-resp"><span class="arr-resp-lbl">Responsável (Escala):</span> ${renderPessoasChips(dEsc.escalados, dEsc.nomes, 24)}</div>
                ${renderFolgaOuFerias(dEsc.folga)}
                ${renderRealizado(realD, itensD.length, conclD)}
            </div>
            <div class="arr-escala-card noturno ${nAtivo ? 'ativo' : ''}" onclick="window._aleTurno('noturno')" role="button" tabindex="0" title="Toque para filtrar entregas noturnas">
                <div class="arr-escala-top">
                    <span class="arr-escala-tag noturno">🌙 Escala Noturna</span>
                    <span class="arr-escala-prog ${itensN.length && conclN === itensN.length ? 'ok' : ''}">${conclN}/${itensN.length}</span>
                </div>
                <div class="arr-escala-resp"><span class="arr-resp-lbl">Responsável (Escala):</span> ${renderPessoasChips(nEsc.escalados, nEsc.nomes, 24)}</div>
                ${renderFolgaOuFerias(nEsc.folga)}
                ${renderRealizado(realN, itensN.length, conclN)}
            </div>
        </div>
        ${S.turnoSel !== 'todos' ? `<button class="alc-filtro" style="margin-bottom:10px;" onclick="window._aleTurno('todos')"><i class="ph ph-funnel-x"></i> Filtrando apenas turno ${S.turnoSel === 'noturno' ? '🌙 Noturno' : '☀️ Diurno'} — toque para ver Dia e Noite</button>` : ''}`;
    }

    window._aleTurno = function (t) {
        S.turnoSel = (S.turnoSel === t) ? 'todos' : t;
        desenhar();
    };

    function htmlFiltros() {
        const c = contadoresFiltro();
        const chip = (id, icone, rot, n, cor) => `<button class="alc-chip alr-chip ${S.filtro === id ? 'on' : ''}" style="${S.filtro === id ? '' : 'color:' + cor + ';'}" onclick="window._aleFiltro('${id}')"><i class="ph ${icone}"></i> ${rot} <b class="alr-n" style="background:${cor};">${n}</b></button>`;
        return `<div class="alr-filtros">${chip('todos', 'ph-list-bullets', 'Todos', c.todos, '#475569')}${chip('pendentes', 'ph-warning-circle', 'Pendentes', c.pendentes, '#ea580c')}${chip('ok', 'ph-thumbs-up', 'OK', c.ok, '#16a34a')}${chip('avaria', 'ph-thumbs-down', 'Com avaria', c.avaria, '#dc2626')}</div>`;
    }
    let _buscaTimer = null;
    window._aleBusca = function (v) {
        S.busca = String(v || '').trim();
        window._aleBuscaFoco = true;
        clearTimeout(_buscaTimer);
        _buscaTimer = setTimeout(() => { S.carregando = false; carregar(); }, 350);
    };
    window._aleFiltro = function (f) { S.filtro = f; document.getElementById('ale-filtros').innerHTML = htmlFiltros(); document.getElementById('ale-lista').innerHTML = htmlLista(); };

    function htmlAgenda() {
        const cont = contagens(), hoje = hojeIso();
        let corpo = '', titulo = '';
        if (S.modo === 'semana') {
            const ini = dataDe(S.semanaIni), fim = dataDe(somaDias(S.semanaIni, 6));
            titulo = `${pad(ini.getDate())}/${pad(ini.getMonth() + 1)} – ${pad(fim.getDate())}/${pad(fim.getMonth() + 1)}`;
            let dias = ''; for (let k = 0; k < 7; k++) dias += celulaDia(somaDias(S.semanaIni, k), cont, hoje, false);
            corpo = `<div class="alc-semana">${dias}</div>`;
        } else {
            const [y, m] = S.mesRef.split('-').map(Number);
            titulo = MESES[m - 1] + ' ' + y;
            const primeiro = new Date(y, m - 1, 1), ultimoDia = new Date(y, m, 0).getDate();
            let cel = DIAS.map(d => `<div class="alc-mes-dow">${d[0]}</div>`).join('');
            for (let i = 0; i < primeiro.getDay(); i++) cel += '<div></div>';
            for (let dd = 1; dd <= ultimoDia; dd++) cel += celulaDia(y + '-' + pad(m) + '-' + pad(dd), cont, hoje, true);
            corpo = `<div class="alc-mes">${cel}</div>`;
        }
        return `<section class="alc-agenda">
            <div class="alc-agenda-top">
                <button class="alc-icon-btn sm" onclick="window._aleNav(-1)" aria-label="Anterior"><i class="ph ph-caret-left"></i></button>
                <div class="alc-agenda-titulo"><i class="ph ph-calendar-dots"></i> ${esc(titulo)}</div>
                <button class="alc-icon-btn sm" onclick="window._aleNav(1)" aria-label="Próximo"><i class="ph ph-caret-right"></i></button>
                <button class="alc-chip ${S.modo === 'mes' ? 'on' : ''}" onclick="window._aleModo()"><i class="ph ph-calendar-blank"></i> ${S.modo === 'mes' ? 'Semana' : 'Mês'}</button>
                <button class="alc-chip" onclick="window._aleHoje()"><i class="ph ph-sun"></i> Hoje</button>
            </div>
            ${corpo}
            <div class="alr-datapick"><i class="ph ph-calendar-check"></i><label>Ir para a data</label><input type="date" value="${S.diaSel || ''}" onchange="window._aleIrData(this.value)"></div>
            ${S.diaSel ? `<button class="alc-filtro" onclick="window._aleDia('${S.diaSel}')"><i class="ph ph-funnel-x"></i> Mostrando ${esc(fmtCurta(S.diaSel))} — toque para ver todas</button>` : ''}
        </section>`;
    }
    function celulaDia(iso, cont, hoje, mes) {
        const c = cont[iso], d = dataDe(iso);
        const cls = ['alc-dia', iso === hoje ? 'hoje' : '', iso === S.diaSel ? 'sel' : '', c ? 'tem' : '', c && c.pend ? 'pend' : ''].join(' ');
        const badge = c ? `<span class="alc-dia-badge ${c.pend ? 'red' : ''}">${c.total}</span>` : '';
        return `<button class="${cls}" onclick="window._aleDia('${iso}')" aria-label="${esc(fmtCurta(iso))}">${mes ? '' : `<span class="alc-dia-dow">${DIAS[d.getDay()]}</span>`}<span class="alc-dia-num">${d.getDate()}</span>${badge}</button>`;
    }

    function renderizarGruposInternos(itens, ini, ja) {
        const grupos = [
            { t: 'Pendentes — conferir', ic: 'ph-warning-circle', cor: '#dc2626', f: i => i.pendente },
            { t: 'Com avaria', ic: 'ph-thumbs-down', cor: '#b91c1c', f: i => !i.pendente && i.tem_avaria },
            { t: 'OK', ic: 'ph-thumbs-up', cor: '#16a34a', f: i => !i.pendente && !i.tem_avaria && i.situacao === 'ok' },
            { t: 'Agendadas', ic: 'ph-calendar-check', cor: '#2563eb', f: i => !i.pendente && !i.tem_avaria && i.situacao !== 'ok' && i.futura && i.situacao !== 'sem_checklist' },
            { t: 'Sem checklist (produto sem modelo)', ic: 'ph-prohibit', cor: '#94a3b8', f: i => !i.pendente && i.situacao === 'sem_checklist' },
            { t: 'Não feito (antes de ' + ini + ')', ic: 'ph-clock-counter-clockwise', cor: '#64748b', f: i => !i.pendente && !i.tem_avaria && !i.futura && (i.situacao === 'pendente' || i.situacao === 'andamento') }
        ];
        return grupos.map(g => {
            const l = itens.filter(i => !ja.has(i.os_id) && g.f(i));
            if (!l.length) return '';
            return `<section class="alc-grupo"><h3 style="color:${g.cor};"><i class="ph ${g.ic}"></i> ${esc(g.t)} <span class="alc-contador" style="background:${g.cor};">${l.length}</span></h3>${l.map(cardHtml).join('')}</section>`;
        }).join('');
    }

    function htmlLista() {
        const itens = listaFiltrada();
        const extras = (S.diaSel && (S.filtro === 'todos'))
            ? basePorTurno((S.dados.itens || []).filter(i => i.pendente && i.data_entrega !== S.diaSel))
            : [];
        if (!itens.length && !extras.length) {
            const msg = S.filtro === 'ok' ? 'Nenhuma entrega OK.' : (S.filtro === 'avaria' ? 'Nenhum equipamento com avaria.' : (S.filtro === 'pendentes' ? 'Nenhuma entrega pendente. 🎉' : (S.diaSel ? 'Nenhuma entrega neste dia/turno.' : 'Nenhuma entrega no período.')));
            return `<div class="alc-vazio"><i class="ph ph-package"></i><div>${msg}</div></div>`;
        }
        const ini = fmtBr(S.dados.inicio_controle);
        let html = '';
        if (extras.length) {
            const extrasD = extras.filter(i => (i.turno_escala || 'diurno') !== 'noturno');
            const extrasN = extras.filter(i => i.turno_escala === 'noturno');
            if (extrasD.length) {
                html += `<section class="alc-grupo"><h3 style="color:#dc2626;"><i class="ph ph-warning-circle"></i> ☀️ Pendentes Diurnas de outros dias <span class="alc-contador" style="background:#dc2626;">${extrasD.length}</span></h3>${extrasD.map(cardHtml).join('')}</section>`;
            }
            if (extrasN.length) {
                html += `<section class="alc-grupo"><h3 style="color:#dc2626;"><i class="ph ph-warning-circle"></i> 🌙 Pendentes Noturnas de outros dias <span class="alc-contador" style="background:#dc2626;">${extrasN.length}</span></h3>${extrasN.map(cardHtml).join('')}</section>`;
            }
        }
        const ja = new Set(extras.map(i => i.os_id));

        if (S.turnoSel === 'todos') {
            const itensD = itens.filter(i => (i.turno_escala || 'diurno') !== 'noturno');
            const itensN = itens.filter(i => i.turno_escala === 'noturno');
            if (itensD.length) {
                html += `<div class="alr-turno-divisor diurno"><span>☀️ Entregas Diurnas (${itensD.length})</span></div>`;
                html += renderizarGruposInternos(itensD, ini, ja);
            }
            if (itensN.length) {
                html += `<div class="alr-turno-divisor noturno"><span>🌙 Entregas Noturnas (${itensN.length})</span></div>`;
                html += renderizarGruposInternos(itensN, ini, ja);
            }
        } else {
            html += renderizarGruposInternos(itens, ini, ja);
        }
        return html;
    }

    function badgeSituacao(i) {
        if (i.situacao === 'avaria') return '<span class="alc-badge vermelho"><i class="ph ph-warning-octagon"></i> AVARIA</span>';
        if (i.situacao === 'ok') return '<span class="alc-badge verde"><i class="ph ph-thumbs-up"></i> OK</span>';
        if (i.situacao === 'sem_checklist') return '<span class="alc-badge cinza"><i class="ph ph-prohibit"></i> Sem checklist</span>';
        const av = i.tem_avaria ? '<span class="alc-badge vermelho"><i class="ph ph-warning-octagon"></i> AVARIA</span>' : '';
        if (i.pendente) return '<span class="alc-badge vermelho"><i class="ph ph-warning-circle"></i> Pendente</span>' + av;
        if (i.situacao === 'andamento') return '<span class="alc-badge laranja"><i class="ph ph-list-checks"></i> Em andamento</span>' + av;
        if (i.futura) return '<span class="alc-badge azul"><i class="ph ph-calendar-check"></i> Agendada</span>';
        return '<span class="alc-badge cinza"><i class="ph ph-clock-counter-clockwise"></i> Não feito</span>';
    }
    const iconeStatusUnidade = u => u.status === 'avaria' ? '<i class="ph-fill ph-thumbs-down" style="color:#dc2626"></i>' : (u.status === 'ok' ? '<i class="ph-fill ph-thumbs-up" style="color:#16a34a"></i>' : (u.status === 'andamento' ? '<i class="ph ph-hourglass-medium" style="color:#ea580c"></i>' : '<i class="ph ph-circle-dashed" style="color:#94a3b8"></i>'));

    function barraLiderCard(i) {
        const real = Array.isArray(i.realizado_por) ? i.realizado_por : [];
        if (!real.length) return '';
        return `<div class="arr-vlider-bar" style="border-radius:8px;margin:6px 0;border:1px solid #e2e8f0;">
            <span class="arr-vlider-real ok"><i class="ph-fill ph-check-circle"></i> Realizado por: ${renderPessoasChips(real, '', 20)}</span>
        </div>`;
    }

    function emojiEquipamento(u, tipoServico) {
        if (u && u.icone_emoji) return u.icone_emoji;
        const txt = String((u && (u.rotulo || u.descricao || u.modelo)) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        const ts = String(tipoServico || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        const ehEvento = /\bEVENTO\b/.test(txt) || (!/\bOBRA\b/.test(txt) && ts.includes('EVENTO'));
        const mod = (u && u.modelo) || '';
        if (mod === 'guarita_dupla' || (txt.includes('GUARITA') && txt.includes('DUPLA'))) return '⚪';
        if (mod === 'guarita' || txt.includes('GUARITA')) return '⬜';
        if (mod === 'chuveiro' || txt.includes('CHUVEIRO')) return '🚿';
        if (mod === 'hidraulico' || txt.includes('HIDRAULIC')) return '🚽';
        if (mod === 'mictorio' || txt.includes('MICTORIO') || txt.includes('KROS')) return '💦';
        if (mod === 'pia' || txt.includes('PBII') || txt.includes('PBIII') || txt.includes('PIA') || txt.includes('LAVATORIO')) return '🧼';
        if (mod === 'pne' || txt.includes('PCD') || txt.includes('PNE')) return ehEvento ? '🧑🏾‍🦽' : '♿';
        if (mod === 'elx' || txt.includes('ELX') || txt.includes('EXTRA LUXO') || txt.includes('SUPER LUXO')) return ehEvento ? '🟣' : '🔵';
        if (mod === 'luxo' || txt.includes('LUXO') || /\bLX\b/.test(txt)) return ehEvento ? '🟪' : '🟦';
        if (mod === 'std' || txt.includes('STD') || txt.includes('STANDARD') || txt.includes('PADRAO')) return ehEvento ? '💜' : '💙';
        return '📦';
    }
    function rotuloUnidadeComEmoji(u, tipoServico) {
        let rot = String((u && u.rotulo) || '').trim();
        if (/\bGuarita\s+(Obra|Evento)\b/i.test(rot) && !/Individual|Dupla/i.test(rot)) {
            rot = rot.replace(/\bGuarita\s+(Obra|Evento)\b/i, 'Guarita Individual $1');
        }
        const em = emojiEquipamento(u, tipoServico);
        if (!em || (rot && rot.startsWith(em))) return rot;
        return em + ' ' + rot;
    }

    function classeCorCard(i) {
        if (i.situacao === 'ok' || i.situacao === 'avaria') return 'card-verde';
        const algumaIniciada = Array.isArray(i.unidades) && i.unidades.some(u => u.concluido || (u.itens_feitos && u.itens_feitos > 0) || u.status === 'andamento');
        if (i.situacao === 'andamento' || algumaIniciada) return 'card-amarelo';
        if (i.atrasada || i.pendente) return 'card-vermelho';
        return '';
    }
    function classeCorUnid(u, i) {
        if (u.concluido || u.status === 'ok' || u.status === 'avaria') return 'unid-verde';
        if (u.status === 'andamento' || (u.itens_feitos && u.itens_feitos > 0)) return 'unid-amarelo';
        if (i && (i.atrasada || i.pendente)) return 'unid-vermelho';
        return '';
    }

    function cardHtml(i) {
        const ehNot = i.turno_escala === 'noturno';
        const badgeTurno = `<span class="alc-badge" style="${ehNot ? 'background:#ede9fe;color:#5b21b6;' : 'background:#fef9c3;color:#854d0e;'}">${ehNot ? '🌙 Noturno' : '☀️ Diurno'}</span>`;
        const rota = i.rota
            ? `<div class="alr-rota">${avatarPessoa(i.rota.motorista, null, i.rota.motorista_foto, 'xs')}<span><i class="ph ph-truck"></i> ${esc(i.rota.veiculo || '—')} · <i class="ph ph-steering-wheel"></i> ${esc(i.rota.motorista || '—')}</span></div>`
            : `<div class="alr-rota vazio"><i class="ph ph-truck"></i> Rota ainda não definida</div>`;
        const unid = i.unidades.map(u => `<div class="alr-unid ${classeCorUnid(u, i)}"><span class="alr-unid-st">${iconeStatusUnidade(u)}</span><span class="alr-unid-nome">${esc(rotuloUnidadeComEmoji(u, i.tipo_servico))}</span>${u.concluido ? `<span class="alr-unid-lider">${avatarPessoa(u.lider_nome, u.lider_colab_id, u.lider_foto_url, 'xs')}<small>${esc(u.lider_nome || '')}</small></span>` : (u.itens_feitos ? `<small class="alr-unid-prog">${u.itens_feitos}/${u.itens_total}</small>` : '')}</div>`).join('');
        const corCard = classeCorCard(i);
        return `<button class="alc-card alr-card ${corCard} ${i.pendente ? 'pend' : ''} ${i.tem_avaria ? 'avaria' : ''}" onclick="window._aleAbrir(${i.os_id})">
            <div class="alc-card-corpo">
                <div class="alr-card-topo"><div class="alc-card-nome">${esc(nomeCliente(i.cliente))}</div></div>
                <div class="alc-card-linha"><span><i class="ph ph-hash"></i> OS ${esc(i.numero_os)}</span><span><i class="ph ph-calendar-blank"></i> ${esc(fmtCurta(i.data_entrega))}</span>${i.hora_inicio ? `<span><i class="ph ph-clock"></i> ${esc(i.hora_inicio)}</span>` : ''}</div>
                <div class="alr-end"><i class="ph ph-map-pin"></i> ${esc(i.endereco || '')}</div>
                <div class="alc-card-badges">${badgeTurno}${badgeSituacao(i)}</div>
                ${barraLiderCard(i)}
                ${rota}
                ${i.unidades.length ? `<div class="alr-unids">${unid}</div>` : ''}
            </div>
            <i class="ph ph-caret-right alc-card-seta"></i>
        </button>`;
    }

    // ── Navegação da agenda ─────────────────────────────────────────────────────
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
        const ativo = !!document.querySelector('[id^="view-app-lideranca-"].active');
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
    function pararGravacaoAudio(cancelar) {
        if (S.rec) {
            S._cancelaRec = !!cancelar;
            try { S.rec.stop(); } catch (e) { /* já parado */ }
            S.rec = null;
        }
        clearInterval(S.recTimer);
    }
    function fecharOverlay() {
        pararGravacaoAudio(true);
        const o = document.getElementById('ale-overlay'); if (o) o.remove();
        document.body.classList.remove('alc-no-scroll');
    }
    window._aleFechar = async function () { await salvarAgora(); fecharOverlay(); S.det = null; carregar(); };

    const unidadeAtual = () => S.det.unidades[S.ui];

    function carregarEstadoDaUnidade() {
        pararGravacaoAudio(true);
        const u = unidadeAtual();
        S.estado = {}; Object.keys(u.estado || {}).forEach(k => { S.estado[k] = Object.assign({}, u.estado[k]); });
        S.mid = {}; S.aud = null; S.vid = null;
        (u.midias || []).forEach(m => {
            if (m.tipo === 'foto') S.mid[m.item] = m.id;
            else if (m.tipo === 'audio') S.aud = m.id;
            else if (m.tipo === 'video') S.vid = m.id;
        });
        S.local = {}; S.subindo = {}; S.saveEstado = 'ok';
    }

    window._aleAbrir = async function (osId, unitKey) {
        const o = overlay();
        o.innerHTML = `<div class="alc-loading" style="margin-top:30vh;"><i class="ph ph-spinner ph-spin"></i> Abrindo...</div>`;
        try {
            const d = await api('/app/entregas/os/' + osId);
            S.det = d;
            let idx = unitKey ? d.unidades.findIndex(u => u.key === unitKey) : -1;
            if (idx < 0) idx = Math.max(0, d.unidades.findIndex(u => !u.concluido));
            S.ui = idx;
            if (!d.unidades.length) { desenharDetalhe(); return; }
            carregarEstadoDaUnidade();
            desenharDetalhe();
        } catch (e) { fecharOverlay(); erro('Não foi possível abrir', e.message); }
    };

    function faltaItens() {
        const u = unidadeAtual();
        return u.itens.filter(it => !itemCompleto(it)).length;
    }
    function itemCompleto(it) {
        const e = S.estado[it.id] || {};
        return !!(e.ok || e.nao) && !!S.mid[it.id]; // observação é opcional
    }

    function cabecalhoDetalhe() {
        const d = S.det;
        const ehNot = d.turno_escala === 'noturno';
        const badgeTurno = `<span class="alc-badge" style="${ehNot ? 'background:#ede9fe;color:#5b21b6;' : 'background:#fef9c3;color:#854d0e;'}">${ehNot ? '🌙 Noturno' : '☀️ Diurno'}</span>`;
        return `<header class="alc-det-head">
            <button class="alc-icon-btn" onclick="window._aleFechar()" aria-label="Voltar"><i class="ph ph-arrow-left"></i></button>
            <div class="alc-det-id"><div class="alc-det-nome">${esc(nomeCliente(d.cliente))}</div>
                <div class="alc-card-badges"><span class="alc-badge cinza"><i class="ph ph-hash"></i> OS ${esc(d.numero_os)}</span><span class="alc-badge cinza"><i class="ph ph-calendar-blank"></i> ${esc(fmtCurta(d.data_entrega))}</span>${badgeTurno}${badgeSituacao(d)}</div></div>
            <span class="alc-salvo" id="ale-salvo"></span>
        </header>`;
    }
    function boxRota() {
        const d = S.det, r = d.rota;
        const end = `<div class="alr-end" style="margin:0 0 8px;"><i class="ph ph-map-pin"></i> ${esc(d.endereco || '')}${d.complemento ? ' — ' + esc(d.complemento) : ''}</div>`;
        const liderBar = barraLiderCard(d);
        if (!r) return `${end}${liderBar}<div class="alr-rotabox vazio"><i class="ph ph-truck"></i><div><b>Rota ainda não definida</b><small>Esta entrega não está no Resumo de Rota de ${esc(fmtBr(d.data_entrega))}.</small></div></div>`;
        return `${end}${liderBar}<div class="alr-rotabox">${avatarPessoa(r.motorista, null, r.motorista_foto, 'md')}<div><small>Acompanhe a entrega de</small><b>${esc(r.motorista || '—')}</b><span><i class="ph ph-truck"></i> ${esc(r.veiculo || '—')}${r.ajudante ? ' · <i class="ph ph-hard-hat"></i> ' + esc(r.ajudante) : ''}</span></div></div>`;
    }
    function abasUnidades() {
        const d = S.det;
        if (d.unidades.length <= 1) return '';
        return `<nav class="alr-abas">${d.unidades.map((u, i) => `<button class="alr-aba ${i === S.ui ? 'on' : ''} st-${u.status}" onclick="window._aleUnidade(${i})">${iconeStatusUnidade(u)} <span>${esc(rotuloUnidadeComEmoji(u, d.tipo_servico))}</span></button>`).join('')}</nav>`;
    }
    window._aleUnidade = async function (i) {
        if (i === S.ui) return;
        await salvarAgora();
        S.ui = i; carregarEstadoDaUnidade(); desenharDetalhe();
        const c = document.getElementById('ale-det-corpo'); if (c) c.scrollTop = 0;
    };

    function desenharDetalhe() {
        const o = overlay(), d = S.det;
        let corpo, barra;
        if (!d.unidades.length) {
            corpo = `${boxRota()}<div class="alc-vazio"><i class="ph ph-prohibit"></i><div>Esta entrega não tem equipamento com checklist (ex.: carrinho, limpa fossa).</div></div>`;
            barra = `<button class="alc-btn alc-btn-primary full" onclick="window._aleFechar()"><i class="ph ph-arrow-left"></i> Voltar à lista</button>`;
        } else {
            const u = unidadeAtual();
            corpo = `${boxRota()}${abasUnidades()}${u.concluido ? htmlConcluida(u) : htmlChecklist(u)}`;
            barra = u.concluido ? barraConcluida(u) : barraChecklist();
        }
        o.innerHTML = `<div class="alc-det">${cabecalhoDetalhe()}<div class="alc-det-corpo" id="ale-det-corpo">${corpo}</div><footer class="alc-det-barra" id="ale-det-barra">${barra}</footer></div>`;
        mostrarSalvo();
    }
    function atualizar(manterScroll) {
        const c = document.getElementById('ale-det-corpo'); const sc = c ? c.scrollTop : 0;
        desenharDetalhe();
        const c2 = document.getElementById('ale-det-corpo'); if (c2 && manterScroll) c2.scrollTop = sc;
    }

    // ── Checklist editável ──────────────────────────────────────────────────────
    function htmlChecklist(u) {
        const total = u.itens.length, falta = faltaItens(), feitos = total - falta, pct = Math.round(feitos * 100 / total);
        const linhas = u.itens.map((it, idx) => {
            const e = S.estado[it.id] || {};
            const ok = !!e.ok, nao = !!e.nao && !ok;
            const temFoto = !!S.mid[it.id], subindo = !!S.subindo[it.id];
            const src = S.local[it.id] || (temFoto ? midiaUrl(S.mid[it.id]) : '');
            const obsFalta = false; // observação nunca é obrigatória
            const obsAberta = true; // campo de observação sempre visível (opcional)
            return `<div class="alc-item alr-item ${ok ? 'ok' : (nao ? 'nao' : '')} ${itemCompleto(it) ? 'completo' : ''}">
                <div class="alr-item-topo">
                    <span class="alc-item-ico"><i class="ph ${iconeItem(it.id)}"></i></span>
                    <span class="alc-item-txt"><small>${idx + 1}</small> ${esc(it.texto)}</span>
                    <button class="alc-item-nota ${e.obs ? 'tem' : ''}" onclick="window._aleObs('${it.id}')" aria-label="Observação"><i class="ph ph-note-pencil"></i></button>
                </div>
                <div class="alr-item-acoes">
                    <button class="alr-voto up ${ok ? 'on' : ''}" onclick="window._aleVoto('${it.id}','ok')" aria-label="OK"><i class="${ok ? 'ph-fill' : 'ph'} ph-thumbs-up"></i><span>OK</span></button>
                    <button class="alr-voto down ${nao ? 'on' : ''}" onclick="window._aleVoto('${it.id}','nao')" aria-label="Avariado"><i class="${nao ? 'ph-fill' : 'ph'} ph-thumbs-down"></i><span>Avariado</span></button>
                    <label class="alr-cam ${temFoto ? 'tem' : 'falta'}" aria-label="Foto do item">
                        ${subindo ? '<i class="ph ph-spinner ph-spin"></i><span>Enviando</span>' : (src ? `<img src="${esc(src)}" alt=""><button type="button" class="alr-zoom" onclick="event.preventDefault();event.stopPropagation();window._aleVerFoto('${it.id}')" aria-label="Ampliar foto"><i class="ph ph-magnifying-glass-plus"></i></button>` : '<i class="ph ph-camera"></i><span>Foto</span>')}
                        <input type="file" accept="image/*" capture="environment" onchange="window._aleFoto('${it.id}', this)">
                    </label>
                </div>
                ${temFoto ? '' : '<div class="alr-aviso"><i class="ph ph-camera"></i> Foto obrigatória deste item</div>'}
                ${obsAberta ? `<textarea class="alc-obs" rows="2" placeholder="${nao ? 'Observação sobre a avaria (opcional)' : 'Observação (opcional)'}" oninput="window._aleObsTxt('${it.id}', this.value)">${esc(e.obs || '')}</textarea>` : ''}
                ${obsFalta ? '<div class="alr-aviso red"><i class="ph ph-warning-circle"></i> Descreva a avaria</div>' : ''}
            </div>`;
        }).join('');

        const gravando = !!S.rec;
        const tempo = `${pad(Math.floor(S.recSeg / 60))}:${pad(S.recSeg % 60)}`;
        const audioSrc = S.local.audio || (S.aud ? midiaUrl(S.aud) : '');
        const audioBox = `<div class="alr-video">
            <div class="alr-video-tit"><i class="ph ph-microphone"></i> Áudio do equipamento <em>(opcional — apenas gravar ao vivo)</em></div>
            ${S.subindo.audio
                ? `<div class="alc-btn alc-btn-sec alr-video-btn"><i class="ph ph-spinner ph-spin"></i> Enviando áudio gravado...</div>`
                : `<button type="button" class="alc-btn ${gravando ? 'alc-btn-ok' : 'alc-btn-sec'} alr-video-btn" style="${gravando ? 'background:#dc2626;color:#fff;border-color:#dc2626;' : ''}" onclick="window._aleGravarAudio()">
                    <i class="ph-fill ${gravando ? 'ph-stop-circle' : 'ph-microphone'}"></i>
                    <span id="ale-rec-txt">${gravando ? '🔴 Gravando áudio... ' + tempo + ' (toque para parar)' : (audioSrc ? 'Gravar novo áudio pelo microfone' : 'Gravar áudio pelo microfone')}</span>
                </button>`}
            ${audioSrc ? `<div style="margin-top:8px;"><audio controls preload="metadata" src="${esc(audioSrc)}" style="width:100%;"></audio><button type="button" class="alc-btn alc-btn-sec" style="margin-top:6px;width:100%;" onclick="window._aleExcluirAudio()"><i class="ph ph-trash"></i> Remover áudio gravado</button></div>` : ''}
        </div>`;

        return `<div class="alc-prog"><div class="alc-prog-txt"><b>${feitos}/${total}</b> itens completos <span>${pct}%</span></div><div class="alc-barra grande"><i style="width:${pct}%;"></i></div></div>
            <p class="alc-dica"><i class="ph ph-hand-tap"></i> Em cada item: <b>👍 OK</b> ou <b>👎 Avariado</b> + <b>foto</b> (obrigatória).</p>
            <div class="alc-itens">${linhas}</div>${audioBox}`;
    }
    function barraChecklist() {
        const falta = faltaItens();
        return `<button class="alc-btn alc-btn-ok grow" ${falta ? 'disabled' : ''} onclick="window._aleConcluir()"><i class="ph ph-seal-check"></i> ${falta ? 'Faltam ' + falta + ' item' + (falta > 1 ? 's' : '') : 'Concluir conferência'}</button>`;
    }

    window._aleVoto = function (id, tipo) {
        const e = S.estado[id] = S.estado[id] || {};
        if (tipo === 'ok') { e.ok = !e.ok; if (e.ok) e.nao = false; } else { e.nao = !e.nao; if (e.nao) e.ok = false; }
        e.em = new Date().toISOString();
        if (navigator.vibrate) try { navigator.vibrate(15); } catch (x) { /* ignora */ }
        agendarSalvar(); atualizar(true);
    };
    window._aleObs = function (id) { const e = S.estado[id] = S.estado[id] || {}; e.obsAberta = !e.obsAberta; atualizar(true); };
    window._aleObsTxt = function (id, v) { const e = S.estado[id] = S.estado[id] || {}; e.obs = v; agendarSalvar(); };

    // ── Salvamento automático do rascunho ───────────────────────────────────────
    function estadoParaEnvio() {
        const itens = {};
        Object.keys(S.estado).forEach(k => { const e = S.estado[k]; itens[k] = { ok: !!e.ok, nao: !!e.nao && !e.ok, obs: e.obs || '', em: e.em }; });
        return itens;
    }
    function agendarSalvar() { S.saveEstado = 'pendente'; mostrarSalvo(); clearTimeout(S.saveTimer); S.saveTimer = setTimeout(salvarAgora, 600); }
    async function salvarAgora() {
        clearTimeout(S.saveTimer); S.saveTimer = null;
        if (!S.det || !S.det.unidades.length || S.saveEstado === 'ok') return;
        const u = unidadeAtual(); if (!u || u.concluido) return;
        S.saveEstado = 'salvando'; mostrarSalvo();
        try {
            await api(`/app/entregas/os/${S.det.os_id}/unidades/${u.key}/checklist`, { method: 'PUT', body: JSON.stringify({ itens: estadoParaEnvio() }) });
            if (!S.saveTimer) S.saveEstado = 'ok';
        } catch (e) { S.saveEstado = 'erro'; }
        mostrarSalvo();
    }
    function mostrarSalvo() {
        const el = document.getElementById('ale-salvo'); if (!el) return;
        const m = {
            ok: '<i class="ph ph-cloud-check" style="color:#16a34a"></i>', pendente: '<i class="ph ph-cloud-arrow-up" style="color:#0284c7"></i>',
            salvando: '<i class="ph ph-spinner ph-spin" style="color:#556b2f"></i>', erro: '<i class="ph ph-cloud-slash" style="color:#dc2626"></i>'
        };
        el.innerHTML = (m[S.saveEstado] || '') + `<small>${S.saveEstado === 'ok' ? 'Salvo' : (S.saveEstado === 'erro' ? 'Erro' : '...')}</small>`;
    }

    // ── Fotos / Gravação de Áudio ao vivo ───────────────────────────────────────
    function comprimir(file, maxLado, q) {
        return new Promise((resolve, reject) => {
            const img = new Image(), url = URL.createObjectURL(file);
            img.onload = () => {
                let w = img.naturalWidth, h = img.naturalHeight;
                const k = Math.min(1, maxLado / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
                const c = document.createElement('canvas'); c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                c.toBlob(b => { URL.revokeObjectURL(url); b ? resolve(b) : reject(new Error('Falha ao processar a foto.')); }, 'image/jpeg', q);
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a foto.')); };
            img.src = url;
        });
    }
    async function enviarMidia(item, blob, nome) {
        const u = unidadeAtual();
        const fd = new FormData(); fd.append('item', item); fd.append('arquivo', blob, nome);
        return (await api(`/app/entregas/os/${S.det.os_id}/unidades/${u.key}/midia`, { method: 'POST', body: fd })).midia;
    }
    window._aleFoto = async function (id, input) {
        const file = input.files && input.files[0]; input.value = '';
        if (!file) return;
        const chave = S.det.os_id + '|' + unidadeAtual().key;
        S.subindo[id] = true; atualizar(true);
        try {
            await salvarAgora();
            const blob = await comprimir(file, 1600, 0.8);
            const m = await enviarMidia(id, blob, id + '.jpg');
            if (!S.det || S.det.os_id + '|' + unidadeAtual().key !== chave) return;
            S.mid[id] = m.id; S.local[id] = URL.createObjectURL(blob);
        } catch (e) { erro('Foto não enviada', e.message); }
        delete S.subindo[id]; atualizar(true);
    };

    // Gravação de áudio ao vivo pelo microfone (proibido anexar arquivo salvo do celular/computador)
    window._aleGravarAudio = async function () {
        if (S.rec) {
            pararGravacaoAudio(false);
            return;
        }
        if (!navigator.mediaDevices || !window.MediaRecorder) {
            return erro('Gravação indisponível', 'Este navegador não permite gravar áudio ao vivo pelo microfone.');
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(m => window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
            const chunks = [];
            const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            const chave = S.det.os_id + '|' + unidadeAtual().key;
            rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
            rec.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                clearInterval(S.recTimer);
                S.rec = null;
                if (S._cancelaRec) { S._cancelaRec = false; return; }
                const blobType = rec.mimeType || mime || 'audio/webm';
                const blob = new Blob(chunks, { type: blobType });
                if (!blob.size) { atualizar(true); return; }
                const ext = /mp4|m4a/.test(blobType) ? 'm4a' : (/ogg/.test(blobType) ? 'ogg' : 'webm');
                S.subindo.audio = true;
                atualizar(true);
                try {
                    await salvarAgora();
                    const m = await enviarMidia('audio', blob, 'audio.' + ext);
                    if (!S.det || S.det.os_id + '|' + unidadeAtual().key !== chave) return;
                    S.aud = m.id;
                    if (S.local.audio) URL.revokeObjectURL(S.local.audio);
                    S.local.audio = URL.createObjectURL(blob);
                } catch (e) {
                    erro('Áudio não enviado', e.message);
                }
                delete S.subindo.audio;
                atualizar(true);
            };
            S.recSeg = 0;
            S._cancelaRec = false;
            S.rec = rec;
            rec.start();
            S.recTimer = setInterval(() => {
                S.recSeg++;
                const el = document.getElementById('ale-rec-txt');
                if (el) el.textContent = '🔴 Gravando áudio... ' + pad(Math.floor(S.recSeg / 60)) + ':' + pad(S.recSeg % 60) + ' (toque para parar)';
            }, 1000);
            atualizar(true);
        } catch (e) {
            S.rec = null;
            erro('Microfone bloqueado', 'Permita o uso do microfone nas configurações do navegador para gravar o áudio.');
        }
    };

    window._aleExcluirAudio = async function () {
        if (!S.aud) return;
        const r = await Swal.fire({ icon: 'question', title: 'Remover o áudio gravado?', showCancelButton: true, confirmButtonText: 'Remover', cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626' });
        if (!r.isConfirmed) return;
        try {
            await api('/app/entregas/midia/' + S.aud, { method: 'DELETE' });
            S.aud = null;
            if (S.local.audio) { URL.revokeObjectURL(S.local.audio); delete S.local.audio; }
            atualizar(true);
        } catch (e) { erro('Não foi possível remover', e.message); }
    };

    window._aleVerFoto = function (id) {
        const src = S.local[id] || (S.mid[id] ? midiaUrl(S.mid[id]) : ''); if (!src) return;
        lightbox(src);
    };
    window._aleVerFotoId = function (mid) { lightbox(midiaUrl(mid)); };
    function lightbox(src) {
        const l = document.createElement('div'); l.className = 'alr-lightbox';
        l.innerHTML = `<button class="alc-icon-btn" aria-label="Fechar"><i class="ph ph-x"></i></button><img src="${esc(src)}" alt="">`;
        l.onclick = () => l.remove(); document.body.appendChild(l);
    }

    // ── Concluir ────────────────────────────────────────────────────────────────
    window._aleConcluir = async function () {
        const u = unidadeAtual();
        const r = await Swal.fire({ icon: 'question', title: 'Concluir a conferência?', html: `<b>${esc(u.rotulo)}</b><br>Depois de concluída não dá para editar.`, showCancelButton: true, confirmButtonText: 'Concluir', cancelButtonText: 'Voltar', confirmButtonColor: '#16a34a' });
        if (!r.isConfirmed) return;
        try {
            pararGravacaoAudio(true);
            S.saveEstado = 'pendente'; await salvarAgora();
            const res = await api(`/app/entregas/os/${S.det.os_id}/unidades/${u.key}/concluir`, { method: 'POST' });
            await Swal.fire({ icon: res.tem_avaria ? 'warning' : 'success', title: res.tem_avaria ? 'Conferência concluída — com AVARIA' : 'Conferência concluída!', timer: 1600, showConfirmButton: false });
            const d = await api('/app/entregas/os/' + S.det.os_id);
            S.det = d;
            const prox = d.unidades.findIndex(x => !x.concluido);
            S.ui = prox >= 0 ? prox : S.ui;
            carregarEstadoDaUnidade(); desenharDetalhe();
            if (typeof window._arrRecarregarSilencioso === 'function') window._arrRecarregarSilencioso();
            const c = document.getElementById('ale-det-corpo'); if (c) c.scrollTop = 0;
        } catch (e) { erro('Não foi possível concluir', e.message); }
    };

    // ── Conferência concluída (somente leitura) ─────────────────────────────────
    function htmlConcluida(u) {
        const mids = {}; (u.midias || []).forEach(m => { if (m.tipo === 'foto') mids[m.item] = m.id; });
        const aud = (u.midias || []).find(m => m.tipo === 'audio');
        const vid = (u.midias || []).find(m => m.tipo === 'video');
        const linhas = u.itens.map((it, idx) => {
            const e = (u.estado || {})[it.id] || {};
            return `<div class="alc-item alr-item ${e.nao ? 'nao' : 'ok'} completo ro">
                <div class="alr-item-topo"><span class="alc-item-ico"><i class="ph ${iconeItem(it.id)}"></i></span>
                    <span class="alc-item-txt"><small>${idx + 1}</small> ${esc(it.texto)}</span>
                    <span class="alr-ro-voto ${e.nao ? 'down' : 'up'}"><i class="ph-fill ${e.nao ? 'ph-thumbs-down' : 'ph-thumbs-up'}"></i></span>
                    ${mids[it.id] ? `<button class="alr-thumb" onclick="window._aleVerFotoId(${mids[it.id]})"><img src="${esc(midiaUrl(mids[it.id]))}" alt="" loading="lazy"></button>` : ''}</div>
                ${e.obs ? `<div class="alr-obs-ro"><i class="ph ph-note-pencil"></i> ${esc(e.obs)}</div>` : ''}
            </div>`;
        }).join('');
        return `<div class="alr-lider ${u.tem_avaria ? 'avaria' : ''}">${avatarPessoa(u.lider_nome, u.lider_colab_id, u.lider_foto_url, 'md')}
            <div><small>Conferido por</small><b>${esc(u.lider_nome || '—')}</b><span><i class="ph ph-clock"></i> ${esc(fmtDataHora(u.concluido_em))}</span></div>
            ${u.tem_avaria ? '<span class="alc-badge vermelho"><i class="ph ph-warning-octagon"></i> AVARIA</span>' : '<span class="alc-badge verde"><i class="ph ph-thumbs-up"></i> OK</span>'}</div>
            <div class="alc-itens">${linhas}</div>
            ${aud ? `<div class="alr-video"><div class="alr-video-tit"><i class="ph ph-microphone"></i> Áudio gravado</div><audio controls preload="metadata" src="${esc(midiaUrl(aud.id))}" style="width:100%;"></audio></div>` : ''}
            ${vid ? `<div class="alr-video"><div class="alr-video-tit"><i class="ph ph-video-camera"></i> Vídeo</div><video controls playsinline preload="metadata" src="${esc(midiaUrl(vid.id))}"></video></div>` : ''}`;
    }
    function barraConcluida(u) {
        const pend = S.det.unidades.findIndex(x => !x.concluido);
        return `${ehAdmin() ? `<button class="alc-btn alc-btn-sec" onclick="window._aleReabrir()"><i class="ph ph-lock-key-open"></i> Reabrir</button>` : ''}
            ${pend >= 0 ? `<button class="alc-btn alc-btn-primary grow" onclick="window._aleUnidade(${pend})"><i class="ph ph-arrow-right"></i> Próximo equipamento</button>` : `<button class="alc-btn alc-btn-primary grow" onclick="window._aleFechar()"><i class="ph ph-arrow-left"></i> Voltar à lista</button>`}`;
    }
    window._aleReabrir = async function () {
        const u = unidadeAtual();
        const r = await Swal.fire({ icon: 'warning', title: 'Reabrir esta conferência?', text: 'O checklist volta a ser editável e a assinatura do líder é removida.', showCancelButton: true, confirmButtonText: 'Reabrir', cancelButtonText: 'Cancelar', confirmButtonColor: '#ea580c' });
        if (!r.isConfirmed) return;
        try { await api(`/app/entregas/os/${S.det.os_id}/unidades/${u.key}/reabrir`, { method: 'POST' }); window._aleAbrir(S.det.os_id, u.key); } catch (e) { erro('Não foi possível reabrir', e.message); }
    };
})();
