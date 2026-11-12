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

    const A = { msub: 'lista', envFiltro: 'em_analise', envios: [], aba: 'dashboard', lista: null, dash: null, t: null, tab: 'visao', modAberto: {}, part: null };
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
        <nav class="acl-nav">${item('dashboard', 'ph-house', 'Dashboard', A.aba === 'dashboard' && !A.t)}${item('colaboradores', 'ph-users', 'Colaboradores', A.aba === 'colaboradores' && !A.t)}${item('trilhas', 'ph-graduation-cap', 'Trilhas', A.aba === 'trilhas' || !!A.t)}${item('', 'ph-trophy', 'Conquistas', false, 1)}${item('', 'ph-ranking', 'Ranking', false, 1)}${item('certificados', 'ph-certificate', 'Certificados', A.aba === 'certificados' && !A.t)}${item('', 'ph-chart-bar', 'Relatórios', false, 1)}${item('', 'ph-gear', 'Configurações', false, 1)}</nav>`;
    }
    window._aclAba = async function (a) {
        A.aba = a; A.t = null; A.qe = null;
        if (a === 'certificados') { try { A.certs = await api('/acl/certificados'); } catch (e) { A.certs = []; erro('Erro', e.message); } }
        if (a === 'colaboradores') { try { A.colabsMenu = await api('/acl/colaboradores'); } catch (e) { A.colabsMenu = []; erro('Erro', e.message); } }
        desenharAdmin();
    };
    function desenharAdmin() {
        const el = raiz('academia-lideres-admin-container'); if (!el) return;
        let corpo;
        if (A.t) corpo = htmlEditor();
        else if (A.aba === 'colaboradores') corpo = htmlColaboradoresMenu();
        else if (A.aba === 'certificados') corpo = htmlCertificados();
        else if (A.aba === 'trilhas') corpo = htmlTrilhas();
        else corpo = htmlDashboard();
        el.innerHTML = `<div class="acl-wrap">${topoAdmin()}<div class="acl-corpo">${corpo}</div></div>`;
    }

    function htmlColaboradoresMenu() {
        const lista = A.colabsMenu || [];
        const fCargo = A.fColabCargo || '';
        const fSt = A.fColabSt || '';
        const fQ = (A.fColabQ || '').toLowerCase();
        const cargos = [...new Set(lista.map(c => c.cargo).filter(Boolean))].sort();
        const filtrada = lista.filter(c => {
            if (fCargo && c.cargo !== fCargo) return false;
            if (fSt === 'matriculados' && !(c.trilhas && c.trilhas.length)) return false;
            if (fSt === 'nao_matriculados' && (c.trilhas && c.trilhas.length)) return false;
            if (fSt === 'concluidos' && !(c.trilhas && c.trilhas.some(t => t.status === 'concluido'))) return false;
            if (fQ && !c.nome.toLowerCase().includes(fQ) && !(c.departamento || '').toLowerCase().includes(fQ) && !(c.usuario_login || '').toLowerCase().includes(fQ)) return false;
            return true;
        });
        const linhas = filtrada.map(c => {
            const trs = (c.trilhas || []).map(t => `<div style="margin-bottom:4px;"><span class="acl-badge" style="background:${t.status === 'concluido' ? '#16a34a' : '#7c3aed'};font-size:.7rem;">${esc(t.trilha_nome)} · ${t.progresso}%</span></div>`).join('') || '<span style="color:#94a3b8;font-size:.82rem;">Nenhuma trilha vinculada</span>';
            const usuTxt = c.usuario_login
                ? `<span class="acl-chip ok" style="font-size:.75rem;"><i class="ph ph-user-check"></i> ${esc(c.usuario_login)}</span>`
                : `<span class="acl-chip enc" style="font-size:.75rem;"><i class="ph ph-user-Minus"></i> Sem login vinculado</span>`;
            return `<tr>
                <td data-l="Colaborador"><div class="acl-pessoa" style="cursor:default">${avatar(c.nome, c.foto)}<div><b>${esc(c.nome)}</b><small>${esc(c.cargo || 'Sem cargo')}${c.departamento ? ' · ' + esc(c.departamento) : ''}</small></div></div></td>
                <td data-l="Login no Sistema">${usuTxt} <button class="acl-btn sec sm" style="padding:3px 8px;font-size:.73rem;margin-left:4px;" onclick="window._aclVincularUsuarioModal(${c.id}, '${esc(c.nome)}', ${c.usuario_id || 0})" title="Vincular ou alterar usuário de login"><i class="ph ph-link"></i></button></td>
                <td data-l="Trilha(s) e Progresso">${trs}</td>
                <td data-l="Missões / Pontos">${c.missoes || 0} missão(ões) · <b>+${c.pontos || 0} pts</b></td>
                <td class="acl-acoes">
                    <button class="acl-btn pri sm" onclick="window._aclMatricularMenu(${c.id})" title="Vincular colaborador a uma trilha"><i class="ph ph-plus-circle"></i> Vincular trilha</button>
                    <button class="acl-btn sec sm" onclick="window._aclVerComoParticipante(${c.id})" title="Ver Minha Academia como este colaborador"><i class="ph ph-eye"></i></button>
                </td>
            </tr>`;
        }).join('');
        const tab = filtrada.length
            ? `<div class="acl-tabela-wrap"><table class="acl-tabela"><thead><tr><th>Colaborador</th><th>Usuário de Login</th><th>Trilha(s) / Progresso</th><th>Missões / Pontos</th><th>Ações</th></tr></thead><tbody>${linhas}</tbody></table></div>`
            : '<div class="acl-vazio"><i class="ph ph-users"></i><div>Nenhum colaborador encontrado para este filtro.</div></div>';
        return `<div class="acl-barra-acoes">
            <h3 class="acl-titulo-sec"><i class="ph ph-users"></i> Colaboradores da Academia (${filtrada.length})</h3>
            <button class="acl-btn pri" onclick="window._aclMatricularMenu()"><i class="ph ph-user-plus"></i> + VINCULAR COLABORADORES A UMA TRILHA</button>
        </div>
        <p class="acl-dica"><i class="ph ph-info"></i> Aqui você vincula colaboradores às trilhas da Academia e confere qual usuário de login está associado a cada colaborador (sem precisar criar novas senhas).</p>
        <div class="acl-card" style="padding:12px 16px;">
            <div class="acl-form-2" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                <label style="font-size:.82rem;font-weight:600;color:#475569;">Filtrar por Cargo
                    <select onchange="window._aclFiltroColabMenu('cargo', this.value)" style="width:100%;margin-top:4px;padding:8px;border:1px solid #cbd5e1;border-radius:8px;">
                        <option value="">Todos os cargos</option>
                        ${cargos.map(cg => `<option value="${esc(cg)}" ${fCargo === cg ? 'selected' : ''}>${esc(cg)}</option>`).join('')}
                    </select>
                </label>
                <label style="font-size:.82rem;font-weight:600;color:#475569;">Situação na Academia
                    <select onchange="window._aclFiltroColabMenu('st', this.value)" style="width:100%;margin-top:4px;padding:8px;border:1px solid #cbd5e1;border-radius:8px;">
                        <option value="" ${!fSt ? 'selected' : ''}>Todos</option>
                        <option value="matriculados" ${fSt === 'matriculados' ? 'selected' : ''}>Já vinculados a uma trilha</option>
                        <option value="nao_matriculados" ${fSt === 'nao_matriculados' ? 'selected' : ''}>Sem trilha vinculada</option>
                        <option value="concluidos" ${fSt === 'concluidos' ? 'selected' : ''}>Concluíram trilha</option>
                    </select>
                </label>
                <label style="font-size:.82rem;font-weight:600;color:#475569;">Buscar colaborador ou usuário
                    <input type="text" value="${esc(A.fColabQ || '')}" oninput="window._aclFiltroColabMenu('q', this.value)" placeholder="Digite nome, depto ou login..." style="width:100%;margin-top:4px;padding:8px;border:1px solid #cbd5e1;border-radius:8px;">
                </label>
            </div>
        </div>
        ${tab}`;
    }
    window._aclFiltroColabMenu = function (k, v) {
        if (k === 'cargo') A.fColabCargo = v;
        if (k === 'st') A.fColabSt = v;
        if (k === 'q') A.fColabQ = v;
        desenharAdmin();
    };
    window._aclMatricularMenu = async function (preColabId) {
        const trilhas = A.lista || await api('/acl/trilhas');
        if (!trilhas.length) return erro('Nenhuma trilha', 'Crie uma trilha primeiro antes de vincular colaboradores.');
        const tidPadrao = trilhas[0].id;
        let colabs = A.colabsMenu || await api('/acl/colaboradores');
        window._aclColabs = colabs;
        const cargos = [...new Set(colabs.map(c => c.cargo).filter(Boolean))].sort();
        const cargoPre = preColabId ? '' : (cargos.find(c => c.toLowerCase().includes('lider') || c.toLowerCase().includes('líder')) || '');
        const html = `<div class="acl-form">
            <label>1. Escolha a Trilha
                <select id="aclmt-trilha" onchange="window._aclFiltrarMatMenu(${preColabId || 0})">
                    ${trilhas.map(t => `<option value="${t.id}">${esc(t.nome)} (${STATUS_TXT[t.status_efetivo] || t.status})</option>`).join('')}
                </select>
            </label>
            <div class="acl-form-2">
                <label>Filtrar por Cargo
                    <select id="aclmt-cargo" onchange="window._aclFiltrarMatMenu(${preColabId || 0})">
                        <option value="">Todos os cargos</option>
                        ${cargos.map(c => `<option value="${esc(c)}" ${c === cargoPre ? 'selected' : ''}>${esc(c)}</option>`).join('')}
                    </select>
                </label>
                <label>Buscar por nome
                    <input id="aclmt-q" oninput="window._aclFiltrarMatMenu(${preColabId || 0})" placeholder="Digite o nome...">
                </label>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin:4px 0;">
                <small style="color:#64748b;">Marque os colaboradores que deseja vincular à trilha:</small>
                <button type="button" class="acl-btn sec sm" style="padding:3px 8px;font-size:.75rem;" onclick="document.querySelectorAll('.aclmt-chk:not(:disabled)').forEach(x => x.checked = true)">Marcar todos visíveis</button>
            </div>
            <div id="aclmt-lista" class="acl-mat-lista"></div>
        </div>`;
        const r = await Swal.fire({
            title: 'Vincular colaboradores à Trilha', width: 660, html, showCancelButton: true,
            confirmButtonText: 'Vincular selecionados', cancelButtonText: 'Cancelar', confirmButtonColor: '#7c3aed', customClass: { popup: 'acl-swal' },
            didOpen: () => window._aclFiltrarMatMenu(preColabId || 0),
            preConfirm: () => {
                const tid = Number(document.getElementById('aclmt-trilha').value);
                const ids = [...document.querySelectorAll('.aclmt-chk:checked')].map(x => Number(x.value));
                if (!ids.length) { Swal.showValidationMessage('Selecione ao menos um colaborador.'); return false; }
                return { tid, ids };
            }
        });
        if (!r.isConfirmed) return;
        try {
            const res = await api('/acl/trilhas/' + r.value.tid + '/matriculas', { method: 'POST', body: jbody({ colaborador_ids: r.value.ids }) });
            okMsg(`${res.novos} colaborador(es) vinculado(s) à trilha!`);
            A.colabsMenu = await api('/acl/colaboradores');
            await carregarAdmin();
        } catch (e) { erro('Erro', e.message); }
    };
    window._aclFiltrarMatMenu = function (preColabId) {
        const tid = Number((document.getElementById('aclmt-trilha') || {}).value || 0);
        const cargo = (document.getElementById('aclmt-cargo') || {}).value || '';
        const q = ((document.getElementById('aclmt-q') || {}).value || '').toLowerCase();
        const marcados = new Set([...document.querySelectorAll('.aclmt-chk:checked')].map(x => x.value));
        if (preColabId) marcados.add(String(preColabId));
        const l = (window._aclColabs || []).filter(c => (!cargo || c.cargo === cargo) && (!q || c.nome.toLowerCase().includes(q)));
        const el = document.getElementById('aclmt-lista'); if (!el) return;
        el.innerHTML = l.map(c => {
            const ja = (c.trilhas || []).some(t => Number(t.track_id) === tid);
            return `<label class="acl-mat-item ${ja ? 'ja' : ''}"><input type="checkbox" class="aclmt-chk" value="${c.id}" ${ja ? 'disabled' : ''} ${!ja && marcados.has(String(c.id)) ? 'checked' : ''}>${avatar(c.nome, c.foto, 'sm')}<span><b>${esc(c.nome)}</b><small>${esc(c.cargo || 'Sem cargo')}${c.departamento ? ' · ' + esc(c.departamento) : ''}${ja ? ' · já vinculado nesta trilha' : ''}</small></span></label>`;
        }).join('') || '<div class="acl-vazio-sm">Nenhum colaborador encontrado.</div>';
    };
    window._aclVincularUsuarioModal = async function (colabId, colabNome, atualUid) {
        let usuarios = [];
        try { usuarios = await api('/acl/usuarios-ativos'); } catch (e) { return erro('Erro', e.message); }
        const html = `<div class="acl-form">
            <p style="font-size:.88rem;color:#475569;margin:0 0 8px;">Selecione qual usuário de login do sistema corresponde a <b>${esc(colabNome)}</b> para que ele visualize sua jornada em <b>Minha Academia</b>:</p>
            <label>Usuário de Login
                <select id="aclv-uid">
                    <option value="0">-- Vínculo automático por nome/e-mail --</option>
                    ${usuarios.map(u => `<option value="${u.id}" ${Number(u.id) === Number(atualUid) ? 'selected' : ''}>${esc(u.username)}${u.nome && u.nome !== u.username ? ' (' + esc(u.nome) + ')' : ''}${u.departamento ? ' — ' + esc(u.departamento) : ''}</option>`).join('')}
                </select>
            </label>
        </div>`;
        const r = await Swal.fire({
            title: 'Vincular Usuário ↔ Colaborador', width: 520, html, showCancelButton: true,
            confirmButtonText: 'Salvar vínculo', cancelButtonText: 'Cancelar', confirmButtonColor: '#7c3aed', customClass: { popup: 'acl-swal' },
            preConfirm: () => Number(document.getElementById('aclv-uid').value)
        });
        if (!r.isConfirmed) return;
        try {
            await api('/acl/vincular-usuario', { method: 'POST', body: jbody({ colaborador_id: colabId, usuario_id: r.value }) });
            okMsg('Vínculo atualizado!');
            A.colabsMenu = await api('/acl/colaboradores');
            desenharAdmin();
        } catch (e) { erro('Erro', e.message); }
    };
    window._aclVerComoParticipante = function (colabId) {
        M.colabOverride = colabId;
        if (typeof window.navigateTo === 'function') window.navigateTo('academia-lideres-minha');
        setTimeout(() => window.renderAcademiaLideresMinha(), 80);
    };

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
            ${kpi('ph-target', 'Missões para avaliar', d.missoes_pendentes || 0, '#ea580c')}
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
            A.qe = null; await extrasTab(id);
            desenharAdmin();
        } catch (e) { erro('Não foi possível abrir a trilha', e.message); }
    };
    window._aclVoltar = function () { A.t = null; A.aba = 'trilhas'; carregarAdmin(); };
    window._aclTab = async function (tab) {
        A.tab = tab; A.qe = null;
        try { await extrasTab(A.t.id); } catch (e) { erro('Erro', e.message); }
        desenharAdmin();
    };
    async function recarregarTrilha() { const id = A.t.id; A.t = await api('/acl/trilhas/' + id); await extrasTab(id); desenharAdmin(); }

    function htmlEditor() {
        const t = A.t, st = t.status_efetivo;
        const pendMiss = (t.missoes || []).reduce((n, x) => n + (x.qtd_pendentes || 0), 0);
        const abas = [['visao', 'ph-clipboard-text', 'Visão Geral'], ['modulos', 'ph-books', 'Módulos'], ['avaliacoes', 'ph-note-pencil', 'Avaliações'], ['missoes', 'ph-target', 'Missões'], ['cronograma', 'ph-calendar-dots', 'Cronograma'], ['participantes', 'ph-users', 'Participantes'], ['desempenho', 'ph-chart-bar', 'Desempenho'], ['config', 'ph-gear', 'Configurações']];
        const abasHtml = abas.map(a => `<button class="acl-tab ${A.tab === a[0] ? 'on' : ''}" onclick="window._aclTab('${a[0]}')"><i class="ph ${a[1]}"></i> ${a[2]}${a[0] === 'missoes' && pendMiss ? `<span class="acl-tab-n">${pendMiss}</span>` : ''}</button>`).join('');
        let corpo = '';
        if (A.tab === 'visao') corpo = tabVisao();
        else if (A.tab === 'modulos') corpo = tabModulos();
        else if (A.tab === 'participantes') corpo = tabParticipantes();
        else if (A.tab === 'desempenho') corpo = tabDesempenho();
        else if (A.tab === 'avaliacoes') corpo = tabAvaliacoes();
        else if (A.tab === 'missoes') corpo = tabMissoes();
        else if (A.tab === 'cronograma') corpo = tabCronograma();
        else if (A.tab === 'config') corpo = tabConfig();
        else corpo = `<div class="acl-vazio"><i class="ph ph-hourglass-medium"></i><div><b>Disponível nas próximas fases</b><br>Fase 3 — Missões opcionais com pontos bônus.</div></div>`;
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

    // ── Aba Missões (admin) ─────────────────────────────────────────────────────
    const ST_MISSAO = { rascunho: ['Rascunho', '#64748b'], publicada: ['Publicada', '#16a34a'], encerrada: ['Encerrada', '#dc2626'] };
    function tabMissoes() {
        const t = A.t, ms = t.missoes || [];
        const pend = ms.reduce((n, x) => n + (x.qtd_pendentes || 0), 0);
        const sub = `<div class="acl-subtabs"><button class="acl-chip-btn ${A.msub !== 'avaliar' ? 'on' : ''}" onclick="window._aclMsub('lista')"><i class="ph ph-target"></i> Missões da trilha</button><button class="acl-chip-btn ${A.msub === 'avaliar' ? 'on' : ''}" onclick="window._aclMsub('avaliar')"><i class="ph ph-clipboard-text"></i> Missões para avaliar${pend ? `<span class="acl-tab-n">${pend}</span>` : ''}</button></div>`;
        const aviso = '<p class="acl-dica"><i class="ph ph-info"></i> Missões são <b>opcionais</b>: não alteram o progresso, a nota nem o certificado. Elas só geram pontos bônus depois de aprovadas.</p>';
        if (A.msub === 'avaliar') return `${sub}${aviso}${htmlParaAvaliar()}`;
        const modNome = id => { const m = (t.modulos || []).find(x => x.id === id); return m ? m.titulo : 'Trilha toda'; };
        const cards = ms.map(m => { const st = ST_MISSAO[m.status] || ST_MISSAO.rascunho; return `<div class="acl-card"><div class="acl-tc-top"><h3><i class="ph ph-target"></i> ${esc(m.nome)}</h3><span class="acl-badge" style="background:${st[1]};">${st[0]}</span></div>${demoTag(m)}
            <p class="acl-dica">${esc(m.descricao || '')}</p>
            <div class="acl-meta"><span><i class="ph ph-books"></i> ${esc(modNome(m.module_id))}</span><span><i class="ph ph-star"></i> ${m.pontos_base} pts + ${m.pontos_bonus} pts de bônus por comprovação</span><span><i class="ph ph-calendar-blank"></i> ${m.data_inicio ? fmtBr(m.data_inicio) : fmtBr(t.data_inicio)} → ${m.data_fim ? fmtBr(m.data_fim) : fmtBr(t.data_fim)}</span><span><i class="ph ph-paper-plane-tilt"></i> ${m.qtd_envios} envio(s) · ${m.qtd_pendentes} em análise · ${m.qtd_aprovadas} aprovado(s)</span>${m.permite_nova_tentativa ? '' : '<span>sem nova tentativa</span>'}</div>
            <div class="acl-cfg-btns"><button class="acl-btn sec sm" onclick="window._aclFormMissao(${m.id})"><i class="ph ph-pencil-simple"></i> Editar</button><button class="acl-btn del sm" onclick="window._aclDelMissao(${m.id})"><i class="ph ph-trash"></i> Excluir</button></div></div>`; }).join('')
            || '<div class="acl-vazio"><i class="ph ph-target"></i><div>Nenhuma missão ainda. Crie missões opcionais para incentivar a prática.</div></div>';
        return `${sub}${aviso}<div class="acl-barra-acoes"><h3 class="acl-titulo-sec"><i class="ph ph-target"></i> Missões da trilha</h3><button class="acl-btn pri" onclick="window._aclFormMissao()"><i class="ph ph-plus-circle"></i> ADICIONAR MISSÃO</button></div><div class="acl-corpo">${cards}</div>`;
    }
    window._aclMsub = async function (x) { A.msub = x; if (x === 'avaliar') { try { await extrasTab(A.t.id); } catch (e) { erro('Erro', e.message); } } desenharAdmin(); };
    function htmlParaAvaliar() {
        const fil = A.envFiltro || 'em_analise';
        const chip = (id, rot) => `<button class="acl-chip-btn ${fil === id ? 'on' : ''}" onclick="window._aclEnvFiltro('${id}')">${rot}</button>`;
        const stB = { em_analise: ['Em análise', '#ea580c'], aprovada: ['Aprovada', '#16a34a'], recusada: ['Recusada', '#dc2626'] };
        const l = (A.envios || []).map(e => `<div class="acl-card acl-env">
            <div class="acl-pessoa" style="cursor:default">${avatar(e.colaborador, e.foto)}<div><b>${esc(e.colaborador)}</b><small>${esc(e.cargo)}</small></div><span class="acl-badge" style="background:${stB[e.status][1]};margin-left:auto;">${stB[e.status][0]}</span></div>
            <div class="acl-meta"><span><i class="ph ph-target"></i> ${esc(e.missao)}</span><span><i class="ph ph-books"></i> ${esc(e.modulo)}</span><span><i class="ph ph-clock"></i> enviada em ${esc(String(e.enviado_em || '').slice(0, 16).replace('T', ' '))}</span><span><i class="ph ph-repeat"></i> tentativa ${e.tentativa}</span></div>
            <div class="acl-env-anot"><small>Anotações do líder</small><p>${esc(e.anotacoes)}</p></div>
            <div class="acl-anexos">${e.anexos.length ? e.anexos.map(a => `<a class="acl-btn sec sm" href="${esc(apiBase() + '/acl/envios/' + e.id + '/anexos/' + a.id + '?token=' + encodeURIComponent(getToken()))}" target="_blank" rel="noopener"><i class="ph ph-paperclip"></i> ${esc(a.nome)}</a>`).join('') : '<small class="acl-dica">Sem anexo (somente pontuação base).</small>'}</div>
            <div class="acl-pts"><b>Base: +${e.pontos_base}</b><span>Bônus: ${e.anexos.length ? '+' + e.pontos_bonus : '— (sem anexo)'}</span><span>${e.status === 'aprovada' ? 'Concedido: +' + e.pontos_concedidos : 'Total se aprovar: +' + e.pontos_potenciais}</span></div>
            ${e.status === 'recusada' ? `<div class="acl-aviso"><i class="ph ph-x-circle"></i> Motivo da recusa: ${esc(e.motivo_recusa || '')}</div>` : ''}
            ${e.status === 'em_analise' ? `<div class="acl-cfg-btns"><button class="acl-btn ok" onclick="window._aclAprovar(${e.id})"><i class="ph ph-check-circle"></i> APROVAR</button><button class="acl-btn del" onclick="window._aclRecusar(${e.id})"><i class="ph ph-x-circle"></i> RECUSAR</button></div>` : ''}</div>`).join('')
            || '<div class="acl-vazio"><i class="ph ph-clipboard-text"></i><div>Nenhuma missão neste filtro.</div></div>';
        return `<div class="acl-barra-acoes"><h3 class="acl-titulo-sec"><i class="ph ph-clipboard-text"></i> Missões para avaliar</h3></div><div class="acl-subtabs">${chip('em_analise', 'Em análise')}${chip('aprovada', 'Aprovadas')}${chip('recusada', 'Recusadas')}${chip('todas', 'Todas')}</div><div class="acl-corpo">${l}</div>`;
    }
    window._aclEnvFiltro = async function (f) { A.envFiltro = f; try { await extrasTab(A.t.id); } catch (e) { erro('Erro', e.message); } desenharAdmin(); };
    window._aclAprovar = async function (id) {
        const e = (A.envios || []).find(x => x.id === id); if (!e) return;
        const r = await Swal.fire({ icon: 'question', title: 'Aprovar missão?', html: `<b>${esc(e.colaborador)}</b> receberá <b>+${e.pontos_potenciais} pontos</b> (${e.pontos_base} base${e.anexos.length ? ' + ' + e.pontos_bonus + ' de comprovação' : ''}).`, showCancelButton: true, confirmButtonColor: '#16a34a', confirmButtonText: 'Aprovar', cancelButtonText: 'Cancelar' });
        if (!r.isConfirmed) return;
        try { const res = await api('/acl/envios/' + id + '/aprovar', { method: 'POST' }); okMsg(`Aprovada! +${res.pontos} pontos`); await recarregarTrilha(); } catch (er) { erro('Não foi possível aprovar', er.message); await recarregarTrilha(); }
    };
    window._aclRecusar = async function (id) {
        const r = await Swal.fire({ title: 'Recusar missão', input: 'textarea', inputLabel: 'Motivo da recusa (será mostrado ao participante)', inputPlaceholder: 'Explique o que faltou ou o que precisa ser ajustado', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Recusar', cancelButtonText: 'Cancelar', inputValidator: v => (!v || !v.trim()) ? 'Informe o motivo da recusa.' : null });
        if (!r.isConfirmed) return;
        try { await api('/acl/envios/' + id + '/recusar', { method: 'POST', body: jbody({ motivo: r.value }) }); okMsg('Missão recusada'); await recarregarTrilha(); } catch (er) { erro('Não foi possível recusar', er.message); await recarregarTrilha(); }
    };
    window._aclFormMissao = async function (id) {
        const t = A.t, m = id ? (t.missoes || []).find(x => x.id === id) : null;
        const r = await Swal.fire({
            title: m ? 'Editar missão' : 'Nova missão (opcional)', width: 720, showCancelButton: true, confirmButtonText: 'Salvar', cancelButtonText: 'Cancelar', confirmButtonColor: '#7c3aed', customClass: { popup: 'acl-swal' },
            html: `<div class="acl-form"><label>Nome da missão<input id="aclms-n" value="${esc(m ? m.nome : '')}" placeholder="Pratique o Feedback"></label>
            <label>Módulo relacionado<select id="aclms-m"><option value="">Trilha toda</option>${(t.modulos || []).map(x => `<option value="${x.id}" ${m && m.module_id === x.id ? 'selected' : ''}>${esc(x.titulo)}</option>`).join('')}</select></label>
            <label>Descrição da atividade<textarea id="aclms-d" rows="3" placeholder="Explique exatamente o que o líder deve fazer">${esc(m ? m.descricao : '')}</textarea></label>
            <label>Objetivo<textarea id="aclms-o" rows="2" placeholder="O que será desenvolvido">${esc(m ? m.objetivo : '')}</textarea></label>
            <label>Como realizar<textarea id="aclms-c" rows="3" placeholder="Orientações passo a passo">${esc(m ? m.como_realizar : '')}</textarea></label>
            <div class="acl-form-2"><label>Pontuação base<input id="aclms-pb" type="number" min="0" value="${m ? m.pontos_base : 20}"></label><label>Bônus por comprovação<input id="aclms-pn" type="number" min="0" value="${m ? m.pontos_bonus : 10}"></label></div>
            <div class="acl-form-2"><label>Data de início<input id="aclms-i" type="date" min="${esc(t.data_inicio)}" max="${esc(t.data_fim)}" value="${esc(m ? m.data_inicio : '')}"></label><label>Data limite<input id="aclms-f" type="date" min="${esc(t.data_inicio)}" max="${esc(t.data_fim)}" value="${esc(m ? m.data_fim : '')}"></label></div>
            <small>A data limite não pode ultrapassar o prazo final da trilha (${fmtBr(t.data_fim)}). Em branco = vale o prazo da trilha.</small>
            <label>Status<select id="aclms-s">${[['rascunho', 'Rascunho'], ['publicada', 'Publicada'], ['encerrada', 'Encerrada']].map(s => `<option value="${s[0]}" ${(m ? m.status : 'rascunho') === s[0] ? 'selected' : ''}>${s[1]}</option>`).join('')}</select></label>
            <label class="acl-chk"><input type="checkbox" id="aclms-nt" ${!m || m.permite_nova_tentativa ? 'checked' : ''}> Permitir nova tentativa quando a missão for recusada</label></div>`,
            preConfirm: () => { const v = i => document.getElementById(i).value; const o = { nome: v('aclms-n').trim(), module_id: v('aclms-m'), descricao: v('aclms-d'), objetivo: v('aclms-o'), como_realizar: v('aclms-c'), pontos_base: v('aclms-pb'), pontos_bonus: v('aclms-pn'), data_inicio: v('aclms-i'), data_fim: v('aclms-f'), status: v('aclms-s'), permite_nova_tentativa: document.getElementById('aclms-nt').checked };
                if (!o.nome) { Swal.showValidationMessage('Informe o nome da missão.'); return false; } if (!o.descricao.trim()) { Swal.showValidationMessage('Descreva a atividade.'); return false; }
                if (o.data_fim && o.data_fim > t.data_fim) { Swal.showValidationMessage('A data limite da missão não pode ultrapassar o prazo final da trilha.'); return false; }
                if (o.data_inicio && o.data_fim && o.data_fim < o.data_inicio) { Swal.showValidationMessage('A data limite não pode ser anterior à data de início.'); return false; } return o; }
        });
        if (!r.isConfirmed) return;
        try { if (m) await api('/acl/missoes/' + m.id, { method: 'PUT', body: jbody(r.value) }); else await api('/acl/trilhas/' + t.id + '/missoes', { method: 'POST', body: jbody(r.value) }); await recarregarTrilha(); }
        catch (e) { erro('Não foi possível salvar a missão', e.message); }
    };
    window._aclDelMissao = async function (id) {
        const m = (A.t.missoes || []).find(x => x.id === id);
        if (!await confirma('Excluir missão?', m && m.qtd_envios ? `Há ${m.qtd_envios} envio(s) e possíveis pontos já concedidos. Tudo será apagado definitivamente.` : 'A missão será apagada.', 'Excluir')) return;
        try { await api('/acl/missoes/' + id + '?forcar=1', { method: 'DELETE' }); await recarregarTrilha(); } catch (e) { erro('Erro', e.message); }
    };

    // ── Aba Configurações ─
    // ── Aba Avaliações ──────────────────────────────────────────────────────────
    const SIT_AV = { aprovada: 'Aprovada', aberta: 'Aberta', nao_aberta: 'Ainda não aberta', encerrada: 'Encerrada', esgotada: 'Tentativas esgotadas' };
    function tabAvaliacoes() {
        if (A.qe) return htmlQuizEditor();
        const t = A.t, avs = t.avaliacoes || [];
        const h = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        const modNome = id => { const m = (t.modulos || []).find(x => x.id === id); return m ? m.titulo : 'Avaliação geral da trilha'; };
        const cards = avs.map(q => {
            const enc = q.data_limite && h > q.data_limite;
            return `<div class="acl-card acl-av-card ${q.ativo ? '' : 'inativo'}">
                <div class="acl-tc-top"><h3>${esc(q.nome)}</h3><span class="acl-badge" style="background:${enc ? '#dc2626' : (q.obrigatoria ? '#7c3aed' : '#64748b')};">${enc ? 'Encerrada' : (q.obrigatoria ? 'Obrigatória' : 'Opcional')}</span></div>${demoTag(q)}
                <p class="acl-dica">${esc(q.descricao || '')}</p>
                <div class="acl-meta"><span><i class="ph ph-books"></i> ${esc(modNome(q.module_id))}</span><span><i class="ph ph-question"></i> ${q.qtd_perguntas} pergunta(s)</span><span><i class="ph ph-target"></i> nota mínima ${q.nota_minima}%</span><span><i class="ph ph-repeat"></i> ${q.tentativas} tentativa(s)</span>
                    <span><i class="ph ph-calendar-blank"></i> ${q.data_abertura ? fmtBr(q.data_abertura) : 'abertura livre'} → ${q.data_limite ? fmtBr(q.data_limite) : 'sem limite'}</span><span><i class="ph ph-users"></i> ${q.qtd_aprovados} aprovado(s) · ${q.qtd_tentativas} tentativa(s) feitas</span>${q.ativo ? '' : '<span>desativada</span>'}</div>
                ${q.qtd_perguntas ? '' : '<div class="acl-aviso"><i class="ph ph-warning"></i> Sem perguntas: esta avaliação não aparece para os participantes nem conta no progresso.</div>'}
                <div class="acl-cfg-btns"><button class="acl-btn pri sm" onclick="window._aclEditarPerguntas(${q.id})"><i class="ph ph-list-checks"></i> Perguntas</button><button class="acl-btn sec sm" onclick="window._aclResultados(${q.id})"><i class="ph ph-chart-bar"></i> Resultados</button><button class="acl-btn sec sm" onclick="window._aclFormAvaliacao(${q.id})"><i class="ph ph-pencil-simple"></i> Editar</button><button class="acl-btn del sm" onclick="window._aclDelAvaliacao(${q.id})"><i class="ph ph-trash"></i> Excluir</button></div></div>`;
        }).join('') || '<div class="acl-vazio"><i class="ph ph-note-pencil"></i><div>Nenhuma avaliação ainda. Crie a primeira para a trilha ou para um módulo.</div></div>';
        return `<div class="acl-barra-acoes"><h3 class="acl-titulo-sec"><i class="ph ph-note-pencil"></i> Avaliações</h3><button class="acl-btn pri" onclick="window._aclFormAvaliacao()"><i class="ph ph-plus-circle"></i> ADICIONAR AVALIAÇÃO</button></div><div class="acl-corpo">${cards}</div>`;
    }
    window._aclFormAvaliacao = async function (id) {
        const t = A.t, q = id ? (t.avaliacoes || []).find(x => x.id === id) : null;
        const r = await Swal.fire({
            title: q ? 'Editar avaliação' : 'Nova avaliação', width: 640, showCancelButton: true, confirmButtonText: 'Salvar', cancelButtonText: 'Cancelar', confirmButtonColor: '#7c3aed', customClass: { popup: 'acl-swal' },
            html: `<div class="acl-form"><label>Nome<input id="aclav-n" value="${esc(q ? q.nome : '')}" placeholder="Avaliação do Módulo 1"></label><label>Descrição<textarea id="aclav-d" rows="2">${esc(q ? q.descricao : '')}</textarea></label>
            <label>Vincular a um módulo<select id="aclav-m"><option value="">Avaliação geral da trilha</option>${(t.modulos || []).map(m => `<option value="${m.id}" ${q && q.module_id === m.id ? 'selected' : ''}>${esc(m.titulo)}</option>`).join('')}</select></label>
            <div class="acl-form-2"><label>Nota mínima (%)<input id="aclav-nm" type="number" min="0" max="100" value="${q ? q.nota_minima : 70}"></label><label>Tentativas permitidas<input id="aclav-t" type="number" min="1" value="${q ? q.tentativas : 3}"></label></div>
            <div class="acl-form-2"><label>Data de abertura<input id="aclav-a" type="date" min="${esc(t.data_inicio)}" max="${esc(t.data_fim)}" value="${esc(q ? q.data_abertura : '')}"></label><label>Data limite<input id="aclav-l" type="date" min="${esc(t.data_inicio)}" max="${esc(t.data_fim)}" value="${esc(q ? q.data_limite : '')}"></label></div>
            <small>Prazo precisa estar entre ${fmtBr(t.data_inicio)} e ${fmtBr(t.data_fim)}. Após a data limite a avaliação é encerrada.</small>
            <label class="acl-chk"><input type="checkbox" id="aclav-o" ${!q || q.obrigatoria ? 'checked' : ''}> Obrigatória (aprovação conta no progresso e no certificado)</label>
            <label class="acl-chk"><input type="checkbox" id="aclav-at" ${!q || q.ativo ? 'checked' : ''}> Ativa</label></div>`,
            preConfirm: () => { const v = i => document.getElementById(i).value; const o = { nome: v('aclav-n').trim(), descricao: v('aclav-d'), module_id: v('aclav-m'), nota_minima: v('aclav-nm'), tentativas: v('aclav-t'), data_abertura: v('aclav-a'), data_limite: v('aclav-l'), obrigatoria: document.getElementById('aclav-o').checked, ativo: document.getElementById('aclav-at').checked };
                if (!o.nome) { Swal.showValidationMessage('Informe o nome da avaliação.'); return false; } return o; }
        });
        if (!r.isConfirmed) return;
        try {
            if (q) await api('/acl/avaliacoes/' + q.id, { method: 'PUT', body: jbody(r.value) }); else { const n = await api('/acl/trilhas/' + t.id + '/avaliacoes', { method: 'POST', body: jbody(r.value) }); await recarregarTrilha(); return window._aclEditarPerguntas(n.id); }
            await recarregarTrilha();
        } catch (e) { erro('Não foi possível salvar a avaliação', e.message); }
    };
    window._aclDelAvaliacao = async function (id) {
        if (!await confirma('Excluir avaliação?', 'Perguntas e resultados dos participantes serão apagados.', 'Excluir')) return;
        try { await api('/acl/avaliacoes/' + id, { method: 'DELETE' }); await recarregarTrilha(); } catch (e) { erro('Erro', e.message); }
    };
    // editor de perguntas (inline)
    window._aclEditarPerguntas = async function (id) {
        try {
            const q = await api('/acl/avaliacoes/' + id);
            A.qe = { id: q.id, nome: q.nome, perguntas: q.perguntas.map(p => ({ tipo: p.tipo, enunciado: p.enunciado, alternativas: p.tipo === 'multipla' ? p.alternativas.map(a => ({ texto: a.texto, correta: !!a.correta })) : [],
                resposta_vf: p.tipo === 'vf' ? ((p.alternativas.find(a => a.correta) || {}).texto === 'Falso' ? 'falso' : 'verdadeiro') : null })) };
            A.tab = 'avaliacoes'; desenharAdmin();
        } catch (e) { erro('Erro', e.message); }
    };
    function htmlQuizEditor() {
        const q = A.qe;
        const tipos = [['multipla', 'Múltipla escolha'], ['vf', 'Verdadeiro ou falso'], ['aberta', 'Pergunta aberta']];
        const ps = q.perguntas.map((p, i) => {
            let corpo = '';
            if (p.tipo === 'multipla') corpo = `<div class="acl-alts">${p.alternativas.map((a, k) => `<div class="acl-alt"><input type="radio" name="aclq-${i}" ${a.correta ? 'checked' : ''} onchange="window._aclQCorreta(${i},${k})" title="Marcar como correta"><input type="text" value="${esc(a.texto)}" placeholder="Alternativa ${k + 1}" oninput="window._aclQAlt(${i},${k},this.value)"><button type="button" class="acl-q-x" onclick="window._aclQAltDel(${i},${k})" title="Remover"><i class="ph ph-x"></i></button></div>`).join('')}<button type="button" class="acl-btn sec sm" onclick="window._aclQAltAdd(${i})"><i class="ph ph-plus"></i> Alternativa</button><small>Marque o círculo da alternativa correta.</small></div>`;
            else if (p.tipo === 'vf') corpo = `<div class="acl-alts"><label class="acl-chk"><input type="radio" name="aclq-${i}" ${p.resposta_vf === 'verdadeiro' ? 'checked' : ''} onchange="window._aclQVF(${i},'verdadeiro')"> A afirmação é <b>Verdadeira</b></label><label class="acl-chk"><input type="radio" name="aclq-${i}" ${p.resposta_vf === 'falso' ? 'checked' : ''} onchange="window._aclQVF(${i},'falso')"> A afirmação é <b>Falsa</b></label></div>`;
            else corpo = '<small>Pergunta aberta: o participante escreve a resposta; ela fica registrada para você ler nos Resultados e não entra na nota.</small>';
            return `<div class="acl-q"><div class="acl-q-top"><b>Pergunta ${i + 1}</b><select onchange="window._aclQTipo(${i},this.value)">${tipos.map(t => `<option value="${t[0]}" ${p.tipo === t[0] ? 'selected' : ''}>${t[1]}</option>`).join('')}</select><button type="button" class="acl-q-x" onclick="window._aclQDel(${i})" title="Excluir pergunta"><i class="ph ph-trash"></i></button></div>
                <textarea rows="2" placeholder="Enunciado da pergunta" oninput="window._aclQSet(${i},this.value)">${esc(p.enunciado)}</textarea>${corpo}</div>`;
        }).join('') || '<div class="acl-vazio-sm">Nenhuma pergunta. Adicione a primeira.</div>';
        return `<button class="acl-voltar" onclick="window._aclQFechar()"><i class="ph ph-arrow-left"></i> Voltar às avaliações</button><div class="acl-card"><h3><i class="ph ph-list-checks"></i> Perguntas — ${esc(q.nome)}</h3><div class="acl-corpo">${ps}</div>
            <div class="acl-cfg-btns" style="margin-top:12px"><button class="acl-btn sec" onclick="window._aclQAdd()"><i class="ph ph-plus-circle"></i> Adicionar pergunta</button><button class="acl-btn ok" onclick="window._aclQSalvar()"><i class="ph ph-floppy-disk"></i> Salvar perguntas</button></div></div>`;
    }
    window._aclQFechar = function () { A.qe = null; desenharAdmin(); };
    window._aclQAdd = function () { A.qe.perguntas.push({ tipo: 'multipla', enunciado: '', alternativas: [{ texto: '', correta: true }, { texto: '', correta: false }], resposta_vf: null }); desenharAdmin(); };
    window._aclQDel = function (i) { A.qe.perguntas.splice(i, 1); desenharAdmin(); };
    window._aclQSet = function (i, v) { A.qe.perguntas[i].enunciado = v; };
    window._aclQTipo = function (i, tipo) { const p = A.qe.perguntas[i]; p.tipo = tipo; if (tipo === 'multipla' && p.alternativas.length < 2) p.alternativas = [{ texto: '', correta: true }, { texto: '', correta: false }]; if (tipo === 'vf' && !p.resposta_vf) p.resposta_vf = 'verdadeiro'; desenharAdmin(); };
    window._aclQAlt = function (i, k, v) { A.qe.perguntas[i].alternativas[k].texto = v; };
    window._aclQCorreta = function (i, k) { A.qe.perguntas[i].alternativas.forEach((a, n) => { a.correta = n === k; }); };
    window._aclQAltAdd = function (i) { A.qe.perguntas[i].alternativas.push({ texto: '', correta: false }); desenharAdmin(); };
    window._aclQAltDel = function (i, k) { const alts = A.qe.perguntas[i].alternativas; if (alts.length <= 2) return erro('Mínimo de alternativas', 'Cada pergunta precisa de pelo menos 2 alternativas.'); const eraC = alts[k].correta; alts.splice(k, 1); if (eraC) alts[0].correta = true; desenharAdmin(); };
    window._aclQVF = function (i, v) { A.qe.perguntas[i].resposta_vf = v; };
    window._aclQSalvar = async function () {
        const body = { perguntas: A.qe.perguntas.map(p => ({ tipo: p.tipo, enunciado: p.enunciado, alternativas: p.alternativas, resposta_vf: p.resposta_vf })) };
        try { await api('/acl/avaliacoes/' + A.qe.id + '/perguntas', { method: 'PUT', body: jbody(body) }); }
        catch (e) {
            if (e.status === 409 && e.body && e.body.tentativas) { if (!await confirma('Alterar mesmo assim?', e.message, 'Salvar mesmo assim')) return; try { body.forcar = true; await api('/acl/avaliacoes/' + A.qe.id + '/perguntas', { method: 'PUT', body: jbody(body) }); } catch (e2) { return erro('Não foi possível salvar', e2.message); } }
            else return erro('Não foi possível salvar', e.message);
        }
        okMsg('Perguntas salvas!'); A.qe = null; await recarregarTrilha();
    };
    window._aclResultados = async function (id) {
        try {
            const r = await api('/acl/avaliacoes/' + id + '/resultados');
            const linhas = r.tentativas.map(t => `<div class="acl-res"><div><b>${esc(t.colaborador)}</b> <small>· tentativa ${t.numero} · ${esc(String(t.enviado_em || '').slice(0, 16).replace('T', ' '))}</small></div><div><span class="acl-badge" style="background:${t.aprovado ? '#16a34a' : '#dc2626'};">${t.nota == null ? 'Sem nota (só abertas)' : t.nota + '%'} · ${t.aprovado ? 'Aprovado' : 'Reprovado'}</span></div>${t.abertas.map(a => `<div class="acl-res-ab"><small>${esc(a.pergunta)}</small><p>${esc(a.resposta)}</p></div>`).join('')}</div>`).join('') || '<div class="acl-vazio-sm">Ninguém respondeu ainda.</div>';
            Swal.fire({ title: 'Resultados', width: 680, confirmButtonColor: '#7c3aed', confirmButtonText: 'Fechar', customClass: { popup: 'acl-swal' }, html: `<div style="text-align:left;max-height:60vh;overflow:auto">${linhas}</div>` });
        } catch (e) { erro('Erro', e.message); }
    };

    // ── Aba Cronograma (linha do tempo) ────────────────────────────────────────
    function tabCronograma() {
        const t = A.t, D = s => new Date(s + 'T12:00:00').getTime();
        const ini = D(t.data_inicio), fim = D(t.data_fim), span = Math.max(1, fim - ini);
        const pos = s => Math.max(0, Math.min(100, ((D(s) - ini) / span) * 100));
        const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        const marcaHoje = (hoje >= t.data_inicio && hoje <= t.data_fim) ? `<i class="acl-tl-hoje" style="left:${pos(hoje)}%;" title="Hoje"></i>` : '';
        const barraTL = (a, b, cor) => { const l = a ? pos(a) : 0, r = b ? pos(b) : 100; return `<div class="acl-tl-trilho">${marcaHoje}<i class="acl-tl-barra" style="left:${l}%;width:${Math.max(1.5, r - l)}%;background:${cor};"></i></div>`; };
        const avsDe = id => (t.avaliacoes || []).filter(q => (q.module_id || null) === id && q.ativo);
        const missDe = id => (t.missoes || []).filter(x => (x.module_id || null) === id);
        const blocoMiss = x => `<div class="acl-tl-item"><i class="ph ph-target" style="color:#ea580c"></i><span><b>${esc(x.nome)}</b> <small>missão opcional · ${x.data_inicio ? fmtBr(x.data_inicio) : fmtBr(t.data_inicio)} → ${x.data_fim ? fmtBr(x.data_fim) : fmtBr(t.data_fim)}${x.status === 'rascunho' ? ' · rascunho' : ''}</small></span></div>`;
        const blocoAv = q => `<div class="acl-tl-item"><i class="ph ph-note-pencil" style="color:#2563eb"></i><span><b>${esc(q.nome)}</b> <small>${q.data_abertura ? fmtBr(q.data_abertura) : 'abertura livre'} → ${q.data_limite ? fmtBr(q.data_limite) : 'sem limite'} · ${q.obrigatoria ? 'obrigatória' : 'opcional'}</small></span></div>`;
        const mods = (t.modulos || []).map((m, i) => {
            const aulas = m.aulas || [], avs = avsDe(m.id);
            return `<div class="acl-tl-mod ${m.ativo ? '' : 'inativo'}"><div class="acl-tl-topo"><span class="acl-m-n">${i + 1}</span><div><b>${esc(m.titulo)}</b><small>${m.data_inicio ? fmtBr(m.data_inicio) + ' → ' + fmtBr(m.data_fim) : 'Sem prazo próprio (vale o prazo da trilha)'}${m.ativo ? '' : ' · desativado'}</small></div></div>
                ${barraTL(m.data_inicio, m.data_fim, m.data_inicio ? '#7c3aed' : '#ddd6fe')}
                <div class="acl-tl-itens"><div class="acl-tl-item"><i class="ph ph-play-circle" style="color:#7c3aed"></i><span><b>${aulas.length} aula(s)</b> <small>${aulas.filter(a => a.obrigatoria).length} obrigatória(s)${aulas.some(a => a.prazo) ? ' · prazos: ' + aulas.filter(a => a.prazo).map(a => esc(a.titulo) + ' ' + fmtBr(a.prazo)).join('; ') : ''}</small></span></div>${avs.map(blocoAv).join('')}${missDe(m.id).map(blocoMiss).join('')}</div></div>`;
        }).join('') || '<div class="acl-vazio-sm">Crie módulos para montar o cronograma.</div>';
        const gerais = avsDe(null), gMiss = missDe(null);
        return `<div class="acl-card"><h3><i class="ph ph-calendar-dots"></i> Jornada da trilha</h3><div class="acl-tl-escala"><span>${fmtBr(t.data_inicio)}</span><b>${esc(prazoTxt(t.prazo))}</b><span>${fmtBr(t.data_fim)}</span></div>${barraTL(t.data_inicio, t.data_fim, '#2563eb')}<small class="acl-dica">A linha vermelha marca o dia de hoje.</small></div>
            <div class="acl-corpo">${mods}${(gerais.length || gMiss.length) ? `<div class="acl-tl-mod"><div class="acl-tl-topo"><span class="acl-m-n"><i class="ph ph-flag"></i></span><div><b>Itens gerais da trilha</b></div></div><div class="acl-tl-itens">${gerais.map(blocoAv).join('')}${gMiss.map(blocoMiss).join('')}</div></div>` : ''}</div>`;
    }

    // ── Aba Desempenho ──────────────────────────────────────────────────────────
    function tabDesempenho() {
        const d = A.desemp;
        if (!d) return '<div class="acl-loading"><i class="ph ph-spinner ph-spin"></i> Carregando...</div>';
        return `<div class="acl-kpis">${kpi('ph-chart-line-up', 'Média de progresso', d.media_progresso + '%', '#16a34a')}${kpi('ph-seal-check', 'Taxa de conclusão', d.taxa_conclusao + '%', '#16a34a')}${kpi('ph-note-pencil', 'Média das avaliações', d.media_avaliacoes == null ? '—' : d.media_avaliacoes + '%', '#2563eb')}${kpi('ph-users', 'Participantes', d.participantes, '#7c3aed')}${kpi('ph-activity', 'Participação (já iniciaram)', d.participacao + '%', '#7c3aed')}${kpi('ph-certificate', 'Certificados', d.certificados, '#2563eb')}${kpi('ph-target', 'Missões aprovadas', d.missoes_aprovadas, '#ea580c')}${kpi('ph-star', 'Pontos distribuídos', d.pontos_distribuidos, '#ea580c')}${kpi('ph-hourglass', 'Missões em análise', d.missoes_pendentes, '#64748b')}</div>
            <p class="acl-dica">${d.itens_obrigatorios} item(ns) obrigatório(s) compõem o progresso (aulas e avaliações). A média de evolução chega na fase 4 (Ranking de Evolução). Missões não entram no progresso.</p>`;
    }
    async function extrasTab(id) {
        if (A.tab === 'participantes') A.part = await api('/acl/trilhas/' + id + '/participantes');
        if (A.tab === 'desempenho') A.desemp = await api('/acl/trilhas/' + id + '/desempenho');
        if (A.tab === 'missoes' && A.msub === 'avaliar') A.envios = await api('/acl/trilhas/' + id + '/envios' + ((A.envFiltro || 'em_analise') === 'todas' ? '' : '?status=' + (A.envFiltro || 'em_analise')));
    }

    // ── Certificados (menu principal do admin) ─────────────────────────────────
    function htmlCertificados() {
        const l = A.certs || [];
        const linhas = l.map(c => `<tr><td data-l="Nº"><b>${esc(c.numero)}</b></td><td data-l="Colaborador">${esc(c.colaborador)}<small style="display:block;color:#64748b">${esc(c.cargo)}</small></td><td data-l="Trilha">${esc(c.trilha)}</td><td data-l="Carga">${c.carga_horaria ? c.carga_horaria + ' h' : '—'}</td><td data-l="Conclusão">${fmtBr(c.data_conclusao)}</td>
            <td class="acl-acoes"><button onclick="window.open('${apiBase()}/acl/certificados/${c.id}/pdf?token=' + encodeURIComponent('${esc(getToken())}'), '_blank')" title="Visualizar / baixar PDF"><i class="ph ph-file-pdf"></i></button><button class="del" onclick="window._aclRevogarCert(${c.id})" title="Revogar"><i class="ph ph-trash"></i></button></td></tr>`).join('');
        return `<div class="acl-barra-acoes"><h3 class="acl-titulo-sec"><i class="ph ph-certificate"></i> Certificados emitidos</h3></div><p class="acl-dica">O certificado é emitido automaticamente quando o participante conclui 100% do conteúdo obrigatório (aulas e avaliações). Missões não são requisito.</p>
            ${l.length ? `<div class="acl-tabela-wrap"><table class="acl-tabela"><thead><tr><th>Nº</th><th>Colaborador</th><th>Trilha</th><th>Carga</th><th>Conclusão</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>` : '<div class="acl-vazio"><i class="ph ph-certificate"></i><div>Nenhum certificado emitido ainda.</div></div>'}`;
    }
    window._aclRevogarCert = async function (id) {
        if (!await confirma('Revogar certificado?', 'O certificado deixará de existir. Se o participante ainda estiver com 100%, um novo número será emitido na próxima atualização de progresso.', 'Revogar')) return;
        try { await api('/acl/certificados/' + id, { method: 'DELETE' }); A.certs = await api('/acl/certificados'); desenharAdmin(); } catch (e) { erro('Erro', e.message); }
    };

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
    const qColab = (sep = '?') => M.colabOverride ? `${sep}colab_id=${M.colabOverride}` : '';
    window.renderAcademiaLideresMinha = async function () {
        const el = raiz('academia-lideres-minha-container'); if (!el) return;
        M.tid = null; carregando(el, 'Carregando sua Academia...');
        try { M.dados = await api('/acl/minha' + qColab('?')); desenharMinha(); }
        catch (e) { el.innerHTML = `<div class="acl-wrap"><div class="acl-erro"><i class="ph ph-warning-circle"></i> ${esc(e.message)}</div></div>`; }
    };
    const FRASES = ['Cada aula concluída é um passo na sua evolução.', 'Liderar é aprender todos os dias.', 'Pequenos avanços constantes geram grandes resultados.'];
    function barraAdminMinha(d) {
        if (!d || !d.is_admin) return '';
        const ops = (d.admin_colaboradores || []).map(c => `<option value="${c.id}" ${Number(M.colabOverride || (d.colaborador && d.colaborador.id)) === Number(c.id) ? 'selected' : ''}>${esc(c.nome)} (${esc(c.cargo || 'Sem cargo')})${c.qtd_trilhas ? ' · ' + c.qtd_trilhas + ' trilha(s)' : ' · sem trilha'}</option>`).join('');
        return `<div class="acl-card" style="background:#f5f3ff;border:1px solid #c4b5fd;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div style="display:flex;align-items:center;gap:8px;color:#5b21b6;font-weight:700;font-size:.86rem;">
                <i class="ph ph-shield-star" style="font-size:1.15rem;"></i>
                <span>Visão de Administrador — Visualizando Minha Academia como:</span>
                <select onchange="window._aclTrocarColabMinha(this.value)" style="padding:6px 10px;border:1px solid #a78bfa;border-radius:8px;background:#fff;color:#1e293b;font-weight:600;font-size:.83rem;">
                    <option value="0" ${!M.colabOverride ? 'selected' : ''}>Meu usuário (${esc((d.colaborador && d.colaborador.nome) || 'Admin')})</option>
                    ${ops}
                </select>
            </div>
            <div style="display:flex;gap:8px;">
                <button class="acl-btn pri sm" onclick="window._aclIrParaVincularColabs()"><i class="ph ph-user-plus"></i> Vincular Colaboradores</button>
                <button class="acl-btn sec sm" onclick="if(typeof navigateTo==='function') navigateTo('academia-lideres-admin')"><i class="ph ph-gear"></i> Gerenciar Academia</button>
            </div>
        </div>`;
    }
    window._aclTrocarColabMinha = function (val) {
        M.colabOverride = Number(val) || null;
        window.renderAcademiaLideresMinha();
    };
    window._aclIrParaVincularColabs = function () {
        A.aba = 'colaboradores'; A.t = null;
        if (typeof window.navigateTo === 'function') window.navigateTo('academia-lideres-admin');
        setTimeout(() => { if (typeof window._aclAba === 'function') window._aclAba('colaboradores'); }, 100);
    };
    function cabecalhoMinha(nome) {
        return `<header class="acl-head acl-head-min"><div class="acl-head-t"><i class="ph ph-graduation-cap"></i><div><h2>Olá, ${esc(String(nome || '').split(' ')[0] || 'colaborador')}!</h2><span>Bem-vindo à Academia de Sucesso.</span></div></div></header>`;
    }
    function jornadaVisual(pct, temCert) {
        const etapas = ['Comecei', 'Aprendendo', 'Desenvolvendo', 'Evoluindo', 'Concluí', 'Certificado'];
        const at = temCert ? 5 : pct >= 100 ? 4 : pct >= 67 ? 3 : pct >= 34 ? 2 : pct > 0 ? 1 : 0;
        return `<div class="acl-jornada">${etapas.map((e, i) => `<div class="acl-etapa ${i < at ? 'feita' : ''} ${i === at ? 'atual' : ''} ${i === 5 && !temCert ? 'bloq' : ''}"><i class="ph ${i === 5 ? 'ph-certificate' : (i < at ? 'ph-check-circle' : (i === at ? 'ph-map-pin' : 'ph-circle'))}"></i><span>${e}</span></div>`).join('')}</div>`;
    }
    function desenharMinha() {
        const el = raiz('academia-lideres-minha-container'); if (!el) return;
        const d = M.dados;
        if (!d.vinculado) { el.innerHTML = `<div class="acl-wrap">${cabecalhoMinha('')}${barraAdminMinha(d)}<div class="acl-vazio"><i class="ph ph-user-circle-minus"></i><div><b>Seu usuário ainda não está vinculado a um colaborador.</b><br>Peça ao RH para conferir seu e-mail/nome no cadastro de colaboradores.</div></div></div>`; return; }
        if (!d.trilhas.length) { el.innerHTML = `<div class="acl-wrap">${cabecalhoMinha(d.colaborador.nome)}${barraAdminMinha(d)}<div class="acl-vazio"><i class="ph ph-graduation-cap"></i><div><b>${M.colabOverride ? 'Este colaborador ainda não foi matriculado em nenhuma trilha.' : 'Você ainda não foi matriculado em nenhuma trilha.'}</b><br>${d.is_admin ? 'Clique em "Vincular Colaboradores" acima para matricular participantes nesta trilha.' : 'Quando o RH liberar a sua trilha, ela aparecerá aqui.'}</div></div></div>`; return; }
        const avisoPreview = (d.modo_preview_admin || d.sem_matricula_propria) ? `<div class="acl-card" style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;font-size:.86rem;"><i class="ph ph-info"></i> Você está visualizando as trilhas disponíveis como <b>Administrador</b>. Para matricular os líderes (ou seu próprio colaborador) em uma trilha, clique em <b>Vincular Colaboradores</b> acima.</div>` : '';
        const cards = d.trilhas.map(x => {
            const t = x.trilha, p = x.progresso;
            return `<article class="acl-minha-card"><div class="acl-tc-top"><h3>${esc(t.nome)}</h3><span class="acl-badge" style="background:${STATUS_COR[t.status_efetivo] || '#64748b'};">${STATUS_TXT[t.status_efetivo]}</span></div>${demoTag(t)}
                <p>${esc(t.descricao || '')}</p>
                <div class="acl-kpis mini">${kpi('ph-chart-line-up', 'Progresso', p.obrigatorio + '%', '#16a34a')}${kpi('ph-check-square', 'Itens concluídos', p.itens_concluidos + '/' + p.itens_obrigatorios, '#7c3aed')}${kpi('ph-hourglass', 'Dias restantes', t.prazo.restantes == null ? '—' : t.prazo.restantes, '#2563eb')}</div>
                <div class="acl-prog-linha"><span>PROGRESSO DA TRILHA</span><b>${p.obrigatorio}%</b></div>${barra(p.obrigatorio, '#16a34a')}
                <div class="acl-prazo">${esc(prazoTxt(t.prazo))} · ${fmtBr(t.data_inicio)} → ${fmtBr(t.data_fim)}</div>
                <div class="acl-extra"><span><i class="ph ph-target"></i> Missões opcionais: <b>${p.missoes_realizadas} realizada(s)</b></span><span><i class="ph ph-star"></i> Pontos bônus: <b>+${p.pontos_bonus}</b></span></div>
                ${jornadaVisual(p.obrigatorio, !!x.certificado)}
                ${x.certificado ? certHtml(x.certificado) : ''}${x.proxima_aula ? `<div class="acl-prox"><i class="ph ph-play-circle"></i><div><small>Próximo conteúdo</small><b>${esc(x.proxima_aula.titulo)}</b><span>${esc(x.proxima_aula.modulo)}</span></div></div>` : (p.obrigatorio >= 100 ? `<div class="acl-prox ok"><i class="ph ph-seal-check"></i><div><b>Você concluiu todos os conteúdos obrigatórios!</b><span>${t.gera_certificado ? 'Seu certificado está disponível nesta trilha.' : 'Esta trilha não emite certificado.'}</span></div></div>` : '')}
                <button class="acl-btn pri full" onclick="window._aclMinhaAbrir(${t.id})"><i class="ph ph-play"></i> ${p.obrigatorio > 0 && p.obrigatorio < 100 ? 'Continuar' : 'Acessar'} trilha</button>
                <p class="acl-frase"><i class="ph ph-sparkle"></i> ${FRASES[t.id % FRASES.length]}</p></article>`;
        }).join('');
        el.innerHTML = `<div class="acl-wrap">${cabecalhoMinha(d.colaborador.nome)}${barraAdminMinha(d)}${avisoPreview}<div class="acl-corpo">${cards}</div></div>`;
    }
    window._aclMinhaAbrir = async function (tid) {
        const el = raiz('academia-lideres-minha-container'); M.tid = tid; carregando(el, 'Abrindo trilha...');
        try { M.jornada = await api('/acl/minha/trilhas/' + tid + qColab('?')); desenharTrilhaMinha(); } catch (e) { erro('Erro', e.message); window.renderAcademiaLideresMinha(); }
    };
    function desenharTrilhaMinha() {
        const el = raiz('academia-lideres-minha-container'); const j = M.jornada, t = j.trilha, p = j.progresso;
        const gerais = (j.avaliacoes_gerais || []).length ? `<div class="acl-m-mod"><div class="acl-m-aulas"><div class="acl-m-ger"><i class="ph ph-flag"></i> Avaliações da trilha</div>${j.avaliacoes_gerais.map(htmlAvaliacaoLinha).join('')}</div></div>` : '';
        const certBox = j.certificado ? certHtml(j.certificado) : '';
        const extraLinha = `<div class="acl-extra"><span><i class="ph ph-target"></i> Missões opcionais: <b>${p.missoes_realizadas} realizada(s)</b></span><span><i class="ph ph-star"></i> Pontos bônus: <b>+${p.pontos_bonus}</b></span></div>`;
        const missoesBox = (j.missoes || []).length ? `<div class="acl-card acl-missoes"><h3><i class="ph ph-target"></i> Missões opcionais</h3><p class="acl-dica">As missões ajudam você a colocar em prática o que aprendeu e geram pontos bônus. Não realizar uma missão não reduz seu progresso nem impede o certificado.</p><div class="acl-corpo">${j.missoes.map(htmlCardMissao).join('')}</div></div>` : '';
        const pontosBox = (j.pontos_historico || []).length ? `<div class="acl-card"><h3><i class="ph ph-star"></i> Meus pontos <small style="color:#ea580c">+${p.pontos_bonus}</small></h3>${j.pontos_historico.map(h => `<div class="acl-res"><div><b>${esc(h.missao)}</b> <small>· ${fmtBr(String(h.data || '').slice(0, 10))}</small></div><div><span class="acl-badge" style="background:#16a34a;">Aprovado · +${h.total} pontos</span> <small>${h.pontos_base} da missão${h.pontos_bonus ? ' + ' + h.pontos_bonus + ' da comprovação' : ''}</small></div></div>`).join('')}</div>` : '';
        const mods = j.modulos.map((m, i) => {
            const aulas = m.aulas.map(a => `<button class="acl-m-aula ${a.concluida ? 'ok' : ''} ${a.encerrada && !a.concluida ? 'enc' : ''}" onclick="window._aclAula(${a.id})"><i class="ph ${a.concluida ? 'ph-check-circle' : (a.encerrada ? 'ph-lock-simple' : 'ph-play-circle')}"></i><span><b>${esc(a.titulo)}</b>${demoTag(a)}<small>${a.duracao_min ? a.duracao_min + ' min · ' : ''}${a.obrigatoria ? 'Obrigatória' : 'Opcional'}${a.encerrada && !a.concluida ? ' · encerrada' : ''}</small></span><i class="ph ph-caret-right"></i></button>`).join('');
            return `<details class="acl-m-mod" ${(M.aberto === undefined ? i === 0 : M.aberto[m.id]) ? 'open' : ''} ontoggle="window._aclMToggle(${m.id}, this.open)"><summary><span class="acl-m-n">${i + 1}</span><span class="acl-m-t"><b>${esc(m.titulo)}</b>${demoTag(m)}<small>${m.data_inicio ? fmtBr(m.data_inicio) + ' → ' + fmtBr(m.data_fim) + (m.encerrado ? ' · encerrado' : '') : m.aulas.length + ' aula(s)'}</small></span><span class="acl-pct">${m.progresso}%</span></summary><div class="acl-m-aulas">${aulas || '<div class="acl-vazio-sm">Sem aulas.</div>'}${(m.avaliacoes || []).map(htmlAvaliacaoLinha).join('')}</div></details>`;
        }).join('');
        el.innerHTML = `<div class="acl-wrap"><button class="acl-voltar" onclick="window.renderAcademiaLideresMinha()"><i class="ph ph-arrow-left"></i> Minha Academia</button>
            <section class="acl-editor-topo"><div class="acl-tc-top"><h2>${esc(t.nome)}</h2><span class="acl-badge" style="background:${STATUS_COR[t.status_efetivo]};">${STATUS_TXT[t.status_efetivo]}</span></div>${demoTag(t)}<p>${esc(t.objetivo || t.descricao || '')}</p>
            <div class="acl-prog-linha"><span>Progresso obrigatório</span><b>${p.obrigatorio}%</b></div>${barra(p.obrigatorio, '#16a34a')}<div class="acl-prazo">${esc(prazoTxt(t.prazo))}</div>${extraLinha}${jornadaVisual(p.obrigatorio, !!j.certificado)}${certBox}</section>
            <div class="acl-corpo">${mods || '<div class="acl-vazio"><i class="ph ph-books"></i><div>Esta trilha ainda não tem módulos.</div></div>'}${gerais}${missoesBox}${pontosBox}</div></div>`;
    }
    window._aclMToggle = function (id, open) { M.aberto = M.aberto || {}; M.aberto[id] = open; };

    // ── Fase 2: certificado e avaliações do participante ───────────────────────
    const certUrl = id => apiBase() + '/acl/certificados/' + id + '/pdf?token=' + encodeURIComponent(getToken());
    const certHtml = c => `<div class="acl-prox ok"><i class="ph ph-certificate"></i><div><b>Certificado conquistado!</b><span>Nº ${esc(c.numero)}</span></div><a class="acl-btn ok sm" href="${esc(certUrl(c.id))}" target="_blank" rel="noopener"><i class="ph ph-download-simple"></i> Baixar</a></div>`;
    function sitAvTxt(a) {
        if (a.situacao === 'aprovada') return `Aprovada${a.melhor_nota != null ? ' · nota ' + a.melhor_nota + '%' : ''}`;
        if (a.situacao === 'aberta') { const r = Math.max(0, a.tentativas - a.usadas); return `Disponível · ${r} tentativa(s) restante(s)${a.data_limite ? ' · até ' + fmtBr(a.data_limite) : ''}`; }
        if (a.situacao === 'nao_aberta') return 'Abre em ' + fmtBr(a.data_abertura);
        if (a.situacao === 'encerrada') return 'Encerrada (prazo vencido)';
        return 'Tentativas esgotadas';
    }
    function htmlAvaliacaoLinha(a) {
        const ic = a.situacao === 'aprovada' ? 'ph-check-circle' : (a.situacao === 'aberta' ? 'ph-note-pencil' : 'ph-lock-simple');
        return `<button class="acl-m-aula acl-m-av ${a.aprovada ? 'ok' : ''} ${a.situacao !== 'aberta' && !a.aprovada ? 'enc' : ''}" onclick="window._aclQuiz(${a.id})"><i class="ph ${ic}"></i><span><b>Avaliação: ${esc(a.nome)}</b>${demoTag(a)}<small>${a.obrigatoria ? 'Obrigatória' : 'Opcional'} · nota mínima ${a.nota_minima}% · ${esc(sitAvTxt(a))}</small></span><i class="ph ph-caret-right"></i></button>`;
    }
    function overlayAula() {
        let ov = document.getElementById('acl-aula-overlay');
        if (!ov) { ov = document.createElement('div'); ov.id = 'acl-aula-overlay'; ov.className = 'acl-overlay'; document.body.appendChild(ov); }
        document.body.classList.add('acl-no-scroll');
        return ov;
    }
    function topoOverlay(sub, titulo) { return `<header class="acl-aula-top"><button class="acl-icon-btn" onclick="window._aclFecharAula()" aria-label="Voltar"><i class="ph ph-arrow-left"></i></button><div><small>${esc(sub)}</small><h2>${esc(titulo)}</h2></div></header>`; }
    window._aclQuiz = async function (id) {
        const ov = overlayAula(); ov.innerHTML = '<div class="acl-loading"><i class="ph ph-spinner ph-spin"></i> Abrindo avaliação...</div>';
        try {
            const q = await api('/acl/minha/avaliacoes/' + id + qColab('?')); M.quiz = q;
            if (q.situacao !== 'aberta') {
                const msg = { aprovada: `Você foi aprovado nesta avaliação${q.melhor_nota != null ? ' com nota ' + q.melhor_nota + '%' : ''}.`, nao_aberta: 'Esta avaliação abre em ' + fmtBr(q.data_abertura) + '.', encerrada: 'Esta avaliação está encerrada (prazo vencido). Procure o administrador para liberar uma exceção.', esgotada: 'Você usou todas as tentativas desta avaliação.' }[q.situacao];
                ov.innerHTML = `<div class="acl-aula">${topoOverlay('Avaliação', q.nome)}<div class="acl-aula-corpo"><div class="acl-prox ${q.situacao === 'aprovada' ? 'ok' : ''}"><i class="ph ${q.situacao === 'aprovada' ? 'ph-seal-check' : 'ph-lock-simple'}"></i><div><b>${esc(msg)}</b></div></div></div></div>`;
                return;
            }
            const ps = q.perguntas.map((p, i) => {
                let corpo;
                if (p.tipo === 'aberta') corpo = `<textarea id="aclq-r-${p.id}" rows="4" placeholder="Escreva sua resposta" class="acl-q-area"></textarea>`;
                else corpo = p.alternativas.map(a => `<label class="acl-q-op"><input type="radio" name="aclq-r-${p.id}" value="${a.id}"><span>${esc(a.texto)}</span></label>`).join('');
                return `<div class="acl-card"><div class="acl-q-enun"><span class="acl-m-n">${i + 1}</span><p class="acl-texto">${esc(p.enunciado)}</p></div>${corpo}</div>`;
            }).join('');
            ov.innerHTML = `<div class="acl-aula">${topoOverlay('Avaliação · nota mínima ' + q.nota_minima + '%', q.nome)}<div class="acl-aula-corpo">${q.descricao ? `<p class="acl-texto">${esc(q.descricao)}</p>` : ''}<div class="acl-meta"><span><i class="ph ph-repeat"></i> ${q.tentativas - q.usadas} tentativa(s) restante(s)</span>${q.data_limite ? `<span><i class="ph ph-calendar-blank"></i> até ${fmtBr(q.data_limite)}</span>` : ''}</div>${ps}</div>
                <footer class="acl-aula-foot"><button id="acl-btn-enviar" class="acl-btn ok grow" onclick="window._aclEnviarQuiz()"><i class="ph ph-paper-plane-tilt"></i> Enviar avaliação</button></footer></div>`;
        } catch (e) { ov.remove(); document.body.classList.remove('acl-no-scroll'); erro('Não foi possível abrir', e.message); }
    };
    window._aclEnviarQuiz = async function () {
        const q = M.quiz, respostas = {};
        for (const p of q.perguntas) {
            if (p.tipo === 'aberta') { const v = (document.getElementById('aclq-r-' + p.id) || {}).value || ''; if (!v.trim()) return erro('Responda todas as perguntas', 'Há pergunta sem resposta.'); respostas[p.id] = v; }
            else { const sel = document.querySelector(`input[name="aclq-r-${p.id}"]:checked`); if (!sel) return erro('Responda todas as perguntas', 'Há pergunta sem resposta.'); respostas[p.id] = sel.value; }
        }
        const btn = document.getElementById('acl-btn-enviar'); if (btn) btn.disabled = true;
        try {
            const r = await api('/acl/minha/avaliacoes/' + q.id + '/enviar' + qColab('?'), { method: 'POST', body: jbody({ respostas }) });
            M.jornada = await api('/acl/minha/trilhas/' + M.tid + qColab('?'));
            const ov = overlayAula();
            ov.innerHTML = `<div class="acl-aula">${topoOverlay('Resultado', q.nome)}<div class="acl-aula-corpo">
                <div class="acl-prox ${r.aprovado ? 'ok' : 'falha'}"><i class="ph ${r.aprovado ? 'ph-seal-check' : 'ph-warning-circle'}"></i><div><b>${esc(r.mensagem)}</b><span>${r.nota == null ? 'Suas respostas abertas foram registradas.' : 'Sua nota: ' + r.nota + '% (mínimo ' + q.nota_minima + '%)'}</span></div></div>
                ${r.concluido_trilha ? '<div class="acl-prox ok"><i class="ph ph-graduation-cap"></i><div><b>Você concluiu todos os conteúdos obrigatórios da trilha!</b><span>Seu certificado já está disponível na página da trilha.</span></div></div>' : `<div class="acl-prog-linha"><span>Progresso da trilha</span><b>${r.progresso}%</b></div>${barra(r.progresso, '#16a34a')}`}
                ${!r.aprovado && r.tentativas_restantes > 0 ? `<button class="acl-btn pri full" onclick="window._aclQuiz(${q.id})"><i class="ph ph-arrow-counter-clockwise"></i> Tentar novamente (${r.tentativas_restantes} restante(s))</button>` : ''}
                ${!r.aprovado && r.tentativas_restantes === 0 ? '<p class="acl-dica">Você usou todas as tentativas. Procure o administrador se precisar de ajuda.</p>' : ''}</div>
                <footer class="acl-aula-foot"><button class="acl-btn sec grow" onclick="window._aclFecharAula()"><i class="ph ph-arrow-left"></i> Voltar à trilha</button></footer></div>`;
        } catch (e) { if (btn) btn.disabled = false; erro('Não foi possível enviar', e.message); }
    };

    // ── Fase 3: missões opcionais (participante) ───────────────────────────────
    const TXT_OPCIONAL = 'Esta missão é opcional. Você não precisa realizá-la para concluir sua trilha ou receber seu certificado. Ao realizá-la, você poderá conquistar pontos bônus e melhorar sua posição no Ranking de Evolução.';
    function chipMissao(m) {
        const e = m.envio;
        if (e && e.status === 'aprovada') return `<span class="acl-chip ok"><i class="ph ph-seal-check"></i> Aprovada · +${e.pontos_concedidos} pontos</span>`;
        if (e && e.status === 'em_analise') return '<span class="acl-chip an"><i class="ph ph-hourglass"></i> Em análise</span>';
        if (e && e.status === 'recusada') return `<span class="acl-chip no"><i class="ph ph-x-circle"></i> Recusada${m.pode_realizar ? ' · nova tentativa liberada' : ''}</span>`;
        if (m.prazo_situacao === 'encerrada') return '<span class="acl-chip enc"><i class="ph ph-lock-simple"></i> Encerrada</span>';
        if (m.prazo_situacao === 'nao_iniciada') return `<span class="acl-chip enc"><i class="ph ph-calendar-blank"></i> Começa em ${fmtBr(m.data_inicio)}</span>`;
        return `<span class="acl-chip dis"><i class="ph ph-target"></i> Disponível até ${fmtBr(m.data_fim)}</span>`;
    }
    function htmlCardMissao(m) {
        return `<article class="acl-missao-card"><div class="acl-tc-top"><h3><i class="ph ph-target"></i> ${esc(m.nome)}</h3><span class="acl-badge" style="background:#ea580c;">MISSÃO OPCIONAL</span></div>${demoTag(m)}
            <p>${esc(m.descricao)}</p>
            <div class="acl-pts"><b>+${m.pontos_base} pontos</b><span>+${m.pontos_bonus} pontos com comprovação</span></div>${chipMissao(m)}
            <button class="acl-btn pri full" onclick="window._aclMissao(${m.id})"><i class="ph ph-eye"></i> VER MISSÃO</button></article>`;
    }
    window._aclMissao = async function (id) {
        const ov = overlayAula(); ov.innerHTML = '<div class="acl-loading"><i class="ph ph-spinner ph-spin"></i> Abrindo missão...</div>';
        try {
            const m = await api('/acl/minha/missoes/' + id + qColab('?')); M.missao = m;
            const ult = m.envios[0] || null;
            let estado = '';
            if (ult && ult.status === 'em_analise') estado = '<div class="acl-prox an"><i class="ph ph-hourglass"></i><div><b>Sua missão está em análise.</b><span>Os pontos serão creditados quando ela for aprovada.</span></div></div>';
            else if (ult && ult.status === 'aprovada') estado = `<div class="acl-prox ok"><i class="ph ph-seal-check"></i><div><b>Missão aprovada! +${ult.pontos_concedidos} pontos</b><span>${ult.pontos_base} pela realização${ult.pontos_concedidos > ult.pontos_base ? ' + ' + (ult.pontos_concedidos - ult.pontos_base) + ' pela comprovação' : ''}.</span></div></div>`;
            else if (ult && ult.status === 'recusada') estado = `<div class="acl-prox falha"><i class="ph ph-x-circle"></i><div><b>Missão recusada.</b><span>Justificativa: ${esc(ult.motivo_recusa || 'não informada')}</span></div></div>`;
            if (!ult && m.prazo_situacao === 'encerrada') estado = '<div class="acl-prox falha"><i class="ph ph-lock-simple"></i><div><b>O prazo desta missão está encerrado.</b></div></div>';
            if (!ult && m.prazo_situacao === 'nao_iniciada') estado = `<div class="acl-prox"><i class="ph ph-calendar-blank"></i><div><b>Esta missão começa em ${fmtBr(m.data_inicio)}.</b></div></div>`;
            const hist = m.envios.length > 1 ? `<div class="acl-card"><h3><i class="ph ph-clock-counter-clockwise"></i> Histórico de envios</h3>${m.envios.map(e => `<div class="acl-res"><div><b>Tentativa ${e.tentativa}</b> <small>· ${esc(String(e.enviado_em || '').slice(0, 16).replace('T', ' '))}</small></div><div><span class="acl-badge" style="background:${e.status === 'aprovada' ? '#16a34a' : (e.status === 'recusada' ? '#dc2626' : '#ea580c')};">${{ aprovada: 'Aprovada', recusada: 'Recusada', em_analise: 'Em análise' }[e.status]}</span></div>${e.motivo_recusa ? `<small>Justificativa: ${esc(e.motivo_recusa)}</small>` : ''}</div>`).join('')}</div>` : '';
            ov.innerHTML = `<div class="acl-aula">${topoOverlay('Missão opcional · ' + m.trilha, m.nome)}<div class="acl-aula-corpo">${demoTag(m)}
                <div class="acl-meta"><span><i class="ph ph-calendar-blank"></i> ${fmtBr(m.data_inicio)} → ${fmtBr(m.data_fim)}</span></div>
                <div class="acl-card"><h3><i class="ph ph-clipboard-text"></i> Descrição da atividade</h3><p class="acl-texto">${esc(m.descricao)}</p></div>
                ${m.objetivo ? `<div class="acl-card"><h3><i class="ph ph-target"></i> Objetivo</h3><p class="acl-texto">${esc(m.objetivo)}</p></div>` : ''}
                ${m.como_realizar ? `<div class="acl-card"><h3><i class="ph ph-list-numbers"></i> Como realizar</h3><p class="acl-texto">${esc(m.como_realizar)}</p></div>` : ''}
                <div class="acl-card"><h3><i class="ph ph-star"></i> Pontuação</h3><div class="acl-pts big"><b>${m.pontos_base} pontos pela realização</b><span>+${m.pontos_bonus} pontos pela comprovação</span></div></div>
                <div class="acl-aviso-opc"><i class="ph ph-info"></i><p>${esc(TXT_OPCIONAL)}</p></div>
                ${estado}${hist}</div>
                <footer class="acl-aula-foot">${m.pode_realizar ? `<button class="acl-btn pri grow" onclick="window._aclMissaoForm()"><i class="ph ph-rocket-launch"></i> ${ult && ult.status === 'recusada' ? 'REALIZAR NOVAMENTE' : 'REALIZAR MISSÃO'}</button>` : '<button class="acl-btn sec grow" onclick="window._aclFecharAula()"><i class="ph ph-arrow-left"></i> Voltar à trilha</button>'}</footer></div>`;
        } catch (e) { ov.remove(); document.body.classList.remove('acl-no-scroll'); erro('Não foi possível abrir a missão', e.message); }
    };
    window._aclMissaoForm = function () {
        const m = M.missao, ov = overlayAula();
        ov.innerHTML = `<div class="acl-aula">${topoOverlay('Realizar missão', m.nome)}<div class="acl-aula-corpo">
            <div class="acl-card"><h3><i class="ph ph-note-pencil"></i> Anotações <small style="color:#dc2626">(obrigatório)</small></h3><label for="aclm-anot" style="font-weight:700;display:block;margin-bottom:6px;">Conte como você realizou esta missão</label>
                <textarea id="aclm-anot" rows="8" class="acl-q-area" placeholder="Descreva o que você fez, como realizou a atividade, qual foi o resultado, quais dificuldades encontrou e o que aprendeu."></textarea><div id="aclm-erro" class="acl-erro-inline"></div></div>
            <div class="acl-card"><h3><i class="ph ph-paperclip"></i> Comprove sua missão <small style="color:#64748b">(opcional · +${m.pontos_bonus} pontos)</small></h3>
                <p class="acl-dica">Você pode anexar fotos, prints, documentos, planilhas ou outros arquivos que comprovem a realização da atividade.</p>
                <label class="acl-btn sec full acl-upl"><i class="ph ph-upload-simple"></i> Escolher arquivos (JPG, JPEG, PNG, PDF, DOC, DOCX, XLS, XLSX)<input type="file" id="aclm-arq" multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx" hidden onchange="window._aclMissaoArqs()"></label><div id="aclm-lista" class="acl-arq-lista"></div></div></div>
            <footer class="acl-aula-foot"><button class="acl-btn sec" onclick="window._aclMissao(${m.id})"><i class="ph ph-arrow-left"></i></button><button id="aclm-enviar" class="acl-btn ok grow" onclick="window._aclMissaoEnviar()"><i class="ph ph-paper-plane-tilt"></i> ENVIAR MISSÃO</button></footer></div>`;
    };
    window._aclMissaoArqs = function () {
        const inp = document.getElementById('aclm-arq'), l = document.getElementById('aclm-lista'); if (!inp || !l) return;
        l.innerHTML = [...inp.files].map(f => `<div class="acl-arq"><i class="ph ph-file"></i><span>${esc(f.name)}</span><small>${(f.size / 1048576).toFixed(1)} MB</small></div>`).join('');
    };
    window._aclMissaoEnviar = async function () {
        const m = M.missao, anot = (document.getElementById('aclm-anot') || {}).value || '', errEl = document.getElementById('aclm-erro');
        if (!anot.trim()) { if (errEl) errEl.textContent = 'As anotações são obrigatórias: conte como você realizou esta missão.'; const t = document.getElementById('aclm-anot'); if (t) t.focus(); return; }
        const arqs = [...((document.getElementById('aclm-arq') || {}).files || [])];
        if (arqs.length > 5) return erro('Anexos demais', 'Envie no máximo 5 arquivos.');
        if (arqs.some(f => f.size > 15 * 1048576)) return erro('Arquivo grande demais', 'Cada anexo pode ter até 15 MB.');
        const fd = new FormData(); fd.append('anotacoes', anot); arqs.forEach(f => fd.append('arquivos', f));
        const btn = document.getElementById('aclm-enviar'); if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...'; }
        try {
            const r = await api('/acl/minha/missoes/' + m.id + '/enviar' + qColab('?'), { method: 'POST', body: fd });
            M.jornada = await api('/acl/minha/trilhas/' + M.tid + qColab('?'));
            overlayAula().innerHTML = `<div class="acl-aula">${topoOverlay('Missão enviada', m.nome)}<div class="acl-aula-corpo"><div class="acl-prox an"><i class="ph ph-paper-plane-tilt"></i><div><b>Missão enviada! Ela está em análise.</b><span>Pontuação potencial: ${r.pontos_potenciais} pontos${r.anexos ? ' (com comprovação)' : ''}. Os pontos só entram depois da aprovação.</span></div></div></div>
                <footer class="acl-aula-foot"><button class="acl-btn pri grow" onclick="window._aclFecharAula()"><i class="ph ph-arrow-left"></i> Voltar à trilha</button></footer></div>`;
        } catch (e) { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> ENVIAR MISSÃO'; } if (errEl && e.status === 400) errEl.textContent = e.message; else erro('Não foi possível enviar', e.message); }
    };

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
            const r = await api('/acl/minha/aulas/' + id + '/concluir' + qColab('?'), { method: 'POST', body: jbody({ concluida: concluir }) });
            M.jornada = await api('/acl/minha/trilhas/' + M.tid + qColab('?'));
            window._aclAula(id);
            const msg = document.getElementById('acl-aula-msg');
            if (msg && concluir) msg.innerHTML = `<div class="acl-prox ok"><i class="ph ph-seal-check"></i><div><b>${r.concluido_trilha ? 'Parabéns! Você concluiu todos os conteúdos obrigatórios da trilha.' : 'Aula concluída!'}</b><span>Progresso da trilha: ${r.progresso}%</span></div></div>`;
        } catch (e) { erro('Não foi possível concluir', e.message); }
    };
})();
