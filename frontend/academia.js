/**
 * academia.js
 * RH › Pagamentos › Academia
 *
 * - Controle de todos os colaboradores que têm ou já tiveram academia (Ativo/Inativo)
 * - Valor pago à academia por colaborador (padrão R$ 70) e total separado por mês
 * - Planilha, envio para a academia (e-mail editável), conferência da NF e envio ao financeiro
 *
 * Endpoints: /api/academia/*  (permissão: página 'rh-academia' no Controle de Acesso)
 */
(function () {
    'use strict';

    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    let _mes = null;
    let _data = null;

    // ── Utilidades ───────────────────────────────────────────────────────────────
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const mesLabel = m => { const p = String(m || '').split('-'); return p.length === 2 ? MESES[parseInt(p[1], 10) - 1] + '/' + p[0] : ''; };
    const fmtData = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : (s || ''); };
    const fmtDataHora = s => {
        if (!s) return '';
        const d = new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') || String(s).includes('T') ? '' : 'Z'));
        return isNaN(d.getTime()) ? String(s) : d.toLocaleString('pt-BR');
    };
    const mesAtual = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
    const getToken = () => window.currentToken || (typeof currentToken !== 'undefined' ? currentToken : '') || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';

    async function api(path, opts) {
        opts = opts || {};
        const headers = Object.assign({ Authorization: 'Bearer ' + getToken() }, opts.headers || {});
        if (opts.body && !(opts.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
        const r = await fetch(API_URL + path, Object.assign({}, opts, { headers }));
        let b = null;
        try { b = await r.json(); } catch (e) { /* resposta sem JSON */ }
        if (!r.ok) throw new Error((b && b.error) || ('Erro HTTP ' + r.status));
        return b;
    }
    async function baixarArquivo(path, nomeFallback) {
        const r = await fetch(API_URL + path, { headers: { Authorization: 'Bearer ' + getToken() } });
        if (!r.ok) { let b = null; try { b = await r.json(); } catch (e) { /* sem JSON */ } throw new Error((b && b.error) || ('Erro HTTP ' + r.status)); }
        const blob = await r.blob();
        const cd = r.headers.get('Content-Disposition') || '';
        const m = cd.match(/filename="?([^";]+)"?/i);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (m && m[1]) || nomeFallback;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    const erroSwal = (titulo, msg) => Swal.fire({ icon: 'error', title: titulo, text: msg, confirmButtonColor: '#7c3aed' });

    // ── Tela ─────────────────────────────────────────────────────────────────────
    window.renderAcademia = async function () {
        const c = document.getElementById('rh-academia-container');
        if (!c) return;
        if (!_mes) _mes = mesAtual();
        c.innerHTML = `
        <div style="padding:1.5rem 2rem;max-width:1400px;margin:0 auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:1.25rem;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:46px;height:46px;border-radius:12px;background:#f3e8ff;display:flex;align-items:center;justify-content:center;"><i class="ph ph-barbell" style="font-size:1.6rem;color:#7c3aed;"></i></div>
                    <div>
                        <h2 style="margin:0;font-size:1.35rem;color:#0f172a;">Academia</h2>
                        <div style="font-size:0.82rem;color:#64748b;">Controle de colaboradores, envio para a academia e conferência da nota fiscal</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <label style="font-size:0.8rem;font-weight:700;color:#475569;">Mês</label>
                    <input type="month" id="acad-mes" value="${esc(_mes)}" onchange="window._acadMudarMes(this.value)" style="border:1.5px solid #cbd5e1;border-radius:8px;padding:7px 10px;font-size:0.9rem;">
                    <button class="btn btn-secondary" onclick="window._acadConfig()" title="Configurações (e-mails e valor por colaborador)"><i class="ph ph-gear"></i></button>
                    <button class="btn btn-secondary" onclick="window._acadGerarPlanilha()"><i class="ph ph-file-xls"></i> Gerar Planilha</button>
                    <button class="btn btn-primary" onclick="window._acadEnviar()" style="background:#7c3aed;border-color:#7c3aed;"><i class="ph ph-paper-plane-tilt"></i> Enviar para a Academia</button>
                </div>
            </div>
            <div id="acad-body"><div style="padding:3rem;text-align:center;color:#64748b;"><i class="ph ph-spinner ph-spin"></i> Carregando...</div></div>
        </div>`;
        await carregar();
    };

    async function carregar() {
        const body = document.getElementById('acad-body');
        if (!body) return;
        try {
            _data = await api('/academia/colaboradores?mes=' + encodeURIComponent(_mes));
            body.innerHTML = renderCorpo(_data);
        } catch (e) {
            body.innerHTML = `<div style="padding:2rem;text-align:center;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;"><i class="ph ph-warning-circle"></i> ${esc(e.message)}</div>`;
        }
    }

    window._acadMudarMes = function (v) {
        if (!/^\d{4}-\d{2}$/.test(v || '')) return;
        _mes = v;
        carregar();
    };

    function card(titulo, valor, cor, icone, sub) {
        return `<div style="flex:1;min-width:190px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;border-left:4px solid ${cor};">
            <div style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;display:flex;align-items:center;gap:6px;"><i class="ph ${icone}" style="color:${cor};"></i>${esc(titulo)}</div>
            <div style="font-size:1.5rem;font-weight:800;color:#0f172a;margin-top:4px;">${valor}</div>
            ${sub ? `<div style="font-size:0.75rem;color:#64748b;margin-top:2px;">${sub}</div>` : ''}
        </div>`;
    }

    function renderCorpo(d) {
        const cards = `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:1rem;">
            ${card('Total do mês — ' + esc(mesLabel(d.mes)), esc(brl(d.total)), '#7c3aed', 'ph-currency-dollar', d.qtd_ativos + ' ativo(s) × ' + esc(brl(d.valor_unitario)))}
            ${card('Ativos na academia', d.qtd_ativos, '#16a34a', 'ph-check-circle', 'Valor cobrado: ' + esc(brl(d.valor_unitario)))}
            ${card('Inativos', d.qtd_inativos, '#64748b', 'ph-x-circle', 'Valor zerado (não somado)')}
        </div>`;
        const aviso = d.alterado_apos_envio
            ? `<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:10px;padding:10px 14px;margin-bottom:1rem;font-size:0.85rem;"><i class="ph ph-warning"></i> A lista mudou depois do último envio para a academia (enviado ${esc(brl(d.envio.valor_total))}; total atual ${esc(brl(d.total))}). Se necessário, envie novamente.</div>`
            : '';
        const linhas = d.itens.map(i => {
            const ativo = i.status === 'ativo';
            const badge = ativo
                ? '<span style="background:#dcfce7;color:#166534;border-radius:999px;padding:3px 10px;font-size:0.75rem;font-weight:700;">Ativo</span>'
                : `<span title="${i.data_saida ? 'Inativo desde ' + esc(fmtData(i.data_saida)) : 'Inativo'}" style="background:#e2e8f0;color:#475569;border-radius:999px;padding:3px 10px;font-size:0.75rem;font-weight:700;">Inativo</span>`;
            const valor = ativo ? esc(brl(i.valor)) : '<span style="color:#94a3b8;font-weight:600;">' + esc(brl(0)) + '</span>';
            return `<tr style="${ativo ? '' : 'opacity:0.78;'}">
                <td style="padding:8px 12px;font-weight:600;color:#0f172a;">${esc(i.nome)}</td>
                <td style="padding:8px 12px;text-align:center;">${esc(fmtData(i.data_nascimento))}</td>
                <td style="padding:8px 12px;text-align:center;white-space:nowrap;">${esc(i.cpf)}</td>
                <td style="padding:8px 12px;text-align:center;">${badge}</td>
                <td style="padding:8px 12px;text-align:right;font-weight:700;">${valor}</td>
                <td style="padding:6px 12px;"><input type="text" class="acad-obs" data-id="${i.colaborador_id}" data-orig="${esc(i.observacoes)}" value="${esc(i.observacoes)}" maxlength="2000" placeholder="Observações..." onblur="window._acadSalvarObs(this)" onkeydown="if(event.key==='Enter')this.blur()" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px 8px;font-size:0.85rem;"></td>
            </tr>`;
        }).join('');
        const tabela = `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:1.25rem;">
            <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
                <thead><tr style="background:#f8fafc;color:#475569;font-size:0.75rem;text-transform:uppercase;">
                    <th style="padding:10px 12px;text-align:left;">Nome</th><th style="padding:10px 12px;">Data de Nascimento</th><th style="padding:10px 12px;">CPF</th>
                    <th style="padding:10px 12px;">Status</th><th style="padding:10px 12px;text-align:right;">Valor (${esc(mesLabel(d.mes))})</th><th style="padding:10px 12px;text-align:left;min-width:260px;">Observações</th>
                </tr></thead>
                <tbody>${linhas || '<tr><td colspan="6" style="padding:2rem;text-align:center;color:#94a3b8;">Nenhum colaborador com academia cadastrado.</td></tr>'}</tbody>
                <tfoot><tr style="background:#f5f3ff;font-weight:800;"><td style="padding:10px 12px;" colspan="4">TOTAL — ${esc(mesLabel(d.mes))}</td><td style="padding:10px 12px;text-align:right;">${esc(brl(d.total))}</td><td></td></tr></tfoot>
            </table></div></div>`;
        return cards + aviso + tabela + renderNota(d);
    }

    function renderNota(d) {
        const envio = d.envio;
        let html = `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;">
            <h3 style="margin:0 0 10px;font-size:1.05rem;color:#0f172a;display:flex;align-items:center;gap:8px;"><i class="ph ph-receipt" style="color:#7c3aed;"></i> Nota Fiscal e Conferência — ${esc(mesLabel(d.mes))}</h3>`;
        if (!envio) {
            html += `<div style="color:#64748b;font-size:0.88rem;">Envie a relação para a academia (botão <b>Enviar para a Academia</b>) para liberar o anexo e a conferência da nota fiscal deste mês.</div></div>`;
            return html;
        }
        html += `<div style="font-size:0.85rem;color:#475569;margin-bottom:12px;line-height:1.6;">
            <i class="ph ph-paper-plane-tilt"></i> Enviado em <b>${esc(fmtDataHora(envio.enviado_em))}</b> por <b>${esc(envio.enviado_por || '-')}</b> para <b>${esc(envio.email_destino)}</b><br>
            Valor enviado ao responsável: <b style="color:#7c3aed;">${esc(brl(envio.valor_total))}</b> (${envio.qtd_colaboradores} colaborador(es))
            &nbsp;<a href="#" onclick="window._acadBaixarEnvio(${envio.id});return false;" style="color:#2563eb;font-weight:600;"><i class="ph ph-download-simple"></i> planilha enviada</a>
        </div>`;
        const n = d.nota;
        if (!n) {
            html += `<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                <span style="font-size:0.88rem;color:#475569;">Aguardando a nota fiscal da academia.</span>
                ${btnAnexar('Anexar Nota Fiscal (PDF)')}
            </div></div>`;
            return html;
        }
        const st = {
            conferida: { cor: '#166534', bg: '#dcfce7', borda: '#86efac', icone: 'ph-check-circle', txt: 'Nota conferida — valor confere com o enviado' },
            divergente: { cor: '#991b1b', bg: '#fee2e2', borda: '#fca5a5', icone: 'ph-x-circle', txt: 'Divergência — valor da nota diferente do enviado' },
            nao_lida: { cor: '#92400e', bg: '#fef3c7', borda: '#fcd34d', icone: 'ph-warning', txt: 'Não foi possível identificar o valor no PDF' }
        }[n.status] || { cor: '#475569', bg: '#f1f5f9', borda: '#cbd5e1', icone: 'ph-question', txt: n.status };
        const dif = n.diferenca == null ? '—' : ((n.diferenca > 0 ? '+' : '') + brl(n.diferenca));
        let cnpjAviso = '';
        if (!n.prestador_ok) cnpjAviso = `<div style="color:#92400e;font-size:0.8rem;margin-top:6px;"><i class="ph ph-warning"></i> O CNPJ do prestador cadastrado não foi encontrado na nota. Confira o arquivo.</div>`;
        html += `<div style="background:${st.bg};border:1px solid ${st.borda};border-radius:10px;padding:14px 16px;">
            <div style="font-weight:800;color:${st.cor};font-size:0.95rem;display:flex;align-items:center;gap:8px;"><i class="ph ${st.icone}" style="font-size:1.3rem;"></i> ${esc(st.txt)}</div>
            <div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:10px;font-size:0.88rem;color:#0f172a;">
                <div><div style="font-size:0.72rem;color:#64748b;font-weight:700;text-transform:uppercase;">Valor enviado</div><b>${esc(brl(n.valor_esperado))}</b></div>
                <div><div style="font-size:0.72rem;color:#64748b;font-weight:700;text-transform:uppercase;">Valor da nota fiscal</div><b>${n.nf_valor == null ? '—' : esc(brl(n.nf_valor))}</b></div>
                <div><div style="font-size:0.72rem;color:#64748b;font-weight:700;text-transform:uppercase;">Diferença</div><b style="color:${st.cor};">${esc(dif)}</b></div>
                <div><div style="font-size:0.72rem;color:#64748b;font-weight:700;text-transform:uppercase;">NFS-e</div><b>${esc(n.nf_numero || '—')}</b></div>
                <div><div style="font-size:0.72rem;color:#64748b;font-weight:700;text-transform:uppercase;">Prestador</div><b>${esc(n.nf_fantasia || '—')}</b></div>
            </div>
            ${cnpjAviso}
            <div style="font-size:0.78rem;color:#64748b;margin-top:8px;">Arquivo: ${esc(n.nome_arquivo || '')} — anexado por ${esc(n.anexado_por || '-')} em ${esc(fmtDataHora(n.anexado_em))}</div>
        </div>`;
        if (n.desatualizada) {
            html += `<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:10px;padding:10px 14px;margin-top:10px;font-size:0.85rem;"><i class="ph ph-warning"></i> A planilha foi reenviada depois desta nota. Anexe a nota fiscal novamente para conferir com o novo valor.</div>`;
        }
        html += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center;">
            <button class="btn btn-secondary" onclick="window._acadVerNf(${n.id})"><i class="ph ph-eye"></i> Ver nota</button>
            ${btnAnexar('Anexar outra nota')}
            ${n.status === 'nao_lida' ? `<button class="btn btn-secondary" onclick="window._acadValorManual(${n.id})"><i class="ph ph-pencil-simple"></i> Informar valor manualmente</button>` : ''}
            ${(n.status === 'conferida' && !n.desatualizada) ? `<button class="btn btn-primary" onclick="window._acadEnviarFin(${n.id})" style="background:#16a34a;border-color:#16a34a;"><i class="ph ph-paper-plane-tilt"></i> Enviar para o Financeiro</button>` : ''}
        </div>`;
        if (n.enviado_financeiro_em) {
            html += `<div style="margin-top:10px;font-size:0.82rem;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;"><i class="ph ph-check-circle"></i> Enviado ao financeiro (${esc(n.financeiro_email)}) em ${esc(fmtDataHora(n.enviado_financeiro_em))} por ${esc(n.enviado_financeiro_por || '-')}.</div>`;
        }
        html += `</div>`;
        return html;
    }

    function btnAnexar(rotulo) {
        return `<label class="btn btn-secondary" style="cursor:pointer;margin:0;"><i class="ph ph-paperclip"></i> ${esc(rotulo)}
            <input type="file" accept="application/pdf,.pdf" style="display:none;" onchange="window._acadAnexarNf(this)"></label>`;
    }

    // ── Ações ────────────────────────────────────────────────────────────────────
    window._acadSalvarObs = async function (inp) {
        const orig = inp.getAttribute('data-orig') || '';
        if (inp.value === orig) return;
        try {
            await api('/academia/colaboradores/' + inp.getAttribute('data-id') + '/observacao', { method: 'PUT', body: JSON.stringify({ observacoes: inp.value }) });
            inp.setAttribute('data-orig', inp.value);
            inp.style.borderColor = '#86efac';
            setTimeout(() => { inp.style.borderColor = '#e2e8f0'; }, 1200);
        } catch (e) {
            inp.style.borderColor = '#fca5a5';
            erroSwal('Erro ao salvar observação', e.message);
        }
    };

    window._acadGerarPlanilha = async function () {
        try { await baixarArquivo('/academia/planilha?mes=' + encodeURIComponent(_mes), 'Academia_' + _mes + '.xlsx'); }
        catch (e) { erroSwal('Erro ao gerar planilha', e.message); }
    };
    window._acadBaixarEnvio = async function (id) {
        try { await baixarArquivo('/academia/envios/' + id + '/planilha', 'Academia_' + _mes + '.xlsx'); }
        catch (e) { erroSwal('Erro ao baixar planilha', e.message); }
    };

    function campoModal(rotulo, html) {
        return `<div style="text-align:left;margin-bottom:10px;"><label style="font-size:0.8rem;font-weight:700;color:#475569;display:block;margin-bottom:3px;">${rotulo}</label>${html}</div>`;
    }
    const estiloInput = 'width:100%;box-sizing:border-box;border:1.5px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:0.9rem;font-family:inherit;';

    window._acadEnviar = async function () {
        const d = _data;
        if (!d || d.mes !== _mes) { return erroSwal('Aguarde', 'Os dados do mês ainda estão carregando.'); }
        if (!d.qtd_mes) { return erroSwal('Sem colaboradores', 'Não há colaboradores com academia neste mês.'); }
        const assunto = 'Academia — Relação de colaboradores — ' + mesLabel(d.mes);
        const msg = 'Prezados,\n\nSegue em anexo a relação de colaboradores da academia referente a ' + mesLabel(d.mes) + '.\n\nTotal de colaboradores: ' + d.qtd_mes + '\nValor total: ' + brl(d.total) + '\n\nSolicitamos o envio da nota fiscal referente a este valor para darmos andamento ao pagamento.\n\nAtenciosamente,\nAmérica Rental';
        const r = await Swal.fire({
            title: 'Enviar para a Academia',
            width: 640,
            html: campoModal('Para (e-mail da academia — pode ser editado)', `<input id="acad-em-to" type="text" value="${esc(d.email_academia)}" style="${estiloInput}">`)
                + campoModal('Assunto', `<input id="acad-em-subj" type="text" value="${esc(assunto)}" style="${estiloInput}">`)
                + campoModal('Mensagem', `<textarea id="acad-em-msg" rows="9" style="${estiloInput}resize:vertical;">${esc(msg)}</textarea>`)
                + `<label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:#475569;text-align:left;"><input id="acad-em-def" type="checkbox"> Salvar este e-mail como padrão</label>
                   <div style="text-align:left;font-size:0.78rem;color:#64748b;margin-top:8px;"><i class="ph ph-paperclip"></i> A planilha de ${esc(mesLabel(d.mes))} segue em anexo (${d.qtd_mes} colaborador(es), ${esc(brl(d.total))}).</div>`,
            showCancelButton: true, confirmButtonText: 'Enviar', cancelButtonText: 'Cancelar', confirmButtonColor: '#7c3aed',
            preConfirm: () => {
                const to = document.getElementById('acad-em-to').value.trim();
                if (!to) { Swal.showValidationMessage('Informe o e-mail de destino.'); return false; }
                return { email_destino: to, assunto: document.getElementById('acad-em-subj').value.trim(), mensagem: document.getElementById('acad-em-msg').value.trim(), salvar_padrao: document.getElementById('acad-em-def').checked };
            }
        });
        if (!r.isConfirmed) return;
        Swal.fire({ title: 'Enviando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            await api('/academia/enviar', { method: 'POST', body: JSON.stringify(Object.assign({ mes: _mes }, r.value)) });
            await Swal.fire({ icon: 'success', title: 'E-mail enviado!', text: 'A relação foi enviada para ' + r.value.email_destino + '.', confirmButtonColor: '#7c3aed' });
            carregar();
        } catch (e) { erroSwal('Falha no envio', e.message); }
    };

    window._acadAnexarNf = async function (inp) {
        const file = inp.files && inp.files[0];
        inp.value = '';
        if (!file) return;
        if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return erroSwal('Arquivo inválido', 'Anexe a nota fiscal em PDF.');
        Swal.fire({ title: 'Conferindo nota fiscal...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const fd = new FormData();
            fd.append('mes', _mes);
            fd.append('nf', file);
            const r = await api('/academia/nota', { method: 'POST', body: fd });
            const ic = r.status === 'conferida' ? 'success' : (r.status === 'divergente' ? 'error' : 'warning');
            const txt = r.status === 'conferida' ? 'O valor da nota (' + brl(r.nf_valor) + ') confere com o valor enviado (' + brl(r.valor_esperado) + ').'
                : (r.status === 'divergente' ? 'Valor da nota: ' + brl(r.nf_valor) + ' — valor enviado: ' + brl(r.valor_esperado) + ' — diferença: ' + brl(r.diferenca) + '.'
                    : 'Não foi possível identificar o valor no PDF. Informe o valor manualmente.');
            await Swal.fire({ icon: ic, title: r.status === 'conferida' ? 'Nota conferida!' : (r.status === 'divergente' ? 'Nota divergente' : 'Valor não identificado'), text: txt, confirmButtonColor: '#7c3aed' });
            carregar();
        } catch (e) { erroSwal('Erro ao conferir a nota', e.message); }
    };

    window._acadVerNf = async function (id) {
        try {
            const r = await fetch(API_URL + '/academia/nota/' + id + '/arquivo', { headers: { Authorization: 'Bearer ' + getToken() } });
            if (!r.ok) { let b = null; try { b = await r.json(); } catch (e) { /* sem JSON */ } throw new Error((b && b.error) || ('Erro HTTP ' + r.status)); }
            const blob = await r.blob();
            window.open(URL.createObjectURL(blob), '_blank');
        } catch (e) { erroSwal('Erro ao abrir a nota', e.message); }
    };

    window._acadValorManual = async function (id) {
        const r = await Swal.fire({
            title: 'Valor da nota fiscal', input: 'text', inputLabel: 'Informe o valor total da nota (ex.: 630,00)',
            showCancelButton: true, confirmButtonText: 'Conferir', cancelButtonText: 'Cancelar', confirmButtonColor: '#7c3aed',
            inputValidator: v => (!v || !/\d/.test(v)) ? 'Informe um valor válido.' : null
        });
        if (!r.isConfirmed) return;
        try {
            await api('/academia/nota/' + id + '/valor', { method: 'PUT', body: JSON.stringify({ valor: r.value }) });
            carregar();
        } catch (e) { erroSwal('Erro', e.message); }
    };

    window._acadEnviarFin = async function (id) {
        const d = _data;
        const n = d && d.nota;
        if (!n) return;
        const assunto = 'Academia — Nota fiscal para pagamento — ' + mesLabel(n.mes_ref);
        const msg = 'Prezados,\n\nSegue em anexo a nota fiscal da academia, já conferida com o valor da relação de colaboradores, para pagamento referente a ' + mesLabel(n.mes_ref) + '.\n\nTambém segue a planilha com a relação de colaboradores enviada à academia.\n\nAtenciosamente,\nRH — América Rental';
        const r = await Swal.fire({
            title: 'Enviar para o Financeiro',
            width: 640,
            html: campoModal('Para (e-mail do financeiro — pode ser editado)', `<input id="acad-fin-to" type="text" value="${esc(d.email_financeiro)}" style="${estiloInput}">`)
                + campoModal('Assunto', `<input id="acad-fin-subj" type="text" value="${esc(assunto)}" style="${estiloInput}">`)
                + campoModal('Mensagem', `<textarea id="acad-fin-msg" rows="8" style="${estiloInput}resize:vertical;">${esc(msg)}</textarea>`)
                + `<label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:#475569;text-align:left;"><input id="acad-fin-def" type="checkbox"> Salvar este e-mail como padrão</label>
                   <div style="text-align:left;font-size:0.78rem;color:#64748b;margin-top:8px;"><i class="ph ph-paperclip"></i> Anexos: nota fiscal (${esc(brl(n.nf_valor))}) e a planilha enviada à academia — mês ${esc(mesLabel(n.mes_ref))}.</div>`,
            showCancelButton: true, confirmButtonText: 'Enviar', cancelButtonText: 'Cancelar', confirmButtonColor: '#16a34a',
            preConfirm: () => {
                const to = document.getElementById('acad-fin-to').value.trim();
                if (!to) { Swal.showValidationMessage('Informe o e-mail do financeiro.'); return false; }
                return { email_destino: to, assunto: document.getElementById('acad-fin-subj').value.trim(), mensagem: document.getElementById('acad-fin-msg').value.trim(), salvar_padrao: document.getElementById('acad-fin-def').checked };
            }
        });
        if (!r.isConfirmed) return;
        Swal.fire({ title: 'Enviando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            await api('/academia/nota/' + id + '/enviar-financeiro', { method: 'POST', body: JSON.stringify(r.value) });
            await Swal.fire({ icon: 'success', title: 'Enviado ao financeiro!', text: 'Nota fiscal e planilha enviadas para ' + r.value.email_destino + '.', confirmButtonColor: '#16a34a' });
            carregar();
        } catch (e) { erroSwal('Falha no envio', e.message); }
    };

    window._acadConfig = async function () {
        let cfg;
        try { cfg = await api('/academia/config'); } catch (e) { return erroSwal('Erro', e.message); }
        const r = await Swal.fire({
            title: 'Configurações da Academia',
            width: 560,
            html: campoModal('E-mail padrão da academia', `<input id="acad-cf-ac" type="text" value="${esc(cfg.email_academia)}" style="${estiloInput}">`)
                + campoModal('E-mail padrão do financeiro', `<input id="acad-cf-fin" type="text" value="${esc(cfg.email_financeiro)}" style="${estiloInput}">`)
                + campoModal('Valor pago à academia por colaborador (R$)', `<input id="acad-cf-val" type="text" value="${esc(String(cfg.valor_unitario).replace('.', ','))}" style="${estiloInput}">`),
            showCancelButton: true, confirmButtonText: 'Salvar', cancelButtonText: 'Cancelar', confirmButtonColor: '#7c3aed',
            preConfirm: () => ({
                email_academia: document.getElementById('acad-cf-ac').value.trim(),
                email_financeiro: document.getElementById('acad-cf-fin').value.trim(),
                valor_unitario: document.getElementById('acad-cf-val').value.trim()
            })
        });
        if (!r.isConfirmed) return;
        try {
            await api('/academia/config', { method: 'PUT', body: JSON.stringify(r.value) });
            carregar();
        } catch (e) { erroSwal('Erro ao salvar', e.message); }
    };
})();
