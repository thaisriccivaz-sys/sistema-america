// frontend/frota_cards.js
// Visualização em CARDS por veículo (Corretiva / Revisão) — compartilhada entre Logística e Financeiro › Compras.
// Mostra contagem de manutenções por situação, valores gastos (peças / mão de obra / total) no total e nos últimos 12 meses
// e os dias parado do veículo. Os dados vêm das listas já carregadas pelas telas (corretiva) e do endpoint
// /api/frota/revisoes-resumo-veiculos (revisão).
(function () {
    'use strict';

    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const pad = (n) => String(n).padStart(2, '0');
    const isoDe = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const hojeISO = () => isoDe(new Date());
    const limite12m = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return isoDe(d); };
    const dia = (s) => (s ? String(s).split('T')[0].split(' ')[0] : '');
    const diffDias = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
    const fmtD = (d) => { const x = dia(d); if (!x) return '—'; const p = x.split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0].slice(2) : x; };
    const tok = () => window._manutTok || window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');

    // ───────── Foto do veículo (usa as listas de frota já carregadas; cai para a foto vinda da própria linha) ─────────
    window._fcFotoVeiculo = function (vid, fallback) {
        const listas = [window._manutFrota, window._frotaDados];
        for (let i = 0; i < listas.length; i++) {
            const v = (listas[i] || []).find((x) => String(x.id) === String(vid));
            if (v && (v.foto_url || v.foto_base64)) return v.foto_url || v.foto_base64;
        }
        return fallback || '';
    };

    // ───────── Blocos reutilizáveis ─────────
    function chipsHtml(chips) {
        return '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">' + chips.map((c) => {
            const apagado = Number(c.val) === 0;
            return '<div title="' + esc(c.label) + '" style="background:' + c.cor + '14;border:1px solid ' + c.cor + '40;border-radius:8px;padding:5px 4px;text-align:center;' + (apagado ? 'opacity:0.5;' : '') + '">'
                + '<div style="font-size:1.05rem;font-weight:800;color:' + c.cor + ';line-height:1.1;">' + c.val + '</div>'
                + '<div style="font-size:0.6rem;font-weight:700;color:#475569;line-height:1.15;margin-top:1px;">' + esc(c.label) + '</div></div>';
        }).join('') + '</div>';
    }

    window._fcGastosHtml = function (g) {
        const col = (titulo, p, m, t, cor) => '<div style="flex:1;min-width:0;background:' + cor + '0d;border:1px solid ' + cor + '33;border-radius:8px;padding:6px 8px;">'
            + '<div style="font-size:0.62rem;font-weight:800;color:' + cor + ';text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px;">' + titulo + '</div>'
            + '<div style="display:flex;justify-content:space-between;gap:4px;font-size:0.72rem;color:#64748b;"><span>Peças</span><b style="color:#1e293b;">' + brl(p) + '</b></div>'
            + '<div style="display:flex;justify-content:space-between;gap:4px;font-size:0.72rem;color:#64748b;"><span>Mão de obra</span><b style="color:#1e293b;">' + brl(m) + '</b></div>'
            + '<div style="display:flex;justify-content:space-between;gap:4px;font-size:0.76rem;color:#64748b;border-top:1px dashed ' + cor + '55;margin-top:2px;padding-top:2px;"><span>Total</span><b style="color:' + cor + ';">' + brl(t) + '</b></div></div>';
        return '<div style="font-size:0.68rem;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px;margin:2px 0 4px;">Valores gastos</div>'
            + '<div style="display:flex;gap:6px;">'
            + col('Todo o período', g.pecas, g.mo, g.total, '#7c3aed')
            + col('Últimos 12 meses', g.pecas12, g.mo12, g.total12, '#0284c7')
            + '</div>';
    };

    window._fcDiasHtml = function (itens) {
        return '<div style="display:flex;gap:6px;margin-top:6px;">' + itens.map((i, idx) => {
            const laranja = i.cor === 'laranja' || idx === 1;
            const bg = laranja ? '#fff7ed' : '#fef2f2';
            const bd = laranja ? '#fed7aa' : '#fecaca';
            const cVal = laranja ? '#ea580c' : '#dc2626';
            const cLbl = laranja ? '#9a3412' : '#7f1d1d';
            return '<div style="flex:1;min-width:0;background:' + bg + ';border:1px solid ' + bd + ';border-radius:8px;padding:5px 8px;text-align:center;">'
                + '<div style="font-size:1rem;font-weight:800;color:' + cVal + ';line-height:1.1;">' + i.val + ' <span style="font-size:0.66rem;font-weight:700;">' + (Number(i.val) === 1 ? 'dia' : 'dias') + '</span></div>'
                + '<div style="font-size:0.6rem;font-weight:700;color:' + cLbl + ';margin-top:1px;">' + esc(i.label) + '</div></div>';
        }).join('') + '</div>';
    };

    // Casca padrão do card do veículo
    window._fcCardShell = function (o) {
        const parado = !!o.parado;
        const foto = window._fcFotoVeiculo(o.vid, o.foto);
        const fotoHtml = foto
            ? '<div style="height:110px;width:100%;background-image:url(\'' + foto + '\');background-size:cover;background-position:center;border-bottom:1px solid ' + (parado ? '#fecaca' : '#e2e8f0') + ';"></div>'
            : '<div style="height:110px;width:100%;background:' + (parado ? '#fee2e2' : '#f1f5f9') + ';border-bottom:1px solid ' + (parado ? '#fecaca' : '#e2e8f0') + ';display:flex;align-items:center;justify-content:center;color:' + (parado ? '#fca5a5' : '#cbd5e1') + ';font-size:2.6rem;"><i class="ph ph-truck"></i></div>';
        const ribbon = parado
            ? '<div style="position:absolute;top:8px;right:8px;background:#dc2626;color:#fff;font-size:0.62rem;font-weight:800;padding:2px 9px;border-radius:999px;z-index:2;letter-spacing:.3px;">VEÍCULO PARADO</div>' : '';
        return '<div onclick="' + o.onclickFn + '(' + JSON.stringify(String(o.vid)).replace(/"/g, '&quot;') + ')" style="background:' + (parado ? '#fff5f5' : '#fff') + ';border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08);overflow:hidden;border:' + (parado ? '2px solid #fca5a5' : '1px solid #e2e8f0') + ';position:relative;display:flex;flex-direction:column;cursor:pointer;transition:transform .2s, box-shadow .2s;" onmouseover="this.style.transform=\'translateY(-4px)\';this.style.boxShadow=\'0 12px 20px rgba(0,0,0,0.12)\';" onmouseout="this.style.transform=\'none\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.08)\';">'
            + ribbon + fotoHtml
            + '<div style="padding:0.85rem 1rem;flex:1;display:flex;flex-direction:column;gap:0.6rem;font-size:0.82rem;color:#475569;">'
            +   '<div><div style="font-weight:800;color:' + (parado ? '#dc2626' : '#1e293b') + ';font-size:1.15rem;line-height:1.1;">' + esc(o.placa || 'N/D') + '</div>'
            +   '<div style="font-size:0.74rem;color:#64748b;font-weight:600;margin-top:2px;">' + esc(o.modelo || '') + (o.tipo ? ' • <span style="text-transform:capitalize;">' + esc(String(o.tipo).toLowerCase()) + '</span>' : '') + '</div></div>'
            +   chipsHtml(o.chips)
            +   (o.destaqueHtml || '')
            +   (o.gastos ? window._fcGastosHtml(o.gastos) : '')
            +   (o.diasHtml || '')
            + '</div>'
            + '<div style="background:' + (parado ? '#fef2f2' : '#f8fafc') + ';padding:0.6rem 1rem;border-top:1px solid ' + (parado ? '#fecaca' : '#e2e8f0') + ';display:flex;justify-content:flex-end;">'
            +   '<span style="background:' + (o.corBtn || '#2563eb') + ';color:#fff;border-radius:8px;padding:0.4rem 0.9rem;font-size:0.78rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-list-magnifying-glass"></i> ' + esc(o.btnLabel || 'Ver lista') + '</span>'
            + '</div></div>';
    };

    window._fcGridCards = function (cardsHtml) {
        return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:1rem;">' + cardsHtml + '</div>';
    };

    // ───────── CORRETIVA ─────────
    // Normaliza uma linha de corretiva (Logística: status/…; Compras: manut_status/…)
    window._fcCorrNorm = function (m) {
        const status = m.status || m.manut_status || 'agendada';
        const temVideo = Number(m.tem_video_geral) > 0;
        const aberta = status !== 'concluida' && status !== 'cancelada';
        const ini = dia(m.data_inicio || m.data_agendamento || m.created_at);
        const fim = aberta ? hojeISO() : (dia(m.data_conclusao || m.data_fim || m.updated_at) || ini);
        const pecas = Number(m.custo_pecas) || 0;
        const mo = Number(m.custo_mao_obra) || 0;
        const rod = m.veiculo_rodando_efetivo || m.veiculo_rodando || (status === 'em_andamento' ? 'nao' : 'sim');
        return {
            raw: m, id: m.id, vid: m.veiculo_id, placa: m.placa, modelo: m.marca_modelo_versao, tipo: m.tipo_veiculo, foto: m.foto_url || '',
            status: status, temVideo: temVideo, finPend: status === 'concluida' && !temVideo, aberta: aberta,
            ini: ini, fim: fim, pecas: pecas, mo: mo, total: (Number(m.custo) || 0) || (pecas + mo),
            dias: Math.max(0, parseInt(m.dias_parado, 10) || 0), parado: aberta && rod === 'nao'
        };
    };

    window._fcCorrStats = function (itens) {
        const lim = limite12m(), hoje = hojeISO();
        const s = { n: 0, em_andamento: 0, agendada: 0, aguardando: 0, finPend: 0, concluida: 0, pecas: 0, mo: 0, total: 0, pecas12: 0, mo12: 0, total12: 0, dias12: 0, diasTotal: 0, parado: false, destaque: null };
        const prio = (i) => (i.status === 'em_andamento' ? 1 : i.status === 'aguardando' ? 2 : i.status === 'agendada' ? 3 : i.finPend ? 4 : 5);
        (itens || []).forEach((i) => {
            if (i.status === 'cancelada') return;
            s.n++;
            if (i.status === 'em_andamento') s.em_andamento++;
            else if (i.status === 'agendada') s.agendada++;
            else if (i.status === 'aguardando') s.aguardando++;
            else if (i.finPend) s.finPend++;
            else if (i.status === 'concluida') s.concluida++;
            s.pecas += i.pecas; s.mo += i.mo; s.total += i.total;
            s.diasTotal += i.dias;
            // valores dos últimos 12 meses: pela data de conclusão (ou de início, se ainda aberta)
            const ref = i.aberta ? (i.ini || hoje) : (i.fim || i.ini || hoje);
            if (ref >= lim) { s.pecas12 += i.pecas; s.mo12 += i.mo; s.total12 += i.total; }
            // dias parado nos últimos 12 meses: dias totais da manutenção proporcionais à parte do período dentro da janela
            if (i.dias > 0) {
                const fim = i.fim || hoje, ini = i.ini || fim;
                if (fim >= lim) {
                    if (ini >= lim) s.dias12 += i.dias;
                    else {
                        const span = Math.max(1, diffDias(ini, fim));
                        const ov = Math.max(0, diffDias(lim, fim));
                        s.dias12 += Math.min(i.dias, Math.round(i.dias * Math.min(1, ov / span)));
                    }
                }
            }
            if (i.parado) s.parado = true;
            if (!s.destaque || prio(i) < prio(s.destaque) || (prio(i) === prio(s.destaque) && Number(i.id) > Number(s.destaque.id))) s.destaque = i;
        });
        s.em_aberto = s.em_andamento + s.agendada + s.aguardando + s.finPend;
        return s;
    };

    // grupos: [{ vid, placa, modelo, tipo, foto, itens: [normalizados de TODAS as corretivas do veículo] }]
    window._fcCorrCardsHtml = function (grupos, onclickFn) {
        const lblSt = { agendada: 'Novo', em_andamento: 'Em Manutenção', aguardando: 'Aguardando', concluida: 'Concluído' };
        const corSt = { agendada: '#d97706', em_andamento: '#dc2626', aguardando: '#2563eb', concluida: '#10b981' };
        const html = grupos.map((g) => {
            const st = window._fcCorrStats(g.itens);
            const d = st.destaque;
            let destaqueHtml = '';
            if (d) {
                const cor = d.finPend ? '#ea580c' : (corSt[d.status] || '#94a3b8');
                const lbl = d.finPend ? '⏳ Finalização Pendente' : (lblSt[d.status] || d.status);
                let tp = null;
                try { tp = (typeof window._mnCalcTempos === 'function') ? window._mnCalcTempos(Object.assign({}, d.raw, { status: d.status })) : null; } catch (eT) { tp = null; }
                const diasPedido = tp ? tp.pedido.diasTxt : '—';
                const diasParado = tp ? tp.parado.diasTxt : (d.dias + (d.dias === 1 ? ' dia' : ' dias'));
                const cel = (t, v) => '<div style="min-width:0;"><div style="font-size:0.58rem;font-weight:800;color:#94a3b8;text-transform:uppercase;">' + t + '</div><div style="font-size:0.74rem;font-weight:700;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + esc(String(v).replace(/<[^>]+>/g, '')) + '">' + v + '</div></div>';
                destaqueHtml = '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:7px 9px;">'
                    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px;"><span style="font-size:0.6rem;font-weight:800;color:#94a3b8;text-transform:uppercase;">' + (d.aberta || d.finPend ? 'Manutenção em andamento' : 'Última manutenção') + '</span>'
                    + '<span style="background:' + cor + '22;color:' + cor + ';padding:1px 8px;border-radius:999px;font-size:0.64rem;font-weight:800;white-space:nowrap;">' + lbl + '</span></div>'
                    + '<div title="' + esc(d.raw.descricao || '') + '" style="font-size:0.76rem;color:#334155;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:5px;">' + esc(d.raw.descricao || '—') + '</div>'
                    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;">'
                    + cel('Data início', fmtD(d.raw.data_inicio || d.raw.data_agendamento || d.raw.created_at))
                    + cel('Dias do pedido', esc(diasPedido))
                    + cel('Dias sem rodar', esc(diasParado))
                    + cel('Data conclusão', d.status === 'concluida' ? fmtD(d.raw.data_conclusao) : '—')
                    + cel('Fornecedor', esc(d.raw.fornecedor || '—'))
                    + cel('R$ Total', d.total > 0 ? brl(d.total) : '—')
                    + '</div></div>';
            }
            return window._fcCardShell({
                vid: g.vid, placa: g.placa, modelo: g.modelo, tipo: g.tipo, foto: g.foto, parado: st.parado, onclickFn: onclickFn,
                chips: [
                    { label: 'Em aberto', val: st.em_aberto, cor: '#e11d48' },
                    { label: 'Em manutenção', val: st.em_andamento, cor: '#dc2626' },
                    { label: 'Novos', val: st.agendada, cor: '#d97706' },
                    { label: 'Aguardando', val: st.aguardando, cor: '#2563eb' },
                    { label: '⏳ Final. Pendente', val: st.finPend, cor: '#ea580c' },
                    { label: 'Concluídas', val: st.concluida, cor: '#10b981' }
                ],
                destaqueHtml: destaqueHtml,
                gastos: { pecas: st.pecas, mo: st.mo, total: st.total, pecas12: st.pecas12, mo12: st.mo12, total12: st.total12 },
                diasHtml: window._fcDiasHtml([{ label: 'parado nos últimos 12 meses', val: st.dias12 }, { label: 'parado no total', val: st.diasTotal }]),
                btnLabel: 'Ver manutenções (' + st.n + ')', corBtn: '#2563eb'
            });
        }).join('');
        return html ? window._fcGridCards(html) : '<div style="padding:3rem;text-align:center;color:#94a3b8;"><i class="ph ph-wrench" style="font-size:2rem;display:block;margin-bottom:8px;"></i>Nenhum veículo com manutenção corretiva encontrado.</div>';
    };

    // Monta os grupos por veículo: todas = todas as corretivas (para os totais); visiveis = linhas que passaram nos filtros
    window._fcAgruparCorretivas = function (todas, visiveis) {
        const porV = {};
        (todas || []).forEach((m) => { (porV[String(m.veiculo_id)] = porV[String(m.veiculo_id)] || []).push(window._fcCorrNorm(m)); });
        const vids = [];
        (visiveis || []).forEach((m) => { const k = String(m.veiculo_id); if (vids.indexOf(k) === -1) vids.push(k); });
        const grupos = vids.map((k) => {
            const itens = porV[k] || [];
            const f = itens[0] || {};
            const abertas = itens.filter((i) => i.aberta || i.finPend).length;
            return { vid: k, placa: f.placa, modelo: f.modelo, tipo: f.tipo, foto: f.foto, itens: itens, _abertas: abertas };
        });
        grupos.sort((a, b) => ((b._abertas > 0) - (a._abertas > 0)) || String(a.placa || '').localeCompare(String(b.placa || '')));
        return grupos;
    };

    // ───────── REVISÃO ─────────
    window._fcRevResumoMap = window._fcRevResumoMap || {};
    window._fcCarregarRevResumo = async function () {
        const r = await fetch('/api/frota/revisoes-resumo-veiculos?_=' + Date.now(), { headers: { Authorization: 'Bearer ' + tok() }, cache: 'no-store' });
        const j = await r.json();
        if (!r.ok || !Array.isArray(j)) throw new Error((j && j.error) || 'Erro ao carregar o resumo das revisões');
        const mapa = {};
        j.forEach((x) => { mapa[String(x.veiculo_id)] = x; });
        window._fcRevResumoMap = mapa;
        return mapa;
    };

    window._fcRevResumoDe = function (vid) {
        const x = (window._fcRevResumoMap || {})[String(vid)] || {};
        return {
            n: Number(x.n_realizadas) || 0,
            gastos: { pecas: Number(x.pecas_total) || 0, mo: Number(x.mo_total) || 0, total: Number(x.total_total) || 0, pecas12: Number(x.pecas_12m) || 0, mo12: Number(x.mo_12m) || 0, total12: Number(x.total_12m) || 0 },
            diasTotal: Number(x.dias_parado_total) || 0, dias12: Number(x.dias_parado_12m) || 0
        };
    };

    // Bloco (valores + dias parado em revisão) usado no card de veículo da aba Revisão da Logística
    window._fcRevResumoHtml = function (vid) {
        const r = window._fcRevResumoDe(vid);
        return '<div style="border-top:1px solid #e2e8f0;padding-top:0.5rem;margin-top:0.1rem;">'
            + '<div style="font-size:0.68rem;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">' + r.n + ' revisão(ões) realizada(s)</div>'
            + window._fcGastosHtml(r.gastos)
            + window._fcDiasHtml([{ label: 'parado em revisão (12 meses)', val: r.dias12 }, { label: 'parado em revisão (total)', val: r.diasTotal }])
            + '</div>';
    };
})();
