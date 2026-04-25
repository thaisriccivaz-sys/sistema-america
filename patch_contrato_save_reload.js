/**
 * patch_contrato_save_reload.js
 * Corrige o reload da lista após salvar um documento gerado (Gerar Novo → Salvar no Prontuário)
 * Problema: switchContratosSubTab('avulso') não rebuilda a lista, só mostra a div
 */
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, 'frontend', 'app.js');
let app = fs.readFileSync(appPath, 'utf8');

// Target: dentro de gerarContratoAvulso, o onClick do botão "Salvar no Prontuário"
// A linha problemática é após showToast('Documento gerado e salvo!', 'success');
const OLD = `                    document.getElementById('modal-preview-doc').style.display = 'none';\r\n                    document.getElementById('doc-modal').style.display = 'none';\r\n                    showToast('Documento gerado e salvo!', 'success');\r\n                    window.switchContratosSubTab('avulso');`;

const NEW = `                    document.getElementById('modal-preview-doc').style.display = 'none';\r\n                    document.getElementById('doc-modal').style.display = 'none';\r\n                    showToast('Documento gerado e salvo no Prontuário!', 'success');\r\n                    // Forçar reload da lista de contratos imediatamente\r\n                    window._contratosAvulsoLoaded = false;\r\n                    const _avDivSave = document.getElementById('contratos-sub-avulso');\r\n                    if (_avDivSave) {\r\n                        _avDivSave.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Atualizando lista...</p>';\r\n                        window._contratosAvulsoLoaded = true;\r\n                        await window.renderContratosAvulso(_avDivSave);\r\n                    }\r\n                    window.switchContratosSubTab('avulso');`;

if (app.includes(OLD)) {
    app = app.replace(OLD, NEW);
    console.log('✅ gerarContratoAvulso: reload após salvar corrigido (CRLF)');
} else {
    // Tentar LF
    const OLD_LF = OLD.replace(/\r\n/g, '\n');
    const NEW_LF = NEW.replace(/\r\n/g, '\n');
    if (app.includes(OLD_LF)) {
        app = app.replace(OLD_LF, NEW_LF);
        console.log('✅ gerarContratoAvulso: reload após salvar corrigido (LF)');
    } else {
        console.error('❌ Não localizado. Tentando localização parcial...');
        if (app.includes(`showToast('Documento gerado e salvo!', 'success');\r\n                    window.switchContratosSubTab('avulso');`)) {
            app = app.replace(
                `showToast('Documento gerado e salvo!', 'success');\r\n                    window.switchContratosSubTab('avulso');`,
                `showToast('Documento gerado e salvo no Prontuário!', 'success');\r\n                    // Reload da lista\r\n                    window._contratosAvulsoLoaded = false;\r\n                    const _avRef = document.getElementById('contratos-sub-avulso');\r\n                    if (_avRef) { _avRef.innerHTML='<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Atualizando...</p>'; window._contratosAvulsoLoaded=true; await window.renderContratosAvulso(_avRef); }\r\n                    window.switchContratosSubTab('avulso');`
            );
            console.log('✅ Parcial CRLF OK');
        } else if (app.includes(`showToast('Documento gerado e salvo!', 'success');\n                    window.switchContratosSubTab('avulso');`)) {
            app = app.replace(
                `showToast('Documento gerado e salvo!', 'success');\n                    window.switchContratosSubTab('avulso');`,
                `showToast('Documento gerado e salvo no Prontuário!', 'success');\n                    window._contratosAvulsoLoaded = false;\n                    const _avRef = document.getElementById('contratos-sub-avulso');\n                    if (_avRef) { _avRef.innerHTML='<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Atualizando...</p>'; window._contratosAvulsoLoaded=true; await window.renderContratosAvulso(_avRef); }\n                    window.switchContratosSubTab('avulso');`
            );
            console.log('✅ Parcial LF OK');
        } else {
            console.error('❌ Não conseguiu localizar o trecho. Verifique manualmente linha 7243.');
            process.exit(1);
        }
    }
}

fs.writeFileSync(appPath, app, 'utf8');
console.log('✅ frontend/app.js salvo');
