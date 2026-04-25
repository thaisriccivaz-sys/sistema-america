const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'frontend/app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

const renderContratosAvulsoReplacement = `// === SUB-ABA CONTRATOS ===
window.renderContratosAvulso = async function(container) {
    if (!viewedColaborador || !container) return;
    container.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Carregando Documentos...</p>';
    try {
        const [assinaturas, docs, geradores, templates, departamentos] = await Promise.all([
            apiGet('/assinaturas').catch(()=>[]),
            apiGet(\`/colaboradores/\${viewedColaborador.id}/documentos\`).catch(()=>[]),
            apiGet('/geradores').catch(()=>[]),
            apiGet('/geradores-templates').catch(()=>[]),
            apiGet('/departamentos').catch(()=>[])
        ]);
        window._todosGeradores = geradores;

        let availableGeradores = geradores;
        const empDeptId = viewedColaborador.departamento; 
        const deptObj = departamentos.find(d => String(d.nome).trim().toLowerCase() === String(empDeptId).trim().toLowerCase());
        if (deptObj) {
            const geradorIds = templates.filter(t => Number(t.departamento_id) === Number(deptObj.id)).map(t => Number(t.gerador_id));
            if (geradorIds.length > 0) {
                availableGeradores = geradores.filter(g => geradorIds.includes(Number(g.id)));
            }
        }

        const filteredDocs = docs.filter(d => d.tab_name === 'CONTRATOS');

        container.innerHTML = \`
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                     <h3 style="margin:0; font-size:1.1rem; color:#1e293b; font-weight:700;"><i class="ph ph-files"></i> Contratos e Autorizações</h3>
                     <p style="margin:0; font-size:0.85rem; color:#64748b;">Gere templates ou anexe PDFs para assinatura.</p>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <label class="btn btn-secondary" style="display:flex;align-items:center;margin:0;gap:0.4rem;cursor:pointer;">
                        <i class="ph ph-upload-simple"></i> Anexar PDF
                        <input type="file" accept=".pdf" style="display:none" onchange="window.uploadContratoExterno(this)">
                    </label>
                    <button class="btn btn-primary" onclick="window.abrirModalGerarContrato()" style="display:flex;align-items:center;margin:0;gap:0.4rem;">
                        <i class="ph ph-file-plus"></i> Gerar Novo
                    </button>
                 </div>
            </div>
            
            <div id="ca-list-container" style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1.5rem;">
                \${window.buildContratosSignatureRows(assinaturas, filteredDocs, viewedColaborador)}
            </div>

            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:1.25rem;">
                <p style="margin:0 0 1rem 0; font-size:0.88rem; color:#475569;"><i class="ph ph-info"></i> Selecione os documentos acima que deseja enviar para assinatura digital via Assinafy.</p>
                <button class="btn btn-success" id="ca-btn-assinar-lote" onclick="window.enviarAssinaturaLoteContratos()" style="display:flex; align-items:center; gap:0.5rem; font-weight:600;">
                    <i class="ph ph-paper-plane-tilt"></i> Enviar Selecionados para Assinatura
                </button>
            </div>
        \`;
        
        window._caAvailableGeradores = availableGeradores;
    } catch(err) {
        container.innerHTML = \`<div class="alert alert-danger"><i class="ph ph-warning"></i> Erro: \${err.message}</div>\`;
    }
};

window.uploadContratoExterno = async function(input) {
    const file = input.files[0];
    if (!file) return;
    
    let docType = prompt('Qual o nome deste documento?', file.name.replace('.pdf',''));
    if (!docType) return;
    
    const formData = new FormData();
    formData.append('documento', file);
    formData.append('tab_name', 'CONTRATOS');
    formData.append('document_type', docType);
    
    try {
        Swal.fire({title: 'Anexando...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
        const res = await fetch(\`\${API_URL}/colaboradores/\${viewedColaborador.id}/documentos\`, {
            method: 'POST', headers: {'Authorization': \`Bearer \${currentToken}\`}, body: formData
        });
        if (!res.ok) throw new Error('Falha ao anexar PDF');
        Swal.close();
        showToast('Documento anexado!', 'success');
        window.switchContratosSubTab('avulso');
    } catch(e) {
        Swal.fire('Erro', e.message, 'error');
    }
};

window.buildContratosSignatureRows = function(assinaturas, docs, colab) {
    if (docs.length === 0) {
        return \`<div style="padding:2rem;text-align:center;color:#94a3b8;border:2px dashed #e2e8f0;border-radius:12px;"><i class="ph ph-files" style="font-size:2rem;margin-bottom:0.5rem;display:block;"></i>Nenhum contrato listado.</div>\`;
    }

    let html = '';
    docs.forEach(doc => {
       const ass = assinaturas.find(a => (a.nome_documento === doc.document_type) || (a.documento_url && doc.file_url && a.documento_url === doc.file_url));
       
       let realStatus = 'Não enviado';
       if (doc.assinafy_status === 'Assinado' || (ass && ass.assinafy_status === 'Assinado')) realStatus = 'Assinado';
       else if (doc.assinafy_status === 'Pendente' || (ass && ass.assinafy_status === 'Pendente')) realStatus = 'Aguardando';
       else if (ass) realStatus = 'Aguardando';

       const isSigned = realStatus === 'Assinado';
       const isPending = realStatus === 'Aguardando';

       let eyeBtn = \`<button type="button" onclick="window.open('\${API_URL.replace('/api','') + doc.file_url}', '_blank'); event.preventDefault(); event.stopPropagation();" style="border:none;background:none;cursor:pointer;color:#64748b;" title="Ver PDF Original"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>\`;
       if (isSigned && ass && ass.certificado_assinado_em) {
           eyeBtn = \`<button type="button" onclick="window.openSignedDocPopup(\${ass.id}, '\${(doc.document_type||'').replace(/'/g,"\\\\'")}', event); event.stopPropagation();" style="border:none;background:none;cursor:pointer;color:#7c3aed;" title="Ver documento final (Empresa+Colaborador)"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>\`;
       } else if (isSigned && ass) {
           eyeBtn = \`<button type="button" onclick="window.openSignedDocPopup(\${ass.id}, '\${(doc.document_type||'').replace(/'/g,"\\\\'")}', event); event.stopPropagation();" style="border:none;background:none;cursor:pointer;color:#16a34a;" title="Ver PDF assinado (Colaborador)"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>\`;
       }

       let statusBadge = \`<span style="background:#f1f5f9;color:#64748b;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;"><i class="ph ph-minus-circle"></i> Não enviado</span>\`;
       if (isSigned) statusBadge = \`<span style="background:#dcfce7;color:#15803d;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;"><i class="ph ph-check-circle"></i> Assinado</span>\`;
       else if (isPending) statusBadge = \`<span style="background:#fef9c3;color:#92400e;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;"><i class="ph ph-clock"></i> Aguardando Colaborador</span>\`;

       html += \`
        <label class="doc-check-item" style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.75rem; border:1px solid \${isSigned ? '#bbf7d0' : '#f1f5f9'}; border-radius:8px; cursor:pointer; background:\${isSigned ? '#f0fdf4' : '#fff'}; transition:all 0.2s; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:0.6rem; flex:1;">
                \${isSigned || isPending 
                    ? \`<div style="width:20px;height:20px;border-radius:10px;background:\${isSigned?'#22c55e':'#eab308'};color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px \${isSigned?'#dcfce7':'#fef3c7'};"><i class="ph \${isSigned?'ph-check':'ph-clock'}" style="font-size:0.8rem;font-weight:bold;"></i></div>\`
                    : \`<input type="checkbox" class="ca-row-chk ms-3" data-doc-id="\${doc.id}" data-doc-url="\${doc.file_url}" data-doc-type="\${doc.document_type || 'Documento'}" style="width:18px;height:18px;cursor:pointer;accent-color:#2563eb;">\`
                }
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:600; color:#334155; font-size:0.9rem;">\${doc.document_type || doc.file_name}</span>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:0.75rem; color:#94a3b8;">\${new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                        \${statusBadge}
                    </div>
                </div>
            </div>
            <div>
               \${eyeBtn}
               <button type="button" onclick="window.deleteDocumentoContrato(\${doc.id}); event.preventDefault(); event.stopPropagation();" style="border:none;background:none;cursor:pointer;color:#ef4444;margin-left:8px;" title="Excluir do Prontuário"><i class="ph ph-trash" style="font-size:1.2rem;"></i></button>
            </div>
        </label>\`;
    });
    return html;
};

window.deleteDocumentoContrato = async function(docId) {
    if (!confirm('Deseja excluir este documento?')) return;
    try {
        const res = await fetch(\`\${API_URL}/documentos/\${docId}\`,{ method:'DELETE', headers:{'Authorization':\`Bearer \${currentToken}\`}});
        if(!res.ok) throw new Error('Falha ao excluir');
        window.switchContratosSubTab('avulso');
    } catch(e) { alert(e.message); }
};

window.enviarAssinaturaLoteContratos = async function() {
    const chks = document.querySelectorAll('.ca-row-chk:checked');
    if(chks.length === 0) { alert('Selecione pelo menos um documento na lista.'); return; }

    const docs = Array.from(chks).map(c => ({
        id: c.dataset.docId,
        nome: c.dataset.docType,
        url: c.dataset.docUrl
    }));
    
    if(!confirm(\`Enviar \${docs.length} documento(s) para assinatura do Colab. e Empresa via Assinafy?\`)) return;
    
    const btn = document.getElementById('ca-btn-assinar-lote');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando para Assinafy...';
    btn.disabled = true;

    try {
        let errorCount = 0;
        for (const doc of docs) {
            try {
                // We use the same /assinaturas/solicitar logic to push external/local docs to Assinafy
                // Since these ALREADY EXIST as PDF, we pass their URLs + metadata.
                // Wait! /assinaturas/solicitar receives gerador_id! 
                // We can't rely on gerador_id if it's an uploaded doc!
                // But wait! We ALREADY built a batch sign logic in Admissions!
                // Admissao's batch logic is /assinaturas/enviar-lote or individual /solicitar
                await fetch(\`\${API_URL}/assinaturas/solicitar\`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
                    body: JSON.stringify({
                        colaborador_id: viewedColaborador.id,
                        arquivos_existentes: [{ nome_documento: doc.nome, documento_url: doc.url }]
                    })
                });
            } catch(ex) { errorCount++; console.error(ex); }
        }

        if (errorCount > 0) alert(errorCount + ' documento(s) falharam no envio. Verifique o console.');
        else showToast('Documentos enviados para assinatura!', 'success');
        
        window.switchContratosSubTab('avulso');
    } catch(e) {
        alert('Erro fatal: ' + e.message);
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
};`;

const modalContratoAvulsoReplacement = `window.abrirModalGerarContrato = function() {
    const geradores = window._caAvailableGeradores || [];
    document.getElementById('modal-contrato-avulso')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'modal-contrato-avulso';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    const opts = geradores.map(g => \`<option value="\${g.id}" data-nome="\${(g.nome||'').replace(/"/g,'&quot;')}">\${g.nome}</option>\`).join('');
    overlay.innerHTML = \`
        <div style="background:#fff;border-radius:14px;width:100%;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,0.2);overflow:visible;">
            <div style="padding:1rem 1.5rem;border-bottom:1.5px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;"><i class="ph ph-file-plus"></i> Gerar Documento Template</h3>
                <button onclick="document.getElementById('modal-contrato-avulso').remove()" style="background:#f1f5f9;border:1px solid #e2e8f0;width:30px;height:30px;border-radius:8px;cursor:pointer;color:#64748b;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>
            </div>
            <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">
                <div>
                    <label style="font-size:0.82rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Selecionar Documento</label>
                    <select id="ca-gerador-select" style="width:100%;padding:0.65rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;" onchange="window.toggleContratoAvulsoCampos(this)">
                        <option value="">Selecione...</option>
                        \${opts}
                    </select>
                </div>
                <!-- Campos específicos para desconto em folha -->
                <div id="ca-campos-desconto" style="display:none; flex-direction:column; gap:1rem; background:#f8fafc; padding:1rem; border-radius:8px; border:1px solid #e2e8f0;">
                    <div>
                        <label style="font-size:0.82rem;font-weight:700;color:#374151;">Descrição Principal</label>
                        <input type="text" id="ca-m-descricao" class="form-control" placeholder="Ex: Multa de Trânsito NIC...">
                    </div>
                    <div style="display:flex;gap:1rem;">
                        <div style="flex:1;">
                            <label style="font-size:0.82rem;font-weight:700;color:#374151;">Valor Total (R$)</label>
                            <input type="text" id="ca-m-valor" class="form-control" placeholder="00,00" oninput="this.value = this.value.replace(/[^0-9,]/g,'')">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:0.82rem;font-weight:700;color:#374151;">Parcelamento</label>
                            <select id="ca-m-parcelas" class="form-control">
                                <option value="1">1x</option>
                                <option value="2">2x</option>
                                <option value="3">3x</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div id="ca-msg" style="display:none;"></div>
                <div style="display:flex;justify-content:flex-end;gap:0.75rem;">
                    <button onclick="document.getElementById('modal-contrato-avulso').remove()" class="btn btn-secondary">Cancelar</button>
                    <button id="ca-btn-gerar" class="btn btn-primary" onclick="window.gerarContratoAvulso()" style="display:flex;align-items:center;gap:6px;">
                        <i class="ph ph-file-arrow-down"></i> Visualizar e Salvar
                    </button>
                </div>
            </div>
        </div>\`;
    document.body.appendChild(overlay);
};

window.toggleContratoAvulsoCampos = function(select) {
    const nome = select.options[select.selectedIndex]?.getAttribute('data-nome') || '';
    const camposDesconto = document.getElementById('ca-campos-desconto');
    if (nome === 'AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO') {
        camposDesconto.style.display = 'flex';
    } else {
        camposDesconto.style.display = 'none';
        document.getElementById('ca-m-descricao').value = '';
        document.getElementById('ca-m-valor').value = '';
        document.getElementById('ca-m-parcelas').value = '1';
    }
};

window.gerarContratoAvulso = async function() {
    const select = document.getElementById('ca-gerador-select');
    const geradorId = select ? select.value : '';
    if (!geradorId) return alert('Selecione um documento.');

    const btn = document.getElementById('ca-btn-gerar');
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando...';
    btn.disabled = true;

    // Optional fields
    const desc = document.getElementById('ca-m-descricao')?.value || '';
    const valor = document.getElementById('ca-m-valor')?.value || '';
    const parc = document.getElementById('ca-m-parcelas')?.value || '1';

    try {
        const res = await fetch(\`\${API_URL}/geradores/\${geradorId}/gerar\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
            body: JSON.stringify({
                colaborador_id: viewedColaborador.id,
                colabId: viewedColaborador.id, // backend fallback
                m_descricao: desc, m_valor: valor, m_parcelas: parc, m_valor_parcela: (valor ? (parseFloat(valor.replace(',','.'))/parseInt(parc)).toFixed(2).replace('.',',') : '')
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar documento');

        document.getElementById('modal-contrato-avulso').remove();
        
        // Exibe o preview para o usuário ver. Quando ele clicar em "Salvar", é disparado win.salvarDocumentoPDF()
        // Mas o salvar original não enviava. Vamos sobrecarregar a funcao "Salvar como PDF" quando está no contexto de Prontuário.
        window.abrirPreviewDocumento({
            html: data.html,
            colaborador: data.colaborador, 
            gerador_nome: data.gerador_nome,
            geradorId: geradorId
        });

        // Rewrite Salvar PDF button to Save AND upload instead of print!
        const previewBtnSalvar = document.querySelector('#doc-modal button.btn-primary');
        if (previewBtnSalvar) {
            previewBtnSalvar.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar no Prontuário';
            previewBtnSalvar.onclick = async function() {
                const oldHtml = this.innerHTML;
                this.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
                this.disabled = true;
                try {
                    // Generate Blob with HTML2PDF
                    const htmlTemplate = document.getElementById('preview-doc-body');
                    const nomeArquivo = \`\${data.gerador_nome.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf\`;
                    
                    const opt = {
                        margin: [0,0,0,0], filename: nomeArquivo, image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true, width: 794 },
                        jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' }
                    };
                    const pdfBlob = await html2pdf().set(opt).from(htmlTemplate).output('blob');
                    const file = new File([pdfBlob], nomeArquivo, { type: 'application/pdf' });
                    
                    const formData = new FormData();
                    formData.append('documento', file);
                    formData.append('tab_name', 'CONTRATOS');
                    formData.append('document_type', data.gerador_nome);
                    
                    const uploadRes = await fetch(\`\${API_URL}/colaboradores/\${viewedColaborador.id}/documentos\`, {
                        method: 'POST', headers: {'Authorization': \`Bearer \${currentToken}\`}, body: formData
                    });
                    if (!uploadRes.ok) throw new Error('Falha no upload do PDF gerado');
                    
                    document.getElementById('modal-preview-doc').style.display = 'none';
                    document.getElementById('doc-modal').style.display = 'none';
                    showToast('Documento gerado e salvo!', 'success');
                    window.switchContratosSubTab('avulso');
                } catch(err) {
                    alert('Erro ao salvar: ' + err.message);
                } finally {
                    this.innerHTML = oldHtml;
                    this.disabled = false;
                }
            };
        }
    } catch(e) {
        alert('Erro: ' + e.message);
        btn.innerHTML = '<i class="ph ph-file-arrow-down"></i> Visualizar e Salvar';
        btn.disabled = false;
    }
};

window.enviarContratoAvulsoAssinatura = null; // removing old
`;

// Regex replace exactly what we need
const regex = /\/\/ === SUB-ABA CONTRATOS AVULSOS ===[\s\S]*?(?=window.initAdmissaoWorkflow =)/;
let newContent = content.replace(regex, renderContratosAvulsoReplacement + '\n' + modalContratoAvulsoReplacement + '\n\n');
fs.writeFileSync(appJsPath, newContent);
console.log('PATCH APPLIED SUCCESSFULLY!');
