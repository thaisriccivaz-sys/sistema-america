// frontend/compras_estoque.js
// Financeiro > Estoque (peças): tela de estoque do Financeiro com edição completa do produto
// (lado esquerdo do modal 100% tela) + dados de compra (fornecedor, valor, garantia, PDF por produto,
// nota fiscal única vinculável a vários produtos e histórico de valores pagos / datas de compra no lado direito).
(function () {
    'use strict';

    const CATEGORIAS_PRODUTO = [
        'EPI', 'Uniforme', 'Copa', 'Pets', 'Itens de Escritório',
        'Peças para Sanitários/Equipamentos', 'Produtos Químicos', 'Limpeza e Higiene',
        'Ferramentas', 'Elétrica', 'Hidráulica', 'Ferragens e Fixadores',
        'Pintura e Acabamento', 'Lubrificantes e Fluidos', 'Automotivo',
        'Pneus e Borracharia', 'Informática e Eletrônicos', 'Descartáveis',
        'Embalagens', 'Utilidades Gerais', 'Outros'
    ];
    const SUGESTOES_TAM_ROUPA = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'EXG', 'XGG'];
    const SUGESTOES_TAM_NUM = ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];

    const S = window._ceState = {
        data: [], saldos: {}, resumo: {}, notas: [], enderecos: [], veiculos: null,
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
        const full = !!cfg.telaCheia;
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.6);z-index:' + (++_zBase) + ';display:flex;align-items:' + (full ? 'stretch' : 'center') + ';justify-content:' + (full ? 'stretch' : 'center') + ';padding:' + (full ? '0' : '16px') + ';';
        ov.innerHTML =
            '<div style="background:' + (full ? '#f1f5f9' : '#fff') + ';border-radius:' + (full ? '0' : '14px') + ';width:' + (full ? '100vw' : (cfg.largura || '860px')) + ';height:' + (full ? '100vh' : 'auto') + ';max-width:' + (full ? '100vw' : '100%') + ';max-height:' + (full ? '100vh' : '92vh') + ';display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,.25);overflow:hidden;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 24px;border-bottom:1px solid #e2e8f0;background:#fff;flex-shrink:0;">' +
                    '<h3 class="ce-modal-title" style="margin:0;font-size:1.08rem;color:#1e293b;display:flex;align-items:center;gap:8px;">' + cfg.titulo + '</h3>' +
                    '<button type="button" class="ce-close" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:4px 12px;font-size:0.9rem;font-weight:700;color:#475569;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">Fechar <span style="font-size:1.3rem;line-height:1;">&times;</span></button>' +
                '</div>' +
                '<div class="ce-modal-body" style="' + (full ? 'flex:1;overflow:hidden;padding:0;' : 'padding:18px 22px;overflow-y:auto;') + '">' + (cfg.corpo || '') + '</div>' +
            '</div>';
        const fechar = () => { ov.remove(); if (cfg.onClose) cfg.onClose(); };
        ov.querySelector('.ce-close').onclick = fechar;
        document.body.appendChild(ov);
        return { el: ov, body: ov.querySelector('.ce-modal-body'), titleEl: ov.querySelector('.ce-modal-title'), fechar: fechar };
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

    function ehAlmoxarifado(endId) {
        const e = (S.enderecos || []).find(x => String(x.id) === String(endId));
        return !!e && norm(e.nome).includes('almoxarifado');
    }

    function badgeEnd(nome, low) {
        const n = norm(nome);
        let c = { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
        if (low) c = { bg: '#fef2f2', color: '#ef4444', border: '#fca5a5' };
        else if (n.includes('terreno')) c = { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
        else if (n.includes('almoxarifado')) c = { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
        else if (n.includes('loja')) c = { bg: '#fefce8', color: '#a16207', border: '#fef08a' };
        else if (n.includes('galpao')) c = { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' };
        return '<span style="display:inline-flex;align-items:center;gap:4px;background:' + c.bg + ';color:' + c.color + ';border:1px solid ' + c.border + ';border-radius:6px;padding:3px 6px;font-size:0.7rem;font-weight:600;white-space:normal;line-height:1.2;">' +
            esc(nome) + (low ? ' <i class="ph ph-warning" style="font-size:0.78rem;"></i>' : '') + '</span>';
    }
    // Letra da rua do almoxarifado (A a Z, ex.: "Almoxarifado - A")
    function normalizarRuaLetra(raw) {
        const v = String(raw || '').trim().toUpperCase();
        if (/^[A-Z]$/.test(v)) return v;
        const n = parseInt(v, 10);
        if (n >= 1 && n <= 26) return String.fromCharCode(64 + n);
        return '';
    }
    const nomeEndComRua = s => {
        const r = s && s.rua ? normalizarRuaLetra(s.rua) : '';
        const nome = s && s.nome ? s.nome : '';
        return nome + (r ? ' - ' + r : '');
    };
    const badgeTipo = t => t === 'reposicao'
        ? '<span style="display:inline-flex;background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe;border-radius:6px;padding:2px 6px;font-size:0.72rem;font-weight:600;">🔄 Reposição</span>'
        : '<span style="display:inline-flex;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:2px 6px;font-size:0.72rem;font-weight:600;">🏢 Matriz</span>';
    const linha = html => '<div style="min-height:28px;display:flex;align-items:center;">' + html + '</div>';
    const dash = '<span style="color:#94a3b8;">—</span>';

    function minMaxHtml(s) {
        const mn = parseInt(s.quantidade_minima) || 0, mx = parseInt(s.quantidade_maxima) || 0;
        if (!mn && !mx) return '<span style="color:#94a3b8;font-size:0.78rem;">—</span>';
        const p = [];
        if (mn) p.push('<span style="color:#64748b;font-size:0.8rem;">min ' + mn + '</span>');
        if (mx) p.push('<span style="color:#64748b;font-size:0.8rem;">max ' + mx + '</span>');
        return '<span style="display:flex;flex-direction:column;line-height:1.3;white-space:nowrap;">' + p.join('') + '</span>';
    }
    // Categoria em duas linhas quando tiver mais de uma palavra (ex.: "Ferragens e" / "Fixadores")
    function catDuasLinhas(cat) {
        const t = String(cat || '').trim();
        const i = t.lastIndexOf(' ');
        const q = x => esc(x).replace(/\//g, '/<wbr>');
        if (i <= 0) return q(t);
        return q(t.slice(0, i)).replace(/ /g, '&nbsp;') + '<br>' + q(t.slice(i + 1));
    }
    const qtdHtml = (q, low) => '<span style="font-weight:700;font-size:1rem;color:' + (low ? '#ef4444' : '#10b981') + ';">' + q + '</span>';

    function garantiaHtml(ate) {
        if (!ate) return dash;
        const dias = Math.round((new Date(ate + 'T00:00:00') - new Date(hojeISO() + 'T00:00:00')) / 86400000);
        let cor = '#15803d', bg = '#f0fdf4', bd = '#bbf7d0', txt = 'Vigente';
        if (dias < 0) { cor = '#b91c1c'; bg = '#fef2f2'; bd = '#fecaca'; txt = 'Vencida'; }
        else if (dias <= 60) { cor = '#a16207'; bg = '#fefce8'; bd = '#fef08a'; txt = 'Vence em ' + dias + 'd'; }
        return '<div style="line-height:1.3;"><div style="font-size:0.8rem;color:#334155;font-weight:600;white-space:nowrap;">' + fmtData(ate) + '</div>' +
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
        const edCatWrap = $('ce-ed-cat-wrap'), edCatDd = $('ce-ed-cat-dd');
        if (edCatWrap && edCatDd && !edCatWrap.contains(e.target)) edCatDd.style.display = 'none';
    });

    // ── Carga de dados ───────────────────────────────────────────────────────
    async function carregarTudo() {
        const [produtos, saldos, resumo, notas, ends, veics] = await Promise.all([
            api('/estoque'), api('/estoque-saldos'), api('/compras-estoque/resumo'), api('/compras-estoque-notas'), api('/estoque-enderecos').catch(() => []), api('/frota/veiculos').catch(() => [])
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
        S.veiculos = [{ placa: 'Outros' }].concat((veics || []).slice().sort((a, b) => {
            const ta = String(a.tipo_veiculo || '\uffff').trim();
            const tb = String(b.tipo_veiculo || '\uffff').trim();
            const ct = ta.localeCompare(tb, 'pt-BR', { sensitivity: 'base' });
            if (ct !== 0) return ct;
            return String(a.placa || '').localeCompare(String(b.placa || ''), 'pt-BR', { sensitivity: 'base' });
        }));
        S.veicMap = { outros: 'outros' };
        (veics || []).forEach(v => {
            if (!v || !v.placa) return;
            S.veicMap[norm(v.placa).trim()] = norm(v.placa + ' ' + (v.marca_modelo_versao || '') + ' ' + (v.tipo_veiculo || '')).trim();
        });
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
            '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:0.75rem;">' +
                '<div style="display:flex;align-items:center;gap:0.9rem;">' +
                    '<div style="width:48px;height:48px;border-radius:50%;border:2px dashed #1971c2;display:flex;align-items:center;justify-content:center;background:#e7f1fb;color:#1971c2;font-size:1.5rem;flex-shrink:0;"><i class="ph ph-package"></i></div>' +
                    '<div><h1 style="margin:0;font-size:1.4rem;font-weight:700;color:#334155;">Estoque &mdash; Compras</h1>' +
                    '<p style="margin:2px 0 0;color:#64748b;font-size:0.82rem;">Fornecedor, valor, garantia, PDF, notas fiscais e histórico de compras de cada produto.</p></div>' +
                '</div>' +
                '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                    '<button class="btn" onclick="ceAbrirNovoItem()" style="background:#e67700;color:#fff;border:none;display:flex;align-items:center;gap:6px;font-weight:700;"><i class="ph ph-plus"></i> Adicionar Item</button>' +
                    '<button class="btn" onclick="ceAbrirNotas()" style="background:#1971c2;color:#fff;border:none;display:flex;align-items:center;gap:6px;"><i class="ph ph-receipt"></i> Notas Fiscais</button>' +
                    '<button class="btn btn-secondary" onclick="initComprasEstoque()" style="display:flex;align-items:center;gap:6px;"><i class="ph ph-arrows-clockwise"></i> Atualizar</button>' +
                '</div>' +
            '</div>' +
            '<div class="card" style="padding:0.9rem 1.1rem;border-radius:12px;">' +
                '<div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.65rem;align-items:flex-end;">' +
                    '<div style="flex:1;min-width:170px;"><label style="' + labelCss + '">Buscar por nome</label><input type="text" id="ce-f-nome" class="form-control" style="width:100%;" placeholder="Buscar..." oninput="ceRender()"></div>' +
                    msBuild('end', 'Endereço', S.enderecos.map(e => ({ value: e.id, label: e.nome })), 'Todos') +
                    msBuild('cat', 'Categoria', cats.map(c => ({ value: c, label: c })), 'Todas') +
                    '<div style="flex:1;min-width:200px;"><label style="' + labelCss + '">Veículo (placa, modelo ou tipo)</label><input type="text" id="ce-f-veic" class="form-control" style="width:100%;" placeholder="Placa, modelo ou tipo..." oninput="ceRender()"></div>' +
                    '<div style="flex:1;min-width:170px;"><label style="' + labelCss + '">Fornecedor</label><input type="text" id="ce-f-forn" class="form-control" style="width:100%;" placeholder="Buscar fornecedor..." oninput="ceRender()"></div>' +
                    '<div style="flex:1;min-width:170px;"><label style="' + labelCss + '">Status</label>' +
                        '<select id="ce-f-status" class="form-control" style="width:100%;" onchange="ceRender()">' +
                            '<option value="">Todos</option><option value="minimo">Estoque Mínimo</option><option value="sem_cadastro">Sem fornecedor/valor</option>' +
                            '<option value="sem_pdf">Sem PDF</option><option value="garantia_vencida">Garantia vencida</option><option value="garantia_vencendo">Garantia vencendo (60 dias)</option>' +
                        '</select></div>' +
                '</div>' +
                '<div id="ce-resumo" style="font-size:0.8rem;color:#64748b;margin-bottom:0.4rem;"></div>' +
                '<style>#ce-table th,#ce-table td{padding:8px 6px;overflow-wrap:break-word;}@media (max-width:1200px){#ce-table{font-size:0.78rem;}#ce-table th{font-size:0.7rem !important;}}@media (max-width:1100px){#ce-table th,#ce-table td{padding:8px 4px;}#ce-table td img{width:30px !important;height:30px !important;min-width:30px !important;}#ce-table td div[style*="dashed"]{width:30px !important;height:30px !important;min-width:30px !important;}#ce-table td .btn{width:22px !important;height:22px !important;}}</style>' +
                '<div id="ce-table-wrap" class="table-responsive" style="height:calc(100vh - 185px);max-height:calc(100vh - 185px);min-height:480px;overflow-x:hidden;overflow-y:auto;border:1px solid #e2e8f0;border-radius:10px;position:relative;">' +
                    '<table id="ce-table" class="table" style="margin:0;border-collapse:separate;border-spacing:0;width:100%;table-layout:fixed;">' +
                        '<colgroup><col style="width:18%"><col style="width:11%"><col style="width:6%"><col style="width:7%"><col style="width:11%"><col style="width:9%"><col style="width:10%"><col style="width:8%"><col style="width:10%"><col style="width:10%"></colgroup>' +
                        '<thead id="ce-thead" style="position:sticky;top:0;z-index:12;background:#f8fafc;"></thead>' +
                        '<tbody id="ce-tbody"></tbody>' +
                    '</table>' +
                '</div>' +
            '</div>';
    }


    const COLUNAS = [
        { col: 'nome', txt: 'Produto' }, { col: 'categoria', txt: 'Catg.' }, { col: 'qtd', txt: 'Qt. Atual' },
        { col: null, txt: 'Min/<wbr>Máx' }, { col: null, txt: 'Endereços' }, { col: null, txt: 'Tipo' },
        { col: 'fornecedor', txt: 'Fornecedor' }, { col: 'valor', txt: 'Valor Atual' }, { col: 'garantia', txt: 'Garantia' },
        { col: 'ultima', txt: 'Últ. Compra' }
    ];
    function renderThead() {
        const th = $('ce-thead');
        if (!th) return;
        const thBase = 'position:sticky;top:0;z-index:12;background:#f8fafc;border-bottom:2px solid #cbd5e1;box-shadow:0 1px 2px rgba(15,23,42,0.06);white-space:normal;line-height:1.2;';
        th.innerHTML = '<tr style="font-size:0.78rem;">' + COLUNAS.map(c => {
            if (!c.col) return '<th style="' + thBase + (c.right ? 'text-align:right;' : '') + '">' + c.txt + '</th>';
            const ativo = S.sort.col === c.col;
            const ic = ativo ? (S.sort.asc ? 'ph-arrow-up' : 'ph-arrow-down') : 'ph-arrows-down-up';
            return '<th onclick="ceOrdenar(\'' + c.col + '\')" style="' + thBase + 'cursor:pointer;user-select:none;" title="Ordenar">' + c.txt +
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
        const veic = norm(($('ce-f-veic') || {}).value).trim();
        const veicTermos = veic ? veic.split(/\s+/).filter(Boolean) : [];
        const forn = norm(($('ce-f-forn') || {}).value);
        const status = ($('ce-f-status') || {}).value || '';
        const hoje = hojeISO();
        return S.data.filter(item => {
            if (restritoSemEndereco(item)) return false;
            if (nome && !norm(item.nome).includes(nome)) return false;
            if (veicTermos.length) {
                const placas = String(item.placas_vinculadas || '').split(',').map(s => norm(s).trim()).filter(Boolean);
                if (!placas.length) return false;
                const matchVeic = placas.some(p => {
                    const infoV = (S.veicMap && S.veicMap[p]) || p;
                    return veicTermos.every(t => infoV.includes(t));
                });
                if (!matchVeic) return false;
            }
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
        if (!lista.length) { tb.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#64748b;">Nenhum item encontrado.</td></tr>'; return; }

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
            out += '<tr style="background:#f1f5f9;border-top:2px solid #cbd5e1;border-bottom:1px solid #cbd5e1;"><td colspan="10" style="padding:8px 14px;font-weight:700;font-size:0.85rem;color:#1e293b;text-transform:uppercase;">' +
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

        // Botão carrinho (26x26: ao lado esquerdo da foto nos produtos sem seta, ou ao lado esquerdo do tamanho nos com seta)
        // O PDF da nota fiscal fica apenas nos detalhes do botão de compras (modal)
        const cartBtnFn = (id, tam) => '<button type="button" class="btn btn-sm" onclick="event.stopPropagation();ceAbrirProduto(' + id + (tam ? ',\'' + esc(tam) + '\'' : '') + ')" title="Editar produto, estoque, fornecedor, valor, garantia, PDF, notas e histórico" style="background:#1971c2;color:#fff;border:none;width:26px;height:26px;padding:0;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="ph ph-shopping-cart" style="font-size:0.95rem;"></i></button>';

        // Colunas de compra (produto geral ou por tamanho)
        const montarCelCompra = (rc, tam) => {
            const temVinculo = !!(rc.fornecedor || rc.valor_atual > 0 || rc.garantia_ate);
            const btnLimpar = temVinculo
                ? '<button type="button" onclick="event.stopPropagation();ceLimparVinculoCompra(' + item.id + (tam ? ',\'' + esc(tam) + '\'' : '') + ')" title="Excluir vinculação de fornecedor, garantia e último valor" style="background:#fee2e2;color:#ef4444;border:1px solid #fecaca;border-radius:6px;padding:3px 7px;font-size:0.78rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="ph ph-trash"></i></button>'
                : '';
            const fc = rc.fornecedor ? '<span style="font-size:0.84rem;color:#334155;font-weight:600;">' + esc(rc.fornecedor) + '</span>' : dash;
            const vc = rc.valor_atual > 0 ? '<span style="font-weight:700;color:#0f766e;white-space:nowrap;">' + money(rc.valor_atual) + '</span>' : dash;
            const uc = rc.ultima_compra
                ? '<div style="line-height:1.3;"><div style="font-size:0.8rem;color:#334155;font-weight:600;white-space:nowrap;">' + fmtData(rc.ultima_compra) + '</div><span style="font-size:0.7rem;color:#64748b;">' + rc.total_compras + (rc.total_compras === 1 ? ' compra' : ' compras') + (rc.total_notas ? ' &middot; ' + rc.total_notas + ' NF' : '') + '</span></div>'
                : dash;
            return '<td style="vertical-align:middle;">' + fc + '</td><td style="vertical-align:middle;">' + vc + '</td><td style="vertical-align:middle;">' + garantiaHtml(rc.garantia_ate) + '</td><td style="vertical-align:middle;"><div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;"><div>' + uc + '</div>' + btnLimpar + '</div></td>';
        };
        const celCompra = montarCelCompra(r, '');

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
                '<td style="vertical-align:middle;font-weight:600;"><div style="display:flex;align-items:center;gap:8px;min-width:0;">' +
                    '<span title="Ver tamanhos, endereços e quantidades" style="width:26px;height:26px;border-radius:6px;background:#e0e7ff;color:#1d4ed8;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;"><i id="ce-arrow-' + item.id + '" class="ph ph-caret-right" style="font-size:0.95rem;transition:transform .2s;' + (aberto ? 'transform:rotate(90deg);' : '') + '"></i></span>' +
                    foto + '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;"><span>' + warn + esc(item.nome) + '</span><span style="background:#e2e8f0;color:#475569;border-radius:999px;padding:1px 8px;font-size:0.7rem;font-weight:700;">' + tams.length + (tams.length === 1 ? ' tamanho' : ' tamanhos') + '</span></div></div></td>' +
                '<td style="vertical-align:middle;line-height:1.25;">' + catDuasLinhas(cat) + '</td>' +
                '<td style="vertical-align:middle;">' + qtdHtml(qtdTotal(item, saldos), low) + '</td>' +
                '<td style="vertical-align:middle;"><span style="color:#2563eb;font-size:0.78rem;font-weight:600;">Ver por tamanho ▾</span></td>' +
                '<td style="vertical-align:middle;">' + endHtml + '</td><td style="vertical-align:middle;">' + tipoHtml + '</td>' + celCompra + '</tr>';
            tams.forEach(tam => {
                const sl = mapTam[tam];
                const tl = sl.some(s => lowSaldo(s, item));
                const stack = fn => sl.length ? sl.map(s => linha(fn(s))).join('') : linha(dash);
                const rt = (r.por_tamanho && r.por_tamanho[tam]) ? r.por_tamanho[tam] : {};
                out += '<tr class="ce-det-' + item.id + '" style="display:' + (aberto ? '' : 'none') + ';background:' + (tl ? '#fff1f2' : '#f8fafc') + ';border-left:3px solid ' + (tl ? '#ef4444' : '#3b82f6') + ';">' +
                    '<td style="padding-left:20px;vertical-align:middle;"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;"><span style="color:#94a3b8;">↳</span>' + cartBtnFn(item.id, tam) + '<span style="background:' + (tl ? '#fef2f2' : '#dbeafe') + ';color:' + (tl ? '#dc2626' : '#1e40af') + ';border:1px solid ' + (tl ? '#fecaca' : '#93c5fd') + ';border-radius:6px;padding:2px 10px;font-size:0.8rem;font-weight:800;">Tamanho ' + esc(tam) + '</span></div></td><td></td>' +
                    '<td>' + stack(s => qtdHtml(qtdDe(s), lowSaldo(s, item))) + '</td>' +
                    '<td>' + stack(minMaxHtml) + '</td>' +
                    '<td>' + stack(s => badgeEnd(nomeEndComRua(s), lowSaldo(s, item))) + '</td>' +
                    '<td>' + stack(s => badgeTipo(s.tipo_estoque || 'matriz')) + '</td>' + montarCelCompra(rt, tam) + '</tr>';
            });
            return out;
        }

        const sl = saldos;
        const stack = fn => sl.length ? sl.map(s => linha(fn(s))).join('') : linha(dash);
        out += '<tr style="border-left:' + borda + ';' + bg + '">' +
            '<td style="vertical-align:middle;font-weight:500;"><div style="display:flex;align-items:center;gap:8px;min-width:0;">' + cartBtnFn(item.id) + foto + '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;"><span>' + warn + esc(item.nome) + '</span></div></div></td>' +
            '<td style="vertical-align:middle;line-height:1.25;">' + catDuasLinhas(cat) + '</td>' +
            '<td>' + (sl.length ? stack(s => qtdHtml(qtdDe(s), lowSaldo(s, item))) : linha(qtdHtml(parseInt(item.quantidade_atual) || 0, low))) + '</td>' +
            '<td>' + stack(minMaxHtml) + '</td>' +
            '<td>' + (sl.length ? stack(s => badgeEnd(nomeEndComRua(s), lowSaldo(s, item))) : linha('<span style="color:#94a3b8;font-size:0.78rem;font-style:italic;">Sem endereço</span>')) + '</td>' +
            '<td>' + stack(s => badgeTipo(s.tipo_estoque || 'matriz')) + '</td>' + celCompra + '</tr>';
        return out;
    }

    // ── Modal 100% Tela do Produto (Esquerda: Editar Produto | Direita: Nota/Compras) ─
    function normalizarCategoria(cat) {
        if (cat === 'Peças Automotivas') return 'Automotivo';
        if (cat === 'Peças para Sanitários') return 'Peças para Sanitários/Equipamentos';
        return cat || 'EPI';
    }
    function ehCatVeiculos(cat) {
        return cat === 'Automotivo' || cat === 'Peças Automotivas' || cat === 'Pneus e Borracharia' || cat === 'Lubrificantes e Fluidos';
    }
    window.ceAbrirNovoItem = function () {
        if (typeof window.abrirModalEstoque === 'function') window.abrirModalEstoque();
    };

    window.ceAbrirProduto = async function (id, tamFoco) {
        const item = S.data.find(i => i.id === id);
        const m = abrirModal({
            titulo: '<i class="ph ph-shopping-cart" style="color:#1971c2;"></i> <span>' + esc(item ? item.nome : 'Produto') + '</span>',
            telaCheia: true,
            corpo: '<div style="text-align:center;padding:40px;color:#64748b;">Carregando dados do produto e notas...</div>',
            onClose: () => { S.prodModal = null; }
        });
        S.prodModal = { id: id, modal: m, dados: null, edit: null, tamFoco: tamFoco ? String(tamFoco).trim().toUpperCase() : '' };
        await carregarDadosModalProduto();
    };

    async function carregarDadosModalProduto() {
        const pm = S.prodModal;
        if (!pm) return;
        try {
            const [dadosCompra, saldosEnd] = await Promise.all([
                api('/compras-estoque/' + pm.id),
                api('/estoque/' + pm.id + '/saldo-enderecos').catch(() => [])
            ]);
            pm.dados = dadosCompra;
            const prod = S.data.find(i => i.id === pm.id) || dadosCompra.produto || {};
            const tams = [];
            try {
                const sv = JSON.parse(prod.tamanhos_lista || '[]');
                if (Array.isArray(sv)) sv.forEach(t => { const tk = String(t || '').trim().toUpperCase(); if (tk && !tams.includes(tk)) tams.push(tk); });
            } catch (_) {}

            let permitidos = saldosEnd || [];
            let ocultos = [];
            if (typeof window.isTopAdmin !== 'undefined' && !window.isTopAdmin && window.activeUserPerms) {
                const any = Object.keys(window.activeUserPerms).some(k => k.startsWith('estoque-endereco:') && window.activeUserPerms[k]);
                if (any) {
                    permitidos = (saldosEnd || []).filter(s => S.enderecos.some(e => String(e.id) === String(s.endereco_id)));
                    ocultos = (saldosEnd || []).filter(s => !S.enderecos.some(e => String(e.id) === String(s.endereco_id))).map(s => ({
                        endereco_id: s.endereco_id,
                        tamanho: String(s.tamanho || '').trim().toUpperCase(),
                        quantidade: s.quantidade,
                        quantidade_minima: s.quantidade_minima || 0,
                        quantidade_maxima: s.quantidade_maxima || 0,
                        tipo_estoque: s.tipo_estoque || 'matriz',
                        rua: s.rua || ''
                    }));
                }
            }
            const linhas = permitidos.map(s => {
                const tk = String(s.tamanho || '').trim().toUpperCase();
                if (tk && !tams.includes(tk)) tams.push(tk);
                return {
                    endereco_id: s.endereco_id,
                    tamanho: tk,
                    quantidade: parseInt(s.quantidade, 10) || 0,
                    quantidade_minima: parseInt(s.quantidade_minima, 10) || 0,
                    quantidade_maxima: parseInt(s.quantidade_maxima, 10) || 0,
                    tipo_estoque: s.tipo_estoque || 'matriz',
                    rua: s.rua || ''
                };
            });
            tams.sort((a, b) => ordemTam(a) - ordemTam(b));
            const catNorm = normalizarCategoria(prod.categoria);
            pm.edit = {
                nome: prod.nome || '',
                categoria: catNorm,
                foto_src: prod.foto_url || prod.foto_base64 || '',
                foto_base64: '',
                tem_tamanho: !!(prod.tem_tamanho || tams.length > 0),
                tamanhos: tams,
                tamExpandidos: pm.tamFoco ? { [pm.tamFoco]: true } : {},
                linhas: linhas,
                hiddenLinhas: ocultos,
                placas: new Set(String(prod.placas_vinculadas || '').split(',').map(s => s.trim()).filter(Boolean)),
                quantidade_minima: parseInt(prod.quantidade_minima, 10) || 0,
                quantidade_maxima: parseInt(prod.quantidade_maxima, 10) || 0
            };
            renderModalCompleto();
            if (ehCatVeiculos(catNorm)) garantirVeiculosERenderizarPlacas();
        } catch (e) {
            pm.modal.body.innerHTML = '<div style="color:#b91c1c;padding:24px;">' + esc(e.message) + '</div>';
        }
    }

    async function recarregarProduto() {
        const pm = S.prodModal;
        if (!pm) return;
        try {
            pm.dados = await api('/compras-estoque/' + pm.id);
            renderDireitaProduto();
        } catch (e) {
            const dir = $('ce-pane-direita');
            if (dir) dir.innerHTML = '<div style="color:#b91c1c;padding:20px;">' + esc(e.message) + '</div>';
        }
    }

    function renderModalCompleto() {
        const pm = S.prodModal;
        if (!pm || !pm.dados || !pm.edit) return;
        pm.modal.body.innerHTML =
            '<div style="display:grid;grid-template-columns:1fr 1fr;height:100%;width:100%;overflow:hidden;">' +
                '<div id="ce-pane-esquerda" style="height:100%;overflow-y:auto;padding:20px 24px;border-right:2px solid #cbd5e1;box-sizing:border-box;background:#fff;"></div>' +
                '<div id="ce-pane-direita" style="height:100%;overflow-y:auto;padding:20px 24px;box-sizing:border-box;background:#f8fafc;"></div>' +
            '</div>';
        renderEsquerdaProduto();
        renderDireitaProduto();
    }

    // ── LADO ESQUERDO: Editar Item de Estoque (idêntico ao Administrativo > Estoque) ──
    function renderEsquerdaProduto() {
        const pm = S.prodModal;
        const pane = $('ce-pane-esquerda');
        if (!pm || !pm.edit || !pane) return;
        const ed = pm.edit;
        const catsList = CATEGORIAS_PRODUTO.slice().sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
        if (ed.categoria && !catsList.includes(ed.categoria)) catsList.unshift(ed.categoria);
        const temFoto = !!ed.foto_src;

        pane.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:10px;border-bottom:1.5px solid #e2e8f0;">' +
                '<div style="font-weight:800;font-size:1rem;color:#1e293b;display:flex;align-items:center;gap:8px;"><i class="ph ph-pencil-simple" style="color:#e67700;font-size:1.2rem;"></i> Editar Item de Estoque</div>' +
                '<button type="button" id="ce-ed-btn-salvar-topo" onclick="ceEdSalvarProduto()" class="btn" style="background:#e67700;color:#fff;border:none;display:inline-flex;align-items:center;gap:6px;font-weight:700;"><i class="ph ph-floppy-disk"></i> Salvar Item</button>' +
            '</div>' +
            '<div style="display:flex;gap:1.5rem;align-items:flex-start;flex-wrap:wrap;">' +
                '<div style="width:140px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:10px;">' +
                    '<div style="width:140px;height:140px;border-radius:10px;border:2px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;background:#f8fafc;overflow:hidden;position:relative;">' +
                        '<img id="ce-ed-foto-preview" src="' + esc(ed.foto_src) + '" onclick="if(this.src&&window.ampliarFotoEstoque)window.ampliarFotoEstoque(this.src,document.getElementById(\'ce-ed-nome\')?.value||\'Foto do Produto\')" title="Clique para ampliar" style="width:100%;height:100%;object-fit:cover;display:' + (temFoto ? 'block' : 'none') + ';cursor:zoom-in;">' +
                        '<i id="ce-ed-foto-icon" class="ph ph-camera" style="font-size:2.4rem;color:#94a3b8;display:' + (temFoto ? 'none' : 'block') + ';"></i>' +
                    '</div>' +
                    '<label class="btn btn-sm" style="background:#f1f5f9;border:1px solid #cbd5e1;color:#475569;cursor:pointer;width:100%;text-align:center;box-sizing:border-box;">' +
                        '<i class="ph ph-upload-simple"></i> Escolher Foto' +
                        '<input type="file" id="ce-ed-foto" accept="image/*" style="display:none;" onchange="ceEdPreviewFoto(this)">' +
                    '</label>' +
                '</div>' +
                '<div style="flex:1;min-width:240px;">' +
                    '<div style="margin-bottom:12px;">' +
                        '<label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85rem;color:#475569;">Nome do Item *</label>' +
                        '<input type="text" id="ce-ed-nome" class="form-control" style="width:100%;" value="' + esc(ed.nome) + '" oninput="window._ceState.prodModal.edit.nome=this.value" placeholder="Ex: Capacete">' +
                    '</div>' +
                    '<div id="ce-ed-cat-wrap" style="margin-bottom:12px;position:relative;">' +
                        '<label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85rem;color:#475569;">Categoria *</label>' +
                        '<input type="hidden" id="ce-ed-cat" value="' + esc(ed.categoria || 'EPI') + '">' +
                        '<div style="position:relative;">' +
                            '<input type="text" id="ce-ed-cat-input" class="form-control" style="width:100%;padding-right:30px;" value="' + esc(ed.categoria || 'EPI') + '" placeholder="Digite ou selecione a categoria..." autocomplete="off" onfocus="ceEdAbrirCatDd(true)" onclick="ceEdAbrirCatDd(true)" oninput="ceEdFiltrarCatDd(this.value)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();ceEdEnterCatDd();}">' +
                            '<i class="ph ph-caret-down" onclick="ceEdToggleCatDd()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#64748b;cursor:pointer;"></i>' +
                        '</div>' +
                        '<div id="ce-ed-cat-dd" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1.5px solid #cbd5e1;border-radius:8px;box-shadow:0 10px 20px rgba(15,23,42,0.14);z-index:200;max-height:220px;overflow-y:auto;margin-top:3px;padding:4px;"></div>' +
                    '</div>' +
                    '<div style="margin-bottom:12px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:10px 14px;">' +
                        '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-weight:700;font-size:0.88rem;color:#1e3a8a;margin:0;user-select:none;">' +
                            '<input type="checkbox" id="ce-ed-tem-tam" ' + (ed.tem_tamanho ? 'checked' : '') + ' onchange="ceEdToggleTemTam(this.checked)" style="width:18px;height:18px;accent-color:#1d4ed8;cursor:pointer;">' +
                            '<span>Este produto possui tamanho? <span style="font-weight:500;color:#475569;font-size:0.78rem;">(Marque para gerenciar tamanhos, entradas/baixas e endereços por tamanho)</span></span>' +
                        '</label>' +
                    '</div>' +
                    '<div id="ce-ed-placas-wrap" style="display:' + (ehCatVeiculos(ed.categoria) ? 'block' : 'none') + ';margin-bottom:12px;">' +
                        '<label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85rem;color:#475569;">Placas Vinculadas</label>' +
                        '<div id="ce-ed-placas-list" style="width:100%;max-height:250px;overflow-y:auto;box-sizing:border-box;border-radius:8px;font-size:0.88rem;padding:10px 12px;border:1.5px solid #cbd5e1;background:#fff;display:flex;flex-direction:column;gap:6px;">' +
                            '<div style="color:#64748b;font-size:0.85rem;">Carregando veículos...</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div id="ce-ed-sec-com-tam" style="display:' + (ed.tem_tamanho ? 'block' : 'none') + ';margin-top:16px;border-top:1px solid #e2e8f0;padding-top:14px;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">' +
                    '<label style="font-weight:700;font-size:0.9rem;color:#1e3a8a;display:flex;align-items:center;gap:6px;"><i class="ph ph-ruler" style="color:#1d4ed8;font-size:1.1rem;"></i> Tamanhos, Entradas/Baixas e Endereços por Tamanho</label>' +
                    '<div style="display:flex;align-items:center;gap:6px;">' +
                        '<input type="text" id="ce-ed-novo-tam" placeholder="Ex: P, M, G, 40..." style="width:140px;padding:4px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:0.82rem;text-transform:uppercase;" onkeydown="if(event.key===\'Enter\'){event.preventDefault();ceEdIncluirTamInput();}">' +
                        '<button type="button" onclick="ceEdIncluirTamInput()" style="background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:0.8rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;"><i class="ph ph-plus"></i> Incluir Tamanho</button>' +
                    '</div>' +
                '</div>' +
                '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin-bottom:10px;">' +
                    '<div style="font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:6px;">Clique nos tamanhos abaixo para incluir neste produto:</div>' +
                    '<div id="ce-ed-tam-chips" style="display:flex;flex-wrap:wrap;gap:5px;"></div>' +
                '</div>' +
                '<div id="ce-ed-tam-lista" style="display:flex;flex-direction:column;gap:8px;"></div>' +
            '</div>' +
            '<div id="ce-ed-sec-sem-tam" style="display:' + (ed.tem_tamanho ? 'none' : 'block') + ';margin-top:16px;border-top:1px solid #e2e8f0;padding-top:14px;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
                    '<label style="font-weight:700;font-size:0.88rem;color:#334155;display:flex;align-items:center;gap:6px;"><i class="ph ph-map-pin" style="color:#1d4ed8;"></i> Endereços do Produto</label>' +
                    '<button type="button" onclick="ceEdAddEndereco(\'\')" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:4px 12px;font-size:0.8rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;"><i class="ph ph-plus"></i> Adicionar Endereço</button>' +
                '</div>' +
                '<div id="ce-ed-end-lista" style="display:flex;flex-direction:column;gap:8px;"></div>' +
                '<p id="ce-ed-end-vazio" style="font-size:0.8rem;color:#94a3b8;font-style:italic;margin:6px 0 0;display:none;">Nenhum endereço vinculado. Use o botão acima para adicionar.</p>' +
            '</div>' +
            '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0;">' +
                '<button type="button" id="ce-ed-btn-salvar" onclick="ceEdSalvarProduto()" class="btn" style="background:#e67700;color:#fff;border:none;display:inline-flex;align-items:center;gap:6px;font-weight:700;padding:8px 18px;"><i class="ph ph-floppy-disk"></i> Salvar Item</button>' +
            '</div>';

        if (ed.tem_tamanho) renderEdTamanhos();
        else renderEdEnderecosSemTam();
    }

    function ruaSelectEdHtml(idx, linha, prefixo) {
        const alm = ehAlmoxarifado(linha.endereco_id);
        const rAtual = normalizarRuaLetra(linha.rua);
        if (linha.rua && rAtual) linha.rua = rAtual;
        let opts = '<option value="">Rua</option>';
        for (let i = 0; i < 26; i++) {
            const L = String.fromCharCode(65 + i);
            opts += '<option value="' + L + '"' + (rAtual === L ? ' selected' : '') + '>Rua ' + L + '</option>';
        }
        return '<select id="ce-ed-rua-' + prefixo + idx + '" title="Rua do almoxarifado" onchange="window._ceState.prodModal.edit.linhas[' + idx + '].rua=this.value" ' +
            'style="width:96px;flex-shrink:0;border:1.5px solid #fed7aa;border-radius:6px;padding:6px 8px;font-size:0.84rem;background:#fff7ed;color:#9a3412;font-weight:700;display:' + (alm ? 'block' : 'none') + ';">' + opts + '</select>';
    }

    window.ceEdOnEndChange = function (idx, val, prefixo) {
        const pm = S.prodModal;
        if (!pm || !pm.edit || !pm.edit.linhas[idx]) return;
        const l = pm.edit.linhas[idx];
        l.endereco_id = parseInt(val, 10) || null;
        const alm = ehAlmoxarifado(l.endereco_id);
        if (!alm) l.rua = '';
        const sel = $('ce-ed-rua-' + prefixo + idx);
        if (sel) { sel.style.display = alm ? 'block' : 'none'; sel.value = alm ? normalizarRuaLetra(l.rua) : ''; }
    };

    window.ceEdPreviewFoto = function (input) {
        const pm = S.prodModal;
        const file = input.files && input.files[0];
        if (!pm || !pm.edit || !file) return;
        const r = new FileReader();
        r.onload = e => {
            pm.edit.foto_base64 = e.target.result;
            pm.edit.foto_src = e.target.result;
            const img = $('ce-ed-foto-preview'), ic = $('ce-ed-foto-icon');
            if (img) { img.src = e.target.result; img.style.display = 'block'; }
            if (ic) ic.style.display = 'none';
        };
        r.readAsDataURL(file);
    };

    function renderOpcoesCatEd(filtro) {
        const dd = $('ce-ed-cat-dd');
        if (!dd) return;
        const pm = S.prodModal;
        const atual = (pm && pm.edit && pm.edit.categoria) || ($('ce-ed-cat') ? $('ce-ed-cat').value : '');
        const catsList = CATEGORIAS_PRODUTO.slice().sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
        if (atual && !catsList.includes(atual)) catsList.unshift(atual);
        const f = norm(filtro || '').trim();
        const filtradas = f ? catsList.filter(c => norm(c).includes(f)) : catsList;
        if (!filtradas.length) {
            dd.innerHTML = '<div style="padding:8px 10px;color:#94a3b8;font-size:0.82rem;text-align:center;">Nenhuma categoria encontrada</div>';
            return;
        }
        dd.innerHTML = filtradas.map(c => {
            const sel = c === atual;
            return '<div class="ce-ed-cat-opt" data-cat="' + esc(c) + '" onclick="ceEdSelectCat(this.dataset.cat)" ' +
                'onmouseover="this.style.background=\'#eff6ff\'" onmouseout="this.style.background=\'' + (sel ? '#f1f5f9' : 'transparent') + '\'" ' +
                'style="padding:7px 10px;cursor:pointer;font-size:0.85rem;color:' + (sel ? '#1d4ed8' : '#334155') + ';font-weight:' + (sel ? '700' : '500') + ';background:' + (sel ? '#f1f5f9' : 'transparent') + ';border-radius:6px;display:flex;justify-content:space-between;align-items:center;">' +
                '<span>' + esc(c) + '</span>' + (sel ? '<i class="ph ph-check" style="color:#1d4ed8;"></i>' : '') + '</div>';
        }).join('');
    }
    window.ceEdAbrirCatDd = function (mostrarTodas) {
        const dd = $('ce-ed-cat-dd'), inp = $('ce-ed-cat-input');
        if (!dd) return;
        renderOpcoesCatEd(mostrarTodas ? '' : (inp ? inp.value : ''));
        dd.style.display = 'block';
    };
    window.ceEdToggleCatDd = function () {
        const dd = $('ce-ed-cat-dd');
        if (!dd) return;
        if (dd.style.display === 'block') dd.style.display = 'none';
        else { window.ceEdAbrirCatDd(true); const inp = $('ce-ed-cat-input'); if (inp) inp.focus(); }
    };
    window.ceEdFiltrarCatDd = function (val) {
        renderOpcoesCatEd(val);
        const dd = $('ce-ed-cat-dd');
        if (dd) dd.style.display = 'block';
        const vTrim = String(val || '').trim();
        const matchExato = CATEGORIAS_PRODUTO.find(c => norm(c) === norm(vTrim));
        if (matchExato) {
            const h = $('ce-ed-cat');
            if (h) h.value = matchExato;
            window.ceEdChangeCat(matchExato);
        } else if (vTrim) {
            const h = $('ce-ed-cat');
            if (h) h.value = vTrim;
            window.ceEdChangeCat(vTrim);
        }
    };
    window.ceEdSelectCat = function (cat) {
        const inp = $('ce-ed-cat-input'), h = $('ce-ed-cat'), dd = $('ce-ed-cat-dd');
        if (inp) inp.value = cat;
        if (h) h.value = cat;
        if (dd) dd.style.display = 'none';
        window.ceEdChangeCat(cat);
    };
    window.ceEdEnterCatDd = function () {
        const first = document.querySelector('#ce-ed-cat-dd .ce-ed-cat-opt');
        if (first && first.dataset.cat) window.ceEdSelectCat(first.dataset.cat);
    };

    window.ceEdChangeCat = function (cat) {
        const pm = S.prodModal;
        if (!pm || !pm.edit) return;
        pm.edit.categoria = cat;
        const wrap = $('ce-ed-placas-wrap');
        if (wrap) wrap.style.display = ehCatVeiculos(cat) ? 'block' : 'none';
        if (ehCatVeiculos(cat)) garantirVeiculosERenderizarPlacas();
    };

    async function garantirVeiculosERenderizarPlacas() {
        const pm = S.prodModal;
        const cont = $('ce-ed-placas-list');
        if (!pm || !pm.edit || !cont) return;
        if (!S.veiculos) {
            try {
                const res = await api('/frota/veiculos');
                S.veiculos = [{ placa: 'Outros' }].concat((res || []).slice().sort((a, b) => {
                    const ta = String(a.tipo_veiculo || '\uffff').trim();
                    const tb = String(b.tipo_veiculo || '\uffff').trim();
                    const ct = ta.localeCompare(tb, 'pt-BR', { sensitivity: 'base' });
                    if (ct !== 0) return ct;
                    return String(a.placa || '').localeCompare(String(b.placa || ''), 'pt-BR', { sensitivity: 'base' });
                }));
            } catch (_) {
                cont.innerHTML = '<div style="color:#ef4444;font-size:0.85rem;">Erro ao carregar veículos.</div>';
                return;
            }
        }
        const sel = pm.edit.placas;
        const tiposMap = {};
        S.veiculos.forEach(v => {
            const tp = String(v.tipo_veiculo || '').trim();
            if (tp) tiposMap[tp] = (tiposMap[tp] || 0) + 1;
        });
        const tiposList = Object.keys(tiposMap).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

        let html =
            '<div style="position:sticky;top:-10px;background:#fff;z-index:4;padding-bottom:6px;border-bottom:1px solid #e2e8f0;margin-bottom:2px;">' +
                '<input type="text" id="ce-ed-placas-busca" placeholder="Digite o modelo, tipo de veículo ou placa..." oninput="ceEdFiltrarPlacas(this.value)" ' +
                    'style="width:100%;padding:5px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.82rem;box-sizing:border-box;margin-bottom:6px;">';
        if (tiposList.length) {
            html += '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;align-items:center;">' +
                '<span style="font-size:0.72rem;font-weight:700;color:#64748b;">Por tipo:</span>' +
                tiposList.map(tp => {
                    const tpKey = norm(tp);
                    const veicsDoTipo = S.veiculos.filter(v => norm(v.tipo_veiculo) === tpKey);
                    const chkTp = veicsDoTipo.length > 0 && veicsDoTipo.every(v => sel.has(v.placa));
                    return '<label style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;border:1px solid ' + (chkTp ? '#93c5fd' : '#cbd5e1') + ';background:' + (chkTp ? '#eff6ff' : '#f8fafc') + ';color:' + (chkTp ? '#1d4ed8' : '#334155') + ';font-size:0.74rem;font-weight:700;cursor:pointer;user-select:none;">' +
                        '<input type="checkbox" class="ce-ed-tipo-veic-chk" data-tipo="' + esc(tpKey) + '" ' + (chkTp ? 'checked' : '') + ' onchange="ceEdToggleTipoVeiculo(this.dataset.tipo,this.checked)" style="accent-color:#1d4ed8;cursor:pointer;">' +
                        '<span>' + esc(tp) + ' (' + tiposMap[tp] + ')</span></label>';
                }).join('') +
            '</div>';
        }
        const todosMarcados = S.veiculos.every(v => !v.placa || sel.has(v.placa));
        html += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:2px 0;">' +
            '<input type="checkbox" id="ce-ed-placas-todas" ' + (todosMarcados ? 'checked' : '') + ' onchange="ceEdToggleTodasPlacas(this.checked)">' +
            '<span id="ce-ed-placas-todas-txt" style="font-weight:700;font-size:0.82rem;color:#1e293b;">Selecionar Todos</span></label>' +
            '</div>';

        S.veiculos.forEach(v => {
            if (!v.placa) return;
            const chk = sel.has(v.placa) ? 'checked' : '';
            const textoBusca = norm((v.marca_modelo_versao || '') + ' ' + (v.tipo_veiculo || '') + ' ' + v.placa);
            const tipoKey = norm(v.tipo_veiculo || '');
            html += '<label class="ce-ed-placa-row" data-search="' + esc(textoBusca) + '" data-tipo="' + esc(tipoKey) + '" style="display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;padding:3px 4px;border-radius:6px;">' +
                '<span style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">' +
                    '<input type="checkbox" class="ce-ed-placa-chk" value="' + esc(v.placa) + '" ' + chk + ' onchange="ceEdPlacaChange(this)">' +
                    '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><b>' + esc(v.placa) + '</b>' + (v.marca_modelo_versao ? ' - ' + esc(v.marca_modelo_versao) : '') + '</span>' +
                '</span>' +
                (v.tipo_veiculo ? '<span style="background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;font-size:0.7rem;font-weight:700;padding:1px 7px;border-radius:999px;white-space:nowrap;flex-shrink:0;">' + esc(v.tipo_veiculo) + '</span>' : '') +
            '</label>';
        });
        cont.innerHTML = html;
    }
    function ceEdSyncPlacasUI() {
        const pm = S.prodModal;
        if (!pm || !pm.edit || !S.veiculos) return;
        const sel = pm.edit.placas;
        const rowsVisiveis = Array.from(document.querySelectorAll('#ce-ed-placas-list .ce-ed-placa-row')).filter(r => r.style.display !== 'none');
        const cbsVisiveis = rowsVisiveis.map(r => r.querySelector('.ce-ed-placa-chk')).filter(Boolean);
        const todas = $('ce-ed-placas-todas');
        if (todas) todas.checked = cbsVisiveis.length > 0 && cbsVisiveis.every(x => x.checked);
        document.querySelectorAll('#ce-ed-placas-list .ce-ed-tipo-veic-chk').forEach(tc => {
            const tk = tc.dataset.tipo;
            const veics = S.veiculos.filter(v => norm(v.tipo_veiculo) === tk);
            const allChk = veics.length > 0 && veics.every(v => sel.has(v.placa));
            tc.checked = allChk;
            const lbl = tc.parentElement;
            if (lbl) {
                lbl.style.borderColor = allChk ? '#93c5fd' : '#cbd5e1';
                lbl.style.background = allChk ? '#eff6ff' : '#f8fafc';
                lbl.style.color = allChk ? '#1d4ed8' : '#334155';
            }
        });
    }
    window.ceEdFiltrarPlacas = function (txt) {
        const f = norm(txt || '').trim();
        document.querySelectorAll('#ce-ed-placas-list .ce-ed-placa-row').forEach(row => {
            const match = !f || (row.dataset.search || '').includes(f);
            row.style.display = match ? 'flex' : 'none';
        });
        const lblTodas = $('ce-ed-placas-todas-txt');
        if (lblTodas) lblTodas.textContent = f ? 'Selecionar Todos (filtrados)' : 'Selecionar Todos';
        ceEdSyncPlacasUI();
    };
    window.ceEdToggleTipoVeiculo = function (tipoKey, checked) {
        const pm = S.prodModal;
        if (!pm || !pm.edit || !S.veiculos) return;
        document.querySelectorAll('#ce-ed-placas-list .ce-ed-placa-row').forEach(row => {
            if (row.dataset.tipo === tipoKey) {
                const cb = row.querySelector('.ce-ed-placa-chk');
                if (cb) {
                    cb.checked = checked;
                    if (checked) pm.edit.placas.add(cb.value);
                    else pm.edit.placas.delete(cb.value);
                }
            }
        });
        ceEdSyncPlacasUI();
    };
    window.ceEdToggleTodasPlacas = function (checked) {
        const pm = S.prodModal;
        if (!pm || !pm.edit) return;
        document.querySelectorAll('#ce-ed-placas-list .ce-ed-placa-row').forEach(row => {
            if (row.style.display === 'none') return;
            const cb = row.querySelector('.ce-ed-placa-chk');
            if (cb) {
                cb.checked = checked;
                if (checked) pm.edit.placas.add(cb.value);
                else pm.edit.placas.delete(cb.value);
            }
        });
        ceEdSyncPlacasUI();
    };
    window.ceEdPlacaChange = function (cb) {
        const pm = S.prodModal;
        if (!pm || !pm.edit) return;
        if (cb.checked) pm.edit.placas.add(cb.value); else pm.edit.placas.delete(cb.value);
        ceEdSyncPlacasUI();
    };

    window.ceEdToggleTemTam = function (checked) {
        const pm = S.prodModal;
        if (!pm || !pm.edit) return;
        pm.edit.tem_tamanho = !!checked;
        const secCom = $('ce-ed-sec-com-tam'), secSem = $('ce-ed-sec-sem-tam');
        if (secCom) secCom.style.display = checked ? 'block' : 'none';
        if (secSem) secSem.style.display = checked ? 'none' : 'block';
        if (checked) renderEdTamanhos(); else renderEdEnderecosSemTam();
    };

    window.ceEdToggleTamCard = function (tamRaw) {
        const pm = S.prodModal;
        if (!pm || !pm.edit) return;
        const tam = String(tamRaw || '').trim().toUpperCase();
        const abrir = !pm.edit.tamExpandidos[tam];
        pm.edit.tamExpandidos[tam] = abrir;
        const body = $('ce-ed-tam-body-' + tam), arrow = $('ce-ed-tam-arrow-' + tam);
        if (body) body.style.display = abrir ? 'block' : 'none';
        if (arrow) arrow.style.transform = abrir ? 'rotate(90deg)' : 'rotate(0deg)';
    };

    window.ceEdToggleTodosTam = function () {
        const pm = S.prodModal;
        if (!pm || !pm.edit) return;
        const algumFechado = pm.edit.tamanhos.some(t => !pm.edit.tamExpandidos[t]);
        pm.edit.tamanhos.forEach(t => { pm.edit.tamExpandidos[t] = algumFechado; });
        renderEdTamanhos();
    };

    window.ceEdIncluirTam = function (tamRaw) {
        const pm = S.prodModal;
        if (!pm || !pm.edit) return;
        const tam = String(tamRaw || '').trim().toUpperCase();
        if (!tam) return;
        const ed = pm.edit;
        if (!ed.tamanhos.includes(tam)) {
            ed.tamanhos.push(tam);
            ed.tamExpandidos[tam] = true;
        } else {
            ed.tamExpandidos[tam] = !ed.tamExpandidos[tam];
        }
        const jaTem = ed.linhas.some(l => String(l.tamanho || '').trim().toUpperCase() === tam);
        if (!jaTem) {
            const semTam = ed.linhas.find(l => !l.tamanho || String(l.tamanho).trim() === '');
            if (semTam && ed.tamanhos.length === 1) {
                semTam.tamanho = tam;
            } else {
                const defEndId = S.enderecos.length === 1 ? S.enderecos[0].id : null;
                ed.linhas.push({ endereco_id: defEndId, tamanho: tam, quantidade: 0, quantidade_minima: 0, quantidade_maxima: 0, tipo_estoque: 'matriz', rua: '' });
            }
        }
        ed.tamanhos.sort((a, b) => ordemTam(a) - ordemTam(b));
        renderEdTamanhos();
    };

    window.ceEdIncluirTamInput = function () {
        const inp = $('ce-ed-novo-tam');
        if (!inp) return;
        const val = inp.value.trim().toUpperCase();
        if (!val) return;
        inp.value = '';
        window.ceEdIncluirTam(val);
    };

    window.ceEdRemoverTam = function (tamRaw) {
        const pm = S.prodModal;
        if (!pm || !pm.edit) return;
        const t = String(tamRaw || '').trim().toUpperCase();
        pm.edit.tamanhos = pm.edit.tamanhos.filter(x => x !== t);
        pm.edit.linhas = pm.edit.linhas.filter(l => String(l.tamanho || '').trim().toUpperCase() !== t);
        renderEdTamanhos();
    };

    window.ceEdAddEndereco = function (tamOpcional) {
        const pm = S.prodModal;
        if (!pm || !pm.edit) return;
        const tam = tamOpcional ? String(tamOpcional).trim().toUpperCase() : '';
        if (tam) pm.edit.tamExpandidos[tam] = true;
        pm.edit.linhas.push({ endereco_id: null, tamanho: tam, quantidade: 0, quantidade_minima: 0, quantidade_maxima: 0, tipo_estoque: 'matriz', rua: '' });
        if (pm.edit.tem_tamanho) renderEdTamanhos(); else renderEdEnderecosSemTam();
    };

    window.ceEdRemoverEndereco = function (idx) {
        const pm = S.prodModal;
        if (!pm || !pm.edit) return;
        pm.edit.linhas.splice(idx, 1);
        if (pm.edit.tem_tamanho) renderEdTamanhos(); else renderEdEnderecosSemTam();
    };

    window.ceEdMovimentarTam = async function (tamRaw, tipo) {
        const pm = S.prodModal;
        if (!pm || !pm.edit) return;
        const t = String(tamRaw || '').trim().toUpperCase();
        const isEntrada = tipo === 'entrada';
        const linhasTam = pm.edit.linhas.map((l, i) => ({ l: l, i: i })).filter(x => String(x.l.tamanho || '').trim().toUpperCase() === t && x.l.endereco_id);
        if (!linhasTam.length) {
            return swal({ icon: 'warning', title: 'Selecione um endereço', text: 'Primeiro escolha o endereço do Tamanho ' + t + ' antes de registrar ' + (isEntrada ? 'entrada' : 'baixa') + '.' });
        }
        const optsEnd = linhasTam.map(x => {
            const eObj = S.enderecos.find(e => String(e.id) === String(x.l.endereco_id));
            return '<option value="' + x.i + '">' + esc(eObj ? eObj.nome : ('Endereço ' + x.l.endereco_id)) + ' (Saldo atual: ' + (x.l.quantidade || 0) + ')</option>';
        }).join('');
        const cor = isEntrada ? '#16a34a' : '#ef4444';
        const { value: vals, isConfirmed } = await swal({
            title: isEntrada ? '<i class="ph ph-arrow-down-left" style="color:#16a34a"></i> Entrada — Tamanho ' + esc(t) : '<i class="ph ph-arrow-up-right" style="color:#ef4444"></i> Baixa — Tamanho ' + esc(t),
            html: '<div style="text-align:left;">' +
                '<div style="margin-bottom:10px;"><label style="' + labelCss + '">Endereço do Tamanho ' + esc(t) + ' *</label><select id="ce-swal-tam-idx" style="' + inputCss + '">' + optsEnd + '</select></div>' +
                '<div style="margin-bottom:10px;"><label style="' + labelCss + '">Quantidade a ' + (isEntrada ? 'adicionar (Entrada)' : 'retirar (Baixa)') + ' *</label><input type="number" id="ce-swal-tam-qtd" min="1" value="1" style="' + inputCss + '"></div>' +
                (!isEntrada ? '<div><label style="' + labelCss + '">Motivo da Baixa</label><input type="text" id="ce-swal-tam-mot" placeholder="Ex: Entrega / ajuste..." style="' + inputCss + '"></div>' : '') +
            '</div>',
            showCancelButton: true,
            confirmButtonText: isEntrada ? 'Confirmar Entrada' : 'Confirmar Baixa',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: cor,
            preConfirm: () => {
                const idx = parseInt($('ce-swal-tam-idx').value, 10);
                const qtd = parseInt($('ce-swal-tam-qtd').value, 10);
                const motivo = ($('ce-swal-tam-mot') || {}).value ? $('ce-swal-tam-mot').value.trim() : '';
                if (isNaN(idx) || !pm.edit.linhas[idx]) { Swal.showValidationMessage('Selecione o endereço'); return false; }
                if (!qtd || qtd <= 0) { Swal.showValidationMessage('Informe uma quantidade válida'); return false; }
                const atual = parseInt(pm.edit.linhas[idx].quantidade, 10) || 0;
                if (!isEntrada && qtd > atual) { Swal.showValidationMessage('Saldo insuficiente neste endereço (Atual: ' + atual + ')'); return false; }
                return { idx: idx, qtd: qtd, motivo: motivo };
            }
        });
        if (!isConfirmed || !vals) return;
        const target = pm.edit.linhas[vals.idx];
        const delta = isEntrada ? vals.qtd : -vals.qtd;
        target.quantidade = Math.max(0, (parseInt(target.quantidade, 10) || 0) + delta);
        renderEdTamanhos();
        try {
            await api('/estoque/' + pm.id + '/movimentar', {
                method: 'POST',
                body: { quantidade: delta, endereco_id: parseInt(target.endereco_id, 10), tamanho: t, motivo: vals.motivo || (isEntrada ? 'Entrada por tamanho' : 'Baixa por tamanho') }
            });
            await carregarTudo();
            renderTabela();
        } catch (e) { console.warn('[ceEdMovimentarTam]', e.message); }
    };

    function renderEdTamanhos() {
        const pm = S.prodModal;
        const chipsEl = $('ce-ed-tam-chips'), listaEl = $('ce-ed-tam-lista');
        if (!pm || !pm.edit || !listaEl) return;
        const ed = pm.edit;
        const tamsAtivos = ed.tamanhos || [];
        if (chipsEl) {
            const todosChips = SUGESTOES_TAM_ROUPA.concat(SUGESTOES_TAM_NUM);
            chipsEl.innerHTML = todosChips.map(c => {
                const ativo = tamsAtivos.includes(c);
                return '<button type="button" onclick="ceEdIncluirTam(\'' + c + '\')" style="background:' + (ativo ? '#1d4ed8' : '#fff') + ';color:' + (ativo ? '#fff' : '#334155') + ';border:1px solid ' + (ativo ? '#1d4ed8' : '#cbd5e1') + ';border-radius:6px;padding:3px 9px;font-size:0.76rem;font-weight:700;cursor:pointer;">' + (ativo ? '✓ ' : '+ ') + c + '</button>';
            }).join('');
        }
        if (!tamsAtivos.length) {
            listaEl.innerHTML = '<div style="text-align:center;padding:18px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:10px;color:#64748b;font-size:0.84rem;">Nenhum tamanho incluído ainda. Clique em um dos tamanhos acima (ex: <b>P, M, G, GG</b> ou <b>38, 40, 42</b>) para vincular tamanhos, endereços e saldos a este produto.</div>';
            return;
        }
        const algumFechado = tamsAtivos.some(t => !ed.tamExpandidos[t]);
        const barraTopo = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">' +
            '<span style="font-size:0.78rem;color:#64748b;font-weight:600;"><i class="ph ph-hand-pointing"></i> Clique na seta de cada tamanho para abrir/editar endereço e quantidades:</span>' +
            '<button type="button" onclick="ceEdToggleTodosTam()" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:3px 10px;font-size:0.75rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">' +
                '<i class="ph ' + (algumFechado ? 'ph-arrows-out-line-vertical' : 'ph-arrows-in-line-vertical') + '"></i> ' + (algumFechado ? 'Expandir todos os tamanhos' : 'Recolher todos os tamanhos') +
            '</button></div>';

        listaEl.innerHTML = barraTopo + tamsAtivos.map(tam => {
            const isOpen = !!ed.tamExpandidos[tam];
            const linhasDoTam = ed.linhas.map((linha, idxGlobal) => ({ linha: linha, idxGlobal: idxGlobal })).filter(x => String(x.linha.tamanho || '').trim().toUpperCase() === tam);
            const totalTam = linhasDoTam.reduce((acc, x) => acc + (parseInt(x.linha.quantidade, 10) || 0), 0);
            const resumoEnds = linhasDoTam.map(x => {
                const eObj = S.enderecos.find(e => String(e.id) === String(x.linha.endereco_id));
                const nomeEnd = eObj ? eObj.nome : 'Sem endereço';
                const minV = parseInt(x.linha.quantidade_minima, 10) || 0;
                const maxV = parseInt(x.linha.quantidade_maxima, 10) || 0;
                const qtdV = parseInt(x.linha.quantidade, 10) || 0;
                const isLow = minV > 0 && qtdV < minV;
                const mmTxt = (minV > 0 || maxV > 0) ? ' (min ' + minV + ' | max ' + maxV + ')' : '';
                return '<span style="display:inline-flex;align-items:center;gap:3px;background:' + (isLow ? '#fef2f2' : '#fff') + ';color:' + (isLow ? '#dc2626' : '#475569') + ';border:1px solid ' + (isLow ? '#fecaca' : '#cbd5e1') + ';border-radius:6px;padding:2px 7px;font-size:0.72rem;font-weight:600;"><i class="ph ph-map-pin" style="color:#1d4ed8;"></i> ' + esc(nomeEnd) + ': <b>' + qtdV + '</b>' + mmTxt + '</span>';
            }).join('');

            const enderecosHtml = linhasDoTam.map(x => {
                const l = x.linha, idx = x.idxGlobal;
                const opcoesEnd = S.enderecos.map(e => '<option value="' + e.id + '"' + (String(e.id) === String(l.endereco_id) ? ' selected' : '') + '>' + esc(e.nome) + '</option>').join('');
                const tipoAtual = l.tipo_estoque || 'matriz';
                return '<div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;margin-top:8px;">' +
                    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
                        '<i class="ph ph-map-pin" style="color:#1d4ed8;flex-shrink:0;font-size:1rem;"></i>' +
                        '<select onchange="ceEdOnEndChange(' + idx + ',this.value,\'t\')" style="flex:1;min-width:0;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;font-size:0.86rem;background:#fff;">' +
                            '<option value="">-- Selecione o endereço do Tam. ' + esc(tam) + ' --</option>' + opcoesEnd +
                        '</select>' +
                        ruaSelectEdHtml(idx, l, 't') +
                        '<select onchange="window._ceState.prodModal.edit.linhas[' + idx + '].tipo_estoque=this.value" style="width:180px;border:1.5px solid #ddd6fe;border-radius:6px;padding:6px 8px;font-size:0.8rem;background:#faf5ff;color:#5b21b6;font-weight:600;">' +
                            '<option value="matriz"' + (tipoAtual === 'matriz' ? ' selected' : '') + '>🏢 Matriz (Compra)</option>' +
                            '<option value="reposicao"' + (tipoAtual === 'reposicao' ? ' selected' : '') + '>🔄 Reposição</option>' +
                        '</select>' +
                        '<button type="button" onclick="ceEdRemoverEndereco(' + idx + ')" style="background:#fee2e2;color:#ef4444;border:none;border-radius:6px;padding:6px 9px;cursor:pointer;flex-shrink:0;" title="Remover endereço"><i class="ph ph-trash"></i></button>' +
                    '</div>' +
                    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' +
                        '<div><label style="display:block;font-size:0.72rem;font-weight:600;color:#475569;margin-bottom:3px;">Qtd. Atual (Tam. ' + esc(tam) + ')</label>' +
                            '<input type="number" min="0" value="' + (l.quantidade || 0) + '" oninput="window._ceState.prodModal.edit.linhas[' + idx + '].quantidade=parseInt(this.value,10)||0" style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:6px 8px;font-size:0.9rem;text-align:center;box-sizing:border-box;font-weight:700;"></div>' +
                        '<div><label style="display:block;font-size:0.72rem;font-weight:600;color:#f59e0b;margin-bottom:3px;">Qtd. Mínima</label>' +
                            '<input type="number" min="0" value="' + (l.quantidade_minima || 0) + '" oninput="window._ceState.prodModal.edit.linhas[' + idx + '].quantidade_minima=parseInt(this.value,10)||0" style="width:100%;border:1.5px solid #fde68a;border-radius:6px;padding:6px 8px;font-size:0.9rem;text-align:center;background:#fffbeb;box-sizing:border-box;"></div>' +
                        '<div><label style="display:block;font-size:0.72rem;font-weight:600;color:#10b981;margin-bottom:3px;">Qtd. Máxima</label>' +
                            '<input type="number" min="0" value="' + (l.quantidade_maxima || 0) + '" oninput="window._ceState.prodModal.edit.linhas[' + idx + '].quantidade_maxima=parseInt(this.value,10)||0" style="width:100%;border:1.5px solid #a7f3d0;border-radius:6px;padding:6px 8px;font-size:0.9rem;text-align:center;background:#f0fdf4;box-sizing:border-box;"></div>' +
                    '</div>' +
                '</div>';
            }).join('');

            return '<div style="background:#f1f5f9;border:1.5px solid #cbd5e1;border-left:4px solid #1d4ed8;border-radius:10px;padding:9px 12px;">' +
                '<div onclick="ceEdToggleTamCard(\'' + tam + '\')" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;user-select:none;">' +
                    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
                        '<span style="width:24px;height:24px;border-radius:6px;background:#dbeafe;color:#1d4ed8;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;"><i id="ce-ed-tam-arrow-' + tam + '" class="ph ph-caret-right" style="font-size:0.9rem;transition:transform .2s;' + (isOpen ? 'transform:rotate(90deg);' : '') + '"></i></span>' +
                        '<span style="background:#1d4ed8;color:#fff;border-radius:6px;padding:3px 10px;font-size:0.84rem;font-weight:800;">Tamanho ' + esc(tam) + '</span>' +
                        '<span style="font-size:0.8rem;color:#334155;font-weight:700;">Saldo: ' + totalTam + ' unid.</span>' +
                        resumoEnds +
                    '</div>' +
                    '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;" onclick="event.stopPropagation();">' +
                        '<button type="button" onclick="ceEdMovimentarTam(\'' + tam + '\',\'entrada\')" style="background:#dcfce7;color:#15803d;border:1px solid #86efac;border-radius:6px;padding:3px 9px;font-size:0.76rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:3px;"><i class="ph-bold ph-plus"></i> Entrada</button>' +
                        '<button type="button" onclick="ceEdMovimentarTam(\'' + tam + '\',\'saida\')" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:6px;padding:3px 9px;font-size:0.76rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:3px;"><i class="ph-bold ph-minus"></i> Baixa</button>' +
                        '<button type="button" onclick="ceEdAddEndereco(\'' + tam + '\')" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:3px 9px;font-size:0.76rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-map-pin"></i> + Endereço</button>' +
                        '<button type="button" onclick="ceEdRemoverTam(\'' + tam + '\')" style="background:#fff;color:#64748b;border:1px solid #cbd5e1;border-radius:6px;padding:3px 7px;font-size:0.75rem;cursor:pointer;" title="Remover Tamanho ' + esc(tam) + '"><i class="ph ph-trash"></i></button>' +
                    '</div>' +
                '</div>' +
                '<div id="ce-ed-tam-body-' + tam + '" style="display:' + (isOpen ? 'block' : 'none') + ';">' + enderecosHtml + '</div>' +
            '</div>';
        }).join('');
    }

    function renderEdEnderecosSemTam() {
        const pm = S.prodModal;
        const lista = $('ce-ed-end-lista'), vazio = $('ce-ed-end-vazio');
        if (!pm || !pm.edit || !lista) return;
        const linhas = pm.edit.linhas;
        if (!linhas.length) {
            lista.innerHTML = '';
            if (vazio) vazio.style.display = 'block';
            return;
        }
        if (vazio) vazio.style.display = 'none';
        lista.innerHTML = linhas.map((l, idx) => {
            const opcoesEnd = S.enderecos.map(e => '<option value="' + e.id + '"' + (String(e.id) === String(l.endereco_id) ? ' selected' : '') + '>' + esc(e.nome) + '</option>').join('');
            const tipoAtual = l.tipo_estoque || 'matriz';
            return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;">' +
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                    '<i class="ph ph-map-pin" style="color:#1d4ed8;flex-shrink:0;font-size:1rem;"></i>' +
                    '<select onchange="ceEdOnEndChange(' + idx + ',this.value,\'n\')" style="flex:1;min-width:0;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.85rem;background:#fff;">' +
                        '<option value="">-- Selecione o endereço --</option>' + opcoesEnd +
                    '</select>' +
                    ruaSelectEdHtml(idx, l, 'n') +
                    '<button type="button" onclick="ceEdRemoverEndereco(' + idx + ')" style="background:#fee2e2;color:#ef4444;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;flex-shrink:0;" title="Remover"><i class="ph ph-trash"></i></button>' +
                '</div>' +
                '<div style="margin-bottom:6px;">' +
                    '<label style="display:block;font-size:0.72rem;font-weight:600;color:#7c3aed;margin-bottom:2px;">Tipo de Estoque</label>' +
                    '<select onchange="window._ceState.prodModal.edit.linhas[' + idx + '].tipo_estoque=this.value" style="width:100%;border:1.5px solid #ddd6fe;border-radius:6px;padding:4px 8px;font-size:0.85rem;background:#faf5ff;color:#5b21b6;font-weight:600;">' +
                        '<option value="matriz"' + (tipoAtual === 'matriz' ? ' selected' : '') + '>🏢 Estoque Matriz (Pedido de Compra)</option>' +
                        '<option value="reposicao"' + (tipoAtual === 'reposicao' ? ' selected' : '') + '>🔄 Estoque de Reposição (Pedido de Reposição)</option>' +
                    '</select>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">' +
                    '<div><label style="display:block;font-size:0.72rem;font-weight:600;color:#475569;margin-bottom:2px;">Qtd. Atual</label>' +
                        '<input type="number" min="0" value="' + (l.quantidade || 0) + '" oninput="window._ceState.prodModal.edit.linhas[' + idx + '].quantidade=parseInt(this.value,10)||0" style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.85rem;text-align:center;box-sizing:border-box;"></div>' +
                    '<div><label style="display:block;font-size:0.72rem;font-weight:600;color:#f59e0b;margin-bottom:2px;">Qtd. Mínima</label>' +
                        '<input type="number" min="0" value="' + (l.quantidade_minima || 0) + '" oninput="window._ceState.prodModal.edit.linhas[' + idx + '].quantidade_minima=parseInt(this.value,10)||0" style="width:100%;border:1.5px solid #fde68a;border-radius:6px;padding:4px 8px;font-size:0.85rem;text-align:center;background:#fffbeb;box-sizing:border-box;"></div>' +
                    '<div><label style="display:block;font-size:0.72rem;font-weight:600;color:#10b981;margin-bottom:2px;">Qtd. Máxima</label>' +
                        '<input type="number" min="0" value="' + (l.quantidade_maxima || 0) + '" oninput="window._ceState.prodModal.edit.linhas[' + idx + '].quantidade_maxima=parseInt(this.value,10)||0" style="width:100%;border:1.5px solid #a7f3d0;border-radius:6px;padding:4px 8px;font-size:0.85rem;text-align:center;background:#f0fdf4;box-sizing:border-box;"></div>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    window.ceEdSalvarProduto = async function () {
        const pm = S.prodModal;
        if (!pm || !pm.edit) return;
        const ed = pm.edit;
        const nome = ($('ce-ed-nome') ? $('ce-ed-nome').value : ed.nome).trim();
        const cat = $('ce-ed-cat') ? $('ce-ed-cat').value : ed.categoria;
        if (!nome) return swal({ icon: 'warning', title: 'Informe o nome do item' });
        if (ed.tem_tamanho && (!ed.tamanhos || !ed.tamanhos.length)) {
            return swal({ icon: 'warning', title: 'Tamanhos obrigatórios', text: 'Inclua pelo menos um tamanho para o produto.' });
        }
        let linhasValidas = (ed.linhas || []).filter(l => l.endereco_id && (!ed.tem_tamanho || (l.tamanho && String(l.tamanho).trim() !== '')));
        if (ed.hiddenLinhas && ed.hiddenLinhas.length) linhasValidas = linhasValidas.concat(ed.hiddenLinhas);
        const qtdAtual = linhasValidas.reduce((acc, l) => acc + (parseInt(l.quantidade, 10) || 0), 0);

        const btn1 = $('ce-ed-btn-salvar'), btn2 = $('ce-ed-btn-salvar-topo');
        try {
            if (btn1) { btn1.disabled = true; btn1.textContent = 'Salvando...'; }
            if (btn2) { btn2.disabled = true; btn2.textContent = 'Salvando...'; }
            await api('/estoque/' + pm.id, {
                method: 'PUT',
                body: {
                    nome: nome,
                    departamento: '',
                    categoria: cat,
                    tem_tamanho: ed.tem_tamanho ? 1 : 0,
                    tamanhos_lista: ed.tem_tamanho ? ed.tamanhos : [],
                    quantidade_atual: qtdAtual,
                    quantidade_minima: ed.quantidade_minima || 0,
                    quantidade_maxima: ed.quantidade_maxima || 0,
                    foto_base64: ed.foto_base64 || '',
                    placas_vinculadas: ehCatVeiculos(cat) ? Array.from(ed.placas).join(',') : '',
                    skip_history: linhasValidas.length > 0
                }
            });
            await api('/estoque/' + pm.id + '/sync-enderecos', {
                method: 'POST',
                body: {
                    enderecos: linhasValidas.map(l => ({
                        endereco_id: l.endereco_id,
                        tamanho: ed.tem_tamanho ? String(l.tamanho || '').trim().toUpperCase() : '',
                        quantidade: parseInt(l.quantidade, 10) || 0,
                        quantidade_minima: parseInt(l.quantidade_minima, 10) || 0,
                        quantidade_maxima: parseInt(l.quantidade_maxima, 10) || 0,
                        tipo_estoque: l.tipo_estoque || 'matriz',
                        rua: ehAlmoxarifado(l.endereco_id) ? String(l.rua || '') : ''
                    }))
                }
            });
            ed.nome = nome;
            ed.categoria = cat;
            ed.foto_base64 = '';
            if (pm.modal && pm.modal.titleEl) {
                pm.modal.titleEl.innerHTML = '<i class="ph ph-shopping-cart" style="color:#1971c2;"></i> <span>' + esc(nome) + '</span>';
            }
            await carregarTudo();
            renderTabela();
            toast('Item salvo com sucesso!');
        } catch (e) {
            swal({ icon: 'error', title: 'Erro ao salvar item', text: e.message });
        } finally {
            if (btn1) { btn1.disabled = false; btn1.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Item'; }
            if (btn2) { btn2.disabled = false; btn2.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Item'; }
        }
    };

    // ── LADO DIREITO: Dados de Compra, PDF, Notas Fiscais e Histórico ────────
    function variacao(atual, anterior) {
        if (!anterior || anterior <= 0) return '';
        const pct = ((atual - anterior) / anterior) * 100;
        if (Math.abs(pct) < 0.05) return '<span style="color:#64748b;font-size:0.72rem;">= </span>';
        return '<span style="color:' + (pct > 0 ? '#b91c1c' : '#15803d') + ';font-size:0.72rem;font-weight:700;">' + (pct > 0 ? '▲ +' : '▼ ') + pct.toFixed(1).replace('.', ',') + '%</span>';
    }
    function obterTamanhosProduto(p) {
        if (!p) return [];
        const saldos = S.saldos[p.id] || [];
        if (!temTamanho(p, saldos)) return [];
        const mapTam = {};
        try {
            (JSON.parse(p.tamanhos_lista || '[]') || []).forEach(t => {
                const k = String(t || '').trim().toUpperCase();
                if (k) mapTam[k] = true;
            });
        } catch (_) {}
        saldos.forEach(s => {
            const k = String(s.tamanho || '').trim().toUpperCase();
            if (k) mapTam[k] = true;
        });
        return Object.keys(mapTam).sort((a, b) => ordemTam(a) - ordemTam(b));
    }

    function renderDireitaProduto() {
        const pm = S.prodModal;
        const pane = $('ce-pane-direita');
        if (!pm || !pm.dados || !pane) return;
        const d = pm.dados, info = d.info, hist = d.historico;
        const tamsProd = (pm.edit && pm.edit.tem_tamanho && Array.isArray(pm.edit.tamanhos) && pm.edit.tamanhos.length) ? pm.edit.tamanhos : obterTamanhosProduto(S.data.find(i => i.id === pm.id) || d.produto);
        const tamSel = pm.tamFoco || (tamsProd.length ? tamsProd[0] : '');
        const infoTam = (tamSel && info.por_tamanho && info.por_tamanho[tamSel]) ? info.por_tamanho[tamSel] : info;
        const valores = hist.map(h => h.valor_unitario || 0).filter(v => v > 0);
        const total = hist.reduce((a, h) => a + (h.quantidade || 0) * (h.valor_unitario || 0), 0);
        const media = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
        const card = (t, v, cor) => '<div style="flex:1;min-width:120px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 12px;"><div style="font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;">' + t + '</div><div style="font-size:1rem;font-weight:800;color:' + (cor || '#1e293b') + ';">' + v + '</div></div>';
        const optNotas = '<option value="">— Sem nota fiscal —</option>' + S.notas.map(n => '<option value="' + n.id + '">NF ' + esc(n.numero) + (n.fornecedor ? ' — ' + esc(n.fornecedor) : '') + (n.data_emissao ? ' — ' + fmtData(n.data_emissao) : '') + '</option>').join('');

        const linhasHist = hist.map((h, i) => {
            const anterior = hist[i + 1] ? hist[i + 1].valor_unitario : 0;
            const nf = h.nota_fiscal_id
                ? (h.nota_tem_arquivo ? '<a href="#" onclick="ceVerNota(' + h.nota_fiscal_id + ');return false;" style="color:#1971c2;font-weight:700;text-decoration:none;" title="Abrir arquivo da nota"><i class="ph ph-receipt"></i> NF ' + esc(h.nota_numero) + '</a>' : '<span style="font-weight:700;">NF ' + esc(h.nota_numero) + '</span>')
                : (info.tem_pdf ? '<a href="#" onclick="ceVerPdf(' + pm.id + ');return false;" style="color:#b91c1c;font-weight:700;text-decoration:none;" title="Abrir PDF da nota anexada"><i class="ph ph-file-pdf"></i> ' + esc(info.pdf_nome || 'Ver PDF') + '</a>' : '<span style="color:#94a3b8;">—</span>');
            const badgeTamHist = h.tamanho ? ' <span style="background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;border-radius:5px;padding:1px 6px;font-size:0.7rem;font-weight:800;">Tam. ' + esc(h.tamanho) + '</span>' : '';
            return '<tr><td style="white-space:nowrap;">' + fmtData(h.data_compra) + badgeTamHist + '</td><td>' + nf + '</td><td>' + (esc(h.fornecedor) || dash) + '</td>' +
                '<td style="text-align:center;">' + h.quantidade + '</td><td style="white-space:nowrap;"><b>' + money(h.valor_unitario) + '</b> ' + variacao(h.valor_unitario, anterior) + '</td>' +
                '<td style="white-space:nowrap;">' + money(h.quantidade * h.valor_unitario) + '</td><td style="white-space:nowrap;">' + (h.garantia_ate ? fmtData(h.garantia_ate) + ' <span style="color:#94a3b8;font-size:0.72rem;">(' + h.garantia_meses + 'm)</span>' : dash) + '</td>' +
                '<td style="font-size:0.75rem;color:#64748b;">' + esc(h.criado_por) + (h.observacao ? '<div title="' + esc(h.observacao) + '" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(h.observacao) + '</div>' : '') + '</td>' +
                '<td style="text-align:right;"><button class="btn btn-sm" onclick="ceExcluirCompra(' + h.id + ')" title="Excluir registro" style="background:#fee2e2;color:#ef4444;border:none;"><i class="ph ph-trash"></i></button></td></tr>';
        }).join('');

        const campoTamManual = tamsProd.length
            ? '<div><label style="' + labelCss + '">Tamanho *</label><select id="ce-c-tam" style="' + inputCss + '">' +
                tamsProd.map(t => '<option value="' + esc(t) + '"' + (t === tamSel ? ' selected' : '') + '>Tamanho ' + esc(t) + '</option>').join('') +
              '</select></div>'
            : '';

        pane.innerHTML =
            '<div style="' + cardCss + '">' + h4('ph-file-pdf', 'PDF do produto', '#b91c1c') +
                '<input type="file" id="ce-p-pdf" accept="application/pdf,.pdf" style="display:none;" onchange="ceEnviarPdf(this)">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">' +
                    '<span style="color:#64748b;font-size:0.84rem;">Anexe uma nova Nota Fiscal em PDF para ler automaticamente os produtos e registrar no histórico abaixo.</span>' +
                    '<button class="btn btn-sm" onclick="document.getElementById(\'ce-p-pdf\').click()" style="background:#b91c1c;color:#fff;border:none;display:inline-flex;align-items:center;gap:6px;font-weight:700;"><i class="ph ph-upload-simple"></i> Anexar PDF</button>' +
                '</div>' +
            '</div>' +

            '<div style="display:none;">' +
                '<input id="ce-p-forn" value="' + esc(infoTam.fornecedor || info.fornecedor) + '">' +
                '<input id="ce-p-valor" type="number" value="' + (infoTam.valor_atual || info.valor_atual || '') + '">' +
                '<input id="ce-p-gm" type="number" value="' + (infoTam.garantia_meses || info.garantia_meses || '') + '">' +
                '<input id="ce-p-ga" type="date" value="' + esc(infoTam.garantia_ate || info.garantia_ate) + '">' +
                '<textarea id="ce-p-obs">' + esc(info.observacoes) + '</textarea>' +
            '</div>' +

            '<div id="ce-card-manual" style="' + cardCss + 'transition:box-shadow .25s,border-color .25s;">' + h4('ph-pencil-simple-line', 'Registrar manualmente') +
                '<div id="ce-aviso-manual" style="display:none;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:8px;padding:8px 12px;font-size:0.8rem;font-weight:600;margin-bottom:10px;"></div>' +
                '<div style="display:grid;grid-template-columns:' + (tamsProd.length ? '0.9fr ' : '') + '1fr 0.6fr 1fr 1.4fr 0.8fr;gap:10px;margin-bottom:10px;">' +
                    campoTamManual +
                    '<div><label style="' + labelCss + '">Data da compra *</label><input id="ce-c-data" type="date" style="' + inputCss + '" value="' + hojeISO() + '"></div>' +
                    '<div><label style="' + labelCss + '">Qtd.</label><input id="ce-c-qtd" type="number" min="1" step="1" style="' + inputCss + '" value="1"></div>' +
                    '<div><label style="' + labelCss + '">Valor unit. (R$) *</label><input id="ce-c-valor" type="number" min="0" step="0.01" style="' + inputCss + '" placeholder="0,00"></div>' +
                    '<div><label style="' + labelCss + '">Fornecedor</label><input id="ce-c-forn" style="' + inputCss + '" value="' + esc(infoTam.fornecedor || info.fornecedor) + '"></div>' +
                    '<div><label style="' + labelCss + '">Garantia (meses)</label><input id="ce-c-gm" type="number" min="0" step="1" style="' + inputCss + '" value="' + (infoTam.garantia_meses || info.garantia_meses || '') + '"></div>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:2fr 1.4fr auto;gap:10px;align-items:end;">' +
                    '<div><label style="' + labelCss + '">Nota fiscal (já cadastrada)</label><select id="ce-c-nf" style="' + inputCss + '" onchange="ceNotaSelecionada(this.value)">' + optNotas + '</select></div>' +
                    '<div><label style="' + labelCss + '">Observação</label><input id="ce-c-obs" style="' + inputCss + '" placeholder="Opcional"></div>' +
                    '<button class="btn" onclick="ceRegistrarCompra()" style="background:#1971c2;color:#fff;border:none;display:flex;align-items:center;gap:6px;"><i class="ph ph-plus-circle"></i> Registrar compra</button>' +
                '</div>' +
                '<div style="margin-top:8px;font-size:0.76rem;"><a href="#" onclick="ceAbrirNotas();return false;" style="color:#1971c2;font-weight:700;text-decoration:none;"><i class="ph ph-receipt"></i> Cadastrar nova nota fiscal ou vincular a vários produtos</a></div>' +
            '</div>' +

            '<div style="' + cardCss + 'margin-bottom:0;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">' +
                    '<div style="font-weight:800;font-size:0.9rem;color:#1e3a8a;display:flex;align-items:center;gap:6px;"><i class="ph ph-clock-counter-clockwise"></i> Histórico de valores pagos e datas de compra</div>' +
                    ((infoTam.fornecedor || infoTam.valor_atual > 0 || infoTam.garantia_ate || info.fornecedor || info.valor_atual > 0 || info.garantia_ate)
                        ? '<button type="button" class="btn btn-sm" onclick="ceLimparVinculoCompra(' + pm.id + (tamSel ? ',\'' + esc(tamSel) + '\'' : '') + ')" style="background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;font-size:0.76rem;font-weight:700;display:inline-flex;align-items:center;gap:5px;"><i class="ph ph-trash"></i> Excluir fornecedor, garantia e último valor</button>'
                        : '') +
                '</div>' +
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
        if (n.fornecedor && $('ce-c-forn')) $('ce-c-forn').value = n.fornecedor;
    };
    window.ceVerPdf = id => abrirArquivo('/compras-estoque/' + id + '/pdf');
    window.ceVerNota = nid => abrirArquivo('/compras-estoque-notas/' + nid + '/arquivo');

    window.ceLimparVinculoCompra = async function (estoqueId, tam) {
        const prod = S.data.find(i => i.id === estoqueId) || (S.prodModal && S.prodModal.dados && S.prodModal.dados.produto) || { nome: 'Produto' };
        const r = await swal({
            icon: 'warning',
            title: 'Excluir vínculo de compra?',
            html: 'Deseja remover a vinculação de <b>fornecedor, garantia e último valor</b> de <b>' + esc(prod.nome) + (tam ? ' (Tam. ' + esc(tam) + ')' : '') + '</b>?',
            showCancelButton: true,
            confirmButtonText: 'Sim, excluir vínculo',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444'
        });
        if (!r.isConfirmed) return;
        try {
            const qs = '?limpar_historico=1' + (tam ? '&tamanho=' + encodeURIComponent(tam) : '');
            await api('/compras-estoque/' + estoqueId + '/info' + qs, { method: 'DELETE' });
            await recarregarResumoENotas();
            renderTabela();
            if (S.prodModal && S.prodModal.id === estoqueId) await recarregarProduto();
            toast('Fornecedor, garantia e último valor removidos!');
        } catch (e) {
            swal({ icon: 'error', title: 'Erro ao excluir vínculo', text: e.message });
        }
    };

    window.ceSalvarInfo = async function () {
        const pm = S.prodModal; if (!pm) return;
        try {
            await api('/compras-estoque/' + pm.id + '/info', {
                method: 'PUT',
                body: { fornecedor: $('ce-p-forn').value, valor_atual: $('ce-p-valor').value, garantia_meses: $('ce-p-gm').value, garantia_ate: $('ce-p-ga').value, observacoes: $('ce-p-obs').value, tamanho: pm.tamFoco || '' }
            });
            await recarregarResumoENotas();
            renderTabela();
            await recarregarProduto();
            toast('Dados salvos!');
        } catch (e) { swal({ icon: 'error', title: 'Erro', text: e.message }); }
    };
    // ── Similaridade de nomes ────────────────────────────────────────────────
    function tokensNome(str) {
        return norm(str).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 2 && !['de', 'da', 'do', 'das', 'dos', 'para', 'com', 'sem', 'un', 'pc', 'jg', 'kit'].includes(w));
    }
    function scoreSimilaridade(a, b) {
        const na = norm(a).trim(), nb = norm(b).trim();
        if (!na || !nb) return 0;
        if (na === nb) return 100;
        if (na.includes(nb) || nb.includes(na)) return 80;
        const ta = tokensNome(a), tb = tokensNome(b);
        if (!ta.length || !tb.length) return 0;
        let comuns = 0;
        ta.forEach(w => { if (tb.some(x => x === w || (w.length >= 4 && x.length >= 4 && (x.startsWith(w) || w.startsWith(x))))) comuns++; });
        return Math.round((comuns * 70) / Math.max(ta.length, tb.length));
    }
    function addMesesIsoFront(iso, meses) {
        const p = String(iso || '').slice(0, 10).split('-').map(Number);
        const m = parseInt(meses, 10) || 0;
        if (p.length !== 3 || p.some(isNaN) || m <= 0) return '';
        const t = new Date(p[0], p[1] - 1 + m, 1);
        const diasNoMes = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
        t.setDate(Math.min(p[2], diasNoMes));
        return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
    }

    window.ceEnviarPdf = async function (input) {
        const pm = S.prodModal; const file = input.files && input.files[0];
        if (!pm || !file) return;
        if (!/\.pdf$/i.test(file.name)) { input.value = ''; return swal({ icon: 'warning', title: 'Selecione um arquivo PDF.' }); }
        if (file.size > 15 * 1024 * 1024) { input.value = ''; return swal({ icon: 'warning', title: 'O PDF deve ter no máximo 15 MB.' }); }
        try {
            swal({ title: 'Anexando PDF e lendo produtos da nota...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const b64 = await lerArquivo(file);
            const [, extraido] = await Promise.all([
                api('/compras-estoque/' + pm.id + '/pdf', { method: 'POST', body: { arquivo_base64: b64, nome_arquivo: file.name } }),
                api('/compras-estoque/extrair-nota', { method: 'POST', body: { arquivo_base64: b64, nome_arquivo: file.name } }).catch(() => null)
            ]);
            await recarregarResumoENotas();
            renderTabela();
            await recarregarProduto();
            if (window.Swal && Swal.isVisible()) Swal.close();
            if (extraido && Array.isArray(extraido.itens) && extraido.itens.length > 0) {
                cePerguntarItemNotaProduto(pm.id, extraido, b64, file.name);
            } else {
                // Caso a nota fiscal não consiga identificar os produtos anexados:
                // anexa a nota fiscal e pede para digitar os dados em "Registrar manualmente"
                let notaIdCriada = null;
                const numAuto = (extraido && extraido.numero) ? String(extraido.numero).trim() : file.name.replace(/\.pdf$/i, '').trim().slice(0, 60);
                const fornAuto = (extraido && extraido.fornecedor) ? String(extraido.fornecedor).trim() : '';
                const dataAuto = (extraido && extraido.data_emissao) ? extraido.data_emissao : hojeISO();
                if (numAuto) {
                    const jaExiste = (S.notas || []).find(n => String(n.numero).trim() === numAuto);
                    if (jaExiste) {
                        notaIdCriada = jaExiste.id;
                    } else {
                        try {
                            const rNf = await api('/compras-estoque-notas', {
                                method: 'POST',
                                body: {
                                    numero: numAuto,
                                    fornecedor: fornAuto,
                                    data_emissao: dataAuto,
                                    valor_total: (extraido && extraido.valor_total) || 0,
                                    observacoes: 'Nota anexada pelo produto',
                                    arquivo_base64: b64,
                                    nome_arquivo: file.name
                                }
                            });
                            notaIdCriada = rNf && rNf.id ? rNf.id : null;
                            await recarregarResumoENotas();
                            await recarregarProduto();
                        } catch (_) {}
                    }
                }
                if (dataAuto && $('ce-c-data')) $('ce-c-data').value = dataAuto;
                if (fornAuto && $('ce-c-forn')) $('ce-c-forn').value = fornAuto;
                if (extraido && extraido.valor_total > 0 && $('ce-c-valor')) $('ce-c-valor').value = Number(extraido.valor_total).toFixed(2);
                if (notaIdCriada && $('ce-c-nf')) $('ce-c-nf').value = String(notaIdCriada);
                const avisoEl = $('ce-aviso-manual');
                if (avisoEl) {
                    avisoEl.style.display = 'block';
                    avisoEl.innerHTML = '<i class="ph ph-warning-circle"></i> Nota fiscal anexada! Não foi possível identificar os produtos automaticamente nesta nota. Digite os dados abaixo para <b>registrar manualmente</b>.';
                }
                const cardMan = $('ce-card-manual');
                if (cardMan) {
                    cardMan.style.borderColor = '#f59e0b';
                    cardMan.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.22)';
                    cardMan.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                await swal({
                    icon: 'info',
                    title: 'Nota fiscal anexada!',
                    text: 'Não foi possível identificar os produtos automaticamente nesta nota fiscal. Digite os dados em "Registrar manualmente" para concluir o registro.',
                    confirmButtonText: 'Digitar dados manualmente'
                });
                if ($('ce-c-valor')) setTimeout(() => $('ce-c-valor').focus(), 80);
            }
        } catch (e) { swal({ icon: 'error', title: 'Erro ao anexar PDF', text: e.message }); }
        finally { input.value = ''; }
    };

    function cePerguntarItemNotaProduto(estoqueId, extraido, b64, nomeArquivo) {
        const pm = S.prodModal;
        const prod = S.data.find(i => i.id === estoqueId) || (pm && pm.dados && pm.dados.produto) || { id: estoqueId, nome: 'Produto' };
        const infoAtual = (pm && pm.dados && pm.dados.info) || {};
        const tamsProd = (pm && pm.edit && pm.edit.tem_tamanho && Array.isArray(pm.edit.tamanhos) && pm.edit.tamanhos.length) ? pm.edit.tamanhos : obterTamanhosProduto(prod);
        const tamSel = (pm && pm.tamFoco) || (tamsProd.length ? tamsProd[0] : '');
        const itens = extraido.itens || [];
        const dataNota = extraido.data_emissao || hojeISO();
        const fornNota = extraido.fornecedor || infoAtual.fornecedor || '';
        const numNota = extraido.numero || '';

        const linhasHtml = itens.map((it, idx) => {
            if (it.ja_vinculado) {
                return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1.5px solid #86efac;background:#f0fdf4;border-radius:10px;margin-bottom:6px;">' +
                    '<div style="flex:1;min-width:0;">' +
                        '<div style="font-weight:700;font-size:0.86rem;color:#1e293b;">' + esc(it.descricao) + (it.codigo ? ' <span style="font-size:0.74rem;color:#64748b;font-weight:600;">(Cód: ' + esc(it.codigo) + ')</span>' : '') + '</div>' +
                        '<div style="font-size:0.78rem;color:#475569;margin-top:2px;">Qtd: <b>' + it.quantidade + ' ' + esc(it.unidade || 'UN') + '</b> &middot; Valor unit.: <b style="color:#0f766e;">' + money(it.valor_unitario) + '</b> &middot; Total: <b>' + money(it.valor_total) + '</b></div>' +
                    '</div>' +
                    '<span style="background:#dcfce7;color:#15803d;border:1px solid #86efac;border-radius:8px;padding:4px 10px;font-size:0.76rem;font-weight:700;white-space:nowrap;"><i class="ph ph-check-circle"></i> Já vinculado: ' + esc(it.estoque_nome) + (it.tamanho ? ' (Tam. ' + esc(it.tamanho) + ')' : '') + '</span>' +
                '</div>';
            }
            return '<label id="ce-sel-nf-lbl-' + idx + '" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px solid #e2e8f0;background:#fff;border-radius:10px;cursor:pointer;margin-bottom:6px;transition:all .15s;">' +
                '<input type="radio" name="ce-sel-nf-item" value="' + idx + '" onchange="ceDestacarItemNotaModal(' + idx + ',' + itens.length + ')" style="accent-color:#1971c2;width:17px;height:17px;flex-shrink:0;">' +
                '<div style="flex:1;min-width:0;">' +
                    '<div style="font-weight:700;font-size:0.86rem;color:#1e293b;">' + esc(it.descricao) + (it.codigo ? ' <span style="font-size:0.74rem;color:#64748b;font-weight:600;">(Cód: ' + esc(it.codigo) + ')</span>' : '') + '</div>' +
                    '<div style="font-size:0.78rem;color:#475569;margin-top:2px;">Qtd: <b>' + it.quantidade + ' ' + esc(it.unidade || 'UN') + '</b> &middot; Valor unit.: <b style="color:#0f766e;">' + money(it.valor_unitario) + '</b> &middot; Total do item: <b>' + money(it.valor_total) + '</b></div>' +
                '</div>' +
            '</label>';
        }).join('');

        const temDisponivel = itens.some(it => !it.ja_vinculado);
        const campoTamModal = tamsProd.length
            ? '<div><label style="' + labelCss + '">Tamanho *</label><select id="ce-vinc-pdf-tam" style="' + inputCss + '">' +
                tamsProd.map(t => '<option value="' + esc(t) + '"' + (t === tamSel ? ' selected' : '') + '>Tamanho ' + esc(t) + '</option>').join('') +
              '</select></div>'
            : '';

        const m = abrirModal({
            titulo: '<i class="ph ph-file-pdf" style="color:#b91c1c;"></i> Selecionar Produto da Nota Fiscal',
            largura: '760px',
            corpo:
                '<div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:0.84rem;color:#1e3a8a;">' +
                    '<div style="font-weight:800;color:#1d4ed8;margin-bottom:4px;"><i class="ph ph-hand-pointing"></i> Selecione abaixo qual produto da nota fiscal corresponde a <span style="text-decoration:underline;">' + esc(prod.nome) + '</span>:</div>' +
                    '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:0.78rem;color:#475569;">' +
                        (numNota ? '<span><b>NF:</b> ' + esc(numNota) + '</span>' : '') +
                        (fornNota ? '<span><b>Fornecedor:</b> ' + esc(fornNota) + '</span>' : '') +
                        (extraido.data_emissao ? '<span><b>Emissão:</b> ' + fmtData(extraido.data_emissao) + '</span>' : '') +
                        '<span><b>Itens lidos na nota:</b> ' + itens.length + '</span>' +
                    '</div>' +
                '</div>' +
                '<div style="max-height:42vh;overflow-y:auto;padding-right:2px;margin-bottom:12px;">' + linhasHtml + '</div>' +
                '<div style="display:grid;grid-template-columns:' + (tamsProd.length ? '0.9fr ' : '') + '1.5fr 1fr 1fr;gap:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:12px;">' +
                    campoTamModal +
                    '<div><label style="' + labelCss + '">Fornecedor</label><input id="ce-vinc-pdf-forn" style="' + inputCss + '" value="' + esc(fornNota) + '"></div>' +
                    '<div><label style="' + labelCss + '">Data da compra</label><input id="ce-vinc-pdf-data" type="date" style="' + inputCss + '" value="' + esc(dataNota) + '"></div>' +
                    '<div><label style="' + labelCss + '">Garantia (meses)</label><input id="ce-vinc-pdf-gm" type="number" min="0" step="1" style="' + inputCss + '" value="' + (infoAtual.garantia_meses || 0) + '"></div>' +
                '</div>' +
                '<label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:#334155;font-weight:600;cursor:pointer;margin-bottom:14px;">' +
                    '<input type="checkbox" id="ce-vinc-pdf-hist" checked style="accent-color:#1971c2;width:16px;height:16px;">' +
                    '<span>Registrar também esta compra no histórico de valores pagos e vincular a nota fiscal</span>' +
                '</label>' +
                '<div style="display:flex;justify-content:flex-end;gap:8px;">' +
                    '<button type="button" class="btn btn-secondary" id="ce-vinc-pdf-pular">' + (temDisponivel ? 'Registrar manualmente' : 'Fechar') + '</button>' +
                    (temDisponivel ? '<button type="button" class="btn" id="ce-vinc-pdf-confirmar" style="background:#16a34a;color:#fff;border:none;display:flex;align-items:center;gap:6px;"><i class="ph ph-check-circle"></i> Vincular produto selecionado</button>' : '') +
                '</div>'
        });

        window.ceDestacarItemNotaModal = function (selIdx, total) {
            for (let i = 0; i < total; i++) {
                const lbl = $('ce-sel-nf-lbl-' + i);
                if (!lbl) continue;
                lbl.style.borderColor = i === selIdx ? '#1971c2' : '#e2e8f0';
                lbl.style.background = i === selIdx ? '#eff6ff' : '#fff';
            }
        };

        $('ce-vinc-pdf-pular').onclick = () => {
            m.fechar();
            if ($('ce-c-valor')) setTimeout(() => $('ce-c-valor').focus(), 80);
        };
        const btnConf = $('ce-vinc-pdf-confirmar');
        if (btnConf) btnConf.onclick = async () => {
            const rad = m.el.querySelector('input[name="ce-sel-nf-item"]:checked');
            if (!rad) {
                return swal({ icon: 'warning', title: 'Selecione um produto', text: 'Clique em um dos produtos da nota fiscal acima para vincular.' });
            }
            const idx = parseInt(rad.value, 10);
            const itemEscolhido = itens[idx];
            if (!itemEscolhido) return;
            const forn = ($('ce-vinc-pdf-forn').value || '').trim();
            const dt = $('ce-vinc-pdf-data').value || hojeISO();
            const gm = Math.max(0, parseInt($('ce-vinc-pdf-gm').value, 10) || 0);
            const ga = gm > 0 ? addMesesIsoFront(dt, gm) : (infoAtual.garantia_ate || '');
            const tamEscolhido = $('ce-vinc-pdf-tam') ? $('ce-vinc-pdf-tam').value : '';
            const gravarHist = $('ce-vinc-pdf-hist').checked;
            const btn = $('ce-vinc-pdf-confirmar');
            try {
                btn.disabled = true;
                btn.textContent = 'Vinculando...';
                await api('/compras-estoque/' + estoqueId + '/info', {
                    method: 'PUT',
                    body: {
                        fornecedor: forn,
                        valor_atual: itemEscolhido.valor_unitario,
                        garantia_meses: gm,
                        garantia_ate: ga,
                        observacoes: infoAtual.observacoes || '',
                        tamanho: tamEscolhido
                    }
                });
                if (gravarHist && itemEscolhido.valor_unitario > 0) {
                    let notaId = null;
                    const numEfetivo = numNota || nomeArquivo.replace(/\.pdf$/i, '').trim().slice(0, 60);
                    if (numEfetivo) {
                        const existente = (S.notas || []).find(n => String(n.numero).trim() === String(numEfetivo).trim());
                        if (existente) {
                            notaId = existente.id;
                        } else if (b64) {
                            try {
                                const novaNf = await api('/compras-estoque-notas', {
                                    method: 'POST',
                                    body: {
                                        numero: numEfetivo,
                                        fornecedor: forn,
                                        data_emissao: dt,
                                        valor_total: extraido.valor_total || itemEscolhido.valor_total || itemEscolhido.valor_unitario,
                                        observacoes: 'Importada ao anexar PDF no produto ' + prod.nome,
                                        arquivo_base64: b64,
                                        nome_arquivo: nomeArquivo || 'nota.pdf'
                                    }
                                });
                                notaId = novaNf && novaNf.id ? novaNf.id : null;
                            } catch (_) {}
                        }
                    }
                    await api('/compras-estoque/' + estoqueId + '/historico', {
                        method: 'POST',
                        body: {
                            data_compra: dt,
                            quantidade: Math.max(1, Math.round(Number(itemEscolhido.quantidade) || 1)),
                            valor_unitario: itemEscolhido.valor_unitario,
                            fornecedor: forn,
                            garantia_meses: gm,
                            nota_fiscal_id: notaId,
                            observacao: 'Item da NF: ' + itemEscolhido.descricao,
                            tamanho: tamEscolhido
                        }
                    });
                }
                m.fechar();
                await recarregarResumoENotas();
                renderTabela();
                if (S.prodModal) await recarregarProduto();
                toast('Produto da nota vinculado com sucesso!');
            } catch (e) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-check-circle"></i> Vincular produto selecionado';
                swal({ icon: 'error', title: 'Erro ao vincular', text: e.message });
            }
        };
    }
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
        const tam = $('ce-c-tam') ? $('ce-c-tam').value : (pm.tamFoco || '');
        try {
            await api('/compras-estoque/' + pm.id + '/historico', {
                method: 'POST',
                body: { data_compra: $('ce-c-data').value, quantidade: $('ce-c-qtd').value, valor_unitario: valor, fornecedor: $('ce-c-forn').value, garantia_meses: $('ce-c-gm').value, nota_fiscal_id: $('ce-c-nf').value || null, observacao: $('ce-c-obs').value, tamanho: tam }
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
        fecharPortalDropdownNf();
        if (notasModal) { notasModal.fechar(); notasModal = null; }
        notasModal = abrirModal({ titulo: '<i class="ph ph-receipt" style="color:#1971c2;"></i> Notas Fiscais de Compra', largura: '1020px', corpo: '<div style="text-align:center;padding:30px;color:#64748b;">Carregando...</div>', onClose: () => { fecharPortalDropdownNf(); notasModal = null; } });
        try { await recarregarResumoENotas(); renderNotas(); } catch (e) { notasModal.body.innerHTML = '<div style="color:#b91c1c;">' + esc(e.message) + '</div>'; }
    };
    let notaExtraidaStage = null;
    function renderNotas() {
        if (!notasModal) return;
        fecharPortalDropdownNf();
        notaExtraidaStage = null;
        const linhas = S.notas.map(n =>
            '<tr><td style="font-weight:700;">NF ' + esc(n.numero) + '</td><td>' + (esc(n.fornecedor) || dash) + '</td><td>' + fmtData(n.data_emissao) + '</td>' +
            '<td>' + (n.valor_total > 0 ? money(n.valor_total) : dash) + '</td>' +
            '<td style="text-align:center;"><span style="background:#dbeafe;color:#1d4ed8;border-radius:999px;padding:1px 10px;font-weight:700;font-size:0.78rem;">' + n.total_produtos + '</span></td>' +
            '<td style="text-align:right;white-space:nowrap;">' +
                (n.tem_arquivo ? '<button class="btn btn-sm btn-secondary" onclick="ceVerNota(' + n.id + ')" title="Abrir arquivo"><i class="ph ph-eye"></i></button> ' : '') +
                (!(n.total_produtos > 0) ? '<button class="btn btn-sm" onclick="ceAbrirVincular(' + n.id + ')" style="background:#1971c2;color:#fff;border:none;"><i class="ph ph-link"></i> Vincular produtos</button> ' : '') +
                '<button class="btn btn-sm" onclick="ceExcluirNota(' + n.id + ')" title="Excluir nota" style="background:#fee2e2;color:#ef4444;border:none;"><i class="ph ph-trash"></i></button></td></tr>'
        ).join('');
        notasModal.body.innerHTML =
            '<div style="' + cardCss + 'margin-bottom:0;">' + h4('ph-plus-circle', 'Cadastrar nota fiscal (arquivo único)') +
                '<div style="display:grid;grid-template-columns:1fr 1.6fr 1fr 1fr;gap:10px;margin-bottom:10px;">' +
                    '<div><label style="' + labelCss + '">Nº da nota *</label><input id="ce-n-num" style="' + inputCss + '"></div>' +
                    '<div><label style="' + labelCss + '">Fornecedor</label><input id="ce-n-forn" style="' + inputCss + '"></div>' +
                    '<div><label style="' + labelCss + '">Data de emissão</label><input id="ce-n-data" type="date" style="' + inputCss + '" value="' + hojeISO() + '"></div>' +
                    '<div><label style="' + labelCss + '">Valor total (R$)</label><input id="ce-n-valor" type="number" min="0" step="0.01" style="' + inputCss + '"></div>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:2fr 1.4fr auto;gap:10px;align-items:end;">' +
                    '<div><label style="' + labelCss + '">Arquivo da nota (PDF, XML, JPG ou PNG) *</label><input id="ce-n-arq" type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" onchange="ceAoEscolherArquivoNota(this)" style="' + inputCss + 'background:#fff;"></div>' +
                    '<div><label style="' + labelCss + '">Observação</label><input id="ce-n-obs" style="' + inputCss + '"></div>' +
                    '<button class="btn" id="ce-n-btn-salvar" onclick="ceSalvarNota()" style="background:#16a34a;color:#fff;border:none;display:flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> Salvar nota</button>' +
                '</div>' +
                '<div id="ce-n-itens-extraidos"></div>' +
            '</div>' +
            '<div style="display:none;' + cardCss + 'margin-bottom:0;">' + h4('ph-list-bullets', 'Notas cadastradas (' + S.notas.length + ')') +
                (S.notas.length
                    ? '<div class="table-responsive"><table class="table" style="font-size:0.84rem;"><thead><tr style="font-size:0.76rem;"><th>Nota</th><th>Fornecedor</th><th>Emissão</th><th>Valor total</th><th style="text-align:center;">Produtos</th><th></th></tr></thead><tbody>' + linhas + '</tbody></table></div>'
                    : '<div style="text-align:center;padding:16px;color:#94a3b8;">Nenhuma nota fiscal cadastrada.</div>') + '</div>';
    }

    window.ceAoEscolherArquivoNota = async function (input) {
        const file = input && input.files && input.files[0];
        const stageEl = $('ce-n-itens-extraidos');
        fecharPortalDropdownNf();
        if (!file) { notaExtraidaStage = null; if (stageEl) stageEl.innerHTML = ''; return; }
        if (file.size > 15 * 1024 * 1024) { input.value = ''; return swal({ icon: 'warning', title: 'O arquivo deve ter no máximo 15 MB.' }); }
        if (stageEl) {
            stageEl.innerHTML = '<div style="margin-top:12px;padding:14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;text-align:center;color:#0369a1;font-size:0.84rem;font-weight:600;"><i class="ph ph-spinner ph-spin"></i> Lendo nota fiscal e puxando produtos automaticamente...</div>';
        }
        try {
            const b64 = await lerArquivo(file);
            const ext = await api('/compras-estoque/extrair-nota', { method: 'POST', body: { arquivo_base64: b64, nome_arquivo: file.name } }).catch(() => ({}));
            const numSug = (ext && ext.numero) ? String(ext.numero).trim() : file.name.replace(/\.[a-z0-9]+$/i, '').trim().slice(0, 60);
            if (numSug && $('ce-n-num')) $('ce-n-num').value = numSug;
            if (ext && ext.fornecedor && $('ce-n-forn')) $('ce-n-forn').value = ext.fornecedor;
            if (ext && ext.data_emissao && $('ce-n-data')) $('ce-n-data').value = ext.data_emissao;
            if (ext && ext.valor_total > 0 && $('ce-n-valor')) $('ce-n-valor').value = Number(ext.valor_total).toFixed(2);
            const itensLidos = (ext && Array.isArray(ext.itens)) ? ext.itens : [];
            notaExtraidaStage = {
                b64: b64,
                nome_arquivo: file.name,
                modoManual: itensLidos.length === 0,
                itens: itensLidos.length > 0
                    ? itensLidos.map(it => ({
                        incluir: true,
                        descricao: it.descricao || '',
                        codigo: it.codigo || '',
                        quantidade: Math.max(1, Math.round(Number(it.quantidade) || 1)),
                        valor_unitario: Number(it.valor_unitario) || 0,
                        garantia_meses: Number(it.garantia_meses) || 0,
                        estoque_id: it.estoque_id ? String(it.estoque_id) : '',
                        estoque_nome: it.estoque_nome || '',
                        estoque_categoria: it.estoque_categoria || '',
                        tamanho: it.tamanho || '',
                        ja_vinculado: !!it.ja_vinculado
                    }))
                    : [{
                        incluir: true,
                        descricao: 'Registro manual',
                        codigo: '',
                        quantidade: 1,
                        valor_unitario: (ext && ext.valor_total > 0) ? Number(ext.valor_total) : 0,
                        garantia_meses: 0,
                        estoque_id: '',
                        estoque_nome: '',
                        estoque_categoria: '',
                        tamanho: '',
                        ja_vinculado: false
                    }]
            };
            renderItensExtraidosNota();
        } catch (e) {
            notaExtraidaStage = null;
            if (stageEl) stageEl.innerHTML = '<div style="margin-top:10px;padding:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#b91c1c;font-size:0.8rem;">Não foi possível ler os produtos automaticamente (' + esc(e.message) + '). Você pode salvar a nota e vincular os produtos manualmente.</div>';
        }
    };

    // ── Seletor pesquisável de produtos separado por categorias + tamanhos ────
    let _ddPortalEl = null;
    let _ddPortalIdx = -1;
    function fecharPortalDropdownNf() {
        if (_ddPortalEl) { _ddPortalEl.remove(); _ddPortalEl = null; }
        _ddPortalIdx = -1;
    }
    document.addEventListener('mousedown', e => {
        if (!_ddPortalEl) return;
        if (_ddPortalEl.contains(e.target)) return;
        if (e.target && e.target.closest && e.target.closest('.ce-nf-prod-picker')) return;
        fecharPortalDropdownNf();
    });

    function rotuloItemSelecionadoNf(it) {
        if (!it || !it.estoque_id) return '';
        const p = (S.data || []).find(x => String(x.id) === String(it.estoque_id));
        const nome = (p && p.nome) || it.estoque_nome || '';
        const cat = (p && p.categoria) || it.estoque_categoria || '';
        const tam = it.tamanho ? (' — Tam. ' + it.tamanho) : '';
        return nome ? (nome + tam + (cat ? ' (' + cat + ')' : '')) : '';
    }

    function htmlSeletorProdutoNf(it, idx) {
        if (it.ja_vinculado) {
            return '<div style="display:inline-flex;align-items:center;gap:6px;background:#dcfce7;color:#15803d;border:1px solid #86efac;border-radius:8px;padding:6px 10px;font-size:0.8rem;font-weight:700;width:100%;box-sizing:border-box;" title="Este item da nota fiscal já está vinculado a este produto do estoque">' +
                '<i class="ph ph-check-circle" style="font-size:1rem;flex-shrink:0;"></i>' +
                '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Já vinculado: ' + esc(it.estoque_nome || 'Produto') + (it.tamanho ? ' (Tam. ' + esc(it.tamanho) + ')' : '') + (it.estoque_categoria ? ' · ' + esc(it.estoque_categoria) : '') + '</span>' +
            '</div>';
        }
        const rot = rotuloItemSelecionadoNf(it);
        const p = it.estoque_id ? (S.data || []).find(x => String(x.id) === String(it.estoque_id)) : null;
        const tams = obterTamanhosProduto(p);
        const btnAddTam = (p && tams.length > 1)
            ? '<button type="button" onclick="ceNfExpandirTamanhos(' + idx + ')" title="Adicionar linhas para os outros tamanhos deste produto (cada tamanho pode ter valor e garantia diferentes)" style="margin-top:4px;background:#eff6ff;color:#1d4ed8;border:1px solid #93c5fd;border-radius:6px;padding:2px 8px;font-size:0.71rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-ArrowsOutSimple"></i> + Incluir todos os tamanhos (' + tams.join(', ') + ')</button>'
            : '';
        return '<div class="ce-nf-prod-picker" style="position:relative;">' +
            '<div style="display:flex;align-items:center;gap:4px;">' +
                '<input type="text" id="ce-nf-inp-' + idx + '" value="' + esc(rot) + '" autocomplete="off" ' +
                    'placeholder="Digite o nome do produto para buscar..." ' +
                    'onfocus="ceAbrirDropdownProdNf(' + idx + ',this)" ' +
                    'oninput="ceFiltrarDropdownProdNf(' + idx + ',this.value,this)" ' +
                    'style="' + inputCss + 'padding:5px 28px 5px 8px;font-size:0.8rem;' + (it.estoque_id ? 'border-color:#16a34a;font-weight:700;background:#f0fdf4;' : 'border-color:#f59e0b;background:#fff;') + '">' +
                (it.estoque_id
                    ? '<button type="button" onclick="ceNfLimparProd(' + idx + ')" title="Trocar produto selecionado" style="position:absolute;right:6px;top:6px;background:none;border:none;color:#64748b;cursor:pointer;padding:2px;font-size:0.9rem;line-height:1;"><i class="ph ph-x-circle"></i></button>'
                    : '<i class="ph ph-caret-down" onclick="var el=document.getElementById(\'ce-nf-inp-' + idx + '\');if(el)el.focus();" style="position:absolute;right:8px;top:9px;color:#64748b;cursor:pointer;font-size:0.85rem;"></i>') +
            '</div>' +
            btnAddTam +
        '</div>';
    }

    window.ceAbrirDropdownProdNf = function (idx, inpEl) {
        if (!inpEl) return;
        _ddPortalIdx = idx;
        if (!_ddPortalEl) {
            _ddPortalEl = document.createElement('div');
            _ddPortalEl.id = 'ce-nf-dd-portal';
            document.body.appendChild(_ddPortalEl);
        }
        const rect = inpEl.getBoundingClientRect();
        const espacoAbaixo = window.innerHeight - rect.bottom - 14;
        const alturaMax = Math.max(220, Math.min(340, espacoAbaixo >= 220 ? espacoAbaixo : rect.top - 14));
        const topPos = espacoAbaixo >= 220 ? (rect.bottom + 4) : Math.max(8, rect.top - alturaMax - 4);
        const larg = Math.max(rect.width, 360);
        const leftPos = Math.min(rect.left, window.innerWidth - larg - 12);
        _ddPortalEl.style.cssText = 'position:fixed;top:' + topPos + 'px;left:' + Math.max(8, leftPos) + 'px;width:' + larg + 'px;max-height:' + alturaMax + 'px;overflow-y:auto;background:#fff;border:1.5px solid #94a3b8;border-radius:10px;box-shadow:0 16px 32px rgba(15,23,42,.24);z-index:25000;padding:4px 0;';
        const it = notaExtraidaStage && notaExtraidaStage.itens ? notaExtraidaStage.itens[idx] : null;
        const rotAtual = rotuloItemSelecionadoNf(it);
        const termo = (inpEl.value && inpEl.value !== rotAtual) ? inpEl.value : '';
        popularOpcoesPortalNf(idx, termo);
    };

    window.ceFiltrarDropdownProdNf = function (idx, txt, inpEl) {
        if (!notaExtraidaStage || !notaExtraidaStage.itens[idx]) return;
        if (notaExtraidaStage.itens[idx].estoque_id) {
            notaExtraidaStage.itens[idx].estoque_id = '';
            notaExtraidaStage.itens[idx].tamanho = '';
            notaExtraidaStage.itens[idx].estoque_nome = '';
            notaExtraidaStage.itens[idx].estoque_categoria = '';
        }
        if (!_ddPortalEl || _ddPortalIdx !== idx) {
            window.ceAbrirDropdownProdNf(idx, inpEl);
        } else {
            popularOpcoesPortalNf(idx, txt);
        }
    };

    function popularOpcoesPortalNf(idx, filtroTxt) {
        if (!_ddPortalEl) return;
        const q = norm(filtroTxt || '').trim();
        const ordenados = (S.data || []).slice().sort((a, b) => {
            const c = String(a.categoria || 'Sem Categoria').localeCompare(String(b.categoria || 'Sem Categoria'), 'pt-BR', { sensitivity: 'base' });
            return c !== 0 ? c : String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base', numeric: true });
        });
        let html = '';
        let catAtual = null;
        let totalAchados = 0;

        ordenados.forEach(p => {
            const cat = String(p.categoria || 'Sem Categoria').trim();
            const tams = obterTamanhosProduto(p);
            const baseBusca = norm(p.nome + ' ' + cat + ' ' + tams.join(' '));
            if (q && !baseBusca.includes(q)) return;

            if (cat !== catAtual) {
                catAtual = cat;
                html += '<div style="position:sticky;top:0;background:#f1f5f9;padding:5px 12px;font-size:0.72rem;font-weight:800;color:#1e3a8a;text-transform:uppercase;border-top:1px solid #e2e8f0;border-bottom:1px solid #cbd5e1;display:flex;align-items:center;gap:6px;z-index:1;">' +
                    '<i class="ph ph-folders" style="color:#1971c2;"></i> ' + esc(cat) +
                '</div>';
            }

            if (tams.length > 0) {
                html += '<div style="padding:6px 12px 3px;background:#f8fafc;border-bottom:1px dashed #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:6px;">' +
                    '<span style="font-size:0.8rem;font-weight:800;color:#334155;">' + esc(p.nome) + ' <span style="font-size:0.7rem;color:#64748b;font-weight:600;">(' + tams.length + ' tamanhos)</span></span>' +
                    '<button type="button" onclick="ceNfSelecionarTodosTamanhos(' + idx + ',' + p.id + ')" style="background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;border-radius:6px;padding:2px 7px;font-size:0.7rem;font-weight:700;cursor:pointer;white-space:nowrap;">+ Todos os tamanhos</button>' +
                '</div>';
                tams.forEach(tam => {
                    totalAchados++;
                    html += '<div onclick="ceNfEscolherProd(' + idx + ',' + p.id + ',\'' + esc(tam) + '\')" ' +
                        'onmouseover="this.style.background=\'#eff6ff\'" onmouseout="this.style.background=\'#fff\'" ' +
                        'style="padding:6px 12px 6px 24px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:0.81rem;color:#1e293b;border-bottom:1px solid #f1f5f9;background:#fff;">' +
                        '<span><span style="color:#94a3b8;margin-right:4px;">↳</span>' + esc(p.nome) + '</span>' +
                        '<span style="background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;border-radius:6px;padding:1px 8px;font-size:0.74rem;font-weight:800;white-space:nowrap;">Tamanho ' + esc(tam) + '</span>' +
                    '</div>';
                });
            } else {
                totalAchados++;
                html += '<div onclick="ceNfEscolherProd(' + idx + ',' + p.id + ',\'\')" ' +
                    'onmouseover="this.style.background=\'#eff6ff\'" onmouseout="this.style.background=\'#fff\'" ' +
                    'style="padding:7px 12px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:0.82rem;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;background:#fff;">' +
                    '<span>' + esc(p.nome) + '</span>' +
                '</div>';
            }
        });

        if (!totalAchados) {
            html = '<div style="padding:14px;text-align:center;color:#94a3b8;font-size:0.8rem;">Nenhum produto encontrado para "' + esc(filtroTxt) + '".</div>';
        }
        _ddPortalEl.innerHTML = html;
    }

    window.ceNfEscolherProd = function (idx, prodId, tam) {
        if (!notaExtraidaStage || !notaExtraidaStage.itens[idx]) return;
        const p = (S.data || []).find(x => String(x.id) === String(prodId));
        const it = notaExtraidaStage.itens[idx];
        it.estoque_id = String(prodId);
        it.tamanho = tam ? String(tam).trim().toUpperCase() : '';
        it.estoque_nome = p ? p.nome : '';
        it.estoque_categoria = p ? (p.categoria || '') : '';
        it.incluir = true;
        fecharPortalDropdownNf();
        renderItensExtraidosNota();
    };

    window.ceNfSelecionarTodosTamanhos = function (idx, prodId) {
        if (!notaExtraidaStage || !notaExtraidaStage.itens[idx]) return;
        const p = (S.data || []).find(x => String(x.id) === String(prodId));
        if (!p) return;
        const tams = obterTamanhosProduto(p);
        if (!tams.length) return window.ceNfEscolherProd(idx, prodId, '');
        const base = notaExtraidaStage.itens[idx];
        const novasLinhas = tams.map(tam => ({
            incluir: true,
            descricao: base.descricao + ' (Tam. ' + tam + ')',
            codigo: base.codigo || '',
            quantidade: 1,
            valor_unitario: base.valor_unitario || 0,
            garantia_meses: base.garantia_meses || 0,
            estoque_id: String(p.id),
            estoque_nome: p.nome,
            estoque_categoria: p.categoria || '',
            tamanho: tam,
            ja_vinculado: false
        }));
        notaExtraidaStage.itens.splice.apply(notaExtraidaStage.itens, [idx, 1].concat(novasLinhas));
        fecharPortalDropdownNf();
        renderItensExtraidosNota();
    };

    window.ceNfExpandirTamanhos = function (idx) {
        if (!notaExtraidaStage || !notaExtraidaStage.itens[idx]) return;
        const it = notaExtraidaStage.itens[idx];
        if (!it.estoque_id) return;
        window.ceNfSelecionarTodosTamanhos(idx, it.estoque_id);
    };

    window.ceNfLimparProd = function (idx) {
        if (!notaExtraidaStage || !notaExtraidaStage.itens[idx]) return;
        const it = notaExtraidaStage.itens[idx];
        it.estoque_id = '';
        it.tamanho = '';
        it.estoque_nome = '';
        it.estoque_categoria = '';
        renderItensExtraidosNota();
        setTimeout(() => {
            const inp = $('ce-nf-inp-' + idx);
            if (inp) { inp.value = ''; inp.focus(); }
        }, 30);
    };

    window.ceNfRemoverItem = function (idx) {
        if (!notaExtraidaStage || !Array.isArray(notaExtraidaStage.itens)) return;
        fecharPortalDropdownNf();
        notaExtraidaStage.itens.splice(idx, 1);
        renderItensExtraidosNota();
    };

    function renderItensExtraidosNota() {
        const stageEl = $('ce-n-itens-extraidos');
        if (!stageEl || !notaExtraidaStage) return;
        if (!notaExtraidaStage.itens.length) {
            stageEl.innerHTML =
                '<div style="margin-top:12px;border:1.5px dashed #cbd5e1;background:#f8fafc;border-radius:10px;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
                    '<span style="font-size:0.82rem;color:#64748b;">Todos os itens da nota foram removidos da lista de vínculo.</span>' +
                    '<button type="button" class="btn btn-sm btn-secondary" onclick="ceNfAddLinhaManual()" style="font-size:0.75rem;padding:4px 10px;">+ Adicionar produto manualmente</button>' +
                '</div>';
            return;
        }
        if (notaExtraidaStage.modoManual) {
            const linhasMan = notaExtraidaStage.itens.map((it, idx) => {
                return '<tr style="border-bottom:1px solid #e2e8f0;' + (it.estoque_id ? 'background:#f0fdf4;' : '') + '">' +
                    '<td style="vertical-align:middle;">' + htmlSeletorProdutoNf(it, idx) + '</td>' +
                    '<td style="width:86px;vertical-align:middle;"><input type="number" min="1" step="1" value="' + it.quantidade + '" oninput="ceNfStageSet(' + idx + ',\'quantidade\',this.value)" style="' + inputCss + 'padding:6px;text-align:center;"></td>' +
                    '<td style="width:130px;vertical-align:middle;"><input type="number" min="0" step="0.01" value="' + (it.valor_unitario || '') + '" placeholder="0,00" oninput="ceNfStageSet(' + idx + ',\'valor_unitario\',this.value)" style="' + inputCss + 'padding:6px;"></td>' +
                    '<td style="width:100px;vertical-align:middle;"><input type="number" min="0" step="1" value="' + (it.garantia_meses || '') + '" placeholder="0" oninput="ceNfStageSet(' + idx + ',\'garantia_meses\',this.value)" style="' + inputCss + 'padding:6px;text-align:center;"></td>' +
                    '<td style="width:38px;text-align:center;vertical-align:middle;">' +
                        '<button type="button" onclick="ceNfRemoverItem(' + idx + ')" title="Excluir este produto (não vincular)" style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;width:26px;height:26px;font-weight:800;font-size:0.95rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;line-height:1;">&times;</button>' +
                    '</td>' +
                '</tr>';
            }).join('');
            stageEl.innerHTML =
                '<div style="margin-top:12px;border:1.5px solid #fed7aa;background:#fff7ed;border-radius:10px;padding:10px 12px;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">' +
                        '<div style="font-weight:800;font-size:0.84rem;color:#9a3412;"><i class="ph ph-pencil-simple-line"></i> Não foi possível identificar os produtos automaticamente nesta nota &mdash; selecione o produto e digite os dados para registrar manualmente:</div>' +
                        '<button type="button" class="btn btn-sm btn-secondary" onclick="ceNfAddLinhaManual()" style="font-size:0.75rem;padding:3px 10px;">+ Adicionar outro produto</button>' +
                    '</div>' +
                    '<div style="background:#fff;border:1px solid #fed7aa;border-radius:8px;overflow:hidden;">' +
                        '<table class="table" style="margin:0;font-size:0.8rem;">' +
                            '<thead style="background:#fef3c7;"><tr style="font-size:0.73rem;"><th>Produto no Estoque (digite para buscar por categoria / tamanho) *</th><th>Qtd. *</th><th>Valor unit. (R$) *</th><th>Garantia (meses)</th><th style="width:38px;text-align:center;" title="Excluir linha"></th></tr></thead>' +
                            '<tbody>' + linhasMan + '</tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>';
            return;
        }

        const linhas = notaExtraidaStage.itens.map((it, idx) => {
            const vincOk = !!(it.ja_vinculado || it.estoque_id);
            return '<tr style="border-bottom:1px solid #e2e8f0;' + (vincOk ? 'background:#f0fdf4;' : '') + '">' +
                '<td style="vertical-align:middle;"><div style="font-weight:700;font-size:0.82rem;color:#1e293b;">' + esc(it.descricao) + '</div>' + (it.codigo ? '<div style="font-size:0.72rem;color:#64748b;">Cód: ' + esc(it.codigo) + '</div>' : '') + '</td>' +
                '<td style="width:340px;vertical-align:middle;">' + htmlSeletorProdutoNf(it, idx) + '</td>' +
                '<td style="width:76px;vertical-align:middle;"><input type="number" min="1" step="1" value="' + it.quantidade + '" ' + (it.ja_vinculado ? 'disabled' : '') + ' oninput="ceNfStageSet(' + idx + ',\'quantidade\',this.value)" style="' + inputCss + 'padding:5px 6px;text-align:center;"></td>' +
                '<td style="width:115px;vertical-align:middle;"><input type="number" min="0" step="0.01" value="' + it.valor_unitario + '" ' + (it.ja_vinculado ? 'disabled' : '') + ' oninput="ceNfStageSet(' + idx + ',\'valor_unitario\',this.value)" style="' + inputCss + 'padding:5px 6px;"></td>' +
                '<td style="width:85px;vertical-align:middle;"><input type="number" min="0" step="1" value="' + (it.garantia_meses || '') + '" placeholder="0" ' + (it.ja_vinculado ? 'disabled' : '') + ' oninput="ceNfStageSet(' + idx + ',\'garantia_meses\',this.value)" style="' + inputCss + 'padding:5px 6px;text-align:center;"></td>' +
                '<td style="width:38px;text-align:center;vertical-align:middle;">' +
                    (it.ja_vinculado
                        ? '<span title="Já vinculado" style="color:#16a34a;font-size:1rem;"><i class="ph ph-lock-key"></i></span>'
                        : '<button type="button" onclick="ceNfRemoverItem(' + idx + ')" title="Excluir este item (não será vinculado a nenhum produto do sistema)" style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;width:26px;height:26px;font-weight:800;font-size:0.95rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;line-height:1;">&times;</button>') +
                '</td>' +
            '</tr>';
        }).join('');

        stageEl.innerHTML =
            '<div style="margin-top:12px;border:1.5px solid #bae6fd;background:#f0f9ff;border-radius:10px;padding:10px 12px;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">' +
                    '<div style="font-weight:800;font-size:0.84rem;color:#075985;"><i class="ph ph-hand-pointing"></i> Produtos encontrados na nota fiscal (' + notaExtraidaStage.itens.length + ') &mdash; selecione o produto do estoque para vincular:</div>' +
                    '<span style="font-size:0.75rem;color:#0369a1;">Todos os produtos listados devem ser vinculados (ou clique no <b>&times;</b> para remover o item que não será vinculado).</span>' +
                '</div>' +
                '<div style="max-height:38vh;overflow-y:auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">' +
                    '<table class="table" style="margin:0;font-size:0.8rem;">' +
                        '<thead style="position:sticky;top:0;background:#f8fafc;z-index:2;"><tr style="font-size:0.73rem;"><th>Produto na Nota Fiscal</th><th>Selecione o Produto no Estoque *</th><th>Qtd.</th><th>Valor unit. (R$)</th><th>Garantia (m)</th><th style="width:38px;text-align:center;" title="Excluir item não vinculado"></th></tr></thead>' +
                        '<tbody>' + linhas + '</tbody>' +
                    '</table>' +
                '</div>' +
            '</div>';
    }
    window.ceNfAddLinhaManual = function () {
        if (!notaExtraidaStage) return;
        notaExtraidaStage.itens.push({ incluir: true, descricao: 'Registro manual', codigo: '', quantidade: 1, valor_unitario: 0, garantia_meses: 0, estoque_id: '', estoque_nome: '', estoque_categoria: '', tamanho: '', ja_vinculado: false });
        renderItensExtraidosNota();
    };
    window.ceNfStageSet = function (idx, campo, val) {
        if (!notaExtraidaStage || !notaExtraidaStage.itens[idx]) return;
        notaExtraidaStage.itens[idx][campo] = campo === 'valor_unitario' ? (parseFloat(val) || 0) : (parseInt(val, 10) || 0);
    };

    window.ceSalvarNota = async function () {
        fecharPortalDropdownNf();
        const num = $('ce-n-num').value.trim();
        const file = $('ce-n-arq').files && $('ce-n-arq').files[0];
        if (!num) return swal({ icon: 'warning', title: 'Informe o número da nota fiscal' });
        if (!file) return swal({ icon: 'warning', title: 'Anexe o arquivo da nota fiscal' });
        if (file.size > 15 * 1024 * 1024) return swal({ icon: 'warning', title: 'O arquivo deve ter no máximo 15 MB.' });
        if (notaExtraidaStage && Array.isArray(notaExtraidaStage.itens) && notaExtraidaStage.itens.length > 0) {
            const semProduto = notaExtraidaStage.itens.find(it => !it.ja_vinculado && !it.estoque_id);
            if (semProduto) {
                return swal({
                    icon: 'warning',
                    title: 'Vincule todos os produtos da nota',
                    text: 'Todos os produtos da nota devem estar vinculados a algum produto do sistema. Se algum item não for vinculado, clique no X ao lado da linha do produto para excluí-lo.'
                });
            }
            const semValor = notaExtraidaStage.itens.find(it => !it.ja_vinculado && it.estoque_id && !(it.valor_unitario > 0));
            if (semValor) {
                return swal({ icon: 'warning', title: 'Informe o valor unitário', text: 'Digite o valor unitário (maior que zero) para registrar o produto selecionado.' });
            }
        }
        try {
            swal({ title: 'Salvando nota fiscal...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const b64 = (notaExtraidaStage && notaExtraidaStage.b64) ? notaExtraidaStage.b64 : await lerArquivo(file);
            const dtEmissao = $('ce-n-data').value || hojeISO();
            const r = await api('/compras-estoque-notas', { method: 'POST', body: { numero: num, fornecedor: $('ce-n-forn').value, data_emissao: dtEmissao, valor_total: $('ce-n-valor').value, observacoes: $('ce-n-obs').value, arquivo_base64: b64, nome_arquivo: file.name } });
            const itensVincular = (notaExtraidaStage && Array.isArray(notaExtraidaStage.itens))
                ? notaExtraidaStage.itens.filter(it => (it.ja_vinculado || it.estoque_id) && it.valor_unitario > 0).map(it => ({
                    estoque_id: parseInt(it.estoque_id, 10),
                    tamanho: it.tamanho || '',
                    quantidade: Math.max(1, parseInt(it.quantidade, 10) || 1),
                    valor_unitario: it.valor_unitario,
                    garantia_meses: Math.max(0, parseInt(it.garantia_meses, 10) || 0),
                    observacao: it.descricao && it.descricao !== 'Registro manual' ? ('Item da NF: ' + it.descricao) : ''
                }))
                : [];
            if (itensVincular.length > 0 && r && r.id) {
                await api('/compras-estoque-notas/' + r.id + '/vincular', { method: 'POST', body: { itens: itensVincular, data_compra: dtEmissao, manter_existentes: true } });
                if (/\.pdf$/i.test(file.name)) {
                    for (const iv of itensVincular) {
                        const resAtual = S.resumo[iv.estoque_id] || {};
                        if (!resAtual.tem_pdf) {
                            await api('/compras-estoque/' + iv.estoque_id + '/pdf', { method: 'POST', body: { arquivo_base64: b64, nome_arquivo: file.name } }).catch(() => {});
                        }
                    }
                }
            }
            await recarregarResumoENotas();
            renderNotas();
            renderTabela();
            if (S.prodModal) await recarregarProduto();
            swal({ icon: 'success', title: 'Nota fiscal salva e vinculada!', text: itensVincular.length ? (itensVincular.length + ' item(ns) vinculados a esta nota fiscal.') : 'Nota fiscal registrada com sucesso.' });
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
