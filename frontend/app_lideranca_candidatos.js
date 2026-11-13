/**
 * app_lideranca_candidatos.js
 * APP › Liderança › Candidatos  (uso OPERACIONAL — mobile-first, ícones, toques grandes)
 *
 * - Agenda (semana / mês) com os dias de 1º dia de teste
 * - Lista de candidatos com foto, tipo, data e situação
 * - Checklist do que o líder ensinou (motorista / ajudante)
 * - Perguntas do 1º dia (M1 / A1) + áudio obrigatório → aparece na tela de candidatos do RH
 * - Avisos no celular (PWA + Web Push), pendência só para o líder de plantão
 *
 * Endpoints: /api/app/lideranca/*  e  /api/app/push/*
 * Permissão: página 'app-lideranca-candidatos' (Controle de Acesso)
 */
(function () {
    'use strict';

    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const FACES = [
        { v: 1, e: '😡', t: 'Muito ruim', c: '#dc2626' },
        { v: 2, e: '🙁', t: 'Ruim', c: '#ea580c' },
        { v: 3, e: '😐', t: 'Regular', c: '#ca8a04' },
        { v: 4, e: '🙂', t: 'Bom', c: '#16a34a' },
        { v: 5, e: '🤩', t: 'Excelente', c: '#059669' }
    ];

    const S = { dados: null, diaSel: null, modo: 'semana', semanaIni: null, mesRef: null, det: null, estado: {}, cnh: null, resp: {}, step: 1, audioBlob: null, audioUrl: null, rec: null, recTimer: null, recSeg: 0, saveTimer: null, saveEstado: 'ok', notas: {} };

    // ── Utilidades ───────────────────────────────────────────────────────────────
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const pad = n => String(n).padStart(2, '0');
    const isoDe = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const hojeIso = () => isoDe(new Date());
    const dataDe = iso => new Date(iso + 'T12:00:00');
    const fmtCurta = iso => { const d = dataDe(iso); return DIAS[d.getDay()] + ', ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1); };
    const fmtDataHora = s => { if (!s) return ''; const d = new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') || String(s).includes('T') ? '' : 'Z')); return isNaN(d) ? String(s) : d.toLocaleString('pt-BR'); };
    const getToken = () => window.currentToken || (typeof currentToken !== 'undefined' ? currentToken : '') || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    const apiBase = () => (typeof API_URL !== 'undefined' ? API_URL : '/api');
    const ehAdmin = () => {
        try {
            const u = window.currentUser || JSON.parse(localStorage.getItem('erp_user') || '{}');
            return u.role === 'Diretoria' || u.role === 'Administrador' || u.departamento === 'Diretoria' || String(u.grupo_nome || '').toLowerCase() === 'diretoria';
        } catch (e) { return false; }
    };
    const tipoRotulo = t => String(t || '').toLowerCase().includes('motorista') ? 'Motorista' : 'Ajudante';
    const tipoIcone = t => tipoRotulo(t) === 'Motorista' ? 'ph-truck' : 'ph-hard-hat';
    const tipoCor = t => tipoRotulo(t) === 'Motorista' ? '#2563eb' : '#d97706';

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
    const fotoUrl = id => apiBase() + '/app/lideranca/candidatos/' + id + '/foto?token=' + encodeURIComponent(getToken());

    function avatar(c, tam) {
        const cor = tipoCor(c.tipo);
        const ini = esc((c.nome || '?').trim()[0] || '?').toUpperCase();
        const fb = (oculto) => `<div class="alc-avatar-fb" style="background:${cor}22;color:${cor};${oculto ? 'display:none;' : ''}">${ini}</div>`;
        if (!c.tem_foto) return `<div class="alc-avatar ${tam || ''}" style="border-color:${cor};">${fb(false)}</div>`;
        return `<div class="alc-avatar ${tam || ''}" style="border-color:${cor};"><img src="${fotoUrl(c.id)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">${fb(true)}</div>`;
    }

    // ── Tela principal ───────────────────────────────────────────────────────────
    window.renderAppLiderancaCandidatos = async function () {
        const c = document.getElementById('app-lideranca-candidatos-container');
        if (!c) return;
        if (!S.semanaIni) { S.semanaIni = inicioSemana(hojeIso()); S.mesRef = hojeIso().slice(0, 7); }
        c.innerHTML = `<div class="alc-wrap" id="alc-wrap"><div class="alc-loading"><i class="ph ph-spinner ph-spin"></i> Carregando candidatos...</div></div>`;
        await carregar();
    };

    function inicioSemana(iso) { const d = dataDe(iso); d.setDate(d.getDate() - d.getDay()); return isoDe(d); }

    async function carregar() {
        try {
            S.dados = await api('/app/lideranca/candidatos?hoje=' + encodeURIComponent(hojeIso()));
            desenhar();
            atualizarSino();
        } catch (e) {
            const w = document.getElementById('alc-wrap');
            if (w) w.innerHTML = `<div class="alc-erro"><i class="ph ph-warning-circle"></i><div>${esc(e.message)}</div><button class="alc-btn alc-btn-primary" onclick="window._alcRecarregar()"><i class="ph ph-arrow-clockwise"></i> Tentar de novo</button></div>`;
        }
    }
    window._alcRecarregar = () => window.renderAppLiderancaCandidatos();

    function contagens() {
        const m = {};
        (S.dados.itens || []).forEach(i => {
            const o = m[i.data_teste_1] = m[i.data_teste_1] || { total: 0, pend: 0, hoje: 0 };
            o.total++;
            if (i.pendente) o.pend++;
        });
        return m;
    }

    function desenhar() {
        const w = document.getElementById('alc-wrap');
        if (!w || !S.dados) return;
        const adminBtn = ehAdmin() ? `<button class="alc-icon-btn" onclick="window._alcConfig()" title="Líderes e turno do dia" aria-label="Configurar líderes"><i class="ph ph-gear-six"></i></button>` : '';
        w.innerHTML = `
        <header class="alc-head">
            <button class="alc-icon-btn alc-only-mobile" onclick="window._alcMenu()" aria-label="Menu do sistema"><i class="ph ph-list"></i></button>
            <div class="alc-head-title"><i class="ph ph-users-three"></i><div><h2>Candidatos</h2><span>Liderança · 1º dia de teste</span></div></div>
            <button class="alc-icon-btn" id="alc-sino" onclick="window._alcSino()" title="Avisos no celular" aria-label="Avisos no celular"><i class="ph ph-bell-simple"></i></button>
            ${adminBtn}
            <button class="alc-icon-btn" onclick="window._alcRecarregar()" title="Atualizar" aria-label="Atualizar"><i class="ph ph-arrow-clockwise"></i></button>
        </header>
        ${htmlAgenda()}
        <div id="alc-lista">${htmlLista()}</div>`;
    }

    function htmlAgenda() {
        const cont = contagens();
        const hoje = hojeIso();
        let corpo = '';
        let titulo = '';
        if (S.modo === 'semana') {
            const ini = dataDe(S.semanaIni);
            const fim = new Date(ini); fim.setDate(fim.getDate() + 6);
            titulo = `${pad(ini.getDate())}/${pad(ini.getMonth() + 1)} – ${pad(fim.getDate())}/${pad(fim.getMonth() + 1)}`;
            let dias = '';
            for (let k = 0; k < 7; k++) {
                const d = new Date(ini); d.setDate(d.getDate() + k);
                dias += celulaDia(isoDe(d), cont, hoje, false);
            }
            corpo = `<div class="alc-semana">${dias}</div>`;
        } else {
            const [y, m] = S.mesRef.split('-').map(Number);
            titulo = MESES[m - 1] + ' ' + y;
            const primeiro = new Date(y, m - 1, 1);
            const ultimoDia = new Date(y, m, 0).getDate();
            let cel = DIAS.map(d => `<div class="alc-mes-dow">${d[0]}</div>`).join('');
            for (let i = 0; i < primeiro.getDay(); i++) cel += '<div></div>';
            for (let dd = 1; dd <= ultimoDia; dd++) cel += celulaDia(y + '-' + pad(m) + '-' + pad(dd), cont, hoje, true);
            corpo = `<div class="alc-mes">${cel}</div>`;
        }
        return `<section class="alc-agenda">
            <div class="alc-agenda-top">
                <button class="alc-icon-btn sm" onclick="window._alcNav(-1)" aria-label="Anterior"><i class="ph ph-caret-left"></i></button>
                <div class="alc-agenda-titulo"><i class="ph ph-calendar-dots"></i> ${esc(titulo)}</div>
                <button class="alc-icon-btn sm" onclick="window._alcNav(1)" aria-label="Próximo"><i class="ph ph-caret-right"></i></button>
                <button class="alc-chip ${S.modo === 'mes' ? 'on' : ''}" onclick="window._alcModo()"><i class="ph ph-calendar-blank"></i> ${S.modo === 'mes' ? 'Semana' : 'Mês'}</button>
                <button class="alc-chip" onclick="window._alcHoje()"><i class="ph ph-sun"></i> Hoje</button>
            </div>
            ${corpo}
            ${S.diaSel ? `<button class="alc-filtro" onclick="window._alcDia('${S.diaSel}')"><i class="ph ph-funnel-x"></i> Mostrando ${esc(fmtCurta(S.diaSel))} — toque para ver todos</button>` : ''}
        </section>`;
    }

    function celulaDia(iso, cont, hoje, mes) {
        const c = cont[iso];
        const d = dataDe(iso);
        const cls = ['alc-dia', iso === hoje ? 'hoje' : '', iso === S.diaSel ? 'sel' : '', c ? 'tem' : '', c && c.pend ? 'pend' : ''].join(' ');
        const badge = c ? `<span class="alc-dia-badge ${c.pend ? 'red' : ''}">${c.total}</span>` : '';
        return `<button class="${cls}" onclick="window._alcDia('${iso}')" aria-label="${esc(fmtCurta(iso))}">
            ${mes ? '' : `<span class="alc-dia-dow">${DIAS[d.getDay()]}</span>`}<span class="alc-dia-num">${d.getDate()}</span>${badge}</button>`;
    }

    function htmlLista() {
        let itens = S.dados.itens || [];
        if (S.diaSel) itens = itens.filter(i => i.data_teste_1 === S.diaSel);
        if (!itens.length) {
            return `<div class="alc-vazio"><i class="ph ph-calendar-x"></i><div>${S.diaSel ? 'Nenhum teste agendado neste dia.' : 'Nenhum candidato com 1º dia de teste agendado.'}</div></div>`;
        }
        const grupos = [
            { id: 'pendente', titulo: 'Pendentes — você estava de plantão', icone: 'ph-warning-circle', cor: '#dc2626', f: i => i.pendente },
            { id: 'hoje', titulo: 'Hoje', icone: 'ph-sun', cor: '#2563eb', f: i => !i.pendente && i.situacao === 'hoje' },
            { id: 'futuro', titulo: 'Próximos', icone: 'ph-calendar-check', cor: '#475569', f: i => !i.pendente && i.situacao === 'futuro' },
            { id: 'passado', titulo: 'Dias anteriores', icone: 'ph-clock-counter-clockwise', cor: '#64748b', f: i => !i.pendente && i.situacao === 'passado' },
            { id: 'respondido', titulo: 'Respondidos', icone: 'ph-check-circle', cor: '#16a34a', f: i => i.situacao === 'respondido' }
        ];
        return grupos.map(g => {
            const l = itens.filter(g.f);
            if (!l.length) return '';
            return `<section class="alc-grupo"><h3 style="color:${g.cor};"><i class="ph ${g.icone}"></i> ${esc(g.titulo)} <span class="alc-contador" style="background:${g.cor};">${l.length}</span></h3>${l.map(cardHtml).join('')}</section>`;
        }).join('');
    }

    function badgeSituacao(i) {
        if (i.situacao === 'respondido') return '<span class="alc-badge verde"><i class="ph ph-check-circle"></i> Respondido</span>';
        if (i.pendente) return '<span class="alc-badge vermelho"><i class="ph ph-warning-circle"></i> Pendente</span>';
        if (i.situacao === 'hoje') return '<span class="alc-badge azul"><i class="ph ph-sun"></i> Hoje</span>';
        if (i.situacao === 'passado') return '<span class="alc-badge cinza"><i class="ph ph-clock-counter-clockwise"></i> Passou</span>';
        return '<span class="alc-badge cinza"><i class="ph ph-calendar-check"></i> Agendado</span>';
    }

    function avatarMotorista(nome, url, px) {
        px = px || 22;
        const ini = esc((nome || '?').trim()[0] || '?').toUpperCase();
        const fbStyle = `width:${px}px;height:${px}px;border-radius:50%;background:#eef3e3;color:#3f5221;border:1.5px solid #b8c996;display:inline-flex;align-items:center;justify-content:center;font-size:${Math.round(px * 0.5)}px;font-weight:700;flex-shrink:0;`;
        if (!url) return `<span style="${fbStyle}">${ini}</span>`;
        return `<img src="${esc(url)}" alt="" loading="lazy" style="width:${px}px;height:${px}px;border-radius:50%;object-fit:cover;border:1.5px solid #556b2f;flex-shrink:0;" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'"><span style="${fbStyle}display:none;">${ini}</span>`;
    }

    function cardHtml(i) {
        const pct = i.checklist.total ? Math.round(i.checklist.feitos * 100 / i.checklist.total) : 0;
        const ck = i.respondido ? '' : (i.checklist.concluido
            ? '<span class="alc-badge verde"><i class="ph ph-list-checks"></i> Checklist ok</span>'
            : (i.checklist.feitos ? `<span class="alc-badge laranja"><i class="ph ph-list-checks"></i> ${i.checklist.feitos}/${i.checklist.total}</span>` : ''));
        const cnh = i.cnh_categoria ? `<span class="alc-badge cinza"><i class="ph ph-identification-card"></i> CNH ${esc(i.cnh_categoria)}</span>` : '';
        const mot = i.motorista_vinculado
            ? `<div class="alc-card-mot" style="display:flex;align-items:center;gap:6px;font-size:0.8rem;font-weight:600;color:#3f5221;background:#f4f7ed;border:1px solid #b8c996;border-radius:999px;padding:3px 10px 3px 4px;margin-top:4px;width:fit-content;max-width:100%;">${avatarMotorista(i.motorista_vinculado, i.motorista_foto_url, 22)} <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Motorista: <b>${esc(i.motorista_vinculado)}</b></span></div>`
            : `<div class="alc-card-mot" style="display:flex;align-items:center;gap:5px;font-size:0.76rem;font-weight:500;color:#64748b;margin-top:3px;"><i class="ph ph-steering-wheel" style="color:#94a3b8;font-size:0.9rem;flex-shrink:0;"></i> <span>Sem motorista vinculado</span></div>`;
        return `<button class="alc-card ${i.pendente ? 'pend' : ''}" onclick="window._alcAbrir(${i.id})">
            ${avatar(i)}
            <div class="alc-card-corpo">
                <div class="alc-card-nome">${esc(i.nome)}</div>
                <div class="alc-card-linha"><span class="alc-tipo" style="color:${tipoCor(i.tipo)};"><i class="ph ${tipoIcone(i.tipo)}"></i> ${esc(tipoRotulo(i.tipo))}</span>
                    <span class="alc-data"><i class="ph ph-calendar-blank"></i> ${esc(fmtCurta(i.data_teste_1))}</span></div>
                ${mot}
                <div class="alc-card-badges">${badgeSituacao(i)}${ck}${cnh}</div>
                ${(!i.respondido && i.checklist.feitos) ? `<div class="alc-barra"><i style="width:${pct}%;"></i></div>` : ''}
            </div>
            <i class="ph ph-caret-right alc-card-seta"></i>
        </button>`;
    }

    // ── Navegação da agenda ─────────────────────────────────────────────────────
    window._alcNav = function (dir) {
        if (S.modo === 'semana') { const d = dataDe(S.semanaIni); d.setDate(d.getDate() + 7 * dir); S.semanaIni = isoDe(d); }
        else { const [y, m] = S.mesRef.split('-').map(Number); const d = new Date(y, m - 1 + dir, 1); S.mesRef = d.getFullYear() + '-' + pad(d.getMonth() + 1); }
        desenhar();
    };
    window._alcModo = function () {
        S.modo = S.modo === 'semana' ? 'mes' : 'semana';
        S.mesRef = (S.diaSel || S.semanaIni).slice(0, 7);
        desenhar();
    };
    window._alcHoje = function () { S.semanaIni = inicioSemana(hojeIso()); S.mesRef = hojeIso().slice(0, 7); S.diaSel = null; desenhar(); };
    window._alcDia = function (iso) { S.diaSel = S.diaSel === iso ? null : iso; desenhar(); };

    // ── Modo celular (tela cheia dentro do sistema) ─────────────────────────────
    window._alcMenu = function () { document.body.classList.toggle('app-rail-open'); };
    function aplicarModoCelular() {
        const ativo = !!document.querySelector('[id^="view-app-lideranca-"].active');
        document.body.classList.toggle('app-mobile-on', ativo && window.innerWidth <= 768);
        if (!ativo) document.body.classList.remove('app-rail-open');
    }
    window.addEventListener('resize', aplicarModoCelular);
    document.addEventListener('DOMContentLoaded', function () {
        const v = document.getElementById('view-app-lideranca-candidatos');
        if (v) new MutationObserver(aplicarModoCelular).observe(v, { attributes: true, attributeFilter: ['class'] });
        aplicarModoCelular();
    });
    document.addEventListener('click', function (e) {
        if (document.body.classList.contains('app-rail-open') && !e.target.closest('#app-sidebar') && !e.target.closest('.alc-icon-btn')) document.body.classList.remove('app-rail-open');
    });

    // ═══ Detalhe do candidato (tela cheia) ═══════════════════════════════════════
    function overlay() {
        let o = document.getElementById('alc-overlay');
        if (!o) { o = document.createElement('div'); o.id = 'alc-overlay'; o.className = 'alc-overlay'; document.body.appendChild(o); }
        document.body.classList.add('alc-no-scroll');
        return o;
    }
    function fecharOverlay() {
        pararGravacao(true);
        const o = document.getElementById('alc-overlay');
        if (o) o.remove();
        document.body.classList.remove('alc-no-scroll');
    }
    window._alcFechar = async function () {
        await salvarAgora();
        fecharOverlay();
        carregar();
    };

    window._alcAbrir = async function (id) {
        const o = overlay();
        o.innerHTML = `<div class="alc-loading" style="margin-top:30vh;"><i class="ph ph-spinner ph-spin"></i> Abrindo...</div>`;
        try {
            const d = await api('/app/lideranca/candidatos/' + id);
            S.det = d;
            S.estado = {};
            Object.keys(d.checklist.estado || {}).forEach(k => { S.estado[k] = Object.assign({}, d.checklist.estado[k]); });
            S.cnh = d.cnh_categoria || null;
            S.resp = {}; S.audioBlob = null; S.audioUrl = null; S.saveEstado = 'ok';
            S.step = d.avaliacao ? 0 : (d.checklist.concluido ? 2 : 1);
            desenharDetalhe();
        } catch (e) { fecharOverlay(); erro('Não foi possível abrir', e.message); }
    };

    function cabecalhoDetalhe() {
        const d = S.det;
        const c = { id: d.id, nome: d.nome, tipo: d.tipo, tem_foto: true };
        const cnh = d.eh_motorista && S.cnh ? `<span class="alc-badge cinza"><i class="ph ph-identification-card"></i> CNH ${esc(S.cnh)}</span>` : '';
        const mot = d.motorista_vinculado
            ? `<span class="alc-badge" style="background:#f4f7ed;color:#3f5221;border:1px solid #b8c996;padding-left:4px;gap:5px;">${avatarMotorista(d.motorista_vinculado, d.motorista_foto_url, 18)} Mot.: ${esc(d.motorista_vinculado)}</span>`
            : `<span class="alc-badge cinza"><i class="ph ph-steering-wheel"></i> Sem motorista</span>`;
        return `<header class="alc-det-head">
            <button class="alc-icon-btn" onclick="window._alcFechar()" aria-label="Voltar"><i class="ph ph-arrow-left"></i></button>
            ${avatar(c, 'sm')}
            <div class="alc-det-id"><div class="alc-det-nome">${esc(d.nome)}</div>
                <div class="alc-card-badges"><span class="alc-badge" style="background:${tipoCor(d.tipo)}18;color:${tipoCor(d.tipo)};"><i class="ph ${tipoIcone(d.tipo)}"></i> ${esc(tipoRotulo(d.tipo))}</span>${cnh}
                <span class="alc-badge cinza"><i class="ph ph-calendar-blank"></i> ${esc(fmtCurta(d.data_teste_1))}</span>${mot}</div></div>
            <span class="alc-salvo" id="alc-salvo"></span>
        </header>`;
    }
    function stepper() {
        const passos = [{ n: 1, i: 'ph-list-checks', t: 'Checklist' }, { n: 2, i: 'ph-chat-centered-dots', t: 'Perguntas' }, { n: 3, i: 'ph-microphone', t: 'Áudio' }];
        const ckOk = feitosCount() === S.det.itens.length;
        return `<nav class="alc-steps">${passos.map(p => {
            const estado = S.step === p.n ? 'on' : (p.n < S.step ? 'ok' : '');
            const bloqueado = (p.n > 1 && !ckOk) || (p.n === 3 && !todasRespondidas());
            return `<button class="alc-step ${estado}" ${bloqueado ? 'disabled' : ''} onclick="window._alcPasso(${p.n})"><span class="alc-step-bola"><i class="ph ${p.n < S.step ? 'ph-check' : p.i}"></i></span><span>${p.t}</span></button>`;
        }).join('<span class="alc-step-linha"></span>')}</nav>`;
    }
    const feitosCount = () => S.det.itens.filter(i => S.estado[i.id] && (S.estado[i.id].ok || S.estado[i.id].nao)).length; // avaliados: feito (✓) ou não feito (✕)
    const naoFeitosCount = () => S.det.itens.filter(i => S.estado[i.id] && S.estado[i.id].nao && !S.estado[i.id].ok).length;
    const todasRespondidas = () => S.det.perguntas.every((_, i) => S.resp[i] >= 1);
    const cnhOk = () => !S.det.eh_motorista || !!S.cnh;

    function desenharDetalhe() {
        const o = overlay();
        const d = S.det;
        let corpo = '', barra = '';
        if (S.step === 0) { corpo = htmlResumo(); barra = `<button class="alc-btn alc-btn-primary full" onclick="window._alcFechar()"><i class="ph ph-arrow-left"></i> Voltar à lista</button>`; }
        else if (S.step === 1) { corpo = htmlChecklist(); barra = barraChecklist(); }
        else if (S.step === 2) { corpo = htmlPerguntas(); barra = barraPerguntas(); }
        else { corpo = htmlAudio(); barra = barraAudio(); }
        o.innerHTML = `<div class="alc-det">${cabecalhoDetalhe()}${S.step === 0 ? '' : stepper()}<div class="alc-det-corpo" id="alc-det-corpo">${corpo}</div><footer class="alc-det-barra" id="alc-det-barra">${barra}</footer></div>`;
        mostrarSalvo();
    }
    window._alcPasso = async function (n) {
        if (n > 1 && feitosCount() < S.det.itens.length) return;
        if (n === 3 && !todasRespondidas()) return;
        if (S.step === 1) await salvarAgora();
        if (n === 2 && !cnhOk()) return;
        pararGravacao(true);
        S.step = n;
        desenharDetalhe();
        const c = document.getElementById('alc-det-corpo'); if (c) c.scrollTop = 0;
    };

    // ── Etapa 1: checklist ──────────────────────────────────────────────────────
    function htmlChecklist() {
        const d = S.det, total = d.itens.length, feitos = feitosCount();
        const pct = Math.round(feitos * 100 / total);
        const linhas = d.itens.map((it, idx) => {
            const e = S.estado[it.id] || {};
            const ok = !!e.ok;
            const nao = !!e.nao && !ok;
            let extra = '';
            if (it.cnh) {
                extra = d.cnh_fixa
                    ? `<div class="alc-cnh"><i class="ph ph-identification-card"></i> Categoria da CNH do candidato: <b>${esc(S.cnh)}</b></div>`
                    : `<div class="alc-cnh"><i class="ph ph-identification-card"></i> Categoria da CNH:
                        <button class="alc-cnh-op ${S.cnh === 'B' ? 'on' : ''}" onclick="event.stopPropagation();window._alcCnh('B')">B</button>
                        <button class="alc-cnh-op ${S.cnh === 'D' ? 'on' : ''}" onclick="event.stopPropagation();window._alcCnh('D')">D</button></div>`;
            }
            const obsAberta = e.obsAberta || (e.obs && e.obs.length);
            return `<div class="alc-item ${ok ? 'ok' : (nao ? 'nao' : '')}">
                <div class="alc-item-linha" onclick="window._alcToggle(${it.id})" role="button" tabindex="0">
                    <span class="alc-item-ico"><i class="ph ${esc(it.icone || 'ph-check')}"></i></span>
                    <span class="alc-item-txt"><small>${idx + 1}</small> ${esc(it.texto)}</span>
                    <button class="alc-item-nota ${e.obs ? 'tem' : ''}" onclick="event.stopPropagation();window._alcObs(${it.id})" aria-label="Observação"><i class="ph ph-note-pencil"></i></button>
                    <button class="alc-check-nao ${nao ? 'on' : ''}" onclick="event.stopPropagation();window._alcNao(${it.id})" aria-label="Não feito" title="Não feito"><i class="ph-bold ph-x"></i></button>
                    <span class="alc-check ${ok ? 'on' : ''}" title="Feito"><i class="ph ${ok ? 'ph-check' : 'ph-circle'}"></i></span>
                </div>
                ${extra}
                ${obsAberta ? `<textarea class="alc-obs" rows="2" placeholder="Observação (opcional)" oninput="window._alcObsTxt(${it.id}, this.value)">${esc(e.obs || '')}</textarea>` : ''}
            </div>`;
        }).join('');
        return `<div class="alc-prog"><div class="alc-prog-txt"><b>${feitos}/${total}</b> itens avaliados <span>${pct}%</span>${naoFeitosCount() ? ` <em class="alc-prog-nao"><i class="ph-bold ph-x"></i> ${naoFeitosCount()} não feito${naoFeitosCount() > 1 ? 's' : ''}</em>` : ''}</div><div class="alc-barra grande"><i style="width:${pct}%;"></i></div></div>
            <p class="alc-dica"><i class="ph ph-hand-tap"></i> Marque <b>✓</b> no que você <b>ensinou</b> ou <b>✕</b> no que <b>não foi feito</b>.</p>
            <div class="alc-itens">${linhas}</div>`;
    }
    function barraChecklist() {
        const falta = S.det.itens.length - feitosCount();
        const cnhFalta = !cnhOk();
        const podeSeguir = falta === 0 && !cnhFalta;
        return `<button class="alc-btn alc-btn-sec" onclick="window._alcMarcarTodos()"><i class="ph ph-checks"></i> Marcar todos</button>
            <button class="alc-btn alc-btn-primary grow" ${podeSeguir ? '' : 'disabled'} onclick="window._alcPasso(2)">${podeSeguir ? 'Continuar' : (cnhFalta && !falta ? 'Escolha a CNH' : 'Faltam ' + falta)} <i class="ph ph-arrow-right"></i></button>`;
    }
    function atualizarBarraEChecklist(manterScroll) {
        const c = document.getElementById('alc-det-corpo');
        const sc = c ? c.scrollTop : 0;
        desenharDetalhe();
        const c2 = document.getElementById('alc-det-corpo');
        if (c2 && manterScroll) c2.scrollTop = sc;
    }
    window._alcToggle = function (id) {
        const e = S.estado[id] = S.estado[id] || {};
        e.ok = !e.ok;
        if (e.ok) e.nao = false; // ✓ e ✕ não podem ficar marcados juntos
        e.em = new Date().toISOString();
        if (navigator.vibrate) try { navigator.vibrate(15); } catch (x) { /* ignora */ }
        agendarSalvar(); atualizarBarraEChecklist(true);
    };
    window._alcNao = function (id) {
        const e = S.estado[id] = S.estado[id] || {};
        e.nao = !e.nao;
        if (e.nao) e.ok = false; // ✓ e ✕ não podem ficar marcados juntos
        e.em = new Date().toISOString();
        if (navigator.vibrate) try { navigator.vibrate(15); } catch (x) { /* ignora */ }
        agendarSalvar(); atualizarBarraEChecklist(true);
    };
    window._alcMarcarTodos = function () {
        // marca como feito somente o que ainda não foi avaliado (mantém os ✕ já marcados)
        S.det.itens.forEach(it => { const e = S.estado[it.id] = S.estado[it.id] || {}; if (e.nao && !e.ok) return; e.ok = true; e.nao = false; e.em = e.em || new Date().toISOString(); });
        agendarSalvar(); atualizarBarraEChecklist(true);
    };
    window._alcObs = function (id) {
        const e = S.estado[id] = S.estado[id] || {};
        e.obsAberta = !e.obsAberta;
        atualizarBarraEChecklist(true);
    };
    window._alcObsTxt = function (id, v) { const e = S.estado[id] = S.estado[id] || {}; e.obs = v; agendarSalvar(); };
    window._alcCnh = function (c) { S.cnh = c; agendarSalvar(); atualizarBarraEChecklist(true); };

    function estadoParaEnvio() {
        const itens = {};
        Object.keys(S.estado).forEach(k => { const e = S.estado[k]; itens[k] = { ok: !!e.ok, nao: !!e.nao && !e.ok, obs: e.obs || '', em: e.em }; });
        return { itens, cnh_categoria: S.cnh };
    }
    function agendarSalvar() {
        S.saveEstado = 'pendente'; mostrarSalvo();
        clearTimeout(S.saveTimer);
        S.saveTimer = setTimeout(salvarAgora, 600);
    }
    async function salvarAgora() {
        clearTimeout(S.saveTimer); S.saveTimer = null;
        if (!S.det || S.saveEstado === 'ok' || S.det.avaliacao) return;
        S.saveEstado = 'salvando'; mostrarSalvo();
        try {
            await api('/app/lideranca/candidatos/' + S.det.id + '/checklist', { method: 'PUT', body: JSON.stringify(estadoParaEnvio()) });
            if (!S.saveTimer) S.saveEstado = 'ok';
        } catch (e) { S.saveEstado = 'erro'; S.saveMsg = e.message; }
        mostrarSalvo();
    }
    function mostrarSalvo() {
        const el = document.getElementById('alc-salvo');
        if (!el) return;
        const m = { ok: ['ph-cloud-check', '#16a34a', 'Salvo'], pendente: ['ph-cloud-arrow-up', '#d97706', ''], salvando: ['ph-spinner ph-spin', '#d97706', ''], erro: ['ph-cloud-warning', '#dc2626', 'Erro'] }[S.saveEstado] || ['ph-cloud-check', '#16a34a', 'Salvo'];
        el.innerHTML = `<i class="ph ${m[0]}" style="color:${m[1]};"></i>${m[2] ? '<small>' + m[2] + '</small>' : ''}`;
        el.title = S.saveEstado === 'erro' ? (S.saveMsg || 'Não foi possível salvar') : '';
    }

    // ── Etapa 2: perguntas ──────────────────────────────────────────────────────
    function htmlPerguntas() {
        const d = S.det, total = d.perguntas.length;
        const feitas = d.perguntas.filter((_, i) => S.resp[i] >= 1).length;
        const pct = Math.round(feitas * 100 / total);
        const qs = d.perguntas.map((q, i) => `<div class="alc-pergunta ${S.resp[i] ? 'resp' : ''}" id="alc-q${i}">
            <div class="alc-q-txt"><span class="alc-q-n">${i + 1}</span>${esc(q)}</div>
            <div class="alc-faces">${FACES.map(f => `<button class="alc-face ${S.resp[i] === f.v ? 'on' : ''}" style="--fc:${f.c};" onclick="window._alcResp(${i},${f.v})" aria-label="Nota ${f.v} - ${f.t}"><span class="e">${f.e}</span><span class="n">${f.v}</span></button>`).join('')}</div>
        </div>`).join('');
        return `<div class="alc-prog"><div class="alc-prog-txt"><b>${feitas}/${total}</b> respondidas <span>${pct}%</span></div><div class="alc-barra grande"><i style="width:${pct}%;"></i></div></div>
            <p class="alc-dica"><i class="ph ph-hand-tap"></i> Toque na carinha que representa o desempenho do candidato (1 a 5).</p>
            <div class="alc-perguntas">${qs}</div>`;
    }
    function barraPerguntas() {
        const falta = S.det.perguntas.filter((_, i) => !(S.resp[i] >= 1)).length;
        return `<button class="alc-btn alc-btn-sec" onclick="window._alcPasso(1)"><i class="ph ph-arrow-left"></i> Checklist</button>
            <button class="alc-btn alc-btn-primary grow" ${falta ? 'disabled' : ''} onclick="window._alcPasso(3)">${falta ? 'Faltam ' + falta : 'Continuar'} <i class="ph ph-arrow-right"></i></button>`;
    }
    window._alcResp = function (i, v) {
        S.resp[i] = v;
        const c = document.getElementById('alc-det-corpo');
        const sc = c ? c.scrollTop : 0;
        desenharDetalhe();
        const c2 = document.getElementById('alc-det-corpo'); if (c2) c2.scrollTop = sc;
        const prox = S.det.perguntas.findIndex((_, k) => k > i && !(S.resp[k] >= 1));
        if (prox >= 0) setTimeout(() => { const el = document.getElementById('alc-q' + prox); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 180);
    };

    // ── Etapa 3: áudio + envio ──────────────────────────────────────────────────
    function htmlAudio() {
        const tem = !!S.audioBlob;
        const gravando = !!S.rec;
        const tempo = `${pad(Math.floor(S.recSeg / 60))}:${pad(S.recSeg % 60)}`;
        return `<div class="alc-audio">
            <div class="alc-audio-ico"><i class="ph ph-microphone-stage"></i></div>
            <h3>Áudio obrigatório</h3>
            <p>Grave um áudio contando como foi o dia de teste: <b>pontos de atenção, elogios e observações</b>.</p>
            <button class="alc-rec ${gravando ? 'gravando' : ''}" onclick="window._alcGravar()" aria-label="${gravando ? 'Parar gravação' : 'Gravar áudio'}"><i class="ph ${gravando ? 'ph-stop' : 'ph-microphone'}"></i></button>
            <div class="alc-rec-tempo" id="alc-rec-tempo">${gravando ? '🔴 Gravando… ' + tempo : (tem ? '✅ Áudio gravado (' + tempo + ')' : 'Toque no microfone para gravar')}</div>
            ${tem ? `<audio controls src="${S.audioUrl}" class="alc-player"></audio><button class="alc-btn alc-btn-sec" onclick="window._alcRegravar()"><i class="ph ph-arrow-counter-clockwise"></i> Gravar de novo</button>` : ''}
        </div>`;
    }
    function barraAudio() {
        return `<button class="alc-btn alc-btn-sec" onclick="window._alcPasso(2)"><i class="ph ph-arrow-left"></i> Perguntas</button>
            <button class="alc-btn alc-btn-ok grow" ${S.audioBlob && !S.rec ? '' : 'disabled'} onclick="window._alcEnviar()"><i class="ph ph-paper-plane-tilt"></i> Enviar avaliação</button>`;
    }
    window._alcGravar = async function () {
        if (S.rec) { pararGravacao(false); return; }
        if (!navigator.mediaDevices || !window.MediaRecorder) return erro('Gravação indisponível', 'Este navegador não permite gravar áudio. Abra o sistema no Chrome (Android) ou Safari (iPhone).');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(m => window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m));
            const chunks = [];
            const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
            rec.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                if (S._cancelaRec) { S._cancelaRec = false; return; }
                S.audioBlob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
                if (S.audioUrl) URL.revokeObjectURL(S.audioUrl);
                S.audioUrl = URL.createObjectURL(S.audioBlob);
                S.rec = null; clearInterval(S.recTimer);
                if (S.step === 3) desenharDetalhe();
            };
            S.recSeg = 0; S.audioBlob = null; S.rec = rec;
            rec.start();
            S.recTimer = setInterval(() => { S.recSeg++; const t = document.getElementById('alc-rec-tempo'); if (t) t.textContent = '🔴 Gravando… ' + pad(Math.floor(S.recSeg / 60)) + ':' + pad(S.recSeg % 60); }, 1000);
            desenharDetalhe();
        } catch (e) { S.rec = null; erro('Microfone bloqueado', 'Permita o uso do microfone nas configurações do navegador e tente de novo.'); }
    };
    function pararGravacao(cancelar) {
        if (S.rec) { S._cancelaRec = !!cancelar; try { S.rec.stop(); } catch (e) { /* já parado */ } S.rec = null; }
        clearInterval(S.recTimer);
    }
    window._alcRegravar = function () { S.audioBlob = null; if (S.audioUrl) URL.revokeObjectURL(S.audioUrl); S.audioUrl = null; desenharDetalhe(); };

    window._alcEnviar = async function () {
        const d = S.det;
        if (!todasRespondidas()) return erro('Faltam respostas', 'Responda todas as perguntas.');
        if (!S.audioBlob) return erro('Áudio obrigatório', 'Grave o áudio antes de enviar.');
        const conf = await Swal.fire({ icon: 'question', title: 'Enviar avaliação?', html: `Depois de enviada, o RH verá as respostas de <b>${esc(d.nome)}</b> e não será possível alterar.`, showCancelButton: true, confirmButtonText: 'Enviar', cancelButtonText: 'Voltar', confirmButtonColor: '#16a34a' });
        if (!conf.isConfirmed) return;
        Swal.fire({ title: 'Enviando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            await salvarAgora();
            const fd = new FormData();
            const resp = {}; d.perguntas.forEach((_, i) => { resp[i] = S.resp[i]; });
            fd.append('respostas', JSON.stringify(resp));
            const ext = /mp4/.test(S.audioBlob.type) ? 'm4a' : 'webm';
            fd.append('audio', S.audioBlob, 'audio.' + ext);
            await api('/app/lideranca/candidatos/' + d.id + '/avaliacao', { method: 'POST', body: fd });
            Swal.close();
            document.getElementById('alc-overlay').innerHTML = `<div class="alc-sucesso"><div class="alc-sucesso-ico"><i class="ph ph-check-circle"></i></div><h2>Avaliação enviada!</h2><p>O RH já pode ver as respostas de <b>${esc(d.nome)}</b>.</p><button class="alc-btn alc-btn-primary full" onclick="window._alcFechar()"><i class="ph ph-arrow-left"></i> Voltar à lista</button></div>`;
            S.det.avaliacao = { respostas: {} };
        } catch (e) { Swal.close(); erro('Não foi possível enviar', e.message); }
    };

    // ── Já respondido: resumo somente leitura ───────────────────────────────────
    function htmlResumo() {
        const d = S.det, av = d.avaliacao || {};
        const media = av.media != null ? Number(av.media).toFixed(1) : '—';
        const itens = d.itens.map(it => { const e = (d.checklist.estado || {})[it.id] || {}; return `<li class="${e.ok ? 'ok' : (e.nao ? 'nao' : '')}"><i class="ph ${e.ok ? 'ph-check-circle' : (e.nao ? 'ph-x-circle' : 'ph-circle')}"></i><span>${esc(it.texto)}${e.obs ? ' <em>— ' + esc(e.obs) + '</em>' : ''}</span></li>`; }).join('');
        const qs = d.perguntas.map((q, i) => { const n = (av.respostas || {})[i]; const f = FACES.find(x => x.v === n); return `<li><span>${esc(q)}</span><b style="color:${f ? f.c : '#64748b'};">${f ? f.e : ''} ${n || '—'}</b></li>`; }).join('');
        return `<div class="alc-resumo">
            <div class="alc-resumo-topo"><i class="ph ph-check-circle"></i><div><b>Avaliação enviada</b><small>${esc(av.avaliador_nome || '')} · ${esc(fmtDataHora(av.created_at))}</small></div><span class="alc-media">Média ${esc(media)}</span></div>
            <h4><i class="ph ph-list-checks"></i> Checklist (${d.checklist.feitos}/${d.checklist.total}${d.checklist.nao_feitos ? ' · ' + d.checklist.nao_feitos + ' não feito' + (d.checklist.nao_feitos > 1 ? 's' : '') : ''})</h4><ul class="alc-res-lista chk">${itens}</ul>
            <h4><i class="ph ph-chat-centered-dots"></i> Perguntas do 1º dia</h4><ul class="alc-res-lista qs">${qs}</ul></div>`;
    }

    // ═══ Líderes e turno do dia (Diretoria/Administrador) ═══════════════════════
    window._alcConfig = async function () {
        let cfg;
        try { cfg = await api('/app/lideranca/config'); } catch (e) { return erro('Erro', e.message); }
        const linhas = cfg.lideres.map(l => `<div class="alc-cfg-linha">
            <div class="alc-cfg-nome"><i class="ph ph-user-circle"></i> ${esc(l.nome_completo)}</div>
            <select class="alc-cfg-sel" onchange="window._alcCfgSalvar(${l.colaborador_id}, {usuario_id: this.value || null})"><option value="">Sem usuário</option>${cfg.usuarios.map(u => `<option value="${u.id}" ${u.id === l.usuario_id ? 'selected' : ''}>${esc(u.nome)}</option>`).join('')}</select>
            <label class="alc-cfg-sw"><input type="checkbox" ${l.plantao_dia ? 'checked' : ''} onchange="window._alcCfgSalvar(${l.colaborador_id}, {plantao_dia: this.checked})"><span><i class="ph ph-sun"></i> Turno do dia (faz teste)</span></label>
        </div>`).join('');
        Swal.fire({ title: 'Líderes e turno do dia', width: 640, html: `<p class="alc-cfg-info">Só os líderes com <b>turno do dia</b>, fora de folga e com usuário vinculado recebem o aviso das 07h e veem a pendência dos testes.</p><div class="alc-cfg">${linhas || '<p>Nenhum líder encontrado no departamento Líderes.</p>'}</div>`, confirmButtonText: 'Fechar', confirmButtonColor: '#556b2f' }).then(() => carregar());
    };
    window._alcCfgSalvar = async function (colabId, corpo) {
        try { await api('/app/lideranca/config/' + colabId, { method: 'PUT', body: JSON.stringify(corpo) }); }
        catch (e) { erro('Erro ao salvar', e.message); }
    };

    // ═══ Avisos no celular (PWA + Web Push) ═════════════════════════════════════
    const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const ehInstalado = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const urlB64 = b => { const p = '='.repeat((4 - b.length % 4) % 4); const s = (b + p).replace(/-/g, '+').replace(/_/g, '/'); const r = atob(s); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
    const pushSuportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

    async function estadoPush() {
        if (!pushSuportado()) return 'indisponivel';
        if (Notification.permission === 'denied') return 'bloqueado';
        try {
            const reg = await navigator.serviceWorker.getRegistration('/app-lideranca-sw.js') || await navigator.serviceWorker.getRegistration();
            const sub = reg && await reg.pushManager.getSubscription();
            return sub && Notification.permission === 'granted' ? 'ativo' : 'inativo';
        } catch (e) { return 'inativo'; }
    }
    async function atualizarSino() {
        const el = document.getElementById('alc-sino');
        if (!el) return;
        const st = await estadoPush();
        const map = { ativo: ['ph-bell-ringing', 'on'], inativo: ['ph-bell-slash', 'off'], bloqueado: ['ph-bell-slash', 'off'], indisponivel: ['ph-bell-slash', 'off'] }[st];
        el.className = 'alc-icon-btn ' + map[1];
        el.innerHTML = `<i class="ph ${map[0]}"></i>`;
    }
    window._alcSino = async function () {
        const st = await estadoPush();
        if (st === 'indisponivel') {
            const ios = ehIOS();
            return Swal.fire({ icon: 'info', title: 'Avisos indisponíveis aqui', confirmButtonColor: '#556b2f',
                html: ios && !ehInstalado()
                    ? '<div style="text-align:left;line-height:1.7">No <b>iPhone</b> os avisos só funcionam com o site instalado:<br><i class="ph ph-export"></i> Toque em <b>Compartilhar</b><br><i class="ph ph-plus-square"></i> <b>Adicionar à Tela de Início</b><br><i class="ph ph-device-mobile"></i> Abra pelo ícone e toque no sino de novo.</div>'
                    : 'Este navegador não suporta avisos. No Android use o Chrome.' });
        }
        if (st === 'bloqueado') return Swal.fire({ icon: 'warning', title: 'Avisos bloqueados', html: 'Libere as <b>notificações</b> deste site nas configurações do navegador e toque no sino de novo.', confirmButtonColor: '#556b2f' });
        if (st === 'ativo') {
            const r = await Swal.fire({ icon: 'success', title: 'Avisos ativos neste aparelho', html: 'Você será avisado às <b>07h</b> nos dias em que estiver de plantão e houver teste.', showCancelButton: true, showDenyButton: true, confirmButtonText: '<i class="ph ph-bell-ringing"></i> Testar aviso', denyButtonText: 'Desativar', cancelButtonText: 'Fechar', confirmButtonColor: '#16a34a' });
            if (r.isConfirmed) { try { await api('/app/push/teste', { method: 'POST', body: '{}' }); } catch (e) { erro('Falha no teste', e.message); } }
            else if (r.isDenied) await desativarPush();
            return atualizarSino();
        }
        const r = await Swal.fire({ icon: 'question', title: 'Ativar avisos no celular?', html: 'Receba uma notificação <b>às 07h</b> nos dias em que você estiver de plantão e houver teste de candidato.', showCancelButton: true, confirmButtonText: '<i class="ph ph-bell-ringing"></i> Ativar', cancelButtonText: 'Agora não', confirmButtonColor: '#556b2f' });
        if (r.isConfirmed) await ativarPush();
        atualizarSino();
    };
    async function ativarPush() {
        try {
            if (ehIOS() && !ehInstalado()) throw new Error('No iPhone, adicione o site à Tela de Início e abra pelo ícone para ativar os avisos.');
            const reg = await navigator.serviceWorker.register('/app-lideranca-sw.js');
            await navigator.serviceWorker.ready;
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') throw new Error('Permissão de notificações não concedida.');
            const k = await api('/app/push/key');
            const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(k.publicKey) });
            await api('/app/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) });
            await Swal.fire({ icon: 'success', title: 'Avisos ativados!', text: 'Vamos te avisar às 07h nos dias de teste em que você estiver de plantão.', confirmButtonColor: '#16a34a' });
        } catch (e) { erro('Não foi possível ativar', e.message); }
    }
    async function desativarPush() {
        try {
            const reg = await navigator.serviceWorker.getRegistration('/app-lideranca-sw.js') || await navigator.serviceWorker.getRegistration();
            const sub = reg && await reg.pushManager.getSubscription();
            if (sub) { await api('/app/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
        } catch (e) { erro('Erro', e.message); }
    }

    // ── Abertura direta ao tocar na notificação / ícone instalado (?abrir=...) ──
    (function abrirPorLink() {
        const alvo = new URLSearchParams(location.search).get('abrir');
        if (!alvo) return;
        let n = 0;
        const t = setInterval(function () {
            n++;
            const shell = document.getElementById('app-shell');
            if (shell && shell.classList.contains('active') && typeof window.navigateTo === 'function') {
                clearInterval(t);
                window.navigateTo(alvo);
                try { history.replaceState(null, '', location.pathname); } catch (e) { /* ignora */ }
            } else if (n > 160) clearInterval(t);
        }, 500);
    })();
})();
