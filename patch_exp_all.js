const fs = require('fs');
let content = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', 'utf8');

const strToReplaceList = `const resultado = c.formulario_resultado || '';
            statusBadge = \`<span style="background:#dcfce7;color:#166534;padding:2px 7px;border-radius:12px;font-size:0.72rem;font-weight:600;display:inline-block;">✅ Finalizado (\${resultado})</span>\`;`;

const replacementList = `const resultado = c.formulario_resultado || '';
            const dataEnvioFormatada = c.data_envio_email ? new Date(c.data_envio_email).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
            statusBadge = \`<span style="background:#dcfce7;color:#166534;padding:2px 7px;border-radius:12px;font-size:0.72rem;font-weight:600;display:inline-block;">✅ Finalizado (\${resultado})</span><br><span style="font-size:0.65rem;color:#64748b;font-weight:500;margin-top:2px;display:inline-block;">\${dataEnvioFormatada}</span>\`;`;

content = content.replace(strToReplaceList, replacementList);

content = content.replace(
    'const comentariosAtual = form && form.comentarios ? form.comentarios : \'\';',
    'const comentariosAtual = form && form.comentarios ? form.comentarios : \'\';\n    const comentariosRhAtual = form && form.respostas && form.respostas.comentarios_rh ? form.respostas.comentarios_rh : \'\';'
);

const strModalHtml1 = `<div style="flex:2;min-width:200px;">
                            <span style="font-size:0.75rem;color:#94a3b8;font-weight:600;display:block;margin-bottom:4px;">COMENTÁRIOS</span>
                            <textarea id="exp-comentarios" name="comentarios" rows="3" style="width:100%;padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;resize:vertical;box-sizing:border-box;" \${situacao === 'finalizado' && !isRH ? 'disabled' : ''}>\${comentariosAtual}</textarea>
                        </div>`;

const repModalHtml1 = `<div style="flex:2;min-width:200px;">
                            <span style="font-size:0.75rem;color:#94a3b8;font-weight:600;display:block;margin-bottom:4px;">COMENTÁRIOS</span>
                            <textarea id="exp-comentarios" name="comentarios" rows="3" style="width:100%;padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;resize:vertical;box-sizing:border-box;" \${situacao === 'finalizado' && !isRH ? 'disabled' : ''}>\${comentariosAtual}</textarea>
                        </div>
                        \${situacao === 'finalizado' && isRH ? \`
                        <div style="flex:1;min-width:200px;">
                            <span style="font-size:0.75rem;color:#94a3b8;font-weight:600;display:block;margin-bottom:4px;">MOTIVO DA ALTERAÇÃO (RH)</span>
                            <textarea id="exp-comentarios-rh" name="comentarios_rh" rows="3" style="width:100%;padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;resize:vertical;box-sizing:border-box;" placeholder="Justifique caso altere o resultado...">\${comentariosRhAtual}</textarea>
                        </div>
                        \` : ''}`;

content = content.replace(strModalHtml1, repModalHtml1);

const strModalBtn = `<div>
                        <button type="button" onclick="reenviarEmailExperiencia(\${colab.id}, this)" style="padding:0.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#475569;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                            <i class="ph ph-envelope-simple"></i> Reenviar E-mail de Formulário para Gestor
                        </button>
                    </div>`;

const repModalBtn = `<div>
                        \${situacao !== 'finalizado' ? \`
                        <button type="button" onclick="reenviarEmailExperiencia(\${colab.id}, this)" style="padding:0.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#475569;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                            <i class="ph ph-envelope-simple"></i> Reenviar E-mail de Formulário para Gestor
                        </button>
                        \` : ''}
                    </div>`;

content = content.replace(strModalBtn, repModalBtn);

// Delete the end of the file
const splitTag = "window.renderPublicExpForm = function(colab, form, token) {";
const parts = content.split(splitTag);
const beforeRenderPublic = parts[0];

fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', beforeRenderPublic);
console.log('Done replacements.');
