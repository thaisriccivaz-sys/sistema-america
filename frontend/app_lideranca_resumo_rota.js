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
        filtro: 'todos', // todos | pendentes | concluidos
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
            total++;
            if (o.checked) concluidos++;
        });
        (v.entregas || []).forEach(it => {
            if (it.status === 'sem_checklist') return;
            total++;
            if (it.checked) concluidos++;
        });
        (v.retiradas || []).forEach(it => {
            if (it.status === 'sem_checklist') return;
            total++;
            if (it.checked) concluidos++;
        });
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
        const resumosDoDia = dDia.resumos || [];
        const escalaDia = dDia.escala_dia || {};
        const turnoAtivo = S.turno || dDia.turno_ativo || 'diurno';
        const geral = statsGeral(todosVeiculos);

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

            ${resumosDoDia.length > 1 ? `
            <div class="arr-resumos-bar">
                ${resumosDoDia.map(r => `
                    <button class="alc-chip ${Number(r.id) === Number(S.resumoId) ? 'on' : ''}" data-resumo-id="${r.id}">
                        <i class="ph ph-note"></i> ${esc(r.nome)}
                    </button>
                `).join('')}
            </div>` : ''}

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
                    <div class="arr-banner-prog">
                        <i class="ph-fill ph-check-circle"></i>
                        <span id="arr-banner-prog-txt">${geral.concluidos} / ${geral.total} checks</span>
                    </div>
                </div>
            </div>

            <div id="arr-cards-list">
                ${todosVeiculos.length === 0
                    ? `<div class="alc-vazio">
                        <i class="ph ph-map-trifold"></i>
                        <p>Nenhum Resumo de Rota salvo para <b>${fmtBR(S.data)}</b>.</p>
                        <small style="color:#64748b;">Gere ou salve o Resumo da Rota na tela de Logística para visualizá-lo aqui.</small>
                       </div>`
                    : (veiculosFiltrados.length === 0
                        ? `<div class="alc-vazio"><i class="ph ph-magnifying-glass"></i><p>Nenhum veículo encontrado para este filtro.</p></div>`
                        : veiculosFiltrados.map(v => renderCardVeiculo(v, turnoAtivo, escalaDia)).join(''))
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

    function renderPainelEscalaLideres(escalaDia, turnoAtivo) {
        const diu = escalaDia.diurno || { nomes: '—', escalados: [], folga: [], progresso: { feitos: 0, total: 0 }, realizado_por: [] };
        const not = escalaDia.noturno || { nomes: '—', escalados: [], folga: [], progresso: { feitos: 0, total: 0 }, realizado_por: [] };

        function cardTurno(chave, icone, titulo, dadosTurno) {
            const ativo = turnoAtivo === chave;
            const prog = dadosTurno.progresso || { feitos: 0, total: 0, concluido: false };
            const real = dadosTurno.realizado_por || [];
            const folgaNomes = (dadosTurno.folga || []).map(f => f.nome_curto).join(', ');
            const realTxt = real.length > 0
                ? `Realizado por: ${real.map(r => r.nome).join(', ')}${real[0].atualizado_em ? ' (' + fmtDataHora(real[0].atualizado_em) + ')' : ''}`
                : 'Ainda não realizado neste turno';

            return `
            <button type="button" class="arr-escala-card ${chave} ${ativo ? 'on' : ''}" data-turno="${chave}">
                <div class="arr-escala-top">
                    <span class="arr-escala-tit">${icone} ${titulo}</span>
                    <span class="alc-badge ${prog.concluido ? 'verde' : (prog.feitos > 0 ? 'laranja' : 'cinza')}">
                        ${prog.feitos}/${prog.total}
                    </span>
                </div>
                <div class="arr-escala-resp">
                    Responsável (Escala): <b>${esc(dadosTurno.nomes || '—')}</b>
                    ${folgaNomes ? `<small style="display:block;color:#94a3b8;">Folga no dia: ${esc(folgaNomes)}</small>` : ''}
                </div>
                <div class="arr-escala-real ${real.length > 0 ? '' : 'pend'}">
                    <i class="ph-fill ${real.length > 0 ? 'ph-check-circle' : 'ph-clock'}"></i>
                    <span>${esc(realTxt)}</span>
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

    function renderCrewMember(pessoa, tipoClass, cargoLabel) {
        if (!pessoa || !pessoa.nome || pessoa.nome === '—') return '';
        const ini = esc(iniciais(pessoa.nome));
        const inner = pessoa.foto_url
            ? `<img src="${esc(pessoa.foto_url)}" alt="" onerror="this.outerHTML='<span class=\\'arr-ring-fb\\'>${ini}</span>'">`
            : `<span class="arr-ring-fb">${ini}</span>`;
        return `
        <div class="arr-crew-item">
            <div class="arr-ring ${tipoClass}">
                <div class="arr-ring-in">${inner}</div>
            </div>
            <div class="arr-crew-info">
                <div class="arr-crew-name">${esc(pessoa.nome)}</div>
                <div class="arr-crew-role ${tipoClass === 'cand' ? 'cand' : ''}">${esc(cargoLabel)}</div>
            </div>
        </div>`;
    }

    function renderCardVeiculo(v, turnoAtivo, escalaDia) {
        const st = statsVeiculo(v);
        const badgeCls = st.total === 0 ? 'cinza' : (st.completo ? 'verde' : (st.concluidos > 0 ? 'laranja' : 'vermelho'));
        const badgeTxt = st.total === 0 ? 'Sem itens' : (st.completo ? `Concluído (${st.concluidos}/${st.total})` : `${st.concluidos}/${st.total} OK`);

        const respEscala = v.responsavel_escala || {};
        const nomeRespTurno = respEscala.nomes || (turnoAtivo === 'noturno' ? escalaDia?.noturno?.nomes : escalaDia?.diurno?.nomes) || '—';
        const realizadoPor = v.realizado_por || [];
        const realizadoTxt = realizadoPor.length > 0
            ? `${realizadoPor.map(r => r.nome).join(', ')}${realizadoPor[0].atualizado_em ? ' (' + fmtDataHora(realizadoPor[0].atualizado_em) + ')' : ''}`
            : 'Pendente';

        // Equipe: Motorista, Ajudante Geral e Candidato(s) se tiver
        const crewHtml = [
            renderCrewMember(v.motorista, 'mot', v.motorista?.cargo || 'Motorista'),
            renderCrewMember(v.ajudante, 'aju', v.ajudante?.cargo || 'Ajudante Geral'),
            ...(v.candidatos || []).map(c => renderCrewMember(c, 'cand', c.cargo || 'Candidato em Teste'))
        ].filter(Boolean).join('') || `<div style="font-size:0.8rem;color:#94a3b8;">Sem equipe definida</div>`;

        // 1. Observações de rota (check manual)
        const obsHtml = (v.observacoes || []).length > 0 ? `
            <div class="arr-sec">
                ${v.observacoes.map(obs => {
                    const subInfo = obs.checked
                        ? `✅ Realizado por: ${obs.lider_nome || 'Líder'}${obs.atualizado_em ? ' (' + fmtDataHora(obs.atualizado_em) + ')' : ''} • Resp. escala: ${nomeRespTurno}`
                        : `⏳ Resp. na escala (${turnoAtivo === 'noturno' ? 'Noturna' : 'Diurna'}): ${nomeRespTurno}`;
                    return `
                    <button type="button" class="arr-row interactive ${obs.checked ? 'checked' : ''}"
                        data-action="toggle-check"
                        data-veiculo-key="${esc(v.veiculo_key)}"
                        data-tipo="obs"
                        data-key="${esc(obs.item_key)}">
                        <div class="arr-row-txt">
                            ${formatarTextoObsHtml(obs.texto)}
                            <span class="arr-row-sub">${esc(subInfo)}</span>
                        </div>
                        <span class="arr-chk" title="Marcar observação como verificada"><i class="ph-bold ph-check"></i></span>
                    </button>`;
                }).join('')}
            </div>` : '';

        // 2. Entregas (check automático pelo menu de Entregas)
        const entregasHtml = (v.entregas || []).length > 0 ? `
            <div class="arr-sec">
                <div class="arr-sec-title entrega">${esc(v.titulo_entrega || 'ENTREGA OBRA:')}</div>
                ${v.entregas.map(it => {
                    const parcial = !it.checked && it.concluidas > 0;
                    const cls = it.checked ? 'checked' : (parcial ? 'parcial' : '');
                    const statusSub = it.checked
                        ? `✅ Checklist concluído (${it.concluidas}/${it.total_unidades})${it.lider_nome ? ' • Realizado por: ' + it.lider_nome : ''}${it.atualizado_em ? ' (' + fmtDataHora(it.atualizado_em) + ')' : ''}`
                        : `⏳ Pendente no menu Entregas (${it.concluidas}/${it.total_unidades}) • Resp. escala: ${nomeRespTurno} — toque p/ abrir`;
                    return `
                    <button type="button" class="arr-row interactive ${cls}"
                        data-action="goto-entregas"
                        data-veiculo="${esc(v.veiculo)}"
                        data-texto="${esc(it.texto)}"
                        data-lider="${esc(it.lider_nome || '')}"
                        data-concluidas="${it.concluidas}"
                        data-total="${it.total_unidades}">
                        <div class="arr-row-txt">
                            <strong>${esc(it.texto)}</strong>
                            <span class="arr-row-sub">${esc(statusSub)}</span>
                        </div>
                        <span class="arr-chk auto" title="Check automático pelo Checklist de Entregas">
                            <i class="ph-bold ${it.checked ? 'ph-check' : (parcial ? 'ph-dots-three' : 'ph-check')}"></i>
                        </span>
                    </button>`;
                }).join('')}
            </div>` : '';

        // 3. Retiradas (check automático pelo menu de Retiradas)
        const retiradasHtml = (v.retiradas || []).length > 0 ? `
            <div class="arr-sec">
                <div class="arr-sec-title retirada">⭕ RETIRADA:</div>
                ${v.retiradas.map(it => {
                    const parcial = !it.checked && it.concluidas > 0;
                    const cls = it.checked ? 'checked' : (parcial ? 'parcial' : '');
                    const statusSub = it.checked
                        ? `✅ Checklist concluído (${it.concluidas}/${it.total_unidades})${it.lider_nome ? ' • Realizado por: ' + it.lider_nome : ''}${it.atualizado_em ? ' (' + fmtDataHora(it.atualizado_em) + ')' : ''}`
                        : `⏳ Pendente no menu Retiradas (${it.concluidas}/${it.total_unidades}) • Resp. escala: ${nomeRespTurno} — toque p/ abrir`;
                    return `
                    <button type="button" class="arr-row interactive ${cls}"
                        data-action="goto-retiradas"
                        data-veiculo="${esc(v.veiculo)}"
                        data-texto="${esc(it.texto)}"
                        data-lider="${esc(it.lider_nome || '')}"
                        data-concluidas="${it.concluidas}"
                        data-total="${it.total_unidades}">
                        <div class="arr-row-txt">
                            <strong>${esc(it.texto)}</strong>
                            <span class="arr-row-sub">${esc(statusSub)}</span>
                        </div>
                        <span class="arr-chk auto" title="Check automático pelo Checklist de Retiradas">
                            <i class="ph-bold ${it.checked ? 'ph-check' : (parcial ? 'ph-dots-three' : 'ph-check')}"></i>
                        </span>
                    </button>`;
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
                    return `
                    ${mostrarTitulo ? `<div class="arr-sec-title manutencao">${esc(it.secao_titulo)}</div>` : ''}
                    <div class="arr-manut-card">
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
                                const subIns = ins.checked
                                    ? `✅ Realizado por: ${ins.lider_nome || 'Líder'}${ins.atualizado_em ? ' (' + fmtDataHora(ins.atualizado_em) + ')' : ''}`
                                    : `⏳ Resp. escala: ${nomeRespTurno}`;
                                return `
                                <button type="button" class="arr-insumo-row ${ins.checked ? 'checked' : ''}"
                                    data-action="toggle-check"
                                    data-veiculo-key="${esc(v.veiculo_key)}"
                                    data-tipo="insumo"
                                    data-key="${esc(ins.item_key)}">
                                    <span class="arr-insumo-ico">${esc(ins.icone || '📦')}</span>
                                    <span class="arr-insumo-txt">
                                        ${esc(ins.texto)}
                                        <small class="arr-row-sub">${esc(subIns)}</small>
                                    </span>
                                    <span class="arr-chk"><i class="ph-bold ph-check"></i></span>
                                </button>`;
                            }).join('')}
                        </div>` : `<div class="arr-sem-insumos">Este equipamento não requer insumos de manutenção.</div>`}
                    </div>`;
                }).join('')}
            </div>` : '';

        return `
        <article class="arr-vcard ${st.completo ? 'concluido' : ''}" data-vcard="${esc(v.veiculo_key)}">
            <div class="arr-vhead">
                <div class="arr-vtitle">
                    <span>🚚 ${esc(v.veiculo)}</span>
                </div>
                <span class="alc-badge ${badgeCls}">
                    <i class="ph-fill ${st.completo ? 'ph-check-circle' : 'ph-clock'}"></i> ${badgeTxt}
                </span>
            </div>
            <div class="arr-vlider-bar">
                <div class="arr-vlider-item">
                    <i class="ph-fill ph-user-focus"></i>
                    <span>Resp. Escala (${turnoAtivo === 'noturno' ? '🌙 Noturna' : '☀️ Diurna'}): <b>${esc(nomeRespTurno)}</b></span>
                </div>
                <div class="arr-vlider-item ${realizadoPor.length > 0 ? 'ok' : 'pend'}">
                    <i class="ph-fill ${realizadoPor.length > 0 ? 'ph-check-circle' : 'ph-hourglass'}"></i>
                    <span>Realizado por: <b>${esc(realizadoTxt)}</b></span>
                </div>
            </div>
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
                carregar(false);
            };
        });

        root.querySelectorAll('[data-resumo-id]').forEach(b => {
            b.onclick = () => {
                S.resumoId = Number(b.dataset.resumoId);
                carregar(false);
            };
        });

        root.querySelectorAll('[data-f]').forEach(b => {
            b.onclick = () => {
                S.filtro = b.dataset.f;
                renderLista();
            };
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
