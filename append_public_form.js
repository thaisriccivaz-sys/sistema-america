const fs = require('fs');

const publicFormStr = `
window.renderPublicExpForm = function(colab, form, token) {
    let html = \`
        <div style="margin-bottom:2rem; border-bottom:1px solid #e2e8f0; padding-bottom:1rem;">
            <p style="margin:0; color:#64748b; font-weight:600; text-transform:uppercase; font-size:0.85rem;">Colaborador</p>
            <h3 style="margin:0; color:#1e293b; font-size:1.25rem;">\${colab.nome_completo}</h3>
            <p style="margin:4px 0 0; color:#475569;">\${colab.cargo || ''} - \${colab.departamento || ''}</p>
        </div>
    \`;

    const dpt = colab.departamento || '';
    let formConfig = null;
    let fallback = null;
    for (const [key, val] of Object.entries(FORMULARIOS_POR_DEPARTAMENTO)) {
        if (dpt.toLowerCase().includes(key.toLowerCase())) formConfig = val;
        if (key === 'Geral') fallback = val;
    }
    if (!formConfig) formConfig = fallback;

    if (!formConfig) {
        html += \`<div style="padding:1rem;background:#fee2e2;color:#991b1b;border-radius:8px;">Formulário não configurado para o departamento: \${dpt}</div>\`;
        document.getElementById('public-exp-content').innerHTML = html;
        return;
    }

    const disableEdit = form && form.situacao === 'finalizado';

    html += \`<form id="public-exp-form-element" onsubmit="window.submitPublicExpForm(event, '\${token}')">
            <input type="hidden" name="colaborador_id" value="\${colab.id}">
            <input type="hidden" name="form_id" value="\${form ? form.id : ''}">
    \`;

    let itemGlobalIdx = 0;
    
    html += \`
        <div style="background:#f8fafc;border-radius:10px;padding:0.75rem 1.25rem;margin-bottom:1.25rem;border:1px solid #e2e8f0;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <span style="font-size:0.75rem;font-weight:700;color:#475569;margin-right:4px;">LEGENDA:</span>
            <span style="background:#dc2626;color:#fff;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">1 Muito Ruim</span>
            <span style="background:#ea580c;color:#fff;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">2 Ruim</span>
            <span style="background:#ca8a04;color:#fff;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">3 Médio</span>
            <span style="background:#65a30d;color:#fff;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">4 Bom</span>
            <span style="background:#16a34a;color:#fff;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">5 Muito Bom</span>
        </div>
    \`;

    formConfig.secoes.forEach((secao, si) => {
        let secaoHtml = \`
            <div style="margin-bottom:1.5rem;">
                <div style="background:#1e3a5f;color:#fff;padding:0.6rem 1rem;border-radius:8px;font-weight:700;font-size:0.85rem;letter-spacing:0.5px;margin-bottom:0.75rem;display:flex;justify-content:space-between;align-items:center;">
                    <span>\${secao.nome}</span>
                    <span style="font-size:0.75rem;font-weight:400;opacity:0.8;">Total: <span id="public-secao-total-\${si}" style="font-weight:700;">0</span> / \${secao.itens.length * 5}</span>
                </div>
                <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;min-width:600px;">
                    <thead><tr>
                        <th style="text-align:left;padding:8px 12px;background:#f1f5f9;color:#475569;font-weight:600;border:1px solid #e2e8f0;">Pontos Avaliados</th>
                        <th style="width:240px;text-align:center;padding:8px 12px;background:#f1f5f9;color:#475569;font-weight:600;border:1px solid #e2e8f0;">Nota (1-5)</th>
                        <th style="width:200px;text-align:left;padding:8px 12px;background:#f1f5f9;color:#475569;font-weight:600;border:1px solid #e2e8f0;">Obs.</th>
                    </tr></thead>
                    <tbody>
        \`;

        secao.itens.forEach((item, ii) => {
            const idx = itemGlobalIdx++;
            const nota = form && form.respostas && form.respostas[\`nota_\${idx}\`] !== undefined ? parseInt(form.respostas[\`nota_\${idx}\`]) : 0;
            const obs = form && form.respostas && form.respostas[\`obs_\${idx}\`] ? form.respostas[\`obs_\${idx}\`] : '';

            const scoreColors = ['', '#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#16a34a'];
            const scoreLabels = ['', '1', '2', '3', '4', '5'];

            let botoesNota = '';
            if (disableEdit) {
                const cor = nota >= 1 && nota <= 5 ? scoreColors[nota] : '#94a3b8';
                const label = nota >= 1 && nota <= 5 ? scoreLabels[nota] : '-';
                botoesNota = \`
                    <input type="hidden" name="nota_\${idx}" id="public-nota-input-\${idx}" value="\${nota}">
                    <span style="display:inline-block;width:36px;height:36px;border-radius:50%;background:\${cor};color:#fff;font-weight:800;font-size:1rem;line-height:36px;text-align:center;">\${label}</span>
                \`;
            } else {
                botoesNota = \`<input type="hidden" name="nota_\${idx}" id="public-nota-input-\${idx}" value="\${nota}">
                <div style="display:flex;gap:4px;justify-content:center;">\` +
                [1,2,3,4,5].map(n => {
                    const cor = scoreColors[n];
                    const selected = nota === n ? \`box-shadow:0 0 0 3px \${cor}50;transform:scale(1.15);\` : 'opacity:0.4;';
                    return \`<button type="button" onclick="selecionarPublicNotaExp(\${idx}, \${n}, \${si})" 
                        id="public-nota-btn-\${idx}-\${n}"
                        style="width:34px;height:34px;border-radius:50%;background:\${cor};color:#fff;border:2px solid \${cor};font-weight:800;font-size:0.85rem;cursor:pointer;transition:all 0.15s;\${selected}">\${n}</button>\`;
                }).join('') +
                \`</div>\`;
            }

            secaoHtml += \`
                <tr>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#334155;">\${item}</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">
                        \${botoesNota}
                    </td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;">
                        <input type="text" name="obs_\${idx}" value="\${obs}" \${disableEdit ? 'disabled' : ''}
                            style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;outline:none;box-sizing:border-box;\${disableEdit ? 'background:#f8fafc;' : ''}">
                    </td>
                </tr>
            \`;
        });

        secaoHtml += \`</tbody></table></div></div>\`;
        html += secaoHtml;
    });

    const totalItens = itemGlobalIdx;
    const pontuacaoAtual = form && form.pontuacao !== undefined ? form.pontuacao : 0;
    const situacaoAtual = form && form.situacao_avaliacao ? form.situacao_avaliacao : '';
    const comentariosAtual = form && form.comentarios ? form.comentarios : '';

    html += \`
        <div style="background:#f1f5f9; padding:1.5rem; border-radius:8px; margin-bottom:1.5rem; display:flex; flex-wrap:wrap; gap:1.5rem; align-items:flex-start;">
            <div style="flex:1; min-width:150px; text-align:center;">
                <p style="margin:0 0 8px; font-size:0.85rem; font-weight:700; color:#475569;">PONTUAÇÃO TOTAL</p>
                <div id="public-exp-pontuacao-total" style="font-size:2.5rem; font-weight:800; color:#1d4ed8;">\${pontuacaoAtual}</div>
                <div style="color:#64748b; font-size:0.85rem; font-weight:600;">/ \${totalItens * 5}</div>
                <input type="hidden" name="pontuacao" id="public-exp-pontuacao-val" value="\${pontuacaoAtual}">
            </div>
            <div style="flex:2; min-width:200px;">
                <p style="margin:0 0 8px; font-size:0.85rem; font-weight:700; color:#475569;">O COLABORADOR FOI APROVADO OU REPROVADO?</p>
                <select id="public-exp-situacao-avaliacao" name="situacao_avaliacao" style="width:100%; padding:0.75rem; border:1px solid #cbd5e1; border-radius:8px; font-size:1rem; font-weight:600; outline:none;" \${disableEdit ? 'disabled' : ''} required>
                    <option value="">Selecione o Resultado...</option>
                    <option value="Aprovado" \${situacaoAtual === 'Aprovado' ? 'selected' : ''}>✅ Aprovado (Deverá ser efetivado)</option>
                    <option value="Reprovado" \${situacaoAtual === 'Reprovado' ? 'selected' : ''}>❌ Reprovado (Deverá ser desligado)</option>
                </select>
                <p style="font-size:0.75rem; color:#64748b; margin-top:6px;">A decisão final é do avaliador, independente da nota.</p>
            </div>
            <div style="flex:3; min-width:250px;">
                <p style="margin:0 0 8px; font-size:0.85rem; font-weight:700; color:#475569;">COMENTÁRIOS / OBSERVAÇÕES DO RESPONSÁVEL</p>
                <textarea name="comentarios" rows="3" style="width:100%; padding:0.75rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; outline:none; resize:vertical; box-sizing:border-box;" \${disableEdit ? 'disabled' : ''} placeholder="Opcional">\${comentariosAtual}</textarea>
            </div>
        </div>
    \`;

    if (!disableEdit) {
        html += \`
            <div style="padding-top:1rem; border-top:1px solid #e2e8f0; text-align:right;">
                <button type="submit" class="btn btn-primary" style="padding:12px 24px; font-size:1.1rem; font-weight:600;">
                    <i class="ph ph-paper-plane-tilt"></i> Enviar Avaliação Final
                </button>
            </div>
        \`;
    }

    html += \`</form>\`;
    
    document.getElementById('public-exp-content').innerHTML = html;
    
    if(!disableEdit) {
        setTimeout(window.calcPublicExpScore, 100);
    }
};

const _publicScoreColors = ['', '#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#16a34a'];
window.selecionarPublicNotaExp = function(idx, nota, secaoIdx) {
    const hidden = document.getElementById(\`public-nota-input-\${idx}\`);
    if (hidden) hidden.value = nota;
    for (let n = 1; n <= 5; n++) {
        const btn = document.getElementById(\`public-nota-btn-\${idx}-\${n}\`);
        if (!btn) continue;
        if (n === nota) {
            btn.style.opacity = '1';
            btn.style.boxShadow = \`0 0 0 3px \${_publicScoreColors[n]}50\`;
            btn.style.transform = 'scale(1.15)';
        } else {
            btn.style.opacity = '0.4';
            btn.style.boxShadow = '';
            btn.style.transform = 'scale(1)';
        }
    }
    window.calcPublicExpScore();
};

window.calcPublicExpScore = function() {
    const frm = document.getElementById('public-exp-form-element');
    if(!frm) return;
    const inputs = frm.querySelectorAll('input[name^="nota_"]');
    let total = 0;
    inputs.forEach(inp => {
        const v = parseFloat(inp.value);
        if (!isNaN(v) && v > 0) total += v;
    });
    
    const el = document.getElementById('public-exp-pontuacao-total');
    if (el) {
        el.textContent = total.toFixed(0);
        const pct = total / (inputs.length * 5);
        el.style.color = pct >= 0.8 ? '#16a34a' : pct >= 0.6 ? '#65a30d' : pct >= 0.4 ? '#ca8a04' : pct >= 0.2 ? '#ea580c' : '#dc2626';
    }
    document.getElementById('public-exp-pontuacao-val').value = total;
    
    // Atualizar totais por seção
    document.querySelectorAll('[id^="public-secao-total-"]').forEach(secEl => {
        let secSum = 0;
        const secaoDiv = secEl.closest('[style*="margin-bottom:1.5rem"]');
        if (secaoDiv) {
            secaoDiv.querySelectorAll('input[name^="nota_"]').forEach(inp => {
                const v = parseFloat(inp.value);
                if (!isNaN(v) && v > 0) secSum += v;
            });
        }
        secEl.textContent = secSum;
    });
};

window.submitPublicExpForm = async function(e, token) {
    e.preventDefault();
    const frm = e.target;
    
    // Verificar se todas as notas foram preenchidas
    const inputs = frm.querySelectorAll('input[name^="nota_"]');
    for (let i = 0; i < inputs.length; i++) {
        if (!inputs[i].value || inputs[i].value === '0') { 
            Swal.fire('Atenção', 'Por favor, avalie (de 1 a 5) todos os pontos listados antes de enviar.', 'warning');
            return; 
        }
    }
    
    window.calcPublicExpScore();
    
    const fData = new FormData(frm);
    const payload = {
        respostas: {},
        pontuacao: parseFloat(fData.get('pontuacao')),
        situacao_avaliacao: fData.get('situacao_avaliacao'),
        comentarios: fData.get('comentarios') || ''
    };
    
    // Send all inputs starting with nota_ and obs_
    for (let [key, val] of fData.entries()) {
        if (key.startsWith('nota_') || key.startsWith('obs_')) {
            payload.respostas[key] = val;
        }
    }
    
    try {
        const btn = frm.querySelector('button[type="submit"]');
        if(btn) { btn.disabled = true; btn.innerHTML = 'Enviando...'; }
        
        const res = await fetch(\`/api/experiencia/publico/submit?token=\${token}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const ans = await res.json();
        
        if (res.ok) {
            Swal.fire({
                title: 'Avaliação Recebida!',
                text: 'Muito obrigado por enviar sua avaliação.',
                icon: 'success',
                confirmButtonText: 'Concluir',
                confirmButtonColor: '#1d4ed8'
            }).then(() => {
                document.getElementById('public-exp-content').innerHTML = \`
                    <div style="text-align:center; padding: 2rem;">
                        <i class="ph ph-check-circle" style="font-size:4rem; color:#059669;"></i>
                        <h3 style="margin-top:1rem; color:#1e40af;">Avaliação Preenchida com Sucesso!</h3>
                        <p style="color:#64748b; margin-top:0.5rem;">Responsável: <b>\${ans.responsavel_nome || 'Liderança'}</b></p>
                        <p style="color:#64748b;">Colaborador: <b>\${ans.colaborador_nome}</b></p>
                        <div style="margin-top:2rem; color:#94a3b8; font-size:0.9rem;">
                            Você pode fechar esta aba com segurança.
                        </div>
                    </div>
                \`;
            });
        } else {
            Swal.fire('Erro', ans.error || 'Tente novamente.', 'error');
            if(btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Enviar Avaliação Final'; }
        }
    } catch(err) {
        console.error(err);
        Swal.fire('Erro', 'Erro de conexão com o servidor.', 'error');
        const btn = frm.querySelector('button[type="submit"]');
        if(btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Enviar Avaliação Final'; }
    }
};
`;

fs.appendFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', publicFormStr);
console.log('Public form appended successfully!');
