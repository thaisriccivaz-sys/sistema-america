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
    const horaOk = (h) => typeof window._horarioEventoIntervaloValido === 'function'
        ? window._horarioEventoIntervaloValido(h)
        : (/^(?:hor[aá]rio\s+)?comercial$/i.test(String(h || '').trim()) || /^\d{2}:\d{2}(?:\s*-\s*\d{2}:\d{2})?$/.test(String(h || '').trim()));
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
        if (typeof window.marcarPropostaComoEditada === 'function') window.marcarPropostaComoEditada();
        window.renderizarProdutosPropostaGrid();
    };

    /* Adiciona uma diária a um produto já adicionado (herda o horário da primeira diária) */
    window.adicionarDiaProdutoProposta = function (pIdx, iso) {
        const p = lista()[pIdx];
        iso = String(iso || '').trim();
        if (!p || !iso) return;
        if (typeof window.diaEstaDentroDoPeriodoProposta === 'function' && !window.diaEstaDentroDoPeriodoProposta(iso)) {
            const per = typeof window.obterIntervaloPeriodoProposta === 'function' ? window.obterIntervaloPeriodoProposta() : { ini: '', fim: '', valido: false };
            if (!per.valido) {
                alert('Preencha primeiro os campos Período Início * e Até * antes de selecionar os dias de evento / sucção.');
            } else {
                alert(`O Dia de Evento / Sucção deve estar dentro do Período Início (${fmtData(per.ini)}) Até (${fmtData(per.fim)}).`);
            }
            return;
        }
        if (!Array.isArray(p.dias_evento)) p.dias_evento = [];
        if (p.dias_evento.some(d => parse(d).data === iso)) { alert('Esta diária já está neste produto.'); return; }
        const base = p.dias_evento.map(parse).find(x => horaOk(x.horario));
        p.dias_evento.push(base ? `${iso} ${base.horario}` : iso);
        p.dias_evento.sort((a, b) => parse(a).data.localeCompare(parse(b).data));
        if (typeof window.marcarPropostaComoEditada === 'function') window.marcarPropostaComoEditada();
        window.renderizarProdutosPropostaGrid();
        if (window._calProdGridAbertoIdx === pIdx) window._renderCalendarioPopoverProdutoGrid();
    };

    /* Alterna (seleciona / desseleciona) uma diária no calendário do produto já adicionado */
    window.toggleDiaProdutoPropostaCalendario = function (pIdx, iso, event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        const p = lista()[pIdx];
        iso = String(iso || '').trim();
        if (!p || !iso) return;
        if (!Array.isArray(p.dias_evento)) p.dias_evento = [];
        const existIdx = p.dias_evento.findIndex(d => parse(d).data === iso);
        if (existIdx >= 0) {
            if (p.dias_evento.length <= 1) {
                alert('O produto precisa de pelo menos uma diária. Selecione outra data antes de desmarcar esta.');
                return;
            }
            p.dias_evento.splice(existIdx, 1);
        } else {
            if (typeof window.diaEstaDentroDoPeriodoProposta === 'function' && !window.diaEstaDentroDoPeriodoProposta(iso)) {
                const per = typeof window.obterIntervaloPeriodoProposta === 'function' ? window.obterIntervaloPeriodoProposta() : { ini: '', fim: '', valido: false };
                if (!per.valido) {
                    alert('Preencha primeiro os campos Período Início * e Até * antes de selecionar os dias de evento / sucção.');
                } else {
                    alert(`O Dia de Evento / Sucção deve estar dentro do Período Início (${fmtData(per.ini)}) Até (${fmtData(per.fim)}).`);
                }
                return;
            }
            const base = p.dias_evento.map(parse).find(x => horaOk(x.horario));
            p.dias_evento.push(base ? `${iso} ${base.horario}` : iso);
            p.dias_evento.sort((a, b) => parse(a).data.localeCompare(parse(b).data));
        }
        if (typeof window.marcarPropostaComoEditada === 'function') window.marcarPropostaComoEditada();
        window.renderizarProdutosPropostaGrid();
        if (window._calProdGridAbertoIdx === pIdx) window._renderCalendarioPopoverProdutoGrid();
    };

    window.fecharCalendarioDiasProdutoGrid = function (event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        window._calProdGridAbertoIdx = null;
        const pop = document.getElementById('prop-dias-produto-grid-popover');
        if (pop) pop.style.display = 'none';
    };

    window.navegarMesCalendarioProdutoGrid = function (delta, event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        const d = new Date(window._calProdGridAno || new Date().getFullYear(), (window._calProdGridMes ?? new Date().getMonth()) + delta, 1);
        window._calProdGridAno = d.getFullYear();
        window._calProdGridMes = d.getMonth();
        window._renderCalendarioPopoverProdutoGrid();
    };

    window.abrirCalendarioDiasProdutoGrid = function (pIdx, event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        if (window._calProdGridAbertoIdx === pIdx) {
            window.fecharCalendarioDiasProdutoGrid();
            return;
        }
        const p = lista()[pIdx];
        if (!p) return;
        window._calProdGridAbertoIdx = pIdx;
        const btn = event && event.currentTarget ? event.currentTarget : null;
        if (btn && typeof btn.getBoundingClientRect === 'function') {
            const r = btn.getBoundingClientRect();
            window._calProdGridAnchor = { top: r.bottom + 6, left: Math.max(12, Math.min(r.left, window.innerWidth - 376)) };
        }
        const per = typeof window.obterIntervaloPeriodoProposta === 'function'
            ? window.obterIntervaloPeriodoProposta()
            : { ini: '', fim: '' };
        const primeiraDataProd = (Array.isArray(p.dias_evento) && p.dias_evento[0]) ? parse(p.dias_evento[0]).data : '';
        const refIso = (primeiraDataProd && /^\d{4}-\d{2}-\d{2}$/.test(primeiraDataProd))
            ? primeiraDataProd
            : ((per.ini && /^\d{4}-\d{2}-\d{2}$/.test(per.ini)) ? per.ini : new Date().toISOString().slice(0, 10));
        const pts = refIso.split('-');
        window._calProdGridAno = parseInt(pts[0], 10);
        window._calProdGridMes = parseInt(pts[1], 10) - 1;
        window._renderCalendarioPopoverProdutoGrid();
    };

    window._renderCalendarioPopoverProdutoGrid = function () {
        const pIdx = window._calProdGridAbertoIdx;
        if (pIdx === null || pIdx === undefined) return;
        const p = lista()[pIdx];
        if (!p) { window.fecharCalendarioDiasProdutoGrid(); return; }
        let pop = document.getElementById('prop-dias-produto-grid-popover');
        if (!pop) {
            pop = document.createElement('div');
            pop.id = 'prop-dias-produto-grid-popover';
            pop.onclick = (ev) => ev.stopPropagation();
            pop.style.cssText = 'display:none; position:fixed; z-index:99980; width:360px; box-sizing:border-box; background:#fff; border:1px solid #cbd5e1; border-radius:10px; box-shadow:0 12px 28px rgba(15,23,42,0.22); padding:0.85rem; font-family:Inter,sans-serif;';
            document.body.appendChild(pop);
        }
        const anc = window._calProdGridAnchor || { top: 180, left: 180 };
        const maxTop = Math.max(12, window.innerHeight - 360);
        pop.style.top = Math.min(anc.top, maxTop) + 'px';
        pop.style.left = anc.left + 'px';
        pop.style.display = 'block';

        const ano = window._calProdGridAno ?? new Date().getFullYear();
        const mes = window._calProdGridMes ?? new Date().getMonth();
        const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
        const totalDiasMes = new Date(ano, mes + 1, 0).getDate();
        const selecionados = new Set((Array.isArray(p.dias_evento) ? p.dias_evento : []).map(d => parse(d).data).filter(Boolean));
        const hojeIso = new Date().toISOString().split('T')[0];
        const { ini, fim, valido } = typeof window.obterIntervaloPeriodoProposta === 'function'
            ? window.obterIntervaloPeriodoProposta()
            : { ini: '', fim: '', valido: false };

        let cellsHtml = '';
        for (let i = 0; i < primeiroDiaSemana; i++) cellsHtml += '<div></div>';
        for (let dia = 1; dia <= totalDiasMes; dia++) {
            const mm = String(mes + 1).padStart(2, '0');
            const dd = String(dia).padStart(2, '0');
            const iso = `${ano}-${mm}-${dd}`;
            const isSel = selecionados.has(iso);
            const isHoje = iso === hojeIso;
            const permitido = Boolean(valido && iso >= ini && iso <= fim);
            if (permitido) {
                cellsHtml += `<button type="button" onclick="window.toggleDiaProdutoPropostaCalendario(${pIdx}, '${iso}', event)"
                    style="width:100% !important; min-width:0 !important; padding:0 !important; height:32px !important; box-sizing:border-box !important; border-radius:6px !important; border:${isSel ? '1px solid #5b21b6' : (isHoje ? '1px solid #7048e8' : '1px solid #e2e8f0')} !important; background:${isSel ? '#7048e8' : '#f8fafc'} !important; color:${isSel ? '#fff' : '#1e293b'} !important; font-weight:${isSel || isHoje ? '700' : '500'} !important; font-size:0.8rem !important; cursor:pointer;">${dia}</button>`;
            } else {
                const msgTitle = valido
                    ? `Data fora do período permitido (${fmtData(ini)} até ${fmtData(fim)})`
                    : 'Preencha primeiro Período Início * e Até * para liberar os dias';
                cellsHtml += `<button type="button" disabled title="${esc(msgTitle)}"
                    style="width:100% !important; min-width:0 !important; padding:0 !important; height:32px !important; box-sizing:border-box !important; border-radius:6px !important; border:1px solid #f1f5f9 !important; background:#f1f5f9 !important; color:#cbd5e1 !important; font-weight:400 !important; font-size:0.8rem !important; cursor:not-allowed !important; opacity:0.55 !important; pointer-events:none !important;">${dia}</button>`;
            }
        }
        const avisoPeriodoHtml = valido
            ? `<div style="background:#f5f3ff; color:#5b21b6; border:1px solid #ddd6fe; border-radius:6px; padding:4px 8px; font-size:0.71rem; font-weight:600; margin-bottom:0.5rem; text-align:center;">Período permitido: <b>${fmtData(ini)}</b> até <b>${fmtData(fim)}</b></div>`
            : `<div style="background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; border-radius:6px; padding:5px 8px; font-size:0.72rem; font-weight:600; margin-bottom:0.5rem; text-align:center;">Preencha <b>Período Início *</b> e <b>Até *</b> para liberar os dias.</div>`;

        pop.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.45rem;">
                <button type="button" onclick="window.navegarMesCalendarioProdutoGrid(-1, event)"
                    style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; width:28px !important; height:28px !important; padding:0 !important; cursor:pointer; font-weight:700; color:#334155;">&lsaquo;</button>
                <div style="font-size:0.86rem; font-weight:800; color:#1e293b;">${nomesMeses[mes]} ${ano}</div>
                <button type="button" onclick="window.navegarMesCalendarioProdutoGrid(1, event)"
                    style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; width:28px !important; height:28px !important; padding:0 !important; cursor:pointer; font-weight:700; color:#334155;">&rsaquo;</button>
            </div>
            ${avisoPeriodoHtml}
            <div style="display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); gap:4px; text-align:center; margin-bottom:4px;">
                ${diasSemana.map(d => `<div style="font-size:0.7rem; font-weight:700; color:#64748b;">${d}</div>`).join('')}
            </div>
            <div style="display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); gap:4px; margin-bottom:0.65rem;">
                ${cellsHtml}
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; padding-top:0.5rem; border-top:1px solid #e2e8f0;">
                <input type="date" ${valido ? `min="${esc(ini)}" max="${esc(fim)}"` : 'disabled'} onchange="window.adicionarDiaProdutoProposta(${pIdx}, this.value); this.value='';"
                    title="${valido ? 'Adicionar data específica dentro do período' : 'Preencha primeiro Período Início * e Até *'}"
                    style="flex:1; padding:4px 6px; border:1px solid #cbd5e1; border-radius:5px; font-size:0.76rem; ${valido ? '' : 'background:#f1f5f9; cursor:not-allowed; opacity:0.6;'}">
                <button type="button" onclick="window.fecharCalendarioDiasProdutoGrid(event)"
                    style="background:#16a34a; color:#fff; border:none; padding:5px 12px !important; border-radius:6px; font-size:0.78rem; font-weight:700; cursor:pointer;">
                    Concluir (${selecionados.size})
                </button>
            </div>
        `;
    };

    if (!window._listenerCloseCalProdGridAdded && typeof document !== 'undefined') {
        window._listenerCloseCalProdGridAdded = true;
        document.addEventListener('click', (e) => {
            const pop = document.getElementById('prop-dias-produto-grid-popover');
            if (pop && pop.style.display === 'block' && !pop.contains(e.target)) {
                window.fecharCalendarioDiasProdutoGrid();
            }
        });
    }

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

    window.toggleDetalhesDiasProdutoGrid = function (pIdx) {
        if (!window._propDiasProdutoExpandidoMap) window._propDiasProdutoExpandidoMap = {};
        window._propDiasProdutoExpandidoMap[pIdx] = !Boolean(window._propDiasProdutoExpandidoMap[pIdx]);
        window.renderizarProdutosPropostaGrid();
    };

    /* Diárias de um produto na tabela: chips com horário editável (de ... até ... ou Horário comercial), remover, + dia e replicar */
    window.htmlDiasProdutoGrid = function (p, idx, total) {
        const dias = Array.isArray(p.dias_evento) ? p.dias_evento.filter(Boolean) : [];
        const expandido = Boolean(window._propDiasProdutoExpandidoMap && window._propDiasProdutoExpandidoMap[idx]);
        const chips = expandido ? dias.map((d, dIdx) => {
            const x = parse(d);
            const isComercial = Boolean(x.comercial || /^comercial$/i.test(String(x.horario || '').trim()));
            const hIni = isComercial ? '' : (x.horario_ini || '');
            const hFim = isComercial ? '' : (x.horario_fim || '');
            const ok = horaOk(x.horario);
            return `<span style="background:#ede9fe; color:#5b21b6; border:1px solid ${ok ? '#c4b5fd' : '#fca5a5'}; padding:2px 6px; border-radius:6px; font-size:0.72rem; font-weight:700; display:inline-flex; align-items:center; gap:4px; flex-wrap:wrap;">
                <i class="ph ph-calendar-check" style="font-size:0.78rem;"></i> ${esc(fmtData(x.data))}
                <span style="font-size:0.68rem; color:#6d28d9; font-weight:600; ${isComercial ? 'opacity:0.45;' : ''}">de</span>
                <input type="time" value="${esc(hIni)}" ${isComercial ? 'disabled' : ''} onchange="window.atualizarHorarioDiaProdutoProposta(${idx}, ${dIdx}, this.value, 'ini')" title="Horário inicial deste dia neste produto" style="border:1px solid ${isComercial ? '#cbd5e1' : (/^\d{2}:\d{2}$/.test(hIni) ? '#a78bfa' : '#ef4444')}; background:${isComercial ? '#f1f5f9' : '#fff'}; color:#1e293b; border-radius:4px; padding:0 4px; font-size:0.7rem; font-weight:700; height:20px; width:auto !important; cursor:${isComercial ? 'not-allowed' : 'pointer'}; ${isComercial ? 'opacity:0.55;' : ''}">
                <span style="font-size:0.68rem; color:#6d28d9; font-weight:600; ${isComercial ? 'opacity:0.45;' : ''}">até</span>
                <input type="time" value="${esc(hFim)}" ${isComercial ? 'disabled' : ''} onchange="window.atualizarHorarioDiaProdutoProposta(${idx}, ${dIdx}, this.value, 'fim')" title="Horário final deste dia neste produto" style="border:1px solid ${isComercial ? '#cbd5e1' : (/^\d{2}:\d{2}$/.test(hFim) ? '#a78bfa' : '#ef4444')}; background:${isComercial ? '#f1f5f9' : '#fff'}; color:#1e293b; border-radius:4px; padding:0 4px; font-size:0.7rem; font-weight:700; height:20px; width:auto !important; cursor:${isComercial ? 'not-allowed' : 'pointer'}; ${isComercial ? 'opacity:0.55;' : ''}">
                <label style="display:inline-flex; align-items:center; gap:3px; font-size:0.68rem; color:${isComercial ? '#047857' : '#5b21b6'}; background:${isComercial ? '#d1fae5' : '#f5f3ff'}; border:1px solid ${isComercial ? '#6ee7b7' : '#ddd6fe'}; padding:1px 5px; border-radius:4px; cursor:pointer; font-weight:700; user-select:none;" title="Indicar que a manutenção neste dia pode ser feita em horário comercial">
                    <input type="checkbox" ${isComercial ? 'checked' : ''} onchange="window.toggleHorarioComercialDiaProdutoProposta(${idx}, ${dIdx}, this.checked)" style="width:auto !important; height:auto !important; margin:0; accent-color:#059669; cursor:pointer;"> Horário comercial
                </label>
                <button type="button" onclick="window.removerDiaProdutoProposta(${idx}, ${dIdx})" title="Remover esta diária" style="background:transparent; border:none; color:#6d28d9; cursor:pointer; padding:0 2px !important; width:auto !important; height:auto !important; font-weight:800; font-size:0.85rem; line-height:1;">&times;</button>
            </span>`;
        }).join('') : (() => {
            if (!dias.length) return '';
            const datasOrd = dias.map(d => parse(d).data).filter(Boolean);
            const resumo = datasOrd.length > 3
                ? `${fmtData(datasOrd[0])} até ${fmtData(datasOrd[datasOrd.length - 1])}`
                : datasOrd.map(fmtData).join(', ');
            return `<span onclick="window.toggleDetalhesDiasProdutoGrid(${idx})" style="background:#ede9fe; color:#5b21b6; border:1px solid #c4b5fd; padding:2px 8px; border-radius:6px; font-size:0.72rem; font-weight:700; display:inline-flex; align-items:center; gap:5px; cursor:pointer;" title="Clique para aumentar os detalhes das diárias deste produto">
                <i class="ph ph-calendar-check" style="font-size:0.78rem;"></i> ${dias.length} diária${dias.length > 1 ? 's' : ''} (${esc(resumo)})
            </span>`;
        })();
        const semDias = dias.length === 0
            ? '<span style="color:#dc2626; font-size:0.72rem; font-weight:700;"><i class="ph ph-warning"></i> Informe a(s) diária(s) deste produto</span>'
            : '';
        const addDia = `<button type="button" title="Adicionar ou editar diárias deste produto no calendário" onclick="window.abrirCalendarioDiasProdutoGrid(${idx}, event)" style="position:relative; display:inline-flex; align-items:center; gap:3px; border:1px dashed #a78bfa; background:#fff; border-radius:6px; padding:1px 8px; height:22px; font-size:0.68rem; font-weight:700; color:#6d28d9; cursor:pointer;">
                <i class="ph ph-plus"></i> dia
            </button>`;
        return `<div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:5px; align-items:center;">${chips}${semDias}${addDia}</div>`;
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
