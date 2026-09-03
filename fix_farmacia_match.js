const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

// Localizar o bloco de forEach da farmácia
const anchor1 = 'let atualizados = 0;\r\n            _dados.forEach((row, idx) => {';
const anchor2 = "Swal.fire({ icon: 'success', title: `Farm\u00e1cia processada!`, text: `${atualizados} colaboradores com desconto. Total de entradas: ${Object.keys(json.farmacia).length}.`, timer: 3000, showConfirmButton: false });";

const idx1 = code.indexOf(anchor1);
const idx2 = code.indexOf(anchor2);
if (idx1 === -1 || idx2 === -1) {
    console.log('idx1:', idx1, 'idx2:', idx2);
    process.exit(1);
}

const newBlock = `var atualizados = 0;\r\n            // Índice de nomes normalizados do PDF para fallback por nome\r\n            var normPdf = {};\r\n            Object.keys(json.farmacia).forEach(function(cpfKey) {\r\n                var nomePdf = (json.farmacia[cpfKey].nome || '').toUpperCase()\r\n                    .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();\r\n                normPdf[nomePdf] = cpfKey;\r\n            });\r\n            _dados.forEach((row, idx) => {\r\n                var cpf = (row.cpf || '').replace(/[.\\-]/g, '');\r\n                var matchKey = null;\r\n                // 1. Match por CPF\r\n                if (json.farmacia[cpf]) {\r\n                    matchKey = cpf;\r\n                } else {\r\n                    // 2. Fallback: match por nome normalizado\r\n                    var nomeColab = (row.nome_completo || '').toUpperCase()\r\n                        .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();\r\n                    if (normPdf[nomeColab]) {\r\n                        matchKey = normPdf[nomeColab];\r\n                    } else {\r\n                        // 3. Match parcial: >= 3 palavras em comum\r\n                        Object.keys(normPdf).forEach(function(nomePdfKey) {\r\n                            if (!matchKey) {\r\n                                var pw = nomePdfKey.split(' ').filter(Boolean);\r\n                                var pc = nomeColab.split(' ').filter(Boolean);\r\n                                var matches = pw.filter(function(p) { return pc.includes(p); });\r\n                                if (matches.length >= Math.min(3, pw.length)) {\r\n                                    matchKey = normPdf[nomePdfKey];\r\n                                }\r\n                            }\r\n                        });\r\n                    }\r\n                }\r\n                if (matchKey !== null) {\r\n                    var val = json.farmacia[matchKey].valor;\r\n                    _dados[idx].farmacia = val;\r\n                    var cell = document.getElementById('fech-cell-farmacia-' + idx);\r\n                    if (cell) {\r\n                        var inp = cell.querySelector('input');\r\n                        if (inp) inp.value = parseFloat(val).toFixed(2);\r\n                    }\r\n                    atualizar(idx, 'farmacia', val);\r\n                    atualizados++;\r\n                }\r\n            });\r\n            var debugInfo = json.debug_cpfs && json.debug_cpfs.length\r\n                ? '\\n\\nCPFs no PDF: ' + json.debug_cpfs.slice(0,5).join(', ') + (json.debug_cpfs.length>5 ? '...' : '')\r\n                : '';\r\n            Swal.fire({ icon: 'success', title: 'Farm\u00e1cia processada!', text: atualizados + ' colaboradores com desconto de ' + Object.keys(json.farmacia).length + ' no PDF.' + debugInfo, timer: 4000, showConfirmButton: false });`;

// Substituir do anchor1 até o fim do anchor2
const endOfAnchor2 = idx2 + anchor2.length;
code = code.substring(0, idx1) + newBlock + code.substring(endOfAnchor2);
fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('✅ OK, tamanho:', code.length);
