/**
 * faculdade_pagamentos.js
 * RH › Pagamentos › Faculdade
 *
 * - Todos os colaboradores que já tiveram Faculdade = Sim (Ativo/Inativo; desligado = Inativo)
 * - Boleto de todos os meses (anexar e enviar ao financeiro, um por um, com e-mail editável)
 * - Boletim nos ciclos de Janeiro e Julho (só anexar; não é enviado). Pendente = aparece até anexar.
 * - Tudo é gravado nos mesmos documentos da aba Faculdade do prontuário do colaborador.
 *
 * Endpoints próprios: /api/faculdade-pagamentos/*  (permissão: página 'rh-faculdade-pagamentos')
 * Reutiliza: POST /api/documentos, GET /api/documentos/view/:id, POST /api/send-boleto-financeiro
 */
(function () {
    'use strict';

    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    let _mes = null;
    let _data = null;
    let _ctxUpload = null;   // { colaborador_id, nome, tipo, year, month }

    // ── Utilidades ───────────────────────────────────────────────────────────────
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const mesLabel = m => { const p = String(m || '').split('-'); return p.length === 2 ? MESES[parseInt(p[1], 10) - 1] + '/' + p[0] : ''; };
    const fmtData = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : (s || ''); };
    const fmtDataHora = s => {
        if (!s) return '';
        const d = new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') || String(s).includes('T') ? '' : 'Z'));
        return isNaN(d.getTime()) ? String(s) : d.toLocaleString('pt-BR');
    };
    const mesAtual = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
    const getToken = () => window.currentToken || (typeof currentToken !== 'undefined' ? currentToken : '') || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    const erroSwal = (titulo, msg) => Swal.fire({ icon: 'error', title: titulo, text: msg, confirmButtonColor: '#0369a1' });
    const curto = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

    async function api(path, opts) {
        opts = opts || {};
        const headers = Object.assign({ Authorization: 'Bearer ' + getToken() }, opts.headers || {});
        if (opts.body && !(opts.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
        const r = await fetch(API_URL + path, Object.assign({}, opts, { headers }));
        let b = null;
        try { b = await r.json(); } catch (e) { /* resposta sem JSON */ }
        if (!r.ok) throw new Error((b && (b.error || b.message)) || ('Erro HTTP ' + r.status));
        return b;
    }

    // ── Tela ─────────────────────────────────────────────────────────────────────
    window.renderFaculdadePagamentos = async function () {
        const c = document.getElementById('rh-faculdade-pagamentos-container');
        if (!c) return;
        if (!_mes) _mes = mesAtual();
        c.innerHTML = `
        <div style="padding:1.5rem 2rem;max-width:1500px;margin:0 auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:1.25rem;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:46px;height:46px;border-radius:12px;background:#e0f2fe;display:flex;align-items:center;justify-content:center;"><i class="ph ph-graduation-cap" style="font-size:1.6rem;color:#0369a1;"></i></div>
                    <div>
                        <h2 style="margin:0;font-size:1.35rem;color:#0f172a;">Faculdade</h2>
                        <div style="font-size:0.82rem;color:#64748b;">Boletos mensais (enviados ao financeiro) e boletins de Janeiro e Julho</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <label style="font-size:0.8rem;font-weight:700;color:#475569;">Mês</label>
                    <input type="month" id="facpag-mes" value="${esc(_mes)}" onchange="window._facpagMudarMes(this.value)" style="border:1.5px solid #cbd5e1;border-radius:8px;padding:7px 10px;font-size:0.9rem;">
                    <button class="btn btn-secondary" onclick="window._facpagConfig()" title="Configurações (e-mail padrão do financeiro)"><i class="ph ph-gear"></i></button>
                </div>
            </div>
            <input type="file" id="facpag-file" accept="application/pdf,.pdf" style="display:none;" onchange="window._facpagArquivo(this)">
            <div id="facpag-body"><div style="padding:3rem;text-align:center;color:#64748b;"><i class="ph ph-spinner ph-spin"></i> Carregando...</div></div>
        </div>`;
        await carregar();
    };

    async function carregar() {
        const body = document.getElementById('facpag-body');
        if (!body) return;
        try {
            _data = await api('/faculdade-pagamentos?mes=' + encodeURIComponent(_mes));
            body.innerHTML = renderCorpo(_data);
        } catch (e) {
            body.innerHTML = `<div style="padding:2rem;text-align:center;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;"><i class="ph ph-warning-circle"></i> ${esc(e.message)}</div>`;
        }
    }

    window._facpagMudarMes = function (v) {
        if (!/^\d{4}-\d{2}$/.test(v || '')) return;
        _mes = v;
        carregar();
    };

    function card(titulo, valor, cor, icone, sub) {
        return `<div style="flex:1;min-width:170px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;border-left:4px solid ${cor};">
            <div style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;display:flex;align-items:center;gap:6px;"><i class="ph ${icone}" style="color:${cor};"></i>${esc(titulo)}</div>
            <div style="font-size:1.5rem;font-weight:800;color:#0f172a;margin-top:4px;">${valor}</div>
            ${sub ? `<div style="font-size:0.74rem;color:#64748b;margin-top:2px;">${sub}</div>` : ''}
        </div>`;
    }

    const btnIcone = (icone, titulo, onclick, cor) => `<button class="btn btn-secondary" title="${esc(titulo)}" onclick="${onclick}" style="padding:4px 8px;${cor ? 'color:' + cor + ';' : ''}"><i class="ph ${icone}"></i></button>`;
    const badge = (txt, bg, fg) => `<span style="background:${bg};color:${fg};border-radius:999px;padding:3px 10px;font-size:0.74rem;font-weight:700;white-space:nowrap;">${txt}</span>`;

    function celulaBoleto(i) {
        const b = i.boleto;
        const ano = _data.ano, mm = _data.mes_num;
        const args = `${i.colaborador_id},'Boleto','${ano}','${mm}'`;
        if (b.doc) {
            const enviado = !!b.doc.enviado_em;
            return `<div style="display:flex;flex-direction:column;gap:6px;">
                <div>${enviado ? badge('✅ Enviado ' + esc(fmtDataHora(b.doc.enviado_em)), '#dcfce7', '#166534') : badge('📎 Anexado — aguardando envio', '#dbeafe', '#1e40af')}</div>
                <div style="font-size:0.72rem;color:#64748b;" title="${esc(b.doc.file_name)}">${esc(curto(b.doc.file_name, 38))}</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                    ${btnIcone('ph-eye', 'Ver boleto', `window._facpagVer(${b.doc.id})`)}
                    <button class="btn btn-primary" onclick="window._facpagEnviar(${i.colaborador_id},${b.doc.id})" style="padding:4px 10px;font-size:0.78rem;background:${enviado ? '#64748b' : '#16a34a'};border-color:${enviado ? '#64748b' : '#16a34a'};"><i class="ph ph-paper-plane-tilt"></i> ${enviado ? 'Reenviar' : 'Enviar ao financeiro'}</button>
                    ${btnIcone('ph-arrows-clockwise', 'Substituir boleto', `window._facpagAnexar(${args})`)}
                    ${btnIcone('ph-trash', 'Remover boleto', `window._facpagRemover(${b.doc.id},'boleto')`, '#dc2626')}
                </div></div>`;
        }
        if (b.exigido) {
            return `<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start;">${badge('⏳ Pendente', '#fef3c7', '#92400e')}
                <button class="btn btn-secondary" onclick="window._facpagAnexar(${args})" style="padding:4px 10px;font-size:0.78rem;"><i class="ph ph-paperclip"></i> Anexar boleto</button></div>`;
        }
        return `<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start;"><span style="color:#94a3b8;">—</span>
            <button class="btn btn-secondary" onclick="window._facpagAnexar(${args})" style="padding:3px 8px;font-size:0.72rem;opacity:0.8;"><i class="ph ph-paperclip"></i> Anexar</button></div>`;
    }

    function celulaBoletim(i) {
        const bt = i.boletim;
        if (bt.estado === 'pendente') {
            const [y, m] = bt.ciclo.split('-');
            const extra = bt.pendentes_qtd > 1 ? `<div style="font-size:0.72rem;color:#b45309;">+ ${bt.pendentes_qtd - 1} ciclo(s) posterior(es) também pendente(s)</div>` : '';
            return `<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start;">${badge('⚠ Pendente — ' + esc(mesLabel(bt.ciclo)), '#fee2e2', '#991b1b')}${extra}
                <button class="btn btn-secondary" onclick="window._facpagAnexar(${i.colaborador_id},'Boletim','${y}','${m}')" style="padding:4px 10px;font-size:0.78rem;"><i class="ph ph-paperclip"></i> Anexar boletim</button></div>`;
        }
        if (bt.estado === 'anexado') {
            return `<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start;">${badge('✔ Anexado — ciclo ' + esc(mesLabel(bt.ciclo)), '#dcfce7', '#166534')}
                <div style="display:flex;gap:4px;">${btnIcone('ph-eye', 'Ver boletim', `window._facpagVer(${bt.doc.id})`)}${btnIcone('ph-trash', 'Remover boletim', `window._facpagRemover(${bt.doc.id},'boletim')`, '#dc2626')}</div></div>`;
        }
        return '<span style="color:#94a3b8;">—</span>';
    }

    function renderCorpo(d) {
        const r = d.resumo;
        const cards = `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:1rem;">
            ${card('Ativos', r.qtd_ativos, '#16a34a', 'ph-check-circle', r.qtd_inativos + ' inativo(s)')}
            ${card('Boletos pendentes', r.boletos_pendentes, '#d97706', 'ph-hourglass', esc(mesLabel(d.mes)))}
            ${card('Boletos a enviar', r.boletos_anexados, '#2563eb', 'ph-paperclip', 'anexados, não enviados')}
            ${card('Boletos enviados', r.boletos_enviados, '#059669', 'ph-paper-plane-tilt', 'ao financeiro')}
            ${card('Boletins pendentes', r.boletins_pendentes, '#dc2626', 'ph-warning', 'ciclos Jan/Jul')}
        </div>`;
        const linhas = d.itens.map(i => {
            const ativo = i.status === 'ativo';
            const st = ativo
                ? badge('Ativo', '#dcfce7', '#166534')
                : `<span title="${i.data_saida ? 'Inativo desde ' + esc(fmtData(i.data_saida)) : 'Inativo'}">${badge('Inativo', '#e2e8f0', '#475569')}</span>`;
            const obs = i.desligado ? '<div style="font-size:0.7rem;color:#b91c1c;margin-top:3px;">Colaborador desligado</div>' : '';
            const curso = (i.curso || i.instituicao) ? esc([i.curso, i.instituicao].filter(Boolean).join(' — ')) : '<span style="color:#94a3b8;">Curso não informado</span>';
            return `<tr style="${ativo ? '' : 'opacity:0.82;'}border-top:1px solid #f1f5f9;vertical-align:top;">
                <td style="padding:10px 12px;"><div style="font-weight:600;color:#0f172a;">${esc(i.nome)}</div><div style="font-size:0.72rem;color:#64748b;">${esc(i.cpf)}</div></td>
                <td style="padding:10px 12px;font-size:0.82rem;color:#334155;">${curso}</td>
                <td style="padding:10px 12px;text-align:center;">${st}${obs}</td>
                <td style="padding:10px 12px;">${celulaBoleto(i)}</td>
                <td style="padding:10px 12px;">${celulaBoletim(i)}</td>
            </tr>`;
        }).join('');
        return cards + `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:1.25rem;">
            <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
                <thead><tr style="background:#f8fafc;color:#475569;font-size:0.74rem;text-transform:uppercase;">
                    <th style="padding:10px 12px;text-align:left;">Colaborador</th><th style="padding:10px 12px;text-align:left;">Curso / Instituição</th>
                    <th style="padding:10px 12px;">Status</th><th style="padding:10px 12px;text-align:left;min-width:300px;">Boleto — ${esc(mesLabel(d.mes))}</th><th style="padding:10px 12px;text-align:left;min-width:220px;">Boletim</th>
                </tr></thead>
                <tbody>${linhas || '<tr><td colspan="5" style="padding:2rem;text-align:center;color:#94a3b8;">Nenhum colaborador com faculdade cadastrado.</td></tr>'}</tbody>
            </table></div></div>
            <div style="font-size:0.78rem;color:#64748b;"><i class="ph ph-info"></i> Boletos e boletins anexados aqui também aparecem na aba <b>Faculdade</b> do prontuário do colaborador. O boletim não é enviado por e-mail.</div>`;
    }

    // ── Anexar ───────────────────────────────────────────────────────────────────
    window._facpagAnexar = function (colabId, tipo, year, month) {
        const it = _data && _data.itens.find(x => x.colaborador_id === colabId);
        _ctxUpload = { colaborador_id: colabId, nome: it ? it.nome : '', tipo, year, month };
        const inp = document.getElementById('facpag-file');
        if (inp) inp.click();
    };

    window._facpagArquivo = async function (inp) {
        const file = inp.files && inp.files[0];
        inp.value = '';
        const ctx = _ctxUpload;
        if (!file || !ctx) return;
        if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return erroSwal('Arquivo inválido', 'Anexe o arquivo em PDF.');
        Swal.fire({ title: 'Anexando ' + (ctx.tipo === 'Boleto' ? 'boleto' : 'boletim') + '...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('colaborador_id', ctx.colaborador_id);
            fd.append('colaborador_nome', ctx.nome);
            fd.append('tab_name', 'Faculdade');
            fd.append('document_type', ctx.tipo);
            fd.append('year', ctx.year);
            fd.append('month', ctx.month);
            await api('/documentos', { method: 'POST', body: fd });
            await api('/faculdade-pagamentos/pos-upload', { method: 'POST', body: JSON.stringify({ colaborador_id: ctx.colaborador_id, tipo: ctx.tipo, year: ctx.year, month: ctx.month }) });
            Swal.close();
            await carregar();
        } catch (e) { erroSwal('Erro ao anexar', e.message); }
    };

    // ── Ver / Remover ────────────────────────────────────────────────────────────
    window._facpagVer = async function (docId) {
        try {
            const r = await fetch(API_URL + '/documentos/view/' + docId, { headers: { Authorization: 'Bearer ' + getToken() } });
            if (!r.ok) { let b = null; try { b = await r.json(); } catch (e) { /* sem JSON */ } throw new Error((b && b.error) || ('Erro HTTP ' + r.status)); }
            const blob = await r.blob();
            window.open(URL.createObjectURL(blob), '_blank');
        } catch (e) { erroSwal('Erro ao abrir o arquivo', e.message); }
    };

    window._facpagRemover = async function (docId, rotulo) {
        const r = await Swal.fire({ icon: 'warning', title: 'Remover ' + rotulo + '?', text: 'O arquivo também será removido da aba Faculdade do prontuário.', showCancelButton: true, confirmButtonText: 'Remover', cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626' });
        if (!r.isConfirmed) return;
        try { await api('/faculdade-pagamentos/documento/' + docId, { method: 'DELETE' }); carregar(); }
        catch (e) { erroSwal('Erro ao remover', e.message); }
    };

    // ── Enviar boleto ao financeiro (um por um) ──────────────────────────────────
    window._facpagEnviar = async function (colabId, docId) {
        const it = _data && _data.itens.find(x => x.colaborador_id === colabId);
        const r = await Swal.fire({
            title: 'Enviar boleto ao financeiro',
            width: 560,
            html: `<div style="text-align:left;font-size:0.88rem;color:#334155;margin-bottom:10px;"><b>${esc(it ? it.nome : '')}</b><br>Competência: ${esc(mesLabel(_data.mes))}</div>
                <div style="text-align:left;"><label style="font-size:0.8rem;font-weight:700;color:#475569;display:block;margin-bottom:3px;">Para (e-mail do financeiro — pode ser editado)</label>
                <input id="facpag-em-to" type="text" value="${esc(_data.email_financeiro)}" style="width:100%;box-sizing:border-box;border:1.5px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:0.9rem;"></div>
                <label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:#475569;text-align:left;margin-top:10px;"><input id="facpag-em-def" type="checkbox"> Salvar este e-mail como padrão</label>`,
            showCancelButton: true, confirmButtonText: 'Enviar', cancelButtonText: 'Cancelar', confirmButtonColor: '#16a34a',
            preConfirm: () => {
                const to = document.getElementById('facpag-em-to').value.trim();
                if (!to) { Swal.showValidationMessage('Informe o e-mail do financeiro.'); return false; }
                return { to, salvar: document.getElementById('facpag-em-def').checked };
            }
        });
        if (!r.isConfirmed) return;
        Swal.fire({ title: 'Enviando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const res = await api('/send-boleto-financeiro', { method: 'POST', body: JSON.stringify({ document_id: docId, email_to: r.value.to }) });
            if (res && res.sucesso === false) throw new Error(res.error || 'Erro desconhecido');
            if (r.value.salvar) { try { await api('/faculdade-pagamentos/config', { method: 'PUT', body: JSON.stringify({ email_financeiro: r.value.to }) }); } catch (e) { /* não bloqueia */ } }
            await Swal.fire({ icon: 'success', title: 'Boleto enviado!', text: 'Enviado para ' + r.value.to + '.', timer: 2200, showConfirmButton: false });
            carregar();
        } catch (e) { erroSwal('Falha no envio', e.message); }
    };

    window._facpagConfig = async function () {
        let cfg;
        try { cfg = await api('/faculdade-pagamentos/config'); } catch (e) { return erroSwal('Erro', e.message); }
        const r = await Swal.fire({
            title: 'Configurações da Faculdade',
            width: 520,
            html: `<div style="text-align:left;"><label style="font-size:0.8rem;font-weight:700;color:#475569;display:block;margin-bottom:3px;">E-mail padrão do financeiro</label>
                <input id="facpag-cf-em" type="text" value="${esc(cfg.email_financeiro)}" style="width:100%;box-sizing:border-box;border:1.5px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:0.9rem;"></div>`,
            showCancelButton: true, confirmButtonText: 'Salvar', cancelButtonText: 'Cancelar', confirmButtonColor: '#0369a1',
            preConfirm: () => ({ email_financeiro: document.getElementById('facpag-cf-em').value.trim() })
        });
        if (!r.isConfirmed) return;
        try {
            await api('/faculdade-pagamentos/config', { method: 'PUT', body: JSON.stringify(r.value) });
            if (_data) _data.email_financeiro = r.value.email_financeiro;
        } catch (e) { erroSwal('Erro ao salvar', e.message); }
    };
})();
