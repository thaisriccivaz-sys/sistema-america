/**
 * patch_multas_v2.js
 * Substitui o módulo de multas no frontend/app.js com o novo fluxo:
 *  - Upload PDF → salvar sem tipo/parcelas
 *  - Botão "Iniciar Processo" → popup com opções → muda para "Processo Iniciado"
 *  - Botão 👁 visualizar, botão Testemunhas (fullscreen canvas + dropdown collaboradores)
 *  - Após testemunhas assinarem → Botão Assinatura do Condutor (scroll + canvas)
 */
const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'frontend', 'app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

// ── Marcadores de início e fim do bloco a substituir ──────────────────────────
const START_MARKER = '// ============================================================\r\n// ABA MULTAS — MOTORISTAS\r\n// ============================================================\r\n\r\n// ============================================================\r\n// HELPER: Recarrega a lista de multas em tempo real\r\n// ============================================================\r\nwindow._recarregarListaMultas';

// Tentativa com \n
const START_MARKER_LF = '// ============================================================\n// ABA MULTAS — MOTORISTAS\n// ============================================================\n\n// ============================================================\n// HELPER: Recarrega a lista de multas em tempo real\n// ============================================================\nwindow._recarregarListaMultas';

let startIdx = content.indexOf(START_MARKER);
if (startIdx === -1) startIdx = content.indexOf(START_MARKER_LF);

if (startIdx === -1) {
    console.error('❌ Marcador inicial do módulo de multas não encontrado!');
    process.exit(1);
}

// O bloco termina no final do arquivo (o módulo de multas é o último)
const END_OF_FILE = content.length;

const newMultasModule = `// ============================================================
// ABA MULTAS — MOTORISTAS (v2 — Novo Fluxo de Processo)
// ============================================================

window._recarregarListaMultas = async function(colabId) {
    var tabContent = document.getElementById('tab-dynamic-content');
    if (tabContent && typeof window.renderMultasMotoristaTab === 'function') {
        tabContent.innerHTML = '';
        await window.renderMultasMotoristaTab(tabContent);
    }
};

window.renderMultasMotoristaTab = async function(container) {
    const colab = viewedColaborador;
    if (!colab) return;
    container.innerHTML = '';

    const btnNova = document.createElement('button');
    btnNova.className = 'btn btn-primary';
    btnNova.style = 'margin-bottom:1.5rem; display:flex; align-items:center; gap:6px;';
    btnNova.innerHTML = '<i class="ph ph-plus"></i> Registrar Nova Multa';
    btnNova.onclick = () => window.abrirFormNovaMulta(colab.id, container);
    container.appendChild(btnNova);

    const listaContainer = document.createElement('div');
    listaContainer.id = 'multas-lista-container';
    listaContainer.innerHTML = \`<div style="display:flex;align-items:center;gap:8px;color:#94a3b8;padding:1rem 0;">
        <i class="ph ph-spinner ph-spin"></i> Carregando multas registradas...
    </div>\`;
    container.appendChild(listaContainer);

    let multas = [];
    try {
        multas = await apiGet(\`/colaboradores/\${colab.id}/multas\`) || [];
    } catch(e) {
        listaContainer.innerHTML = \`<div class="alert alert-info"><i class="ph ph-info"></i> Nenhuma multa registrada ainda.</div>\`;
        return;
    }

    listaContainer.innerHTML = '';
    if (multas.length === 0) {
        const vazio = document.createElement('div');
        vazio.className = 'alert alert-info';
        vazio.innerHTML = '<i class="ph ph-traffic-cone"></i> Nenhuma multa registrada para este colaborador.';
        listaContainer.appendChild(vazio);
    } else {
        multas.forEach(m => window._renderMultaCard(m, colab.id, listaContainer));
    }
};

window._renderMultaCard = function(m, colabId, container) {
    const statusColor = { pendente:'#f59e0b', doc_gerado:'#3b82f6', testemunhas_assinadas:'#8b5cf6', assinado:'#10b981', confirmado:'#8b5cf6' };
    const statusLabel = { pendente:'Pendente', doc_gerado:'Processo Iniciado', testemunhas_assinadas:'Testemunhas Assinadas', assinado:'Assinado', confirmado:'Confirmado' };
    const cor = statusColor[m.status] || '#64748b';

    const card = document.createElement('div');
    card.style = 'border:1.5px solid #e2e8f0;border-radius:12px;padding:1rem;margin-bottom:1rem;background:#fff;';
    card.innerHTML = \`
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <div>
                <span style="font-weight:700;font-size:1rem;color:#1e293b;">🚦 \${m.codigo_infracao || '—'}</span>
                <span style="margin-left:8px;color:#64748b;font-size:0.85rem;">\${m.descricao_infracao || ''}</span>
            </div>
            <span style="background:\${cor}20;color:\${cor};font-weight:700;font-size:0.78rem;padding:3px 10px;border-radius:20px;">\${statusLabel[m.status] || m.status}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px;margin-top:8px;font-size:0.82rem;color:#475569;">
            <span><b>Placa:</b> \${m.placa || '—'}</span>
            <span><b>Veículo:</b> \${m.veiculo || '—'}</span>
            <span><b>Data:</b> \${m.data_infracao || '—'} \${m.hora_infracao || ''}</span>
            <span><b>Valor:</b> \${m.valor_multa || '—'}</span>
            <span><b>Pontos:</b> \${m.pontuacao || '—'}</span>
            \${m.processo_iniciado ? \`<span><b>Tipo:</b> \${m.tipo_resolucao === 'indicacao' ? 'Indicação' : m.tipo_resolucao === 'nic' ? 'NIC' : '—'}</span>
            <span><b>Parcelas:</b> \${m.parcelas || 1}x</span>\` : ''}
        </div>
        <div id="multa-actions-\${m.id}" style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center;">
        </div>
    \`;
    container.appendChild(card);
    window._renderMultaActions(m, colabId, card.querySelector(\`#multa-actions-\${m.id}\`));
};

window._renderMultaActions = function(m, colabId, actionsDiv) {
    actionsDiv.innerHTML = '';
    const assinFinalizado = m.assinaturas_finalizadas || m.status === 'assinado' || m.status === 'confirmado';

    // ── Botão Iniciar / Processo Iniciado ──
    if (!m.processo_iniciado) {
        const btnIniciar = document.createElement('button');
        btnIniciar.style = 'background:linear-gradient(135deg,#f503c5,#8b5cf6);color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;';
        btnIniciar.innerHTML = '<i class="ph ph-play"></i> Iniciar Processo';
        btnIniciar.onclick = () => window.abrirPopupIniciarProcesso(m, colabId);
        actionsDiv.appendChild(btnIniciar);
    } else {
        const btnPI = document.createElement('button');
        btnPI.style = 'background:#e0f2fe;color:#0369a1;border:1.5px solid #7dd3fc;border-radius:8px;padding:6px 14px;cursor:pointer;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;';
        btnPI.innerHTML = '<i class="ph ph-check-circle"></i> Processo Iniciado';
        btnPI.onclick = () => window.abrirPopupIniciarProcesso(m, colabId);
        actionsDiv.appendChild(btnPI);

        // ── Botão 👁 Visualizar ──
        const btnEye = document.createElement('button');
        btnEye.style = 'background:#dbeafe;color:#1d4ed8;border:1.5px solid #93c5fd;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:0.85rem;display:inline-flex;align-items:center;gap:4px;';
        btnEye.innerHTML = '<i class="ph ph-eye"></i>';
        btnEye.title = 'Ver Documento';
        btnEye.onclick = () => window.verDocumentoMulta(m.id, colabId, m.tipo_resolucao || 'indicacao');
        actionsDiv.appendChild(btnEye);

        // ── Botão Testemunhas ──
        const testemunhasOk = m.assinatura_testemunha1_base64;
        const btnTest = document.createElement('button');
        if (testemunhasOk) {
            btnTest.style = 'background:#d1fae5;color:#065f46;border:1.5px solid #6ee7b7;border-radius:8px;padding:6px 12px;cursor:not-allowed;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:5px;opacity:0.7;';
            btnTest.innerHTML = '<i class="ph ph-users"></i> Testemunhas ✓';
            btnTest.disabled = true;
        } else {
            btnTest.style = 'background:#f3e8ff;color:#7c3aed;border:1.5px solid #c4b5fd;border-radius:8px;padding:6px 12px;cursor:pointer;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:5px;';
            btnTest.innerHTML = '<i class="ph ph-users"></i> Testemunhas';
            btnTest.onclick = () => window.abrirModalTestemunhas(m, colabId);
        }
        actionsDiv.appendChild(btnTest);

        // ── Botão Assinatura do Condutor (só após testemunhas) ──
        if (testemunhasOk) {
            const condutorOk = m.assinatura_condutor_base64;
            const btnCond = document.createElement('button');
            if (condutorOk) {
                btnCond.style = 'background:#d1fae5;color:#065f46;border:1.5px solid #6ee7b7;border-radius:8px;padding:6px 12px;cursor:not-allowed;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:5px;opacity:0.7;';
                btnCond.innerHTML = '<i class="ph ph-pen"></i> Condutor ✓';
                btnCond.disabled = true;
            } else {
                btnCond.style = 'background:#fef3c7;color:#92400e;border:1.5px solid #fcd34d;border-radius:8px;padding:6px 12px;cursor:pointer;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:5px;';
                btnCond.innerHTML = '<i class="ph ph-pen"></i> Assinatura do Condutor';
                btnCond.onclick = () => window.abrirModalAssinaturaCondutor(m, colabId);
            }
            actionsDiv.appendChild(btnCond);
        }
    }

    // ── Excluir (apenas pendente/doc_gerado não assinado) ──
    if (!assinFinalizado && (m.status === 'pendente' || m.status === 'doc_gerado') && !m.assinatura_testemunha1_base64) {
        const btnDel = document.createElement('button');
        btnDel.style = 'background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;';
        btnDel.innerHTML = '<i class="ph ph-trash"></i>';
        btnDel.onclick = () => window.excluirMulta(m.id, colabId, btnDel);
        actionsDiv.appendChild(btnDel);
    }
};

// ─── Modal: Formulário de nova multa (SEM tipo/parcelas) ──────────────────────
window.abrirFormNovaMulta = function(colabId, container) {
    let modal = document.getElementById('modal-nova-multa');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'modal-nova-multa';
    modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.innerHTML = \`
        <div style="background:#fff;border-radius:16px;padding:2rem;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
                <h3 style="margin:0;color:#1e293b;font-size:1.1rem;"><i class="ph ph-traffic-sign" style="color:#f503c5;"></i> Nova Multa de Trânsito</h3>
                <button onclick="document.getElementById('modal-nova-multa').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#64748b;">×</button>
            </div>

            <div style="border:2px dashed #e2e8f0;border-radius:10px;padding:1.5rem;text-align:center;margin-bottom:1.5rem;cursor:pointer;background:#f8fafc;" id="multa-upload-area">
                <i class="ph ph-file-pdf" style="font-size:2.5rem;color:#ef4444;display:block;margin-bottom:8px;"></i>
                <p style="margin:0;font-weight:600;color:#334155;">Anexar Notificação de Autuação (PDF)</p>
                <p style="margin:4px 0 0;font-size:0.8rem;color:#94a3b8;">Clique ou arraste o PDF — dados serão extraídos automaticamente</p>
                <input type="file" id="multa-notificacao-input" accept=".pdf" style="display:none;" onchange="window.processarNotificacaoMulta(this, \${colabId})">
            </div>
            <div id="multa-loader" style="display:none;text-align:center;color:#64748b;padding:1rem;">
                <i class="ph ph-spinner ph-spin" style="font-size:1.5rem;"></i> Extraindo dados...
            </div>

            <div id="multa-dados" style="display:none;">
                <h4 style="color:#475569;font-size:0.9rem;margin-bottom:0.75rem;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">📋 Dados da Infração</h4>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.5rem;">
                    <div class="input-group"><label>Placa</label><input id="m-placa" class="form-control" placeholder="AAA0000"></div>
                    <div class="input-group"><label>Veículo</label><input id="m-veiculo" class="form-control"></div>
                    <div class="input-group"><label>Código da Infração</label><input id="m-codigo" class="form-control" placeholder="Ex: 7455" oninput="window.lookupCtb(this.value)"></div>
                    <div class="input-group"><label>N° AIT</label><input id="m-ait" class="form-control"></div>
                    <div class="input-group" style="grid-column:span 2;"><label>Descrição</label><input id="m-descricao" class="form-control"></div>
                    <div class="input-group"><label>Data</label><input id="m-data" class="form-control" placeholder="DD/MM/AAAA"></div>
                    <div class="input-group"><label>Hora</label><input id="m-hora" class="form-control" placeholder="HH:MM"></div>
                    <div class="input-group" style="grid-column:span 2;"><label>Local</label><input id="m-local" class="form-control"></div>
                    <div class="input-group"><label>Pontuação</label><input id="m-pontuacao" class="form-control" readonly style="background:#f1f5f9;"></div>
                    <div class="input-group"><label>Valor da Multa</label><input id="m-valor" class="form-control" readonly style="background:#f1f5f9;"></div>
                </div>
                <p style="font-size:0.8rem;color:#64748b;background:#f8fafc;padding:10px;border-radius:8px;margin-bottom:1rem;">
                    <i class="ph ph-info"></i> Após salvar, clique em <b>"Iniciar Processo"</b> no card para escolher a forma de resolução e parcelamento.
                </p>
                <button onclick="window.salvarNovaMulta(\${colabId})"
                    style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#f503c5,#8b5cf6);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                    <i class="ph ph-floppy-disk"></i> Salvar Multa
                </button>
            </div>
        </div>
    \`;
    document.body.appendChild(modal);
    modal.querySelector('#multa-upload-area').addEventListener('click', () => modal.querySelector('#multa-notificacao-input').click());
    window._multaArquivo = null;
};

// ─── Popup: Iniciar Processo (popup menor, não fullscreen) ────────────────────
window.abrirPopupIniciarProcesso = function(m, colabId) {
    let modal = document.getElementById('modal-iniciar-processo');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'modal-iniciar-processo';
    modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;';

    const tipoAtual = m.tipo_resolucao || '';
    const parcAtual = m.parcelas || 1;

    modal.innerHTML = \`
        <div style="background:#fff;border-radius:16px;padding:2rem;width:100%;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
                <h3 style="margin:0;color:#1e293b;font-size:1.1rem;">⚖️ Iniciar Processo — Multa \${m.codigo_infracao || ''}</h3>
                <button onclick="document.getElementById('modal-iniciar-processo').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#64748b;">×</button>
            </div>

            <h4 style="color:#475569;font-size:0.9rem;margin:0 0 0.75rem;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">⚖️ Forma de Resolução</h4>
            <div style="display:flex;gap:12px;margin-bottom:1.5rem;">
                <button id="tipo-indicacao" onclick="window.selecionarTipoMulta('indicacao')"
                    style="flex:1;padding:0.75rem;border-radius:8px;border:2px solid \${tipoAtual==='indicacao'?'#f503c5':'#e2e8f0'};background:\${tipoAtual==='indicacao'?'#fdf4ff':'#fff'};cursor:pointer;font-weight:600;color:\${tipoAtual==='indicacao'?'#f503c5':'#334155'};">
                    📋 Seguir com a Indicação
                </button>
                <button id="tipo-nic" onclick="window.selecionarTipoMulta('nic')"
                    style="flex:1;padding:0.75rem;border-radius:8px;border:2px solid \${tipoAtual==='nic'?'#f503c5':'#e2e8f0'};background:\${tipoAtual==='nic'?'#fdf4ff':'#fff'};cursor:pointer;font-weight:600;color:\${tipoAtual==='nic'?'#f503c5':'#334155'};">
                    💳 Pagamento da Multa NIC
                </button>
            </div>

            <h4 style="color:#475569;font-size:0.9rem;margin:0 0 0.75rem;">💰 Parcelamento do Desconto</h4>
            <div style="display:flex;gap:10px;margin-bottom:1.5rem;">
                \${[1,2,3].map(n=>\`<button id="parc-\${n}" onclick="window.selecionarParcelas(\${n})"
                    style="flex:1;padding:0.6rem;border-radius:8px;border:2px solid \${parcAtual===n?'#8b5cf6':'#e2e8f0'};background:\${parcAtual===n?'#f5f3ff':'#fff'};cursor:pointer;font-weight:700;color:\${parcAtual===n?'#8b5cf6':'#334155'};">\${n}x</button>\`).join('')}
            </div>

            <button onclick="window.confirmarIniciarProcesso(\${m.id}, \${colabId})"
                style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#f503c5,#8b5cf6);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                <i class="ph ph-play"></i> Confirmar Processo
            </button>
        </div>
    \`;
    document.body.appendChild(modal);
    window._multaTipoSelecionado = tipoAtual || null;
    window._multaParcelasSelecionadas = parcAtual;
    window._multaProcessoId = m.id;
};

window.confirmarIniciarProcesso = async function(multaId, colabId) {
    if (!window._multaTipoSelecionado) {
        alert('Selecione a forma de resolução antes de continuar.'); return;
    }
    try {
        // Gera o documento HTML
        const docRes = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${multaId}/gerar-documento\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
            body: JSON.stringify({ tipo: window._multaTipoSelecionado })
        });
        const docData = await docRes.json();

        await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${multaId}/iniciar-processo\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
            body: JSON.stringify({
                tipo_resolucao: window._multaTipoSelecionado,
                parcelas: window._multaParcelasSelecionadas,
                documento_html: docData.html || null
            })
        });
        document.getElementById('modal-iniciar-processo')?.remove();
        await window._recarregarListaMultas(colabId);
        if (typeof showToast === 'function') showToast('Processo iniciado!', 'success');
    } catch(e) { alert('Erro: ' + e.message); }
};

// ─── Modal Testemunhas (100% fullscreen) ──────────────────────────────────────
window.abrirModalTestemunhas = async function(m, colabId) {
    let modal = document.getElementById('modal-testemunhas-multa');
    if (modal) modal.remove();

    // Buscar lista de colaboradores para o dropdown
    let listaColab = [];
    try { listaColab = await apiGet('/colaboradores') || []; } catch(e) {}
    const optsColab = listaColab.map(c => \`<option value="\${c.nome_completo || c.nome}">\${c.nome_completo || c.nome}</option>\`).join('');

    // Gerar/recuperar HTML do documento
    let docHtml = m.documento_html || '';
    if (!docHtml && m.processo_iniciado) {
        try {
            const r = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${m.id}/gerar-documento\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
                body: JSON.stringify({ tipo: m.tipo_resolucao || 'indicacao' })
            });
            const d = await r.json();
            docHtml = d.html || '';
        } catch(e) {}
    }

    modal = document.createElement('div');
    modal.id = 'modal-testemunhas-multa';
    modal.style = 'position:fixed;inset:0;z-index:10001;background:#0f172a;display:flex;flex-direction:column;overflow:hidden;';
    modal.innerHTML = \`
        <div style="background:#1e293b;padding:0.85rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <h3 style="margin:0;color:#fff;font-size:1rem;"><i class="ph ph-users" style="color:#a78bfa;"></i> Assinatura das Testemunhas — Multa \${m.codigo_infracao || ''}</h3>
            <button onclick="document.getElementById('modal-testemunhas-multa').remove()" style="background:rgba(255,255,255,0.1);border:none;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;">Fechar</button>
        </div>
        <div style="flex:1;display:flex;overflow:hidden;">
            <!-- Documento à esquerda -->
            <div style="flex:1;overflow-y:auto;background:#f1f5f9;padding:1rem;" id="doc-preview-testemunhas">
                <div style="color:#64748b;text-align:center;padding:2rem;">Carregando documento...</div>
            </div>
            <!-- Painel direito -->
            <div style="width:380px;background:#fff;overflow-y:auto;padding:1.5rem;display:flex;flex-direction:column;gap:1rem;border-left:1px solid #e2e8f0;flex-shrink:0;">
                <div>
                    <label style="font-size:0.85rem;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Testemunha 1 *</label>
                    <select id="test1-select" class="form-control" style="width:100%;">
                        <option value="">Selecione a testemunha</option>
                        \${optsColab}
                    </select>
                </div>
                <div>
                    <label style="font-size:0.85rem;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Assinatura da Testemunha 1 *</label>
                    <canvas id="canvas-test1" width="340" height="130" style="border:1.5px solid #c4b5fd;border-radius:8px;touch-action:none;background:#fafafa;cursor:crosshair;width:100%;"></canvas>
                    <button onclick="window._limparCanvasMulta('canvas-test1')" style="margin-top:4px;background:none;border:none;color:#64748b;cursor:pointer;font-size:0.8rem;"><i class="ph ph-eraser"></i> Limpar</button>
                </div>
                <div>
                    <label style="font-size:0.85rem;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Testemunha 2 (opcional)</label>
                    <select id="test2-select" class="form-control" style="width:100%;">
                        <option value="">Selecione a testemunha</option>
                        \${optsColab}
                    </select>
                </div>
                <div>
                    <label style="font-size:0.85rem;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Assinatura da Testemunha 2</label>
                    <canvas id="canvas-test2" width="340" height="130" style="border:1.5px solid #e2e8f0;border-radius:8px;touch-action:none;background:#fafafa;cursor:crosshair;width:100%;"></canvas>
                    <button onclick="window._limparCanvasMulta('canvas-test2')" style="margin-top:4px;background:none;border:none;color:#64748b;cursor:pointer;font-size:0.8rem;"><i class="ph ph-eraser"></i> Limpar</button>
                </div>
                <p style="font-size:0.78rem;color:#94a3b8;background:#f8fafc;padding:8px;border-radius:6px;">Role o documento até o final antes de assinar.</p>
                <button id="btn-confirmar-testemunhas"
                    onclick="window.confirmarAssinaturaTestemunhas(\${m.id}, \${colabId})"
                    style="padding:0.85rem;background:linear-gradient(135deg,#7c3aed,#f503c5);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                    <i class="ph ph-check"></i> Confirmar Assinaturas das Testemunhas
                </button>
            </div>
        </div>
    \`;
    document.body.appendChild(modal);

    // Renderizar documento no preview
    const docPreview = modal.querySelector('#doc-preview-testemunhas');
    if (docHtml) {
        const iframe = document.createElement('iframe');
        iframe.style = 'width:100%;height:100%;min-height:600px;border:none;border-radius:8px;background:#fff;';
        docPreview.innerHTML = '';
        docPreview.appendChild(iframe);
        setTimeout(() => {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open(); doc.write(docHtml); doc.close();
        }, 50);
    } else {
        docPreview.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:3rem;">Documento não disponível.</div>';
    }

    // Inicializar canvas
    window._initCanvasMulta('canvas-test1');
    window._initCanvasMulta('canvas-test2');
};

window.confirmarAssinaturaTestemunhas = async function(multaId, colabId) {
    const t1Nome = document.getElementById('test1-select')?.value || '';
    const t2Nome = document.getElementById('test2-select')?.value || '';
    const c1 = document.getElementById('canvas-test1');
    const c2 = document.getElementById('canvas-test2');

    if (!t1Nome) { alert('Selecione a Testemunha 1.'); return; }
    if (!window._canvasTemConteudo('canvas-test1')) { alert('A Testemunha 1 precisa assinar.'); return; }

    const t1Ass = c1.toDataURL('image/png');
    const t2Ass = (c2 && window._canvasTemConteudo('canvas-test2')) ? c2.toDataURL('image/png') : null;

    const btn = document.getElementById('btn-confirmar-testemunhas');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }

    try {
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${multaId}/assinar-testemunhas\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
            body: JSON.stringify({
                testemunha1_nome: t1Nome,
                testemunha1_assinatura: t1Ass,
                testemunha2_nome: t2Nome || null,
                testemunha2_assinatura: t2Ass
            })
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error || 'Erro ao salvar.');
        document.getElementById('modal-testemunhas-multa')?.remove();
        await window._recarregarListaMultas(colabId);
        if (typeof showToast === 'function') showToast('Assinaturas das testemunhas salvas!', 'success');
    } catch(e) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check"></i> Confirmar Assinaturas das Testemunhas'; }
        alert('Erro: ' + e.message);
    }
};

// ─── Modal Assinatura do Condutor (fullscreen) ────────────────────────────────
window.abrirModalAssinaturaCondutor = async function(m, colabId) {
    let modal = document.getElementById('modal-condutor-multa');
    if (modal) modal.remove();

    // Buscar documento e inserir assinaturas das testemunhas no HTML
    let docHtml = m.documento_html || '';
    if (!docHtml) {
        try {
            const r = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${m.id}/gerar-documento\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
                body: JSON.stringify({ tipo: m.tipo_resolucao || 'indicacao' })
            });
            docHtml = (await r.json()).html || '';
        } catch(e) {}
    }

    // Injetar assinaturas das testemunhas no documento HTML
    if (docHtml && m.assinatura_testemunha1_base64) {
        const inject = \`
            <div style="margin-top:20px;padding:10px;border-top:2px solid #e2e8f0;">
                <p style="font-weight:700;font-size:11px;">ASSINATURAS DAS TESTEMUNHAS:</p>
                <div style="display:flex;gap:20px;">
                    <div style="text-align:center;">
                        <img src="\${m.assinatura_testemunha1_base64}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;">
                        <p style="font-size:10px;margin:2px 0;">\${m.assinatura_testemunha1_nome || 'Testemunha 1'}</p>
                    </div>
                    \${m.assinatura_testemunha2_base64 ? \`<div style="text-align:center;">
                        <img src="\${m.assinatura_testemunha2_base64}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;">
                        <p style="font-size:10px;margin:2px 0;">\${m.assinatura_testemunha2_nome || 'Testemunha 2'}</p>
                    </div>\` : ''}
                </div>
            </div>\`;
        docHtml = docHtml.replace('</body>', inject + '</body>');
    }

    modal = document.createElement('div');
    modal.id = 'modal-condutor-multa';
    modal.style = 'position:fixed;inset:0;z-index:10001;background:#0f172a;display:flex;flex-direction:column;overflow:hidden;';
    modal.innerHTML = \`
        <div style="background:#1e293b;padding:0.85rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <h3 style="margin:0;color:#fff;font-size:1rem;"><i class="ph ph-pen" style="color:#fcd34d;"></i> Assinatura do Condutor — Multa \${m.codigo_infracao || ''}</h3>
            <button onclick="document.getElementById('modal-condutor-multa').remove()" style="background:rgba(255,255,255,0.1);border:none;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;">Fechar</button>
        </div>
        <div style="flex:1;display:flex;overflow:hidden;">
            <!-- Documento -->
            <div style="flex:1;overflow-y:auto;background:#f1f5f9;padding:1rem;" id="doc-preview-condutor">
                <div style="color:#64748b;text-align:center;padding:2rem;">Carregando...</div>
            </div>
            <!-- Painel assinatura -->
            <div style="width:360px;background:#fff;overflow-y:auto;padding:1.5rem;display:flex;flex-direction:column;gap:1rem;border-left:1px solid #e2e8f0;flex-shrink:0;">
                <div style="background:#fef3c7;border-radius:8px;padding:10px;">
                    <p style="margin:0;font-size:0.82rem;color:#92400e;"><i class="ph ph-warning"></i> <b>Role o documento até o final</b> antes de assinar.</p>
                </div>
                <div>
                    <label style="font-size:0.85rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Assinatura do Condutor *</label>
                    <canvas id="canvas-condutor" width="320" height="140" style="border:1.5px solid #fcd34d;border-radius:8px;touch-action:none;background:#fafafa;cursor:crosshair;width:100%;"></canvas>
                    <button onclick="window._limparCanvasMulta('canvas-condutor')" style="margin-top:4px;background:none;border:none;color:#64748b;cursor:pointer;font-size:0.8rem;"><i class="ph ph-eraser"></i> Limpar</button>
                </div>
                <button id="btn-confirmar-condutor"
                    onclick="window.confirmarAssinaturaCondutor(\${m.id}, \${colabId})"
                    style="padding:0.85rem;background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                    <i class="ph ph-check"></i> Confirmar Assinatura do Condutor
                </button>
            </div>
        </div>
    \`;
    document.body.appendChild(modal);

    // Renderizar documento
    const docPreview = modal.querySelector('#doc-preview-condutor');
    if (docHtml) {
        const iframe = document.createElement('iframe');
        iframe.style = 'width:100%;height:100%;min-height:600px;border:none;border-radius:8px;background:#fff;';
        docPreview.innerHTML = '';
        docPreview.appendChild(iframe);
        setTimeout(() => {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open(); doc.write(docHtml); doc.close();
        }, 50);
    }

    window._initCanvasMulta('canvas-condutor');
};

window.confirmarAssinaturaCondutor = async function(multaId, colabId) {
    if (!window._canvasTemConteudo('canvas-condutor')) { alert('O condutor precisa assinar.'); return; }
    const assinatura = document.getElementById('canvas-condutor').toDataURL('image/png');
    const btn = document.getElementById('btn-confirmar-condutor');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }
    try {
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${multaId}/assinar-condutor\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
            body: JSON.stringify({ assinatura_base64: assinatura })
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error || 'Erro.');
        document.getElementById('modal-condutor-multa')?.remove();
        await window._recarregarListaMultas(colabId);
        if (typeof showToast === 'function') showToast('Documento assinado pelo condutor!', 'success');
    } catch(e) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check"></i> Confirmar Assinatura do Condutor'; }
        alert('Erro: ' + e.message);
    }
};

// ─── Helpers de canvas ────────────────────────────────────────────────────────
window._initCanvasMulta = function(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let drawing = false, lx = 0, ly = 0;
    const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const sx = canvas.width / r.width, sy = canvas.height / r.height;
        if (e.touches) return { x:(e.touches[0].clientX-r.left)*sx, y:(e.touches[0].clientY-r.top)*sy };
        return { x:(e.clientX-r.left)*sx, y:(e.clientY-r.top)*sy };
    };
    canvas.onmousedown = canvas.ontouchstart = (e) => { e.preventDefault(); drawing=true; const p=pos(e); lx=p.x; ly=p.y; };
    canvas.onmousemove = canvas.ontouchmove = (e) => { e.preventDefault(); if(!drawing) return; const p=pos(e); ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(p.x,p.y); ctx.stroke(); lx=p.x; ly=p.y; };
    canvas.onmouseup = canvas.ontouchend = canvas.onmouseleave = () => { drawing=false; };
};

window._limparCanvasMulta = function(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
};

window._canvasTemConteudo = function(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return false;
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) { if (data[i] > 0) return true; }
    return false;
};

// ─── Helpers legados (compatibilidade) ───────────────────────────────────────
window.selecionarTipoMulta = function(tipo) {
    window._multaTipoSelecionado = tipo;
    ['indicacao','nic'].forEach(t => {
        const btn = document.getElementById(\`tipo-\${t}\`);
        if (!btn) return;
        const sel = t === tipo;
        btn.style.borderColor = sel ? '#f503c5' : '#e2e8f0';
        btn.style.background  = sel ? '#fdf4ff' : '#fff';
        btn.style.color       = sel ? '#f503c5' : '#334155';
    });
};

window.selecionarParcelas = function(n) {
    window._multaParcelasSelecionadas = n;
    [1,2,3].forEach(i => {
        const btn = document.getElementById(\`parc-\${i}\`);
        if (!btn) return;
        const sel = i === n;
        btn.style.borderColor = sel ? '#8b5cf6' : '#e2e8f0';
        btn.style.background  = sel ? '#f5f3ff' : '#fff';
        btn.style.color       = sel ? '#8b5cf6' : '#334155';
    });
};

window.lookupCtb = async function(codigo) {
    if (!codigo || codigo.length < 4) return;
    try {
        const data = await apiGet(\`/ctb/\${codigo}\`);
        if (data && data.pontuacao) {
            const el = document.getElementById('m-pontuacao');
            const el2 = document.getElementById('m-valor');
            if (el) el.value = data.pontuacao;
            if (el2) el2.value = data.valor || '';
            if (!document.getElementById('m-descricao').value && data.descricao)
                document.getElementById('m-descricao').value = data.descricao;
        }
    } catch(e) {}
};

window.processarNotificacaoMulta = async function(input, colabId) {
    const file = input.files[0];
    if (!file) return;
    window._multaArquivo = file;
    const loader = document.getElementById('multa-loader');
    const uploadArea = document.getElementById('multa-upload-area');
    const dadosDiv = document.getElementById('multa-dados');
    loader.style.display = 'block';
    uploadArea.style.display = 'none';
    try {
        const formData = new FormData();
        formData.append('arquivo', file);
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/upload-notificacao\`, {
            method: 'POST',
            headers: { 'Authorization': \`Bearer \${currentToken}\` },
            body: formData
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        set('m-placa', data.placa); set('m-veiculo', data.veiculo);
        set('m-codigo', data.codigo_infracao); set('m-descricao', data.descricao_infracao);
        set('m-data', data.data_infracao); set('m-hora', data.hora_infracao);
        set('m-local', data.local_infracao); set('m-valor', data.valor_multa);
        set('m-pontuacao', data.pontuacao); set('m-ait', data.numero_ait);
        dadosDiv.style.display = 'block';
        loader.textContent = '✅ Dados extraídos! Confira e corrija se necessário.';
        loader.style.color = '#10b981';
    } catch(e) {
        loader.textContent = \`⚠️ Falha ao extrair: \${e.message || 'Preencha manualmente.'}\`;
        loader.style.color = '#ef4444';
        document.getElementById('multa-dados').style.display = 'block';
    }
};

window.salvarNovaMulta = async function(colabId) {
    const get = id => (document.getElementById(id) || {}).value || '';
    const formData = new FormData();
    formData.append('codigo_infracao', get('m-codigo'));
    formData.append('descricao_infracao', get('m-descricao'));
    formData.append('placa', get('m-placa'));
    formData.append('veiculo', get('m-veiculo'));
    formData.append('data_infracao', get('m-data'));
    formData.append('hora_infracao', get('m-hora'));
    formData.append('local_infracao', get('m-local'));
    formData.append('numero_ait', get('m-ait'));
    formData.append('pontuacao', get('m-pontuacao'));
    formData.append('valor_multa', get('m-valor'));
    if (window._multaArquivo) formData.append('arquivo', window._multaArquivo);
    try {
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas\`, {
            method: 'POST',
            headers: { 'Authorization': \`Bearer \${currentToken}\` },
            body: formData
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error || 'Erro ao salvar.');
        document.getElementById('modal-nova-multa')?.remove();
        await window._recarregarListaMultas(colabId);
        if (typeof showToast === 'function') showToast('Multa salva! Clique em "Iniciar Processo" para continuar.', 'success');
    } catch(e) { alert('Erro: ' + e.message); }
};

window.excluirMulta = async function(multaId, colabId, btn) {
    if (!confirm('Excluir este registro de multa? Esta ação não pode ser desfeita.')) return;
    if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>'; btn.disabled = true; }
    try {
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${multaId}\`, {
            method: 'DELETE', headers: { 'Authorization': \`Bearer \${currentToken}\` }
        });
        if (!res.ok) throw new Error('Falha ao excluir');
        await window._recarregarListaMultas(colabId);
        if (typeof showToast === 'function') showToast('Multa excluída.', 'success');
    } catch(e) {
        if (btn) { btn.innerHTML = '<i class="ph ph-trash"></i>'; btn.disabled = false; }
        alert('Erro: ' + e.message);
    }
};

window.verDocumentoMulta = async function(multaId, colabId, tipo) {
    try {
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${multaId}/gerar-documento\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
            body: JSON.stringify({ tipo: tipo || 'indicacao' })
        });
        const data = await res.json();
        if (!data.html) { alert('Documento não disponível.'); return; }
        let modal = document.getElementById('modal-preview-multa');
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = 'modal-preview-multa';
        modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;flex-direction:column;';
        modal.innerHTML = \`
            <div style="background:#1e293b;padding:1rem;display:flex;align-items:center;justify-content:space-between;">
                <h3 style="margin:0;color:#fff;font-size:1rem;"><i class="ph ph-file-text" style="color:#f503c5;"></i> Documento — \${tipo === 'indicacao' ? 'Indicação de Condutor' : 'Pagamento NIC'}</h3>
                <button onclick="document.getElementById('modal-preview-multa').remove()" style="padding:0.5rem 1rem;background:#475569;color:#fff;border:none;border-radius:8px;cursor:pointer;">Fechar</button>
            </div>
            <iframe id="multa-preview-iframe" style="flex:1;border:none;background:#fff;"></iframe>
        \`;
        document.body.appendChild(modal);
        setTimeout(() => {
            const iframe = document.getElementById('multa-preview-iframe');
            if (iframe) { const doc = iframe.contentDocument || iframe.contentWindow.document; doc.open(); doc.write(data.html); doc.close(); }
        }, 50);
    } catch(e) { alert('Erro: ' + e.message); }
};
`;

// Fazer a substituição
const before = content.substring(0, startIdx);
const after = ''; // o módulo vai até o final do arquivo

const newContent = before + newMultasModule;
fs.writeFileSync(appJsPath, newContent, 'utf8');
console.log('✅ Módulo de multas substituído com sucesso!');
console.log(`   Arquivo: ${appJsPath}`);
console.log(`   Tamanho: ${(newContent.length / 1024).toFixed(1)} KB`);
