// ABA SINISTROS - PROCESSOS DE BOLETINS DE OCORRÊNCIA
// Segue o padrão de renderMultasMotoristaTab em app.js

window._recarregarListaSinistros = async function(colabId) {
    const tabContent = document.getElementById('docs-list-container');
    if (tabContent && typeof window.renderSinistrosTab === 'function') {
        await window.renderSinistrosTab(tabContent);
    }
};

window.renderSinistrosTab = async function(container) {
    // Usa viewedColaborador — mesma variável global do app.js
    const colab = viewedColaborador;
    if (!colab) return;

    container.innerHTML = '';

    // Botão de nova ocorrência
    const btnNovo = document.createElement('button');
    btnNovo.className = 'btn btn-primary';
    btnNovo.style = 'margin-bottom:1.5rem; display:flex; align-items:center; gap:6px; background:#d97706; border-color:#b45309;';
    btnNovo.innerHTML = '<i class="ph ph-plus"></i> Novo Sinistro';
    btnNovo.onclick = () => window.abrirModalNovoSinistro();
    container.appendChild(btnNovo);

    const listaContainer = document.createElement('div');
    listaContainer.id = 'sinistros-lista-container';
    listaContainer.style = 'display:flex; flex-direction:column; gap:1.25rem;';
    listaContainer.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:#94a3b8;padding:1rem 0;">
        <i class="ph ph-spinner ph-spin"></i> Carregando sinistros registrados...
    </div>`;
    container.appendChild(listaContainer);

    let sinistros = [];
    try {
        sinistros = await apiGet(`/colaboradores/${colab.id}/sinistros`) || [];
    } catch(e) {
        listaContainer.innerHTML = `<div class="alert alert-info"><i class="ph ph-info"></i> Nenhum sinistro registrado ainda.</div>`;
        return;
    }

    listaContainer.innerHTML = '';

    if (sinistros.length === 0) {
        listaContainer.innerHTML = `
            <div style="text-align:center; padding:3rem; background:#f8fafc; border-radius:12px; border:2px dashed #e2e8f0;">
                <i class="ph ph-car-crash" style="font-size:3rem; color:#cbd5e1; margin-bottom:1rem; display:block;"></i>
                <h5 style="color:#475569; font-weight:600; margin-bottom:0.5rem;">Nenhum sinistro registrado</h5>
                <p style="color:#94a3b8; font-size:0.9rem; margin:0;">Clique em "Novo Sinistro" para anexar um Boletim de Ocorrência.</p>
            </div>
        `;
    } else {
        sinistros.forEach(s => window._renderSinistroCard(s, colab.id, listaContainer));
    }
};

window._renderSinistroCard = function(s, colabId, container) {
    const card = document.createElement('div');
    card.className = 'sinistro-card';
    card.style = 'background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.05); display:flex; flex-direction:column; gap:1rem;';

    const statusMap = {
        'pendente': { text: 'Aguardando Assinaturas', color: '#f59e0b', bg: '#fef3c7' },
        'assinado': { text: 'Finalizado e Assinado', color: '#10b981', bg: '#d1fae5' }
    };
    const st = statusMap[s.status] || { text: s.status, color: '#64748b', bg: '#f1f5f9' };

    let signStatus = '';
    if (s.processo_iniciado && s.status !== 'assinado') {
        const testOk = s.assinatura_testemunha1_base64 && s.assinatura_testemunha2_base64;
        const condOk = s.assinatura_condutor_base64;
        signStatus = `
            <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                <span style="font-size:0.75rem; padding:2px 8px; border-radius:4px; ${testOk ? 'background:#dcfce7; color:#166534;' : 'background:#fee2e2; color:#b91c1c;'}"><i class="ph ${testOk ? 'ph-check' : 'ph-x'}"></i> Testemunhas</span>
                <span style="font-size:0.75rem; padding:2px 8px; border-radius:4px; ${condOk ? 'background:#dcfce7; color:#166534;' : 'background:#fee2e2; color:#b91c1c;'}"><i class="ph ${condOk ? 'ph-check' : 'ph-x'}"></i> Condutor</span>
            </div>
        `;
    }

    let actionsHtml = '';
    if (s.status === 'assinado') {
        actionsHtml = `<button class="btn btn-sm" onclick="window.verDocumentoSinistro(${s.id}, ${colabId})" style="color:#0284c7; background:#e0f2fe; border:none;"><i class="ph ph-eye"></i> Ver Documento</button>`;
    } else if (!s.processo_iniciado || !s.documento_html) {
        if (s.desconto === 'Não') {
            actionsHtml = `<div style="display:flex;gap:0.5rem;width:100%;justify-content:space-between;align-items:center;"><span style="font-size:0.85rem; color:#64748b;"><i class="ph ph-check-circle"></i> Apenas Registro (BO Anexado)</span> <button class="btn btn-sm btn-outline-danger" onclick="window.excluirSinistro(${s.id}, ${colabId})" style="color:#ef4444; border:1px solid #ef4444; background:transparent;"><i class="ph ph-trash"></i> Excluir</button></div>`;
        } else {
            actionsHtml = `<div style="display:flex;gap:0.5rem;width:100%;justify-content:flex-end;"><button class="btn btn-sm" onclick="window.gerarDocumentoSinistro(${s.id}, ${colabId})" style="color:#0284c7; background:#e0f2fe; border:none;"><i class="ph ph-file-text"></i> Gerar Documento</button> <button class="btn btn-sm btn-outline-danger" onclick="window.excluirSinistro(${s.id}, ${colabId})" style="color:#ef4444; border:1px solid #ef4444; background:transparent;"><i class="ph ph-trash"></i> Excluir</button></div>`;
        }
    } else {
        const testOk = s.assinatura_testemunha1_base64 && s.assinatura_testemunha2_base64;
        const condOk = s.assinatura_condutor_base64;
        actionsHtml = `<div style="display:flex; gap:0.5rem;">`;
        if (!testOk) {
            actionsHtml += `<button class="btn btn-sm btn-primary" onclick="window.abrirModalAssinaturaTestemunhasSinistro(${s.id}, ${colabId})" style="background:#a78bfa; border:none;"><i class="ph ph-pen"></i> Assinar Testemunhas</button>`;
        } else if (!condOk) {
            actionsHtml += `<button class="btn btn-sm btn-primary" onclick="window.abrirModalAssinaturaCondutorSinistro(${s.id}, ${colabId})" style="background:#f59e0b; border:none;"><i class="ph ph-pen"></i> Assinar Condutor</button>`;
        }
        actionsHtml += `<button class="btn btn-sm" onclick="window.verDocumentoSinistro(${s.id}, ${colabId})" style="color:#64748b; background:#f1f5f9; border:none;"><i class="ph ph-eye"></i> Preview</button>`;
        actionsHtml += `<button class="btn btn-sm btn-outline-danger" onclick="window.excluirSinistro(${s.id}, ${colabId})" style="color:#ef4444; border:1px solid #ef4444; background:transparent; margin-left: auto;"><i class="ph ph-trash"></i> Excluir</button>`;
        actionsHtml += `</div>`;
    }

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <h5 style="margin:0; font-size:1.1rem; color:#0f172a; font-weight:700;"><i class="ph ph-file-text" style="color:#d97706;"></i> BO: ${s.numero_boletim || 'N/A'}</h5>
                <p style="margin:4px 0 0; font-size:0.85rem; color:#64748b;"><i class="ph ph-calendar"></i> Ocorrido: ${s.data_hora || '—'} &nbsp;|&nbsp; ${s.natureza || 'Sem Natureza'}</p>
                <p style="margin:4px 0 0; font-size:0.85rem; color:#64748b;">${s.veiculo || '—'} &nbsp;|&nbsp; Placa: ${s.placa || '—'}</p>
                ${signStatus}
            </div>
            <span style="display:inline-block; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; color:${st.color}; background:${st.bg};">${st.text}</span>
        </div>
        <div style="background:#f8fafc; border-top:1px dashed #cbd5e1; padding-top:0.75rem; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:0.8rem; color:#475569;">
                <strong>Desconto:</strong> ${s.desconto || 'Não'} ${s.desconto === 'Sim' ? `(${s.parcelas}x de ${s.valor_parcela})` : ''}<br/>
                ${s.tipo_sinistro ? `<strong>Tipo:</strong> ${s.tipo_sinistro}` : ''}
            </div>
            ${actionsHtml}
        </div>
    `;

    container.appendChild(card);
};

// =========================================================
// MODAL: NOVO SINISTRO (2 passos)
// =========================================================

window.abrirModalNovoSinistro = function() {
    let m = document.getElementById('modal-novo-sinistro');
    if (!m) {
        m = document.createElement('div');
        m.id = 'modal-novo-sinistro';
        m.className = 'modal';
        m.innerHTML = `
            <div class="modal-content" style="max-width:640px;">
                <div class="modal-header">
                    <h3><i class="ph ph-car-crash" style="color:#d97706;"></i> Registrar Novo Sinistro</h3>
                    <button onclick="document.getElementById('modal-novo-sinistro').style.display='none'" class="btn-close"><i class="ph ph-x"></i></button>
                </div>
                <div class="modal-body">
                    <div id="sinistro-step-1">
                        <p style="font-size:0.9rem; color:#475569; margin-bottom:1rem;">Anexe o Boletim de Ocorrência (PDF). O sistema tentará extrair os dados automaticamente.</p>
                        <div class="input-group">
                            <label>Arquivo do BO *</label>
                            <input type="file" id="sinistro-file-bo" accept=".pdf,image/*" class="form-control">
                        </div>
                        <button type="button" class="btn btn-primary" onclick="window.processarLeituraBO()" style="width:100%; margin-top:0.5rem;">
                            <i class="ph ph-scan"></i> Analisar BO e Continuar
                        </button>
                    </div>

                    <div id="sinistro-step-2" style="display:none;">
                        <div id="sin-bo-notif" style="display:none; border-radius:8px; padding:0.5rem 0.75rem; margin-bottom:1rem; font-size:0.85rem;"></div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                            <div class="input-group">
                                <label>Boletim Nº</label>
                                <input type="text" id="sin-bo" class="form-control">
                            </div>
                            <div class="input-group">
                                <label>Data e Hora da Ocorrência</label>
                                <input type="text" id="sin-data" class="form-control" placeholder="13/04/2026 às 13:30">
                            </div>
                        </div>
                        <div class="input-group">
                            <label>Natureza da Ocorrência</label>
                            <input type="text" id="sin-natureza" class="form-control">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                            <div class="input-group">
                                <label>Marca/Modelo</label>
                                <input type="text" id="sin-veiculo" class="form-control">
                            </div>
                            <div class="input-group">
                                <label>Placa</label>
                                <input type="text" id="sin-placa" class="form-control">
                            </div>
                        </div>

                        <hr style="border-color:#e2e8f0; margin:1.25rem 0;"/>
                        <p style="font-weight:600; color:#1e293b; margin-bottom:0.75rem;"><i class="ph ph-question"></i> Vai ser necessário realizar algum desconto?</p>
                        <div style="display:flex; gap:1.5rem; margin-bottom:1rem;">
                            <label style="cursor:pointer;"><input type="radio" name="sin-desconto" value="Sim" onclick="window.toggleSinistroDesconto(true)"> Sim</label>
                            <label style="cursor:pointer;"><input type="radio" name="sin-desconto" value="Não" checked onclick="window.toggleSinistroDesconto(false)"> Não</label>
                        </div>

                        <div id="area-sinistro-desconto" style="display:none; background:#f8fafc; padding:1rem; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:1rem;">
                            <div class="input-group">
                                <label>Tipo do Sinistro</label>
                                <select id="sin-tipo-sinistro" class="form-control">
                                    <option value="Danos em Terceiros e Nosso">Danos em Terceiros e Nosso</option>
                                    <option value="Danos em Terceiros">Danos em Terceiros</option>
                                    <option value="Danos no Nosso Veículo">Danos no Nosso Veículo</option>
                                    <option value="Outros Danos">Outros Danos</option>
                                </select>
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                                <div class="input-group">
                                    <label>Valor Total do Desconto (R$)</label>
                                    <input type="text" id="sin-valor-total" class="form-control" placeholder="0,00" oninput="window._calcSinParcela()">
                                </div>
                                <div class="input-group">
                                    <label>Parcelamento</label>
                                    <select id="sin-parcelas" class="form-control" onchange="window._calcSinParcela()">
                                        <option value="1">1x</option>
                                        <option value="2">2x</option>
                                        <option value="3">3x</option>
                                    </select>
                                    <small id="sin-valor-parcela-display" style="display:block; margin-top:4px; font-weight:600; color:#059669;">Parcela: R$ 0,00</small>
                                </div>
                            </div>
                            <p style="margin:10px 0 5px; font-weight:600; font-size:0.85rem;">Deseja anexar orçamentos?</p>
                            <div style="display:flex; gap:1.5rem; margin-bottom:8px;">
                                <label style="cursor:pointer;"><input type="radio" name="sin-orcamento" value="Sim" onclick="document.getElementById('sin-orc-upload').style.display='block'"> Sim</label>
                                <label style="cursor:pointer;"><input type="radio" name="sin-orcamento" value="Não" checked onclick="document.getElementById('sin-orc-upload').style.display='none'"> Não</label>
                            </div>
                            <div id="sin-orc-upload" style="display:none; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:10px;">
                                <div id="sin-orcamentos-list" style="display:flex; flex-direction:column; gap:8px;">
                                    <input type="file" name="sin_orc_file" accept=".pdf,image/*" class="form-control" style="font-size:0.8rem;">
                                </div>
                                <button type="button" class="btn btn-sm" onclick="window._addSinOrcField()" style="margin-top:8px; width:100%; border:1px dashed #cbd5e1; background:#fff; color:#475569;"><i class="ph ph-plus"></i> Anexar mais documentos</button>
                            </div>
                        </div>

                        <button type="button" class="btn btn-primary" onclick="window.salvarSinistroFinal()" style="width:100%; background:#059669; border:none;">
                            <i class="ph ph-check"></i> Concluir Registro
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(m);
    }

    // reset estado
    document.getElementById('sinistro-step-1').style.display = 'block';
    document.getElementById('sinistro-step-2').style.display = 'none';
    document.getElementById('sinistro-file-bo').value = '';
    m.style.display = 'flex';
};

window.toggleSinistroDesconto = function(show) {
    document.getElementById('area-sinistro-desconto').style.display = show ? 'block' : 'none';
};

window.processarLeituraBO = async function() {
    const fileInput = document.getElementById('sinistro-file-bo');
    if (!fileInput.files.length) return alert('Selecione o arquivo do BO.');

    const formData = new FormData();
    formData.append('arquivo', fileInput.files[0]);

    const btn = document.querySelector('#sinistro-step-1 button');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Lendo documento...';
    btn.disabled = true;

    let boletimData = {};
    try {
        const res = await fetch(`${API_URL}/extrair-bo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
            body: formData
        });
        if (res.status === 401 || res.status === 403) {
            alert("Aviso: Sua sessão expirou. Por favor, recarregue a página e faça login novamente para enviar o documento.");
            location.reload();
            return;
        }

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Erro interno no servidor.');
        }


        // Log diagnóstico no console (não mais alert)
        if (data._debug_text) {
            console.log('====== [ DIAGNÓSTICO BO ] ======');
            console.log('Dados extraídos:', data);
            console.log('Texto bruto lido do PDF (copie isso se não preencheu):');
            console.log(data._debug_text);
            console.log('================================');
        }
        boletimData = data;

    } catch(e) {
        console.warn('Leitura BO falhou, modo manual:', e.message);
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;

        // Preenche campos com o que foi extraído (pode ser vazio — usuário preenche)
        document.getElementById('sin-bo').value = boletimData.boletim || '';
        document.getElementById('sin-data').value = boletimData.data_hora || '';
        document.getElementById('sin-natureza').value = boletimData.natureza || '';
        document.getElementById('sin-veiculo').value = boletimData.marca_modelo || '';
        document.getElementById('sin-placa').value = boletimData.placa || '';

        // Notificação inline suave (sem alert)
        const temDados = boletimData.boletim || boletimData.natureza || boletimData.placa || boletimData.marca_modelo;
        const notifEl = document.getElementById('sin-bo-notif');
        if (notifEl) {
            notifEl.style.display = 'block';
            if (temDados) {
                notifEl.innerHTML = '<i class="ph ph-check-circle"></i> Dados extraídos. Confira ou edite se necessário.';
                notifEl.style.cssText = 'display:block;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;border-radius:8px;padding:0.5rem 0.75rem;margin-bottom:1rem;font-size:0.85rem;';
            } else {
                notifEl.innerHTML = '<i class="ph ph-warning"></i> Preenchimento automático não disponível para este PDF. Preencha os campos abaixo manualmente.';
                notifEl.style.cssText = 'display:block;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:8px;padding:0.5rem 0.75rem;margin-bottom:1rem;font-size:0.85rem;';
            }
        }

        // Avança para etapa 2
        document.getElementById('sinistro-step-1').style.display = 'none';
        document.getElementById('sinistro-step-2').style.display = 'block';
    }
};


window.salvarSinistroFinal = async function() {
    const colab = viewedColaborador;
    if (!colab) return;

    const fileBO = document.getElementById('sinistro-file-bo').files[0];
    if (!fileBO) return alert('O arquivo do BO não foi encontrado. Volte ao passo anterior.');

    const desconto = document.querySelector('input[name="sin-desconto"]:checked').value;

    const formData = new FormData();
    formData.append('arquivo', fileBO);
    formData.append('numero_boletim', document.getElementById('sin-bo').value || '');
    formData.append('data_hora', document.getElementById('sin-data').value || '');
    formData.append('natureza', document.getElementById('sin-natureza').value || '');
    formData.append('veiculo', document.getElementById('sin-veiculo').value || '');
    formData.append('placa', document.getElementById('sin-placa').value || '');
    formData.append('desconto', desconto);

    if (desconto === 'Sim') {
        formData.append('tipo_sinistro', document.getElementById('sin-tipo-sinistro').value);
        formData.append('parcelas', document.getElementById('sin-parcelas').value);
        formData.append('valor_parcela', document.getElementById('sin-parcelas').dataset.valor_parcela || '0,00');
        formData.append('valor_total', document.getElementById('sin-valor-total').value);

        const cOrc = document.querySelector('input[name="sin-orcamento"]:checked')?.value;
        if (cOrc === 'Sim') {
            const fileInputs = document.querySelectorAll('input[name="sin_orc_file"]');
            const filesOrc = [];
            fileInputs.forEach(i => { if(i.files && i.files.length > 0) for(let f of i.files) filesOrc.push(f); });
            if (filesOrc.length > 0) {
                const orcsBase64 = [];
                for (const f of filesOrc) {
                    const b64 = await new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(f); });
                    orcsBase64.push(b64);
                }
                formData.append('orcamentos_base64', JSON.stringify(orcsBase64));
            }
        }
    }

    const btn = document.querySelector('#sinistro-step-2 button.btn-primary');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/colaboradores/${colab.id}/sinistros`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
            body: formData
        });
        const responseData = await res.json();
        if (responseData.error) throw new Error(responseData.error);

        // Se com desconto, gera documento automaticamente
        if (desconto === 'Sim') {
            await fetch(`${API_URL}/colaboradores/${colab.id}/sinistros/${responseData.id}/gerar-documento`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
            });
        }

        document.getElementById('modal-novo-sinistro').style.display = 'none';
        if (typeof Toastify !== 'undefined') Toastify({ text: 'Sinistro registrado com sucesso!', backgroundColor: '#059669' }).showToast();
        await window._recarregarListaSinistros(colab.id);

    } catch(e) {
        alert('Erro ao salvar: ' + e.message);
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
};

window.gerarDocumentoSinistro = async function(sinId, colabId) {
    try {
        const r = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/gerar-documento`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
        });
        if (r.ok) {
            if (typeof Toastify !== 'undefined') Toastify({ text: 'Documento gerado!', backgroundColor: '#2563eb' }).showToast();
            await window._recarregarListaSinistros(colabId);
        }
    } catch(e) { alert(e.message); }
};

window.verDocumentoSinistro = async function(sinId, colabId) {
    // Sempre regera o documento para garantir o template do Gerador
    const rGen = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/gerar-documento`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
    });
    if (!rGen.ok) {
        const errData = await rGen.json().catch(() => ({}));
        return alert('Erro ao gerar documento: ' + (errData.error || rGen.status));
    }
    const genData = await rGen.json();
    const htmlFinal = genData.html;

    const modalBody = document.getElementById('preview-doc-body');
    if (modalBody) {
        modalBody.innerHTML = htmlFinal;
        document.getElementById('preview-doc-title').textContent = 'Visualização — Sinistro';
        const btns = document.getElementById('preview-doc-buttons');
        if (btns) {
            btns.innerHTML = `
                <button class="btn btn-primary" onclick="window.salvarDocumentoPDF()"><i class="ph ph-download-simple"></i> Salvar como PDF</button>
                <button class="btn btn-secondary" onclick="window.imprimirDocumento()"><i class="ph ph-printer"></i> Imprimir</button>
                <button class="btn btn-secondary" onclick="document.getElementById('modal-preview-doc').style.display='none'"><i class="ph ph-x"></i> Fechar</button>`;
        }
        document.getElementById('modal-preview-doc').style.display = 'block';
    } else {
        alert('Visualizador padrão não encontrado.');
    }
};

// =========================================================
// MODAIS DE ASSINATURA - TESTEMUNHAS
// =========================================================

window.abrirModalAssinaturaTestemunhasSinistro = async function(sinId, colabId) {
    // Gera documento se ainda não existe
    let sinistros = await apiGet(`/colaboradores/${colabId}/sinistros`);
    let s = sinistros.find(x => x.id == sinId);
    if (!s) return alert('Sinistro não encontrado.');

    if (!s.documento_html) {
        const rGen = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/gerar-documento`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
        });
        if (!rGen.ok) return alert('Erro ao gerar documento.');
        sinistros = await apiGet(`/colaboradores/${colabId}/sinistros`);
        s = sinistros.find(x => x.id == sinId);
    }

    // Sempre regera o documento para garantir o template do Gerador
    const rGen2 = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/gerar-documento`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
    });
    if (!rGen2.ok) return alert('Erro ao gerar documento para assinatura.');
    const genData2 = await rGen2.json();
    const docHtmlFresh = genData2.html || s.documento_html || '';

    window._sinistroDocHtmlTestemunhas = docHtmlFresh;

    // Carrega TODOS os colaboradores como possíveis testemunhas (sem filtro de status)
    let options = '<option value="">Selecione...</option>';
    try {
        const colabs = await apiGet('/colaboradores') || [];
        // Exclui apenas o próprio titular
        const outros = colabs.filter(c => String(c.id) !== String(colabId));
        outros.forEach(c => {
            const nome = c.nome_completo || c.nome || '';
            if (nome) options += `<option value="${nome}">${nome}</option>`;
        });
    } catch(e) {
        console.error('Erro ao carregar testemunhas:', e);
    }

    const modal = document.createElement('div');
    modal.id = 'modal-testemunhas-sinistro';
    modal.className = 'modal';
    modal.style.cssText = 'display:flex;align-items:flex-start;position:fixed;inset:0;z-index:99999;background:transparent;';
    modal.innerHTML = `
        <div class="modal-content" style="width:100%;max-width:100%;height:100vh;max-height:100vh;margin:0;border-radius:0;display:flex;flex-direction:column;background:#0f172a;overflow:hidden;">
            <div style="flex-shrink:0;background:#1e293b;padding:0.85rem 1.5rem;display:flex;align-items:center;justify-content:space-between;">
                <h3 style="margin:0;color:#fff;font-size:1rem;"><i class="ph ph-users" style="color:#a78bfa;"></i> Assinatura de Testemunhas — Sinistro #${s.id}</h3>
                <button onclick="document.getElementById('modal-testemunhas-sinistro').remove()" style="background:rgba(255,255,255,0.1);border:none;color:#fff;border-radius:8px;padding:6px 14px;cursor:pointer;">Fechar</button>
            </div>
            <div style="padding:0;flex:1;display:flex;overflow:hidden;">
                <div style="flex:1;overflow-y:auto;background:#f1f5f9;padding:2rem;">
                    <div style="background:white;margin:0 auto;width:21cm;min-height:29.7cm;padding:0;box-shadow:0 0 20px rgba(0,0,0,0.1);border:1px solid #ddd;overflow:hidden;">
                        ${docHtmlFresh}
                    </div>
                </div>
                <div style="width:360px;background:#fff;overflow-y:auto;padding:1.5rem 1.5rem 6rem;display:flex;flex-direction:column;gap:1.25rem;border-left:1px solid #e2e8f0;flex-shrink:0;">
                    <div>
                        <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:6px;">Testemunha 1</label>
                        <select id="sin-t1-nome" class="form-control" style="width:100%;margin-bottom:8px;">${options}</select>
                        <div style="border:2px dashed #cbd5e1;background:#f8fafc;border-radius:8px;">
                            <canvas id="sin-canvas-t1" style="width:100%;height:130px;cursor:crosshair;display:block;"></canvas>
                        </div>
                    </div>
                    <div>
                        <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:6px;">Testemunha 2 <span style="font-weight:400;color:#94a3b8;">(opcional)</span></label>
                        <select id="sin-t2-nome" class="form-control" style="width:100%;margin-bottom:8px;">${options}</select>
                        <div style="border:2px dashed #cbd5e1;background:#f8fafc;border-radius:8px;">
                            <canvas id="sin-canvas-t2" style="width:100%;height:130px;cursor:crosshair;display:block;"></canvas>
                        </div>
                    </div>
                    <button type="button" id="btn-conf-t-sin" onclick="window.salvarAssinaturaTestemunhasSinistro(${sinId}, ${colabId})" style="padding:0.85rem;background:#2563eb;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                        <i class="ph ph-check"></i> Salvar Assinaturas
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Configura Canvas de Assinatura - implementação própria
    setTimeout(() => {
        ['sin-canvas-t1', 'sin-canvas-t2'].forEach(id => window._sinSetupCanvas(id));
    }, 200);
};

// =========================================================
// CANVAS DE ASSINATURA - implementação própria do módulo Sinistros
// =========================================================
window._sinSetupCanvas = function(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    // Ajusta tamanho real do canvas ao layout
    canvas.width = canvas.offsetWidth || canvas.clientWidth || 300;
    canvas.height = canvas.offsetHeight || canvas.clientHeight || 130;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let drawing = false;

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const src = e.touches ? e.touches[0] : e;
        return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    };
    const start = (e) => { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const draw  = (e) => { e.preventDefault(); if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const stop  = (e) => { e.preventDefault(); drawing = false; };

    canvas.addEventListener('mousedown',  start);
    canvas.addEventListener('mousemove',  draw);
    canvas.addEventListener('mouseup',    stop);
    canvas.addEventListener('mouseleave', stop);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove',  draw,  { passive: false });
    canvas.addEventListener('touchend',   stop,  { passive: false });
};

window._sinCanvasTemConteudo = function(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) { if (data[i] > 10) return true; }
    return false;
};

window.salvarAssinaturaTestemunhasSinistro = async function(sinId, colabId) {
    const t1Nome = document.getElementById('sin-t1-nome').value;
    const t2Nome = document.getElementById('sin-t2-nome')?.value || '';
    const c1 = document.getElementById('sin-canvas-t1');
    const c2 = document.getElementById('sin-canvas-t2');

    if (!t1Nome) return alert('Selecione a Testemunha 1.');
    if (!window._sinCanvasTemConteudo('sin-canvas-t1')) return alert('A Testemunha 1 precisa assinar.');

    const t1Ass = c1.toDataURL('image/png');
    const t2Ass = (c2 && window._sinCanvasTemConteudo('sin-canvas-t2')) ? c2.toDataURL('image/png') : null;

    let docHtml = window._sinistroDocHtmlTestemunhas || '';
    if (docHtml) {
        const inject = `
            <div style="margin-top:20px;padding:10px;border-top:2px solid #e2e8f0;">
                <p style="font-weight:700;font-size:11px;">ASSINATURAS DAS TESTEMUNHAS:</p>
                <div style="display:flex;gap:20px;">
                    <div style="text-align:center;">
                        <img src="${t1Ass}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;">
                        <p style="font-size:10px;margin:2px 0;">${t1Nome}</p>
                    </div>
                    ${t2Ass && t2Nome ? `<div style="text-align:center;">
                        <img src="${t2Ass}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;">
                        <p style="font-size:10px;margin:2px 0;">${t2Nome}</p>
                    </div>` : ''}
                </div>
            </div>`;
        docHtml = docHtml.replace('</body>', inject + '</body>');
    }

    try {
        const btn = document.getElementById('btn-conf-t-sin');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }

        const res = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/assinar-testemunhas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
            body: JSON.stringify({ t1_nome: t1Nome, t1_base64: t1Ass, t2_nome: t2Nome || null, t2_base64: t2Ass, html_atualizado: docHtml })
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error);

        document.getElementById('modal-testemunhas-sinistro').remove();
        if (typeof Toastify !== 'undefined') Toastify({ text: 'Testemunhas assinadas!', backgroundColor: '#059669' }).showToast();
        await window._recarregarListaSinistros(colabId);
    } catch(e) {
        alert('Erro: ' + e.message);
        const btn = document.getElementById('btn-conf-t-sin');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check"></i> Salvar Assinaturas'; }
    }
};

// =========================================================
// MODAL DE ASSINATURA - CONDUTOR
// =========================================================

window.abrirModalAssinaturaCondutorSinistro = async function(sinId, colabId) {
    const sinistros = await apiGet(`/colaboradores/${colabId}/sinistros`);
    const s = sinistros.find(x => x.id == sinId);
    if (!s || !s.documento_html) return alert('HTML do documento não encontrado!');

    const existing = document.getElementById('modal-condutor-sinistro');
    if (existing) existing.remove();

    window._sinistroDocHtmlCondutor = s.documento_html;
    const colabName = viewedColaborador.nome_completo;

    const modal = document.createElement('div');
    modal.id = 'modal-condutor-sinistro';
    modal.className = 'modal';
    modal.style.cssText = 'display:flex;align-items:flex-start;position:fixed;inset:0;z-index:999999;background:transparent;';
    modal.innerHTML = `
        <div class="modal-content" style="width:100%;max-width:100%;height:100vh;max-height:100vh;margin:0;border-radius:0;display:flex;flex-direction:column;background:#0f172a;overflow:hidden;">
            <div style="flex-shrink:0;background:#1e293b;padding:0.85rem 1.5rem;display:flex;align-items:center;justify-content:space-between;">
                <h3 style="margin:0;color:#fff;font-size:1rem;"><i class="ph ph-pen" style="color:#d97706;"></i> Assinatura do Condutor — Sinistro #${s.id}</h3>
                <button onclick="document.getElementById('modal-condutor-sinistro').remove()" style="background:rgba(255,255,255,0.1);border:none;color:#fff;border-radius:8px;padding:6px 14px;cursor:pointer;">Fechar</button>
            </div>
            <div style="padding:0;flex:1;display:flex;overflow:hidden;">
                <div style="flex:1;overflow-y:auto;background:#f1f5f9;padding:2rem;">
                    <div style="background:white;margin:0 auto;width:21cm;min-height:29.7cm;padding:0;box-shadow:0 0 20px rgba(0,0,0,0.1);border:1px solid #ddd;overflow:hidden;">
                        ${s.documento_html}
                    </div>
                </div>
                <div style="width:360px;background:#fff;overflow-y:auto;padding:1.5rem 1.5rem 6rem;display:flex;flex-direction:column;gap:1.25rem;border-left:1px solid #e2e8f0;flex-shrink:0;">
                    <div>
                        <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:6px;">Assinatura de: <span style="color:#d97706;">${colabName}</span></label>
                        <div style="border:2px dashed #fcd34d;background:#f8fafc;border-radius:8px;">
                            <canvas id="sin-canvas-condutor" style="width:100%;height:160px;cursor:crosshair;display:block;"></canvas>
                        </div>
                    </div>
                    <button type="button" id="btn-conf-con-sin" onclick="window.salvarAssinaturaCondutorSinistro(${sinId}, ${colabId})" style="padding:0.85rem;background:#2563eb;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                        <i class="ph ph-check"></i> Salvar Assinatura do Condutor
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => {
        window._sinSetupCanvas('sin-canvas-condutor');
    }, 200);
};

window.salvarAssinaturaCondutorSinistro = async function(sinId, colabId) {
    const colabName = viewedColaborador.nome_completo;
    if (!window._sinCanvasTemConteudo('sin-canvas-condutor')) {
        return alert('Assine o campo de assinatura antes de continuar.');
    }

    const assinaturaBase64 = document.getElementById('sin-canvas-condutor').toDataURL('image/png');
    let docHtml = window._sinistroDocHtmlCondutor || '';

    if (docHtml) {
        const inject = `
            <div style="margin-top:20px;padding:10px;border-top:2px solid #e2e8f0;">
                <p style="font-weight:700;font-size:11px;">ASSINATURA DO CONDUTOR:</p>
                <div style="text-align:center;width:200px;">
                    <img src="${assinaturaBase64}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;">
                    <p style="font-size:10px;margin:2px 0;">${colabName}</p>
                </div>
            </div>`;

        if (docHtml.includes('ASSINATURAS DAS TESTEMUNHAS:')) {
            docHtml = docHtml.replace('<div style="margin-top:20px;padding:10px;border-top:2px solid #e2e8f0;">', inject + '<div style="margin-top:20px;padding:10px;border-top:2px solid #e2e8f0;">');
        } else {
            docHtml = docHtml.replace('</body>', inject + '</body>');
        }
    }

    try {
        const btn = document.getElementById('btn-conf-con-sin');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }

        const res = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/assinar-condutor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
            body: JSON.stringify({ assinatura_base64: assinaturaBase64, documento_html: docHtml })
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error);

        document.getElementById('modal-condutor-sinistro').remove();
        if (typeof Toastify !== 'undefined') Toastify({ text: 'Assinatura do condutor salva!', backgroundColor: '#059669' }).showToast();
        await window._recarregarListaSinistros(colabId);
    } catch(e) {
        alert('Erro: ' + e.message);
        const btn = document.getElementById('btn-conf-con-sin');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check"></i> Salvar Assinatura do Condutor'; }
    }
};

window.excluirSinistro = async function(sinId, colabId) {
    if (!confirm('Tem certeza que deseja excluir este sinistro permanentemente?')) return;
    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error);
        alert('Sinistro excluído com sucesso.');
        window._recarregarListaSinistros(colabId);
    } catch(e) {
        alert('Erro ao excluir: ' + e.message);
    }
};

window._addSinOrcField = function() {
    const list = document.getElementById('sin-orcamentos-list');
    const input = document.createElement('input');
    input.type = 'file';
    input.name = 'sin_orc_file';
    input.accept = '.pdf,image/*';
    input.className = 'form-control';
    input.style.fontSize = '0.8rem';
    list.appendChild(input);
};

window._calcSinParcela = function() {
    const vTotalStr = document.getElementById('sin-valor-total').value || '0';
    const vTotalRaw = parseFloat(vTotalStr.replace(/[^0-9,]/g,'').replace(',','.')) || 0;
    const qtd = parseInt(document.getElementById('sin-parcelas').value) || 1;
    const vParcela = vTotalRaw / qtd;
    
    document.getElementById('sin-valor-parcela-display').innerText = 'Parcela: R$ ' + vParcela.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
    // Guarda o valor formatado num atributo oculto no elemento de parcelas
    document.getElementById('sin-parcelas').dataset.valor_parcela = vParcela.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
};
