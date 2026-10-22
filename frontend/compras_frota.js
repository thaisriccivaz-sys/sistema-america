// frontend/compras_frota.js
// Financeiro › Compras › Frota › Corretiva / Revisão
// O Compras registra serviços, garantias, peças, notas fiscais e valores das manutenções corretivas CONCLUÍDAS
// e das revisões REALIZADAS. Os dados ficam nas mesmas tabelas da logística (aparecem nos dois lados).
// Situação do Compras: Novo (laranja) → Iniciada (azul) → Registrado (verde). Nada é obrigatório para registrar.
(function () {
    'use strict';

    const tok = () => window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    const hdrJson = () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok() });
    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtData = (d) => {
        if (!d) return '—';
        const p = String(d).split('T')[0].split(' ')[0].split('-');
        return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : d;
    };
    const toast = (msg) => { if (typeof window.mostrarToastAviso === 'function') window.mostrarToastAviso(msg); };

    const SIT = {
        novo:       { label: 'Novo',       cor: '#d97706', bg: '#fff7ed', icone: 'ph-sparkle' },
        iniciada:   { label: 'Iniciada',   cor: '#2563eb', bg: '#eff6ff', icone: 'ph-hourglass-medium' },
        registrado: { label: 'Registrado', cor: '#16a34a', bg: '#f0fdf4', icone: 'ph-check-circle' }
    };
    const CONT = { corretiva: 'compras-corretivas-container', revisao: 'compras-revisao-container' };
    const TITULO = { corretiva: 'Corretiva', revisao: 'Revisão' };
    const state = {
        corretiva: { dados: [], filtro: '', busca: '' },
        revisao: { dados: [], filtro: '', busca: '' }
    };

    function sitBadge(sit, extraTitle) {
        const s = SIT[sit] || SIT.novo;
        return '<span title="' + esc(extraTitle || '') + '" style="background:' + s.bg + ';color:' + s.cor + ';border:1px solid ' + s.cor + '55;padding:3px 11px;border-radius:999px;font-size:0.74rem;font-weight:800;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;"><i class="ph-fill ' + s.icone + '"></i> ' + s.label + '</span>';
    }

    async function postSit(tipo, id, acao) {
        const r = await fetch('/api/compras-frota/' + tipo + '/' + id + '/situacao', { method: 'POST', headers: hdrJson(), body: JSON.stringify({ acao: acao }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Erro ao atualizar a situação do Compras');
        return j.situacao;
    }

    async function garantirFrota() {
        if (Array.isArray(window._manutFrota) && window._manutFrota.length) return;
        try {
            const r = await fetch('/api/frota/veiculos?_=' + Date.now(), { headers: { Authorization: 'Bearer ' + tok() }, cache: 'no-store' });
            const lista = await r.json();
            if (Array.isArray(lista)) { window._manutFrota = lista; if (!Array.isArray(window._frotaDados) || !window._frotaDados.length) window._frotaDados = lista; }
        } catch (e) { /* segue sem a lista de veiculos */ }
    }

    // ───────────────────────── Gestão de Frota (mesma tela da logística, sem a aba Manutenções) ─────────────────────────
    window.initComprasGestaoFrota = function () {
        if (typeof window._frotaMontarContexto === 'function') window._frotaMontarContexto('compras');
        if (typeof window.initFrotaVeiculos === 'function') window.initFrotaVeiculos();
    };

    // ───────────────────────── Listas: Corretiva / Revisão ─────────────────────────
    window.initComprasFrota = async function (tipo) {
        const cont = document.getElementById(CONT[tipo]);
        if (!cont) return;
        cont.innerHTML = '<div style="padding:3rem;text-align:center;color:#64748b;"><i class="ph ph-circle-notch ph-spin" style="font-size:2rem;color:#1971c2;"></i><div style="margin-top:8px;font-weight:600;">Carregando registros do Compras...</div></div>';
        try {
            const r = await fetch('/api/compras-frota/' + tipo + '?_=' + Date.now(), { headers: { Authorization: 'Bearer ' + tok() }, cache: 'no-store' });
            const j = await r.json();
            if (!r.ok) throw new Error((j && j.error) || 'Erro ao carregar');
            state[tipo].dados = Array.isArray(j) ? j : [];
            renderPagina(tipo);
        } catch (e) {
            cont.innerHTML = '<div style="padding:2rem;text-align:center;color:#dc2626;font-weight:600;">Erro ao carregar: ' + esc(e.message) + '</div>';
        }
    };

    function renderPagina(tipo) {
        const cont = document.getElementById(CONT[tipo]);
        if (!cont) return;
        const st = state[tipo];
        const icone = tipo === 'corretiva' ? 'ph-wrench' : 'ph-seal-check';
        cont.innerHTML =
            '<div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;flex-wrap:wrap;">'
            + '<div style="background:#1971c2;color:#fff;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;box-shadow:0 4px 10px rgba(25,113,194,0.3);"><i class="ph ' + icone + '"></i></div>'
            + '<div><h2 style="margin:0;color:#1e293b;font-size:1.4rem;">Compras — Frota › ' + TITULO[tipo] + '</h2>'
            + '<div style="font-size:0.8rem;color:#64748b;">' + (tipo === 'corretiva' ? 'Manutenções corretivas concluídas aguardando o registro de serviços, peças, notas e valores.' : 'Revisões realizadas aguardando o registro de serviços, peças, notas e valores.') + '</div></div>'
            + '</div>'
            + '<div id="cf-kpi-' + tipo + '" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:12px;margin-bottom:12px;"></div>'
            + '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:0.8rem 1rem;margin-bottom:1rem;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">'
            + '<div style="position:relative;flex:1;min-width:220px;"><i class="ph ph-magnifying-glass" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;"></i>'
            + '<input type="text" id="cf-busca-' + tipo + '" autocomplete="off" value="' + esc(st.busca) + '" placeholder="Pesquisar placa, modelo ou ' + (tipo === 'corretiva' ? 'defeito' : 'concessionária') + '..." oninput="window.comprasFrotaBuscar(\'' + tipo + '\', this.value)" style="width:100%;box-sizing:border-box;padding:0.5rem 0.7rem 0.5rem 2rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.84rem;outline:none;"></div>'
            + '<button type="button" onclick="window.comprasFrotaLimpar(\'' + tipo + '\')" style="padding:0.5rem 0.9rem;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#475569;font-weight:700;font-size:0.8rem;cursor:pointer;display:inline-flex;align-items:center;gap:5px;"><i class="ph ph-x-circle"></i> Limpar</button>'
            + '<button type="button" onclick="window.initComprasFrota(\'' + tipo + '\')" style="padding:0.5rem 0.9rem;border:none;border-radius:8px;background:#1971c2;color:#fff;font-weight:700;font-size:0.8rem;cursor:pointer;display:inline-flex;align-items:center;gap:5px;"><i class="ph ph-arrows-clockwise"></i> Atualizar</button>'
            + '<span id="cf-cont-' + tipo + '" style="font-size:0.78rem;color:#64748b;font-weight:700;"></span>'
            + '</div>'
            + '<div id="cf-tbl-' + tipo + '" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;"></div>';
        atualizarLista(tipo);
    }

    function filtrar(tipo) {
        const st = state[tipo];
        const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const palavras = norm(st.busca).split(' ').filter(Boolean);
        return st.dados.filter((x) => {
            if (st.filtro && x.situacao !== st.filtro) return false;
            if (!palavras.length) return true;
            const alvo = norm([x.placa, x.marca_modelo_versao, x.descricao, x.concessionaria, x.fornecedor].join(' '));
            return palavras.every((p) => alvo.indexOf(p) !== -1);
        });
    }

    function atualizarLista(tipo) {
        const st = state[tipo];
        // KPI (mesmo estilo dos botões de filtro da Revisão da logística)
        const cont = { novo: 0, iniciada: 0, registrado: 0 };
        st.dados.forEach((x) => { if (cont[x.situacao] !== undefined) cont[x.situacao]++; });
        const ativoKey = st.filtro || 'todos';
        const cards = [
            { key: 'novo', cor: '#d97706', bg: '#fff7ed', icone: 'ph-sparkle', label: 'Novo', val: cont.novo },
            { key: 'iniciada', cor: '#2563eb', bg: '#eff6ff', icone: 'ph-hourglass-medium', label: 'Iniciada', val: cont.iniciada },
            { key: 'registrado', cor: '#16a34a', bg: '#f0fdf4', icone: 'ph-check-circle', label: 'Registrado', val: cont.registrado },
            { key: 'todos', cor: '#7c3aed', bg: '#f5f3ff', icone: 'ph-list-bullets', label: 'Todos', val: st.dados.length }
        ];
        const kpi = document.getElementById('cf-kpi-' + tipo);
        if (kpi) kpi.innerHTML = cards.map((k) => {
            const ativo = ativoKey === k.key;
            return '<div onclick="window.comprasFrotaFiltrar(\'' + tipo + '\', \'' + k.key + '\')" title="Filtrar por: ' + k.label + '"'
                + ' style="background:' + (ativo ? k.bg : '#fff') + ';border:' + (ativo ? '2px solid ' + k.cor : '1px solid #e2e8f0') + ';border-left:4px solid ' + k.cor + ';border-radius:12px;padding:1rem;display:flex;align-items:center;gap:12px;box-shadow:' + (ativo ? '0 4px 12px ' + k.cor + '22' : '0 2px 6px rgba(0,0,0,0.04)') + ';cursor:pointer;transition:all 0.15s;user-select:none;">'
                + '<div style="width:42px;height:42px;border-radius:10px;background:' + k.cor + '18;color:' + k.cor + ';display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;"><i class="ph ' + k.icone + '"></i></div>'
                + '<div><div style="font-size:1.5rem;font-weight:800;color:#1e293b;line-height:1;">' + k.val + '</div>'
                + '<div style="font-size:0.75rem;color:' + (ativo ? k.cor : '#64748b') + ';font-weight:' + (ativo ? '700' : '600') + ';margin-top:2px;">' + k.label + '</div></div></div>';
        }).join('');

        const lista = filtrar(tipo);
        const cnt = document.getElementById('cf-cont-' + tipo);
        if (cnt) cnt.textContent = lista.length + ' de ' + st.dados.length + ' registro(s)';
        const tbl = document.getElementById('cf-tbl-' + tipo);
        if (!tbl) return;

        const th = 'padding:10px 12px;text-align:left;color:#475569;font-weight:700;white-space:nowrap;';
        const thR = 'padding:10px 12px;text-align:right;color:#475569;font-weight:700;white-space:nowrap;';
        const colSpan = 9;
        const linhas = lista.map((x, i) => {
            const bg = i % 2 === 0 ? '#fff' : '#fafafa';
            const avatar = x.foto_url
                ? '<img src="' + esc(x.foto_url) + '" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;flex-shrink:0;background:#f1f5f9;">'
                : '<div style="width:38px;height:38px;border-radius:50%;background:#f1f5f9;border:2px solid #e2e8f0;display:flex;align-items:center;justify-content:center;color:#94a3b8;flex-shrink:0;"><i class="ph ph-truck"></i></div>';
            const veic = '<div style="display:flex;align-items:center;gap:10px;">' + avatar
                + '<div><div style="font-weight:800;color:#1e293b;">' + esc(x.placa || '—') + '</div>'
                + '<div style="font-size:0.72rem;color:#64748b;">' + esc(String(x.marca_modelo_versao || x.tipo_veiculo || '').substring(0, 38)) + '</div></div></div>';
            let c2, c3, c4, vp, vm, vt;
            if (tipo === 'corretiva') {
                c2 = '<span title="' + esc(x.descricao || '') + '" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:300px;">' + esc(x.descricao || '—') + '</span>';
                c3 = fmtData(x.data_conclusao);
                c4 = esc(x.fornecedor || '—');
                vp = x.custo_pecas; vm = x.custo_mao_obra; vt = x.custo;
            } else {
                const ehCar = String(x.tipo_veiculo || '').toLowerCase().indexOf('carretinha') !== -1;
                c2 = '<span style="font-weight:700;color:#6d28d9;">' + (ehCar ? (x.marco_meses + ' meses') : (Number(x.marco_km).toLocaleString('pt-BR') + ' km / ' + x.marco_meses + ' meses')) + '</span>';
                c3 = fmtData(x.data_revisao);
                c4 = esc(x.concessionaria || '—');
                vp = x.valor_pecas; vm = x.valor_mao_obra; vt = x.valor_total;
            }
            const tituloSit = x.situacao === 'registrado' && x.registrado_em ? ('Registrado' + (x.registrado_por ? ' por ' + x.registrado_por : '') + ' em ' + fmtData(x.registrado_em)) : '';
            const btnCheck = (tipo === 'revisao' && Number(x.carga_inicial) === 1 && x.situacao !== 'registrado')
                ? '<button type="button" title="Marcar como Registrado sem preencher nada" onclick="window.comprasFrotaMarcarRegistrado(\'' + tipo + '\', ' + x.id + ', this)" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:0.4rem 0.65rem;font-size:0.85rem;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;" onmouseenter="this.style.background=\'#15803d\'" onmouseleave="this.style.background=\'#16a34a\'"><i class="ph-bold ph-check"></i></button>'
                : '';
            return '<tr style="background:' + bg + ';border-bottom:1px solid #f1f5f9;">'
                + '<td style="padding:9px 12px;">' + veic + '</td>'
                + '<td style="padding:9px 12px;">' + c2 + '</td>'
                + '<td style="padding:9px 12px;white-space:nowrap;">' + c3 + '</td>'
                + '<td style="padding:9px 12px;">' + c4 + '</td>'
                + '<td style="padding:9px 12px;text-align:right;white-space:nowrap;">' + brl(vp) + '</td>'
                + '<td style="padding:9px 12px;text-align:right;white-space:nowrap;">' + brl(vm) + '</td>'
                + '<td style="padding:9px 12px;text-align:right;font-weight:800;white-space:nowrap;">' + brl(vt) + '</td>'
                + '<td style="padding:9px 12px;text-align:center;">' + sitBadge(x.situacao, tituloSit) + '</td>'
                + '<td style="padding:9px 12px;text-align:center;white-space:nowrap;"><div style="display:inline-flex;align-items:center;gap:6px;justify-content:center;"><button type="button" onclick="window.comprasFrotaAbrir(\'' + tipo + '\', ' + x.id + ')" style="background:#1971c2;color:#fff;border:none;border-radius:8px;padding:0.4rem 0.9rem;font-size:0.8rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;"><i class="ph ph-pencil-simple"></i> ' + (x.situacao === 'registrado' ? 'Abrir' : 'Registrar') + '</button>' + btnCheck + '</div></td>'
                + '</tr>';
        }).join('');

        tbl.innerHTML = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.84rem;">'
            + '<thead><tr style="background:#f1f5f9;border-bottom:2px solid #e2e8f0;">'
            + '<th style="' + th + '">Veículo</th>'
            + '<th style="' + th + '">' + (tipo === 'corretiva' ? 'Defeito / Problema' : 'Revisão') + '</th>'
            + '<th style="' + th + '">' + (tipo === 'corretiva' ? 'Concluída em' : 'Data da revisão') + '</th>'
            + '<th style="' + th + '">' + (tipo === 'corretiva' ? 'Fornecedor' : 'Concessionária') + '</th>'
            + '<th style="' + thR + '">R$ Peças</th><th style="' + thR + '">R$ Mão de obra</th><th style="' + thR + '">R$ Total</th>'
            + '<th style="padding:10px 12px;text-align:center;color:#475569;font-weight:700;">Situação</th>'
            + '<th style="padding:10px 12px;"></th></tr></thead>'
            + '<tbody>' + (linhas || '<tr><td colspan="' + colSpan + '" style="padding:2.5rem;text-align:center;color:#94a3b8;"><i class="ph ph-tray" style="font-size:2rem;display:block;margin-bottom:6px;"></i>Nenhum registro encontrado.</td></tr>') + '</tbody>'
            + '</table></div>';
    }

    window.comprasFrotaFiltrar = function (tipo, key) {
        const st = state[tipo];
        st.filtro = (key === 'todos' || st.filtro === key) ? '' : key;
        atualizarLista(tipo);
    };
    window.comprasFrotaBuscar = function (tipo, val) { state[tipo].busca = val; atualizarLista(tipo); };
    window.comprasFrotaLimpar = function (tipo) { state[tipo].filtro = ''; state[tipo].busca = ''; renderPagina(tipo); };
    window.comprasFrotaAbrir = function (tipo, id) {
        if (tipo === 'corretiva') return window.comprasCorrAbrir(id);
        return window.comprasRevAbrir(id);
    };
    window.comprasFrotaMarcarRegistrado = async function (tipo, id, btnEl) {
        if (btnEl) {
            btnEl.disabled = true;
            btnEl.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i>';
        }
        try {
            const r = await fetch('/api/compras-frota/' + tipo + '/' + id + '/situacao', {
                method: 'POST',
                headers: hdrJson(),
                body: JSON.stringify({ acao: 'registrar' })
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j.error || 'Erro ao marcar como Registrado');
            const item = ((state[tipo] && state[tipo].dados) || []).find((x) => Number(x.id) === Number(id));
            if (item) {
                item.cf_status = 'registrado';
                item.situacao = 'registrado';
                item.registrado_em = j.registrado_em || new Date().toISOString();
                item.registrado_por = j.registrado_por || item.registrado_por || null;
            }
            atualizarLista(tipo);
            toast('✅ Marcado como Registrado!');
        } catch (e) {
            if (btnEl) {
                btnEl.disabled = false;
                btnEl.innerHTML = '<i class="ph-bold ph-check"></i>';
            }
            alert(e.message || 'Erro ao atualizar a situação do Compras');
        }
    };

    // ───────────────────────── Corretiva: tela simples (serviços, peças, notas, garantias e totais) ─────────────────────────
    // Reaproveita as MESMAS funções da logística (_mnEd*), com o mesmo vínculo de peças/mão de obra aos serviços e as mesmas garantias.
    function atualizarBadgeCorr() {
        const el = document.getElementById('cf-sit-badge');
        if (el && window._mnEd) el.innerHTML = sitBadge(window._mnEd._cfSit);
    }

    async function tocarCorr() {
        const ed = window._mnEd;
        if (!ed || !ed.modoCompras || !ed.id) return;
        const temDados = (ed.realizados || []).length || (ed.pecas || []).length || (ed.notas || []).length || (ed.mo || []).length;
        if (ed._cfSit === 'iniciada') return;
        if (!temDados && ed._cfSit !== 'registrado') return;
        try { ed._cfSit = await postSit('corretiva', ed.id, 'iniciar'); atualizarBadgeCorr(); } catch (e) { /* nao bloqueia */ }
    }

    function fecharCorr() {
        if (typeof window._mnEdFechar === 'function') window._mnEdFechar();
        window._mnEd = null;
        window.initComprasFrota('corretiva');
    }

    window.comprasCorrAbrir = async function (id) {
        const row = (state.corretiva.dados || []).find((x) => String(x.id) === String(id)) || {};
        if (typeof window._mnEdCarregarCatalogo !== 'function' || typeof window._mnEdRenderServ !== 'function') {
            alert('O módulo de manutenção ainda não foi carregado. Atualize a página (Ctrl+F5) e tente novamente.');
            return;
        }
        let det;
        try {
            const r = await fetch('/api/frota/manutencoes/' + id + '/detalhe', { headers: { Authorization: 'Bearer ' + tok() } });
            if (!r.ok) throw new Error('Erro ao carregar a manutenção');
            det = await r.json();
        } catch (e) { alert(e.message); return; }
        await window._mnEdCarregarCatalogo();
        await garantirFrota();
        const m = det.manutencao || {};
        m.placa = m.placa || row.placa || '';
        window._mnEdFechar();
        window._mnEd = {
            id: Number(id), novo: false, m: m,
            status: m.status || 'concluida', _statusInicial: m.status || 'concluida', _jaPerguntouStatus: '',
            veiculo_rodando: m.veiculo_rodando || 'sim', justificativa_status: '',
            solicitados: (det.solicitados || []).map((s) => s.nome),
            realizados: (det.realizados || []).map(window._mnEdMapRealizado),
            pecas: det.pecas || [], notas: det.notas || [],
            mo: (det.mo || []).map(window._mnEdMapMo),
            historico: [], midias: det.midias || [], pickSel: {},
            modoCompras: true, _cfSit: row.situacao || 'novo'
        };
        montarModalCorr(row, m);
    };

    function montarModalCorr(row, m) {
        const sec = 'border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px;background:#fff;';
        const secT = 'font-size:0.82rem;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:.04em;display:flex;align-items:center;gap:6px;';
        const lbl = 'font-size:0.78rem;font-weight:700;color:#64748b;display:block;margin-bottom:4px;';
        const inp = 'width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;font-family:inherit;background:#fff;';
        const btnSec = 'padding:6px 12px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;color:#475569;cursor:pointer;font-weight:600;font-size:0.78rem;display:inline-flex;align-items:center;gap:5px;';
        const catOpts = '<option value="__todas__">★ Todas as categorias</option>' + window._mnMontarGruposCategorias(window._manutCategorias).map((g) => {
            return '<optgroup label="' + esc(g.grupo) + '">'
                + '<option value="grupo:' + esc(g.grupo) + '">▸ Toda a categoria: ' + esc(g.grupo) + '</option>'
                + g.itens.map((it) => {
                    const valOpt = it.id ? it.id : ('sub:' + (it.rotulo || it.nome));
                    return '<option value="' + esc(valOpt) + '">' + esc(it.rotulo || it.nome) + '</option>';
                }).join('')
                + '</optgroup>';
        }).join('');

        const modal = document.createElement('div');
        modal.id = 'mn-corr-edit-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:#f1f5f9;display:flex;flex-direction:column;z-index:9999;';
        modal.innerHTML =
            '<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:14px 24px;display:flex;align-items:center;gap:12px;flex-shrink:0;">'
            + '<div style="background:#1971c2;border-radius:10px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-shopping-cart" style="color:#fff;font-size:1.3rem;"></i></div>'
            + '<div><div style="color:#fff;font-weight:700;font-size:1.1rem;">Compras — Manutenção Corretiva</div>'
            + '<div style="color:rgba(255,255,255,0.75);font-size:0.82rem;">' + esc(m.placa || '') + (row.marca_modelo_versao ? ' — ' + esc(row.marca_modelo_versao) : '') + (m.descricao ? ' • ' + esc(String(m.descricao).substring(0, 90)) : '') + '</div></div>'
            + '<div id="cf-sit-badge" style="margin-left:auto;"></div>'
            + '<button type="button" id="cf-x" title="Fechar" style="background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.1rem;"><i class="ph ph-x"></i></button>'
            + '</div>'
            + '<div style="flex:1;overflow-y:auto;padding:18px 24px;"><div style="max-width:1300px;margin:0 auto;">'
            +   '<div style="' + sec + '">'
            +     '<div style="' + secT + 'margin-bottom:10px;"><i class="ph ph-wrench" style="color:#1971c2;"></i> Serviços realizados</div>'
            +     '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:12px;">'
            +       '<div style="display:grid;grid-template-columns:minmax(180px,1fr) 2fr;gap:10px;margin-bottom:8px;">'
            +         '<div><label style="' + lbl + '">Categoria</label><select id="mned-pick-cat" style="' + inp + '">' + catOpts + '</select></div>'
            +         '<div><label style="' + lbl + '">Buscar serviço (digite o nome)</label><input type="text" id="mned-pick-busca" autocomplete="off" placeholder="Digite para filtrar a lista..." style="' + inp + '"></div>'
            +       '</div>'
            +       '<div id="mned-pick-lista" style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:8px;max-height:300px;overflow-y:auto;"></div>'
            +       '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;">'
            +         '<label style="display:flex;align-items:center;gap:6px;font-size:0.82rem;font-weight:700;color:#0284c7;cursor:pointer;"><input type="checkbox" id="mned-pick-all" style="width:16px;height:16px;accent-color:#0284c7;"> Selecionar todos (da lista mostrada)</label>'
            +         '<span id="mned-pick-cont" style="font-size:0.78rem;color:#64748b;"></span>'
            +         '<button type="button" id="mned-pick-novo" style="display:none;' + btnSec + 'color:#d97706;border-color:#fcd34d;"><i class="ph ph-plus"></i> <span></span></button>'
            +       '</div>'
            +     '</div>'
            +     '<div id="mned-serv"></div>'
            +   '</div>'
            +   '<div style="' + sec + '">'
            +     '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;"><div style="' + secT + '"><i class="ph ph-receipt" style="color:#2563eb;"></i> Peças e notas fiscais</div>'
            +       '<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;">'
            +         '<button type="button" id="mned-pecas-geral" style="' + btnSec + '"><i class="ph ph-plus"></i> Incluir peças</button>'
            +         '<button type="button" id="mned-mo-nf" style="' + btnSec + 'border-color:#fcd34d;color:#b45309;"><i class="ph ph-paperclip"></i> NF de mão de obra</button>'
            +       '</div></div>'
            +     '<div id="mned-notas"></div>'
            +     '<div style="display:none;"><button type="button" id="mned-mo-add"></button><div id="mned-mo"></div><div id="mned-hist"></div></div>'
            +   '</div>'
            +   '<div id="mned-total" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:16px;"></div>'
            + '</div></div>'
            + '<div style="padding:12px 24px;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;justify-content:flex-end;background:#fff;flex-shrink:0;">'
            +   '<span style="margin-right:auto;font-size:0.78rem;color:#64748b;">Nada é obrigatório: serviços, peças e valores são opcionais para finalizar o registro.</span>'
            +   '<button type="button" id="cf-cancel" style="padding:10px 20px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;color:#64748b;cursor:pointer;font-weight:600;">Fechar</button>'
            +   '<button type="button" id="cf-save" style="padding:10px 22px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> Salvar</button>'
            +   '<button type="button" id="cf-final" style="padding:10px 22px;border:none;border-radius:8px;background:#16a34a;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-check-circle"></i> Finalizar registro</button>'
            + '</div>';
        document.body.appendChild(modal);

        const $ = (id) => document.getElementById(id);
        $('cf-x').onclick = fecharCorr;
        $('cf-cancel').onclick = fecharCorr;
        $('cf-save').onclick = () => salvarCorr(false);
        $('cf-final').onclick = () => salvarCorr(true);
        $('mned-pick-cat').onchange = window._mnEdPickRender;
        $('mned-pick-busca').oninput = window._mnEdPickRender;
        $('mned-pick-novo').onclick = window._mnEdPickNovo;
        $('mned-pick-all').onchange = function () { window._mnEdPickToggleVarios((window._mnEd.pickVisiveis || []), this.checked); };
        $('mned-pecas-geral').onclick = () => window._mnEdAbrirPecas(null, null);
        $('mned-mo-nf').onclick = () => window._mnEdAbrirMoNf(null);

        atualizarBadgeCorr();
        window._mnEdPickRender();
        window._mnEdRenderServ();
        window._mnEdRenderNotas();
        window._mnEdRenderMo();
    }

    async function salvarCorr(finalizar) {
        const ed = window._mnEd;
        if (!ed || !ed.id) return;
        const bS = document.getElementById('cf-save'), bF = document.getElementById('cf-final');
        if (bS) bS.disabled = true;
        if (bF) bF.disabled = true;
        try {
            await window._mnEdSalvarDetalhe();
            if (finalizar) {
                await postSit('corretiva', ed.id, 'registrar');
                toast('✅ Registro finalizado!');
                fecharCorr();
                return;
            }
            await tocarCorr();
            await window._mnEdRecarregarDetalhe();
            window._mnEdRenderServ();
            window._mnEdRenderNotas();
            window._mnEdRenderMo();
            window._mnEdPickRender();
            toast('✅ Registro salvo!');
        } catch (e) {
            alert(e.message || 'Erro ao salvar');
        } finally {
            if (bS) bS.disabled = false;
            if (bF) bF.disabled = false;
        }
    }

    // Peças / notas / mão de obra incluídas ou excluídas pelos popups da logística recarregam o detalhe: aí a situação vira "Iniciada"
    if (typeof window._mnEdRecarregarDetalhe === 'function' && !window._mnEdRecarregarDetalhe._cf) {
        const orig = window._mnEdRecarregarDetalhe;
        window._mnEdRecarregarDetalhe = async function () {
            const r = await orig.apply(this, arguments);
            if (window._mnEd && window._mnEd.modoCompras) await tocarCorr();
            return r;
        };
        window._mnEdRecarregarDetalhe._cf = true;
    }

    // ───────────────────────── Revisão: mesma metodologia da logística (serviços, notas/PDFs, vínculo e valores) ─────────────────────────
    function atualizarBadgeRev() {
        const el = document.getElementById('cf-rev-sit-badge');
        if (el && window._cfRev) el.innerHTML = sitBadge(window._cfRev.sit);
    }

    async function putItensRev() {
        const c = window._cfRev;
        const itens = window._mnRevColetarItensModal();
        const r = await fetch('/api/compras-frota/revisao/' + c.revId + '/itens', { method: 'PUT', headers: hdrJson(), body: JSON.stringify({ itens: itens }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Erro ao salvar os serviços da revisão');
        return itens;
    }

    async function tocarRev(itensOpcional) {
        const c = window._cfRev;
        if (!c || c.sit === 'iniciada') return;
        const itens = itensOpcional || window._mnRevColetarItensModal();
        const reg = window._mnRevRegAtual ? window._mnRevRegAtual() : null;
        const salvos = (reg && reg.itens) || {};
        const servMap = {};
        (window._mnRevServicosModal || []).forEach((s) => { servMap[s.id] = s; });
        const temItens = Object.keys(itens).some((k) => {
            const s = servMap[k] || {};
            const ant = salvos[k] || {};
            if (s.grupo === 'conferencia' || ant.marcado_logistica) return String((itens[k] && itens[k].obs) || '').trim() !== String(ant.obs || '').trim();
            return itens[k] && (itens[k].realizado === true || itens[k].realizado === 'true');
        });
        const temLanc = !!(reg && ((reg.lancamentos || []).length || (reg.anexos || []).length));
        if (!temItens && !temLanc && c.sit !== 'registrado') return;
        try { c.sit = await postSit('revisao', c.revId, 'iniciar'); atualizarBadgeRev(); } catch (e) { /* nao bloqueia */ }
    }

    window.comprasRevFechar = function () {
        const ov = document.getElementById('mn-rev-modal-ov');
        if (ov) ov.remove();
        if (typeof window._mnRevFecharVinculo === 'function') window._mnRevFecharVinculo();
        window._mnRevModoCompras = false;
        window._cfRev = null;
        window.initComprasFrota('revisao');
    };

    window.comprasRevAbrir = async function (revId) {
        const row = (state.revisao.dados || []).find((x) => String(x.id) === String(revId));
        if (!row) return;
        if (typeof window.mnRevAbrirModalMarco !== 'function') {
            alert('O módulo de revisão ainda não foi carregado. Atualize a página (Ctrl+F5) e tente novamente.');
            return;
        }
        try {
            const r = await fetch('/api/frota/revisoes/' + row.veiculo_id + '?_=' + Date.now(), { headers: { Authorization: 'Bearer ' + tok() }, cache: 'no-store' });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'Erro ao carregar a revisão');
            window._mnRevAtual = data;
        } catch (e) { alert(e.message); return; }
        window._cfRev = { revId: Number(revId), vid: row.veiculo_id, sit: row.situacao || 'novo' };
        window._cfAbrindoRev = true;
        window.mnRevAbrirModalMarco(Number(row.marco_km), Number(row.marco_meses));
        ajustarModalRev();
    };

    // Esconde do modal da logística o que não é do Compras (execução, fotos das conferências, vídeo, observações) sem alterar a tela da logística
    function ajustarModalRev() {
        const ov = document.getElementById('mn-rev-modal-ov');
        if (!ov) return;
        const raiz = ov.firstElementChild;
        if (!raiz) return;
        const header = raiz.children[0];
        const corpo = raiz.children[1];
        const rodape = raiz.lastElementChild;
        if (header) {
            header.style.background = 'linear-gradient(135deg,#0b4f8a,#1971c2)';
            const h3 = header.querySelector('h3');
            if (h3) h3.textContent = 'Compras — ' + h3.textContent;
            const fechar = header.querySelector('button');
            if (fechar) {
                fechar.setAttribute('onclick', 'window.comprasRevFechar()');
                const badge = document.createElement('div');
                badge.id = 'cf-rev-sit-badge';
                badge.style.cssText = 'margin-left:auto;margin-right:12px;';
                header.insertBefore(badge, fechar);
            }
        }
        if (corpo) {
            Array.from(corpo.children).forEach((ch) => {
                const t = ch.textContent || '';
                if (t.indexOf('1. Registro de Execução') !== -1 || t.indexOf('5. Vídeo geral') !== -1 || t.indexOf('Observações Gerais da Revisão') !== -1) ch.style.display = 'none';
            });
        }
        const reg = typeof window._mnRevRegAtual === 'function' ? window._mnRevRegAtual() : null;
        const itensSalvos = (reg && reg.itens) || {};
        const servMap = {};
        (window._mnRevServicosModal || []).forEach((s) => { servMap[s.id] = s; });

        // fotos das conferências: nao fazem parte do Compras; e itens de conferencia / preenchidos pela logistica seguem a regra:
        // - "troca_manutencao": aparecem em Compras bloqueados (checkbox e select travados, observacao editavel)
        // - "vistoriado": nao aparecem em Compras
        ov.querySelectorAll('tr[data-rev-row]').forEach((tr) => {
            const id = tr.getAttribute('data-rev-row');
            const s = servMap[id] || {};
            const st = itensSalvos[id] || {};
            const marcado = st.realizado === true || st.realizado === 'true';
            const isConf = s.grupo === 'conferencia';
            const tipo = (s.grupo === 'opcional' && !marcado) ? 'vistoriado' : (st.tipo || s.tipoPadrao);
            const veioDaLogistica = isConf || (marcado && !!st.marcado_logistica);

            if (tr.querySelector('[id^="mn-rev-lbl-conf-"]') && tr.lastElementChild) tr.lastElementChild.remove();
            tr.querySelectorAll('span').forEach((sp) => {
                const t = (sp.textContent || '').trim();
                if (t === 'OBRIGATÓRIO' || t === 'OPCIONAL') sp.style.display = 'none';
            });
            tr.querySelectorAll('div').forEach((d) => {
                if (!d.children.length && (d.textContent || '').indexOf('(anexar foto)') !== -1) d.textContent = 'Conferência interna';
            });

            if (veioDaLogistica) {
                if (marcado && tipo === 'troca_manutencao') {
                    const cb = tr.querySelector('input[data-rev-field="realizado"]');
                    const sel = tr.querySelector('select[data-rev-field="tipo"]');
                    if (cb) {
                        cb.checked = true;
                        cb.disabled = true;
                        cb.style.cursor = 'not-allowed';
                        cb.title = 'Selecionado pela Logística (não pode ser desmarcado)';
                    }
                    if (sel) {
                        sel.value = 'troca_manutencao';
                        sel.disabled = true;
                        sel.style.background = '#f1f5f9';
                        sel.style.color = '#334155';
                        sel.style.cursor = 'not-allowed';
                        sel.title = 'Preenchido pela Logística (não pode ser alterado)';
                    }
                } else {
                    tr.setAttribute('data-cf-oculto', '1');
                    tr.style.display = 'none';
                }
            }
        });
        ov.querySelectorAll('th').forEach((th) => { if ((th.textContent || '').indexOf('Fotos obrigatórias') !== -1) th.remove(); });
        ov.querySelectorAll('span').forEach((sp) => {
            if (sp.children && sp.children.length) return;
            const t = (sp.textContent || '').trim();
            if (t.indexOf('Conferências internas OBRIGATÓRIAS') === 0 || t.indexOf('Conferências OBRIGATÓRIAS (Interno)') === 0) sp.textContent = 'Conferências internas (Manutenção / troca realizada)';
            else if (t === 'Serviços OBRIGATÓRIOS (Mecânico)') sp.textContent = 'Serviços (Mecânico)';
        });
        const cbAllConf = document.getElementById('mn-rev-cb-all-conf');
        if (cbAllConf && cbAllConf.parentElement) cbAllConf.parentElement.style.display = 'none';
        // Se todas as linhas de um bloco (ex.: Conferências internas todas como Vistoriado) ficarem ocultas, esconde o cabeçalho e a tabela vazia
        ov.querySelectorAll('table').forEach((tbl) => {
            const rows = Array.from(tbl.querySelectorAll('tr[data-rev-row]'));
            if (!rows.length) return;
            const algumVisivel = rows.some((r) => r.getAttribute('data-cf-oculto') !== '1');
            if (!algumVisivel && tbl.parentElement) {
                tbl.parentElement.style.display = 'none';
                if (tbl.parentElement.previousElementSibling) tbl.parentElement.previousElementSibling.style.display = 'none';
            }
        });
        const cont = document.getElementById('mn-rev-cont-obrig');
        if (cont) cont.style.display = 'none';
        if (rodape) {
            rodape.innerHTML =
                '<span style="margin-right:auto;font-size:0.78rem;color:#64748b;align-self:center;">Nada é obrigatório para finalizar o registro.</span>'
                + '<button type="button" onclick="window.comprasRevFechar()" style="background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:8px;padding:0.6rem 1.2rem;font-weight:700;cursor:pointer;">Fechar</button>'
                + '<button type="button" id="cf-rev-save" onclick="window.comprasRevSalvar(false)" style="background:#2563eb;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.4rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> Salvar</button>'
                + '<button type="button" id="cf-rev-final" onclick="window.comprasRevSalvar(true)" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.4rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-check-circle"></i> Finalizar registro</button>';
        }
        atualizarBadgeRev();
    }

    window.comprasRevSalvar = async function (finalizar) {
        const c = window._cfRev;
        if (!c) return;
        const bS = document.getElementById('cf-rev-save'), bF = document.getElementById('cf-rev-final');
        if (bS) bS.disabled = true;
        if (bF) bF.disabled = true;
        try {
            const itens = await putItensRev();
            if (finalizar) {
                await postSit('revisao', c.revId, 'registrar');
                toast('✅ Registro finalizado!');
                window.comprasRevFechar();
                return;
            }
            await tocarRev(itens);
            toast('✅ Registro salvo!');
        } catch (e) {
            alert(e.message || 'Erro ao salvar');
        } finally {
            if (bS) bS.disabled = false;
            if (bF) bF.disabled = false;
        }
    };

    // O modal da revisão da logística é reaproveitado: o "modo Compras" vale somente quando o Compras o abre
    if (typeof window.mnRevAbrirModalMarco === 'function' && !window.mnRevAbrirModalMarco._cf) {
        const origAbrir = window.mnRevAbrirModalMarco;
        window.mnRevAbrirModalMarco = function () {
            window._mnRevModoCompras = !!window._cfAbrindoRev;
            window._cfAbrindoRev = false;
            return origAbrir.apply(this, arguments);
        };
        window.mnRevAbrirModalMarco._cf = true;
    }
    // Antes de anexar nota/lançar valores, grava os serviços marcados (o vínculo usa os serviços marcados)
    if (typeof window._mnRevAnexarPdf === 'function' && !window._mnRevAnexarPdf._cf) {
        const origAnexar = window._mnRevAnexarPdf;
        window._mnRevAnexarPdf = async function () {
            if (window._mnRevModoCompras && window._cfRev) { try { await putItensRev(); } catch (e) { /* segue */ } }
            return origAnexar.apply(this, arguments);
        };
        window._mnRevAnexarPdf._cf = true;
    }
    // Anexar/excluir nota ou lançamento recarrega os dados da revisão: aí a situação vira "Iniciada"
    if (typeof window._mnRevRecarregarDados === 'function' && !window._mnRevRecarregarDados._cf) {
        const origRec = window._mnRevRecarregarDados;
        window._mnRevRecarregarDados = async function () {
            const r = await origRec.apply(this, arguments);
            if (window._mnRevModoCompras && window._cfRev) await tocarRev();
            return r;
        };
        window._mnRevRecarregarDados._cf = true;
    }
})();
