const fs = require('fs');

function fixBugAndAddPopup() {
    // 1. Fix credenciamento.js "dados is not defined"
    let logJsPath = 'frontend/credenciamento.js';
    let logJs = fs.readFileSync(logJsPath, 'utf8');
    
    // Replace "dados.find" with "data.find" in the injected block
    logJs = logJs.replace(
        "const outroCred = dados.find(c => {",
        "const outroCred = data.find(c => {"
    );
    
    fs.writeFileSync(logJsPath, logJs, 'utf8');
    console.log("Fixed dados -> data in " + logJsPath);

    // 2. Add Popup to comercial_credenciamento.js
    let comJsPath = 'frontend/comercial_credenciamento.js';
    let comJs = fs.readFileSync(comJsPath, 'utf8');
    
    const oldAlert = 'alert("Solicitação salva e Logística notificada!");';
    const newAlert = `
        let cepAlert = "";
        const cepMatchAlert = payload.endereco_instalacao ? payload.endereco_instalacao.match(/\\b\\d{5}-?\\d{3}\\b/) : null;
        if (cepMatchAlert) {
            const cepAlertVal = cepMatchAlert[0].replace('-', '');
            const outroCredAlert = (window._historicoComCredDados || []).find(c => {
                if (c.id == id) return false;
                if (!c.endereco_instalacao) return false;
                const m = c.endereco_instalacao.match(/\\b\\d{5}-?\\d{3}\\b/);
                return m && m[0].replace('-', '') === cepAlertVal;
            });
            if (outroCredAlert) {
                cepAlert = \`\\n\\n⚠️ ATENÇÃO: O CEP \${cepMatchAlert[0]} também está cadastrado na OS \${outroCredAlert.os || '-'} do cliente \${outroCredAlert.cliente_nome}.\`;
            }
        }
        
        alert("Solicitação salva e Logística notificada!" + cepAlert);
    `;
    
    if (comJs.includes(oldAlert)) {
        comJs = comJs.replace(oldAlert, newAlert);
        fs.writeFileSync(comJsPath, comJs, 'utf8');
        console.log("Added popup to " + comJsPath);
    } else {
        console.log("Old alert not found in comercial_credenciamento.js");
    }
}

fixBugAndAddPopup();