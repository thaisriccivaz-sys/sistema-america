/**
 * fix_auto_save_and_persistence.js
 * 1. Após uploadFarmacia, uploadConsignado, uploadMercadoPdfs → chamar salvarTudo() silencioso
 * 2. Adicionar função salvarSilencioso() que não mostra Swal de sucesso
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');
const orig = code.length;

// ===========================================================================
// 1. Adicionar salvarSilencioso() — salva sem Swal de sucesso
// ===========================================================================
const anchorSalvarFunc = '\n    async function salvarTudo()';
const idxSalvarFunc = code.indexOf(anchorSalvarFunc);
if (idxSalvarFunc === -1) { console.log('❌ salvarTudo não encontrada'); process.exit(1); }

const silentFunc = `
    // Salvar silenciosamente (sem Swal de sucesso) — usado após imports automáticos
    async function salvarSilencioso() {
        if (!_mes || !_ano || !_dados || _dados.length === 0) return;
        try {
            const itens = _dados.map(function(row) {
                return {
                    colaborador_id: row.id || row.colaborador_id,
                    horas_normais: row.horas_normais,
                    horas_trabalhadas: row.horas_trabalhadas,
                    extra_60: row.extra_60,
                    extra_100: row.extra_100,
                    horas_atraso: row.horas_atraso,
                    dias_falta: row.dias_falta,
                    dsr: row.dsr,
                    vt: row.vt,
                    farmacia: row.farmacia,
                    mercado: row.mercado,
                    multas: row.multas,
                    academia: row.academia,
                    consignado: row.consignado,
                    outros: row.outros,
                    bonus: row.bonus,
                    premio: row.premio,
                    comissao: row.comissao,
                    plr: row.plr,
                    observacao: row.observacao
                };
            });
            await fetch('/api/fechamento/salvar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
                body: JSON.stringify({ mes: _mes, ano: _ano, itens })
            });
            console.log('[fechamento] Auto-save realizado após import.');
        } catch(e) {
            console.warn('[fechamento] Auto-save falhou:', e.message);
        }
    }
`;

code = code.substring(0, idxSalvarFunc) + silentFunc + code.substring(idxSalvarFunc);
console.log('✅ salvarSilencioso() adicionada');

// ===========================================================================
// 2. Após farmácia — chamar salvarSilencioso
// ===========================================================================
// Após o Swal de success do farmácia, adicionar chamada de salvarSilencioso
const farmSuccessAnchor = "Swal.fire({ icon: 'success', title: 'Farm\u00e1cia processada!',";
const idxFarmSuccess = code.indexOf(farmSuccessAnchor);
if (idxFarmSuccess === -1) { console.log('❌ farmácia success não encontrado'); }
else {
    // Encontrar o fim desta linha do Swal.fire
    const endFarmSwal = code.indexOf(');', idxFarmSuccess) + 2;
    code = code.substring(0, endFarmSwal) + '\r\n            salvarSilencioso();' + code.substring(endFarmSwal);
    console.log('✅ auto-save após farmácia');
}

// ===========================================================================
// 3. Após consignado — chamar salvarSilencioso
// ===========================================================================
const consigSuccessAnchor = "_stateArquivos.consignado = true;";
const idxConsigSuccess = code.indexOf(consigSuccessAnchor);
if (idxConsigSuccess === -1) { console.log('❌ consignado eye trigger não encontrado'); }
else {
    // Inserir após essa linha
    const endConsigLine = code.indexOf('\n', idxConsigSuccess) + 1;
    code = code.substring(0, endConsigLine) + '            salvarSilencioso();\r\n' + code.substring(endConsigLine);
    console.log('✅ auto-save após consignado');
}

// ===========================================================================
// 4. Após mercado — chamar salvarSilencioso
// ===========================================================================
const mercSuccessAnchor = "_stateArquivos.mercado_pdfs = true;";
const idxMercSuccess = code.indexOf(mercSuccessAnchor);
if (idxMercSuccess === -1) { console.log('❌ mercado eye trigger não encontrado'); }
else {
    const endMercLine = code.indexOf('\n', idxMercSuccess) + 1;
    code = code.substring(0, endMercLine) + '            salvarSilencioso();\r\n' + code.substring(endMercLine);
    console.log('✅ auto-save após mercado');
}

// ===========================================================================
// 5. Exportar salvarSilencioso
// ===========================================================================
const oldExport = 'uploadFarmacia, uploadConsignado, uploadMercadoPdfs,';
const newExport = 'uploadFarmacia, uploadConsignado, uploadMercadoPdfs, salvarSilencioso,';
if (code.indexOf(oldExport) !== -1) {
    code = code.replace(oldExport, newExport);
    console.log('✅ salvarSilencioso exportada');
} else {
    console.log('❌ export não encontrado');
}

fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('Frontend salvo, tamanho:', code.length, '(era:', orig, ')');
