const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'server.js');
const raw = fs.readFileSync(filePath, 'utf8');
const lines = raw.split('\n');

// Linhas chave (1-indexed → 0-indexed)
// _logoPath8 está na linha 8343 (índice 8342)
// mailOptions  está na linha 8344 (índice 8343)
// attachments  está na linha 8366 (índice 8365)

const LOGO_IDX = 8342;       // const _logoPath8...
const ATTACH_IDX = 8365;     // attachments: [{ filename: 'logo.png'...

// Verificações de segurança
if (!lines[LOGO_IDX].includes("const _logoPath8")) {
    console.error('ERRO: Linha _logoPath8 não é a esperada:', lines[LOGO_IDX].substring(0, 80));
    process.exit(1);
}
if (!lines[ATTACH_IDX].includes("attachments: [{ filename: 'logo.png'")) {
    console.error('ERRO: Linha attachments não é a esperada:', lines[ATTACH_IDX].substring(0, 80));
    process.exit(1);
}

// Encontrar a linha do <p> "O seguinte item atingiu" para inserir ${fotoHtml}
let pIdx = -1;
for (let i = LOGO_IDX; i < LOGO_IDX + 30; i++) {
    if (lines[i].includes('O seguinte item atingiu')) {
        pIdx = i;
        break;
    }
}
if (pIdx === -1) {
    console.error('ERRO: Linha do parágrafo não encontrada!');
    process.exit(1);
}
console.log('Parágrafo encontrado na linha:', pIdx + 1, '→', lines[pIdx].substring(0, 80));

// Detectar indentação do HTML template (para o fotoHtml inline)
const htmlIndent = lines[pIdx].match(/^(\s*)/)[1];

// 1. Inserir lógica de foto APÓS _logoPath8 (entre linha 8343 e 8344)
const I = '                                                '; // 48 spaces
const fotoLogicLines = [
    '',
    I + '// --- Foto do produto ---',
    I + "let fotoHtml = '';",
    I + 'let fotoAttachment = null;',
    I + "if (item.foto_url && item.foto_url.startsWith('http')) {",
    I + "    fotoHtml = '<div style=\"text-align:center;margin:15px 0 20px;\"><img src=\"' + item.foto_url + '\" alt=\"' + item.nome + '\" style=\"max-width:200px;max-height:200px;border-radius:8px;border:1px solid #e2e8f0;object-fit:contain;\" /><p style=\"margin:6px 0 0;font-size:12px;color:#64748b;\">Foto do produto</p></div>';",
    I + "} else if (item.foto_base64 && item.foto_base64.startsWith('data:image')) {",
    I + "    const _fm = item.foto_base64.match(/^data:([A-Za-z-+\\/]+);base64,(.+)$/);",
    I + '    if (_fm) {',
    I + "        const _fext = (_fm[1].split('/')[1] || 'jpg').replace('jpeg','jpg');",
    I + "        fotoAttachment = { filename: 'produto.' + _fext, content: Buffer.from(_fm[2], 'base64'), cid: 'produto-foto' };",
    I + "        fotoHtml = '<div style=\"text-align:center;margin:15px 0 20px;\"><img src=\"cid:produto-foto\" alt=\"' + item.nome + '\" style=\"max-width:200px;max-height:200px;border-radius:8px;border:1px solid #e2e8f0;object-fit:contain;\" /><p style=\"margin:6px 0 0;font-size:12px;color:#64748b;\">Foto do produto</p></div>';",
    I + '    }',
    I + '}',
];

// 2. Inserir ${fotoHtml} na linha após o <p> de descrição
// A nova linha HTML template ficará: ${fotoHtml} logo após o parágrafo
const fotoHtmlLine = htmlIndent + '                             ${fotoHtml}';

// 3. Substituir attachments com versão expandida
const newAttachLine = lines[ATTACH_IDX]
    .replace(
        "attachments: [{ filename: 'logo.png', path: _logoPath8, cid: 'empresa-logo' }]",
        "attachments: [\n" +
        I + "        { filename: 'logo.png', path: _logoPath8, cid: 'empresa-logo' },\n" +
        I + "        ...(fotoAttachment ? [fotoAttachment] : [])\n" +
        I + "    ]"
    );

// Aplicar as mudanças ao array de linhas
// (em ordem reversa para não afetar índices)

// 3. Substituir linha do attachments
lines[ATTACH_IDX] = newAttachLine;

// 2. Inserir ${fotoHtml} após o parágrafo
lines.splice(pIdx + 1, 0, fotoHtmlLine);

// Recalcular LOGO_IDX (pIdx era <= LOGO_IDX-1, mas apenas se pIdx < LOGO_IDX)
// pIdx está entre LOGO_IDX e LOGO_IDX+30, então LOGO_IDX não muda

// 1. Inserir bloco de foto após _logoPath8 (que agora continua no mesmo índice)
lines.splice(LOGO_IDX + 1, 0, ...fotoLogicLines);

// Salvar
const result = lines.join('\n');
fs.writeFileSync(filePath, result, 'utf8');

// Verificar
const verify = fs.readFileSync(filePath, 'utf8');
if (verify.includes('fotoHtml') && verify.includes('fotoAttachment') && verify.includes('produto-foto')) {
    console.log('✅ SUCESSO! Foto do produto adicionada ao e-mail de estoque mínimo!');
    console.log('Ocorrências de fotoHtml:', (verify.match(/fotoHtml/g) || []).length);
} else {
    console.error('❌ ERRO: Verificação falhou!');
}
