window.renderASOTab = function (container, filteredDocs) {
    const selected = window.tabPersistence ? window.tabPersistence['aso_year'] : null;
    window.lastASODocs = filteredDocs;
    const optionsHtml = getAnosAdmissaoOptions(selected);

    // Dados do envio anterior (se houver)
    const emailEnviado = viewedColaborador ? viewedColaborador.aso_email_enviado : null;
    const exameData = viewedColaborador ? viewedColaborador.aso_exame_data : null;
    const noticeHtml = emailEnviado
        ? `<div style="display:flex; align-items:center; flex-wrap:wrap; gap:8px; background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:10px; padding:10px 14px; margin-bottom:1rem; font-size:0.85rem; font-weight:600;">
               <div style="display:flex; align-items:center; gap:6px; color:#059669;">
                   <i class="ph ph-check-circle" style="font-size:1.2rem;"></i>
                   <span>E-mail enviado para a IACI em <strong>${emailEnviado}</strong></span>
               </div>
               ${exameData ? `<span style="color:#64748b;">-</span><div style="display:flex; align-items:center; gap:4px; color:#1d4ed8;"><i class="ph ph-calendar-blank" style="font-size:1.1rem;"></i> <span>Exame agendado: <strong>${exameData}</strong></span></div>` : ''}
           </div>`
        : '';

    const selectorHtml = `
        <div id="cert-digital-banner-aso" style="border-radius:12px; padding:1.25rem; display:flex; gap:1.25rem; align-items:center; margin-bottom: 1.5rem; font-size:0.9rem; transition:all 0.3s ease;"></div>
        <div class="card p-3 mb-4 bg-light" style="display:flex; gap:1.5rem; align-items:center;">
            <label style="margin:0; font-weight:600;">Ano do ASO/Exames:</label>
            <select id="aso_year" class="form-control" style="padding:0.4rem; max-width:120px;" onchange="renderASOAno()">
                ${optionsHtml}
            </select>
        </div>

        <!-- Card IACI -->
        <div class="card p-3 mb-4" style="background:#f8fafc; border:1.5px dashed #e2e8f0; border-radius:12px;">
            <h4 style="font-size:0.9rem; color:#64748b; margin-bottom:0.75rem; font-weight:600;">
                <i class="ph ph-envelope-simple"></i> Enviar Solicitação de Exame à IACI
            </h4>
            ${noticeHtml}
            <div style="display:flex; gap:0.75rem; align-items:flex-end; flex-wrap:wrap;">
                <div class="input-group" style="width:160px; flex-shrink:0; margin-bottom:0;">
                    <label style="font-size:0.75rem; font-weight:700;">Data Agendada</label>
                    <input type="date" id="aso-exame-data-tab" style="padding:0.5rem; font-size:0.85rem; height:38px;"
                           value="${exameData ? exameData.split('/').reverse().join('-') : ''}">
                </div>
                <div class="input-group" style="width:180px; flex-shrink:0; margin-bottom:0;">
                    <label style="font-size:0.75rem; font-weight:700;">Tipo de Exame</label>
                    <select id="aso-tipo-exame-tab" class="form-control" style="padding:0.5rem; font-size:0.85rem; height:38px;" onchange="document.getElementById('aso-nova-funcao-container').style.display = this.value === 'Troca de Função' ? 'block' : 'none';">
                        <option value="Admissional">Admissional</option>
                        <option value="Demissional">Demissional</option>
                        <option value="Retorno ao trabalho">Retorno ao trabalho</option>
                        <option value="Periódico">Periódico</option>
                        <option value="Troca de Função">Troca de Função</option>
                    </select>
                </div>
                <div class="input-group" id="aso-nova-funcao-container" style="display:none; width:180px; flex-shrink:0; margin-bottom:0;">
                    <label style="font-size:0.75rem; font-weight:700;">Nova Função</label>
                    <input type="text" id="aso-nova-funcao-tab" class="form-control" style="padding:0.5rem; font-size:0.85rem; height:38px;">
                </div>
                <div class="input-group" style="flex:1; min-width:200px; margin-bottom:0;">
                    <label style="font-size:0.75rem; font-weight:700;">Destinatário</label>
                    <input type="text" id="aso-email-dest-tab" value="recepcao@iacimedtrab.com.br;cobranca@iacimedtrab.com.br"
                           style="padding:0.5rem; font-size:0.85rem; height:38px;">
                </div>
                <button class="btn btn-primary" id="btn-enviar-aso-email-tab"
                        onclick="window.sendASOEmailTab()"
                        style="height:38px; white-space:nowrap; padding:0 1.2rem; display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-paper-plane-tilt"></i> Enviar Solicitação
                </button>
            </div>
        </div>

        <div id="aso_ano_container"></div>
    `;
    container.innerHTML = selectorHtml;
    // Injetar status do certificado digital
    if (typeof window.carregarStatusCertificado === 'function') { window.carregarStatusCertificado('cert-digital-banner-aso'); }
    renderASOAno();
}

// Função específica para envio pela aba ASO (não conflita com a de Admissão)
window.sendASOEmailTab = async function () {
    if (!viewedColaborador) { alert('Colaborador não selecionado.'); return; }

    const dataExame = document.getElementById('aso-exame-data-tab').value;
    const tipoExame = document.getElementById('aso-tipo-exame-tab').value;
    const destinatario = document.getElementById('aso-email-dest-tab').value;
    const novaFuncao = document.getElementById('aso-nova-funcao-tab')?.value || '';
    if (!dataExame) { alert('Selecione a data do exame.'); return; }
    if (tipoExame === 'Troca de Função' && !novaFuncao) { alert('Preencha a nova função.'); return; }

    const [y, m, d] = dataExame.split('-');
    const dt = `${d}/${m}/${y}`;
    const cargo = (viewedColaborador.cargo || '').toLowerCase();
    const tipoExameUpper = (tipoExame || '').toLowerCase();
    const isMotorista = cargo.includes('motorista');
    const tipoComExamesCompl = ['admissional', 'periódico', 'periodico', 'periódico'];
    const examesCompl = isMotorista && tipoComExamesCompl.some(t => tipoExameUpper.includes(t))
        ? 'Audiometria, Acuidade Visual, E.E.G, E.C.G e Glicemia.'
        : '';
    const exames = examesCompl ? `Exame Padrão\nExames Complementares: ${examesCompl}` : 'Exame Padrão';

    const novaFuncaoText = (tipoExame === 'Troca de Função' && novaFuncao) ? `\nNova Função: ${novaFuncao}` : '';
    const mailBody = `Título: Exame Médico\n\nSegue abaixo as informações para a realização do exame do colaborador.\n\nData: ${dt}\nNome: ${viewedColaborador.nome_completo || viewedColaborador.nome}\nCPF: ${viewedColaborador.cpf || '-'}\nFunção Atual: ${viewedColaborador.cargo || '-'}${novaFuncaoText}\nDepartamento: ${viewedColaborador.departamento || '-'}\n\nExames:\n${exames}\n\n⚠️ IMPORTANTE:\nApós o exame ficar pronto, favor enviar o documento por e-mail para: rh@americarental.com.br`;

    const btn = document.getElementById('btn-enviar-aso-email-tab');
    const originalContent = btn.innerHTML;
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';

        const res = await apiPost('/send-aso-email', {
            colaborador_id: viewedColaborador.id,
            email_to: destinatario.replace(/;/g, ','),
            data_exame: dataExame,
            tipo_exame: tipoExame,
            nova_funcao: novaFuncao,
            cc: ['rh@americarental.com.br', 'rh2@americarental.com.br']
        });

        if (res.sucesso) {
            alert('✅ E-mail enviado com sucesso para a IACI!');
            // Recarregar aba para mostrar aviso
            viewedColaborador.aso_email_enviado = res.data_envio;
            viewedColaborador.aso_exame_data = res.data_agendada;
            if (res.new_doc && typeof currentDocs !== 'undefined') {
                currentDocs.push(res.new_doc);
            }
            const activeTab = document.querySelector('#tabs-list li.active');
            if (activeTab) renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
        } else {
            throw new Error(res.error || 'Erro no servidor');
        }
    } catch (e) {
        if (confirm(`Não foi possível enviar automaticamente. Erro do Servidor:\n\n${e.message}\n\nDeseja abrir seu e-mail com o texto preenchido?`)) {
            window.location.href = `mailto:${destinatario}?cc=rh@americarental.com.br,rh2@americarental.com.br&subject=Exame Médico - ${viewedColaborador.nome_completo || viewedColaborador.nome}&body=${encodeURIComponent(mailBody)}`;
        }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Enviar Solicitação'; }
    }
};



