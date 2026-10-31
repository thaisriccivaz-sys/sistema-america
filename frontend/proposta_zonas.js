/* ══════════════════════════════════════════════════════════════════════
   ZONAS DE ATENDIMENTO + MANUTENÇÕES POR SEMANA
   - Código no final do nome do produto/serviço:  [O|0]NN[X]Z{V|A|C}
        O  = obra | NN = quantidade de manutenções por semana | Z + V/A/C = zona (Vermelha / Amarela / Central)
        Exemplos: "... O01XZV", "... 002XZV", "... O01ZC", "... ZA"
   - Quando a zona do endereço da proposta é identificada, os itens dessa zona ficam destacados em vermelho
     (e sobem para o topo da lista de pesquisa).
   - Campo "Quant. manut. semana": ao informar, só ficam destacados os itens da zona com esse número de manutenções.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    /* CSS do destaque: apenas fundo azul claro, mantendo a fonte original (cinza) e o valor em verde */
    if (!document.getElementById('prop-zonas-css')) {
        const st = document.createElement('style');
        st.id = 'prop-zonas-css';
        st.textContent = `
            tr.prop-zona-destaque { background:#dbeafe !important; }
            tr.prop-zona-destaque:hover { background:#bfdbfe !important; }
        `;
        document.head.appendChild(st);
    }

    /* Letra da zona da proposta (V / A / C) a partir da região identificada pelo endereço */
    window.obterZonaPropostaLetra = function () {
        let r = '';
        try { r = (typeof _propRegiaoIdentificada !== 'undefined' && _propRegiaoIdentificada) ? _propRegiaoIdentificada : (window._propRegiaoIdentificada || ''); } catch (e) { r = window._propRegiaoIdentificada || ''; }
        if (!r) {
            const badge = document.getElementById('prop-regiao-ia-badge');
            if (badge && badge.style.display !== 'none') r = badge.innerText || badge.textContent || '';
        }
        const n = norm(r);
        if (!n) return '';
        if (n.includes('vermelha') || n.includes('roxa')) return 'V';
        if (n.includes('amarela')) return 'A';
        if (n.includes('central')) return 'C';
        return '';
    };

    /* Garante que a região do endereço da proposta foi classificada antes de abrir modais de produtos/serviços */
    window.garantirRegiaoPropostaIdentificada = async function () {
        if (window.obterZonaPropostaLetra()) return;
        const end = (document.getElementById('prop-endereco')?.value || '').trim();
        if (end && typeof window.classificarRegiaoEDias === 'function') {
            try { await window.classificarRegiaoEDias(); } catch (e) {}
        }
    };

    /* Extrai { zona, manut } do nome do produto ou serviço (ex: O01XZV, 002XZC, O01ZC, ZV, ZA, ZC). */
    window.extrairCodigoZonaProduto = function (nome) {
        const s = String(nome || '').trim();
        const re = /(?:^|[^A-Za-z0-9])(?:[Oo0](\d{1,2})\s*[Xx]?)?Z([VvAaCc])(?=$|[^A-Za-z0-9])/g;
        let m, last = null;
        while ((m = re.exec(s)) !== null) {
            last = { zona: m[2].toUpperCase(), manut: m[1] !== undefined ? parseInt(m[1], 10) : null };
        }
        return last;
    };

    window.formatarManutSemanaInput = function (el) {
        if (!el) return;
        const raw = String(el.value || '');
        const prev = el.dataset.prevManut || '';
        if (prev && raw === prev.slice(0, -1)) {
            el.value = '';
            el.dataset.prevManut = '';
            return;
        }
        const d = raw.replace(/\D+/g, '').slice(-1);
        if (!d || d === '0') {
            el.value = '';
            el.dataset.prevManut = '';
            return;
        }
        el.value = `${d} x`;
        el.dataset.prevManut = el.value;
    };

    window.obterManutSemanaSelecionada = function () {
        const el = document.getElementById('prop-prod-manut');
        if (!el) return 0;
        const digits = String(el.value || '').replace(/\D+/g, '');
        const n = parseInt(digits, 10);
        return (!isNaN(n) && n > 0) ? n : 0;
    };

    /* true quando o item deve ficar destacado em azul para a proposta atual */
    window.itemDestacadoPorZona = function (nome, manutFiltro) {
        const zonaProp = window.obterZonaPropostaLetra();
        if (!zonaProp) return false;
        const cod = window.extrairCodigoZonaProduto(nome);
        if (!cod || cod.zona !== zonaProp) return false;
        const manut = manutFiltro !== undefined ? manutFiltro : window.obterManutSemanaSelecionada();
        if (manut > 0 && cod.manut !== null) return cod.manut === manut;
        return true;
    };

    window.classeDestaqueZona = function (nome, manutFiltro) {
        return window.itemDestacadoPorZona(nome, manutFiltro) ? 'prop-zona-destaque' : '';
    };

    /* Itens destacados primeiro (ordem original mantida dentro de cada grupo) */
    window.ordenarPorDestaqueZona = function (lista, manutFiltro) {
        const arr = Array.isArray(lista) ? lista : [];
        if (!window.obterZonaPropostaLetra()) return arr;
        const dest = [], resto = [];
        arr.forEach(p => (window.itemDestacadoPorZona(p.nome, manutFiltro) ? dest : resto).push(p));
        return dest.concat(resto);
    };

    /* Campo "Quant. manut. semana": somente propostas de OBRA */
    window.tipoPropostaUsaManutencoes = function (tipo) {
        const raw = tipo !== undefined ? tipo : (document.getElementById('prop-tipo')?.value || '');
        const t = String(raw || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
        return t === 'OBRA MENSAL' || t === 'OBRA QUINZENAL' || t === 'OBRA SEMANAL';
    };

    window.atualizarVisibilidadeManutencoesProposta = function (tipo) {
        const wrap = document.getElementById('prop-wrapper-manut');
        const grid = document.getElementById('prop-prod-add-grid');
        const usa = window.tipoPropostaUsaManutencoes(tipo);
        if (wrap) wrap.style.display = usa ? 'block' : 'none';
        if (grid) grid.style.gridTemplateColumns = usa ? '2fr 2.5fr 0.8fr 1fr' : '2fr 2.5fr 0.8fr';
        if (!usa) {
            const inp = document.getElementById('prop-prod-manut');
            if (inp) inp.value = '';
        }
    };

    /* ══════════════════════════════════════════════════════════════════════
       PROTEÇÃO GLOBAL CONTRA AUTOFILL DO NOME DE USUÁRIO EM CAMPOS DE FILTRO/BUSCA
       Impede que o gerenciador de senhas do navegador preencha campos de filtro/pesquisa
       com o login salvo (ex: Thais.Ricci).
       ══════════════════════════════════════════════════════════════════════ */
    const IDS_LOGIN_REAIS = new Set(['login-user', 'login-pass', 'login-username', 'login-password', 'fu-username']);
    const RE_FILTRO = /(filtro|filtrar|busca|buscar|pesq|pesquisar|search|localizar)/i;

    function obterLoginsUsuarioAtivo() {
        const set = new Set();
        const add = (v) => { const s = norm(v); if (s && s.length >= 3) set.add(s); };
        try { if (typeof window.obterNomeUsuarioLogado === 'function') add(window.obterNomeUsuarioLogado()); } catch (e) {}
        try { add(document.getElementById('user-name-display')?.textContent); } catch (e) {}
        try {
            ['erp_user', 'user', 'currentUser', 'username'].forEach(k => {
                const raw = localStorage.getItem(k);
                if (!raw) return;
                add(raw);
                try {
                    const obj = JSON.parse(raw);
                    if (obj && typeof obj === 'object') {
                        add(obj.username); add(obj.nome); add(obj.name); add(obj.login); add(obj.email);
                    }
                } catch (e) {}
            });
        } catch (e) {}
        return set;
    }

    function ehInputFiltroOuBusca(el) {
        if (!el || el.tagName !== 'INPUT') return false;
        if (IDS_LOGIN_REAIS.has(el.id)) return false;
        const t = String(el.type || 'text').toLowerCase();
        if (t === 'search') return true;
        if (t !== 'text') return false;
        const meta = `${el.id || ''} ${el.name || ''} ${el.className || ''} ${el.placeholder || ''}`;
        return RE_FILTRO.test(meta);
    }

    window.protegerCampoContraAutofill = function (el) {
        if (!el || el.tagName !== 'INPUT' || IDS_LOGIN_REAIS.has(el.id)) return;
        const t = String(el.type || 'text').toLowerCase();
        if (t === 'password') {
            el.setAttribute('autocomplete', 'new-password');
            el.setAttribute('data-lpignore', 'true');
            if (!el.dataset.pwdNofillBound) {
                el.dataset.pwdNofillBound = '1';
                if (document.activeElement !== el) el.readOnly = true;
                const unlockPwd = () => { el.readOnly = false; };
                ['mousedown', 'touchstart', 'focus', 'click', 'keydown'].forEach(ev => el.addEventListener(ev, unlockPwd, { passive: true }));
            }
            return;
        }
        if (!ehInputFiltroOuBusca(el)) return;
        el.setAttribute('autocomplete', 'new-password');
        el.setAttribute('autocorrect', 'off');
        el.setAttribute('autocapitalize', 'off');
        el.setAttribute('spellcheck', 'false');
        el.setAttribute('data-lpignore', 'true');
        el.setAttribute('data-1p-ignore', 'true');
        el.setAttribute('data-form-type', 'other');
        if (!el.name) el.name = 'nofill_' + (el.id || Math.random().toString(36).slice(2, 8));

        const limparSeAutofillUsuario = () => {
            const val = norm(el.value);
            if (!val) return;
            const logins = obterLoginsUsuarioAtivo();
            if (logins.has(val) && document.activeElement !== el) {
                el.value = '';
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        };

        if (!el.dataset.nofillFiltroBound) {
            el.dataset.nofillFiltroBound = '1';
            if (document.activeElement !== el && !el.readOnly) {
                el.readOnly = true;
            }
            const unlock = () => { if (el.readOnly) el.readOnly = false; };
            ['mousedown', 'touchstart', 'focus', 'click', 'keydown'].forEach(ev => el.addEventListener(ev, unlock, { passive: true }));
            el.addEventListener('input', limparSeAutofillUsuario);
            el.addEventListener('change', limparSeAutofillUsuario);
        }
        limparSeAutofillUsuario();
        setTimeout(limparSeAutofillUsuario, 120);
        setTimeout(limparSeAutofillUsuario, 450);
    };

    function varrerInputsAutofill(root) {
        if (!root || !root.querySelectorAll) return;
        if (root.tagName === 'INPUT') window.protegerCampoContraAutofill(root);
        root.querySelectorAll('input').forEach(window.protegerCampoContraAutofill);
    }

    if (document.body) {
        varrerInputsAutofill(document.body);
        const obs = new MutationObserver((muts) => {
            for (const m of muts) {
                m.addedNodes.forEach(n => { if (n.nodeType === 1) varrerInputsAutofill(n); });
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => varrerInputsAutofill(document.body));
    }
})();
