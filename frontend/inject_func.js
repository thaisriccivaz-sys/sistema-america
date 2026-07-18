const fs = require('fs');
let code = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/app.js', 'utf8');

const target = `window.verComprovanteEntrega = async function (entregaId) {`;
const inject = `window.verComprovantePresenca = async function (presencaId) {
    const existingModal = document.getElementById('modal-comprovante-presenca');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-comprovante-presenca';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = \`<div style="background:#fff;border-radius:16px;padding:2rem;min-width:300px;text-align:center;color:#64748b;">
        <i class="ph ph-spinner ph-spin" style="font-size:2rem;display:block;margin-bottom:8px;"></i> Carregando assinatura...
    </div>\`;
    document.body.appendChild(modal);

    try {
        const data = await apiGet(\`/treinamento-presenca/auditoria/\${presencaId}\`);
        if (!data || data.error) throw new Error(data?.error || 'Registro não encontrado');

        const assinaturaHtml = data.assinatura_base64
            ? \`<div style="margin-top:1.5rem;display:flex;gap:1.5rem;justify-content:center;flex-wrap:wrap;">
                <div style="text-align:center;">
                    <p style="font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Assinatura do Colaborador</p>
                    <div style="border:1.5px solid #e2e8f0;border-radius:10px;padding:8px;background:#f8fafc;display:inline-block;">
                        <img src="\${data.assinatura_base64}" style="max-width:340px;max-height:140px;border-radius:6px;" alt="Assinatura"/>
                    </div>
                </div>
                \${data.selfie_base64 ? \`
                <div style="text-align:center;">
                    <p style="font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Selfie da Presença</p>
                    <div style="border:1.5px solid #e2e8f0;border-radius:10px;padding:4px;background:#f8fafc;display:inline-block;">
                        <img src="\${data.selfie_base64}" style="max-width:200px;max-height:140px;border-radius:6px;object-fit:cover;" alt="Selfie"/>
                    </div>
                </div>\` : ''}
               </div>\`
            : \`<p style="color:#94a3b8;font-size:0.85rem;margin-top:1rem;text-align:center;"><i class="ph ph-signature"></i> Assinatura não disponível para este registro.</p>\`;

        const dtFormatada = data.data_conclusao
            ? new Date(data.data_conclusao).toLocaleDateString('pt-BR')
            : '—';

        modal.innerHTML = \`
        <div style="background:#fff;border-radius:16px;padding:0;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);">
            <div style="background:linear-gradient(135deg,#047857,#10b981);border-radius:16px 16px 0 0;padding:1.2rem 1.5rem;display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class="ph ph-chalkboard-teacher" style="color:#a7f3d0;font-size:1.4rem;"></i>
                    <div>
                        <h3 style="margin:0;color:#fff;font-size:1rem;font-weight:700;">Comprovante de Presença</h3>
                        <p style="margin:0;color:#a7f3d0;font-size:0.78rem;">\${data.treinamento_tipo || 'Treinamento'}</p>
                    </div>
                </div>
                <button onclick="document.getElementById('modal-comprovante-presenca').remove()"
                    style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>

            <div style="padding:1rem 1.5rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;flex-direction:column;gap:0.75rem;">
                <div style="display:flex;align-items:center;gap:5px;font-size:0.85rem;color:#475569;">
                    <i class="ph ph-user" style="color:#059669;"></i>
                    <strong>Colaborador:</strong> \${data.colaborador_nome || '—'}
                </div>
                <div style="display:flex;align-items:center;gap:5px;font-size:0.85rem;color:#475569;">
                    <i class="ph ph-book-open" style="color:#059669;"></i>
                    <strong>Tema:</strong> \${data.treinamento_nome || '—'}
                </div>
                <div style="display:flex;align-items:center;gap:5px;font-size:0.85rem;color:#475569;">
                    <i class="ph ph-calendar" style="color:#059669;"></i>
                    <strong>Data da assinatura:</strong> \${dtFormatada}
                </div>
                <div style="display:flex;align-items:center;gap:5px;font-size:0.85rem;color:#475569;">
                    <i class="ph ph-identification-card" style="color:#059669;"></i>
                    <strong>Instrutor:</strong> \${data.instrutor_nome || '—'}
                </div>
            </div>

            <div style="padding:1.5rem;">
                \${assinaturaHtml}
            </div>
            
            <div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;background:#f8fafc;border-radius:0 0 16px 16px;text-align:right;">
                <button onclick="document.getElementById('modal-comprovante-presenca').remove()" style="background:#e2e8f0;color:#475569;border:none;border-radius:6px;padding:8px 16px;font-weight:600;cursor:pointer;">Fechar</button>
            </div>
        </div>\`;
    } catch (e) {
        modal.innerHTML = \`<div style="background:#fff;border-radius:16px;padding:2rem;min-width:300px;text-align:center;">
            <i class="ph ph-warning-circle" style="font-size:3rem;color:#ef4444;margin-bottom:1rem;display:block;"></i>
            <h3 style="margin:0 0 0.5rem;color:#0f172a;">Erro</h3>
            <p style="color:#64748b;font-size:0.9rem;margin:0 0 1.5rem;">\${e.message}</p>
            <button onclick="document.getElementById('modal-comprovante-presenca').remove()" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:8px 24px;font-weight:600;cursor:pointer;">Fechar</button>
        </div>\`;
    }
};

window.verComprovanteEntrega = async function (entregaId) {`;

if (!code.includes('window.verComprovantePresenca =')) {
    code = code.replace(target, inject);
    fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/app.js', code, 'utf8');
    console.log('Function window.verComprovantePresenca added successfully!');
} else {
    console.log('Function window.verComprovantePresenca already exists.');
}
