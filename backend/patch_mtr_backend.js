const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'server.js');
let c = fs.readFileSync(filepath, 'utf8');

const novasRotas = `
// ═══════════════════════════════════════════════════════════════════════════════
// ── MÓDULO MTR SIGOR ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const SIGOR_CFG = {
  cpfCnpj: '38058722839',
  senha: 'gb5ti5',
  unidade: '19201',
  apiHom: 'https://mtrr-hom.cetesb.sp.gov.br/apiws/rest',
  apiProd: 'https://mtrr.cetesb.sp.gov.br/apiws/rest',
  get api() { return this.apiHom; } // ← Troque para apiProd em produção
};

let _sigorToken = null;
let _sigorTokenExp = 0;

async function sigorGetToken() {
  if (_sigorToken && Date.now() < _sigorTokenExp) return _sigorToken;
  const resp = await fetch(SIGOR_CFG.api + '/gettoken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpfCnpj: SIGOR_CFG.cpfCnpj, senha: SIGOR_CFG.senha, unidade: SIGOR_CFG.unidade })
  });
  const data = await resp.json();
  if (data.erro || !data.objetoResposta) throw new Error(data.mensagem || 'Falha na autenticação SIGOR');
  _sigorToken = data.objetoResposta;
  _sigorTokenExp = Date.now() + 3600000; // 1h
  return _sigorToken;
}

async function sigorReq(path, method = 'GET', body = null) {
  const token = await sigorGetToken();
  const opts = { method, headers: { 'Authorization': token, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(SIGOR_CFG.api + path, opts);
  return resp.json();
}

// Criar tabela mtr_local se não existir
db.run(\`CREATE TABLE IF NOT EXISTS mtr_local (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_mtr TEXT,
  numero_manifesto TEXT,
  status TEXT DEFAULT 'Ativo',
  gerador_nome TEXT,
  gerador_cnpj TEXT,
  residuo_codigo TEXT,
  residuo_nome TEXT,
  quantidade REAL,
  unidade TEXT,
  acondicionamento_codigo TEXT,
  tratamento_codigo TEXT,
  estado_fisico_codigo TEXT,
  observacao TEXT,
  pdf_base64 TEXT,
  payload_json TEXT,
  complementar_de_id INTEGER,
  data_geracao TEXT DEFAULT (datetime('now','-3 hours')),
  data_recebimento TEXT,
  peso_real REAL,
  created_at TEXT DEFAULT (datetime('now','-3 hours'))
)\`);

// ── GET /api/mtr/lista ────────────────────────────────────────────────────────
app.get('/api/mtr/lista', authenticateToken, (req, res) => {
  db.all('SELECT * FROM mtr_local ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// ── GET /api/mtr/tabelas ──────────────────────────────────────────────────────
app.get('/api/mtr/tabelas', authenticateToken, async (req, res) => {
  try {
    const [residuos, acondicionamentos, estadosFisicos, tratamentos, unidades] = await Promise.all([
      sigorReq('/listaResiduos'),
      sigorReq('/listaTipoAcondicionamento'),
      sigorReq('/listaTipoEstadoFisico'),
      sigorReq('/listaTratamentos'),
      sigorReq('/listaUnidades')
    ]);
    res.json({
      residuos: residuos.objetoResposta || [],
      acondicionamentos: acondicionamentos.objetoResposta || [],
      estadosFisicos: estadosFisicos.objetoResposta || [],
      tratamentos: tratamentos.objetoResposta || [],
      unidades: unidades.objetoResposta || []
    });
  } catch (e) {
    console.error('[MTR] Erro tabelas:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/mtr/gerar ───────────────────────────────────────────────────────
app.post('/api/mtr/gerar', authenticateToken, async (req, res) => {
  const { geradorNome, geradorCnpj, residuoCodigo, quantidade, unidade,
          acondicionamentoCodigo, estadoFisicoCodigo, tratamentoCodigo,
          observacao, complementarDeId } = req.body;

  try {
    const endpoint = complementarDeId ? '/gerarManifestoComplementarLote' : '/gerarManifestoLote';
    const payload = [{
      seuCodigo: 'AR-' + Date.now(),
      gerador: { cpfCnpj: (geradorCnpj || '').replace(/\\D/g, ''), razaoSocial: geradorNome },
      residuos: [{
        codigo: residuoCodigo,
        quantidade: parseFloat(quantidade),
        unidade: { codigo: unidade },
        acondicionamento: { codigo: acondicionamentoCodigo },
        estadoFisico: { codigo: estadoFisicoCodigo },
        tratamento: { codigo: tratamentoCodigo }
      }],
      observacao: observacao || ''
    }];

    const data = await sigorReq(endpoint, 'POST', payload);
    const obj = data.objetoResposta?.[0] || data.objetoResposta;
    const numeroMTR = obj?.numeroManifesto || obj?.numero || null;
    const erro = data.erro || false;
    const mensagem = data.mensagem || '';

    if (erro) return res.status(400).json({ erro: true, mensagem });

    // Salvar localmente
    db.run(
      \`INSERT INTO mtr_local (numero_mtr, status, gerador_nome, gerador_cnpj, residuo_codigo,
        quantidade, unidade, acondicionamento_codigo, estado_fisico_codigo, tratamento_codigo,
        observacao, payload_json, complementar_de_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)\`,
      [numeroMTR, 'Ativo', geradorNome, geradorCnpj, residuoCodigo,
       quantidade, unidade, acondicionamentoCodigo, estadoFisicoCodigo, tratamentoCodigo,
       observacao, JSON.stringify(data), complementarDeId || null],
      function (errIns) {
        if (errIns) console.error('[MTR] Erro insert:', errIns);
        res.json({ erro: false, mensagem: 'MTR gerada com sucesso', numeroMTR, id: this.lastID });
      }
    );
  } catch (e) {
    console.error('[MTR] Erro gerar:', e);
    res.status(500).json({ erro: true, mensagem: e.message });
  }
});

// ── POST /api/mtr/:id/receber ────────────────────────────────────────────────
app.post('/api/mtr/:id/receber', authenticateToken, async (req, res) => {
  const { pesoReal, dataRecebimento, observacao } = req.body;
  db.get('SELECT * FROM mtr_local WHERE id = ?', [req.params.id], async (err, row) => {
    if (err || !row) return res.status(404).json({ mensagem: 'MTR não encontrada' });
    try {
      const payload = [{
        numeroManifesto: row.numero_mtr,
        pesoRealRecebido: parseFloat(pesoReal),
        dataRecebimento,
        observacao: observacao || ''
      }];
      const data = await sigorReq('/receberManifestoLote', 'POST', payload);
      if (data.erro) return res.status(400).json({ mensagem: data.mensagem });
      db.run('UPDATE mtr_local SET status = ?, data_recebimento = ?, peso_real = ? WHERE id = ?',
        ['Recebido', dataRecebimento, pesoReal, req.params.id]);
      res.json({ mensagem: 'MTR recebida com sucesso' });
    } catch (e) {
      res.status(500).json({ mensagem: e.message });
    }
  });
});

// ── GET /api/mtr/:id/pdf ─────────────────────────────────────────────────────
app.get('/api/mtr/:id/pdf', authenticateToken, async (req, res) => {
  db.get('SELECT * FROM mtr_local WHERE id = ?', [req.params.id], async (err, row) => {
    if (err || !row) return res.status(404).json({ mensagem: 'MTR não encontrada' });
    try {
      if (row.pdf_base64) return res.json({ pdf: row.pdf_base64 });
      const data = await sigorReq('/downloadManifesto/' + row.numero_mtr);
      const pdf = data.objetoResposta || null;
      if (pdf) db.run('UPDATE mtr_local SET pdf_base64 = ? WHERE id = ?', [pdf, row.id]);
      res.json({ pdf });
    } catch (e) {
      res.status(500).json({ mensagem: e.message });
    }
  });
});

console.log('[MTR SIGOR] Endpoints registrados: /lista /tabelas /gerar /:id/receber /:id/pdf');
`;

// Adicionar antes do último console.log do Monaco
c = c.replace(
  "console.log('[MONACO] Endpoints webhook registrados:",
  novasRotas + "\nconsole.log('[MONACO] Endpoints webhook registrados:"
);

fs.writeFileSync(filepath, c);
console.log('Feito.');
