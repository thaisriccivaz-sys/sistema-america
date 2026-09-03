/**
 * fix_mercado_persistent.js
 * 1. Backend: endpoint GET /api/fechamento/mercado-pdfs/:ano/:mes — lista PDFs do banco
 * 2. Backend: endpoint GET /api/fechamento/mercado-pdf/:id — aceita token via query string
 * 3. Frontend: verMercado busca do banco se _dadosMercado vazio
 */
const fs = require('fs');

// ===========================================================================
// BACKEND
// ===========================================================================
{
    let code = fs.readFileSync('backend/server.js', 'utf8');

    // 1. Modificar endpoint mercado-pdf/:id para aceitar token via query string
    const oldAuth = "app.get('/api/fechamento/mercado-pdf/:id', authenticateToken, async (req, res) => {";
    const newAuth = `app.get('/api/fechamento/mercado-pdf/:id', async (req, res) => {
    // Aceita token via query string (para usar em iframe/src) ou via header
    const tokenQuery = req.query.token;
    if (tokenQuery) {
        const jwt = require('jsonwebtoken');
        try { jwt.verify(tokenQuery, process.env.JWT_SECRET || 'america2024'); }
        catch(e) { return res.status(401).json({ error: 'Token inválido' }); }
    } else {
        // Validar via header Authorization
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ error: 'Não autorizado' });
        const jwt = require('jsonwebtoken');
        try { jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET || 'america2024'); }
        catch(e) { return res.status(401).json({ error: 'Token inválido' }); }
    }`;

    const idxOld = code.indexOf(oldAuth);
    if (idxOld === -1) { console.log('❌ auth endpoint não encontrado'); }
    else {
        code = code.substring(0, idxOld) + newAuth + code.substring(idxOld + oldAuth.length);
        console.log('✅ Fix: mercado-pdf/:id aceita token via query string');
    }

    // 2. Adicionar endpoint GET /api/fechamento/mercado-pdfs/:ano/:mes
    const anchorAfterPdfId = "});\n\n// POST: Upload de Consignado";
    const anchorAfterPdfIdCRLF = "});\r\n\r\n// POST: Upload de Consignado";
    const newListEndpoint = `});\r\n\r\n// GET: Listar PDFs do Mercado por mês/ano (para restaurar estado após refresh)\r\napp.get('/api/fechamento/mercado-pdfs/:ano/:mes', authenticateToken, (req, res) => {\r\n    const { ano, mes } = req.params;\r\n    db.all('SELECT id, nome_arquivo, nome_no_pdf, valor, r2_key FROM fechamento_mercado_uploads WHERE ano = ? AND mes = ? ORDER BY id ASC',\r\n        [parseInt(ano), parseInt(mes)], (err, rows) => {\r\n        if (err) return res.status(500).json({ error: err.message });\r\n        res.json(rows || []);\r\n    });\r\n});\r\n\r\n// POST: Upload de Consignado`;

    let idxAfter = code.indexOf(anchorAfterPdfIdCRLF);
    if (idxAfter === -1) idxAfter = code.indexOf(anchorAfterPdfId);
    if (idxAfter === -1) {
        console.log('❌ âncora para endpoint lista mercado não encontrada');
    } else {
        code = code.substring(0, idxAfter) + newListEndpoint + code.substring(idxAfter + anchorAfterPdfIdCRLF.length);
        console.log('✅ Endpoint GET /api/fechamento/mercado-pdfs/:ano/:mes adicionado');
    }

    fs.writeFileSync('backend/server.js', code, 'utf8');
    console.log('Backend salvo, tamanho:', code.length);
}

// ===========================================================================
// FRONTEND: verMercado → busca do banco se _dadosMercado vazio
// ===========================================================================
{
    let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

    // Substituir verMercado para buscar do banco
    const funcStart = '\n    function verMercado() {';
    const idxStart = code.indexOf(funcStart);
    if (idxStart === -1) { console.log('❌ verMercado não encontrada'); process.exit(1); }
    let depth = 0; let inFunc = false; let idxEnd = -1;
    for (let i = idxStart; i < code.length; i++) {
        if (code[i] === '{') { depth++; inFunc = true; }
        if (code[i] === '}') { depth--; if (inFunc && depth === 0) { idxEnd = i + 1; break; } }
    }

    const newVerMercado = `
    async function verMercado() {
        // Se não tem dados na sessão, buscar do banco
        if (!_dadosMercado || _dadosMercado.length === 0) {
            if (!_mes || !_ano) {
                Swal.fire({ icon: 'info', title: 'Mercado', text: 'Selecione um mês para ver os PDFs.' });
                return;
            }
            try {
                var resp = await fetch('/api/fechamento/mercado-pdfs/' + _ano + '/' + _mes, {
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                });
                var json = await resp.json();
                if (Array.isArray(json) && json.length > 0) {
                    _dadosMercado = json.map(function(r) { return { id: r.id, nome: r.nome_no_pdf || r.nome_arquivo, valor: r.valor, r2_key: r.r2_key }; });
                }
            } catch(e) { console.error('Erro ao buscar PDFs mercado:', e); }
        }
        if (!_dadosMercado || _dadosMercado.length === 0) {
            Swal.fire({ icon: 'info', title: 'Mercado', text: 'Nenhum PDF de mercado encontrado para este mês.' });
            return;
        }
        var iframesHtml = _dadosMercado.map(function(r) {
            var url = '/api/fechamento/mercado-pdf/' + r.id + '?token=' + encodeURIComponent(getToken());
            var nomeLabel = r.nome + (r.valor ? ' — R$ ' + parseFloat(r.valor).toFixed(2).replace('.', ',') : '');
            return '<div style="margin-bottom:1rem;">'
                + '<div style="font-size:.75rem;font-weight:600;color:#374151;padding:.25rem .5rem;background:#f3f4f6;border-radius:.25rem .25rem 0 0;border:1px solid #d1d5db;">' + nomeLabel + '</div>'
                + '<iframe src="' + url + '" style="width:100%;height:500px;border:1px solid #d1d5db;border-top:none;border-radius:0 0 .25rem .25rem;" title="' + r.nome + '"></iframe>'
                + '</div>';
        }).join('');
        Swal.fire({
            title: 'PDFs do Mercado (' + _dadosMercado.length + ')',
            html: '<div style="max-height:70vh;overflow-y:auto;padding:.5rem;">' + iframesHtml + '</div>',
            width: '90vw',
            showCloseButton: true,
            showConfirmButton: false
        });
    }`;

    code = code.substring(0, idxStart) + newVerMercado + code.substring(idxEnd);
    console.log('✅ verMercado atualizado para buscar do banco');

    fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
    console.log('Frontend salvo, tamanho:', code.length);
}
