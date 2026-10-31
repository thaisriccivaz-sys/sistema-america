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
        if (grid) grid.style.gridTemplateColumns = usa ? '2fr 2.5fr 0.8fr 1fr auto' : '2fr 2.5fr 0.8fr auto';
        if (!usa) {
            const inp = document.getElementById('prop-prod-manut');
            if (inp) inp.value = '';
        }
    };
})();
