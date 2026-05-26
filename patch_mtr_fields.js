const fs = require('fs');

// 1. Modificar index.html para adicionar campos
let html = fs.readFileSync('frontend/index.html', 'utf8');
const searchHTML = `<div style="display:flex;gap:12px;">
                                        <div style="flex:1;">
                                            <label style="font-size:0.8rem;font-weight:600;color:#64748b;margin-bottom:4px;display:block;">Quantidade *</label>
                                            <input type="number" id="mtr-quantidade" class="form-control" step="0.01" required>
                                        </div>
                                        <div style="flex:1;">
                                            <label style="font-size:0.8rem;font-weight:600;color:#64748b;margin-bottom:4px;display:block;">Unidade *</label>
                                            <select id="mtr-unidade" class="form-control" required>
                                                <option value="TON">Toneladas (t)</option>
                                                <option value="KG">Quilogramas (kg)</option>
                                                <option value="L">Litros (l)</option>
                                                <option value="M3">Metros Cúbicos (m³)</option>
                                            </select>
                                        </div>
                                    </div>`;

const newHTML = searchHTML + `
                                    <div style="display:flex;gap:12px;margin-top:12px;">
                                        <div style="flex:1;">
                                            <label style="font-size:0.8rem;font-weight:600;color:#64748b;margin-bottom:4px;display:block;">Motorista *</label>
                                            <input type="text" id="mtr-motorista" class="form-control" placeholder="Nome do motorista" required>
                                        </div>
                                        <div style="flex:1;">
                                            <label style="font-size:0.8rem;font-weight:600;color:#64748b;margin-bottom:4px;display:block;">Placa do Veículo *</label>
                                            <input type="text" id="mtr-placa" class="form-control" placeholder="ABC1D23" required>
                                        </div>
                                        <div style="flex:1;">
                                            <label style="font-size:0.8rem;font-weight:600;color:#64748b;margin-bottom:4px;display:block;">Data de Expedição *</label>
                                            <input type="date" id="mtr-data-expedicao" class="form-control" required>
                                        </div>
                                    </div>`;

if (!html.includes('id="mtr-motorista"')) {
    html = html.replace(searchHTML, newHTML);
    fs.writeFileSync('frontend/index.html', html);
    console.log('index.html atualizado');
}

// 2. Modificar mtr.js para coletar e enviar
let mtrjs = fs.readFileSync('frontend/mtr.js', 'utf8');

if (!mtrjs.includes("document.getElementById('mtr-motorista').value")) {
    mtrjs = mtrjs.replace(
        "complementarDeId: document.getElementById('mtr-complementar-de').value || null,",
        "complementarDeId: document.getElementById('mtr-complementar-de').value || null,\n      motorista: document.getElementById('mtr-motorista').value,\n      placa: document.getElementById('mtr-placa').value,\n      dataExpedicao: document.getElementById('mtr-data-expedicao').value,"
    );
    // Add default values
    mtrjs = mtrjs.replace(
        "document.getElementById('mtr-destinador-unidade').value = '19154';",
        "document.getElementById('mtr-destinador-unidade').value = '19154';\n    document.getElementById('mtr-data-expedicao').value = new Date().toISOString().split('T')[0];\n    document.getElementById('mtr-motorista').value = 'MÁRCIO JORGE VILAR DA SILVA';\n    document.getElementById('mtr-placa').value = 'DPE5A75';"
    );
    fs.writeFileSync('frontend/mtr.js', mtrjs);
    console.log('mtr.js atualizado');
}

// 3. Modificar server.js
let serverjs = fs.readFileSync('backend/server.js', 'utf8');

// The function app.post('/api/mtr/gerar' ...
const serverReplace = `app.post('/api/mtr/gerar', authenticateToken, async (req, res) => {
  const { geradorNome, geradorCnpj, residuoCodigo, quantidade, unidade,
          acondicionamentoCodigo, estadoFisicoCodigo, tratamentoCodigo,
          observacao, complementarDeId,
          destinadorCnpj, destinadorUnidade, motorista, placa, dataExpedicao } = req.body;

  // Usar destinador do formulário ou fallback para o padrão BRK
  const destCnpj = (destinadorCnpj || SIGOR_DESTINADOR.cnpj).replace(/\\D/g, '');
  const destUnidade = parseInt(destinadorUnidade) || SIGOR_DESTINADOR.unidade;

  try {
    // Usar API de PRODUCAO agora que temos as credenciais corretas
    const endpoint = '/salvarManifestoLote';
    
    // De/Para de unidades básicas
    const mapaUnidade = { 'TON': 3, 'KG': 1, 'L': 21, 'M3': 2 };
    const uniCodigo = mapaUnidade[unidade] || parseInt(unidade) || 3;
    
    // America Rental CNPJ
    const transpCnpj = '03434448000101';
    const transpUnidade = 116064; 

    // Date in ms
    let dtExpedicao = Date.now();
    if (dataExpedicao) {
       dtExpedicao = new Date(dataExpedicao + 'T12:00:00Z').getTime();
    }

    const payload = [{
      seuCodigo: 'AR-' + Date.now().toString().slice(-8),
      nomeResponsavel: 'América Rental',
      nomeMotorista: motorista || 'MÁRCIO JORGE VILAR DA SILVA',
      placaVeiculo: (placa || 'DPE5A75').replace(/[^a-zA-Z0-9]/g, ''),
      dataExpedicao: dtExpedicao,
      transportador: { cpfCnpj: transpCnpj, unidade: transpUnidade },
      destinador: { cpfCnpj: destCnpj, unidade: destUnidade },
      gerador: { cpfCnpj: (geradorCnpj || '').replace(/\\D/g, ''), razaoSocial: geradorNome },
      observacoes: observacao || '',
      listaManifestoResiduos: [{
        resCodigoIbama: residuoCodigo,
        marQuantidade: parseFloat(quantidade),
        uniCodigo: uniCodigo,
        tiaCodigo: parseInt(acondicionamentoCodigo),
        tieCodigo: parseInt(estadoFisicoCodigo),
        traCodigo: parseInt(tratamentoCodigo),
        claCodigo: 1
      }]
    }];

    console.log('[MTR] Enviando payload prod:', JSON.stringify(payload));
    // Mudamos de sigorHomReq para sigorReq (Producao)
    const data = await sigorReq('/salvarManifestoLote', 'POST', payload);`;

const regex = /app\.post\('\/api\/mtr\/gerar', authenticateToken, async \(req, res\) => \{[\s\S]*?const data = await sigorHomReq\('\/salvarManifestoLote', 'POST', payload\);/m;

if (regex.test(serverjs)) {
    serverjs = serverjs.replace(regex, serverReplace);
    fs.writeFileSync('backend/server.js', serverjs);
    console.log('server.js atualizado');
} else {
    console.log('regex falhou no server.js');
}
