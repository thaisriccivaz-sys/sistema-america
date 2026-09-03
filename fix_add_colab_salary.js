const fs = require('fs');
let code = fs.readFileSync('backend/routes/controlid.js', 'utf8');

// Inserir busca do salário logo após o check do cpfLimpo
const anchor = "    const cpfLimpo = normalizarCPF(cpf);\r\n    if (!cpfLimpo || cpfLimpo.length < 8) {\r\n        return res.status(400).json({ success: false, message: 'CPF inv\u00e1lido.' });\r\n    }\r\n\r\n    try {";
const newAnchor = "    const cpfLimpo = normalizarCPF(cpf);\r\n    if (!cpfLimpo || cpfLimpo.length < 8) {\r\n        return res.status(400).json({ success: false, message: 'CPF inv\u00e1lido.' });\r\n    }\r\n\r\n    // Buscar sal\u00e1rio do colaborador no banco para calcular adicional noturno\r\n    let colaborador = null;\r\n    try {\r\n        colaborador = await new Promise(function(resolve, reject) {\r\n            db.get('SELECT salario FROM colaboradores WHERE cpf = ?', [cpf], function(err, row) {\r\n                if (err) reject(err); else resolve(row || null);\r\n            });\r\n        });\r\n    } catch(e) { colaborador = null; }\r\n\r\n    try {";

const idx = code.indexOf(anchor);
if (idx !== -1) {
    code = code.substring(0, idx) + newAnchor + code.substring(idx + anchor.length);
    console.log('OK - colaborador query inserida');
} else {
    // Tentar sem CRLF
    const anchor2 = anchor.replace(/\r\n/g, '\n');
    const idx2 = code.indexOf(anchor2);
    if (idx2 !== -1) {
        code = code.substring(0, idx2) + newAnchor.replace(/\r\n/g, '\n') + code.substring(idx2 + anchor2.length);
        console.log('OK LF - colaborador query inserida');
    } else {
        console.log('FAIL - nenhuma ancora encontrada');
        // Debug
        const cpfIdx = code.indexOf('normalizarCPF(cpf)');
        console.log('normalizarCPF idx:', cpfIdx);
        if (cpfIdx !== -1) console.log('ctx:', JSON.stringify(code.substring(cpfIdx, cpfIdx+200)));
    }
}

fs.writeFileSync('backend/routes/controlid.js', code, 'utf8');
console.log('tamanho:', code.length);
