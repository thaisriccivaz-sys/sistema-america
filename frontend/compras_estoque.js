// frontend/compras_estoque.js
// Financeiro > Compras > Estoque (peças): réplica da tela de estoque com dados de compra
// (fornecedor, valor, garantia, PDF por produto), nota fiscal única vinculável a vários
// produtos e histórico de valores pagos / datas de compra.
// Esta tela é de consulta do estoque: entradas, baixas e edição de produtos continuam na tela Estoque.
(function () {
    'use strict';

    const S = window._ceState = {
        data: [], saldos: {}, resumo: {}, notas: [], enderecos: [],
        sel: { cat: new Set(), end: new Set() },
        sort: { col: 'nome', asc: true },
        expanded: {},
        prodModal: null
    };

    // ── Utilitários ──────────────────────────────────────────────────────────
    const token = () => window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const money = v => (parseFloat(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtData = iso => { const p = String(iso || '').slice(0, 10).split('-'); return p.length === 3 && p[0] ? p[2] + '/' + p[1] + '/' + p[0] : '—'; };
    const hojeISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const $ = id => document.getElementById(id);

    async function api(path, opts) {
        opts = opts || {};
        const headers = { 'Authorization': 'Bearer ' + token() };
        if (opts.body) headers['Content-Type'] = 'application/json';
        const r = await fetch(API_URL + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
        let json = null;
        try { json = await r.json(); } catch (_) {}
        if (!r.ok) throw new Error((json && json.error) || ('Erro ' + r.status));
        return json;
    }
    // SweetAlert sempre acima dos modais próprios
    function swal(o) {
        const userOpen = o.didOpen;
        return Swal.fire(Object.assign({}, o, {
            didOpen: function (el) {
                const c = Swal.getContainer();
                if (c) c.style.zIndex = '20000';
                if (userOpen) userOpen(el);
            }
        }));
    }
    const toast = (msg, icon) => swal({ icon: icon || 'success', title: msg, timer: 1600, showConfirmButton: false });
    const lerArquivo = file => new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
        r.readAsDataURL(file);
    });
    const abrirArquivo = path => window.open(API_URL + path + '?token=' + encodeURIComponent(token()), '_blank');

    let _zBase = 9000;
    function abrirModal(cfg) {
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.55);z-index:' + (++_zBase) + ';display:flex;align-items:center;justify-content:center;padding:16px;';
        ov.innerHTML =
            '<div style="background:#fff;border-radius:14px;width:' + (cfg.largura || '860px') + ';max-width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,.25);">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 22px;border-bottom:1px solid #e2e8f0;">' +
                    '<h3 style="margin:0;font-size:1.05rem;color:#1e293b;display:flex;align-items:center;gap:8px;">' + cfg.titulo + '</h3>' +
                    '<button type="button" class="ce-close" style="background:none;border:none;font-size:1.6rem;line-height:1;color:#64748b;cursor:pointer;">&times;</button>' +
                '</div>' +
                '<div class="ce-modal-body" style="padding:18px 22px;overflow-y:auto;">' + (cfg.corpo || '') + '</div>' +
            '</div>';
        const fechar = () => { ov.remove(); if (cfg.onClose) cfg.onClose(); };
        ov.querySelector('.ce-close').onclick = fechar;
        document.body.appendChild(ov);
        return { el: ov, body: ov.querySelector('.ce-modal-body'), fechar: fechar };
    }

    const inputCss = 'width:100%;padding:7px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.88rem;box-sizing:border-box;';
    const labelCss = 'display:block;font-size:0.76rem;font-weight:700;color:#475569;margin-bottom:3px;';
    const cardCss = 'border:1.5px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:14px;background:#fff;';
    const h4 = (icone, txt, cor) => '<div style="font-weight:800;font-size:0.9rem;color:' + (cor || '#1e3a8a') + ';margin-bottom:10px;display:flex;align-items:center;gap:6px;"><i class="ph ' + icone + '"></i> ' + txt + '</div>';

    // ── Regras de estoque (iguais às da tela Estoque) ────────────────────────
    const ordemTam = tam => {
        const t = String(tam || '').trim().toUpperCase();
        const map = { PP: 1, P: 2, M: 3, G: 4, GG: 5, XG: 6, EG: 7, EXG: 8, XGG: 9, XXG: 10, XXGG: 11, EGG: 12, EXGG: 13, G1: 14, G2: 15, G3: 16, G4: 17, UNICO: 18, 'ÚNICO': 18 };
        if (map[t] !== undefined) return map[t];
        const n = parseInt(t, 10);
        return isNaN(n) ? 900 : 100 + n;
    };
    const minRef = (s, item) => (parseInt(s.quantidade_minima) > 0) ? parseInt(s.quantidade_minima) : (parseInt(item.quantidade_minima) || 0);
    const qtdDe = s => parseInt(s.quantidade) || 0;
    const lowSaldo = (s, item) => { const m = minRef(s, item); return m > 0 && qtdDe(s) < m; };

    function saldosPermitidos(item) {
        let s = S.saldos[item.id] || [];
        if (typeof window.isTopAdmin !== 'undefined' && !window.isTopAdmin && window.activeUserPerms) {
            const any = Object.keys(window.activeUserPerms).some(k => k.startsWith('estoque-endereco:') && window.activeUserPerms[k]);
            if (any) s = s.filter(x => window.activeUserPerms['estoque-endereco:' + x.endereco_id]);
        }
        return s;
    }
    function restritoSemEndereco(item) {
        if (typeof window.isTopAdmin === 'undefined' || window.isTopAdmin || !window.activeUserPerms) return false;
        const any = Object.keys(window.activeUserPerms).some(k => k.startsWith('estoque-endereco:') && window.activeUserPerms[k]);
        const orig = S.saldos[item.id] || [];
        return any && orig.length > 0 && saldosPermitidos(item).length === 0;
    }
    function itemLow(item, saldos) {
        if (saldos.length) return saldos.some(s => lowSaldo(s, item));
        return (parseInt(item.quantidade_minima) > 0) && (parseInt(item.quantidade_atual) || 0) < parseInt(item.quantidade_minima);
    }
    const qtdTotal = (item, saldos) => saldos.length ? saldos.reduce((a, s) => a + qtdDe(s), 0) : (parseInt(item.quantidade_atual) || 0);
    const temTamanho = (item, saldos) => !!(item.tem_tamanho || saldos.some(s => s.tamanho && String(s.tamanho).trim() !== ''));

    function badgeEnd(nome, low) {
        const n = norm(nome);
        let c = { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
        if (low) c = { bg: '#fef2f2', color: '#ef4444', border: '#fca5a5' };
        else if (n.includes('terreno')) c = { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
        else if (n.includes('almoxarifado')) c = { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
        else if (n.includes('loja')) c = { bg: '#fefce8', color: '#a16207', border: '#fef08a' };
        else if (n.includes('galpao')) c = { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' };
        return '<span style="display:inline-flex;align-items:center;gap:4px;background:' + c.bg + ';color:' + c.color + ';border:1px solid ' + c.border + ';border-radius:6px;padding:3px 8px;font-size:0.7rem;font-weight:600;white-space:nowrap;">' +
            esc(nome) + (low ? ' <i class="ph ph-warning" style="font-size:0.78rem;"></i>' : '') + '</span>';
    }
    const badgeTipo = t => t === 'reposicao'
        ? '<span style="display:inline-flex;background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe;border-radius:6px;padding:2px 8px;font-size:0.72rem;font-weight:600;">🔄 Reposição</span>'
        : '<span style="display:inline-flex;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:2px 8px;font-size:0.72rem;font-weight:600;">🏢 Matriz</span>';
    const linha = html => '<div style="min-height:28px;display:flex;align-items:center;">' + html + '</div>';
    const dash = '<span style="color:#94a3b8;">—</span>';

    function minMaxHtml(s) {
        const mn = parseInt(s.quantidade_minima) || 0, mx = parseInt(s.quantidade_maxima) || 0;
        if (!mn && !mx) return '<span style="color:#94a3b8;font-size:0.78rem;">—</span>';
        const p = [];
        if (mn) p.push('<span style="color:#64748b;font-size:0.8rem;">min ' + mn + '</span>');
        if (mx) p.push('<span style="color:#64748b;font-size:0.8rem;">max ' + mx + '</span>');
        return '<span style="white-space:nowrap;">' + p.join(' <span style="color:#cbd5e1;">|</span> ') + '</span>';
    }
    const qtdHtml = (q, low) => '<span style="font-weight:700;font-size:1rem;color:' + (low ? '#ef4444' : '#10b981') + ';">' + q + '</span>';

    function garantiaHtml(ate) {
        if (!ate) return dash;
        const dias = Math.round((new Date(ate + 'T00:00:00') - new Date(hojeISO() + 'T00:00:00')) / 86400000);
        let cor = '#15803d', bg = '#f0fdf4', bd = '#bbf7d0', txt = 'Vigente';
        if (dias < 0) { cor = '#b91c1c'; bg = '#fef2f2'; bd = '#fecaca'; txt = 'Vencida'; }
        else if (dias <= 60) { cor = '#a16207'; bg = '#fefce8'; bd = '#fef08a'; txt = 'Vence em ' + dias + 'd'; }
        return '<div style="line-height:1.3;"><div style="font-size:0.8rem;color:#334155;font-weight:600;">' + fmtData(ate) + '</div>' +
            '<span style="background:' + bg + ';color:' + cor + ';border:1px solid ' + bd + ';border-radius:6px;padding:0 6px;font-size:0.68rem;font-weight:700;">' + txt + '</span></div>';
    }

    // ── Multi-select com busca (Categoria / Endereço) ────────────────────────
    function msBuild(key, label, opcoes, todasTxt) {
        const itens = opcoes.map(o =>
            '<label class="ce-ms-item" data-t="' + esc(norm(o.label)) + '" style="display:flex;align-items:center;gap:8px;padding:6px;cursor:pointer;font-size:0.85rem;color:#334155;border-radius:4px;" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'transparent\'">' +
            '<input type="checkbox" value="' + esc(o.value) + '" ' + (S.sel[key].has(String(o.value)) ? 'checked' : '') + ' onchange="ceMsChange(\'' + key + '\',this)"> <span>' + esc(o.label) + '</span></label>'
        ).join('');
        return '<div style="flex:1;min-width:200px;position:relative;" class="ce-ms" id="ce-ms-' + key + '">' +
            '<label style="' + labelCss + '">' + label + '</label>' +
            '<div class="form-control" style="width:100%;display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;background:#fff;" onclick="ceMsToggle(\'' + key + '\')">' +
                '<span id="ce-ms-' + key + '-txt" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(todasTxt) + '</span><i class="ph ph-caret-down"></i></div>' +
            '<div id="ce-ms-' + key + '-dd" style="display:none;position:absolute;top:100%;left:0;width:100%;min-width:250px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 10px 15px -3px rgba(0,0,0,.12);z-index:105;max-height:290px;overflow-y:auto;padding:.5rem;margin-top:4px;">' +
                '<div style="position:sticky;top:-0.5rem;background:#fff;padding:4px 0 6px;border-bottom:1px solid #f1f5f9;margin-bottom:4px;">' +
                    '<input type="text" placeholder="Digite para pesquisar..." autocomplete="off" oninput="ceMsFiltro(\'' + key + '\',this.value)" style="width:100%;padding:6px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:0.83rem;box-sizing:border-box;outline:none;"></div>' +
                '<label id="ce-ms-' + key + '-todas" style="display:flex;align-items:center;gap:8px;padding:6px;cursor:pointer;font-size:0.85rem;color:#334155;font-weight:600;">' +
                    '<input type="checkbox" ' + (S.sel[key].size === 0 ? 'checked' : '') + ' onchange="ceMsTodas(\'' + key + '\')"> ' + esc(todasTxt) + '</label>' +
                '<div id="ce-ms-' + key + '-itens">' + itens + '</div>' +
            '</div></div>';
    }
    window.ceMsToggle = key => {
        const dd = $('ce-ms-' + key + '-dd');
        if (!dd) return;
        const abrir = dd.style.display !== 'block';
        dd.style.display = abrir ? 'block' : 'none';
        if (abrir) { const inp = dd.querySelector('input[type=text]'); if (inp) { inp.value = ''; window.ceMsFiltro(key, ''); setTimeout(() => inp.focus(), 30); } }
    };
    window.ceMsFiltro = (key, txt) => {
        const t = norm(txt).trim();
        const todas = $('ce-ms-' + key + '-todas');
        if (todas) todas.style.display = t ? 'none' : 'flex';
        document.querySelectorAll('#ce-ms-' + key + '-itens .ce-ms-item').forEach(l => { l.style.display = (!t || l.dataset.t.includes(t)) ? 'flex' : 'none'; });
    };
    function msTexto(key, todasTxt, plural) {
        const el = $('ce-ms-' + key + '-txt');
        if (!el) return;
        const n = S.sel[key].size;
        if (n === 0) el.textContent = todasTxt;
        else if (n === 1) { const cb = document.querySelector('#ce-ms-' + key + '-itens input:checked'); el.textContent = cb ? cb.parentNode.textContent.trim() : '1 selecionado'; }
        else el.textContent = n + ' ' + plural + ' selecionados';
        const tcb = document.querySelector('#ce-ms-' + key + '-todas input');
        if (tcb) tcb.checked = n === 0;
    }
    window.ceMsChange = (key, cb) => {
        if (cb.checked) S.sel[key].add(String(cb.value)); else S.sel[key].delete(String(cb.value));
        msTexto(key, key === 'cat' ? 'Todas' : 'Todos', key === 'cat' ? 'categorias' : 'endereços');
        renderTabela();
    };
    window.ceMsTodas = key => {
        S.sel[key].clear();
        document.querySelectorAll('#ce-ms-' + key + '-itens input').forEach(c => { c.checked = false; });
        msTexto(key, key === 'cat' ? 'Todas' : 'Todos', key === 'cat' ? 'categorias' : 'endereços');
        renderTabela();
    };
    document.addEventListener('click', e => {
        ['cat', 'end'].forEach(key => {
            const box = $('ce-ms-' + key);
            const dd = $('ce-ms-' + key + '-dd');
            if (box && dd && !box.contains(e.target)) dd.style.display = 'none';
        });
    });

    // ── Carga de dados ───────────────────────────────────────────────────────
    async function carregarTudo() {
        const [produtos, saldos, resumo, notas, ends] = await Promise.all([
            api('/estoque'), api('/estoque-saldos'), api('/compras-estoque/resumo'), api('/compras-estoque-notas'), api('/estoque-enderecos').catch(() => [])
        ]);
        S.data = produtos || [];
        S.saldos = saldos || {};
        S.resumo = resumo || {};
        S.notas = notas || [];
        let listaEnd = ends || [];
        if (typeof window.isTopAdmin !== 'undefined' && !window.isTopAdmin && window.activeUserPerms) {
            const any = Object.keys(window.activeUserPerms).some(k => k.startsWith('estoque-endereco:') && window.activeUserPerms[k]);
            if (any) listaEnd = listaEnd.filter(e => window.activeUserPerms['estoque-endereco:' + e.id]);
        }
        S.enderecos = listaEnd;
    }
    async function recarregarResumoENotas() {
        const [resumo, notas] = await Promise.all([api('/compras-estoque/resumo'), api('/compras-estoque-notas')]);
        S.resumo = resumo || {};
        S.notas = notas || [];
    }

    // ── Tela principal ───────────────────────────────────────────────────────
    function montarEsqueleto() {
        const cont = $('compras-estoque-container');
        if (!cont) return;
        const cats = Array.from(new Set(S.data.map(i => String(i.categoria || 'Sem Categoria').trim()))).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
        S.sel.cat = new Set(Array.from(S.sel.cat).filter(c => cats.includes(c)));
        S.sel.end = new Set(Array.from(S.sel.end).filter(id => S.enderecos.some(e => String(e.id) === id)));
        cont.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:1.25rem;">' +
                '<div style="display:flex;align-items:center;gap:1.25rem;">' +
                    '<div style="width:70px;height:70px;border-radius:50%;border:2px dashed #1971c2;display:flex;align-items:center;justify-content:center;background:#e7f1fb;color:#1971c2;font-size:2rem;"><i class="ph ph-package"></i></div>' +
                    '<div><h1 style="margin:0;font-size:1.75rem;font-weight:700;color:#334155;">Estoque &mdash; Compras</h1>' +
                    '<p style="margin:4px 0 0;color:#64748b;font-size:0.88rem;">Fornecedor, valor, garantia, PDF, notas fiscais e histórico de compras de cada produto.</p></div>' +
                '</div>' +
                '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                    '<button class="btn" onclick="ceAbrirNotas()" style="background:#1971c2;color:#fff;border:none;display:flex;align-items:center;gap:6px;"><i class="ph ph-receipt"></i> Notas Fiscais</button>' +
                    '<button class="btn btn-secondary" onclick="initComprasEstoque()" style="display:flex;align-items:center;gap:6px;"><i class="ph ph-arrows-clockwise"></i> Atualizar</button>' +
                '</div>' +
            '</div>' +
            '<div class="card" style="padding:1.25rem;border-radius:12px;">' +
                '<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1rem;align-items:flex-end;">' +
                    '<div style="flex:1;min-width:200px;"><label style="' + labelCss + '">Buscar por nome</label><input type="text" id="ce-f-nome" class="form-control" style="width:100%;" placeholder="Buscar..." oninput="ceRender()"></div>' +
                    msBuild('end', 'Endereço', S.enderecos.map(e => ({ value: e.id, label: e.nome })), 'Todos') +
                    msBuild('cat', 'Categoria', cats.map(c => ({ value: c, label: c })), 'Todas') +
                    '<div style="flex:1;min-width:200px;"><label style="' + labelCss + '">Fornecedor</label><input type="text" id="ce-f-forn" class="form-control" style="width:100%;" placeholder="Buscar fornecedor..." oninput="ceRender()"></div>' +
                    '<div style="flex:1;min-width:200px;"><label style="' + labelCss + '">Status</label>' +
                        '<select id="ce-f-status" class="form-control" style="width:100%;" onchange="ceRender()">' +
                            '<option value="">Todos</option><option value="minimo">Estoque Mínimo</option><option value="sem_cadastro">Sem fornecedor/valor</option>' +
                            '<option value="sem_pdf">Sem PDF</option><option value="garantia_vencida">Garantia vencida</option><option value="garantia_vencendo">Garantia vencendo (60 dias)</option>' +
                        '</select></div>' +
                '</div>' +
                '<div id="ce-resumo" style="font-size:0.82rem;color:#64748b;margin-bottom:0.75rem;"></div>' +
                '<div class="table-responsive"><table class="table"><thead id="ce-thead"></thead><tbody id="ce-tbody"></tbody></table></div>' +
            '</div>';
    }

    const COLUNAS = [
        { col: 'nome', txt: 'Produto' }, { col: 'categoria', txt: 'Catg.' }, { col: 'qtd', txt: 'Qt. Atual' },
        { col: null, txt: 'Min/Máx' }, { col: null, txt: 'Endereços' }, { col: null, txt: 'Tipo' },
        { col: 'fornecedor', txt: 'Fornecedor' }, { col: 'valor', txt: 'Valor Atual' }, { col: 'garantia', txt: 'Garantia' },
        { col: 'ultima', txt: 'Últ. Compra' }, { col: null, txt: 'Ações', right: true }
    ];
    function renderThead() {
        const th = $('ce-thead');
        if (!th) return;
        th.innerHTML = '<tr style="font-size:0.78rem;">' + COLUNAS.map(c => {
            if (!c.col) return '<th style="white-space:nowrap;' + (c.right ? 'text-align:right;' : '') + '">' + c.txt + '</th>';
            const ativo = S.sort.col === c.col;
            const ic = ativo ? (S.sort.asc ? 'ph-arrow-up' : 'ph-arrow-down') : 'ph-arrows-down-up';
            return '<th onclick="ceOrdenar(\'' + c.col + '\')" style="cursor:pointer;white-space:nowrap;user-select:none;" title="Ordenar">' + c.txt +
                ' <i class="ph ' + ic + '" style="font-size:0.8em;color:' + (ativo ? '#1d4ed8' : '#94a3b8') + ';margin-left:2px;"></i></th>';
        }).join('') + '</tr>';
    }
    window.ceOrdenar = col => {
        if (S.sort.col === col) S.sort.asc = !S.sort.asc; else { S.sort.col = col; S.sort.asc = true; }
        renderTabela();
    };
    window.ceRender = () => renderTabela();
    window.ceToggleTam = id => {
        const aberto = !S.expanded[id];
        S.expanded[id] = aberto;
        document.querySelectorAll('.ce-det-' + id).forEach(r => { r.style.display = aberto ? '' : 'none'; });
        const ic = $('ce-arrow-' + id);
        if (ic) ic.style.transform = aberto ? 'rotate(90deg)' : 'rotate(0deg)';
    };

    function filtrar() {
        const nome = norm(($('ce-f-nome') || {}).value);
        const forn = norm(($('ce-f-forn') || {}).value);
        const status = ($('ce-f-status') || {}).value || '';
        const hoje = hojeISO();
        return S.data.filter(item => {
            if (restritoSemEndereco(item)) return false;
            if (nome && !norm(item.nome).includes(nome)) return false;
            const cat = String(item.categoria || 'Sem Categoria').trim();
            if (S.sel.cat.size && !S.sel.cat.has(cat)) return false;
            const saldos = saldosPermitidos(item);
            if (S.sel.end.size && !saldos.some(s => S.sel.end.has(String(s.endereco_id)))) return false;
            const r = S.resumo[item.id] || {};
            if (forn && !norm(r.fornecedor).includes(forn)) return false;
            if (status === 'minimo' && !itemLow(item, saldos)) return false;
            if (status === 'sem_cadastro' && (r.fornecedor && r.valor_atual > 0)) return false;
            if (status === 'sem_pdf' && r.tem_pdf) return false;
            if (status === 'garantia_vencida' && !(r.garantia_ate && r.garantia_ate < hoje)) return false;
            if (status === 'garantia_vencendo') {
                if (!r.garantia_ate || r.garantia_ate < hoje) return false;
                const dias = Math.round((new Date(r.garantia_ate + 'T00:00:00') - new Date(hoje + 'T00:00:00')) / 86400000);
                if (dias > 60) return false;
            }
            return true;
        });
    }

    function renderTabela() {
        const tb = $('ce-tbody');
        if (!tb) return;
        renderThead();
        const lista = filtrar();
        const dir = S.sort.asc ? 1 : -1;
        const col = S.sort.col;
        const cmp = (a, b) => String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity: 'base', numeric: true });
        lista.sort((a, b) => {
            const ca = String(a.categoria || 'Sem Categoria').trim(), cb = String(b.categoria || 'Sem Categoria').trim();
            const cc = cmp(ca, cb);
            if (cc !== 0) return col === 'categoria' ? cc * dir : cc;
            const ra = S.resumo[a.id] || {}, rb = S.resumo[b.id] || {};
            let d = 0;
            if (col === 'qtd') d = qtdTotal(a, saldosPermitidos(a)) - qtdTotal(b, saldosPermitidos(b));
            else if (col === 'fornecedor') d = cmp(ra.fornecedor, rb.fornecedor);
            else if (col === 'valor') d = (ra.valor_atual || 0) - (rb.valor_atual || 0);
            else if (col === 'garantia') d = cmp(ra.garantia_ate || '9999-99-99', rb.garantia_ate || '9999-99-99');
            else if (col === 'ultima') d = cmp(ra.ultima_compra, rb.ultima_compra);
            if (d !== 0) return d * dir;
            const n = cmp(a.nome, b.nome);
            return col === 'nome' ? n * dir : n;
        });

        const resumoEl = $('ce-resumo');
        if (resumoEl) {
            const comForn = lista.filter(i => (S.resumo[i.id] || {}).fornecedor).length;
            const comPdf = lista.filter(i => (S.resumo[i.id] || {}).tem_pdf).length;
            const venc = lista.filter(i => { const g = (S.resumo[i.id] || {}).garantia_ate; return g && g < hojeISO(); }).length;
            resumoEl.innerHTML = '<b>' + lista.length + '</b> produtos &middot; <b>' + comForn + '</b> com fornecedor &middot; <b>' + comPdf + '</b> com PDF &middot; <b style="color:' + (venc ? '#b91c1c' : 'inherit') + ';">' + venc + '</b> com garantia vencida';
        }
        if (!lista.length) { tb.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#64748b;">Nenhum item encontrado.</td></tr>'; return; }

        const contCat = {};
        lista.forEach(i => { const c = String(i.categoria || 'Sem Categoria').trim(); contCat[c] = (contCat[c] || 0) + 1; });
        let rows = '', ultima = null;
        lista.forEach(item => { rows += linhaProduto(item, contCat, () => { const u = ultima; return u; }, c => { ultima = c; }, ultima); });
        tb.innerHTML = rows;
    }

    function linhaProduto(item, contCat, _g, setUltima, ultimaCat) {
        let out = '';
        const cat = String(item.categoria || 'Sem Categoria').trim();
        if (cat !== ultimaCat) {
            setUltima(cat);
            out += '<tr style="background:#f1f5f9;border-top:2px solid #cbd5e1;border-bottom:1px solid #cbd5e1;"><td colspan="11" style="padding:8px 14px;font-weight:700;font-size:0.85rem;color:#1e293b;text-transform:uppercase;">' +
                '<div style="display:flex;align-items:center;gap:8px;"><i class="ph ph-folders" style="color:#1971c2;font-size:1.05rem;"></i><span>' + esc(cat) + '</span>' +
                '<span style="background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;padding:1px 8px;font-size:0.72rem;font-weight:700;text-transform:none;">' + contCat[cat] + (contCat[cat] === 1 ? ' produto' : ' produtos') + '</span></div></td></tr>';
        }
        let saldos = saldosPermitidos(item);
        if (S.sel.end.size) saldos = saldos.filter(s => S.sel.end.has(String(s.endereco_id)));
        const low = itemLow(item, saldos);
        const sizes = temTamanho(item, saldos);
        const r = S.resumo[item.id] || {};
        const borda = low ? '3px solid #ef4444' : '3px solid transparent';
        const bg = low ? 'background:#fff5f5;' : '';
        const fotoSrc = item.foto_url || item.foto_base64 || '';
        const foto = fotoSrc
            ? '<img src="' + esc(fotoSrc) + '" onclick="event.stopPropagation();window.ampliarFotoEstoque&&window.ampliarFotoEstoque(this.src,this.dataset.n)" data-n="' + esc(item.nome) + '" title="Clique para ampliar" style="width:40px;height:40px;min-width:40px;flex-shrink:0;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;cursor:zoom-in;">'
            : '<div style="width:40px;height:40px;min-width:40px;flex-shrink:0;border-radius:8px;background:#f1f5f9;border:1px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;"><i class="ph ph-image" style="color:#94a3b8;font-size:1.2rem;"></i></div>';
        const warn = low ? '<i class="ph ph-warning-circle" style="color:#ef4444;margin-right:4px;" title="Estoque Mínimo"></i>' : '';

        // Colunas de compra (iguais para todos os tipos de linha)
        const fornCell = r.fornecedor ? '<span style="font-size:0.84rem;color:#334155;font-weight:600;">' + esc(r.fornecedor) + '</span>' : dash;
        const valorCell = r.valor_atual > 0 ? '<span style="font-weight:700;color:#0f766e;">' + money(r.valor_atual) + '</span>' : dash;
        const ultCell = r.ultima_compra
            ? '<div style="line-height:1.3;"><div style="font-size:0.8rem;color:#334155;font-weight:600;">' + fmtData(r.ultima_compra) + '</div><span style="font-size:0.7rem;color:#64748b;">' + r.total_compras + (r.total_compras === 1 ? ' compra' : ' compras') + (r.total_notas ? ' &middot; ' + r.total_notas + ' NF' : '') + '</span></div>'
            : dash;
        const pdfBtn = r.tem_pdf ? '<button class="btn btn-sm" onclick="event.stopPropagation();ceVerPdf(' + item.id + ')" title="Abrir PDF do produto" style="background:#fee2e2;color:#b91c1c;border:none;margin-left:4px;"><i class="ph ph-file-pdf"></i></button>' : '';
        const acoes = '<button class="btn btn-sm" onclick="event.stopPropagation();ceAbrirProduto(' + item.id + ')" title="Fornecedor, valor, garantia, PDF, notas e histórico" style="background:#1971c2;color:#fff;border:none;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-shopping-cart"></i> Compras</button>' + pdfBtn;
        const celCompra = '<td style="vertical-align:middle;">' + fornCell + '</td><td style="vertical-align:middle;">' + valorCell + '</td><td style="vertical-align:middle;">' + garantiaHtml(r.garantia_ate) + '</td><td style="vertical-align:middle;">' + ultCell + '</td><td style="text-align:right;white-space:nowrap;vertical-align:middle;">' + acoes + '</td>';

        if (sizes) {
            const aberto = !!S.expanded[item.id];
            const mapTam = {};
            try { (JSON.parse(item.tamanhos_lista || '[]') || []).forEach(t => { const k = String(t || '').trim().toUpperCase(); if (k) mapTam[k] = []; }); } catch (_) {}
            saldos.forEach(s => { const k = String(s.tamanho || 'ÚNICO').trim().toUpperCase(); (mapTam[k] = mapTam[k] || []).push(s); });
            const tams = Object.keys(mapTam).sort((a, b) => ordemTam(a) - ordemTam(b));
            const ends = {}, tipos = new Set();
            saldos.forEach(s => { ends[s.nome] = (ends[s.nome] || false) || lowSaldo(s, item); tipos.add(s.tipo_estoque || 'matriz'); });
            const endHtml = Object.keys(ends).length ? '<div style="display:flex;flex-wrap:wrap;gap:4px;">' + Object.keys(ends).map(n => badgeEnd(n, ends[n])).join('') + '</div>' : '<span style="color:#94a3b8;font-size:0.78rem;font-style:italic;">Sem endereço</span>';
            const tipoHtml = tipos.size ? '<div style="display:flex;flex-wrap:wrap;gap:4px;">' + Array.from(tipos).map(badgeTipo).join('') + '</div>' : dash;
            out += '<tr onclick="ceToggleTam(' + item.id + ')" style="cursor:pointer;border-left:' + borda + ';' + bg + '">' +
                '<td style="vertical-align:middle;font-weight:600;"><div style="display:flex;align-items:center;gap:10px;">' +
                    '<span title="Ver tamanhos, endereços e quantidades" style="width:26px;height:26px;border-radius:6px;background:#e0e7ff;color:#1d4ed8;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;"><i id="ce-arrow-' + item.id + '" class="ph ph-caret-right" style="font-size:0.95rem;transition:transform .2s;' + (aberto ? 'transform:rotate(90deg);' : '') + '"></i></span>' +
                    foto + '<div style="display:flex;align-items:center;gap:6px;"><span>' + warn + esc(item.nome) + '</span><span style="background:#e2e8f0;color:#475569;border-radius:999px;padding:1px 8px;font-size:0.7rem;font-weight:700;">' + tams.length + (tams.length === 1 ? ' tamanho' : ' tamanhos') + '</span></div></div></td>' +
                '<td style="vertical-align:middle;">' + esc(cat) + '</td>' +
                '<td style="vertical-align:middle;">' + qtdHtml(qtdTotal(item, saldos), low) + '</td>' +
                '<td style="vertical-align:middle;white-space:nowrap;"><span style="color:#2563eb;font-size:0.78rem;font-weight:600;">Ver por tamanho ▾</span></td>' +
                '<td style="vertical-align:middle;">' + endHtml + '</td><td style="vertical-align:middle;white-space:nowrap;">' + tipoHtml + '</td>' + celCompra + '</tr>';
            tams.forEach(tam => {
                const sl = mapTam[tam];
                const tl = sl.some(s => lowSaldo(s, item));
                const stack = fn => sl.length ? sl.map(s => linha(fn(s))).join('') : linha(dash);
                out += '<tr class="ce-det-' + item.id + '" style="display:' + (aberto ? '' : 'none') + ';background:' + (tl ? '#fff1f2' : '#f8fafc') + ';border-left:3px solid ' + (tl ? '#ef4444' : '#3b82f6') + ';">' +
                    '<td style="padding-left:56px;vertical-align:middle;"><span style="color:#94a3b8;">↳</span> <span style="background:' + (tl ? '#fef2f2' : '#dbeafe') + ';color:' + (tl ? '#dc2626' : '#1e40af') + ';border:1px solid ' + (tl ? '#fecaca' : '#93c5fd') + ';border-radius:6px;padding:2px 10px;font-size:0.8rem;font-weight:800;">Tamanho ' + esc(tam) + '</span></td><td></td>' +
                    '<td>' + stack(s => qtdHtml(qtdDe(s), lowSaldo(s, item))) + '</td>' +
                    '<td>' + stack(minMaxHtml) + '</td>' +
                    '<td>' + stack(s => badgeEnd(s.nome, lowSaldo(s, item))) + '</td>' +
                    '<td>' + stack(s => badgeTipo(s.tipo_estoque || 'matriz')) + '</td><td colspan="5"></td></tr>';
            });
            return out;
        }

        const sl = saldos;
        const stack = fn => sl.length ? sl.map(s => linha(fn(s))).join('') : linha(dash);
        out += '<tr style="border-left:' + borda + ';' + bg + '">' +
            '<td style="vertical-align:middle;font-weight:500;"><div style="display:flex;align-items:center;gap:10px;"><span style="width:26px;height:26px;display:inline-flex;flex-shrink:0;"></span>' + foto + '<div>' + warn + esc(item.nome) + '</div></div></td>' +
            '<td style="vertical-align:middle;">' + esc(cat) + '</td>' +
            '<td>' + (sl.length ? stack(s => qtdHtml(qtdDe(s), lowSaldo(s, item))) : linha(qtdHtml(parseInt(item.quantidade_atual) || 0, low))) + '</td>' +
            '<td>' + stack(minMaxHtml) + '</td>' +
            '<td>' + (sl.length ? stack(s => badgeEnd(s.nome, lowSaldo(s, item))) : linha('<span style="color:#94a3b8;font-size:0.78rem;font-style:italic;">Sem endereço</span>')) + '</td>' +
            '<td>' + stack(s => badgeTipo(s.tipo_estoque || 'matriz')) + '</td>' + celCompra + '</tr>';
        return out;
    }

    // ── Modal do produto ─────────────────────────────────────────────────────
    window.ceAbrirProduto = async function (id) {
        const item = S.data.find(i => i.id === id);
        const m = abrirModal({
            titulo: '<i class="ph ph-shopping-cart" style="color:#1971c2;"></i> ' + esc(item ? item.nome : 'Produto'),
            largura: '980px',
            corpo: '<div style="text-align:center;padding:30px;color:#64748b;">Carregando...</div>',
            onClose: () => { S.prodModal = null; }
        });
        S.prodModal = { id: id, modal: m, dados: null };
        await recarregarProduto();
    };
    async function recarregarProduto() {
        const pm = S.prodModal;
        if (!pm) return;
        try {
            pm.dados = await api('/compras-estoque/' + pm.id);
            renderProduto();
        } catch (e) {
            pm.modal.body.innerHTML = '<div style="color:#b91c1c;padding:20px;">' + esc(e.message) + '</div>';
        }
    }
    function variacao(atual, anterior) {
        if (!anterior || anterior <= 0) return '';
        const pct = ((atual - anterior) / anterior) * 100;
        if (Math.abs(pct) < 0.05) return '<span style="color:#64748b;font-size:0.72rem;">= </span>';
        return '<span style="color:' + (pct > 0 ? '#b91c1c' : '#15803d') + ';font-size:0.72rem;font-weight:700;">' + (pct > 0 ? '▲ +' : '▼ ') + pct.toFixed(1).replace('.', ',') + '%</span>';
    }
    function renderProduto() {
        const pm = S.prodModal;
        if (!pm || !pm.dados) return;
        const d = pm.dados, info = d.info, hist = d.historico;
        const valores = hist.map(h => h.valor_unitario || 0).filter(v => v > 0);
        const total = hist.reduce((a, h) => a + (h.quantidade || 0) * (h.valor_unitario || 0), 0);
        const media = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
        const card = (t, v, cor) => '<div style="flex:1;min-width:130px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 12px;"><div style="font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;">' + t + '</div><div style="font-size:1rem;font-weight:800;color:' + (cor || '#1e293b') + ';">' + v + '</div></div>';
        const optNotas = '<option value="">— Sem nota fiscal —</option>' + S.notas.map(n => '<option value="' + n.id + '">NF ' + esc(n.numero) + (n.fornecedor ? ' — ' + esc(n.fornecedor) : '') + (n.data_emissao ? ' — ' + fmtData(n.data_emissao) : '') + '</option>').join('');

        const linhasHist = hist.map((h, i) => {
            const anterior = hist[i + 1] ? hist[i + 1].valor_unitario : 0;
            const nf = h.nota_fiscal_id
                ? (h.nota_tem_arquivo ? '<a href="#" onclick="ceVerNota(' + h.nota_fiscal_id + ');return false;" style="color:#1971c2;font-weight:700;text-decoration:none;" title="Abrir arquivo da nota"><i class="ph ph-receipt"></i> NF ' + esc(h.nota_numero) + '</a>' : '<span style="font-weight:700;">NF ' + esc(h.nota_numero) + '</span>')
                : '<span style="color:#94a3b8;">—</span>';
            return '<tr><td style="white-space:nowrap;">' + fmtData(h.data_compra) + '</td><td>' + nf + '</td><td>' + (esc(h.fornecedor) || dash) + '</td>' +
                '<td style="text-align:center;">' + h.quantidade + '</td><td style="white-space:nowrap;"><b>' + money(h.valor_unitario) + '</b> ' + variacao(h.valor_unitario, anterior) + '</td>' +
                '<td style="white-space:nowrap;">' + money(h.quantidade * h.valor_unitario) + '</td><td style="white-space:nowrap;">' + (h.garantia_ate ? fmtData(h.garantia_ate) + ' <span style="color:#94a3b8;font-size:0.72rem;">(' + h.garantia_meses + 'm)</span>' : dash) + '</td>' +
                '<td style="font-size:0.75rem;color:#64748b;">' + esc(h.criado_por) + (h.observacao ? '<div title="' + esc(h.observacao) + '" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(h.observacao) + '</div>' : '') + '</td>' +
                '<td style="text-align:right;"><button class="btn btn-sm" onclick="ceExcluirCompra(' + h.id + ')" title="Excluir registro" style="background:#fee2e2;color:#ef4444;border:none;"><i class="ph ph-trash"></i></button></td></tr>';
        }).join('');

        pm.modal.body.innerHTML =
            '<div style="' + cardCss + '">' + h4('ph-identification-card', 'Dados de compra do produto') +
                '<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:10px;margin-bottom:10px;">' +
                    '<div><label style="' + labelCss + '">Fornecedor</label><input id="ce-p-forn" style="' + inputCss + '" value="' + esc(info.fornecedor) + '" placeholder="Nome do fornecedor"></div>' +
                    '<div><label style="' + labelCss + '">Valor atual (R$)</label><input id="ce-p-valor" type="number" min="0" step="0.01" style="' + inputCss + '" value="' + (info.valor_atual || '') + '" placeholder="0,00"></div>' +
                    '<div><label style="' + labelCss + '">Garantia (meses)</label><input id="ce-p-gm" type="number" min="0" step="1" style="' + inputCss + '" value="' + (info.garantia_meses || '') + '" placeholder="0"></div>' +
                    '<div><label style="' + labelCss + '">Garantia até</label><input id="ce-p-ga" type="date" style="' + inputCss + '" value="' + esc(info.garantia_ate) + '"></div>' +
                '</div>' +
                '<div style="margin-bottom:10px;"><label style="' + labelCss + '">Observações</label><textarea id="ce-p-obs" rows="2" style="' + inputCss + 'resize:vertical;">' + esc(info.observacoes) + '</textarea></div>' +
                '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;"><span style="font-size:0.74rem;color:#94a3b8;">Ao registrar uma compra, valor, fornecedor e garantia são atualizados com a compra mais recente.</span>' +
                '<button class="btn" onclick="ceSalvarInfo()" style="background:#16a34a;color:#fff;border:none;display:flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> Salvar dados</button></div></div>' +

            '<div style="' + cardCss + '">' + h4('ph-file-pdf', 'PDF do produto', '#b91c1c') +
                '<input type="file" id="ce-p-pdf" accept="application/pdf,.pdf" style="display:none;" onchange="ceEnviarPdf(this)">' +
                (info.tem_pdf
                    ? '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;"><span style="font-weight:600;color:#334155;"><i class="ph ph-file-pdf" style="color:#b91c1c;"></i> ' + esc(info.pdf_nome || 'produto.pdf') + '</span>' +
                      '<div style="display:flex;gap:6px;"><button class="btn btn-sm btn-secondary" onclick="ceVerPdf(' + pm.id + ')"><i class="ph ph-eye"></i> Abrir</button>' +
                      '<button class="btn btn-sm btn-secondary" onclick="document.getElementById(\'ce-p-pdf\').click()"><i class="ph ph-arrows-clockwise"></i> Substituir</button>' +
                      '<button class="btn btn-sm" onclick="ceRemoverPdf()" style="background:#fee2e2;color:#ef4444;border:none;"><i class="ph ph-trash"></i> Remover</button></div></div>'
                    : '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;"><span style="color:#94a3b8;">Nenhum PDF anexado a este produto.</span>' +
                      '<button class="btn btn-sm" onclick="document.getElementById(\'ce-p-pdf\').click()" style="background:#b91c1c;color:#fff;border:none;"><i class="ph ph-upload-simple"></i> Anexar PDF</button></div>') +
            '</div>' +

            '<div style="' + cardCss + '">' + h4('ph-receipt', 'Registrar compra / vincular nota fiscal') +
                '<div style="display:grid;grid-template-columns:1fr 0.6fr 1fr 1.4fr 0.8fr;gap:10px;margin-bottom:10px;">' +
                    '<div><label style="' + labelCss + '">Data da compra *</label><input id="ce-c-data" type="date" style="' + inputCss + '" value="' + hojeISO() + '"></div>' +
                    '<div><label style="' + labelCss + '">Qtd.</label><input id="ce-c-qtd" type="number" min="1" step="1" style="' + inputCss + '" value="1"></div>' +
                    '<div><label style="' + labelCss + '">Valor unit. (R$) *</label><input id="ce-c-valor" type="number" min="0" step="0.01" style="' + inputCss + '" placeholder="0,00"></div>' +
                    '<div><label style="' + labelCss + '">Fornecedor</label><input id="ce-c-forn" style="' + inputCss + '" value="' + esc(info.fornecedor) + '"></div>' +
                    '<div><label style="' + labelCss + '">Garantia (meses)</label><input id="ce-c-gm" type="number" min="0" step="1" style="' + inputCss + '" value="' + (info.garantia_meses || '') + '"></div>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:2fr 1.4fr auto;gap:10px;align-items:end;">' +
                    '<div><label style="' + labelCss + '">Nota fiscal (já cadastrada)</label><select id="ce-c-nf" style="' + inputCss + '" onchange="ceNotaSelecionada(this.value)">' + optNotas + '</select></div>' +
                    '<div><label style="' + labelCss + '">Observação</label><input id="ce-c-obs" style="' + inputCss + '" placeholder="Opcional"></div>' +
                    '<button class="btn" onclick="ceRegistrarCompra()" style="background:#1971c2;color:#fff;border:none;display:flex;align-items:center;gap:6px;"><i class="ph ph-plus-circle"></i> Registrar compra</button>' +
                '</div>' +
                '<div style="margin-top:8px;font-size:0.76rem;"><a href="#" onclick="ceAbrirNotas();return false;" style="color:#1971c2;font-weight:700;text-decoration:none;"><i class="ph ph-receipt"></i> Cadastrar nova nota fiscal ou vincular a vários produtos</a></div>' +
            '</div>' +

            '<div style="' + cardCss + 'margin-bottom:0;">' + h4('ph-clock-counter-clockwise', 'Histórico de valores pagos e datas de compra') +
                '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' +
                    card('Nº de compras', hist.length) + card('Último valor', valores.length ? money(hist.find(h => h.valor_unitario > 0).valor_unitario) : '—', '#0f766e') +
                    card('Menor valor', valores.length ? money(Math.min.apply(null, valores)) : '—', '#15803d') + card('Maior valor', valores.length ? money(Math.max.apply(null, valores)) : '—', '#b91c1c') +
                    card('Valor médio', valores.length ? money(media) : '—') + card('Total gasto', hist.length ? money(total) : '—', '#1e3a8a') +
                '</div>' +
                (hist.length
                    ? '<div class="table-responsive"><table class="table" style="font-size:0.82rem;"><thead><tr style="font-size:0.74rem;"><th>Data</th><th>Nota fiscal</th><th>Fornecedor</th><th style="text-align:center;">Qtd.</th><th>Valor unit.</th><th>Total</th><th>Garantia até</th><th>Registro</th><th></th></tr></thead><tbody>' + linhasHist + '</tbody></table></div>'
                    : '<div style="text-align:center;padding:16px;color:#94a3b8;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:10px;">Nenhuma compra registrada para este produto.</div>') +
            '</div>';
    }

    window.ceNotaSelecionada = function (nid) {
        const n = S.notas.find(x => String(x.id) === String(nid));
        if (!n) return;
        if (n.data_emissao && $('ce-c-data')) $('ce-c-data').value = String(n.data_emissao).slice(0, 10);
        if (n.fornecedor && $('ce-c-forn') && !$('ce-c-forn').value.trim()) $('ce-c-forn').value = n.fornecedor;
    };
    window.ceVerPdf = id => abrirArquivo('/compras-estoque/' + id + '/pdf');
    window.ceVerNota = nid => abrirArquivo('/compras-estoque-notas/' + nid + '/arquivo');

    window.ceSalvarInfo = async function () {
        const pm = S.prodModal; if (!pm) return;
        try {
            await api('/compras-estoque/' + pm.id + '/info', {
                method: 'PUT',
                body: { fornecedor: $('ce-p-forn').value, valor_atual: $('ce-p-valor').value, garantia_meses: $('ce-p-gm').value, garantia_ate: $('ce-p-ga').value, observacoes: $('ce-p-obs').value }
            });
            await recarregarResumoENotas();
            renderTabela();
            await recarregarProduto();
            toast('Dados salvos!');
        } catch (e) { swal({ icon: 'error', title: 'Erro', text: e.message }); }
    };
    window.ceEnviarPdf = async function (input) {
        const pm = S.prodModal; const file = input.files && input.files[0];
        if (!pm || !file) return;
        if (!/\.pdf$/i.test(file.name)) { input.value = ''; return swal({ icon: 'warning', title: 'Selecione um arquivo PDF.' }); }
        if (file.size > 15 * 1024 * 1024) { input.value = ''; return swal({ icon: 'warning', title: 'O PDF deve ter no máximo 15 MB.' }); }
        try {
            swal({ title: 'Enviando PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const b64 = await lerArquivo(file);
            await api('/compras-estoque/' + pm.id + '/pdf', { method: 'POST', body: { arquivo_base64: b64, nome_arquivo: file.name } });
            await recarregarResumoENotas();
            renderTabela();
            await recarregarProduto();
            toast('PDF anexado!');
        } catch (e) { swal({ icon: 'error', title: 'Erro ao anexar PDF', text: e.message }); }
        finally { input.value = ''; }
    };
    window.ceRemoverPdf = async function () {
        const pm = S.prodModal; if (!pm) return;
        const r = await swal({ icon: 'warning', title: 'Remover PDF?', text: 'O arquivo será excluído do produto.', showCancelButton: true, confirmButtonText: 'Remover', cancelButtonText: 'Cancelar', confirmButtonColor: '#ef4444' });
        if (!r.isConfirmed) return;
        try {
            await api('/compras-estoque/' + pm.id + '/pdf', { method: 'DELETE' });
            await recarregarResumoENotas(); renderTabela(); await recarregarProduto();
            toast('PDF removido!');
        } catch (e) { swal({ icon: 'error', title: 'Erro', text: e.message }); }
    };
    window.ceRegistrarCompra = async function () {
        const pm = S.prodModal; if (!pm) return;
        const valor = parseFloat($('ce-c-valor').value);
        if (!(valor > 0)) return swal({ icon: 'warning', title: 'Informe o valor pago', text: 'O valor unitário deve ser maior que zero.' });
        if (!$('ce-c-data').value) return swal({ icon: 'warning', title: 'Informe a data da compra' });
        try {
            await api('/compras-estoque/' + pm.id + '/historico', {
                method: 'POST',
                body: { data_compra: $('ce-c-data').value, quantidade: $('ce-c-qtd').value, valor_unitario: valor, fornecedor: $('ce-c-forn').value, garantia_meses: $('ce-c-gm').value, nota_fiscal_id: $('ce-c-nf').value || null, observacao: $('ce-c-obs').value }
            });
            await recarregarResumoENotas(); renderTabela(); await recarregarProduto();
            toast('Compra registrada!');
        } catch (e) { swal({ icon: 'error', title: 'Erro', text: e.message }); }
    };
    window.ceExcluirCompra = async function (hid) {
        const r = await swal({ icon: 'warning', title: 'Excluir este registro de compra?', showCancelButton: true, confirmButtonText: 'Excluir', cancelButtonText: 'Cancelar', confirmButtonColor: '#ef4444' });
        if (!r.isConfirmed) return;
        try {
            await api('/compras-estoque/historico/' + hid, { method: 'DELETE' });
            await recarregarResumoENotas(); renderTabela(); await recarregarProduto();
            toast('Registro excluído!');
        } catch (e) { swal({ icon: 'error', title: 'Erro', text: e.message }); }
    };

    // ── Notas fiscais ────────────────────────────────────────────────────────
    let notasModal = null;
    window.ceAbrirNotas = async function () {
        if (notasModal) { notasModal.fechar(); notasModal = null; }
        notasModal = abrirModal({ titulo: '<i class="ph ph-receipt" style="color:#1971c2;"></i> Notas Fiscais de Compra', largura: '980px', corpo: '<div style="text-align:center;padding:30px;color:#64748b;">Carregando...</div>', onClose: () => { notasModal = null; } });
        try { await recarregarResumoENotas(); renderNotas(); } catch (e) { notasModal.body.innerHTML = '<div style="color:#b91c1c;">' + esc(e.message) + '</div>'; }
    };
    function renderNotas() {
        if (!notasModal) return;
        const linhas = S.notas.map(n =>
            '<tr><td style="font-weight:700;">NF ' + esc(n.numero) + '</td><td>' + (esc(n.fornecedor) || dash) + '</td><td>' + fmtData(n.data_emissao) + '</td>' +
            '<td>' + (n.valor_total > 0 ? money(n.valor_total) : dash) + '</td>' +
            '<td style="text-align:center;"><span style="background:#dbeafe;color:#1d4ed8;border-radius:999px;padding:1px 10px;font-weight:700;font-size:0.78rem;">' + n.total_produtos + '</span></td>' +
            '<td style="text-align:right;white-space:nowrap;">' +
                (n.tem_arquivo ? '<button class="btn btn-sm btn-secondary" onclick="ceVerNota(' + n.id + ')" title="Abrir arquivo"><i class="ph ph-eye"></i></button> ' : '') +
                '<button class="btn btn-sm" onclick="ceAbrirVincular(' + n.id + ')" style="background:#1971c2;color:#fff;border:none;"><i class="ph ph-link"></i> Vincular produtos</button> ' +
                '<button class="btn btn-sm" onclick="ceExcluirNota(' + n.id + ')" title="Excluir nota" style="background:#fee2e2;color:#ef4444;border:none;"><i class="ph ph-trash"></i></button></td></tr>'
        ).join('');
        notasModal.body.innerHTML =
            '<div style="' + cardCss + '">' + h4('ph-plus-circle', 'Cadastrar nota fiscal (arquivo único)') +
                '<div style="display:grid;grid-template-columns:1fr 1.6fr 1fr 1fr;gap:10px;margin-bottom:10px;">' +
                    '<div><label style="' + labelCss + '">Nº da nota *</label><input id="ce-n-num" style="' + inputCss + '"></div>' +
                    '<div><label style="' + labelCss + '">Fornecedor</label><input id="ce-n-forn" style="' + inputCss + '"></div>' +
                    '<div><label style="' + labelCss + '">Data de emissão</label><input id="ce-n-data" type="date" style="' + inputCss + '" value="' + hojeISO() + '"></div>' +
                    '<div><label style="' + labelCss + '">Valor total (R$)</label><input id="ce-n-valor" type="number" min="0" step="0.01" style="' + inputCss + '"></div>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:2fr 1.4fr auto;gap:10px;align-items:end;">' +
                    '<div><label style="' + labelCss + '">Arquivo da nota (PDF, XML, JPG ou PNG) *</label><input id="ce-n-arq" type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" style="' + inputCss + 'background:#fff;"></div>' +
                    '<div><label style="' + labelCss + '">Observação</label><input id="ce-n-obs" style="' + inputCss + '"></div>' +
                    '<button class="btn" onclick="ceSalvarNota()" style="background:#16a34a;color:#fff;border:none;display:flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> Salvar nota</button>' +
                '</div></div>' +
            '<div style="' + cardCss + 'margin-bottom:0;">' + h4('ph-list-bullets', 'Notas cadastradas (' + S.notas.length + ')') +
                (S.notas.length
                    ? '<div class="table-responsive"><table class="table" style="font-size:0.84rem;"><thead><tr style="font-size:0.76rem;"><th>Nota</th><th>Fornecedor</th><th>Emissão</th><th>Valor total</th><th style="text-align:center;">Produtos</th><th></th></tr></thead><tbody>' + linhas + '</tbody></table></div>'
                    : '<div style="text-align:center;padding:16px;color:#94a3b8;">Nenhuma nota fiscal cadastrada.</div>') + '</div>';
    }
    window.ceSalvarNota = async function () {
        const num = $('ce-n-num').value.trim();
        const file = $('ce-n-arq').files && $('ce-n-arq').files[0];
        if (!num) return swal({ icon: 'warning', title: 'Informe o número da nota fiscal' });
        if (!file) return swal({ icon: 'warning', title: 'Anexe o arquivo da nota fiscal' });
        if (file.size > 15 * 1024 * 1024) return swal({ icon: 'warning', title: 'O arquivo deve ter no máximo 15 MB.' });
        try {
            swal({ title: 'Salvando nota fiscal...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const b64 = await lerArquivo(file);
            const r = await api('/compras-estoque-notas', { method: 'POST', body: { numero: num, fornecedor: $('ce-n-forn').value, data_emissao: $('ce-n-data').value, valor_total: $('ce-n-valor').value, observacoes: $('ce-n-obs').value, arquivo_base64: b64, nome_arquivo: file.name } });
            await recarregarResumoENotas();
            renderNotas();
            const q = await swal({ icon: 'success', title: 'Nota fiscal salva!', text: 'Deseja vincular produtos a esta nota agora?', showCancelButton: true, confirmButtonText: 'Vincular produtos', cancelButtonText: 'Depois' });
            if (q.isConfirmed) window.ceAbrirVincular(r.id);
        } catch (e) { swal({ icon: 'error', title: 'Erro ao salvar nota', text: e.message }); }
    };
    window.ceExcluirNota = async function (nid) {
        const r = await swal({ icon: 'warning', title: 'Excluir nota fiscal?', text: 'O arquivo será apagado. O histórico de compras dos produtos é mantido, sem o vínculo com a nota.', showCancelButton: true, confirmButtonText: 'Excluir', cancelButtonText: 'Cancelar', confirmButtonColor: '#ef4444' });
        if (!r.isConfirmed) return;
        try {
            await api('/compras-estoque-notas/' + nid, { method: 'DELETE' });
            await recarregarResumoENotas(); renderNotas(); renderTabela();
            if (S.prodModal) await recarregarProduto();
            toast('Nota excluída!');
        } catch (e) { swal({ icon: 'error', title: 'Erro', text: e.message }); }
    };

    // ── Vincular produtos a uma nota fiscal ──────────────────────────────────
    window.ceAbrirVincular = async function (nid) {
        let det;
        try { det = await api('/compras-estoque-notas/' + nid); } catch (e) { return swal({ icon: 'error', title: 'Erro', text: e.message }); }
        const nota = det.nota;
        const vinc = {};
        det.itens.forEach(i => { vinc[i.estoque_id] = i; });
        const dataPadrao = (det.itens[0] && det.itens[0].data_compra) || String(nota.data_emissao || '').slice(0, 10) || hojeISO();
        const ordenados = S.data.slice().sort((a, b) => {
            const c = String(a.categoria || '').localeCompare(String(b.categoria || ''), 'pt-BR', { sensitivity: 'base' });
            return c !== 0 ? c : String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base', numeric: true });
        });
        let catAtual = null;
        const linhas = ordenados.map(p => {
            const v = vinc[p.id], r = S.resumo[p.id] || {};
            const cat = String(p.categoria || 'Sem Categoria').trim();
            let cab = '';
            if (cat !== catAtual) { catAtual = cat; cab = '<tr class="ce-vc-cat" data-cat="' + esc(norm(cat)) + '"><td colspan="5" style="background:#f1f5f9;font-weight:800;font-size:0.76rem;color:#334155;text-transform:uppercase;padding:6px 10px;">' + esc(cat) + '</td></tr>'; }
            const on = !!v;
            const val = v ? v.valor_unitario : (r.valor_atual || '');
            return cab + '<tr class="ce-vc-row" data-id="' + p.id + '" data-t="' + esc(norm(p.nome + ' ' + cat)) + '" data-cat="' + esc(norm(cat)) + '">' +
                '<td style="width:34px;text-align:center;"><input type="checkbox" class="ce-vc-cb" ' + (on ? 'checked' : '') + ' onchange="ceVcToggle(this)"></td>' +
                '<td style="font-size:0.85rem;font-weight:600;color:#334155;">' + esc(p.nome) + '</td>' +
                '<td style="width:90px;"><input type="number" class="ce-vc-q" min="1" step="1" value="' + (v ? v.quantidade : 1) + '" ' + (on ? '' : 'disabled') + ' oninput="ceVcTotal()" style="' + inputCss + 'padding:4px 6px;"></td>' +
                '<td style="width:130px;"><input type="number" class="ce-vc-v" min="0" step="0.01" value="' + val + '" ' + (on ? '' : 'disabled') + ' oninput="ceVcTotal()" placeholder="0,00" style="' + inputCss + 'padding:4px 6px;"></td>' +
                '<td style="width:90px;"><input type="number" class="ce-vc-g" min="0" step="1" value="' + (v ? v.garantia_meses : (r.garantia_meses || '')) + '" ' + (on ? '' : 'disabled') + ' style="' + inputCss + 'padding:4px 6px;"></td></tr>';
        }).join('');
        const m = abrirModal({
            titulo: '<i class="ph ph-link" style="color:#1971c2;"></i> Vincular produtos &mdash; NF ' + esc(nota.numero),
            largura: '900px',
            corpo:
                '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px;">' +
                    '<div><label style="' + labelCss + '">Data da compra (todos)</label><input id="ce-vc-data" type="date" style="' + inputCss + 'width:170px;" value="' + esc(dataPadrao) + '"></div>' +
                    '<div style="flex:1;min-width:220px;"><label style="' + labelCss + '">Pesquisar produto</label><input type="text" id="ce-vc-busca" placeholder="Digite o nome ou a categoria..." oninput="ceVcBusca(this.value)" style="' + inputCss + '"></div>' +
                    '<div style="font-size:0.76rem;color:#64748b;max-width:260px;">Marque os produtos desta nota e informe quantidade, valor unitário e garantia. Itens desmarcados são desvinculados.</div>' +
                '</div>' +
                '<div style="max-height:46vh;overflow-y:auto;border:1.5px solid #e2e8f0;border-radius:10px;"><table class="table" style="margin:0;"><thead style="position:sticky;top:0;background:#fff;z-index:2;"><tr style="font-size:0.74rem;"><th></th><th>Produto</th><th>Qtd.</th><th>Valor unit. (R$)</th><th>Garantia (m)</th></tr></thead><tbody id="ce-vc-body">' + linhas + '</tbody></table></div>' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;flex-wrap:wrap;gap:8px;"><div id="ce-vc-total" style="font-size:0.88rem;color:#334155;"></div>' +
                '<button class="btn" id="ce-vc-salvar" style="background:#16a34a;color:#fff;border:none;display:flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> Salvar vínculos</button></div>'
        });
        window.ceVcTotal();
        $('ce-vc-salvar').onclick = async () => {
            const itens = [];
            let erro = '';
            m.el.querySelectorAll('.ce-vc-row').forEach(tr => {
                if (!tr.querySelector('.ce-vc-cb').checked) return;
                const valor = parseFloat(tr.querySelector('.ce-vc-v').value);
                if (!(valor > 0) && !erro) erro = 'Informe o valor unitário de "' + tr.children[1].textContent + '".';
                itens.push({ estoque_id: parseInt(tr.dataset.id, 10), quantidade: tr.querySelector('.ce-vc-q').value, valor_unitario: valor, garantia_meses: tr.querySelector('.ce-vc-g').value });
            });
            if (erro) return swal({ icon: 'warning', title: 'Dados incompletos', text: erro });
            try {
                await api('/compras-estoque-notas/' + nid + '/vincular', { method: 'POST', body: { itens: itens, data_compra: $('ce-vc-data').value } });
                m.fechar();
                await recarregarResumoENotas();
                renderTabela();
                if (notasModal) renderNotas();
                if (S.prodModal) await recarregarProduto();
                toast('Vínculos salvos (' + itens.length + ' produto' + (itens.length === 1 ? '' : 's') + ')!');
            } catch (e) { swal({ icon: 'error', title: 'Erro ao vincular', text: e.message }); }
        };
    };
    window.ceVcToggle = function (cb) {
        const tr = cb.closest('tr');
        tr.querySelectorAll('input[type=number]').forEach(i => { i.disabled = !cb.checked; });
        window.ceVcTotal();
    };
    window.ceVcTotal = function () {
        let n = 0, total = 0;
        document.querySelectorAll('#ce-vc-body .ce-vc-row').forEach(tr => {
            if (!tr.querySelector('.ce-vc-cb').checked) return;
            n++;
            total += (parseInt(tr.querySelector('.ce-vc-q').value, 10) || 0) * (parseFloat(tr.querySelector('.ce-vc-v').value) || 0);
        });
        const el = $('ce-vc-total');
        if (el) el.innerHTML = '<b>' + n + '</b> produto(s) selecionado(s) &middot; total dos itens: <b>' + money(total) + '</b>';
    };
    window.ceVcBusca = function (txt) {
        const t = norm(txt).trim();
        const visPorCat = {};
        document.querySelectorAll('#ce-vc-body .ce-vc-row').forEach(tr => {
            const ok = !t || tr.dataset.t.includes(t);
            tr.style.display = ok ? '' : 'none';
            if (ok) visPorCat[tr.dataset.cat] = true;
        });
        document.querySelectorAll('#ce-vc-body .ce-vc-cat').forEach(tr => { tr.style.display = visPorCat[tr.dataset.cat] ? '' : 'none'; });
    };

    // ── Entrada da tela ──────────────────────────────────────────────────────
    window.initComprasEstoque = async function () {
        const cont = $('compras-estoque-container');
        if (!cont) return;
        if (!S.data.length) cont.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b;">Carregando estoque...</div>';
        try {
            await carregarTudo();
            montarEsqueleto();
            renderTabela();
        } catch (e) {
            cont.innerHTML = '<div style="text-align:center;padding:40px;color:#b91c1c;">Erro ao carregar: ' + esc(e.message) + '</div>';
        }
    };
})();
