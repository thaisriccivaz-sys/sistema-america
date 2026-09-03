const fs = require('fs');

// Lê o arquivo atual
let current = fs.readFileSync('C:/Users/thais/.gemini/config/GEMINI.md', 'utf8');

const newRule = `

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

// Adiciona ao final
fs.writeFileSync('C:/Users/thais/.gemini/config/GEMINI.md', current + newRule, 'utf8');
console.log('Rule R2 adicionada!');
console.log('Total de caracteres:', (current + newRule).length);
