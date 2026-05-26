// Patch: adicionar "Foto do Colaborador" nos documentos do credenciamento
const fs = require('fs');

// ── 1. index.html: adicionar checkbox de foto no cred-docs-exigidos ──────────
let html = fs.readFileSync('frontend/index.html', 'utf8');
const oldNr1Checkbox = '<div><label><input type="checkbox" value="nr1"> NR1 / Ordem de Servi\u00e7o</label></div>';
const newNr1WithFoto = oldNr1Checkbox + '\r\n                        <div><label><input type="checkbox" value="foto_colaborador"> \ud83d\udcf7 Foto do Colaborador</label></div>';
if (!html.includes('foto_colaborador')) {
    html = html.replace(oldNr1Checkbox, newNr1WithFoto);
    console.log('[HTML] Checkbox foto adicionado');
} else {
    console.log('[HTML] Checkbox foto ja existe');
}
fs.writeFileSync('frontend/index.html', html);

// ── 2. credenciamento.js: mapear 'foto_colaborador' ──────────────────────────
let cred = fs.readFileSync('frontend/credenciamento.js', 'utf8');

// 2a. mapDocTypeToValue
const oldMapReturn = "        return null;\r\n    };";
const newMapReturn = "        if (d.includes('foto')) return 'foto_colaborador';\r\n        return null;\r\n    };";
if (!cred.includes("foto_colaborador")) {
    cred = cred.replace(oldMapReturn, newMapReturn);
    console.log('[CRED] mapDocTypeToValue atualizado');
} else {
    console.log('[CRED] map ja existe');
}

// 2b. docNamesReadable
const oldReadable = "'contrato_esocial': 'Contrato e-social', 'nr1': 'NR1 / Ordem de Servi\u00e7o'";
const newReadable = "'contrato_esocial': 'Contrato e-social', 'nr1': 'NR1 / Ordem de Servi\u00e7o', 'foto_colaborador': 'Foto do Colaborador'";
if (cred.includes(oldReadable)) {
    cred = cred.replace(oldReadable, newReadable);
    console.log('[CRED] docNamesReadable atualizado');
} else {
    console.log('[CRED] readable key nao encontrada, tentando alternativa...');
    // Try without \r
    const alt = "'contrato_esocial': 'Contrato e-social', 'nr1': 'NR1 / Ordem de Servi\u00e7o'";
    if (cred.includes(alt)) {
        cred = cred.replace(alt, alt + ", 'foto_colaborador': 'Foto do Colaborador'");
        console.log('[CRED] docNamesReadable (alt) atualizado');
    }
}

fs.writeFileSync('frontend/credenciamento.js', cred);

// ── 3. credenciamento-publico.html: mostrar foto no card do colaborador ───────
let pub = fs.readFileSync('frontend/credenciamento-publico.html', 'utf8');

// Inserir foto logo após o h4 do nome do colaborador
const oldH4 = '<h4 class="font-bold text-lg text-gray-800 mb-3">${c.nome}</h4>';
const newH4 = `<div class="flex items-center gap-3 mb-3">
                    \${c.foto_base64 ? \`<img src="\${c.foto_base64}" alt="Foto" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid #16a34a;flex-shrink:0;">\` : '<div style="width:56px;height:56px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class=\\"fas fa-user\\" style=\\"color:#94a3b8;font-size:1.5rem;\\"></i></div>'}
                    <h4 class="font-bold text-lg text-gray-800">\${c.nome}</h4>
                </div>`;
if (!pub.includes('foto_base64')) {
    pub = pub.replace(oldH4, newH4);
    console.log('[PUBLIC] Foto adicionada ao card do colaborador');
} else {
    console.log('[PUBLIC] Foto ja existe no card');
}
fs.writeFileSync('frontend/credenciamento-publico.html', pub);

console.log('DONE');
