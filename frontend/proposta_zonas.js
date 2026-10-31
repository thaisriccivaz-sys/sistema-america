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

    /* CSS do destaque (aplicado por classe para sobreviver ao hover das linhas) */
    if (!document.getElementById('prop-zonas-css')) {
        const st = document.createElement('style');
        st.id = 'prop-zonas-css';
        st.textContent = `
            tr.prop-zona-destaque { background:#fee2e2 !important; }
            tr.prop-zona-destaque td { color:#b91c1c !important; font-weight:800 !important; }
            tr.prop-zona-destaque td:first-child { border-left:4px solid #dc2626; }
            tr.prop-zona-destaque:hover { background:#fecaca !important; }
        `;
        document.head.appendChild(st);
    }

    /* Letra da zona da proposta (V / A / C) a partir da região identificada pelo endereço */
    window.obterZonaPropostaLetra = function () {
        let r = '';
        try { r = (typeof _propRegiaoIdentificada !== 'undefined') ? _propRegiaoIdentificada : ''; } catch (e) { r = ''; }
        const n = norm(r);
        if (!n) return '';
        if (n.includes('vermelha') || n.includes('roxa')) return 'V';
        if (n.includes('amarela')) return 'A';
        if (n.includes('central')) return 'C';
        return '';
    };

    /* Extrai { zona, manut } do final do nome. Retorna null se não houver código de zona. */
    window.extrairCodigoZonaProduto = function (nome) {
        const s = String(nome || '').trim();
        const m = s.match(/(?:^|[^A-Za-z0-9])(?:[Oo0](\d{1,2})\s*[Xx]?)?Z([VvAaCc])\s*$/);
        if (!m) return null;
        return { zona: m[2].toUpperCase(), manut: m[1] !== undefined ? parseInt(m[1], 10) : null };
    };

    window.obterManutSemanaSelecionada = function () {
        const el = document.getElementById('prop-prod-manut');
        if (!el) return 0;
        const n = parseInt(el.value, 10);
        return (!isNaN(n) && n > 0) ? n : 0;
    };

    /* true quando o item deve ficar em vermelho para a proposta atual */
    window.itemDestacadoPorZona = function (nome, manutFiltro) {
        const zonaProp = window.obterZonaPropostaLetra();
        if (!zonaProp) return false;
        const cod = window.extrairCodigoZonaProduto(nome);
        if (!cod || cod.zona !== zonaProp) return false;
        const manut = manutFiltro !== undefined ? manutFiltro : window.obterManutSemanaSelecionada();
        if (manut > 0) return cod.manut === manut;
        return true;
    };

    window.classeDestaqueZona = function (nome) {
        return window.itemDestacadoPorZona(nome) ? 'prop-zona-destaque' : '';
    };

    /* Itens destacados primeiro (ordem original mantida dentro de cada grupo) */
    window.ordenarPorDestaqueZona = function (lista) {
        const arr = Array.isArray(lista) ? lista : [];
        if (!window.obterZonaPropostaLetra()) return arr;
        const dest = [], resto = [];
        arr.forEach(p => (window.itemDestacadoPorZona(p.nome) ? dest : resto).push(p));
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
