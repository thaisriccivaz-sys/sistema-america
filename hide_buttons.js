const fs = require('fs');
const path1 = 'frontend/comercial_credenciamento.js';
let content1 = fs.readFileSync(path1, 'utf8');

const target1 = /<button class="btn btn-sm" style="background:#ef4444;color:#fff;border:none;" onclick="limparListaComercial\(\)"><i class="ph ph-trash"><\/i> Limpar Lista<\/button>/;
const replacement1 = '<button class="btn btn-sm" style="display:none;background:#ef4444;color:#fff;border:none;" onclick="limparListaComercial()"><i class="ph ph-trash"></i> Limpar Lista</button>';

if (content1.match(target1)) {
    content1 = content1.replace(target1, replacement1);
    fs.writeFileSync(path1, content1, 'utf8');
    console.log("Hidden button in comercial_credenciamento.js");
} else {
    console.log("Button not found in comercial_credenciamento.js");
}

const path2 = 'frontend/credenciamento.js';
let content2 = fs.readFileSync(path2, 'utf8');

const target2 = /<button class="btn btn-sm" style="background:#ef4444;color:#fff;border:none;" onclick="limparListaLogistica\(\)"><i class="ph ph-trash"><\/i> Limpar Lista<\/button>/;
const replacement2 = '<button class="btn btn-sm" style="display:none;background:#ef4444;color:#fff;border:none;" onclick="limparListaLogistica()"><i class="ph ph-trash"></i> Limpar Lista</button>';

if (content2.match(target2)) {
    content2 = content2.replace(target2, replacement2);
    fs.writeFileSync(path2, content2, 'utf8');
    console.log("Hidden button in credenciamento.js");
} else {
    console.log("Button not found in credenciamento.js");
}