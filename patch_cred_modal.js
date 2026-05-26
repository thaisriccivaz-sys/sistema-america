const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

// Find the view
const viewStart = html.indexOf('<section id="view-logistica-credenciamento"');
const headerStart = html.indexOf('<div class="page-header"', viewStart);
const headerEnd = html.indexOf('</div>\r\n                    </div>\r\n\r\n                    <div style="display: grid', headerStart);

// We need to inject the button in the header
const newHeader = `                    <div class="page-header flex-between" style="margin-bottom: 2rem;">
                        <div>
                            <h2 style="font-size: 1.5rem; color: #1e293b; font-weight: bold; margin-bottom: 0.2rem;"><i class="ph ph-identification-card" style="margin-right:8px; color:#2d9e5f;"></i> Credenciamento de Equipe e Frota</h2>
                            <p style="color: #64748b; font-size: 0.95rem;">Gere um link temporário com documentos para enviar aos clientes.</p>
                        </div>
                        <div>
                            <button class="btn btn-primary" onclick="window.abrirModalNovoCredenciamento()" style="display:flex; align-items:center; gap:8px;">
                                <i class="ph ph-plus"></i> Novo Credenciamento
                            </button>
                        </div>
                    </div>`;

// Extract the grid
const gridStart = html.indexOf('<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">', viewStart);
const gridEnd = html.indexOf('<!-- NOVO: Histórico de Envios -->', gridStart);

const gridContent = html.substring(gridStart, gridEnd).trim();

// Create the modal
const newModal = `
    <!-- MODAL: NOVO CREDENCIAMENTO (TELA CHEIA) -->
    <div id="modal-novo-credenciamento" class="modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9998; align-items:center; justify-content:center; padding:1rem;">
        <div style="background:#fff; border-radius:12px; width:100%; max-width:1100px; height:95vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,0.2);">
            <div style="padding:1rem 1.5rem; border-bottom:1.5px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border-radius:12px 12px 0 0;">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <i class="ph ph-identification-card" style="color:#2d9e5f; font-size:1.4rem;"></i>
                    <h3 style="margin:0; color:#0f172a; font-size:1.15rem; font-weight:700;">Novo Credenciamento</h3>
                </div>
                <button onclick="window.fecharModalNovoCredenciamento()" style="background:#f1f5f9; border:1px solid #e2e8f0; width:32px; height:32px; border-radius:8px; color:#64748b; cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center;"><i class="ph ph-x"></i></button>
            </div>
            <div style="padding:1.5rem; overflow-y:auto; flex:1;">
                ${gridContent}
            </div>
        </div>
    </div>
`;

// Replace the header and remove the grid
html = html.substring(0, headerStart) + newHeader + '\n\n                    ' + html.substring(gridEnd);

// Append the modal at the end just before the other cred modals
const modalAnchor = '<!-- MODAL: SELECIONAR COLABORADOR PARA CREDENCIAMENTO -->';
html = html.replace(modalAnchor, newModal + '\n    ' + modalAnchor);

fs.writeFileSync('frontend/index.html', html, 'utf8');
console.log('DOM transformation complete.');
