/* ══════════════════════════════════════════════════════════════════════
   CADASTRO DE EVENTOS (Comercial → Cadastros → Cadastro Evento)
   - Nomes de eventos vinculados a clientes (tabela comercial_eventos)
   - Na tela de Proposta (tipo EVENTO): campo "Nome do Evento" com lista de seleção, digitação livre,
     lupa (pesquisar) e botão + (cadastrar novo evento do cliente)
   ══════════════════════════════════════════════════════════════════════ */
(function () {
    const esc = (s) => String(s === undefined || s === null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const limpaNomeCli = (s) => String(s || '').replace(/^[^A-Za-z0-9\u00C0-\u00FF]+/, '').trim();
    const tok = () => window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';

    async function chamar(metodo, url, body) {
        const headers = { 'Authorization': 'Bearer ' + tok() };
        const opts = { method: metodo, headers };
        if (body) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
        const res = await fetch('/api' + url, opts);
        const txt = await res.text();
        try { return JSON.parse(txt); } catch (e) { return { error: 'O servidor devolveu uma resposta inesperada.' }; }
    }

    /* ══════════ 1) CAMPO "NOME DO EVENTO" NA PROPOSTA ══════════ */
    const cache = { chave: '', lista: [] };

    window.obterNomeClienteEventoProposta = function () {
        return limpaNomeCli(document.getElementById('prop-cliente')?.value || '');
    };

    window.carregarEventosClienteProposta = async function (forcar) {
        const nome = window.obterNomeClienteEventoProposta();
        if (!nome) { cache.chave = ''; cache.lista = []; return []; }
        const chave = norm(nome);
        if (!forcar && cache.chave === chave) return cache.lista;
        const r = await chamar('GET', '/comercial/eventos?cliente_nome=' + encodeURIComponent(nome));
        cache.chave = chave;
        cache.lista = Array.isArray(r) ? r : [];
        return cache.lista;
    };

    function ddEl() { return document.getElementById('prop-evento-dropdown'); }

    window.fecharDropdownEventosProposta = function () {
        const dd = ddEl();
        if (dd) dd.style.display = 'none';
    };

    window.renderDropdownEventosProposta = function (filtrar) {
        const dd = ddEl();
        const inp = document.getElementById('prop-nome-evento');
        if (!dd || !inp) return;
        const nomeCli = window.obterNomeClienteEventoProposta();
        if (!nomeCli) {
            dd.innerHTML = '<div style="padding:10px 12px; font-size:0.78rem; color:#b45309;">Selecione primeiro o cliente para ver os eventos dele.</div>';
            dd.style.display = 'block';
            return;
        }
        const q = filtrar ? norm(inp.value) : '';
        const lista = cache.lista.filter(e => !q || norm(e.nome).includes(q));
        if (!lista.length) {
            dd.innerHTML = '<div style="padding:10px 12px; font-size:0.78rem; color:#64748b;">' +
                (cache.lista.length ? 'Nenhum evento encontrado com esse texto — você pode digitar um novo nome.' : 'Nenhum evento cadastrado para este cliente. Digite o nome ou use o botão + para cadastrar.') + '</div>';
        } else {
            dd.innerHTML = lista.map(e =>
                `<div class="prop-evento-item" data-nome="${esc(e.nome)}" style="padding:8px 12px; font-size:0.84rem; color:#1e293b; cursor:pointer; border-bottom:1px solid #f1f5f9; text-transform:uppercase;" onmouseover="this.style.background='#f5f3ff'" onmouseout="this.style.background=''" onmousedown="event.preventDefault(); window.selecionarEventoProposta(this.getAttribute('data-nome'));">${esc(e.nome)}</div>`
            ).join('');
        }
        dd.style.display = 'block';
    };

    window.abrirDropdownEventosProposta = async function (mostrarTodos) {
        await window.carregarEventosClienteProposta(false);
        window.renderDropdownEventosProposta(!mostrarTodos);
    };

    window.filtrarDropdownEventosProposta = async function () {
        await window.carregarEventosClienteProposta(false);
        window.renderDropdownEventosProposta(true);
    };

    window.toggleDropdownEventosProposta = async function (ev) {
        if (ev) { ev.preventDefault(); ev.stopPropagation(); }
        const dd = ddEl();
        if (dd && dd.style.display === 'block') { dd.style.display = 'none'; return; }
        await window.abrirDropdownEventosProposta(true);
    };

    window.selecionarEventoProposta = function (nome) {
        const inp = document.getElementById('prop-nome-evento');
        if (inp) {
            inp.value = String(nome || '');
        }
        window.fecharDropdownEventosProposta();
    };

    window.onKeyDownEventoProposta = function (ev) {
        if (ev.key === 'Escape') { window.fecharDropdownEventosProposta(); return; }
        if (ev.key === 'Enter') {
            const dd = ddEl();
            const primeiro = dd && dd.style.display === 'block' ? dd.querySelector('.prop-evento-item') : null;
            if (primeiro) { ev.preventDefault(); window.selecionarEventoProposta(primeiro.getAttribute('data-nome')); }
        }
    };

    /* Lupa: pesquisar eventos do cliente em uma janela com busca */
    window.pesquisarEventoProposta = async function () {
        const nomeCli = window.obterNomeClienteEventoProposta();
        if (!nomeCli) { Swal.fire('Atenção', 'Selecione primeiro o cliente para pesquisar os eventos dele.', 'warning'); return; }
        await window.carregarEventosClienteProposta(true);
        const lista = cache.lista;
        Swal.fire({
            title: '',
            html: `
            <div style="text-align:left; font-family:'Inter',sans-serif;">
                <div style="font-size:1.05rem; font-weight:800; color:#1e293b; border-bottom:1px solid #e2e8f0; padding:14px 18px; background:#f8fafc;">
                    <i class="ph ph-calendar-star" style="color:#7048e8;"></i> Eventos de ${esc(nomeCli)}
                </div>
                <div style="padding:14px 16px; background:#f1f5f9;">
                    <input id="modal-ev-busca" type="text" placeholder="Digite para filtrar o nome do evento..." style="width:100%; padding:7px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; box-sizing:border-box; height:36px; outline:none; background:#fff; margin-bottom:10px;">
                    <div id="modal-ev-lista" style="max-height:300px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff;"></div>
                    <div id="modal-ev-count" style="font-size:0.75rem; color:#475569; font-weight:700; text-align:right; margin-top:6px;"></div>
                </div>
            </div>`,
            showConfirmButton: false,
            showCloseButton: true,
            width: '640px',
            customClass: { popup: 'custom-swal-padding-zero' },
            didOpen: () => {
                const busca = document.getElementById('modal-ev-busca');
                const box = document.getElementById('modal-ev-lista');
                const cnt = document.getElementById('modal-ev-count');
                const pinta = () => {
                    const q = norm(busca.value);
                    const f = lista.filter(e => !q || norm(e.nome).includes(q));
                    box.innerHTML = f.length
                        ? f.map(e => `<div class="modal-ev-item" data-nome="${esc(e.nome)}" style="padding:10px 14px; border-bottom:1px solid #f1f5f9; cursor:pointer; font-weight:600; color:#1e293b; text-transform:uppercase; font-size:0.85rem;" onmouseover="this.style.background='#f5f3ff'" onmouseout="this.style.background=''">${esc(e.nome)}</div>`).join('')
                        : '<div style="padding:1.5rem; text-align:center; color:#94a3b8; font-size:0.85rem;">Nenhum evento encontrado para este cliente.</div>';
                    cnt.textContent = `Total: ${f.length} evento(s)`;
                    box.querySelectorAll('.modal-ev-item').forEach(it => it.addEventListener('click', () => {
                        window.selecionarEventoProposta(it.getAttribute('data-nome'));
                        Swal.close();
                    }));
                };
                pinta();
                busca.addEventListener('input', pinta);
                busca.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); box.querySelector('.modal-ev-item')?.click(); } });
                setTimeout(() => busca.focus(), 40);
            }
        });
    };

    /* Botão +: cadastrar novo evento para o cliente da proposta */
    window.novoEventoProposta = async function () {
        const nomeCli = window.obterNomeClienteEventoProposta();
        if (!nomeCli) { Swal.fire('Atenção', 'Selecione primeiro o cliente para cadastrar um evento para ele.', 'warning'); return; }
        const atual = String(document.getElementById('prop-nome-evento')?.value || '').trim();
        const { value } = await Swal.fire({
            title: 'Novo Evento',
            html: `<div style="text-align:left; font-size:0.8rem; color:#475569; margin-bottom:6px;">Cliente: <b>${esc(nomeCli)}</b></div>`,
            input: 'text',
            inputValue: atual,
            inputLabel: 'Nome do Evento',
            inputPlaceholder: 'Digite o nome do evento...',
            showCancelButton: true,
            confirmButtonText: 'Cadastrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#16a34a',
            inputValidator: (v) => (!String(v || '').trim() ? 'Informe o nome do evento.' : undefined)
        });
        if (value === undefined) return;
        const r = await chamar('POST', '/comercial/eventos', { cliente_nome: nomeCli, nome: String(value).trim() });
        if (r && r.success) {
            await window.carregarEventosClienteProposta(true);
            window.selecionarEventoProposta(String(value).trim());
            if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso('Evento cadastrado!');
        } else if (r && r.id) {
            // já existe: apenas seleciona
            await window.carregarEventosClienteProposta(true);
            window.selecionarEventoProposta(String(value).trim());
        } else {
            Swal.fire('Erro', (r && r.error) || 'Não foi possível cadastrar o evento.', 'error');
        }
    };

    document.addEventListener('mousedown', (e) => {
        const dd = ddEl();
        if (!dd || dd.style.display !== 'block') return;
        const wrap = document.getElementById('prop-evento-combo-wrap');
        if (wrap && !wrap.contains(e.target)) dd.style.display = 'none';
    });

    /* ══════════ 2) TELA "CADASTRAR EVENTO" ══════════ */
    const est = { clientes: [], eventos: [], editId: null, cliSel: null, filtro: '' };

    function menuNavegacaoHtml() {
        const it = (tab, ico, txt, ativo) =>
            `<div class="saas-dropdown-item${ativo ? ' active' : ''}" onclick="switchPropostaTab('${tab}'); event.stopPropagation();"><i class="ph ${ico}"></i> ${txt}</div>`;
        return `
        <div class="saas-dropdown-container">
            <div class="saas-nav-item active" style="display:flex; align-items:center; gap:0.25rem;">
                <i class="ph ph-calendar-star"></i> Cadastro Evento <i class="ph ph-caret-down" style="font-size:0.8rem; opacity:0.7;"></i>
            </div>
            <div class="saas-dropdown-menu">
                ${it('lista', 'ph-list-bullets', 'Lista de Propostas')}
                <div class="saas-dropdown-item" onclick="abrirFormProposta(null); event.stopPropagation();"><i class="ph ph-pencil-simple"></i> Nova Proposta</div>
                ${it('cadastro-cliente', 'ph-user-plus', 'Clientes')}
                ${it('cadastro-contatos', 'ph-identification-card', 'Contatos')}
                ${it('enderecos', 'ph-map-pin', 'Endereços')}
                ${it('cadastro-eventos', 'ph-calendar-star', 'Eventos', true)}
                ${it('servicos-precificacao', 'ph-calculator', 'Precificação de Serviços')}
                ${it('modelos-propostas', 'ph-files', 'Modelos Propostas')}
                ${it('modelos-contrato', 'ph-file-text', 'Modelos de Contrato')}
            </div>
        </div>`;
    }

    window._renderCadastroEventosInt = async function () {
        const container = document.getElementById('prop-view-cadastro-eventos');
        if (!container) return;
        est.editId = null; est.cliSel = null; est.filtro = '';
        const inp = 'width:100%; padding:0.5rem 0.6rem; border:1px solid #cbd5e1; border-radius:7px; font-size:0.85rem; box-sizing:border-box; background:#fff; height:36px;';
        container.innerHTML = `
        <div style="font-family:'Inter', sans-serif; background:#f8fafc; padding:1px 0.75rem 0.75rem 0.75rem; border-radius:14px; min-height:620px; box-sizing:border-box;">
            <div id="prop-toolbar-eventos" style="display:flex; justify-content:space-between; align-items:center; margin-top:-10px; margin-bottom:0.85rem; background:#fff; padding:0.55rem 1rem; border-radius:10px; border:1px solid #e2e8f0; position:sticky; top:0; z-index:997; gap:0.6rem; flex-wrap:wrap;">
                ${menuNavegacaoHtml()}
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <button type="button" onclick="window.limparFormEventoCad()" style="background:#3b82f6; color:#fff; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px;"><i class="ph ph-file-text"></i> Novo</button>
                    <button type="button" onclick="window.salvarEventoCad()" style="background:#16a34a; color:#fff; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px;"><i class="ph ph-check"></i> Salvar</button>
                    <button type="button" onclick="window.carregarEventosCad()" title="Recarregar" style="background:#e2e8f0; color:#475569; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;"><i class="ph ph-arrows-clockwise" style="font-size:1.1rem;"></i></button>
                </div>
            </div>

            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1rem 1.15rem; margin-bottom:0.85rem;">
                <div id="ev-cad-titulo" style="font-size:0.9rem; font-weight:800; color:#1e293b; margin-bottom:0.7rem;"><i class="ph ph-calendar-star" style="color:#7048e8;"></i> Cadastrar Evento</div>
                <div style="display:grid; grid-template-columns:1.2fr 1fr auto; gap:0.75rem; align-items:flex-end;">
                    <div>
                        <label style="display:block; font-size:0.74rem; font-weight:700; color:#475569; margin-bottom:4px;">Cliente *</label>
                        <div id="ev-cad-cli-wrap" style="position:relative;">
                            <input type="text" id="ev-cad-cliente" autocomplete="off" placeholder="Digite o nome ou CNPJ do cliente..." oninput="window.filtrarClientesEventoCad()" onfocus="window.abrirClientesEventoCad(true)" onclick="window.abrirClientesEventoCad(true)" style="${inp}">
                            <div id="ev-cad-cli-dd" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; max-height:240px; overflow-y:auto; background:#fff; border:1px solid #cbd5e1; border-radius:6px; box-shadow:0 8px 20px rgba(15,23,42,0.12); z-index:1050;"></div>
                        </div>
                    </div>
                    <div>
                        <label style="display:block; font-size:0.74rem; font-weight:700; color:#475569; margin-bottom:4px;">Nome do Evento *</label>
                        <input type="text" id="ev-cad-nome" autocomplete="off" placeholder="Digite o nome do evento..." onkeydown="if(event.key==='Enter'){ event.preventDefault(); window.salvarEventoCad(); }" style="${inp}">
                    </div>
                    <div>
                        <button type="button" onclick="window.salvarEventoCad()" style="background:#7048e8; color:#fff; border:none; border-radius:7px; padding:0 1.3rem; height:36px; font-size:0.82rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px;"><i class="ph ph-plus-circle"></i> <span id="ev-cad-btn-txt">Cadastrar</span></button>
                    </div>
                </div>
            </div>

            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1rem 1.15rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:0.6rem; margin-bottom:0.7rem; flex-wrap:wrap;">
                    <div style="font-size:0.9rem; font-weight:800; color:#1e293b;"><i class="ph ph-list-bullets" style="color:#7048e8;"></i> Eventos Cadastrados <span id="ev-cad-count" style="background:#ede9fe; color:#6d28d9; padding:1px 9px; border-radius:999px; font-size:0.72rem; margin-left:4px;">0</span></div>
                    <input type="text" id="ev-cad-busca" placeholder="🔍 Filtrar por cliente ou evento..." oninput="window.filtrarListaEventosCad(this.value)" style="width:320px; max-width:100%; padding:0 0.7rem; height:34px; border:1px solid #cbd5e1; border-radius:7px; font-size:0.82rem; box-sizing:border-box;">
                </div>
                <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.84rem; text-align:left;">
                        <thead><tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.03em;">
                            <th style="padding:10px 12px;">Cliente</th>
                            <th style="padding:10px 12px;">Evento</th>
                            <th style="padding:10px 12px; width:150px;">Cadastrado em</th>
                            <th style="padding:10px 12px; width:90px; text-align:center;">Ações</th>
                        </tr></thead>
                        <tbody id="ev-cad-tbody"><tr><td colspan="4" style="padding:1.5rem; text-align:center; color:#94a3b8;">Carregando...</td></tr></tbody>
                    </table>
                </div>
            </div>
        </div>`;
        document.addEventListener('mousedown', fechaCliDdForaCad, { once: false });
        await window.carregarEventosCad();
        if (!est.clientes.length) {
            try { const c = await fetch('/api/clientes', { headers: { 'Authorization': 'Bearer ' + tok() } }).then(r => r.json()); est.clientes = Array.isArray(c) ? c : []; } catch (e) { est.clientes = []; }
        }
    };

    function fechaCliDdForaCad(e) {
        const dd = document.getElementById('ev-cad-cli-dd');
        const wrap = document.getElementById('ev-cad-cli-wrap');
        if (dd && wrap && !wrap.contains(e.target)) dd.style.display = 'none';
    }

    async function garantirClientesCad() {
        if (est.clientes.length) return;
        try { const c = await fetch('/api/clientes', { headers: { 'Authorization': 'Bearer ' + tok() } }).then(r => r.json()); est.clientes = Array.isArray(c) ? c : []; } catch (e) { est.clientes = []; }
    }

    window.abrirClientesEventoCad = async function () { await garantirClientesCad(); renderClientesDdCad(false); };
    window.filtrarClientesEventoCad = async function () {
        est.cliSel = null; // digitou: seleção anterior deixa de valer
        await garantirClientesCad();
        renderClientesDdCad(true);
    };

    function renderClientesDdCad(filtrar) {
        const dd = document.getElementById('ev-cad-cli-dd');
        const inp = document.getElementById('ev-cad-cliente');
        if (!dd || !inp) return;
        const q = filtrar ? norm(inp.value) : '';
        const qd = q.replace(/\D/g, '');
        const lista = est.clientes.filter(c => {
            if (!q) return true;
            const nome = norm(c.nome_razao_social), fan = norm(c.nome_fantasia), doc = String(c.cpf_cnpj || '').replace(/\D/g, '');
            return nome.includes(q) || fan.includes(q) || (qd && doc.includes(qd)) || norm(c.codigo).includes(q);
        }).slice(0, 60);
        dd.innerHTML = lista.length
            ? lista.map(c => `<div data-id="${esc(c.id)}" class="ev-cli-item" style="padding:8px 12px; border-bottom:1px solid #f1f5f9; cursor:pointer; font-size:0.84rem;" onmouseover="this.style.background='#f5f3ff'" onmouseout="this.style.background=''">
                    <b style="color:#7048e8;">${esc(c.codigo || '')}</b> ${esc(c.nome_razao_social || c.nome_fantasia || '')}
                    <span style="color:#94a3b8; font-size:0.74rem; margin-left:6px;">${esc(c.cpf_cnpj || '')}</span></div>`).join('')
            : '<div style="padding:10px 12px; font-size:0.8rem; color:#94a3b8;">Nenhum cliente encontrado.</div>';
        dd.style.display = 'block';
        dd.querySelectorAll('.ev-cli-item').forEach(el => el.addEventListener('mousedown', (ev) => {
            ev.preventDefault();
            const c = est.clientes.find(x => String(x.id) === el.getAttribute('data-id'));
            if (c) selecionarClienteCad(c);
        }));
    }

    function selecionarClienteCad(c) {
        est.cliSel = { id: c.id, nome: c.nome_razao_social || c.nome_fantasia || '' };
        const inp = document.getElementById('ev-cad-cliente');
        if (inp) inp.value = est.cliSel.nome;
        const dd = document.getElementById('ev-cad-cli-dd');
        if (dd) dd.style.display = 'none';
        document.getElementById('ev-cad-nome')?.focus();
    }

    window.carregarEventosCad = async function () {
        const r = await chamar('GET', '/comercial/eventos');
        est.eventos = Array.isArray(r) ? r : [];
        renderListaEventosCad();
    };

    window.filtrarListaEventosCad = function (v) { est.filtro = String(v || ''); renderListaEventosCad(); };

    function renderListaEventosCad() {
        const tb = document.getElementById('ev-cad-tbody');
        const cnt = document.getElementById('ev-cad-count');
        if (!tb) return;
        const q = norm(est.filtro);
        const lista = est.eventos.filter(e => !q || norm(e.nome).includes(q) || norm(e.cliente_nome).includes(q));
        if (cnt) cnt.textContent = String(lista.length);
        if (!lista.length) {
            tb.innerHTML = '<tr><td colspan="4" style="padding:1.5rem; text-align:center; color:#94a3b8; font-style:italic;">Nenhum evento cadastrado.</td></tr>';
            return;
        }
        const fmtData = (d) => { const s = String(d || '').substring(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split('-').reverse().join('/') : s; };
        tb.innerHTML = lista.map(e => `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:9px 12px; font-weight:600; color:#334155;">${esc(e.cliente_nome)}</td>
                <td style="padding:9px 12px; font-weight:700; color:#1e293b; text-transform:uppercase;">${esc(e.nome)}</td>
                <td style="padding:9px 12px; color:#64748b;">${esc(fmtData(e.criado_em))}</td>
                <td style="padding:9px 12px; text-align:center; white-space:nowrap;">
                    <button type="button" title="Editar" onclick="window.editarEventoCad(${e.id})" style="width:30px; height:30px; border:1px solid #c4b5fd; background:#f5f3ff; color:#6d28d9; border-radius:7px; cursor:pointer;"><i class="ph ph-pencil-simple"></i></button>
                    <button type="button" title="Excluir" onclick="window.excluirEventoCad(${e.id})" style="width:30px; height:30px; border:1px solid #fecaca; background:#fee2e2; color:#dc2626; border-radius:7px; cursor:pointer;"><i class="ph ph-trash"></i></button>
                </td>
            </tr>`).join('');
    }

    window.limparFormEventoCad = function () {
        est.editId = null; est.cliSel = null;
        const c = document.getElementById('ev-cad-cliente'); if (c) c.value = '';
        const n = document.getElementById('ev-cad-nome'); if (n) n.value = '';
        const t = document.getElementById('ev-cad-titulo'); if (t) t.innerHTML = '<i class="ph ph-calendar-star" style="color:#7048e8;"></i> Cadastrar Evento';
        const b = document.getElementById('ev-cad-btn-txt'); if (b) b.textContent = 'Cadastrar';
        c?.focus();
    };

    window.editarEventoCad = function (id) {
        const e = est.eventos.find(x => x.id === id);
        if (!e) return;
        est.editId = id;
        est.cliSel = { id: e.cliente_id, nome: e.cliente_nome };
        document.getElementById('ev-cad-cliente').value = e.cliente_nome || '';
        document.getElementById('ev-cad-nome').value = e.nome || '';
        const t = document.getElementById('ev-cad-titulo'); if (t) t.innerHTML = '<i class="ph ph-pencil-simple" style="color:#7048e8;"></i> Editar Evento';
        const b = document.getElementById('ev-cad-btn-txt'); if (b) b.textContent = 'Salvar alteração';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById('ev-cad-nome')?.focus();
    };

    window.salvarEventoCad = async function () {
        await garantirClientesCad();
        const nome = String(document.getElementById('ev-cad-nome')?.value || '').trim();
        const cliTxt = String(document.getElementById('ev-cad-cliente')?.value || '').trim();
        let cli = est.cliSel;
        if (!cli && cliTxt) {
            const n = norm(cliTxt);
            const c = est.clientes.find(x => norm(x.nome_razao_social) === n || norm(x.nome_fantasia) === n);
            if (c) cli = { id: c.id, nome: c.nome_razao_social || c.nome_fantasia };
        }
        if (!cli) { Swal.fire('Atenção', 'Selecione o cliente na lista (digite para pesquisar).', 'warning'); document.getElementById('ev-cad-cliente')?.focus(); return; }
        if (!nome) { Swal.fire('Atenção', 'Informe o nome do evento.', 'warning'); document.getElementById('ev-cad-nome')?.focus(); return; }
        const corpo = { cliente_id: cli.id, cliente_nome: cli.nome, nome };
        const r = est.editId ? await chamar('PUT', '/comercial/eventos/' + est.editId, corpo) : await chamar('POST', '/comercial/eventos', corpo);
        if (r && r.success) {
            if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso(est.editId ? 'Evento atualizado!' : 'Evento cadastrado!');
            window.limparFormEventoCad();
            await window.carregarEventosCad();
        } else {
            Swal.fire('Erro', (r && r.error) || 'Não foi possível salvar o evento.', 'error');
        }
    };

    window.excluirEventoCad = async function (id) {
        const e = est.eventos.find(x => x.id === id);
        if (!e) return;
        const conf = await Swal.fire({
            icon: 'warning', title: 'Excluir evento?',
            html: `Deseja excluir o evento <b>${esc(e.nome)}</b> do cliente <b>${esc(e.cliente_nome)}</b>?<br><small>Propostas já salvas mantêm o nome digitado.</small>`,
            showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sim, excluir', cancelButtonText: 'Cancelar'
        });
        if (!conf.isConfirmed) return;
        const r = await chamar('DELETE', '/comercial/eventos/' + id);
        if (r && r.success) { if (est.editId === id) window.limparFormEventoCad(); await window.carregarEventosCad(); }
        else Swal.fire('Erro', (r && r.error) || 'Não foi possível excluir.', 'error');
    };
})();
