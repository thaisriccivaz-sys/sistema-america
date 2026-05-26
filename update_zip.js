const fs = require('fs');

let pubHtmlPath = 'frontend/credenciamento-publico.html';
let pubHtml = fs.readFileSync(pubHtmlPath, 'utf8');

const oldZipLicencas = `(_credData.licencas || []).filter(l => l.file_name).forEach(l => {
                    const fname = \`Licencas/\${sanitize(l.nome)}.pdf\`;
                    fetches.push(
                        fetch(\`/api/publico/credenciamento/\${_token}/licenca/\${l.id}\`)
                            .then(r => r.ok ? r.blob() : null)
                            .then(blob => { if (blob) { zip.file(fname, blob); totalAdded++; } })
                            .catch(() => null)
                    );
                });`;

const newZipLicencas = `(_credData.licencas || []).filter(l => l.file_name).forEach(l => {
                    const compName = sanitize(l.empresa || 'America Rental');
                    const fname = \`Licencas \${compName}/\${sanitize(l.nome)}.pdf\`;
                    fetches.push(
                        fetch(\`/api/publico/credenciamento/\${_token}/licenca/\${l.id}\`)
                            .then(r => r.ok ? r.blob() : null)
                            .then(blob => { if (blob) { zip.file(fname, blob); totalAdded++; } })
                            .catch(() => null)
                    );
                });`;

if (pubHtml.includes(oldZipLicencas)) {
    pubHtml = pubHtml.replace(oldZipLicencas, newZipLicencas);
    fs.writeFileSync(pubHtmlPath, pubHtml, 'utf8');
    console.log("Updated zip logic for licencas in credenciamento-publico.html");
} else {
    console.log("Regex didn't match in credenciamento-publico.html.");
}