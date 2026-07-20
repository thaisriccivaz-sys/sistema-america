// ABA SINISTROS - PROCESSOS DE BOLETINS DE OCORRÊNCIA
// Segue o padrão de renderMultasMotoristaTab em app.js

// Helper: remove data URI base64 do HTML antes de enviar ao servidor (evita OOM)
function _sinStripBase64(html) {
    if (!html) return html;
    return html
        .replace(/src="data:[^"]{100,}"/g, 'src="[IMG]"')
        .replace(/data-pdf-b64="[A-Za-z0-9+/=]{100,}"/g, 'data-pdf-b64=""');
}

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
        'assinado':             { text: 'Finalizado e Assinado',            color: '#10b981', bg: '#d1fae5' },
        'iniciado':             { text: 'Iniciado',                         color: '#b45309', bg: '#fef08a' }
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
        actionsHtml = `<div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:flex-end;width:100%;">
            <button class="btn btn-sm" onclick="window.verDocumentoSinistro(${s.id}, ${colabId})" style="color:#0284c7; background:#e0f2fe; border:none;"><i class="ph ph-eye"></i> Ver Documento</button>`;
        if (isRH) {
            actionsHtml += `<button class="btn btn-sm btn-outline-danger" onclick="window.excluirSinistro(${s.id}, ${colabId})" style="color:#ef4444; border:1px solid #ef4444; background:transparent;"><i class="ph ph-trash"></i> Excluir</button>`;
        }
        actionsHtml += `</div>`;
    } else {
        actionsHtml = `<div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:flex-end;width:100%;">`;
        if (isRH) {
            // Botão Editar — apenas antes de qualquer assinatura
            if (s.status === 'pendente' || s.status === 'iniciado') {
                actionsHtml += `<button class="btn btn-sm" onclick="window.rhSinAbrirModalEditar(${s.id}, ${colabId})"
                    style="background:#f1f5f9; border:1.5px solid #cbd5e1; color:#475569; font-weight:700; padding:5px 12px;"
                    title="Editar sinistro (disponível apenas antes das assinaturas)">
                    <i class="ph ph-pencil-simple"></i> Editar
                </button>`;
            }
            let label = s.documento_html ? 'Continuar Finalização' : 'Finalizar Sinistro';
            if (s.status === 'assinado_testemunhas') label = 'Assinar Condutor';
            actionsHtml += `<button class="btn btn-sm" onclick="window.abrirFinalizarSinistro(${s.id}, ${colabId})" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;font-weight:600;padding:6px 14px;"><i class="ph ph-flag-checkered"></i> ${label}</button>`;
        }
        if (s.documento_html) {
            actionsHtml += `<button class="btn btn-sm" onclick="window.verDocumentoSinistro(${s.id}, ${colabId})" style="color:#64748b;background:#f1f5f9;border:none;"><i class="ph ph-eye"></i> Preview</button>`;
        }
        if (isRH || s.status === 'pendente' || s.status === 'iniciado') {
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
                    ${s.observacoes ? `<p style="margin:6px 0 0; font-size:0.85rem; color:#334155; background:#f1f5f9; padding:6px 10px; border-radius:6px;"><i class="ph ph-info"></i> <strong>Obs:</strong> ${s.observacoes}</p>` : ''}
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
                        <!-- Busca de veículo por placa -->
                        <div class="input-group" style="margin-bottom:1rem;">
                            <label><i class="ph ph-truck" style="color:#d97706;"></i> Selecionar Veículo (buscar por placa)</label>
                            <div style="position:relative;width:100%;">
                                <input type="text" id="sin-placa-search" class="form-control" placeholder="Digite a placa ou modelo..." autocomplete="off"
                                    oninput="window._sinFiltrarVeiculos(this.value)"
                                    style="width:100%;box-sizing:border-box;padding-right:2.2rem;">
                                <i class="ph ph-magnifying-glass" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none;"></i>
                            </div>
                            <div id="sin-veiculo-dropdown" style="display:none;position:absolute;z-index:9999;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);max-height:200px;overflow-y:auto;width:100%;margin-top:2px;"></div>
                        </div>
                        <!-- Dados do veículo selecionado (step 1) -->
                        <div id="sin-veiculo-dados-step1" style="display:none;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:0.9rem 1rem;margin-bottom:0.75rem;">
                            <p style="margin:0 0 0.45rem;font-weight:700;font-size:0.79rem;color:#b45309;text-transform:uppercase;letter-spacing:0.5px;"><i class="ph ph-truck"></i> Veículo Selecionado</p>
                            <div id="sin-veiculo-dados-step1-rows" style="display:grid;grid-template-columns:1fr;gap:0.3rem;"></div>
                        </div>

                        <!-- Dados do Colaborador (step 1) -->
                        <div id="sin-dados-colab-section-s1" style="display:none;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:0.9rem 1rem;margin-bottom:0.75rem;">
                            <p style="margin:0 0 0.45rem;font-weight:700;font-size:0.79rem;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;"><i class="ph ph-user"></i> Dados do Colaborador</p>
                            <div id="sin-dados-colab-rows-s1" style="display:grid;grid-template-columns:1fr;gap:0.3rem;"></div>
                        </div>

                        <!-- Dados do Declarante (step 1, sempre visível) -->
                        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:0.9rem 1rem;margin-bottom:0.75rem;">
                            <p style="margin:0 0 0.45rem;font-weight:700;font-size:0.79rem;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px;"><i class="ph ph-identification-card"></i> Dados do Declarante</p>
                            <div id="sin-dados-declarante-rows-s1" style="display:grid;grid-template-columns:1fr;gap:0.3rem;"></div>
                        </div>

                        <!-- Nº do Protocolo -->
                        <div class="input-group" style="margin-bottom:1rem;">
                            <label><i class="ph ph-hash" style="color:#475569;"></i> Nº do Protocolo / Boletim <span style="font-size:0.78rem;color:#94a3b8;font-weight:400;">(opcional)</span></label>
                            <input type="text" id="sin-protocolo" class="form-control" placeholder="Ex: 2026.00123456">
                        </div>

                        <button type="button" class="btn btn-primary" onclick="window.salvarSinistroIniciado()" id="sin-btn-iniciar" style="width:100%;margin-top:0.25rem;background:#0f172a;border:none;">
                            <i class="ph ph-floppy-disk"></i> Salvar — Status: Iniciado
                        </button>
                    </div>

                    <div id="sinistro-step-2" style="display:none;">
                        <div id="sin-bo-notif" style="display:none; border-radius:8px; padding:0.5rem 0.75rem; margin-bottom:1rem; font-size:0.85rem;"></div>

                        <!-- BO Upload (Step 2) -->
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.9rem 1rem;margin-bottom:0.9rem;">
                            <p style="margin:0 0 0.5rem;font-weight:600;font-size:0.85rem;color:#334155;"><i class="ph ph-file-pdf" style="color:#dc2626;"></i> Boletim de Ocorrência (PDF)</p>
                            <div style="display:flex;gap:0.5rem;align-items:flex-end;">
                                <div style="flex:1;">
                                    <input type="file" id="sinistro-file-bo" accept=".pdf,image/*" class="form-control" style="font-size:0.82rem;">
                                </div>
                                <button type="button" class="btn btn-secondary" onclick="window.processarLeituraBO()" style="white-space:nowrap;font-size:0.82rem;padding:0.45rem 0.8rem;">
                                    <i class="ph ph-scan"></i> Analisar BO
                                </button>
                            </div>
                        </div>


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
                                <div id="sin-orc-dropzone"
                                    style="border:2px dashed #cbd5e1; border-radius:10px; background:#f1f5f9; padding:1.2rem 1rem; text-align:center; cursor:pointer; transition:all .2s;"
                                    onclick="document.getElementById('sin-orcs-file').click()"
                                    ondragover="event.preventDefault(); this.style.background='#e2e8f0'; this.style.borderColor='#94a3b8';"
                                    ondragleave="this.style.background='#f1f5f9'; this.style.borderColor='#cbd5e1';"
                                    ondrop="event.preventDefault(); this.style.background='#f1f5f9'; this.style.borderColor='#cbd5e1'; window._sinAdicionarOrcs(event.dataTransfer.files);">
                                    <i class="ph ph-image" style="font-size:1.8rem; color:#94a3b8; display:block; margin-bottom:4px;"></i>
                                    <p style="margin:0; font-weight:600; font-size:0.82rem; color:#475569;">Arraste fotos dos orçamentos aqui</p>
                                    <p style="margin:2px 0 0; font-size:0.72rem; color:#94a3b8;">ou clique para selecionar &bull; apenas JPG e PNG &bull; múltiplos de uma vez</p>
                                    <input type="file" id="sin-orcs-file" multiple accept="image/jpeg,image/png,.jpg,.png" style="display:none;"
                                        onchange="window._sinAdicionarOrcs(this.files); this.value='';">
                                </div>
                                <div id="sin-orcs-preview" style="display:none; margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;"></div>
                                <p id="sin-orcs-count" style="margin:6px 0 0; font-size:0.75rem; color:#475569; display:none;"></p>
                            </div>
                        </div>

                        <div style="background:#f0f9ff; padding:1rem; border-radius:8px; border:1px solid #bae6fd; margin-bottom:1rem;">
                            <p style="margin:0 0 8px; font-weight:600; font-size:0.9rem; color:#0369a1;"><i class="ph ph-camera"></i> Fotos e Vídeos dos Itens Danificados</p>
                            <!-- Zona drag-and-drop -->
                            <div id="sin-dropzone"
                                style="border:2px dashed #7dd3fc; border-radius:10px; background:#e0f2fe; padding:1.5rem 1rem; text-align:center; cursor:pointer; transition:all .2s; position:relative;"
                                onclick="document.getElementById('sin-midias-file').click()"
                                ondragover="event.preventDefault(); this.style.background='#bae6fd'; this.style.borderColor='#0ea5e9';"
                                ondragleave="this.style.background='#e0f2fe'; this.style.borderColor='#7dd3fc';"
                                ondrop="event.preventDefault(); this.style.background='#e0f2fe'; this.style.borderColor='#7dd3fc'; window._sinAdicionarMidias(event.dataTransfer.files);">
                                <i class="ph ph-upload-simple" style="font-size:2rem; color:#0ea5e9; display:block; margin-bottom:6px;"></i>
                                <p style="margin:0; font-weight:600; font-size:0.85rem; color:#0369a1;">Arraste fotos e vídeos aqui</p>
                                <p style="margin:2px 0 0; font-size:0.75rem; color:#38bdf8;">ou clique para selecionar &bull; múltiplos arquivos &bull; Máx. 500MB cada</p>
                                <input type="file" id="sin-midias-file" multiple accept="image/*,video/*" style="display:none;"
                                    onchange="window._sinAdicionarMidias(this.files); this.value='';">
                            </div>
                            <!-- Preview dos arquivos selecionados -->
                            <div id="sin-midias-preview" style="display:none; margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;"></div>
                            <p id="sin-midias-count" style="margin:6px 0 0; font-size:0.75rem; color:#0369a1; display:none;"></p>
                        </div>

                        <button type="button" class="btn btn-primary" onclick="window.finalizarSinistro()" id="sin-btn-finalizar" style="width:100%; background:#059669; border:none;">
                            <i class="ph ph-check"></i> Finalizar e Salvar
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
    var boInput = document.getElementById('sinistro-file-bo');
    if (boInput) boInput.value = '';
    var protoInput = document.getElementById('sin-protocolo');
    if (protoInput) protoInput.value = '';
    window._sinMidiasFiles = [];
    window._sinOrcFiles = [];
    window._sinistroAtualId = null;
    window._sinistroAtualColabId = null;
// ============================================================
// GERENCIADOR DE ORÇAMENTOS DO RH - drag-and-drop, JPG/PNG
// ============================================================
window._sinOrcFiles = [];

window._sinAdicionarOrcs = function(fileList) {
    if (!fileList || !fileList.length) return;
    Array.from(fileList).forEach(function(f) {
        var ext = f.name.split('.').pop().toLowerCase();
        if (!['jpg','jpeg','png'].includes(ext)) {
            alert('Apenas imagens JPG ou PNG são aceitas para orçamentos. Arquivo ignorado: ' + f.name);
            return;
        }
        var jaExiste = window._sinOrcFiles.some(function(x) { return x.name === f.name && x.size === f.size; });
        if (!jaExiste) window._sinOrcFiles.push(f);
    });
    window._sinAtualizarPreviewOrcs();
};

window._sinRemoverOrc = function(idx) {
    window._sinOrcFiles.splice(idx, 1);
    window._sinAtualizarPreviewOrcs();
};

window._sinAtualizarPreviewOrcs = function() {
    var previewEl = document.getElementById('sin-orcs-preview');
    var countEl   = document.getElementById('sin-orcs-count');
    if (!previewEl) return;
    var files = window._sinOrcFiles;
    if (!files.length) {
        previewEl.style.display = 'none';
        if (countEl) countEl.style.display = 'none';
        return;
    }
    previewEl.style.display = 'flex';
    previewEl.innerHTML = '';
    if (countEl) {
        countEl.textContent = files.length + ' orçamento' + (files.length > 1 ? 's' : '') + ' selecionado' + (files.length > 1 ? 's' : '');
        countEl.style.display = 'block';
    }
    files.forEach(function(f, idx) {
        var card = document.createElement('div');
        card.title = f.name;
        card.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:2px solid #d1d5db;background:#f9fafb;flex-shrink:0;';
        var img = document.createElement('img');
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        var reader = new FileReader();
        reader.onload = function(ev) { img.src = ev.target.result; };
        reader.readAsDataURL(f);
        card.appendChild(img);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = '&times;';
        btn.style.cssText = 'position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(239,68,68,0.9);color:#fff;font-size:0.8rem;cursor:pointer;padding:0;';
        btn.setAttribute('onclick', 'window._sinRemoverOrc(' + idx + ')');
        card.appendChild(btn);
        previewEl.appendChild(card);
    });
};


    if (typeof window._sinAtualizarPreviewMidias === 'function') window._sinAtualizarPreviewMidias();
    // Preencher seções de dados sempre que o modal abre (dados podem ter mudado)
    window._sinPreencherDeclarante();
    window._sinPreencherDadosColab();
    // Reset veículo selecionado e carregar lista
    window._sinVeiculoSelecionado = null;
    var sinPlacaInp = document.getElementById('sin-placa-search');
    if (sinPlacaInp) sinPlacaInp.value = '';
    var sinVeicDD = document.getElementById('sin-veiculo-dropdown');
    if (sinVeicDD) sinVeicDD.style.display = 'none';
    window._sinPreencherDadosVeiculo();
    window._sinCarregarVeiculos();
    m.style.display = 'flex';
};

// Helper: gera HTML de uma linha copiável (tema claro, scheme: 'colab'|'veiculo'|'declarante')
window._sinLinhaCopiavel = function(label, value, scheme) {
    var sc = {
        colab:      { row:'#dcfce7', lbl:'#15803d', val:'#166534', btn:'#bbf7d0', ok:'#16a34a' },
        veiculo:    { row:'#fef3c7', lbl:'#b45309', val:'#78350f', btn:'#fde68a', ok:'#b45309' },
        declarante: { row:'#dbeafe', lbl:'#1d4ed8', val:'#1e40af', btn:'#bfdbfe', ok:'#1d4ed8' }
    };
    var s = sc[scheme] || sc.declarante;
    return '<div style="display:flex;align-items:center;background:' + s.row + ';border-radius:5px;padding:0.28rem 0.55rem;gap:0.5rem;">' +
        '<span style="font-size:0.73rem;color:' + s.lbl + ';font-weight:600;min-width:95px;flex-shrink:0;">' + label + '</span>' +
        '<span style="font-size:0.81rem;color:' + s.val + ';font-weight:700;flex:1;">' + value + '</span>' +
        '<button type="button" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent.trim()).then(function(){var b=this;b.innerHTML=\'<i class=&quot;ph ph-check&quot;></i>\';b.style.background=\'' + s.ok + '\';b.style.color=\'#fff\';setTimeout(function(){b.innerHTML=\'<i class=&quot;ph ph-copy&quot;></i>\';b.style.background=\'' + s.btn + '\';b.style.color=\'' + s.lbl + '\';},1200);}.bind(this))" ' +
        'style="background:' + s.btn + ';border:none;color:' + s.lbl + ';border-radius:5px;width:26px;height:26px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.85rem;">' +
        '<i class="ph ph-copy"></i></button></div>';
};

// Preenche os dados fixos do declarante (Step 1 e Step 2)
window._sinPreencherDeclarante = function() {
    var dados = [
        { label: 'Nome da Mãe', value: 'Sandra Regina Mezuraro' },
        { label: 'CNH', value: '04130394162' },
        { label: 'Validade CNH', value: '16/10/2034' },
        { label: 'Profissão', value: 'Publicitario' },
        { label: 'Celular', value: '11 94788-4343' }
    ];
    var html = dados.map(function(d) { return window._sinLinhaCopiavel(d.label, d.value, 'declarante'); }).join('');
    ['sin-dados-declarante-rows', 'sin-dados-declarante-rows-s1'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = html;
    });
};

// Preenche os dados do colaborador atual (viewedColaborador) — Step 1 e Step 2
window._sinPreencherDadosColab = function() {
    var c = typeof viewedColaborador !== 'undefined' ? viewedColaborador : null;
    var pares = [
        { section: 'sin-dados-colab-section-s1', rows: 'sin-dados-colab-rows-s1' },
        { section: 'sin-dados-colab-section',    rows: 'sin-dados-colab-rows' }
    ];
    if (!c) {
        pares.forEach(function(p) { var s = document.getElementById(p.section); if (s) s.style.display='none'; });
        return;
    }
    var dados = [];
    if (c.nome_completo) dados.push({ label: 'Nome Completo', value: c.nome_completo });
    if (c.endereco)      dados.push({ label: 'Endereço',      value: c.endereco });
    if (c.telefone)      dados.push({ label: 'Telefone/Cel',  value: c.telefone });
    if (!dados.length) {
        pares.forEach(function(p) { var s = document.getElementById(p.section); if (s) s.style.display='none'; });
        return;
    }
    var html = dados.map(function(d) { return window._sinLinhaCopiavel(d.label, d.value, 'colab'); }).join('');
    pares.forEach(function(p) {
        var section = document.getElementById(p.section);
        var rows    = document.getElementById(p.rows);
        if (section && rows) { rows.innerHTML = html; section.style.display = 'block'; }
    });
};

// ---- VEÍCULO ----
window._sinListaVeiculos = [];  // cache

window._sinCarregarVeiculos = async function() {
    if (window._sinListaVeiculos.length) return;
    try {
        var data = await apiGet('/frota/veiculos');
        if (Array.isArray(data)) window._sinListaVeiculos = data;
    } catch(e) { console.warn('[sinistros] Erro ao carregar veículos', e); }
};

window._sinFiltrarVeiculos = function(q) {
    var dd = document.getElementById('sin-veiculo-dropdown');
    if (!dd) return;
    var lista = window._sinListaVeiculos;
    if (!q || q.length < 1) { dd.style.display = 'none'; return; }
    var termo = q.toLowerCase();
    var filtrados = lista.filter(function(v) {
        return (v.placa || '').toLowerCase().includes(termo) || (v.marca_modelo_versao || '').toLowerCase().includes(termo);
    }).slice(0, 12);
    if (!filtrados.length) { dd.style.display = 'none'; return; }
    dd.innerHTML = filtrados.map(function(v) {
        return '<div onclick="window._sinSelecionarVeiculo(' + v.id + ')" ' +
            'style="padding:0.5rem 0.75rem;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:0.85rem;" ' +
            'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'#fff\'">' +
            '<strong style="color:#1e293b;">' + (v.placa || '') + '</strong>' +
            '<span style="color:#64748b;margin-left:8px;">' + (v.marca_modelo_versao || '') + '</span>' +
            '</div>';
    }).join('');
    dd.style.display = 'block';
};

window._sinSelecionarVeiculo = function(id) {
    var v = (window._sinListaVeiculos || []).find(function(x) { return x.id === id; });
    var dd = document.getElementById('sin-veiculo-dropdown');
    var inp = document.getElementById('sin-placa-search');
    if (dd) dd.style.display = 'none';
    if (!v) return;
    if (inp) inp.value = (v.placa || '') + (v.marca_modelo_versao ? ' — ' + v.marca_modelo_versao : '');
    window._sinVeiculoSelecionado = v;
    window._sinPreencherDadosVeiculo();
};

window._sinPreencherDadosVeiculo = function() {
    var v = window._sinVeiculoSelecionado;
    var pares = [
        { section: 'sin-veiculo-dados-step1',   rows: 'sin-veiculo-dados-step1-rows' },
        { section: 'sin-dados-veiculo-section',  rows: 'sin-dados-veiculo-rows' }
    ];
    if (!v) {
        pares.forEach(function(p) { var s = document.getElementById(p.section); if (s) s.style.display='none'; });
        return;
    }
    var dados = [];
    if (v.placa)              dados.push({ label: 'Placa',          value: v.placa });
    if (v.marca_modelo_versao)dados.push({ label: 'Modelo',         value: v.marca_modelo_versao });
    if (v.ano_modelo)         dados.push({ label: 'Ano Modelo',     value: v.ano_modelo });
    if (v.ano_fabricacao)     dados.push({ label: 'Ano Fabricação', value: v.ano_fabricacao });
    if (v.renavam)            dados.push({ label: 'Renavam',        value: v.renavam });
    if (v.cor_predominante)   dados.push({ label: 'Cor',            value: v.cor_predominante });
    var html = dados.map(function(d) { return window._sinLinhaCopiavel(d.label, d.value, 'veiculo'); }).join('');
    pares.forEach(function(p) {
        var section = document.getElementById(p.section);
        var rows    = document.getElementById(p.rows);
        if (section && rows) { rows.innerHTML = html; section.style.display = 'block'; }
    });
};

window.toggleSinistroDesconto = function(show) {
    document.getElementById('area-sinistro-desconto').style.display = show ? 'block' : 'none';
};

window.processarLeituraBO = async function() {
    const fileInput = document.getElementById('sinistro-file-bo');
    if (!fileInput || !fileInput.files.length) return alert('Selecione o arquivo do BO.');

    const formData = new FormData();
    formData.append('arquivo', fileInput.files[0]);

    const btn = document.querySelector('#sin-btn-finalizar') ||
                document.querySelector('#sinistro-step-2 button.btn-secondary');
    const oldText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Lendo...'; btn.disabled = true; }

    let boletimData = {};
    try {
        const res = await fetch(`${API_URL}/extrair-bo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
            body: formData
        });
        if (res.status === 401 || res.status === 403) { alert('Sessão expirada. Faça login novamente.'); location.reload(); return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro interno.');
        if (data._debug_text) { console.log('[DIAGNÓSTICO BO]', data); }
        boletimData = data;
    } catch(e) {
        console.warn('Leitura BO falhou, modo manual:', e.message);
    } finally {
        if (btn) { btn.innerHTML = oldText; btn.disabled = false; }

        // Preenche campos
        var fbo  = document.getElementById('sin-bo');      if (fbo)  fbo.value  = boletimData.boletim    || fbo.value  || '';
        var fdt  = document.getElementById('sin-data');    if (fdt)  fdt.value  = boletimData.data_hora  || fdt.value  || '';
        var fnat = document.getElementById('sin-natureza');if (fnat) fnat.value = boletimData.natureza   || fnat.value || '';
        var fvei = document.getElementById('sin-veiculo'); if (fvei) fvei.value = boletimData.marca_modelo|| fvei.value|| '';
        var fpla = document.getElementById('sin-placa');   if (fpla) fpla.value = boletimData.placa      || fpla.value || '';

        const temDados = boletimData.boletim || boletimData.natureza || boletimData.placa || boletimData.marca_modelo;
        const notifEl = document.getElementById('sin-bo-notif');
        if (notifEl) {
            notifEl.style.display = 'block';
            if (temDados) {
                notifEl.innerHTML = '<i class="ph ph-check-circle"></i> Dados extraídos. Confira ou edite se necessário.';
                notifEl.style.cssText = 'display:block;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;border-radius:8px;padding:0.5rem 0.75rem;margin-bottom:1rem;font-size:0.85rem;';
            } else {
                notifEl.innerHTML = '<i class="ph ph-warning"></i> Preenchimento automático não disponível. Preencha manualmente.';
                notifEl.style.cssText = 'display:block;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:8px;padding:0.5rem 0.75rem;margin-bottom:1rem;font-size:0.85rem;';
            }
        }
    }
};

// STEP 1: Salva sinistro com status 'Iniciado'
window.salvarSinistroIniciado = async function() {
    const colab = typeof viewedColaborador !== 'undefined' ? viewedColaborador : null;
    if (!colab) return alert('Colaborador não identificado.');

    const btn = document.getElementById('sin-btn-iniciar');
    const oldText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; btn.disabled = true; }

    try {
        const formData = new FormData();
        formData.append('status', 'iniciado');
        const proto = document.getElementById('sin-protocolo');
        if (proto && proto.value) formData.append('numero_boletim', proto.value);
        if (window._sinVeiculoSelecionado) {
            formData.append('placa', window._sinVeiculoSelecionado.placa || '');
            formData.append('veiculo', window._sinVeiculoSelecionado.marca_modelo_versao || '');
        }

        const res = await fetch(`${API_URL}/colaboradores/${colab.id}/sinistros`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');

        window._sinistroAtualId = data.id;
        window._sinistroAtualColabId = colab.id;

        // Transitar para Step 2
        document.getElementById('sinistro-step-1').style.display = 'none';
        document.getElementById('sinistro-step-2').style.display = 'block';
        const notif = document.getElementById('sin-bo-notif');
        if (notif) {
            notif.innerHTML = '<i class="ph ph-check-circle"></i> Sinistro criado com <strong>Status: Iniciado</strong>. Agora anexe o BO e complete as informações abaixo (opcional).';
            notif.style.cssText = 'display:block;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:8px;padding:0.6rem 0.85rem;margin-bottom:1rem;font-size:0.85rem;';
        }
        // Preencher campos do veículo nos campos de Step 2
        if (window._sinVeiculoSelecionado) {
            var fv = document.getElementById('sin-veiculo'); if (fv) fv.value = window._sinVeiculoSelecionado.marca_modelo_versao || '';
            var fp = document.getElementById('sin-placa');   if (fp) fp.value = window._sinVeiculoSelecionado.placa || '';
        }
        // Atualizar lista de sinistros em background
        if (typeof window._recarregarListaSinistros === 'function') window._recarregarListaSinistros(colab.id);

    } catch(e) {
        alert('Erro ao salvar: ' + e.message);
    } finally {
        if (btn) { btn.innerHTML = oldText; btn.disabled = false; }
    }
};

// STEP 2: Finaliza sinistro (PATCH sobre o registro Iniciado)
window.finalizarSinistro = async function() {
    const sinId   = window._sinistroAtualId;
    const colabId = window._sinistroAtualColabId;
    const colab   = typeof viewedColaborador !== 'undefined' ? viewedColaborador : null;
    const cId     = colabId || (colab ? colab.id : null);
    if (!sinId || !cId) return alert('Sinistro não identificado. Salve o Passo 1 primeiro.');

    const btn = document.getElementById('sin-btn-finalizar');
    const oldText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; btn.disabled = true; }

    try {
        const formData = new FormData();
        formData.append('status', 'pendente');

        const fbo  = document.getElementById('sin-bo');       if (fbo && fbo.value)  formData.append('numero_boletim', fbo.value);
        const fdt  = document.getElementById('sin-data');     if (fdt && fdt.value)  formData.append('data_hora', fdt.value);
        const fnat = document.getElementById('sin-natureza'); if (fnat && fnat.value) formData.append('natureza', fnat.value);
        const fvei = document.getElementById('sin-veiculo');  if (fvei && fvei.value) formData.append('veiculo', fvei.value);
        const fpla = document.getElementById('sin-placa');    if (fpla && fpla.value) formData.append('placa', fpla.value);

        const descRad = document.querySelector('input[name="sin-desconto"]:checked');
        const desconto = descRad ? descRad.value : 'Não';
        formData.append('desconto', desconto);
        if (desconto === 'Sim') {
            const tipo = document.getElementById('sin-tipo-sinistro');  if (tipo)  formData.append('tipo_sinistro', tipo.value);
            const parc = document.getElementById('sin-parcelas');       if (parc)  formData.append('parcelas', parc.value);
            const vtot = document.getElementById('sin-valor-total');    if (vtot)  formData.append('valor_total', vtot.value);
            formData.append('valor_parcela', parc ? (parc.dataset.valor_parcela || '0,00') : '0,00');
            const orcRad = document.querySelector('input[name="sin-orcamento"]:checked');
            if (orcRad && orcRad.value === 'Sim' && (window._sinOrcFiles || []).length) {
                const orcsBase64 = [];
                for (const f of window._sinOrcFiles) {
                    const b64 = await new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(f); });
                    orcsBase64.push(b64);
                }
                formData.append('orcamentos_base64', JSON.stringify(orcsBase64));
            }
        }

        // Arquivo BO
        const boFile = document.getElementById('sinistro-file-bo');
        if (boFile && boFile.files.length) formData.append('arquivo', boFile.files[0]);

        const res = await fetch(`${API_URL}/colaboradores/${cId}/sinistros/${sinId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao finalizar.');

        // Gerar documento se houver desconto
        if (desconto === 'Sim') {
            await fetch(`${API_URL}/colaboradores/${cId}/sinistros/${sinId}/gerar-documento`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
            });
        }

        // Upload de mídias
        const filesMidia = window._sinMidiasFiles || [];
        if (filesMidia.length > 0) {
            if (btn) btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando Mídias...';
            for (let i = 0; i < filesMidia.length; i++) {
                if (btn) btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Mídias (${i+1}/${filesMidia.length})...`;
                const mfData = new FormData();
                mfData.append('file', filesMidia[i]);
                try {
                    const rM = await fetch(`${API_URL}/sinistros/${sinId}/midia`, {
                        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }, body: mfData
                    });
                    if (!rM.ok) { const e = await rM.json(); console.error('Erro mídia:', e); }
                } catch(e) { console.error('Falha mídia:', e); }
            }
        }

        document.getElementById('modal-novo-sinistro').style.display = 'none';
        if (typeof Toastify !== 'undefined') Toastify({ text: 'Sinistro finalizado com sucesso!', backgroundColor: '#059669' }).showToast();
        if (typeof window._recarregarListaSinistros === 'function') await window._recarregarListaSinistros(cId);

    } catch(e) {
        alert('Erro ao finalizar: ' + e.message);
    } finally {
        if (btn) { btn.innerHTML = oldText; btn.disabled = false; }
    }
};

// Manter alias para compatibilidade
window.salvarSinistroFinal = window.finalizarSinistro;


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
        const showModal = (html) => {
        const modalBody = document.getElementById('preview-doc-body');
        if (!modalBody) return alert('Visualizador padrão não encontrado.');
        modalBody.innerHTML = html;
        document.getElementById('preview-doc-title').textContent = 'Visualização — Sinistro';
        const btns = document.getElementById('preview-doc-buttons');
        if (btns) {
            btns.innerHTML = `
                <button class="btn btn-primary" onclick="window.salvarDocumentoPDF()"><i class="ph ph-download-simple"></i> Salvar como PDF</button>
                <button class="btn btn-secondary" onclick="window.imprimirDocumento()"><i class="ph ph-printer"></i> Imprimir</button>
                <button class="btn btn-secondary" onclick="document.getElementById('modal-preview-doc').style.display='none'"><i class="ph ph-x"></i> Fechar</button>`;
        }
        document.getElementById('modal-preview-doc').style.display = 'block';
        
        // Trigger PDF.js render for the attached BO if it exists
        setTimeout(() => {
            if (typeof window._renderSinPdfs === 'function') {
                window._renderSinPdfs(modalBody);
            }
        }, 200);
    };

    // Para documentos já assinados: usa o HTML salvo (evita regeneração pesada que causa OOM no servidor)
    // Adiciona os orçamentos como links separados ao final, sem precisar baixar imagens
    try {
        const sinistros = await apiGet(`/colaboradores/${colabId}/sinistros`);
        const sin = sinistros ? sinistros.find(x => x.id == sinId) : null;
        if (sin && sin.status === 'assinado' && sin.documento_html) {
            let htmlExibir = sin.documento_html;

            // Injetar links de orçamentos ao final, se existirem e não estiverem no HTML
            if (sin.orcamentos_paths && !htmlExibir.includes('Orçamento')) {
                try {
                    const orcs = JSON.parse(sin.orcamentos_paths || '[]');
                    if (orcs.length > 0) {
                        const orcsLinksHtml = `
                        <div style="page-break-before:always; padding:2rem 2.5rem;">
                            <h3 style="font-size:1rem; font-weight:700; color:#1e293b; border-bottom:2px solid #334155; padding-bottom:0.6rem; margin-bottom:1.5rem; text-align:center;">
                                📎 Orçamentos Anexados
                            </h3>
                            ${orcs.map((p, i) => `
                            <div style="margin-bottom:0.75rem; padding:0.75rem 1rem; border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc; display:flex; align-items:center; gap:10px;">
                                <i class="ph ph-image" style="font-size:1.2rem; color:#0369a1;"></i>
                                <a href="javascript:void(0)" onclick="window.abrirArquivoOneDrive('${p}')"
                                   style="color:#0369a1; font-weight:600; font-size:0.9rem; text-decoration:none;">
                                    Orçamento ${i + 1}
                                </a>
                            </div>`).join('')}
                        </div>`;
                        if (htmlExibir.includes('</body>')) {
                            htmlExibir = htmlExibir.replace('</body>', orcsLinksHtml + '</body>');
                        } else {
                            htmlExibir += orcsLinksHtml;
                        }
                    }
                } catch(e) { /* ignore */ }
            }

            showModal(htmlExibir);
            return;
        }
    } catch(e) { /* continua para regerar */ }

    // Documentos pendentes: regera para mostrar orçamentos e dados atuais
    const rGen = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/gerar-documento`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
    });
    if (!rGen.ok) {
        const errData = await rGen.json().catch(() => ({}));
        return alert('Erro ao gerar documento: ' + (errData.error || rGen.status));
    }
    const genData = await rGen.json();
    showModal(genData.html);
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
                <div style="width:580px;background:#fff;overflow-y:auto;padding:1.5rem 1.5rem 6rem;display:flex;flex-direction:column;gap:1.25rem;border-left:1px solid #e2e8f0;flex-shrink:0;">
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
        if (typeof window._renderSinPdfs === 'function') window._renderSinPdfs(document.getElementById('sin-doc-container'));
    }, 200);
};

// =========================================================
// CANVAS DE ASSINATURA - implementação própria// =====================================================================
// PDF.js client-side renderer para anexos de PDF nos sinistros
// =====================================================================
(function() {
    var PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/';
    var DEFAULT_VER = '2.16.105';
    var _loading = false;

    function getVersion() {
        // Detecta versão já carregada; se não tiver, usa o default
        return (typeof pdfjsLib !== 'undefined' && pdfjsLib.version) ? pdfjsLib.version : DEFAULT_VER;
    }
    function getWorkerUrl() {
        return PDFJS_BASE + getVersion() + '/pdf.worker.min.js';
    }
    function getCdnUrl() {
        // Carrega a mesma versão que já está na página se disponível, senão DEFAULT_VER
        return PDFJS_BASE + getVersion() + '/pdf.min.js';
    }

    window._renderSinPdfs = async function(rootEl) {
        var root = rootEl || document;
        var containers = root.querySelectorAll('.sin-pdf-render[data-pdf-b64]:not([data-rendered])');
        if (!containers.length) return;

        // Carrega PDF.js se ainda não está disponível
        if (typeof pdfjsLib === 'undefined') {
            if (_loading) { setTimeout(() => window._renderSinPdfs(rootEl), 500); return; }
            _loading = true;
            await new Promise((res, rej) => {
                var sc = document.createElement('script');
                sc.src = getCdnUrl();
                sc.onload = () => { _loading = false; pdfjsLib.GlobalWorkerOptions.workerSrc = getWorkerUrl(); res(); };
                sc.onerror = rej;
                document.head.appendChild(sc);
            });
        }
        // Sempre usa o worker compatível com a versão carregada na página
        pdfjsLib.GlobalWorkerOptions.workerSrc = getWorkerUrl();

        for (var i = 0; i < containers.length; i++) {
            var c = containers[i];
            var b64 = c.getAttribute('data-pdf-b64');
            if (!b64) continue;
            c.setAttribute('data-rendered', '1');
            var wrap = c.querySelector('.sin-pdf-pages');
            if (wrap) wrap.innerHTML = '';
            try {
                var raw = atob(b64), arr = new Uint8Array(raw.length);
                for (var j = 0; j < raw.length; j++) arr[j] = raw.charCodeAt(j);
                var pdf = await pdfjsLib.getDocument({data: arr}).promise;
                for (var p = 1; p <= pdf.numPages; p++) {
                    var pg = await pdf.getPage(p);
                    var vp = pg.getViewport({scale: 1.5});
                    var ca = document.createElement('canvas');
                    ca.className = 'sin-pdf-canvas';
                    ca.width = vp.width; ca.height = vp.height;
                    ca.style.cssText = 'width:100%;display:block;' + (p > 1 ? 'margin-top:4px;page-break-before:always;' : '');
                    (wrap || c).appendChild(ca);
                    await pg.render({canvasContext: ca.getContext('2d'), viewport: vp}).promise;
                }
            } catch(e) {
                console.warn('[PDF.js render]', e);
                if (wrap) wrap.innerHTML = '<p style="color:#c00;text-align:center;padding:1rem;">Erro ao renderizar PDF: ' + e.message + '</p>';
            }
        }
    };
})();

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
            body: JSON.stringify({ t1_nome: t1Nome, t1_base64: t1Ass, t2_nome: t2Nome || null, t2_base64: t2Ass, html_atualizado: _sinStripBase64(docHtml), finalizar_sem_condutor: finalizarSemCondutor })
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
            body: JSON.stringify({ assinatura_base64: assinaturaBase64, documento_html: _sinStripBase64(docHtml) })
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
    
    const senha = prompt('Para excluir o sinistro, digite a senha de autorização:');
    if (senha !== 'EXL2499!') {
        return alert('Senha incorreta. Exclusão cancelada.');
    }

    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('erp_token')}`,
                'X-Delete-Password': senha
            }
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


// =====================================================
// GERENCIADOR DE MIDIAS - drag-and-drop + multi-select
// =====================================================
window._sinMidiasFiles = [];

window._sinAdicionarMidias = function(fileList) {
    if (!fileList || !fileList.length) return;
    Array.from(fileList).forEach(function(f) {
        var jaExiste = window._sinMidiasFiles.some(function(x) { return x.name === f.name && x.size === f.size; });
        if (!jaExiste) window._sinMidiasFiles.push(f);
    });
    window._sinAtualizarPreviewMidias();
};

window._sinRemoverMidia = function(idx) {
    window._sinMidiasFiles.splice(idx, 1);
    window._sinAtualizarPreviewMidias();
};

window._sinAtualizarPreviewMidias = function() {
    var previewEl = document.getElementById('sin-midias-preview');
    var countEl   = document.getElementById('sin-midias-count');
    if (!previewEl) return;
    var files = window._sinMidiasFiles;
    if (!files.length) {
        previewEl.style.display = 'none';
        if (countEl) countEl.style.display = 'none';
        return;
    }
    previewEl.style.display = 'flex';
    previewEl.innerHTML = '';
    if (countEl) {
        var nFotos  = files.filter(function(f){ return f.type.startsWith('image/'); }).length;
        var nVideos = files.filter(function(f){ return f.type.startsWith('video/'); }).length;
        var partes = [];
        if (nFotos)  partes.push(nFotos  + ' foto'  + (nFotos  > 1 ? 's' : ''));
        if (nVideos) partes.push(nVideos + ' video' + (nVideos > 1 ? 's' : ''));
        countEl.textContent = 'Selecionado: ' + partes.join(' e ');
        countEl.style.display = 'block';
    }
    files.forEach(function(f, idx) {
        var card = document.createElement('div');
        card.title = f.name;
        card.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:2px solid #bae6fd;background:#f0f9ff;flex-shrink:0;';
        if (f.type.startsWith('image/')) {
            var img = document.createElement('img');
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            var reader = new FileReader();
            reader.onload = function(ev) { img.src = ev.target.result; };
            reader.readAsDataURL(f);
            card.appendChild(img);
        } else {
            var icon = document.createElement('div');
            icon.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1e293b;';
            icon.innerHTML = '<i class="ph ph-video" style="font-size:1.6rem;color:#60a5fa;"></i><span style="font-size:0.55rem;color:#94a3b8;margin-top:2px;padding:0 4px;overflow:hidden;word-break:break-all;">' + f.name.slice(0,14) + '</span>';
            card.appendChild(icon);
        }
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = '&times;';
        btn.style.cssText = 'position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(239,68,68,0.9);color:#fff;font-size:0.8rem;cursor:pointer;padding:0;';
        btn.setAttribute('onclick', 'window._sinRemoverMidia(' + idx + ')');
        card.appendChild(btn);
        previewEl.appendChild(card);
    });
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
            
            <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0;">
                <input type="checkbox" id="fs1-nao-gera-cobranca" onchange="window._fs1ToggleCobranca(this.checked)" style="width:16px;height:16px;cursor:pointer;accent-color:#059669;">
                <label for="fs1-nao-gera-cobranca" style="font-size:0.85rem;font-weight:700;color:#059669;cursor:pointer;">Não gera cobrança ao colaborador</label>
            </div>

            <div id="fs1-cobranca-area" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                <div>
                    <label style="font-size:0.85rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Valor Total do Desconto (R$) *</label>
                    <input type="text" id="fs1-valor" class="form-control" value="${s.valor_total||''}" placeholder="Ex: 1.200,00" oninput="window._fs1Calc()">
                </div>
                <div>
                    <label style="font-size:0.85rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Parcelas *</label>
                    <select id="fs1-parcelas" class="form-control" onchange="window._fs1Calc()">${parcOpts}</select>
                </div>
            </div>
            <div id="fs1-cobranca-resumo" style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:0.75rem;text-align:center;">
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

window._fs1ToggleCobranca = function(isChecked) {
    const area = document.getElementById('fs1-cobranca-area');
    const resumo = document.getElementById('fs1-cobranca-resumo');
    const valorInput = document.getElementById('fs1-valor');
    if (isChecked) {
        area.style.display = 'none';
        resumo.style.display = 'none';
        valorInput.value = '0,00';
    } else {
        area.style.display = 'grid';
        resumo.style.display = 'block';
        if(valorInput.value === '0,00') valorInput.value = '';
    }
    window._fs1Calc();
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
    const isIsento = document.getElementById('fs1-nao-gera-cobranca')?.checked;

    if (!tipo) return alert('Selecione o Tipo do Sinistro.');
    
    const valorRaw = parseFloat(valorStr.replace(/[^0-9,]/g,'').replace(',','.')) || 0;
    if (!isIsento && valorRaw <= 0) return alert('Informe o valor do desconto (maior que zero).');
    
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
    // IMPORTANTE: salva o docHtml para uso no _finSalvarTestemunhas e _finFinalizar
    window._finalizarSinistroDocHtml = docHtml;
    modal.innerHTML = `
        <div style="width:100%;height:100vh;display:flex;flex-direction:column;background:#0f172a;overflow:hidden;">`;
    document.body.appendChild(modal);
    // Injeta o HTML interno separadamente para evitar problemas com template literals grandes
    modal.querySelector('div').innerHTML = `
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
                    <div id="fin-doc-preview" style="background:white;margin:0 auto;width:21cm;min-height:29.7cm;padding:0;box-shadow:0 4px 24px rgba(0,0,0,0.18);border:1px solid #ddd;overflow:hidden;">
                    </div>
                </div>
                <div style="width:380px;flex-shrink:0;background:#1e293b;overflow-y:auto;display:flex;flex-direction:column;border-left:1px solid rgba(255,255,255,0.08);">
                    <div id="fin-painel-testemunhas" style="padding:1.25rem;display:flex;flex-direction:column;gap:1rem;">
                        <p style="color:#94a3b8;font-size:0.75rem;font-weight:700;text-transform:uppercase;margin:0;">✍️ Assinaturas das Testemunhas</p>
                        <div style="background:#0f172a;border-radius:10px;padding:1rem;">
                            <label style="color:#94a3b8;font-size:0.75rem;display:block;margin-bottom:4px;">Testemunha 1 *</label>
                            <select id="fin-t1-nome" class="form-control" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155;margin-bottom:6px;width:100%;"><option value="">Selecione...</option></select>
                            <p style="color:#64748b;font-size:0.7rem;margin:0 0 4px;">Assinatura da Testemunha 1:</p>
                            <div style="border:1px dashed #475569;border-radius:6px;background:#fff;overflow:hidden;">
                                <canvas id="fin-canvas-t1" style="width:100%;height:180px;cursor:crosshair;display:block;" height="180"></canvas>
                            </div>
                            <button onclick="window._sinLimparCanvas('fin-canvas-t1')" style="margin-top:4px;background:transparent;border:1px solid #475569;color:#94a3b8;border-radius:6px;padding:3px 10px;font-size:0.75rem;cursor:pointer;"><i class="ph ph-eraser"></i> Limpar</button>
                        </div>
                        <div style="background:#0f172a;border-radius:10px;padding:1rem;">
                            <label style="color:#94a3b8;font-size:0.75rem;display:block;margin-bottom:4px;">Testemunha 2 <span style="color:#475569;">(opcional)</span></label>
                            <select id="fin-t2-nome" class="form-control" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155;margin-bottom:6px;width:100%;"><option value="">Selecione...</option></select>
                            <p style="color:#64748b;font-size:0.7rem;margin:0 0 4px;">Assinatura da Testemunha 2:</p>
                            <div style="border:1px dashed #475569;border-radius:6px;background:#fff;overflow:hidden;">
                                <canvas id="fin-canvas-t2" style="width:100%;height:180px;cursor:crosshair;display:block;" height="180"></canvas>
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
                            <p style="color:#64748b;font-size:0.7rem;margin:0 0 4px;">Assinatura do Condutor/Colaborador:</p>
                            <div style="border:1px dashed #475569;border-radius:6px;background:#fff;overflow:hidden;">
                                <canvas id="fin-canvas-condutor" style="width:100%;height:200px;cursor:crosshair;display:block;" height="200"></canvas>
                            </div>
                            <button onclick="window._sinLimparCanvasFinalizar()" style="margin-top:4px;background:transparent;border:1px solid #475569;color:#94a3b8;border-radius:6px;padding:3px 10px;font-size:0.75rem;cursor:pointer;"><i class="ph ph-eraser"></i> Limpar</button>
                        </div>
                        <button id="btn-fin-condutor" onclick="window._finFinalizar(${sinId},${colabId},true)" style="padding:0.9rem;background:#059669;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;"><i class="ph ph-check-circle"></i> Confirmar e Finalizar Sinistro</button>
                    </div>
                </div>
            </div>`;

    // Popula o preview e inicia o PDF.js
    const previewEl = modal.querySelector('#fin-doc-preview');
    if (previewEl) previewEl.innerHTML = docHtml;
    document.body.appendChild(modal);
    // Chama PDF.js para renderizar os anexos
    setTimeout(() => window._renderSinPdfs(modal), 200);
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

// Helper: converte canvases de PDFs renderizados em <img> PNG no HTML salvo
window._flattenDocHtmlPdfCanvases = function(docHtml) {
    // Cria um div oculto com o HTML, converte os canvases do preview real (já renderizados pelo PDF.js)
    // e injeta como <img> no HTML que vai para o servidor
    const previewDiv = document.getElementById('fin-doc-preview');
    if (!previewDiv) return docHtml; // sem preview, retorna original
    const liveCanvases = previewDiv.querySelectorAll('canvas.sin-pdf-canvas');
    if (!liveCanvases.length) return docHtml; // sem canvases PDF, retorna original
    // Substitui cada canvas no HTML por um <img> com o conteúdo da canvas
    let flatHtml = docHtml;
    liveCanvases.forEach((canvas, idx) => {
        const imgSrc = canvas.toDataURL('image/jpeg', 0.85); // JPEG mais compacto que PNG
        // Substitui a canvas correspondente (por ordem de aparição) por img
        flatHtml = flatHtml.replace(
            /<canvas class="sin-pdf-canvas"[^>]*><\/canvas>/i,
            `<img src="${imgSrc}" style="width:100%;display:block;" />`
        );
    });
    // Remove atributos data-pdf-b64 enormes (já renderizados)
    flatHtml = flatHtml.replace(/\sdata-pdf-b64="[^"]*"/g, ' data-pdf-rendered="true"');
    return flatHtml;
};

window._finSalvarTestemunhas = async function(sinId, colabId, finalizarSemCondutor) {
    const t1Nome = document.getElementById('fin-t1-nome').value;
    if (!t1Nome) return alert('Selecione pelo menos a Testemunha 1.');
    if (!window._sinCanvasTemConteudo('fin-canvas-t1')) return alert('A Testemunha 1 precisa assinar.');
    const t1Ass = document.getElementById('fin-canvas-t1').toDataURL('image/png');
    const t2Nome = document.getElementById('fin-t2-nome')?.value || '';
    const t2Ass = window._sinCanvasTemConteudo('fin-canvas-t2') ? document.getElementById('fin-canvas-t2').toDataURL('image/png') : null;
    let docHtml = window._finalizarSinistroDocHtml || '';
    // Tenta usar o HTML do preview ao vivo (inclui canvases já renderizados pelo PDF.js)
    const previewDiv = document.getElementById('fin-doc-preview');
    if (previewDiv) docHtml = previewDiv.innerHTML;
    // Flatten canvases PDF → img (para integridade do documento salvo)
    docHtml = window._flattenDocHtmlPdfCanvases(docHtml);
    const injectTest = `<div style="margin-top:20px;padding:12px 10px;border-top:2px solid #e2e8f0;">
        <p style="font-weight:700;font-size:12px;margin-bottom:10px;">ASSINATURAS DAS TESTEMUNHAS:</p>
        <div style="display:flex;gap:30px;flex-wrap:wrap;">
            <div style="text-align:center;">
                <p style="font-size:10px;color:#666;margin:0 0 2px;">Assinatura da Testemunha 1</p>
                <img src="${t1Ass}" style="width:220px;height:90px;object-fit:contain;border-bottom:1px solid #000;display:block;">
                <p style="font-size:11px;font-weight:600;margin:3px 0;">${t1Nome}</p>
            </div>
            ${t2Ass&&t2Nome?`<div style="text-align:center;">
                <p style="font-size:10px;color:#666;margin:0 0 2px;">Assinatura da Testemunha 2</p>
                <img src="${t2Ass}" style="width:220px;height:90px;object-fit:contain;border-bottom:1px solid #000;display:block;">
                <p style="font-size:11px;font-weight:600;margin:3px 0;">${t2Nome}</p>
            </div>`:''}
        </div>
    </div>`;
    docHtml = docHtml.includes('</body>') ? docHtml.replace('</body>', injectTest + '</body>') : docHtml + injectTest;
    window._finalizarSinistroDocHtml = docHtml;
    const btn = document.getElementById('btn-fin-testemunhas');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }
    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/assinar-testemunhas`, {
            method: 'POST',
            headers: {'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('erp_token')}`},
            body: JSON.stringify({t1_nome:t1Nome, t1_base64:t1Ass, t2_nome:t2Nome||null, t2_base64:t2Ass, html_atualizado:_sinStripBase64(docHtml), finalizar_sem_condutor:finalizarSemCondutor})
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
    // USA _finalizarSinistroDocHtml — já contém as assinaturas das testemunhas injetadas
    // NÃO lê do previewDiv.innerHTML pois ele mostra o documento original (sem sigs das testemunhas no DOM)
    let docHtml = window._finalizarSinistroDocHtml || '';
    let assinaturaBase64 = null;
    if (comCondutor) {
        if (!window._sinCanvasTemConteudo('fin-canvas-condutor')) return alert('O colaborador precisa assinar.');
        assinaturaBase64 = document.getElementById('fin-canvas-condutor').toDataURL('image/png');
        const inj = `<div style="margin-top:20px;padding:12px 10px;border-top:2px solid #e2e8f0;">
            <p style="font-weight:700;font-size:12px;margin-bottom:10px;">ASSINATURA DO CONDUTOR:</p>
            <div style="text-align:center;display:inline-block;">
                <p style="font-size:10px;color:#666;margin:0 0 2px;">Assinatura do Condutor/Colaborador</p>
                <img src="${assinaturaBase64}" style="width:220px;height:90px;object-fit:contain;border-bottom:1px solid #000;display:block;">
                <p style="font-size:11px;font-weight:600;margin:3px 0;">${colabName}</p>
            </div>
        </div>`;
        // Injeta no HTML — sem </body> quando vem de innerHTML
        docHtml = docHtml.includes('</body>') ? docHtml.replace('</body>', inj + '</body>') : docHtml + inj;
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


// =============================================================
// MODAL DE EDIÇÃO DE SINISTRO — prontuário RH
// Edita dados básicos, fotos/vídeos e orçamentos antes das assinaturas
// =============================================================
window._rhEdit = {
    sinId: null,
    colabId: null,
    orcFiles: [],
    midiaFiles: [],
    midiasExistentes: [],   // { url, nome, tipo, idx }
    boFile: null
};

window.rhSinAbrirModalEditar = async function(sinId, colabId) {
    window._rhEdit.sinId    = sinId;
    window._rhEdit.colabId  = colabId;
    window._rhEdit.orcFiles  = [];
    window._rhEdit.midiaFiles = [];
    window._rhEdit.boFile = null;

    // Buscar sinistro atualizado
    let sinistro = null;
    try {
        const lista = await apiGet(`/colaboradores/${colabId}/sinistros`);
        sinistro = (lista || []).find(s => s.id == sinId);
    } catch(e) { return alert('Erro ao carregar sinistro.'); }
    if (!sinistro) return alert('Sinistro não encontrado.');
    if (sinistro.status !== 'pendente' && sinistro.status !== 'iniciado') {
        return alert('Este sinistro já possui assinaturas e não pode ser editado.');
    }

    // Mídias existentes
    let mids = [];
    try { mids = JSON.parse(sinistro.midias_paths || '[]'); } catch(e) {}
    window._rhEdit.midiasExistentes = mids.map((m, i) => ({
        url: typeof m === 'string' ? m : m.url,
        nome: m.nome || '',
        tipo: m.tipo || '',
        idx: i
    }));

    // Orçamentos existentes
    let orcs = [];
    try { orcs = JSON.parse(sinistro.orcamentos_paths || '[]'); } catch(e) {}

    // Criar/resetar modal
    let modal = document.getElementById('modal-rh-sin-editar');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-rh-sin-editar';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width:100vw; width:100vw; height:100vh; max-height:100vh; margin:0; border-radius:0; display:flex; flex-direction:column; overflow:hidden;">
            <div class="modal-header" style="background:linear-gradient(135deg,#0f172a,#1e293b); z-index:10; flex-shrink:0;">
                <h3 style="color:#fff; margin:0; display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-pencil-simple" style="color:#fbbf24;"></i> Editar Sinistro #${sinId}
                    <span style="font-size:0.72rem; background:#fbbf24; color:#1e293b; border-radius:12px; padding:2px 10px; font-weight:700; margin-left:4px;">PENDENTE</span>
                </h3>
                <button onclick="document.getElementById('modal-rh-sin-editar').style.display='none'" class="btn-close" style="background:rgba(255,255,255,0.15); color:#fff;">
                    <i class="ph ph-x"></i>
                </button>
            </div>
            <div class="modal-body" style="display:flex; flex-direction:column; gap:1rem; flex:1; overflow-y:auto; padding:1.5rem;">

                <div style="background:#fef9c3; border:1px solid #fde047; border-radius:8px; padding:0.6rem 0.85rem; font-size:0.82rem; color:#713f12; display:flex; align-items:center; gap:6px;">
                    <i class="ph ph-lock-open"></i>
                    Edição disponível apenas antes das assinaturas. Após assinar, não é mais possível alterar.
                </div>

                <div id="rh-edit-sin-msg" style="display:none; margin-top:0.5rem;"></div>
                
                <div class="input-group" style="background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0; margin-top:0.5rem; margin-bottom:0.25rem;">
                    <label style="color:#0f172a; margin-bottom:6px;"><i class="ph ph-file-pdf" style="color:#dc2626;"></i> Boletim de Ocorrência (PDF) - <span style="color:#64748b;font-weight:normal;">Opcional (Extrair Dados)</span></label>
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <input type="file" id="rh-edit-file-bo" accept="application/pdf" class="form-control" style="flex:1;">
                        <button type="button" class="btn btn-secondary" onclick="window.rhSinEditProcessarLeituraBO(this)" style="white-space:nowrap;font-size:0.82rem;padding:0.45rem 0.8rem;">
                            <i class="ph ph-scan"></i> Analisar BO
                        </button>
                    </div>
                </div>

                <!-- DADOS BÁSICOS -->
                <div>
                    <p style="font-weight:700; font-size:0.85rem; color:#1e293b; margin:0 0 8px; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-file-text" style="color:#d97706;"></i> Dados do Boletim
                    </p>
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
                        <div class="input-group">
                            <label>Boletim Nº</label>
                            <input type="text" id="rh-edit-bo" class="form-control" value="${sinistro.numero_boletim || ''}">
                        </div>
                        <div class="input-group">
                            <label>Data e Hora da Ocorrência</label>
                            <input type="text" id="rh-edit-data" class="form-control" value="${sinistro.data_hora || ''}">
                        </div>
                        <div class="input-group">
                            <label>Natureza da Ocorrência</label>
                            <input type="text" id="rh-edit-natureza" class="form-control" value="${(sinistro.natureza || '').replace(/Crime\s+Consumado[^\-]*\-?\s*/gi, '').trim()}">
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                        <div class="input-group">
                            <label>Marca/Modelo</label>
                            <input type="text" id="rh-edit-veiculo" class="form-control" value="${sinistro.veiculo || ''}">
                        </div>
                        <div class="input-group">
                            <label>Placa</label>
                            <input type="text" id="rh-edit-placa" class="form-control" value="${sinistro.placa || ''}">
                        </div>
                    </div>
                    <div class="input-group" style="margin-top:0.75rem;">
                        <label>Observações</label>
                        <textarea id="rh-edit-observacoes" class="form-control" rows="3" placeholder="Informações adicionais ou notas importantes...">${sinistro.observacoes || ''}</textarea>
                    </div>
                </div>

                <hr style="border-color:#e2e8f0; margin:0;">

                <!-- FOTOS E VÍDEOS EXISTENTES -->
                <div>
                    <p style="font-weight:700; font-size:0.85rem; color:#1e293b; margin:0 0 8px; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-camera" style="color:#0369a1;"></i>
                        Fotos e Vídeos Anexados
                        <span id="rh-edit-midias-badge" style="background:#e0f2fe; color:#0369a1; border-radius:12px; padding:1px 8px; font-size:0.72rem; font-weight:700;">${mids.length}</span>
                    </p>
                    <div id="rh-edit-midias-grid" style="display:flex; flex-wrap:wrap; gap:8px; min-height:36px;"></div>
                </div>

                <!-- ADICIONAR MÍDIAS -->
                <div style="background:#f0f9ff; padding:0.85rem; border-radius:8px; border:1px solid #bae6fd;">
                    <p style="margin:0 0 8px; font-weight:600; font-size:0.85rem; color:#0369a1;"><i class="ph ph-upload-simple"></i> Adicionar fotos / vídeos</p>
                    <div style="border:2px dashed #7dd3fc; border-radius:10px; background:#e0f2fe; padding:1rem; text-align:center; cursor:pointer;"
                        onclick="document.getElementById('rh-edit-midia-file').click()"
                        ondragover="event.preventDefault(); this.style.background='#bae6fd';"
                        ondragleave="this.style.background='#e0f2fe';"
                        ondrop="event.preventDefault(); this.style.background='#e0f2fe'; window._rhEditAddMidias(event.dataTransfer.files);">
                        <i class="ph ph-upload-simple" style="font-size:1.8rem; color:#0ea5e9; display:block; margin-bottom:4px;"></i>
                        <p style="margin:0; font-weight:600; font-size:0.82rem; color:#0369a1;">Arraste fotos e vídeos aqui</p>
                        <p style="margin:2px 0 0; font-size:0.72rem; color:#38bdf8;">ou clique • múltiplos arquivos</p>
                        <input type="file" id="rh-edit-midia-file" multiple accept="image/*,video/*" style="display:none;"
                            onchange="window._rhEditAddMidias(this.files); this.value='';">
                    </div>
                    <div id="rh-edit-novas-midias-preview" style="display:none; margin-top:8px; flex-wrap:wrap; gap:8px;"></div>
                </div>

                <hr style="border-color:#e2e8f0; margin:0;">

                <!-- ORÇAMENTOS EXISTENTES -->
                ${orcs.length > 0 ? `
                <div>
                    <p style="font-weight:700; font-size:0.85rem; color:#374151; margin:0 0 6px;"><i class="ph ph-receipt"></i> Orçamentos já anexados (${orcs.length})</p>
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        ${orcs.map((p, i) => `
                        <a href="javascript:void(0)" onclick="window.abrirArquivoOneDrive('${p}')"
                            style="display:inline-flex; align-items:center; gap:4px; font-size:0.78rem; color:#0369a1; background:#e0f2fe; padding:4px 8px; border-radius:4px; text-decoration:none;">
                            <i class="ph ph-image"></i> Orç. ${i + 1}
                        </a>`).join('')}
                    </div>
                </div>` : ''}

                <!-- ADICIONAR ORÇAMENTOS -->
                <div style="background:#f8fafc; padding:0.85rem; border-radius:8px; border:1px solid #e2e8f0;">
                    <p style="margin:0 0 8px; font-weight:600; font-size:0.85rem;"><i class="ph ph-image"></i> Adicionar orçamentos (JPG/PNG)</p>
                    <div style="border:2px dashed #cbd5e1; border-radius:10px; background:#f1f5f9; padding:1rem; text-align:center; cursor:pointer;"
                        onclick="document.getElementById('rh-edit-orc-file').click()"
                        ondragover="event.preventDefault(); this.style.background='#e2e8f0';"
                        ondragleave="this.style.background='#f1f5f9';"
                        ondrop="event.preventDefault(); this.style.background='#f1f5f9'; window._rhEditAddOrcs(event.dataTransfer.files);">
                        <i class="ph ph-upload-simple" style="font-size:1.8rem; color:#94a3b8; display:block; margin-bottom:4px;"></i>
                        <p style="margin:0; font-size:0.82rem; font-weight:600; color:#475569;">Arraste imagens dos orçamentos</p>
                        <p style="margin:2px 0 0; font-size:0.72rem; color:#94a3b8;">ou clique • apenas JPG e PNG</p>
                        <input type="file" id="rh-edit-orc-file" multiple accept="image/jpeg,image/png,.jpg,.png" style="display:none;"
                            onchange="window._rhEditAddOrcs(this.files); this.value='';">
                    </div>
                    <div id="rh-edit-orcs-preview" style="display:none; margin-top:8px; flex-wrap:wrap; gap:8px;"></div>
                    <p id="rh-edit-orcs-count" style="margin:4px 0 0; font-size:0.75rem; color:#475569; display:none;"></p>
                </div>

                <div id="rh-edit-msg" style="display:none; padding:0.6rem 0.85rem; border-radius:8px; font-size:0.82rem;"></div>
            </div>

            <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:0.5rem; padding:1rem 1.25rem; border-top:1px solid #e2e8f0; background:#f8fafc; position:sticky; bottom:0; z-index:10;">
                <button onclick="document.getElementById('modal-rh-sin-editar').style.display='none'"
                    style="border:1px solid #e2e8f0; background:#fff; color:#374151; border-radius:8px; padding:0.5rem 1rem; font-size:0.85rem; font-weight:600; cursor:pointer;">
                    Cancelar
                </button>
                <button id="rh-edit-btn-salvar" onclick="window.rhSinSalvar()"
                    style="border:none; background:#059669; color:#fff; border-radius:8px; padding:0.5rem 1.25rem; font-size:0.85rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px;">
                    <i class="ph ph-floppy-disk"></i> Salvar Alterações
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    window._rhEditRenderMidias();
};

// Renderiza grade de mídias existentes com botão excluir
window._rhEditRenderMidias = function() {
    const grid  = document.getElementById('rh-edit-midias-grid');
    const badge = document.getElementById('rh-edit-midias-badge');
    if (!grid) return;
    const mids = window._rhEdit.midiasExistentes;
    if (badge) badge.textContent = mids.length;
    if (!mids.length) {
        grid.innerHTML = '<p style="font-size:0.8rem;color:#94a3b8;margin:0;">Nenhuma mídia anexada.</p>';
        return;
    }
    grid.innerHTML = '';
    mids.forEach((m, i) => {
        const isVideo = (m.tipo && m.tipo.startsWith('video/')) ||
            ['mp4','mov','avi','mkv','webm'].includes((m.url || '').split('.').pop().toLowerCase().split('?')[0]);
        const card = document.createElement('div');
        card.style.cssText = 'position:relative;width:88px;height:88px;border-radius:10px;overflow:hidden;border:2px solid #bae6fd;background:#f0f9ff;flex-shrink:0;';
        if (!isVideo) {
            const img = document.createElement('img');
            img.src = m.url;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            card.appendChild(img);
        } else {
            const ico = document.createElement('div');
            ico.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1e293b;';
            ico.innerHTML = `<i class="ph ph-video" style="font-size:2rem;color:#60a5fa;"></i><span style="font-size:0.55rem;color:#94a3b8;margin-top:4px;padding:0 4px;text-align:center;">${(m.nome||'Vídeo').slice(0,12)}</span>`;
            card.appendChild(ico);
        }
        // Overlay excluir
        const del = document.createElement('button');
        del.type = 'button';
        del.title = 'Excluir';
        del.innerHTML = '<i class="ph ph-trash"></i>';
        del.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;background:rgba(239,68,68,0);color:transparent;cursor:pointer;font-size:1.4rem;display:flex;align-items:center;justify-content:center;transition:all .2s;';
        del.onmouseover = function() { this.style.background='rgba(239,68,68,0.78)'; this.style.color='#fff'; };
        del.onmouseout  = function() { this.style.background='rgba(239,68,68,0)'; this.style.color='transparent'; };
        del.onclick = function() { window._rhEditExcluirMidia(i); };
        card.appendChild(del);
        const lbl = document.createElement('span');
        lbl.style.cssText = 'position:absolute;bottom:2px;left:2px;background:rgba(0,0,0,0.55);color:#fff;font-size:0.52rem;border-radius:3px;padding:1px 4px;pointer-events:none;';
        lbl.textContent = isVideo ? 'Vídeo' : 'Foto';
        card.appendChild(lbl);
        grid.appendChild(card);
    });
};

window._rhEditExcluirMidia = async function(localIdx) {
    const { sinId } = window._rhEdit;
    const mids = window._rhEdit.midiasExistentes;
    if (!sinId || localIdx < 0 || localIdx >= mids.length) return;
    const m = mids[localIdx];
    if (!confirm(`Excluir "${m.nome || 'Mídia ' + (localIdx+1)}"? Não pode ser desfeito.`)) return;

    const grid = document.getElementById('rh-edit-midias-grid');
    if (grid) grid.style.opacity = '0.5';
    try {
        const res = await fetch(`${API_URL}/sinistros/${sinId}/midia/${m.idx}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao excluir.');
        mids.splice(localIdx, 1);
        mids.forEach((x, i) => { x.idx = i; });
        window._rhEditRenderMidias();
    } catch(e) {
        alert('Erro: ' + e.message);
    } finally {
        if (grid) grid.style.opacity = '1';
    }
};

window._rhEditAddMidias = function(fileList) {
    if (!fileList || !fileList.length) return;
    Array.from(fileList).forEach(f => {
        if (!window._rhEdit.midiaFiles.some(x => x.name === f.name && x.size === f.size))
            window._rhEdit.midiaFiles.push(f);
    });
    window._rhEditRenderNovasMidias();
};

window.rhSinEditProcessarLeituraBO = async function(btn) {
    const fileInput = document.getElementById('rh-edit-file-bo');
    if (!fileInput || !fileInput.files.length) return alert('Selecione o arquivo do BO em PDF.');

    const formData = new FormData();
    formData.append('arquivo', fileInput.files[0]);

    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Lendo...'; 
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/extrair-bo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
            body: formData
        });
        if (res.status === 401 || res.status === 403) { alert('Sessão expirada.'); location.reload(); return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro na leitura.');

        const fbo = document.getElementById('rh-edit-bo');
        if (fbo && data.protocolo && !fbo.value) fbo.value = data.protocolo;
        
        const fdt = document.getElementById('rh-edit-data'); 
        if (fdt && data.data_hora) fdt.value = data.data_hora;
        
        const fnat = document.getElementById('rh-edit-natureza'); 
        if (fnat && data.natureza) fnat.value = data.natureza.replace(/Crime\s+Consumado[^\-]*\-?\s*/gi, '').trim();

        window._rhEdit.boFile = fileInput.files[0];

        const notif = document.getElementById('rh-edit-sin-msg');
        if (notif) {
            notif.innerHTML = '<i class="ph ph-check-circle"></i> Leitura concluída! O PDF também será salvo ao enviar.';
            notif.style.cssText = 'display:block; padding:0.6rem 0.85rem; border-radius:8px; font-size:0.82rem; background:#d1fae5; border:1px solid #6ee7b7; color:#065f46; margin-bottom:10px;';
        }
    } catch(e) {
        alert('Erro ao analisar BO: ' + e.message);
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
};

window._rhEditRenderNovasMidias = function() {
    const el = document.getElementById('rh-edit-novas-midias-preview');
    if (!el) return;
    const files = window._rhEdit.midiaFiles;
    if (!files.length) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    el.innerHTML = '';
    files.forEach((f, i) => {
        const card = document.createElement('div');
        card.style.cssText = 'position:relative;width:76px;height:76px;border-radius:8px;overflow:hidden;border:2px dashed #7dd3fc;background:#e0f2fe;flex-shrink:0;';
        if (f.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            const rd = new FileReader(); rd.onload = ev => { img.src = ev.target.result; }; rd.readAsDataURL(f);
            card.appendChild(img);
        } else {
            const ico = document.createElement('div');
            ico.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1e293b;';
            ico.innerHTML = `<i class="ph ph-video" style="font-size:1.5rem;color:#60a5fa;"></i><span style="font-size:0.52rem;color:#94a3b8;margin-top:2px;">${f.name.slice(0,12)}</span>`;
            card.appendChild(ico);
        }
        const btn = document.createElement('button');
        btn.type = 'button'; btn.innerHTML = '&times;';
        btn.style.cssText = 'position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(239,68,68,0.9);color:#fff;font-size:0.8rem;cursor:pointer;padding:0;';
        btn.onclick = () => { window._rhEdit.midiaFiles.splice(i, 1); window._rhEditRenderNovasMidias(); };
        card.appendChild(btn);
        const novo = document.createElement('span');
        novo.style.cssText = 'position:absolute;bottom:2px;left:2px;background:#059669;color:#fff;font-size:0.5rem;border-radius:3px;padding:1px 4px;font-weight:700;';
        novo.textContent = 'NOVO';
        card.appendChild(novo);
        el.appendChild(card);
    });
};

window._rhEditAddOrcs = function(fileList) {
    if (!fileList || !fileList.length) return;
    Array.from(fileList).forEach(f => {
        const ext = f.name.split('.').pop().toLowerCase();
        if (!['jpg','jpeg','png'].includes(ext)) { alert('Apenas JPG/PNG: ' + f.name); return; }
        if (!window._rhEdit.orcFiles.some(x => x.name === f.name && x.size === f.size))
            window._rhEdit.orcFiles.push(f);
    });
    window._rhEditRenderOrcs();
};

window._rhEditRenderOrcs = function() {
    const el    = document.getElementById('rh-edit-orcs-preview');
    const count = document.getElementById('rh-edit-orcs-count');
    if (!el) return;
    const files = window._rhEdit.orcFiles;
    if (!files.length) { el.style.display = 'none'; if (count) count.style.display = 'none'; return; }
    el.style.display = 'flex';
    if (count) { count.textContent = `${files.length} orçamento(s) selecionado(s)`; count.style.display = 'block'; }
    el.innerHTML = '';
    files.forEach((f, i) => {
        const card = document.createElement('div');
        card.style.cssText = 'position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:2px solid #d1d5db;flex-shrink:0;';
        const img = document.createElement('img');
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        const rd = new FileReader(); rd.onload = ev => { img.src = ev.target.result; }; rd.readAsDataURL(f);
        card.appendChild(img);
        const btn = document.createElement('button');
        btn.type = 'button'; btn.innerHTML = '&times;';
        btn.style.cssText = 'position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(239,68,68,0.9);color:#fff;font-size:0.8rem;cursor:pointer;padding:0;';
        btn.onclick = () => { window._rhEdit.orcFiles.splice(i, 1); window._rhEditRenderOrcs(); };
        card.appendChild(btn);
        el.appendChild(card);
    });
};

window.rhSinSalvar = async function() {
    const { sinId, colabId, orcFiles, midiaFiles } = window._rhEdit;
    if (!sinId || !colabId) return;

    const btn   = document.getElementById('rh-edit-btn-salvar');
    const msgEl = document.getElementById('rh-edit-msg');
    const oldTxt = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }

    function showMsg(txt, ok) {
        if (!msgEl) return;
        msgEl.style.display = 'block';
        msgEl.style.cssText = `display:block; padding:0.6rem 0.85rem; border-radius:8px; font-size:0.82rem; ${ok
            ? 'background:#d1fae5; border:1px solid #6ee7b7; color:#065f46;'
            : 'background:#fee2e2; border:1px solid #fca5a5; color:#991b1b;'}`;
        msgEl.innerHTML = `<i class="ph ph-${ok ? 'check-circle' : 'warning'}"></i> ${txt}`;
    }

    try {
        // 1) Campos básicos + orçamentos base64
        const form = new FormData();
        if (document.getElementById('rh-edit-bo')) form.append('numero_boletim', document.getElementById('rh-edit-bo').value);
        if (document.getElementById('rh-edit-data')) form.append('data_hora', document.getElementById('rh-edit-data').value);
        if (document.getElementById('rh-edit-natureza')) form.append('natureza', document.getElementById('rh-edit-natureza').value);
        if (document.getElementById('rh-edit-veiculo')) form.append('veiculo', document.getElementById('rh-edit-veiculo').value);
        if (document.getElementById('rh-edit-placa')) form.append('placa', document.getElementById('rh-edit-placa').value);
        if (document.getElementById('rh-edit-observacoes')) form.append('observacoes', document.getElementById('rh-edit-observacoes').value);

        if (window._rhEdit.boFile) {
            form.append('arquivo', window._rhEdit.boFile);
        } else {
            const fFile = document.getElementById('rh-edit-file-bo');
            if (fFile && fFile.files.length > 0) {
                form.append('arquivo', fFile.files[0]);
            }
        }

        if (orcFiles.length > 0) {
            if (btn) btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando orçamentos...';
            const b64arr = [];
            for (const f of orcFiles) {
                const b64 = await new Promise(res => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.readAsDataURL(f); });
                b64arr.push(b64);
            }
            form.append('orcamentos_base64', JSON.stringify(b64arr));
        }

        const r1 = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('erp_token')}`
            },
            body: form
        });
        const d1 = await r1.json();
        if (!r1.ok) throw new Error(d1.error || 'Erro ao salvar campos.');

        // 2) Upload de novas mídias
        if (midiaFiles.length > 0) {
            for (let j = 0; j < midiaFiles.length; j++) {
                if (btn) btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Enviando mídia ${j+1}/${midiaFiles.length}...`;
                const fd = new FormData();
                fd.append('file', midiaFiles[j]);
                const rm = await fetch(`${API_URL}/sinistros/${sinId}/midia`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
                    body: fd
                });
                if (!rm.ok) {
                    const em = await rm.json().catch(() => ({}));
                    console.warn('Falha ao enviar:', midiaFiles[j].name, em.error);
                }
            }
        }

        showMsg('Sinistro atualizado com sucesso!', true);
        setTimeout(async () => {
            document.getElementById('modal-rh-sin-editar').style.display = 'none';
            // Recarregar lista de sinistros do prontuário
            if (typeof window._recarregarListaSinistros === 'function') {
                await window._recarregarListaSinistros(colabId);
            }
        }, 1200);

    } catch(e) {
        showMsg(e.message, false);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = oldTxt; }
    }
};
