const fs = require('fs');

const path = 'frontend/app.js';
let content = fs.readFileSync(path, 'utf8');

// REPLACEMENT 1: abrirModalEditarParcelasProntuario
const replace1_target = `    let mIni = new Date().getMonth() + 1;
    let aIni = new Date().getFullYear();
    if (systemHistorico && systemHistorico.length > 0) {
        const primeira = systemHistorico.find(h => parseInt(h.parcela_num) === 1) || systemHistorico[0];
        aIni = primeira.ano;
        mIni = primeira.mes;
        if (primeira.parcela_num > 1) {
            mIni -= (primeira.parcela_num - 1);
            while (mIni < 1) { mIni += 12; aIni--; }
        }
    } else if (dtStr) {
        let dtCriado;
        if (dtStr.includes('/') && dtStr.includes('-')) {
            const parts = dtStr.split(' - ');
            const dateParts = parts[0].split('/');
            if (dateParts.length === 3) {
                dtCriado = new Date(\`\${dateParts[2]}-\${dateParts[1]}-\${dateParts[0]}T\${parts[1] || '00:00'}:00-03:00\`);
            }
        }
        if (!dtCriado || isNaN(dtCriado.getTime())) {
            dtCriado = new Date(dtStr.includes('T') ? dtStr : dtStr.replace(' ', 'T') + 'Z');
        }
        if (!isNaN(dtCriado.getTime())) {
            const diaCriado = dtCriado.getDate();
            mIni = dtCriado.getMonth() + 1;
            aIni = dtCriado.getFullYear();
            if (diaCriado <= 25) { mIni += 1; } else { mIni += 2; }
            if (mIni > 12) { aIni += Math.floor((mIni - 1) / 12); mIni = ((mIni - 1) % 12) + 1; }
        }
    }

    modal = document.createElement('div');
    modal.id = 'modal-editar-parcelas-multa';
    modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;';

    let configArr = [];
    try { if (configStr) configArr = JSON.parse(configStr); } catch(e){}

    const multiplicador = (status === 'Multa NIC' || status === 'Multa Nic') ? 3 : 1;
    const vTotal = (parseFloat(valorTotal) || 0) * multiplicador;

    let html = \`
        <div style="background:#fff; width:100%; max-width:800px; border-radius:12px; padding:1.5rem; max-height:90vh; overflow-y:auto; box-shadow:0 10px 25px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h3 style="margin:0; font-size:1.2rem; color:#1e293b;">Editar Parcelas da Multa</h3>
                <button onclick="document.getElementById('modal-editar-parcelas-multa').remove()" style="background:none;border:none;font-size:1.2rem;color:#64748b;cursor:pointer;"><i class="ph ph-x"></i></button>
            </div>
            
            <div style="margin-bottom:1rem;">
                <label style="display:block; font-size:0.85rem; font-weight:700; color:#475569; margin-bottom:0.3rem;">Quantidade de Parcelas</label>
                <select id="mep-parcelas" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-weight:600;" onchange="window._atualizarMepInputs()">
                    \${[1,2,3,4,5,6,7,8,9,10].map(i => \`<option value="\${i}" \${parcelasAtual == i ? 'selected' : ''}>\${i}x</option>\`).join('')}
                </select>
            </div>
            
            <div id="mep-inputs-container" style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem; padding:1rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
                <!-- Preenchido via JS -->
            </div>
            
            <div id="mep-aviso-soma" style="margin-bottom:1.5rem; font-size:0.85rem; font-weight:600;"></div>
            
            <button onclick="window._salvarMep(\${multaId})" style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                <i class="ph ph-floppy-disk"></i> Salvar Alteraçöes
            </button>
        </div>
    \`;
    modal.innerHTML = html;
    document.body.appendChild(modal);

    window._mepConfigArr = configArr;
    window._mepValorTotal = vTotal;
    window._mepHistorico = systemHistorico;
    window._mep_mIni = mIni;
    window._mep_aIni = aIni;
    window._atualizarMepInputs(true);
};`;

const replace1_replacement = `    let maxAno = 0;
    let maxMes = 0;
    if (systemHistorico && Array.isArray(systemHistorico)) {
        systemHistorico.forEach(function(h) {
            if (h.ano > maxAno || (h.ano === maxAno && h.mes > maxMes)) {
                maxAno = h.ano; maxMes = h.mes;
            }
        });
    }
    
    let baseDate = new Date();
    if (maxAno > 0) {
        baseDate = new Date(maxAno, maxMes - 1, 1);
    } else if (dtStr) {
        if (dtStr.includes('/')) {
            let parts = dtStr.split(' - ')[0].split('/');
            if (parts.length === 3) baseDate = new Date(parts[2], parseInt(parts[1])-1, parts[0]);
        } else {
            let d = dtStr.replace(' ', 'T');
            if (!d.includes('Z') && !d.includes('-03:00')) d += 'Z';
            baseDate = new Date(d);
        }
    }
    
    let currentMonthBase = new Date(baseDate);
    if (maxAno > 0) {
        currentMonthBase.setMonth(currentMonthBase.getMonth() + 1);
    } else {
        if (currentMonthBase.getDate() <= 25) {
            currentMonthBase.setMonth(currentMonthBase.getMonth() + 1);
        } else {
            currentMonthBase.setMonth(currentMonthBase.getMonth() + 2);
        }
    }

    modal = document.createElement('div');
    modal.id = 'modal-editar-parcelas-multa';
    modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;';

    let configArr = [];
    try { if (configStr) configArr = JSON.parse(configStr); } catch(e){}

    const multiplicador = (status === 'Multa NIC' || status === 'Multa Nic') ? 3 : 1;
    const vTotal = (parseFloat(valorTotal) || 0) * multiplicador;

    let html = \`
        <div style="background:#fff; width:100%; max-width:800px; border-radius:12px; padding:1.5rem; max-height:90vh; overflow-y:auto; box-shadow:0 10px 25px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h3 style="margin:0; font-size:1.2rem; color:#1e293b;">Editar Parcelas da Multa</h3>
                <button onclick="document.getElementById('modal-editar-parcelas-multa').remove()" style="background:none;border:none;font-size:1.2rem;color:#64748b;cursor:pointer;"><i class="ph ph-x"></i></button>
            </div>
            
            <div style="margin-bottom:1rem;">
                <label style="display:block; font-size:0.85rem; font-weight:700; color:#475569; margin-bottom:0.3rem;">Quantidade de Parcelas</label>
                <select id="mep-parcelas" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-weight:600;" onchange="window._atualizarMepInputs()">
                    \${[1,2,3,4,5,6,7,8,9,10].map(i => \`<option value="\${i}" \${parcelasAtual == i ? 'selected' : ''}>\${i}x</option>\`).join('')}
                </select>
            </div>
            
            <div id="mep-inputs-container" style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem; padding:1rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
                <!-- Preenchido via JS -->
            </div>
            
            <div id="mep-aviso-soma" style="margin-bottom:1.5rem; font-size:0.85rem; font-weight:600;"></div>
            
            <button onclick="window._salvarMep(\${multaId})" style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                <i class="ph ph-floppy-disk"></i> Salvar Alterações
            </button>
        </div>
    \`;
    modal.innerHTML = html;
    document.body.appendChild(modal);

    window._mepConfigArr = configArr;
    window._mepValorTotal = vTotal;
    window._mepHistorico = systemHistorico;
    window._mep_currentMonthBase = currentMonthBase;
    window._atualizarMepInputs(true);
};`;

// REPLACEMENT 2: _atualizarMepInputs
const replace2_target = `window._atualizarMepInputs = function(isInitial = false) {
    const num = parseInt(document.getElementById('mep-parcelas').value) || 1;
    const cont = document.getElementById('mep-inputs-container');
    const vTotal = window._mepValorTotal;
    const defVal = vTotal / num;
    const cfg = window._mepConfigArr;
    const historico = window._mepHistorico || [];
    const anoAtual = new Date().getFullYear();
    
    let html = '';
    for (let i = 1; i <= num; i++) {
        let v = defVal;
        let isAlert = false;
        let pMes = '';
        let pAno = '';

        let cfgParcela = null;
        if (isInitial && cfg.length > 0) {
            cfgParcela = cfg.find(c => parseInt(c.num) === i);
            if (cfgParcela) {
                v = parseFloat(cfgParcela.valor) || defVal;
                if (cfgParcela.alert) isAlert = true;
                if (cfgParcela.mes) pMes = cfgParcela.mes;
                if (cfgParcela.ano) pAno = cfgParcela.ano;
            }
        }

        const systemCharge = historico.find(h => parseInt(h.parcela_num) === i);
        if (systemCharge) {
            if (!cfgParcela) isAlert = true;
            if (!pMes) pMes = systemCharge.mes;
            if (!pAno) pAno = systemCharge.ano;
        }

        let expectedMes = window._mep_mIni + (i - 1);
        let expectedAno = window._mep_aIni;
        while (expectedMes > 12) { expectedAno++; expectedMes -= 12; }
        
        // Se pMes e pAno nao estiverem definidos na config ou historico, usar o esperado padrao do sistema
        if (!pMes) pMes = expectedMes;
        if (!pAno) pAno = expectedAno;

        let mesOptions = '';`;

const replace2_replacement = `window._atualizarMepInputs = function(isInitial = false) {
    const num = parseInt(document.getElementById('mep-parcelas').value) || 1;
    const cont = document.getElementById('mep-inputs-container');
    const vTotal = window._mepValorTotal;
    const defVal = vTotal / num;
    const cfg = window._mepConfigArr;
    const historico = window._mepHistorico || [];
    const anoAtual = new Date().getFullYear();
    
    let currentCursor = new Date(window._mep_currentMonthBase);
    let html = '';
    
    for (let i = 1; i <= num; i++) {
        let v = defVal;
        let isAlert = false;
        let pMes = null;
        let pAno = null;

        let cfgParcela = null;
        if (isInitial && cfg.length > 0) {
            cfgParcela = cfg.find(c => parseInt(c.num) === i);
            if (cfgParcela) {
                v = parseFloat(cfgParcela.valor) || defVal;
                if (cfgParcela.alert) isAlert = true;
                if (cfgParcela.mes) pMes = parseInt(cfgParcela.mes);
                if (cfgParcela.ano) pAno = parseInt(cfgParcela.ano);
            }
        }

        const systemCharge = historico.find(h => parseInt(h.parcela_num) === i);
        if (systemCharge) {
            if (!cfgParcela) isAlert = true;
            pMes = parseInt(systemCharge.mes);
            pAno = parseInt(systemCharge.ano);
        }

        if (!pMes || !pAno) {
            pMes = currentCursor.getMonth() + 1;
            pAno = currentCursor.getFullYear();
            currentCursor.setMonth(currentCursor.getMonth() + 1);
        } else if (!systemCharge) {
            currentCursor.setMonth(currentCursor.getMonth() + 1);
        }

        let mesOptions = '';`;

if (!content.includes(replace1_target)) {
    console.error("Replacement 1 target not found");
    // Print the first few lines of the target and where it diverges
    process.exit(1);
}
content = content.replace(replace1_target, replace1_replacement);

if (!content.includes(replace2_target)) {
    console.error("Replacement 2 target not found");
    process.exit(1);
}
content = content.replace(replace2_target, replace2_replacement);

fs.writeFileSync(path, content, 'utf8');
console.log("Success");
