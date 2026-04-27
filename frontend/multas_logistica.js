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
            if (m.status === 'Em conferência') statusColor = '#fef08a';
            else if (m.status === 'indicação realizada') statusColor = '#bbf7d0';
            else if (m.status === 'multa NIC') statusColor = '#fecaca';
            else if (m.status === 'Não se aplica') statusColor = '#cbd5e1';

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
                        ${m.documento_path ? `<a href="/${m.documento_path.replace(/\\\\/g, '/')}" target="_blank" style="color:#10b981; margin-right:8px;" title="Ver Anexo"><i class="ph ph-file-pdf" style="font-size:1.2rem;"></i></a>` : ''}
                        <button onclick="excluirMultaLogistica(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#ef4444;" title="Excluir"><i class="ph ph-trash" style="font-size:1.2rem;"></i></button>
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
        <div style="background:#fff; width:500px; max-width:90%; border-radius:8px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
            <div style="background:#f8fafc; padding:1.2rem 1.5rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; color:#0f172a; font-size:1.2rem;">Nova Multa</h3>
                <button onclick="this.closest('#modal-nova-multa').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#64748b;">&times;</button>
            </div>
            <div style="padding:1.5rem;">
                <form id="form-nova-multa" onsubmit="salvarNovaMulta(event)">
                    <div style="display:flex; gap:1rem; margin-bottom:1rem;">
                        <div style="flex:1;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Data Infracão *</label>
                            <input type="date" id="nm-data" required style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Hora</label>
                            <input type="time" id="nm-hora" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                    </div>
                    
                    <div style="margin-bottom:1rem;">
                        <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Número AIT *</label>
                        <input type="text" id="nm-ait" required style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                    </div>
                    
                    <div style="margin-bottom:1rem;">
                        <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Motivo da Multa</label>
                        <input type="text" id="nm-motivo" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                    </div>
                    
                    <div style="display:flex; gap:1rem; margin-bottom:1rem;">
                        <div style="flex:1;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Valor (R$)</label>
                            <input type="text" id="nm-valor" placeholder="0,00" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Pontuação</label>
                            <input type="number" id="nm-pontos" placeholder="0" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                    </div>
                    
                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Documento da Multa (Anexo)</label>
                        <input type="file" id="nm-doc" accept=".pdf,.jpg,.jpeg,.png" onchange="processarPDFMulta(this)" style="width:100%; padding:0.4rem; border:1px dashed #cbd5e1; border-radius:4px;">
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
    if (fileInput.files.length > 0) {
        formData.append('documento', fileInput.files[0]);
    }

    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const response = await fetch('/api/logistica/multas', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        if (response.ok) {
            mostrarToastSucesso('Multa cadastrada e processo iniciado!');
            document.getElementById('modal-nova-multa').remove();
            carregarMultasLogistica();
        } else {
            const err = await response.json();
            mostrarToastErro(err.error || 'Erro ao cadastrar multa');
            btn.disabled = false;
            btn.textContent = 'Iniciar Processo';
        }
    } catch (err) {
        console.error(err);
        mostrarToastErro('Erro de conexão');
        btn.disabled = false;
        btn.textContent = 'Iniciar Processo';
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
        const sel = multa.motorista_id === c.id ? 'selected' : '';
        optionsMotoristas += `<option value="${c.id}" ${sel}>${c.nome}</option>`;
    });

    const statusOpts = ['Em conferência', 'indicação realizada', 'multa NIC', 'Não se aplica'];
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
        if (statusSel.value === 'Não se aplica') {
            obsReq.style.display = 'inline';
        } else {
            obsReq.style.display = 'none';
        }
    });
    // Trigger initial state
    if (statusSel.value === 'Não se aplica') obsReq.style.display = 'inline';

    if (focoMotorista) {
        document.getElementById('gm-motorista').focus();
    }
}

async function salvarGerenciamentoMulta(e, id) {
    e.preventDefault();
    const status = document.getElementById('gm-status').value;
    const obs = document.getElementById('gm-obs').value.trim();
    
    if (status === 'Não se aplica' && !obs) {
        mostrarToastAviso('É obrigatório preencher a observação quando o status for "Não se aplica".');
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    const motoristaSel = document.getElementById('gm-motorista');
    const motoristaId = motoristaSel.value;
    const motoristaNome = motoristaId ? motoristaSel.options[motoristaSel.selectedIndex].text : null;
    const link = document.getElementById('gm-link').value.trim();

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
        
        if (response.ok) {
            mostrarToastSucesso('Multa atualizada!');
            document.getElementById('modal-gerenciar-multa').remove();
            carregarMultasLogistica();
        } else {
            const err = await response.json();
            mostrarToastErro(err.error || 'Erro ao atualizar multa');
            btn.disabled = false;
            btn.textContent = 'Salvar Alterações';
        }
    } catch (err) {
        console.error(err);
        mostrarToastErro('Erro de conexão');
        btn.disabled = false;
        btn.textContent = 'Salvar Alterações';
    }
}

async function excluirMultaLogistica(id) {
    if (!confirm('Deseja realmente excluir esta multa?')) return;
    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const response = await fetch('/api/logistica/multas/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            mostrarToastSucesso('Multa excluída com sucesso.');
            carregarMultasLogistica();
        } else {
            mostrarToastErro('Erro ao excluir multa.');
        }
    } catch (e) {
        mostrarToastErro('Erro de conexão.');
    }
}

window.processarPDFMulta = async function(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.type !== 'application/pdf') return;

    try {
        if (typeof pdfjsLib === 'undefined') {
            console.warn('pdf.js não carregado no escopo. A extração automática de dados foi cancelada.');
            return;
        }

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Lendo documento PDF...');
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += pageText + ' \n ';
        }

        // Limpeza básica do texto para facilitar as Regex
        const textToSearch = fullText.replace(/\s+/g, ' ');

        // AIT
        const aitMatch = textToSearch.match(/AIT\s*:?\s*([A-Z0-9]+)/i) || textToSearch.match(/Auto\s*de\s*Infração\s*:?\s*([A-Z0-9]+)/i);
        if (aitMatch) document.getElementById('nm-ait').value = aitMatch[1].trim();

        // Data da Infração
        const dataMatch = textToSearch.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (dataMatch) {
            const parts = dataMatch[1].split('/');
            document.getElementById('nm-data').value = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        // Hora
        const horaMatch = textToSearch.match(/(\d{2}:\d{2})/);
        if (horaMatch) document.getElementById('nm-hora').value = horaMatch[1];

        // Valor
        const valorMatch = textToSearch.match(/R\$\s*([\d.,]+)/i) || textToSearch.match(/Valor\s*[:\s]*([\d.,]+)/i) || textToSearch.match(/Valor\s*da\s*Multa\s*[:\s]*([\d.,]+)/i);
        if (valorMatch) document.getElementById('nm-valor').value = valorMatch[1].trim();

        // Pontos / Gravidade
        const pontosMatch = textToSearch.match(/(\d+)\s*pontos/i) || textToSearch.match(/Pontuação\s*:?\s*(\d+)/i) || textToSearch.match(/Gravidade\s*:?\s*(Gravíssima|Grave|Média|Leve)/i);
        if (pontosMatch) {
            let pontos = 0;
            if (pontosMatch[1].toLowerCase() === 'gravíssima' || pontosMatch[1].toLowerCase() === 'gravissima') pontos = 7;
            else if (pontosMatch[1].toLowerCase() === 'grave') pontos = 5;
            else if (pontosMatch[1].toLowerCase() === 'média' || pontosMatch[1].toLowerCase() === 'media') pontos = 4;
            else if (pontosMatch[1].toLowerCase() === 'leve') pontos = 3;
            else pontos = pontosMatch[1].trim();
            document.getElementById('nm-pontos').value = pontos;
        }

        // Tentativa de Motivo
        const motivoMatch = textToSearch.match(/Infração\s*:?\s*([^.-]+)/i) || textToSearch.match(/Descrição\s*da\s*Infração\s*:?\s*([^.-]+)/i);
        if (motivoMatch && document.getElementById('nm-motivo').value === '') {
            document.getElementById('nm-motivo').value = motivoMatch[1].trim().substring(0, 100);
        }

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Dados extraídos do PDF com sucesso!');
        }
    } catch(err) {
        console.error('Erro ao processar PDF:', err);
        if (typeof mostrarToastAviso === 'function') {
            mostrarToastAviso('Não foi possível ler os dados automaticamente do PDF.');
        }
    }
};
