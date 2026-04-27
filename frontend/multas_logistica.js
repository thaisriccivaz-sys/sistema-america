// multas_logistica.js

let multasLogistica = [];
let colaboradoresMultas = [];

async function initMultasLogistica() {
    await carregarColaboradoresMultas();
    await carregarMultasLogistica();
}

async function carregarColaboradoresMultas() {
    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const response = await fetch('/api/colaboradores', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            colaboradoresMultas = await response.json();
            // Filtrar apenas ativos, se desejar. Por enquanto, pega todos ou ativos
            colaboradoresMultas = colaboradoresMultas.filter(c => c.status !== 'Inativo');
        }
    } catch (e) {
        console.error('Erro ao carregar colaboradores', e);
    }
}

async function carregarMultasLogistica() {
    const container = document.getElementById('multas-logistica-container');
    if (!container) return;

    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const response = await fetch('/api/logistica/multas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            multasLogistica = await response.json();
            renderMultasLogistica(container);
        } else {
            container.innerHTML = '<p style="padding: 1rem; color: red;">Erro ao carregar multas.</p>';
        }
    } catch (e) {
        console.error('Erro', e);
        container.innerHTML = '<p style="padding: 1rem; color: red;">Erro de conexão.</p>';
    }
}

function renderMultasLogistica(container) {
    let html = `
        <div style="background:#fff; border-radius:8px; padding:1.5rem; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h2 style="margin:0; color:#1e293b; font-size:1.25rem;"><i class="ph ph-receipt"></i> Controle de Multas</h2>
                <button onclick="abrirModalNovaMulta()" style="background:#2563eb; color:white; border:none; padding:0.6rem 1.2rem; border-radius:6px; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:0.5rem;">
                    <i class="ph ph-plus-circle"></i> Cadastrar Multa
                </button>
            </div>

            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; min-width:1000px; font-size:0.9rem;">
                    <thead>
                        <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; text-align:left;">
                            <th style="padding:1rem; font-weight:600; color:#475569;">AIT</th>
                            <th style="padding:1rem; font-weight:600; color:#475569;">Data/Hora</th>
                            <th style="padding:1rem; font-weight:600; color:#475569;">Motivo</th>
                            <th style="padding:1rem; font-weight:600; color:#475569;">Valor / Pontos</th>
                            <th style="padding:1rem; font-weight:600; color:#475569;">Motorista</th>
                            <th style="padding:1rem; font-weight:600; color:#475569;">Status</th>
                            <th style="padding:1rem; font-weight:600; color:#475569;">Observação</th>
                            <th style="padding:1rem; font-weight:600; color:#475569;">Link Form.</th>
                            <th style="padding:1rem; font-weight:600; color:#475569; text-align:center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (multasLogistica.length === 0) {
        html += `<tr><td colspan="9" style="padding:2rem; text-align:center; color:#64748b;">Nenhuma multa cadastrada.</td></tr>`;
    } else {
        multasLogistica.forEach(m => {
            const dataInfracao = m.data_infracao ? m.data_infracao.split('-').reverse().join('/') : '—';
            
            let motoristaHtml = '';
            if (m.motorista_id && m.motorista_nome) {
                const cpf = m.motorista_cpf || 'Não informado';
                const hab = m.motorista_habilitacao || 'Não informado';
                motoristaHtml = `<span title="CPF: ${cpf} | CNH: ${hab}" style="cursor:help; font-weight:600; color:#0f172a; border-bottom:1px dashed #cbd5e1;">${m.motorista_nome}</span>`;
            } else {
                motoristaHtml = `<button onclick="abrirModalGerenciarMulta(${m.id}, true)" style="background:#f1f5f9; color:#2563eb; border:1px solid #cbd5e1; padding:0.3rem 0.6rem; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:600;">+ Adicionar Motorista</button>`;
            }

            let statusColor = '#e2e8f0';
            if (m.status === 'Em Conferência') statusColor = '#fef08a';
            else if (m.status === 'Conferido Aguardando Motorista') statusColor = '#bfdbfe';
            else if (m.status === 'Indicação Realizada') statusColor = '#bbf7d0';
            else if (m.status === 'Preferência por Multa NIC') statusColor = '#fecaca';
            else if (m.status === 'Não se Aplica') statusColor = '#cbd5e1';

            html += `
                <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding:1rem;"><strong>${m.numero_ait || '—'}</strong></td>
                    <td style="padding:1rem;">${dataInfracao}<br><span style="color:#64748b; font-size:0.8rem;">${m.hora_infracao || '—'}</span></td>
                    <td style="padding:1rem; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${m.motivo || ''}">${m.motivo || '—'}</td>
                    <td style="padding:1rem;">R$ ${m.valor_multa || '0,00'}<br><span style="color:#ef4444; font-size:0.8rem; font-weight:600;">${m.pontuacao || 0} pts</span></td>
                    <td style="padding:1rem;">${motoristaHtml}</td>
                    <td style="padding:1rem;">
                        <span style="background:${statusColor}; color:#0f172a; padding:4px 8px; border-radius:12px; font-size:0.8rem; font-weight:600; white-space:nowrap;">
                            ${m.status || '—'}
                        </span>
                    </td>
                    <td style="padding:1rem; max-width:150px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${m.observacao || ''}">${m.observacao || '—'}</td>
                    <td style="padding:1rem;">
                        ${m.link_formulario ? 
                            `<div style="display:flex; align-items:center; gap:0.3rem;">
                                <a href="${m.link_formulario.startsWith('http') ? m.link_formulario : 'http://'+m.link_formulario}" target="_blank" style="color:#2563eb; text-decoration:none; max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.link_formulario}</a>
                                <button onclick="navigator.clipboard.writeText('${m.link_formulario}'); mostrarToastSucesso('Link copiado!')" style="background:none; border:none; cursor:pointer; color:#64748b;" title="Copiar Link"><i class="ph ph-copy"></i></button>
                             </div>` 
                            : '—'}
                    </td>
                    <td style="padding:1rem; text-align:center;">
                        <button onclick="abrirModalGerenciarMulta(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#2563eb; margin-right:8px;" title="Gerenciar/Editar"><i class="ph ph-pencil-simple" style="font-size:1.2rem;"></i></button>
                        ${m.documento_path ? `<button onclick="visualizarDocumentoMulta(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#10b981; margin-right:8px;" title="Visualizar Documento"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>` : ''}
                        <button onclick="confirmarExcluirMulta(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#ef4444;" title="Excluir"><i class="ph ph-trash" style="font-size:1.2rem;"></i></button>
                    </td>
                </tr>
            `;
        });
    }

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function abrirModalNovaMulta() {
    document.getElementById('modal-nova-multa')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-nova-multa';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;';
    
    modal.innerHTML = `
        <div style="background:#fff; width:520px; max-width:95%; border-radius:10px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
            <div style="background:#f8fafc; padding:1.2rem 1.5rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; color:#0f172a; font-size:1.2rem;">&#128196; Nova Multa</h3>
                <button onclick="this.closest('#modal-nova-multa').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#64748b;">&times;</button>
            </div>
            <div style="padding:1.5rem;">
                <form id="form-nova-multa" onsubmit="salvarNovaMulta(event)">

                    <!-- CAMPO PDF NO TOPO -->
                    <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe); border:1.5px dashed #3b82f6; border-radius:8px; padding:1rem 1.2rem; margin-bottom:1.3rem;">
                        <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.5rem;">
                            <span style="font-size:1.3rem;">&#129302;</span>
                            <span style="font-weight:700; color:#1d4ed8; font-size:0.92rem;">Preenchimento Automático via PDF</span>
                        </div>
                        <p style="margin:0 0 0.7rem; color:#475569; font-size:0.82rem;">Anexe o documento da multa e os campos abaixo serão preenchidos automaticamente: Data, Hora, Número AIT, Motivo, Valor e Pontuação.</p>
                        <input type="file" id="nm-doc" accept=".pdf" onchange="processarPDFMulta(this)" style="width:100%; padding:0.4rem 0.5rem; border:1px solid #bfdbfe; border-radius:5px; background:white; font-size:0.85rem; cursor:pointer;">
                    </div>

                    <div style="display:flex; gap:1rem; margin-bottom:1rem;">
                        <div style="flex:1;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Data Infração *</label>
                            <input type="date" id="nm-data" required style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Hora</label>
                            <input type="time" id="nm-hora" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                    </div>

                    <div style="margin-bottom:1rem;">
                        <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Número AIT *</label>
                        <input type="text" id="nm-ait" required placeholder="Ex: AA123456789" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                    </div>

                    <div style="margin-bottom:1rem;">
                        <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Motivo da Multa</label>
                        <input type="text" id="nm-motivo" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                    </div>

                    <div style="display:flex; gap:1rem; margin-bottom:1.3rem;">
                        <div style="flex:1;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Valor (R$)</label>
                            <input type="text" id="nm-valor" placeholder="0,00" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Pontuação <span id="nm-pontos-badge" style="display:none; background:#fef08a; color:#854d0e; padding:1px 6px; border-radius:8px; font-size:0.72rem; font-weight:700;">Auto</span></label>
                            <input type="number" id="nm-pontos" placeholder="0" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:1rem;">
                        <button type="button" onclick="this.closest('#modal-nova-multa').remove()" style="padding:0.6rem 1.2rem; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer; font-weight:600; color:#475569;">Cancelar</button>
                        <button type="submit" style="padding:0.6rem 1.2rem; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">Iniciar Processo</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function salvarNovaMulta(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    const formData = new FormData();
    formData.append('data_infracao', document.getElementById('nm-data').value);
    formData.append('hora_infracao', document.getElementById('nm-hora').value);
    formData.append('numero_ait', document.getElementById('nm-ait').value);
    formData.append('motivo', document.getElementById('nm-motivo').value);
    formData.append('valor_multa', document.getElementById('nm-valor').value);
    formData.append('pontuacao', document.getElementById('nm-pontos').value);

    const fileInput = document.getElementById('nm-doc');
    if (fileInput && fileInput.files.length > 0) {
        formData.append('documento', fileInput.files[0]);
    }

    // Fallback: fecha modal e recarrega lista após 8s mesmo que resposta não chegue
    const fecharEAtualizar = async (msg, tipo = 'sucesso') => {
        document.getElementById('modal-nova-multa')?.remove();
        await carregarMultasLogistica();
        if (tipo === 'sucesso') mostrarToastSucesso(msg);
        else if (tipo === 'aviso') mostrarToastAviso(msg);
        else mostrarToastErro(msg);
    };

    const timeoutId = setTimeout(() => {
        fecharEAtualizar('Multa salva! (conexão instabilizada, lista atualizada)', 'aviso');
    }, 8000);

    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const response = await fetch('/api/logistica/multas', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            await fecharEAtualizar('Multa cadastrada e processo iniciado!');
        } else {
            // Mesmo com erro HTTP, tenta recarregar (pode ter salvo no server)
            const err = await response.json().catch(() => ({}));
            await fecharEAtualizar(err.error || 'Atenção: verifique se a multa foi salva.', 'aviso');
        }
    } catch (err) {
        clearTimeout(timeoutId);
        console.error('[salvarNovaMulta]', err);
        // Mesmo com erro de rede, fecha e recarrega (servidor pode ter processado)
        await fecharEAtualizar('Conexão instavel. Verifique se a multa aparece na lista.', 'aviso');
    }
}

function abrirModalGerenciarMulta(id, focoMotorista = false) {
    const multa = multasLogistica.find(m => m.id === id);
    if (!multa) return;

    document.getElementById('modal-gerenciar-multa')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-gerenciar-multa';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;';
    
    let optionsMotoristas = `<option value="">-- Selecione o Motorista --</option>`;
    colaboradoresMultas.forEach(c => {
        const nome = c.nome_completo || c.nome || 'Sem nome';
        const sel = multa.motorista_id === c.id ? 'selected' : '';
        optionsMotoristas += `<option value="${c.id}" ${sel}>${nome}</option>`;
    });

    const statusOpts = ['Em Conferência', 'Conferido Aguardando Motorista', 'Indicação Realizada', 'Preferência por Multa NIC', 'Não se Aplica'];
    let optionsStatus = '';
    statusOpts.forEach(s => {
        const sel = (multa.status === s) ? 'selected' : '';
        optionsStatus += `<option value="${s}" ${sel}>${s}</option>`;
    });

    modal.innerHTML = `
        <div style="background:#fff; width:500px; max-width:90%; border-radius:8px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
            <div style="background:#f8fafc; padding:1.2rem 1.5rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; color:#0f172a; font-size:1.2rem;">Gerenciar Multa - ${multa.numero_ait || 'S/N'}</h3>
                <button onclick="this.closest('#modal-gerenciar-multa').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#64748b;">&times;</button>
            </div>
            <div style="padding:1.5rem;">
                <form id="form-gerenciar-multa" onsubmit="salvarGerenciamentoMulta(event, ${multa.id})">
                    
                    <div style="margin-bottom:1rem;">
                        <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Motorista Responsável</label>
                        <select id="gm-motorista" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                            ${optionsMotoristas}
                        </select>
                    </div>

                    <div style="margin-bottom:1rem;">
                        <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Status</label>
                        <select id="gm-status" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                            ${optionsStatus}
                        </select>
                    </div>

                    <div style="margin-bottom:1rem;">
                        <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Observação <span id="gm-obs-req" style="color:red; display:none;">*</span></label>
                        <textarea id="gm-obs" rows="3" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px; resize:vertical;">${multa.observacao || ''}</textarea>
                    </div>

                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Link Formulário Assinatura</label>
                        <input type="text" id="gm-link" value="${multa.link_formulario || ''}" placeholder="https://..." style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:1rem;">
                        <button type="button" onclick="this.closest('#modal-gerenciar-multa').remove()" style="padding:0.6rem 1.2rem; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer; font-weight:600; color:#475569;">Cancelar</button>
                        <button type="submit" style="padding:0.6rem 1.2rem; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const statusSel = document.getElementById('gm-status');
    const obsReq = document.getElementById('gm-obs-req');
    statusSel.addEventListener('change', () => {
        obsReq.style.display = (statusSel.value === 'Não se Aplica') ? 'inline' : 'none';
    });
    if (statusSel.value === 'Não se Aplica') obsReq.style.display = 'inline';

    if (focoMotorista) {
        document.getElementById('gm-motorista').focus();
    }
}

async function salvarGerenciamentoMulta(e, id) {
    e.preventDefault();
    const status = document.getElementById('gm-status').value;
    const obs = document.getElementById('gm-obs').value.trim();
    
    if (status === 'Não se Aplica' && !obs) {
        mostrarToastAviso('Preencha a observação quando o status for "Não se Aplica".');
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    const motoristaSel = document.getElementById('gm-motorista');
    const motoristaId = motoristaSel.value;
    const motoristaNome = motoristaId ? motoristaSel.options[motoristaSel.selectedIndex].text : null;
    const link = document.getElementById('gm-link').value.trim();

    // Fallback: fecha modal e recarrega lista após 8s mesmo sem resposta
    const fecharEAtualizar = async (msg, tipo = 'sucesso') => {
        document.getElementById('modal-gerenciar-multa')?.remove();
        await carregarMultasLogistica();
        if (tipo === 'sucesso') mostrarToastSucesso(msg);
        else mostrarToastAviso(msg);
    };
    const timeoutId = setTimeout(() => {
        fecharEAtualizar('Salvo! (conexão instável, lista atualizada)', 'aviso');
    }, 8000);

    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const response = await fetch('/api/logistica/multas/' + id, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                motorista_id: motoristaId,
                motorista_nome: motoristaNome,
                status: status,
                observacao: obs,
                link_formulario: link
            })
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            await fecharEAtualizar('Multa atualizada!');
        } else {
            await fecharEAtualizar('Verifique se as alterações foram salvas.', 'aviso');
        }
    } catch (err) {
        clearTimeout(timeoutId);
        console.error('[salvarGerenciamentoMulta]', err);
        await fecharEAtualizar('Conexão instável. Verifique se as alterações foram salvas.', 'aviso');
    }
}

function confirmarExcluirMulta(id) {
    // Modal de confirmação inline (evita bloqueio do confirm() por alguns browsers)
    document.getElementById('modal-confirm-excluir-multa')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-confirm-excluir-multa';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:10000;';
    modal.innerHTML = `
        <div style="background:#fff;border-radius:10px;padding:2rem;max-width:380px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.2);text-align:center;">
            <div style="font-size:2.5rem;margin-bottom:0.5rem;">🗑️</div>
            <h3 style="margin:0 0 0.5rem;color:#0f172a;">Excluir Multa</h3>
            <p style="color:#64748b;margin:0 0 1.5rem;font-size:0.9rem;">Tem certeza que deseja excluir esta multa? Essa ação não pode ser desfeita.</p>
            <div style="display:flex;gap:1rem;justify-content:center;">
                <button onclick="document.getElementById('modal-confirm-excluir-multa').remove()" style="padding:0.6rem 1.4rem;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font-weight:600;color:#475569;">Cancelar</button>
                <button onclick="excluirMultaLogistica(${id})" style="padding:0.6rem 1.4rem;background:#ef4444;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Excluir</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function excluirMultaLogistica(id) {
    document.getElementById('modal-confirm-excluir-multa')?.remove();
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';

    // Fallback: mesmo se não houver resposta, recarrega após 6s
    const timeoutId = setTimeout(async () => {
        await carregarMultasLogistica();
        mostrarToastAviso('Lista atualizada (conexão instável).');
    }, 6000);

    try {
        const response = await fetch('/api/logistica/multas/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        clearTimeout(timeoutId);
        await carregarMultasLogistica();
        if (response.ok) {
            mostrarToastSucesso('Multa excluída com sucesso.');
        } else {
            mostrarToastAviso('Verifique se a multa foi excluída.');
        }
    } catch (e) {
        clearTimeout(timeoutId);
        await carregarMultasLogistica();
        mostrarToastAviso('Conexão instável. Verifique se a multa foi excluída.');
    }
}

function visualizarDocumentoMulta(id) {
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    // Abre em nova aba usando a rota de download autenticada
    const url = `/api/logistica/multas/${id}/documento?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
}

// Tabela de pontuação baseada no CTB (Código de Trânsito Brasileiro)
// IMPORTANTE: a ordem importa — frases mais específicas devem vir primeiro dentro de cada grupo,
// e grupos de pontuação maior vêm antes para evitar falsos positivos.
const PONTUACAO_POR_INFRACAO = [
    // ── Gravíssimas: 7 pontos ──────────────────────────────────────────────
    { pontos: 7, palavras: [
        'celular', 'aparelho de comunicacao', 'aparelho de comunicação',
        'cinto de seguranca', 'cinto de segurança',
        'capacete',
        'embriaguez', 'alcoolemia', 'bafometro', 'alcool',
        'contramaoo', 'contramao', 'contramão',
        'sinal vermelho', 'semaforo vermelho', 'semáforo vermelho',
        'velocidade superior a 50',
        'racha', 'competicao', 'competição',
        'fuga ao controle policial', 'evasao ao controle', 'evasão ao controle',
        'nao parar no posto', 'não parar no posto',
        'transporte de passageiros clandestino',
        'ultrapassagem em local proibido',
        'dirigir sem habilitacao', 'dirigir sem habilitação', 'sem cnh',
        'nao possuir cnh', 'não possuir cnh',
        'habilitacao cassada', 'habilitação cassada',
        'freiar bruscamente',
        'nao usar cadeirinha', 'nao usar dispositivo de retencao',
    ]},
    // ── Graves: 5 pontos ──────────────────────────────────────────────────
    { pontos: 5, palavras: [
        'velocidade superior a 20',
        'estacionamento proibido', 'estacionar em local proibido',
        'conversao proibida', 'conversão proibida',
        'retorno proibido',
        'habilitacao vencida', 'habilitação vencida',
        'avancar sinal', 'avançar sinal', 'avanço de sinal',
        'parar sobre faixa de pedestres', 'sobre faixa de pedestre',
        'ultrapassagem proibida',
        'acostamento',
        'faixa exclusiva', 'faixa de onibus',
        'nao dar preferencia ao pedestre', 'não dar preferência ao pedestre',
        'placa de identificacao adulterada', 'placa adulterada',
    ]},
    // ── Médias: 4 pontos ──────────────────────────────────────────────────
    { pontos: 4, palavras: [
        'transitar em local', 'transitar em horario', 'transitar em horário',
        'horario nao permitido', 'horário não permitido',
        'local nao permitido', 'local não permitido',
        'regulamentacao', 'regulamentação',         // Art. 185 - transitar em local/horário não permitido
        'velocidade superior a 15',
        'estacionar em local', 'estacionamento irregular',
        'licenciamento', 'crlv', 'documento do veiculo', 'documento do veículo',
        'verificacao anual', 'verificação anual',
        'pneu liso', 'pneu careca', 'pneu com defeito',
        'freio deficiente', 'freio com defeito',
        'extintor', 'triangulo', 'triângulo',
        'kit de primeiros socorros',
        'excesso de peso',
        'parar em local proibido', 'parar em fila dupla', 'segunda fila',
        'nao acionar indicador', 'não acionar indicador',
        'documentacao irregular', 'documentação irregular',
    ]},
    // ── Leves: 3 pontos ───────────────────────────────────────────────────
    { pontos: 3, palavras: [
        'velocidade ate 5', 'velocidade até 5',
        'velocidade ate 15', 'velocidade até 15',
        'nao sinalizar manobra', 'não sinalizar manobra',
        'luz baixa em rodovia', 'farol baixo em rodovia',
        'ausencia de documento', 'ausência de documento',
        'nao portar documento', 'não portar documento',
        'identificacao do local, data e hora',
        'identificação do local, data e hora',
    ]},
];

function inferirPontuacaoPorMotivo(motivo) {
    if (!motivo) return null;
    const m = motivo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const grupo of PONTUACAO_POR_INFRACAO) {
        for (const palavra of grupo.palavras) {
            const p = palavra.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (m.includes(p)) return grupo.pontos;
        }
    }
    return null;
}

window.processarPDFMulta = async function(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.type !== 'application/pdf') return;

    try {
        if (typeof pdfjsLib === 'undefined' && !window.pdfjsLib) {
            console.warn('pdf.js não carregado no escopo. A extração automática de dados foi cancelada.');
            return;
        }

        const pdfjs = window.pdfjsLib || pdfjsLib;
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }

        if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso('🔍 Lendo documento PDF...');

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            // Join com espaço e também tenta sem espaço para capturar tokens colados
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        console.log('[PDF Multa] Texto extraído:', fullText.substring(0, 1000));

        // Normaliza espaços mas preserva quebras para buscas linha a linha
        const textToSearch = fullText.replace(/[ \t]+/g, ' ');

        // ── AIT (múltiplos padrões) ──────────────────────────────────────────────
        // Regras:
        // 1. O AIT deve conter pelo menos um dígito (evitar capturar palavras puras como "RIDADE")
        // 2. Usar \b (word boundary) antes do keyword para não casar no meio de palavras
        // 3. Padrão genérico "Auto" REMOVIDO pois casava "AUTORIDADE" → "RIDADE"
        let aitVal = '';
        const aitPatterns = [
            // "AIT: AA123456789" ou "A.I.T. 123456"
            /\bA\.?\s*I\.?\s*T\.?\b\s*[:\-\/\.#\s]+([A-Z0-9]{4,20})/i,
            // "Auto de Infração Nº AA123456789" – frase completa com word boundary
            /\bAuto\s+de\s+Infra[çc][ãa]o\b[^A-Z0-9]{0,10}([A-Z0-9]{6,20})/i,
            // "Nº 123456" ou "N° AA123456789" – símbolo de número seguido do AIT
            /\bn[°ºo]\s*\.?\s*([A-Z0-9]{6,20})/i,
            // Sequência típica brasileira: 2 letras + 9 a 12 dígitos (ex: AA123456789)
            /(?:^|\s)([A-Z]{2}[0-9]{9,12})(?:\s|$)/m,
            // Sequência só numérica longa (10 a 15 dígitos)
            /(?:^|\s)([0-9]{10,15})(?:\s|$)/m,
        ];
        for (const pat of aitPatterns) {
            const m = textToSearch.match(pat);
            // Garante que o valor capturado tem ao menos 1 dígito (evita palavras puras)
            if (m && m[1] && m[1].length >= 6 && /\d/.test(m[1])) {
                aitVal = m[1].trim();
                break;
            }
        }
        if (aitVal) {
            document.getElementById('nm-ait').value = aitVal;
        }

        // ── Data ──────────────────────────────────────────────────────────
        const dataMatch = textToSearch.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
        if (dataMatch) {
            const parts = dataMatch[1].split(/[\/\-]/);
            document.getElementById('nm-data').value = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }

        // ── Hora ──────────────────────────────────────────────────────────
        const horaMatch = textToSearch.match(/(\d{1,2}:\d{2})(?::\d{2})?/);
        if (horaMatch) document.getElementById('nm-hora').value = horaMatch[1].padStart(5, '0');

        // ── Valor ─────────────────────────────────────────────────────────
        const valorMatch =
            textToSearch.match(/R\$\s*([\d]{1,}[.,][\d]{2})/i) ||
            textToSearch.match(/valor\s*(?:da\s*multa)?\s*[:\-]?\s*R?\$?\s*([\d]{1,}[.,][\d]{2})/i) ||
            textToSearch.match(/multa[^\n]*?([\d]{2,}[.,]\d{2})/i);
        if (valorMatch) document.getElementById('nm-valor').value = valorMatch[1].trim();

        // ── Motivo ────────────────────────────────────────────────────────
        const motivoPatterns = [
            /descri[çc][ãa]o\s*(?:da\s*)?infra[çc][ãa]o\s*[:\-]?\s*([^\n]{10,120})/i,
            /(?:^|\n)infra[çc][ãa]o\s*[:\-]\s*([^\n]{10,120})/im,
            /(?:enquadramento|artigo|art\.?)\s*[:\-]?\s*([^\n]{10,120})/i,
        ];
        const campoMotivo = document.getElementById('nm-motivo');
        if (!campoMotivo.value) {
            for (const pat of motivoPatterns) {
                const m = textToSearch.match(pat);
                if (m && m[1]) { campoMotivo.value = m[1].trim().substring(0, 150); break; }
            }
        }

        // ── Pontuação: primeiro tenta extrair do PDF, senão infere pelo motivo ──
        let pontosDefinidos = false;

        // Tenta ler pontuação diretamente do PDF
        const pontosMatch =
            textToSearch.match(/(\d+)\s*(?:pontos|pts)/i) ||
            textToSearch.match(/pontua[çc][ãa]o\s*[:\-]?\s*(\d+)/i) ||
            textToSearch.match(/gravidade\s*[:\-]?\s*(Graví?ssima|Grave|Méd[ia]+|Leve)/i);
        if (pontosMatch) {
            const g = (pontosMatch[1] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
            let pontos = 0;
            if (g === 'gravissima' || g === 'gravissima') pontos = 7;
            else if (g === 'grave') pontos = 5;
            else if (g === 'media' || g === 'media') pontos = 4;
            else if (g === 'leve') pontos = 3;
            else if (/^\d+$/.test(g)) pontos = parseInt(g, 10);
            if (pontos > 0) {
                document.getElementById('nm-pontos').value = pontos;
                pontosDefinidos = true;
            }
        }

        // Se não encontrou pontuação no PDF, infere pelo motivo
        if (!pontosDefinidos) {
            const motivo = campoMotivo.value || textToSearch.substring(0, 500);
            const pontosByMotivo = inferirPontuacaoPorMotivo(motivo);
            if (pontosByMotivo !== null) {
                document.getElementById('nm-pontos').value = pontosByMotivo;
                // Mostra badge "Auto" no label
                const badge = document.getElementById('nm-pontos-badge');
                if (badge) badge.style.display = 'inline';
                pontosDefinidos = true;
            }
        }

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('✅ Dados extraídos do PDF com sucesso!');
        }
    } catch(err) {
        console.error('Erro ao processar PDF:', err);
        if (typeof mostrarToastAviso === 'function') {
            mostrarToastAviso('Não foi possível ler os dados automaticamente do PDF. Preencha manualmente.');
        }
    }
};
