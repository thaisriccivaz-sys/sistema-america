// ABA SINISTROS - PROCESSOS DE BOLETINS DE OCORRÊNCIA
// Segue o padrão de renderMultasMotoristaTab em app.js

window._recarregarListaSinistros = async function(colabId) {
    const tabContent = document.getElementById('docs-list-container');
    if (tabContent && typeof window.renderSinistrosTab === 'function') {
        await window.renderSinistrosTab(tabContent);
    }
    
    // Se estiver na tela da Logística, atualiza a lista lá também
    if (document.getElementById('log-sinistros-list') && typeof window.logSinCarregarPainel === 'function') {
        await window.logSinCarregarPainel();
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
                <i class="ph ph-warning" style="font-size:3rem; color:#cbd5e1; margin-bottom:1rem; display:block;"></i>
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
        'pendente':             { text: 'Aguardando Assinaturas',         color: '#f59e0b', bg: '#fef3c7' },
        'assinado_testemunhas': { text: 'Assinado pelas Testemunhas',       color: '#8b5cf6', bg: '#ede9fe' },
        'assinado':             { text: 'Finalizado e Assinado',            color: '#10b981', bg: '#d1fae5' }
    };
    const st = statusMap[s.status] || { text: s.status, color: '#64748b', bg: '#f1f5f9' };

    const testemunhasOk = s.assinatura_testemunha1_base64;
    const condutorOk    = s.assinatura_condutor_base64;
    const bloqueado     = !!(testemunhasOk); // após testemunhas, não editar

    let signStatus = '';
    if (s.processo_iniciado && s.status !== 'assinado') {
        const testOk = s.assinatura_testemunha1_base64 && s.assinatura_testemunha2_base64;
        const condOk = s.assinatura_condutor_base64;
        signStatus = `
            <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                <span style="font-size:0.75rem; padding:2px 8px; border-radius:4px; ${testemunhasOk ? 'background:#dcfce7; color:#166534;' : 'background:#fee2e2; color:#b91c1c;'}"><i class="ph ${testemunhasOk ? 'ph-check' : 'ph-x'}"></i> Testemunhas</span>
                <span style="font-size:0.75rem; padding:2px 8px; border-radius:4px; ${condOk ? 'background:#dcfce7; color:#166534;' : 'background:#fee2e2; color:#b91c1c;'}"><i class="ph ${condOk ? 'ph-check' : 'ph-x'}"></i> Condutor</span>
            </div>
        `;
    }

    let isRH = false;
    try {
        const u = JSON.parse(localStorage.getItem('erp_user')) || {};
        const r = (u.role || '').toLowerCase();
        const p = (u.perfil || '').toLowerCase();
        const d = (u.departamento || '').toLowerCase();
        const g = (u.grupo_nome || '').toLowerCase();
        const rhTerms = ['rh', 'admin', 'administrador', 'diretoria'];
        isRH = rhTerms.includes(r) || rhTerms.includes(p) || rhTerms.includes(d) || rhTerms.includes(g) || window.isTopAdmin;
    } catch(e) {}

    let actionsHtml = '';
    if (s.status === 'assinado') {
        actionsHtml = `<button class="btn btn-sm" onclick="window.verDocumentoSinistro(${s.id}, ${colabId})" style="color:#0284c7; background:#e0f2fe; border:none;"><i class="ph ph-eye"></i> Ver Documento</button>`;
    } else {
        actionsHtml = `<div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:flex-end;width:100%;">`;
        if (isRH) {
            let label = s.documento_html ? 'Continuar Finalização' : 'Finalizar Sinistro';
            if (s.status === 'assinado_testemunhas') label = 'Assinar Condutor';
            actionsHtml += `<button class="btn btn-sm" onclick="window.abrirFinalizarSinistro(${s.id}, ${colabId})" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;font-weight:600;padding:6px 14px;"><i class="ph ph-flag-checkered"></i> ${label}</button>`;
        }
        if (s.documento_html) {
            actionsHtml += `<button class="btn btn-sm" onclick="window.verDocumentoSinistro(${s.id}, ${colabId})" style="color:#64748b;background:#f1f5f9;border:none;"><i class="ph ph-eye"></i> Preview</button>`;
        }
        if (isRH && s.status !== 'assinado_testemunhas') {
            actionsHtml += `<button class="btn btn-sm btn-outline-danger" onclick="window.excluirSinistro(${s.id}, ${colabId})" style="color:#ef4444; border:1px solid #ef4444; background:transparent;"><i class="ph ph-trash"></i> Excluir</button>`;
        }
        actionsHtml += `</div>`;
    }


    let orcamentosLinks = '';
    if (s.orcamentos_paths) {
        try {
            const orcs = JSON.parse(s.orcamentos_paths);
            if (Array.isArray(orcs) && orcs.length > 0) {
                orcamentosLinks = orcs.map((path, idx) => 
                    `<a href="javascript:void(0)" onclick="window.abrirArquivoOneDrive('${path}')" style="display:inline-flex; align-items:center; gap:4px; font-size:0.8rem; color:#0284c7; background:#e0f2fe; padding:4px 8px; border-radius:4px; text-decoration:none; margin-right:4px;">
                        <i class="ph ph-paperclip"></i> Orçamento ${idx + 1}
                    </a>`
                ).join('');
            }
        } catch(e) {}
    }

    let midiasLinks = '';
    if (s.midias_paths) {
        try {
            const midias = JSON.parse(s.midias_paths);
            if (Array.isArray(midias) && midias.length > 0) {
                midiasLinks = midias.map((m, idx) => {
                    const isVideo = m.tipo && m.tipo.startsWith('video/');
                    const texto = isVideo ? `Vídeo do dano ${idx + 1}` : `Foto do dano ${idx + 1}`;
                    const icone = 'ph-paperclip';
                    return `<a href="${m.url}" target="_blank" style="display:inline-flex; align-items:center; gap:4px; font-size:0.8rem; color:#0369a1; background:#f0f9ff; padding:4px 8px; border-radius:4px; text-decoration:none; margin-right:4px;">
                        <i class="ph ${icone}"></i> ${texto}
                    </a>`;
                }).join('');
            }
        } catch(e) {}
    }

    const aberturaTxt = s.usuario_abertura ? `Aberto por: <b>${s.usuario_abertura}</b>` : 'Aberto via Sistema';
    const dataCriacao = s.created_at ? new Date((s.created_at + 'Z').replace(' Z','Z').replace(' ', 'T')).toLocaleString('pt-BR') : '—';
    const assinCondutorTxt = s.data_assinatura_condutor ? `Assinado em: ${new Date((s.data_assinatura_condutor + 'Z').replace(' Z','Z').replace(' ', 'T')).toLocaleString('pt-BR')}` : 'Não assinado';
    // Limpa prefixo "Crime Consumado..." da natureza para exibição
    const naturezaDisplay = (s.natureza || '').replace(/Crime\s+Consumado[^\-]*\-?\s*/gi, '').trim() || s.natureza || '—';

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="display:flex; gap:12px;">
                <!-- Setinha de expansão -->
                <button onclick="this.parentElement.parentElement.nextElementSibling.style.display = this.parentElement.parentElement.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('i').classList.toggle('ph-caret-right'); this.querySelector('i').classList.toggle('ph-caret-down');" style="background:none; border:none; cursor:pointer; padding:4px; color:#64748b; font-size:1.2rem;">
                    <i class="ph ph-caret-right"></i>
                </button>
                <div>
                    <h5 style="margin:0; font-size:1.1rem; color:#0f172a; font-weight:700;"><i class="ph ph-file-text" style="color:#d97706;"></i> BO: ${s.numero_boletim || 'N/A'}</h5>
                    <p style="margin:4px 0 0; font-size:0.85rem; color:#64748b;"><i class="ph ph-calendar"></i> Ocorrido: ${s.data_hora || '—'} &nbsp;|&nbsp; ${naturezaDisplay}</p>
                    <p style="margin:4px 0 0; font-size:0.85rem; color:#64748b;">${s.veiculo || '—'} &nbsp;|&nbsp; Placa: ${s.placa || '—'}</p>
                    ${signStatus}
                </div>
            </div>
            <span style="display:inline-block; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; color:${st.color}; background:${st.bg};">${st.text}</span>
        </div>
        
        <!-- Detalhes Expansíveis -->
        <div style="display:none; padding-top:1rem; margin-top:0.5rem; border-top:1px dashed #e2e8f0;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; font-size:0.85rem; color:#475569;">
                <div>
                    <p style="margin:0 0 6px 0;"><i class="ph ph-info"></i> ${aberturaTxt}</p>
                    <p style="margin:0 0 6px 0;"><i class="ph ph-clock"></i> Registrado no sistema: ${dataCriacao}</p>
                    <p style="margin:0 0 6px 0;"><i class="ph ph-pen"></i> Assinatura do Colaborador: ${assinCondutorTxt}</p>
                </div>
                <div>
                    <p style="margin:0 0 6px 0;"><strong>Anexos:</strong></p>
                    ${s.boletim_path ? `<a href="javascript:void(0)" onclick="window.abrirArquivoOneDrive('${s.boletim_path}')" style="display:inline-flex; align-items:center; gap:4px; font-size:0.8rem; color:#d97706; background:#fef3c7; padding:4px 8px; border-radius:4px; text-decoration:none; margin-bottom:6px;"><i class="ph ph-file-pdf"></i> Visualizar Boletim de Ocorrência</a><br/>` : ''}
                    ${orcamentosLinks}
                    ${midiasLinks}
                </div>
            </div>
        </div>

        <div style="background:#f8fafc; border-top:1px dashed #cbd5e1; padding-top:0.75rem; display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
            <div style="font-size:0.8rem; color:#475569;">

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
                    <h3><i class="ph ph-warning" style="color:#059669;"></i> Registrar Novo Sinistro</h3>
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
                                <select id="sin-tipo-sinistro" class="form-control" style="width:100%;">
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

                        <div style="background:#f0f9ff; padding:1rem; border-radius:8px; border:1px solid #bae6fd; margin-bottom:1rem;">
                            <p style="margin:0 0 10px; font-weight:600; font-size:0.9rem; color:#0369a1;"><i class="ph ph-camera"></i> Anexar Fotos e Vídeos do Veículo - Fotos e Vídeos dos ítens danificados</p>
                            <p style="font-size:0.8rem; color:#0ea5e9; margin-bottom:8px;">Selecione uma ou mais imagens/vídeos que comprovem a avaria (Máx. 500MB).</p>
                            <input type="file" id="sin-midias-file" multiple accept="image/*,video/*" class="form-control" style="padding:10px; font-size:0.8rem;">
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

        if (desconto === 'Sim') {
            await fetch(`${API_URL}/colaboradores/${colab.id}/sinistros/${responseData.id}/gerar-documento`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
            });
        }

        const midiasInput = document.getElementById('sin-midias-file');
        const filesMidia = midiasInput && midiasInput.files ? Array.from(midiasInput.files) : [];

        // Upload media files to R2
        if (filesMidia.length > 0 && responseData.id) {
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando Mídias...';
            for (let i = 0; i < filesMidia.length; i++) {
                btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Enviando Mídias (${i+1}/${filesMidia.length})...`;
                const mfData = new FormData();
                mfData.append('file', filesMidia[i]);
                try {
                    const rMidia = await fetch(`${API_URL}/sinistros/${responseData.id}/midia`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
                        body: mfData
                    });
                    if (!rMidia.ok) {
                        const err = await rMidia.json();
                        throw new Error(err.error || 'Erro ao enviar mídia.');
                    }
                } catch(e) {
                    console.error('Falha ao enviar mídia:', e);
                    alert('Falha ao enviar arquivo ' + filesMidia[i].name + ': ' + e.message);
                }
            }
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
                <div style="width:460px;background:#fff;overflow-y:auto;padding:1.5rem 1.5rem 6rem;display:flex;flex-direction:column;gap:1.25rem;border-left:1px solid #e2e8f0;flex-shrink:0;">
                    <div>
                        <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:6px;">Testemunha 1</label>
                        <select id="sin-t1-nome" class="form-control" style="width:100%;margin-bottom:8px;">${options}</select>
                        <div style="border:2px dashed #cbd5e1;background:#f8fafc;border-radius:8px;">
                            <canvas id="sin-canvas-t1" style="width:100%;height:400px;cursor:crosshair;display:block;" height="400"></canvas>
                        </div>
                    </div>
                    <div>
                        <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:6px;">Testemunha 2 <span style="font-weight:400;color:#94a3b8;">(opcional)</span></label>
                        <select id="sin-t2-nome" class="form-control" style="width:100%;margin-bottom:8px;">${options}</select>
                        <div style="border:2px dashed #cbd5e1;background:#f8fafc;border-radius:8px;">
                            <canvas id="sin-canvas-t2" style="width:100%;height:400px;cursor:crosshair;display:block;" height="400"></canvas>
                        </div>
                    </div>
                    <button type="button" id="btn-conf-t-sin" onclick="window.salvarAssinaturaTestemunhasSinistro(${sinId}, ${colabId}, false)" style="padding:0.85rem;background:#2563eb;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                        <i class="ph ph-check"></i> Salvar Assinaturas
                    </button>
                    <button type="button" onclick="window.salvarAssinaturaTestemunhasSinistro(${sinId}, ${colabId}, true)" style="padding:0.75rem;background:#7c3aed;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:0.9rem;cursor:pointer;margin-top:4px;">
                        <i class="ph ph-flag-checkered"></i> Finalizar (sem assinatura do condutor)
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
    canvas.height = canvas.offsetHeight || canvas.clientHeight || 400;
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

window.salvarAssinaturaTestemunhasSinistro = async function(sinId, colabId, finalizarSemCondutor = false) {
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
            body: JSON.stringify({ t1_nome: t1Nome, t1_base64: t1Ass, t2_nome: t2Nome || null, t2_base64: t2Ass, html_atualizado: docHtml, finalizar_sem_condutor: finalizarSemCondutor })
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error);

        document.getElementById('modal-testemunhas-sinistro').remove();
        const msg = finalizarSemCondutor ? 'Sinistro finalizado pelas testemunhas!' : 'Testemunhas assinadas!';
        if (typeof Toastify !== 'undefined') Toastify({ text: msg, backgroundColor: '#059669' }).showToast();
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
                <div style="width:460px;background:#fff;overflow-y:auto;padding:1.5rem 1.5rem 6rem;display:flex;flex-direction:column;gap:1.25rem;border-left:1px solid #e2e8f0;flex-shrink:0;">
                    <div>
                        <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:6px;">Assinatura de: <span style="color:#d97706;">${colabName}</span></label>
                        <div style="border:2px dashed #fcd34d;background:#f8fafc;border-radius:8px;">
                            <canvas id="sin-canvas-condutor" style="width:100%;height:350px;cursor:crosshair;display:block;" height="350"></canvas>
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

// =========================================================
// MODAL: FINALIZAR SINISTRO (RH) — Fluxo 2 etapas
// =========================================================

window.abrirFinalizarSinistro = async function(sinId, colabId) {
    document.getElementById('modal-fin-sin-step1')?.remove();
    document.getElementById('modal-finalizar-sinistro')?.remove();
    const sinistros = await apiGet(`/colaboradores/${colabId}/sinistros`);
    const s = (sinistros||[]).find(x => x.id == sinId);
    if (!s) return alert('Sinistro não encontrado.');

    if (s.assinatura_testemunha1_base64) {
        return window._abrirTelaCondutorSinistro(sinId, colabId);
    }

    const m = document.createElement('div');
    m.id = 'modal-fin-sin-step1';
    m.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
    const opcs = ['Danos em Terceiros e Nosso','Danos em Terceiros','Danos no Nosso Veículo','Outros Danos'];
    const parcOpts = [1,2,3,4,5,6].map(n=>`<option value="${n}" ${parseInt(s.parcelas||1)==n?'selected':''}>${n}x</option>`).join('');
    const tipoOpts = opcs.map(o=>`<option value="${o}" ${(s.tipo_sinistro||'')==o?'selected':''}>${o}</option>`).join('');
    m.innerHTML = `<div style="background:#fff;border-radius:16px;padding:2rem;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <h3 style="margin:0 0 1.5rem;font-size:1.15rem;font-weight:800;color:#0f172a;"><i class="ph ph-flag-checkered" style="color:#7c3aed;"></i> Finalizar Sinistro — Dados do Desconto</h3>
        <div style="display:flex;flex-direction:column;gap:1rem;">
            <div>
                <label style="font-size:0.85rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tipo do Sinistro *</label>
                <select id="fs1-tipo" class="form-control"><option value="">Selecione...</option>${tipoOpts}</select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                <div>
                    <label style="font-size:0.85rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Valor Total do Desconto (R$) *</label>
                    <input type="text" id="fs1-valor" class="form-control" value="${s.valor_total||''}" placeholder="Ex: 1.200,00" oninput="window._fs1Calc()">
                </div>
                <div>
                    <label style="font-size:0.85rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Parcelas *</label>
                    <select id="fs1-parcelas" class="form-control" onchange="window._fs1Calc()">${parcOpts}</select>
                </div>
            </div>
            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:0.75rem;text-align:center;">
                <span style="font-size:0.8rem;color:#166534;">Valor por parcela:</span>
                <strong id="fs1-display" style="color:#15803d;font-size:1.1rem;display:block;">R$ 0,00</strong>
            </div>
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:1.5rem;">
            <button onclick="document.getElementById('modal-fin-sin-step1').remove()" style="flex:1;padding:10px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;font-weight:600;color:#64748b;">Cancelar</button>
            <button id="fs1-btn-confirmar" onclick="window._fs1Confirmar(${sinId},${colabId})" style="flex:2;padding:10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.95rem;">
                <i class="ph ph-file-text"></i> Finalizar e Anexar ao Prontuário
            </button>
        </div>
    </div>`;
    document.body.appendChild(m);
    setTimeout(() => window._fs1Calc(), 100);
};

window._fs1Calc = function() {
    const v = parseFloat((document.getElementById('fs1-valor')?.value||'0').replace(/[^0-9,]/g,'').replace(',','.')) || 0;
    const q = parseInt(document.getElementById('fs1-parcelas')?.value) || 1;
    const el = document.getElementById('fs1-display');
    if (el) el.innerText = 'R$ ' + (v/q).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
};

window._fs1Confirmar = async function(sinId, colabId) {
    const tipo = document.getElementById('fs1-tipo').value;
    const valorStr = document.getElementById('fs1-valor').value;
    const qtd = parseInt(document.getElementById('fs1-parcelas').value) || 1;
    if (!tipo) return alert('Selecione o Tipo do Sinistro.');
    const valorRaw = parseFloat(valorStr.replace(/[^0-9,]/g,'').replace(',','.')) || 0;
    if (valorRaw <= 0) return alert('Informe o valor do desconto (maior que zero).');
    const valorParcela = (valorRaw/qtd).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
    const btn = document.getElementById('fs1-btn-confirmar');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando documento...'; }
    try {
        const token = localStorage.getItem('erp_token');
        await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/dados-financeiros`, {
            method: 'PUT',
            headers: {'Content-Type':'application/json','Authorization':`Bearer ${token}`},
            body: JSON.stringify({tipo_sinistro:tipo, valor_total:valorStr, parcelas:qtd, valor_parcela:valorParcela})
        });
        const rGen = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/gerar-documento`, {
            method: 'POST', headers: {'Authorization':`Bearer ${token}`}
        });
        const genData = await rGen.json();
        document.getElementById('modal-fin-sin-step1').remove();
        const sinistros2 = await apiGet(`/colaboradores/${colabId}/sinistros`);
        const s2 = (sinistros2||[]).find(x => x.id == sinId) || {};
        await window._abrirTelaAssinaturaSinistro(sinId, colabId, genData.html || '', s2);
    } catch(e) {
        alert('Erro: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-file-text"></i> Finalizar e Anexar ao Prontuário'; }
    }
};

window._abrirTelaAssinaturaSinistro = async function(sinId, colabId, docHtml, s) {
    document.getElementById('modal-finalizar-sinistro')?.remove();
    const colabName = viewedColaborador?.nome_completo || s.nome_completo || 'Colaborador';
    const vParc = s.valor_parcela ? `R$ ${parseFloat(String(s.valor_parcela).replace(',','.')).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—';
    const modal = document.createElement('div');
    modal.id = 'modal-finalizar-sinistro';
    modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.7);display:flex;align-items:stretch;';
    modal.innerHTML = `
        <div style="width:100%;height:100vh;display:flex;flex-direction:column;background:#0f172a;overflow:hidden;">
            <div style="flex-shrink:0;background:linear-gradient(90deg,#7c3aed,#4f46e5);padding:0.9rem 1.5rem;display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class="ph ph-flag-checkered" style="font-size:1.4rem;color:#fff;"></i>
                    <h3 style="margin:0;color:#fff;font-size:1rem;font-weight:700;">Sinistro #${sinId} — ${colabName} &nbsp;|&nbsp; ${s.parcelas||1}x de ${vParc}</h3>
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="window.abrirFinalizarSinistro(${sinId},${colabId})" style="background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:0.85rem;"><i class="ph ph-pencil"></i> Editar Dados</button>
                    <button onclick="document.getElementById('modal-finalizar-sinistro').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:8px;padding:6px 16px;cursor:pointer;font-size:0.9rem;">✕ Fechar</button>
                </div>
            </div>
            <div style="flex:1;display:flex;overflow:hidden;">
                <div style="flex:1;overflow-y:auto;background:#e2e8f0;padding:1.5rem;">
                    <div style="background:white;margin:0 auto;width:21cm;min-height:29.7cm;padding:0;box-shadow:0 4px 24px rgba(0,0,0,0.18);border:1px solid #ddd;overflow:hidden;">
                        ${docHtml}
                    </div>
                </div>
                <div style="width:380px;flex-shrink:0;background:#1e293b;overflow-y:auto;display:flex;flex-direction:column;border-left:1px solid rgba(255,255,255,0.08);">
                    <div id="fin-painel-testemunhas" style="padding:1.25rem;display:flex;flex-direction:column;gap:1rem;">
                        <p style="color:#94a3b8;font-size:0.75rem;font-weight:700;text-transform:uppercase;margin:0;">✍️ Assinaturas das Testemunhas</p>
                        <div style="background:#0f172a;border-radius:10px;padding:1rem;">
                            <label style="color:#94a3b8;font-size:0.75rem;display:block;margin-bottom:4px;">Testemunha 1 *</label>
                            <select id="fin-t1-nome" class="form-control" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155;margin-bottom:6px;width:100%;"><option value="">Selecione...</option></select>
                            <div style="border:1px dashed #475569;border-radius:6px;background:#fff;overflow:hidden;">
                                <canvas id="fin-canvas-t1" style="width:100%;height:400px;cursor:crosshair;display:block;" height="400"></canvas>
                            </div>
                            <button onclick="window._sinLimparCanvas('fin-canvas-t1')" style="margin-top:4px;background:transparent;border:1px solid #475569;color:#94a3b8;border-radius:6px;padding:3px 10px;font-size:0.75rem;cursor:pointer;"><i class="ph ph-eraser"></i> Limpar</button>
                        </div>
                        <div style="background:#0f172a;border-radius:10px;padding:1rem;">
                            <label style="color:#94a3b8;font-size:0.75rem;display:block;margin-bottom:4px;">Testemunha 2 <span style="color:#475569;">(opcional)</span></label>
                            <select id="fin-t2-nome" class="form-control" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155;margin-bottom:6px;width:100%;"><option value="">Selecione...</option></select>
                            <div style="border:1px dashed #475569;border-radius:6px;background:#fff;overflow:hidden;">
                                <canvas id="fin-canvas-t2" style="width:100%;height:400px;cursor:crosshair;display:block;" height="400"></canvas>
                            </div>
                            <button onclick="window._sinLimparCanvas('fin-canvas-t2')" style="margin-top:4px;background:transparent;border:1px solid #475569;color:#94a3b8;border-radius:6px;padding:3px 10px;font-size:0.75rem;cursor:pointer;"><i class="ph ph-eraser"></i> Limpar</button>
                        </div>
                        <button id="btn-fin-testemunhas" onclick="window._finSalvarTestemunhas(${sinId},${colabId},false)" style="padding:0.9rem;background:#2563eb;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;"><i class="ph ph-check"></i> Confirmar Assinaturas das Testemunhas</button>
                        <button onclick="window._finSalvarTestemunhas(${sinId},${colabId},true)" style="padding:0.75rem;background:#7c3aed;color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-size:0.88rem;"><i class="ph ph-flag-checkered"></i> Finalizar sem assinatura do condutor</button>
                    </div>
                    <div id="fin-painel-condutor" style="display:none;padding:1.25rem;flex-direction:column;gap:1rem;">
                        <p style="color:#94a3b8;font-size:0.75rem;font-weight:700;text-transform:uppercase;margin:0;">✅ Testemunhas Assinadas</p>
                        <p style="color:#e2e8f0;font-size:0.95rem;margin:0;">O colaborador irá assinar o documento?</p>
                        <div style="display:flex;gap:0.75rem;">
                            <button onclick="window._finMostrarAssinaturaCondutor()" style="flex:1;padding:0.85rem;background:#059669;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;"><i class="ph ph-check"></i> Sim, vai assinar</button>
                            <button onclick="window._finFinalizar(${sinId},${colabId},false)" style="flex:1;padding:0.85rem;background:#475569;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;"><i class="ph ph-x"></i> Não</button>
                        </div>
                    </div>
                    <div id="fin-painel-ass-condutor" style="display:none;padding:1.25rem;flex-direction:column;gap:1rem;">
                        <p style="color:#94a3b8;font-size:0.75rem;font-weight:700;text-transform:uppercase;margin:0;">✍️ Assinatura do Condutor</p>
                        <div style="background:#0f172a;border-radius:10px;padding:1rem;">
                            <label style="color:#e2e8f0;font-size:0.85rem;font-weight:600;display:block;margin-bottom:8px;">Assinatura de: <span style="color:#f59e0b;">${colabName}</span></label>
                            <div style="border:2px dashed #f59e0b;border-radius:8px;overflow:hidden;">
                                <canvas id="fin-canvas-condutor" style="width:100%;height:350px;cursor:crosshair;display:block;background:#fff;" height="350"></canvas>
                            </div>
                            <button onclick="window._sinLimparCanvas('fin-canvas-condutor')" style="margin-top:6px;background:transparent;border:1px solid #475569;color:#94a3b8;border-radius:6px;padding:4px 12px;font-size:0.78rem;cursor:pointer;"><i class="ph ph-eraser"></i> Limpar</button>
                        </div>
                        <button id="btn-fin-condutor" onclick="window._finFinalizar(${sinId},${colabId},true)" style="padding:1rem;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:12px;font-weight:700;font-size:1rem;cursor:pointer;"><i class="ph ph-check-circle"></i> Confirmar e Finalizar Sinistro</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    window._finalizarSinistroDocHtml = docHtml;

    try {
        const colabs = await apiGet('/colaboradores') || [];
        const outros = colabs.filter(c => String(c.id) !== String(colabId));
        let opts = '<option value="">Selecione...</option>';
        outros.forEach(c => { const n = c.nome_completo || c.nome || ''; if (n) opts += `<option value="${n}">${n}</option>`; });
        ['fin-t1-nome','fin-t2-nome'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = opts; });
    } catch(e) {}

    setTimeout(() => {
        ['fin-canvas-t1','fin-canvas-t2'].forEach(id => window._sinSetupCanvas(id));
    }, 250);
};

window._sinLimparCanvas = function(id) {
    const c = document.getElementById(id); if (!c) return;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
};
window._sinLimparCanvasFinalizar = function() { window._sinLimparCanvas('fin-canvas-condutor'); };
window._calcFinSinParcela = function() {};

window._finSalvarTestemunhas = async function(sinId, colabId, finalizarSemCondutor) {
    const t1Nome = document.getElementById('fin-t1-nome').value;
    if (!t1Nome) return alert('Selecione pelo menos a Testemunha 1.');
    if (!window._sinCanvasTemConteudo('fin-canvas-t1')) return alert('A Testemunha 1 precisa assinar.');
    const t1Ass = document.getElementById('fin-canvas-t1').toDataURL('image/png');
    const t2Nome = document.getElementById('fin-t2-nome')?.value || '';
    const t2Ass = window._sinCanvasTemConteudo('fin-canvas-t2') ? document.getElementById('fin-canvas-t2').toDataURL('image/png') : null;
    let docHtml = window._finalizarSinistroDocHtml || '';
    const injectTest = `<div style="margin-top:16px;padding:10px;border-top:2px solid #e2e8f0;"><p style="font-weight:700;font-size:11px;">ASSINATURAS DAS TESTEMUNHAS:</p><div style="display:flex;gap:20px;"><div style="text-align:center;"><img src="${t1Ass}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;"><p style="font-size:10px;margin:2px 0;">${t1Nome}</p></div>${t2Ass&&t2Nome?`<div style="text-align:center;"><img src="${t2Ass}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;"><p style="font-size:10px;margin:2px 0;">${t2Nome}</p></div>`:''}</div></div>`;
    docHtml = docHtml.replace('</body>', injectTest + '</body>');
    window._finalizarSinistroDocHtml = docHtml;
    const btn = document.getElementById('btn-fin-testemunhas');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }
    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/assinar-testemunhas`, {
            method: 'POST',
            headers: {'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('erp_token')}`},
            body: JSON.stringify({t1_nome:t1Nome, t1_base64:t1Ass, t2_nome:t2Nome||null, t2_base64:t2Ass, html_atualizado:docHtml, finalizar_sem_condutor:finalizarSemCondutor})
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error);
        if (finalizarSemCondutor) {
            document.getElementById('modal-finalizar-sinistro')?.remove();
            if (typeof Toastify !== 'undefined') Toastify({text:'Sinistro finalizado pelas testemunhas!', backgroundColor:'#059669'}).showToast();
            await window._recarregarListaSinistros(colabId);
        } else {
            document.getElementById('fin-painel-testemunhas').style.display = 'none';
            const p = document.getElementById('fin-painel-condutor');
            p.style.display = 'flex'; p.style.flexDirection = 'column';
        }
    } catch(e) {
        alert('Erro: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check"></i> Confirmar Assinaturas das Testemunhas'; }
    }
};

window._finMostrarAssinaturaCondutor = function() {
    document.getElementById('fin-painel-condutor').style.display = 'none';
    const p = document.getElementById('fin-painel-ass-condutor');
    p.style.display = 'flex'; p.style.flexDirection = 'column';
    setTimeout(() => window._sinSetupCanvas('fin-canvas-condutor'), 150);
};

window._finFinalizar = async function(sinId, colabId, comCondutor) {
    const colabName = viewedColaborador?.nome_completo || 'Colaborador';
    let docHtml = window._finalizarSinistroDocHtml || '';
    let assinaturaBase64 = null;
    if (comCondutor) {
        if (!window._sinCanvasTemConteudo('fin-canvas-condutor')) return alert('O colaborador precisa assinar.');
        assinaturaBase64 = document.getElementById('fin-canvas-condutor').toDataURL('image/png');
        const inj = `<div style="margin-top:20px;padding:10px;border-top:2px solid #e2e8f0;"><p style="font-weight:700;font-size:11px;">ASSINATURA DO CONDUTOR:</p><div style="text-align:center;width:200px;"><img src="${assinaturaBase64}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;"><p style="font-size:10px;margin:2px 0;">${colabName}</p></div></div>`;
        docHtml = docHtml.replace('</body>', inj + '</body>');
    }
    const btn = document.getElementById('btn-fin-condutor');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Finalizando...'; }
    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/assinar-condutor`, {
            method: 'POST',
            headers: {'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('erp_token')}`},
            body: JSON.stringify({assinatura_base64:assinaturaBase64, documento_html:docHtml})
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error || 'Erro ao finalizar.');
        document.getElementById('modal-finalizar-sinistro')?.remove();
        if (typeof Toastify !== 'undefined') Toastify({text:'✅ Sinistro finalizado e assinado!', backgroundColor:'#059669', duration:4000}).showToast();
        await window._recarregarListaSinistros(colabId);
    } catch(e) {
        alert('Erro ao finalizar: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check-circle"></i> Confirmar e Finalizar Sinistro'; }
    }
};

window._abrirTelaCondutorSinistro = async function(sinId, colabId) {
    const sinistros = await apiGet(`/colaboradores/${colabId}/sinistros`);
    const s = (sinistros||[]).find(x => x.id == sinId) || {};
    await window._abrirTelaAssinaturaSinistro(sinId, colabId, s.documento_html || '', s);
    setTimeout(() => {
        document.getElementById('fin-painel-testemunhas').style.display = 'none';
        const p = document.getElementById('fin-painel-condutor');
        if (p) { p.style.display = 'flex'; p.style.flexDirection = 'column'; }
    }, 400);
};
