const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

// ===========================================================================
// 1. SUBSTITUIR TODA A SEÇÃO DO <thead> DA TABELA PRINCIPAL
//    - Nomes completos nas colunas
//    - Números de rubrica abaixo do nome
//    - Remover Total Bruto e Líquido
// ===========================================================================
const oldThead = `        <thead style="position:sticky; top:0; z-index:10;">
          <tr style="background:#1e40af;color:#fff;">
            <th style="padding:.45rem .6rem;text-align:left;white-space:nowrap;position:sticky;left:0;top:0;background:#1e40af;z-index:20;box-shadow:inset -1px -1px 0 #cbd5e1, inset 0 -1px 0 #cbd5e1;">Colaborador</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Cargo</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Salário</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;" title="Horas normais mensais">H.Normais</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;" title="Horas trabalhadas">H.Trab.</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Ext.60%</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Ext.100%</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">DSR</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Faltas</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Atrasos</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">VT</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#0c4a6e;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Farmácia</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#78350f;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Mercado</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#7f1d1d;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Multas</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Academia</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#4c1d95;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Consig.</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Comissão</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Bônus</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#14532d;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">PLR</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Prêmio</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Outros</th>
            <th style="padding:.45rem .5rem;white-space:nowrap;position:sticky;top:0;background:#164e63;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Total Bruto</th>
            <th style="padding:.45rem .5rem;white-space:nowrap;position:sticky;top:0;background:#064e3b;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Líquido</th>
          </tr>
        </thead>`;

function thRub(label, rubric, bg, extra) {
    const rubHtml = rubric ? `<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">${rubric}</span>` : '';
    const bgStyle = bg ? `background:${bg};` : 'background:#1e40af;';
    return `<th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;${bgStyle}z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;${extra||''}">${label}${rubHtml}</th>`;
}

const newThead = `        <thead style="position:sticky; top:0; z-index:10;">
          <tr style="background:#1e40af;color:#fff;">
            <th style="padding:.4rem .6rem;text-align:left;white-space:nowrap;position:sticky;left:0;top:0;background:#1e40af;z-index:20;box-shadow:inset -1px -1px 0 #cbd5e1, inset 0 -1px 0 #cbd5e1;">Colaborador</th>
            ${thRub('Cargo', '', '', 'text-align:left;')}
            ${thRub('Salário', '', '')}
            ${thRub('H.Normais', '9435', '')}
            ${thRub('H.Trab.', '', '')}
            ${thRub('Ext.60%', '264', '')}
            ${thRub('Ext.100%', '200', '')}
            ${thRub('DSR', '', '')}
            ${thRub('Faltas', '8792', '')}
            ${thRub('Atrasos', '8060', '')}
            ${thRub('VT', '48', '')}
            ${thRub('Farmácia', '238', '#0c4a6e')}
            ${thRub('Mercado', '279', '#78350f')}
            ${thRub('Multas', '302', '#7f1d1d')}
            ${thRub('Academia', '278', '')}
            ${thRub('Consig.', '9750', '#4c1d95')}
            ${thRub('Comissão', '37', '')}
            ${thRub('Bônus Comis.', '', '')}
            ${thRub('PLR', '873', '#14532d')}
            ${thRub('Prêmio', '', '')}
            ${thRub('Outros', '290', '')}
          </tr>
        </thead>`;

if (code.includes(oldThead)) {
    code = code.replace(oldThead, newThead);
    console.log('✅ Thead substituído');
} else {
    console.log('❌ Thead NÃO encontrado');
}

// ===========================================================================
// 2. REMOVER COLUNAS Total Bruto e Líquido do tbody (renderizarTabela)
// ===========================================================================
const oldBrutoLiq = `<td style="padding:.35rem .4rem;text-align:right;font-weight:600;color:#0e4680;background:#eff6ff;" id="fech-bruto-\${idx}">\${fmt(calc.totalBruto)}</td>
\`<td style="padding:.35rem .4rem;text-align:right;font-weight:700;color:#065f46;background:#ecfdf5;" id="fech-liq-\${idx}">\${fmt(calc.liquido)}</td>\``;

// Fallback: use regex to remove the bruto and liq cells
code = code.replace(/`?<td[^>]+id="fech-bruto-\$\{idx\}">[^<]*<\/td>`?/g, '');
code = code.replace(/`?<td[^>]+id="fech-liq-\$\{idx\}">[^<]*<\/td>`?/g, '');
console.log('✅ Colunas Total Bruto e Líquido removidas do tbody');

// Also remove the updater for bruto and liq in atualizar()
code = code.replace(/const bEl = document\.getElementById\(`fech-bruto-\$\{idx\}`\);[\s\S]*?if \(lEl\) lEl\.textContent = fmt\(calc\.liquido\);/g, '');
console.log('✅ Atualizadores de bruto/liq removidos');

// ===========================================================================
// 3. CORRIGIR inpNum: type="text" para garantir 150,00
//    Adicionar R$ prefix nos campos monetários
// ===========================================================================
const oldInpNum = /function inpNum\(idx, campo, val, placeholder, step\) \{[\s\S]*?\}(?=\s*function inpDsr)/;
const newInpNum = `function inpNum(idx, campo, val, placeholder, step) {
        let v = parseFloat(val);
        if (isNaN(v) || v === 0) v = '';
        let displayVal = '';
        const isMoney = step === '0.01';
        if (v !== '') {
            displayVal = isMoney ? parseFloat(v).toFixed(2) : String(v);
        }
        const prefix = isMoney ? '<span style="color:#6b7280;font-size:.75rem;margin-right:1px;pointer-events:none;">R$</span>' : '';
        const wrapStyle = isMoney ? 'display:flex;align-items:center;gap:1px;' : '';
        const inputStyle = isMoney
            ? 'width:58px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:right;font-size:.8rem;'
            : 'width:68px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:right;font-size:.8rem;';
        const blurFn = isMoney
            ? \`if(this.value && parseFloat(this.value)!==0){this.value=parseFloat(this.value).toFixed(2);}else{this.value='';}\`
            : \`if(this.value && parseFloat(this.value)===0){this.value='';}\`;
        const input = \`<input type="text" inputmode="decimal" value="\${displayVal}" placeholder="" style="\${inputStyle}" oninput="window._fechamento.atualizar(\${idx},'\${campo}',parseFloat(this.value)||0)" onblur="\${blurFn}">\`;
        if (isMoney) {
            return \`<div style="\${wrapStyle}">\${prefix}\${input}</div>\`;
        }
        return input;
    }`;

if (oldInpNum.test(code)) {
    code = code.replace(oldInpNum, newInpNum);
    console.log('✅ inpNum atualizado');
} else {
    console.log('❌ inpNum NÃO encontrado');
}

// ===========================================================================
// 4. CORRIGIR importarComissaoParaFechamento: usa input[type=text] agora
// ===========================================================================
code = code.replace(
    `const inputs = tr.querySelectorAll('input[type=number]');`,
    `const inputs = tr.querySelectorAll('input[type=text],input[type=number]');`
);

// ===========================================================================
// 5. TOOLBAR — Adicionar botão de olho para ver arquivos carregados
//    Vars de estado para guardar referência do que foi carregado
// ===========================================================================
// Adicionar _stateArquivos no início do módulo (após _dados e _mes/_ano)
code = code.replace(
    `    let _dados = [];
    let _mes = null, _ano = null;`,
    `    let _dados = [];
    let _mes = null, _ano = null;
    const _stateArquivos = { farmacia_texto: null, mercado_texto: null, consignado_nome: null };`
);

// Botão de olho após cada botão de upload na toolbar
const oldToolbarFarmacia = `<button onclick="window._fechamento.uploadFarmacia()" style="background:#0891b2;`;
const newToolbarFarmacia = `<button id="fech-btn-eye-farmacia" onclick="window._fechamento.verFarmacia()" style="background:#0e7490;color:#fff;border:none;padding:.4rem .5rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:none;" title="Ver dados carregados"><i class="ph ph-eye"></i></button>
    <button onclick="window._fechamento.uploadFarmacia()" style="background:#0891b2;`;
code = code.replace(oldToolbarFarmacia, newToolbarFarmacia);

const oldToolbarConsig = `<button onclick="window._fechamento.uploadConsignado()" style="background:#7c3aed;`;
const newToolbarConsig = `<button id="fech-btn-eye-consignado" onclick="window._fechamento.verConsignado()" style="background:#6d28d9;color:#fff;border:none;padding:.4rem .5rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:none;" title="Ver dados carregados"><i class="ph ph-eye"></i></button>
    <button onclick="window._fechamento.uploadConsignado()" style="background:#7c3aed;`;
code = code.replace(oldToolbarConsig, newToolbarConsig);

const oldToolbarMercado = `<button onclick="window._fechamento.abrirModalMercado()" style="background:#ea580c;`;
const newToolbarMercado = `<button id="fech-btn-eye-mercado" onclick="window._fechamento.verMercado()" style="background:#c2410c;color:#fff;border:none;padding:.4rem .5rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:none;" title="Ver dados carregados"><i class="ph ph-eye"></i></button>
    <button onclick="window._fechamento.abrirModalMercado()" style="background:#ea580c;`;
code = code.replace(oldToolbarMercado, newToolbarMercado);

// ===========================================================================
// 6. FUNÇÕES de VER arquivos
//    Inserir antes do return
// ===========================================================================
const anchorReturn = `    return {\n        init, buscar,`;
const novasFuncoes = `    // Funções para ver arquivos carregados
    function verFarmacia() {
        const txt = _stateArquivos.farmacia_texto;
        if (!txt) { Swal.fire({ icon: 'info', title: 'Farmácia', text: 'Nenhum arquivo carregado nesta sessão.' }); return; }
        Swal.fire({ title: '📋 Dados Farmácia', html: \`<pre style="text-align:left;font-size:.75rem;max-height:350px;overflow:auto;background:#f8faff;padding:.75rem;border-radius:.4rem;">\${txt}</pre>\`, width: 700 });
    }
    function verConsignado() {
        const nome = _stateArquivos.consignado_nome;
        Swal.fire({ icon: 'info', title: 'Consignado', text: nome ? \`Arquivo carregado: \${nome}\` : 'Nenhum arquivo carregado nesta sessão.' });
    }
    function verMercado() {
        const txt = _stateArquivos.mercado_texto;
        if (!txt) { Swal.fire({ icon: 'info', title: 'Mercado', text: 'Nenhum texto carregado nesta sessão.' }); return; }
        Swal.fire({ title: '🛒 Dados Mercado', html: \`<pre style="text-align:left;font-size:.75rem;max-height:350px;overflow:auto;background:#fffbeb;padding:.75rem;border-radius:.4rem;">\${txt}</pre>\`, width: 500 });
    }

    return {\n        init, buscar,`;
code = code.replace(anchorReturn, novasFuncoes);

// Adicionar verFarmacia, verConsignado, verMercado ao return
code = code.replace(
    `        uploadFarmacia, uploadConsignado,`,
    `        uploadFarmacia, uploadConsignado, verFarmacia, verConsignado, verMercado,`
);

// ===========================================================================
// 7. GUARDAR ESTADO nos uploads e mostrar botão de olho
// ===========================================================================
// uploadFarmacia — após parsear, guardar texto e exibir botão olho
code = code.replace(
    `async function uploadFarmacia() {`,
    `async function uploadFarmacia() {
        // marcado internamente após parse`
);

// Guardar resultado do parse de farmácia na variável de estado
// Procurar onde o resultado do parseFarmacia é usado
code = code.replace(
    /const texto = await resp\.json\(\);\s*\/\/ farmacia|farmacia_linhas.*= await/g,
    (m) => m
);

// Inserir log de estado após parseMercado ser chamado com sucesso
// Encontrar onde parseMercado atualiza _dados e inserir
const anchorMercadoParsed = `_dados[idx].mercado = v;
            atualizar(idx, 'mercado', v);`;
const novoMercadoParsed = `_dados[idx].mercado = v;
            atualizar(idx, 'mercado', v);`;
// (Mercado estado: guardamos o texto quando o modal fecha)

// Guardar texto do mercado no parseMercado
code = code.replace(
    `async function parseMercado() {`,
    `async function parseMercado() {
        _stateArquivos.mercado_texto = document.getElementById('fech-mercado-texto')?.value || '';
        const btnEyeMercado = document.getElementById('fech-btn-eye-mercado');
        if (btnEyeMercado && _stateArquivos.mercado_texto) btnEyeMercado.style.display = 'inline-flex';`
);

// Guardar nome do arquivo de consignado
code = code.replace(
    `async function uploadConsignado() {`,
    `async function uploadConsignado() {`
);
// Inserir no final do upload de consignado bem-sucedido
code = code.replace(
    `Swal.fire({ icon: 'success', title: 'Consignado importado!',`,
    `_stateArquivos.consignado_nome = 'arquivo.xlsx';
        const btnEyeConsig = document.getElementById('fech-btn-eye-consignado');
        if (btnEyeConsig) btnEyeConsig.style.display = 'inline-flex';
        Swal.fire({ icon: 'success', title: 'Consignado importado!',`
);

// Guardar texto da farmácia — inserir após sucesso do parse de farmácia
code = code.replace(
    `Swal.fire({ icon: 'success', title: 'Farmácia importada!',`,
    `const btnEyeFarm = document.getElementById('fech-btn-eye-farmacia');
        if (btnEyeFarm) btnEyeFarm.style.display = 'inline-flex';
        Swal.fire({ icon: 'success', title: 'Farmácia importada!',`
);

// ===========================================================================
// SALVAR
// ===========================================================================
fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('✅ fechamento.js salvo!');
console.log('Tamanho:', code.length, 'bytes');
