/* ══════════════════════════════════════════════════════════════════════
   DIÁRIAS (Dia de Evento / Sucção) POR PRODUTO — propostas do tipo EVENTO
   - O seletor de diárias fica dentro de "Produtos da Proposta" e vale para o produto que será adicionado
   - Cada produto guarda as suas próprias diárias (item.dias_evento = ['YYYY-MM-DD HH:MM', ...])
   - Replicar de forma prática:
       • "Manter estas diárias para o próximo produto" (marcado por padrão)
       • "Copiar diárias de: [produto]" carrega as diárias de um produto já adicionado no seletor
       • "Replicar em todos os produtos" na linha de cada produto
   ══════════════════════════════════════════════════════════════════════ */
(function () {
    const esc = (s) => String(s === undefined || s === null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const fmtData = (iso) => String(iso).includes('-') ? String(iso).split('-').reverse().join('/') : iso;
    const fmtCurta = (iso) => String(iso).includes('-') ? String(iso).split('-').reverse().slice(0, 2).join('/') : iso;
    const horaOk = (h) => /^\d{2}:\d{2}$/.test(String(h || ''));
    const parse = (d) => window._parseDiasEventoItem(d);
    const nomeProduto = (p) => String(p.produto || p.descricao || '').replace(/^\d+\s*-\s*/, '').trim();
    const lista = () => (window._propProdutosAdicionados || []);
    const montar = (datas, horarios) => [...new Set(datas)].sort().map(iso => horarios[iso] ? `${iso} ${horarios[iso]}` : iso);

    window.manterDiasProximoProduto = function () {
        const el = document.getElementById('prop-dias-manter');
        return el ? !!el.checked : true;
    };

    /* Atualiza a lista "Copiar diárias de:" com os produtos que já têm diárias */
    window.atualizarOpcoesCopiarDiasProposta = function () {
        const sel = document.getElementById('prop-dias-copiar-de');
        const wrap = document.getElementById('prop-dias-copiar-wrap');
        if (!sel) return;
        const opcoes = [];
        lista().forEach((p, i) => {
            const dias = Array.isArray(p.dias_evento) ? p.dias_evento.filter(Boolean) : [];
            if (!dias.length) return;
            const resumo = dias.slice(0, 4).map(d => fmtCurta(parse(d).data)).join(', ') + (dias.length > 4 ? '…' : '');
            opcoes.push(`<option value="${i}">${i + 1}. ${esc(nomeProduto(p))} — ${dias.length} diária${dias.length > 1 ? 's' : ''} (${esc(resumo)})</option>`);
        });
        sel.innerHTML = '<option value="">Selecione um produto...</option>' + opcoes.join('');
        if (wrap) wrap.style.display = opcoes.length ? 'flex' : 'none';
    };

    /* Carrega no seletor as diárias (datas e horários) de um produto já adicionado */
    window.copiarDiasDeProdutoProposta = function (idx) {
        if (idx === '' || idx === null || idx === undefined) return;
        const p = lista()[parseInt(idx, 10)];
        if (!p) return;
        const dias = Array.isArray(p.dias_evento) ? p.dias_evento.filter(Boolean) : [];
        if (!dias.length) { alert('Este produto ainda não tem diárias para copiar.'); return; }
        const datas = [], horarios = {};
        dias.forEach(d => { const x = parse(d); if (x.data) { datas.push(x.data); if (x.horario) horarios[x.data] = x.horario; } });
        window._propDiasEventoSelecionados = [...new Set(datas)].sort();
        window._propDiasEventoHorarios = horarios;
        const ultimo = Object.values(horarios).pop();
        window._ultimoHorarioDiaEventoEditado = ultimo || '';
        window.renderizarDiasEventoProposta(false);
        if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso(`Diárias copiadas de "${nomeProduto(p)}". Agora é só adicionar o produto.`);
    };

    window.removerDiaProdutoProposta = function (pIdx, dIdx) {
        const p = lista()[pIdx];
        if (!p || !Array.isArray(p.dias_evento)) return;
        if (p.dias_evento.length <= 1) {
            alert('O produto precisa de pelo menos uma diária. Para trocar, adicione a nova diária antes de remover esta.');
            return;
        }
        p.dias_evento.splice(dIdx, 1);
        window.renderizarProdutosPropostaGrid();
    };

    /* Adiciona uma diária a um produto já adicionado (herda o horário da primeira diária) */
    window.adicionarDiaProdutoProposta = function (pIdx, iso) {
        const p = lista()[pIdx];
        iso = String(iso || '').trim();
        if (!p || !iso) return;
        if (!Array.isArray(p.dias_evento)) p.dias_evento = [];
        if (p.dias_evento.some(d => parse(d).data === iso)) { alert('Esta diária já está neste produto.'); return; }
        const base = p.dias_evento.map(parse).find(x => horaOk(x.horario));
        p.dias_evento.push(base ? `${iso} ${base.horario}` : iso);
        p.dias_evento.sort((a, b) => parse(a).data.localeCompare(parse(b).data));
        window.renderizarProdutosPropostaGrid();
    };

    /* Aplica as diárias de um produto a todos os outros produtos da proposta */
    window.replicarDiasProdutoParaTodos = function (pIdx) {
        const itens = lista();
        const origem = itens[pIdx];
        if (!origem || !Array.isArray(origem.dias_evento) || !origem.dias_evento.length) return;
        const outros = itens.length - 1;
        if (outros <= 0) return;
        if (!confirm(`Aplicar as diárias de "${nomeProduto(origem)}" aos outros ${outros} produto(s)? As diárias atuais deles serão substituídas.`)) return;
        itens.forEach((p, i) => { if (i !== pIdx) p.dias_evento = [...origem.dias_evento]; });
        window.renderizarProdutosPropostaGrid();
        if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso(`Diárias replicadas em ${outros} produto(s).`);
    };

    /* Diárias de um produto na tabela: chips com horário editável, remover, + dia e replicar */
    window.htmlDiasProdutoGrid = function (p, idx, total) {
        const dias = Array.isArray(p.dias_evento) ? p.dias_evento.filter(Boolean) : [];
        const chips = dias.map((d, dIdx) => {
            const x = parse(d);
            const ok = horaOk(x.horario);
            return `<span style="background:#ede9fe; color:#5b21b6; border:1px solid ${ok ? '#c4b5fd' : '#fca5a5'}; padding:2px 6px; border-radius:6px; font-size:0.72rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                <i class="ph ph-calendar-check" style="font-size:0.78rem;"></i> ${esc(fmtData(x.data))}
                <input type="time" value="${esc(x.horario)}" onchange="window.atualizarHorarioDiaProdutoProposta(${idx}, ${dIdx}, this.value)" title="Horário deste dia neste produto" style="border:1px solid ${ok ? '#a78bfa' : '#ef4444'}; background:#fff; color:#1e293b; border-radius:4px; padding:0 4px; font-size:0.7rem; font-weight:700; height:20px; width:auto !important; cursor:pointer;">
                <button type="button" onclick="window.removerDiaProdutoProposta(${idx}, ${dIdx})" title="Remover esta diária" style="background:transparent; border:none; color:#6d28d9; cursor:pointer; padding:0 2px !important; width:auto !important; height:auto !important; font-weight:800; font-size:0.85rem; line-height:1;">&times;</button>
            </span>`;
        }).join('');
        const semDias = dias.length === 0
            ? '<span style="color:#dc2626; font-size:0.72rem; font-weight:700;"><i class="ph ph-warning"></i> Informe a(s) diária(s) deste produto</span>'
            : '';
        const addDia = `<label title="Adicionar outra diária a este produto" onclick="const i=this.querySelector('input'); try{ i.showPicker(); }catch(e){}" style="position:relative; display:inline-flex; align-items:center; gap:3px; border:1px dashed #a78bfa; border-radius:6px; padding:1px 8px; font-size:0.68rem; font-weight:700; color:#6d28d9; cursor:pointer; overflow:hidden;">
                <i class="ph ph-plus"></i> dia
                <input type="date" onchange="window.adicionarDiaProdutoProposta(${idx}, this.value); this.value='';" style="position:absolute; left:0; top:0; width:100%; height:100%; opacity:0; cursor:pointer; padding:0; margin:0; border:none;">
            </label>`;
        const replicar = (total > 1 && dias.length)
            ? `<button type="button" onclick="window.replicarDiasProdutoParaTodos(${idx})" title="Aplicar estas diárias a todos os outros produtos" style="background:#eef2ff; color:#4f46e5; border:1px solid #c7d2fe; border-radius:6px; padding:1px 8px; font-size:0.68rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:3px; width:auto !important; height:auto !important;"><i class="ph ph-copy"></i> Replicar em todos os produtos</button>`
            : '';
        return `<div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:5px; align-items:center;">${chips}${semDias}${addDia}${replicar}</div>`;
    };

    /* Diárias da proposta = união das diárias de todos os produtos (campo propostas.dias_evento) */
    window.obterDiasEventoUniaoProposta = function () {
        const mapa = {};
        lista().forEach(p => {
            (Array.isArray(p.dias_evento) ? p.dias_evento : []).forEach(d => {
                const x = parse(d);
                if (!x.data) return;
                if (!(x.data in mapa) || (!mapa[x.data] && x.horario)) mapa[x.data] = x.horario || '';
            });
        });
        const datas = Object.keys(mapa);
        if (!datas.length && typeof window.obterDiasEventoComHorariosAtuais === 'function') return window.obterDiasEventoComHorariosAtuais();
        return montar(datas, mapa);
    };

    /* Propostas antigas: produtos sem diárias herdam as diárias que estavam no nível da proposta */
    window.migrarDiasEventoLegadoParaProdutos = function (prop) {
        const info = window._parseDiasEventoLista(prop ? prop.dias_evento : null);
        const legado = montar(info.datas, info.horarios);
        if (!legado.length) return;
        lista().forEach(p => {
            if (!Array.isArray(p.dias_evento) || p.dias_evento.length === 0) p.dias_evento = [...legado];
        });
    };
})();
