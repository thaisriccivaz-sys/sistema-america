/**
 * patch_multas_doc_v2.js
 * Corrige o documento de multa e comportamento do botão
 */
const fs = require('fs');
const path = require('path');

// ── 1. Converter logo para base64 ─────────────────────────────────────────────
const logoPath = path.join(__dirname, 'frontend', 'assets', 'logo-header.png');
const logoBase64 = fs.readFileSync(logoPath).toString('base64');
const logoDataUrl = `data:image/png;base64,${logoBase64}`;
console.log(`Logo carregado: ${(logoBase64.length / 1024).toFixed(1)} KB`);

// ── 2. Patch do backend/server.js ─────────────────────────────────────────────
const serverPath = path.join(__dirname, 'backend', 'server.js');
let server = fs.readFileSync(serverPath, 'utf8');

// --- Substituir template HTML do documento ---
const OLD_HEADER = `        const html = \`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 40px; color: #000; }
            .logo-header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px solid #0b5394; }
            .logo-header h1 { font-size: 28px; color: #0b5394; font-weight: 900; letter-spacing: 2px; margin: 0; }
            .logo-header span { font-size: 13px; color: #555; display: block; }
            .titulo { text-align: center; font-weight: bold; font-size: 14px; margin: 20px 0; }
            .colab-label { font-size: 13px; margin-bottom: 10px; }
            .box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; font-size: 11px; }
            .box p { margin: 3px 0; }
            table.info { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            table.info td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; }
            table.info td b { font-weight: bold; }
            p { margin-bottom: 10px; line-height: 1.5; font-size: 11.5px; }
            .parcelas { margin: 15px 0; font-size: 12px; }
            .assinaturas { margin-top: 40px; }
            .assin-row { display: flex; gap: 30px; margin-bottom: 30px; }
            .assin-box { flex:1; border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 10px; }
        </style></head><body>
        <div class="logo-header">
            <div><strong>AMÉRICA RENTAL</strong><br><small>desde 1999</small></div>
        </div>`;

const NEW_HEADER = `        const html = \`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 40px; color: #000; }
            .logo-header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; }
            .logo-header img { max-width: 100%; max-height: 90px; display: block; margin: 0 auto; }
            .titulo { text-align: center; font-weight: bold; font-size: 14px; margin: 20px 0; }
            .colab-label { font-size: 13px; margin-bottom: 10px; }
            .box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; font-size: 11px; }
            .box p { margin: 3px 0; }
            table.info { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            table.info td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; }
            table.info td b { font-weight: bold; }
            p { margin-bottom: 10px; line-height: 1.5; font-size: 11.5px; }
            .parcelas { margin: 15px 0; font-size: 12px; font-weight: bold; }
            .assinaturas { margin-top: 40px; }
            .assin-row { display: flex; gap: 30px; margin-bottom: 30px; }
            .assin-box { flex:1; border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 10px; min-height: 80px; }
            .data-local { font-weight: bold; }
        </style></head><body>
        <div class="logo-header">
            <img src="${logoDataUrl}" alt="América Rental">
        </div>`;

if (server.includes(OLD_HEADER)) {
    server = server.replace(OLD_HEADER, NEW_HEADER);
    console.log('✅ Header do documento substituído (logo + estilos)');
} else {
    console.warn('⚠️  Header não encontrado exatamente — tentando regex...');
    // Fallback: substituir só o bloco do div logo-header
    server = server.replace(
        /<div class="logo-header">\s*<div><strong>AMÉRICA RENTAL<\/strong><br><small>desde 1999<\/small><\/div>\s*<\/div>/,
        `<div class="logo-header"><img src="${logoDataUrl}" alt="América Rental"></div>`
    );
    console.log('✅ Logo substituído via regex');
}

// --- Substituir linha de parcelas (adicionar valor por parcela) ---
const OLD_PARCELAS = `        <p class="parcelas">Solicito que o desconto seja feito em: &nbsp;
            (\${check1x}) 1x &nbsp;&nbsp;&nbsp;
            (\${check2x}) 2x &nbsp;&nbsp;&nbsp;
            (\${check3x}) 3x
        </p>`;

const NEW_PARCELAS = `        \${(() => {
            const valorBruto = multa.valor_multa ? parseFloat(multa.valor_multa.replace(/[^0-9,]/g,'').replace(',','.')) : 0;
            const fmt = (v) => v > 0 ? 'R$ ' + v.toFixed(2).replace('.',',') : '';
            const v1 = fmt(valorBruto);
            const v2 = fmt(valorBruto / 2);
            const v3 = fmt(valorBruto / 3);
            return \\\`<p class="parcelas">Solicito que o desconto seja feito em: &nbsp;
            (\\\${check1x}) 1x \\\${v1 ? '— ' + v1 : ''} &nbsp;&nbsp;&nbsp;
            (\\\${check2x}) 2x \\\${v2 ? '— ' + v2 + '/mês' : ''} &nbsp;&nbsp;&nbsp;
            (\\\${check3x}) 3x \\\${v3 ? '— ' + v3 + '/mês' : ''}
        </p>\\\`;
        })()}`;

if (server.includes(OLD_PARCELAS)) {
    server = server.replace(OLD_PARCELAS, NEW_PARCELAS);
    console.log('✅ Linha de parcelas atualizada (com valor)');
} else {
    console.warn('⚠️  Linha de parcelas não encontrada exatamente');
}

// --- Substituir data/local por versão em negrito ---
const OLD_DATA = `            return '<p>Guarulhos, ' + dia + ' de ' + mes + ' de ' + ano + '.</p>';`;
const NEW_DATA = `            return '<p class="data-local"><strong>Guarulhos, ' + dia + ' de ' + mes + ' de ' + ano + '.</strong></p>';`;

if (server.includes(OLD_DATA)) {
    server = server.replace(OLD_DATA, NEW_DATA);
    console.log('✅ Data em negrito');
} else {
    console.warn('⚠️  Linha de data não encontrada');
}

// --- Aumentar altura do campo de assinatura ---
const OLD_ASSIN_BOX = `.assin-box { flex:1; border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 10px; }`;
const NEW_ASSIN_BOX = `.assin-box { flex:1; border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 10px; min-height: 80px; }`;

if (server.includes(OLD_ASSIN_BOX)) {
    server = server.replace(OLD_ASSIN_BOX, NEW_ASSIN_BOX);
    console.log('✅ Altura da assinatura aumentada');
} else {
    console.warn('⚠️  Estilo assin-box não encontrado (pode já estar correto)');
}

// --- Corrigir marcadores de parcelas: ✓ em vez de texto longo ---
// O check1x/check2x/check3x usam '✓' ou '( )' — garantir que '( )' seja single not double
server = server.replace(
    `const check1x = parcelas === 1 ? '✓' : '( )';`,
    `const check1x = parcelas === 1 ? '✓' : '&nbsp;';`
);
server = server.replace(
    `const check2x = parcelas === 2 ? '✓' : '( )';`,
    `const check2x = parcelas === 2 ? '✓' : '&nbsp;';`
);
server = server.replace(
    `const check3x = parcelas === 3 ? '✓' : '( )';`,
    `const check3x = parcelas === 3 ? '✓' : '&nbsp;';`
);
console.log('✅ Marcadores de parcelas corrigidos');

fs.writeFileSync(serverPath, server, 'utf8');
console.log('✅ backend/server.js salvo');

// ── 3. Patch do frontend/app.js — travar botão Processo Iniciado ──────────────
const appPath = path.join(__dirname, 'frontend', 'app.js');
let app = fs.readFileSync(appPath, 'utf8');

const OLD_BTN_PI = `        const btnPI = document.createElement('button');
        btnPI.style = 'background:#e0f2fe;color:#0369a1;border:1.5px solid #7dd3fc;border-radius:8px;padding:6px 14px;cursor:pointer;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;';
        btnPI.innerHTML = '<i class="ph ph-check-circle"></i> Processo Iniciado';
        btnPI.onclick = () => window.abrirPopupIniciarProcesso(m, colabId);
        actionsDiv.appendChild(btnPI);`;

const NEW_BTN_PI = `        const btnPI = document.createElement('button');
        const processoTravado = !!(m.assinatura_testemunha1_base64);
        if (processoTravado) {
            btnPI.style = 'background:#e0f2fe;color:#0369a1;border:1.5px solid #7dd3fc;border-radius:8px;padding:6px 14px;cursor:not-allowed;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;opacity:0.6;';
            btnPI.innerHTML = '<i class="ph ph-check-circle"></i> Processo Iniciado';
            btnPI.disabled = true;
        } else {
            btnPI.style = 'background:#e0f2fe;color:#0369a1;border:1.5px solid #7dd3fc;border-radius:8px;padding:6px 14px;cursor:pointer;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;';
            btnPI.innerHTML = '<i class="ph ph-check-circle"></i> Processo Iniciado';
            btnPI.onclick = () => window.abrirPopupIniciarProcesso(m, colabId);
        }
        actionsDiv.appendChild(btnPI);`;

if (app.includes(OLD_BTN_PI)) {
    app = app.replace(OLD_BTN_PI, NEW_BTN_PI);
    console.log('✅ Botão Processo Iniciado travado após assinatura das testemunhas');
} else {
    console.warn('⚠️  Bloco do botão Processo Iniciado não encontrado');
}

fs.writeFileSync(appPath, app, 'utf8');
console.log('✅ frontend/app.js salvo');
console.log('\n🎉 Patch aplicado com sucesso!');
