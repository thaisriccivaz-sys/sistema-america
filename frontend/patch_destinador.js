const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const marker = 'id="mtr-observacao"';
const idx = html.indexOf(marker);
if (idx === -1) { console.log('ERRO: marcador não encontrado'); process.exit(1); }

// Encontrar o </div> que fecha o bloco da observação
const closeDiv = html.indexOf('</div>', idx);
if (closeDiv === -1) { console.log('ERRO: </div> não encontrado'); process.exit(1); }

const destinadorBlock = `
                                    <div style="grid-column:1/-1;border-top:1px solid #e2e8f0;padding-top:1rem;margin-top:0.5rem;">
                                        <p style="font-size:0.8rem;font-weight:700;color:#475569;margin:0 0 0.75rem;text-transform:uppercase;letter-spacing:0.05em;">Destinador</p>
                                    </div>
                                    <div style="grid-column:1/-1;">
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Nome do Destinador *</label>
                                        <input type="text" id="mtr-destinador-nome" required placeholder="Nome do destinador" style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">
                                    </div>
                                    <div>
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">CNPJ do Destinador *</label>
                                        <input type="text" id="mtr-destinador-cnpj" required placeholder="00.000.000/0001-00" style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">
                                    </div>
                                    <div>
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Cód. Unidade *</label>
                                        <input type="text" id="mtr-destinador-unidade" required placeholder="Ex: 19154" style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">
                                    </div>`;

const insertAt = closeDiv + '</div>'.length;
const newHtml = html.slice(0, insertAt) + destinadorBlock + html.slice(insertAt);
fs.writeFileSync('index.html', newHtml);
console.log('OK - campos de destinador inseridos após Observação');
