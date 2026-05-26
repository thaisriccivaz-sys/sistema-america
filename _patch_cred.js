const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');

// 1. Extract licencas from body
c = c.replace(
    'const { cliente_nome, cliente_email, colaboradores, veiculos, docs_exigidos } = req.body;',
    'const { cliente_nome, cliente_email, colaboradores, veiculos, docs_exigidos, licencas } = req.body;'
);

// 2. Build licencas HTML block and inject after htmlVeic line
const htmlVeicLine = "let htmlVeic = (veiculos||[]).map(v => `<li>Placa: ${v.placa} - ${v.modelo}</li>`).join('');";
const licencasBlock = `\r\n\r\n                // Montar bloco de licenças para o e-mail\r\n                let htmlLicencas = '';\r\n                if (licencas && licencas.length > 0) {\r\n                    const licRows = licencas.map(l => {\r\n                        const valStr = l.validade ? l.validade.split('-').reverse().join('/') : 'Sem vencimento';\r\n                        return \`<li><b>\${l.nome}</b> (\${l.empresa}) — Válida até: \${valStr}</li>\`;\r\n                    }).join('');\r\n                    htmlLicencas = \`<h3>Licenças da Empresa</h3><ul>\${licRows}</ul>\`;\r\n                }\r\n`;

if (c.includes(htmlVeicLine)) {
    c = c.replace(htmlVeicLine, htmlVeicLine + licencasBlock);
    console.log('Inserted licencas block');
} else {
    console.log('htmlVeicLine NOT FOUND');
}

// 3. Add ${htmlLicencas} after veiculos in email HTML
const emailVeicLine = "${htmlVeic ? `<h3>Veículos</h3><ul>${htmlVeic}</ul>` : ''}";
if (c.includes(emailVeicLine)) {
    c = c.replace(emailVeicLine, emailVeicLine + '\r\n                                ${htmlLicencas}');
    console.log('Injected htmlLicencas into email HTML');
} else {
    // Try without accent
    const emailVeicLine2 = "${htmlVeic ? `<h3>Ve\\u00edculos</h3><ul>${htmlVeic}</ul>` : ''}";
    const idx2 = c.indexOf('${htmlVeic ?');
    console.log('htmlVeic line not found directly, idx:', idx2, JSON.stringify(c.substring(idx2, idx2+70)));
}

fs.writeFileSync('backend/server.js', c, 'utf8');
console.log('Done');
