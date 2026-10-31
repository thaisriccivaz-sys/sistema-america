/* ══════════════════════════════════════════════════════════════════════
   CADASTRO DE EVENTOS + CALENDÁRIO EM LISTA POR MESES + HISTÓRICO DE DATAS
   (Comercial → Cadastros → Cadastro Evento)
   - Nomes de eventos vinculados a clientes (tabela comercial_eventos)
   - Cada nome de evento armazena o histórico de datas (Período Início * e Até *)
     em historico_datas e a data do último evento (ultimo_periodo_inicio / ultimo_periodo_fim)
   - Na Proposta (tipo EVENTO): ao visualizar/selecionar o Nome do Evento, exibe
     além do nome do cliente a data do último evento (Período Início * até Até *)
   - Na tela Cadastro Evento: Calendário em Lista separado por meses, destacando o
     dia de hoje, com filtro por mês e busca por nome do evento ou nome do cliente,
     exibindo todas as datas do histórico e o período do contrato (Período Início * Até *)
   ══════════════════════════════════════════════════════════════════════ */
(function () {
    const esc = (s) => String(s === undefined || s === null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const limpaNomeCli = (s) => String(s || '').replace(/^[^A-Za-z0-9\u00C0-\u00FF]+/, '').trim();
    const tok = () => window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';

    const MESES_NOMES = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    function hojeIsoLocal() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function fmtDataBr(iso) {
        const s = String(iso || '').trim().substring(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || '—';
        return s.split('-').reverse().join('/');
    }

    function diaSemanaCurto(iso) {
        const s = String(iso || '').trim().substring(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
        const [y, m, d] = s.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return DIAS_SEMANA[dt.getDay()] || '';
    }

    function fmtPeriodoContrato(ini, fim) {
        const i = String(ini || '').trim().substring(0, 10);
        const f = String(fim || '').trim().substring(0, 10) || i;
        if (!i && !f) return 'Sem data informada';
        return `${fmtDataBr(i || f)} até ${fmtDataBr(f || i)}`;
    }

    function obterUltimoPeriodoEvento(ev) {
        if (!ev) return { ini: '', fim: '', texto: 'Sem data registrada' };
        let ini = String(ev.ultimo_periodo_inicio || '').trim().substring(0, 10);
        let fim = String(ev.ultimo_periodo_fim || '').trim().substring(0, 10);
        const hist = Array.isArray(ev.historico_datas) ? ev.historico_datas : [];
        if (!ini && hist.length > 0) {
            ini = String(hist[0].periodo_inicio || '').trim().substring(0, 10);
            fim = String(hist[0].periodo_fim || ini).trim().substring(0, 10);
        }
        if (!ini && !fim) return { ini: '', fim: '', texto: 'Sem data registrada' };
        return { ini: ini || fim, fim: fim || ini, texto: fmtPeriodoContrato(ini, fim) };
    }

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
        const lista = cache.lista.filter(e => !q || norm(e.nome).includes(q) || norm(e.cliente_nome).includes(q));
        if (!lista.length) {
            dd.innerHTML = '<div style="padding:10px 12px; font-size:0.78rem; color:#64748b;">' +
                (cache.lista.length ? 'Nenhum evento encontrado com esse texto — você pode digitar um novo nome.' : 'Nenhum evento cadastrado para este cliente. Digite o nome ou use o botão + para cadastrar.') + '</div>';
        } else {
            dd.innerHTML = lista.map(e => {
                const ult = obterUltimoPeriodoEvento(e);
                const qtdHist = Array.isArray(e.historico_datas) ? e.historico_datas.length : 0;
                return `<div class="prop-evento-item" data-nome="${esc(e.nome)}" style="padding:8px 12px; font-size:0.83rem; color:#1e293b; cursor:pointer; border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background='#f5f3ff'" onmouseout="this.style.background=''" onmousedown="event.preventDefault(); window.selecionarEventoProposta(this.getAttribute('data-nome'));">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span style="font-weight:800; color:#1e293b; text-transform:uppercase;">${esc(e.nome)}</span>
                        <span style="font-size:0.73rem; font-weight:700; background:${ult.ini ? '#ede9fe' : '#f1f5f9'}; color:${ult.ini ? '#5b21b6' : '#64748b'}; padding:2px 8px; border-radius:999px; white-space:nowrap;">
                            📅 Último: ${esc(ult.texto)}${qtdHist > 1 ? ` (${qtdHist}x)` : ''}
                        </span>
                    </div>
                    <div style="font-size:0.74rem; color:#64748b; margin-top:2px;">Cliente: <b style="color:#475569;">${esc(e.cliente_nome || nomeCli)}</b></div>
                </div>`;
            }).join('');
        }
        dd.style.display = 'block';
    };

    window.abrirDropdownEventosProposta = async function (mostrarTodos) {
        await window.carregarEventosClienteProposta(true);
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

    /* Lupa: pesquisar eventos do cliente em uma janela com busca, exibindo cliente e data do último evento */
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
                    <input id="modal-ev-busca" type="search" name="modal_ev_busca_nofill" autocomplete="new-password" data-lpignore="true" data-form-type="other" readonly onmousedown="this.removeAttribute('readonly')" onfocus="this.removeAttribute('readonly')" onclick="this.removeAttribute('readonly')" placeholder="Digite para filtrar o nome do evento..." style="width:100%; padding:7px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; box-sizing:border-box; height:36px; outline:none; background:#fff; margin-bottom:10px;">
                    <div id="modal-ev-lista" style="max-height:320px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff;"></div>
                    <div id="modal-ev-count" style="font-size:0.75rem; color:#475569; font-weight:700; text-align:right; margin-top:6px;"></div>
                </div>
            </div>`,
            showConfirmButton: false,
            showCloseButton: true,
            width: '720px',
            customClass: { popup: 'custom-swal-padding-zero' },
            didOpen: () => {
                const busca = document.getElementById('modal-ev-busca');
                const box = document.getElementById('modal-ev-lista');
                const cnt = document.getElementById('modal-ev-count');
                const pinta = () => {
                    const q = norm(busca.value);
                    const f = lista.filter(e => !q || norm(e.nome).includes(q) || norm(e.cliente_nome).includes(q));
                    box.innerHTML = f.length
                        ? f.map(e => {
                            const ult = obterUltimoPeriodoEvento(e);
                            const hist = Array.isArray(e.historico_datas) ? e.historico_datas : [];
                            return `<div class="modal-ev-item" data-nome="${esc(e.nome)}" style="padding:10px 14px; border-bottom:1px solid #f1f5f9; cursor:pointer; font-size:0.84rem;" onmouseover="this.style.background='#f5f3ff'" onmouseout="this.style.background=''">
                                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                                    <span style="font-weight:800; color:#1e293b; text-transform:uppercase;">${esc(e.nome)}</span>
                                    <span style="font-size:0.76rem; font-weight:700; background:${ult.ini ? '#ede9fe' : '#f1f5f9'}; color:${ult.ini ? '#5b21b6' : '#64748b'}; padding:2px 9px; border-radius:999px;">
                                        📅 Último Evento (Período Início / Até): ${esc(ult.texto)}
                                    </span>
                                </div>
                                <div style="font-size:0.76rem; color:#64748b; margin-top:3px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px;">
                                    <span>Cliente: <b style="color:#334155;">${esc(e.cliente_nome || nomeCli)}</b></span>
                                    ${hist.length > 1 ? `<span style="color:#6d28d9; font-weight:600;">Histórico: ${hist.map(h => fmtPeriodoContrato(h.periodo_inicio, h.periodo_fim)).slice(0, 3).join(' | ')}</span>` : ''}
                                </div>
                            </div>`;
                        }).join('')
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
            }
        });
    };

    /* Botão +: cadastrar novo evento para o cliente da proposta (já puxando Período Início * e Até * da proposta) */
    window.novoEventoProposta = async function () {
        const nomeCli = window.obterNomeClienteEventoProposta();
        if (!nomeCli) { Swal.fire('Atenção', 'Selecione primeiro o cliente para cadastrar um evento para ele.', 'warning'); return; }
        const atual = String(document.getElementById('prop-nome-evento')?.value || '').trim();
        const iniProp = String(document.getElementById('prop-periodo-ini')?.value || '').trim();
        const fimProp = String(document.getElementById('prop-periodo-fim')?.value || '').trim();
        const resModal = await Swal.fire({
            title: 'Novo Evento do Cliente',
            html: `
                <div style="text-align:left; font-family:'Inter',sans-serif; font-size:0.84rem; display:flex; flex-direction:column; gap:10px;">
                    <div style="font-size:0.8rem; color:#475569; background:#f8fafc; padding:8px 10px; border-radius:6px; border:1px solid #e2e8f0;">
                        Cliente: <b style="color:#1e293b;">${esc(nomeCli)}</b>
                    </div>
                    <div>
                        <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Nome do Evento *</label>
                        <input id="swal-novo-ev-nome" type="text" value="${esc(atual)}" autocomplete="new-password" data-lpignore="true" placeholder="Digite o nome do evento..." style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; box-sizing:border-box;">
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        <div>
                            <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Período Início *</label>
                            <input id="swal-novo-ev-ini" type="date" value="${esc(iniProp)}" style="width:100%; padding:7px 9px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.84rem; box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Até *</label>
                            <input id="swal-novo-ev-fim" type="date" value="${esc(fimProp || iniProp)}" style="width:100%; padding:7px 9px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.84rem; box-sizing:border-box;">
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Cadastrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#16a34a',
            preConfirm: () => {
                const nm = String(document.getElementById('swal-novo-ev-nome')?.value || '').trim();
                const dtIni = String(document.getElementById('swal-novo-ev-ini')?.value || '').trim();
                const dtFim = String(document.getElementById('swal-novo-ev-fim')?.value || '').trim();
                if (!nm) {
                    Swal.showValidationMessage('Informe o nome do evento.');
                    return false;
                }
                return { nome: nm, periodo_inicio: dtIni, periodo_fim: dtFim || dtIni };
            }
        });
        if (!resModal.isConfirmed || !resModal.value) return;
        const { nome, periodo_inicio, periodo_fim } = resModal.value;
        const r = await chamar('POST', '/comercial/eventos', { cliente_nome: nomeCli, nome, periodo_inicio, periodo_fim });
        if (r && (r.success || r.id)) {
            await window.carregarEventosClienteProposta(true);
            window.selecionarEventoProposta(nome);
            if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso('Evento salvo com histórico de data!');
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

    /* ══════════ 2) TELA "CADASTRAR EVENTO" + CALENDÁRIO EM LISTA POR MESES ══════════ */
    const est = { clientes: [], eventos: [], editId: null, cliSel: null, filtro: '', mesFiltro: 'TODOS' };

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
        est.editId = null; est.cliSel = null; est.filtro = ''; est.mesFiltro = 'TODOS';
        const hoje = hojeIsoLocal();
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

            <!-- Card de Cadastro / Edição de Evento com Período Início * e Até * -->
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1rem 1.15rem; margin-bottom:0.85rem;">
                <div id="ev-cad-titulo" style="font-size:0.9rem; font-weight:800; color:#1e293b; margin-bottom:0.7rem;"><i class="ph ph-calendar-star" style="color:#7048e8;"></i> Cadastrar Evento</div>
                <div style="display:grid; grid-template-columns:1.3fr 1.2fr 0.75fr 0.75fr auto; gap:0.65rem; align-items:flex-end;">
                    <div>
                        <label style="display:block; font-size:0.74rem; font-weight:700; color:#475569; margin-bottom:4px;">Cliente *</label>
                        <div id="ev-cad-cli-wrap" style="position:relative;">
                            <input type="text" id="ev-cad-cliente" name="ev_cad_cliente_nofill" autocomplete="new-password" data-lpignore="true" data-form-type="other" readonly onmousedown="this.removeAttribute('readonly')" placeholder="Digite o nome ou CNPJ do cliente..." oninput="window.filtrarClientesEventoCad()" onfocus="this.removeAttribute('readonly'); window.abrirClientesEventoCad(true)" onclick="this.removeAttribute('readonly'); window.abrirClientesEventoCad(true)" style="${inp}">
                            <div id="ev-cad-cli-dd" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; max-height:240px; overflow-y:auto; background:#fff; border:1px solid #cbd5e1; border-radius:6px; box-shadow:0 8px 20px rgba(15,23,42,0.12); z-index:1050;"></div>
                        </div>
                    </div>
                    <div>
                        <label style="display:block; font-size:0.74rem; font-weight:700; color:#475569; margin-bottom:4px;">Nome do Evento *</label>
                        <input type="text" id="ev-cad-nome" name="ev_cad_nome_nofill" autocomplete="new-password" data-lpignore="true" data-form-type="other" readonly onmousedown="this.removeAttribute('readonly')" onfocus="this.removeAttribute('readonly')" onclick="this.removeAttribute('readonly')" placeholder="Digite o nome do evento..." onkeydown="this.removeAttribute('readonly'); if(event.key==='Enter'){ event.preventDefault(); window.salvarEventoCad(); }" style="${inp}">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.74rem; font-weight:700; color:#475569; margin-bottom:4px;">Período Início *</label>
                        <input type="date" id="ev-cad-ini" onchange="const f=document.getElementById('ev-cad-fim'); if(f && !f.value) f.value=this.value;" style="${inp}">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.74rem; font-weight:700; color:#475569; margin-bottom:4px;">Até *</label>
                        <input type="date" id="ev-cad-fim" style="${inp}">
                    </div>
                    <div>
                        <button type="button" onclick="window.salvarEventoCad()" style="background:#7048e8; color:#fff; border:none; border-radius:7px; padding:0 1.25rem; height:36px; font-size:0.82rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px; white-space:nowrap;"><i class="ph ph-plus-circle"></i> <span id="ev-cad-btn-txt">Cadastrar</span></button>
                    </div>
                </div>
            </div>

            <!-- Card do Calendário em Lista Separado por Meses -->
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1rem 1.15rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:0.75rem; margin-bottom:0.85rem; flex-wrap:wrap; padding-bottom:0.65rem; border-bottom:1px solid #e2e8f0;">
                    <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
                        <div style="font-size:0.95rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:6px;">
                            <i class="ph ph-calendar" style="color:#7048e8; font-size:1.15rem;"></i> Calendário em Lista de Eventos
                            <span id="ev-cad-count" style="background:#ede9fe; color:#6d28d9; padding:2px 9px; border-radius:999px; font-size:0.73rem;">0</span>
                        </div>
                        <span style="display:inline-flex; align-items:center; gap:6px; background:#dbeafe; color:#1d4ed8; border:1px solid #93c5fd; padding:4px 10px; border-radius:999px; font-size:0.76rem; font-weight:800;">
                            <i class="ph ph-calendar-check"></i> Hoje: ${fmtDataBr(hoje)} (${diaSemanaCurto(hoje)})
                        </span>
                        <button type="button" onclick="window.irParaHojeCalendarioEventos()" style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:4px 10px; border-radius:6px; font-size:0.75rem; font-weight:700; cursor:pointer;">
                            Ver Mês Atual
                        </button>
                    </div>

                    <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                        <div style="display:flex; align-items:center; gap:5px;">
                            <label style="font-size:0.75rem; font-weight:700; color:#475569; white-space:nowrap;">Filtrar Mês:</label>
                            <select id="ev-cal-mes" onchange="window.filtrarMesCalendarioEventos(this.value)" style="height:34px; padding:0 0.6rem; border:1px solid #cbd5e1; border-radius:7px; font-size:0.82rem; background:#fff; color:#1e293b; font-weight:600; cursor:pointer;">
                                <option value="TODOS">Todos os Meses</option>
                            </select>
                        </div>
                        <input type="search" id="ev-cad-busca" name="ev_cad_busca_nofill"
                            autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false"
                            data-lpignore="true" data-1p-ignore="true" data-form-type="other"
                            readonly
                            onmousedown="this.removeAttribute('readonly')"
                            onfocus="this.removeAttribute('readonly')"
                            onclick="this.removeAttribute('readonly')"
                            onkeydown="this.removeAttribute('readonly')"
                            placeholder="🔍 Pesquisar nome do evento ou cliente..."
                            oninput="window.filtrarListaEventosCad(this.value)"
                            style="width:320px; max-width:100%; padding:0 0.7rem; height:34px; border:1px solid #cbd5e1; border-radius:7px; font-size:0.82rem; box-sizing:border-box; background:#fff;">
                    </div>
                </div>

                <!-- Container do Calendário em Lista separado por meses -->
                <div id="ev-cal-lista-meses" style="display:flex; flex-direction:column; gap:1rem;">
                    <div style="padding:1.5rem; text-align:center; color:#94a3b8;">Carregando calendário de eventos...</div>
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
        est.cliSel = null;
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
        cache.chave = '';
        popularSelectMesesCalendario();
        renderListaEventosCad();
    };

    function nomeMesAno(ym) {
        const [y, m] = String(ym || '').split('-').map(Number);
        if (!y || !m) return ym;
        return `${MESES_NOMES[m - 1] || m} / ${y}`;
    }

    function popularSelectMesesCalendario() {
        const sel = document.getElementById('ev-cal-mes');
        if (!sel) return;
        const hojeYm = hojeIsoLocal().substring(0, 7);
        const mesesSet = new Set([hojeYm]);
        est.eventos.forEach(e => {
            const hist = Array.isArray(e.historico_datas) ? e.historico_datas : [];
            hist.forEach(h => {
                const ym = String(h.periodo_inicio || h.periodo_fim || '').substring(0, 7);
                if (/^\d{4}-\d{2}$/.test(ym)) mesesSet.add(ym);
            });
            const uYm = String(e.ultimo_periodo_inicio || e.ultimo_periodo_fim || '').substring(0, 7);
            if (/^\d{4}-\d{2}$/.test(uYm)) mesesSet.add(uYm);
        });
        const mesesOrd = Array.from(mesesSet).sort((a, b) => b.localeCompare(a));
        const valAtual = est.mesFiltro || 'TODOS';
        sel.innerHTML = `<option value="TODOS">Todos os Meses</option>` +
            mesesOrd.map(ym => `<option value="${esc(ym)}" ${valAtual === ym ? 'selected' : ''}>${esc(nomeMesAno(ym))}${ym === hojeYm ? ' (Mês Atual)' : ''}</option>`).join('') +
            `<optgroup label="Filtrar apenas pelo mês (qualquer ano)">` +
            MESES_NOMES.map((nm, idx) => {
                const mm = String(idx + 1).padStart(2, '0');
                const k = `MES:${mm}`;
                return `<option value="${k}" ${valAtual === k ? 'selected' : ''}>Somente ${nm}</option>`;
            }).join('') +
            `</optgroup>`;
    }

    window.filtrarListaEventosCad = function (v) {
        est.filtro = String(v || '');
        renderListaEventosCad();
    };

    window.filtrarMesCalendarioEventos = function (v) {
        est.mesFiltro = String(v || 'TODOS');
        renderListaEventosCad();
    };

    window.irParaHojeCalendarioEventos = function () {
        const hojeYm = hojeIsoLocal().substring(0, 7);
        est.mesFiltro = 'TODOS';
        const sel = document.getElementById('ev-cal-mes');
        if (sel) sel.value = 'TODOS';
        renderListaEventosCad();
        setTimeout(() => {
            const elHoje = document.getElementById('ev-cal-row-hoje') || document.getElementById('ev-cal-mes-' + hojeYm);
            if (elHoje) elHoje.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
    };

    function renderListaEventosCad() {
        const box = document.getElementById('ev-cal-lista-meses');
        const cnt = document.getElementById('ev-cad-count');
        if (!box) return;
        const hoje = hojeIsoLocal();
        const hojeYm = hoje.substring(0, 7);
        const q = norm(est.filtro);
        const mesSel = est.mesFiltro || 'TODOS';

        const eventosFiltrados = est.eventos.filter(e => !q || norm(e.nome).includes(q) || norm(e.cliente_nome).includes(q));
        if (cnt) cnt.textContent = String(eventosFiltrados.length);

        const gruposPorMes = new Map();
        const semData = [];

        const passaFiltroMes = (ym) => {
            if (!mesSel || mesSel === 'TODOS') return true;
            if (mesSel.startsWith('MES:')) return ym.endsWith('-' + mesSel.slice(4));
            return ym === mesSel;
        };

        // Garante que o mês atual apareça com o marcador do dia de hoje quando compatível com o filtro
        if (!q && passaFiltroMes(hojeYm)) {
            gruposPorMes.set(hojeYm, [{
                tipo_linha: 'HOJE_MARCADOR',
                data_ref: hoje
            }]);
        }

        eventosFiltrados.forEach(ev => {
            const ult = obterUltimoPeriodoEvento(ev);
            const hist = Array.isArray(ev.historico_datas) && ev.historico_datas.length > 0
                ? ev.historico_datas
                : (ult.ini ? [{ periodo_inicio: ult.ini, periodo_fim: ult.fim }] : []);

            if (!hist.length) {
                if (mesSel === 'TODOS') semData.push(ev);
                return;
            }

            hist.forEach((h, idx) => {
                const ini = String(h.periodo_inicio || h.periodo_fim || '').substring(0, 10);
                const fim = String(h.periodo_fim || ini).substring(0, 10);
                const ym = ini.substring(0, 7);
                if (!/^\d{4}-\d{2}$/.test(ym) || !passaFiltroMes(ym)) return;
                if (!gruposPorMes.has(ym)) gruposPorMes.set(ym, []);
                gruposPorMes.get(ym).push({
                    tipo_linha: 'EVENTO',
                    data_ref: ini,
                    periodo_inicio: ini,
                    periodo_fim: fim,
                    eh_hoje: (ini <= hoje && hoje <= fim),
                    eh_ultimo: idx === 0,
                    proposta_codigo: h.proposta_codigo || null,
                    contrato: h.contrato || null,
                    evento: ev,
                    ultimo_texto: ult.texto,
                    qtd_historico: hist.length
                });
            });
        });

        const mesesOrdenados = Array.from(gruposPorMes.keys()).sort((a, b) => b.localeCompare(a));

        const htmlMeses = mesesOrdenados.map(ym => {
            const itens = gruposPorMes.get(ym) || [];
            // Se já existe um evento acontecendo exatamente na data de hoje neste mês, mantemos a linha de hoje + os eventos ordenados por data
            itens.sort((a, b) => {
                const cmp = String(b.data_ref || '').localeCompare(String(a.data_ref || ''));
                if (cmp !== 0) return cmp;
                if (a.tipo_linha === 'HOJE_MARCADOR') return -1;
                if (b.tipo_linha === 'HOJE_MARCADOR') return 1;
                return String(a.evento?.nome || '').localeCompare(String(b.evento?.nome || ''), 'pt-BR');
            });

            const qtdEventosMes = itens.filter(x => x.tipo_linha === 'EVENTO').length;
            const ehMesAtual = ym === hojeYm;

            const linhasHtml = itens.map(it => {
                if (it.tipo_linha === 'HOJE_MARCADOR') {
                    return `
                        <tr id="ev-cal-row-hoje" style="background:#dbeafe; border-bottom:1px solid #93c5fd;">
                            <td style="padding:9px 12px; font-weight:800; color:#1d4ed8; white-space:nowrap;">
                                <span style="background:#2563eb; color:#fff; font-size:0.68rem; font-weight:800; padding:2px 7px; border-radius:999px; margin-right:6px;">HOJE</span>
                                ${fmtDataBr(it.data_ref)} <span style="color:#1e40af; font-size:0.75rem;">(${diaSemanaCurto(it.data_ref)})</span>
                            </td>
                            <td colspan="5" style="padding:9px 12px; font-weight:700; color:#1e40af; font-size:0.8rem;">
                                📅 Dia de hoje no calendário (${fmtDataBr(it.data_ref)})
                            </td>
                        </tr>`;
                }
                const ev = it.evento;
                const bgRow = it.eh_hoje ? 'background:#eff6ff;' : '';
                return `
                    <tr style="${bgRow} border-bottom:1px solid #e2e8f0;">
                        <td style="padding:9px 12px; font-weight:700; color:#1e293b; white-space:nowrap;">
                            ${it.eh_hoje ? '<span style="background:#2563eb; color:#fff; font-size:0.66rem; font-weight:800; padding:2px 6px; border-radius:999px; margin-right:5px;">HOJE</span>' : ''}
                            ${fmtDataBr(it.data_ref)} <span style="color:#64748b; font-size:0.74rem; font-weight:600;">(${diaSemanaCurto(it.data_ref)})</span>
                        </td>
                        <td style="padding:9px 12px; font-weight:800; color:#1e293b; text-transform:uppercase;">
                            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                <span>${esc(ev.nome)}</span>
                                ${it.eh_ultimo
                                    ? '<span style="font-size:0.68rem; background:#dcfce7; color:#166534; padding:1px 7px; border-radius:999px; font-weight:700; text-transform:none;">Último evento</span>'
                                    : '<span style="font-size:0.68rem; background:#f1f5f9; color:#475569; padding:1px 7px; border-radius:999px; font-weight:700; text-transform:none;">Histórico</span>'}
                                <button type="button" onclick="window.abrirHistoricoDatasEvento(${ev.id})" title="Ver / gerenciar histórico de datas deste evento" style="background:#ede9fe; color:#6d28d9; border:1px solid #c4b5fd; border-radius:999px; padding:1px 8px; font-size:0.7rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:3px;">
                                    <i class="ph ph-clock-counter-clockwise"></i> ${it.qtd_historico} data(s)
                                </button>
                            </div>
                        </td>
                        <td style="padding:9px 12px; font-weight:600; color:#334155;">${esc(ev.cliente_nome)}</td>
                        <td style="padding:9px 12px; font-weight:700; color:#5b21b6; white-space:nowrap;">
                            ${esc(fmtPeriodoContrato(it.periodo_inicio, it.periodo_fim))}
                            ${it.contrato ? `<span style="display:block; font-size:0.7rem; color:#64748b; font-weight:600;">Contrato: ${esc(it.contrato)}</span>` : ''}
                        </td>
                        <td style="padding:9px 12px; font-weight:600; color:#0f766e; white-space:nowrap;">${esc(it.ultimo_texto)}</td>
                        <td style="padding:9px 12px; text-align:center; white-space:nowrap;">
                            <button type="button" title="Histórico de Datas / Nova Data" onclick="window.abrirHistoricoDatasEvento(${ev.id})" style="width:30px; height:30px; border:1px solid #bfdbfe; background:#eff6ff; color:#2563eb; border-radius:7px; cursor:pointer; margin-right:3px;"><i class="ph ph-calendar-plus"></i></button>
                            <button type="button" title="Editar Evento" onclick="window.editarEventoCad(${ev.id})" style="width:30px; height:30px; border:1px solid #c4b5fd; background:#f5f3ff; color:#6d28d9; border-radius:7px; cursor:pointer; margin-right:3px;"><i class="ph ph-pencil-simple"></i></button>
                            <button type="button" title="Excluir Evento" onclick="window.excluirEventoCad(${ev.id})" style="width:30px; height:30px; border:1px solid #fecaca; background:#fee2e2; color:#dc2626; border-radius:7px; cursor:pointer;"><i class="ph ph-trash"></i></button>
                        </td>
                    </tr>`;
            }).join('');

            return `
                <div id="ev-cal-mes-${esc(ym)}" style="border:1px solid ${ehMesAtual ? '#93c5fd' : '#e2e8f0'}; border-radius:10px; overflow:hidden; background:#fff;">
                    <div style="background:${ehMesAtual ? '#eff6ff' : '#f8fafc'}; padding:10px 14px; border-bottom:1px solid ${ehMesAtual ? '#bfdbfe' : '#e2e8f0'}; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <div style="font-size:0.88rem; font-weight:800; color:${ehMesAtual ? '#1d4ed8' : '#1e293b'}; text-transform:uppercase; display:flex; align-items:center; gap:8px;">
                            <i class="ph ph-calendar-blank" style="color:${ehMesAtual ? '#2563eb' : '#7048e8'}; font-size:1rem;"></i>
                            ${esc(nomeMesAno(ym))}
                            ${ehMesAtual ? '<span style="background:#2563eb; color:#fff; font-size:0.68rem; padding:2px 8px; border-radius:999px;">MÊS ATUAL</span>' : ''}
                        </div>
                        <span style="font-size:0.75rem; font-weight:700; color:#475569;">${qtdEventosMes} registro(s) no mês</span>
                    </div>
                    <div style="max-height:420px; overflow-y:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.71rem; text-transform:uppercase; letter-spacing:0.03em;">
                                    <th style="position:sticky; top:0; z-index:2; background:#f8fafc; padding:9px 12px; width:155px;">Dia / Data</th>
                                    <th style="position:sticky; top:0; z-index:2; background:#f8fafc; padding:9px 12px;">Nome do Evento</th>
                                    <th style="position:sticky; top:0; z-index:2; background:#f8fafc; padding:9px 12px;">Cliente</th>
                                    <th style="position:sticky; top:0; z-index:2; background:#f8fafc; padding:9px 12px; width:220px;">Período do Contrato (Início / Até)</th>
                                    <th style="position:sticky; top:0; z-index:2; background:#f8fafc; padding:9px 12px; width:210px;">Último Evento</th>
                                    <th style="position:sticky; top:0; z-index:2; background:#f8fafc; padding:9px 12px; width:115px; text-align:center;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>${linhasHtml}</tbody>
                        </table>
                    </div>
                </div>`;
        }).join('');

        const htmlSemData = semData.length ? `
            <div style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; background:#fff;">
                <div style="background:#f8fafc; padding:10px 14px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:0.85rem; font-weight:800; color:#475569; text-transform:uppercase; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-clock" style="color:#7048e8;"></i> Eventos Cadastrados Aguardando Data de Período (${semData.length})
                    </div>
                    <span style="font-size:0.74rem; color:#64748b;">Informe o Período Início e Até ou vincule em uma Proposta de Evento</span>
                </div>
                <div style="max-height:360px; overflow-y:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
                        <thead>
                            <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.71rem; text-transform:uppercase;">
                                <th style="position:sticky; top:0; z-index:2; background:#f8fafc; padding:9px 12px;">Nome do Evento</th>
                                <th style="position:sticky; top:0; z-index:2; background:#f8fafc; padding:9px 12px;">Cliente</th>
                                <th style="position:sticky; top:0; z-index:2; background:#f8fafc; padding:9px 12px; width:210px;">Último Evento (Início / Até)</th>
                                <th style="position:sticky; top:0; z-index:2; background:#f8fafc; padding:9px 12px; width:115px; text-align:center;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${semData.map(ev => `
                                <tr style="border-bottom:1px solid #e2e8f0;">
                                    <td style="padding:9px 12px; font-weight:800; color:#1e293b; text-transform:uppercase;">${esc(ev.nome)}</td>
                                    <td style="padding:9px 12px; font-weight:600; color:#334155;">${esc(ev.cliente_nome)}</td>
                                    <td style="padding:9px 12px; color:#94a3b8; font-style:italic;">Sem data registrada</td>
                                    <td style="padding:9px 12px; text-align:center; white-space:nowrap;">
                                        <button type="button" title="Adicionar Data ao Histórico" onclick="window.abrirHistoricoDatasEvento(${ev.id})" style="width:30px; height:30px; border:1px solid #bfdbfe; background:#eff6ff; color:#2563eb; border-radius:7px; cursor:pointer; margin-right:3px;"><i class="ph ph-calendar-plus"></i></button>
                                        <button type="button" title="Editar Evento" onclick="window.editarEventoCad(${ev.id})" style="width:30px; height:30px; border:1px solid #c4b5fd; background:#f5f3ff; color:#6d28d9; border-radius:7px; cursor:pointer; margin-right:3px;"><i class="ph ph-pencil-simple"></i></button>
                                        <button type="button" title="Excluir Evento" onclick="window.excluirEventoCad(${ev.id})" style="width:30px; height:30px; border:1px solid #fecaca; background:#fee2e2; color:#dc2626; border-radius:7px; cursor:pointer;"><i class="ph ph-trash"></i></button>
                                    </td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>` : '';

        if (!htmlMeses && !htmlSemData) {
            box.innerHTML = '<div style="padding:2rem; text-align:center; color:#94a3b8; font-style:italic; border:1px dashed #cbd5e1; border-radius:10px;">Nenhum evento encontrado para o filtro selecionado.</div>';
            return;
        }
        box.innerHTML = htmlMeses + htmlSemData;
    }

    /* Modal para visualizar e adicionar datas ao histórico de um evento */
    window.abrirHistoricoDatasEvento = async function (id) {
        const ev = est.eventos.find(x => x.id === id);
        if (!ev) return;
        const hist = Array.isArray(ev.historico_datas) ? [...ev.historico_datas] : [];
        const ult = obterUltimoPeriodoEvento(ev);

        await Swal.fire({
            title: '',
            width: '680px',
            showConfirmButton: false,
            showCloseButton: true,
            customClass: { popup: 'custom-swal-padding-zero' },
            html: `
                <div style="text-align:left; font-family:'Inter',sans-serif;">
                    <div style="font-size:1rem; font-weight:800; color:#1e293b; border-bottom:1px solid #e2e8f0; padding:14px 18px; background:#f8fafc;">
                        <i class="ph ph-clock-counter-clockwise" style="color:#7048e8;"></i> Histórico de Datas — <span style="color:#7048e8; text-transform:uppercase;">${esc(ev.nome)}</span>
                        <div style="font-size:0.76rem; font-weight:600; color:#64748b; margin-top:3px;">Cliente: <b style="color:#334155;">${esc(ev.cliente_nome)}</b> | Último Evento: <b style="color:#5b21b6;">${esc(ult.texto)}</b></div>
                    </div>
                    <div style="padding:14px 16px; background:#f1f5f9; display:flex; flex-direction:column; gap:12px;">
                        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px;">
                            <div style="font-size:0.78rem; font-weight:800; color:#1e293b; margin-bottom:8px;"><i class="ph ph-calendar-plus" style="color:#16a34a;"></i> Adicionar Período ao Histórico deste Evento</div>
                            <div style="display:grid; grid-template-columns:1fr 1fr auto; gap:8px; align-items:flex-end;">
                                <div>
                                    <label style="display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px;">Período Início *</label>
                                    <input type="date" id="modal-hist-ev-ini" onchange="const f=document.getElementById('modal-hist-ev-fim'); if(f && !f.value) f.value=this.value;" style="width:100%; height:34px; padding:0 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px;">Até *</label>
                                    <input type="date" id="modal-hist-ev-fim" style="width:100%; height:34px; padding:0 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; box-sizing:border-box;">
                                </div>
                                <button type="button" id="btn-modal-hist-ev-add" style="background:#16a34a; color:#fff; border:none; height:34px; padding:0 14px; border-radius:6px; font-size:0.8rem; font-weight:700; cursor:pointer;">+ Adicionar Data</button>
                            </div>
                        </div>

                        <div style="max-height:280px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff;">
                            <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
                                <thead>
                                    <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.71rem; text-transform:uppercase;">
                                        <th style="position:sticky; top:0; background:#f8fafc; padding:8px 12px;">Período do Contrato (Período Início * Até *)</th>
                                        <th style="position:sticky; top:0; background:#f8fafc; padding:8px 12px; width:140px;">Origem / Contrato</th>
                                        <th style="position:sticky; top:0; background:#f8fafc; padding:8px 12px; width:80px; text-align:center;">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${hist.length ? hist.map((h, idx) => `
                                        <tr style="border-bottom:1px solid #e2e8f0;">
                                            <td style="padding:8px 12px; font-weight:700; color:#1e293b;">
                                                ${esc(fmtPeriodoContrato(h.periodo_inicio, h.periodo_fim))}
                                                ${idx === 0 ? '<span style="margin-left:6px; font-size:0.68rem; background:#dcfce7; color:#166534; padding:1px 7px; border-radius:999px;">Último</span>' : ''}
                                            </td>
                                            <td style="padding:8px 12px; color:#64748b; font-size:0.76rem;">
                                                ${h.contrato ? `Contrato ${esc(h.contrato)}` : (h.proposta_codigo ? `Proposta ${esc(h.proposta_codigo)}` : 'Cadastro manual')}
                                            </td>
                                            <td style="padding:8px 12px; text-align:center;">
                                                <button type="button" class="btn-rem-hist-ev" data-idx="${idx}" title="Remover esta data" style="width:26px; height:26px; border:1px solid #fecaca; background:#fee2e2; color:#dc2626; border-radius:6px; cursor:pointer;"><i class="ph ph-trash"></i></button>
                                            </td>
                                        </tr>`).join('') : '<tr><td colspan="3" style="padding:1.2rem; text-align:center; color:#94a3b8; font-style:italic;">Nenhuma data registrada neste evento ainda.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>`,
            didOpen: () => {
                document.getElementById('btn-modal-hist-ev-add')?.addEventListener('click', async () => {
                    const ini = document.getElementById('modal-hist-ev-ini')?.value || '';
                    const fim = document.getElementById('modal-hist-ev-fim')?.value || ini;
                    if (!ini) { alert('Informe a data de Período Início.'); return; }
                    const novoHist = [...hist, { periodo_inicio: ini, periodo_fim: fim || ini }];
                    const r = await chamar('PUT', '/comercial/eventos/' + ev.id, {
                        nome: ev.nome,
                        cliente_id: ev.cliente_id,
                        cliente_nome: ev.cliente_nome,
                        historico_datas: novoHist
                    });
                    if (r && r.success) {
                        await window.carregarEventosCad();
                        window.abrirHistoricoDatasEvento(ev.id);
                    }
                });
                document.querySelectorAll('.btn-rem-hist-ev').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const i = Number(btn.getAttribute('data-idx'));
                        const novoHist = hist.filter((_, idx) => idx !== i);
                        const r = await chamar('PUT', '/comercial/eventos/' + ev.id, {
                            nome: ev.nome,
                            cliente_id: ev.cliente_id,
                            cliente_nome: ev.cliente_nome,
                            historico_datas: novoHist
                        });
                        if (r && r.success) {
                            await window.carregarEventosCad();
                            window.abrirHistoricoDatasEvento(ev.id);
                        }
                    });
                });
            }
        });
    };

    window.limparFormEventoCad = function () {
        est.editId = null; est.cliSel = null;
        const c = document.getElementById('ev-cad-cliente'); if (c) c.value = '';
        const n = document.getElementById('ev-cad-nome'); if (n) n.value = '';
        const i = document.getElementById('ev-cad-ini'); if (i) i.value = '';
        const f = document.getElementById('ev-cad-fim'); if (f) f.value = '';
        const t = document.getElementById('ev-cad-titulo'); if (t) t.innerHTML = '<i class="ph ph-calendar-star" style="color:#7048e8;"></i> Cadastrar Evento';
        const b = document.getElementById('ev-cad-btn-txt'); if (b) b.textContent = 'Cadastrar';
        c?.focus();
    };

    window.editarEventoCad = function (id) {
        const e = est.eventos.find(x => x.id === id);
        if (!e) return;
        est.editId = id;
        est.cliSel = { id: e.cliente_id, nome: e.cliente_nome };
        const ult = obterUltimoPeriodoEvento(e);
        const cEl = document.getElementById('ev-cad-cliente'); if (cEl) cEl.value = e.cliente_nome || '';
        const nEl = document.getElementById('ev-cad-nome'); if (nEl) nEl.value = e.nome || '';
        const iEl = document.getElementById('ev-cad-ini'); if (iEl) iEl.value = ult.ini || '';
        const fEl = document.getElementById('ev-cad-fim'); if (fEl) fEl.value = ult.fim || '';
        const t = document.getElementById('ev-cad-titulo'); if (t) t.innerHTML = '<i class="ph ph-pencil-simple" style="color:#7048e8;"></i> Editar Evento';
        const b = document.getElementById('ev-cad-btn-txt'); if (b) b.textContent = 'Salvar alteração';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        nEl?.focus();
    };

    window.salvarEventoCad = async function () {
        await garantirClientesCad();
        const nome = String(document.getElementById('ev-cad-nome')?.value || '').trim();
        const cliTxt = String(document.getElementById('ev-cad-cliente')?.value || '').trim();
        const periodo_inicio = String(document.getElementById('ev-cad-ini')?.value || '').trim();
        const periodo_fim = String(document.getElementById('ev-cad-fim')?.value || '').trim() || periodo_inicio;
        let cli = est.cliSel;
        if (!cli && cliTxt) {
            const n = norm(cliTxt);
            const c = est.clientes.find(x => norm(x.nome_razao_social) === n || norm(x.nome_fantasia) === n);
            if (c) cli = { id: c.id, nome: c.nome_razao_social || c.nome_fantasia };
        }
        if (!cli) { Swal.fire('Atenção', 'Selecione o cliente na lista (digite para pesquisar).', 'warning'); document.getElementById('ev-cad-cliente')?.focus(); return; }
        if (!nome) { Swal.fire('Atenção', 'Informe o nome do evento.', 'warning'); document.getElementById('ev-cad-nome')?.focus(); return; }
        const corpo = { cliente_id: cli.id, cliente_nome: cli.nome, nome, periodo_inicio, periodo_fim };
        const r = est.editId ? await chamar('PUT', '/comercial/eventos/' + est.editId, corpo) : await chamar('POST', '/comercial/eventos', corpo);
        if (r && r.success) {
            if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso(est.editId ? 'Evento atualizado!' : (r.updated_history ? 'Nova data adicionada ao histórico do evento!' : 'Evento cadastrado!'));
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
