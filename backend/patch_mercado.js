const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\thais\\.gemini\\antigravity\\scratch\\sistema-america\\backend\\server.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add migration
const migrationCode = `
// Auto-migration: Tabela fechamento_mercado_uploads
db.run(\`CREATE TABLE IF NOT EXISTS fechamento_mercado_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    nome_arquivo TEXT,
    nome_no_pdf TEXT,
    valor REAL,
    r2_key TEXT,
    colaborador_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)\`, (err) => { if (err && !err.message.includes('already exists')) console.error('[Migration] fechamento_mercado_uploads:', err.message); });
`;

content = content.replace(
    /(\/\/ Auto-migration: Tabela fechamento_consignado[\s\S]*?db\.run[^;]+;\n?)/,
    `$1${migrationCode}`
);

// 2. Add endpoints
const endpointsCode = `

// POST: Upload e parse de múltiplos PDFs do Mercado Berlim
app.post('/api/fechamento/upload-mercado-pdfs', authenticateToken, uploadFoto.array('pdfs', 50), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        const { mes, ano } = req.body;
        if (!mes || !ano) return res.status(400).json({ error: 'Mês/ano obrigatórios' });

        const r2 = require('./utils/r2');
        const resultados = [];
        
        for (const file of req.files) {
            let valor = 0;
            let text = '';
            
            try {
                const pdfParse = require('pdf-parse');
                // The prompt says: const { PDFParse } = require('pdf-parse'); const parser = new PDFParse({ verbosity: 0, data: buf }); const pdfData = await parser.getText();
                // However, pdf-parse is usually a function. Let's try both:
                if (typeof pdfParse === 'function') {
                    const pdfData = await pdfParse(file.buffer);
                    text = pdfData.text;
                } else if (pdfParse.PDFParse) {
                    const parser = new pdfParse.PDFParse({ verbosity: 0, data: file.buffer });
                    text = await parser.getText();
                } else {
                    const pdfData = await pdfParse(file.buffer);
                    text = pdfData.text;
                }
            } catch (e) {
                console.error('Erro ao parsear PDF do mercado:', e);
            }
            
            // Buscar linha com regex /^\\|?-?[\\t -]+R\\$\\s*([\\d,.]+)/m ou buscar a linha com R$ 0,00 que contém o total
            const matchTotal = text.match(/^\\|?[\\t -]+R\\$\\s*([\\d,.]+)/m) || text.match(/R\\$\\s*([\\d,.]+)[\\s\\t]*R\\$\\s*0,00/i);
            
            if (matchTotal && matchTotal[1]) {
                valor = parseFloat(matchTotal[1].replace(',', '.'));
            } else {
                // Fallback: tentar encontrar o total de outra forma
                const matchFallback = text.match(/-\\s+R\\$\\s*([\\d,.]+)\\s+R\\$\\s*0,00/i) || text.match(/R\\$\\s*([\\d,.]+)/);
                if (matchFallback && matchFallback[1]) {
                    valor = parseFloat(matchFallback[1].replace(',', '.'));
                }
            }
            
            const nomeSemExtensao = file.originalname.replace(/\\.pdf$/i, '');
            const nomeSeguro = nomeSemExtensao.replace(/[^a-zA-Z0-9 ]/g, '').trim().toUpperCase();
            let r2Key = null;
            
            if (r2.isReady()) {
                r2Key = \`fechamento/\${ano}/\${String(mes).padStart(2,'0')}/mercado/\${Date.now()}_\${nomeSeguro.replace(/\\s+/g, '_')}.pdf\`;
                await r2.uploadToR2(r2Key, file.buffer, 'application/pdf');
            }
            
            const result = await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO fechamento_mercado_uploads (mes, ano, nome_arquivo, nome_no_pdf, valor, r2_key) VALUES (?, ?, ?, ?, ?, ?)',
                    [mes, ano, file.originalname, nomeSemExtensao.trim().toUpperCase(), valor, r2Key],
                    function(err) {
                        if (err) reject(err);
                        else resolve({ id: this.lastID, nome: nomeSemExtensao.trim().toUpperCase(), valor, r2_key: r2Key });
                    }
                );
            });
            
            resultados.push(result);
        }
        
        res.json({ ok: true, resultados });
    } catch (e) {
        console.error('[upload-mercado-pdfs] Erro:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// GET: Stream do PDF do mercado via R2
app.get('/api/fechamento/mercado-pdf/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const row = await new Promise((resolve, reject) => {
            db.get('SELECT r2_key, nome_arquivo FROM fechamento_mercado_uploads WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!row || !row.r2_key) return res.status(404).send('Arquivo não encontrado ou R2 não configurado');
        
        const r2 = require('./utils/r2');
        if (!r2.isReady()) return res.status(500).send('R2 Storage não configurado');
        
        const { stream, contentType } = await r2.downloadStreamFromR2(row.r2_key);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', \`inline; filename="\${row.nome_arquivo || 'mercado.pdf'}"\`);
        stream.pipe(res);
    } catch (e) {
        console.error('[mercado-pdf] Erro:', e.message);
        res.status(500).send('Erro ao baixar arquivo');
    }
});
`;

content = content.replace(
    /(\/\/ POST: Upload e parse da planilha de consignado \(\.xlsx\))/,
    `${endpointsCode}\n$1`
);

fs.writeFileSync(filePath, content);
console.log('Script Node.js executado com sucesso.');
