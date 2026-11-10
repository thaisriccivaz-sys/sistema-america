/**
 * padaria.js
 * RH › Pagamentos › Padaria
 *
 * - Anexo da imagem (foto) do fechamento manuscrito da padaria
 * - Leitura via IA (Gemini) → tabela editável: data, quantidade, valor e observação
 * - Planilha, envio ao financeiro (e-mail editável) com os dados para pagamento
 *
 * Endpoints: /api/padaria/*  (permissão: página 'rh-padaria' no Controle de Acesso)
 */
(function () {
    'use strict';

    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    let _mes = null;
    let _data = null;      // resposta de GET /padaria/fechamento
    let _linhas = [];      // linhas em edição
    let _sujo = false;     // há alterações não salvas

    // ── Utilidades ───────────────────────────────────────────────────────────────
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const mesLabel = m => { const p = String(m || '').split('-'); return p.length === 2 ? MESES[parseInt(p[1], 10) - 1] + '/' + p[0] : ''; };
    const fmtDataHora = s => {
        if (!s) return '';
        const d = new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') || String(s).includes('T') ? '' : 'Z'));
        return isNaN(d.getTime()) ? String(s) : d.toLocaleString('pt-BR');
    };
    const mesAtual = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
    const getToken = () => window.currentToken || (typeof currentToken !== 'undefined' ? currentToken : '') || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
    const fmtNum2 = v => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const erroSwal = (titulo, msg) => Swal.fire({ icon: 'error', title: titulo, text: msg, confirmButtonColor: '#b45309' });

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

    // ── Tela ─────────────────────────────────────────────────────────────────────
    window.renderPadaria = async function () {
        const c = document.getElementById('rh-padaria-container');
        if (!c) return;
        if (!_mes) _mes = mesAtual();
        c.innerHTML = `
        <div style="padding:1.5rem 2rem;max-width:1400px;margin:0 auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:1.25rem;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:46px;height:46px;border-radius:12px;background:#fef3c7;display:flex;align-items:center;justify-content:center;"><i class="ph ph-cookie" style="font-size:1.6rem;color:#b45309;"></i></div>
                    <div>
                        <h2 style="margin:0;font-size:1.35rem;color:#0f172a;">Padaria</h2>
                        <div style="font-size:0.82rem;color:#64748b;">Anexe a imagem do fechamento: a IA lê a folha e monta a planilha para pagamento</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <label style="font-size:0.8rem;font-weight:700;color:#475569;">Mês</label>
                    <input type="month" id="pad-mes" value="${esc(_mes)}" onchange="window._padMudarMes(this.value)" style="border:1.5px solid #cbd5e1;border-radius:8px;padding:7px 10px;font-size:0.9rem;">
                    <button class="btn btn-secondary" onclick="window._padConfig()" title="Configurações (e-mail do financeiro e dados para pagamento)"><i class="ph ph-gear"></i></button>
                    <label class="btn btn-primary" style="cursor:pointer;margin:0;background:#b45309;border-color:#b45309;"><i class="ph ph-image"></i> Anexar imagem do fechamento
                        <input type="file" accept="image/*" style="display:none;" onchange="window._padAnexar(this)"></label>
                </div>
            </div>
            <div id="pad-body"><div style="padding:3rem;text-align:center;color:#64748b;"><i class="ph ph-spinner ph-spin"></i> Carregando...</div></div>
        </div>`;
        await carregar();
    };

    async function carregar() {
        const body = document.getElementById('pad-body');
        if (!body) return;
        try {
            _data = await api('/padaria/fechamento?mes=' + encodeURIComponent(_mes));
            _linhas = _data.fechamento ? JSON.parse(JSON.stringify(_data.fechamento.linhas)) : [];
            _sujo = false;
            body.innerHTML = renderCorpo();
            atualizarTotais();
        } catch (e) {
            body.innerHTML = `<div style="padding:2rem;text-align:center;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;"><i class="ph ph-warning-circle"></i> ${esc(e.message)}</div>`;
        }
    }

    window._padMudarMes = async function (v) {
        if (!/^\d{4}-\d{2}$/.test(v || '')) return;
        if (_sujo && !(await confirmarDescarte())) { const i = document.getElementById('pad-mes'); if (i) i.value = _mes; return; }
        _mes = v;
        carregar();
    };

    async function confirmarDescarte() {
        const r = await Swal.fire({ icon: 'warning', title: 'Alterações não salvas', text: 'Há alterações na tabela que ainda não foram salvas. Descartar?', showCancelButton: true, confirmButtonText: 'Descartar', cancelButtonText: 'Voltar', confirmButtonColor: '#b45309' });
        return r.isConfirmed;
    }

    function card(titulo, valor, cor, icone, sub, idValor) {
        return `<div style="flex:1;min-width:190px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;border-left:4px solid ${cor};">
            <div style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;display:flex;align-items:center;gap:6px;"><i class="ph ${icone}" style="color:${cor};"></i>${esc(titulo)}</div>
            <div ${idValor ? `id="${idValor}"` : ''} style="font-size:1.5rem;font-weight:800;color:#0f172a;margin-top:4px;">${valor}</div>
            ${sub ? `<div ${idValor ? `id="${idValor}-sub"` : ''} style="font-size:0.75rem;color:#64748b;margin-top:2px;">${sub}</div>` : ''}
        </div>`;
    }

    function renderCorpo() {
        const f = _data.fechamento;
        if (!f) {
            return `<div style="background:#fff;border:1px dashed #cbd5e1;border-radius:12px;padding:2.5rem;text-align:center;color:#475569;">
                <i class="ph ph-image" style="font-size:2.4rem;color:#b45309;"></i>
                <div style="font-weight:700;margin:8px 0 4px;">Nenhum fechamento de ${esc(mesLabel(_mes))}</div>
                <div style="font-size:0.88rem;">Clique em <b>Anexar imagem do fechamento</b> para enviar a foto da folha. O sistema lê os dados via IA e monta a tabela e a planilha.</div>
            </div>`;
        }
        const cards = `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:1rem;">
            ${card('Total — ' + esc(mesLabel(f.mes_ref)), esc(brl(f.valor_total)), '#b45309', 'ph-currency-dollar', '', 'pad-card-total')}
            ${card('Quantidade total', f.qtd_total, '#0ea5e9', 'ph-stack', '', 'pad-card-qtd')}
            ${card('Dias lançados', f.linhas.length, '#16a34a', 'ph-calendar-check', '', 'pad-card-dias')}
            ${card('Total escrito na folha', f.valor_total_escrito != null ? esc(brl(f.valor_total_escrito)) : '—', '#64748b', 'ph-pencil-simple-line', '', 'pad-card-escrito')}
        </div>
        <div id="pad-conf"></div>`;
        const infoImg = `<div style="font-size:0.82rem;color:#475569;margin-bottom:10px;display:flex;gap:14px;flex-wrap:wrap;align-items:center;">
            <span><i class="ph ph-paperclip"></i> ${esc(f.nome_arquivo || 'imagem')} — lida por ${esc(f.criado_por || '-')} em ${esc(fmtDataHora(f.atualizado_em))}</span>
            ${f.tem_imagem ? `<a href="#" onclick="window._padVerImagem(${f.id});return false;" style="color:#2563eb;font-weight:600;"><i class="ph ph-eye"></i> ver imagem anexada</a>` : ''}
            <a href="#" onclick="window._padRemover(${f.id});return false;" style="color:#dc2626;font-weight:600;"><i class="ph ph-trash"></i> remover fechamento</a>
        </div>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:10px;padding:9px 14px;margin-bottom:10px;font-size:0.82rem;"><i class="ph ph-info"></i> A leitura de letra manuscrita pode ter erros. Confira a tabela com a imagem e corrija se necessário (linhas em amarelo = leitura incerta ou data repetida).</div>`;
        const tabela = `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:1rem;">
            <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
                <thead><tr style="background:#f8fafc;color:#475569;font-size:0.75rem;text-transform:uppercase;">
                    <th style="padding:10px 12px;text-align:left;width:170px;">Data</th><th style="padding:10px 12px;width:130px;">Quantidade</th>
                    <th style="padding:10px 12px;width:150px;">Valor (R$)</th><th style="padding:10px 12px;text-align:left;min-width:260px;">Observação</th><th style="width:48px;"></th>
                </tr></thead>
                <tbody id="pad-tbody">${_linhas.map((l, i) => renderLinha(l, i)).join('')}</tbody>
                <tfoot><tr style="background:#fffbeb;font-weight:800;"><td style="padding:10px 12px;">TOTAL</td>
                    <td style="padding:10px 12px;text-align:center;" id="pad-foot-qtd">0</td><td style="padding:10px 12px;text-align:right;" id="pad-foot-valor">R$ 0,00</td><td colspan="2"></td></tr></tfoot>
            </table></div></div>`;
        const acoes = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:1.25rem;">
            <button class="btn btn-secondary" onclick="window._padAddLinha()"><i class="ph ph-plus"></i> Adicionar linha</button>
            <button class="btn btn-secondary" id="pad-btn-salvar" onclick="window._padSalvar()"><i class="ph ph-floppy-disk"></i> Salvar alterações</button>
            <button class="btn btn-secondary" onclick="window._padGerarPlanilha()"><i class="ph ph-file-xls"></i> Gerar Planilha</button>
            <button class="btn btn-primary" onclick="window._padEnviar()" style="background:#16a34a;border-color:#16a34a;"><i class="ph ph-paper-plane-tilt"></i> Enviar para o Financeiro</button>
        </div>`;
        let envio = '';
        if (f.enviado_em) {
            envio = `<div style="font-size:0.85rem;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;"><i class="ph ph-check-circle"></i> Enviado ao financeiro (${esc(f.email_destino)}) em ${esc(fmtDataHora(f.enviado_em))} por ${esc(f.enviado_por || '-')} — valor enviado: <b>${esc(brl(f.enviado_valor))}</b>.${f.alterado_apos_envio ? ' <span style="color:#92400e;"><i class="ph ph-warning"></i> O valor mudou depois do envio. Envie novamente se necessário.</span>' : ''}</div>`;
        }
        return cards + infoImg + tabela + acoes + envio;
    }

    function renderLinha(l, i) {
        const inp = 'border:1px solid #e2e8f0;border-radius:6px;padding:6px 8px;font-size:0.85rem;width:100%;box-sizing:border-box;';
        return `<tr data-i="${i}">
            <td style="padding:6px 12px;"><input type="date" value="${esc(l.data)}" oninput="window._padCampo(${i},'data',this.value)" style="${inp}"></td>
            <td style="padding:6px 12px;"><input type="number" min="0" step="1" value="${esc(l.quantidade)}" oninput="window._padCampo(${i},'quantidade',this.value)" style="${inp}text-align:center;"></td>
            <td style="padding:6px 12px;"><input type="text" inputmode="decimal" value="${esc(fmtNum2(l.valor))}" onfocus="this.select()" oninput="window._padCampo(${i},'valor',this.value)" onblur="this.value=window._padFmt(this.value)" style="${inp}text-align:right;"></td>
            <td style="padding:6px 12px;"><input type="text" maxlength="500" value="${esc(l.observacao)}" placeholder="Observação..." oninput="window._padCampo(${i},'observacao',this.value)" style="${inp}"></td>
            <td style="padding:6px 8px;text-align:center;"><button class="btn btn-secondary" title="Remover linha" onclick="window._padDelLinha(${i})" style="padding:4px 8px;color:#dc2626;"><i class="ph ph-trash"></i></button></td>
        </tr>`;
    }

    window._padFmt = v => fmtNum2(num(v));

    function marcarSujo() {
        _sujo = true;
        const b = document.getElementById('pad-btn-salvar');
        if (b) { b.style.background = '#b45309'; b.style.borderColor = '#b45309'; b.style.color = '#fff'; }
    }

    function atualizarTotais() {
        const f = _data && _data.fechamento;
        if (!f) return;
        const qtd = _linhas.reduce((a, l) => a + (Number(l.quantidade) || 0), 0);
        const total = Math.round(_linhas.reduce((a, l) => a + (Number(l.valor) || 0), 0) * 100) / 100;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('pad-card-total', brl(total)); set('pad-card-qtd', qtd); set('pad-card-dias', _linhas.length);
        set('pad-foot-qtd', qtd); set('pad-foot-valor', brl(total));

        // Conferência com o total escrito na folha
        const conf = document.getElementById('pad-conf');
        if (conf) {
            if (f.valor_total_escrito != null) {
                const ok = Math.round(f.valor_total_escrito * 100) === Math.round(total * 100);
                conf.innerHTML = ok
                    ? `<div style="background:#dcfce7;border:1px solid #86efac;color:#166534;border-radius:10px;padding:9px 14px;margin-bottom:10px;font-size:0.85rem;font-weight:600;"><i class="ph ph-check-circle"></i> A soma da tabela (${esc(brl(total))}) confere com o total escrito na folha.</div>`
                    : `<div style="background:#fef3c7;border:1px solid #fcd34d;color:#92400e;border-radius:10px;padding:9px 14px;margin-bottom:10px;font-size:0.85rem;font-weight:600;"><i class="ph ph-warning"></i> A soma da tabela (${esc(brl(total))}) é diferente do total escrito na folha (${esc(brl(f.valor_total_escrito))}) — diferença de ${esc(brl(total - f.valor_total_escrito))}. Confira as linhas com a imagem.</div>`;
            } else conf.innerHTML = '';
        }

        // Alertas por linha: leitura incerta, data repetida ou sem data
        const cont = {};
        _linhas.forEach(l => { if (l.data) cont[l.data] = (cont[l.data] || 0) + 1; });
        document.querySelectorAll('#pad-tbody tr').forEach(tr => {
            const i = parseInt(tr.getAttribute('data-i'), 10);
            const l = _linhas[i];
            if (!l) return;
            let motivo = '';
            if (!l.data) motivo = 'Data ausente ou ilegível';
            else if (cont[l.data] > 1) motivo = 'Data repetida';
            else if (l.incerto) motivo = 'Leitura incerta — confira com a imagem';
            tr.style.background = motivo ? '#fffbeb' : '';
            tr.title = motivo;
        });
    }

    window._padCampo = function (i, campo, valor) {
        const l = _linhas[i];
        if (!l) return;
        if (campo === 'valor') l.valor = Math.round(num(valor) * 100) / 100;
        else if (campo === 'quantidade') l.quantidade = Math.max(0, Math.round(parseFloat(valor) || 0));
        else l[campo] = valor;
        l.incerto = false;
        marcarSujo();
        atualizarTotais();
    };
    window._padAddLinha = function () {
        if (!_data || !_data.fechamento) return;
        const ult = _linhas.length ? _linhas[_linhas.length - 1] : null;
        _linhas.push({ data: '', quantidade: ult ? ult.quantidade : 0, valor: ult ? ult.valor : 0, observacao: '', incerto: false });
        const tb = document.getElementById('pad-tbody');
        if (tb) tb.insertAdjacentHTML('beforeend', renderLinha(_linhas[_linhas.length - 1], _linhas.length - 1));
        marcarSujo();
        atualizarTotais();
    };
    window._padDelLinha = function (i) {
        _linhas.splice(i, 1);
        const tb = document.getElementById('pad-tbody');
        if (tb) tb.innerHTML = _linhas.map((l, k) => renderLinha(l, k)).join('');
        marcarSujo();
        atualizarTotais();
    };

    window._padSalvar = async function (silencioso) {
        const f = _data && _data.fechamento;
        if (!f) return true;
        try {
            const r = await api('/padaria/fechamento/' + f.id, { method: 'PUT', body: JSON.stringify({ linhas: _linhas }) });
            f.linhas = JSON.parse(JSON.stringify(_linhas));
            f.valor_total = r.valor_total; f.qtd_total = r.qtd_total;
            _sujo = false;
            const b = document.getElementById('pad-btn-salvar');
            if (b) { b.style.background = ''; b.style.borderColor = ''; b.style.color = ''; }
            if (silencioso !== true) Swal.fire({ icon: 'success', title: 'Alterações salvas', timer: 1400, showConfirmButton: false });
            return true;
        } catch (e) { erroSwal('Erro ao salvar', e.message); return false; }
    };
    async function salvarSeSujo() { return _sujo ? window._padSalvar(true) : true; }

    // ── Anexar imagem → IA ───────────────────────────────────────────────────────
    window._padAnexar = async function (inp) {
        const file = inp.files && inp.files[0];
        inp.value = '';
        if (!file) return;
        if (!/^image\//i.test(file.type)) return erroSwal('Arquivo inválido', 'Anexe uma imagem (JPG, PNG ou WEBP).');
        if (_sujo && !(await confirmarDescarte())) return;
        if (_data && _data.fechamento) {
            const r = await Swal.fire({ icon: 'question', title: 'Substituir fechamento?', text: 'Já existe um fechamento de ' + mesLabel(_mes) + '. Se a nova imagem for do mesmo mês, ele será substituído (as edições feitas serão perdidas).', showCancelButton: true, confirmButtonText: 'Continuar', cancelButtonText: 'Cancelar', confirmButtonColor: '#b45309' });
            if (!r.isConfirmed) return;
        }
        Swal.fire({ title: 'Analisando a imagem com IA...', html: 'Lendo a folha e montando a tabela. Isso pode levar alguns segundos.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const fd = new FormData();
            fd.append('imagem', file);
            fd.append('mes', _mes);
            const r = await api('/padaria/analisar', { method: 'POST', body: fd });
            _mes = r.mes;
            const mi = document.getElementById('pad-mes'); if (mi) mi.value = _mes;
            await Swal.fire({ icon: 'success', title: 'Imagem analisada!', html: r.fechamento.linhas.length + ' linha(s) lida(s) — referente a <b>' + esc(mesLabel(r.mes)) + '</b>, total <b>' + esc(brl(r.fechamento.valor_total)) + '</b>.<br><br>Confira a tabela com a imagem antes de enviar ao financeiro.', confirmButtonColor: '#b45309' });
            await carregar();
        } catch (e) { erroSwal('Erro ao analisar a imagem', e.message); }
    };

    window._padVerImagem = async function (id) {
        try {
            const r = await fetch(API_URL + '/padaria/fechamento/' + id + '/imagem', { headers: { Authorization: 'Bearer ' + getToken() } });
            if (!r.ok) { let b = null; try { b = await r.json(); } catch (e) { /* sem JSON */ } throw new Error((b && b.error) || ('Erro HTTP ' + r.status)); }
            const blob = await r.blob();
            window.open(URL.createObjectURL(blob), '_blank');
        } catch (e) { erroSwal('Erro ao abrir a imagem', e.message); }
    };

    window._padRemover = async function (id) {
        const r = await Swal.fire({ icon: 'warning', title: 'Remover fechamento?', text: 'A imagem e a tabela de ' + mesLabel(_mes) + ' serão removidas.', showCancelButton: true, confirmButtonText: 'Remover', cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626' });
        if (!r.isConfirmed) return;
        try { await api('/padaria/fechamento/' + id, { method: 'DELETE' }); carregar(); }
        catch (e) { erroSwal('Erro ao remover', e.message); }
    };

    window._padGerarPlanilha = async function () {
        const f = _data && _data.fechamento;
        if (!f) return;
        if (!(await salvarSeSujo())) return;
        try { await baixarArquivo('/padaria/fechamento/' + f.id + '/planilha', 'Padaria_' + f.mes_ref + '.xlsx'); }
        catch (e) { erroSwal('Erro ao gerar planilha', e.message); }
    };

    // ── Envio ao financeiro ──────────────────────────────────────────────────────
    function campoModal(rotulo, html) {
        return `<div style="text-align:left;margin-bottom:10px;"><label style="font-size:0.8rem;font-weight:700;color:#475569;display:block;margin-bottom:3px;">${rotulo}</label>${html}</div>`;
    }
    const estiloInput = 'width:100%;box-sizing:border-box;border:1.5px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:0.9rem;font-family:inherit;';

    window._padEnviar = async function () {
        const f = _data && _data.fechamento;
        if (!f) return;
        if (!_linhas.length) return erroSwal('Sem linhas', 'O fechamento não possui linhas.');
        if (!(await salvarSeSujo())) return;
        const cfg = _data.config;
        const assunto = 'Padaria — Fechamento para pagamento — ' + mesLabel(f.mes_ref);
        const msg = 'Prezados,\n\nSegue em anexo a planilha de fechamento da padaria referente a ' + mesLabel(f.mes_ref) + ', para pagamento.\n\nAbaixo seguem o valor total e os dados para pagamento.\n\nAtenciosamente,\nRH — América Rental';
        const r = await Swal.fire({
            title: 'Enviar para o Financeiro',
            width: 660,
            html: campoModal('Para (e-mail do financeiro — pode ser editado)', `<input id="pad-em-to" type="text" value="${esc(cfg.email_financeiro)}" style="${estiloInput}">`)
                + campoModal('Assunto', `<input id="pad-em-subj" type="text" value="${esc(assunto)}" style="${estiloInput}">`)
                + campoModal('Mensagem', `<textarea id="pad-em-msg" rows="7" style="${estiloInput}resize:vertical;">${esc(msg)}</textarea>`)
                + `<div style="text-align:left;font-size:0.8rem;font-weight:800;color:#92400e;margin:6px 0;">Dados para pagamento (seguem no e-mail)</div>`
                + campoModal('Favorecido', `<input id="pad-em-fav" type="text" value="${esc(cfg.favorecido)}" style="${estiloInput}">`)
                + `<div style="display:flex;gap:10px;"><div style="flex:1;">${campoModal('CPF', `<input id="pad-em-cpf" type="text" value="${esc(cfg.cpf)}" style="${estiloInput}">`)}</div><div style="flex:1;">${campoModal('Chave PIX (celular)', `<input id="pad-em-pix" type="text" value="${esc(cfg.pix)}" style="${estiloInput}">`)}</div></div>`
                + `<label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:#475569;text-align:left;"><input id="pad-em-def" type="checkbox"> Salvar e-mail e dados de pagamento como padrão</label>
                   <div style="text-align:left;font-size:0.78rem;color:#64748b;margin-top:8px;"><i class="ph ph-paperclip"></i> Anexo: planilha de ${esc(mesLabel(f.mes_ref))} — ${_linhas.length} dia(s), total <b>${esc(brl(f.valor_total))}</b>.</div>`,
            showCancelButton: true, confirmButtonText: 'Enviar', cancelButtonText: 'Cancelar', confirmButtonColor: '#16a34a',
            preConfirm: () => {
                const to = document.getElementById('pad-em-to').value.trim();
                if (!to) { Swal.showValidationMessage('Informe o e-mail do financeiro.'); return false; }
                return {
                    email_destino: to, assunto: document.getElementById('pad-em-subj').value.trim(), mensagem: document.getElementById('pad-em-msg').value.trim(),
                    favorecido: document.getElementById('pad-em-fav').value.trim(), cpf: document.getElementById('pad-em-cpf').value.trim(), pix: document.getElementById('pad-em-pix').value.trim(),
                    salvar_padrao: document.getElementById('pad-em-def').checked
                };
            }
        });
        if (!r.isConfirmed) return;
        Swal.fire({ title: 'Enviando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            await api('/padaria/fechamento/' + f.id + '/enviar', { method: 'POST', body: JSON.stringify(r.value) });
            await Swal.fire({ icon: 'success', title: 'Enviado ao financeiro!', text: 'Planilha e dados para pagamento enviados para ' + r.value.email_destino + '.', confirmButtonColor: '#16a34a' });
            carregar();
        } catch (e) { erroSwal('Falha no envio', e.message); }
    };

    window._padConfig = async function () {
        let cfg;
        try { cfg = await api('/padaria/config'); } catch (e) { return erroSwal('Erro', e.message); }
        const r = await Swal.fire({
            title: 'Configurações da Padaria',
            width: 560,
            html: campoModal('E-mail padrão do financeiro', `<input id="pad-cf-em" type="text" value="${esc(cfg.email_financeiro)}" style="${estiloInput}">`)
                + campoModal('Favorecido (dados para pagamento)', `<input id="pad-cf-fav" type="text" value="${esc(cfg.favorecido)}" style="${estiloInput}">`)
                + campoModal('CPF', `<input id="pad-cf-cpf" type="text" value="${esc(cfg.cpf)}" style="${estiloInput}">`)
                + campoModal('Chave PIX (celular)', `<input id="pad-cf-pix" type="text" value="${esc(cfg.pix)}" style="${estiloInput}">`),
            showCancelButton: true, confirmButtonText: 'Salvar', cancelButtonText: 'Cancelar', confirmButtonColor: '#b45309',
            preConfirm: () => ({
                email_financeiro: document.getElementById('pad-cf-em').value.trim(),
                favorecido: document.getElementById('pad-cf-fav').value.trim(),
                cpf: document.getElementById('pad-cf-cpf').value.trim(),
                pix: document.getElementById('pad-cf-pix').value.trim()
            })
        });
        if (!r.isConfirmed) return;
        try {
            await api('/padaria/config', { method: 'PUT', body: JSON.stringify(r.value) });
            if (_data) _data.config = Object.assign(_data.config || {}, r.value);
        } catch (e) { erroSwal('Erro ao salvar', e.message); }
    };
})();
