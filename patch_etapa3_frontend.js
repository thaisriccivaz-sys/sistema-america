const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

// ── 1. Adicionar as abas na renderizarTela (após a toolbar) ───────────────
const anchorAba = `  <div id="fech-msg" style="text-align:center;color:#6b7280;padding:3rem;font-size:1rem;">`;
const novasAbas = `  <!-- ABAS: Fechamento | Comissão | Conferência Folha -->
  <div id="fech-abas" style="display:none;border-bottom:2px solid #e2e8f0;margin-bottom:1rem;display:none;gap:0;">
    <button id="fech-aba-fechamento" onclick="window._fechamento.mudarAba('fechamento')"
      style="padding:.5rem 1.2rem;border:none;background:none;cursor:pointer;font-size:.9rem;font-weight:600;color:#1e40af;border-bottom:2px solid #1e40af;margin-bottom:-2px;">
      📋 Fechamento
    </button>
    <button id="fech-aba-comissao" onclick="window._fechamento.mudarAba('comissao')"
      style="padding:.5rem 1.2rem;border:none;background:none;cursor:pointer;font-size:.9rem;font-weight:600;color:#6b7280;border-bottom:2px solid transparent;margin-bottom:-2px;">
      💰 Comissão
    </button>
    <button id="fech-aba-conferencia" onclick="window._fechamento.mudarAba('conferencia')"
      style="padding:.5rem 1.2rem;border:none;background:none;cursor:pointer;font-size:.9rem;font-weight:600;color:#6b7280;border-bottom:2px solid transparent;margin-bottom:-2px;">
      🔍 Conferência Folha
    </button>
  </div>

  <!-- SEÇÃO: Comissão -->
  <div id="fech-secao-comissao" style="display:none;padding:1rem 0;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
      <div>
        <h3 style="margin:0;color:#1e40af;font-size:1.1rem;">💰 Comissão — Vendedores Comercial</h3>
        <p style="margin:.2rem 0 0;color:#6b7280;font-size:.82rem;">Gerencie os links de preenchimento enviados por email para os vendedores.</p>
      </div>
      <div style="display:flex;gap:.5rem;">
        <button onclick="window._fechamento.gerarLinksComissao()" style="background:#1e40af;color:#fff;border:none;padding:.45rem 1rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
          <i class="ph ph-link"></i> Gerar Links
        </button>
        <button onclick="window._fechamento.enviarEmailsComissao()" style="background:#059669;color:#fff;border:none;padding:.45rem 1rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
          <i class="ph ph-envelope"></i> Enviar Emails
        </button>
        <button onclick="window._fechamento.carregarStatusComissao()" style="background:#64748b;color:#fff;border:none;padding:.45rem 1rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
          <i class="ph ph-arrows-clockwise"></i> Atualizar
        </button>
      </div>
    </div>
    <div id="fech-comissao-tabela" style="overflow-x:auto;">
      <p style="color:#6b7280;font-size:.9rem;">Clique em "Gerar Links" ou "Atualizar" para ver o status das comissões.</p>
    </div>
  </div>

  <!-- SEÇÃO: Conferência Folha -->
  <div id="fech-secao-conferencia" style="display:none;padding:1rem 0;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
      <div>
        <h3 style="margin:0;color:#1e40af;font-size:1.1rem;">🔍 Conferência da Folha da Contabilidade</h3>
        <p style="margin:.2rem 0 0;color:#6b7280;font-size:.82rem;">Importe o PDF da folha recebida da contabilidade para identificar divergências.</p>
      </div>
      <label style="background:#7c3aed;color:#fff;padding:.45rem 1rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:flex;align-items:center;gap:.35rem;">
        <i class="ph ph-upload-simple"></i> Importar PDF da Folha
        <input type="file" accept=".pdf" style="display:none;" onchange="window._fechamento.uploadFolhaContabilidade(this)">
      </label>
    </div>
    <div id="fech-conferencia-resultado" style="margin-top:.5rem;">
      <p style="color:#6b7280;font-size:.9rem;">Aguardando importação do PDF da folha da contabilidade.</p>
    </div>
  </div>

  <div id="fech-msg" style="text-align:center;color:#6b7280;padding:3rem;font-size:1rem;">`;

code = code.replace(anchorAba, novasAbas);

// ── 2. Mostrar abas após buscar (junto com toolbar e tabela) ─────────────
const anchorToolbarShow = `        if (toolbar) toolbar.style.display = 'flex';
        if (filtroWrap) filtroWrap.style.display = 'block';`;
const toolbarShowReplacement = `        if (toolbar) toolbar.style.display = 'flex';
        if (filtroWrap) filtroWrap.style.display = 'block';
        const abas = document.getElementById('fech-abas');
        if (abas) abas.style.display = 'flex';`;
code = code.replace(anchorToolbarShow, toolbarShowReplacement);

// ── 3. Inserir funções de Etapa 3 antes do return ────────────────────────
const anchorReturn = `    return {\n        init, buscar, atualizar, filtrar, salvarTudo,`;
const novasFuncoes = `    // ─────────────────────────────────────────────────────────────────
    // ETAPA 3 — ABAS
    // ─────────────────────────────────────────────────────────────────
    let _abaAtiva = 'fechamento';
    function mudarAba(aba) {
        _abaAtiva = aba;
        const abas = ['fechamento', 'comissao', 'conferencia'];
        abas.forEach(a => {
            const btn = document.getElementById('fech-aba-' + a);
            const sec = a === 'fechamento' ? null : document.getElementById('fech-secao-' + a);
            if (btn) {
                if (a === aba) {
                    btn.style.color = '#1e40af';
                    btn.style.borderBottomColor = '#1e40af';
                } else {
                    btn.style.color = '#6b7280';
                    btn.style.borderBottomColor = 'transparent';
                }
            }
            if (sec) sec.style.display = a === aba ? 'block' : 'none';
        });
        // Tabela principal e filtro
        const tabWrap = document.getElementById('fech-tabela-wrap');
        const filtroWrap = document.getElementById('fech-filtro-wrap');
        const toolbar = document.getElementById('fech-toolbar');
        if (aba === 'fechamento') {
            if (tabWrap && _dados.length) tabWrap.style.display = 'block';
            if (filtroWrap) filtroWrap.style.display = 'block';
            if (toolbar) toolbar.style.display = 'flex';
        } else {
            if (tabWrap) tabWrap.style.display = 'none';
            if (filtroWrap) filtroWrap.style.display = 'none';
            if (toolbar) toolbar.style.display = 'none';
            if (aba === 'comissao') carregarStatusComissao();
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // ETAPA 3 — COMISSÃO
    // ─────────────────────────────────────────────────────────────────
    async function gerarLinksComissao() {
        try {
            Swal.fire({ title: 'Gerando links...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const resp = await fetch('/api/fechamento/gerar-links-comissao', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mes: _mes, ano: _ano })
            });
            const json = await resp.json();
            if (!json.ok) throw new Error(json.error);
            Swal.fire({ icon: 'success', title: \`\${json.links.length} links gerados!\`, text: 'Use "Enviar Emails" para notificar os vendedores.', timer: 2500, showConfirmButton: false });
            await carregarStatusComissao();
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro', text: e.message });
        }
    }

    async function carregarStatusComissao() {
        if (!_mes || !_ano) return;
        const cont = document.getElementById('fech-comissao-tabela');
        if (!cont) return;
        cont.innerHTML = '<p style="color:#6b7280;">Carregando...</p>';
        try {
            const resp = await fetch(\`/api/fechamento/comissao-status/\${_ano}/\${_mes}\`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const rows = await resp.json();
            if (!rows.length) {
                cont.innerHTML = '<p style="color:#6b7280;">Nenhum registro de comissão para este mês. Clique em "Gerar Links" primeiro.</p>';
                return;
            }
            const appUrl = window.location.origin;
            let html = \`<table style="width:100%;border-collapse:collapse;font-size:.85rem;">
              <thead><tr style="background:#1e40af;color:#fff;">
                <th style="padding:.5rem .75rem;text-align:left;">Vendedor</th>
                <th style="padding:.5rem;text-align:left;">Email</th>
                <th style="padding:.5rem;text-align:center;">Status</th>
                <th style="padding:.5rem;text-align:right;">Comissão</th>
                <th style="padding:.5rem;text-align:right;">Contratos</th>
                <th style="padding:.5rem;text-align:right;">Bônus</th>
                <th style="padding:.5rem;">Link</th>
                <th style="padding:.5rem;">Ações</th>
              </tr></thead><tbody>\`;
            rows.forEach(r => {
                const preenchido = !!r.preenchido_em;
                const badge = preenchido
                    ? '<span style="background:#dcfce7;color:#166534;padding:.2rem .5rem;border-radius:9999px;font-size:.75rem;font-weight:600;">✅ Preenchido</span>'
                    : '<span style="background:#fef3c7;color:#92400e;padding:.2rem .5rem;border-radius:9999px;font-size:.75rem;font-weight:600;">⏳ Pendente</span>';
                const emailExib = r.email_corporativo || r.email || '—';
                const link = r.link_token ? \`\${appUrl}/comissao/\${r.link_token}\` : '—';
                const linkShort = r.link_token ? \`...comissao/\${r.link_token.substring(0,8)}...\` : '—';
                html += \`<tr style="border-bottom:1px solid #e5e7eb;">
                  <td style="padding:.4rem .75rem;font-weight:600;">\${r.nome_completo}</td>
                  <td style="padding:.4rem .5rem;color:#6b7280;font-size:.8rem;">\${emailExib}</td>
                  <td style="padding:.4rem .5rem;text-align:center;">\${badge}</td>
                  <td style="padding:.4rem .5rem;text-align:right;">\${preenchido ? fmt(r.valor_comissao) : '—'}</td>
                  <td style="padding:.4rem .5rem;text-align:right;">\${preenchido ? (r.contratos_fechados||0) : '—'}</td>
                  <td style="padding:.4rem .5rem;text-align:right;">\${r.bonus_primeiro_lugar && r.valor_bonus ? fmt(r.valor_bonus) : '—'}</td>
                  <td style="padding:.4rem .5rem;font-size:.75rem;max-width:150px;overflow:hidden;text-overflow:ellipsis;">
                    \${r.link_token ? \`<a href="\${link}" target="_blank" title="\${link}" style="color:#1e40af;">\${linkShort}</a>\` : '—'}
                  </td>
                  <td style="padding:.4rem .5rem;">
                    \${!preenchido && r.link_token ? \`<button onclick="window._fechamento.reenviarComissao('\${r.link_token}')" style="background:#dc2626;color:#fff;border:none;padding:.2rem .6rem;border-radius:.3rem;font-size:.75rem;cursor:pointer;">Reenviar</button>\` : ''}
                    \${preenchido ? \`<button onclick="window._fechamento.importarComissaoParaFechamento(\${r.colaborador_id}, \${r.valor_comissao||0}, \${r.valor_bonus||0})" style="background:#059669;color:#fff;border:none;padding:.2rem .6rem;border-radius:.3rem;font-size:.75rem;cursor:pointer;">Importar</button>\` : ''}
                  </td>
                </tr>\`;
            });
            html += '</tbody></table>';
            cont.innerHTML = html;
        } catch(e) {
            cont.innerHTML = \`<p style="color:#dc2626;">Erro: \${e.message}</p>\`;
        }
    }

    async function enviarEmailsComissao() {
        try {
            Swal.fire({ title: 'Enviando emails...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const resp = await fetch('/api/fechamento/enviar-emails-comissao', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mes: _mes, ano: _ano })
            });
            const json = await resp.json();
            if (!json.ok) throw new Error(json.error);
            let msg = \`\${json.enviados} email(s) enviado(s).\`;
            if (json.erros && json.erros.length) msg += '\\nErros: ' + json.erros.join(', ');
            Swal.fire({ icon: json.enviados > 0 ? 'success' : 'info', title: 'Emails de Comissão', text: msg });
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro', text: e.message });
        }
    }

    async function reenviarComissao(token) {
        try {
            const resp = await fetch('/api/fechamento/enviar-emails-comissao', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mes: _mes, ano: _ano, link_tokens: [token] })
            });
            const json = await resp.json();
            Swal.fire({ icon: 'success', title: 'Email reenviado!', timer: 2000, showConfirmButton: false });
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro', text: e.message });
        }
    }

    function importarComissaoParaFechamento(colabId, valorComissao, valorBonus) {
        const idx = _dados.findIndex(r => r.id === colabId || r.colaborador_id === colabId);
        if (idx < 0) { Swal.fire({ icon: 'warning', title: 'Colaborador não encontrado na tabela de fechamento', text: 'Busque o mês antes de importar.' }); return; }
        _dados[idx].comissao = valorComissao;
        _dados[idx].bonus_comissao = valorBonus;
        const trEls = document.querySelectorAll('#fech-tbody tr');
        trEls.forEach(tr => {
            if (parseInt(tr.dataset.idx) === idx) {
                const inputs = tr.querySelectorAll('input[type=number]');
                // encontrar input de comissao e bonus_comissao pelas posições
                inputs.forEach(inp => {
                    if (inp.getAttribute('oninput').includes("'comissao'")) inp.value = valorComissao;
                    if (inp.getAttribute('oninput').includes("'bonus_comissao'")) inp.value = valorBonus;
                });
                atualizar(idx, 'comissao', valorComissao);
                atualizar(idx, 'bonus_comissao', valorBonus);
            }
        });
        Swal.fire({ icon: 'success', title: 'Comissão importada!', text: \`\${fmt(valorComissao)} + bônus \${fmt(valorBonus)} aplicados.\`, timer: 2000, showConfirmButton: false });
        mudarAba('fechamento');
    }

    // ─────────────────────────────────────────────────────────────────
    // ETAPA 3 — CONFERÊNCIA DO PDF DA FOLHA
    // ─────────────────────────────────────────────────────────────────
    async function uploadFolhaContabilidade(input) {
        if (!input.files[0]) return;
        const formData = new FormData();
        formData.append('pdf', input.files[0]);
        try {
            Swal.fire({ title: 'Processando PDF da folha...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const resp = await fetch('/api/fechamento/upload-folha-contabilidade', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken() },
                body: formData
            });
            const json = await resp.json();
            if (!json.ok) throw new Error(json.error);
            Swal.close();
            // Agora conferir com os dados do fechamento salvo
            await conferirFolha(json.colaboradores);
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro ao processar PDF', text: e.message });
        }
        input.value = '';
    }

    async function conferirFolha(colaboradoresFolha) {
        const cont = document.getElementById('fech-conferencia-resultado');
        if (!cont) return;
        if (!colaboradoresFolha || !colaboradoresFolha.length) {
            cont.innerHTML = '<p style="color:#dc2626;">Nenhum colaborador identificado no PDF. O formato pode ser diferente do esperado.</p>';
            return;
        }
        cont.innerHTML = \`<p style="color:#6b7280;">Conferindo \${colaboradoresFolha.length} colaboradores...</p>\`;
        try {
            const resp = await fetch('/api/fechamento/conferir', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mes: _mes, ano: _ano, colaboradores_folha: colaboradoresFolha })
            });
            const json = await resp.json();
            if (!json.ok) throw new Error(json.error);

            if (!json.divergencias.length) {
                cont.innerHTML = \`<div style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:.75rem;padding:1.5rem;text-align:center;">
                    <div style="font-size:2rem;">✅</div>
                    <h3 style="color:#166534;margin:.5rem 0;">Nenhuma divergência encontrada!</h3>
                    <p style="color:#15803d;margin:0;">\${colaboradoresFolha.length} colaboradores verificados — tudo confere.</p>
                </div>\`;
                return;
            }

            let html = \`<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:.5rem;padding:.75rem 1rem;margin-bottom:1rem;">
                <strong style="color:#92400e;">⚠️ \${json.total_divergencias} colaborador(es) com divergência</strong> 
                de \${colaboradoresFolha.length} verificados.
            </div>\`;

            html += \`<table style="width:100%;border-collapse:collapse;font-size:.82rem;">
              <thead><tr style="background:#dc2626;color:#fff;">
                <th style="padding:.5rem .75rem;text-align:left;">Colaborador</th>
                <th style="padding:.5rem;text-align:left;">Rubrica</th>
                <th style="padding:.5rem;text-align:right;">Valor Folha</th>
                <th style="padding:.5rem;text-align:right;">Fechamento</th>
                <th style="padding:.5rem;text-align:right;">Diferença</th>
              </tr></thead><tbody>\`;

            for (const d of json.divergencias) {
                d.divergencias.forEach((div, i) => {
                    html += \`<tr style="border-bottom:1px solid #e5e7eb;\${i===0?'background:#fff7f7;':''}">
                        <td style="padding:.35rem .75rem;font-weight:\${i===0?'600':'400'};color:\${i===0?'#991b1b':'#6b7280'};">\${i===0?d.nome:''}</td>
                        <td style="padding:.35rem .5rem;">[<b>\${div.codigo}</b>] \${div.descricao}</td>
                        <td style="padding:.35rem .5rem;text-align:right;">\${fmt(div.valor_folha)}</td>
                        <td style="padding:.35rem .5rem;text-align:right;">\${fmt(div.valor_fechamento)}</td>
                        <td style="padding:.35rem .5rem;text-align:right;color:#dc2626;font-weight:600;">\${fmt(div.diferenca)}</td>
                    </tr>\`;
                });
            }
            html += '</tbody></table>';
            cont.innerHTML = html;
        } catch(e) {
            cont.innerHTML = \`<p style="color:#dc2626;">Erro na conferência: \${e.message}</p>\`;
        }
    }

    return {\n        init, buscar, atualizar, filtrar, salvarTudo,`;

code = code.replace(anchorReturn, novasFuncoes);

// ── 4. Expandir o return com as novas funções ─────────────────────────────
const oldReturn = `        uploadFarmacia, uploadConsignado,
        abrirModalMercado, fecharModalMercado, parseMercado,
        carregarMultas, carregarPLR,
        gerarXlsx, abrirModalEmail, fecharModalEmail, enviarEmail,
        calcularColaborador, calcINSS, calcIRRF`;
const newReturn = `        uploadFarmacia, uploadConsignado,
        abrirModalMercado, fecharModalMercado, parseMercado,
        carregarMultas, carregarPLR,
        gerarXlsx, abrirModalEmail, fecharModalEmail, enviarEmail,
        mudarAba, gerarLinksComissao, carregarStatusComissao, enviarEmailsComissao,
        reenviarComissao, importarComissaoParaFechamento,
        uploadFolhaContabilidade, conferirFolha,
        calcularColaborador, calcINSS, calcIRRF`;
code = code.replace(oldReturn, newReturn);

// ── 5. Atualizar versão no header ─────────────────────────────────────────
code = code.replace('versão 2.0 (2026-08-28) — Etapa 2', 'versão 3.0 (2026-08-28) — Etapa 3');

fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('fechamento.js atualizado!');
console.log('mudarAba:', code.includes('function mudarAba'));
console.log('gerarLinksComissao:', code.includes('function gerarLinksComissao'));
console.log('uploadFolhaContabilidade:', code.includes('function uploadFolhaContabilidade'));
console.log('conferirFolha:', code.includes('function conferirFolha'));
console.log('Tamanho:', code.length);
