const fs = require('fs');
let code = fs.readFileSync('frontend/index.html', 'utf8');

// The first modal starts at line 366 (approx). We will find the first <!-- Modal Gerar MTR -->
const firstModalStart = code.indexOf('<!-- Modal Gerar MTR -->');
const secondModalStart = code.indexOf('<!-- Modal Gerar MTR -->', firstModalStart + 10);

if (secondModalStart > -1) {
    // There is a second modal. Let's find its end. It probably ends before </section> <!-- VIEW: CLIENTES ITINERANTES -->
    const endSection = code.indexOf('</section>', secondModalStart);
    if (endSection > -1) {
        code = code.slice(0, secondModalStart) + code.slice(endSection);
        console.log('Removed duplicate modal.');
    }
}

// Now let's inject the missing fields into the first modal.
// They should probably go before the Destinador block.
const destinadorBlock = `<div style="grid-column:1/-1;border-top:1px solid #e2e8f0;padding-top:1rem;margin-top:0.5rem;">
                                        <p style="font-size:0.8rem;font-weight:700;color:#475569;margin:0 0 0.75rem;text-transform:uppercase;letter-spacing:0.05em;">Destinador</p>
                                    </div>`;
const missingFields = `
                                    <div style="grid-column:1/-1;border-top:1px solid #e2e8f0;padding-top:1rem;margin-top:0.5rem;">
                                        <p style="font-size:0.8rem;font-weight:700;color:#475569;margin:0 0 0.75rem;text-transform:uppercase;letter-spacing:0.05em;">Transporte</p>
                                    </div>
                                    <div>
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Data de Expedição *</label>
                                        <input type="date" id="mtr-data-expedicao" required style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">
                                    </div>
                                    <div>
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Motorista *</label>
                                        <input type="text" id="mtr-motorista" required placeholder="Nome do motorista" style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">
                                    </div>
                                    <div>
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Placa do Veículo *</label>
                                        <input type="text" id="mtr-placa" required placeholder="Ex: ABC1D23" style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">
                                    </div>
`;

if (!code.includes('id="mtr-data-expedicao"')) {
    code = code.replace(destinadorBlock, missingFields + '\n' + destinadorBlock);
    console.log('Added missing fields.');
}

fs.writeFileSync('frontend/index.html', code);
