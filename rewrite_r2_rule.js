const fs = require('fs');

let c = fs.readFileSync('C:/Users/thais/.gemini/config/GEMINI.md', 'utf8');

// Mantém tudo antes da seção R2, substitui a seção inteira
const idx = c.indexOf('\n---\n\n## Armazenamento de arquivos');
const base = idx !== -1 ? c.substring(0, idx) : c;

const r2Section = `

---

## Armazenamento de arquivos — sempre usar Cloudflare R2

Qualquer nova funcionalidade que envolva salvar **arquivo, imagem, vídeo, áudio ou PDF** deve obrigatoriamente usar o Cloudflare R2, nunca o disco local do servidor (que é efêmero no Render).

### Padrão de chave R2 — usar \`buildR2Key\`

A função \`buildR2Key(tipo, subtipo, nomeColab, nomeDocumento, ext)\` já existe no \`server.js\` e gera chaves padronizadas no formato:
\`Colaboradores/NOME/TIPO/Subtipo/YYYY/MM/DD_NOME_DOCUMENTO_hash.ext\`

Para arquivos não vinculados a colaborador, usar o padrão manual:
\`CATEGORIA/Subcategoria/YYYY/MM/DD_descricao_hash.ext\`

### Checklist obrigatório ao criar funcionalidade com upload

- [ ] **Banco de dados:** A tabela deve ter uma coluna \`r2_key TEXT\` para guardar a chave R2
- [ ] **Upload:** Usar \`r2.uploadToR2(r2Key, bufferOuPath, contentType)\` de \`backend/utils/r2.js\`
- [ ] **Após upload:** Salvar a \`r2_key\` retornada no banco com \`UPDATE ... SET r2_key = ?\`
- [ ] **Nunca salvar apenas o caminho local (\`file_path\`)** como única referência — o Render apaga arquivos locais no restart
- [ ] **Se deletar o registro:** Chamar \`r2.deleteFromR2(row.r2_key)\` antes de apagar do banco
- [ ] **Verificar \`r2.isReady()\`** antes de qualquer operação R2 e tratar o caso onde R2 não está configurado

### Como servir o arquivo depois (no frontend)

Existem dois padrões no projeto:

**1. URL pública direta** (para imagens e arquivos públicos):
\`\`\`js
// R2_PUBLIC_URL + '/' + r2_key → URL direta
const url = \`\${process.env.R2_PUBLIC_URL}/\${row.r2_key}\`;
\`\`\`

**2. Stream via rota do backend** (para arquivos privados/PDF protegidos):
\`\`\`js
// Backend: GET /api/arquivo/:id → downloadStreamFromR2
const { stream, contentType } = await r2.downloadStreamFromR2(row.r2_key);
res.setHeader('Content-Type', contentType);
stream.pipe(res);
\`\`\`

**Regra de decisão:**
- Imagens de perfil, fotos de EPI, selfies → URL pública direta
- PDFs de documentos, holerites, contratos → stream via backend (privado)
- Vídeos e áudios → stream via backend se sensível, URL pública se for conteúdo de treinamento geral

### Como usar o arquivo em outras páginas / telas

Sempre que uma tela precisar exibir ou usar um arquivo armazenado no R2:

1. **O SELECT deve sempre incluir \`r2_key\`** — nunca buscar o registro sem trazer a chave R2:
\`\`\`js
db.get('SELECT id, nome, r2_key, file_path FROM tabela WHERE id = ?', [id], ...)
\`\`\`

2. **Montar a URL correta no backend antes de enviar ao frontend:**
\`\`\`js
// Para imagem/arquivo público
row.url = row.r2_key
    ? \`\${process.env.R2_PUBLIC_URL}/\${row.r2_key}\`
    : null;
\`\`\`

3. **Fallback para \`file_path\` (registros antigos sem R2):**
\`\`\`js
// Suporte a registros legados que ainda não têm r2_key
if (row.r2_key) {
    row.url = \`\${process.env.R2_PUBLIC_URL}/\${row.r2_key}\`;
} else if (row.file_path) {
    row.url = \`/uploads/\${path.basename(row.file_path)}\`; // legado
} else {
    row.url = null;
}
\`\`\`

4. **No frontend, nunca hardcodar caminho de arquivo** — sempre usar a \`url\` vinda da API:
\`\`\`js
// ✅ Correto
img.src = dados.url;

// ❌ Errado
img.src = '/uploads/foto.jpg';
\`\`\`

### Como fazer download de um arquivo R2 pelo usuário

**Rota de download no backend:**
\`\`\`js
app.get('/api/download/:id', async (req, res) => {
    const row = await db.getAsync('SELECT r2_key, nome_arquivo FROM tabela WHERE id = ?', [req.params.id]);
    if (!row?.r2_key) return res.status(404).send('Arquivo não encontrado');

    const r2 = require('./utils/r2');
    const { stream, contentType } = await r2.downloadStreamFromR2(row.r2_key);
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', \`attachment; filename="\${row.nome_arquivo || 'arquivo'}"\`);
    stream.pipe(res);
});
\`\`\`

**No frontend, abrir o link de download:**
\`\`\`js
window.open(\`/api/download/\${id}\`, '_blank');
\`\`\`

### Como deletar arquivo do R2 junto com o registro

**Sempre deletar do R2 antes de deletar do banco:**
\`\`\`js
const r2 = require('./utils/r2');
const row = await db.getAsync('SELECT r2_key FROM tabela WHERE id = ?', [id]);

if (row?.r2_key && r2.isReady()) {
    await r2.deleteFromR2(row.r2_key);
}

await db.runAsync('DELETE FROM tabela WHERE id = ?', [id]);
\`\`\`

### ContentType por tipo de arquivo

| Extensão | ContentType |
|---|---|
| .pdf | \`application/pdf\` |
| .jpg / .jpeg | \`image/jpeg\` |
| .png | \`image/png\` |
| .mp4 | \`video/mp4\` |
| .mp3 | \`audio/mpeg\` |
| .webm | \`video/webm\` |
| .docx | \`application/vnd.openxmlformats-officedocument.wordprocessingml.document\` |

### Fallback quando R2 não está pronto

Sempre tratar o caso onde \`r2.isReady()\` retorna \`false\`:
\`\`\`js
const r2 = require('./utils/r2');
if (r2.isReady()) {
    const r2Key = buildR2Key(...);
    await r2.uploadToR2(r2Key, buffer, contentType);
    await db.run('UPDATE tabela SET r2_key = ? WHERE id = ?', [r2Key, id]);
} else {
    console.warn('[R2] Storage não configurado — arquivo salvo apenas localmente.');
}
\`\`\`
`;

fs.writeFileSync('C:/Users/thais/.gemini/config/GEMINI.md', base + r2Section, 'utf8');
console.log('Seção R2 reescrita com sucesso!');
console.log('Total de caracteres:', (base + r2Section).length);
