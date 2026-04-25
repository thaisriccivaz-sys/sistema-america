const fs = require('fs');
let content = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', 'utf8');

const oldHeader = `<div style="margin-bottom:2rem; border-bottom:1px solid #e2e8f0; padding-bottom:1rem;">
            <p style="margin:0; color:#64748b; font-weight:600; text-transform:uppercase; font-size:0.85rem;">Colaborador</p>
            <h3 style="margin:0; color:#1e293b; font-size:1.25rem;">\${colab.nome_completo}</h3>
            <p style="margin:4px 0 0; color:#475569;">\${colab.cargo || ''} - \${colab.departamento || ''}</p>
        </div>`;

const newHeader = `<div style="margin-bottom:2rem; border-bottom:1px solid #e2e8f0; padding-bottom:1rem;">
            <p style="margin:0 0 12px 0; color:#64748b; font-weight:600; text-transform:uppercase; font-size:0.85rem;">Colaborador</p>
            <div style="display:flex;align-items:center;gap:12px;">
                \${colab.foto_base64 ? \`<img src="\${colab.foto_base64}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;">\` : \`<div style="width:56px;height:56px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#64748b;font-size:1.2rem;">\${colab.nome_completo.charAt(0)}</div>\`}
                <div>
                    <h3 style="margin:0; color:#1e293b; font-size:1.25rem;">\${colab.nome_completo}</h3>
                    <p style="margin:4px 0 0; color:#475569;">\${colab.cargo || ''} - \${colab.departamento || ''}</p>
                </div>
            </div>
        </div>`;

content = content.replace(oldHeader, newHeader);

// In case we want to make sure it busts cache if the user refreshes:
// we already added a v=timestamp to avaliacao-publica.html, so it will load the new JS.

fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', content);
console.log('Photo added to public form header');
