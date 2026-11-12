/**
 * academia_lideres.js — Treinamentos › Academia de Líderes (Fase 1)
 *  • Admin  : window.renderAcademiaLideresAdmin  → Dashboard, Trilhas (editor com abas), módulos, aulas, participantes
 *  • Líder  : window.renderAcademiaLideresMinha  → Minha Academia (jornada, módulos, aulas, progresso)
 * Endpoints: /api/acl/*   |   Permissões: 'academia-lideres-admin' e 'academia-lideres-minha'
 * Regra: missões (fases futuras) NUNCA entram no progresso obrigatório.
 */
(function () {
    'use strict';

    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const CARGOS_PUBLICO = ['Líder', 'Supervisor', 'Coordenador', 'Auxiliar', 'Assistente', 'Motorista', 'Ajudante', 'Outros'];
    const STATUS_TXT = { rascunho: 'Rascunho', publicada: 'Publicada', em_andamento: 'Em andamento', encerrada: 'Encerrada', arquivada: 'Arquivada' };
    const STATUS_COR = { rascunho: '#64748b', publicada: '#2563eb', em_andamento: '#16a34a', encerrada: '#dc2626', arquivada: '#94a3b8' };

    const A = { aba: 'dashboard', lista: null, dash: null, t: null, tab: 'visao', modAberto: {}, part: null };
    const M = { dados: null, tid: null, jornada: null };

    // ── Utilidades ───────────────────────────────────────────────────────────────
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const getToken = () => window.currentToken || (typeof currentToken !== 'undefined' ? currentToken : '') || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    const apiBase = () => (typeof API_URL !== 'undefined' ? API_URL : '/api');
    async function api(path, opts) {
        opts = opts || {};
        const headers = Object.assign({ Authorization: 'Bearer ' + getToken() }, opts.headers || {});
        if (opts.body && !(opts.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
        const r = await fetch(apiBase() + path, Object.assign({}, opts, { headers }));
        let b = null; try { b = await r.json(); } catch (e) { /* sem JSON */ }
        if (!r.ok) { const er = new Error((b && b.error) || ('Erro HTTP ' + r.status)); er.status = r.status; er.body = b; throw er; }
        return b;
    }
    const jbody = o => JSON.stringify(o);
    const erro = (t, m) => Swal.fire({ icon: 'error', title: t, text: m, confirmButtonColor: '#7c3aed', confirmButtonText: 'OK' });
    const okMsg = (t) => Swal.fire({ icon: 'success', title: t, timer: 1400, showConfirmButton: false });
    const confirma = (titulo, texto, btn) => Swal.fire({ icon: 'warning', title: titulo, text: texto, showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: btn || 'Confirmar', cancelButtonText: 'Cancelar' }).then(r => r.isConfirmed);
    const fmtBr = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'; };
    const midiaUrl = (aulaId, campo) => apiBase() + '/acl/aulas/' + aulaId + '/midia/' + campo + '?token=' + encodeURIComponent(getToken());
    const avatar = (nome, foto, cls) => {
        const ini = esc((String(nome || '?').trim()[0] || '?').toUpperCase());
        return `<span class="acl-av ${cls || ''}"><span class="acl-av-fb">${ini}</span>${foto ? `<img src="${esc(foto)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}</span>`;
    };
    const demoTag = x => (x && x.demonstracao) ? '<span class="acl-demo">Conteúdo de demonstração</span>' : '';
    const prazoTxt = p => {
        if (!p || p.total_dias == null) return 'Sem prazo definido';
        if (p.situacao === 'encerrada') return `Prazo da trilha: ${p.total_dias} dias · encerrado`;
        if (p.situacao === 'nao_iniciada') return `Prazo da trilha: ${p.total_dias} dias · começa em ${p.restantes} dia(s)`;
        return `Prazo da trilha: ${p.total_dias} dias · ${p.restantes} dia(s) restantes`;
    };
    const barra = (pct, cor) => `<div class="acl-barra"><i style="width:${Math.max(0, Math.min(100, pct))}%;${cor ? 'background:' + cor + ';' : ''}"></i></div>`;
    function raiz(id) { return document.getElementById(id); }
    function carregando(el, txt) { el.innerHTML = `<div class="acl-wrap"><div class="acl-loading"><i class="ph ph-spinner ph-spin"></i> ${esc(txt || 'Carregando...')}</div></div>`; }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    window.renderAcademiaLideresAdmin = async function () {
        const el = raiz('academia-lideres-admin-container'); if (!el) return;
        A.t = null; A.aba = A.aba || 'dashboard';
        carregando(el, 'Carregando Academia...');
        try { await carregarAdmin(); } catch (e) { el.innerHTML = `<div class="acl-wrap"><div class="acl-erro"><i class="ph ph-warning-circle"></i> ${esc(e.message)}</div></div>`; }
    };
    async function carregarAdmin() {
        const [lista, dash] = await Promise.all([api('/acl/trilhas'), api('/acl/dashboard')]);
        A.lista = lista; A.dash = dash; desenharAdmin();
    }
    function topoAdmin() {
        const item = (id, ic, rot, on, soon) => `<button class="acl-nav-btn ${on ? 'on' : ''} ${soon ? 'soon' : ''}" ${soon ? 'disabled title="Disponível nas próximas fases"' : `onclick="window._aclAba('${id}')"`}><i class="ph ${ic}"></i> ${rot}${soon ? '<small>em breve</small>' : ''}</button>`;
        return `<header class="acl-head"><div class="acl-head-t"><i class="ph ph-graduation-cap"></i><div><h2>Academia de Sucesso</h2><span>Desenvolvimento que transforma pessoas em grandes profissionais.</span></div></div></header>
        <nav class="acl-nav">${item('dashboard', 'ph-house', 'Dashboard', A.aba === 'dashboard' && !A.t)}${item('trilhas', 'ph-graduation-cap', 'Trilhas', A.aba === 'trilhas' || !!A.t)}${item('', 'ph-trophy', 'Conquistas', false, 1)}${item('', 'ph-ranking', 'Ranking', false, 1)}${item('', 'ph-certificate', 'Certificados', false, 1)}${item('', 'ph-chart-bar', 'Relatórios', false, 1)}${item('', 'ph-gear', 'Configurações', false, 1)}</nav>`;
    }
    window._aclAba = function (a) { A.aba = a; A.t = null; desenharAdmin(); };
    function desenharAdmin() {
        const el = raiz('academia-lideres-admin-container'); if (!el) return;
        let corpo;
        if (A.t) corpo = htmlEditor();
        else if (A.aba === 'trilhas') corpo = htmlTrilhas();
        else corpo = htmlDashboard();
        el.innerHTML = `<div class="acl-wrap">${topoAdmin()}<div class="acl-corpo">${corpo}</div></div>`;
    }

    function kpi(ic, rot, val, cor) { return `<div class="acl-kpi" style="--c:${cor};"><i class="ph ${ic}"></i><div><b>${val}</b><span>${rot}</span></div></div>`; }
    function htmlDashboard() {
        const d = A.dash;
        const barras = (d.por_trilha || []).map(t => `<div class="acl-bar-linha"><span class="acl-bar-n" title="${esc(t.nome)}">${esc(t.nome)}</span>${barra(t.media, '#7c3aed')}<b>${t.media}%</b><small>${t.participantes} part.</small></div>`).join('')
            || '<div class="acl-vazio-sm">Nenhuma trilha ainda.</div>';
        const total = Math.max(1, d.participantes);
        const seg = (n, cor) => `<i style="width:${Math.round(n * 100 / total)}%;background:${cor};"></i>`;
        return `<div class="acl-kpis">
            ${kpi('ph-users', 'Colaboradores (ativos no sistema)', d.total_colaboradores, '#7c3aed')}
            ${kpi('ph-user-check', 'Participantes ativos', d.ativos, '#2563eb')}
            ${kpi('ph-graduation-cap', 'Trilhas cadastradas', d.trilhas_cadastradas, '#7c3aed')}
            ${kpi('ph-seal-check', 'Concluíram a trilha', d.concluidos, '#16a34a')}
            ${kpi('ph-chart-line-up', 'Conclusão média', d.media_conclusao + '%', '#16a34a')}
            ${kpi('ph-certificate', 'Certificados emitidos', d.certificados_emitidos, '#2563eb')}
            ${kpi('ph-person-simple-run', 'Em desenvolvimento', d.em_desenvolvimento, '#ea580c')}
            ${kpi('ph-hourglass', 'Ainda não iniciaram', d.nao_iniciaram, '#64748b')}
        </div>
        <div class="acl-card"><h3><i class="ph ph-chart-bar"></i> Conclusão média por trilha</h3>${barras}</div>
        <div class="acl-card"><h3><i class="ph ph-chart-donut"></i> Situação dos participantes</h3>
            <div class="acl-stack">${seg(d.concluidos, '#16a34a')}${seg(d.em_desenvolvimento, '#7c3aed')}${seg(d.nao_iniciaram, '#cbd5e1')}</div>
            <div class="acl-legenda"><span><i style="background:#16a34a"></i> Concluídos (${d.concluidos})</span><span><i style="background:#7c3aed"></i> Em desenvolvimento (${d.em_desenvolvimento})</span><span><i style="background:#cbd5e1"></i> Não iniciaram (${d.nao_iniciaram})</span></div></div>`;
    }

    function cardTrilha(t) {
        const st = t.status_efetivo;
        return `<article class="acl-trilha-card" onclick="window._aclAbrirTrilha(${t.id})">
            <div class="acl-tc-top"><h3>${esc(t.nome)}</h3><span class="acl-badge" style="background:${STATUS_COR[st] || '#64748b'};">${STATUS_TXT[st] || st}</span></div>
            ${demoTag(t)}
            <p>${esc(t.descricao || 'Sem descrição.')}</p>
            <div class="acl-meta"><span><i class="ph ph-users-three"></i> ${esc((t.publico || []).join(', ') || 'Todos')}</span><span><i class="ph ph-calendar-blank"></i> ${fmtBr(t.data_inicio)} → ${fmtBr(t.data_fim)}</span></div>
            <div class="acl-prazo">${esc(prazoTxt(t.prazo))}</div>
            <div class="acl-nums"><span><b>${t.qtd_modulos}</b> módulos</span><span><b>${t.qtd_aulas}</b> aulas</span><span><b>${t.qtd_avaliacoes}</b> avaliações</span><span><b>${t.qtd_missoes}</b> missões</span><span><b>${t.qtd_participantes}</b> participantes</span></div>
            <div class="acl-prog-linha"><span>Conclusão média</span><b>${t.progresso_medio}%</b></div>${barra(t.progresso_medio, '#16a34a')}
        </article>`;
    }
    function htmlTrilhas() {
        const cards = (A.lista || []).map(cardTrilha).join('') || '<div class="acl-vazio"><i class="ph ph-graduation-cap"></i><div>Nenhuma trilha cadastrada ainda.</div></div>';
        return `<div class="acl-barra-acoes"><h3 class="acl-titulo-sec"><i class="ph ph-graduation-cap"></i> Trilhas</h3><button class="acl-btn pri" onclick="window._aclFormTrilha()"><i class="ph ph-plus-circle"></i> CRIAR NOVA TRILHA</button></div><div class="acl-grid">${cards}</div>`;
    }

    // ── Formulário de trilha ────────────────────────────────────────────────────
    window._aclFormTrilha = async function (id) {
        const t = id && A.t && A.t.id === id ? A.t : null;
        const pub = new Set((t && t.publico) || ['Líder']);
        const html = `<div class="acl-form">
            <label>Nome da trilha<input id="aclf-nome" value="${esc(t ? t.nome : '')}" placeholder="Academia de Sucesso — Líderes"></label>
            <label>Descrição<textarea id="aclf-desc" rows="2" placeholder="Explique a proposta da trilha">${esc(t ? t.descricao : '')}</textarea></label>
            <label>Objetivo<textarea id="aclf-obj" rows="2" placeholder="O que o participante deverá desenvolver">${esc(t ? t.objetivo : '')}</textarea></label>
            <fieldset><legend>Público-alvo (cargos)</legend>${CARGOS_PUBLICO.map(c => `<label class="acl-chk"><input type="checkbox" class="aclf-pub" value="${c}" ${pub.has(c) ? 'checked' : ''}> ${c}</label>`).join('')}</fieldset>
            <div class="acl-form-2"><label>Data de início<input id="aclf-ini" type="date" value="${esc(t ? t.data_inicio : '')}"></label><label>Data de encerramento<input id="aclf-fim" type="date" value="${esc(t ? t.data_fim : '')}"></label></div>
            <div class="acl-form-2"><label>Carga horária (horas)<input id="aclf-ch" type="number" min="0" step="0.5" value="${t ? t.carga_horaria : ''}"></label>
                <label>Status<select id="aclf-st">${['rascunho', 'publicada', 'encerrada', 'arquivada'].map(s => `<option value="${s}" ${t && t.status === s ? 'selected' : ''}>${STATUS_TXT[s]}</option>`).join('')}</select></label></div>
            <label class="acl-chk"><input type="checkbox" id="aclf-cert" ${!t || t.gera_certificado ? 'checked' : ''}> Esta trilha gera certificado</label></div>`;
        const r = await Swal.fire({
            title: t ? 'Editar trilha' : 'Nova trilha', html, width: 720, showCancelButton: true, confirmButtonText: 'Salvar', cancelButtonText: 'Cancelar', confirmButtonColor: '#7c3aed', customClass: { popup: 'acl-swal' },
            preConfirm: () => {
                const v = i => document.getElementById(i).value;
                const o = { nome: v('aclf-nome').trim(), descricao: v('aclf-desc'), objetivo: v('aclf-obj'), data_inicio: v('aclf-ini'), data_fim: v('aclf-fim'), carga_horaria: v('aclf-ch'), status: v('aclf-st'),
                    gera_certificado: document.getElementById('aclf-cert').checked, publico: [...document.querySelectorAll('.aclf-pub:checked')].map(x => x.value) };
                if (!o.nome) { Swal.showValidationMessage('Informe o nome da trilha.'); return false; }
                if (!o.data_inicio || !o.data_fim) { Swal.showValidationMessage('Informe as datas de início e de encerramento.'); return false; }
                if (o.data_fim < o.data_inicio) { Swal.showValidationMessage('A data final da trilha não pode ser anterior à data inicial.'); return false; }
                return o;
            }
        });
        if (!r.isConfirmed) return;
        try {
            const res = t ? await api('/acl/trilhas/' + t.id, { method: 'PUT', body: jbody(r.value) }) : await api('/acl/trilhas', { method: 'POST', body: jbody(r.value) });
            await okMsg('Trilha salva!');
            await carregarAdmin();
            if (t) await window._aclAbrirTrilha(t.id, A.tab); else if (res && res.id) await window._aclAbrirTrilha(res.id, 'modulos');
        } catch (e) { erro('Não foi possível salvar', e.message); }
    };

    // ── Editor da trilha ────────────────────────────────────────────────────────
    window._aclAbrirTrilha = async function (id, tab) {
        const el = raiz('academia-lideres-admin-container');
        try {
            A.t = await api('/acl/trilhas/' + id); A.aba = 'trilhas'; A.tab = tab || A.tab || 'visao';
            if (A.tab === 'participantes') A.part = await api('/acl/trilhas/' + id + '/participantes');
            desenharAdmin();
        } catch (e) { erro('Não foi possível abrir a trilha', e.message); }
    };
    window._aclVoltar = function () { A.t = null; A.aba = 'trilhas'; carregarAdmin(); };
    window._aclTab = async function (tab) {
        A.tab = tab;
        if (tab === 'participantes') { try { A.part = await api('/acl/trilhas/' + A.t.id + '/participantes'); } catch (e) { erro('Erro', e.message); } }
        desenharAdmin();
    };
    async function recarregarTrilha() { const id = A.t.id; A.t = await api('/acl/trilhas/' + id); if (A.tab === 'participantes') A.part = await api('/acl/trilhas/' + id + '/participantes'); desenharAdmin(); }

    function htmlEditor() {
        const t = A.t, st = t.status_efetivo;
        const abas = [['visao', 'ph-clipboard-text', 'Visão Geral'], ['modulos', 'ph-books', 'Módulos'], ['avaliacoes', 'ph-note-pencil', 'Avaliações'], ['missoes', 'ph-target', 'Missões'], ['cronograma', 'ph-calendar-dots', 'Cronograma'], ['participantes', 'ph-users', 'Participantes'], ['desempenho', 'ph-chart-bar', 'Desempenho'], ['config', 'ph-gear', 'Configurações']];
        const abasHtml = abas.map(a => `<button class="acl-tab ${A.tab === a[0] ? 'on' : ''}" onclick="window._aclTab('${a[0]}')"><i class="ph ${a[1]}"></i> ${a[2]}</button>`).join('');
        let corpo = '';
        if (A.tab === 'visao') corpo = tabVisao();
        else if (A.tab === 'modulos') corpo = tabModulos();
        else if (A.tab === 'participantes') corpo = tabParticipantes();
        else if (A.tab === 'desempenho') corpo = tabDesempenho();
        else if (A.tab === 'config') corpo = tabConfig();
        else corpo = `<div class="acl-vazio"><i class="ph ph-hourglass-medium"></i><div><b>Disponível nas próximas fases</b><br>${A.tab === 'avaliacoes' || A.tab === 'cronograma' ? 'Fase 2 — Avaliações, cronograma e certificado.' : 'Fase 3 — Missões opcionais com pontos bônus.'}</div></div>`;
        return `<button class="acl-voltar" onclick="window._aclVoltar()"><i class="ph ph-arrow-left"></i> Voltar às trilhas</button>
        <section class="acl-editor-topo">
            <div class="acl-tc-top"><h2>${esc(t.nome)}</h2><span class="acl-badge" style="background:${STATUS_COR[st] || '#64748b'};">${STATUS_TXT[st] || st}</span></div>${demoTag(t)}
            <p>${esc(t.descricao || '')}</p>
            <div class="acl-meta"><span><i class="ph ph-users-three"></i> ${esc((t.publico || []).join(', ') || 'Todos')}</span><span><i class="ph ph-calendar-blank"></i> ${fmtBr(t.data_inicio)} → ${fmtBr(t.data_fim)}</span><span><i class="ph ph-clock"></i> ${t.carga_horaria || 0} h</span><span><i class="ph ph-chart-line-up"></i> Progresso médio ${t.progresso_medio}%</span></div>
            <div class="acl-prazo">${esc(prazoTxt(t.prazo))}</div>
        </section>
        <nav class="acl-tabs">${abasHtml}</nav><div class="acl-tab-corpo">${corpo}</div>`;
    }
    function tabVisao() {
        const t = A.t;
        const pub = t.status === 'rascunho' ? `<button class="acl-btn ok" onclick="window._aclStatus('publicada')"><i class="ph ph-rocket-launch"></i> Publicar trilha</button>` : '';
        return `<div class="acl-kpis">${kpi('ph-books', 'Módulos', t.qtd_modulos, '#7c3aed')}${kpi('ph-play-circle', 'Aulas', t.qtd_aulas, '#2563eb')}${kpi('ph-note-pencil', 'Avaliações', t.qtd_avaliacoes, '#7c3aed')}${kpi('ph-target', 'Missões', t.qtd_missoes, '#ea580c')}${kpi('ph-users', 'Participantes', t.qtd_participantes, '#16a34a')}</div>
        <div class="acl-card"><h3><i class="ph ph-flag"></i> Objetivo</h3><p class="acl-texto">${esc(t.objetivo || 'Não informado.')}</p></div>
        <div class="acl-card"><h3><i class="ph ph-info"></i> Regras da trilha</h3><ul class="acl-lista-regras"><li>O progresso é calculado apenas pelas <b>aulas obrigatórias</b> dos módulos ativos.</li><li>Missões (fase 3) serão <b>opcionais</b>: nunca bloqueiam nem reduzem o progresso ou o certificado.</li><li>Prazos de módulos e aulas precisam estar dentro do prazo da trilha.</li></ul>${pub}</div>`;
    }
    window._aclStatus = async function (s) {
        try { await api('/acl/trilhas/' + A.t.id, { method: 'PUT', body: jbody({ status: s }) }); okMsg(s === 'publicada' ? 'Trilha publicada!' : 'Status atualizado'); await recarregarTrilha(); } catch (e) { erro('Erro', e.message); }
    };

    // ── Aba Módulos / Aulas ─────────────────────────────────────────────────────
    function tabModulos() {
        const mods = A.t.modulos || [];
        const lista = mods.map((m, i) => {
            const aberto = !!A.modAberto[m.id];
            const aulas = (m.aulas || []).map((a, k) => `<div class="acl-aula-linha">
                <i class="ph ${a.obrigatoria ? 'ph-play-circle' : 'ph-play-circle'}" style="color:${a.obrigatoria ? '#7c3aed' : '#94a3b8'}"></i>
                <div class="acl-aula-txt"><b>${esc(a.titulo)}</b>${demoTag(a)}<small>${a.duracao_min ? a.duracao_min + ' min · ' : ''}${a.obrigatoria ? 'Obrigatória' : 'Opcional'}${a.prazo ? ' · prazo ' + fmtBr(a.prazo) : ''}${(a.tem_arquivo || a.arquivo_nome) ? ' · 📎 arquivo' : ''}${(a.tem_video_arquivo || a.video_url) ? ' · 🎬 vídeo' : ''}${a.link ? ' · 🔗 link' : ''}</small></div>
                <div class="acl-acoes"><button onclick="window._aclMoverAula(${m.id},${a.id},-1)" ${k === 0 ? 'disabled' : ''} title="Subir"><i class="ph ph-arrow-up"></i></button><button onclick="window._aclMoverAula(${m.id},${a.id},1)" ${k === m.aulas.length - 1 ? 'disabled' : ''} title="Descer"><i class="ph ph-arrow-down"></i></button><button onclick="window._aclFormAula(${m.id},${a.id})" title="Editar"><i class="ph ph-pencil-simple"></i></button><button class="del" onclick="window._aclDelAula(${a.id})" title="Excluir"><i class="ph ph-trash"></i></button></div></div>`).join('') || '<div class="acl-vazio-sm">Nenhuma aula neste módulo.</div>';
            return `<div class="acl-mod ${m.ativo ? '' : 'inativo'}">
                <div class="acl-mod-topo" onclick="window._aclToggleMod(${m.id})"><i class="ph ph-caret-${aberto ? 'down' : 'right'}"></i>
                    <div class="acl-aula-txt"><b>${esc(m.titulo)}</b>${demoTag(m)}<small>${(m.aulas || []).length} aula(s)${m.data_inicio ? ' · ' + fmtBr(m.data_inicio) + ' → ' + fmtBr(m.data_fim) : ''}${m.ativo ? '' : ' · desativado'}</small></div>
                    <div class="acl-acoes" onclick="event.stopPropagation()"><button onclick="window._aclMoverMod(${m.id},-1)" ${i === 0 ? 'disabled' : ''} title="Subir"><i class="ph ph-arrow-up"></i></button><button onclick="window._aclMoverMod(${m.id},1)" ${i === mods.length - 1 ? 'disabled' : ''} title="Descer"><i class="ph ph-arrow-down"></i></button><button onclick="window._aclToggleAtivo(${m.id},${m.ativo ? 0 : 1})" title="${m.ativo ? 'Desativar' : 'Ativar'}"><i class="ph ${m.ativo ? 'ph-eye' : 'ph-eye-slash'}"></i></button><button onclick="window._aclFormModulo(${m.id})" title="Editar"><i class="ph ph-pencil-simple"></i></button><button class="del" onclick="window._aclDelModulo(${m.id})" title="Excluir"><i class="ph ph-trash"></i></button></div></div>
                ${aberto ? `<div class="acl-mod-corpo">${aulas}<button class="acl-btn sec" onclick="window._aclFormAula(${m.id})"><i class="ph ph-plus-circle"></i> ADICIONAR AULA</button></div>` : ''}</div>`;
        }).join('') || '<div class="acl-vazio"><i class="ph ph-books"></i><div>Nenhum módulo ainda. Crie o primeiro para começar.</div></div>';
        return `<div class="acl-barra-acoes"><h3 class="acl-titulo-sec"><i class="ph ph-books"></i> Módulos</h3><button class="acl-btn pri" onclick="window._aclFormModulo()"><i class="ph ph-plus-circle"></i> ADICIONAR MÓDULO</button></div>${lista}`;
    }
    window._aclToggleMod = function (id) { A.modAberto[id] = !A.modAberto[id]; desenharAdmin(); };
    window._aclFormModulo = async function (id) {
        const m = id ? (A.t.modulos || []).find(x => x.id === id) : null;
        const r = await Swal.fire({
            title: m ? 'Editar módulo' : 'Novo módulo', width: 560, showCancelButton: true, confirmButtonText: 'Salvar', cancelButtonText: 'Cancelar', confirmButtonColor: '#7c3aed', customClass: { popup: 'acl-swal' },
            html: `<div class="acl-form"><label>Título<input id="aclm-t" value="${esc(m ? m.titulo : '')}" placeholder="Módulo 1 — O Papel do Líder"></label><label>Descrição<textarea id="aclm-d" rows="2">${esc(m ? m.descricao : '')}</textarea></label>
            <div class="acl-form-2"><label>Início do módulo<input id="aclm-i" type="date" min="${esc(A.t.data_inicio)}" max="${esc(A.t.data_fim)}" value="${esc(m ? m.data_inicio : '')}"></label><label>Fim do módulo<input id="aclm-f" type="date" min="${esc(A.t.data_inicio)}" max="${esc(A.t.data_fim)}" value="${esc(m ? m.data_fim : '')}"></label></div>
            <small>O prazo do módulo precisa estar entre ${fmtBr(A.t.data_inicio)} e ${fmtBr(A.t.data_fim)} (prazo da trilha).</small></div>`,
            preConfirm: () => { const o = { titulo: document.getElementById('aclm-t').value.trim(), descricao: document.getElementById('aclm-d').value, data_inicio: document.getElementById('aclm-i').value, data_fim: document.getElementById('aclm-f').value }; if (!o.titulo) { Swal.showValidationMessage('Informe o título do módulo.'); return false; } return o; }
        });
        if (!r.isConfirmed) return;
        try {
            if (m) await api('/acl/modulos/' + m.id, { method: 'PUT', body: jbody(r.value) }); else { const n = await api('/acl/trilhas/' + A.t.id + '/modulos', { method: 'POST', body: jbody(r.value) }); A.modAberto[n.id] = true; }
            await recarregarTrilha();
        } catch (e) { erro('Não foi possível salvar o módulo', e.message); }
    };
    window._aclDelModulo = async function (id) {
        if (!await confirma('Excluir módulo?', 'As aulas do módulo e o progresso dos participantes nelas serão apagados.', 'Excluir')) return;
        try { await api('/acl/modulos/' + id, { method: 'DELETE' }); await recarregarTrilha(); } catch (e) { erro('Erro', e.message); }
    };
    window._aclToggleAtivo = async function (id, ativo) { try { await api('/acl/modulos/' + id, { method: 'PUT', body: jbody({ ativo }) }); await recarregarTrilha(); } catch (e) { erro('Erro', e.message); } };
    window._aclMoverMod = async function (id, dir) {
        const ids = (A.t.modulos || []).map(m => m.id); const i = ids.indexOf(id), j = i + dir; if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        try { await api('/acl/trilhas/' + A.t.id + '/modulos/ordem', { method: 'POST', body: jbody({ ids }) }); await recarregarTrilha(); } catch (e) { erro('Erro', e.message); }
    };
    window._aclMoverAula = async function (mid, id, dir) {
        const m = (A.t.modulos || []).find(x => x.id === mid); const ids = m.aulas.map(a => a.id); const i = ids.indexOf(id), j = i + dir; if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        try { await api('/acl/modulos/' + mid + '/aulas/ordem', { method: 'POST', body: jbody({ ids }) }); await recarregarTrilha(); } catch (e) { erro('Erro', e.message); }
    };
    window._aclDelAula = async function (id) {
        if (!await confirma('Excluir aula?', 'O progresso dos participantes nesta aula será apagado.', 'Excluir')) return;
        try { await api('/acl/aulas/' + id, { method: 'DELETE' }); await recarregarTrilha(); } catch (e) { erro('Erro', e.message); }
    };
    window._aclFormAula = async function (mid, id) {
        const mod = (A.t.modulos || []).find(x => x.id === mid);
        const a = id ? mod.aulas.find(x => x.id === id) : null;
        const midiaLinha = (campo, tem, nome, rot) => `<div class="acl-midia"><span><i class="ph ${campo === 'video' ? 'ph-video-camera' : 'ph-paperclip'}"></i> ${rot}${tem ? `: <b>${esc(nome || 'enviado')}</b>` : ''}</span>${a ? `<input type="file" id="aclfile-${campo}" ${campo === 'video' ? 'accept="video/*"' : ''}>${tem ? `<button type="button" class="acl-btn sm del" onclick="window._aclRemMidia(${a.id},'${campo}')">Remover</button>` : ''}` : '<small>Salve a aula e edite-a para anexar arquivos.</small>'}</div>`;
        const r = await Swal.fire({
            title: a ? 'Editar aula' : 'Nova aula', width: 720, showCancelButton: true, confirmButtonText: 'Salvar', cancelButtonText: 'Cancelar', confirmButtonColor: '#7c3aed', customClass: { popup: 'acl-swal' },
            html: `<div class="acl-form"><label>Título<input id="acla-t" value="${esc(a ? a.titulo : '')}"></label><label>Descrição<textarea id="acla-d" rows="2">${esc(a ? a.descricao : '')}</textarea></label>
            <label>Objetivo<textarea id="acla-o" rows="2">${esc(a ? a.objetivo : '')}</textarea></label><label>Conteúdo<textarea id="acla-c" rows="5" placeholder="Texto da aula">${esc(a ? a.conteudo : '')}</textarea></label>
            <label>Vídeo (link do YouTube/Vimeo ou outro)<input id="acla-v" value="${esc(a ? a.video_url : '')}" placeholder="https://..."></label>
            <label>Link complementar<input id="acla-l" value="${esc(a ? a.link : '')}" placeholder="https://..."></label>
            ${midiaLinha('video', a && a.tem_video_arquivo, a && a.video_nome, 'Arquivo de vídeo (até 60 MB)')}${midiaLinha('arquivo', a && a.tem_arquivo, a && a.arquivo_nome, 'Material de apoio (até 60 MB)')}
            <div class="acl-form-2"><label>Duração (min)<input id="acla-m" type="number" min="0" value="${a ? a.duracao_min : ''}"></label><label>Prazo da aula (opcional)<input id="acla-p" type="date" value="${esc(a ? a.prazo : '')}"></label></div>
            <label class="acl-chk"><input type="checkbox" id="acla-ob" ${!a || a.obrigatoria ? 'checked' : ''}> Aula obrigatória (conta no progresso)</label></div>`,
            preConfirm: () => {
                const v = i => document.getElementById(i).value;
                const o = { titulo: v('acla-t').trim(), descricao: v('acla-d'), objetivo: v('acla-o'), conteudo: v('acla-c'), video_url: v('acla-v'), link: v('acla-l'), duracao_min: v('acla-m'), prazo: v('acla-p'), obrigatoria: document.getElementById('acla-ob').checked };
                if (!o.titulo) { Swal.showValidationMessage('Informe o título da aula.'); return false; }
                const fv = document.getElementById('aclfile-video'), fa = document.getElementById('aclfile-arquivo');
                o._fv = fv && fv.files[0]; o._fa = fa && fa.files[0];
                return o;
            }
        });
        if (!r.isConfirmed) return;
        const o = r.value; const fv = o._fv, fa = o._fa; delete o._fv; delete o._fa;
        try {
            let aid = id;
            if (id) await api('/acl/aulas/' + id, { method: 'PUT', body: jbody(o) }); else aid = (await api('/acl/modulos/' + mid + '/aulas', { method: 'POST', body: jbody(o) })).id;
            for (const [campo, f] of [['video', fv], ['arquivo', fa]]) if (f) {
                if (f.size > 60 * 1024 * 1024) { erro('Arquivo grande demais', `${f.name} excede 60 MB.`); continue; }
                const fd = new FormData(); fd.append('campo', campo); fd.append('arquivo', f);
                Swal.fire({ title: 'Enviando arquivo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                await api('/acl/aulas/' + aid + '/midia', { method: 'POST', body: fd }); Swal.close();
            }
            A.modAberto[mid] = true; await recarregarTrilha();
        } catch (e) { Swal.close(); erro('Não foi possível salvar a aula', e.message); }
    };
    window._aclRemMidia = async function (aid, campo) {
        try { await api('/acl/aulas/' + aid + '/midia/' + campo, { method: 'DELETE' }); Swal.close(); await recarregarTrilha(); okMsg('Arquivo removido'); } catch (e) { erro('Erro', e.message); }
    };

    // ── Aba Participantes ───────────────────────────────────────────────────────
    function tabParticipantes() {
        const P = A.part || { participantes: [], total_obrigatorias: 0 };
        const stTxt = { ativo: 'Em andamento', concluido: 'Concluído', inativo: 'Inativo' };
        const linhas = P.participantes.map(p => `<tr>
            <td data-l="Colaborador"><div class="acl-pessoa" onclick="window._aclJornada(${p.colaborador_id})">${avatar(p.nome, p.foto)}<div><b>${esc(p.nome)}</b><small>${esc(p.cargo)}${p.departamento ? ' · ' + esc(p.departamento) : ''}</small></div></div></td>
            <td data-l="Progresso"><div class="acl-prog-cel">${barra(p.progresso, '#16a34a')}<b>${p.progresso}%</b></div></td>
            <td data-l="Evolução">${p.evolucao == null ? '—' : p.evolucao + '%'}</td><td data-l="Missões">${p.missoes}</td><td data-l="Pontos">${p.pontos ? '+' + p.pontos : '—'}</td>
            <td data-l="Status"><span class="acl-badge" style="background:${p.status === 'concluido' ? '#16a34a' : '#7c3aed'};">${stTxt[p.status] || p.status}</span>${p.excecao_ate ? `<small class="acl-exc">prazo extra até ${fmtBr(p.excecao_ate)}</small>` : ''}</td>
            <td class="acl-acoes"><button onclick="window._aclExcecao(${p.matricula_id},'${esc(p.excecao_ate || '')}')" title="Liberar prazo extra"><i class="ph ph-calendar-plus"></i></button><button class="del" onclick="window._aclRemoverPart(${p.matricula_id})" title="Remover"><i class="ph ph-user-minus"></i></button></td></tr>`).join('');
        const tabela = P.participantes.length ? `<div class="acl-tabela-wrap"><table class="acl-tabela"><thead><tr><th>Colaborador</th><th>Progresso</th><th>Evolução</th><th>Missões</th><th>Pontos</th><th>Status</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>` : '<div class="acl-vazio"><i class="ph ph-users"></i><div>Nenhum participante matriculado.</div></div>';
        return `<div class="acl-barra-acoes"><h3 class="acl-titulo-sec"><i class="ph ph-users"></i> Participantes</h3><button class="acl-btn pri" onclick="window._aclMatricular()"><i class="ph ph-user-plus"></i> MATRICULAR COLABORADORES</button></div><p class="acl-dica">${P.total_obrigatorias} aula(s) obrigatória(s) compõem o progresso. Evolução, missões e pontos serão preenchidos nas próximas fases.</p>${tabela}`;
    }
    window._aclMatricular = async function () {
        let colabs; try { colabs = await api('/acl/colaboradores?trilha=' + A.t.id); } catch (e) { return erro('Erro', e.message); }
        const cargos = [...new Set(colabs.map(c => c.cargo).filter(Boolean))].sort();
        const pre = new Set((A.t.publico || []).map(x => x.toLowerCase()));
        window._aclColabs = colabs;
        const html = `<div class="acl-form"><div class="acl-form-2"><label>Cargo<select id="aclmt-cargo" onchange="window._aclFiltrarMat()"><option value="">Todos</option>${cargos.map(c => `<option value="${esc(c)}" ${pre.has(c.toLowerCase()) && pre.size === 1 ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label><label>Buscar<input id="aclmt-q" oninput="window._aclFiltrarMat()" placeholder="Nome"></label></div><div id="aclmt-lista" class="acl-mat-lista"></div></div>`;
        const r = await Swal.fire({
            title: 'Matricular colaboradores', width: 640, html, showCancelButton: true, confirmButtonText: 'Matricular selecionados', cancelButtonText: 'Cancelar', confirmButtonColor: '#7c3aed', customClass: { popup: 'acl-swal' },
            didOpen: () => window._aclFiltrarMat(),
            preConfirm: () => { const ids = [...document.querySelectorAll('.aclmt-chk:checked')].map(x => Number(x.value)); if (!ids.length) { Swal.showValidationMessage('Selecione ao menos um colaborador.'); return false; } return ids; }
        });
        if (!r.isConfirmed) return;
        try { const res = await api('/acl/trilhas/' + A.t.id + '/matriculas', { method: 'POST', body: jbody({ colaborador_ids: r.value }) }); okMsg(`${res.novos} colaborador(es) matriculado(s)`); await recarregarTrilha(); } catch (e) { erro('Erro', e.message); }
    };
    window._aclFiltrarMat = function () {
        const cargo = (document.getElementById('aclmt-cargo') || {}).value || '', q = ((document.getElementById('aclmt-q') || {}).value || '').toLowerCase();
        const marcados = new Set([...document.querySelectorAll('.aclmt-chk:checked')].map(x => x.value));
        const l = (window._aclColabs || []).filter(c => (!cargo || c.cargo === cargo) && (!q || c.nome.toLowerCase().includes(q)));
        const el = document.getElementById('aclmt-lista'); if (!el) return;
        el.innerHTML = l.map(c => `<label class="acl-mat-item ${c.matriculado ? 'ja' : ''}"><input type="checkbox" class="aclmt-chk" value="${c.id}" ${c.matriculado ? 'disabled' : ''} ${marcados.has(String(c.id)) ? 'checked' : ''}>${avatar(c.nome, c.foto, 'sm')}<span><b>${esc(c.nome)}</b><small>${esc(c.cargo)}${c.departamento ? ' · ' + esc(c.departamento) : ''}${c.matriculado ? ' · já matriculado' : ''}</small></span></label>`).join('') || '<div class="acl-vazio-sm">Nenhum colaborador encontrado.</div>';
    };
    window._aclRemoverPart = async function (mid) {
        if (!await confirma('Remover participante?', 'A matrícula e o progresso dele nesta trilha serão apagados.', 'Remover')) return;
        try { await api('/acl/matriculas/' + mid, { method: 'DELETE' }); await recarregarTrilha(); } catch (e) { erro('Erro', e.message); }
    };
    window._aclExcecao = async function (mid, atual) {
        const r = await Swal.fire({ title: 'Prazo extra', html: `<p style="font-size:.9rem;color:#475569">Libera este participante para concluir aulas após o prazo, até a data abaixo. Deixe em branco para remover a exceção.</p><input id="aclex" type="date" class="swal2-input" value="${esc(atual)}">`, showCancelButton: true, confirmButtonText: 'Salvar', cancelButtonText: 'Cancelar', confirmButtonColor: '#7c3aed', preConfirm: () => document.getElementById('aclex').value });
        if (!r.isConfirmed) return;
        try { await api('/acl/matriculas/' + mid + '/excecao', { method: 'PUT', body: jbody({ ate: r.value || null }) }); await recarregarTrilha(); } catch (e) { erro('Erro', e.message); }
    };
    window._aclJornada = async function (cid) {
        try {
            const j = await api('/acl/trilhas/' + A.t.id + '/participantes/' + cid);
            const mods = j.modulos.map(m => `<div class="acl-jr-mod"><b>${esc(m.titulo)}</b> <span class="acl-pct">${m.progresso}%</span>${m.aulas.map(a => `<div class="acl-jr-aula ${a.concluida ? 'ok' : ''}"><i class="ph ${a.concluida ? 'ph-check-circle' : 'ph-circle'}"></i> ${esc(a.titulo)}${a.obrigatoria ? '' : ' <small>(opcional)</small>'}</div>`).join('')}</div>`).join('');
            Swal.fire({ title: esc(j.colaborador.nome), width: 640, confirmButtonColor: '#7c3aed', confirmButtonText: 'Fechar', customClass: { popup: 'acl-swal' }, html: `<div style="text-align:left"><div class="acl-prog-linha"><span>Progresso obrigatório</span><b>${j.progresso.obrigatorio}%</b></div>${barra(j.progresso.obrigatorio, '#16a34a')}<div class="acl-jr">${mods}</div></div>` });
        } catch (e) { erro('Erro', e.message); }
    };

    // ── Aba Desempenho / Configurações ─────────────────────────────────────────
    function tabDesempenho() {
        const P = A.part;
        const t = A.t;
        const concl = P ? P.participantes.filter(p => p.status === 'concluido').length : null;
        const taxa = P && P.participantes.length ? Math.round(concl * 100 / P.participantes.length) : 0;
        return `<div class="acl-kpis">${kpi('ph-chart-line-up', 'Média de progresso', t.progresso_medio + '%', '#16a34a')}${kpi('ph-seal-check', 'Taxa de conclusão', taxa + '%', '#16a34a')}${kpi('ph-users', 'Participantes', t.qtd_participantes, '#7c3aed')}${kpi('ph-certificate', 'Certificados', 0, '#2563eb')}</div><p class="acl-dica">Média de evolução, média das avaliações, missões e pontos distribuídos serão exibidos quando as fases 2 a 4 forem entregues.</p>`;
    }
    function tabConfig() {
        const t = A.t;
        return `<div class="acl-card"><h3><i class="ph ph-gear"></i> Configurações da trilha</h3><div class="acl-cfg-btns"><button class="acl-btn pri" onclick="window._aclFormTrilha(${t.id})"><i class="ph ph-pencil-simple"></i> Editar dados da trilha</button>
        ${t.status !== 'publicada' ? `<button class="acl-btn ok" onclick="window._aclStatus('publicada')"><i class="ph ph-rocket-launch"></i> Publicar</button>` : `<button class="acl-btn sec" onclick="window._aclStatus('rascunho')"><i class="ph ph-eye-slash"></i> Voltar para rascunho</button>`}
        ${t.status !== 'arquivada' ? `<button class="acl-btn sec" onclick="window._aclStatus('arquivada')"><i class="ph ph-archive"></i> Arquivar</button>` : ''}
        <button class="acl-btn del" onclick="window._aclExcluirTrilha()"><i class="ph ph-trash"></i> Excluir trilha</button></div></div>`;
    }
    window._aclExcluirTrilha = async function () {
        const t = A.t;
        if (!await confirma('Excluir trilha?', t.qtd_participantes ? `Há ${t.qtd_participantes} participante(s). Tudo (módulos, aulas, progresso) será apagado definitivamente.` : 'Módulos e aulas serão apagados definitivamente.', 'Excluir definitivamente')) return;
        try { await api('/acl/trilhas/' + t.id + '?forcar=1', { method: 'DELETE' }); A.t = null; A.aba = 'trilhas'; await carregarAdmin(); } catch (e) { erro('Erro', e.message); }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    //  MINHA ACADEMIA (participante)
    // ═══════════════════════════════════════════════════════════════════════════
    window.renderAcademiaLideresMinha = async function () {
        const el = raiz('academia-lideres-minha-container'); if (!el) return;
        M.tid = null; carregando(el, 'Carregando sua Academia...');
        try { M.dados = await api('/acl/minha'); desenharMinha(); }
        catch (e) { el.innerHTML = `<div class="acl-wrap"><div class="acl-erro"><i class="ph ph-warning-circle"></i> ${esc(e.message)}</div></div>`; }
    };
    const FRASES = ['Cada aula concluída é um passo na sua evolução.', 'Liderar é aprender todos os dias.', 'Pequenos avanços constantes geram grandes resultados.'];
    function cabecalhoMinha(nome) {
        return `<header class="acl-head acl-head-min"><div class="acl-head-t"><i class="ph ph-graduation-cap"></i><div><h2>Olá, ${esc(String(nome || '').split(' ')[0] || 'colaborador')}!</h2><span>Bem-vindo à Academia de Sucesso.</span></div></div></header>`;
    }
    function jornadaVisual(pct) {
        const etapas = ['Comecei', 'Aprendendo', 'Desenvolvendo', 'Evoluindo', 'Concluí', 'Certificado'];
        const at = pct >= 100 ? 4 : pct >= 67 ? 3 : pct >= 34 ? 2 : pct > 0 ? 1 : 0;
        return `<div class="acl-jornada">${etapas.map((e, i) => `<div class="acl-etapa ${i < at ? 'feita' : ''} ${i === at ? 'atual' : ''} ${i === 5 ? 'bloq' : ''}"><i class="ph ${i === 5 ? 'ph-certificate' : (i < at ? 'ph-check-circle' : (i === at ? 'ph-map-pin' : 'ph-circle'))}"></i><span>${e}</span></div>`).join('')}</div>`;
    }
    function desenharMinha() {
        const el = raiz('academia-lideres-minha-container'); if (!el) return;
        const d = M.dados;
        if (!d.vinculado) { el.innerHTML = `<div class="acl-wrap">${cabecalhoMinha('')}<div class="acl-vazio"><i class="ph ph-user-circle-minus"></i><div><b>Seu usuário ainda não está vinculado a um colaborador.</b><br>Peça ao RH para conferir seu e-mail/nome no cadastro de colaboradores.</div></div></div>`; return; }
        if (!d.trilhas.length) { el.innerHTML = `<div class="acl-wrap">${cabecalhoMinha(d.colaborador.nome)}<div class="acl-vazio"><i class="ph ph-graduation-cap"></i><div><b>Você ainda não foi matriculado em nenhuma trilha.</b><br>Quando o RH liberar a sua trilha, ela aparecerá aqui.</div></div></div>`; return; }
        const cards = d.trilhas.map(x => {
            const t = x.trilha, p = x.progresso;
            return `<article class="acl-minha-card"><div class="acl-tc-top"><h3>${esc(t.nome)}</h3><span class="acl-badge" style="background:${STATUS_COR[t.status_efetivo] || '#64748b'};">${STATUS_TXT[t.status_efetivo]}</span></div>${demoTag(t)}
                <p>${esc(t.descricao || '')}</p>
                <div class="acl-kpis mini">${kpi('ph-chart-line-up', 'Progresso', p.obrigatorio + '%', '#16a34a')}${kpi('ph-check-square', 'Aulas concluídas', p.aulas_concluidas + '/' + p.aulas_obrigatorias, '#7c3aed')}${kpi('ph-hourglass', 'Dias restantes', t.prazo.restantes == null ? '—' : t.prazo.restantes, '#2563eb')}</div>
                <div class="acl-prog-linha"><span>PROGRESSO DA TRILHA</span><b>${p.obrigatorio}%</b></div>${barra(p.obrigatorio, '#16a34a')}
                <div class="acl-prazo">${esc(prazoTxt(t.prazo))} · ${fmtBr(t.data_inicio)} → ${fmtBr(t.data_fim)}</div>
                ${jornadaVisual(p.obrigatorio)}
                ${x.proxima_aula ? `<div class="acl-prox"><i class="ph ph-play-circle"></i><div><small>Próximo conteúdo</small><b>${esc(x.proxima_aula.titulo)}</b><span>${esc(x.proxima_aula.modulo)}</span></div></div>` : (p.obrigatorio >= 100 ? '<div class="acl-prox ok"><i class="ph ph-seal-check"></i><div><b>Você concluiu todos os conteúdos obrigatórios!</b><span>O certificado estará disponível na próxima fase da Academia.</span></div></div>' : '')}
                <button class="acl-btn pri full" onclick="window._aclMinhaAbrir(${t.id})"><i class="ph ph-play"></i> ${p.obrigatorio > 0 && p.obrigatorio < 100 ? 'Continuar' : 'Acessar'} trilha</button>
                <p class="acl-frase"><i class="ph ph-sparkle"></i> ${FRASES[t.id % FRASES.length]}</p></article>`;
        }).join('');
        el.innerHTML = `<div class="acl-wrap">${cabecalhoMinha(d.colaborador.nome)}<div class="acl-corpo">${cards}</div></div>`;
    }
    window._aclMinhaAbrir = async function (tid) {
        const el = raiz('academia-lideres-minha-container'); M.tid = tid; carregando(el, 'Abrindo trilha...');
        try { M.jornada = await api('/acl/minha/trilhas/' + tid); desenharTrilhaMinha(); } catch (e) { erro('Erro', e.message); window.renderAcademiaLideresMinha(); }
    };
    function desenharTrilhaMinha() {
        const el = raiz('academia-lideres-minha-container'); const j = M.jornada, t = j.trilha, p = j.progresso;
        const mods = j.modulos.map((m, i) => {
            const aulas = m.aulas.map(a => `<button class="acl-m-aula ${a.concluida ? 'ok' : ''} ${a.encerrada && !a.concluida ? 'enc' : ''}" onclick="window._aclAula(${a.id})"><i class="ph ${a.concluida ? 'ph-check-circle' : (a.encerrada ? 'ph-lock-simple' : 'ph-play-circle')}"></i><span><b>${esc(a.titulo)}</b>${demoTag(a)}<small>${a.duracao_min ? a.duracao_min + ' min · ' : ''}${a.obrigatoria ? 'Obrigatória' : 'Opcional'}${a.encerrada && !a.concluida ? ' · encerrada' : ''}</small></span><i class="ph ph-caret-right"></i></button>`).join('');
            return `<details class="acl-m-mod" ${(M.aberto === undefined ? i === 0 : M.aberto[m.id]) ? 'open' : ''} ontoggle="window._aclMToggle(${m.id}, this.open)"><summary><span class="acl-m-n">${i + 1}</span><span class="acl-m-t"><b>${esc(m.titulo)}</b>${demoTag(m)}<small>${m.data_inicio ? fmtBr(m.data_inicio) + ' → ' + fmtBr(m.data_fim) + (m.encerrado ? ' · encerrado' : '') : m.aulas.length + ' aula(s)'}</small></span><span class="acl-pct">${m.progresso}%</span></summary><div class="acl-m-aulas">${aulas || '<div class="acl-vazio-sm">Sem aulas.</div>'}</div></details>`;
        }).join('');
        el.innerHTML = `<div class="acl-wrap"><button class="acl-voltar" onclick="window.renderAcademiaLideresMinha()"><i class="ph ph-arrow-left"></i> Minha Academia</button>
            <section class="acl-editor-topo"><div class="acl-tc-top"><h2>${esc(t.nome)}</h2><span class="acl-badge" style="background:${STATUS_COR[t.status_efetivo]};">${STATUS_TXT[t.status_efetivo]}</span></div>${demoTag(t)}<p>${esc(t.objetivo || t.descricao || '')}</p>
            <div class="acl-prog-linha"><span>Progresso obrigatório</span><b>${p.obrigatorio}%</b></div>${barra(p.obrigatorio, '#16a34a')}<div class="acl-prazo">${esc(prazoTxt(t.prazo))}</div>${jornadaVisual(p.obrigatorio)}</section>
            <div class="acl-corpo">${mods || '<div class="acl-vazio"><i class="ph ph-books"></i><div>Esta trilha ainda não tem módulos.</div></div>'}</div></div>`;
    }
    window._aclMToggle = function (id, open) { M.aberto = M.aberto || {}; M.aberto[id] = open; };

    // ── Página da aula ──────────────────────────────────────────────────────────
    function ytEmbed(u) {
        const m = String(u || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/); if (m) return 'https://www.youtube.com/embed/' + m[1];
        const v = String(u || '').match(/vimeo\.com\/(\d+)/); if (v) return 'https://player.vimeo.com/video/' + v[1];
        return null;
    }
    const seguroUrl = u => /^https?:\/\//i.test(u) ? u : '';
    window._aclAula = function (id) {
        let aula = null, mod = null, ordem = [];
        M.jornada.modulos.forEach(m => m.aulas.forEach(a => { ordem.push(a); if (a.id === id) { aula = a; mod = m; } }));
        if (!aula) return;
        const idx = ordem.findIndex(a => a.id === id), prox = ordem[idx + 1] || null;
        let ov = document.getElementById('acl-aula-overlay');
        if (!ov) { ov = document.createElement('div'); ov.id = 'acl-aula-overlay'; ov.className = 'acl-overlay'; document.body.appendChild(ov); }
        document.body.classList.add('acl-no-scroll');
        const emb = ytEmbed(aula.video_url), vurl = seguroUrl(aula.video_url), lurl = seguroUrl(aula.link);
        const video = aula.tem_video_arquivo ? `<video controls playsinline preload="metadata" src="${esc(midiaUrl(aula.id, 'video'))}"></video>`
            : (emb ? `<div class="acl-embed"><iframe src="${esc(emb)}" allowfullscreen loading="lazy"></iframe></div>` : (vurl ? `<a class="acl-btn sec" href="${esc(vurl)}" target="_blank" rel="noopener"><i class="ph ph-video-camera"></i> Assistir vídeo</a>` : ''));
        ov.innerHTML = `<div class="acl-aula"><header class="acl-aula-top"><button class="acl-icon-btn" onclick="window._aclFecharAula()" aria-label="Voltar"><i class="ph ph-arrow-left"></i></button><div><small>${esc(mod.titulo)}</small><h2>${esc(aula.titulo)}</h2></div></header>
            <div class="acl-aula-corpo">${demoTag(aula)}
                <div class="acl-meta"><span><i class="ph ph-clock"></i> ${aula.duracao_min ? aula.duracao_min + ' min' : 'Tempo livre'}</span><span><i class="ph ph-flag"></i> ${aula.obrigatoria ? 'Obrigatória' : 'Opcional'}</span>${aula.prazo ? `<span><i class="ph ph-calendar-blank"></i> até ${fmtBr(aula.prazo)}</span>` : ''}</div>
                ${aula.descricao ? `<p class="acl-texto">${esc(aula.descricao)}</p>` : ''}
                ${aula.objetivo ? `<div class="acl-card"><h3><i class="ph ph-target"></i> Objetivo</h3><p class="acl-texto">${esc(aula.objetivo)}</p></div>` : ''}
                ${video}
                ${aula.conteudo ? `<div class="acl-card"><h3><i class="ph ph-article"></i> Conteúdo</h3><p class="acl-texto">${esc(aula.conteudo)}</p></div>` : ''}
                <div class="acl-anexos">${aula.tem_arquivo ? `<a class="acl-btn sec" href="${esc(midiaUrl(aula.id, 'arquivo'))}" target="_blank" rel="noopener"><i class="ph ph-paperclip"></i> ${esc(aula.arquivo_nome || 'Material de apoio')}</a>` : ''}${lurl ? `<a class="acl-btn sec" href="${esc(lurl)}" target="_blank" rel="noopener"><i class="ph ph-link"></i> Link complementar</a>` : ''}</div>
                <div id="acl-aula-msg"></div></div>
            <footer class="acl-aula-foot"><button id="acl-btn-concluir" class="acl-btn ${aula.concluida ? 'sec' : 'ok'} grow" onclick="window._aclConcluir(${aula.id})"><i class="ph ${aula.concluida ? 'ph-arrow-counter-clockwise' : 'ph-check-circle'}"></i> ${aula.concluida ? 'Desmarcar conclusão' : 'Marcar como concluída'}</button>${prox ? `<button class="acl-btn pri" onclick="window._aclAula(${prox.id})" title="Próxima aula"><i class="ph ph-caret-right"></i></button>` : ''}</footer></div>`;
    };
    window._aclFecharAula = function () { const ov = document.getElementById('acl-aula-overlay'); if (ov) ov.remove(); document.body.classList.remove('acl-no-scroll'); desenharTrilhaMinha(); };
    window._aclConcluir = async function (id) {
        let aula = null; M.jornada.modulos.forEach(m => m.aulas.forEach(a => { if (a.id === id) aula = a; }));
        const concluir = !aula.concluida;
        try {
            const r = await api('/acl/minha/aulas/' + id + '/concluir', { method: 'POST', body: jbody({ concluida: concluir }) });
            M.jornada = await api('/acl/minha/trilhas/' + M.tid);
            window._aclAula(id);
            const msg = document.getElementById('acl-aula-msg');
            if (msg && concluir) msg.innerHTML = `<div class="acl-prox ok"><i class="ph ph-seal-check"></i><div><b>${r.concluido_trilha ? 'Parabéns! Você concluiu todos os conteúdos obrigatórios da trilha.' : 'Aula concluída!'}</b><span>Progresso da trilha: ${r.progresso}%</span></div></div>`;
        } catch (e) { erro('Não foi possível concluir', e.message); }
    };
})();
