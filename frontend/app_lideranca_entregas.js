/**
 * app_lideranca_entregas.js
 * APP › Liderança › Entregas  (uso OPERACIONAL — mobile-first, ícones, toques grandes)
 *
 * - Agenda (semana / mês) com as entregas do pipeline; filtros: Todos · Pendentes · OK · Com avaria
 * - Cada equipamento entregue (1 por unidade da OS) tem checklist por modelo: 👍 OK / 👎 avariado,
 *   observação, FOTO obrigatória por item e vídeo opcional (arquivos no Cloudflare R2)
 * - Mostra motorista + veículo da rota do dia (Resumo de Rota) e o líder que conferiu (foto + nome)
 * - Pendência vale para todos os líderes liberados no Controle de Acesso (sem regra de turno)
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
        busca: '', dados: null, diaSel: null, modo: 'semana', semanaIni: null, mesRef: null, filtro: 'todos',
        det: null, ui: 0, estado: {}, mid: {}, vid: null, local: {}, subindo: {}, saveTimer: null, saveEstado: 'ok', carregando: false
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
        const src = fotoPath ? (String(fotoPath).startsWith('/api') ? fotoPath : apiBase() + fotoPath) : (colabId ? fotoColab(colabId) : '');
        const fb = oculto => `<span class="alr-av-fb" style="${oculto ? 'display:none;' : ''}">${ini}</span>`;
        if (!src) return `<span class="alr-av ${cls || ''}">${fb(false)}</span>`;
        return `<span class="alr-av ${cls || ''}"><img src="${esc(src)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">${fb(true)}</span>`;
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
            const o = m[i.data_entrega] = m[i.data_entrega] || { total: 0, pend: 0, avaria: 0 };
            o.total++; if (i.pendente) o.pend++; if (i.tem_avaria) o.avaria++;
        });
        return m;
    }

    function listaFiltrada() {
        const q = String(S.busca || '').trim().toLowerCase();
        const casa = i => String(i.numero_os || '').toLowerCase().includes(q) || String(i.cliente || '').toLowerCase().includes(q);
        const todos = q ? (S.dados.itens || []).filter(casa) : (S.diaSel ? itensDoDia(S.diaSel) : (S.dados.itens || []));
        const pendGlobais = (S.dados.itens || []).filter(i => i.pendente && (!q || casa(i)));
        if (S.filtro === 'ok') return todos.filter(i => i.situacao === 'ok');
        if (S.filtro === 'avaria') return todos.filter(i => i.tem_avaria);
        if (S.filtro === 'pendentes') return pendGlobais.slice().sort((a, b) => (a.data_entrega + a.cliente).localeCompare(b.data_entrega + b.cliente)); // pendência vale para todos os dias desde o início do controle
        return todos;
    }
    function contadoresFiltro() {
        const q = String(S.busca || '').trim().toLowerCase();
        const casa = i => String(i.numero_os || '').toLowerCase().includes(q) || String(i.cliente || '').toLowerCase().includes(q);
        const todos = q ? (S.dados.itens || []).filter(casa) : (S.diaSel ? itensDoDia(S.diaSel) : (S.dados.itens || []));
        return { todos: todos.length, pendentes: (S.dados.itens || []).filter(i => i.pendente && (!q || casa(i))).length, ok: todos.filter(i => i.situacao === 'ok').length, avaria: todos.filter(i => i.tem_avaria).length };
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
        <div class="alr-busca"><i class="ph ph-magnifying-glass"></i><input id="ale-busca" type="search" inputmode="search" autocomplete="off" placeholder="Pesquisar nº da OS ou cliente" value="${esc(S.busca)}" oninput="window._aleBusca(this.value)" onfocus="window._aleBuscaFoco=true" onblur="window._aleBuscaFoco=false">${S.busca ? '<button type="button" class="alr-busca-x" onclick="window._aleBusca(\'\')" aria-label="Limpar pesquisa"><i class="ph ph-x-circle"></i></button>' : ''}</div>
        <div id="ale-filtros">${htmlFiltros()}</div>
        <div id="ale-lista">${htmlLista()}</div>`;
        const bi = document.getElementById('ale-busca');
        if (bi && window._aleBuscaFoco) { bi.focus(); try { bi.setSelectionRange(bi.value.length, bi.value.length); } catch (x) { /* ignora */ } }
    }

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

    function htmlLista() {
        const itens = listaFiltrada();
        const extras = (S.diaSel && (S.filtro === 'todos')) ? (S.dados.itens || []).filter(i => i.pendente && i.data_entrega !== S.diaSel) : [];
        if (!itens.length && !extras.length) {
            const msg = S.filtro === 'ok' ? 'Nenhuma entrega OK.' : (S.filtro === 'avaria' ? 'Nenhum equipamento com avaria.' : (S.filtro === 'pendentes' ? 'Nenhuma entrega pendente. 🎉' : (S.diaSel ? 'Nenhuma entrega neste dia.' : 'Nenhuma entrega no período.')));
            return `<div class="alc-vazio"><i class="ph ph-package"></i><div>${msg}</div></div>`;
        }
        const ini = fmtBr(S.dados.inicio_controle);
        const grupos = [
            { t: 'Pendentes — conferir', ic: 'ph-warning-circle', cor: '#dc2626', f: i => i.pendente },
            { t: 'Com avaria', ic: 'ph-thumbs-down', cor: '#b91c1c', f: i => !i.pendente && i.tem_avaria },
            { t: 'OK', ic: 'ph-thumbs-up', cor: '#16a34a', f: i => !i.pendente && !i.tem_avaria && i.situacao === 'ok' },
            { t: 'Agendadas', ic: 'ph-calendar-check', cor: '#2563eb', f: i => !i.pendente && !i.tem_avaria && i.situacao !== 'ok' && i.futura && i.situacao !== 'sem_checklist' },
            { t: 'Sem checklist (produto sem modelo)', ic: 'ph-prohibit', cor: '#94a3b8', f: i => !i.pendente && i.situacao === 'sem_checklist' },
            { t: 'Sem conferência (antes de ' + ini + ')', ic: 'ph-clock-counter-clockwise', cor: '#64748b', f: i => !i.pendente && !i.tem_avaria && !i.futura && (i.situacao === 'pendente' || i.situacao === 'andamento') }
        ];
        let html = '';
        if (extras.length) {
            html += `<section class="alc-grupo"><h3 style="color:#dc2626;"><i class="ph ph-warning-circle"></i> Pendentes de outros dias <span class="alc-contador" style="background:#dc2626;">${extras.length}</span></h3>${extras.map(cardHtml).join('')}</section>`;
        }
        const ja = new Set(extras.map(i => i.os_id));
        html += grupos.map(g => {
            const l = itens.filter(i => !ja.has(i.os_id) && g.f(i));
            if (!l.length) return '';
            return `<section class="alc-grupo"><h3 style="color:${g.cor};"><i class="ph ${g.ic}"></i> ${esc(g.t)} <span class="alc-contador" style="background:${g.cor};">${l.length}</span></h3>${l.map(cardHtml).join('')}</section>`;
        }).join('');
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
        return '<span class="alc-badge cinza"><i class="ph ph-clock-counter-clockwise"></i> Sem conferência</span>';
    }
    const iconeStatusUnidade = u => u.status === 'avaria' ? '<i class="ph-fill ph-thumbs-down" style="color:#dc2626"></i>' : (u.status === 'ok' ? '<i class="ph-fill ph-thumbs-up" style="color:#16a34a"></i>' : (u.status === 'andamento' ? '<i class="ph ph-hourglass-medium" style="color:#ea580c"></i>' : '<i class="ph ph-circle-dashed" style="color:#94a3b8"></i>'));

    function cardHtml(i) {
        const rota = i.rota
            ? `<div class="alr-rota">${avatarPessoa(i.rota.motorista, null, i.rota.motorista_foto, 'xs')}<span><i class="ph ph-truck"></i> ${esc(i.rota.veiculo || '—')} · <i class="ph ph-steering-wheel"></i> ${esc(i.rota.motorista || '—')}</span></div>`
            : `<div class="alr-rota vazio"><i class="ph ph-truck"></i> Rota ainda não definida</div>`;
        const unid = i.unidades.map(u => `<div class="alr-unid"><span class="alr-unid-st">${iconeStatusUnidade(u)}</span><span class="alr-unid-nome">${esc(u.rotulo)}</span>${u.concluido ? `<span class="alr-unid-lider">${avatarPessoa(u.lider_nome, u.lider_colab_id, null, 'xs')}<small>${esc(u.lider_nome || '')}</small></span>` : (u.itens_feitos ? `<small class="alr-unid-prog">${u.itens_feitos}/${u.itens_total}</small>` : '')}</div>`).join('');
        return `<button class="alc-card alr-card ${i.pendente ? 'pend' : ''} ${i.tem_avaria ? 'avaria' : ''}" onclick="window._aleAbrir(${i.os_id})">
            <div class="alc-card-corpo">
                <div class="alr-card-topo"><div class="alc-card-nome">${esc(nomeCliente(i.cliente))}</div></div>
                <div class="alc-card-linha"><span><i class="ph ph-hash"></i> OS ${esc(i.numero_os)}</span><span><i class="ph ph-calendar-blank"></i> ${esc(fmtCurta(i.data_entrega))}</span>${i.hora_inicio ? `<span><i class="ph ph-clock"></i> ${esc(i.hora_inicio)}</span>` : ''}</div>
                <div class="alr-end"><i class="ph ph-map-pin"></i> ${esc(i.endereco || '')}</div>
                <div class="alc-card-badges">${badgeSituacao(i)}</div>
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
        const v = document.getElementById('view-app-lideranca-entregas');
        const vCand = document.getElementById('view-app-lideranca-candidatos'); // mesma regra para Candidatos e Entregas
        const vEnt = document.getElementById('view-app-lideranca-retiradas');
        const ativo = !!((v && v.classList.contains('active')) || (vCand && vCand.classList.contains('active')) || (vEnt && vEnt.classList.contains('active')));
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
    function fecharOverlay() {
        const o = document.getElementById('ale-overlay'); if (o) o.remove();
        document.body.classList.remove('alc-no-scroll');
    }
    window._aleFechar = async function () { await salvarAgora(); fecharOverlay(); S.det = null; carregar(); };

    const unidadeAtual = () => S.det.unidades[S.ui];

    function carregarEstadoDaUnidade() {
        const u = unidadeAtual();
        S.estado = {}; Object.keys(u.estado || {}).forEach(k => { S.estado[k] = Object.assign({}, u.estado[k]); });
        S.mid = {}; S.vid = null;
        (u.midias || []).forEach(m => { if (m.tipo === 'foto') S.mid[m.item] = m.id; else if (m.tipo === 'video') S.vid = m.id; });
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
        return `<header class="alc-det-head">
            <button class="alc-icon-btn" onclick="window._aleFechar()" aria-label="Voltar"><i class="ph ph-arrow-left"></i></button>
            <div class="alc-det-id"><div class="alc-det-nome">${esc(nomeCliente(d.cliente))}</div>
                <div class="alc-card-badges"><span class="alc-badge cinza"><i class="ph ph-hash"></i> OS ${esc(d.numero_os)}</span><span class="alc-badge cinza"><i class="ph ph-calendar-blank"></i> ${esc(fmtCurta(d.data_entrega))}</span>${badgeSituacao(d)}</div></div>
            <span class="alc-salvo" id="ale-salvo"></span>
        </header>`;
    }
    function boxRota() {
        const d = S.det, r = d.rota;
        const end = `<div class="alr-end" style="margin:0 0 8px;"><i class="ph ph-map-pin"></i> ${esc(d.endereco || '')}${d.complemento ? ' — ' + esc(d.complemento) : ''}</div>`;
        if (!r) return `${end}<div class="alr-rotabox vazio"><i class="ph ph-truck"></i><div><b>Rota ainda não definida</b><small>Esta entrega não está no Resumo de Rota de ${esc(fmtBr(d.data_entrega))}.</small></div></div>`;
        return `${end}<div class="alr-rotabox">${avatarPessoa(r.motorista, null, r.motorista_foto, 'md')}<div><small>Acompanhe a entrega de</small><b>${esc(r.motorista || '—')}</b><span><i class="ph ph-truck"></i> ${esc(r.veiculo || '—')}${r.ajudante ? ' · <i class="ph ph-hard-hat"></i> ' + esc(r.ajudante) : ''}</span></div></div>`;
    }
    function abasUnidades() {
        const d = S.det;
        if (d.unidades.length <= 1) return '';
        return `<nav class="alr-abas">${d.unidades.map((u, i) => `<button class="alr-aba ${i === S.ui ? 'on' : ''} st-${u.status}" onclick="window._aleUnidade(${i})">${iconeStatusUnidade(u)} <span>${esc(u.rotulo)}</span></button>`).join('')}</nav>`;
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
        const videoBox = `<div class="alr-video">
            <div class="alr-video-tit"><i class="ph ph-video-camera"></i> Vídeo do equipamento <em>(opcional)</em></div>
            ${S.vid ? `<video controls playsinline preload="metadata" src="${esc(midiaUrl(S.vid))}"></video><button class="alc-btn alc-btn-sec" onclick="window._aleExcluirVideo()"><i class="ph ph-trash"></i> Remover vídeo</button>`
                : `<label class="alc-btn alc-btn-sec alr-video-btn">${S.subindo.video ? '<i class="ph ph-spinner ph-spin"></i> Enviando vídeo...' : '<i class="ph ph-record"></i> Gravar / anexar vídeo (até 60 MB)'}<input type="file" accept="video/*" capture="environment" onchange="window._aleVideo(this)"></label>`}
        </div>`;
        return `<div class="alc-prog"><div class="alc-prog-txt"><b>${feitos}/${total}</b> itens completos <span>${pct}%</span></div><div class="alc-barra grande"><i style="width:${pct}%;"></i></div></div>
            <p class="alc-dica"><i class="ph ph-hand-tap"></i> Em cada item: <b>👍 OK</b> ou <b>👎 Avariado</b> + <b>foto</b> (obrigatória).</p>
            <div class="alc-itens">${linhas}</div>${videoBox}`;
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

    // ── Fotos / vídeo ───────────────────────────────────────────────────────────
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
            if (!S.det || S.det.os_id + '|' + unidadeAtual().key !== chave) return; // trocou de equipamento durante o envio
            S.mid[id] = m.id; S.local[id] = URL.createObjectURL(blob);
        } catch (e) { erro('Foto não enviada', e.message); }
        delete S.subindo[id]; atualizar(true);
    };
    window._aleVideo = async function (input) {
        const file = input.files && input.files[0]; input.value = '';
        if (!file) return;
        if (file.size > 60 * 1024 * 1024) { erro('Vídeo muito grande', 'O vídeo tem ' + Math.round(file.size / 1048576) + ' MB. O limite é 60 MB — grave um vídeo mais curto ou em qualidade menor.'); return; }
        S.subindo.video = true; atualizar(true);
        try {
            await salvarAgora();
            const m = await enviarMidia('video', file, file.name || 'video.mp4');
            S.vid = m.id;
        } catch (e) { erro('Vídeo não enviado', e.message); }
        delete S.subindo.video; atualizar(true);
    };
    window._aleExcluirVideo = async function () {
        const r = await Swal.fire({ icon: 'question', title: 'Remover o vídeo?', showCancelButton: true, confirmButtonText: 'Remover', cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626' });
        if (!r.isConfirmed) return;
        try { await api('/app/entregas/midia/' + S.vid, { method: 'DELETE' }); S.vid = null; atualizar(true); } catch (e) { erro('Não foi possível remover', e.message); }
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
            S.saveEstado = 'pendente'; await salvarAgora();
            const res = await api(`/app/entregas/os/${S.det.os_id}/unidades/${u.key}/concluir`, { method: 'POST' });
            await Swal.fire({ icon: res.tem_avaria ? 'warning' : 'success', title: res.tem_avaria ? 'Conferência concluída — com AVARIA' : 'Conferência concluída!', timer: 1600, showConfirmButton: false });
            const d = await api('/app/entregas/os/' + S.det.os_id);
            S.det = d;
            const prox = d.unidades.findIndex(x => !x.concluido);
            S.ui = prox >= 0 ? prox : S.ui;
            carregarEstadoDaUnidade(); desenharDetalhe();
            const c = document.getElementById('ale-det-corpo'); if (c) c.scrollTop = 0;
        } catch (e) { erro('Não foi possível concluir', e.message); }
    };

    // ── Conferência concluída (somente leitura) ─────────────────────────────────
    function htmlConcluida(u) {
        const mids = {}; (u.midias || []).forEach(m => { if (m.tipo === 'foto') mids[m.item] = m.id; });
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
        return `<div class="alr-lider ${u.tem_avaria ? 'avaria' : ''}">${avatarPessoa(u.lider_nome, u.lider_colab_id, null, 'md')}
            <div><small>Conferido por</small><b>${esc(u.lider_nome || '—')}</b><span><i class="ph ph-clock"></i> ${esc(fmtDataHora(u.concluido_em))}</span></div>
            ${u.tem_avaria ? '<span class="alc-badge vermelho"><i class="ph ph-warning-octagon"></i> AVARIA</span>' : '<span class="alc-badge verde"><i class="ph ph-thumbs-up"></i> OK</span>'}</div>
            <div class="alc-itens">${linhas}</div>
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
