// ═══════════════════════════════════════════════════════════════════════════
// APP › Liderança › Resumo da Rota (Operacional / Mobile-First)
// Baseado na imagem exportada do Resumo da Rota (Anexo 1):
// - Cabeçalho verde AMÉRICA RENTAL — Resumo de Rota — [Dia da semana, Data]
// - Escala Diurna e Escala Noturna dos líderes no dia (mostra o líder responsável
//   pela escala do dia e quem realizou o checklist quando realizado)
// - Cards por veículo com placa/modelo, fotos circulares de Motorista, Ajudante e Candidato
// - Checks manuais nas Observações de rota e nos Insumos de Manutenção
// - Checks automáticos nas Entregas (via menu Entregas) e Retiradas (via menu Retiradas)
// ═══════════════════════════════════════════════════════════════════════════
(function () {
    'use strict';

    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const MESES_MIN = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const DIAS_EXTENSO = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    const S = {
        data: hojeISO(),
        resumoId: null,
        turno: null, // 'diurno' | 'noturno'
        modoAgenda: 'semana',
        cursor: new Date(),
        filtro: 'todos', // todos | pendentes | concluidos | faltas | disponiveis
        filtroTurnoDisp: 'todos', // todos | diurno | noturno
        busca: '',
        dadosDia: null,
        diasAgenda: {},
        carregando: false
    };

    function tok() {
        return window.currentToken
            || (typeof currentToken !== 'undefined' ? currentToken : '')
            || localStorage.getItem('erp_token')
            || localStorage.getItem('rh_token')
            || localStorage.getItem('token')
            || '';
    }
    function hdr(json) {
        const h = { 'Authorization': 'Bearer ' + tok() };
        if (json) h['Content-Type'] = 'application/json';
        return h;
    }
    async function api(url, opt) {
        const r = await fetch(url, Object.assign({ headers: hdr(opt && opt.body) }, opt || {}));
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || ('Erro HTTP ' + r.status));
        return j;
    }

    function hojeISO() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    function iso(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    function parseISO(s) {
        const p = String(s || '').split('-').map(Number);
        return p.length === 3 ? new Date(p[0], p[1] - 1, p[2]) : new Date();
    }
    function fmtBR(s) {
        if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || '';
        const [y, m, d] = s.split('-');
        return `${d}/${m}/${y}`;
    }
    function fmtDataHora(s) {
        if (!s) return '';
        const str = String(s).replace(' ', 'T') + (String(s).includes('Z') || String(s).includes('T') ? '' : 'Z');
        const d = new Date(str);
        return isNaN(d.getTime()) ? String(s) : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }
    function fmtDataExtenso(s) {
        const dt = parseISO(s);
        if (isNaN(dt.getTime())) return fmtBR(s);
        return `${DIAS_EXTENSO[dt.getDay()]}, ${dt.getDate()} de ${MESES_MIN[dt.getMonth()]} de ${dt.getFullYear()}`;
    }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function normBusca(s) {
        return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    }
    function iniciais(n) {
        const p = String(n || '?').trim().split(/\s+/);
        return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
    }
    function vibrar(ms) { try { navigator.vibrate && navigator.vibrate(ms || 18); } catch (_) {} }

    function formatarTextoObsHtml(txt) {
        const limpo = esc(txt || '');
        const idx = limpo.indexOf(':');
        if (idx > 0 && idx < 65) {
            const antes = limpo.slice(0, idx + 1);
            const depois = limpo.slice(idx + 1);
            return `<strong>${antes}</strong>${depois}`;
        }
        return limpo;
    }

    function statsVeiculo(v) {
        let total = 0;
        let concluidos = 0;
        (v.observacoes || []).forEach(o => {
            if (o.tem_check === false) return;
            total++;
            if (o.checked) concluidos++;
        });
        const entComCk = (v.entregas || []).filter(it => it.status !== 'sem_checklist');
        const retComCk = (v.retiradas || []).filter(it => it.status !== 'sem_checklist');
        const stCk = v.status_ent_ret_veiculo || {};
        const todosCkCompletos = stCk.todos_completos != null
            ? !!stCk.todos_completos
            : ((entComCk.length + retComCk.length > 0) && entComCk.every(e => e.checked) && retComCk.every(r => r.checked));
        if (entComCk.length > 0) {
            total++;
            if (todosCkCompletos) concluidos++;
        }
        if (retComCk.length > 0) {
            total++;
            if (todosCkCompletos) concluidos++;
        }
        (v.manutencoes || []).forEach(it => {
            (it.insumos || []).forEach(ins => {
                total++;
                if (ins.checked) concluidos++;
            });
        });
        return {
            total,
            concluidos,
            pendentes: Math.max(0, total - concluidos),
            completo: total === 0 || concluidos >= total
        };
    }

    function statsGeral(veiculos) {
        let total = 0;
        let concluidos = 0;
        let veicConcluidos = 0;
        let veicPendentes = 0;
        (veiculos || []).forEach(v => {
            const st = statsVeiculo(v);
            total += st.total;
            concluidos += st.concluidos;
            if (st.completo) veicConcluidos++;
            else veicPendentes++;
        });
        return {
            total,
            concluidos,
            pendentes: Math.max(0, total - concluidos),
            veicTotal: (veiculos || []).length,
            veicConcluidos,
            veicPendentes
        };
    }

    // ═══════════════ Carregamento de dados ═══════════════
    async function carregar(silencioso) {
        const root = document.getElementById('app-lideranca-resumo-rota-container');
        if (!root) return;
        S.carregando = true;
        if (!silencioso) {
            root.innerHTML = `<div class="alc-wrap arr-wrap"><div class="alc-loading"><i class="ph ph-spinner ph-spin"></i> Carregando resumo da rota...</div></div>`;
        }
        try {
            let url = `/api/app/resumo-rota?data=${encodeURIComponent(S.data)}`;
            if (S.resumoId) url += `&resumo_id=${encodeURIComponent(S.resumoId)}`;
            if (S.turno) url += `&turno=${encodeURIComponent(S.turno)}`;
            const r = await api(url);
            S.dadosDia = r;
            S.diasAgenda = r.dias_agenda || {};
            if (r.resumo_ativo && r.resumo_ativo.id) {
                S.resumoId = r.resumo_ativo.id;
            }
            if (r.turno_ativo) {
                S.turno = r.turno_ativo;
            }
            S.carregando = false;
            renderLista();
        } catch (e) {
            S.carregando = false;
            root.innerHTML = `<div class="alc-wrap arr-wrap"><div class="alc-erro"><i class="ph ph-warning-circle"></i>${esc(e.message)}<button class="alc-btn alc-btn-primary" id="arr-retry"><i class="ph ph-arrow-clockwise"></i> Tentar novamente</button></div></div>`;
            const b = document.getElementById('arr-retry');
            if (b) b.onclick = () => carregar(false);
        }
    }

    // ═══════════════ Renderização Principal ═══════════════
    function renderLista() {
        const root = document.getElementById('app-lideranca-resumo-rota-container');
        if (!root) return;

        const buscaAtiva = document.activeElement && document.activeElement.id === 'arr-busca-input';
        const posCursor = buscaAtiva ? document.activeElement.selectionStart : null;

        const dDia = S.dadosDia || {};
        const todosVeiculos = dDia.veiculos || [];
        const escalaDia = dDia.escala_dia || {};
        const turnoAtivo = S.turno || dDia.turno_ativo || 'diurno';
        const geral = statsGeral(todosVeiculos);
        const colabDispInfo = dDia.colaboradores_disponiveis || { total: 0, todos: [], diurno: [], noturno: [], motoristas: [], ajudantes_geral: [], ajudantes_patio: [] };
        const faltasDiaList = dDia.faltas_dia || [];
        const totalDisponiveis = Number(colabDispInfo.total || (colabDispInfo.todos || []).length || 0);
        const totalFaltas = faltasDiaList.length;

        const q = normBusca(S.busca);
        const veiculosFiltrados = todosVeiculos.filter(v => {
            const st = statsVeiculo(v);
            if (S.filtro === 'pendentes' && st.completo) return false;
            if (S.filtro === 'concluidos' && !st.completo) return false;
            if (!q) return true;
            const textos = [
                v.veiculo,
                v.motorista?.nome,
                v.ajudante?.nome,
                ...(v.candidatos || []).map(c => c.nome),
                ...(v.observacoes || []).map(o => o.texto),
                ...(v.entregas || []).map(i => i.texto),
                ...(v.retiradas || []).map(i => i.texto),
                ...(v.manutencoes || []).map(i => i.texto)
            ].map(normBusca).join(' ');
            return textos.includes(q);
        });

        root.innerHTML = `
        <div class="alc-wrap arr-wrap">
            <header class="alc-head">
                <button class="alc-icon-btn alc-only-mobile" id="arr-menu" title="Menu"><i class="ph ph-list"></i></button>
                <div class="alc-head-title">
                    <i class="ph ph-map-trifold"></i>
                    <div>
                        <h2>Resumo da Rota</h2>
                        <span>Checks de rota, entregas, retiradas e insumos</span>
                    </div>
                </div>
                <button class="alc-icon-btn" id="arr-refresh" title="Atualizar"><i class="ph ph-arrow-clockwise"></i></button>
            </header>

            <div class="alr-busca" style="margin:0 0 12px;">
                <i class="ph ph-magnifying-glass"></i>
                <input type="search" id="arr-busca-input" placeholder="Pesquisar placa, motorista, ajudante, cliente ou equipamento..." value="${esc(S.busca)}" autocomplete="off">
                ${S.busca ? `<button class="alr-busca-x" id="arr-busca-limpar" title="Limpar"><i class="ph ph-x-circle"></i></button>` : ''}
            </div>

            ${renderAgenda()}

            ${renderPainelEscalaLideres(escalaDia, turnoAtivo)}

            <div class="alr-filtros">
                <button class="alc-chip alr-chip ${S.filtro === 'todos' ? 'on' : ''}" data-f="todos">
                    <i class="ph ph-truck"></i> Todos <b class="alr-n" style="background:#475569">${geral.veicTotal}</b>
                </button>
                <button class="alc-chip alr-chip ${S.filtro === 'pendentes' ? 'on' : ''}" data-f="pendentes">
                    <i class="ph ph-clock-countdown"></i> Pendentes <b class="alr-n" style="background:#dc2626">${geral.veicPendentes}</b>
                </button>
                <button class="alc-chip alr-chip ${S.filtro === 'concluidos' ? 'on' : ''}" data-f="concluidos">
                    <i class="ph ph-check-circle"></i> Concluídos <b class="alr-n" style="background:#16a34a">${geral.veicConcluidos}</b>
                </button>
                <button class="alc-chip alr-chip ${S.filtro === 'faltas' ? 'on' : ''}" data-f="faltas" title="Faltas registradas no dia">
                    <i class="ph ph-calendar-x"></i> Faltas <b class="alr-n" style="background:#dc2626">${totalFaltas}</b>
                </button>
                <button class="alc-chip alr-chip ${S.filtro === 'disponiveis' ? 'on' : ''}" data-f="disponiveis" title="Colaboradores Disponíveis para Trabalho (Fora de Rota)">
                    <i class="ph ph-users-three"></i> Colaboradores Disponíveis <b class="alr-n" style="background:#0284c7">${totalDisponiveis}</b>
                </button>
            </div>

            <!-- Banner Verde idêntico ao Anexo 1 -->
            <div class="arr-banner">
                <div class="arr-banner-left">
                    <div class="arr-banner-brand">AMÉRICA RENTAL</div>
                    <div class="arr-banner-sub">
                        Resumo de Rota — ${esc(fmtDataExtenso(S.data))}
                        • <b>${turnoAtivo === 'noturno' ? '🌙 Checklist Escala Noturna' : '☀️ Checklist Escala Diurna'}</b>
                    </div>
                </div>
                <div class="arr-banner-right">
                    <div class="arr-banner-prog" title="Quantidade de Colaboradores Disponíveis para Trabalho (Fora de Rota)">
                        <i class="ph-fill ph-users-three"></i>
                        <span>${totalDisponiveis} disponíveis</span>
                    </div>
                    <div class="arr-banner-prog">
                        <i class="ph-fill ph-check-circle"></i>
                        <span id="arr-banner-prog-txt">${geral.concluidos} / ${geral.total} checks</span>
                    </div>
                </div>
            </div>

            <div id="arr-cards-list">
                ${S.filtro === 'disponiveis'
                    ? renderPainelColaboradoresDisponiveis(colabDispInfo, q)
                    : (S.filtro === 'faltas'
                        ? renderPainelFaltasDia(faltasDiaList, q)
                        : (todosVeiculos.length === 0
                            ? `<div class="alc-vazio">
                                <i class="ph ph-map-trifold"></i>
                                <p>Nenhum Resumo de Rota salvo para <b>${fmtBR(S.data)}</b>.</p>
                                <small style="color:#64748b;">Gere ou salve o Resumo da Rota na tela de Logística para visualizá-lo aqui.</small>
                               </div>`
                            : (veiculosFiltrados.length === 0
                                ? `<div class="alc-vazio"><i class="ph ph-magnifying-glass"></i><p>Nenhum veículo encontrado para este filtro.</p></div>`
                                : veiculosFiltrados.map(v => renderCardVeiculo(v, turnoAtivo, escalaDia)).join(''))))
                }
            </div>
        </div>`;

        bindEventosLista();

        if (buscaAtiva) {
            const inp = document.getElementById('arr-busca-input');
            if (inp) {
                inp.focus();
                try { if (posCursor != null) inp.setSelectionRange(posCursor, posCursor); } catch (_) {}
            }
        }
    }

    function renderAvatarMini(pessoa, sizePx) {
        const sz = sizePx || 24;
        const nome = (pessoa && (pessoa.nome_curto || pessoa.nome)) || 'Líder';
        const ini = esc(iniciais(nome));
        const url = pessoa && (pessoa.foto_url || (pessoa.colab_id ? `/api/colaboradores/foto/${pessoa.colab_id}` : null));
        const inner = url
            ? `<img src="${esc(url)}" alt="${esc(nome)}" onerror="this.outerHTML='<span>${ini}</span>'">`
            : `<span>${ini}</span>`;
        return `<span class="arr-mini-av" style="width:${sz}px;height:${sz}px;">${inner}</span>`;
    }

    function renderPessoasChips(lista, sizePx) {
        const arr = Array.isArray(lista) ? lista.filter(p => p && (p.nome_curto || p.nome)) : [];
        if (!arr.length) return '';
        return `<span class="arr-lider-chips">${arr.map(p => {
            const n = p.nome_curto || p.nome;
            return `<span class="arr-lider-chip">${renderAvatarMini(p, sizePx || 24)}<b>${esc(n)}</b></span>`;
        }).join('')}</span>`;
    }

    function renderPainelEscalaLideres(escalaDia, turnoAtivo) {
        const diu = escalaDia.diurno || { nomes: '—', escalados: [], folga: [], progresso: { feitos: 0, total: 0 }, realizado_por: [] };
        const not = escalaDia.noturno || { nomes: '—', escalados: [], folga: [], progresso: { feitos: 0, total: 0 }, realizado_por: [] };

        function cardTurno(chave, icone, titulo, dadosTurno) {
            const ativo = turnoAtivo === chave;
            const prog = dadosTurno.progresso || { feitos: 0, total: 0, concluido: false };
            const real = dadosTurno.realizado_por || [];
            const escalados = dadosTurno.escalados || [];
            const folgaList = dadosTurno.folga || [];
            const emFerias = folgaList.filter(f => f.em_ferias);
            const emFolgaNormal = folgaList.filter(f => !f.em_ferias);

            const respHtml = escalados.length > 0
                ? renderPessoasChips(escalados, 26)
                : `<b>${esc(dadosTurno.nomes || '—')}</b>`;

            const realHtml = real.length > 0
                ? `<span class="arr-real-wrap">Realizado por: ${renderPessoasChips(real, 24)}${real[0].atualizado_em ? `<small class="arr-real-dt">(${esc(fmtDataHora(real[0].atualizado_em))})</small>` : ''}</span>`
                : `<span>Ainda não realizado neste turno</span>`;

            return `
            <button type="button" class="arr-escala-card ${chave} ${ativo ? 'on' : ''}" data-turno="${chave}">
                <div class="arr-escala-top">
                    <span class="arr-escala-tit">${icone} ${titulo}</span>
                    <span class="alc-badge ${prog.concluido ? 'verde' : (prog.feitos > 0 ? 'laranja' : 'cinza')}">
                        ${prog.feitos}/${prog.total}
                    </span>
                </div>
                <div class="arr-escala-resp">
                    <span class="arr-escala-lbl">Responsável (Escala):</span>
                    ${respHtml}
                    ${emFerias.length ? `<small style="display:block;color:#d97706;margin-top:3px;">🏖️ Férias: ${esc(emFerias.map(f => f.nome_curto || f.nome).join(', '))}</small>` : ''}
                    ${emFolgaNormal.length ? `<small style="display:block;color:#94a3b8;margin-top:2px;">Folga no dia: ${esc(emFolgaNormal.map(f => f.nome_curto || f.nome).join(', '))}</small>` : ''}
                </div>
                <div class="arr-escala-real ${real.length > 0 ? '' : 'pend'}">
                    <i class="ph-fill ${real.length > 0 ? 'ph-check-circle' : 'ph-clock'}"></i>
                    ${realHtml}
                </div>
            </button>`;
        }

        return `
        <div class="arr-escala-grid">
            ${cardTurno('diurno', '☀️', 'Escala Diurna', diu)}
            ${cardTurno('noturno', '🌙', 'Escala Noturna', not)}
        </div>`;
    }

    function renderAgenda() {
        const c = S.cursor;
        const titulo = `${MESES[c.getMonth()]} ${c.getFullYear()}`;
        let grade = '';
        if (S.modoAgenda === 'semana') {
            const ini = new Date(c);
            ini.setDate(c.getDate() - c.getDay());
            grade = `<div class="alc-semana">` + Array.from({ length: 7 }, (_, i) => {
                const d = new Date(ini);
                d.setDate(ini.getDate() + i);
                return celulaDia(d, true);
            }).join('') + `</div>`;
        } else {
            const ano = c.getFullYear(), mes = c.getMonth();
            const prim = new Date(ano, mes, 1), ult = new Date(ano, mes + 1, 0);
            const cel = [];
            for (let i = 0; i < prim.getDay(); i++) cel.push('<div></div>');
            for (let d = 1; d <= ult.getDate(); d++) cel.push(celulaDia(new Date(ano, mes, d), false));
            grade = `<div class="alc-mes">${DIAS_CURTOS.map(d => `<div class="alc-mes-dow">${d}</div>`).join('')}${cel.join('')}</div>`;
        }
        return `
        <section class="alc-agenda">
            <div class="alc-agenda-top">
                <button class="alc-icon-btn sm" id="arr-prev"><i class="ph ph-caret-left"></i></button>
                <div class="alc-agenda-titulo"><i class="ph ph-calendar-blank"></i> ${titulo}</div>
                <button class="alc-icon-btn sm" id="arr-next"><i class="ph ph-caret-right"></i></button>
                <button class="alc-chip" id="arr-hoje">Hoje</button>
                <button class="alc-chip ${S.modoAgenda === 'mes' ? 'on' : ''}" id="arr-modo">
                    <i class="ph ${S.modoAgenda === 'mes' ? 'ph-rows' : 'ph-squares-four'}"></i>
                    ${S.modoAgenda === 'mes' ? 'Semana' : 'Mês'}
                </button>
            </div>
            ${grade}
            <div class="alr-datapick">
                <i class="ph ph-calendar"></i>
                <label for="arr-date">Data da rota:</label>
                <input type="date" id="arr-date" value="${esc(S.data)}">
            </div>
        </section>`;
    }

    function celulaDia(d, mostrarDow) {
        const k = iso(d);
        const infoDia = S.diasAgenda[k];
        const qtd = infoDia ? infoDia.qtd_resumos : 0;
        const sel = S.data === k;
        const ehHoje = k === hojeISO();
        return `<button class="alc-dia ${sel ? 'sel' : ''} ${ehHoje ? 'hoje' : ''} ${qtd ? 'tem' : ''}" data-dia="${k}">
            ${mostrarDow ? `<span class="alc-dia-dow">${DIAS_CURTOS[d.getDay()]}</span>` : ''}
            <span class="alc-dia-num">${d.getDate()}</span>
            ${qtd ? `<span class="alc-dia-badge">${qtd}</span>` : ''}
        </button>`;
    }

    function renderCrewMember(pessoa, tipoClass, cargoLabel, veiculoObj) {
        if (!pessoa || !pessoa.nome || pessoa.nome === '—') return '';
        const ini = esc(iniciais(pessoa.nome));
        const inner = pessoa.foto_url
            ? `<img src="${esc(pessoa.foto_url)}" alt="" onerror="this.outerHTML='<span class=\\'arr-ring-fb\\'>${ini}</span>'">`
            : `<span class="arr-ring-fb">${ini}</span>`;

        if (tipoClass === 'cand') {
            return `
            <div class="arr-crew-item">
                <div class="arr-ring ${tipoClass}">
                    <div class="arr-ring-in">${inner}</div>
                </div>
                <div class="arr-crew-info">
                    <div class="arr-crew-name">${esc(pessoa.nome)}</div>
                    <div class="arr-crew-role cand">${esc(cargoLabel)}</div>
                </div>
            </div>`;
        }

        const papel = tipoClass === 'mot' ? 'motorista' : 'ajudante';
        const stPres = pessoa.status_presenca || '';
        const pillHtml = stPres === 'trabalhou'
            ? `<span class="arr-presenca-pill ok"><i class="ph-fill ph-check-circle"></i> Trabalhando</span>`
            : (stPres === 'falta'
                ? `<span class="arr-presenca-pill falta"><i class="ph-fill ph-x-circle"></i> Teve Falta</span>`
                : `<span class="arr-presenca-pill pend"><i class="ph ph-hand-tap"></i> Presença / Falta</span>`);

        const substHtml = pessoa.substituiu_nome
            ? `<span class="arr-subst-tag" title="Substituiu ${esc(pessoa.substituiu_nome)} que teve falta"><i class="ph ph-arrows-left-right"></i> Subst.: ${esc(pessoa.substituiu_nome)}</span>`
            : '';

        return `
        <button type="button" class="arr-crew-item arr-crew-clickable ${stPres === 'falta' ? 'is-falta' : (stPres === 'trabalhou' ? 'is-ok' : '')}"
            data-action="open-presenca-colab"
            data-origem="rota"
            data-veiculo-key="${esc((veiculoObj && veiculoObj.veiculo_key) || '')}"
            data-veiculo-nome="${esc((veiculoObj && veiculoObj.veiculo) || '')}"
            data-papel="${papel}"
            data-colab-id="${esc(pessoa.colab_id || '')}"
            data-colab-nome="${esc(pessoa.nome)}"
            data-colab-cargo="${esc(pessoa.departamento_label || cargoLabel)}"
            data-colab-categoria="${esc(pessoa.categoria_servico || (papel === 'motorista' ? 'motorista' : 'ajudante'))}"
            data-colab-foto="${esc(pessoa.foto_url || '')}"
            data-status-presenca="${esc(stPres)}"
            data-avisado="${esc(pessoa.avisado_previamente || 'Não')}"
            data-obs-falta="${esc(pessoa.observacao_falta || '')}"
            title="Toque para marcar se foi trabalhar ou se teve falta">
            <div class="arr-ring ${tipoClass}">
                <div class="arr-ring-in">${inner}</div>
            </div>
            <div class="arr-crew-info">
                <div class="arr-crew-name">${esc(pessoa.nome)}</div>
                <div class="arr-crew-role">${esc(pessoa.departamento_label || cargoLabel)}</div>
                ${pillHtml}
                ${substHtml}
            </div>
        </button>`;
    }

    function renderCardVeiculo(v, turnoAtivo, escalaDia) {
        const st = statsVeiculo(v);
        const badgeCls = st.total === 0 ? 'cinza' : (st.completo ? 'verde' : (st.concluidos > 0 ? 'laranja' : 'vermelho'));
        const badgeTxt = st.total === 0 ? 'Sem itens' : (st.completo ? `Concluído (${st.concluidos}/${st.total})` : `${st.concluidos}/${st.total} OK`);

        const realizadoPor = v.realizado_por || [];

        const realizadoBarHtml = realizadoPor.length > 0
            ? `${renderPessoasChips(realizadoPor, 22)}${realizadoPor[0].atualizado_em ? ` <small class="arr-real-dt">(${esc(fmtDataHora(realizadoPor[0].atualizado_em))})</small>` : ''}`
            : `<b>Não feito</b>`;

        // Equipe: Motorista, Ajudante Geral e Candidato(s) se tiver
        const crewHtml = [
            renderCrewMember(v.motorista, 'mot', v.motorista?.cargo || 'Motorista', v),
            renderCrewMember(v.ajudante, 'aju', v.ajudante?.cargo || 'Ajudante Geral', v),
            ...(v.candidatos || []).map(c => renderCrewMember(c, 'cand', c.cargo || 'Candidato em Teste', v))
        ].filter(Boolean).join('') || `<div style="font-size:0.8rem;color:#94a3b8;">Sem equipe definida</div>`;

        const dataRotaIso = (S.dadosDia && S.dadosDia.data) || S.data || '';
        const rotaAtrasada = !!(dataRotaIso && dataRotaIso >= '2026-12-01' && dataRotaIso < hojeISO());

        // 1. Observações de rota (todas aparecem; apenas as de variáveis/habilidades de saída possuem caixa de check)
        const obsHtml = (v.observacoes || []).length > 0 ? `
            <div class="arr-sec">
                ${v.observacoes.map(obs => {
                    if (obs.tem_check === false) {
                        return `
                        <div class="arr-row readonly">
                            <div class="arr-row-txt">
                                ${formatarTextoObsHtml(obs.texto)}
                            </div>
                        </div>`;
                    }
                    const chipReal = obs.checked
                        ? renderPessoasChips([{ nome: obs.lider_nome || 'Líder', colab_id: obs.lider_colab_id, foto_url: obs.lider_foto_url }], 20)
                        : '';
                    const subInfoHtml = obs.checked
                        ? `<span class="arr-row-sub">✅ Realizado por: ${chipReal}${obs.atualizado_em ? ' (' + esc(fmtDataHora(obs.atualizado_em)) + ')' : ''}</span>`
                        : '';
                    const clsObs = obs.checked ? 'checked' : (rotaAtrasada ? 'vencido' : '');
                    return `
                    <button type="button" class="arr-row interactive ${clsObs}"
                        data-action="toggle-check"
                        data-veiculo-key="${esc(v.veiculo_key)}"
                        data-tipo="obs"
                        data-key="${esc(obs.item_key)}">
                        <div class="arr-row-txt">
                            ${formatarTextoObsHtml(obs.texto)}
                            ${subInfoHtml}
                        </div>
                        <span class="arr-chk" title="Marcar observação como verificada"><i class="ph-bold ph-check"></i></span>
                    </button>`;
                }).join('')}
            </div>` : '';

        // Status unificado dos checklists de Entrega e Retirada do veículo:
        // - Sem caixa de check para não induzir clique nesta tela
        // - 'concluido' (todos os checklists de entrega e retirada do veículo completos) → check em verde (✓)
        // - 'em_andamento' (iniciou um checklist mas não finalizou todos do veículo) → exclamação em amarelo (!)
        // - 'pendente_vencido' (no dia seguinte não foi feito e ficou pendente, a partir de 01/12) → X em vermelho (✖)
        // - 'nao_feito' (antes de 01/12 não concluído) → fica como Não feito (sem dar como concluído)
        // - 'aguardando' (no dia da rota e ainda não iniciado) → sem caixa / sem ícone
        const stCkVeic = v.status_ent_ret_veiculo || {};
        const estadoCkVeic = stCkVeic.estado_visual || 'aguardando';

        function badgeStatusCkVeiculo(it) {
            if (it.status === 'sem_checklist') return '';
            if (estadoCkVeic === 'concluido') {
                return `<span class="arr-ck-status verde" title="Todos os checklists de entrega e retirada do veículo foram concluídos"><i class="ph-bold ph-check"></i></span>`;
            }
            if (estadoCkVeic === 'em_andamento') {
                return `<span class="arr-ck-status amarelo" title="Checklist iniciado, aguardando finalizar todos os checklists do veículo">!</span>`;
            }
            if (estadoCkVeic === 'pendente_vencido') {
                return `<span class="arr-ck-status vermelho" title="Checklist não realizado / pendente"><i class="ph-bold ph-x"></i></span>`;
            }
            return '';
        }

        function subStatusCkVeiculo(it, labelMenu) {
            if (it.status === 'sem_checklist') return '';
            if (estadoCkVeic === 'concluido') {
                const realCk = (stCkVeic.realizado_por && stCkVeic.realizado_por.length)
                    ? renderPessoasChips(stCkVeic.realizado_por, 20)
                    : (it.lider_nome ? renderPessoasChips([{ nome: it.lider_nome, colab_id: it.lider_colab_id, foto_url: it.lider_foto_url }], 20) : '');
                const dt = stCkVeic.atualizado_em || it.atualizado_em;
                return `<span class="arr-row-sub ok">✅ Checklists do veículo concluídos (${it.concluidas}/${it.total_unidades})${realCk ? ' • Realizado por: ' + realCk : ''}${dt ? ' (' + esc(fmtDataHora(dt)) + ')' : ''}</span>`;
            }
            if (estadoCkVeic === 'em_andamento') {
                return `<span class="arr-row-sub warn">⚠️ Checklist iniciado e não finalizado (${it.concluidas}/${it.total_unidades} neste item • ${stCkVeic.concluidas || 0}/${stCkVeic.total_unidades || 0} no veículo)</span>`;
            }
            if (estadoCkVeic === 'pendente_vencido') {
                return `<span class="arr-row-sub err">❌ Pendente / Não realizado no menu ${esc(labelMenu)} (${it.concluidas}/${it.total_unidades})</span>`;
            }
            if (estadoCkVeic === 'nao_feito') {
                return `<span class="arr-row-sub">Não feito no menu ${esc(labelMenu)} (${it.concluidas}/${it.total_unidades})</span>`;
            }
            return '';
        }

        const clsRowCkVeic = estadoCkVeic === 'concluido'
            ? 'checked'
            : (estadoCkVeic === 'em_andamento' ? 'parcial' : (estadoCkVeic === 'pendente_vencido' ? 'vencido' : ''));

        // 2. Entregas (status automático ao final de todos os checklists do veículo — sem caixa de check)
        const entregasHtml = (v.entregas || []).length > 0 ? `
            <div class="arr-sec">
                <div class="arr-sec-title entrega">${esc(v.titulo_entrega || 'ENTREGA OBRA:')}</div>
                ${v.entregas.map(it => {
                    const cls = it.status === 'sem_checklist' ? '' : clsRowCkVeic;
                    return `
                    <div class="arr-row readonly ${cls}">
                        <div class="arr-row-txt">
                            <strong>${esc(it.texto)}</strong>
                            ${subStatusCkVeiculo(it, 'Entregas')}
                        </div>
                        ${badgeStatusCkVeiculo(it)}
                    </div>`;
                }).join('')}
            </div>` : '';

        // 3. Retiradas (status automático ao final de todos os checklists do veículo — sem caixa de check)
        const retiradasHtml = (v.retiradas || []).length > 0 ? `
            <div class="arr-sec">
                <div class="arr-sec-title retirada">⭕ RETIRADA:</div>
                ${v.retiradas.map(it => {
                    const cls = it.status === 'sem_checklist' ? '' : clsRowCkVeic;
                    return `
                    <div class="arr-row readonly ${cls}">
                        <div class="arr-row-txt">
                            <strong>${esc(it.texto)}</strong>
                            ${subStatusCkVeiculo(it, 'Retiradas')}
                        </div>
                        ${badgeStatusCkVeiculo(it)}
                    </div>`;
                }).join('')}
            </div>` : '';

        // 4. Manutenção + Insumos necessários por equipamento (check manual em cada insumo)
        let ultimoTituloManut = '';
        const manutencoesHtml = (v.manutencoes || []).length > 0 ? `
            <div class="arr-sec">
                ${v.manutencoes.map(it => {
                    const mostrarTitulo = it.secao_titulo && it.secao_titulo !== ultimoTituloManut;
                    if (it.secao_titulo) ultimoTituloManut = it.secao_titulo;
                    const insumos = it.insumos || [];
                    const insConcluidos = insumos.filter(x => x.checked).length;
                    const todosInsOk = insumos.length > 0 && insConcluidos === insumos.length;
                    const clsManut = insumos.length === 0 ? '' : (todosInsOk ? 'concluido' : (insConcluidos > 0 ? 'em-andamento' : (rotaAtrasada ? 'atrasado' : '')));
                    return `
                    ${mostrarTitulo ? `<div class="arr-sec-title manutencao">${esc(it.secao_titulo)}</div>` : ''}
                    <div class="arr-manut-card ${clsManut}">
                        <div class="arr-manut-head">
                            <span>${esc(it.texto)}</span>
                            ${insumos.length > 0
                                ? `<span class="alc-badge ${todosInsOk ? 'verde' : 'laranja'}">${insConcluidos}/${insumos.length} insumos</span>`
                                : `<span class="alc-badge cinza">Sem insumos</span>`
                            }
                        </div>
                        ${insumos.length > 0 ? `
                        <div class="arr-insumos-list">
                            ${insumos.map(ins => {
                                const chipIns = ins.checked
                                    ? renderPessoasChips([{ nome: ins.lider_nome || 'Líder', colab_id: ins.lider_colab_id, foto_url: ins.lider_foto_url }], 20)
                                    : '';
                                const subInsHtml = ins.checked
                                    ? `<small class="arr-row-sub">✅ Realizado por: ${chipIns}${ins.atualizado_em ? ' (' + esc(fmtDataHora(ins.atualizado_em)) + ')' : ''}</small>`
                                    : '';
                                const clsIns = ins.checked ? 'checked' : (rotaAtrasada ? 'vencido' : '');
                                return `
                                <button type="button" class="arr-insumo-row ${clsIns}"
                                    data-action="toggle-check"
                                    data-veiculo-key="${esc(v.veiculo_key)}"
                                    data-tipo="insumo"
                                    data-key="${esc(ins.item_key)}">
                                    <span class="arr-insumo-ico">${esc(ins.icone || '📦')}</span>
                                    <span class="arr-insumo-txt">
                                        ${esc(ins.texto)}
                                        ${subInsHtml}
                                    </span>
                                    <span class="arr-chk"><i class="ph-bold ph-check"></i></span>
                                </button>`;
                            }).join('')}
                        </div>` : `<div class="arr-sem-insumos">Este equipamento não requer insumos de manutenção.</div>`}
                    </div>`;
                }).join('')}
            </div>` : '';

        const clsVcard = st.total > 0 && st.completo
            ? 'concluido'
            : ((st.concluidos > 0 || estadoCkVeic === 'em_andamento')
                ? 'em-andamento'
                : ((estadoCkVeic === 'pendente_vencido' || (rotaAtrasada && st.total > 0)) ? 'atrasado' : ''));

        return `
        <article class="arr-vcard ${clsVcard}" data-vcard="${esc(v.veiculo_key)}">
            <div class="arr-vhead">
                <div class="arr-vtitle">
                    <span>🚚 ${esc(v.veiculo)}</span>
                </div>
                <span class="alc-badge ${badgeCls}">
                    <i class="ph-fill ${st.completo ? 'ph-check-circle' : 'ph-clock'}"></i> ${badgeTxt}
                </span>
            </div>
            ${realizadoPor.length > 0 ? `
            <div class="arr-vlider-bar">
                <div class="arr-vlider-item ok">
                    <i class="ph-fill ph-check-circle"></i>
                    <span>Realizado por: ${realizadoBarHtml}</span>
                </div>
            </div>` : ''}
            <div class="arr-vbody">
                <div class="arr-crew">
                    ${crewHtml}
                </div>
                <div class="arr-services">
                    ${obsHtml}
                    ${entregasHtml}
                    ${retiradasHtml}
                    ${manutencoesHtml}
                </div>
            </div>
        </article>`;
    }

    // ═══════════════ Painel: Colaboradores Disponíveis (Fora de Rota, separados por Turnos) ═══════════════
    function renderCardColabDisponivel(c) {
        const ini = esc(iniciais(c.nome));
        const inner = c.foto_url
            ? `<img src="${esc(c.foto_url)}" alt="" onerror="this.outerHTML='<span class=\\'arr-ring-fb\\'>${ini}</span>'">`
            : `<span class="arr-ring-fb">${ini}</span>`;
        const tipoRing = c.categoria_servico === 'motorista' ? 'mot' : 'aju';
        const stPres = c.status_presenca || '';
        const horarioTxt = (c.horario_entrada && c.horario_saida)
            ? `${c.horario_entrada} às ${c.horario_saida}`
            : (c.horario_entrada ? `Entrada: ${c.horario_entrada}` : '');

        return `
        <button type="button" class="arr-disp-card ${stPres === 'trabalhou' ? 'is-ok' : ''}"
            data-action="open-presenca-colab"
            data-origem="disponivel"
            data-colab-id="${esc(c.colab_id || c.id)}"
            data-colab-nome="${esc(c.nome)}"
            data-colab-cargo="${esc(c.departamento_label || c.cargo || 'Operacional')}"
            data-colab-categoria="${esc(c.categoria_servico || 'outros')}"
            data-colab-foto="${esc(c.foto_url || '')}"
            data-status-presenca="${esc(stPres)}"
            data-avisado="Não"
            data-obs-falta="">
            <div class="arr-ring ${tipoRing}" style="width:48px;height:48px;">
                <div class="arr-ring-in">${inner}</div>
            </div>
            <div class="arr-disp-info">
                <div class="arr-disp-name">${esc(c.nome)}</div>
                <div class="arr-disp-meta">
                    <span class="arr-dep-badge ${esc(c.categoria_servico || 'outros')}">${esc(c.departamento_label || c.cargo)}</span>
                    ${horarioTxt ? `<span class="arr-disp-hr"><i class="ph ph-clock"></i> ${esc(horarioTxt)}</span>` : ''}
                </div>
            </div>
            <div class="arr-disp-act">
                ${stPres === 'trabalhou'
                    ? `<span class="arr-presenca-pill ok"><i class="ph-fill ph-check-circle"></i> Trabalhando</span>`
                    : `<span class="arr-presenca-pill pend"><i class="ph ph-hand-tap"></i> Presença / Falta</span>`
                }
            </div>
        </button>`;
    }

    function renderBlocoTurnoDisponiveis(tituloTurno, iconeTurno, corClasse, listaColabs) {
        if (!listaColabs.length) {
            return `
            <section class="arr-disp-turno-sec ${corClasse}">
                <div class="arr-disp-turno-head">
                    <span>${iconeTurno} ${esc(tituloTurno)}</span>
                    <span class="alc-badge cinza">0 disponíveis</span>
                </div>
                <div class="arr-disp-vazio">Nenhum colaborador disponível fora de rota neste turno.</div>
            </section>`;
        }

        // Separar por departamento dentro do turno para facilitar visualização
        const grupos = [
            { id: 'motorista', titulo: '🚚 Motoristas', itens: listaColabs.filter(c => c.categoria_servico === 'motorista') },
            { id: 'ajudante_geral', titulo: '📦 Ajudante Geral', itens: listaColabs.filter(c => c.departamento_label === 'Ajudante Geral') },
            { id: 'ajudante_patio', titulo: '🏗️ Ajudante de Pátio', itens: listaColabs.filter(c => c.departamento_label === 'Ajudante de Pátio') },
            { id: 'outros', titulo: '👔 Liderança / Outros', itens: listaColabs.filter(c => c.categoria_servico !== 'motorista' && c.departamento_label !== 'Ajudante Geral' && c.departamento_label !== 'Ajudante de Pátio') }
        ].filter(g => g.itens.length > 0);

        return `
        <section class="arr-disp-turno-sec ${corClasse}">
            <div class="arr-disp-turno-head">
                <span>${iconeTurno} ${esc(tituloTurno)}</span>
                <span class="alc-badge azul">${listaColabs.length} ${listaColabs.length === 1 ? 'disponível' : 'disponíveis'}</span>
            </div>
            <div class="arr-disp-turno-body">
                ${grupos.map(g => `
                    <div class="arr-disp-dep-group">
                        <div class="arr-disp-dep-title">${g.titulo} <b>(${g.itens.length})</b></div>
                        <div class="arr-disp-grid">
                            ${g.itens.map(renderCardColabDisponivel).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>`;
    }

    function renderPainelColaboradoresDisponiveis(colabDispInfo, qBusca) {
        const filtra = (arr) => (arr || []).filter(c => {
            if (!qBusca) return true;
            const txt = normBusca([c.nome, c.cargo, c.departamento_label, c.turno].join(' '));
            return txt.includes(qBusca);
        });

        const diurnoList = filtra(colabDispInfo.diurno || []);
        const noturnoList = filtra(colabDispInfo.noturno || []);
        const totalDisp = diurnoList.length + noturnoList.length;
        const subFiltro = S.filtroTurnoDisp || 'todos';

        return `
        <div class="arr-disp-panel">
            <div class="arr-disp-summary">
                <div class="arr-disp-summary-main">
                    <i class="ph-fill ph-users-three"></i>
                    <div>
                        <h3>Colaboradores Disponíveis para Trabalho</h3>
                        <span>Colaboradores fora de rota em ${fmtBR(S.data)} — toque no nome para marcar presença ou registrar falta</span>
                    </div>
                </div>
                <div class="arr-disp-counters">
                    <button type="button" class="arr-disp-cnt-btn ${subFiltro === 'todos' ? 'on' : ''}" data-turno-disp="todos">
                        <b>${totalDisp}</b>
                        <small>Total Disponíveis</small>
                    </button>
                    <button type="button" class="arr-disp-cnt-btn diurno ${subFiltro === 'diurno' ? 'on' : ''}" data-turno-disp="diurno">
                        <b>${diurnoList.length}</b>
                        <small>☀️ Turno Diurno</small>
                    </button>
                    <button type="button" class="arr-disp-cnt-btn noturno ${subFiltro === 'noturno' ? 'on' : ''}" data-turno-disp="noturno">
                        <b>${noturnoList.length}</b>
                        <small>🌙 Turno Noturno</small>
                    </button>
                </div>
            </div>

            ${(subFiltro === 'todos' || subFiltro === 'diurno')
                ? renderBlocoTurnoDisponiveis('Turno Diurno — Colaboradores Disponíveis', '☀️', 'diurno', diurnoList)
                : ''}
            ${(subFiltro === 'todos' || subFiltro === 'noturno')
                ? renderBlocoTurnoDisponiveis('Turno Noturno — Colaboradores Disponíveis', '🌙', 'noturno', noturnoList)
                : ''}
        </div>`;
    }

    // ═══════════════ Painel: Faltas Registradas no Dia ═══════════════
    function renderPainelFaltasDia(faltasDiaList, qBusca) {
        const filtradas = (faltasDiaList || []).filter(f => {
            if (!qBusca) return true;
            const txt = normBusca([f.nome, f.departamento_label, f.veiculo_nome, f.substituto_nome, f.observacao].join(' '));
            return txt.includes(qBusca);
        });

        if (!filtradas.length) {
            return `
            <div class="alc-vazio">
                <i class="ph ph-calendar-check" style="color:#16a34a;"></i>
                <p>Nenhuma falta registrada para <b>${fmtBR(S.data)}</b>.</p>
                <small style="color:#64748b;">Para registrar uma falta, toque em cima do nome de um colaborador na rota ou na aba Colaboradores Disponíveis.</small>
            </div>`;
        }

        return `
        <div class="arr-faltas-panel">
            <div class="arr-faltas-head">
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class="ph-fill ph-calendar-x" style="font-size:1.5rem;color:#dc2626;"></i>
                    <div>
                        <h3 style="margin:0;font-size:1rem;color:#7f1d1d;">Faltas Registradas em ${fmtBR(S.data)}</h3>
                        <span style="font-size:0.8rem;color:#991b1b;">Todas as faltas abaixo já foram lançadas como Dia todo no Prontuário Digital</span>
                    </div>
                </div>
                <span class="alc-badge vermelho">${filtradas.length} ${filtradas.length === 1 ? 'falta' : 'faltas'}</span>
            </div>
            <div class="arr-disp-grid">
                ${filtradas.map(f => {
                    const ini = esc(iniciais(f.nome));
                    const inner = f.foto_url
                        ? `<img src="${esc(f.foto_url)}" alt="" onerror="this.outerHTML='<span class=\\'arr-ring-fb\\'>${ini}</span>'">`
                        : `<span class="arr-ring-fb">${ini}</span>`;
                    const origemTxt = f.origem === 'rota' && f.veiculo_nome
                        ? `🚚 Escalado na rota: <b>${esc(f.veiculo_nome)}</b>`
                        : `👥 Colaborador Disponível (Fora de Rota)`;
                    const substTxt = f.origem === 'rota'
                        ? (f.substituto_nome
                            ? `<div class="arr-falta-sub ok"><i class="ph-fill ph-arrows-left-right"></i> Substituído por: <b>${esc(f.substituto_nome)}</b></div>`
                            : `<div class="arr-falta-sub warn"><i class="ph-fill ph-warning-circle"></i> Sem substituto definido — toque para escolher</div>`)
                        : `<div class="arr-falta-sub"><i class="ph ph-info"></i> Sem necessidade de substituição (Fora de Rota)</div>`;

                    return `
                    <button type="button" class="arr-falta-card"
                        data-action="open-presenca-colab"
                        data-origem="${esc(f.origem || 'disponivel')}"
                        data-veiculo-key="${esc(f.veiculo_key || '')}"
                        data-veiculo-nome="${esc(f.veiculo_nome || '')}"
                        data-papel="${esc(f.papel_rota || '')}"
                        data-colab-id="${esc(f.colab_id || '')}"
                        data-colab-nome="${esc(f.nome)}"
                        data-colab-cargo="${esc(f.departamento_label || f.cargo || '')}"
                        data-colab-categoria="${esc(f.categoria_servico || '')}"
                        data-colab-foto="${esc(f.foto_url || '')}"
                        data-status-presenca="falta"
                        data-avisado="${esc(f.avisado_previamente || 'Não')}"
                        data-obs-falta="${esc(f.observacao || '')}"
                        data-substituto-id="${esc(f.substituto_id || '')}"
                        data-substituto-nome="${esc(f.substituto_nome || '')}">
                        <div class="arr-falta-top">
                            <div class="arr-ring ${f.categoria_servico === 'motorista' ? 'mot' : 'aju'}" style="width:48px;height:48px;">
                                <div class="arr-ring-in">${inner}</div>
                            </div>
                            <div class="arr-disp-info">
                                <div class="arr-disp-name">${esc(f.nome)}</div>
                                <div class="arr-disp-meta">
                                    <span class="arr-dep-badge ${esc(f.categoria_servico || 'outros')}">${esc(f.departamento_label || f.cargo)}</span>
                                    <span class="arr-dep-badge">${f.turno === 'noturno' ? '🌙 Noturno' : '☀️ Diurno'}</span>
                                    <span class="arr-presenca-pill falta"><i class="ph-fill ph-x-circle"></i> Falta (Dia todo)</span>
                                </div>
                            </div>
                        </div>
                        <div class="arr-falta-details">
                            <div>${origemTxt}</div>
                            ${substTxt}
                            <div>Avisou previamente: <b>${esc(f.avisado_previamente || 'Não')}</b>${f.observacao ? ` • Obs: <i>${esc(f.observacao)}</i>` : ''}</div>
                        </div>
                    </button>`;
                }).join('')}
            </div>
        </div>`;
    }

    // ═══════════════ Modal Popup: Selecionar Presença ou Registrar Falta (+ Substituto) ═══════════════
    function abrirModalPresencaColab(btn) {
        const dDia = S.dadosDia || {};
        const colabDispInfo = dDia.colaboradores_disponiveis || { todos: [], motoristas: [], ajudantes_geral: [], ajudantes_patio: [] };

        const origem = btn.dataset.origem || 'rota'; // 'rota' | 'disponivel'
        const veiculoKey = btn.dataset.veiculoKey || '';
        const veiculoNome = btn.dataset.veiculoNome || '';
        const papel = btn.dataset.papel || ''; // 'motorista' | 'ajudante'
        const colabId = btn.dataset.colabId ? Number(btn.dataset.colabId) : null;
        const colabNome = btn.dataset.colabNome || 'Colaborador';
        const colabCargo = btn.dataset.colabCargo || (papel === 'motorista' ? 'Motorista' : 'Ajudante');
        const colabCategoria = btn.dataset.colabCategoria || (papel === 'motorista' ? 'motorista' : 'ajudante');
        const colabFoto = btn.dataset.colabFoto || (colabId ? `/api/colaboradores/foto/${colabId}` : '');
        const statusInicial = btn.dataset.statusPresenca === 'falta' ? 'falta' : 'trabalhou';
        const avisadoInicial = btn.dataset.avisado === 'Sim' ? 'Sim' : 'Não';
        const obsInicial = btn.dataset.obsFalta || '';
        const substIdInicial = btn.dataset.substitutoId ? Number(btn.dataset.substitutoId) : null;
        const substNomeInicial = btn.dataset.substitutoNome || '';

        const ehEscaladoRota = (origem === 'rota');
        const ehMotorista = (papel === 'motorista' || colabCategoria === 'motorista');

        // Montar grupos de substitutos disponíveis para aquele serviço (apenas quando escalado na rota)
        const gruposSubstitutos = [];
        if (ehEscaladoRota) {
            if (ehMotorista) {
                const mots = (colabDispInfo.motoristas || []).filter(c => Number(c.colab_id || c.id) !== colabId);
                gruposSubstitutos.push({
                    id: 'motoristas',
                    titulo: '🚚 Departamento: Motoristas Disponíveis',
                    itens: mots
                });
            } else {
                const ajuGeral = (colabDispInfo.ajudantes_geral || []).filter(c => Number(c.colab_id || c.id) !== colabId);
                const ajuPatio = (colabDispInfo.ajudantes_patio || []).filter(c => Number(c.colab_id || c.id) !== colabId);
                gruposSubstitutos.push({
                    id: 'ajudante_geral',
                    titulo: '📦 Departamento: Ajudante Geral',
                    itens: ajuGeral
                });
                gruposSubstitutos.push({
                    id: 'ajudante_patio',
                    titulo: '🏗️ Departamento: Ajudante de Pátio',
                    itens: ajuPatio
                });
            }
        }

        const ini = esc(iniciais(colabNome));
        const avatarHtml = colabFoto
            ? `<img src="${esc(colabFoto)}" alt="" style="width:54px;height:54px;border-radius:50%;object-fit:cover;border:2px solid #cbd5e1;" onerror="this.style.display='none'">`
            : `<div style="width:54px;height:54px;border-radius:50%;background:#1e40af;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;">${ini}</div>`;

        // Remover modal anterior se existir
        const oldModal = document.getElementById('arr-presenca-modal-overlay');
        if (oldModal) oldModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'arr-presenca-modal-overlay';
        overlay.className = 'arr-modal-overlay';

        let estadoSel = statusInicial; // 'trabalhou' | 'falta'
        let avisadoSel = avisadoInicial;
        let substSelecionadoId = substIdInicial;
        let substSelecionadoNome = substNomeInicial;
        let filtroSubst = '';

        function renderSubstitutosHtml() {
            if (!ehEscaladoRota) {
                return `
                <div class="arr-modal-note">
                    <i class="ph-fill ph-info"></i>
                    <span>Colaborador dos <b>Colaboradores Disponíveis para Trabalho</b> (fora de rota) — não precisa de substituto.</span>
                </div>`;
            }

            const qSub = normBusca(filtroSubst);
            const totalCandidatos = gruposSubstitutos.reduce((acc, g) => acc + g.itens.length, 0);

            return `
            <div class="arr-subst-box">
                <div class="arr-subst-box-head">
                    <div>
                        <strong><i class="ph-fill ph-users-three"></i> Colaboradores Disponíveis para este Serviço</strong>
                        <small>${ehMotorista ? 'Mostrando apenas Motoristas disponíveis' : 'Mostrando Ajudantes disponíveis (Ajudante Geral e Ajudante de Pátio)'}</small>
                    </div>
                    <span class="alc-badge azul">${totalCandidatos}</span>
                </div>

                <div class="alr-busca" style="margin:8px 0;">
                    <i class="ph ph-magnifying-glass"></i>
                    <input type="search" id="arr-modal-subst-search" placeholder="Pesquisar colaborador disponível para substituir..." value="${esc(filtroSubst)}" autocomplete="off">
                </div>

                <div class="arr-subst-list" id="arr-modal-subst-list">
                    <button type="button" class="arr-subst-item ${!substSelecionadoId ? 'sel' : ''}" data-subst-id="" data-subst-nome="">
                        <span class="arr-subst-radio"></span>
                        <div class="arr-subst-item-info">
                            <b>Manter sem substituto por enquanto</b>
                            <small>Apenas registrar a falta no Prontuário Digital</small>
                        </div>
                    </button>
                    ${gruposSubstitutos.map(g => {
                        const itensFiltrados = g.itens.filter(c => {
                            if (!qSub) return true;
                            return normBusca(`${c.nome} ${c.departamento_label} ${c.turno}`).includes(qSub);
                        });
                        if (!itensFiltrados.length) {
                            return `
                            <div class="arr-subst-group-title">${g.titulo} (0)</div>
                            <div class="arr-subst-empty">Nenhum disponível neste departamento.</div>`;
                        }
                        return `
                        <div class="arr-subst-group-title">${g.titulo} (${itensFiltrados.length})</div>
                        ${itensFiltrados.map(c => {
                            const cid = Number(c.colab_id || c.id);
                            const isSel = Number(substSelecionadoId) === cid;
                            const cIni = esc(iniciais(c.nome));
                            const cFoto = c.foto_url
                                ? `<img src="${esc(c.foto_url)}" alt="" onerror="this.outerHTML='<span>${cIni}</span>'">`
                                : `<span>${cIni}</span>`;
                            return `
                            <button type="button" class="arr-subst-item ${isSel ? 'sel' : ''}" data-subst-id="${cid}" data-subst-nome="${esc(c.nome)}">
                                <span class="arr-subst-radio"></span>
                                <span class="arr-mini-av" style="width:36px;height:36px;">${cFoto}</span>
                                <div class="arr-subst-item-info">
                                    <b>${esc(c.nome)}</b>
                                    <small>${esc(c.departamento_label)} • ${c.turno === 'noturno' ? '🌙 Noturno' : '☀️ Diurno'}${c.horario_entrada ? ' • ' + esc(c.horario_entrada) : ''}</small>
                                </div>
                            </button>`;
                        }).join('')}`;
                    }).join('')}
                </div>
            </div>`;
        }

        function renderModalInner() {
            const obsValAtual = document.getElementById('arr-modal-obs-input')
                ? document.getElementById('arr-modal-obs-input').value
                : obsInicial;

            overlay.innerHTML = `
            <div class="arr-modal-card" role="dialog" aria-modal="true">
                <div class="arr-modal-head">
                    <div class="arr-modal-colab">
                        ${avatarHtml}
                        <div>
                            <h3>${esc(colabNome)}</h3>
                            <div class="arr-modal-sub">
                                <span class="arr-dep-badge ${ehMotorista ? 'motorista' : 'ajudante'}">${esc(colabCargo)}</span>
                                ${ehEscaladoRota && veiculoNome ? `<span>🚚 ${esc(veiculoNome)}</span>` : `<span>👥 Disponível (Fora de Rota)</span>`}
                            </div>
                        </div>
                    </div>
                    <button type="button" class="alc-icon-btn sm" id="arr-modal-close" title="Fechar"><i class="ph ph-x"></i></button>
                </div>

                <div class="arr-modal-body">
                    <label class="arr-modal-lbl">Selecione a situação do colaborador em <b>${fmtBR(S.data)}</b>:</label>
                    <div class="arr-status-choice">
                        <button type="button" class="arr-choice-btn ok ${estadoSel === 'trabalhou' ? 'on' : ''}" data-choice="trabalhou">
                            <i class="ph-fill ph-check-circle"></i>
                            <div>
                                <b>Foi trabalhar</b>
                                <small>Compareceu normalmente</small>
                            </div>
                        </button>
                        <button type="button" class="arr-choice-btn falta ${estadoSel === 'falta' ? 'on' : ''}" data-choice="falta">
                            <i class="ph-fill ph-calendar-x"></i>
                            <div>
                                <b>Teve Falta</b>
                                <small>Falta do dia todo (Prontuário)</small>
                            </div>
                        </button>
                    </div>

                    ${estadoSel === 'falta' ? `
                    <div class="arr-falta-form">
                        <div class="arr-falta-banner">
                            <i class="ph-fill ph-warning-circle"></i>
                            <span>Esta falta será registrada automaticamente como <b>Dia todo</b> no <b>Prontuário Digital</b> do colaborador.</span>
                        </div>

                        <div class="arr-form-row">
                            <label class="arr-modal-lbl">Avisado previamente?</label>
                            <div class="arr-avisado-pills">
                                <button type="button" class="arr-pill-btn ${avisadoSel === 'Sim' ? 'on sim' : ''}" data-avisado-val="Sim">✓ Sim, avisou</button>
                                <button type="button" class="arr-pill-btn ${avisadoSel === 'Não' ? 'on nao' : ''}" data-avisado-val="Não">✗ Não avisou</button>
                            </div>
                        </div>

                        <div class="arr-form-row">
                            <label class="arr-modal-lbl" for="arr-modal-obs-input">Observação da falta (opcional):</label>
                            <input type="text" id="arr-modal-obs-input" class="arr-modal-input" placeholder="Ex: não comunicou, imprevisto pessoal..." value="${esc(obsValAtual)}" autocomplete="off">
                        </div>

                        <div id="arr-modal-subst-container">
                            ${renderSubstitutosHtml()}
                        </div>
                    </div>
                    ` : `
                    <div class="arr-trabalhou-info">
                        <i class="ph-fill ph-check-circle"></i>
                        <div>
                            <b>Confirmar presença no dia ${fmtBR(S.data)}</b>
                            <small>${btn.dataset.statusPresenca === 'falta' ? 'A falta registrada anteriormente para hoje será removida do Prontuário Digital.' : 'O colaborador ficará marcado como trabalhando hoje.'}</small>
                        </div>
                    </div>
                    `}
                </div>

                <div class="arr-modal-foot">
                    <button type="button" class="alc-btn alc-btn-ghost" id="arr-modal-cancel">Cancelar</button>
                    <button type="button" class="alc-btn ${estadoSel === 'falta' ? 'arr-btn-danger' : 'alc-btn-primary'}" id="arr-modal-save">
                        <i class="ph-bold ${estadoSel === 'falta' ? 'ph-calendar-x' : 'ph-check'}"></i>
                        ${estadoSel === 'falta'
                            ? (ehEscaladoRota && substSelecionadoNome ? 'Registrar Falta e Substituir' : 'Registrar Falta no Prontuário')
                            : 'Confirmar que Foi Trabalhar'}
                    </button>
                </div>
            </div>`;

            bindModalEvents();
        }

        function bindSubstListEvents() {
            overlay.querySelectorAll('[data-subst-id]').forEach(b => {
                b.onclick = () => {
                    substSelecionadoId = b.dataset.substId ? Number(b.dataset.substId) : null;
                    substSelecionadoNome = b.dataset.substNome || '';
                    overlay.querySelectorAll('[data-subst-id]').forEach(x => x.classList.toggle('sel', x === b));
                    const saveBtn = document.getElementById('arr-modal-save');
                    if (saveBtn && estadoSel === 'falta') {
                        saveBtn.innerHTML = `<i class="ph-bold ph-calendar-x"></i> ${ehEscaladoRota && substSelecionadoNome ? 'Registrar Falta e Substituir' : 'Registrar Falta no Prontuário'}`;
                    }
                };
            });

            const inpSub = document.getElementById('arr-modal-subst-search');
            if (inpSub) {
                inpSub.oninput = () => {
                    const pos = inpSub.selectionStart;
                    filtroSubst = inpSub.value;
                    const cont = document.getElementById('arr-modal-subst-container');
                    if (cont) {
                        cont.innerHTML = renderSubstitutosHtml();
                        bindSubstListEvents();
                        const newInp = document.getElementById('arr-modal-subst-search');
                        if (newInp) {
                            newInp.focus();
                            try { newInp.setSelectionRange(pos, pos); } catch (_) {}
                        }
                    }
                };
            }
        }

        function bindModalEvents() {
            const close = () => overlay.remove();
            const bClose = document.getElementById('arr-modal-close');
            const bCancel = document.getElementById('arr-modal-cancel');
            if (bClose) bClose.onclick = close;
            if (bCancel) bCancel.onclick = close;
            overlay.onclick = (ev) => { if (ev.target === overlay) close(); };

            overlay.querySelectorAll('[data-choice]').forEach(b => {
                b.onclick = () => {
                    estadoSel = b.dataset.choice;
                    renderModalInner();
                };
            });

            overlay.querySelectorAll('[data-avisado-val]').forEach(b => {
                b.onclick = () => {
                    avisadoSel = b.dataset.avisadoVal;
                    overlay.querySelectorAll('[data-avisado-val]').forEach(x => {
                        const val = x.dataset.avisadoVal;
                        x.className = 'arr-pill-btn' + (val === avisadoSel ? (' on ' + (val === 'Sim' ? 'sim' : 'nao')) : '');
                    });
                };
            });

            bindSubstListEvents();

            const bSave = document.getElementById('arr-modal-save');
            if (bSave) {
                bSave.onclick = async () => {
                    const obsTexto = document.getElementById('arr-modal-obs-input')?.value || '';
                    bSave.disabled = true;
                    bSave.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Salvando...`;
                    try {
                        await api('/api/app/resumo-rota/presenca', {
                            method: 'POST',
                            body: JSON.stringify({
                                data_rota: S.data,
                                resumo_id: S.resumoId,
                                colaborador_id: colabId,
                                colaborador_nome: colabNome,
                                status: estadoSel,
                                origem,
                                veiculo_key: veiculoKey || null,
                                veiculo_nome: veiculoNome || null,
                                papel_rota: papel || null,
                                avisado_previamente: avisadoSel,
                                observacao: obsTexto,
                                substituto_id: estadoSel === 'falta' ? substSelecionadoId : null,
                                substituto_nome: estadoSel === 'falta' ? substSelecionadoNome : null
                            })
                        });
                        vibrar(25);
                        close();
                        await carregar(true);
                        if (window.Swal) {
                            Swal.fire({
                                icon: 'success',
                                title: estadoSel === 'falta' ? 'Falta registrada no Prontuário!' : 'Presença confirmada!',
                                text: estadoSel === 'falta'
                                    ? (substSelecionadoNome ? `Falta lançada para ${colabNome} e substituído por ${substSelecionadoNome}.` : `Falta do dia todo lançada para ${colabNome}.`)
                                    : `${colabNome} marcado como trabalhando em ${fmtBR(S.data)}.`,
                                timer: 2200,
                                showConfirmButton: false
                            });
                        }
                    } catch (e) {
                        bSave.disabled = false;
                        renderModalInner();
                        if (window.Swal) {
                            Swal.fire({ icon: 'error', title: 'Erro ao salvar', text: e.message });
                        } else {
                            alert('Erro: ' + e.message);
                        }
                    }
                };
            }
        }

        document.body.appendChild(overlay);
        renderModalInner();
    }

    // ═══════════════ Eventos e Interações ═══════════════
    function bindEventosLista() {
        const root = document.getElementById('app-lideranca-resumo-rota-container');
        if (!root) return;
        const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };

        on('arr-menu', () => document.body.classList.toggle('app-rail-open'));
        on('arr-refresh', () => carregar(false));
        on('arr-prev', () => { S.cursor.setDate(S.cursor.getDate() - (S.modoAgenda === 'semana' ? 7 : 30)); renderLista(); });
        on('arr-next', () => { S.cursor.setDate(S.cursor.getDate() + (S.modoAgenda === 'semana' ? 7 : 30)); renderLista(); });
        on('arr-hoje', () => {
            S.cursor = new Date();
            S.data = hojeISO();
            S.resumoId = null;
            carregar(false);
        });
        on('arr-modo', () => { S.modoAgenda = S.modoAgenda === 'semana' ? 'mes' : 'semana'; renderLista(); });

        const dp = document.getElementById('arr-date');
        if (dp) {
            dp.onchange = () => {
                if (dp.value) {
                    S.data = dp.value;
                    S.cursor = parseISO(dp.value);
                    S.resumoId = null;
                    carregar(false);
                }
            };
        }

        const inpBusca = document.getElementById('arr-busca-input');
        if (inpBusca) {
            inpBusca.oninput = () => {
                S.busca = inpBusca.value;
                renderLista();
            };
        }
        on('arr-busca-limpar', () => {
            S.busca = '';
            renderLista();
            const i = document.getElementById('arr-busca-input');
            if (i) i.focus();
        });

        root.querySelectorAll('[data-dia]').forEach(b => {
            b.onclick = () => {
                S.data = b.dataset.dia;
                S.cursor = parseISO(S.data);
                S.resumoId = null;
                carregar(false);
            };
        });

        root.querySelectorAll('[data-turno]').forEach(b => {
            b.onclick = () => {
                S.turno = b.dataset.turno;
                S.resumoId = null;
                carregar(false);
            };
        });

        root.querySelectorAll('[data-resumo-id]').forEach(b => {
            b.onclick = () => {
                S.resumoId = Number(b.dataset.resumoId);
                const nm = normBusca(b.textContent || '');
                S.turno = /noturn|noite/.test(nm) ? 'noturno' : 'diurno';
                carregar(false);
            };
        });

        root.querySelectorAll('[data-f]').forEach(b => {
            b.onclick = () => {
                S.filtro = b.dataset.f;
                renderLista();
            };
        });

        root.querySelectorAll('[data-turno-disp]').forEach(b => {
            b.onclick = () => {
                S.filtroTurnoDisp = b.dataset.turnoDisp || 'todos';
                renderLista();
            };
        });

        root.querySelectorAll('[data-action="open-presenca-colab"]').forEach(btn => {
            btn.onclick = () => abrirModalPresencaColab(btn);
        });

        root.querySelectorAll('[data-action="toggle-check"]').forEach(btn => {
            btn.onclick = () => toggleManualCheck(btn);
        });

        root.querySelectorAll('[data-action="goto-entregas"]').forEach(btn => {
            btn.onclick = () => abrirModalChecklistAutomatico('entrega', btn);
        });

        root.querySelectorAll('[data-action="goto-retiradas"]').forEach(btn => {
            btn.onclick = () => abrirModalChecklistAutomatico('retirada', btn);
        });
    }

    async function toggleManualCheck(btn) {
        const veiculoKey = btn.dataset.veiculoKey;
        const tipo = btn.dataset.tipo; // 'obs' | 'insumo'
        const itemKey = btn.dataset.key;
        if (!veiculoKey || !tipo || !itemKey || !S.dadosDia || !S.resumoId) return;

        const vObj = (S.dadosDia.veiculos || []).find(v => v.veiculo_key === veiculoKey);
        if (!vObj) return;

        let targetItem = null;
        if (tipo === 'obs') {
            targetItem = (vObj.observacoes || []).find(o => o.item_key === itemKey);
        } else if (tipo === 'insumo') {
            for (const eq of (vObj.manutencoes || [])) {
                const found = (eq.insumos || []).find(ins => ins.item_key === itemKey);
                if (found) { targetItem = found; break; }
            }
        }
        if (!targetItem) return;

        const novoEstado = !targetItem.checked;
        targetItem.checked = novoEstado;
        vibrar(20);
        renderLista();

        try {
            const res = await api('/api/app/resumo-rota/check', {
                method: 'POST',
                body: JSON.stringify({
                    resumo_id: S.resumoId,
                    turno: S.turno || S.dadosDia.turno_ativo || 'diurno',
                    data_rota: S.data,
                    veiculo_key: veiculoKey,
                    item_key: itemKey,
                    tipo_item: tipo,
                    checked: novoEstado
                })
            });
            targetItem.lider_nome = res.lider_nome || null;
            targetItem.lider_colab_id = res.lider_colab_id || null;
            targetItem.lider_foto_url = res.lider_foto_url || null;
            targetItem.atualizado_em = res.atualizado_em || null;
            carregar(true);
        } catch (e) {
            targetItem.checked = !novoEstado;
            renderLista();
            if (window.Swal) {
                Swal.fire({ icon: 'error', title: 'Erro ao salvar check', text: e.message, timer: 2500, showConfirmButton: false });
            }
        }
    }

    function abrirModalChecklistAutomatico(tipo, btn) {
        const ehEntrega = tipo === 'entrega';
        const veiculo = btn.dataset.veiculo || '';
        const texto = btn.dataset.texto || '';
        const lider = btn.dataset.lider || '';
        const concluidas = Number(btn.dataset.concluidas || 0);
        const total = Number(btn.dataset.total || 0);
        const completo = total > 0 && concluidas >= total;

        const tituloModal = ehEntrega ? 'Check Automático de Entrega' : 'Check Automático de Retirada';
        const menuDestino = ehEntrega ? 'app-lideranca-entregas' : 'app-lideranca-retiradas';
        const nomeMenu = ehEntrega ? 'Entregas' : 'Retiradas';

        if (!window.Swal) {
            if (typeof window.navigateTo === 'function') window.navigateTo(menuDestino);
            return;
        }

        Swal.fire({
            icon: completo ? 'success' : 'info',
            title: tituloModal,
            html: `
                <div style="text-align:left;font-size:0.95rem;line-height:1.45;color:#334155;">
                    <p style="margin:0 0 8px;"><b>Veículo:</b> ${esc(veiculo)}</p>
                    <p style="margin:0 0 8px;"><b>Equipamento:</b> ${esc(texto)}</p>
                    <p style="margin:0 0 8px;"><b>Status atual:</b> ${completo
                        ? `<span style="color:#16a34a;font-weight:800;">Concluído (${concluidas}/${total})</span>`
                        : `<span style="color:#d97706;font-weight:800;">${concluidas} de ${total} concluído(s)</span>`
                    }</p>
                    ${lider ? `<p style="margin:0 0 12px;"><b>Realizado por:</b> ${esc(lider)}</p>` : ''}
                    <div style="background:#f1f5f9;border-radius:10px;padding:10px 12px;font-size:0.86rem;color:#475569;">
                        O check de <b>${nomeMenu}</b> no Resumo da Rota é preenchido <b>automaticamente</b> assim que o checklist de cada equipamento é concluído na tela de <b>${nomeMenu}</b>.
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#556b2f',
            cancelButtonColor: '#64748b',
            confirmButtonText: `Ir para ${nomeMenu}`,
            cancelButtonText: 'Fechar'
        }).then(res => {
            if (res.isConfirmed && typeof window.navigateTo === 'function') {
                window.navigateTo(menuDestino);
            }
        });
    }

    // ═══════════════ Modo Celular e Inicialização ═══════════════
    function aplicarModoCelular() {
        const ativo = !!document.querySelector('[id^="view-app-lideranca-"].active');
        document.body.classList.toggle('app-mobile-on', ativo && window.innerWidth <= 768);
        if (!ativo) document.body.classList.remove('app-rail-open');
    }

    window.renderAppLiderancaResumoRota = function () {
        aplicarModoCelular();
        carregar(false);
    };

    window._arrRecarregarSilencioso = function () {
        const v = document.getElementById('view-app-lideranca-resumo-rota');
        if (v && v.classList.contains('active')) {
            carregar(true);
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const v = document.getElementById('view-app-lideranca-resumo-rota');
        if (v) {
            new MutationObserver(() => {
                aplicarModoCelular();
                if (v.classList.contains('active') && S.dadosDia) {
                    carregar(true);
                }
            }).observe(v, { attributes: true, attributeFilter: ['class'] });
        }
    });
})();
