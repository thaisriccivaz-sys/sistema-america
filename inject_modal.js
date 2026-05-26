const fs = require('fs');

let logJsPath = 'frontend/credenciamento.js';
let logJs = fs.readFileSync(logJsPath, 'utf8');

// Replace using regex or more robust substring
const oldStr1 = "const end = document.getElementById('cred-endereco-instalacao'); if (end) end.value = dados.endereco_instalacao || '';";
const newStr1 = "const end = document.getElementById('cred-endereco-instalacao'); if (end) end.value = dados.endereco_instalacao || '';\n        const osInput = document.getElementById('cred-os'); if (osInput) osInput.value = dados.os || '';";

if (logJs.includes(oldStr1) && !logJs.includes("osInput.value = dados.os")) {
    logJs = logJs.replace(oldStr1, newStr1);
    console.log("Injected OS logic into modal");
}

const oldStr2 = "cb.checked = docsArr.includes(cb.value);\n        });";
const newStr2 = "cb.checked = docsArr.includes(cb.value);\n        });\n\n        let licsSelecionadas = [];\n        try { licsSelecionadas = typeof dados.licencas_ids === 'string' ? JSON.parse(dados.licencas_ids || '[]') : (dados.licencas_ids || []); } catch(e) {}\n        if (typeof _carregarLicencasAgrupadasLogistica === 'function') {\n            _carregarLicencasAgrupadasLogistica(licsSelecionadas);\n        }";

if (logJs.includes("cb.checked = docsArr.includes(cb.value);") && !logJs.includes("_carregarLicencasAgrupadasLogistica(licsSelecionadas)")) {
    // using regex to handle spacing
    logJs = logJs.replace(/cb\.checked = docsArr\.includes\(cb\.value\);\r?\n\s*\}\);/, newStr2);
    console.log("Injected licenças logic into modal");
}

fs.writeFileSync(logJsPath, logJs, 'utf8');