/**
 * fix_backend_all.js — Aplica todos os fixes do backend de uma só vez
 * 1. Farmácia: pdfParse → PDFParse class
 * 2. Consignado: floating point Math.round + CPF padStart(11)
 * 3. Consignado: debug response
 */
const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');
const orig = code.length;

function fix(label, find, replace) {
    const idx = code.indexOf(find);
    if (idx === -1) { console.log('  ❌', label); return; }
    code = code.substring(0, idx) + replace + code.substring(idx + find.length);
    console.log('  ✅', label);
}

// Fix 1: Farmácia pdfParse
fix(
    'Farmácia pdfParse → PDFParse class',
    "        const pdfParse = require('pdf-parse');\n        const pdfData = await pdfParse(req.file.buffer);\n        const text = pdfData.text || '';",
    "        const { PDFParse } = require('pdf-parse');\n        const _farmParser = new PDFParse({ verbosity: 0, data: req.file.buffer });\n        const _farmData = await _farmParser.getText();\n        const text = _farmData.text || '';"
);

// Fix 2: Consignado CPF zero-padding
fix(
    'Consignado CPF padStart(11)',
    "            const cpf = String(row[idxCpf]).replace(/[.\\-]/g, '');",
    "            const cpf = String(row[idxCpf]).replace(/[.\\-]/g, '').padStart(11, '0');"
);

// Fix 3: Consignado floating point accumulation
fix(
    'Consignado floating point Math.round',
    "                grouped[cpf].valor += valorParcela;",
    "                grouped[cpf].valor = Math.round((grouped[cpf].valor + valorParcela) * 100) / 100;"
);

// Fix 4: Consignado round valor no save
fix(
    'Consignado round save',
    "stmtC.run([mes, ano, cpf, data.nome, data.valor, JSON.stringify(data.detalhes)]",
    "stmtC.run([mes, ano, cpf, data.nome, Math.round(data.valor * 100) / 100, JSON.stringify(data.detalhes)]"
);

// Fix 5: Consignado debug response
fix(
    'Consignado debug response',
    "        res.json({ ok: true, consignado: grouped });",
    `        // Garantir arredondamento final
        Object.keys(grouped).forEach(cpf => {
            grouped[cpf].valor = Math.round(grouped[cpf].valor * 100) / 100;
        });
        const debug_cpfs_consig = Object.keys(grouped);
        console.log('[upload-consignado] CPFs no XLSX:', debug_cpfs_consig.join(', ').substring(0, 500));
        res.json({ ok: true, consignado: grouped, debug_cpfs: debug_cpfs_consig });`
);

fs.writeFileSync('backend/server.js', code, 'utf8');
console.log('Tamanho:', code.length, '(era:', orig, ')');
